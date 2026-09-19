import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, it } from "vitest";
import type { IngestionRequestV1 } from "@/contracts/opportunity-v1";
import { schema } from "@/db/schema";
import {
  checkpointRecrawlJob,
  claimRecrawlJobs,
  completeRecrawlJob,
} from "@/server/maintenance/recrawl-scheduler";

const LEASE_MS = 15 * 60 * 1000;
const WORKER_ID = "bf08-maintenance-worker";

type Database = Parameters<typeof claimRecrawlJobs>[0];
type ClaimedJob = Awaited<ReturnType<typeof claimRecrawlJobs>>[number] & {
  leaseToken: string | null;
};
type Checkpoint = (
  database: Database,
  jobId: string,
  workerId: string,
  leaseToken: string,
  ingestion: IngestionRequestV1,
  now?: Date
) => Promise<ClaimedJob>;
type Complete = (
  database: Database,
  jobId: string,
  workerId: string,
  leaseToken: string,
  input: {
    error?: string;
    ingestion_id?: string;
    material_change?: boolean;
    retryable?: boolean;
    success: boolean;
  },
  now?: Date
) => Promise<ClaimedJob>;

const checkpoint = checkpointRecrawlJob as unknown as Checkpoint;
const complete = completeRecrawlJob as unknown as Complete;

const migrate = async (client: PGlite): Promise<void> => {
  for (const migration of [
    "../../db/migrations/20260723000000_existing_application_baseline/migration.sql",
    "../../db/migrations/20260723224642_fixed_mantis/migration.sql",
    "../../db/migrations/20260723225823_add_audit_events/migration.sql",
    "../../db/migrations/20260723233636_lifecycle_maintenance/migration.sql",
    "../../db/migrations/20260725213000_semantic_field_states/migration.sql",
    "../../db/migrations/20260916080000_bf08_recrawl_lease_fencing/migration.sql",
  ]) {
    await client.exec(
      readFileSync(new URL(migration, import.meta.url), "utf8")
    );
  }
};

const seedJob = async (
  client: PGlite,
  suffix: string,
  maxAttempts = 3
): Promise<string> => {
  const rows = await client.query<{ id: string }>(
    `
      INSERT INTO recrawl_jobs (
        job_kind,
        reason,
        priority,
        deduplication_key,
        requested_by,
        scheduled_for,
        max_attempts,
        payload
      ) VALUES (
        'source_document',
        'bf08 fixture',
        100,
        $1,
        'bf08-test',
        '2026-09-16T08:00:00Z',
        $2,
        $3::jsonb
      )
      RETURNING id
    `,
    [
      `bf08-${suffix}`,
      maxAttempts,
      JSON.stringify({ url: "https://example.org/program" }),
    ]
  );
  const id = rows.rows[0]?.id;
  if (!id) {
    throw new Error("fixture job was not inserted");
  }
  return id;
};

const pendingIngestion = (label: string): IngestionRequestV1 =>
  ({
    contract_version: "1.0",
    idempotency_key: `recrawl:bf08-${label}`,
    source_cohort: "bf08_fixture",
    snapshot: { id: `snapshot-${label}` },
    ingestion: { source: { id: `source-${label}` } },
  }) as unknown as IngestionRequestV1;

const dbFor = (client: PGlite): Database =>
  drizzle({ casing: "snake_case", client, schema }) as unknown as Database;

const claimOne = async (database: Database, now: Date): Promise<ClaimedJob> => {
  const [job] = (await claimRecrawlJobs(database, WORKER_ID, 1, now, [
    "source_document",
  ])) as ClaimedJob[];
  if (!job) {
    throw new Error("expected one claimed job");
  }
  return job;
};

const expectLeaseToken = (job: ClaimedJob): string => {
  expect(job.leaseToken).toEqual(expect.any(String));
  const token = job.leaseToken;
  if (!token) {
    throw new Error("claim did not issue a lease token");
  }
  return token;
};

const expectLeaseConflict = async (
  operation: Promise<unknown>
): Promise<void> => {
  await expect(operation).rejects.toMatchObject({
    code: "RECRAWL_LEASE_MISMATCH",
  });
};

describe("BF-08 recrawl lease fencing", () => {
  it("issues a unique server-side lease token for each successful attempt", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      await seedJob(client, "token-generation");
      const database = dbFor(client);
      const first = await claimOne(database, new Date("2026-09-16T08:00:00Z"));
      const firstToken = expectLeaseToken(first);

      const second = await claimOne(database, new Date("2026-09-16T08:16:00Z"));
      const secondToken = expectLeaseToken(second);

      expect(secondToken).not.toBe(firstToken);
      expect(second.attempts).toBe(2);
    } finally {
      await client.close();
    }
  });

  it("A: stale attempt cannot complete a newer running attempt", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "stale-complete");
      const database = dbFor(client);
      const attemptA = await claimOne(
        database,
        new Date("2026-09-16T08:00:00Z")
      );
      const tokenA = expectLeaseToken(attemptA);
      const attemptB = await claimOne(
        database,
        new Date("2026-09-16T08:16:00Z")
      );
      const tokenB = expectLeaseToken(attemptB);

      await expectLeaseConflict(
        complete(
          database,
          jobId,
          WORKER_ID,
          tokenA,
          { success: true },
          new Date("2026-09-16T08:17:00Z")
        )
      );

      const rows = await client.query<{
        lease_token: string | null;
        status: string;
      }>("SELECT lease_token, status FROM recrawl_jobs WHERE id = $1", [jobId]);
      expect(rows.rows[0]).toEqual({ lease_token: tokenB, status: "running" });
    } finally {
      await client.close();
    }
  });

  it("B: stale attempt cannot fail a newer running attempt", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "stale-fail");
      const database = dbFor(client);
      const attemptA = await claimOne(
        database,
        new Date("2026-09-16T08:00:00Z")
      );
      const tokenA = expectLeaseToken(attemptA);
      const attemptB = await claimOne(
        database,
        new Date("2026-09-16T08:16:00Z")
      );
      const tokenB = expectLeaseToken(attemptB);

      await expectLeaseConflict(
        complete(
          database,
          jobId,
          WORKER_ID,
          tokenA,
          { error: "stale worker failure", retryable: true, success: false },
          new Date("2026-09-16T08:17:00Z")
        )
      );

      const rows = await client.query<{
        attempts: number;
        lease_token: string | null;
        status: string;
      }>(
        "SELECT attempts, lease_token, status FROM recrawl_jobs WHERE id = $1",
        [jobId]
      );
      expect(rows.rows[0]).toEqual({
        attempts: 2,
        lease_token: tokenB,
        status: "running",
      });
    } finally {
      await client.close();
    }
  });

  it("C: stale attempt cannot overwrite the newer attempt checkpoint", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "stale-checkpoint");
      const database = dbFor(client);
      const attemptA = await claimOne(
        database,
        new Date("2026-09-16T08:00:00Z")
      );
      const tokenA = expectLeaseToken(attemptA);
      const attemptB = await claimOne(
        database,
        new Date("2026-09-16T08:16:00Z")
      );
      const tokenB = expectLeaseToken(attemptB);
      const checkpointB = pendingIngestion("newer");
      await checkpoint(
        database,
        jobId,
        WORKER_ID,
        tokenB,
        checkpointB,
        new Date("2026-09-16T08:17:00Z")
      );

      await expectLeaseConflict(
        checkpoint(
          database,
          jobId,
          WORKER_ID,
          tokenA,
          pendingIngestion("stale"),
          new Date("2026-09-16T08:18:00Z")
        )
      );

      const rows = await client.query<{ payload: Record<string, unknown> }>(
        "SELECT payload FROM recrawl_jobs WHERE id = $1",
        [jobId]
      );
      expect(rows.rows[0]?.payload.pending_ingestion).toEqual(checkpointB);
    } finally {
      await client.close();
    }
  });

  it("D: current active attempt can checkpoint", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "current-checkpoint");
      const database = dbFor(client);
      const current = await claimOne(
        database,
        new Date("2026-09-16T08:00:00Z")
      );
      const token = expectLeaseToken(current);
      const ingestion = pendingIngestion("current");

      const result = await checkpoint(
        database,
        jobId,
        WORKER_ID,
        token,
        ingestion,
        new Date("2026-09-16T08:01:00Z")
      );

      expect(result.status).toBe("running");
      expect(result.leaseToken).toBe(token);
      expect(result.payload.pending_ingestion).toEqual(ingestion);
    } finally {
      await client.close();
    }
  });

  it("E: current active attempt can complete", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "current-complete");
      const database = dbFor(client);
      const current = await claimOne(
        database,
        new Date("2026-09-16T08:00:00Z")
      );
      const token = expectLeaseToken(current);

      const result = await complete(
        database,
        jobId,
        WORKER_ID,
        token,
        { success: true },
        new Date("2026-09-16T08:01:00Z")
      );

      expect(result.status).toBe("completed");
      expect(result.leaseToken).toBe(token);
      expect(result.lockedAt).toBeNull();
      expect(result.lockedBy).toBeNull();
    } finally {
      await client.close();
    }
  });

  it("F: a still-valid active lease cannot be double-claimed", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      await seedJob(client, "active-double-claim");
      const database = dbFor(client);
      const first = await claimOne(database, new Date("2026-09-16T08:00:00Z"));
      expectLeaseToken(first);

      const second = await claimRecrawlJobs(
        database,
        WORKER_ID,
        1,
        new Date("2026-09-16T08:14:59Z"),
        ["source_document"]
      );

      expect(second).toEqual([]);
    } finally {
      await client.close();
    }
  });

  it("G: lease expiry permits reclaim with a new token and one attempt increment", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      await seedJob(client, "reclaim");
      const database = dbFor(client);
      const first = await claimOne(database, new Date("2026-09-16T08:00:00Z"));
      const firstToken = expectLeaseToken(first);

      const second = await claimOne(
        database,
        new Date("2026-09-16T08:15:00.001Z")
      );
      const secondToken = expectLeaseToken(second);

      expect(secondToken).not.toBe(firstToken);
      expect(second.attempts).toBe(2);
    } finally {
      await client.close();
    }
  });

  it("H: repeated crash reclaim stops at max_attempts without issuing attempt four", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "crash-ceiling", 3);
      const database = dbFor(client);

      const first = await claimOne(database, new Date("2026-09-16T08:00:00Z"));
      expect(first.attempts).toBe(1);
      const firstToken = expectLeaseToken(first);
      const second = await claimOne(database, new Date("2026-09-16T08:16:00Z"));
      expect(second.attempts).toBe(2);
      expectLeaseToken(second);
      const third = await claimOne(database, new Date("2026-09-16T08:32:00Z"));
      expect(third.attempts).toBe(3);
      const thirdToken = expectLeaseToken(third);

      const fourth = await claimRecrawlJobs(
        database,
        WORKER_ID,
        1,
        new Date("2026-09-16T08:48:00Z"),
        ["source_document"]
      );
      expect(fourth).toEqual([]);

      const rows = await client.query<{
        attempts: number;
        completed_at: Date | null;
        lease_token: string | null;
        status: string;
      }>(
        "SELECT attempts, completed_at, lease_token, status FROM recrawl_jobs WHERE id = $1",
        [jobId]
      );
      expect(rows.rows[0]?.attempts).toBe(3);
      expect(rows.rows[0]?.status).toBe("dead_lettered");
      expect(rows.rows[0]?.lease_token).toBe(thirdToken);
      expect(rows.rows[0]?.completed_at).not.toBeNull();

      await expectLeaseConflict(
        complete(
          database,
          jobId,
          WORKER_ID,
          firstToken,
          { success: true },
          new Date("2026-09-16T08:49:00Z")
        )
      );
      const replayed = await complete(
        database,
        jobId,
        WORKER_ID,
        thirdToken,
        { success: true },
        new Date("2026-09-16T08:49:00Z")
      );
      expect(replayed.status).toBe("dead_lettered");
      expect(replayed.leaseToken).toBe(thirdToken);
    } finally {
      await client.close();
    }
  });

  it("I: retryable failure requeues and invalidates the old lease", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "retry-invalidates");
      const database = dbFor(client);
      const current = await claimOne(
        database,
        new Date("2026-09-16T08:00:00Z")
      );
      const token = expectLeaseToken(current);

      const failed = await complete(
        database,
        jobId,
        WORKER_ID,
        token,
        { error: "transient", retryable: true, success: false },
        new Date("2026-09-16T08:01:00Z")
      );
      expect(failed.status).toBe("queued");
      expect(failed.leaseToken).toBeNull();

      await expectLeaseConflict(
        checkpoint(
          database,
          jobId,
          WORKER_ID,
          token,
          pendingIngestion("old-retry"),
          new Date("2026-09-16T08:02:00Z")
        )
      );
      await expectLeaseConflict(
        complete(
          database,
          jobId,
          WORKER_ID,
          token,
          { success: true },
          new Date("2026-09-16T08:02:00Z")
        )
      );
    } finally {
      await client.close();
    }
  });

  it("J: permanent failure invalidates the active lease and blocks checkpoint mutation", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "permanent-invalidates");
      const database = dbFor(client);
      const current = await claimOne(
        database,
        new Date("2026-09-16T08:00:00Z")
      );
      const token = expectLeaseToken(current);

      const failed = await complete(
        database,
        jobId,
        WORKER_ID,
        token,
        { error: "permanent", retryable: false, success: false },
        new Date("2026-09-16T08:01:00Z")
      );
      expect(failed.status).toBe("dead_lettered");
      expect(failed.leaseToken).toBe(token);
      expect(failed.lockedAt).toBeNull();
      expect(failed.lockedBy).toBeNull();

      await expectLeaseConflict(
        checkpoint(
          database,
          jobId,
          WORKER_ID,
          token,
          pendingIngestion("after-permanent"),
          new Date("2026-09-16T08:02:00Z")
        )
      );
    } finally {
      await client.close();
    }
  });

  it("K: repeated completion of an already-terminal job remains idempotent", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "terminal-idempotent");
      const database = dbFor(client);
      const current = await claimOne(
        database,
        new Date("2026-09-16T08:00:00Z")
      );
      const token = expectLeaseToken(current);

      const first = await complete(
        database,
        jobId,
        WORKER_ID,
        token,
        { success: true },
        new Date("2026-09-16T08:01:00Z")
      );
      const repeated = await complete(
        database,
        jobId,
        WORKER_ID,
        token,
        { error: "response was lost", retryable: true, success: false },
        new Date("2026-09-16T08:02:00Z")
      );

      expect(repeated.id).toBe(first.id);
      expect(repeated.status).toBe("completed");
      expect(repeated.completedAt).toEqual(first.completedAt);
    } finally {
      await client.close();
    }
  });

  it("L: concurrent stale reclaim produces one winner and one attempt increment", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "reclaim-race");
      const database = dbFor(client);
      await claimOne(database, new Date("2026-09-16T08:00:00Z"));
      const reclaimAt = new Date("2026-09-16T08:16:00Z");

      const [left, right] = await Promise.all([
        claimRecrawlJobs(database, WORKER_ID, 1, reclaimAt, [
          "source_document",
        ]),
        claimRecrawlJobs(database, WORKER_ID, 1, reclaimAt, [
          "source_document",
        ]),
      ]);
      const winners = [...left, ...right] as ClaimedJob[];

      expect(winners).toHaveLength(1);
      expectLeaseToken(winners[0] as ClaimedJob);
      const rows = await client.query<{
        attempts: number;
        lease_token: string | null;
        status: string;
      }>(
        "SELECT attempts, lease_token, status FROM recrawl_jobs WHERE id = $1",
        [jobId]
      );
      expect(rows.rows[0]?.attempts).toBe(2);
      expect(rows.rows[0]?.status).toBe("running");
      expect(rows.rows[0]?.lease_token).toBe(winners[0]?.leaseToken);
    } finally {
      await client.close();
    }
  });

  it("preserves a fresh legacy running lock until its original lease expires", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "legacy-running-lock");
      const database = dbFor(client);
      await client.query(
        `UPDATE recrawl_jobs
         SET status = 'running', attempts = 1, locked_at = $2, locked_by = 'legacy-worker', lease_token = NULL
         WHERE id = $1`,
        [jobId, new Date("2026-09-16T08:00:00Z")]
      );

      const premature = await claimRecrawlJobs(
        database,
        WORKER_ID,
        1,
        new Date("2026-09-16T08:14:59.999Z"),
        ["source_document"]
      );
      expect(premature).toEqual([]);

      const reclaimed = await claimOne(
        database,
        new Date("2026-09-16T08:15:00.001Z")
      );
      expect(reclaimed.id).toBe(jobId);
      expect(reclaimed.attempts).toBe(2);
      expectLeaseToken(reclaimed);
    } finally {
      await client.close();
    }
  });

  it("renews the active lease when the current attempt checkpoints", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "checkpoint-renewal");
      const database = dbFor(client);
      const current = await claimOne(
        database,
        new Date("2026-09-16T08:00:00Z")
      );
      const token = expectLeaseToken(current);
      const checkpointAt = new Date("2026-09-16T08:14:00Z");

      const checkpointed = await checkpoint(
        database,
        jobId,
        WORKER_ID,
        token,
        pendingIngestion("renewed"),
        checkpointAt
      );
      expect(checkpointed.lockedAt).toEqual(checkpointAt);

      const completed = await complete(
        database,
        jobId,
        WORKER_ID,
        token,
        { success: true },
        new Date("2026-09-16T08:16:00Z")
      );
      expect(completed.status).toBe("completed");
    } finally {
      await client.close();
    }
  });

  it("terminal idempotency accepts only the final attempt generation", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "terminal-generation");
      const database = dbFor(client);
      const attemptA = await claimOne(
        database,
        new Date("2026-09-16T08:00:00Z")
      );
      const tokenA = expectLeaseToken(attemptA);
      const attemptB = await claimOne(
        database,
        new Date("2026-09-16T08:16:00Z")
      );
      const tokenB = expectLeaseToken(attemptB);
      const completed = await complete(
        database,
        jobId,
        WORKER_ID,
        tokenB,
        { success: true },
        new Date("2026-09-16T08:17:00Z")
      );
      expect(completed.leaseToken).toBe(tokenB);

      await expectLeaseConflict(
        complete(
          database,
          jobId,
          WORKER_ID,
          tokenA,
          { error: "stale failure", retryable: false, success: false },
          new Date("2026-09-16T08:18:00Z")
        )
      );
      const replayed = await complete(
        database,
        jobId,
        WORKER_ID,
        tokenB,
        { error: "lost response", retryable: true, success: false },
        new Date("2026-09-16T08:18:00Z")
      );
      expect(replayed.status).toBe("completed");
      expect(replayed.completedAt).toEqual(completed.completedAt);
    } finally {
      await client.close();
    }
  });

  it("rejects checkpoint/completion after lease expiry even before a reclaim", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "expired-before-reclaim");
      const database = dbFor(client);
      const current = await claimOne(
        database,
        new Date("2026-09-16T08:00:00Z")
      );
      const token = expectLeaseToken(current);
      const expiredAt = new Date(
        new Date("2026-09-16T08:00:00Z").getTime() + LEASE_MS + 1
      );

      await expectLeaseConflict(
        checkpoint(
          database,
          jobId,
          WORKER_ID,
          token,
          pendingIngestion("expired"),
          expiredAt
        )
      );
      await expectLeaseConflict(
        complete(
          database,
          jobId,
          WORKER_ID,
          token,
          { success: true },
          expiredAt
        )
      );
    } finally {
      await client.close();
    }
  });
});

describe("recrawl malformed job ids", () => {
  it("rejects malformed checkpoint and completion ids before a database cast", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const database = dbFor(client);
      const lease = "11111111-1111-4111-8111-111111111108";
      await expect(
        checkpoint(
          database,
          "not-a-uuid",
          WORKER_ID,
          lease,
          pendingIngestion("bad-id")
        )
      ).rejects.toMatchObject({ code: "RECRAWL_JOB_NOT_FOUND" });
      await expect(
        complete(database, "not-a-uuid", WORKER_ID, lease, { success: true })
      ).rejects.toMatchObject({ code: "RECRAWL_JOB_NOT_FOUND" });
      expect(
        (await client.query("SELECT * FROM recrawl_jobs")).rows
      ).toHaveLength(0);
    } finally {
      await client.close();
    }
  });
});
