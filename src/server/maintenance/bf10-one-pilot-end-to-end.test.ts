import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";
import {
  ingestionRequestV1Schema,
  publicOpportunityFilterV1Schema,
} from "@/contracts/opportunity-v1";
import { schema } from "@/db/schema";
import { persistIngestion } from "@/server/ingestion/persist-ingestion";
import { verifyApplicationLink } from "@/server/link-verification/application-link-verifier";
import {
  checkpointRecrawlJob,
  claimRecrawlJobs,
  completeRecrawlJob,
  scheduleDueRecrawls,
} from "@/server/maintenance/recrawl-scheduler";
import {
  completeSourceRun,
  enqueueSourceRunCandidates,
  getSourceRunHealth,
  sourceRunCandidatesRequestSchema,
  sourceRunObservationSchema,
  sourceRunStartRequestSchema,
  startSourceRun,
} from "@/server/maintenance/source-runs";
import { listPublicOpportunities } from "@/server/publication/list-public-opportunities";
import {
  decidePublication,
  deliverPendingOutbox,
} from "@/server/publication/publication-workflow";
import { getReviewQueue } from "@/server/review/review-queue";
import { submitReviewerCorrection } from "@/server/review/reviewer-corrections";

/*
 * BF-10 ONE pilot, end to end: the real Python source-run CLI and BF-07 worker
 * against a local mirror of the official ONE pages captured on 2026-09-19,
 * with every maintenance and ingestion call executed by the real server
 * functions on a migrated PGlite database.
 *
 * Page variants below are deterministic fixture mutations, never live facts.
 */

const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for the cross-language test suite`);
  }
  return value;
};

const PYTHON_REPO = requiredEnv("BRASIL_AFORA_PYTHON_REPO");
const PYTHON = requiredEnv("BRASIL_AFORA_PYTHON");
const FIXTURES = join(PYTHON_REPO, "tests/fixtures/one_ufma");
const HOME = readFileSync(join(FIXTURES, "home_2026-09-19.html"), "utf8");
const REGULATION = readFileSync(
  join(FIXTURES, "regulamento_2026-09-19.html"),
  "utf8"
);
// The principal id the real credential model assigns to the operator token.
const WORKER = "source-run-operator";
const OPERATOR_BEARER = `Bearer ${"o".repeat(32)}`;
const INGESTION_BEARER = `Bearer ${"i".repeat(32)}`;
const SIGNUP_PATH = /\/inscricao$/;
const REVIEWER_ID = "00000000-0000-4000-8000-00000000b10a";
const RUN_ROUTE =
  /^\/api\/v1\/maintenance\/source-runs\/([^/]+)\/(candidates|completion)$/;
const RECRAWL_ROUTE =
  /^\/api\/v1\/maintenance\/recrawls\/([^/]+)\/(checkpoint|completion)$/;

// Deterministic variants of the 2026-09-19 capture. The edition label appears
// in several places, so a variant must change every occurrence.
const FACT_CHANGE = HOME.replace(
  "<strong>01/08 a 15/09/2026</strong>",
  "<strong>01/08 a 30/09/2026</strong>"
);
const NEW_EDITION = HOME.replaceAll("ONE 2026–2027", "ONE 2027–2028")
  .replace("<span>ONE 2026</span>", "<span>ONE 2027</span>")
  .replaceAll("Regulamento Oficial ONE 2026", "Regulamento Oficial ONE 2027")
  .replace(
    "<strong>01/08 a 15/09/2026</strong>",
    "<strong>01/08 a 15/09/2027</strong>"
  );

// Adds three things the live page did NOT have on 2026-09-19: an open window, a
// static sign-up link, and an og:image. Without a representative image the
// legacy public projection refuses to publish (LEGACY_PROJECTION_INCOMPLETE),
// so the live ONE page cannot currently become public even after approval.
const OPEN_WITH_SIGNUP_LINK = HOME.replace(
  "<strong>01/08 a 15/09/2026</strong><h3>Inscrições</h3>",
  '<strong>01/08 a 15/12/2026</strong><h3>Inscrições</h3><a href="/inscricao">Inscreva-se</a>'
).replace(
  "</title>",
  '</title><meta property="og:image" content="/one-2026.png">'
);

const migrations = [
  "20260723000000_existing_application_baseline",
  "20260723224642_fixed_mantis",
  "20260723225823_add_audit_events",
  "20260723233636_lifecycle_maintenance",
  "20260725213000_semantic_field_states",
  "20260916080000_bf08_recrawl_lease_fencing",
  "20260919120000_bf10_source_runs",
];

const temporaryDirectories: string[] = [];
const servers: Server[] = [];
const clients: PGlite[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        })
    )
  );
  await Promise.all(clients.splice(0).map((client) => client.close()));
  for (const path of temporaryDirectories.splice(0)) {
    rmSync(path, { force: true, recursive: true });
  }
});

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

type PageHandler = (requestNumberInRun: number) => number | string;

interface PilotRun {
  code: number | null;
  run: Record<string, unknown>;
  stderr: string;
}

const createPilot = async () => {
  const client = new PGlite();
  clients.push(client);
  for (const migration of migrations) {
    await client.exec(
      readFileSync(
        new URL(
          `../../db/migrations/${migration}/migration.sql`,
          import.meta.url
        ),
        "utf8"
      )
    );
  }
  const database = drizzle({ casing: "snake_case", client, schema });
  const db = database as unknown as Parameters<typeof startSourceRun>[0];
  const serverErrors: string[] = [];
  let home: PageHandler = () => HOME;
  let regulation: PageHandler = () => REGULATION;
  let homeRequests = 0;
  let regulationRequests = 0;

  const handle = async (
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "GET") {
      if (url.pathname === "/robots.txt") {
        // Mirrors the live source on 2026-09-19: no robots.txt (HTTP 404).
        response.statusCode = 404;
        response.end("not found");
        return;
      }
      let page: number | string = 404;
      if (url.pathname === "/") {
        homeRequests += 1;
        page = home(homeRequests);
      } else if (url.pathname === "/regulamento") {
        regulationRequests += 1;
        page = regulation(regulationRequests);
      }
      response.statusCode = typeof page === "number" ? page : 200;
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(typeof page === "number" ? "error" : page);
      return;
    }
    // Authorize exactly as production does: the operator's credential for the
    // maintenance routes, the ingestion credential for ingestion, nothing else.
    let expectedBearer: string | null = null;
    if (url.pathname.startsWith("/api/v1/maintenance/")) {
      expectedBearer = OPERATOR_BEARER;
    } else if (url.pathname === "/api/v1/ingestions") {
      expectedBearer = INGESTION_BEARER;
    }
    if (expectedBearer && request.headers.authorization !== expectedBearer) {
      serverErrors.push(`wrong credential for ${url.pathname}`);
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }
    const body = (await readJson(request)) as Record<string, unknown>;
    if (url.pathname === "/api/v1/maintenance/source-runs") {
      const input = sourceRunStartRequestSchema.parse(body);
      sendJson(response, 201, {
        data: { run: await startSourceRun(db, WORKER, input) },
      });
      return;
    }
    const runMatch = url.pathname.match(RUN_ROUTE);
    if (runMatch?.[2] === "candidates") {
      const input = sourceRunCandidatesRequestSchema.parse(body);
      const jobs = await enqueueSourceRunCandidates(
        db,
        runMatch[1] ?? "",
        WORKER,
        input.candidates
      );
      sendJson(response, 200, { data: { jobs } });
      return;
    }
    if (runMatch?.[2] === "completion") {
      const input = sourceRunObservationSchema.parse(body);
      const run = await completeSourceRun(db, runMatch[1] ?? "", WORKER, input);
      sendJson(response, 200, { data: { run } });
      return;
    }
    if (url.pathname === "/api/v1/maintenance/recrawls/claims") {
      const jobs = await claimRecrawlJobs(
        db as never,
        WORKER,
        Number(body.limit ?? 1),
        new Date(),
        ["source_document"],
        undefined,
        Array.isArray(body.job_ids) ? body.job_ids.map(String) : undefined
      );
      sendJson(response, 200, { data: { jobs } });
      return;
    }
    const recrawlMatch = url.pathname.match(RECRAWL_ROUTE);
    if (recrawlMatch?.[2] === "checkpoint") {
      const job = await checkpointRecrawlJob(
        db as never,
        recrawlMatch[1] ?? "",
        WORKER,
        String(body.lease_token ?? ""),
        ingestionRequestV1Schema.parse(body.ingestion)
      );
      sendJson(response, 200, { data: job });
      return;
    }
    if (recrawlMatch?.[2] === "completion") {
      const job = await completeRecrawlJob(
        db as never,
        recrawlMatch[1] ?? "",
        WORKER,
        String(body.lease_token ?? ""),
        {
          error: typeof body.error === "string" ? body.error : undefined,
          retryable:
            typeof body.retryable === "boolean" ? body.retryable : undefined,
          success: body.success === true,
        }
      );
      sendJson(response, 200, { data: job });
      return;
    }
    if (url.pathname === "/api/v1/ingestions") {
      const result = await persistIngestion(
        db as never,
        ingestionRequestV1Schema.parse(body)
      );
      sendJson(response, result.replayed ? 200 : 201, { data: result });
      return;
    }
    sendJson(response, 404, { error: "not found" });
  };

  const server = createServer((request, response) => {
    handle(request, response).catch((error: unknown) => {
      serverErrors.push(error instanceof Error ? error.message : String(error));
      sendJson(response, 500, { error: "fixture server failure" });
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!(address && typeof address === "object")) {
    throw new Error("BF-10 fixture server did not expose an address");
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const temp = mkdtempSync(join(tmpdir(), "bf10-one-"));
  temporaryDirectories.push(temp);
  const registryPath = join(temp, "sources.toml");
  writeFileSync(
    registryPath,
    [
      "version = 1",
      "",
      "[[sources]]",
      'name = "ONE — Olimpíada Nacional de Empreendedorismo (UFMA) — local mirror"',
      `base_url = "${baseUrl}/"`,
      'source_type = "website"',
      'authority_tier = "OFFICIAL_PROGRAM"',
      'allowed_paths = ["/", "/regulamento"]',
      'discovery_methods = ["supervised_run"]',
      "rate_limit_per_minute = 6",
      "concurrency_limit = 1",
      'rendering_policy = "never"',
      'adapter_name = "one_ufma"',
      'adapter_version = "1"',
      "enabled = true",
    ].join("\n"),
    "utf8"
  );

  const runPilot = (
    pages: { home?: PageHandler; regulation?: PageHandler } = {}
  ): Promise<PilotRun> => {
    home = pages.home ?? (() => HOME);
    regulation = pages.regulation ?? (() => REGULATION);
    homeRequests = 0;
    regulationRequests = 0;
    return new Promise((resolve) => {
      const child = spawn(
        PYTHON,
        [
          "-m",
          "brasil_afora_scraper.source_run",
          "--web-base-url",
          baseUrl,
          "--adapter",
          "one_ufma",
          "--registry",
          registryPath,
          "--taxonomy",
          join(PYTHON_REPO, "config/categories.toml"),
          "--facets",
          join(PYTHON_REPO, "config/facets.toml"),
          "--source-cohort",
          "bf10_one_pilot",
          "--request-interval-seconds",
          "0",
        ],
        {
          cwd: PYTHON_REPO,
          env: {
            ...process.env,
            BRASIL_AFORA_INGESTION_TOKEN: "i".repeat(32),
            // The supervised source-run operator presents only the
            // operator-scoped credential.
            MAINTENANCE_WORKER_TOKEN: undefined,
            SOURCE_RUN_OPERATOR_TOKEN: "o".repeat(32),
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
      child.on("close", (code) => {
        let run: Record<string, unknown> = {};
        try {
          run = JSON.parse(stdout) as Record<string, unknown>;
        } catch {
          run = { unparsed: stdout };
        }
        resolve({
          code,
          run,
          stderr: `${stderr}\nserver errors: ${serverErrors.join(" | ")}`,
        });
      });
    });
  };

  const state = async () => {
    const result = await client.query<{
      application_rounds: number;
      editions: string;
      open_review_tasks: number;
      programs: number;
      publication_states: string;
      publication_versions: number;
      public_rows: number;
      rounds: string;
      snapshots: number;
      source_documents: number;
      source_runs: number;
    }>(`
      SELECT
        (SELECT count(*)::int FROM programs) AS programs,
        (SELECT string_agg(edition_label || ':' || coalesce(edition_year::text, '-'), ',' ORDER BY edition_label) FROM editions) AS editions,
        (SELECT count(*)::int FROM application_rounds) AS application_rounds,
        (SELECT string_agg(coalesce(deadline_date::text, '-') || '/' || deadline_type, ',' ORDER BY deadline_date) FROM application_rounds) AS rounds,
        (SELECT count(*)::int FROM publication_versions) AS publication_versions,
        (SELECT string_agg(DISTINCT editorial_state::text, ',') FROM publication_versions) AS publication_states,
        (SELECT count(*)::int FROM review_tasks WHERE status = 'open') AS open_review_tasks,
        (SELECT count(*)::int FROM national_opportunities) + (SELECT count(*)::int FROM opportunities) AS public_rows,
        (SELECT count(*)::int FROM snapshots) AS snapshots,
        (SELECT count(*)::int FROM source_documents) AS source_documents,
        (SELECT count(*)::int FROM source_runs) AS source_runs
    `);
    return result.rows[0];
  };

  return { client, db, runPilot, state };
};

const canonicalCounts = async (client: PGlite) =>
  (
    await client.query<{
      editions: number;
      programs: number;
      rounds: number;
      source_documents: number;
    }>(`
      SELECT
        (SELECT count(*)::int FROM programs) AS programs,
        (SELECT count(*)::int FROM editions) AS editions,
        (SELECT count(*)::int FROM application_rounds) AS rounds,
        (SELECT count(*)::int FROM source_documents) AS source_documents
    `)
  ).rows[0];

const editionRounds = async (client: PGlite) =>
  (
    await client.query<{
      deadline_date: string;
      edition_label: string;
      edition_year: number | null;
      id: string;
    }>(`
      SELECT e.id::text, e.edition_label, e.edition_year, r.deadline_date::text
      FROM editions e JOIN application_rounds r ON r.edition_id = e.id
      ORDER BY e.edition_label
    `)
  ).rows;

const publicationSnapshot = async (client: PGlite) =>
  (
    await client.query<{
      approved_by: string | null;
      editorial_state: string;
      edition_id: string;
      version: number;
    }>(`
      SELECT edition_id::text, version, editorial_state::text, approved_by
      FROM publication_versions ORDER BY edition_id, version
    `)
  ).rows;

const publicRows = async (client: PGlite) =>
  (
    await client.query<{ count: number }>(`
      SELECT (SELECT count(*)::int FROM national_opportunities)
        + (SELECT count(*)::int FROM opportunities) AS count
    `)
  ).rows[0]?.count;

describe("BF-10 ONE supervised pilot end to end", () => {
  it("records healthy repeat runs, reconciles changes, adds editions, and survives a partial run", async () => {
    const pilot = await createPilot();

    // Run 1: the 2026-09-19 official capture. Registration closed on 15/09.
    const first = await pilot.runPilot();
    expect(first.code, first.stderr).toBe(0);
    expect(first.run).toMatchObject({
      candidatesRejected: 8,
      candidatesValid: 2,
      discoveryCompleted: true,
      errorCategories: [],
      ingestionFailures: 0,
      ingestionSuccesses: 1,
      pagesAttempted: 3,
      pagesExpected: 3,
      pagesFailed: 0,
      pagesSucceeded: 3,
      reconciliationEligible: true,
      status: "healthy",
    });
    const sourceId = String(first.run.sourceId);
    expect(await canonicalCounts(pilot.client)).toEqual({
      editions: 1,
      programs: 1,
      rounds: 1,
      source_documents: 1,
    });
    const [edition2026] = await editionRounds(pilot.client);
    expect(edition2026).toMatchObject({
      deadline_date: "2026-09-15",
      edition_label: "2026",
      edition_year: 2026,
    });
    // A closed edition is archived by the existing gate; nothing is public and
    // the scraper never approves its own output.
    const afterFirst = await publicationSnapshot(pilot.client);
    expect(afterFirst).toEqual([
      {
        approved_by: null,
        edition_id: edition2026?.id,
        editorial_state: "archived",
        version: 1,
      },
    ]);
    expect(await publicRows(pilot.client)).toBe(0);

    // Run 2: unchanged source. New run record, no new canonical entities,
    // no new publication version, no new snapshot.
    const second = await pilot.runPilot();
    expect(second.code, second.stderr).toBe(0);
    expect(second.run).toMatchObject({ status: "healthy" });
    expect(second.run.id).not.toBe(first.run.id);
    expect(await canonicalCounts(pilot.client)).toEqual({
      editions: 1,
      programs: 1,
      rounds: 1,
      source_documents: 1,
    });
    expect(await publicationSnapshot(pilot.client)).toEqual(afterFirst);
    const snapshots = await pilot.client.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM snapshots"
    );
    expect(snapshots.rows[0]?.count).toBe(1);

    // Run 3: deterministic fact change (deadline 15/09 -> 30/09) reaches
    // BF-04 current-state reconciliation as a reviewable material change.
    const third = await pilot.runPilot({ home: () => FACT_CHANGE });
    expect(third.run).toMatchObject({ status: "healthy" });
    expect(await canonicalCounts(pilot.client)).toMatchObject({
      editions: 1,
      rounds: 1,
    });
    expect((await editionRounds(pilot.client))[0]?.deadline_date).toBe(
      "2026-09-30"
    );
    const changes = await pilot.client.query<{
      current_value: { value: unknown };
      previous_value: { value: unknown };
    }>(
      "SELECT previous_value, current_value FROM material_change_events WHERE field_name = 'application_deadline'"
    );
    expect(changes.rows).toEqual([
      {
        current_value: expect.objectContaining({ value: "2026-09-30" }),
        previous_value: expect.objectContaining({ value: "2026-09-15" }),
      },
    ]);
    const afterChange = await publicationSnapshot(pilot.client);
    expect(afterChange.map((row) => row.editorial_state)).toEqual([
      "archived",
      "needs_review",
    ]);
    expect(afterChange.every((row) => row.approved_by === null)).toBe(true);
    const queue = await getReviewQueue(pilot.db as never);
    expect(queue.map((item) => item.edition.id)).toContain(edition2026?.id);
    expect(await publicRows(pilot.client)).toBe(0);

    // Run 4: deterministic next edition. BF-05 creates a new edition and
    // leaves the 2026 history untouched.
    const fourth = await pilot.runPilot({ home: () => NEW_EDITION });
    expect(fourth.run).toMatchObject({ status: "healthy" });
    expect(await canonicalCounts(pilot.client)).toEqual({
      editions: 2,
      programs: 1,
      rounds: 2,
      source_documents: 1,
    });
    expect(await editionRounds(pilot.client)).toEqual([
      expect.objectContaining({
        deadline_date: "2026-09-30",
        edition_year: 2026,
        id: edition2026?.id,
      }),
      expect.objectContaining({
        deadline_date: "2027-09-15",
        edition_label: "2027",
        edition_year: 2027,
      }),
    ]);
    const lastHealthy = await getSourceRunHealth(pilot.db, sourceId);
    expect(lastHealthy.reconciliationEligible).toBe(true);

    // Run 5: the detail page fails after discovery succeeded. The run is
    // degraded, not reconciliation eligible, and every previously valid
    // record is retained exactly.
    const beforePartial = {
      canonical: await canonicalCounts(pilot.client),
      editions: await editionRounds(pilot.client),
      publication: await publicationSnapshot(pilot.client),
    };
    const fifth = await pilot.runPilot({
      home: (request) => (request === 1 ? NEW_EDITION : 500),
    });
    expect(fifth.code).toBe(3);
    expect(fifth.run).toMatchObject({
      discoveryCompleted: true,
      ingestionFailures: 1,
      ingestionSuccesses: 0,
      pagesFailed: 1,
      reconciliationEligible: false,
      status: "degraded",
    });
    expect(fifth.run.errorCategories).toEqual([
      "http_transient",
      "delivery_pending",
    ]);
    expect({
      canonical: await canonicalCounts(pilot.client),
      editions: await editionRounds(pilot.client),
      publication: await publicationSnapshot(pilot.client),
    }).toEqual(beforePartial);
    const health = await getSourceRunHealth(pilot.db, sourceId);
    expect(health.latestRun?.status).toBe("degraded");
    expect(health.reconciliationEligible).toBe(false);
    expect(health.lastHealthyCompletedAt?.toISOString()).toBe(
      lastHealthy.lastHealthyCompletedAt?.toISOString()
    );
    const runs = await pilot.client.query<{ status: string }>(
      "SELECT status FROM source_runs ORDER BY started_at"
    );
    expect(runs.rows.map((row) => row.status)).toEqual([
      "healthy",
      "healthy",
      "healthy",
      "healthy",
      "degraded",
    ]);
    // Linked editions exist now, yet the unattended scheduler queues nothing
    // for a supervised-run-only source.
    expect(await scheduleDueRecrawls(pilot.db as never, "cron-probe")).toEqual({
      application_link_jobs: 0,
      source_document_jobs: 0,
    });
  }, 180_000);

  it("fails a run whose start page broke its contract without touching prior records", async () => {
    const pilot = await createPilot();
    const first = await pilot.runPilot();
    expect(first.run).toMatchObject({ status: "healthy" });
    const before = {
      canonical: await canonicalCounts(pilot.client),
      publication: await publicationSnapshot(pilot.client),
    };

    const broken = await pilot.runPilot({
      home: () => HOME.replace("<h3>Inscrições</h3>", "<h3>Resultados</h3>"),
    });
    expect(broken.code).toBe(3);
    expect(broken.run).toMatchObject({
      discoveryCompleted: false,
      errorCategories: expect.arrayContaining(["source_contract"]),
      ingestionSuccesses: 0,
      reconciliationEligible: false,
      status: "failed",
    });
    expect({
      canonical: await canonicalCounts(pilot.client),
      publication: await publicationSnapshot(pilot.client),
    }).toEqual(before);
    const jobs = await pilot.client.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM recrawl_jobs WHERE payload->>'source_run_id' = '${String(broken.run.id)}'`
    );
    expect(jobs.rows[0]?.count).toBe(0);
  }, 120_000);

  it("lets BF-06 operational closure suppress Apply without rewriting the approved ONE publication", async () => {
    const pilot = await createPilot();
    const run = await pilot.runPilot({ home: () => OPEN_WITH_SIGNUP_LINK });
    expect(run.run).toMatchObject({ status: "healthy" });
    const edition = (await editionRounds(pilot.client))[0];
    const context = (
      await pilot.client.query<{
        application_url: string;
        round_id: string;
        source_document_id: string;
      }>(`
        SELECT r.id::text AS round_id, r.application_url,
          (SELECT id::text FROM source_documents LIMIT 1) AS source_document_id
        FROM application_rounds r
      `)
    ).rows[0];
    if (!(edition && context)) {
      throw new Error("ONE open variant was not ingested");
    }
    expect(context.application_url).toMatch(SIGNUP_PATH);
    expect(await publicRows(pilot.client)).toBe(0);

    await pilot.client.query(
      "INSERT INTO users (id, name, email) VALUES ($1, 'BF-10 reviewer', 'bf10-reviewer@example.org')",
      [REVIEWER_ID]
    );
    // Human review. The reviewer resolves the two questions the pipeline
    // deliberately left open, citing official homepage text as evidence. The
    // scraper itself never approves anything.
    const latestVersionId = async () =>
      (
        await pilot.client.query<{ id: string }>(
          `SELECT id::text FROM publication_versions WHERE edition_id = '${edition.id}' ORDER BY version DESC LIMIT 1`
        )
      ).rows[0]?.id ?? null;
    const correct = async (
      fieldName: string,
      value: string,
      evidence: string,
      locator: string
    ) =>
      submitReviewerCorrection(pilot.db as never, REVIEWER_ID, {
        contract_version: "1.0",
        corrected_value: value,
        correction_reason: `BF-10 supervised review of ${fieldName}.`,
        edition_id: edition.id,
        evidence_locator: locator,
        evidence_text: evidence,
        field_name: fieldName,
        idempotency_key: `bf10-one-${fieldName}-review`,
        previous_publication_version_id: await latestVersionId(),
        review_task_id: null,
        semantic_state: "explicit_value",
        source_document_id: context.source_document_id,
      });
    await correct(
      "brazilian_eligibility",
      "eligible",
      "Estudantes do Ensino Médio de escolas públicas e privadas de todo o Brasil, conforme as regras definitivas do edital nacional.",
      "details:has(summary:text('Quem poderá participar'))"
    );
    await correct(
      "site_taxonomy",
      "national",
      "Para estudantes e professores do Ensino Médio. Participação nacional.",
      "section#inicio"
    );
    const current = (
      await pilot.client.query<{ version: number }>(
        `SELECT max(version)::int AS version FROM publication_versions WHERE edition_id = '${edition.id}'`
      )
    ).rows[0];
    await decidePublication(pilot.db as never, edition.id, REVIEWER_ID, {
      action: "approve",
      contract_version: "1.0",
      expected_publication_version: current?.version ?? 0,
      idempotency_key: "bf10-one-approve-000001",
      reason: "Supervised BF-10 pilot review of the ONE fixture variant.",
    });
    expect(
      await deliverPendingOutbox(pilot.db as never, "bf10-outbox")
    ).toMatchObject({ delivered: 1, failed: 0 });
    const readOne = async () => {
      const page = await listPublicOpportunities(
        pilot.db as never,
        publicOpportunityFilterV1Schema.parse({})
      );
      expect(page.items).toHaveLength(1);
      return page.items[0] as unknown as Record<string, unknown>;
    };
    const beforeClosure = await readOne();
    const approved = await publicationSnapshot(pilot.client);

    const assessment = await verifyApplicationLink(
      pilot.db as never,
      context.round_id,
      "bf10-link-worker",
      {
        client: {
          get: async () => ({
            body: '<html><h1>ONE 2026</h1><p>Inscrições encerradas.</p><form><button disabled type="submit">Inscreva-se</button></form></html>',
            finalUrl: context.application_url,
            headers: { "content-type": "text/html" },
            redirectChain: [],
            status: 200,
          }),
        },
        robotsChecker: async () => ({
          allowed: true,
          reason: "robots.txt allows this path",
        }),
      }
    );
    const afterClosure = await readOne();

    expect(assessment.status).toBe("closed");
    expect(beforeClosure.can_apply).toBe(true);
    expect(afterClosure.can_apply).toBe(false);
    expect(afterClosure.publication_version_id).toBe(
      beforeClosure.publication_version_id
    );
    expect(await publicationSnapshot(pilot.client)).toEqual(approved);
  }, 120_000);
});
