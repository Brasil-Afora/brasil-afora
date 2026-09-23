import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, describe, expect, it } from "vitest";

const baselineMigrationSql = readFileSync(
  new URL(
    "./20260723000000_existing_application_baseline/migration.sql",
    import.meta.url
  ),
  "utf8"
);
const migrationSql = readFileSync(
  new URL("./20260723224642_fixed_mantis/migration.sql", import.meta.url),
  "utf8"
);
const auditMigrationSql = readFileSync(
  new URL("./20260723225823_add_audit_events/migration.sql", import.meta.url),
  "utf8"
);
const lifecycleMigrationSql = readFileSync(
  new URL(
    "./20260723233636_lifecycle_maintenance/migration.sql",
    import.meta.url
  ),
  "utf8"
);
const semanticFieldMigrationSql = readFileSync(
  new URL(
    "./20260725213000_semantic_field_states/migration.sql",
    import.meta.url
  ),
  "utf8"
);
const bf08MigrationSql = readFileSync(
  new URL(
    "./20260916080000_bf08_recrawl_lease_fencing/migration.sql",
    import.meta.url
  ),
  "utf8"
);

const bf10MigrationSql = readFileSync(
  new URL("./20260919120000_bf10_source_runs/migration.sql", import.meta.url),
  "utf8"
);

const databases: PGlite[] = [];

const createLegacyDatabase = async () => {
  const database = new PGlite();
  databases.push(database);
  await database.exec(`
    CREATE TABLE "users" (
      "id" uuid PRIMARY KEY,
      "name" text NOT NULL DEFAULT '',
      "email" text NOT NULL DEFAULT ''
    );
    CREATE TABLE "opportunities" (
      "id" uuid PRIMARY KEY,
      "name" text NOT NULL
    );
    CREATE TABLE "national_opportunities" (
      "id" uuid PRIMARY KEY,
      "name" text NOT NULL
    );
  `);
  return database;
};

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()));
});

describe("structured ingestion migration", () => {
  it("provisions a complete clean database", async () => {
    const database = new PGlite();
    databases.push(database);

    await database.exec(baselineMigrationSql);
    await database.exec(migrationSql);
    await database.exec(auditMigrationSql);
    await database.exec(lifecycleMigrationSql);
    await database.exec(semanticFieldMigrationSql);
    await database.exec(bf08MigrationSql);

    const tables = await database.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'accounts',
          'application_rounds',
          'field_semantic_states',
          'opportunities',
          'publication_versions',
          'recrawl_jobs',
          'users'
        )
      ORDER BY table_name
    `);

    expect(tables.rows.map((row) => row.table_name)).toEqual([
      "accounts",
      "application_rounds",
      "field_semantic_states",
      "opportunities",
      "publication_versions",
      "recrawl_jobs",
      "users",
    ]);
  });

  it("adds canonical tables and preserves existing public rows", async () => {
    const database = await createLegacyDatabase();
    const legacyId = "00000000-0000-4000-8000-000000000001";
    await database.query(
      `INSERT INTO opportunities (id, name) VALUES ($1, 'Existing record')`,
      [legacyId]
    );

    await database.exec(migrationSql);
    await database.exec(auditMigrationSql);
    await database.exec(lifecycleMigrationSql);
    await database.exec(semanticFieldMigrationSql);
    await database.exec(bf08MigrationSql);

    const legacyRows = await database.query<{
      id: string;
      name: string;
      publication_version_id: string | null;
    }>(
      "SELECT id, name, publication_version_id FROM opportunities WHERE id = $1",
      [legacyId]
    );
    const canonicalTables = await database.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'field_assertions',
          'material_change_events',
          'publication_versions',
          'recrawl_jobs',
          'review_tasks',
          'snapshots'
        )
      ORDER BY table_name
    `);

    expect(legacyRows.rows).toEqual([
      {
        id: legacyId,
        name: "Existing record",
        publication_version_id: null,
      },
    ]);
    expect(canonicalTables.rows.map((row) => row.table_name)).toEqual([
      "field_assertions",
      "material_change_events",
      "publication_versions",
      "recrawl_jobs",
      "review_tasks",
      "snapshots",
    ]);
  });

  it("can be replayed without destructive changes", async () => {
    const database = await createLegacyDatabase();

    await database.exec(migrationSql);
    await database.exec(migrationSql);

    const publicationVersionColumns = await database.query<{
      count: number;
    }>(`
      SELECT count(*)::int AS count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'opportunities'
        AND column_name = 'publication_version_id'
    `);

    expect(publicationVersionColumns.rows[0]?.count).toBe(1);
  });

  it("backfills historical semantic states conservatively and idempotently", async () => {
    const database = new PGlite();
    databases.push(database);
    await database.exec(baselineMigrationSql);
    await database.exec(migrationSql);
    await database.exec(auditMigrationSql);
    await database.exec(lifecycleMigrationSql);

    const editionId = "00000000-0000-4000-8000-000000000101";
    const programId = "00000000-0000-4000-8000-000000000102";
    const versionId = "00000000-0000-4000-8000-000000000103";
    await database.query(
      `INSERT INTO programs (id, canonical_name)
       VALUES ($1, 'Historical program')`,
      [programId]
    );
    await database.query(
      `INSERT INTO editions (
         id, program_id, identity_key, edition_label, status
       ) VALUES ($1, $2, '2026:default', '2026', 'unknown')`,
      [editionId, programId]
    );
    await database.query(
      `INSERT INTO publication_versions (
         id, edition_id, version, editorial_state, payload,
         compatibility_payload, created_by
       ) VALUES ($1, $2, 1, 'needs_review', '{}', '{}', 'legacy')`,
      [versionId, editionId]
    );

    await database.exec(semanticFieldMigrationSql);
    await database.exec(bf08MigrationSql);
    await database.exec(semanticFieldMigrationSql);
    await database.exec(bf08MigrationSql);

    const states = await database.query<{
      semantic_state: string;
      count: number;
    }>(
      `SELECT semantic_state, count(*)::int AS count
       FROM field_semantic_states
       WHERE publication_version_id = $1
       GROUP BY semantic_state`,
      [versionId]
    );
    const tasks = await database.query<{ count: number }>(
      `SELECT count(*)::int AS count
       FROM review_tasks
       WHERE entity_id = $1
         AND reason = 'historical_semantic_state_pending'`,
      [editionId]
    );

    expect(states.rows).toEqual([
      { count: 51, semantic_state: "pending_verification" },
    ]);
    expect(tasks.rows[0]?.count).toBeGreaterThan(0);
  });

  it("adds lease fencing without changing historical recrawl terminal state", async () => {
    const database = new PGlite();
    databases.push(database);
    await database.exec(baselineMigrationSql);
    await database.exec(migrationSql);
    await database.exec(auditMigrationSql);
    await database.exec(lifecycleMigrationSql);

    await database.exec(`
      INSERT INTO recrawl_jobs (
        job_kind, reason, priority, deduplication_key, requested_by,
        scheduled_for, attempts, max_attempts, status, locked_at, locked_by
      ) VALUES
        ('source_document', 'queued', 10, 'bf08-upgrade-queued', 'fixture', now(), 0, 3, 'queued', NULL, NULL),
        ('source_document', 'running', 10, 'bf08-upgrade-running', 'fixture', now(), 2, 3, 'running', now(), 'legacy-worker'),
        ('source_document', 'completed', 10, 'bf08-upgrade-completed', 'fixture', now(), 1, 3, 'completed', NULL, NULL),
        ('source_document', 'dead', 10, 'bf08-upgrade-dead', 'fixture', now(), 3, 3, 'dead_lettered', NULL, NULL)
    `);

    await database.exec(bf08MigrationSql);
    await database.exec(bf08MigrationSql);

    const rows = await database.query<{
      attempts: number;
      deduplication_key: string;
      lease_token: string | null;
      locked_by: string | null;
      status: string;
    }>(`
      SELECT deduplication_key, status, attempts, locked_by, lease_token
      FROM recrawl_jobs
      WHERE deduplication_key LIKE 'bf08-upgrade-%'
      ORDER BY deduplication_key
    `);

    expect(rows.rows).toEqual([
      {
        attempts: 1,
        deduplication_key: "bf08-upgrade-completed",
        lease_token: null,
        locked_by: null,
        status: "completed",
      },
      {
        attempts: 3,
        deduplication_key: "bf08-upgrade-dead",
        lease_token: null,
        locked_by: null,
        status: "dead_lettered",
      },
      {
        attempts: 0,
        deduplication_key: "bf08-upgrade-queued",
        lease_token: null,
        locked_by: null,
        status: "queued",
      },
      {
        attempts: 2,
        deduplication_key: "bf08-upgrade-running",
        lease_token: null,
        locked_by: "legacy-worker",
        status: "running",
      },
    ]);
  });

  it("BF-10 provisions source_runs on a clean database", async () => {
    const database = new PGlite();
    databases.push(database);
    for (const sql of [
      baselineMigrationSql,
      migrationSql,
      auditMigrationSql,
      lifecycleMigrationSql,
      semanticFieldMigrationSql,
      bf08MigrationSql,
      bf10MigrationSql,
    ]) {
      await database.exec(sql);
    }

    const columns = await database.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'source_runs'
      ORDER BY column_name
    `);
    expect(columns.rows.map((row) => row.column_name)).toEqual([
      "adapter_version",
      "candidates_discovered",
      "candidates_rejected",
      "candidates_valid",
      "discovery_completed",
      "error_categories",
      "error_summary",
      "finished_at",
      "id",
      "ingestion_failures",
      "ingestion_successes",
      "pages_attempted",
      "pages_expected",
      "pages_failed",
      "pages_succeeded",
      "reconciliation_eligible",
      "report",
      "requested_by",
      "source_id",
      "started_at",
      "status",
      "trigger",
    ]);
    await expect(
      database.exec(`
        INSERT INTO sources (id, name, base_url, source_type, authority_tier,
          crawl_interval_hours, rate_limit_per_minute, concurrency_limit, rendering_policy)
        VALUES ('00000000-0000-4000-8000-00000000b101', 'S', 'https://s.example/', 'website', 90, 24, 6, 1, 'never');
        INSERT INTO source_runs (source_id, trigger, requested_by, status)
        VALUES ('00000000-0000-4000-8000-00000000b101', 'supervised', 'fixture', 'healthy_maybe');
      `)
    ).rejects.toThrow();
  });

  it("BF-10 upgrades a BF-08 database without touching existing sources or jobs", async () => {
    const database = new PGlite();
    databases.push(database);
    for (const sql of [
      baselineMigrationSql,
      migrationSql,
      auditMigrationSql,
      lifecycleMigrationSql,
      semanticFieldMigrationSql,
      bf08MigrationSql,
    ]) {
      await database.exec(sql);
    }
    await database.exec(`
      INSERT INTO sources (id, name, base_url, source_type, authority_tier,
        crawl_interval_hours, rate_limit_per_minute, concurrency_limit,
        rendering_policy, health_state, last_success_at)
      VALUES ('00000000-0000-4000-8000-00000000b102', 'Legacy', 'https://legacy.example/',
        'website', 90, 24, 6, 1, 'never', 'unknown', '2026-07-24T02:00:00Z');
      INSERT INTO recrawl_jobs (job_kind, reason, priority, deduplication_key,
        requested_by, status, attempts)
      VALUES ('source_document', 'legacy', 10, 'bf10-upgrade-legacy', 'fixture', 'completed', 1);
    `);

    await database.exec(bf10MigrationSql);
    await database.exec(bf10MigrationSql);

    const preserved = await database.query<{
      health_state: string;
      jobs: number;
      last_success_at: string;
      runs: number;
    }>(`
      SELECT
        health_state,
        (last_success_at AT TIME ZONE 'UTC')::text AS last_success_at,
        (SELECT count(*)::int FROM recrawl_jobs WHERE status = 'completed') AS jobs,
        (SELECT count(*)::int FROM source_runs) AS runs
      FROM sources
    `);
    expect(preserved.rows).toEqual([
      {
        health_state: "unknown",
        jobs: 1,
        last_success_at: "2026-07-24 02:00:00",
        runs: 0,
      },
    ]);
    const indexes = await database.query<{ indexname: string }>(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'source_runs' ORDER BY indexname
    `);
    expect(indexes.rows.map((row) => row.indexname)).toEqual([
      "source_runs_one_running_per_source",
      "source_runs_pkey",
      "source_runs_source_started_idx",
    ]);
    const jobIndexes = await database.query<{ indexname: string }>(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'recrawl_jobs' AND indexname = 'recrawl_jobs_source_run_idx'
    `);
    expect(jobIndexes.rows).toHaveLength(1);
  });
});
