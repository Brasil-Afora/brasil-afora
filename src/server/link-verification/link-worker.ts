import "server-only";

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

/**
 * Performs one verification. In production this is an authenticated call to
 * the web's link-check route: the worker holds no database credential, so the
 * process that fetches untrusted, externally sourced URLs cannot write to the
 * database except through that one narrowly scoped route.
 */
export type LinkVerifier = (
  applicationRoundId: string
) => Promise<LinkVerificationOutcome>;

/** The queue handed the worker something it must never execute. */
export class LinkWorkerContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LinkWorkerContractError";
  }
}

/**
 * The job can never succeed — its round no longer exists, or has no
 * application URL. Retrying would only burn attempts, so it dead-letters on
 * the first. A target site that is down is *not* this: the web records that as
 * a broken or blocked assessment and the verification succeeds.
 */
export class PermanentLinkJobError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PermanentLinkJobError";
    this.code = code;
  }
}

export interface LinkJobResult {
  applicationRoundId: string | null;
  /** Whether the queue acknowledged the completion this worker sent. */
  completionConfirmed: boolean;
  error?: string;
  /**
   * The failure was this worker's own reach to the web (unreachable, refused,
   * misconfigured), not anything about the job. The loop backs off on these so
   * a broken deployment cannot burn attempts across the whole queue.
   */
  infrastructureFailure?: boolean;
  jobId: string;
  materialChange?: boolean;
  retryable?: boolean;
  status?: string;
  success: boolean;
}

const classifyFailure = (
  error: unknown
): { infrastructure: boolean; retryable: boolean } => {
  if (
    error instanceof PermanentLinkJobError ||
    error instanceof LinkWorkerContractError
  ) {
    return { infrastructure: false, retryable: false };
  }
  return { infrastructure: true, retryable: true };
};

const failureMessage = (error: unknown): string => {
  if (error instanceof PermanentLinkJobError) {
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

const defaultSleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const SUCCESS_COMPLETION_ATTEMPTS = 3;

/**
 * Claim and execute at most `limit` application-link jobs, sequentially.
 *
 * Every queue mutation goes through the maintenance API under the lease token
 * issued at claim time, so BF-08 fencing decides what this worker may change.
 * Verification writes go through the web's link-check route; the web bounds
 * each verification to 45 seconds, far inside the 15-minute lease, so a job
 * cannot be reclaimed while its verification is still running.
 */
export const runLinkWorkerBatch = async ({
  limit = 1,
  queue,
  sleep = defaultSleep,
  verify,
}: {
  limit?: number;
  queue: LinkQueueBoundary;
  sleep?: (milliseconds: number) => Promise<void>;
  verify: LinkVerifier;
}): Promise<LinkJobResult[]> => {
  if (limit < 1) {
    throw new LinkWorkerContractError("link worker limit must be at least one");
  }
  const jobs = await queue.claim(limit);
  const results: LinkJobResult[] = [];
  for (const job of jobs) {
    results.push(await executeLinkJob(job, queue, verify, sleep));
  }
  return results;
};

const executeLinkJob = async (
  job: ClaimedLinkJob,
  queue: LinkQueueBoundary,
  verify: LinkVerifier,
  sleep: (milliseconds: number) => Promise<void>
): Promise<LinkJobResult> => {
  let outcome: LinkVerificationOutcome;
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
    outcome = await verify(job.applicationRoundId);
  } catch (error) {
    const { infrastructure, retryable } = classifyFailure(error);
    const message = failureMessage(error);
    let completionConfirmed = false;
    try {
      await queue.complete(job.id, job.leaseToken, {
        error: message,
        retryable,
        success: false,
      });
      completionConfirmed = true;
    } catch {
      // The lease expires and BF-08 reclaims the job; nothing is lost.
    }
    return {
      applicationRoundId: job.applicationRoundId,
      completionConfirmed,
      error: message,
      infrastructureFailure: infrastructure,
      jobId: job.id,
      retryable,
      success: false,
    };
  }

  // The verification happened. Whatever the completion call does next, it must
  // never be reported as a failed job: that would requeue a finished
  // verification, lose material_change, and eventually dead-letter work that
  // succeeded every time. A completion that committed but lost its response is
  // replayed idempotently by the server under the same lease token, so the
  // success completion itself is simply retried.
  let completionConfirmed = false;
  for (let attempt = 1; attempt <= SUCCESS_COMPLETION_ATTEMPTS; attempt += 1) {
    try {
      await queue.complete(job.id, job.leaseToken, {
        material_change: outcome.materialChange,
        success: true,
      });
      completionConfirmed = true;
      break;
    } catch {
      if (attempt < SUCCESS_COMPLETION_ATTEMPTS) {
        await sleep(1000 * attempt);
      }
    }
  }
  return {
    applicationRoundId: job.applicationRoundId,
    completionConfirmed,
    jobId: job.id,
    materialChange: outcome.materialChange,
    status: outcome.status,
    success: true,
  };
};
