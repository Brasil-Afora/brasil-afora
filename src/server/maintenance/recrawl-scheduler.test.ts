import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, it } from "vitest";
import { schema } from "@/db/schema";
import { scheduleDueRecrawls } from "./recrawl-scheduler";

const SOURCE_ID = "a0000000-0000-4000-8000-000000000001";
const DOCUMENT_ID = "a0000000-0000-4000-8000-000000000002";
const PROGRAM_ID = "a0000000-0000-4000-8000-000000000003";
const EDITION_ID = "a0000000-0000-4000-8000-000000000004";
const ROUND_ID = "a0000000-0000-4000-8000-000000000005";
const APPLICATION_URL = "https://example.org/apply/2026";
const OTHER_APPLICATION_URL = "https://example.org/apply/pending";
const ACTOR_ID = "scheduler-clock-test";
const HOUR_MS = 60 * 60 * 1000;

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

const createDatabase = async (now: Date) => {
  const client = new PGlite();
  await migrate(client);
  await client.query(
    `
      INSERT INTO sources (
        id,
        name,
        base_url,
        source_type,
        authority_tier,
        crawl_interval_hours,
        rate_limit_per_minute,
        concurrency_limit,
        rendering_policy,
        discovery_methods,
        enabled
      ) VALUES ($1, 'Scheduler clock source', 'https://example.org/', 'website', 90, 24, 6, 1, 'never', ARRAY['homepage_links'], true)
    `,
    [SOURCE_ID]
  );
  await client.query(
    `
      INSERT INTO source_documents (
        id,
        source_id,
        url,
        canonical_url,
        last_seen_at
      ) VALUES ($1, $2, 'https://example.org/program', 'https://example.org/program', $3)
    `,
    [DOCUMENT_ID, SOURCE_ID, now]
  );
  await client.query(
    "INSERT INTO programs (id, canonical_name) VALUES ($1, 'Scheduler clock program')",
    [PROGRAM_ID]
  );
  await client.query(
    `
      INSERT INTO editions (id, program_id, identity_key, edition_label, status)
      VALUES ($1, $2, '2026', '2026', 'open')
    `,
    [EDITION_ID, PROGRAM_ID]
  );
  await client.query(
    `
      INSERT INTO edition_source_documents (
        edition_id,
        source_document_id,
        relationship_role
      ) VALUES ($1, $2, 'primary')
    `,
    [EDITION_ID, DOCUMENT_ID]
  );
  await client.query(
    `
      INSERT INTO application_rounds (
        id,
        edition_id,
        round_key,
        round_name,
        deadline_type,
        application_url,
        status
      ) VALUES ($1, $2, 'main:all', 'Main', 'fixed', $3, 'open')
    `,
    [ROUND_ID, EDITION_ID, APPLICATION_URL]
  );
  const database = drizzle({ casing: "snake_case", client, schema });
  return { client, database };
};

const insertAssessment = async (
  client: PGlite,
  {
    checkedAt,
    createdAt,
    originalUrl = APPLICATION_URL,
    status = "current_and_open",
  }: {
    checkedAt: Date | null;
    createdAt?: Date;
    originalUrl?: string;
    status?: "broken" | "current_and_open";
  }
): Promise<void> => {
  if (createdAt) {
    await client.query(
      `
        INSERT INTO application_link_assessments (
          application_round_id,
          status,
          original_url,
          checked_at,
          created_at
        ) VALUES ($1, $2, $3, $4, $5)
      `,
      [ROUND_ID, status, originalUrl, checkedAt, createdAt]
    );
    return;
  }
  await client.query(
    `
      INSERT INTO application_link_assessments (
        application_round_id,
        status,
        original_url,
        checked_at
      ) VALUES ($1, $2, $3, $4)
    `,
    [ROUND_ID, status, originalUrl, checkedAt]
  );
};

const schedule = async (
  database: Awaited<ReturnType<typeof createDatabase>>["database"],
  now: Date
) =>
  scheduleDueRecrawls(
    database as unknown as Parameters<typeof scheduleDueRecrawls>[0],
    ACTOR_ID,
    now
  );

describe("application-link scheduler verification clock", () => {
  it("schedules an old logical check even when its row was inserted now", async () => {
    const now = new Date();
    const { client, database } = await createDatabase(now);
    try {
      await insertAssessment(client, {
        checkedAt: new Date(now.getTime() - 25 * HOUR_MS),
      });

      expect(await schedule(database, now)).toEqual({
        application_link_jobs: 1,
        source_document_jobs: 0,
      });
    } finally {
      await client.close();
    }
  });

  it("does not schedule a recently checked link whose row has an old insertion time", async () => {
    const now = new Date("2026-09-19T18:00:00Z");
    const { client, database } = await createDatabase(now);
    try {
      await insertAssessment(client, {
        checkedAt: new Date(now.getTime() - HOUR_MS),
        createdAt: new Date(now.getTime() - 72 * HOUR_MS),
      });

      expect(await schedule(database, now)).toEqual({
        application_link_jobs: 0,
        source_document_jobs: 0,
      });
    } finally {
      await client.close();
    }
  });

  it("uses the latest logical verification when insertion chronology differs", async () => {
    const now = new Date("2026-09-19T18:00:00Z");
    const { client, database } = await createDatabase(now);
    try {
      await insertAssessment(client, {
        checkedAt: new Date(now.getTime() - 72 * HOUR_MS),
        createdAt: new Date(now.getTime() - HOUR_MS / 2),
        status: "broken",
      });
      await insertAssessment(client, {
        checkedAt: new Date(now.getTime() - HOUR_MS),
        createdAt: new Date(now.getTime() - 2 * HOUR_MS),
      });

      expect(await schedule(database, now)).toEqual({
        application_link_jobs: 0,
        source_document_jobs: 0,
      });
    } finally {
      await client.close();
    }
  });

  it("does not treat a future checkedAt value as stale", async () => {
    const now = new Date("2026-09-19T18:00:00Z");
    const { client, database } = await createDatabase(now);
    try {
      await insertAssessment(client, {
        checkedAt: new Date(now.getTime() + 72 * HOUR_MS),
        createdAt: new Date(now.getTime() - 72 * HOUR_MS),
      });

      expect(await schedule(database, now)).toEqual({
        application_link_jobs: 0,
        source_document_jobs: 0,
      });
    } finally {
      await client.close();
    }
  });

  it("falls back to createdAt only for a legacy null checkedAt", async () => {
    const now = new Date("2026-09-19T18:00:00Z");
    const { client, database } = await createDatabase(now);
    try {
      await insertAssessment(client, {
        checkedAt: null,
        createdAt: new Date(now.getTime() - HOUR_MS),
      });

      expect(await schedule(database, now)).toEqual({
        application_link_jobs: 0,
        source_document_jobs: 0,
      });
    } finally {
      await client.close();
    }
  });

  it("uses createdAt as the deterministic tie-breaker for equal checkedAt values", async () => {
    const now = new Date("2026-09-19T18:00:00Z");
    const { client, database } = await createDatabase(now);
    try {
      const checkedAt = new Date(now.getTime() - 10 * HOUR_MS);
      await insertAssessment(client, {
        checkedAt,
        createdAt: new Date(now.getTime() - 2 * HOUR_MS),
      });
      await insertAssessment(client, {
        checkedAt,
        createdAt: new Date(now.getTime() - HOUR_MS),
        status: "broken",
      });

      expect(await schedule(database, now)).toEqual({
        application_link_jobs: 1,
        source_document_jobs: 0,
      });
      const jobs = await client.query<{ reason: string }>(
        "SELECT reason FROM recrawl_jobs WHERE job_kind = 'application_link'"
      );
      expect(jobs.rows).toEqual([{ reason: "link_broken" }]);
    } finally {
      await client.close();
    }
  });

  it("does not let an assessment for another URL refresh the current URL", async () => {
    const now = new Date("2026-09-19T18:00:00Z");
    const { client, database } = await createDatabase(now);
    try {
      await insertAssessment(client, {
        checkedAt: new Date(now.getTime() - HOUR_MS),
        createdAt: new Date(now.getTime() - HOUR_MS),
        originalUrl: OTHER_APPLICATION_URL,
      });

      expect(await schedule(database, now)).toEqual({
        application_link_jobs: 1,
        source_document_jobs: 0,
      });
    } finally {
      await client.close();
    }
  });
});
