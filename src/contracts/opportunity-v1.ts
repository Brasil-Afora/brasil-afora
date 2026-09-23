import { z } from "zod";

export const OPPORTUNITY_CONTRACT_VERSION = "1.0" as const;

export const lifecycleStateSchema = z.enum([
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

export const editorialStateSchema = z.enum([
  "draft",
  "needs_review",
  "approved",
  "published",
  "update_pending",
  "rejected",
  "archived",
  "unpublished",
]);

export const publicationGateOutcomeSchema = z.enum([
  "auto_ready",
  "manual_review",
  "reject",
  "expired_archive",
]);

export const semanticFieldStateSchema = z.enum([
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

export const sourceCoverageStateSchema = z.enum([
  "complete",
  "sufficient",
  "partial",
  "incomplete",
  "blocked",
  "unknown",
]);

export const fieldApplicabilitySchema = z.enum([
  "required",
  "conditionally_required",
  "optional",
  "not_applicable",
  "unknown_applicability",
]);

export const fieldCriticalitySchema = z.enum([
  "critical",
  "conditional",
  "noncritical",
]);

export const gateImpactSchema = z.enum(["none", "review", "block"]);

export const documentRoleSchema = z.enum([
  "opportunity_detail",
  "application_portal",
  "application_form",
  "listing",
  "news_announcement",
  "results_announcement",
  "program_homepage",
  "pdf_notice",
  "correction_notice",
  "social_post",
  "generic_organization_page",
  "login_wall",
  "error_page",
  "unknown",
]);

export const brazilEligibilityStatusSchema = z.enum([
  "eligible",
  "likely_eligible",
  "ineligible",
  "unknown",
  "conflicting",
]);

export const educationLevelSchema = z.enum([
  "elementary_middle",
  "international_secondary",
  "high_school",
  "technical_secondary",
  "gap_year",
  "undergraduate",
  "graduate",
  "recent_graduate",
  "teacher_educator",
  "school_team",
  "university_team",
  "institution",
]);

export const opportunityTypeSchema = z.enum([
  "academic_mobility",
  "competition",
  "conference",
  "cultural_exchange",
  "degree",
  "fellowship",
  "internship",
  "language_course",
  "leadership_program",
  "mentorship",
  "model_un",
  "olympiad",
  "research",
  "scholarship",
  "science_fair",
  "short_course",
  "summer_program",
  "volunteering",
  "work_program",
  "workshop",
  "unknown",
]);

export const modalitySchema = z.enum([
  "in_person",
  "online",
  "hybrid",
  "unknown",
]);

export const opportunityCollectionSchema = z.enum([
  "international",
  "national",
  "unknown",
]);
export const publicApplicationLinkStatusSchema = z.enum([
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

export const OPPORTUNITY_DISPLAY_LABELS = {
  collection: {
    international: "Internacional",
    national: "Nacional",
    unknown: "Coleção em verificação",
  },
  modality: {
    hybrid: "Híbrido",
    in_person: "Presencial",
    online: "Online",
    unknown: "Modalidade em verificação",
  },
  opportunityType: {
    academic_mobility: "Mobilidade acadêmica",
    competition: "Competição",
    conference: "Conferência",
    cultural_exchange: "Intercâmbio cultural",
    degree: "Graduação",
    fellowship: "Fellowship",
    internship: "Estágio/Trabalho",
    language_course: "Curso de idiomas",
    leadership_program: "Programas de Liderança",
    mentorship: "Programas de Mentoria",
    model_un: "Simulações da ONU",
    olympiad: "Olimpíadas",
    research: "Pesquisa",
    scholarship: "Bolsa de estudos",
    science_fair: "Feiras de Ciências",
    short_course: "Curso curta duração",
    summer_program: "Curso de verão",
    unknown: "Tipo de oportunidade em verificação",
    volunteering: "Voluntariado/Social",
    work_program: "Programa de trabalho",
    workshop: "Evento/Workshop",
  },
} as const;

const uuidSchema = z.uuid();
const dateSchema = z.iso.date();
const datetimeSchema = z.iso.datetime({ offset: true });
const httpUrlSchema = z
  .url()
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    {
      message: "URL must use http or https",
    }
  );
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const nonEmptyText = z.string().trim().min(1);
const stringListSchema = z.array(nonEmptyText).max(250);
const authorityTierSchema = z.union([
  z.literal(10),
  z.literal(20),
  z.literal(40),
  z.literal(60),
  z.literal(75),
  z.literal(90),
  z.literal(100),
]);
const assertionValueSchema = z.json();

export const pageSnapshotSchema = z
  .object({
    id: uuidSchema,
    source_document_id: uuidSchema.nullable(),
    url: httpUrlSchema,
    final_url: httpUrlSchema,
    fetched_at: datetimeSchema,
    status_code: z.number().int().min(100).max(599),
    content_type: z.string().max(500),
    headers: z.record(z.string(), z.string()),
    html: z.string(),
    content_sha256: hashSchema,
    semantic_sha256: hashSchema.nullable(),
    storage_key: z.string().trim().min(1).max(1000).nullable(),
    redirect_chain: z.array(httpUrlSchema).max(20),
    extractor_version: z.string().trim().min(1).max(100).nullable(),
    render_mode: z.enum(["http", "browser", "provided"]),
    elapsed_ms: z.number().int().nonnegative().nullable(),
  })
  .strict();

export const sourceSchema = z
  .object({
    id: uuidSchema,
    organization_id: uuidSchema.nullable(),
    name: z.string().trim().min(2).max(300),
    base_url: httpUrlSchema,
    source_type: z.enum([
      "website",
      "sitemap",
      "feed",
      "application_platform",
      "document_repository",
      "public_api",
      "manual",
    ]),
    authority_tier: authorityTierSchema,
    language: z.string().trim().min(2).max(20),
    allowed_paths: stringListSchema,
    blocked_paths: stringListSchema,
    discovery_methods: stringListSchema,
    crawl_interval_hours: z.number().int().min(1).max(8760),
    rate_limit_per_minute: z.number().int().min(1).max(600),
    concurrency_limit: z.number().int().min(1).max(32),
    rendering_policy: z.enum(["never", "fallback", "always"]),
    adapter_name: z.string().trim().min(1).max(200).nullable(),
    adapter_version: z.string().trim().min(1).max(100).nullable(),
    expected_cycles: stringListSchema,
    review_owner: z.string().trim().min(1).max(200).nullable(),
    enabled: z.boolean(),
  })
  .strict();

export const sourceDocumentSchema = z
  .object({
    id: uuidSchema,
    source_id: uuidSchema,
    url: httpUrlSchema,
    canonical_url: httpUrlSchema,
    document_role: documentRoleSchema,
    content_type: z.string().max(500).nullable(),
    first_seen_at: datetimeSchema,
    last_seen_at: datetimeSchema.nullable(),
    last_changed_at: datetimeSchema.nullable(),
    state: z.enum([
      "discovered",
      "queued",
      "fetching",
      "fetched",
      "unchanged",
      "parsed",
      "failed_transiently",
      "failed_permanently",
      "blocked_by_policy",
      "extraction_failed",
    ]),
    program_hint: z.string().trim().min(1).max(300).nullable(),
    edition_hint: z.string().trim().min(1).max(100).nullable(),
  })
  .strict();

export const extractionRunSchema = z
  .object({
    id: uuidSchema,
    snapshot_id: uuidSchema,
    pipeline_version: z.string().trim().min(1).max(100),
    started_at: datetimeSchema,
    completed_at: datetimeSchema.nullable(),
    page_role: documentRoleSchema,
    status: z.enum(["running", "succeeded", "skipped_unchanged", "failed"]),
    error_type: z.string().trim().min(1).max(300).nullable(),
    duration_ms: z.number().int().nonnegative().nullable(),
    assertion_count: z.number().int().nonnegative(),
  })
  .strict();

export const fieldAssertionSchema = z
  .object({
    id: uuidSchema,
    extraction_run_id: uuidSchema,
    snapshot_id: uuidSchema,
    source_document_id: uuidSchema,
    field_name: z.string().trim().min(1).max(100),
    normalized_value: assertionValueSchema,
    raw_value: z.string().max(10_000),
    evidence_text: z.string().max(2000).nullable(),
    evidence_locator: z.string().max(500).nullable(),
    extractor: z.string().trim().min(1).max(100),
    source_authority: authorityTierSchema,
    document_role: documentRoleSchema,
    asserted_at: datetimeSchema,
    valid_from: datetimeSchema.nullable(),
    valid_until: datetimeSchema.nullable(),
    edition_signal: z.string().trim().min(1).max(100).nullable(),
    validation_status: z.enum([
      "valid",
      "invalid",
      "needs_review",
      "unchecked",
    ]),
    critical: z.boolean(),
    supersedes_assertion_id: uuidSchema.nullable(),
  })
  .strict();

export const resolvedFieldSchema = z
  .object({
    field_name: z.string().trim().min(1).max(100),
    value: assertionValueSchema,
    selected_assertion_ids: z.array(uuidSchema),
    alternative_assertion_ids: z.array(uuidSchema),
    conflict: z.boolean(),
    resolution_reason: nonEmptyText,
    selected_authority: authorityTierSchema.nullable(),
  })
  .strict();

export const fieldSourceCoverageSchema = z
  .object({
    state: sourceCoverageStateSchema,
    checked_source_roles: z.array(documentRoleSchema),
    unchecked_source_roles: z.array(documentRoleSchema),
    failure_codes: stringListSchema,
    authoritative_sources_checked: z.number().int().nonnegative(),
    unprocessed_official_documents: z.boolean(),
    last_checked_at: datetimeSchema.nullable(),
  })
  .strict();

export const semanticFieldResolutionSchema = z
  .object({
    field_name: z.string().trim().min(1).max(100),
    state: semanticFieldStateSchema,
    value: z.unknown(),
    applicability: fieldApplicabilitySchema,
    applicability_reason_code: z.string().trim().min(1).max(200),
    criticality: fieldCriticalitySchema,
    display_key: z.string().trim().min(1).max(200),
    display_parameters: z.record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()])
    ),
    public_explanation: z.string().trim().min(1).max(2000),
    reason_code: z.string().trim().min(1).max(200),
    supporting_assertion_ids: z.array(uuidSchema),
    alternative_assertion_ids: z.array(uuidSchema),
    conflicting_assertion_ids: z.array(uuidSchema),
    source_coverage: fieldSourceCoverageSchema,
    gate_impact: gateImpactSchema,
    resolved_at: datetimeSchema,
    last_verified_at: datetimeSchema.nullable(),
  })
  .strict()
  .superRefine((field, context) => {
    if (
      field.state === "not_stated" &&
      !["complete", "sufficient"].includes(field.source_coverage.state)
    ) {
      context.addIssue({
        code: "custom",
        message: "not_stated requires sufficient authoritative-source coverage",
        path: ["source_coverage", "state"],
      });
    }
    if (
      field.state === "explicitly_unrestricted" &&
      field.supporting_assertion_ids.length === 0
    ) {
      context.addIssue({
        code: "custom",
        message: "explicitly_unrestricted requires source evidence",
        path: ["supporting_assertion_ids"],
      });
    }
    if (
      (field.state === "not_applicable") !==
      (field.applicability === "not_applicable")
    ) {
      context.addIssue({
        code: "custom",
        message:
          "not_applicable semantic state and applicability must be consistent",
        path: ["applicability"],
      });
    }
  });

export const organizationSchema = z
  .object({
    id: uuidSchema,
    canonical_name: z.string().trim().min(2).max(300),
    aliases: stringListSchema,
    organization_type: z.string().trim().min(1).max(100).nullable(),
    country: z.string().trim().min(1).max(100).nullable(),
    official_domains: stringListSchema,
    verified: z.boolean(),
  })
  .strict();

export const programSchema = z
  .object({
    id: uuidSchema,
    canonical_name: z.string().trim().min(2).max(300),
    aliases: stringListSchema,
    organizer_id: uuidSchema.nullable(),
    opportunity_types: stringListSchema,
    subject_areas: stringListSchema,
    typical_cycle: z.string().trim().min(1).max(100).nullable(),
    official_homepage: httpUrlSchema.nullable(),
    active: z.boolean(),
  })
  .strict();

export const editionSchema = z
  .object({
    id: uuidSchema,
    program_id: uuidSchema,
    edition_label: z.string().trim().min(1).max(200),
    edition_year: z.number().int().min(2000).max(2200).nullable(),
    cycle: z.string().trim().min(1).max(100).nullable(),
    start_date: dateSchema.nullable(),
    end_date: dateSchema.nullable(),
    status: lifecycleStateSchema,
    first_seen_at: datetimeSchema,
    last_verified_at: datetimeSchema.nullable(),
  })
  .strict()
  .refine(
    (edition) =>
      !(edition.start_date && edition.end_date) ||
      edition.start_date <= edition.end_date,
    {
      message: "Edition end date cannot precede its start date",
      path: ["end_date"],
    }
  );

export const applicationRoundSchema = z
  .object({
    id: uuidSchema,
    edition_id: uuidSchema,
    round_name: z.string().trim().min(1).max(200),
    opens_at: datetimeSchema.nullable(),
    deadline: datetimeSchema.nullable(),
    deadline_precision: z.enum(["date", "exact"]).nullable().optional(),
    deadline_type: z.enum([
      "fixed",
      "rolling",
      "until_filled",
      "not_announced",
      "nomination",
      "institution",
      "student",
    ]),
    application_url: httpUrlSchema.nullable(),
    status: lifecycleStateSchema,
    region: z.string().trim().min(1).max(200).nullable(),
    audience: stringListSchema,
    supersedes_round_id: uuidSchema.nullable(),
  })
  .strict();

export const ageRuleSchema = z
  .object({
    minimum_age: z.number().int().min(0).max(100).nullable(),
    maximum_age: z.number().int().min(0).max(100).nullable(),
    minimum_inclusive: z.boolean(),
    maximum_inclusive: z.boolean(),
    exact_age: z.number().int().min(0).max(100).nullable(),
    birthdate_start: dateSchema.nullable(),
    birthdate_end: dateSchema.nullable(),
    birthdate_start_inclusive: z.boolean(),
    birthdate_end_inclusive: z.boolean(),
    reference_type: z.enum([
      "fixed_date",
      "application_deadline",
      "program_start",
      "calendar_year_end",
      "unspecified",
    ]),
    reference_date: dateSchema.nullable(),
    source_text: z.string().trim().min(1).max(2000),
    source_assertion_ids: z.array(uuidSchema),
  })
  .strict()
  .superRefine((rule, context) => {
    const hasBoundary =
      rule.minimum_age !== null ||
      rule.maximum_age !== null ||
      rule.exact_age !== null ||
      rule.birthdate_start !== null ||
      rule.birthdate_end !== null;
    if (!hasBoundary) {
      context.addIssue({
        code: "custom",
        message: "Age rule must contain an age or birthdate boundary",
      });
    }
    if (
      rule.minimum_age !== null &&
      rule.maximum_age !== null &&
      rule.minimum_age > rule.maximum_age
    ) {
      context.addIssue({
        code: "custom",
        message: "Minimum age cannot exceed maximum age",
        path: ["maximum_age"],
      });
    }
    if (
      rule.birthdate_start &&
      rule.birthdate_end &&
      rule.birthdate_start > rule.birthdate_end
    ) {
      context.addIssue({
        code: "custom",
        message: "Birthdate start cannot follow birthdate end",
        path: ["birthdate_end"],
      });
    }
  });

export const eligibilityProfileSchema = z
  .object({
    brazil_status: brazilEligibilityStatusSchema,
    citizenship_scope: z.enum([
      "brazil_explicitly_accepted",
      "brazil_explicitly_excluded",
      "all_nationalities",
      "regional_inclusion",
      "restricted_nationalities",
      "international_unspecified",
      "not_stated",
      "conflicting",
    ]),
    residence_scope: z.enum([
      "brazil_required",
      "brazil_accepted",
      "other_region_required",
      "unrestricted",
      "not_stated",
      "conflicting",
    ]),
    included_nationalities: stringListSchema,
    excluded_nationalities: stringListSchema,
    eligible_regions: stringListSchema,
    residence_regions: stringListSchema,
    school_location_requirements: stringListSchema,
    education_levels: z.array(educationLevelSchema),
    grade_requirements: stringListSchema,
    age_rules: z.array(ageRuleSchema).max(50),
    institutional_restrictions: z.array(
      z.enum([
        "open_application",
        "partner_institution_only",
        "nomination_required",
        "brazilian_public_school",
        "brazilian_private_school",
        "brazilian_technical_school",
        "specific_institution",
        "member_organization_only",
        "teacher_recommendation",
        "team_registration",
      ])
    ),
    language_requirements: stringListSchema,
    other_requirements: stringListSchema,
    source_assertion_ids: z.array(uuidSchema),
    conflicting_assertion_ids: z.array(uuidSchema),
    unknowns: stringListSchema,
  })
  .strict();

export const applicationLinkAssessmentSchema = z
  .object({
    status: z.enum([
      "verified_current",
      "structurally_valid_unverified",
      "missing",
      "invalid",
      "generic_homepage",
      "wrong_edition",
      "results_page",
      "login_only",
      "closed",
    ]),
    original_url: httpUrlSchema.nullable(),
    final_url: httpUrlSchema.nullable(),
    http_status: z.number().int().min(100).max(599).nullable(),
    document_role: documentRoleSchema.nullable(),
    edition_year: z.number().int().min(2000).max(2200).nullable(),
    accepts_submissions: z.boolean().nullable(),
    checked_at: datetimeSchema.nullable(),
    reasons: stringListSchema,
  })
  .strict();

export const siteContractAssessmentSchema = z
  .object({
    collection: opportunityCollectionSchema,
    mapped_opportunity_types: stringListSchema,
    mapped_education_levels: stringListSchema,
    unmapped_values: stringListSchema,
    compatible: z.boolean(),
    reasons: stringListSchema,
  })
  .strict();

const productFitReasonSchema = z.enum([
  "brazil_explicitly_accepted",
  "all_nationalities",
  "latin_america_includes_brazil",
  "south_america_includes_brazil",
  "lusophone_region_includes_brazil",
  "mercosur_includes_brazil",
  "brazil_explicitly_excluded",
  "residence_in_brazil",
  "school_in_brazil",
  "residence_mismatch",
  "nationality_restricted",
  "international_scope_unclear",
  "eligibility_not_stated",
  "conflicting_sources",
  "age_reference_unclear",
  "age_rule_conflict",
  "education_equivalence_ambiguous",
  "institution_restricted",
  "deadline_passed",
  "application_not_open",
  "application_closed",
  "old_edition",
  "official_source_missing",
  "application_url_missing",
  "application_url_unverified",
  "application_url_invalid",
  "taxonomy_unmapped",
  "critical_field_conflict",
]);

export const productFitAssessmentSchema = z
  .object({
    decision: z.enum([
      "clearly_relevant",
      "probably_relevant",
      "needs_eligibility_review",
      "not_relevant",
      "expired_or_closed",
      "insufficient_information",
    ]),
    reasons: z.array(productFitReasonSchema),
    explanations: stringListSchema,
    evidence_assertion_ids: z.array(uuidSchema),
  })
  .strict();

export const publicationGateSchema = z
  .object({
    outcome: publicationGateOutcomeSchema,
    reasons: z.array(productFitReasonSchema),
    blocking_fields: stringListSchema,
    explanations: stringListSchema,
  })
  .strict();

export const reviewTaskSchema = z
  .object({
    id: uuidSchema,
    entity_type: nonEmptyText,
    entity_id: uuidSchema,
    field_name: nonEmptyText,
    reason: nonEmptyText,
    severity: z.enum(["low", "medium", "high", "critical"]),
    candidate_assertion_ids: z.array(uuidSchema),
    suggested_value: assertionValueSchema,
    previous_value: assertionValueSchema,
    explanation: nonEmptyText,
    status: z.enum(["open", "resolved", "dismissed"]),
    reviewer_id: z.string().trim().min(1).nullable(),
    resolution: z.string().trim().min(1).nullable(),
    created_at: datetimeSchema,
    resolved_at: datetimeSchema.nullable(),
  })
  .strict();

const evidenceSchema = z
  .object({
    source: nonEmptyText,
    value: z.string(),
    confidence: z.number().min(0).max(1),
    excerpt: z.string().max(500).nullable(),
    selector: z.string().max(300).nullable(),
  })
  .strict();

const fieldEvidenceSchema = z
  .object({
    confidence: z.number().min(0).max(1),
    evidence: z.array(evidenceSchema),
    alternatives: z.array(z.string()),
    conflicted: z.boolean(),
  })
  .strict();

export const compatibilityDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    description: z.string().max(10_000),
    organizer: z.string().trim().min(1).max(300).nullable(),
    eligibility: stringListSchema,
    location: z.string().trim().min(1).max(500).nullable(),
    modality: z.string().trim().min(1).max(50).nullable(),
    start_date: dateSchema.nullable(),
    end_date: dateSchema.nullable(),
    application_deadline: dateSchema.nullable(),
    categories: stringListSchema,
    cost: z.union([z.string(), z.number().nonnegative()]).nullable(),
    currency: z.string().length(3).nullable(),
    is_free: z.boolean().nullable(),
    image_url: httpUrlSchema.nullable(),
    application_url: httpUrlSchema.nullable(),
    source_url: httpUrlSchema,
    canonical_url: httpUrlSchema,
    source_published_at: datetimeSchema.nullable(),
    extracted_at: datetimeSchema,
    source_content_sha256: hashSchema,
    status: z.enum([
      "active",
      "upcoming",
      "rolling",
      "expired",
      "cancelled",
      "unknown",
    ]),
    field_evidence: z.record(z.string(), fieldEvidenceSchema),
    overall_confidence: z.number().min(0).max(1),
    review_state: z.enum(["ready", "review", "reject"]),
    review_reasons: z.array(z.string()),
    warnings: z.array(z.string()),
    raw_metadata: z.record(z.string(), z.unknown()),
  })
  .strict();

export const publicationVersionSchema = z
  .object({
    id: uuidSchema,
    edition_id: uuidSchema,
    version: z.number().int().positive(),
    editorial_state: editorialStateSchema,
    payload: z.record(z.string(), z.unknown()),
    supporting_assertion_ids: z.array(uuidSchema),
    created_at: datetimeSchema,
    created_by: nonEmptyText,
    supersedes_version_id: uuidSchema.nullable(),
  })
  .strict();

export const ingestionResultSchema = z
  .object({
    source: sourceSchema,
    source_document: sourceDocumentSchema,
    snapshot_id: uuidSchema,
    extraction_run: extractionRunSchema,
    assertions: z.array(fieldAssertionSchema).max(5000),
    resolved_fields: z.record(z.string(), resolvedFieldSchema),
    semantic_fields: z.record(z.string(), semanticFieldResolutionSchema),
    organization: organizationSchema.nullable(),
    program: programSchema,
    edition: editionSchema,
    application_round: applicationRoundSchema,
    eligibility_profile: eligibilityProfileSchema,
    application_link: applicationLinkAssessmentSchema,
    site_contract: siteContractAssessmentSchema,
    fit_assessment: productFitAssessmentSchema,
    publication_gate: publicationGateSchema,
    review_tasks: z.array(reviewTaskSchema).max(500),
    publication_version: publicationVersionSchema,
    compatibility_draft: compatibilityDraftSchema,
  })
  .strict();

export const ingestionRequestV1Schema = z
  .object({
    contract_version: z.literal(OPPORTUNITY_CONTRACT_VERSION),
    idempotency_key: z.string().trim().min(16).max(200),
    source_cohort: z.string().trim().min(1).max(100),
    snapshot: pageSnapshotSchema,
    ingestion: ingestionResultSchema,
  })
  .strict()
  .superRefine((request, context) => {
    const { ingestion, snapshot } = request;
    if (
      Object.hasOwn(ingestion.publication_version.payload, "curated_master")
    ) {
      context.addIssue({
        code: "custom",
        message:
          "curated_master is reserved for the authorized offline editorial importer",
        path: ["ingestion", "publication_version", "payload"],
      });
    }

    if (snapshot.id !== ingestion.snapshot_id) {
      context.addIssue({
        code: "custom",
        message: "Snapshot ID must match ingestion.snapshot_id",
        path: ["snapshot", "id"],
      });
    }
    if (
      snapshot.source_document_id !== null &&
      snapshot.source_document_id !== ingestion.source_document.id
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Snapshot source document does not match the ingestion document",
        path: ["snapshot", "source_document_id"],
      });
    }
    if (ingestion.source_document.source_id !== ingestion.source.id) {
      context.addIssue({
        code: "custom",
        message: "Source document does not belong to the supplied source",
        path: ["ingestion", "source_document", "source_id"],
      });
    }
    if (ingestion.extraction_run.snapshot_id !== snapshot.id) {
      context.addIssue({
        code: "custom",
        message: "Extraction run does not belong to the supplied snapshot",
        path: ["ingestion", "extraction_run", "snapshot_id"],
      });
    }
    if (
      ingestion.organization &&
      ingestion.program.organizer_id !== ingestion.organization.id
    ) {
      context.addIssue({
        code: "custom",
        message: "Program organizer does not match the supplied organization",
        path: ["ingestion", "program", "organizer_id"],
      });
    }
    if (ingestion.edition.program_id !== ingestion.program.id) {
      context.addIssue({
        code: "custom",
        message: "Edition does not belong to the supplied program",
        path: ["ingestion", "edition", "program_id"],
      });
    }
    if (ingestion.application_round.edition_id !== ingestion.edition.id) {
      context.addIssue({
        code: "custom",
        message: "Application round does not belong to the supplied edition",
        path: ["ingestion", "application_round", "edition_id"],
      });
    }
    if (ingestion.publication_version.edition_id !== ingestion.edition.id) {
      context.addIssue({
        code: "custom",
        message: "Publication version does not belong to the supplied edition",
        path: ["ingestion", "publication_version", "edition_id"],
      });
    }
    const incomingEditorialState =
      ingestion.publication_version.editorial_state;
    const incomingGateOutcome = ingestion.publication_gate.outcome;
    const terminalStateMatchesGate =
      (incomingEditorialState === "rejected" &&
        incomingGateOutcome === "reject") ||
      (incomingEditorialState === "archived" &&
        incomingGateOutcome === "expired_archive");
    if (
      incomingEditorialState !== "draft" &&
      incomingEditorialState !== "needs_review" &&
      !terminalStateMatchesGate
    ) {
      context.addIssue({
        code: "custom",
        message: "Ingestion cannot bypass editorial approval",
        path: ["ingestion", "publication_version", "editorial_state"],
      });
    }
  })
  .superRefine((request, context) => {
    const { ingestion, snapshot } = request;
    if (
      Object.hasOwn(ingestion.publication_version.payload, "curated_master")
    ) {
      context.addIssue({
        code: "custom",
        message:
          "curated_master is reserved for the authorized offline editorial importer",
        path: ["ingestion", "publication_version", "payload"],
      });
    }
    const assertionIds = new Set<string>();
    for (const [index, assertion] of ingestion.assertions.entries()) {
      if (assertionIds.has(assertion.id)) {
        context.addIssue({
          code: "custom",
          message: "Assertion IDs must be unique",
          path: ["ingestion", "assertions", index, "id"],
        });
      }
      assertionIds.add(assertion.id);
      if (assertion.extraction_run_id !== ingestion.extraction_run.id) {
        context.addIssue({
          code: "custom",
          message: "Assertion does not belong to the supplied extraction run",
          path: ["ingestion", "assertions", index, "extraction_run_id"],
        });
      }
      if (assertion.snapshot_id !== snapshot.id) {
        context.addIssue({
          code: "custom",
          message: "Assertion does not belong to the supplied snapshot",
          path: ["ingestion", "assertions", index, "snapshot_id"],
        });
      }
      if (assertion.source_document_id !== ingestion.source_document.id) {
        context.addIssue({
          code: "custom",
          message: "Assertion does not belong to the supplied source document",
          path: ["ingestion", "assertions", index, "source_document_id"],
        });
      }
    }
  })
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Assertion references and semantic-state evidence invariants are validated together at the contract boundary.
  .superRefine((request, context) => {
    const assertionIds = new Set(
      request.ingestion.assertions.map((assertion) => assertion.id)
    );
    for (const [fieldName, field] of Object.entries(
      request.ingestion.resolved_fields
    )) {
      if (fieldName !== field.field_name) {
        context.addIssue({
          code: "custom",
          message: "Resolved-field key must match field_name",
          path: ["ingestion", "resolved_fields", fieldName, "field_name"],
        });
      }
      for (const assertionId of [
        ...field.selected_assertion_ids,
        ...field.alternative_assertion_ids,
      ]) {
        if (!assertionIds.has(assertionId)) {
          context.addIssue({
            code: "custom",
            message: "Resolved field references an unknown assertion",
            path: ["ingestion", "resolved_fields", fieldName],
          });
        }
      }
    }
    for (const [fieldName, field] of Object.entries(
      request.ingestion.semantic_fields
    )) {
      if (fieldName !== field.field_name) {
        context.addIssue({
          code: "custom",
          message: "Semantic-field key must match field_name",
          path: ["ingestion", "semantic_fields", fieldName, "field_name"],
        });
      }
      for (const assertionId of [
        ...field.supporting_assertion_ids,
        ...field.alternative_assertion_ids,
        ...field.conflicting_assertion_ids,
      ]) {
        if (!assertionIds.has(assertionId)) {
          context.addIssue({
            code: "custom",
            message: "Semantic field references an unknown assertion",
            path: ["ingestion", "semantic_fields", fieldName],
          });
        }
      }
      if (
        field.state === "not_stated" &&
        !["complete", "sufficient"].includes(field.source_coverage.state)
      ) {
        context.addIssue({
          code: "custom",
          message:
            "not_stated requires sufficient authoritative-source coverage",
          path: ["ingestion", "semantic_fields", fieldName, "source_coverage"],
        });
      }
      if (
        field.state === "explicitly_unrestricted" &&
        field.supporting_assertion_ids.length === 0
      ) {
        context.addIssue({
          code: "custom",
          message: "explicitly_unrestricted requires source evidence",
          path: [
            "ingestion",
            "semantic_fields",
            fieldName,
            "supporting_assertion_ids",
          ],
        });
      }
      if (
        field.state === "not_applicable" &&
        field.applicability !== "not_applicable"
      ) {
        context.addIssue({
          code: "custom",
          message: "not_applicable state requires not_applicable applicability",
          path: ["ingestion", "semantic_fields", fieldName, "applicability"],
        });
      }
    }
  });

export const reviewerCorrectionRequestV1Schema = z
  .object({
    contract_version: z.literal(OPPORTUNITY_CONTRACT_VERSION),
    idempotency_key: z.string().trim().min(16).max(200),
    review_task_id: uuidSchema.nullable(),
    edition_id: uuidSchema,
    field_name: z.string().trim().min(1).max(100),
    corrected_value: assertionValueSchema,
    correction_reason: z.string().trim().min(3).max(2000),
    evidence_text: z.string().trim().min(1).max(2000),
    evidence_locator: z.string().trim().min(1).max(500).nullable(),
    source_document_id: uuidSchema,
    previous_publication_version_id: uuidSchema.nullable(),
    semantic_state: semanticFieldStateSchema.optional(),
    applicability: fieldApplicabilitySchema.optional(),
    semantic_reason_code: z.string().trim().min(3).max(200).optional(),
    display_key: z.string().trim().min(3).max(200).optional(),
    display_parameters: z
      .record(
        z.string(),
        z.union([z.string(), z.number(), z.boolean(), z.null()])
      )
      .optional(),
  })
  .strict();

export const publicationDecisionRequestV1Schema = z
  .object({
    contract_version: z.literal(OPPORTUNITY_CONTRACT_VERSION),
    idempotency_key: z.string().trim().min(16).max(200),
    action: z.enum(["approve", "reject", "archive", "unpublish"]),
    reason: z.string().trim().min(3).max(2000),
    expected_publication_version: z.number().int().positive(),
  })
  .strict();

export const publicOpportunityFilterV1Schema = z
  .object({
    collection: opportunityCollectionSchema.optional(),
    opportunity_type: z.array(opportunityTypeSchema).max(25).optional(),
    education_level: z.array(educationLevelSchema).max(25).optional(),
    modality: z.array(modalitySchema).max(4).optional(),
    brazil_eligibility: z
      .array(brazilEligibilityStatusSchema)
      .max(5)
      .optional(),
    age: z.number().int().min(0).max(100).optional(),
    deadline_from: dateSchema.optional(),
    deadline_to: dateSchema.optional(),
    lifecycle: z.array(lifecycleStateSchema).max(20).optional(),
    is_free: z.boolean().optional(),
    cursor: z.string().trim().min(1).max(500).optional(),
    limit: z.number().int().min(1).max(100).default(24),
  })
  .strict()
  .refine(
    (filter) =>
      !(filter.deadline_from && filter.deadline_to) ||
      filter.deadline_from <= filter.deadline_to,
    {
      message: "deadline_from cannot follow deadline_to",
      path: ["deadline_to"],
    }
  );

export const publicOpportunityV1Schema = z
  .object({
    id: uuidSchema,
    publication_version_id: uuidSchema,
    collection: opportunityCollectionSchema,
    title: z.string().trim().min(1).max(300),
    description: z.string().max(10_000),
    organizer: z.string().trim().min(1).max(300).nullable(),
    opportunity_types: z.array(opportunityTypeSchema),
    education_levels: z.array(educationLevelSchema),
    modality: modalitySchema,
    brazil_eligibility: brazilEligibilityStatusSchema,
    age_rules: z.array(ageRuleSchema),
    location: z.string().trim().min(1).max(500).nullable(),
    start_date: dateSchema.nullable(),
    end_date: dateSchema.nullable(),
    application_deadline_date: dateSchema.nullable(),
    application_deadline_time: z.iso.time().nullable(),
    application_deadline_timezone: z.string().trim().min(1).max(100).nullable(),
    deadline_precision: z.enum([
      "date_only",
      "local_time",
      "instant",
      "rolling",
      "unknown",
    ]),
    lifecycle: lifecycleStateSchema,
    official_information_url: httpUrlSchema,
    application_url: httpUrlSchema.nullable(),
    application_link_status: publicApplicationLinkStatusSchema,
    can_apply: z.boolean().optional(),
    image_url: httpUrlSchema.nullable(),
    is_free: z.boolean().nullable(),
    cost_amount: z.string().nullable(),
    currency: z.string().length(3).nullable(),
    last_verified_at: datetimeSchema.nullable(),
    semantic_fields: z.record(
      z.string(),
      z
        .object({
          state: semanticFieldStateSchema,
          display_text: z.string().trim().min(1).max(2000),
          value: z.unknown(),
          applicability: fieldApplicabilitySchema,
          criticality: fieldCriticalitySchema,
          display_key: z.string().trim().min(1).max(200),
          explanation: z.string().trim().min(1).max(2000),
          source_coverage: sourceCoverageStateSchema,
          gate_impact: gateImpactSchema,
          last_verified_at: datetimeSchema.nullable(),
        })
        .strict()
    ),
  })
  .strict();

export type IngestionRequestV1 = z.infer<typeof ingestionRequestV1Schema>;
export type PublicOpportunityFilterV1 = z.infer<
  typeof publicOpportunityFilterV1Schema
>;
export type PublicOpportunityV1 = z.infer<typeof publicOpportunityV1Schema>;
export type PublicSemanticField =
  PublicOpportunityV1["semantic_fields"][string];
export type SemanticFieldResolution = z.infer<
  typeof semanticFieldResolutionSchema
>;
export type PublicationDecisionRequestV1 = z.infer<
  typeof publicationDecisionRequestV1Schema
>;
export type ReviewerCorrectionRequestV1 = z.infer<
  typeof reviewerCorrectionRequestV1Schema
>;
