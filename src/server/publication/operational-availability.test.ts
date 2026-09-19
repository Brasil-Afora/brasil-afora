import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, it } from "vitest";
import {
  publicOpportunityFilterV1Schema,
  publicOpportunityV1Schema,
} from "@/contracts/opportunity-v1";
import { schema } from "@/db/schema";
import {
  applicationRounds,
  editions,
  programs,
  publicationVersions,
} from "@/db/schema/ingestion";
import { verifyApplicationLink } from "@/server/link-verification/application-link-verifier";
import { listPublicOpportunities } from "./list-public-opportunities";

const PROGRAM_ID = "10000000-0000-4000-8000-000000000001";
const EDITION_ID = "10000000-0000-4000-8000-000000000002";
const ROUND_ID = "10000000-0000-4000-8000-000000000003";
const PUBLICATION_ID = "10000000-0000-4000-8000-000000000004";
const PENDING_PUBLICATION_ID = "10000000-0000-4000-8000-000000000005";
const APPROVED_URL = "https://example.org/apply/2026";
const OPERATIONAL_ONLY_URL = "https://example.org/apply/live";
const CHECKED_AT = new Date("2026-09-15T18:00:00Z");

type Lifecycle =
  | "expected"
  | "announced"
  | "applications_not_open"
  | "open"
  | "closing_soon"
  | "extended"
  | "closed"
  | "cancelled"
  | "completed"
  | "archived"
  | "unknown";

type LinkStatus =
  | "unchecked"
  | "current_and_open"
  | "current_but_not_open"
  | "closed"
  | "old_edition"
  | "generic_homepage"
  | "results_page"
  | "login_only"
  | "broken"
  | "redirected"
  | "blocked"
  | "unknown";

type TestDatabase = Awaited<ReturnType<typeof createDatabase>>["database"];

interface SeedOptions {
  approvedApplicationUrl?: string | null;
  approvedLinkStatus?: LinkStatus;
  canonicalApplicationUrl?: string | null;
  canonicalLifecycle?: Lifecycle;
  lifecycle?: Lifecycle;
  pendingTitle?: string;
  title?: string;
}

const createDatabase = async () => {
  const client = new PGlite();
  await client.exec(`
    CREATE TABLE "users" (
      "id" uuid PRIMARY KEY,
      "name" text NOT NULL DEFAULT '',
      "email" text NOT NULL DEFAULT ''
    );
    CREATE TABLE "opportunities" (
      "id" uuid PRIMARY KEY,
      "name" text NOT NULL,
      "image" text NOT NULL,
      "country" text NOT NULL,
      "city" text NOT NULL,
      "responsible_institution" text NOT NULL,
      "type" text NOT NULL,
      "description" text NOT NULL,
      "education_level" text NOT NULL,
      "age_range" text NOT NULL,
      "language_requirements" text NOT NULL,
      "specific_requirements" text NOT NULL,
      "application_fee" text NOT NULL,
      "scholarship_type" text NOT NULL,
      "scholarship_coverage" text NOT NULL,
      "extra_costs" text NOT NULL,
      "duration" text NOT NULL,
      "application_deadline" date NOT NULL,
      "selection_steps" text NOT NULL,
      "application_process" text NOT NULL,
      "official_link" text NOT NULL,
      "contact" text NOT NULL,
      "created_at" timestamp NOT NULL,
      "updated_at" timestamp NOT NULL
    );
    CREATE TABLE "national_opportunities" (
      "id" uuid PRIMARY KEY,
      "name" text NOT NULL
    );
  `);
  for (const migrationPath of [
    "../../db/migrations/20260723224642_fixed_mantis/migration.sql",
    "../../db/migrations/20260723225823_add_audit_events/migration.sql",
    "../../db/migrations/20260723233636_lifecycle_maintenance/migration.sql",
    "../../db/migrations/20260725213000_semantic_field_states/migration.sql",
  ]) {
    await client.exec(
      readFileSync(new URL(migrationPath, import.meta.url), "utf8")
    );
  }
  return {
    client,
    database: drizzle({ casing: "snake_case", client, schema }),
  };
};

const makeProjection = ({
  applicationUrl,
  lifecycle,
  linkStatus,
  publicationId = PUBLICATION_ID,
  title,
}: {
  applicationUrl: string | null;
  lifecycle: Lifecycle;
  linkStatus: LinkStatus;
  publicationId?: string;
  title: string;
}) =>
  publicOpportunityV1Schema.parse({
    age_rules: [],
    application_deadline_date: "2026-12-31",
    application_deadline_time: null,
    application_deadline_timezone: null,
    application_link_status: linkStatus,
    application_url: applicationUrl,
    brazil_eligibility: "eligible",
    collection: "international",
    cost_amount: null,
    currency: null,
    deadline_precision: "date_only",
    description: "BF-06 fixture opportunity.",
    education_levels: ["high_school"],
    end_date: null,
    id: EDITION_ID,
    image_url: null,
    is_free: true,
    last_verified_at: "2026-09-01T12:00:00Z",
    lifecycle,
    location: "Lisboa, Portugal",
    modality: "in_person",
    official_information_url: "https://example.org/program/2026",
    opportunity_types: ["scholarship"],
    organizer: "Example Foundation",
    publication_version_id: publicationId,
    semantic_fields: {},
    start_date: null,
    title,
  });

const seedPublishedOpportunity = async (
  database: TestDatabase,
  {
    approvedApplicationUrl = APPROVED_URL,
    approvedLinkStatus = "current_and_open",
    canonicalApplicationUrl = approvedApplicationUrl,
    canonicalLifecycle = "open",
    lifecycle = "open",
    pendingTitle,
    title = "Approved BF-06 opportunity",
  }: SeedOptions = {}
) => {
  const approvedProjection = makeProjection({
    applicationUrl: approvedApplicationUrl,
    lifecycle,
    linkStatus: approvedLinkStatus,
    title,
  });

  await database.insert(programs).values({
    canonicalName: "BF-06 Program",
    id: PROGRAM_ID,
    officialHomepage: "https://example.org/program",
    opportunityTypes: ["scholarship"],
    typicalCycle: "annual",
  });
  await database.insert(editions).values({
    cycle: "annual",
    editionLabel: "2026",
    editionYear: 2026,
    id: EDITION_ID,
    identityKey: "2026:annual",
    programId: PROGRAM_ID,
    status: canonicalLifecycle,
  });
  await database.insert(applicationRounds).values({
    applicationUrl: canonicalApplicationUrl,
    audience: ["Students"],
    deadlineDate: "2026-12-31",
    deadlinePrecision: "date_only",
    deadlineType: "fixed",
    editionId: EDITION_ID,
    id: ROUND_ID,
    roundKey: "main:global",
    roundName: "main",
    status: canonicalLifecycle,
  });
  await database.insert(publicationVersions).values({
    compatibilityPayload: {},
    createdBy: "bf06-fixture",
    editorialState: "published",
    editionId: EDITION_ID,
    id: PUBLICATION_ID,
    payload: { public_projection: approvedProjection },
    supportingAssertionIds: [],
    version: 1,
  });

  if (pendingTitle) {
    const pendingProjection = makeProjection({
      applicationUrl: approvedApplicationUrl,
      lifecycle,
      linkStatus: approvedLinkStatus,
      publicationId: PENDING_PUBLICATION_ID,
      title: pendingTitle,
    });
    await database.insert(publicationVersions).values({
      compatibilityPayload: {},
      createdBy: "bf06-fixture",
      editorialState: "update_pending",
      editionId: EDITION_ID,
      id: PENDING_PUBLICATION_ID,
      payload: { public_projection: pendingProjection },
      supportingAssertionIds: [],
      supersedesVersionId: PUBLICATION_ID,
      version: 2,
    });
  }
};

const verificationResponse = (
  state: "available" | "broken" | "closed" | "unknown"
) => {
  if (state === "broken") {
    return {
      body: "Service unavailable",
      finalUrl: APPROVED_URL,
      headers: { "content-type": "text/html" },
      redirectChain: [],
      status: 503,
    };
  }
  if (state === "closed") {
    return {
      body: `
        <html>
          <h1>Program 2026</h1>
          <p>Applications are closed.</p>
          <form><button disabled type="submit">Apply</button></form>
        </html>
      `,
      finalUrl: APPROVED_URL,
      headers: { "content-type": "text/html" },
      redirectChain: [],
      status: 200,
    };
  }
  if (state === "unknown") {
    return {
      body: "<html><h1>Program information 2026</h1></html>",
      finalUrl: APPROVED_URL,
      headers: { "content-type": "text/html" },
      redirectChain: [],
      status: 200,
    };
  }
  return {
    body: `
      <html>
        <h1>Applications are open for 2026</h1>
        <form method="post">
          <input name="email" />
          <button type="submit">Apply now</button>
        </form>
      </html>
    `,
    finalUrl: APPROVED_URL,
    headers: { "content-type": "text/html" },
    redirectChain: [],
    status: 200,
  };
};

const verifyState = async (
  database: TestDatabase,
  state: "available" | "broken" | "closed" | "unknown",
  now = CHECKED_AT
) =>
  verifyApplicationLink(
    database as unknown as Parameters<typeof verifyApplicationLink>[0],
    ROUND_ID,
    "bf06-link-worker",
    {
      client: { get: async () => verificationResponse(state) },
      now,
      robotsChecker: async () => ({
        allowed: true,
        reason: "robots.txt allows this path",
      }),
    }
  );

const readPublic = async (database: TestDatabase) => {
  const page = await listPublicOpportunities(
    database as unknown as Parameters<typeof listPublicOpportunities>[0],
    publicOpportunityFilterV1Schema.parse({})
  );
  expect(page.items).toHaveLength(1);
  const record = page.items[0];
  if (!record) {
    throw new Error("BF-06 fixture was not projected publicly.");
  }
  return record;
};

const canApply = (record: unknown): unknown =>
  (record as { can_apply?: unknown }).can_apply;

const publicationState = async (client: PGlite) => {
  const result = await client.query<{
    editorial_state: string;
    title: string;
    version: number;
  }>(`
    SELECT
      version,
      editorial_state,
      payload->'public_projection'->>'title' AS title
    FROM publication_versions
    ORDER BY version
  `);
  return result.rows;
};

describe("BF-06 operational application availability", () => {
  it("keeps approved open publication unchanged while operational closure suppresses Apply", async () => {
    const { client, database } = await createDatabase();
    try {
      await seedPublishedOpportunity(database);
      const beforePublication = await publicationState(client);

      const assessment = await verifyState(database, "closed");
      const publicRecord = await readPublic(database);
      const afterPublication = await publicationState(client);
      const canonicalState = await client.query<{
        edition_status: string;
        round_status: string;
      }>(`
        SELECT
          (SELECT status::text FROM editions WHERE id = '${EDITION_ID}') AS edition_status,
          (SELECT status::text FROM application_rounds WHERE id = '${ROUND_ID}') AS round_status
      `);

      expect(assessment.status).toBe("closed");
      expect(afterPublication).toEqual(beforePublication);
      expect(canonicalState.rows[0]).toEqual({
        edition_status: "open",
        round_status: "open",
      });
      expect(publicRecord).toMatchObject({
        application_link_status: "closed",
        application_url: APPROVED_URL,
        lifecycle: "open",
        publication_version_id: PUBLICATION_ID,
      });
      expect(canApply(publicRecord)).toBe(false);
    } finally {
      await client.close();
    }
  });

  it("distinguishes operational broken from closed while suppressing Apply", async () => {
    const { client, database } = await createDatabase();
    try {
      await seedPublishedOpportunity(database);
      const beforePublication = await publicationState(client);

      const assessment = await verifyState(database, "broken");
      const publicRecord = await readPublic(database);

      expect(assessment.status).toBe("broken");
      expect(await publicationState(client)).toEqual(beforePublication);
      expect(publicRecord).toMatchObject({
        application_link_status: "broken",
        lifecycle: "open",
      });
      expect(canApply(publicRecord)).toBe(false);
    } finally {
      await client.close();
    }
  });

  it("keeps Apply available for approved open publication after a trustworthy available check", async () => {
    const { client, database } = await createDatabase();
    try {
      await seedPublishedOpportunity(database);
      const beforePublication = await publicationState(client);

      const assessment = await verifyState(database, "available");
      const publicRecord = await readPublic(database);

      expect(assessment.status).toBe("current_and_open");
      expect(await publicationState(client)).toEqual(beforePublication);
      expect(publicRecord.application_link_status).toBe("current_and_open");
      expect(canApply(publicRecord)).toBe(true);
    } finally {
      await client.close();
    }
  });

  it("keeps an unapproved pending editorial change private while operational closure restricts the approved publication", async () => {
    const { client, database } = await createDatabase();
    try {
      await seedPublishedOpportunity(database, {
        pendingTitle: "Pending editorial title",
        title: "Approved editorial title",
      });

      await verifyState(database, "closed");
      const publicRecord = await readPublic(database);
      const versions = await publicationState(client);

      expect(versions).toEqual([
        {
          editorial_state: "published",
          title: "Approved editorial title",
          version: 1,
        },
        {
          editorial_state: "update_pending",
          title: "Pending editorial title",
          version: 2,
        },
      ]);
      expect(publicRecord).toMatchObject({
        application_link_status: "closed",
        lifecycle: "open",
        title: "Approved editorial title",
      });
      expect(canApply(publicRecord)).toBe(false);
    } finally {
      await client.close();
    }
  });

  it("recovers Apply after closed becomes available again without a publication version", async () => {
    const { client, database } = await createDatabase();
    try {
      await seedPublishedOpportunity(database);
      const beforePublication = await publicationState(client);

      await verifyState(database, "closed", new Date("2026-09-15T18:00:00Z"));
      const closedRecord = await readPublic(database);
      expect(closedRecord.application_link_status).toBe("closed");
      expect(canApply(closedRecord)).toBe(false);

      await verifyState(
        database,
        "available",
        new Date("2026-09-15T19:00:00Z")
      );
      const recoveredRecord = await readPublic(database);

      expect(await publicationState(client)).toEqual(beforePublication);
      expect(recoveredRecord.application_link_status).toBe("current_and_open");
      expect(canApply(recoveredRecord)).toBe(true);
    } finally {
      await client.close();
    }
  });

  it("keeps a confirmed operational block through a later indeterminate check", async () => {
    const { client, database } = await createDatabase();
    try {
      await seedPublishedOpportunity(database);

      await verifyState(database, "closed", new Date("2026-09-15T18:00:00Z"));
      await verifyState(database, "unknown", new Date("2026-09-15T19:00:00Z"));
      const publicRecord = await readPublic(database);

      expect(publicRecord.application_link_status).toBe("unknown");
      expect(publicRecord.lifecycle).toBe("open");
      expect(canApply(publicRecord)).toBe(false);
    } finally {
      await client.close();
    }
  });

  it("keeps a confirmed broken block through a later indeterminate check", async () => {
    const { client, database } = await createDatabase();
    try {
      await seedPublishedOpportunity(database);

      await verifyState(database, "broken", new Date("2026-09-15T18:00:00Z"));
      await verifyState(database, "unknown", new Date("2026-09-15T19:00:00Z"));
      const publicRecord = await readPublic(database);

      expect(publicRecord.application_link_status).toBe("unknown");
      expect(publicRecord.lifecycle).toBe("open");
      expect(canApply(publicRecord)).toBe(false);
    } finally {
      await client.close();
    }
  });

  it("does not permanently punish never-run or unknown operational verification", async () => {
    const { client, database } = await createDatabase();
    try {
      await seedPublishedOpportunity(database, {
        approvedLinkStatus: "unchecked",
      });

      const neverRunRecord = await readPublic(database);
      expect(neverRunRecord.application_link_status).toBe("unchecked");
      expect(canApply(neverRunRecord)).toBe(true);

      const assessment = await verifyState(database, "unknown");
      const unknownRecord = await readPublic(database);

      expect(assessment.status).toBe("unknown");
      expect(unknownRecord.application_link_status).toBe("unknown");
      expect(unknownRecord.lifecycle).toBe("open");
      expect(canApply(unknownRecord)).toBe(true);
    } finally {
      await client.close();
    }
  });

  it("never lets operational availability override editorial closure", async () => {
    const { client, database } = await createDatabase();
    try {
      await seedPublishedOpportunity(database, { lifecycle: "closed" });

      await verifyState(database, "available");
      const publicRecord = await readPublic(database);

      expect(publicRecord).toMatchObject({
        application_link_status: "current_and_open",
        lifecycle: "closed",
      });
      expect(canApply(publicRecord)).toBe(false);
    } finally {
      await client.close();
    }
  });

  it("never manufactures an Apply URL from operational metadata", async () => {
    const { client, database } = await createDatabase();
    try {
      await seedPublishedOpportunity(database, {
        approvedApplicationUrl: null,
        canonicalApplicationUrl: OPERATIONAL_ONLY_URL,
      });

      await verifyState(database, "available");
      const publicRecord = await readPublic(database);

      expect(publicRecord.application_url).toBeNull();
      expect(canApply(publicRecord)).toBe(false);
    } finally {
      await client.close();
    }
  });

  it("does not let operational evidence for a pending URL contaminate the approved URL", async () => {
    const { client, database } = await createDatabase();
    try {
      await seedPublishedOpportunity(database, {
        approvedApplicationUrl: APPROVED_URL,
        canonicalApplicationUrl: OPERATIONAL_ONLY_URL,
      });

      const assessment = await verifyState(database, "closed");
      const publicRecord = await readPublic(database);

      expect(assessment.originalUrl).toBe(OPERATIONAL_ONLY_URL);
      expect(publicRecord.application_url).toBe(APPROVED_URL);
      expect(publicRecord.application_link_status).toBe("current_and_open");
      expect(canApply(publicRecord)).toBe(true);
    } finally {
      await client.close();
    }
  });

  it("never lets operational availability override a not-yet-open editorial lifecycle", async () => {
    const { client, database } = await createDatabase();
    try {
      await seedPublishedOpportunity(database, {
        lifecycle: "applications_not_open",
      });

      await verifyState(database, "available");
      const publicRecord = await readPublic(database);

      expect(publicRecord.lifecycle).toBe("applications_not_open");
      expect(canApply(publicRecord)).toBe(false);
    } finally {
      await client.close();
    }
  });

  it("does not reconstruct an approved publication from mutable canonical state", async () => {
    const { client, database } = await createDatabase();
    try {
      await seedPublishedOpportunity(database);
      const legacyCompatibility = {
        application_deadline: "2026-12-31",
        application_url: APPROVED_URL,
        canonical_url: "https://example.org/program/2026",
        categories: ["scholarship"],
        cost: null,
        currency: null,
        description: "Approved compatibility payload.",
        eligibility: ["high_school"],
        end_date: null,
        extracted_at: "2026-09-01T12:00:00Z",
        field_evidence: {},
        image_url: null,
        is_free: true,
        location: "Lisboa, Portugal",
        modality: "in_person",
        organizer: "Example Foundation",
        overall_confidence: 1,
        raw_metadata: {},
        review_reasons: [],
        review_state: "ready",
        source_content_sha256: "a".repeat(64),
        source_published_at: null,
        source_url: "https://example.org/program/2026",
        start_date: null,
        status: "active",
        title: "Approved BF-06 opportunity",
        warnings: [],
      };

      await client.exec(`
        INSERT INTO eligibility_profiles (
          edition_id,
          brazil_status,
          citizenship_scope,
          residence_scope,
          education_levels
        ) VALUES (
          '${EDITION_ID}',
          'eligible',
          'open',
          'open',
          ARRAY['high_school']::text[]
        );
        INSERT INTO product_fit_assessments (
          edition_id,
          decision,
          site_collection,
          mapped_opportunity_types,
          mapped_education_levels
        ) VALUES (
          '${EDITION_ID}',
          'include',
          'international',
          ARRAY['scholarship']::text[],
          ARRAY['high_school']::text[]
        );
        UPDATE application_rounds
        SET application_url = '${OPERATIONAL_ONLY_URL}'
        WHERE id = '${ROUND_ID}';
        UPDATE publication_versions
        SET
          payload = '{}'::jsonb,
          compatibility_payload = '${JSON.stringify(legacyCompatibility)}'::jsonb
        WHERE id = '${PUBLICATION_ID}';
      `);

      const publicPage = await listPublicOpportunities(
        database as unknown as Parameters<typeof listPublicOpportunities>[0],
        publicOpportunityFilterV1Schema.parse({})
      );

      expect(publicPage.items).toEqual([]);
    } finally {
      await client.close();
    }
  });
});
