import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";
import { ingestionRequestV1Schema } from "@/contracts/opportunity-v1";
import { schema } from "@/db/schema";
import { persistIngestion } from "@/server/ingestion/persist-ingestion";
import {
  checkpointRecrawlJob,
  claimRecrawlJobs,
  completeRecrawlJob,
} from "@/server/maintenance/recrawl-scheduler";
import { getReviewQueue } from "@/server/review/review-queue";

const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for the cross-language test suite`);
  }
  return value;
};

const PYTHON_REPO = requiredEnv("BRASIL_AFORA_PYTHON_REPO");
const PYTHON = requiredEnv("BRASIL_AFORA_PYTHON");
const temporaryDirectories: string[] = [];
const CHECKPOINT_ROUTE_PATTERN =
  /^\/api\/v1\/maintenance\/recrawls\/([^/]+)\/checkpoint$/;
const COMPLETION_ROUTE_PATTERN =
  /^\/api\/v1\/maintenance\/recrawls\/([^/]+)\/completion$/;

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

const readJson = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const sendJson = (
  response: ServerResponse,
  status: number,
  payload: unknown
): void => {
  response.statusCode = status;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(payload));
};

const runWorker = (
  baseUrl: string,
  registryPath: string
): Promise<{ code: number | null; stderr: string; stdout: string }> =>
  new Promise((resolve) => {
    const child = spawn(
      PYTHON,
      [
        "-m",
        "brasil_afora_scraper.worker",
        "--web-base-url",
        baseUrl,
        "--registry",
        registryPath,
        "--taxonomy",
        join(PYTHON_REPO, "config/categories.toml"),
        "--facets",
        join(PYTHON_REPO, "config/facets.toml"),
        "--source-cohort",
        "bf07_e2e",
        "--limit",
        "1",
      ],
      {
        cwd: PYTHON_REPO,
        env: {
          ...process.env,
          BRASIL_AFORA_INGESTION_TOKEN: "i".repeat(32),
          // The source-document worker presents only its own scoped
          // credential; the retired omnipotent token is not set at all.
          MAINTENANCE_WORKER_TOKEN: undefined,
          SOURCE_WORKER_TOKEN: "s".repeat(32),
        },
      }
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("close", (code) => resolve({ code, stderr, stdout }));
  });

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    const path = temporaryDirectories.pop();
    if (path) {
      rmSync(path, { force: true, recursive: true });
    }
  }
});

describe("BF-07 registered-source worker end to end", () => {
  it("runs registry -> job -> fetch -> extract -> persist -> review -> complete and replays idempotently", async () => {
    const client = new PGlite();
    await migrate(client);
    const database = drizzle({ casing: "snake_case", client, schema });
    let queueNow = new Date("2026-09-16T02:00:00Z");
    const events: string[] = [];
    const replayed: boolean[] = [];
    const serverErrors: string[] = [];
    let fetchCount = 0;
    let checkpointIngestion: unknown = null;
    const fixtureHtml = readFileSync(
      join(PYTHON_REPO, "tests/fixtures/rich_scholarship.html"),
      "utf8"
    )
      .replaceAll("2026-08-31", "2026-09-30")
      .replaceAll("31 de agosto de 2026", "30 de setembro de 2026");

    const server = createServer(async (request, response) => {
      try {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        if (url.pathname === "/robots.txt") {
          response.statusCode = 200;
          response.setHeader("content-type", "text/plain");
          response.end("User-agent: *\nAllow: /\n");
          return;
        }
        if (url.pathname === "/fixture/program/2026") {
          events.push("fetch");
          fetchCount += 1;
          response.statusCode = 200;
          response.setHeader("content-type", "text/html");
          response.end(fixtureHtml);
          return;
        }
        const body = (await readJson(request)) as Record<string, unknown>;
        if (url.pathname === "/api/v1/maintenance/recrawls/claims") {
          events.push("claim");
          const jobs = await claimRecrawlJobs(
            database as unknown as Parameters<typeof claimRecrawlJobs>[0],
            "maintenance-worker",
            Number(body.limit ?? 1),
            queueNow,
            Array.isArray(body.job_kinds)
              ? body.job_kinds.map(String)
              : undefined
          );
          sendJson(response, 200, { data: { jobs } });
          return;
        }
        const checkpointMatch = url.pathname.match(CHECKPOINT_ROUTE_PATTERN);
        if (checkpointMatch) {
          events.push("checkpoint");
          const parsed = ingestionRequestV1Schema.parse(body.ingestion);
          checkpointIngestion = parsed;
          const job = await checkpointRecrawlJob(
            database as unknown as Parameters<typeof checkpointRecrawlJob>[0],
            checkpointMatch[1] ?? "",
            "maintenance-worker",
            typeof body.lease_token === "string" ? body.lease_token : "",
            parsed,
            queueNow
          );
          sendJson(response, 200, { data: job });
          return;
        }
        if (url.pathname === "/api/v1/ingestions") {
          events.push("ingest");
          const parsed = ingestionRequestV1Schema.parse(body);
          const result = await persistIngestion(
            database as unknown as Parameters<typeof persistIngestion>[0],
            parsed
          );
          replayed.push(result.replayed);
          sendJson(response, result.replayed ? 200 : 201, { data: result });
          return;
        }
        const completionMatch = url.pathname.match(COMPLETION_ROUTE_PATTERN);
        if (completionMatch) {
          events.push("complete");
          const job = await completeRecrawlJob(
            database as unknown as Parameters<typeof completeRecrawlJob>[0],
            completionMatch[1] ?? "",
            "maintenance-worker",
            typeof body.lease_token === "string" ? body.lease_token : "",
            {
              error: typeof body.error === "string" ? body.error : undefined,
              retryable:
                typeof body.retryable === "boolean"
                  ? body.retryable
                  : undefined,
              success: body.success === true,
            },
            queueNow
          );
          sendJson(response, 200, { data: job });
          return;
        }
        sendJson(response, 404, { error: "not found" });
      } catch (error) {
        serverErrors.push(
          error instanceof Error ? error.message : String(error)
        );
        sendJson(response, 500, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    try {
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve)
      );
      const address = server.address();
      if (!(address && typeof address === "object")) {
        throw new Error("BF-07 fixture server did not expose an address");
      }
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const temp = mkdtempSync(join(tmpdir(), "bf07-e2e-"));
      temporaryDirectories.push(temp);
      const registryPath = join(temp, "sources.toml");
      const sourceBaseUrl = `${baseUrl}/fixture/`;
      writeFileSync(
        registryPath,
        [
          "version = 1",
          "",
          "[[sources]]",
          'name = "BF07 local source"',
          `base_url = "${sourceBaseUrl}"`,
          'source_type = "website"',
          'authority_tier = "OFFICIAL_PROGRAM"',
          'allowed_paths = ["/fixture/*"]',
          'blocked_paths = ["/fixture/private/*"]',
          'rendering_policy = "never"',
          'adapter_name = "bf07_local"',
          'adapter_version = "1"',
          "enabled = true",
        ].join("\n"),
        "utf8"
      );
      const expectedSourceId = execFileSync(
        PYTHON,
        [
          "-c",
          `from brasil_afora_scraper.source_registry import canonical_source_id; print(canonical_source_id(${JSON.stringify(sourceBaseUrl)}))`,
        ],
        {
          cwd: PYTHON_REPO,
          encoding: "utf8",
          env: process.env,
        }
      ).trim();
      const inserted = await client.query<{ id: string }>(
        `
          INSERT INTO recrawl_jobs (
            job_kind,
            reason,
            priority,
            deduplication_key,
            requested_by,
            scheduled_for,
            payload
          ) VALUES (
            'source_document',
            'bf07 deterministic e2e',
            100,
            'bf07-e2e-job',
            'bf07-test',
            '2026-09-16T01:00:00Z',
            $1::jsonb
          ) RETURNING id
        `,
        [JSON.stringify({ url: `${baseUrl}/fixture/program/2026` })]
      );
      const jobId = inserted.rows[0]?.id;
      if (!jobId) {
        throw new Error("BF-07 fixture job was not inserted");
      }

      const first = await runWorker(baseUrl, registryPath);
      expect(first.code, first.stderr).toBe(0);
      expect(
        JSON.parse(first.stdout)[0]?.status,
        JSON.stringify({
          events,
          serverErrors,
          stderr: first.stderr,
          stdout: first.stdout,
        })
      ).toBe("completed");
      expect(events).toEqual([
        "claim",
        "fetch",
        "checkpoint",
        "ingest",
        "complete",
      ]);
      expect(replayed).toEqual([false]);
      expect(checkpointIngestion).not.toBeNull();

      const firstCounts = await client.query<{
        application_rounds: number;
        extraction_runs: number;
        idempotency_requests: number;
        publication_versions: number;
        recrawl_status: string;
        snapshots: number;
        source_documents: number;
        source_id: string;
        sources: number;
      }>(`
        SELECT
          (SELECT count(*)::int FROM sources) AS sources,
          (SELECT id::text FROM sources LIMIT 1) AS source_id,
          (SELECT count(*)::int FROM source_documents) AS source_documents,
          (SELECT count(*)::int FROM snapshots) AS snapshots,
          (SELECT count(*)::int FROM extraction_runs) AS extraction_runs,
          (SELECT count(*)::int FROM application_rounds) AS application_rounds,
          (SELECT count(*)::int FROM publication_versions) AS publication_versions,
          (SELECT count(*)::int FROM idempotency_requests) AS idempotency_requests,
          (SELECT status FROM recrawl_jobs WHERE id = '${jobId}') AS recrawl_status
      `);
      expect(firstCounts.rows[0]).toMatchObject({
        application_rounds: 1,
        extraction_runs: 1,
        idempotency_requests: 1,
        publication_versions: 1,
        recrawl_status: "completed",
        snapshots: 1,
        source_documents: 1,
        source_id: expectedSourceId,
        sources: 1,
      });
      const reviewQueue = await getReviewQueue(
        database as unknown as Parameters<typeof getReviewQueue>[0]
      );
      expect(reviewQueue.length).toBeGreaterThan(0);
      expect(reviewQueue[0]?.current_gate?.outcome).toBe("manual_review");

      queueNow = new Date("2026-09-16T03:00:00Z");
      await client.query(
        `
          UPDATE recrawl_jobs
          SET
            status = 'queued',
            completed_at = NULL,
            lease_token = NULL,
            locked_at = NULL,
            locked_by = NULL,
            scheduled_for = '2026-09-16T02:30:00Z',
            payload = payload || $1::jsonb
          WHERE id = $2
        `,
        [
          JSON.stringify({
            pending_ingestion: checkpointIngestion,
            pending_ingestion_checkpointed_at: "2026-09-16T02:00:00.000Z",
          }),
          jobId,
        ]
      );
      events.length = 0;
      const second = await runWorker(baseUrl, registryPath);
      expect(second.code, second.stderr).toBe(0);
      expect(JSON.parse(second.stdout)[0]?.status).toBe("completed");
      expect(events).toEqual(["claim", "ingest", "complete"]);
      expect(fetchCount).toBe(1);
      expect(replayed).toEqual([false, true]);

      const replayCounts = await client.query<{
        extraction_runs: number;
        idempotency_requests: number;
        publication_versions: number;
        snapshots: number;
        source_documents: number;
        sources: number;
      }>(`
        SELECT
          (SELECT count(*)::int FROM sources) AS sources,
          (SELECT count(*)::int FROM source_documents) AS source_documents,
          (SELECT count(*)::int FROM snapshots) AS snapshots,
          (SELECT count(*)::int FROM extraction_runs) AS extraction_runs,
          (SELECT count(*)::int FROM publication_versions) AS publication_versions,
          (SELECT count(*)::int FROM idempotency_requests) AS idempotency_requests
      `);
      expect(replayCounts.rows[0]).toEqual({
        extraction_runs: 1,
        idempotency_requests: 1,
        publication_versions: 1,
        snapshots: 1,
        source_documents: 1,
        sources: 1,
      });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
      await client.close();
    }
  }, 30_000);

  it("recovers a transient lost ingestion response from the durable checkpoint without refetching", async () => {
    const client = new PGlite();
    await migrate(client);
    const database = drizzle({ casing: "snake_case", client, schema });
    let queueNow = new Date("2026-09-16T02:00:00Z");
    const events: string[] = [];
    const replayed: boolean[] = [];
    const completionRetryability: boolean[] = [];
    const serverErrors: string[] = [];
    let fetchCount = 0;
    let failNextIngestionResponse = true;
    const fixtureHtml = readFileSync(
      join(PYTHON_REPO, "tests/fixtures/rich_scholarship.html"),
      "utf8"
    )
      .replaceAll("2026-08-31", "2026-09-30")
      .replaceAll("31 de agosto de 2026", "30 de setembro de 2026");

    const server = createServer(async (request, response) => {
      try {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        if (url.pathname === "/robots.txt") {
          response.statusCode = 200;
          response.setHeader("content-type", "text/plain");
          response.end("User-agent: *\nAllow: /\n");
          return;
        }
        if (url.pathname === "/fixture/program/2026") {
          events.push("fetch");
          fetchCount += 1;
          response.statusCode = 200;
          response.setHeader("content-type", "text/html");
          response.end(fixtureHtml);
          return;
        }
        const body = (await readJson(request)) as Record<string, unknown>;
        if (url.pathname === "/api/v1/maintenance/recrawls/claims") {
          events.push("claim");
          const jobs = await claimRecrawlJobs(
            database as unknown as Parameters<typeof claimRecrawlJobs>[0],
            "maintenance-worker",
            Number(body.limit ?? 1),
            queueNow,
            Array.isArray(body.job_kinds)
              ? body.job_kinds.map(String)
              : undefined
          );
          sendJson(response, 200, { data: { jobs } });
          return;
        }
        const checkpointMatch = url.pathname.match(CHECKPOINT_ROUTE_PATTERN);
        if (checkpointMatch) {
          events.push("checkpoint");
          const parsed = ingestionRequestV1Schema.parse(body.ingestion);
          const job = await checkpointRecrawlJob(
            database as unknown as Parameters<typeof checkpointRecrawlJob>[0],
            checkpointMatch[1] ?? "",
            "maintenance-worker",
            typeof body.lease_token === "string" ? body.lease_token : "",
            parsed,
            queueNow
          );
          sendJson(response, 200, { data: job });
          return;
        }
        if (url.pathname === "/api/v1/ingestions") {
          events.push("ingest");
          const parsed = ingestionRequestV1Schema.parse(body);
          const result = await persistIngestion(
            database as unknown as Parameters<typeof persistIngestion>[0],
            parsed
          );
          replayed.push(result.replayed);
          if (failNextIngestionResponse) {
            failNextIngestionResponse = false;
            sendJson(response, 503, { error: "fixture response lost" });
            return;
          }
          sendJson(response, result.replayed ? 200 : 201, { data: result });
          return;
        }
        const completionMatch = url.pathname.match(COMPLETION_ROUTE_PATTERN);
        if (completionMatch) {
          events.push("complete");
          if (typeof body.retryable === "boolean") {
            completionRetryability.push(body.retryable);
          }
          const job = await completeRecrawlJob(
            database as unknown as Parameters<typeof completeRecrawlJob>[0],
            completionMatch[1] ?? "",
            "maintenance-worker",
            typeof body.lease_token === "string" ? body.lease_token : "",
            {
              error: typeof body.error === "string" ? body.error : undefined,
              retryable:
                typeof body.retryable === "boolean"
                  ? body.retryable
                  : undefined,
              success: body.success === true,
            },
            queueNow
          );
          sendJson(response, 200, { data: job });
          return;
        }
        sendJson(response, 404, { error: "not found" });
      } catch (error) {
        serverErrors.push(
          error instanceof Error ? error.message : String(error)
        );
        sendJson(response, 500, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    try {
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve)
      );
      const address = server.address();
      if (!(address && typeof address === "object")) {
        throw new Error("BF-07 fixture server did not expose an address");
      }
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const temp = mkdtempSync(join(tmpdir(), "bf07-recovery-e2e-"));
      temporaryDirectories.push(temp);
      const registryPath = join(temp, "sources.toml");
      const sourceBaseUrl = `${baseUrl}/fixture/`;
      writeFileSync(
        registryPath,
        [
          "version = 1",
          "",
          "[[sources]]",
          'name = "BF07 recovery source"',
          `base_url = "${sourceBaseUrl}"`,
          'source_type = "website"',
          'authority_tier = "OFFICIAL_PROGRAM"',
          'allowed_paths = ["/fixture/*"]',
          'blocked_paths = ["/fixture/private/*"]',
          'rendering_policy = "never"',
          'adapter_name = "bf07_recovery"',
          'adapter_version = "1"',
          "enabled = true",
        ].join("\n"),
        "utf8"
      );
      const inserted = await client.query<{ id: string }>(
        `
          INSERT INTO recrawl_jobs (
            job_kind,
            reason,
            priority,
            deduplication_key,
            requested_by,
            scheduled_for,
            payload
          ) VALUES (
            'source_document',
            'bf07 recovery e2e',
            100,
            'bf07-recovery-e2e-job',
            'bf07-test',
            '2026-09-16T01:00:00Z',
            $1::jsonb
          ) RETURNING id
        `,
        [JSON.stringify({ url: `${baseUrl}/fixture/program/2026` })]
      );
      const jobId = inserted.rows[0]?.id;
      if (!jobId) {
        throw new Error("BF-07 recovery fixture job was not inserted");
      }

      const first = await runWorker(baseUrl, registryPath);
      expect(first.code, first.stderr).toBe(0);
      expect(JSON.parse(first.stdout)[0]?.status).toBe("queued");
      expect(events).toEqual([
        "claim",
        "fetch",
        "checkpoint",
        "ingest",
        "complete",
      ]);
      expect(completionRetryability).toEqual([true]);
      expect(fetchCount).toBe(1);
      expect(replayed).toEqual([false]);
      expect(serverErrors).toEqual([]);

      const afterFailure = await client.query<{
        pending_checkpoint: boolean;
        recrawl_status: string;
      }>(
        `
          SELECT
            (payload ? 'pending_ingestion') AS pending_checkpoint,
            status AS recrawl_status
          FROM recrawl_jobs
          WHERE id = $1
        `,
        [jobId]
      );
      expect(afterFailure.rows[0]).toEqual({
        pending_checkpoint: true,
        recrawl_status: "queued",
      });

      queueNow = new Date("2026-09-16T02:03:00Z");
      events.length = 0;
      const second = await runWorker(baseUrl, registryPath);
      expect(second.code, second.stderr).toBe(0);
      expect(JSON.parse(second.stdout)[0]?.status).toBe("completed");
      expect(events).toEqual(["claim", "ingest", "complete"]);
      expect(fetchCount).toBe(1);
      expect(replayed).toEqual([false, true]);
      expect(completionRetryability).toEqual([true]);
      expect(serverErrors).toEqual([]);

      const finalCounts = await client.query<{
        extraction_runs: number;
        idempotency_requests: number;
        publication_versions: number;
        recrawl_status: string;
        snapshots: number;
        source_documents: number;
        sources: number;
      }>(
        `
          SELECT
            (SELECT count(*)::int FROM sources) AS sources,
            (SELECT count(*)::int FROM source_documents) AS source_documents,
            (SELECT count(*)::int FROM snapshots) AS snapshots,
            (SELECT count(*)::int FROM extraction_runs) AS extraction_runs,
            (SELECT count(*)::int FROM publication_versions) AS publication_versions,
            (SELECT count(*)::int FROM idempotency_requests) AS idempotency_requests,
            (SELECT status FROM recrawl_jobs WHERE id = $1) AS recrawl_status
        `,
        [jobId]
      );
      expect(finalCounts.rows[0]).toEqual({
        extraction_runs: 1,
        idempotency_requests: 1,
        publication_versions: 1,
        recrawl_status: "completed",
        snapshots: 1,
        source_documents: 1,
        sources: 1,
      });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
      await client.close();
    }
  }, 30_000);
});
