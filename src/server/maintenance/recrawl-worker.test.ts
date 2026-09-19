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
  kind: "application_link" | "source_document",
  suffix: string
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
        payload
      ) VALUES ($1, 'bf07 fixture', 100, $2, 'bf07-test', '2026-09-15T19:00:00Z', $3::jsonb)
      RETURNING id
    `,
    [
      kind,
      `bf07-${kind}-${suffix}`,
      JSON.stringify({ url: "https://example.org/program" }),
    ]
  );
  const id = rows.rows[0]?.id;
  if (!id) {
    throw new Error("fixture job was not inserted");
  }
  return id;
};

const pendingIngestion = {
  contract_version: "1.0",
  idempotency_key: "recrawl:bf07-fixture",
  source_cohort: "bf07_fixture",
  snapshot: { id: "snapshot-fixture" },
  ingestion: { source: { id: "source-fixture" } },
} as unknown as IngestionRequestV1;

describe("BF-07 recrawl worker durability", () => {
  it("claims only requested job kinds", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const sourceJobId = await seedJob(client, "source_document", "source");
      await seedJob(client, "application_link", "link");
      const database = drizzle({ casing: "snake_case", client, schema });

      const claimed = await claimRecrawlJobs(
        database as unknown as Parameters<typeof claimRecrawlJobs>[0],
        "bf07-worker",
        10,
        new Date("2026-09-15T20:00:00Z"),
        ["source_document"]
      );

      expect(claimed.map((job) => job.id)).toEqual([sourceJobId]);
    } finally {
      await client.close();
    }
  });

  it("checkpoints the exact ingestion before delivery and preserves it across retry", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "source_document", "checkpoint");
      const database = drizzle({ casing: "snake_case", client, schema });
      const now = new Date("2026-09-15T20:00:00Z");
      const [claimed] = await claimRecrawlJobs(
        database as unknown as Parameters<typeof claimRecrawlJobs>[0],
        "bf07-worker",
        1,
        now,
        ["source_document"]
      );
      expect(claimed?.id).toBe(jobId);

      const checkpointed = await checkpointRecrawlJob(
        database as unknown as Parameters<typeof checkpointRecrawlJob>[0],
        jobId,
        "bf07-worker",
        claimed?.leaseToken ?? "",
        pendingIngestion,
        now
      );
      expect(checkpointed.status).toBe("running");
      expect(checkpointed.payload.pending_ingestion).toEqual(pendingIngestion);

      const failed = await completeRecrawlJob(
        database as unknown as Parameters<typeof completeRecrawlJob>[0],
        jobId,
        "bf07-worker",
        claimed?.leaseToken ?? "",
        { error: "fixture submission failed", retryable: true, success: false },
        now
      );
      expect(failed.status).toBe("queued");
      expect(failed.payload.pending_ingestion).toEqual(pendingIngestion);
    } finally {
      await client.close();
    }
  });

  it("dead-letters a non-retryable failure immediately and does not reclaim it", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "source_document", "permanent");
      const database = drizzle({ casing: "snake_case", client, schema });
      const now = new Date("2026-09-15T20:00:00Z");
      const [claimed] = await claimRecrawlJobs(
        database as unknown as Parameters<typeof claimRecrawlJobs>[0],
        "bf07-worker",
        1,
        now,
        ["source_document"]
      );

      const failed = await completeRecrawlJob(
        database as unknown as Parameters<typeof completeRecrawlJob>[0],
        jobId,
        "bf07-worker",
        claimed?.leaseToken ?? "",
        { error: "HTTP 404", retryable: false, success: false },
        now
      );

      expect(failed.status).toBe("dead_lettered");
      expect(failed.attempts).toBe(1);
      expect(failed.completedAt?.toISOString()).toBe(now.toISOString());
      expect(failed.lastError).toBe("HTTP 404");

      const reclaimed = await claimRecrawlJobs(
        database as unknown as Parameters<typeof claimRecrawlJobs>[0],
        "bf07-worker",
        1,
        new Date("2026-09-16T20:00:00Z"),
        ["source_document"]
      );
      expect(reclaimed).toEqual([]);
    } finally {
      await client.close();
    }
  });

  it("keeps explicit retryable failures on the normal retry schedule", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "source_document", "transient");
      const database = drizzle({ casing: "snake_case", client, schema });
      const now = new Date("2026-09-15T20:00:00Z");
      const [claimed] = await claimRecrawlJobs(
        database as unknown as Parameters<typeof claimRecrawlJobs>[0],
        "bf07-worker",
        1,
        now,
        ["source_document"]
      );

      const failed = await completeRecrawlJob(
        database as unknown as Parameters<typeof completeRecrawlJob>[0],
        jobId,
        "bf07-worker",
        claimed?.leaseToken ?? "",
        { error: "HTTP 500", retryable: true, success: false },
        now
      );

      expect(failed.status).toBe("queued");
      expect(failed.attempts).toBe(1);
      expect(failed.completedAt).toBeNull();
      expect(failed.scheduledFor.getTime()).toBeGreaterThan(now.getTime());
    } finally {
      await client.close();
    }
  });

  it("preserves legacy retry behavior when retryable is omitted", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "source_document", "legacy-retry");
      const database = drizzle({ casing: "snake_case", client, schema });
      const now = new Date("2026-09-15T20:00:00Z");
      const [claimed] = await claimRecrawlJobs(
        database as unknown as Parameters<typeof claimRecrawlJobs>[0],
        "legacy-worker",
        1,
        now,
        ["source_document"]
      );

      const failed = await completeRecrawlJob(
        database as unknown as Parameters<typeof completeRecrawlJob>[0],
        jobId,
        "legacy-worker",
        claimed?.leaseToken ?? "",
        { error: "legacy failure", success: false },
        now
      );

      expect(failed.status).toBe("queued");
    } finally {
      await client.close();
    }
  });

  it("clears a durable pending ingestion only when the job completes successfully", async () => {
    const client = new PGlite();
    try {
      await migrate(client);
      const jobId = await seedJob(client, "source_document", "success");
      const database = drizzle({ casing: "snake_case", client, schema });
      const now = new Date("2026-09-15T20:00:00Z");
      const [claimed] = await claimRecrawlJobs(
        database as unknown as Parameters<typeof claimRecrawlJobs>[0],
        "bf07-worker",
        1,
        now,
        ["source_document"]
      );
      await checkpointRecrawlJob(
        database as unknown as Parameters<typeof checkpointRecrawlJob>[0],
        jobId,
        "bf07-worker",
        claimed?.leaseToken ?? "",
        pendingIngestion,
        now
      );

      const completed = await completeRecrawlJob(
        database as unknown as Parameters<typeof completeRecrawlJob>[0],
        jobId,
        "bf07-worker",
        claimed?.leaseToken ?? "",
        { success: true },
        now
      );

      expect(completed.status).toBe("completed");
      expect(completed.payload.pending_ingestion).toBeUndefined();
    } finally {
      await client.close();
    }
  });
});
