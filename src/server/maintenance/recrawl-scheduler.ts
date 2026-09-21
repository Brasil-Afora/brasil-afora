import "server-only";

import { randomUUID } from "node:crypto";
import {
  and,
  arrayContains,
  desc,
  eq,
  inArray,
  isNull,
  lte,
  not,
  or,
  sql,
} from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import type { IngestionRequestV1 } from "@/contracts/opportunity-v1";
import type { schema } from "@/db/schema";
import {
  applicationLinkAssessments,
  applicationRounds,
  auditEvents,
  editionSourceDocuments,
  editions,
  publicationVersions,
  recrawlJobs,
  sourceDocuments,
  sources,
} from "@/db/schema/ingestion";

type Database = NodePgDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type RecrawlJob = typeof recrawlJobs.$inferSelect;

export const RECRAWL_LEASE_DURATION_MS = 15 * 60 * 1000;
// BF-10: a source whose only discovery method is an operator-started supervised
// run must never be recrawled unattended by this scheduler.
export const SUPERVISED_RUN_DISCOVERY_METHOD = "supervised_run";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const OPEN_STATES = new Set([
  "announced",
  "applications_not_open",
  "open",
  "closing_soon",
  "extended",
]);

export interface ScheduleRecrawlsResult {
  application_link_jobs: number;
  source_document_jobs: number;
}

export interface CompleteRecrawlInput {
  error?: string;
  ingestion_id?: string;
  material_change?: boolean;
  retryable?: boolean;
  success: boolean;
}

export class RecrawlWorkflowError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RecrawlWorkflowError";
    this.code = code;
  }
}

const hourBucket = (date: Date): string =>
  date.toISOString().slice(0, 13).replaceAll(/[-T:]/g, "");

const ageMilliseconds = (date: Date | null, now: Date): number =>
  date ? Math.max(0, now.getTime() - date.getTime()) : Number.POSITIVE_INFINITY;

const daysUntil = (date: string | null, now: Date): number | null => {
  if (!date) {
    return null;
  }
  const deadline = new Date(`${date}T23:59:59.999Z`);
  return Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS);
};

const latestBy = <T, K extends string>(
  rows: T[],
  key: (row: T) => K
): Map<K, T> => {
  const result = new Map<K, T>();
  for (const row of rows) {
    const identity = key(row);
    if (!result.has(identity)) {
      result.set(identity, row);
    }
  }
  return result;
};

interface JobCandidate {
  applicationRoundId?: string;
  deduplicationKey: string;
  editionId: string;
  jobKind: "application_link" | "source_document";
  payload: Record<string, unknown>;
  priority: number;
  reason: string;
  requestedBy: string;
  scheduledFor: Date;
  sourceDocumentId?: string;
  sourceId?: string;
}

const insertCandidate = async (
  database: Database | Transaction,
  candidate: JobCandidate
): Promise<boolean> => {
  const rows = await database
    .insert(recrawlJobs)
    .values({
      applicationRoundId: candidate.applicationRoundId,
      deduplicationKey: candidate.deduplicationKey,
      editionId: candidate.editionId,
      jobKind: candidate.jobKind,
      payload: candidate.payload,
      priority: candidate.priority,
      reason: candidate.reason,
      requestedBy: candidate.requestedBy,
      scheduledFor: candidate.scheduledFor,
      sourceDocumentId: candidate.sourceDocumentId,
      sourceId: candidate.sourceId,
    })
    .onConflictDoNothing()
    .returning({ id: recrawlJobs.id });
  return rows.length > 0;
};

const cadenceFor = ({
  daysToDeadline,
  latestLinkStatus,
  published,
  sourceIntervalHours,
  status,
}: {
  daysToDeadline: number | null;
  latestLinkStatus: string | null;
  published: boolean;
  sourceIntervalHours: number;
  status: string;
}): { intervalMs: number; priority: number; reason: string } => {
  if (
    latestLinkStatus &&
    [
      "broken",
      "closed",
      "old_edition",
      "redirected",
      "results_page",
      "unknown",
    ].includes(latestLinkStatus)
  ) {
    return {
      intervalMs: 6 * HOUR_MS,
      priority: 95,
      reason: `link_${latestLinkStatus}`,
    };
  }
  if (daysToDeadline !== null && daysToDeadline >= 0 && daysToDeadline <= 7) {
    return {
      intervalMs: 6 * HOUR_MS,
      priority: 100,
      reason: "deadline_within_7_days",
    };
  }
  if (daysToDeadline !== null && daysToDeadline >= 0 && daysToDeadline <= 30) {
    return {
      intervalMs: 12 * HOUR_MS,
      priority: 90,
      reason: "deadline_within_30_days",
    };
  }
  if (published && OPEN_STATES.has(status)) {
    return {
      intervalMs: 24 * HOUR_MS,
      priority: 85,
      reason: "published_opportunity_still_active",
    };
  }
  return {
    intervalMs: Math.max(1, sourceIntervalHours) * HOUR_MS,
    priority: 60,
    reason: "source_crawl_interval_elapsed",
  };
};

export const scheduleDueRecrawls = async (
  database: Database,
  actorId: string,
  now = new Date()
): Promise<ScheduleRecrawlsResult> => {
  const contexts = await database
    .select({
      applicationRoundId: applicationRounds.id,
      applicationUrl: applicationRounds.applicationUrl,
      deadlineDate: applicationRounds.deadlineDate,
      editionId: editions.id,
      editionStatus: editions.status,
      linkCheckedAt: applicationLinkAssessments.checkedAt,
      linkCreatedAt: applicationLinkAssessments.createdAt,
      linkStatus: applicationLinkAssessments.status,
      publicationState: publicationVersions.editorialState,
      sourceAuthority: sources.authorityTier,
      sourceConcurrency: sources.concurrencyLimit,
      sourceDocumentId: sourceDocuments.id,
      sourceDocumentLastSeenAt: sourceDocuments.lastSeenAt,
      sourceDocumentUrl: sourceDocuments.canonicalUrl,
      sourceId: sources.id,
      sourceIntervalHours: sources.crawlIntervalHours,
      sourceRateLimit: sources.rateLimitPerMinute,
      sourceRenderingPolicy: sources.renderingPolicy,
    })
    .from(editionSourceDocuments)
    .innerJoin(
      sourceDocuments,
      eq(sourceDocuments.id, editionSourceDocuments.sourceDocumentId)
    )
    .innerJoin(sources, eq(sources.id, sourceDocuments.sourceId))
    .innerJoin(editions, eq(editions.id, editionSourceDocuments.editionId))
    .leftJoin(applicationRounds, eq(applicationRounds.editionId, editions.id))
    .leftJoin(
      applicationLinkAssessments,
      and(
        eq(applicationLinkAssessments.applicationRoundId, applicationRounds.id),
        eq(
          applicationLinkAssessments.originalUrl,
          applicationRounds.applicationUrl
        )
      )
    )
    .leftJoin(
      publicationVersions,
      eq(publicationVersions.editionId, editions.id)
    )
    .where(
      and(
        eq(sources.enabled, true),
        not(
          arrayContains(sources.discoveryMethods, [
            SUPERVISED_RUN_DISCOVERY_METHOD,
          ])
        )
      )
    )
    .orderBy(
      desc(
        sql<Date>`coalesce(${applicationLinkAssessments.checkedAt}, ${applicationLinkAssessments.createdAt})`
      ),
      desc(applicationLinkAssessments.createdAt),
      desc(publicationVersions.createdAt)
    );

  const uniqueContexts = latestBy(
    contexts,
    (context) =>
      `${context.editionId}:${context.sourceDocumentId}:${context.applicationRoundId ?? "none"}`
  );
  const result: ScheduleRecrawlsResult = {
    application_link_jobs: 0,
    source_document_jobs: 0,
  };
  for (const context of uniqueContexts.values()) {
    const published = context.publicationState === "published";
    const cadence = cadenceFor({
      daysToDeadline: daysUntil(context.deadlineDate, now),
      latestLinkStatus: context.linkStatus,
      published,
      sourceIntervalHours: context.sourceIntervalHours,
      status: context.editionStatus,
    });
    const sourceDue =
      ageMilliseconds(context.sourceDocumentLastSeenAt, now) >=
      cadence.intervalMs;
    if (sourceDue) {
      const created = await insertCandidate(database, {
        deduplicationKey: `source_document:${context.sourceDocumentId}:${hourBucket(now)}`,
        editionId: context.editionId,
        jobKind: "source_document",
        payload: {
          authority_tier: context.sourceAuthority,
          concurrency_limit: context.sourceConcurrency,
          rate_limit_per_minute: context.sourceRateLimit,
          rendering_policy: context.sourceRenderingPolicy,
          url: context.sourceDocumentUrl,
        },
        priority: cadence.priority,
        reason: cadence.reason,
        requestedBy: actorId,
        scheduledFor: now,
        sourceDocumentId: context.sourceDocumentId,
        sourceId: context.sourceId,
      });
      if (created) {
        result.source_document_jobs += 1;
      }
    }

    if (!(context.applicationRoundId && context.applicationUrl)) {
      continue;
    }
    const linkInterval = Math.min(cadence.intervalMs, 48 * HOUR_MS);
    const linkDue =
      ageMilliseconds(context.linkCheckedAt ?? context.linkCreatedAt, now) >=
      linkInterval;
    if (linkDue) {
      const created = await insertCandidate(database, {
        applicationRoundId: context.applicationRoundId,
        deduplicationKey: `application_link:${context.applicationRoundId}:${hourBucket(now)}`,
        editionId: context.editionId,
        jobKind: "application_link",
        payload: { url: context.applicationUrl },
        priority: cadence.priority,
        reason: cadence.reason,
        requestedBy: actorId,
        scheduledFor: now,
        sourceId: context.sourceId,
      });
      if (created) {
        result.application_link_jobs += 1;
      }
    }
  }
  await database.insert(auditEvents).values({
    action: "recrawl.schedule.completed",
    actorId,
    actorKind: "service",
    entityId: randomUUID(),
    entityType: "recrawl_schedule",
    metadata: { ...result, scheduled_at: now.toISOString() },
  });
  return result;
};

export const requestEditionRecrawl = async (
  database: Database,
  editionId: string,
  actorId: string,
  reason: string,
  idempotencyKey: string,
  now = new Date()
): Promise<RecrawlJob[]> =>
  database.transaction(async (transaction) => {
    const contexts = await transaction
      .select({
        applicationRoundId: applicationRounds.id,
        applicationUrl: applicationRounds.applicationUrl,
        sourceDocumentId: sourceDocuments.id,
        sourceDiscoveryMethods: sources.discoveryMethods,
        sourceDocumentUrl: sourceDocuments.canonicalUrl,
        sourceId: sources.id,
      })
      .from(editionSourceDocuments)
      .innerJoin(
        sourceDocuments,
        eq(sourceDocuments.id, editionSourceDocuments.sourceDocumentId)
      )
      .innerJoin(sources, eq(sources.id, sourceDocuments.sourceId))
      .leftJoin(
        applicationRounds,
        eq(applicationRounds.editionId, editionSourceDocuments.editionId)
      )
      .where(eq(editionSourceDocuments.editionId, editionId));
    if (contexts.length === 0) {
      throw new RecrawlWorkflowError(
        "EDITION_SOURCES_NOT_FOUND",
        "No source documents are linked to this edition."
      );
    }
    // A reviewer's recrawl request creates unattended queue work. A source
    // whose only discovery method is an operator-started supervised run must
    // never get any: its jobs would carry no source_run_id, and an unattended
    // worker would crawl it. The operator runs a supervised source run instead.
    const unattended = contexts.filter(
      (context) =>
        !context.sourceDiscoveryMethods.includes(
          SUPERVISED_RUN_DISCOVERY_METHOD
        )
    );
    if (unattended.length === 0) {
      throw new RecrawlWorkflowError(
        "SUPERVISED_SOURCE_ONLY",
        "This edition comes only from supervised-run sources; start a supervised source run instead."
      );
    }
    const uniqueSources = latestBy(
      unattended,
      (context) => context.sourceDocumentId
    );
    for (const context of uniqueSources.values()) {
      await insertCandidate(transaction, {
        deduplicationKey: `reviewer:${editionId}:${idempotencyKey}:source:${context.sourceDocumentId}`,
        editionId,
        jobKind: "source_document",
        payload: { url: context.sourceDocumentUrl },
        priority: 100,
        reason,
        requestedBy: actorId,
        scheduledFor: now,
        sourceDocumentId: context.sourceDocumentId,
        sourceId: context.sourceId,
      });
    }
    const uniqueRounds = latestBy(
      unattended.filter(
        (
          context
        ): context is typeof context & {
          applicationRoundId: string;
          applicationUrl: string;
        } => Boolean(context.applicationRoundId && context.applicationUrl)
      ),
      (context) => context.applicationRoundId
    );
    for (const context of uniqueRounds.values()) {
      await insertCandidate(transaction, {
        applicationRoundId: context.applicationRoundId,
        deduplicationKey: `reviewer:${editionId}:${idempotencyKey}:link:${context.applicationRoundId}`,
        editionId,
        jobKind: "application_link",
        payload: { url: context.applicationUrl },
        priority: 100,
        reason,
        requestedBy: actorId,
        scheduledFor: now,
        sourceId: context.sourceId,
      });
    }
    await transaction.insert(auditEvents).values({
      action: "recrawl.requested",
      actorId,
      actorKind: "reviewer",
      entityId: editionId,
      entityType: "edition",
      metadata: { idempotency_key: idempotencyKey, reason },
    });
    return transaction
      .select()
      .from(recrawlJobs)
      .where(eq(recrawlJobs.editionId, editionId))
      .orderBy(desc(recrawlJobs.createdAt));
  });

export const claimRecrawlJobs = (
  database: Database,
  workerId: string,
  limit = 10,
  now = new Date(),
  jobKinds?: string[],
  leaseDurationMs = RECRAWL_LEASE_DURATION_MS,
  // BF-10: a supervised source run claims only the jobs it enqueued.
  jobIds?: string[]
): Promise<RecrawlJob[]> =>
  // An explicitly empty kind list means "no kinds", never "every kind". Only an
  // omitted list is unfiltered, and no HTTP caller can omit it.
  jobKinds && jobKinds.length === 0
    ? Promise.resolve([])
    : claimRecrawlJobsInTransaction(
        database,
        workerId,
        limit,
        now,
        jobKinds,
        leaseDurationMs,
        jobIds
      );

const claimRecrawlJobsInTransaction = (
  database: Database,
  workerId: string,
  limit: number,
  now: Date,
  jobKinds: string[] | undefined,
  leaseDurationMs: number,
  jobIds: string[] | undefined
): Promise<RecrawlJob[]> =>
  database.transaction(async (transaction) => {
    const staleBefore = new Date(now.getTime() - leaseDurationMs);
    const jobKindFilter =
      jobKinds && jobKinds.length > 0
        ? inArray(recrawlJobs.jobKind, jobKinds)
        : undefined;
    // Jobs enqueued by a supervised source run are only ever claimed by that
    // run (by id); unscoped claims from unattended workers never see them.
    // Unattended claims (no job ids) never see supervised-run work, whatever
    // path created it: not a job enqueued by a run (it carries source_run_id),
    // and not any job whose source is supervised-run only. Claiming by explicit
    // ids is the supervised run's own path, gated by source-run:manage.
    const jobIdFilter =
      jobIds && jobIds.length > 0
        ? inArray(recrawlJobs.id, jobIds)
        : sql`NOT (${recrawlJobs.payload} ? 'source_run_id') AND NOT EXISTS (
            SELECT 1 FROM ${sources}
             WHERE ${sources.id} = ${recrawlJobs.sourceId}
               AND ${SUPERVISED_RUN_DISCOVERY_METHOD} = ANY (${sources.discoveryMethods}))`;
    const jobs = await transaction
      .select()
      .from(recrawlJobs)
      .where(
        and(
          lte(recrawlJobs.scheduledFor, now),
          jobKindFilter,
          jobIdFilter,
          or(
            eq(recrawlJobs.status, "queued"),
            and(
              eq(recrawlJobs.status, "running"),
              or(
                isNull(recrawlJobs.lockedAt),
                lte(recrawlJobs.lockedAt, staleBefore)
              )
            )
          )
        )
      )
      .orderBy(desc(recrawlJobs.priority), recrawlJobs.scheduledFor)
      .limit(Math.min(Math.max(limit, 1), 100))
      .for("update", { skipLocked: true });

    const claimed: RecrawlJob[] = [];
    for (const job of jobs) {
      if (job.attempts >= job.maxAttempts) {
        const terminalRows = await transaction
          .update(recrawlJobs)
          .set({
            completedAt: now,
            lastError:
              job.lastError ??
              "Recrawl attempt ceiling reached before a new claim.",
            lockedAt: null,
            lockedBy: null,
            status: "dead_lettered",
          })
          .where(eq(recrawlJobs.id, job.id))
          .returning();
        const terminal = terminalRows[0];
        if (!terminal) {
          throw new RecrawlWorkflowError(
            "RECRAWL_UPDATE_FAILED",
            "The exhausted recrawl job could not be dead-lettered."
          );
        }
        await transaction.insert(auditEvents).values({
          action: "recrawl.dead_lettered",
          actorId: workerId,
          actorKind: "service",
          entityId: job.id,
          entityType: "recrawl_job",
          metadata: {
            attempts: terminal.attempts,
            max_attempts: terminal.maxAttempts,
            reason: "attempt_ceiling_before_claim",
          },
        });
        continue;
      }

      const leaseToken = randomUUID();
      const claimedRows = await transaction
        .update(recrawlJobs)
        .set({
          attempts: job.attempts + 1,
          leaseToken,
          lockedAt: now,
          lockedBy: workerId,
          startedAt: job.startedAt ?? now,
          status: "running",
        })
        .where(eq(recrawlJobs.id, job.id))
        .returning();
      const claimedJob = claimedRows[0];
      if (!claimedJob) {
        throw new RecrawlWorkflowError(
          "RECRAWL_UPDATE_FAILED",
          "The recrawl claim could not be persisted."
        );
      }
      claimed.push(claimedJob);
    }
    return claimed;
  });

const hasActiveLease = (
  job: RecrawlJob,
  workerId: string,
  leaseToken: string,
  now: Date,
  leaseDurationMs: number
): boolean =>
  job.status === "running" &&
  job.lockedBy === workerId &&
  job.leaseToken === leaseToken &&
  job.lockedAt !== null &&
  job.lockedAt.getTime() + leaseDurationMs > now.getTime();

const assertActiveLease = (
  job: RecrawlJob,
  workerId: string,
  leaseToken: string,
  now: Date,
  leaseDurationMs: number
): void => {
  if (!hasActiveLease(job, workerId, leaseToken, now, leaseDurationMs)) {
    throw new RecrawlWorkflowError(
      "RECRAWL_LEASE_MISMATCH",
      "Only the current active recrawl lease may mutate this job."
    );
  }
};

export const checkpointRecrawlJob = (
  database: Database,
  jobId: string,
  workerId: string,
  leaseToken: string,
  ingestion: IngestionRequestV1,
  now = new Date(),
  leaseDurationMs = RECRAWL_LEASE_DURATION_MS
): Promise<RecrawlJob> =>
  database.transaction(async (transaction) => {
    if (!z.uuid().safeParse(jobId).success) {
      throw new RecrawlWorkflowError(
        "RECRAWL_JOB_NOT_FOUND",
        "The recrawl job does not exist."
      );
    }
    const rows = await transaction
      .select()
      .from(recrawlJobs)
      .where(eq(recrawlJobs.id, jobId))
      .limit(1)
      .for("update");
    const job = rows[0];
    if (!job) {
      throw new RecrawlWorkflowError(
        "RECRAWL_JOB_NOT_FOUND",
        "The recrawl job does not exist."
      );
    }
    assertActiveLease(job, workerId, leaseToken, now, leaseDurationMs);
    // A checkpoint stores a source-document ingestion request. No other job
    // kind has one, so accepting a checkpoint for another kind could only
    // corrupt that job's payload.
    if (job.jobKind !== "source_document") {
      throw new RecrawlWorkflowError(
        "RECRAWL_CHECKPOINT_UNSUPPORTED",
        "Only source-document recrawl jobs carry a pending ingestion checkpoint."
      );
    }
    const updatedRows = await transaction
      .update(recrawlJobs)
      .set({
        lockedAt: now,
        payload: {
          ...job.payload,
          pending_ingestion: ingestion,
          pending_ingestion_checkpointed_at: now.toISOString(),
        },
      })
      .where(eq(recrawlJobs.id, job.id))
      .returning();
    const updated = updatedRows[0];
    if (!updated) {
      throw new RecrawlWorkflowError(
        "RECRAWL_UPDATE_FAILED",
        "The recrawl checkpoint could not be persisted."
      );
    }
    await transaction.insert(auditEvents).values({
      action: "recrawl.ingestion_checkpointed",
      actorId: workerId,
      actorKind: "service",
      entityId: job.id,
      entityType: "recrawl_job",
      metadata: {
        idempotency_key: ingestion.idempotency_key,
        snapshot_id: ingestion.snapshot.id,
      },
    });
    return updated;
  });

export const completeRecrawlJob = (
  database: Database,
  jobId: string,
  workerId: string,
  leaseToken: string,
  input: CompleteRecrawlInput,
  now = new Date(),
  leaseDurationMs = RECRAWL_LEASE_DURATION_MS
): Promise<RecrawlJob> =>
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Completion keeps lock validation, retry state, and audit persistence in one auditable transaction.
  database.transaction(async (transaction) => {
    if (!z.uuid().safeParse(jobId).success) {
      throw new RecrawlWorkflowError(
        "RECRAWL_JOB_NOT_FOUND",
        "The recrawl job does not exist."
      );
    }
    const rows = await transaction
      .select()
      .from(recrawlJobs)
      .where(eq(recrawlJobs.id, jobId))
      .limit(1)
      .for("update");
    const job = rows[0];
    if (!job) {
      throw new RecrawlWorkflowError(
        "RECRAWL_JOB_NOT_FOUND",
        "The recrawl job does not exist."
      );
    }
    if (["completed", "dead_lettered"].includes(job.status)) {
      if (job.leaseToken !== leaseToken) {
        throw new RecrawlWorkflowError(
          "RECRAWL_LEASE_MISMATCH",
          "Only the final recrawl attempt may replay terminal completion."
        );
      }
      return job;
    }
    assertActiveLease(job, workerId, leaseToken, now, leaseDurationMs);

    const deadLettered =
      !input.success &&
      (input.retryable === false || job.attempts >= job.maxAttempts);
    const retryDelayMinutes = Math.min(360, 2 ** Math.max(job.attempts, 1));
    const nextScheduledFor = new Date(
      now.getTime() + retryDelayMinutes * 60 * 1000
    );
    let nextStatus = "queued";
    let auditAction = "recrawl.retry_scheduled";
    if (input.success) {
      nextStatus = "completed";
      auditAction = "recrawl.completed";
    } else if (deadLettered) {
      nextStatus = "dead_lettered";
      auditAction = "recrawl.dead_lettered";
    }
    const nextPayload: Record<string, unknown> = {
      ...job.payload,
      ingestion_id: input.ingestion_id,
      material_change: input.material_change,
    };
    if (input.success) {
      nextPayload.pending_ingestion = undefined;
      nextPayload.pending_ingestion_checkpointed_at = undefined;
    }
    const updatedRows = await transaction
      .update(recrawlJobs)
      .set({
        completedAt: input.success || deadLettered ? now : null,
        lastError: input.success
          ? null
          : (input.error ?? "Recrawl worker reported a failure."),
        leaseToken: input.success || deadLettered ? job.leaseToken : null,
        lockedAt: null,
        lockedBy: null,
        payload: nextPayload,
        scheduledFor:
          input.success || deadLettered ? job.scheduledFor : nextScheduledFor,
        status: nextStatus,
      })
      .where(eq(recrawlJobs.id, job.id))
      .returning();
    const updated = updatedRows[0];
    if (!updated) {
      throw new RecrawlWorkflowError(
        "RECRAWL_UPDATE_FAILED",
        "The recrawl completion could not be persisted."
      );
    }
    await transaction.insert(auditEvents).values({
      action: auditAction,
      actorId: workerId,
      actorKind: "service",
      entityId: job.id,
      entityType: "recrawl_job",
      metadata: {
        attempts: updated.attempts,
        ingestion_id: input.ingestion_id,
        material_change: input.material_change,
        retryable: input.retryable,
      },
    });
    return updated;
  });
