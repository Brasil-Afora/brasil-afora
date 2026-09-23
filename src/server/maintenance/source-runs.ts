import "server-only";

import { and, desc, eq, inArray, lte, max, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { sourceSchema } from "@/contracts/opportunity-v1";
import type { schema } from "@/db/schema";
import {
  auditEvents,
  recrawlJobs,
  sourceRuns,
  sources,
} from "@/db/schema/ingestion";

type Database = NodePgDatabase<typeof schema>;
type SourceRun = typeof sourceRuns.$inferSelect;
type RecrawlJob = typeof recrawlJobs.$inferSelect;
export type SourceRunStatus = SourceRun["status"];

// A run still "running" after this long lost its orchestrator; it is closed as
// failed so it can never be mistaken for an in-progress or healthy run.
export const SOURCE_RUN_STALE_AFTER_MS = 60 * 60 * 1000;
const MAX_CANDIDATES_PER_RUN = 10;
const ERROR_SUMMARY_LIMIT = 1000;
// Categories that mean the observation itself cannot be trusted at all.
const FAILING_CATEGORIES = new Set([
  "orchestrator_exception",
  "source_contract",
]);
const CATEGORY_PATTERN = /^[a-z][a-z0-9_]{0,59}$/;
const LAST_ERROR_CATEGORY_PATTERN = /^([a-z][a-z0-9_]{0,59}):/;

const counter = z.number().int().min(0).max(100_000);

export const sourceRunStartRequestSchema = z
  .object({
    source: sourceSchema,
    trigger: z.enum(["supervised"]),
  })
  .strict();

export const sourceRunCandidatesRequestSchema = z
  .object({
    candidates: z
      .array(
        z
          .object({
            role: z.enum(["opportunity_detail"]),
            url: z
              .url()
              .refine(
                (value) =>
                  value.startsWith("http://") || value.startsWith("https://")
              ),
          })
          .strict()
      )
      .min(1)
      .max(MAX_CANDIDATES_PER_RUN),
  })
  .strict();

export const sourceRunObservationSchema = z
  .object({
    candidates_discovered: counter,
    candidates_rejected: counter,
    candidates_valid: counter,
    discovery_completed: z.boolean(),
    errors: z
      .array(
        z
          .object({
            category: z.string().regex(CATEGORY_PATTERN),
            // Python truncates to 500 code points; allow for UTF-16 expansion.
            message: z.string().max(2000),
            url: z.string().max(2000).optional(),
          })
          .strict()
      )
      .max(100),
    pages_attempted: counter,
    pages_expected: counter,
    pages_failed: counter,
    pages_succeeded: counter,
    report: z.record(z.string(), z.unknown()).optional(),
    zero_yield_expected: z.boolean(),
  })
  .strict();

export type SourceRunObservation = z.infer<typeof sourceRunObservationSchema>;
export type SourceRunCandidate = z.infer<
  typeof sourceRunCandidatesRequestSchema
>["candidates"][number];

export interface DeliveryOutcome {
  completed: number;
  failed: number;
  failureCategories: string[];
}

export interface SourceRunClassification {
  errorCategories: string[];
  reconciliationEligible: boolean;
  status: Exclude<SourceRunStatus, "running">;
}

export interface SourceRunHealth {
  lastHealthyCompletedAt: Date | null;
  latestRun: SourceRun | null;
  reconciliationEligible: boolean;
}

export class SourceRunWorkflowError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SourceRunWorkflowError";
    this.code = code;
  }
}

/**
 * Health is conservative: only a run that discovered normally, fetched every
 * expected page, delivered every detail candidate successfully, and yielded
 * something (or whose contract says zero is plausible) is healthy. Only a
 * healthy run may ever feed missing-record reconciliation.
 */
export const classifySourceRun = (
  observation: SourceRunObservation,
  delivery: DeliveryOutcome
): SourceRunClassification => {
  const categories = [
    ...observation.errors.map((error) => error.category),
    ...delivery.failureCategories,
  ];
  const coverageContradiction =
    observation.pages_attempted < observation.pages_expected ||
    observation.pages_succeeded + observation.pages_failed !==
      observation.pages_attempted;
  if (coverageContradiction) {
    categories.push("incomplete_coverage");
  }
  const deliveredYield = delivery.completed + delivery.failed;
  if (deliveredYield === 0 && !observation.zero_yield_expected) {
    categories.push("suspicious_zero_yield");
  }
  const errorCategories = [...new Set(categories)];
  const failed =
    !observation.discovery_completed ||
    observation.pages_succeeded === 0 ||
    errorCategories.some((category) => FAILING_CATEGORIES.has(category));
  if (failed) {
    return { errorCategories, reconciliationEligible: false, status: "failed" };
  }
  const healthy =
    errorCategories.length === 0 &&
    observation.pages_failed === 0 &&
    delivery.failed === 0;
  if (!healthy) {
    return {
      errorCategories,
      reconciliationEligible: false,
      status: "degraded",
    };
  }
  // A plausible zero yield is still healthy, but the server cannot verify the
  // worker's plausibility claim, so it never feeds disappearance inference.
  return {
    errorCategories,
    reconciliationEligible: deliveredYield > 0,
    status: "healthy",
  };
};

const deliveryFromJobs = (jobs: RecrawlJob[]): DeliveryOutcome => {
  const outcome: DeliveryOutcome = {
    completed: 0,
    failed: 0,
    failureCategories: [],
  };
  for (const job of jobs) {
    if (job.status === "completed") {
      outcome.completed += 1;
      continue;
    }
    outcome.failed += 1;
    if (job.status === "dead_lettered") {
      const category = LAST_ERROR_CATEGORY_PATTERN.exec(job.lastError ?? "");
      outcome.failureCategories.push(category?.[1] ?? "delivery_dead_lettered");
    } else {
      // queued (retry scheduled) or running: the outcome is not known yet.
      outcome.failureCategories.push("delivery_pending");
    }
  }
  return outcome;
};

const lockRun = async (
  transaction: Parameters<Parameters<Database["transaction"]>[0]>[0],
  runId: string
): Promise<SourceRun> => {
  const rows = await transaction
    .select()
    .from(sourceRuns)
    .where(eq(sourceRuns.id, runId))
    .limit(1)
    .for("update");
  const run = rows[0];
  if (!run) {
    throw new SourceRunWorkflowError(
      "SOURCE_RUN_NOT_FOUND",
      "The source run does not exist."
    );
  }
  return run;
};

export const startSourceRun = (
  database: Database,
  actorId: string,
  input: z.infer<typeof sourceRunStartRequestSchema>,
  now = new Date()
): Promise<SourceRun> =>
  database.transaction(async (transaction) => {
    const { source } = input;
    // First contact registers the source exactly as ingestion would; an
    // existing row is never rewritten by a run.
    await transaction
      .insert(sources)
      .values({
        adapterName: source.adapter_name,
        adapterVersion: source.adapter_version,
        allowedPaths: source.allowed_paths,
        authorityTier: source.authority_tier,
        baseUrl: source.base_url,
        blockedPaths: source.blocked_paths,
        concurrencyLimit: source.concurrency_limit,
        crawlIntervalHours: source.crawl_interval_hours,
        discoveryMethods: source.discovery_methods,
        enabled: source.enabled,
        expectedCycles: source.expected_cycles,
        id: source.id,
        language: source.language,
        name: source.name,
        organizationId: source.organization_id,
        rateLimitPerMinute: source.rate_limit_per_minute,
        renderingPolicy: source.rendering_policy,
        reviewOwner: source.review_owner,
        sourceType: source.source_type,
      })
      .onConflictDoNothing();
    const registered = (
      await transaction
        .select({ baseUrl: sources.baseUrl, enabled: sources.enabled })
        .from(sources)
        .where(eq(sources.id, source.id))
        .limit(1)
    )[0];
    if (!registered || registered.baseUrl !== source.base_url) {
      throw new SourceRunWorkflowError(
        "SOURCE_IDENTITY_CONFLICT",
        "The source id and base URL do not match the registered source."
      );
    }
    // Keep the supervised-only marker current on rows registered earlier, so the
    // unattended scheduler can never resume crawling a supervised source.
    await transaction
      .update(sources)
      .set({ discoveryMethods: source.discovery_methods })
      .where(eq(sources.id, source.id));
    if (!registered.enabled) {
      throw new SourceRunWorkflowError(
        "SOURCE_DISABLED",
        "Disabled sources cannot start a run."
      );
    }

    const abandoned = await transaction
      .update(sourceRuns)
      .set({
        errorCategories: ["abandoned"],
        errorSummary: "Run never reported completion; closed as failed.",
        finishedAt: now,
        reconciliationEligible: false,
        status: "failed",
      })
      .where(
        and(
          eq(sourceRuns.sourceId, source.id),
          eq(sourceRuns.status, "running"),
          lte(
            sourceRuns.startedAt,
            new Date(now.getTime() - SOURCE_RUN_STALE_AFTER_MS)
          )
        )
      )
      .returning({ id: sourceRuns.id });
    if (abandoned.length > 0) {
      await transaction
        .update(sources)
        .set({ healthState: "failed" })
        .where(eq(sources.id, source.id));
    }
    for (const run of abandoned) {
      await transaction.insert(auditEvents).values({
        action: "source_run.abandoned",
        actorId,
        actorKind: "service",
        createdAt: now,
        entityId: run.id,
        entityType: "source_run",
        metadata: { source_id: source.id },
      });
    }

    const inserted = await transaction
      .insert(sourceRuns)
      .values({
        adapterVersion: source.adapter_version,
        requestedBy: actorId,
        sourceId: source.id,
        startedAt: now,
        trigger: input.trigger,
      })
      .onConflictDoNothing()
      .returning();
    const run = inserted[0];
    if (!run) {
      throw new SourceRunWorkflowError(
        "SOURCE_RUN_ALREADY_RUNNING",
        "Another run of this source is still in progress."
      );
    }
    await transaction.insert(auditEvents).values({
      action: "source_run.started",
      actorId,
      actorKind: "service",
      createdAt: now,
      entityId: run.id,
      entityType: "source_run",
      metadata: { source_id: source.id, trigger: input.trigger },
    });
    return run;
  });

export const enqueueSourceRunCandidates = (
  database: Database,
  runId: string,
  actorId: string,
  candidates: SourceRunCandidate[],
  now = new Date()
): Promise<RecrawlJob[]> =>
  database.transaction(async (transaction) => {
    const run = await lockRun(transaction, runId);
    if (run.status !== "running") {
      throw new SourceRunWorkflowError(
        "SOURCE_RUN_NOT_RUNNING",
        "Candidates can only be added to a running source run."
      );
    }
    const source = (
      await transaction
        .select({ baseUrl: sources.baseUrl })
        .from(sources)
        .where(eq(sources.id, run.sourceId))
        .limit(1)
    )[0];
    const origin = source ? new URL(source.baseUrl).origin : null;
    if (
      candidates.some((candidate) => new URL(candidate.url).origin !== origin)
    ) {
      throw new SourceRunWorkflowError(
        "SOURCE_RUN_CANDIDATE_OUTSIDE_SOURCE",
        "Every candidate must belong to the run's registered source origin."
      );
    }
    const keys = candidates.map(
      (candidate) => `source_run:${run.id}:${candidate.url}`
    );
    for (const [index, candidate] of candidates.entries()) {
      await transaction
        .insert(recrawlJobs)
        .values({
          deduplicationKey: keys[index] ?? "",
          jobKind: "source_document",
          payload: {
            document_role: candidate.role,
            source_run_id: run.id,
            url: candidate.url,
          },
          priority: 100,
          reason: "source_run_candidate",
          requestedBy: actorId,
          scheduledFor: now,
          sourceId: run.sourceId,
        })
        .onConflictDoNothing();
    }
    const jobs = await transaction
      .select()
      .from(recrawlJobs)
      .where(inArray(recrawlJobs.deduplicationKey, keys));
    return keys.flatMap((key) =>
      jobs.filter((job) => job.deduplicationKey === key)
    );
  });

export const completeSourceRun = (
  database: Database,
  runId: string,
  actorId: string,
  observation: SourceRunObservation,
  now = new Date()
): Promise<SourceRun> =>
  database.transaction(async (transaction) => {
    const run = await lockRun(transaction, runId);
    if (run.status !== "running") {
      // Terminal runs are history: a replayed or late completion never
      // rewrites what was recorded.
      return run;
    }
    const linkedJobs = await transaction
      .select()
      .from(recrawlJobs)
      .where(
        sql`${recrawlJobs.payload} ? 'source_run_id' AND ${recrawlJobs.payload}->>'source_run_id' = ${run.id}`
      );
    const delivery = deliveryFromJobs(linkedJobs);
    const classification = classifySourceRun(observation, delivery);
    const errorSummary =
      observation.errors
        .map((error) => `${error.category}: ${error.message}`)
        .join(" | ")
        .slice(0, ERROR_SUMMARY_LIMIT) || null;
    const updatedRows = await transaction
      .update(sourceRuns)
      .set({
        candidatesDiscovered: observation.candidates_discovered,
        candidatesRejected: observation.candidates_rejected,
        candidatesValid: observation.candidates_valid,
        discoveryCompleted: observation.discovery_completed,
        errorCategories: classification.errorCategories,
        errorSummary,
        finishedAt: now,
        ingestionFailures: delivery.failed,
        ingestionSuccesses: delivery.completed,
        pagesAttempted: observation.pages_attempted,
        pagesExpected: observation.pages_expected,
        pagesFailed: observation.pages_failed,
        pagesSucceeded: observation.pages_succeeded,
        reconciliationEligible: classification.reconciliationEligible,
        report: {
          ...(observation.report ?? {}),
          errors: observation.errors,
          linked_job_ids: linkedJobs.map((job) => job.id),
          zero_yield_expected: observation.zero_yield_expected,
        },
        status: classification.status,
      })
      .where(eq(sourceRuns.id, run.id))
      .returning();
    const updated = updatedRows[0];
    if (!updated) {
      throw new SourceRunWorkflowError(
        "SOURCE_RUN_UPDATE_FAILED",
        "The source run completion could not be persisted."
      );
    }
    await transaction
      .update(sources)
      .set({ healthState: classification.status })
      .where(eq(sources.id, run.sourceId));
    await transaction.insert(auditEvents).values({
      action: "source_run.completed",
      actorId,
      actorKind: "service",
      createdAt: now,
      entityId: run.id,
      entityType: "source_run",
      metadata: {
        error_categories: classification.errorCategories,
        ingestion_failures: delivery.failed,
        ingestion_successes: delivery.completed,
        pages_attempted: observation.pages_attempted,
        pages_failed: observation.pages_failed,
        reconciliation_eligible: classification.reconciliationEligible,
        status: classification.status,
      },
    });
    return updated;
  });

/**
 * The only question a future disappearance pass may ask: is the latest run of
 * this source healthy and complete? Anything else — running, degraded, failed,
 * or no run at all — means unseen opportunities must be retained.
 */
export const getSourceRunHealth = async (
  database: Database,
  sourceId: string
): Promise<SourceRunHealth> => {
  const [latestRows, healthyRows] = await Promise.all([
    database
      .select()
      .from(sourceRuns)
      .where(eq(sourceRuns.sourceId, sourceId))
      .orderBy(desc(sourceRuns.startedAt))
      .limit(1),
    database
      .select({ finishedAt: max(sourceRuns.finishedAt) })
      .from(sourceRuns)
      .where(
        and(eq(sourceRuns.sourceId, sourceId), eq(sourceRuns.status, "healthy"))
      ),
  ]);
  const latestRun = latestRows[0] ?? null;
  return {
    lastHealthyCompletedAt: healthyRows[0]?.finishedAt ?? null,
    latestRun,
    reconciliationEligible:
      latestRun?.status === "healthy" && latestRun.reconciliationEligible,
  };
};
