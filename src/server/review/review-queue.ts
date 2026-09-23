import { and, desc, eq, inArray, max, or } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  compatibilityDraftSchema,
  type PublicOpportunityV1,
  publicOpportunityV1Schema,
} from "@/contracts/opportunity-v1";
import type { schema } from "@/db/schema";
import {
  applicationLinkAssessments,
  applicationRounds,
  editionSourceDocuments,
  editions,
  eligibilityAgeRules,
  eligibilityProfiles,
  fieldApplicabilityAssessments,
  fieldAssertions,
  fieldDisplayProjections,
  fieldSemanticStates,
  fieldSourceCoverage,
  productFitAssessments,
  programs,
  publicationGateDecisions,
  publicationVersions,
  resolvedFields,
  reviewTasks,
  snapshots,
  sourceDocuments,
} from "@/db/schema/ingestion";

type Database = NodePgDatabase<typeof schema>;

export interface ReviewQueueAssertion {
  asserted_at: string;
  document_role: string;
  evidence_locator: string | null;
  evidence_text: string | null;
  extractor: string;
  id: string;
  raw_value: string;
  snapshot_id: string;
  source_authority: number;
  source_document_id: string;
  source_url: string | null;
  validation_status: string;
  value: unknown;
}

export interface ReviewQueueTask {
  assertions: ReviewQueueAssertion[];
  candidate_assertion_ids: string[];
  explanation: string;
  field_name: string;
  id: string;
  previous_value: unknown;
  reason: string;
  severity: string;
  suggested_value: unknown;
}

export interface ReviewQueueItem {
  application_link: {
    accepts_submissions: boolean | null;
    checked_at: string | null;
    final_url: string | null;
    reasons: string[];
    status: string;
  } | null;
  application_round: {
    application_url: string | null;
    deadline_date: string | null;
    deadline_precision: string;
    deadline_time: string | null;
    deadline_timezone: string | null;
    name: string;
    status: string;
  } | null;
  brazil_eligibility: {
    explanations: string[];
    status: string;
    unknowns: string[];
  } | null;
  current_gate: {
    blocking_fields: string[];
    explanations: string[];
    outcome: string;
    source_cohort: string | null;
    source_cohort_measured: boolean;
  } | null;
  edition: {
    id: string;
    label: string;
    last_verified_at: string | null;
    status: string;
    year: number | null;
  };
  program: {
    id: string;
    name: string;
  };
  publication: {
    id: string;
    public_projection: PublicOpportunityV1 | null;
    state: string;
    version: number;
  };
  semantic_fields: {
    alternative_assertion_ids: string[];
    applicability: string;
    applicability_reason: string;
    assertions: ReviewQueueAssertion[];
    checked_source_roles: string[];
    conflicting_assertion_ids: string[];
    criticality: string;
    display_key: string;
    display_text: string;
    explanation: string;
    extraction_failures: string[];
    field_name: string;
    gate_impact: string;
    reason_code: string;
    source_coverage: string;
    state: string;
    supporting_assertion_ids: string[];
    unchecked_source_roles: string[];
    value: unknown;
  }[];
  snapshots: {
    fetched_at: string;
    id: string;
    preview_text: string;
    source_document_id: string;
    source_url: string;
    status_code: number;
  }[];
  tasks: ReviewQueueTask[];
  title: string;
}

const SCRIPT_STYLE_PATTERN =
  /<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi;
const HTML_TAG_PATTERN = /<[^>]+>/g;
const HTML_SPACE_PATTERN = /&nbsp;|&#160;/gi;
const WHITESPACE_PATTERN = /\s+/g;
const SNAPSHOT_PREVIEW_LENGTH = 4000;

const snapshotPreview = (rawContent: string | null): string =>
  (rawContent ?? "")
    .replace(SCRIPT_STYLE_PATTERN, " ")
    .replace(HTML_TAG_PATTERN, " ")
    .replace(HTML_SPACE_PATTERN, " ")
    .replace(WHITESPACE_PATTERN, " ")
    .trim()
    .slice(0, SNAPSHOT_PREVIEW_LENGTH);

const latestBy = <T, K extends string>(
  rows: T[],
  key: (row: T) => K
): Map<K, T> => {
  const result = new Map<K, T>();
  for (const row of rows) {
    const identity = key(row);
    if (!result.has(identity)) {
      result.set(identity, row);
    }
  }
  return result;
};

const groupBy = <T, K extends string>(
  rows: T[],
  key: (row: T) => K
): Map<K, T[]> => {
  const result = new Map<K, T[]>();
  for (const row of rows) {
    const identity = key(row);
    result.set(identity, [...(result.get(identity) ?? []), row]);
  }
  return result;
};

export interface ReviewQueuePage {
  items: ReviewQueueItem[];
  next_cursor: string | null;
}

export const getReviewQueuePage = async (
  database: Database,
  limit = 50,
  cursor?: string
): Promise<ReviewQueuePage> => {
  const latestVersionNumbers = database
    .select({
      editionId: publicationVersions.editionId,
      latestVersion: max(publicationVersions.version).as("latest_version"),
    })
    .from(publicationVersions)
    .groupBy(publicationVersions.editionId)
    .as("latest_publication_version_numbers");
  const wrappedVersionRows = await database
    .select({ publicationVersion: publicationVersions })
    .from(publicationVersions)
    .innerJoin(
      latestVersionNumbers,
      and(
        eq(publicationVersions.editionId, latestVersionNumbers.editionId),
        eq(publicationVersions.version, latestVersionNumbers.latestVersion)
      )
    )
    .where(
      or(
        eq(publicationVersions.editorialState, "needs_review"),
        eq(publicationVersions.editorialState, "update_pending")
      )
    )
    .orderBy(desc(publicationVersions.createdAt))
    .limit(Math.min(Math.max(limit * 3, 1), 300));
  const versionRows = wrappedVersionRows.map((row) => row.publicationVersion);
  const versionsByEdition = latestBy(versionRows, (row) => row.editionId);
  const versionCandidates = [...versionsByEdition.values()];
  const cursorIndex = cursor
    ? versionCandidates.findIndex((version) => version.id === cursor)
    : -1;
  const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const pageCandidates = versionCandidates.slice(
    startIndex,
    startIndex + limit + 1
  );
  const hasMore = pageCandidates.length > limit;
  const selectedVersions = pageCandidates.slice(0, limit);
  const editionIds = selectedVersions.map((version) => version.editionId);
  if (editionIds.length === 0) {
    return { items: [], next_cursor: null };
  }

  const editionRows = await database
    .select()
    .from(editions)
    .where(inArray(editions.id, editionIds));
  const programIds = [
    ...new Set(editionRows.map((edition) => edition.programId)),
  ];
  const publicationVersionIds = selectedVersions.map((version) => version.id);
  const [
    programRows,
    roundRows,
    editionDocumentRows,
    taskRows,
    eligibilityRows,
    ageRuleRows,
    fitRows,
    gateRows,
    resolvedRows,
    semanticRows,
  ] = await Promise.all([
    database.select().from(programs).where(inArray(programs.id, programIds)),
    database
      .select()
      .from(applicationRounds)
      .where(inArray(applicationRounds.editionId, editionIds)),
    database
      .select()
      .from(editionSourceDocuments)
      .where(inArray(editionSourceDocuments.editionId, editionIds)),
    database
      .select()
      .from(reviewTasks)
      .where(inArray(reviewTasks.entityId, editionIds))
      .orderBy(desc(reviewTasks.createdAt)),
    database
      .select()
      .from(eligibilityProfiles)
      .where(inArray(eligibilityProfiles.editionId, editionIds)),
    database
      .select()
      .from(eligibilityAgeRules)
      .where(inArray(eligibilityAgeRules.editionId, editionIds)),
    database
      .select()
      .from(productFitAssessments)
      .where(inArray(productFitAssessments.editionId, editionIds))
      .orderBy(desc(productFitAssessments.assessedAt)),
    database
      .select()
      .from(publicationGateDecisions)
      .where(
        inArray(
          publicationGateDecisions.publicationVersionId,
          publicationVersionIds
        )
      )
      .orderBy(desc(publicationGateDecisions.decidedAt)),
    database
      .select()
      .from(resolvedFields)
      .where(inArray(resolvedFields.entityId, editionIds)),
    database
      .select()
      .from(fieldSemanticStates)
      .where(
        inArray(fieldSemanticStates.publicationVersionId, publicationVersionIds)
      ),
  ]);

  const roundIds = roundRows.map((round) => round.id);
  const candidateAssertionIds = [
    ...new Set([
      ...taskRows.flatMap((task) => task.candidateAssertionIds),
      ...semanticRows.flatMap((field) => [
        ...field.supportingAssertionIds,
        ...field.alternativeAssertionIds,
        ...field.conflictingAssertionIds,
      ]),
    ]),
  ];
  const semanticStateIds = semanticRows.map((field) => field.id);
  const [
    linkRows,
    assertionRows,
    applicabilityRows,
    coverageRows,
    displayRows,
  ] = await Promise.all([
    roundIds.length > 0
      ? database
          .select()
          .from(applicationLinkAssessments)
          .where(
            inArray(applicationLinkAssessments.applicationRoundId, roundIds)
          )
          .orderBy(desc(applicationLinkAssessments.createdAt))
      : Promise.resolve([]),
    candidateAssertionIds.length > 0
      ? database
          .select()
          .from(fieldAssertions)
          .where(inArray(fieldAssertions.id, candidateAssertionIds))
      : Promise.resolve([]),
    semanticStateIds.length > 0
      ? database
          .select()
          .from(fieldApplicabilityAssessments)
          .where(
            inArray(
              fieldApplicabilityAssessments.semanticStateId,
              semanticStateIds
            )
          )
      : Promise.resolve([]),
    semanticStateIds.length > 0
      ? database
          .select()
          .from(fieldSourceCoverage)
          .where(inArray(fieldSourceCoverage.semanticStateId, semanticStateIds))
      : Promise.resolve([]),
    semanticStateIds.length > 0
      ? database
          .select()
          .from(fieldDisplayProjections)
          .where(
            inArray(fieldDisplayProjections.semanticStateId, semanticStateIds)
          )
      : Promise.resolve([]),
  ]);
  const sourceDocumentIds = [
    ...new Set([
      ...assertionRows.map((assertion) => assertion.sourceDocumentId),
      ...editionDocumentRows.map((link) => link.sourceDocumentId),
    ]),
  ];
  const [documentRows, snapshotRows] =
    sourceDocumentIds.length > 0
      ? await Promise.all([
          database
            .select()
            .from(sourceDocuments)
            .where(inArray(sourceDocuments.id, sourceDocumentIds)),
          database
            .select()
            .from(snapshots)
            .where(inArray(snapshots.sourceDocumentId, sourceDocumentIds))
            .orderBy(desc(snapshots.fetchedAt)),
        ])
      : [[], []];

  const editionsById = new Map(editionRows.map((row) => [row.id, row]));
  const programsById = new Map(programRows.map((row) => [row.id, row]));
  const roundsByEdition = latestBy(roundRows, (row) => row.editionId);
  const linksByRound = latestBy(linkRows, (row) => row.applicationRoundId);
  const eligibilityByEdition = new Map(
    eligibilityRows.map((row) => [row.editionId, row])
  );
  const fitsByEdition = latestBy(fitRows, (row) => row.editionId);
  const gatesByVersion = latestBy(gateRows, (row) => row.publicationVersionId);
  const assertionsById = new Map(assertionRows.map((row) => [row.id, row]));
  const applicabilityBySemantic = new Map(
    applicabilityRows.map((row) => [row.semanticStateId, row])
  );
  const coverageBySemantic = new Map(
    coverageRows.map((row) => [row.semanticStateId, row])
  );
  const displayBySemantic = new Map(
    displayRows.map((row) => [row.semanticStateId, row])
  );
  const semanticByVersion = groupBy(
    semanticRows,
    (row) => row.publicationVersionId
  );
  const documentsById = new Map(documentRows.map((row) => [row.id, row]));
  const snapshotsByDocument = latestBy(
    snapshotRows,
    (row) => row.sourceDocumentId
  );
  const documentsByEdition = groupBy(
    editionDocumentRows,
    (row) => row.editionId
  );
  const resolvedByEditionAndField = new Map(
    resolvedRows.map((row) => [
      `${row.entityId}:${row.fieldName}`,
      row.resolvedValue,
    ])
  );
  const ageRulesByEdition = groupBy(ageRuleRows, (row) => row.editionId);
  const tasksByEdition = groupBy(
    taskRows.filter((task) => task.status === "open"),
    (task) => task.entityId
  );

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The mapping keeps every reviewer-visible evidence field explicit.
  const items = selectedVersions.flatMap((version) => {
    const edition = editionsById.get(version.editionId);
    if (!edition) {
      return [];
    }
    const program = programsById.get(edition.programId);
    if (!program) {
      return [];
    }
    const round = roundsByEdition.get(edition.id);
    const link = round ? linksByRound.get(round.id) : undefined;
    const eligibility = eligibilityByEdition.get(edition.id);
    const fit = fitsByEdition.get(edition.id);
    const gate = gatesByVersion.get(version.id);
    const draft = compatibilityDraftSchema.safeParse(
      version.compatibilityPayload
    );
    const publicProjection = publicOpportunityV1Schema.safeParse(
      version.payload.public_projection
    );
    const title = draft.success ? draft.data.title : program.canonicalName;
    const itemTasks = (tasksByEdition.get(edition.id) ?? []).map((task) => ({
      id: task.id,
      field_name: task.fieldName,
      reason: task.reason,
      severity: task.severity,
      candidate_assertion_ids: task.candidateAssertionIds,
      suggested_value:
        task.suggestedValue ??
        resolvedByEditionAndField.get(`${edition.id}:${task.fieldName}`) ??
        null,
      previous_value: task.previousValue,
      explanation: task.explanation,
      assertions: task.candidateAssertionIds.flatMap((assertionId) => {
        const assertion = assertionsById.get(assertionId);
        if (!assertion) {
          return [];
        }
        const document = documentsById.get(assertion.sourceDocumentId);
        return [
          {
            id: assertion.id,
            value: assertion.normalizedValue,
            raw_value: assertion.rawValue,
            evidence_text: assertion.evidenceText,
            evidence_locator: assertion.evidenceLocator,
            extractor: assertion.extractor,
            source_authority: assertion.sourceAuthority,
            document_role: assertion.documentRole,
            asserted_at: assertion.assertedAt.toISOString(),
            validation_status: assertion.validationStatus,
            source_url: document?.url ?? null,
            snapshot_id: assertion.snapshotId,
            source_document_id: assertion.sourceDocumentId,
          },
        ];
      }),
    }));
    const ageRules = ageRulesByEdition.get(edition.id) ?? [];
    const snapshotPreviews = (documentsByEdition.get(edition.id) ?? [])
      .flatMap((link) => {
        const document = documentsById.get(link.sourceDocumentId);
        const snapshot = snapshotsByDocument.get(link.sourceDocumentId);
        if (!(document && snapshot)) {
          return [];
        }
        return [
          {
            fetched_at: snapshot.fetchedAt.toISOString(),
            id: snapshot.id,
            preview_text: snapshotPreview(snapshot.rawContent),
            source_document_id: link.sourceDocumentId,
            source_url: document.url,
            status_code: snapshot.statusCode,
          },
        ];
      })
      .slice(0, 5);
    const semanticFields = (semanticByVersion.get(version.id) ?? [])
      .flatMap((field) => {
        const applicability = applicabilityBySemantic.get(field.id);
        const coverage = coverageBySemantic.get(field.id);
        const display = displayBySemantic.get(field.id);
        if (!(applicability && coverage && display)) {
          return [];
        }
        return [
          {
            alternative_assertion_ids: field.alternativeAssertionIds,
            applicability: applicability.applicability,
            applicability_reason: applicability.reasonCode,
            assertions: [
              ...new Set([
                ...field.supportingAssertionIds,
                ...field.alternativeAssertionIds,
                ...field.conflictingAssertionIds,
              ]),
            ].flatMap((assertionId) => {
              const assertion = assertionsById.get(assertionId);
              if (!assertion) {
                return [];
              }
              const document = documentsById.get(assertion.sourceDocumentId);
              return [
                {
                  asserted_at: assertion.assertedAt.toISOString(),
                  document_role: assertion.documentRole,
                  evidence_locator: assertion.evidenceLocator,
                  evidence_text: assertion.evidenceText,
                  extractor: assertion.extractor,
                  id: assertion.id,
                  raw_value: assertion.rawValue,
                  snapshot_id: assertion.snapshotId,
                  source_authority: assertion.sourceAuthority,
                  source_document_id: assertion.sourceDocumentId,
                  source_url: document?.url ?? null,
                  validation_status: assertion.validationStatus,
                  value: assertion.normalizedValue,
                },
              ];
            }),
            checked_source_roles: coverage.checkedSourceRoles,
            conflicting_assertion_ids: field.conflictingAssertionIds,
            criticality: field.criticality,
            display_key: display.displayKey,
            display_text: display.displayText,
            explanation: field.publicExplanation,
            extraction_failures: coverage.failureCodes,
            field_name: field.fieldName,
            gate_impact: field.gateImpact,
            reason_code: field.reasonCode,
            source_coverage: coverage.coverageState,
            state: field.state,
            supporting_assertion_ids: field.supportingAssertionIds,
            unchecked_source_roles: coverage.uncheckedSourceRoles,
            value: field.value,
          },
        ];
      })
      .sort((left, right) => {
        const gateOrder = { block: 0, review: 1, none: 2 };
        const impact =
          (gateOrder[left.gate_impact as keyof typeof gateOrder] ?? 3) -
          (gateOrder[right.gate_impact as keyof typeof gateOrder] ?? 3);
        return impact || left.field_name.localeCompare(right.field_name);
      });

    return [
      {
        title,
        program: { id: program.id, name: program.canonicalName },
        edition: {
          id: edition.id,
          label: edition.editionLabel,
          year: edition.editionYear,
          status: edition.status,
          last_verified_at: edition.lastVerifiedAt?.toISOString() ?? null,
        },
        publication: {
          id: version.id,
          public_projection: publicProjection.success
            ? publicProjection.data
            : null,
          version: version.version,
          state: version.editorialState,
        },
        semantic_fields: semanticFields,
        current_gate: gate
          ? {
              outcome: gate.outcome,
              blocking_fields: gate.blockingFields,
              explanations: gate.explanations,
              source_cohort: gate.sourceCohort,
              source_cohort_measured: gate.sourceCohortMeasured,
            }
          : null,
        application_round: round
          ? {
              name: round.roundName,
              status: round.status,
              application_url: round.applicationUrl,
              deadline_date: round.deadlineDate,
              deadline_time: round.deadlineTime,
              deadline_timezone: round.deadlineTimezone,
              deadline_precision: round.deadlinePrecision,
            }
          : null,
        application_link: link
          ? {
              status: link.status,
              final_url: link.finalUrl,
              accepts_submissions: link.acceptsSubmissions,
              checked_at: link.checkedAt?.toISOString() ?? null,
              reasons: link.reasons,
            }
          : null,
        snapshots: snapshotPreviews,
        brazil_eligibility: eligibility
          ? {
              status: eligibility.brazilStatus,
              unknowns: [
                ...eligibility.unknowns,
                ...ageRules
                  .filter(
                    (rule) =>
                      rule.referenceType === "unspecified" &&
                      (rule.minimumAge !== null ||
                        rule.maximumAge !== null ||
                        rule.exactAge !== null)
                  )
                  .map(() => "age_reference_date"),
              ],
              explanations: fit?.explanations ?? [],
            }
          : null,
        tasks: itemTasks,
      },
    ];
  });
  return {
    items,
    next_cursor: hasMore ? (selectedVersions.at(-1)?.id ?? null) : null,
  };
};

export const getReviewQueue = async (
  database: Database,
  limit = 50
): Promise<ReviewQueueItem[]> =>
  (await getReviewQueuePage(database, limit)).items;
