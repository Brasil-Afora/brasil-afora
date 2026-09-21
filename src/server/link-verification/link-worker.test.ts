import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, it } from "vitest";
import { schema } from "@/db/schema";
import { ApplicationLinkVerificationError } from "@/server/link-verification/application-link-verifier";
import {
  type ClaimedLinkJob,
  createDatabaseLinkVerifier,
  type LinkQueueBoundary,
  type LinkVerificationOutcome,
  runLinkWorkerBatch,
} from "@/server/link-verification/link-worker";
import {
  checkpointRecrawlJob,
  claimRecrawlJobs,
  completeRecrawlJob,
} from "@/server/maintenance/recrawl-scheduler";

const LEASE_MS = 15 * 60 * 1000;
const LINK_WORKER = "link-worker";
const SOURCE_WORKER = "source-worker";

type Database = Parameters<typeof claimRecrawlJobs>[0];

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

const dbFor = (client: PGlite): Database =>
  drizzle({ casing: "snake_case", client, schema }) as unknown as Database;

/** Seed an edition with one application round, returning the round id. */
const seedApplicationRound = async (
  client: PGlite,
  applicationUrl: string | null
): Promise<string> => {
  const organization = await client.query<{ id: string }>(
    `INSERT INTO organizations (canonical_name, country_code, official_domains)
     VALUES ('Fixture Org', 'BR', ARRAY['example.org']) RETURNING id`
  );
  const organizationId = organization.rows[0]?.id;
  const program = await client.query<{ id: string }>(
    `INSERT INTO programs (id, canonical_name, organizer_id, official_homepage)
     VALUES (gen_random_uuid(), 'Fixture Program', $1, 'https://example.org/')
     RETURNING id`,
    [organizationId]
  );
  const programId = program.rows[0]?.id;
  const edition = await client.query<{ id: string }>(
    `INSERT INTO editions (id, program_id, identity_key, edition_label, edition_year, status)
     VALUES (gen_random_uuid(), $1, '2026', '2026', 2026, 'open') RETURNING id`,
    [programId]
  );
  const editionId = edition.rows[0]?.id;
  const round = await client.query<{ id: string }>(
    `INSERT INTO application_rounds (
       id, edition_id, round_key, round_name, deadline_type, application_url, status
     ) VALUES (gen_random_uuid(), $1, 'main:all', 'Main', 'fixed', $2, 'open')
     RETURNING id`,
    [editionId, applicationUrl]
  );
  const roundId = round.rows[0]?.id;
  if (!roundId) {
    throw new Error("fixture application round was not inserted");
  }
  return roundId;
};

const seedLinkJob = async (
  client: PGlite,
  applicationRoundId: string | null,
  suffix: string,
  maxAttempts = 3
): Promise<string> => {
  const rows = await client.query<{ id: string }>(
    `INSERT INTO recrawl_jobs (
       job_kind, reason, priority, deduplication_key, requested_by,
       scheduled_for, max_attempts, payload, application_round_id
     ) VALUES (
       'application_link', 'link fixture', 100, $1, 'link-worker-test',
       '2026-09-20T08:00:00Z', $2, $3::jsonb, $4
     ) RETURNING id`,
    [
      `link-${suffix}`,
      maxAttempts,
      JSON.stringify({ url: "https://example.org/apply" }),
      applicationRoundId,
    ]
  );
  const id = rows.rows[0]?.id;
  if (!id) {
    throw new Error("fixture link job was not inserted");
  }
  return id;
};

const seedSourceDocumentJob = async (
  client: PGlite,
  suffix: string
): Promise<string> => {
  const rows = await client.query<{ id: string }>(
    `INSERT INTO recrawl_jobs (
       job_kind, reason, priority, deduplication_key, requested_by,
       scheduled_for, max_attempts, payload
     ) VALUES (
       'source_document', 'doc fixture', 100, $1, 'link-worker-test',
       '2026-09-20T08:00:00Z', 3, '{"url":"https://example.org/doc"}'::jsonb
     ) RETURNING id`,
    [`doc-${suffix}`]
  );
  const id = rows.rows[0]?.id;
  if (!id) {
    throw new Error("fixture source-document job was not inserted");
  }
  return id;
};

/**
 * A queue boundary backed by the real BF-07/BF-08 claim and completion
 * functions, so lease fencing is exercised rather than simulated.
 */
const realQueue = (
  database: Database,
  now: Date,
  workerId = LINK_WORKER
): LinkQueueBoundary & { claims: number } => ({
  claims: 0,
  async claim(limit: number): Promise<ClaimedLinkJob[]> {
    const jobs = await claimRecrawlJobs(database, workerId, limit, now, [
      "application_link",
    ]);
    return jobs.map((job) => ({
      applicationRoundId:
        (job as { applicationRoundId: string | null }).applicationRoundId ??
        null,
      id: job.id,
      jobKind: job.jobKind,
      leaseToken: (job as { leaseToken: string | null }).leaseToken ?? "",
      status: job.status,
    }));
  },
  complete(jobId, leaseToken, input) {
    return completeRecrawlJob(
      database,
      jobId,
      workerId,
      leaseToken,
      input,
      now,
      LEASE_MS
    );
  },
});

const jobRow = async (
  client: PGlite,
  jobId: string
): Promise<{
  attempts: number;
  last_error: string | null;
  lease_token: string | null;
  locked_by: string | null;
  payload: Record<string, unknown>;
  status: string;
}> => {
  const rows = await client.query<{
    attempts: number;
    last_error: string | null;
    lease_token: string | null;
    locked_by: string | null;
    payload: Record<string, unknown>;
    status: string;
  }>(
    "SELECT attempts, last_error, lease_token, locked_by, payload, status FROM recrawl_jobs WHERE id = $1",
    [jobId]
  );
  const row = rows.rows[0];
  if (!row) {
    throw new Error("job row not found");
  }
  return row;
};

const verifierReturning = (
  outcome: LinkVerificationOutcome
): (() => Promise<LinkVerificationOutcome>) => {
  return () => Promise.resolve(outcome);
};

describe("application-link worker execution", () => {
  it("claims only application-link jobs and leaves source-document work alone", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const roundId = await seedApplicationRound(
        client,
        "https://example.org/apply"
      );
      const linkJobId = await seedLinkJob(client, roundId, "only-link");
      const documentJobId = await seedSourceDocumentJob(client, "untouched");
      const database = dbFor(client);
      const now = new Date("2026-09-20T09:00:00Z");

      const results = await runLinkWorkerBatch({
        limit: 10,
        queue: realQueue(database, now),
        verify: verifierReturning({
          materialChange: true,
          previousStatus: null,
          status: "available",
        }),
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        jobId: linkJobId,
        materialChange: true,
        status: "available",
        success: true,
      });
      expect((await jobRow(client, linkJobId)).status).toBe("completed");
      const untouched = await jobRow(client, documentJobId);
      expect(untouched.status).toBe("queued");
      expect(untouched.attempts).toBe(0);
      expect(untouched.locked_by).toBeNull();
    } finally {
      await client.close();
    }
  });

  it("completes under the lease token issued at claim time", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const roundId = await seedApplicationRound(
        client,
        "https://example.org/apply"
      );
      const jobId = await seedLinkJob(client, roundId, "lease-token");
      const database = dbFor(client);
      const now = new Date("2026-09-20T09:00:00Z");
      const queue = realQueue(database, now);
      let observedLeaseToken: string | null = null;
      const wrapped: LinkQueueBoundary = {
        async claim(limit) {
          const jobs = await queue.claim(limit);
          observedLeaseToken = jobs[0]?.leaseToken ?? null;
          return jobs;
        },
        complete: queue.complete,
      };

      await runLinkWorkerBatch({
        limit: 1,
        queue: wrapped,
        verify: verifierReturning({
          materialChange: false,
          previousStatus: "available",
          status: "available",
        }),
      });

      const row = await jobRow(client, jobId);
      expect(row.status).toBe("completed");
      expect(row.locked_by).toBeNull();
      // BF-08 keeps the final attempt's token on a terminal job so a replayed
      // completion from that attempt stays idempotent.
      expect(row.lease_token).toBe(observedLeaseToken);
      expect(row.payload.material_change).toBe(false);
    } finally {
      await client.close();
    }
  });

  it("cannot complete a job claimed by another worker identity", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const roundId = await seedApplicationRound(
        client,
        "https://example.org/apply"
      );
      const jobId = await seedLinkJob(client, roundId, "wrong-identity");
      const database = dbFor(client);
      const now = new Date("2026-09-20T09:00:00Z");

      const [claimed] = await claimRecrawlJobs(database, LINK_WORKER, 1, now, [
        "application_link",
      ]);
      const leaseToken = (claimed as { leaseToken: string }).leaseToken;

      // The source worker holds queue:write but never claimed this job. Scope
      // separation is enforced at claim time; fencing makes the write itself
      // impossible even with a valid token value.
      await expect(
        completeRecrawlJob(
          database,
          jobId,
          SOURCE_WORKER,
          leaseToken,
          { success: true },
          now,
          LEASE_MS
        )
      ).rejects.toMatchObject({ code: "RECRAWL_LEASE_MISMATCH" });
      expect((await jobRow(client, jobId)).status).toBe("running");
    } finally {
      await client.close();
    }
  });

  it("refuses an ingestion checkpoint on an application-link job", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const roundId = await seedApplicationRound(
        client,
        "https://example.org/apply"
      );
      const jobId = await seedLinkJob(client, roundId, "no-checkpoint");
      const database = dbFor(client);
      const now = new Date("2026-09-20T09:00:00Z");
      const [claimed] = await claimRecrawlJobs(database, LINK_WORKER, 1, now, [
        "application_link",
      ]);
      const leaseToken = (claimed as { leaseToken: string }).leaseToken;

      await expect(
        (
          checkpointRecrawlJob as unknown as (
            db: Database,
            id: string,
            worker: string,
            token: string,
            ingestion: unknown,
            now?: Date
          ) => Promise<unknown>
        )(
          database,
          jobId,
          LINK_WORKER,
          leaseToken,
          { contract_version: "1.0" },
          now
        )
      ).rejects.toMatchObject({ code: "RECRAWL_CHECKPOINT_UNSUPPORTED" });
      const row = await jobRow(client, jobId);
      expect(row.payload.pending_ingestion).toBeUndefined();
    } finally {
      await client.close();
    }
  });

  it("dead-letters a permanently unexecutable job instead of retrying it", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const roundId = await seedApplicationRound(client, null);
      const jobId = await seedLinkJob(client, roundId, "no-url");
      const database = dbFor(client);
      const now = new Date("2026-09-20T09:00:00Z");

      const results = await runLinkWorkerBatch({
        limit: 1,
        queue: realQueue(database, now),
        verify: () =>
          Promise.reject(
            new ApplicationLinkVerificationError(
              "APPLICATION_URL_MISSING",
              "The application round has no application URL."
            )
          ),
      });

      expect(results[0]).toMatchObject({ retryable: false, success: false });
      const row = await jobRow(client, jobId);
      expect(row.status).toBe("dead_lettered");
      expect(row.attempts).toBe(1);
      expect(row.last_error).toContain("APPLICATION_URL_MISSING");
    } finally {
      await client.close();
    }
  });

  it("requeues a transient failure on the normal retry schedule", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const roundId = await seedApplicationRound(
        client,
        "https://example.org/apply"
      );
      const jobId = await seedLinkJob(client, roundId, "transient");
      const database = dbFor(client);
      const now = new Date("2026-09-20T09:00:00Z");

      const results = await runLinkWorkerBatch({
        limit: 1,
        queue: realQueue(database, now),
        verify: () => Promise.reject(new Error("connection reset")),
      });

      expect(results[0]).toMatchObject({ retryable: true, success: false });
      const row = await jobRow(client, jobId);
      expect(row.status).toBe("queued");
      expect(row.attempts).toBe(1);
      expect(row.lease_token).toBeNull();
    } finally {
      await client.close();
    }
  });

  it("refuses a job of the wrong kind without executing it", async () => {
    let verified = 0;
    {
      const results = await runLinkWorkerBatch({
        limit: 1,
        queue: {
          claim: () =>
            Promise.resolve([
              {
                applicationRoundId: null,
                id: "11111111-1111-4111-8111-111111111111",
                jobKind: "source_document",
                leaseToken: "22222222-2222-4222-8222-222222222222",
                status: "running",
              },
            ]),
          complete: () => Promise.resolve(undefined),
        },
        verify: () => {
          verified += 1;
          return Promise.resolve({
            materialChange: false,
            previousStatus: null,
            status: "available",
          });
        },
      });
      expect(verified).toBe(0);
      expect(results[0]).toMatchObject({ retryable: false, success: false });
      expect(results[0].error).toContain("source_document");
    }
  });

  it("keeps the batch going when one job's completion call itself fails", async () => {
    const results = await runLinkWorkerBatch({
      limit: 2,
      queue: {
        claim: () =>
          Promise.resolve([
            {
              applicationRoundId: "33333333-3333-4333-8333-333333333333",
              id: "44444444-4444-4444-8444-444444444444",
              jobKind: "application_link",
              leaseToken: "55555555-5555-4555-8555-555555555555",
              status: "running",
            },
            {
              applicationRoundId: "66666666-6666-4666-8666-666666666666",
              id: "77777777-7777-4777-8777-777777777777",
              jobKind: "application_link",
              leaseToken: "88888888-8888-4888-8888-888888888888",
              status: "running",
            },
          ]),
        complete: (jobId) =>
          jobId === "44444444-4444-4444-8444-444444444444"
            ? Promise.reject(new Error("completion unavailable"))
            : Promise.resolve(undefined),
      },
      verify: () =>
        Promise.resolve({
          materialChange: true,
          previousStatus: null,
          status: "closed",
        }),
    });
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(false);
    expect(results[1].success).toBe(true);
  });

  it("records an operational assessment without touching publication state", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const roundId = await seedApplicationRound(
        client,
        "https://example.org/apply"
      );
      await seedLinkJob(client, roundId, "operational-only");
      const database = dbFor(client);
      const now = new Date("2026-09-20T09:00:00Z");
      const before = await client.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM publication_versions"
      );

      await runLinkWorkerBatch({
        limit: 1,
        queue: realQueue(database, now),
        // The real verifier, driven against a URL the safe HTTP client
        // refuses, so an assessment is genuinely written by product code.
        verify: createDatabaseLinkVerifier(
          database as never,
          "link-worker"
        ) as never,
      });

      const assessments = await client.query<{
        application_round_id: string;
        status: string;
      }>(
        "SELECT application_round_id, status FROM application_link_assessments"
      );
      expect(assessments.rows).toHaveLength(1);
      expect(assessments.rows[0]?.application_round_id).toBe(roundId);
      const after = await client.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM publication_versions"
      );
      expect(after.rows[0]?.count).toBe(before.rows[0]?.count);
      const audits = await client.query<{ action: string }>(
        "SELECT action FROM audit_events WHERE action = 'application_link.verified'"
      );
      expect(audits.rows).toHaveLength(1);
    } finally {
      await client.close();
    }
  });
});
