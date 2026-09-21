import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// The route reads `db` from "@/db/client"; point it at an in-process
// PostgreSQL so the real handler, the real credential model and the real claim
// SQL run together.
const state = vi.hoisted(() => ({ client: null as unknown as PGlite }));
vi.mock("@/db/client", async () => {
  const { PGlite: PGliteClass } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { schema } = await import("@/db/schema");
  state.client = new PGliteClass();
  return {
    db: drizzle({ casing: "snake_case", client: state.client, schema }),
  };
});

const { POST } = await import("./route");

const TOKENS = {
  LINK_WORKER_TOKEN: "link-worker-token-cccccccccccccccccccc",
  SCHEDULER_TOKEN: "scheduler-token-aaaaaaaaaaaaaaaaaaaaaa",
  SOURCE_RUN_OPERATOR_TOKEN: "operator-token-dddddddddddddddddddddd",
  SOURCE_WORKER_TOKEN: "source-worker-token-bbbbbbbbbbbbbbbbbb",
};
const ORIGINAL_ENVIRONMENT = { ...process.env };

const MIGRATIONS = [
  "20260723000000_existing_application_baseline",
  "20260723224642_fixed_mantis",
  "20260723225823_add_audit_events",
  "20260723233636_lifecycle_maintenance",
  "20260725213000_semantic_field_states",
  "20260916080000_bf08_recrawl_lease_fencing",
  "20260919120000_bf10_source_runs",
];

beforeAll(async () => {
  for (const migration of MIGRATIONS) {
    await state.client.exec(
      readFileSync(
        new URL(
          `../../../../../../db/migrations/${migration}/migration.sql`,
          import.meta.url
        ),
        "utf8"
      )
    );
  }
  Object.assign(process.env, TOKENS);
});

afterAll(async () => {
  process.env = { ...ORIGINAL_ENVIRONMENT };
  await state.client.close();
});

interface Seeded {
  link: string;
  sourceDocument: string;
  supervised: string;
}

const seed = async (): Promise<Seeded> => {
  await state.client.exec("TRUNCATE recrawl_jobs CASCADE");
  const insert = async (
    kind: string,
    key: string,
    payload: Record<string, unknown>
  ): Promise<string> => {
    const rows = await state.client.query<{ id: string }>(
      `INSERT INTO recrawl_jobs (job_kind, reason, priority, deduplication_key,
         requested_by, scheduled_for, max_attempts, payload)
       VALUES ($1, 'route test', 100, $2, 'route-test', now() - interval '1 minute', 3, $3::jsonb)
       RETURNING id`,
      [kind, key, JSON.stringify(payload)]
    );
    const id = rows.rows[0]?.id;
    if (!id) {
      throw new Error("seed failed");
    }
    return id;
  };
  return {
    link: await insert("application_link", "link", {
      url: "https://example.org/apply",
    }),
    sourceDocument: await insert("source_document", "doc", {
      url: "https://example.org/doc",
    }),
    supervised: await insert("source_document", "supervised", {
      source_run_id: "99999999-9999-4999-8999-999999999999",
      url: "https://example.org/run-doc",
    }),
  };
};

const claim = async (
  token: string,
  body: Record<string, unknown>
): Promise<{ ids: string[]; status: number }> => {
  const response = await POST(
    new NextRequest("http://localhost/api/v1/maintenance/recrawls/claims", {
      body: JSON.stringify(body),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      method: "POST",
    })
  );
  const payload = (await response.json()) as {
    data?: { jobs?: Array<{ id: string }> };
  };
  return {
    ids: (payload.data?.jobs ?? []).map((job) => job.id).sort(),
    status: response.status,
  };
};

let jobs: Seeded;
beforeEach(async () => {
  jobs = await seed();
});

describe("POST /api/v1/maintenance/recrawls/claims", () => {
  it("narrows a source worker's default claim to unattended source documents", async () => {
    const result = await claim(TOKENS.SOURCE_WORKER_TOKEN, { limit: 10 });
    expect(result).toEqual({ ids: [jobs.sourceDocument], status: 200 });
  });

  it("narrows a link worker's default claim to application links", async () => {
    const result = await claim(TOKENS.LINK_WORKER_TOKEN, { limit: 10 });
    expect(result).toEqual({ ids: [jobs.link], status: 200 });
  });

  it("refuses a worker that asks for the other worker's kind", async () => {
    expect(
      (
        await claim(TOKENS.SOURCE_WORKER_TOKEN, {
          job_kinds: ["application_link"],
          limit: 10,
        })
      ).status
    ).toBe(403);
    expect(
      (
        await claim(TOKENS.LINK_WORKER_TOKEN, {
          job_kinds: ["source_document"],
          limit: 10,
        })
      ).status
    ).toBe(403);
  });

  it("keeps a supervised run's jobs from an unattended worker that names them", async () => {
    const result = await claim(TOKENS.SOURCE_WORKER_TOKEN, {
      job_ids: [jobs.supervised],
      limit: 1,
    });
    expect(result.status).toBe(403);
    const row = await state.client.query<{ status: string }>(
      "SELECT status FROM recrawl_jobs WHERE id = $1",
      [jobs.supervised]
    );
    expect(row.rows[0]?.status).toBe("queued");
  });

  it("lets the source-run operator claim its run's jobs by id", async () => {
    const result = await claim(TOKENS.SOURCE_RUN_OPERATOR_TOKEN, {
      job_ids: [jobs.supervised],
      limit: 1,
    });
    expect(result).toEqual({ ids: [jobs.supervised], status: 200 });
  });

  it("refuses the scheduler outright", async () => {
    expect((await claim(TOKENS.SCHEDULER_TOKEN, { limit: 10 })).status).toBe(
      403
    );
  });
});
