import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, it } from "vitest";
import { sourceSchema } from "@/contracts/opportunity-v1";
import { schema } from "@/db/schema";
import {
  claimRecrawlJobs,
  completeRecrawlJob,
  scheduleDueRecrawls,
} from "@/server/maintenance/recrawl-scheduler";
import { sourceRunIdOrNotFound } from "@/server/maintenance/source-run-http";
import {
  classifySourceRun,
  completeSourceRun,
  enqueueSourceRunCandidates,
  getSourceRunHealth,
  type SourceRunObservation,
  SourceRunWorkflowError,
  startSourceRun,
} from "@/server/maintenance/source-runs";

const SOURCE_ID = "5b0f1c1e-6f6c-5d4a-9c1e-00000000b010";
const BASE_URL = "https://one.ufma.br/";
const WORKER = "maintenance-worker";
const T0 = new Date("2026-09-19T18:00:00Z");

const migrate = async (client: PGlite): Promise<void> => {
  for (const migration of [
    "../../db/migrations/20260723000000_existing_application_baseline/migration.sql",
    "../../db/migrations/20260723224642_fixed_mantis/migration.sql",
    "../../db/migrations/20260723225823_add_audit_events/migration.sql",
    "../../db/migrations/20260723233636_lifecycle_maintenance/migration.sql",
    "../../db/migrations/20260725213000_semantic_field_states/migration.sql",
    "../../db/migrations/20260916080000_bf08_recrawl_lease_fencing/migration.sql",
    "../../db/migrations/20260919120000_bf10_source_runs/migration.sql",
  ]) {
    await client.exec(
      readFileSync(new URL(migration, import.meta.url), "utf8")
    );
  }
};

const createDatabase = async () => {
  const client = new PGlite();
  await migrate(client);
  const database = drizzle({ casing: "snake_case", client, schema });
  return {
    client,
    database: database as unknown as Parameters<typeof startSourceRun>[0],
  };
};

const source = sourceSchema.parse({
  adapter_name: "one_ufma",
  adapter_version: "1",
  allowed_paths: ["/", "/regulamento"],
  authority_tier: 90,
  base_url: BASE_URL,
  blocked_paths: [],
  concurrency_limit: 1,
  crawl_interval_hours: 24,
  discovery_methods: ["homepage_links"],
  enabled: true,
  expected_cycles: [],
  id: SOURCE_ID,
  language: "pt-BR",
  name: "ONE — Olimpíada Nacional de Empreendedorismo (UFMA)",
  organization_id: null,
  rate_limit_per_minute: 6,
  rendering_policy: "never",
  review_owner: null,
  source_type: "website",
});

const healthyObservation = (
  overrides: Partial<SourceRunObservation> = {}
): SourceRunObservation => ({
  candidates_discovered: 12,
  candidates_rejected: 10,
  candidates_valid: 2,
  discovery_completed: true,
  errors: [],
  pages_attempted: 3,
  pages_expected: 3,
  pages_failed: 0,
  pages_succeeded: 3,
  zero_yield_expected: false,
  ...overrides,
});

const allDelivered = { completed: 1, failed: 0, failureCategories: [] };

describe("BF-10 source-run health classification", () => {
  it("records a healthy full completion as reconciliation eligible", () => {
    expect(classifySourceRun(healthyObservation(), allDelivered)).toEqual({
      errorCategories: [],
      reconciliationEligible: true,
      status: "healthy",
    });
  });

  it("marks a partial fetch failure degraded and ineligible for reconciliation", () => {
    const result = classifySourceRun(
      healthyObservation({
        candidates_valid: 1,
        errors: [
          {
            category: "http_transient",
            message: "HTTP 500",
            url: `${BASE_URL}regulamento`,
          },
        ],
        pages_failed: 1,
        pages_succeeded: 2,
      }),
      allDelivered
    );
    expect(result.status).toBe("degraded");
    expect(result.reconciliationEligible).toBe(false);
    expect(result.errorCategories).toContain("http_transient");
  });

  it("treats a suspicious zero yield as degraded rather than 'no opportunities'", () => {
    const result = classifySourceRun(
      healthyObservation({ candidates_valid: 0, pages_expected: 1 }),
      { completed: 0, failed: 0, failureCategories: [] }
    );
    expect(result).toEqual({
      errorCategories: ["suspicious_zero_yield"],
      reconciliationEligible: false,
      status: "degraded",
    });
  });

  it("accepts zero yield only when the source contract declares it plausible", () => {
    const result = classifySourceRun(
      healthyObservation({
        candidates_valid: 0,
        pages_expected: 1,
        zero_yield_expected: true,
      }),
      { completed: 0, failed: 0, failureCategories: [] }
    );
    expect(result.status).toBe("healthy");
    // The server cannot verify the worker's claim that zero is plausible, and a
    // zero-yield run is exactly what a disappearance pass would act on.
    expect(result.reconciliationEligible).toBe(false);
  });

  it("fails the run on a parser/page-role contract failure", () => {
    const result = classifySourceRun(
      healthyObservation({
        errors: [{ category: "source_contract", message: "role changed" }],
      }),
      allDelivered
    );
    expect(result.status).toBe("failed");
    expect(result.reconciliationEligible).toBe(false);
  });

  it("fails the run when discovery did not terminate normally", () => {
    const result = classifySourceRun(
      healthyObservation({
        discovery_completed: false,
        errors: [{ category: "transport", message: "timeout" }],
        pages_attempted: 1,
        pages_failed: 1,
        pages_succeeded: 0,
      }),
      { completed: 0, failed: 0, failureCategories: [] }
    );
    expect(result.status).toBe("failed");
  });

  it("never reports healthy before every delivery outcome is terminal and successful", () => {
    const pending = classifySourceRun(healthyObservation(), {
      completed: 0,
      failed: 1,
      failureCategories: ["delivery_pending"],
    });
    expect(pending.status).toBe("degraded");
    expect(pending.reconciliationEligible).toBe(false);
    expect(pending.errorCategories).toContain("delivery_pending");
  });

  it("does not trust counters that contradict each other", () => {
    const result = classifySourceRun(
      healthyObservation({ pages_attempted: 2, pages_expected: 3 }),
      allDelivered
    );
    expect(result.status).toBe("degraded");
    expect(result.errorCategories).toContain("incomplete_coverage");
  });
});

describe("BF-10 source-run route ids", () => {
  it("answers 404 for a non-UUID run id instead of a retryable 500", async () => {
    const invalid = sourceRunIdOrNotFound("not-a-uuid");
    expect(invalid.response?.status).toBe(404);
    await expect(invalid.response?.json()).resolves.toMatchObject({
      error: { code: "SOURCE_RUN_NOT_FOUND" },
    });
    expect(
      sourceRunIdOrNotFound("00000000-0000-4000-8000-000000000001")
    ).toEqual({ id: "00000000-0000-4000-8000-000000000001", response: null });
  });
});

describe("BF-10 source-run persistence", () => {
  it("starts one running run per source and records the start", async () => {
    const { client, database } = await createDatabase();
    try {
      const run = await startSourceRun(
        database,
        WORKER,
        { source, trigger: "supervised" },
        T0
      );
      expect(run).toMatchObject({
        reconciliationEligible: false,
        sourceId: SOURCE_ID,
        status: "running",
      });
      expect(run.startedAt.toISOString()).toBe(T0.toISOString());
      await expect(
        startSourceRun(database, WORKER, { source, trigger: "supervised" }, T0)
      ).rejects.toMatchObject({ code: "SOURCE_RUN_ALREADY_RUNNING" });

      const sourceRows = await client.query<{ health_state: string }>(
        `SELECT health_state FROM sources WHERE id = '${SOURCE_ID}'`
      );
      expect(sourceRows.rows).toEqual([{ health_state: "unknown" }]);
    } finally {
      await client.close();
    }
  });

  it("closes an abandoned running run as failed instead of blocking forever", async () => {
    const { client, database } = await createDatabase();
    try {
      const abandoned = await startSourceRun(
        database,
        WORKER,
        { source, trigger: "supervised" },
        T0
      );
      const later = new Date(T0.getTime() + 2 * 60 * 60 * 1000);
      const next = await startSourceRun(
        database,
        WORKER,
        { source, trigger: "supervised" },
        later
      );
      const rows = await client.query<{
        error_categories: string[];
        id: string;
        reconciliation_eligible: boolean;
        status: string;
      }>(
        "SELECT id::text, status, reconciliation_eligible, error_categories FROM source_runs ORDER BY started_at"
      );
      const health = await client.query<{ health_state: string }>(
        `SELECT health_state FROM sources WHERE id = '${SOURCE_ID}'`
      );
      expect(health.rows).toEqual([{ health_state: "failed" }]);
      expect(rows.rows).toEqual([
        {
          error_categories: ["abandoned"],
          id: abandoned.id,
          reconciliation_eligible: false,
          status: "failed",
        },
        {
          error_categories: [],
          id: next.id,
          reconciliation_eligible: false,
          status: "running",
        },
      ]);
    } finally {
      await client.close();
    }
  });

  it("links detail candidates to the run as bounded same-origin BF-07 jobs", async () => {
    const { client, database } = await createDatabase();
    try {
      const run = await startSourceRun(
        database,
        WORKER,
        { source, trigger: "supervised" },
        T0
      );
      await expect(
        enqueueSourceRunCandidates(
          database,
          run.id,
          WORKER,
          [{ role: "opportunity_detail", url: "https://evil.example/" }],
          T0
        )
      ).rejects.toMatchObject({ code: "SOURCE_RUN_CANDIDATE_OUTSIDE_SOURCE" });

      const jobs = await enqueueSourceRunCandidates(
        database,
        run.id,
        WORKER,
        [{ role: "opportunity_detail", url: BASE_URL }],
        T0
      );
      const replay = await enqueueSourceRunCandidates(
        database,
        run.id,
        WORKER,
        [{ role: "opportunity_detail", url: BASE_URL }],
        T0
      );
      expect(replay.map((job) => job.id)).toEqual(jobs.map((job) => job.id));
      expect(jobs).toHaveLength(1);
      expect(jobs[0]).toMatchObject({
        jobKind: "source_document",
        payload: {
          document_role: "opportunity_detail",
          source_run_id: run.id,
          url: BASE_URL,
        },
        sourceId: SOURCE_ID,
        status: "queued",
      });
      const count = await client.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM recrawl_jobs"
      );
      expect(count.rows[0]?.count).toBe(1);
    } finally {
      await client.close();
    }
  });

  it("derives delivery outcomes from linked jobs instead of trusting the worker", async () => {
    const { client, database } = await createDatabase();
    try {
      const run = await startSourceRun(
        database,
        WORKER,
        { source, trigger: "supervised" },
        T0
      );
      await enqueueSourceRunCandidates(
        database,
        run.id,
        WORKER,
        [{ role: "opportunity_detail", url: BASE_URL }],
        T0
      );
      // The job was never claimed, so delivery is still pending even though
      // the reported observation claims full coverage.
      const completed = await completeSourceRun(
        database,
        run.id,
        WORKER,
        healthyObservation(),
        T0
      );
      expect(completed).toMatchObject({
        ingestionFailures: 1,
        ingestionSuccesses: 0,
        reconciliationEligible: false,
        status: "degraded",
      });
      expect(completed.errorCategories).toContain("delivery_pending");
    } finally {
      await client.close();
    }
  });

  it("records a healthy completion, source health, and last healthy completion", async () => {
    const { client, database } = await createDatabase();
    try {
      const run = await startSourceRun(
        database,
        WORKER,
        { source, trigger: "supervised" },
        T0
      );
      const enqueued = await enqueueSourceRunCandidates(
        database,
        run.id,
        WORKER,
        [{ role: "opportunity_detail", url: BASE_URL }],
        T0
      );
      const [job] = await claimRecrawlJobs(
        database as never,
        WORKER,
        1,
        T0,
        ["source_document"],
        undefined,
        enqueued.map((item) => item.id)
      );
      if (!job?.leaseToken) {
        throw new Error("expected a claimed job");
      }
      await completeRecrawlJob(
        database as never,
        job.id,
        WORKER,
        job.leaseToken,
        { success: true },
        T0
      );
      const finishedAt = new Date(T0.getTime() + 60_000);
      const completed = await completeSourceRun(
        database,
        run.id,
        WORKER,
        healthyObservation(),
        finishedAt
      );
      expect(completed).toMatchObject({
        candidatesValid: 2,
        ingestionFailures: 0,
        ingestionSuccesses: 1,
        pagesAttempted: 3,
        reconciliationEligible: true,
        status: "healthy",
      });
      expect(completed.finishedAt?.toISOString()).toBe(
        finishedAt.toISOString()
      );

      const replay = await completeSourceRun(
        database,
        run.id,
        WORKER,
        healthyObservation({ pages_failed: 3 }),
        new Date(finishedAt.getTime() + 60_000)
      );
      expect(replay).toEqual(completed);

      const health = await getSourceRunHealth(database, SOURCE_ID);
      expect(health.lastHealthyCompletedAt?.toISOString()).toBe(
        finishedAt.toISOString()
      );
      expect(health.reconciliationEligible).toBe(true);
      const sourceRows = await client.query<{ health_state: string }>(
        `SELECT health_state FROM sources WHERE id = '${SOURCE_ID}'`
      );
      expect(sourceRows.rows).toEqual([{ health_state: "healthy" }]);
      const audit = await client.query<{ action: string }>(
        "SELECT action FROM audit_events WHERE entity_type = 'source_run' ORDER BY created_at, action"
      );
      expect(audit.rows.map((row) => row.action)).toEqual([
        "source_run.started",
        "source_run.completed",
      ]);
    } finally {
      await client.close();
    }
  });

  it("keeps the last healthy completion when a later run is degraded", async () => {
    const { client, database } = await createDatabase();
    try {
      const healthy = await startSourceRun(
        database,
        WORKER,
        { source, trigger: "supervised" },
        T0
      );
      await completeSourceRun(
        database,
        healthy.id,
        WORKER,
        healthyObservation({ candidates_valid: 0, zero_yield_expected: true }),
        T0
      );
      const later = new Date(T0.getTime() + 3_600_000);
      const degraded = await startSourceRun(
        database,
        WORKER,
        { source, trigger: "supervised" },
        later
      );
      await completeSourceRun(
        database,
        degraded.id,
        WORKER,
        healthyObservation({
          errors: [{ category: "http_transient", message: "HTTP 503" }],
          pages_failed: 1,
          pages_succeeded: 2,
        }),
        later
      );

      const health = await getSourceRunHealth(database, SOURCE_ID);
      expect(health.latestRun?.status).toBe("degraded");
      expect(health.reconciliationEligible).toBe(false);
      expect(health.lastHealthyCompletedAt?.toISOString()).toBe(
        T0.toISOString()
      );
      const sourceRows = await client.query<{ health_state: string }>(
        `SELECT health_state FROM sources WHERE id = '${SOURCE_ID}'`
      );
      expect(sourceRows.rows).toEqual([{ health_state: "degraded" }]);
    } finally {
      await client.close();
    }
  });

  it("claims only the run's own jobs when job ids are given", async () => {
    const { client, database } = await createDatabase();
    try {
      await client.exec(`
        INSERT INTO recrawl_jobs (job_kind, reason, priority, deduplication_key,
          requested_by, scheduled_for, payload)
        VALUES ('source_document', 'unrelated', 100, 'bf10-unrelated', 'fixture',
          '2026-09-19T17:00:00Z', '{"url":"https://www.ifes.edu.br/x"}')
      `);
      const run = await startSourceRun(
        database,
        WORKER,
        { source, trigger: "supervised" },
        T0
      );
      const [own] = await enqueueSourceRunCandidates(
        database,
        run.id,
        WORKER,
        [{ role: "opportunity_detail", url: BASE_URL }],
        T0
      );
      if (!own) {
        throw new Error("expected an enqueued job");
      }
      const claimed = await claimRecrawlJobs(
        database as never,
        WORKER,
        1,
        T0,
        ["source_document"],
        undefined,
        [own.id]
      );
      expect(claimed.map((job) => job.id)).toEqual([own.id]);
      const unrelated = await client.query<{ status: string }>(
        "SELECT status FROM recrawl_jobs WHERE deduplication_key = 'bf10-unrelated'"
      );
      expect(unrelated.rows).toEqual([{ status: "queued" }]);
    } finally {
      await client.close();
    }
  });

  it("never schedules unattended recrawls for a supervised-run-only source", async () => {
    const { client, database } = await createDatabase();
    try {
      const seed = async (suffix: string, discoveryMethods: string) => {
        const id = (n: number) =>
          `00000000-0000-4000-8000-0000000${suffix}${String(n).padStart(2, "0")}`;
        await client.exec(`
          INSERT INTO sources (id, name, base_url, source_type, authority_tier,
            crawl_interval_hours, rate_limit_per_minute, concurrency_limit,
            rendering_policy, discovery_methods, enabled)
          VALUES ('${id(1)}', 'S${suffix}', 'https://s${suffix}.example/', 'website', 90,
            24, 6, 1, 'never', ${discoveryMethods}, true);
          INSERT INTO source_documents (id, source_id, url, canonical_url, last_seen_at)
          VALUES ('${id(2)}', '${id(1)}', 'https://s${suffix}.example/', 'https://s${suffix}.example/',
            '2026-09-01T00:00:00Z');
          INSERT INTO programs (id, canonical_name) VALUES ('${id(3)}', 'P${suffix}');
          INSERT INTO editions (id, program_id, identity_key, edition_label, status)
          VALUES ('${id(4)}', '${id(3)}', '2026', '2026', 'closed');
          INSERT INTO edition_source_documents (edition_id, source_document_id, relationship_role)
          VALUES ('${id(4)}', '${id(2)}', 'primary');
        `);
      };
      await seed("101", "ARRAY['supervised_run']");
      await seed("102", "ARRAY['homepage_links']");

      const result = await scheduleDueRecrawls(database as never, WORKER, T0);

      expect(result.source_document_jobs).toBe(1);
      const jobs = await client.query<{ source_id: string }>(
        "SELECT source_id::text FROM recrawl_jobs"
      );
      expect(jobs.rows).toEqual([
        { source_id: "00000000-0000-4000-8000-000000010201" },
      ]);
    } finally {
      await client.close();
    }
  });

  it("keeps source-run jobs away from unscoped (unattended) claims", async () => {
    const { client, database } = await createDatabase();
    try {
      const run = await startSourceRun(
        database,
        WORKER,
        { source, trigger: "supervised" },
        T0
      );
      await enqueueSourceRunCandidates(
        database,
        run.id,
        WORKER,
        [{ role: "opportunity_detail", url: BASE_URL }],
        T0
      );
      const unscoped = await claimRecrawlJobs(
        database as never,
        WORKER,
        10,
        T0,
        ["source_document"]
      );
      expect(unscoped).toEqual([]);
      const queued = await client.query<{ status: string }>(
        "SELECT status FROM recrawl_jobs"
      );
      expect(queued.rows).toEqual([{ status: "queued" }]);
    } finally {
      await client.close();
    }
  });

  it("refreshes the supervised-run marker on a previously registered source", async () => {
    const { client, database } = await createDatabase();
    try {
      await startSourceRun(
        database,
        WORKER,
        {
          source: { ...source, discovery_methods: ["homepage_links"] },
          trigger: "supervised",
        },
        T0
      );
      await startSourceRun(
        database,
        WORKER,
        {
          source: { ...source, discovery_methods: ["supervised_run"] },
          trigger: "supervised",
        },
        new Date(T0.getTime() + 2 * 60 * 60 * 1000)
      );
      const rows = await client.query<{ discovery_methods: string[] }>(
        "SELECT discovery_methods FROM sources"
      );
      expect(rows.rows).toEqual([{ discovery_methods: ["supervised_run"] }]);
    } finally {
      await client.close();
    }
  });

  it("refuses candidates or completion for an unknown run", async () => {
    const { client, database } = await createDatabase();
    try {
      await expect(
        completeSourceRun(
          database,
          "00000000-0000-4000-8000-000000000000",
          WORKER,
          healthyObservation(),
          T0
        )
      ).rejects.toBeInstanceOf(SourceRunWorkflowError);
    } finally {
      await client.close();
    }
  });
});
