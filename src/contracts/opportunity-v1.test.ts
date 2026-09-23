import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, it } from "vitest";
import { schema } from "@/db/schema";
import {
  IdempotencyConflictError,
  persistIngestion,
} from "@/server/ingestion/persist-ingestion";
import { verifyApplicationLink } from "@/server/link-verification/application-link-verifier";
import {
  claimRecrawlJobs,
  completeRecrawlJob,
  requestEditionRecrawl,
  scheduleDueRecrawls,
} from "@/server/maintenance/recrawl-scheduler";
import { listPublicOpportunities } from "@/server/publication/list-public-opportunities";
import {
  decidePublication,
  deliverPendingOutbox,
} from "@/server/publication/publication-workflow";
import { getReviewQueue } from "@/server/review/review-queue";
import { submitReviewerCorrection } from "@/server/review/reviewer-corrections";
import {
  ageRuleSchema,
  ingestionRequestV1Schema,
  publicationDecisionRequestV1Schema,
  publicOpportunityFilterV1Schema,
  publicOpportunityV1Schema,
  reviewerCorrectionRequestV1Schema,
} from "./opportunity-v1";

const SOURCE_ID = "00000000-0000-4000-8000-000000000001";
const DOCUMENT_ID = "00000000-0000-4000-8000-000000000002";
const SNAPSHOT_ID = "00000000-0000-4000-8000-000000000003";
const EXTRACTION_RUN_ID = "00000000-0000-4000-8000-000000000004";
const PROGRAM_ID = "00000000-0000-4000-8000-000000000005";
const EDITION_ID = "00000000-0000-4000-8000-000000000006";
const ROUND_ID = "00000000-0000-4000-8000-000000000007";
const ASSERTION_ID = "00000000-0000-4000-8000-000000000008";
const PUBLICATION_VERSION_ID = "00000000-0000-4000-8000-000000000009";
const RECRAWL_SNAPSHOT_ID = "00000000-0000-4000-8000-000000000011";
const RECRAWL_EXTRACTION_RUN_ID = "00000000-0000-4000-8000-000000000012";
const RECRAWL_ASSERTION_ID = "00000000-0000-4000-8000-000000000013";
const RECRAWL_PUBLICATION_VERSION_ID = "00000000-0000-4000-8000-000000000014";
const RECRAWL_PROGRAM_ID = "00000000-0000-4000-8000-000000000019";
const RECRAWL_EDITION_ID = "00000000-0000-4000-8000-000000000020";
const RECRAWL_ROUND_ID = "00000000-0000-4000-8000-000000000021";
const NOW = "2026-07-23T18:00:00Z";
const CONTENT_HASH = "a".repeat(64);

const semanticGateImpact = (
  state: string | undefined,
  criticality: string | undefined
): "block" | "none" | "review" => {
  if (state !== "pending_verification") {
    return "none";
  }
  return criticality === "critical" ? "block" : "review";
};

const semanticField = (
  fieldName: string,
  value: unknown,
  options: {
    criticality?: "conditional" | "critical" | "noncritical";
    state?:
      | "explicit_value"
      | "not_applicable"
      | "not_stated"
      | "pending_verification";
    supportingAssertionIds?: string[];
  } = {}
) => ({
  field_name: fieldName,
  state: options.state ?? "explicit_value",
  value,
  applicability:
    options.state === "not_applicable" ? "not_applicable" : "required",
  applicability_reason_code:
    options.state === "not_applicable"
      ? "fixture_not_applicable"
      : "fixture_required",
  criticality: options.criticality ?? "critical",
  display_key: `${fieldName}.${options.state ?? "explicit_value"}`,
  display_parameters: {},
  public_explanation: `${fieldName} was resolved from fixture evidence.`,
  reason_code: `fixture_${options.state ?? "explicit_value"}`,
  supporting_assertion_ids: options.supportingAssertionIds ?? [],
  alternative_assertion_ids: [],
  conflicting_assertion_ids: [],
  source_coverage: {
    state: "sufficient",
    checked_source_roles: ["opportunity_detail"],
    unchecked_source_roles: [],
    failure_codes: [],
    authoritative_sources_checked: 1,
    unprocessed_official_documents: false,
    last_checked_at: NOW,
  },
  gate_impact: semanticGateImpact(options.state, options.criticality),
  resolved_at: NOW,
  last_verified_at: NOW,
});

const makeValidRequest = () => ({
  contract_version: "1.0",
  idempotency_key: "fixture-ingestion-0001",
  source_cohort: "official_fixture",
  snapshot: {
    id: SNAPSHOT_ID,
    source_document_id: DOCUMENT_ID,
    url: "https://example.org/program/2026",
    final_url: "https://example.org/program/2026",
    fetched_at: NOW,
    status_code: 200,
    content_type: "text/html",
    headers: {},
    html: "<html><h1>Programa 2026</h1></html>",
    content_sha256: CONTENT_HASH,
    semantic_sha256: CONTENT_HASH,
    storage_key: null,
    redirect_chain: [],
    extractor_version: "1.0.0",
    render_mode: "http",
    elapsed_ms: 120,
  },
  ingestion: {
    source: {
      id: SOURCE_ID,
      organization_id: null,
      name: "Fonte oficial",
      base_url: "https://example.org/",
      source_type: "website",
      authority_tier: 90,
      language: "pt-BR",
      allowed_paths: ["/program/*"],
      blocked_paths: [],
      discovery_methods: ["sitemap"],
      crawl_interval_hours: 24,
      rate_limit_per_minute: 10,
      concurrency_limit: 2,
      rendering_policy: "fallback",
      adapter_name: null,
      adapter_version: null,
      expected_cycles: ["annual"],
      review_owner: null,
      enabled: true,
    },
    source_document: {
      id: DOCUMENT_ID,
      source_id: SOURCE_ID,
      url: "https://example.org/program/2026",
      canonical_url: "https://example.org/program/2026",
      document_role: "opportunity_detail",
      content_type: "text/html",
      first_seen_at: NOW,
      last_seen_at: NOW,
      last_changed_at: NOW,
      state: "parsed",
      program_hint: null,
      edition_hint: "2026",
    },
    snapshot_id: SNAPSHOT_ID,
    extraction_run: {
      id: EXTRACTION_RUN_ID,
      snapshot_id: SNAPSHOT_ID,
      pipeline_version: "1.0.0",
      started_at: NOW,
      completed_at: NOW,
      page_role: "opportunity_detail",
      status: "succeeded",
      error_type: null,
      duration_ms: 100,
      assertion_count: 1,
    },
    assertions: [
      {
        id: ASSERTION_ID,
        extraction_run_id: EXTRACTION_RUN_ID,
        snapshot_id: SNAPSHOT_ID,
        source_document_id: DOCUMENT_ID,
        field_name: "title",
        normalized_value: "Programa 2026",
        raw_value: "Programa 2026",
        evidence_text: "Programa 2026",
        evidence_locator: "h1",
        extractor: "dom",
        source_authority: 90,
        document_role: "opportunity_detail",
        asserted_at: NOW,
        valid_from: null,
        valid_until: null,
        edition_signal: "2026",
        validation_status: "valid",
        critical: true,
        supersedes_assertion_id: null,
      },
    ],
    resolved_fields: {
      title: {
        field_name: "title",
        value: "Programa 2026",
        selected_assertion_ids: [ASSERTION_ID],
        alternative_assertion_ids: [],
        conflict: false,
        resolution_reason: "Official title assertion",
        selected_authority: 90,
      },
    },
    semantic_fields: {
      title: semanticField("title", "Programa 2026", {
        supportingAssertionIds: [ASSERTION_ID],
      }),
      description: semanticField(
        "description",
        "Programa para estudantes brasileiros."
      ),
      current_edition: semanticField("current_edition", {
        edition_label: "2026",
        edition_year: 2026,
      }),
      lifecycle_status: semanticField("lifecycle_status", "open"),
      application_round: semanticField("application_round", "main"),
      application_deadline: semanticField(
        "application_deadline",
        "2026-08-31T23:59:59Z"
      ),
      deadline_type: semanticField("deadline_type", "fixed"),
      application_url: semanticField(
        "application_url",
        "https://example.org/apply/2026"
      ),
      official_information_url: semanticField(
        "official_information_url",
        "https://example.org/program/2026"
      ),
      source_authority: semanticField("source_authority", "official_program"),
      brazilian_eligibility: semanticField("brazilian_eligibility", "eligible"),
      age: semanticField("age", null, {
        criticality: "conditional",
        state: "pending_verification",
      }),
      modality: semanticField("modality", "in_person", {
        criticality: "conditional",
      }),
      country: semanticField("country", "Portugal", {
        criticality: "conditional",
      }),
      organizer: semanticField("organizer", null, {
        criticality: "conditional",
        state: "not_stated",
      }),
      image: semanticField("image", "https://example.org/program.jpg", {
        criticality: "noncritical",
      }),
      program_cost: semanticField("program_cost", "0", {
        criticality: "conditional",
      }),
      is_free: semanticField("is_free", true, {
        criticality: "conditional",
      }),
    },
    organization: null,
    program: {
      id: PROGRAM_ID,
      canonical_name: "Programa",
      aliases: [],
      organizer_id: null,
      opportunity_types: ["scholarship"],
      subject_areas: [],
      typical_cycle: "annual",
      official_homepage: "https://example.org/program",
      active: true,
    },
    edition: {
      id: EDITION_ID,
      program_id: PROGRAM_ID,
      edition_label: "2026",
      edition_year: 2026,
      cycle: "annual",
      start_date: "2026-10-10",
      end_date: "2026-10-20",
      status: "open",
      first_seen_at: NOW,
      last_verified_at: NOW,
    },
    application_round: {
      id: ROUND_ID,
      edition_id: EDITION_ID,
      round_name: "main",
      opens_at: "2026-07-01T00:00:00Z",
      deadline: "2026-08-31T23:59:59Z",
      deadline_type: "fixed",
      application_url: "https://example.org/apply/2026",
      status: "open",
      region: null,
      audience: ["Estudantes brasileiros"],
      supersedes_round_id: null,
    },
    eligibility_profile: {
      brazil_status: "eligible",
      citizenship_scope: "brazil_explicitly_accepted",
      residence_scope: "not_stated",
      included_nationalities: ["Brasil"],
      excluded_nationalities: [],
      eligible_regions: [],
      residence_regions: [],
      school_location_requirements: [],
      education_levels: ["high_school"],
      grade_requirements: [],
      age_rules: [],
      institutional_restrictions: ["open_application"],
      language_requirements: [],
      other_requirements: [],
      source_assertion_ids: [ASSERTION_ID],
      conflicting_assertion_ids: [],
      unknowns: [],
    },
    application_link: {
      status: "verified_current",
      original_url: "https://example.org/apply/2026",
      final_url: "https://example.org/apply/2026",
      http_status: 200,
      document_role: "application_form",
      edition_year: 2026,
      accepts_submissions: true,
      checked_at: NOW,
      reasons: ["Current edition and form accepts submissions"],
    },
    site_contract: {
      collection: "international",
      mapped_opportunity_types: ["scholarship"],
      mapped_education_levels: ["high_school"],
      unmapped_values: [],
      compatible: true,
      reasons: [],
    },
    fit_assessment: {
      decision: "clearly_relevant",
      reasons: ["brazil_explicitly_accepted"],
      explanations: ["Brazilian applicants are explicitly eligible"],
      evidence_assertion_ids: [ASSERTION_ID],
    },
    publication_gate: {
      outcome: "auto_ready",
      reasons: ["brazil_explicitly_accepted"],
      blocking_fields: [],
      explanations: ["Scraper-side candidate outcome"],
    },
    review_tasks: [],
    publication_version: {
      id: PUBLICATION_VERSION_ID,
      edition_id: EDITION_ID,
      version: 1,
      editorial_state: "draft",
      payload: {},
      supporting_assertion_ids: [ASSERTION_ID],
      created_at: NOW,
      created_by: "pipeline",
      supersedes_version_id: null,
    },
    compatibility_draft: {
      title: "Programa 2026",
      description: "Programa para estudantes brasileiros.",
      organizer: null,
      eligibility: ["Estudantes brasileiros"],
      location: "Lisboa, Portugal",
      modality: "in_person",
      start_date: "2026-10-10",
      end_date: "2026-10-20",
      application_deadline: "2026-08-31",
      categories: ["scholarship"],
      cost: "0",
      currency: "BRL",
      is_free: true,
      image_url: "https://example.org/program.jpg",
      application_url: "https://example.org/apply/2026",
      source_url: "https://example.org/program/2026",
      canonical_url: "https://example.org/program/2026",
      source_published_at: null,
      extracted_at: NOW,
      source_content_sha256: CONTENT_HASH,
      status: "active",
      field_evidence: {},
      overall_confidence: 0.9,
      review_state: "ready",
      review_reasons: [],
      warnings: [],
      raw_metadata: {},
    },
  },
});

const fixtureUuid = (value: number): string =>
  `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;

const createPersistenceTestDatabase = async () => {
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
    "../db/migrations/20260723224642_fixed_mantis/migration.sql",
    "../db/migrations/20260723225823_add_audit_events/migration.sql",
    "../db/migrations/20260723233636_lifecycle_maintenance/migration.sql",
    "../db/migrations/20260725213000_semantic_field_states/migration.sql",
    "../db/migrations/20260916080000_bf08_recrawl_lease_fencing/migration.sql",
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

const registerSource = async (
  client: PGlite,
  enabled: boolean
): Promise<void> => {
  await client.query(
    `
      INSERT INTO sources (
        id, name, base_url, source_type, authority_tier, language,
        crawl_interval_hours, rate_limit_per_minute, concurrency_limit,
        rendering_policy, enabled
      ) VALUES ($1, 'Fonte oficial', 'https://example.org/', 'website', 90,
        'pt-BR', 24, 10, 2, 'fallback', $2)
    `,
    [SOURCE_ID, enabled]
  );
};

const makeObservationRequest = ({
  applicationUrl = "https://example.org/apply/2026",
  contentHash,
  deadline = "2026-08-31T23:59:59Z",
  extractorVersion = "1.0.0",
  fetchedAt,
  idempotencyKey,
  pipelineVersion = extractorVersion,
  semanticHash = contentHash,
  sequence,
}: {
  applicationUrl?: string;
  contentHash: string;
  deadline?: string;
  extractorVersion?: string;
  fetchedAt: string;
  idempotencyKey: string;
  pipelineVersion?: string;
  semanticHash?: string;
  sequence: number;
}) => {
  const request = structuredClone(makeValidRequest());
  const snapshotId = fixtureUuid(100 + sequence * 4);
  const extractionRunId = fixtureUuid(101 + sequence * 4);
  const assertionId = fixtureUuid(102 + sequence * 4);
  const publicationVersionId = fixtureUuid(103 + sequence * 4);

  request.idempotency_key = idempotencyKey;
  request.snapshot = {
    ...request.snapshot,
    content_sha256: contentHash,
    extractor_version: extractorVersion,
    fetched_at: fetchedAt,
    id: snapshotId,
    semantic_sha256: semanticHash,
  };
  request.ingestion.snapshot_id = snapshotId;
  request.ingestion.source_document = {
    ...request.ingestion.source_document,
    last_changed_at: fetchedAt,
    last_seen_at: fetchedAt,
  };
  request.ingestion.extraction_run = {
    ...request.ingestion.extraction_run,
    completed_at: fetchedAt,
    id: extractionRunId,
    pipeline_version: pipelineVersion,
    snapshot_id: snapshotId,
    started_at: fetchedAt,
  };
  request.ingestion.assertions = [
    {
      ...request.ingestion.assertions[0],
      asserted_at: fetchedAt,
      extraction_run_id: extractionRunId,
      id: assertionId,
      snapshot_id: snapshotId,
    },
  ];
  request.ingestion.resolved_fields.title.selected_assertion_ids = [
    assertionId,
  ];
  request.ingestion.semantic_fields.title = {
    ...request.ingestion.semantic_fields.title,
    last_verified_at: fetchedAt,
    resolved_at: fetchedAt,
    supporting_assertion_ids: [assertionId],
  };
  request.ingestion.semantic_fields.application_url = {
    ...request.ingestion.semantic_fields.application_url,
    last_verified_at: fetchedAt,
    resolved_at: fetchedAt,
    value: applicationUrl,
  };
  request.ingestion.semantic_fields.application_deadline = {
    ...request.ingestion.semantic_fields.application_deadline,
    last_verified_at: fetchedAt,
    resolved_at: fetchedAt,
    value: deadline,
  };
  request.ingestion.edition.last_verified_at = fetchedAt;
  request.ingestion.application_round = {
    ...request.ingestion.application_round,
    application_url: applicationUrl,
    deadline,
  };
  request.ingestion.eligibility_profile.source_assertion_ids = [assertionId];
  request.ingestion.application_link = {
    ...request.ingestion.application_link,
    checked_at: fetchedAt,
    final_url: applicationUrl,
    original_url: applicationUrl,
  };
  request.ingestion.fit_assessment.evidence_assertion_ids = [assertionId];
  request.ingestion.publication_version = {
    ...request.ingestion.publication_version,
    created_at: fetchedAt,
    id: publicationVersionId,
    supporting_assertion_ids: [assertionId],
  };
  request.ingestion.compatibility_draft = {
    ...request.ingestion.compatibility_draft,
    application_deadline: deadline.slice(0, 10),
    application_url: applicationUrl,
    extracted_at: fetchedAt,
    source_content_sha256: contentHash,
  };

  return ingestionRequestV1Schema.parse(request);
};

const makeIdentityObservationRequest = ({
  audience,
  contentHash,
  cycle = "annual",
  deadline,
  editionId = EDITION_ID,
  editionLabel,
  editionYear = 2026,
  endDate,
  fetchedAt,
  idempotencyKey,
  roundId = ROUND_ID,
  roundName = "main",
  region = null,
  sequence,
  startDate,
}: {
  audience?: string[];
  contentHash: string;
  cycle?: string | null;
  deadline?: string;
  editionId?: string;
  editionLabel?: string;
  editionYear?: number | null;
  endDate?: string | null;
  fetchedAt: string;
  idempotencyKey: string;
  roundId?: string;
  roundName?: string;
  region?: string | null;
  sequence: number;
  startDate?: string | null;
}) => {
  const effectiveLabel =
    editionLabel ??
    (editionYear === null ? "Current edition" : String(editionYear));
  const effectiveDeadline =
    deadline ?? `${editionYear ?? 2026}-08-31T23:59:59Z`;
  const request = structuredClone(
    makeObservationRequest({
      contentHash,
      deadline: effectiveDeadline,
      fetchedAt,
      idempotencyKey,
      sequence,
    })
  );

  request.ingestion.edition = {
    ...request.ingestion.edition,
    cycle,
    edition_label: effectiveLabel,
    edition_year: editionYear,
    end_date:
      endDate === undefined ? request.ingestion.edition.end_date : endDate,
    id: editionId,
    start_date:
      startDate === undefined
        ? request.ingestion.edition.start_date
        : startDate,
  };
  request.ingestion.application_round = {
    ...request.ingestion.application_round,
    audience: audience ?? request.ingestion.application_round.audience,
    edition_id: editionId,
    id: roundId,
    region,
    round_name: roundName,
  };
  request.ingestion.publication_version = {
    ...request.ingestion.publication_version,
    edition_id: editionId,
  };
  request.ingestion.semantic_fields.current_edition = {
    ...request.ingestion.semantic_fields.current_edition,
    value: { edition_label: effectiveLabel, edition_year: editionYear },
  };
  request.ingestion.semantic_fields.application_round = {
    ...request.ingestion.semantic_fields.application_round,
    value: roundName,
  };
  request.ingestion.application_link = {
    ...request.ingestion.application_link,
    edition_year: editionYear,
  };
  request.ingestion.source_document = {
    ...request.ingestion.source_document,
    edition_hint: effectiveLabel,
  };

  return ingestionRequestV1Schema.parse(request);
};

describe("opportunity ingestion contract v1", () => {
  it("rejects the offline editorial import marker in untrusted ingestion payloads", () => {
    const request = makeValidRequest();
    Object.assign(request.ingestion.publication_version.payload, {
      curated_master: {},
    });
    expect(ingestionRequestV1Schema.safeParse(request).success).toBe(false);
  });
  it("accepts a consistent scraper result", () => {
    expect(ingestionRequestV1Schema.safeParse(makeValidRequest()).success).toBe(
      true
    );
  });

  it("accepts BF-07 producer deadline precision", () => {
    const request = makeValidRequest();
    Object.assign(request.ingestion.application_round, {
      deadline_precision: "exact",
    });

    const result = ingestionRequestV1Schema.safeParse(request);

    expect(result.success).toBe(true);
  });

  it("accepts only gate-consistent terminal ingestion states", () => {
    for (const [editorialState, gateOutcome] of [
      ["rejected", "reject"],
      ["archived", "expired_archive"],
    ] as const) {
      const request = makeValidRequest();
      request.ingestion.publication_version.editorial_state = editorialState;
      request.ingestion.publication_gate.outcome = gateOutcome;
      expect(ingestionRequestV1Schema.safeParse(request).success).toBe(true);
    }

    const mismatch = makeValidRequest();
    mismatch.ingestion.publication_version.editorial_state = "rejected";
    mismatch.ingestion.publication_gate.outcome = "auto_ready";
    expect(ingestionRequestV1Schema.safeParse(mismatch).success).toBe(false);
  });

  it("rejects unknown nested fields", () => {
    const request = makeValidRequest();
    Object.assign(request.ingestion.source, { invented_default: true });

    const result = ingestionRequestV1Schema.safeParse(request);

    expect(result.success).toBe(false);
  });

  it("rejects mismatched evidence relationships", () => {
    const request = makeValidRequest();
    request.ingestion.assertions[0].snapshot_id =
      "00000000-0000-4000-8000-000000000099";

    const result = ingestionRequestV1Schema.safeParse(request);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.message.includes("supplied snapshot")
        )
      ).toBe(true);
    }
  });

  it("prevents ingestion from bypassing editorial approval", () => {
    const request = makeValidRequest();
    request.ingestion.publication_version.editorial_state = "published";

    const result = ingestionRequestV1Schema.safeParse(request);

    expect(result.success).toBe(false);
  }, 30_000);
});

describe("structured rules", () => {
  it("rejects contradictory age ranges", () => {
    const result = ageRuleSchema.safeParse({
      minimum_age: 19,
      maximum_age: 15,
      minimum_inclusive: true,
      maximum_inclusive: true,
      exact_age: null,
      birthdate_start: null,
      birthdate_end: null,
      birthdate_start_inclusive: true,
      birthdate_end_inclusive: true,
      reference_type: "application_deadline",
      reference_date: "2026-08-31",
      source_text: "De 19 a 15 anos",
      source_assertion_ids: [ASSERTION_ID],
    });

    expect(result.success).toBe(false);
  });

  it("keeps unknown modality explicit in public records", () => {
    const result = publicOpportunityV1Schema.safeParse({
      id: EDITION_ID,
      publication_version_id: PUBLICATION_VERSION_ID,
      collection: "national",
      title: "Programa",
      description: "",
      organizer: null,
      opportunity_types: ["olympiad"],
      education_levels: ["high_school"],
      modality: "unknown",
      brazil_eligibility: "eligible",
      age_rules: [],
      location: null,
      start_date: null,
      end_date: null,
      application_deadline_date: "2026-08-31",
      application_deadline_time: null,
      application_deadline_timezone: null,
      deadline_precision: "date_only",
      lifecycle: "open",
      official_information_url: "https://example.org/program",
      application_url: "https://example.org/apply",
      application_link_status: "current_and_open",
      image_url: null,
      is_free: null,
      cost_amount: null,
      currency: null,
      last_verified_at: NOW,
      semantic_fields: {},
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modality).toBe("unknown");
      expect(result.data.application_deadline_date).toBe("2026-08-31");
    }
  });

  it("rejects inverted public deadline filters", () => {
    expect(
      publicOpportunityFilterV1Schema.safeParse({
        deadline_from: "2026-09-01",
        deadline_to: "2026-08-31",
      }).success
    ).toBe(false);
  });
});

describe("transactional ingestion persistence", () => {
  it("rejects ingestion when the server has disabled the source", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      await registerSource(client, false);
      const request = ingestionRequestV1Schema.parse(makeValidRequest());

      await expect(
        persistIngestion(
          database as unknown as Parameters<typeof persistIngestion>[0],
          request
        )
      ).rejects.toMatchObject({ name: "SourceDisabledError" });

      const state = await client.query<{
        enabled: boolean;
        snapshots: number;
      }>(`
        SELECT
          enabled,
          (SELECT count(*)::int FROM snapshots) AS snapshots
        FROM sources
        WHERE id = '${SOURCE_ID}'
      `);
      expect(state.rows[0]).toEqual({ enabled: false, snapshots: 0 });
    } finally {
      await client.close();
    }
  });

  it("keeps server enablement authoritative over a stale disabled payload", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      await registerSource(client, true);
      const rawRequest = makeValidRequest();
      rawRequest.ingestion.source.enabled = false;
      const request = ingestionRequestV1Schema.parse(rawRequest);

      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        request
      );

      const state = await client.query<{ enabled: boolean }>(`
        SELECT enabled FROM sources WHERE id = '${SOURCE_ID}'
      `);
      expect(state.rows[0]).toEqual({ enabled: true });
    } finally {
      await client.close();
    }
  });

  it("BF-07 preserves exact producer deadline precision", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const request = makeValidRequest();
      Object.assign(request.ingestion.application_round, {
        deadline: "2026-08-31T18:45:30-03:00",
        deadline_precision: "exact",
      });
      const parsed = ingestionRequestV1Schema.parse(request);

      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        parsed
      );
      const rows = await client.query<{
        deadline_date: string;
        deadline_precision: string;
        deadline_time: string;
        deadline_timezone: string;
      }>(`
        SELECT
          deadline_date::text,
          deadline_precision,
          deadline_time::text,
          deadline_timezone
        FROM application_rounds
        WHERE id = '${ROUND_ID}'
      `);

      expect(rows.rows[0]).toEqual({
        deadline_date: "2026-08-31",
        deadline_precision: "instant",
        deadline_time: "18:45:30",
        deadline_timezone: "-03:00",
      });
    } finally {
      await client.close();
    }
  });

  it("persists once, replays safely, and fails closed", async () => {
    const client = new PGlite();
    try {
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
      const migration = readFileSync(
        new URL(
          "../db/migrations/20260723224642_fixed_mantis/migration.sql",
          import.meta.url
        ),
        "utf8"
      );
      await client.exec(migration);
      const auditMigration = readFileSync(
        new URL(
          "../db/migrations/20260723225823_add_audit_events/migration.sql",
          import.meta.url
        ),
        "utf8"
      );
      await client.exec(auditMigration);
      const lifecycleMigration = readFileSync(
        new URL(
          "../db/migrations/20260723233636_lifecycle_maintenance/migration.sql",
          import.meta.url
        ),
        "utf8"
      );
      await client.exec(lifecycleMigration);
      const semanticFieldMigration = readFileSync(
        new URL(
          "../db/migrations/20260725213000_semantic_field_states/migration.sql",
          import.meta.url
        ),
        "utf8"
      );
      await client.exec(semanticFieldMigration);
      const bf08Migration = readFileSync(
        new URL(
          "../db/migrations/20260916080000_bf08_recrawl_lease_fencing/migration.sql",
          import.meta.url
        ),
        "utf8"
      );
      await client.exec(bf08Migration);

      const database = drizzle({
        casing: "snake_case",
        client,
        schema,
      });
      const request = ingestionRequestV1Schema.parse(makeValidRequest());
      const first = await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        request
      );
      const replay = await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        request
      );
      const counts = await client.query<{
        assertions: number;
        outbox_events: number;
        publication_versions: number;
        snapshots: number;
      }>(`
        SELECT
          (SELECT count(*)::int FROM field_assertions) AS assertions,
          (SELECT count(*)::int FROM outbox_events) AS outbox_events,
          (SELECT count(*)::int FROM publication_versions) AS publication_versions,
          (SELECT count(*)::int FROM snapshots) AS snapshots
      `);

      expect(first).toMatchObject({
        editorial_state: "needs_review",
        gate_outcome: "manual_review",
        replayed: false,
      });
      expect(replay).toMatchObject({
        editorial_state: "needs_review",
        gate_outcome: "manual_review",
        replayed: true,
      });
      expect(counts.rows[0]).toEqual({
        assertions: 1,
        outbox_events: 0,
        publication_versions: 1,
        snapshots: 1,
      });
      const reviewQueue = await getReviewQueue(
        database as unknown as Parameters<typeof getReviewQueue>[0]
      );
      expect(reviewQueue).toHaveLength(1);
      expect(reviewQueue[0]).toMatchObject({
        current_gate: {
          outcome: "manual_review",
          source_cohort_measured: false,
        },
        title: "Programa 2026",
      });

      const conflictingRequest = ingestionRequestV1Schema.parse({
        ...makeValidRequest(),
        source_cohort: "different_cohort",
      });
      await expect(
        persistIngestion(
          database as unknown as Parameters<typeof persistIngestion>[0],
          conflictingRequest
        )
      ).rejects.toBeInstanceOf(IdempotencyConflictError);

      const reviewerId = "00000000-0000-4000-8000-000000000010";
      await client.query(
        "INSERT INTO users (id, name, email) VALUES ($1, 'Reviewer', 'reviewer@example.org')",
        [reviewerId]
      );
      await client.query(
        `
          UPDATE field_semantic_states
          SET semantic_state = 'pending_verification', gate_impact = 'block'
          WHERE publication_version_id = $1 AND field_name = 'title'
        `,
        [PUBLICATION_VERSION_ID]
      );
      await expect(
        decidePublication(
          database as unknown as Parameters<typeof decidePublication>[0],
          EDITION_ID,
          reviewerId,
          publicationDecisionRequestV1Schema.parse({
            action: "approve",
            contract_version: "1.0",
            expected_publication_version: 1,
            idempotency_key: "fixture-blocked-approval-0001",
            reason: "Attempted before resolving the semantic blocker.",
          })
        )
      ).rejects.toMatchObject({
        code: "SEMANTIC_FIELDS_BLOCK_APPROVAL",
      });
      await client.query(
        `
          UPDATE field_semantic_states
          SET semantic_state = 'explicit_value', gate_impact = 'none'
          WHERE publication_version_id = $1 AND field_name = 'title'
        `,
        [PUBLICATION_VERSION_ID]
      );
      const correctionRequest = reviewerCorrectionRequestV1Schema.parse({
        contract_version: "1.0",
        idempotency_key: "fixture-correction-0001",
        review_task_id: null,
        edition_id: EDITION_ID,
        field_name: "title",
        corrected_value: "Programa científico 2026",
        correction_reason: "Title corrected against the official heading.",
        evidence_text: "Programa científico 2026",
        evidence_locator: "h1",
        source_document_id: DOCUMENT_ID,
        previous_publication_version_id: PUBLICATION_VERSION_ID,
      });
      const correction = await submitReviewerCorrection(
        database as unknown as Parameters<typeof submitReviewerCorrection>[0],
        reviewerId,
        correctionRequest
      );
      expect(correction).toMatchObject({
        publication_version: 2,
        replayed: false,
      });

      const decisionRequest = publicationDecisionRequestV1Schema.parse({
        contract_version: "1.0",
        idempotency_key: "fixture-approval-0001",
        action: "approve",
        reason: "Evidence and official application link verified.",
        expected_publication_version: 2,
      });
      const decision = await decidePublication(
        database as unknown as Parameters<typeof decidePublication>[0],
        EDITION_ID,
        reviewerId,
        decisionRequest
      );
      const reviewQueueAfterApproval = await getReviewQueue(
        database as unknown as Parameters<typeof getReviewQueue>[0]
      );
      const beforeDelivery = await client.query<{
        outbox_events: number;
        public_rows: number;
      }>(`
        SELECT
          (SELECT count(*)::int FROM outbox_events WHERE published_at IS NULL) AS outbox_events,
          (SELECT count(*)::int FROM opportunities) AS public_rows
      `);
      const delivery = await deliverPendingOutbox(
        database as unknown as Parameters<typeof deliverPendingOutbox>[0],
        "test-worker"
      );
      const publicRows = await client.query<{
        application_url: string;
        editorial_state: string;
        name: string;
        official_information_url: string;
        publication_version_id: string;
      }>(
        `
          SELECT
            o.application_url,
            o.name,
            o.official_information_url,
            o.publication_version_id,
            pv.editorial_state
          FROM opportunities o
          JOIN publication_versions pv ON pv.id = o.publication_version_id
          WHERE o.id = $1
        `,
        [EDITION_ID]
      );
      const structuredPage = await listPublicOpportunities(
        database as unknown as Parameters<typeof listPublicOpportunities>[0],
        publicOpportunityFilterV1Schema.parse({
          collection: "international",
        })
      );

      expect(decision).toMatchObject({
        action: "approve",
        editorial_state: "approved",
        replayed: false,
      });
      expect(reviewQueueAfterApproval).toEqual([]);
      expect(beforeDelivery.rows[0]).toEqual({
        outbox_events: 1,
        public_rows: 0,
      });
      expect(delivery).toEqual({
        dead_lettered: 0,
        delivered: 1,
        failed: 0,
      });
      expect(publicRows.rows).toEqual([
        {
          application_url: "https://example.org/apply/2026",
          editorial_state: "published",
          name: "Programa científico 2026",
          official_information_url: "https://example.org/program/2026",
          publication_version_id: correction.publication_version_id,
        },
      ]);
      expect(structuredPage.items).toHaveLength(1);
      expect(structuredPage.items[0]).toMatchObject({
        application_deadline_date: "2026-08-31",
        collection: "international",
        deadline_precision: "date_only",
        modality: "in_person",
        title: "Programa científico 2026",
      });

      const recrawlRequestRaw = structuredClone(makeValidRequest());
      recrawlRequestRaw.idempotency_key = "fixture-ingestion-recrawl-0001";
      recrawlRequestRaw.snapshot = {
        ...recrawlRequestRaw.snapshot,
        content_sha256: "b".repeat(64),
        fetched_at: "2026-08-27T12:00:00Z",
        html: "<html><h1>Programa científico 2026</h1><p>Prazo: 15/09/2026</p></html>",
        id: RECRAWL_SNAPSHOT_ID,
        semantic_sha256: "b".repeat(64),
      };
      recrawlRequestRaw.ingestion.snapshot_id = RECRAWL_SNAPSHOT_ID;
      recrawlRequestRaw.ingestion.source_document = {
        ...recrawlRequestRaw.ingestion.source_document,
        last_changed_at: "2026-08-27T12:00:00Z",
        last_seen_at: "2026-08-27T12:00:00Z",
      };
      recrawlRequestRaw.ingestion.extraction_run = {
        ...recrawlRequestRaw.ingestion.extraction_run,
        completed_at: "2026-08-27T12:00:01Z",
        id: RECRAWL_EXTRACTION_RUN_ID,
        snapshot_id: RECRAWL_SNAPSHOT_ID,
        started_at: "2026-08-27T12:00:00Z",
      };
      recrawlRequestRaw.ingestion.assertions = [
        {
          ...recrawlRequestRaw.ingestion.assertions[0],
          asserted_at: "2026-08-27T12:00:00Z",
          evidence_text: "Programa científico 2026",
          extraction_run_id: RECRAWL_EXTRACTION_RUN_ID,
          id: RECRAWL_ASSERTION_ID,
          normalized_value: "Programa científico 2026",
          raw_value: "Programa científico 2026",
          snapshot_id: RECRAWL_SNAPSHOT_ID,
        },
      ];
      recrawlRequestRaw.ingestion.resolved_fields = {
        title: {
          ...recrawlRequestRaw.ingestion.resolved_fields.title,
          selected_assertion_ids: [RECRAWL_ASSERTION_ID],
          value: "Programa científico 2026",
        },
      };
      recrawlRequestRaw.ingestion.semantic_fields.title = {
        ...recrawlRequestRaw.ingestion.semantic_fields.title,
        supporting_assertion_ids: [RECRAWL_ASSERTION_ID],
        value: "Programa científico 2026",
      };
      recrawlRequestRaw.ingestion.semantic_fields.application_deadline = {
        ...recrawlRequestRaw.ingestion.semantic_fields.application_deadline,
        last_verified_at: "2026-08-27T12:00:00Z",
        resolved_at: "2026-08-27T12:00:00Z",
        value: "2026-09-15T23:59:59Z",
      };
      recrawlRequestRaw.ingestion.edition = {
        ...recrawlRequestRaw.ingestion.edition,
        id: RECRAWL_EDITION_ID,
        last_verified_at: "2026-08-27T12:00:00Z",
        program_id: RECRAWL_PROGRAM_ID,
      };
      recrawlRequestRaw.ingestion.program = {
        ...recrawlRequestRaw.ingestion.program,
        id: RECRAWL_PROGRAM_ID,
      };
      recrawlRequestRaw.ingestion.application_round = {
        ...recrawlRequestRaw.ingestion.application_round,
        deadline: "2026-09-15T23:59:59Z",
        edition_id: RECRAWL_EDITION_ID,
        id: RECRAWL_ROUND_ID,
      };
      recrawlRequestRaw.ingestion.eligibility_profile = {
        ...recrawlRequestRaw.ingestion.eligibility_profile,
        source_assertion_ids: [RECRAWL_ASSERTION_ID],
      };
      recrawlRequestRaw.ingestion.fit_assessment = {
        ...recrawlRequestRaw.ingestion.fit_assessment,
        evidence_assertion_ids: [RECRAWL_ASSERTION_ID],
      };
      recrawlRequestRaw.ingestion.publication_version = {
        ...recrawlRequestRaw.ingestion.publication_version,
        created_at: "2026-08-27T12:00:01Z",
        edition_id: RECRAWL_EDITION_ID,
        id: RECRAWL_PUBLICATION_VERSION_ID,
        supporting_assertion_ids: [RECRAWL_ASSERTION_ID],
      };
      recrawlRequestRaw.ingestion.compatibility_draft = {
        ...recrawlRequestRaw.ingestion.compatibility_draft,
        application_deadline: "2026-09-15",
        extracted_at: "2026-08-27T12:00:00Z",
        source_content_sha256: "b".repeat(64),
        title: "Programa científico 2026",
      };
      const recrawlRequest = ingestionRequestV1Schema.parse(recrawlRequestRaw);
      const recrawlIngestion = await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        recrawlRequest
      );
      const materialState = await client.query<{
        deadline: string;
        editorial_state: string;
        material_changes: number;
        open_change_tasks: number;
        version: number;
      }>(`
        SELECT
          pv.version,
          pv.editorial_state,
          (SELECT count(*)::int FROM material_change_events) AS material_changes,
          (
            SELECT count(*)::int
            FROM review_tasks
            WHERE reason = 'material_source_change' AND status = 'open'
          ) AS open_change_tasks,
          (
            SELECT application_deadline::text
            FROM opportunities
            WHERE id = '${EDITION_ID}'
          ) AS deadline
        FROM publication_versions pv
        WHERE pv.id = '${recrawlIngestion.publication_version_id}'
      `);
      const publicBeforeUpdateApproval = await listPublicOpportunities(
        database as unknown as Parameters<typeof listPublicOpportunities>[0],
        publicOpportunityFilterV1Schema.parse({})
      );
      expect(recrawlIngestion).toMatchObject({
        edition_id: EDITION_ID,
        editorial_state: "update_pending",
        gate_outcome: "manual_review",
        review_task_count: 1,
      });
      expect(materialState.rows[0]).toEqual({
        deadline: "2026-08-31",
        editorial_state: "update_pending",
        material_changes: 1,
        open_change_tasks: 1,
        version: 3,
      });
      expect(
        publicBeforeUpdateApproval.items[0]?.application_deadline_date
      ).toBe("2026-08-31");

      const unchangedRequestRaw = structuredClone(recrawlRequestRaw);
      unchangedRequestRaw.idempotency_key = "fixture-ingestion-unchanged-0001";
      unchangedRequestRaw.snapshot.id = "00000000-0000-4000-8000-000000000015";
      unchangedRequestRaw.snapshot.fetched_at = "2026-08-28T12:00:00Z";
      unchangedRequestRaw.ingestion.snapshot_id =
        unchangedRequestRaw.snapshot.id;
      unchangedRequestRaw.ingestion.extraction_run.id =
        "00000000-0000-4000-8000-000000000016";
      unchangedRequestRaw.ingestion.extraction_run.snapshot_id =
        unchangedRequestRaw.snapshot.id;
      unchangedRequestRaw.ingestion.assertions[0].id =
        "00000000-0000-4000-8000-000000000017";
      unchangedRequestRaw.ingestion.assertions[0].extraction_run_id =
        unchangedRequestRaw.ingestion.extraction_run.id;
      unchangedRequestRaw.ingestion.assertions[0].snapshot_id =
        unchangedRequestRaw.snapshot.id;
      unchangedRequestRaw.ingestion.resolved_fields.title.selected_assertion_ids =
        [unchangedRequestRaw.ingestion.assertions[0].id];
      unchangedRequestRaw.ingestion.semantic_fields.title.supporting_assertion_ids =
        [unchangedRequestRaw.ingestion.assertions[0].id];
      unchangedRequestRaw.ingestion.eligibility_profile.source_assertion_ids = [
        unchangedRequestRaw.ingestion.assertions[0].id,
      ];
      unchangedRequestRaw.ingestion.fit_assessment.evidence_assertion_ids = [
        unchangedRequestRaw.ingestion.assertions[0].id,
      ];
      unchangedRequestRaw.ingestion.publication_version.id =
        "00000000-0000-4000-8000-000000000018";
      unchangedRequestRaw.ingestion.publication_version.supporting_assertion_ids =
        [unchangedRequestRaw.ingestion.assertions[0].id];
      const unchangedIngestion = await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        ingestionRequestV1Schema.parse(unchangedRequestRaw)
      );
      const unchangedCounts = await client.query<{
        publication_versions: number;
        snapshots: number;
      }>(`
        SELECT
          (SELECT count(*)::int FROM publication_versions) AS publication_versions,
          (SELECT count(*)::int FROM snapshots) AS snapshots
      `);
      expect(unchangedIngestion.publication_version_id).toBe(
        recrawlIngestion.publication_version_id
      );
      expect(unchangedCounts.rows[0]).toEqual({
        publication_versions: 3,
        snapshots: 2,
      });

      const verifiedLink = await verifyApplicationLink(
        database as unknown as Parameters<typeof verifyApplicationLink>[0],
        ROUND_ID,
        "test-link-worker",
        {
          client: {
            get: async () => ({
              body: `
                <html>
                  <h1>Applications are open for 2026</h1>
                  <form method="post">
                    <input name="email" />
                    <button type="submit">Apply now</button>
                  </form>
                </html>
              `,
              finalUrl: "https://example.org/apply/2026",
              headers: { "content-type": "text/html" },
              redirectChain: [],
              status: 200,
            }),
          },
          now: new Date(NOW),
          robotsChecker: async () => ({
            allowed: true,
            reason: "robots.txt allows this path",
          }),
        }
      );
      expect(verifiedLink).toMatchObject({
        acceptsSubmissions: true,
        status: "current_and_open",
      });

      const maintenanceNow = new Date("2026-08-29T12:00:00Z");
      const scheduled = await scheduleDueRecrawls(
        database as unknown as Parameters<typeof scheduleDueRecrawls>[0],
        "test-scheduler",
        maintenanceNow
      );
      expect(scheduled).toEqual({
        application_link_jobs: 1,
        source_document_jobs: 1,
      });
      expect(
        await scheduleDueRecrawls(
          database as unknown as Parameters<typeof scheduleDueRecrawls>[0],
          "test-scheduler",
          maintenanceNow
        )
      ).toEqual({
        application_link_jobs: 0,
        source_document_jobs: 0,
      });
      const claimed = await claimRecrawlJobs(
        database as unknown as Parameters<typeof claimRecrawlJobs>[0],
        "test-maintenance-worker",
        10,
        maintenanceNow
      );
      expect(claimed).toHaveLength(2);
      const completed = await completeRecrawlJob(
        database as unknown as Parameters<typeof completeRecrawlJob>[0],
        claimed[0]?.id ?? "",
        "test-maintenance-worker",
        claimed[0]?.leaseToken ?? "",
        { material_change: false, success: true },
        maintenanceNow
      );
      expect(completed.status).toBe("completed");

      const reviewerRecrawls = await requestEditionRecrawl(
        database as unknown as Parameters<typeof requestEditionRecrawl>[0],
        EDITION_ID,
        reviewerId,
        "Verify a reported deadline extension.",
        "reviewer-recrawl-0001",
        maintenanceNow
      );
      expect(
        reviewerRecrawls.filter((job) => job.requestedBy === reviewerId)
      ).toHaveLength(2);

      const closedLink = await verifyApplicationLink(
        database as unknown as Parameters<typeof verifyApplicationLink>[0],
        ROUND_ID,
        "test-link-worker",
        {
          client: {
            get: async () => ({
              body: `
                <html>
                  <h1>Programa 2026</h1>
                  <p>Inscrições encerradas.</p>
                  <form>
                    <input name="email" disabled />
                    <button type="submit" disabled>Enviar</button>
                  </form>
                </html>
              `,
              finalUrl: "https://example.org/apply/2026",
              headers: { "content-type": "text/html" },
              redirectChain: [],
              status: 200,
            }),
          },
          now: new Date("2026-09-16T12:00:00Z"),
          robotsChecker: async () => ({
            allowed: true,
            reason: "robots.txt allows this path",
          }),
        }
      );
      const publicAfterClosure = await listPublicOpportunities(
        database as unknown as Parameters<typeof listPublicOpportunities>[0],
        publicOpportunityFilterV1Schema.parse({})
      );
      const linkAlertRows = await client.query<{ count: number }>(`
        SELECT count(*)::int AS count
        FROM review_tasks
        WHERE reason = 'application_link_degraded'
          AND status = 'open'
      `);
      expect(closedLink.status).toBe("closed");
      expect(publicAfterClosure.items[0]).toMatchObject({
        application_deadline_date: "2026-08-31",
        application_link_status: "closed",
        lifecycle: "open",
      });
      expect(
        (publicAfterClosure.items[0] as unknown as { can_apply?: boolean })
          ?.can_apply
      ).toBe(false);
      expect(linkAlertRows.rows[0]?.count).toBe(1);
    } finally {
      await client.close();
    }
  }, 30_000);

  it("reconciles an href-only application link change despite a historical semantic hash match", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const first = makeObservationRequest({
        applicationUrl: "https://example.org/apply/old",
        contentHash: "a".repeat(64),
        fetchedAt: "2026-08-01T12:00:00Z",
        idempotencyKey: "bf04-href-observation-a",
        semanticHash: "f".repeat(64),
        sequence: 1,
      });
      const second = makeObservationRequest({
        applicationUrl: "https://example.org/apply/new",
        contentHash: "b".repeat(64),
        fetchedAt: "2026-08-02T12:00:00Z",
        idempotencyKey: "bf04-href-observation-b",
        semanticHash: "f".repeat(64),
        sequence: 2,
      });

      const firstResult = await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        first
      );
      const secondResult = await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        second
      );
      const state = await client.query<{
        application_url: string;
        publication_versions: number;
        snapshots: number;
      }>(`
        SELECT
          application_url,
          (SELECT count(*)::int FROM publication_versions) AS publication_versions,
          (SELECT count(*)::int FROM snapshots) AS snapshots
        FROM application_rounds
        WHERE id = '${ROUND_ID}'
      `);

      expect(secondResult.publication_version_id).not.toBe(
        firstResult.publication_version_id
      );
      expect(state.rows[0]).toEqual({
        application_url: "https://example.org/apply/new",
        publication_versions: 2,
        snapshots: 2,
      });
    } finally {
      await client.close();
    }
  }, 30_000);

  it("reconciles a JSON-LD-only deadline change despite unchanged visible semantics", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const first = makeObservationRequest({
        contentHash: "a".repeat(64),
        deadline: "2026-11-15T23:59:59Z",
        fetchedAt: "2026-08-03T12:00:00Z",
        idempotencyKey: "bf04-jsonld-observation-a",
        semanticHash: "e".repeat(64),
        sequence: 3,
      });
      const second = makeObservationRequest({
        contentHash: "b".repeat(64),
        deadline: "2026-12-01T23:59:59Z",
        fetchedAt: "2026-08-04T12:00:00Z",
        idempotencyKey: "bf04-jsonld-observation-b",
        semanticHash: "e".repeat(64),
        sequence: 4,
      });

      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        first
      );
      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        second
      );
      const state = await client.query<{
        deadline_date: string;
        publication_versions: number;
      }>(`
        SELECT
          deadline_date::text,
          (SELECT count(*)::int FROM publication_versions) AS publication_versions
        FROM application_rounds
        WHERE id = '${ROUND_ID}'
      `);

      expect(state.rows[0]).toEqual({
        deadline_date: "2026-12-01",
        publication_versions: 2,
      });
    } finally {
      await client.close();
    }
  }, 30_000);

  it("keeps A to A semantically idempotent while reusing raw content", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const first = makeObservationRequest({
        contentHash: "a".repeat(64),
        fetchedAt: "2026-08-05T12:00:00Z",
        idempotencyKey: "bf04-identical-observation-a",
        sequence: 5,
      });
      const second = makeObservationRequest({
        contentHash: "a".repeat(64),
        fetchedAt: "2026-08-06T12:00:00Z",
        idempotencyKey: "bf04-identical-observation-b",
        sequence: 6,
      });

      const firstResult = await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        first
      );
      const before = await client.query<{
        publication_versions: number;
        semantic_states: number;
        snapshots: number;
      }>(`
        SELECT
          (SELECT count(*)::int FROM publication_versions) AS publication_versions,
          (SELECT count(*)::int FROM field_semantic_states) AS semantic_states,
          (SELECT count(*)::int FROM snapshots) AS snapshots
      `);
      const secondResult = await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        second
      );
      const after = await client.query<{
        publication_versions: number;
        semantic_states: number;
        snapshots: number;
      }>(`
        SELECT
          (SELECT count(*)::int FROM publication_versions) AS publication_versions,
          (SELECT count(*)::int FROM field_semantic_states) AS semantic_states,
          (SELECT count(*)::int FROM snapshots) AS snapshots
      `);

      expect(secondResult.publication_version_id).toBe(
        firstResult.publication_version_id
      );
      expect(after.rows[0]).toEqual(before.rows[0]);
    } finally {
      await client.close();
    }
  }, 30_000);

  it("does not classify a newly discovered semantic field as unchanged", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const first = makeObservationRequest({
        contentHash: "d".repeat(64),
        fetchedAt: "2026-08-06T13:00:00Z",
        idempotencyKey: "bf04-new-semantic-field-a",
        sequence: 20,
      });
      const second = makeObservationRequest({
        contentHash: "d".repeat(64),
        fetchedAt: "2026-08-06T14:00:00Z",
        idempotencyKey: "bf04-new-semantic-field-b",
        sequence: 21,
      });
      const secondWithNewField = ingestionRequestV1Schema.parse({
        ...second,
        ingestion: {
          ...second.ingestion,
          semantic_fields: {
            ...second.ingestion.semantic_fields,
            selection_process: semanticField("selection_process", "interview", {
              criticality: "noncritical",
            }),
          },
        },
      });

      const firstResult = await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        first
      );
      const secondResult = await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        secondWithNewField
      );
      const stored = await client.query<{ count: number }>(
        `SELECT count(*)::int AS count
         FROM field_semantic_states
         WHERE publication_version_id = $1
           AND field_name = 'selection_process'`,
        [secondResult.publication_version_id]
      );

      expect(secondResult.publication_version_id).not.toBe(
        firstResult.publication_version_id
      );
      expect(stored.rows[0]?.count).toBe(1);
    } finally {
      await client.close();
    }
  }, 30_000);

  it("reconciles A to B to A against the current interpretation instead of historical A", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const first = makeObservationRequest({
        applicationUrl: "https://example.org/apply/a",
        contentHash: "a".repeat(64),
        fetchedAt: "2026-08-07T12:00:00Z",
        idempotencyKey: "bf04-aba-observation-a1",
        sequence: 7,
      });
      const second = makeObservationRequest({
        applicationUrl: "https://example.org/apply/b",
        contentHash: "b".repeat(64),
        fetchedAt: "2026-08-08T12:00:00Z",
        idempotencyKey: "bf04-aba-observation-b",
        sequence: 8,
      });
      const third = makeObservationRequest({
        applicationUrl: "https://example.org/apply/a",
        contentHash: "a".repeat(64),
        fetchedAt: "2026-08-09T12:00:00Z",
        idempotencyKey: "bf04-aba-observation-a2",
        sequence: 9,
      });

      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        first
      );
      const secondResult = await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        second
      );
      const thirdResult = await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        third
      );
      const state = await client.query<{
        application_url: string;
        publication_versions: number;
        snapshots: number;
      }>(`
        SELECT
          application_url,
          (SELECT count(*)::int FROM publication_versions) AS publication_versions,
          (SELECT count(*)::int FROM snapshots) AS snapshots
        FROM application_rounds
        WHERE id = '${ROUND_ID}'
      `);

      expect(thirdResult.publication_version_id).not.toBe(
        secondResult.publication_version_id
      );
      expect(state.rows[0]).toEqual({
        application_url: "https://example.org/apply/a",
        publication_versions: 3,
        snapshots: 2,
      });
    } finally {
      await client.close();
    }
  }, 30_000);

  it("reprocesses identical raw bytes under a newer parser pipeline", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const first = makeObservationRequest({
        contentHash: "a".repeat(64),
        deadline: "2026-08-31T23:59:59Z",
        extractorVersion: "parser-v1",
        fetchedAt: "2026-08-10T12:00:00Z",
        idempotencyKey: "bf04-parser-observation-v1",
        pipelineVersion: "pipeline-v1",
        sequence: 10,
      });
      const second = makeObservationRequest({
        contentHash: "a".repeat(64),
        deadline: "2026-09-15T23:59:59Z",
        extractorVersion: "parser-v2",
        fetchedAt: "2026-08-11T12:00:00Z",
        idempotencyKey: "bf04-parser-observation-v2",
        pipelineVersion: "pipeline-v2",
        sequence: 11,
      });

      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        first
      );
      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        second
      );
      const state = await client.query<{
        deadline_date: string;
        extraction_runs: number;
        pipeline_version: string;
        snapshot_id: string;
        snapshots: number;
      }>(`
        SELECT
          ar.deadline_date::text,
          (SELECT count(*)::int FROM extraction_runs) AS extraction_runs,
          er.pipeline_version,
          er.snapshot_id::text,
          (SELECT count(*)::int FROM snapshots) AS snapshots
        FROM application_rounds ar
        JOIN extraction_runs er ON er.id = '${fixtureUuid(145)}'
        WHERE ar.id = '${ROUND_ID}'
      `);

      expect(state.rows[0]).toEqual({
        deadline_date: "2026-09-15",
        extraction_runs: 2,
        pipeline_version: "pipeline-v2",
        snapshot_id: fixtureUuid(140),
        snapshots: 1,
      });
    } finally {
      await client.close();
    }
  }, 30_000);

  it("reuses the persisted raw snapshot ID for later extraction and assertion foreign keys", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const first = makeObservationRequest({
        contentHash: "c".repeat(64),
        fetchedAt: "2026-08-12T12:00:00Z",
        idempotencyKey: "bf04-snapshot-reuse-a",
        sequence: 12,
      });
      const second = makeObservationRequest({
        contentHash: "c".repeat(64),
        fetchedAt: "2026-08-13T12:00:00Z",
        idempotencyKey: "bf04-snapshot-reuse-b",
        sequence: 13,
      });

      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        first
      );
      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        second
      );
      const state = await client.query<{
        assertion_snapshot_id: string;
        extraction_snapshot_id: string;
        snapshots: number;
      }>(`
        SELECT
          fa.snapshot_id::text AS assertion_snapshot_id,
          er.snapshot_id::text AS extraction_snapshot_id,
          (SELECT count(*)::int FROM snapshots) AS snapshots
        FROM extraction_runs er
        JOIN field_assertions fa ON fa.extraction_run_id = er.id
        WHERE er.id = '${fixtureUuid(153)}'
          AND fa.id = '${fixtureUuid(154)}'
      `);

      expect(state.rows[0]).toEqual({
        assertion_snapshot_id: fixtureUuid(148),
        extraction_snapshot_id: fixtureUuid(148),
        snapshots: 1,
      });
    } finally {
      await client.close();
    }
  }, 30_000);

  it("BF-05 reuses edition identity for a same-URL same-edition correction", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const firstEditionId = fixtureUuid(301);
      const firstRoundId = fixtureUuid(311);
      const first = makeIdentityObservationRequest({
        contentHash: "1".repeat(64),
        deadline: "2026-08-01T23:59:59Z",
        editionId: firstEditionId,
        editionYear: 2026,
        fetchedAt: "2026-09-01T12:00:00Z",
        idempotencyKey: "bf05-same-edition-correction-a",
        roundId: firstRoundId,
        roundName: "regular",
        sequence: 30,
      });
      const correction = makeIdentityObservationRequest({
        contentHash: "2".repeat(64),
        deadline: "2026-08-15T23:59:59Z",
        editionId: fixtureUuid(302),
        editionYear: 2026,
        fetchedAt: "2026-09-02T12:00:00Z",
        idempotencyKey: "bf05-same-edition-correction-b",
        roundId: firstRoundId,
        roundName: "regular",
        sequence: 31,
      });

      const firstResult = await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        first
      );
      const correctedResult = await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        correction
      );
      const state = await client.query<{
        deadline_date: string;
        edition_id: string;
        edition_year: number;
        editions: number;
        round_id: string;
        rounds: number;
      }>(`
        SELECT
          e.id::text AS edition_id,
          e.edition_year,
          ar.id::text AS round_id,
          ar.deadline_date::text,
          (SELECT count(*)::int FROM editions) AS editions,
          (SELECT count(*)::int FROM application_rounds) AS rounds
        FROM editions e
        JOIN application_rounds ar ON ar.edition_id = e.id
        WHERE e.id = '${firstEditionId}'
      `);

      expect(correctedResult.edition_id).toBe(firstResult.edition_id);
      expect(state.rows[0]).toEqual({
        deadline_date: "2026-08-15",
        edition_id: firstEditionId,
        edition_year: 2026,
        editions: 1,
        round_id: firstRoundId,
        rounds: 1,
      });
    } finally {
      await client.close();
    }
  }, 30_000);

  it("BF-05 creates a distinct edition when the same URL advances from 2026 to 2027", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const edition2026Id = fixtureUuid(321);
      const edition2027Id = fixtureUuid(322);
      const first = makeIdentityObservationRequest({
        contentHash: "3".repeat(64),
        deadline: "2026-08-31T23:59:59Z",
        editionId: edition2026Id,
        editionYear: 2026,
        fetchedAt: "2026-09-03T12:00:00Z",
        idempotencyKey: "bf05-new-edition-2026",
        roundId: fixtureUuid(331),
        sequence: 32,
      });
      const nextEdition = makeIdentityObservationRequest({
        contentHash: "4".repeat(64),
        deadline: "2027-08-31T23:59:59Z",
        editionId: edition2027Id,
        editionYear: 2027,
        fetchedAt: "2027-03-01T12:00:00Z",
        idempotencyKey: "bf05-new-edition-2027",
        roundId: fixtureUuid(332),
        sequence: 33,
      });

      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        first
      );
      const secondResult = await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        nextEdition
      );
      const editionsState = await client.query<{
        edition_year: number;
        id: string;
        program_id: string;
        programs: number;
        source_links: number;
      }>(`
        SELECT
          id::text,
          edition_year,
          program_id::text,
          (SELECT count(*)::int FROM programs) AS programs,
          (SELECT count(*)::int FROM edition_source_documents WHERE source_document_id = '${DOCUMENT_ID}') AS source_links
        FROM editions
        ORDER BY edition_year
      `);

      expect(secondResult.edition_id).toBe(edition2027Id);
      expect(editionsState.rows).toEqual([
        {
          edition_year: 2026,
          id: edition2026Id,
          program_id: PROGRAM_ID,
          programs: 1,
          source_links: 2,
        },
        {
          edition_year: 2027,
          id: edition2027Id,
          program_id: PROGRAM_ID,
          programs: 1,
          source_links: 2,
        },
      ]);
    } finally {
      await client.close();
    }
  }, 30_000);

  it("BF-05 leaves the historical edition identity key intact after a new edition arrives", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const edition2026Id = fixtureUuid(341);
      const first = makeIdentityObservationRequest({
        contentHash: "5".repeat(64),
        editionId: edition2026Id,
        editionYear: 2026,
        fetchedAt: "2026-09-04T12:00:00Z",
        idempotencyKey: "bf05-history-2026",
        roundId: fixtureUuid(351),
        sequence: 34,
      });
      const nextEdition = makeIdentityObservationRequest({
        contentHash: "6".repeat(64),
        deadline: "2027-09-01T23:59:59Z",
        editionId: fixtureUuid(342),
        editionYear: 2027,
        fetchedAt: "2027-03-02T12:00:00Z",
        idempotencyKey: "bf05-history-2027",
        roundId: fixtureUuid(352),
        sequence: 35,
      });

      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        first
      );
      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        nextEdition
      );
      const historical = await client.query<{
        edition_year: number;
        identity_key: string;
      }>("SELECT edition_year, identity_key FROM editions WHERE id = $1", [
        edition2026Id,
      ]);

      expect(historical.rows[0]).toEqual({
        edition_year: 2026,
        identity_key: "2026:annual",
      });
    } finally {
      await client.close();
    }
  }, 30_000);

  it("BF-05 reuses a round identity when only that round deadline is corrected", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const firstRoundId = fixtureUuid(371);
      const first = makeIdentityObservationRequest({
        contentHash: "7".repeat(64),
        deadline: "2027-11-15T23:59:59Z",
        editionId: fixtureUuid(361),
        editionYear: 2027,
        fetchedAt: "2027-06-01T12:00:00Z",
        idempotencyKey: "bf05-round-correction-a",
        roundId: firstRoundId,
        roundName: "regular",
        sequence: 36,
      });
      const correction = makeIdentityObservationRequest({
        contentHash: "8".repeat(64),
        deadline: "2027-12-01T23:59:59Z",
        editionId: fixtureUuid(362),
        editionYear: 2027,
        fetchedAt: "2027-06-02T12:00:00Z",
        idempotencyKey: "bf05-round-correction-b",
        roundId: firstRoundId,
        roundName: "regular",
        sequence: 37,
      });

      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        first
      );
      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        correction
      );
      const state = await client.query<{
        deadline_date: string;
        id: string;
        rounds: number;
      }>(`
        SELECT
          id::text,
          deadline_date::text,
          (SELECT count(*)::int FROM application_rounds) AS rounds
        FROM application_rounds
      `);

      expect(state.rows[0]).toEqual({
        deadline_date: "2027-12-01",
        id: firstRoundId,
        rounds: 1,
      });
    } finally {
      await client.close();
    }
  }, 30_000);

  it("BF-05 creates a second round inside one edition without replacing the first", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const editionId = fixtureUuid(381);
      const earlyRoundId = fixtureUuid(391);
      const regularRoundId = fixtureUuid(392);
      const early = makeIdentityObservationRequest({
        contentHash: "9".repeat(64),
        deadline: "2027-10-01T23:59:59Z",
        editionId,
        editionYear: 2027,
        fetchedAt: "2027-07-01T12:00:00Z",
        idempotencyKey: "bf05-round-early",
        roundId: earlyRoundId,
        roundName: "early",
        sequence: 38,
      });
      const regular = makeIdentityObservationRequest({
        contentHash: "a".repeat(64),
        deadline: "2027-12-01T23:59:59Z",
        editionId: fixtureUuid(382),
        editionYear: 2027,
        fetchedAt: "2027-07-02T12:00:00Z",
        idempotencyKey: "bf05-round-regular",
        roundId: regularRoundId,
        roundName: "regular",
        sequence: 39,
      });

      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        early
      );
      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        regular
      );
      const state = await client.query<{
        editions: number;
        id: string;
        round_name: string;
      }>(`
        SELECT
          id::text,
          round_name,
          (SELECT count(*)::int FROM editions) AS editions
        FROM application_rounds
        ORDER BY round_name
      `);

      expect(state.rows).toEqual([
        { editions: 1, id: earlyRoundId, round_name: "early" },
        { editions: 1, id: regularRoundId, round_name: "regular" },
      ]);
    } finally {
      await client.close();
    }
  }, 30_000);

  it("BF-05 keeps multiple rounds independently addressable when one is corrected", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const earlyRoundId = fixtureUuid(411);
      const regularRoundId = fixtureUuid(412);
      const early = makeIdentityObservationRequest({
        contentHash: "b".repeat(64),
        deadline: "2027-10-01T23:59:59Z",
        editionId: fixtureUuid(401),
        editionYear: 2027,
        fetchedAt: "2027-07-03T12:00:00Z",
        idempotencyKey: "bf05-independent-early",
        roundId: earlyRoundId,
        roundName: "early",
        sequence: 40,
      });
      const regular = makeIdentityObservationRequest({
        contentHash: "c".repeat(64),
        deadline: "2027-12-01T23:59:59Z",
        editionId: fixtureUuid(402),
        editionYear: 2027,
        fetchedAt: "2027-07-04T12:00:00Z",
        idempotencyKey: "bf05-independent-regular",
        roundId: regularRoundId,
        roundName: "regular",
        sequence: 41,
      });
      const earlyCorrection = makeIdentityObservationRequest({
        contentHash: "d".repeat(64),
        deadline: "2027-10-15T23:59:59Z",
        editionId: fixtureUuid(403),
        editionYear: 2027,
        fetchedAt: "2027-07-05T12:00:00Z",
        idempotencyKey: "bf05-independent-early-correction",
        roundId: earlyRoundId,
        roundName: "early",
        sequence: 42,
      });

      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        early
      );
      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        regular
      );
      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        earlyCorrection
      );
      const state = await client.query<{
        deadline_date: string;
        id: string;
        round_name: string;
      }>(`
        SELECT id::text, round_name, deadline_date::text
        FROM application_rounds
        ORDER BY round_name
      `);

      expect(state.rows).toEqual([
        {
          deadline_date: "2027-10-15",
          id: earlyRoundId,
          round_name: "early",
        },
        {
          deadline_date: "2027-12-01",
          id: regularRoundId,
          round_name: "regular",
        },
      ]);
    } finally {
      await client.close();
    }
  }, 30_000);

  it("BF-05 refuses an ambiguous recurring-source rebind instead of mutating history", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const historicalEditionId = fixtureUuid(421);
      const first = makeIdentityObservationRequest({
        contentHash: "e".repeat(64),
        cycle: "annual",
        editionId: historicalEditionId,
        editionLabel: "Current edition",
        editionYear: null,
        endDate: "2027-10-20",
        fetchedAt: "2027-07-06T12:00:00Z",
        idempotencyKey: "bf05-ambiguous-first",
        roundId: fixtureUuid(431),
        sequence: 43,
        startDate: "2027-10-01",
      });
      const ambiguous = makeIdentityObservationRequest({
        contentHash: "f".repeat(64),
        cycle: "annual",
        deadline: "2028-09-01T23:59:59Z",
        editionId: historicalEditionId,
        editionLabel: "Current edition",
        editionYear: null,
        endDate: "2028-10-20",
        fetchedAt: "2028-07-01T12:00:00Z",
        idempotencyKey: "bf05-ambiguous-second",
        roundId: fixtureUuid(432),
        sequence: 44,
        startDate: "2028-10-01",
      });

      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        first
      );
      await expect(
        persistIngestion(
          database as unknown as Parameters<typeof persistIngestion>[0],
          ambiguous
        )
      ).rejects.toBeInstanceOf(IdempotencyConflictError);
      const historical = await client.query<{
        editions: number;
        start_date: string;
      }>(`
        SELECT
          start_date::text,
          (SELECT count(*)::int FROM editions) AS editions
        FROM editions
        WHERE id = '${historicalEditionId}'
      `);

      expect(historical.rows[0]).toEqual({
        editions: 1,
        start_date: "2027-10-01",
      });
    } finally {
      await client.close();
    }
  }, 30_000);

  it("BF-05 fails closed when a yearless recurring edition advances only in round timing", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const editionId = fixtureUuid(461);
      const roundId = fixtureUuid(471);
      const first = makeIdentityObservationRequest({
        contentHash: "3".repeat(64),
        cycle: "annual",
        deadline: "2027-09-01T23:59:59Z",
        editionId,
        editionLabel: "Current edition",
        editionYear: null,
        endDate: null,
        fetchedAt: "2027-07-01T12:00:00Z",
        idempotencyKey: "bf05-ambiguous-round-timing-first",
        roundId,
        roundName: "main",
        sequence: 47,
        startDate: null,
      });
      const nextCycle = makeIdentityObservationRequest({
        contentHash: "4".repeat(64),
        cycle: "annual",
        deadline: "2028-09-01T23:59:59Z",
        editionId,
        editionLabel: "Current edition",
        editionYear: null,
        endDate: null,
        fetchedAt: "2028-07-01T12:00:00Z",
        idempotencyKey: "bf05-ambiguous-round-timing-second",
        roundId,
        roundName: "main",
        sequence: 48,
        startDate: null,
      });

      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        first
      );
      await expect(
        persistIngestion(
          database as unknown as Parameters<typeof persistIngestion>[0],
          nextCycle
        )
      ).rejects.toBeInstanceOf(IdempotencyConflictError);
      const historical = await client.query<{
        deadline_date: string;
        editions: number;
        rounds: number;
      }>(`
        SELECT deadline_date::text,
          (SELECT count(*)::int FROM editions) AS editions,
          (SELECT count(*)::int FROM application_rounds) AS rounds
        FROM application_rounds WHERE id = '${roundId}'
      `);
      expect(historical.rows[0]).toEqual({
        deadline_date: "2027-09-01",
        editions: 1,
        rounds: 1,
      });
    } finally {
      await client.close();
    }
  }, 30_000);

  it("BF-05 refuses to collapse same-key rounds when explicit evidence conflicts", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const editionId = fixtureUuid(481);
      const firstRoundId = fixtureUuid(491);
      const first = makeIdentityObservationRequest({
        audience: ["High school students"],
        contentHash: "5".repeat(64),
        deadline: "2027-10-01T23:59:59Z",
        editionId,
        editionYear: 2027,
        fetchedAt: "2027-07-10T12:00:00Z",
        idempotencyKey: "bf05-round-key-conflict-first",
        region: "Brazil",
        roundId: firstRoundId,
        roundName: "main",
        sequence: 49,
      });
      const ambiguousSecondRound = makeIdentityObservationRequest({
        audience: ["University students"],
        contentHash: "6".repeat(64),
        deadline: "2027-12-01T23:59:59Z",
        editionId,
        editionYear: 2027,
        fetchedAt: "2027-07-11T12:00:00Z",
        idempotencyKey: "bf05-round-key-conflict-second",
        region: "Brazil",
        roundId: fixtureUuid(492),
        roundName: "main",
        sequence: 50,
      });
      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        first
      );
      await expect(
        persistIngestion(
          database as unknown as Parameters<typeof persistIngestion>[0],
          ambiguousSecondRound
        )
      ).rejects.toBeInstanceOf(IdempotencyConflictError);
      const historical = await client.query<{
        audience: string[];
        deadline_date: string;
        id: string;
        rounds: number;
      }>(`
        SELECT id::text, audience, deadline_date::text,
          (SELECT count(*)::int FROM application_rounds) AS rounds
        FROM application_rounds WHERE id = '${firstRoundId}'
      `);
      expect(historical.rows[0]).toEqual({
        audience: ["High school students"],
        deadline_date: "2027-10-01",
        id: firstRoundId,
        rounds: 1,
      });
    } finally {
      await client.close();
    }
  }, 30_000);

  it("BF-05 treats an explicit same-year cycle change as a distinct edition", async () => {
    const { client, database } = await createPersistenceTestDatabase();
    try {
      const summerId = fixtureUuid(441);
      const winterId = fixtureUuid(442);
      const summer = makeIdentityObservationRequest({
        contentHash: "1".repeat(64),
        cycle: "summer",
        editionId: summerId,
        editionLabel: "2026 Summer",
        editionYear: 2026,
        fetchedAt: "2026-04-01T12:00:00Z",
        idempotencyKey: "bf05-cycle-summer",
        roundId: fixtureUuid(451),
        sequence: 45,
      });
      const winter = makeIdentityObservationRequest({
        contentHash: "2".repeat(64),
        cycle: "winter",
        editionId: winterId,
        editionLabel: "2026 Winter",
        editionYear: 2026,
        fetchedAt: "2026-09-01T12:00:00Z",
        idempotencyKey: "bf05-cycle-winter",
        roundId: fixtureUuid(452),
        sequence: 46,
      });

      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        summer
      );
      await persistIngestion(
        database as unknown as Parameters<typeof persistIngestion>[0],
        winter
      );
      const state = await client.query<{
        cycle: string;
        id: string;
      }>(`
        SELECT id::text, cycle
        FROM editions
        ORDER BY cycle
      `);

      expect(state.rows).toEqual([
        { cycle: "summer", id: summerId },
        { cycle: "winter", id: winterId },
      ]);
    } finally {
      await client.close();
    }
  }, 30_000);
});
