import "server-only";

import { desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { schema } from "@/db/schema";
import { applicationLinkAssessments } from "@/db/schema/ingestion";
import {
  ApplicationLinkVerificationError,
  verifyApplicationLink,
} from "@/server/link-verification/application-link-verifier";

type Database = NodePgDatabase<typeof schema>;

export const LINK_WORKER_JOB_KIND = "application_link";
export const LINK_WORKER_PRINCIPAL_ID = "link-worker";

/**
 * Queue operations the link worker is allowed to perform.
 *
 * Deliberately narrower than the source-document worker's boundary: there is
 * no checkpoint. A link verification is one atomic assessment write with
 * nothing partially-completed to resume, so a checkpoint could only ever store
 * a source-document ingestion in an application-link job's payload. The server
 * refuses that outright (RECRAWL_CHECKPOINT_UNSUPPORTED); this boundary simply
 * never offers it.
 */
export interface LinkQueueBoundary {
  claim(limit: number): Promise<ClaimedLinkJob[]>;
  complete(
    jobId: string,
    leaseToken: string,
    input: {
      error?: string;
      material_change?: boolean;
      retryable?: boolean;
      success: boolean;
    }
  ): Promise<unknown>;
}

export interface ClaimedLinkJob {
  applicationRoundId: string | null;
  id: string;
  jobKind: string;
  leaseToken: string;
  status: string;
}

export interface LinkVerificationOutcome {
  materialChange: boolean;
  previousStatus: string | null;
  status: string;
}

export type LinkVerifier = (
  applicationRoundId: string
) => Promise<LinkVerificationOutcome>;

export class LinkWorkerContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LinkWorkerContractError";
  }
}

export interface LinkJobResult {
  applicationRoundId: string | null;
  error?: string;
  jobId: string;
  materialChange?: boolean;
  retryable?: boolean;
  status?: string;
  success: boolean;
}

/**
 * Failures that can never succeed on a retry.
 *
 * A target site that is down is *not* one of these: the verifier records that
 * as a `broken` or `blocked` assessment and the job succeeds. Only a job that
 * can never be executed at all is terminal.
 */
const PERMANENT_VERIFICATION_CODES = new Set([
  "APPLICATION_ROUND_NOT_FOUND",
  "APPLICATION_URL_MISSING",
]);

const classifyFailure = (error: unknown): { retryable: boolean } => {
  if (
    error instanceof ApplicationLinkVerificationError &&
    PERMANENT_VERIFICATION_CODES.has(error.code)
  ) {
    return { retryable: false };
  }
  if (error instanceof LinkWorkerContractError) {
    return { retryable: false };
  }
  return { retryable: true };
};

const failureMessage = (error: unknown): string => {
  if (error instanceof ApplicationLinkVerificationError) {
    // The code is what an operator greps for in dead-letter triage, so it has
    // to survive into last_error rather than only the prose message.
    return `${error.name}: ${error.code}: ${error.message}`.slice(0, 2000);
  }
  const described =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : `UnknownError: ${String(error)}`;
  return described.slice(0, 2000);
};

/**
 * Verify one application round and report whether the operational assessment
 * changed, reading the previous assessment before the new one is written.
 */
export const createDatabaseLinkVerifier =
  (database: Database, actorId = LINK_WORKER_PRINCIPAL_ID): LinkVerifier =>
  async (applicationRoundId: string): Promise<LinkVerificationOutcome> => {
    const previousRows = await database
      .select({ status: applicationLinkAssessments.status })
      .from(applicationLinkAssessments)
      .where(
        eq(applicationLinkAssessments.applicationRoundId, applicationRoundId)
      )
      .orderBy(desc(applicationLinkAssessments.createdAt))
      .limit(1);
    const previousStatus = previousRows[0]?.status ?? null;
    const result = await verifyApplicationLink(
      database,
      applicationRoundId,
      actorId
    );
    return {
      materialChange: previousStatus !== result.status,
      previousStatus,
      status: result.status,
    };
  };

/**
 * Claim and execute at most `limit` application-link jobs, sequentially.
 *
 * Every mutation goes back through the queue API under the lease token issued
 * at claim time, so BF-08 fencing decides what this worker may write; the
 * worker itself asserts nothing about its own authority.
 */
export const runLinkWorkerBatch = async ({
  limit = 1,
  queue,
  verify,
}: {
  limit?: number;
  queue: LinkQueueBoundary;
  verify: LinkVerifier;
}): Promise<LinkJobResult[]> => {
  if (limit < 1) {
    throw new LinkWorkerContractError("link worker limit must be at least one");
  }
  const jobs = await queue.claim(limit);
  const results: LinkJobResult[] = [];
  for (const job of jobs) {
    results.push(await executeLinkJob(job, queue, verify));
  }
  return results;
};

const executeLinkJob = async (
  job: ClaimedLinkJob,
  queue: LinkQueueBoundary,
  verify: LinkVerifier
): Promise<LinkJobResult> => {
  try {
    if (job.jobKind !== LINK_WORKER_JOB_KIND) {
      throw new LinkWorkerContractError(
        `the queue handed the link worker a ${job.jobKind} job`
      );
    }
    if (!job.applicationRoundId) {
      throw new LinkWorkerContractError(
        "an application-link job arrived without an application round"
      );
    }
    const outcome = await verify(job.applicationRoundId);
    await queue.complete(job.id, job.leaseToken, {
      material_change: outcome.materialChange,
      success: true,
    });
    return {
      applicationRoundId: job.applicationRoundId,
      jobId: job.id,
      materialChange: outcome.materialChange,
      status: outcome.status,
      success: true,
    };
  } catch (error) {
    const { retryable } = classifyFailure(error);
    const message = failureMessage(error);
    // A completion that itself fails must not abort the batch: the lease
    // expires and BF-08 reclaim handles it.
    try {
      await queue.complete(job.id, job.leaseToken, {
        error: message,
        retryable,
        success: false,
      });
    } catch {
      // Intentionally swallowed; the lease expiry is the recovery path.
    }
    return {
      applicationRoundId: job.applicationRoundId,
      error: message,
      jobId: job.id,
      retryable,
      success: false,
    };
  }
};
