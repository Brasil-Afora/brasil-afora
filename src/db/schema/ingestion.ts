import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/db/schema/users";

const createdAt = () =>
  timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .defaultNow()
    .notNull();

export const lifecycleState = pgEnum("lifecycle_state", [
  "expected",
  "announced",
  "applications_not_open",
  "open",
  "closing_soon",
  "extended",
  "closed",
  "cancelled",
  "completed",
  "archived",
  "unknown",
]);

export const editorialState = pgEnum("editorial_state", [
  "draft",
  "needs_review",
  "approved",
  "published",
  "update_pending",
  "rejected",
  "archived",
  "unpublished",
]);

export const publicationGateOutcome = pgEnum("publication_gate_outcome", [
  "auto_ready",
  "manual_review",
  "reject",
  "expired_archive",
]);

export const reviewTaskStatus = pgEnum("review_task_status", [
  "open",
  "resolved",
  "dismissed",
]);

export const reviewSeverity = pgEnum("review_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const applicationLinkStatus = pgEnum("application_link_status", [
  "unchecked",
  "current_and_open",
  "current_but_not_open",
  "closed",
  "old_edition",
  "generic_homepage",
  "results_page",
  "login_only",
  "broken",
  "redirected",
  "blocked",
  "unknown",
]);

export const brazilEligibilityStatus = pgEnum("brazil_eligibility_status", [
  "eligible",
  "likely_eligible",
  "ineligible",
  "unknown",
  "conflicting",
]);

export const deadlinePrecision = pgEnum("deadline_precision", [
  "date_only",
  "local_time",
  "instant",
  "rolling",
  "unknown",
]);

export const semanticFieldState = pgEnum("semantic_field_state", [
  "explicit_value",
  "explicitly_unrestricted",
  "not_applicable",
  "not_stated",
  "unresolved",
  "conflicting",
  "extraction_failed",
  "pending_verification",
  "suppressed",
]);

export const fieldApplicability = pgEnum("field_applicability", [
  "required",
  "conditionally_required",
  "optional",
  "not_applicable",
  "unknown_applicability",
]);

export const sourceCoverageState = pgEnum("source_coverage_state", [
  "complete",
  "sufficient",
  "partial",
  "incomplete",
  "blocked",
  "unknown",
]);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canonicalName: text("canonical_name").notNull(),
    aliases: text("aliases").array().default([]).notNull(),
    organizationType: text("organization_type"),
    countryCode: text("country_code"),
    officialDomains: text("official_domains").array().default([]).notNull(),
    verified: boolean("verified").default(false).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("organizations_canonical_name_key").on(table.canonicalName),
  ]
);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    name: text("name").notNull(),
    baseUrl: text("base_url").notNull(),
    sourceType: text("source_type").notNull(),
    authorityTier: smallint("authority_tier").notNull(),
    language: text("language").default("pt-BR").notNull(),
    allowedPaths: text("allowed_paths").array().default([]).notNull(),
    blockedPaths: text("blocked_paths").array().default([]).notNull(),
    discoveryMethods: text("discovery_methods").array().default([]).notNull(),
    crawlIntervalHours: integer("crawl_interval_hours").notNull(),
    rateLimitPerMinute: integer("rate_limit_per_minute").notNull(),
    concurrencyLimit: integer("concurrency_limit").notNull(),
    renderingPolicy: text("rendering_policy").notNull(),
    adapterName: text("adapter_name"),
    adapterVersion: text("adapter_version"),
    expectedCycles: text("expected_cycles").array().default([]).notNull(),
    expectedPageRoles: text("expected_page_roles")
      .array()
      .default([])
      .notNull(),
    reviewOwner: text("review_owner"),
    healthState: text("health_state").default("unknown").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    lastSuccessAt: timestamp("last_success_at", {
      withTimezone: true,
      mode: "date",
    }),
    lastChangeAt: timestamp("last_change_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("sources_base_url_key").on(table.baseUrl)]
);

export const sourceDocuments = pgTable(
  "source_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id),
    url: text("url").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    documentRole: text("document_role").default("unknown").notNull(),
    contentType: text("content_type"),
    firstSeenAt: timestamp("first_seen_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", {
      withTimezone: true,
      mode: "date",
    }),
    lastChangedAt: timestamp("last_changed_at", {
      withTimezone: true,
      mode: "date",
    }),
    operationalState: text("operational_state").default("discovered").notNull(),
    programHint: text("program_hint"),
    editionHint: text("edition_hint"),
  },
  (table) => [
    uniqueIndex("source_documents_source_canonical_key").on(
      table.sourceId,
      table.canonicalUrl
    ),
    index("source_documents_due_idx").on(
      table.operationalState,
      table.lastSeenAt
    ),
  ]
);

export const snapshots = pgTable(
  "snapshots",
  {
    id: uuid("id").primaryKey(),
    sourceDocumentId: uuid("source_document_id")
      .notNull()
      .references(() => sourceDocuments.id),
    fetchedAt: timestamp("fetched_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    finalUrl: text("final_url").notNull(),
    statusCode: smallint("status_code").notNull(),
    headers: jsonb("headers")
      .$type<Record<string, string>>()
      .default({})
      .notNull(),
    fetchMode: text("fetch_mode").notNull(),
    contentHash: text("content_hash").notNull(),
    semanticHash: text("semantic_hash"),
    storageKey: text("storage_key").notNull(),
    rawContent: text("raw_content"),
    redirectChain: jsonb("redirect_chain")
      .$type<string[]>()
      .default([])
      .notNull(),
    extractorVersion: text("extractor_version"),
    elapsedMs: integer("elapsed_ms"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("snapshots_document_content_key").on(
      table.sourceDocumentId,
      table.contentHash
    ),
    index("snapshots_document_fetched_idx").on(
      table.sourceDocumentId,
      table.fetchedAt
    ),
  ]
);

export const extractionRuns = pgTable(
  "extraction_runs",
  {
    id: uuid("id").primaryKey(),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => snapshots.id),
    pipelineVersion: text("pipeline_version").notNull(),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
    pageRole: text("page_role").notNull(),
    status: text("status").notNull(),
    errorType: text("error_type"),
    durationMs: integer("duration_ms"),
    assertionCount: integer("assertion_count").default(0).notNull(),
  },
  (table) => [index("extraction_runs_snapshot_idx").on(table.snapshotId)]
);

export const programs = pgTable(
  "programs",
  {
    id: uuid("id").primaryKey(),
    canonicalName: text("canonical_name").notNull(),
    aliases: text("aliases").array().default([]).notNull(),
    organizerId: uuid("organizer_id").references(() => organizations.id),
    opportunityTypes: text("opportunity_types").array().default([]).notNull(),
    subjectAreas: text("subject_areas").array().default([]).notNull(),
    typicalCycle: text("typical_cycle"),
    officialHomepage: text("official_homepage"),
    active: boolean("active").default(true).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("programs_canonical_name_idx").on(table.canonicalName),
    index("programs_organizer_idx").on(table.organizerId),
  ]
);

export const editions = pgTable(
  "editions",
  {
    id: uuid("id").primaryKey(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id),
    identityKey: text("identity_key").notNull(),
    editionLabel: text("edition_label").notNull(),
    editionYear: integer("edition_year"),
    cycle: text("cycle"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    status: lifecycleState("status").default("unknown").notNull(),
    firstSeenAt: timestamp("first_seen_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    lastVerifiedAt: timestamp("last_verified_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    uniqueIndex("editions_program_identity_key").on(
      table.programId,
      table.identityKey
    ),
    index("editions_status_idx").on(table.status, table.lastVerifiedAt),
  ]
);

export const editionSourceDocuments = pgTable(
  "edition_source_documents",
  {
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id),
    sourceDocumentId: uuid("source_document_id")
      .notNull()
      .references(() => sourceDocuments.id),
    relationshipRole: text("relationship_role").notNull(),
    authoritative: boolean("authoritative").default(false).notNull(),
    firstLinkedAt: timestamp("first_linked_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.editionId,
        table.sourceDocumentId,
        table.relationshipRole,
      ],
    }),
    index("edition_source_documents_document_idx").on(table.sourceDocumentId),
  ]
);

export const applicationRounds = pgTable(
  "application_rounds",
  {
    id: uuid("id").primaryKey(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id),
    roundKey: text("round_key").notNull(),
    roundName: text("round_name").notNull(),
    opensAt: timestamp("opens_at", {
      withTimezone: true,
      mode: "date",
    }),
    deadlineDate: date("deadline_date"),
    deadlineTime: time("deadline_time"),
    deadlineTimezone: text("deadline_timezone"),
    deadlinePrecision: deadlinePrecision("deadline_precision")
      .default("unknown")
      .notNull(),
    deadlineType: text("deadline_type").notNull(),
    applicationUrl: text("application_url"),
    status: lifecycleState("status").default("unknown").notNull(),
    region: text("region"),
    audience: text("audience").array().default([]).notNull(),
    supersedesRoundId: uuid("supersedes_round_id").references(
      (): AnyPgColumn => applicationRounds.id
    ),
  },
  (table) => [
    uniqueIndex("application_rounds_edition_key").on(
      table.editionId,
      table.roundKey
    ),
    index("application_rounds_deadline_idx").on(
      table.status,
      table.deadlineDate
    ),
  ]
);

export const fieldAssertions = pgTable(
  "field_assertions",
  {
    id: uuid("id").primaryKey(),
    extractionRunId: uuid("extraction_run_id")
      .notNull()
      .references(() => extractionRuns.id),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => snapshots.id),
    sourceDocumentId: uuid("source_document_id")
      .notNull()
      .references(() => sourceDocuments.id),
    fieldName: text("field_name").notNull(),
    normalizedValue: jsonb("normalized_value").$type<unknown>(),
    rawValue: text("raw_value").notNull(),
    evidenceText: text("evidence_text"),
    evidenceLocator: text("evidence_locator"),
    extractor: text("extractor").notNull(),
    sourceAuthority: smallint("source_authority").notNull(),
    documentRole: text("document_role").notNull(),
    assertedAt: timestamp("asserted_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    validFrom: timestamp("valid_from", {
      withTimezone: true,
      mode: "date",
    }),
    validUntil: timestamp("valid_until", {
      withTimezone: true,
      mode: "date",
    }),
    editionSignal: text("edition_signal"),
    validationStatus: text("validation_status").notNull(),
    critical: boolean("critical").default(false).notNull(),
    supersedesAssertionId: uuid("supersedes_assertion_id").references(
      (): AnyPgColumn => fieldAssertions.id
    ),
  },
  (table) => [
    index("field_assertions_field_idx").on(table.fieldName, table.assertedAt),
    index("field_assertions_document_idx").on(
      table.sourceDocumentId,
      table.fieldName
    ),
  ]
);

export const resolvedFields = pgTable(
  "resolved_fields",
  {
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    fieldName: text("field_name").notNull(),
    resolvedValue: jsonb("resolved_value").$type<unknown>(),
    selectedAssertionIds: uuid("selected_assertion_ids")
      .array()
      .default([])
      .notNull(),
    alternativeAssertionIds: uuid("alternative_assertion_ids")
      .array()
      .default([])
      .notNull(),
    conflict: boolean("conflict").default(false).notNull(),
    resolutionReason: text("resolution_reason").notNull(),
    selectedAuthority: smallint("selected_authority"),
    resolvedAt: timestamp("resolved_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.entityType, table.entityId, table.fieldName],
    }),
  ]
);

export const eligibilityProfiles = pgTable("eligibility_profiles", {
  editionId: uuid("edition_id")
    .primaryKey()
    .references(() => editions.id),
  brazilStatus: brazilEligibilityStatus("brazil_status").notNull(),
  citizenshipScope: text("citizenship_scope").notNull(),
  residenceScope: text("residence_scope").notNull(),
  includedNationalities: text("included_nationalities")
    .array()
    .default([])
    .notNull(),
  excludedNationalities: text("excluded_nationalities")
    .array()
    .default([])
    .notNull(),
  eligibleRegions: text("eligible_regions").array().default([]).notNull(),
  residenceRegions: text("residence_regions").array().default([]).notNull(),
  schoolLocationRequirements: text("school_location_requirements")
    .array()
    .default([])
    .notNull(),
  educationLevels: text("education_levels").array().default([]).notNull(),
  gradeRequirements: text("grade_requirements").array().default([]).notNull(),
  institutionalRestrictions: text("institutional_restrictions")
    .array()
    .default([])
    .notNull(),
  languageRequirements: text("language_requirements")
    .array()
    .default([])
    .notNull(),
  otherRequirements: text("other_requirements").array().default([]).notNull(),
  sourceAssertionIds: uuid("source_assertion_ids")
    .array()
    .default([])
    .notNull(),
  conflictingAssertionIds: uuid("conflicting_assertion_ids")
    .array()
    .default([])
    .notNull(),
  unknowns: text("unknowns").array().default([]).notNull(),
  interpretedAt: timestamp("interpreted_at", {
    withTimezone: true,
    mode: "date",
  })
    .defaultNow()
    .notNull(),
});

export const eligibilityAgeRules = pgTable(
  "eligibility_age_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id),
    identityKey: text("identity_key").notNull(),
    minimumAge: smallint("minimum_age"),
    maximumAge: smallint("maximum_age"),
    minimumInclusive: boolean("minimum_inclusive").default(true).notNull(),
    maximumInclusive: boolean("maximum_inclusive").default(true).notNull(),
    exactAge: smallint("exact_age"),
    birthdateStart: date("birthdate_start"),
    birthdateEnd: date("birthdate_end"),
    birthdateStartInclusive: boolean("birthdate_start_inclusive")
      .default(true)
      .notNull(),
    birthdateEndInclusive: boolean("birthdate_end_inclusive")
      .default(true)
      .notNull(),
    referenceType: text("reference_type").notNull(),
    referenceDate: date("reference_date"),
    sourceText: text("source_text").notNull(),
    sourceAssertionIds: uuid("source_assertion_ids")
      .array()
      .default([])
      .notNull(),
  },
  (table) => [
    uniqueIndex("eligibility_age_rules_identity_key").on(
      table.editionId,
      table.identityKey
    ),
  ]
);

export const applicationLinkAssessments = pgTable(
  "application_link_assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationRoundId: uuid("application_round_id")
      .notNull()
      .references(() => applicationRounds.id),
    status: applicationLinkStatus("status").notNull(),
    originalUrl: text("original_url"),
    finalUrl: text("final_url"),
    httpStatus: smallint("http_status"),
    documentRole: text("document_role"),
    editionYear: integer("edition_year"),
    acceptsSubmissions: boolean("accepts_submissions"),
    redirectChain: text("redirect_chain").array().default([]).notNull(),
    checkedAt: timestamp("checked_at", {
      withTimezone: true,
      mode: "date",
    }),
    reasons: text("reasons").array().default([]).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("application_link_assessments_round_idx").on(
      table.applicationRoundId,
      table.createdAt
    ),
  ]
);

export const recrawlJobs = pgTable(
  "recrawl_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobKind: text("job_kind").notNull(),
    sourceId: uuid("source_id").references(() => sources.id),
    sourceDocumentId: uuid("source_document_id").references(
      () => sourceDocuments.id
    ),
    applicationRoundId: uuid("application_round_id").references(
      () => applicationRounds.id
    ),
    editionId: uuid("edition_id").references(() => editions.id),
    reason: text("reason").notNull(),
    priority: smallint("priority").notNull(),
    status: text("status").default("queued").notNull(),
    deduplicationKey: text("deduplication_key").notNull(),
    scheduledFor: timestamp("scheduled_for", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(5).notNull(),
    lockedAt: timestamp("locked_at", {
      withTimezone: true,
      mode: "date",
    }),
    lockedBy: text("locked_by"),
    leaseToken: uuid("lease_token"),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "date",
    }),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
    lastError: text("last_error"),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    requestedBy: text("requested_by").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("recrawl_jobs_deduplication_key").on(table.deduplicationKey),
    index("recrawl_jobs_due_idx").on(
      table.status,
      table.scheduledFor,
      table.priority
    ),
    index("recrawl_jobs_edition_idx").on(table.editionId, table.createdAt),
    index("recrawl_jobs_source_run_idx")
      .on(sql`(${table.payload}->>'source_run_id')`)
      .where(sql`${table.payload} ? 'source_run_id'`),
  ]
);

// BF-10: one supervised observation of a source. Delivery outcomes come from
// recrawl_jobs linked by payload.source_run_id; see source-runs.ts.
export const sourceRuns = pgTable(
  "source_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id),
    trigger: text("trigger").notNull(),
    requestedBy: text("requested_by").notNull(),
    adapterVersion: text("adapter_version"),
    status: text("status")
      .$type<"running" | "healthy" | "degraded" | "failed">()
      .default("running")
      .notNull(),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", {
      withTimezone: true,
      mode: "date",
    }),
    discoveryCompleted: boolean("discovery_completed").default(false).notNull(),
    pagesExpected: integer("pages_expected").default(0).notNull(),
    pagesAttempted: integer("pages_attempted").default(0).notNull(),
    pagesSucceeded: integer("pages_succeeded").default(0).notNull(),
    pagesFailed: integer("pages_failed").default(0).notNull(),
    candidatesDiscovered: integer("candidates_discovered").default(0).notNull(),
    candidatesValid: integer("candidates_valid").default(0).notNull(),
    candidatesRejected: integer("candidates_rejected").default(0).notNull(),
    ingestionSuccesses: integer("ingestion_successes").default(0).notNull(),
    ingestionFailures: integer("ingestion_failures").default(0).notNull(),
    reconciliationEligible: boolean("reconciliation_eligible")
      .default(false)
      .notNull(),
    errorCategories: text("error_categories").array().default([]).notNull(),
    errorSummary: text("error_summary"),
    report: jsonb("report")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
  },
  (table) => [
    index("source_runs_source_started_idx").on(table.sourceId, table.startedAt),
    uniqueIndex("source_runs_one_running_per_source")
      .on(table.sourceId)
      .where(sql`${table.status} = 'running'`),
    check(
      "source_runs_status_check",
      sql`${table.status} IN ('running', 'healthy', 'degraded', 'failed')`
    ),
    check(
      "source_runs_eligible_only_when_healthy_check",
      sql`NOT ${table.reconciliationEligible} OR ${table.status} = 'healthy'`
    ),
    check(
      "source_runs_finished_when_terminal_check",
      sql`(${table.status} = 'running') = (${table.finishedAt} IS NULL)`
    ),
  ]
);

export const productFitAssessments = pgTable(
  "product_fit_assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id),
    decision: text("decision").notNull(),
    reasons: text("reasons").array().default([]).notNull(),
    explanations: text("explanations").array().default([]).notNull(),
    evidenceAssertionIds: uuid("evidence_assertion_ids")
      .array()
      .default([])
      .notNull(),
    siteCollection: text("site_collection").notNull(),
    mappedOpportunityTypes: text("mapped_opportunity_types")
      .array()
      .default([])
      .notNull(),
    mappedEducationLevels: text("mapped_education_levels")
      .array()
      .default([])
      .notNull(),
    unmappedValues: text("unmapped_values").array().default([]).notNull(),
    siteContractCompatible: boolean("site_contract_compatible")
      .default(false)
      .notNull(),
    measuredCohortEligible: boolean("measured_cohort_eligible")
      .default(false)
      .notNull(),
    assessedAt: timestamp("assessed_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("product_fit_assessments_edition_idx").on(
      table.editionId,
      table.assessedAt
    ),
  ]
);

export const reviewTasks = pgTable(
  "review_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    fieldName: text("field_name").notNull(),
    reason: text("reason").notNull(),
    severity: reviewSeverity("severity").notNull(),
    candidateAssertionIds: uuid("candidate_assertion_ids")
      .array()
      .default([])
      .notNull(),
    suggestedValue: jsonb("suggested_value").$type<unknown>(),
    previousValue: jsonb("previous_value").$type<unknown>(),
    explanation: text("explanation").notNull(),
    status: reviewTaskStatus("status").default("open").notNull(),
    reviewerId: uuid("reviewer_id").references(() => users.id),
    resolution: text("resolution"),
    createdAt: createdAt(),
    resolvedAt: timestamp("resolved_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    index("review_tasks_open_idx").on(
      table.status,
      table.severity,
      table.createdAt
    ),
  ]
);

export const reviewerCorrections = pgTable(
  "reviewer_corrections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewTaskId: uuid("review_task_id").references(() => reviewTasks.id),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id),
    fieldName: text("field_name").notNull(),
    assertionId: uuid("assertion_id")
      .notNull()
      .references(() => fieldAssertions.id),
    previousValue: jsonb("previous_value").$type<unknown>(),
    correctedValue: jsonb("corrected_value").$type<unknown>(),
    correctionReason: text("correction_reason").notNull(),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (table) => [
    index("reviewer_corrections_edition_idx").on(
      table.editionId,
      table.createdAt
    ),
  ]
);

export const publicationVersions = pgTable(
  "publication_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id),
    version: integer("version").notNull(),
    editorialState: editorialState("editorial_state")
      .default("draft")
      .notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    compatibilityPayload: jsonb("compatibility_payload")
      .$type<Record<string, unknown>>()
      .notNull(),
    supportingAssertionIds: uuid("supporting_assertion_ids")
      .array()
      .default([])
      .notNull(),
    createdAt: createdAt(),
    createdBy: text("created_by").notNull(),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", {
      withTimezone: true,
      mode: "date",
    }),
    supersedesVersionId: uuid("supersedes_version_id").references(
      (): AnyPgColumn => publicationVersions.id
    ),
  },
  (table) => [
    uniqueIndex("publication_versions_edition_version_key").on(
      table.editionId,
      table.version
    ),
  ]
);

export const fieldSemanticStates = pgTable(
  "field_semantic_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id),
    publicationVersionId: uuid("publication_version_id")
      .notNull()
      .references(() => publicationVersions.id),
    extractionRunId: uuid("extraction_run_id").references(
      () => extractionRuns.id
    ),
    fieldName: text("field_name").notNull(),
    state: semanticFieldState("semantic_state").notNull(),
    value: jsonb("value").$type<unknown>(),
    criticality: text("criticality").notNull(),
    reasonCode: text("reason_code").notNull(),
    publicExplanation: text("public_explanation").notNull(),
    supportingAssertionIds: uuid("supporting_assertion_ids")
      .array()
      .default([])
      .notNull(),
    alternativeAssertionIds: uuid("alternative_assertion_ids")
      .array()
      .default([])
      .notNull(),
    conflictingAssertionIds: uuid("conflicting_assertion_ids")
      .array()
      .default([])
      .notNull(),
    gateImpact: text("gate_impact").default("none").notNull(),
    resolvedAt: timestamp("resolved_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    lastVerifiedAt: timestamp("last_verified_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    uniqueIndex("field_semantic_states_version_field_key").on(
      table.publicationVersionId,
      table.fieldName
    ),
    index("field_semantic_states_edition_field_idx").on(
      table.editionId,
      table.fieldName,
      table.resolvedAt
    ),
    index("field_semantic_states_state_gate_idx").on(
      table.state,
      table.gateImpact
    ),
  ]
);

export const fieldApplicabilityAssessments = pgTable(
  "field_applicability_assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    semanticStateId: uuid("semantic_state_id")
      .notNull()
      .references(() => fieldSemanticStates.id),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id),
    fieldName: text("field_name").notNull(),
    applicability: fieldApplicability("applicability").notNull(),
    reasonCode: text("reason_code").notNull(),
    evidenceAssertionIds: uuid("evidence_assertion_ids")
      .array()
      .default([])
      .notNull(),
    assessedAt: timestamp("assessed_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("field_applicability_semantic_key").on(table.semanticStateId),
    index("field_applicability_edition_field_idx").on(
      table.editionId,
      table.fieldName
    ),
  ]
);

export const fieldSourceCoverage = pgTable(
  "field_source_coverage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    semanticStateId: uuid("semantic_state_id")
      .notNull()
      .references(() => fieldSemanticStates.id),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id),
    fieldName: text("field_name").notNull(),
    coverageState: sourceCoverageState("coverage_state").notNull(),
    checkedSourceRoles: text("checked_source_roles")
      .array()
      .default([])
      .notNull(),
    uncheckedSourceRoles: text("unchecked_source_roles")
      .array()
      .default([])
      .notNull(),
    failureCodes: text("failure_codes").array().default([]).notNull(),
    authoritativeSourcesChecked: integer("authoritative_sources_checked")
      .default(0)
      .notNull(),
    unprocessedOfficialDocuments: boolean("unprocessed_official_documents")
      .default(false)
      .notNull(),
    assessedAt: timestamp("assessed_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("field_source_coverage_semantic_key").on(table.semanticStateId),
    index("field_source_coverage_edition_field_idx").on(
      table.editionId,
      table.fieldName,
      table.coverageState
    ),
  ]
);

export const fieldDisplayProjections = pgTable(
  "field_display_projections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    semanticStateId: uuid("semantic_state_id")
      .notNull()
      .references(() => fieldSemanticStates.id),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id),
    fieldName: text("field_name").notNull(),
    locale: text("locale").default("pt-BR").notNull(),
    displayKey: text("display_key").notNull(),
    displayParameters: jsonb("display_parameters")
      .$type<Record<string, string | number | boolean | null>>()
      .default({})
      .notNull(),
    displayText: text("display_text").notNull(),
    publicVisible: boolean("public_visible").default(true).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("field_display_semantic_locale_key").on(
      table.semanticStateId,
      table.locale
    ),
    index("field_display_edition_field_idx").on(
      table.editionId,
      table.fieldName
    ),
  ]
);

export const publicationGateDecisions = pgTable(
  "publication_gate_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id),
    publicationVersionId: uuid("publication_version_id")
      .notNull()
      .references(() => publicationVersions.id),
    productFitAssessmentId: uuid("product_fit_assessment_id").references(
      () => productFitAssessments.id
    ),
    outcome: publicationGateOutcome("outcome").notNull(),
    reasons: text("reasons").array().default([]).notNull(),
    blockingFields: text("blocking_fields").array().default([]).notNull(),
    explanations: text("explanations").array().default([]).notNull(),
    sourceCohort: text("source_cohort"),
    sourceCohortMeasured: boolean("source_cohort_measured")
      .default(false)
      .notNull(),
    decidedAt: timestamp("decided_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("publication_gate_decisions_edition_idx").on(
      table.editionId,
      table.decidedAt
    ),
  ]
);

export const materialChangeEvents = pgTable(
  "material_change_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id),
    publicationVersionId: uuid("publication_version_id").references(
      () => publicationVersions.id
    ),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => snapshots.id),
    fieldName: text("field_name").notNull(),
    previousValue: jsonb("previous_value").$type<unknown>(),
    currentValue: jsonb("current_value").$type<unknown>(),
    previousAssertionIds: uuid("previous_assertion_ids")
      .array()
      .default([])
      .notNull(),
    currentAssertionIds: uuid("current_assertion_ids")
      .array()
      .default([])
      .notNull(),
    severity: reviewSeverity("severity").notNull(),
    reviewTaskId: uuid("review_task_id").references(() => reviewTasks.id),
    detectedAt: timestamp("detected_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    acknowledgedAt: timestamp("acknowledged_at", {
      withTimezone: true,
      mode: "date",
    }),
    acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
  },
  (table) => [
    index("material_change_events_edition_idx").on(
      table.editionId,
      table.detectedAt
    ),
  ]
);

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    deduplicationKey: text("deduplication_key").notNull(),
    createdAt: createdAt(),
    availableAt: timestamp("available_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "date",
    }),
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("last_error"),
    lockedAt: timestamp("locked_at", {
      withTimezone: true,
      mode: "date",
    }),
    lockedBy: text("locked_by"),
    deadLetteredAt: timestamp("dead_lettered_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    uniqueIndex("outbox_events_deduplication_key").on(table.deduplicationKey),
    index("outbox_events_pending_idx").on(table.publishedAt, table.availableAt),
  ]
);

export const idempotencyRequests = pgTable(
  "idempotency_requests",
  {
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    responseStatus: smallint("response_status"),
    responseBody: jsonb("response_body").$type<Record<string, unknown>>(),
    state: text("state").default("processing").notNull(),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.scope, table.key] }),
    index("idempotency_requests_expiry_idx").on(table.expiresAt),
  ]
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").notNull(),
    actorKind: text("actor_kind").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("audit_events_entity_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt
    ),
  ]
);

export const applicationFees = pgTable("application_fees", {
  editionId: uuid("edition_id")
    .primaryKey()
    .references(() => editions.id),
  isFree: boolean("is_free"),
  applicationFeeAmount: numeric("application_fee_amount", {
    precision: 14,
    scale: 2,
  }),
  programFeeAmount: numeric("program_fee_amount", {
    precision: 14,
    scale: 2,
  }),
  currency: text("currency"),
  mandatoryExtraCosts: jsonb("mandatory_extra_costs")
    .$type<Array<{ amount?: string; currency?: string; label: string }>>()
    .default([])
    .notNull(),
  funding: jsonb("funding")
    .$type<{
      accommodationCovered?: boolean;
      full?: boolean;
      mealsCovered?: boolean;
      partial?: boolean;
      stipend?: { amount?: string; currency?: string; frequency?: string };
      travelCovered?: boolean;
    }>()
    .default({})
    .notNull(),
  benefits: text("benefits").array().default([]).notNull(),
  sourceAssertionIds: uuid("source_assertion_ids")
    .array()
    .default([])
    .notNull(),
});
