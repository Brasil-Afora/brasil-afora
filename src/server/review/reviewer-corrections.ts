import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  brazilEligibilityStatusSchema,
  compatibilityDraftSchema,
  educationLevelSchema,
  lifecycleStateSchema,
  opportunityCollectionSchema,
  opportunityTypeSchema,
  publicApplicationLinkStatusSchema,
  publicOpportunityV1Schema,
  type ReviewerCorrectionRequestV1,
  type SemanticFieldResolution,
  semanticFieldResolutionSchema,
} from "@/contracts/opportunity-v1";
import type { schema } from "@/db/schema";
import {
  applicationLinkAssessments,
  applicationRounds,
  auditEvents,
  editions,
  eligibilityProfiles,
  extractionRuns,
  fieldApplicabilityAssessments,
  fieldAssertions,
  fieldDisplayProjections,
  fieldSemanticStates,
  fieldSourceCoverage,
  idempotencyRequests,
  organizations,
  productFitAssessments,
  programs,
  publicationGateDecisions,
  publicationVersions,
  resolvedFields,
  reviewerCorrections,
  reviewTasks,
  snapshots,
  sourceDocuments,
  sources,
} from "@/db/schema/ingestion";
import { formatSemanticField } from "@/lib/semantic-fields";

const CORRECTION_SCOPE = "reviewer-correction.v1";
const IDEMPOTENCY_TTL_DAYS = 30;

const SEMANTIC_FIELD_BY_CORRECTION = new Map<string, string>([
  ["application_deadline", "application_deadline"],
  ["application_url", "application_url"],
  ["brazil_eligibility", "brazilian_eligibility"],
  ["brazilian_eligibility", "brazilian_eligibility"],
  ["cost", "program_cost"],
  ["description", "description"],
  ["image_url", "image"],
  ["is_free", "is_free"],
  ["location", "city"],
  ["modality", "modality"],
  ["organizer", "organizer"],
  ["title", "title"],
]);

const semanticGateImpact = (
  criticality: SemanticFieldResolution["criticality"],
  state: SemanticFieldResolution["state"]
): SemanticFieldResolution["gate_impact"] => {
  if (
    [
      "explicit_value",
      "explicitly_unrestricted",
      "not_applicable",
      "suppressed",
    ].includes(state)
  ) {
    return "none";
  }
  if (criticality === "critical") {
    return "block";
  }
  return criticality === "conditional" ? "review" : "none";
};

type Database = NodePgDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export interface ReviewerCorrectionResult {
  assertion_id: string;
  publication_version: number;
  publication_version_id: string;
  replayed: boolean;
}

export class ReviewerCorrectionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ReviewerCorrectionError";
    this.code = code;
  }
}

const parseStoredResponse = (
  value: Record<string, unknown> | null
): ReviewerCorrectionResult => {
  if (
    !value ||
    typeof value.assertion_id !== "string" ||
    typeof value.publication_version !== "number" ||
    typeof value.publication_version_id !== "string"
  ) {
    throw new ReviewerCorrectionError(
      "IDEMPOTENCY_CONFLICT",
      "Stored correction response is incomplete; use a new idempotency key."
    );
  }
  return {
    assertion_id: value.assertion_id,
    publication_version: value.publication_version,
    publication_version_id: value.publication_version_id,
    replayed: true,
  };
};

const correctedCompatibilityPayload = (
  payload: Record<string, unknown>,
  fieldName: string,
  correctedValue: ReviewerCorrectionRequestV1["corrected_value"]
) => {
  const draft = compatibilityDraftSchema.safeParse(payload);
  if (!draft.success) {
    throw new ReviewerCorrectionError(
      "INVALID_PUBLICATION_PAYLOAD",
      "Current compatibility payload does not satisfy contract v1."
    );
  }
  const compatibleFields = new Set([
    "application_deadline",
    "application_url",
    "canonical_url",
    "categories",
    "cost",
    "currency",
    "description",
    "eligibility",
    "end_date",
    "image_url",
    "is_free",
    "location",
    "modality",
    "organizer",
    "start_date",
    "title",
  ]);
  if (!compatibleFields.has(fieldName)) {
    return draft.data;
  }
  const correctedDraft = compatibilityDraftSchema.safeParse({
    ...draft.data,
    [fieldName]: correctedValue,
  });
  if (!correctedDraft.success) {
    throw new ReviewerCorrectionError(
      "INVALID_CORRECTION_VALUE",
      `Corrected value is not valid for "${fieldName}".`
    );
  }
  return correctedDraft.data;
};

const rawCorrectionValue = (
  value: ReviewerCorrectionRequestV1["corrected_value"]
): string => {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
};

const latestProductFitId = async (
  transaction: Transaction,
  editionId: string
): Promise<string | undefined> => {
  const rows = await transaction
    .select({ id: productFitAssessments.id })
    .from(productFitAssessments)
    .where(eq(productFitAssessments.editionId, editionId))
    .orderBy(desc(productFitAssessments.assessedAt))
    .limit(1);
  return rows[0]?.id;
};

const applicationRoundIdForCorrection = async (
  transaction: Transaction,
  editionId: string,
  currentValue: string | null,
  field: "application_url" | "deadline"
): Promise<string> => {
  const rows = await transaction
    .select({
      applicationUrl: applicationRounds.applicationUrl,
      deadlineDate: applicationRounds.deadlineDate,
      id: applicationRounds.id,
    })
    .from(applicationRounds)
    .where(eq(applicationRounds.editionId, editionId));
  if (rows.length === 1 && rows[0]) {
    return rows[0].id;
  }
  const matchingRows = rows.filter((row) =>
    field === "deadline"
      ? row.deadlineDate === currentValue
      : row.applicationUrl === currentValue
  );
  if (matchingRows.length !== 1 || !matchingRows[0]) {
    throw new ReviewerCorrectionError(
      "AMBIGUOUS_APPLICATION_ROUND",
      `Could not identify one application round for the "${field}" correction.`
    );
  }
  return matchingRows[0].id;
};

const updateProductFit = async (
  transaction: Transaction,
  editionId: string,
  values: Partial<{
    mappedEducationLevels: string[];
    mappedOpportunityTypes: string[];
    siteCollection: "international" | "national" | "unknown";
  }>
): Promise<void> => {
  const assessmentId = await latestProductFitId(transaction, editionId);
  if (assessmentId) {
    await transaction
      .update(productFitAssessments)
      .set(values)
      .where(eq(productFitAssessments.id, assessmentId));
  }
};

const acceptsSubmissionsForStatus = (
  status: ReturnType<typeof publicApplicationLinkStatusSchema.parse>
): boolean | null => {
  if (status === "current_and_open") {
    return true;
  }
  if (["closed", "old_edition", "results_page"].includes(status)) {
    return false;
  }
  return null;
};

const applyLinkStatusCorrection = async (
  transaction: Transaction,
  editionId: string,
  fieldName: string,
  correctedValue: ReviewerCorrectionRequestV1["corrected_value"],
  currentPublic: Record<string, unknown> | undefined
): Promise<boolean> => {
  const linkStatus =
    publicApplicationLinkStatusSchema.safeParse(correctedValue);
  if (fieldName !== "application_link_status" || !linkStatus.success) {
    return false;
  }
  const currentApplicationUrl =
    typeof currentPublic?.application_url === "string"
      ? currentPublic.application_url
      : null;
  const roundId = await applicationRoundIdForCorrection(
    transaction,
    editionId,
    currentApplicationUrl,
    "application_url"
  );
  const previousRows = await transaction
    .select()
    .from(applicationLinkAssessments)
    .where(eq(applicationLinkAssessments.applicationRoundId, roundId))
    .orderBy(desc(applicationLinkAssessments.createdAt))
    .limit(1);
  const previous = previousRows[0];
  await transaction.insert(applicationLinkAssessments).values({
    acceptsSubmissions: acceptsSubmissionsForStatus(linkStatus.data),
    applicationRoundId: roundId,
    checkedAt: new Date(),
    documentRole: previous?.documentRole ?? "unknown",
    editionYear: previous?.editionYear ?? null,
    finalUrl: previous?.finalUrl ?? null,
    httpStatus: previous?.httpStatus ?? null,
    originalUrl: currentApplicationUrl,
    reasons: ["Human reviewer verified the captured application evidence."],
    redirectChain: previous?.redirectChain ?? [],
    status: linkStatus.data,
  });
  return true;
};

const applyApplicationCorrection = async (
  transaction: Transaction,
  editionId: string,
  fieldName: string,
  correctedValue: ReviewerCorrectionRequestV1["corrected_value"],
  currentPublic: Record<string, unknown> | undefined
): Promise<boolean> => {
  if (fieldName === "application_deadline") {
    const deadline = correctedValue === null ? null : String(correctedValue);
    const roundId = await applicationRoundIdForCorrection(
      transaction,
      editionId,
      typeof currentPublic?.application_deadline_date === "string"
        ? currentPublic.application_deadline_date
        : null,
      "deadline"
    );
    await transaction
      .update(applicationRounds)
      .set({
        deadlineDate: deadline,
        deadlinePrecision: deadline === null ? "unknown" : "date_only",
      })
      .where(eq(applicationRounds.id, roundId));
    return true;
  }
  if (fieldName === "application_url") {
    const applicationUrl =
      correctedValue === null ? null : String(correctedValue);
    const roundId = await applicationRoundIdForCorrection(
      transaction,
      editionId,
      typeof currentPublic?.application_url === "string"
        ? currentPublic.application_url
        : null,
      "application_url"
    );
    await transaction
      .update(applicationRounds)
      .set({ applicationUrl })
      .where(eq(applicationRounds.id, roundId));
    return true;
  }
  return applyLinkStatusCorrection(
    transaction,
    editionId,
    fieldName,
    correctedValue,
    currentPublic
  );
};

const applyClassificationCorrection = async (
  transaction: Transaction,
  editionId: string,
  fieldName: string,
  correctedValue: ReviewerCorrectionRequestV1["corrected_value"]
): Promise<boolean> => {
  const collection = opportunityCollectionSchema.safeParse(correctedValue);
  if (fieldName === "site_taxonomy" && collection.success) {
    await updateProductFit(transaction, editionId, {
      siteCollection: collection.data,
    });
    return true;
  }
  const brazilStatus = brazilEligibilityStatusSchema.safeParse(correctedValue);
  if (
    ["brazil_eligibility", "brazilian_eligibility"].includes(fieldName) &&
    brazilStatus.success
  ) {
    await transaction
      .update(eligibilityProfiles)
      .set({ brazilStatus: brazilStatus.data, interpretedAt: new Date() })
      .where(eq(eligibilityProfiles.editionId, editionId));
    return true;
  }
  const opportunityTypes = opportunityTypeSchema
    .array()
    .safeParse(correctedValue);
  if (fieldName === "categories" && opportunityTypes.success) {
    const editionRows = await transaction
      .select({ programId: editions.programId })
      .from(editions)
      .where(eq(editions.id, editionId))
      .limit(1);
    if (editionRows[0]) {
      await transaction
        .update(programs)
        .set({ opportunityTypes: opportunityTypes.data })
        .where(eq(programs.id, editionRows[0].programId));
    }
    await updateProductFit(transaction, editionId, {
      mappedOpportunityTypes: opportunityTypes.data,
    });
    return true;
  }
  const educationLevels = educationLevelSchema
    .array()
    .safeParse(correctedValue);
  if (fieldName === "education_levels" && educationLevels.success) {
    await transaction
      .update(eligibilityProfiles)
      .set({
        educationLevels: educationLevels.data,
        interpretedAt: new Date(),
      })
      .where(eq(eligibilityProfiles.editionId, editionId));
    await updateProductFit(transaction, editionId, {
      mappedEducationLevels: educationLevels.data,
    });
    return true;
  }
  return false;
};

const applyEditionCorrection = async (
  transaction: Transaction,
  editionId: string,
  fieldName: string,
  correctedValue: ReviewerCorrectionRequestV1["corrected_value"]
): Promise<void> => {
  const lifecycle = lifecycleStateSchema.safeParse(correctedValue);
  if (fieldName === "lifecycle_status" && lifecycle.success) {
    await transaction
      .update(editions)
      .set({ status: lifecycle.data })
      .where(eq(editions.id, editionId));
    return;
  }
  if (["start_date", "end_date"].includes(fieldName)) {
    await transaction
      .update(editions)
      .set(
        fieldName === "start_date"
          ? {
              startDate:
                correctedValue === null ? null : String(correctedValue),
            }
          : { endDate: correctedValue === null ? null : String(correctedValue) }
      )
      .where(eq(editions.id, editionId));
  }
};

const applyOrganizerCorrection = async (
  transaction: Transaction,
  editionId: string,
  fieldName: string,
  correctedValue: ReviewerCorrectionRequestV1["corrected_value"]
): Promise<boolean> => {
  if (fieldName !== "organizer" || typeof correctedValue !== "string") {
    return false;
  }
  const canonicalName = correctedValue.trim();
  if (!canonicalName) {
    return false;
  }
  const organizationRows = await transaction
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.canonicalName, canonicalName))
    .limit(1);
  const organizationId = organizationRows[0]?.id ?? randomUUID();
  if (!organizationRows[0]) {
    await transaction.insert(organizations).values({
      canonicalName,
      id: organizationId,
      verified: true,
    });
  }
  const editionRows = await transaction
    .select({ programId: editions.programId })
    .from(editions)
    .where(eq(editions.id, editionId))
    .limit(1);
  if (editionRows[0]) {
    await transaction
      .update(programs)
      .set({ organizerId: organizationId })
      .where(eq(programs.id, editionRows[0].programId));
  }
  return true;
};

const applyCanonicalCorrection = async (
  transaction: Transaction,
  editionId: string,
  fieldName: string,
  correctedValue: ReviewerCorrectionRequestV1["corrected_value"],
  currentPublic: Record<string, unknown> | undefined
): Promise<void> => {
  const applicationUpdated = await applyApplicationCorrection(
    transaction,
    editionId,
    fieldName,
    correctedValue,
    currentPublic
  );
  if (applicationUpdated) {
    return;
  }
  const organizerUpdated = await applyOrganizerCorrection(
    transaction,
    editionId,
    fieldName,
    correctedValue
  );
  if (organizerUpdated) {
    return;
  }
  const classificationUpdated = await applyClassificationCorrection(
    transaction,
    editionId,
    fieldName,
    correctedValue
  );
  if (!classificationUpdated) {
    await applyEditionCorrection(
      transaction,
      editionId,
      fieldName,
      correctedValue
    );
  }
};

const currentPublicProjection = (
  payload: Record<string, unknown>
): Record<string, unknown> | undefined => {
  const parsed = publicOpportunityV1Schema.safeParse(payload.public_projection);
  return parsed.success ? parsed.data : undefined;
};

const correctedPublicProjection = (
  payload: Record<string, unknown>,
  publicationVersionId: string,
  fieldName: string,
  correctedValue: ReviewerCorrectionRequestV1["corrected_value"],
  semanticResolution: SemanticFieldResolution | null
): Record<string, unknown> => {
  const current = publicOpportunityV1Schema.safeParse(
    payload.public_projection
  );
  if (!current.success) {
    return payload;
  }
  const publicFieldByAssertion = new Map<string, string>([
    ["application_deadline", "application_deadline_date"],
    ["application_link_status", "application_link_status"],
    ["application_url", "application_url"],
    ["brazil_eligibility", "brazil_eligibility"],
    ["brazilian_eligibility", "brazil_eligibility"],
    ["categories", "opportunity_types"],
    ["cost", "cost_amount"],
    ["currency", "currency"],
    ["description", "description"],
    ["education_levels", "education_levels"],
    ["end_date", "end_date"],
    ["image_url", "image_url"],
    ["is_free", "is_free"],
    ["lifecycle_status", "lifecycle"],
    ["location", "location"],
    ["modality", "modality"],
    ["organizer", "organizer"],
    ["start_date", "start_date"],
    ["site_taxonomy", "collection"],
    ["title", "title"],
  ]);
  const publicField = publicFieldByAssertion.get(fieldName);
  const candidate: Record<string, unknown> = {
    ...current.data,
    publication_version_id: publicationVersionId,
  };
  if (semanticResolution) {
    candidate.semantic_fields = {
      ...current.data.semantic_fields,
      [semanticResolution.field_name]: {
        applicability: semanticResolution.applicability,
        criticality: semanticResolution.criticality,
        display_key: semanticResolution.display_key,
        display_text: formatSemanticField(semanticResolution),
        explanation: semanticResolution.public_explanation,
        gate_impact: semanticResolution.gate_impact,
        last_verified_at: semanticResolution.last_verified_at,
        source_coverage: semanticResolution.source_coverage.state,
        state: semanticResolution.state,
        value: semanticResolution.value,
      },
    };
  }
  if (publicField) {
    candidate[publicField] =
      publicField === "cost_amount" &&
      correctedValue !== null &&
      typeof correctedValue !== "string"
        ? String(correctedValue)
        : correctedValue;
  }
  const parsed = publicOpportunityV1Schema.safeParse(candidate);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const issueDetail = firstIssue
      ? ` ${firstIssue.path.join(".") || "record"}: ${firstIssue.message}`
      : "";
    throw new ReviewerCorrectionError(
      "INVALID_CORRECTION_VALUE",
      `Corrected value is not valid for the public field mapped from "${fieldName}".${issueDetail}`
    );
  }
  return {
    ...payload,
    ...(semanticResolution
      ? {
          semantic_fields: {
            ...((payload.semantic_fields as Record<string, unknown>) ?? {}),
            [semanticResolution.field_name]: semanticResolution,
          },
        }
      : {}),
    public_projection: parsed.data,
  };
};

export const submitReviewerCorrection = (
  database: Database,
  reviewerId: string,
  request: ReviewerCorrectionRequestV1
): Promise<ReviewerCorrectionResult> =>
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The correction transaction updates every canonical projection atomically and intentionally keeps one rollback boundary.
  database.transaction(async (transaction) => {
    const scope = `${CORRECTION_SCOPE}:${request.edition_id}`;
    const fingerprint = JSON.stringify({
      corrected_value: request.corrected_value,
      edition_id: request.edition_id,
      field_name: request.field_name,
      reason: request.correction_reason,
      source_document_id: request.source_document_id,
    });
    const existingRows = await transaction
      .select()
      .from(idempotencyRequests)
      .where(
        and(
          eq(idempotencyRequests.scope, scope),
          eq(idempotencyRequests.key, request.idempotency_key)
        )
      )
      .limit(1);
    const existing = existingRows[0];
    if (existing) {
      if (existing.requestHash !== fingerprint) {
        throw new ReviewerCorrectionError(
          "IDEMPOTENCY_CONFLICT",
          "Idempotency key was already used for another correction."
        );
      }
      return parseStoredResponse(existing.responseBody);
    }

    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + IDEMPOTENCY_TTL_DAYS);
    await transaction.insert(idempotencyRequests).values({
      scope,
      key: request.idempotency_key,
      requestHash: fingerprint,
      expiresAt,
    });

    const versionRows = await transaction
      .select()
      .from(publicationVersions)
      .where(eq(publicationVersions.editionId, request.edition_id))
      .orderBy(desc(publicationVersions.version))
      .limit(1)
      .for("update");
    const currentVersion = versionRows[0];
    if (!currentVersion) {
      throw new ReviewerCorrectionError(
        "PUBLICATION_NOT_FOUND",
        "No publication version exists for this edition."
      );
    }
    if (
      request.previous_publication_version_id &&
      request.previous_publication_version_id !== currentVersion.id
    ) {
      throw new ReviewerCorrectionError(
        "VERSION_CONFLICT",
        "A newer publication version exists; reload evidence before correcting."
      );
    }
    const currentSemanticRows = await transaction
      .select()
      .from(fieldSemanticStates)
      .where(eq(fieldSemanticStates.publicationVersionId, currentVersion.id));
    const currentSemanticStateIds = currentSemanticRows.map(
      (field) => field.id
    );
    const [currentApplicabilityRows, currentCoverageRows, currentDisplayRows] =
      currentSemanticStateIds.length > 0
        ? await Promise.all([
            transaction
              .select()
              .from(fieldApplicabilityAssessments)
              .where(
                inArray(
                  fieldApplicabilityAssessments.semanticStateId,
                  currentSemanticStateIds
                )
              ),
            transaction
              .select()
              .from(fieldSourceCoverage)
              .where(
                inArray(
                  fieldSourceCoverage.semanticStateId,
                  currentSemanticStateIds
                )
              ),
            transaction
              .select()
              .from(fieldDisplayProjections)
              .where(
                inArray(
                  fieldDisplayProjections.semanticStateId,
                  currentSemanticStateIds
                )
              ),
          ])
        : [[], [], []];
    const currentApplicabilityBySemantic = new Map(
      currentApplicabilityRows.map((row) => [row.semanticStateId, row])
    );
    const currentCoverageBySemantic = new Map(
      currentCoverageRows.map((row) => [row.semanticStateId, row])
    );
    const currentDisplayBySemantic = new Map(
      currentDisplayRows.map((row) => [row.semanticStateId, row])
    );

    const documentRows = await transaction
      .select({
        document: sourceDocuments,
        authorityTier: sources.authorityTier,
      })
      .from(sourceDocuments)
      .innerJoin(sources, eq(sources.id, sourceDocuments.sourceId))
      .where(eq(sourceDocuments.id, request.source_document_id))
      .limit(1);
    const documentRow = documentRows[0];
    if (!documentRow) {
      throw new ReviewerCorrectionError(
        "SOURCE_DOCUMENT_NOT_FOUND",
        "Correction must reference a captured source document."
      );
    }
    const snapshotRows = await transaction
      .select()
      .from(snapshots)
      .where(eq(snapshots.sourceDocumentId, request.source_document_id))
      .orderBy(desc(snapshots.fetchedAt))
      .limit(1);
    const snapshot = snapshotRows[0];
    if (!snapshot) {
      throw new ReviewerCorrectionError(
        "SNAPSHOT_NOT_FOUND",
        "Correction must reference a source document with a captured snapshot."
      );
    }

    const correctedCompatibility = correctedCompatibilityPayload(
      currentVersion.compatibilityPayload,
      request.field_name,
      request.corrected_value
    );
    const resolvedRows = await transaction
      .select()
      .from(resolvedFields)
      .where(
        and(
          eq(resolvedFields.entityType, "edition"),
          eq(resolvedFields.entityId, request.edition_id),
          eq(resolvedFields.fieldName, request.field_name)
        )
      )
      .limit(1);
    const previousResolution = resolvedRows[0];
    const extractionRunId = randomUUID();
    const assertionId = randomUUID();
    const now = new Date();
    await transaction.insert(extractionRuns).values({
      id: extractionRunId,
      snapshotId: snapshot.id,
      pipelineVersion: "human-review:v1",
      startedAt: now,
      completedAt: now,
      pageRole: documentRow.document.documentRole,
      status: "succeeded",
      assertionCount: 1,
    });
    await transaction.insert(fieldAssertions).values({
      id: assertionId,
      extractionRunId,
      snapshotId: snapshot.id,
      sourceDocumentId: request.source_document_id,
      fieldName: request.field_name,
      normalizedValue: request.corrected_value,
      rawValue: rawCorrectionValue(request.corrected_value),
      evidenceText: request.evidence_text,
      evidenceLocator: request.evidence_locator,
      extractor: "human_review",
      sourceAuthority: documentRow.authorityTier,
      documentRole: documentRow.document.documentRole,
      assertedAt: now,
      validationStatus: "valid",
      critical: true,
    });

    await transaction
      .insert(resolvedFields)
      .values({
        entityType: "edition",
        entityId: request.edition_id,
        fieldName: request.field_name,
        resolvedValue: request.corrected_value,
        selectedAssertionIds: [assertionId],
        alternativeAssertionIds: previousResolution?.selectedAssertionIds ?? [],
        conflict: false,
        resolutionReason: `Human correction: ${request.correction_reason}`,
        selectedAuthority: documentRow.authorityTier,
      })
      .onConflictDoUpdate({
        target: [
          resolvedFields.entityType,
          resolvedFields.entityId,
          resolvedFields.fieldName,
        ],
        set: {
          alternativeAssertionIds:
            previousResolution?.selectedAssertionIds ?? [],
          conflict: false,
          resolutionReason: `Human correction: ${request.correction_reason}`,
          resolvedValue: request.corrected_value,
          selectedAssertionIds: [assertionId],
          selectedAuthority: documentRow.authorityTier,
        },
      });

    await applyCanonicalCorrection(
      transaction,
      request.edition_id,
      request.field_name,
      request.corrected_value,
      currentPublicProjection(currentVersion.payload)
    );

    if (request.review_task_id) {
      await transaction
        .update(reviewTasks)
        .set({
          resolution: request.correction_reason,
          resolvedAt: now,
          reviewerId,
          status: "resolved",
        })
        .where(eq(reviewTasks.id, request.review_task_id));
    }
    await transaction.insert(reviewerCorrections).values({
      reviewTaskId: request.review_task_id,
      editionId: request.edition_id,
      fieldName: request.field_name,
      assertionId,
      previousValue: previousResolution?.resolvedValue ?? null,
      correctedValue: request.corrected_value,
      correctionReason: request.correction_reason,
      reviewerId,
    });

    const semanticFieldName =
      SEMANTIC_FIELD_BY_CORRECTION.get(request.field_name) ??
      request.field_name;
    const previousSemantic = semanticFieldName
      ? currentSemanticRows.find(
          (field) => field.fieldName === semanticFieldName
        )
      : undefined;
    const previousApplicability = previousSemantic
      ? currentApplicabilityBySemantic.get(previousSemantic.id)
      : undefined;
    const previousCoverage = previousSemantic
      ? currentCoverageBySemantic.get(previousSemantic.id)
      : undefined;
    const previousDisplay = previousSemantic
      ? currentDisplayBySemantic.get(previousSemantic.id)
      : undefined;
    const correctedSemanticState =
      request.semantic_state ??
      (request.corrected_value === null
        ? "pending_verification"
        : "explicit_value");
    if (
      correctedSemanticState === "not_stated" &&
      !["complete", "sufficient"].includes(
        previousCoverage?.coverageState ?? "unknown"
      )
    ) {
      throw new ReviewerCorrectionError(
        "INSUFFICIENT_SOURCE_COVERAGE",
        "A field can be confirmed as not stated only after sufficient authoritative sources were checked."
      );
    }
    const correctedApplicability =
      request.applicability ??
      (correctedSemanticState === "not_applicable"
        ? "not_applicable"
        : (previousApplicability?.applicability ?? "unknown_applicability"));
    if (
      correctedSemanticState === "not_applicable" &&
      correctedApplicability !== "not_applicable"
    ) {
      throw new ReviewerCorrectionError(
        "INVALID_APPLICABILITY",
        "A not-applicable field requires a documented not-applicable applicability decision."
      );
    }
    const semanticValue = [
      "explicitly_unrestricted",
      "not_applicable",
      "not_stated",
      "pending_verification",
    ].includes(correctedSemanticState)
      ? null
      : request.corrected_value;
    const semanticResolution =
      semanticFieldName && previousSemantic
        ? semanticFieldResolutionSchema.parse({
            field_name: semanticFieldName,
            state: correctedSemanticState,
            value: semanticValue,
            applicability: correctedApplicability,
            applicability_reason_code:
              request.semantic_reason_code ??
              `human_review_${correctedApplicability}`,
            criticality: previousSemantic.criticality,
            display_key:
              request.display_key ??
              `${semanticFieldName}.${correctedSemanticState}`,
            display_parameters:
              request.display_parameters ??
              previousDisplay?.displayParameters ??
              {},
            public_explanation: `Revisor confirmou este estado com evidência da fonte oficial: ${request.correction_reason}`,
            reason_code:
              request.semantic_reason_code ??
              `human_review_${correctedSemanticState}`,
            supporting_assertion_ids: [assertionId],
            alternative_assertion_ids: previousSemantic.supportingAssertionIds,
            conflicting_assertion_ids: [],
            source_coverage: {
              state: previousCoverage?.coverageState ?? "sufficient",
              checked_source_roles: previousCoverage?.checkedSourceRoles.length
                ? previousCoverage.checkedSourceRoles
                : [documentRow.document.documentRole],
              unchecked_source_roles:
                previousCoverage?.uncheckedSourceRoles ?? [],
              failure_codes: [],
              authoritative_sources_checked: Math.max(
                previousCoverage?.authoritativeSourcesChecked ?? 0,
                documentRow.authorityTier >= 75 ? 1 : 0
              ),
              unprocessed_official_documents:
                previousCoverage?.unprocessedOfficialDocuments ?? false,
              last_checked_at: now.toISOString(),
            },
            gate_impact: semanticGateImpact(
              previousSemantic.criticality as SemanticFieldResolution["criticality"],
              correctedSemanticState
            ),
            resolved_at: now.toISOString(),
            last_verified_at: now.toISOString(),
          })
        : null;

    const publicationVersionId = randomUUID();
    const publicationVersion = currentVersion.version + 1;
    const correctedPublicationPayload = correctedPublicProjection(
      currentVersion.payload,
      publicationVersionId,
      request.field_name,
      request.corrected_value,
      semanticResolution
    );
    await transaction.insert(publicationVersions).values({
      id: publicationVersionId,
      editionId: request.edition_id,
      version: publicationVersion,
      editorialState: "needs_review",
      payload: {
        ...correctedPublicationPayload,
        last_reviewer_correction: {
          assertion_id: assertionId,
          field_name: request.field_name,
        },
      },
      compatibilityPayload: correctedCompatibility,
      supportingAssertionIds: [
        ...new Set([...currentVersion.supportingAssertionIds, assertionId]),
      ],
      createdBy: `reviewer:${reviewerId}`,
      supersedesVersionId: currentVersion.id,
    });
    for (const field of currentSemanticRows) {
      const applicability = currentApplicabilityBySemantic.get(field.id);
      const coverage = currentCoverageBySemantic.get(field.id);
      const display = currentDisplayBySemantic.get(field.id);
      if (!(applicability && coverage && display)) {
        continue;
      }
      const isCorrectedField =
        semanticResolution?.field_name === field.fieldName;
      const semanticStateId = randomUUID();
      const correctedLastVerifiedAt =
        isCorrectedField && semanticResolution.last_verified_at
          ? new Date(semanticResolution.last_verified_at)
          : null;
      await transaction.insert(fieldSemanticStates).values({
        id: semanticStateId,
        editionId: request.edition_id,
        publicationVersionId,
        extractionRunId: isCorrectedField
          ? extractionRunId
          : field.extractionRunId,
        fieldName: field.fieldName,
        state: isCorrectedField ? semanticResolution.state : field.state,
        value: isCorrectedField ? semanticResolution.value : field.value,
        criticality: field.criticality,
        reasonCode: isCorrectedField
          ? semanticResolution.reason_code
          : field.reasonCode,
        publicExplanation: isCorrectedField
          ? semanticResolution.public_explanation
          : field.publicExplanation,
        supportingAssertionIds: isCorrectedField
          ? semanticResolution.supporting_assertion_ids
          : field.supportingAssertionIds,
        alternativeAssertionIds: isCorrectedField
          ? semanticResolution.alternative_assertion_ids
          : field.alternativeAssertionIds,
        conflictingAssertionIds: isCorrectedField
          ? semanticResolution.conflicting_assertion_ids
          : field.conflictingAssertionIds,
        gateImpact: isCorrectedField
          ? semanticResolution.gate_impact
          : field.gateImpact,
        resolvedAt: isCorrectedField
          ? new Date(semanticResolution.resolved_at)
          : field.resolvedAt,
        lastVerifiedAt: isCorrectedField
          ? correctedLastVerifiedAt
          : field.lastVerifiedAt,
      });
      await transaction.insert(fieldApplicabilityAssessments).values({
        semanticStateId,
        editionId: request.edition_id,
        fieldName: field.fieldName,
        applicability: isCorrectedField
          ? semanticResolution.applicability
          : applicability.applicability,
        reasonCode: isCorrectedField
          ? semanticResolution.applicability_reason_code
          : applicability.reasonCode,
        evidenceAssertionIds: isCorrectedField
          ? semanticResolution.supporting_assertion_ids
          : applicability.evidenceAssertionIds,
        assessedAt: isCorrectedField ? now : applicability.assessedAt,
      });
      await transaction.insert(fieldSourceCoverage).values({
        semanticStateId,
        editionId: request.edition_id,
        fieldName: field.fieldName,
        coverageState: isCorrectedField
          ? semanticResolution.source_coverage.state
          : coverage.coverageState,
        checkedSourceRoles: isCorrectedField
          ? semanticResolution.source_coverage.checked_source_roles
          : coverage.checkedSourceRoles,
        uncheckedSourceRoles: isCorrectedField
          ? semanticResolution.source_coverage.unchecked_source_roles
          : coverage.uncheckedSourceRoles,
        failureCodes: isCorrectedField
          ? semanticResolution.source_coverage.failure_codes
          : coverage.failureCodes,
        authoritativeSourcesChecked: isCorrectedField
          ? semanticResolution.source_coverage.authoritative_sources_checked
          : coverage.authoritativeSourcesChecked,
        unprocessedOfficialDocuments: isCorrectedField
          ? semanticResolution.source_coverage.unprocessed_official_documents
          : coverage.unprocessedOfficialDocuments,
        assessedAt: isCorrectedField ? now : coverage.assessedAt,
      });
      await transaction.insert(fieldDisplayProjections).values({
        semanticStateId,
        editionId: request.edition_id,
        fieldName: field.fieldName,
        locale: display.locale,
        displayKey: isCorrectedField
          ? semanticResolution.display_key
          : display.displayKey,
        displayParameters: isCorrectedField
          ? semanticResolution.display_parameters
          : display.displayParameters,
        displayText: isCorrectedField
          ? formatSemanticField(semanticResolution)
          : display.displayText,
        publicVisible: isCorrectedField
          ? semanticResolution.state !== "suppressed"
          : display.publicVisible,
        createdAt: isCorrectedField ? now : display.createdAt,
      });
    }
    const semanticBlockingFields = currentSemanticRows.flatMap((field) => {
      if (semanticResolution?.field_name === field.fieldName) {
        return semanticResolution.gate_impact === "block"
          ? [field.fieldName]
          : [];
      }
      return field.gateImpact === "block" ? [field.fieldName] : [];
    });
    await transaction.insert(publicationGateDecisions).values({
      editionId: request.edition_id,
      publicationVersionId,
      outcome: "manual_review",
      reasons: [],
      blockingFields: semanticBlockingFields,
      explanations: [
        "Reviewer correction created a new publication version that requires explicit approval.",
      ],
      sourceCohortMeasured: false,
    });
    await transaction.insert(auditEvents).values({
      actorId: reviewerId,
      actorKind: "reviewer",
      action: "reviewer.correction",
      entityType: "publication_version",
      entityId: publicationVersionId,
      metadata: {
        assertion_id: assertionId,
        field_name: request.field_name,
        previous_publication_version_id: currentVersion.id,
        reason: request.correction_reason,
      },
    });

    const response: ReviewerCorrectionResult = {
      assertion_id: assertionId,
      publication_version: publicationVersion,
      publication_version_id: publicationVersionId,
      replayed: false,
    };
    await transaction
      .update(idempotencyRequests)
      .set({
        completedAt: now,
        responseBody: { ...response },
        responseStatus: 201,
        state: "completed",
      })
      .where(
        and(
          eq(idempotencyRequests.scope, scope),
          eq(idempotencyRequests.key, request.idempotency_key)
        )
      );
    return response;
  });
