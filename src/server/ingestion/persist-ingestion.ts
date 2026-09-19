import { createHash } from "node:crypto";
import { and, desc, eq, or } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  type IngestionRequestV1,
  modalitySchema,
  publicOpportunityV1Schema,
} from "@/contracts/opportunity-v1";
import type { schema } from "@/db/schema";
import {
  applicationFees,
  applicationLinkAssessments,
  applicationRounds,
  auditEvents,
  editionSourceDocuments,
  editions,
  eligibilityAgeRules,
  eligibilityProfiles,
  extractionRuns,
  fieldApplicabilityAssessments,
  fieldAssertions,
  fieldDisplayProjections,
  fieldSemanticStates,
  fieldSourceCoverage,
  idempotencyRequests,
  materialChangeEvents,
  organizations,
  productFitAssessments,
  programs,
  publicationGateDecisions,
  publicationVersions,
  resolvedFields,
  reviewTasks,
  snapshots,
  sourceDocuments,
  sources,
} from "@/db/schema/ingestion";
import {
  formatSemanticField,
  projectSemanticFieldsForPublic,
} from "@/lib/semantic-fields";

const IDEMPOTENCY_SCOPE = "ingestion.v1";
const IDEMPOTENCY_TTL_DAYS = 7;
const EXACT_DEADLINE_PATTERN =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

type Database = NodePgDatabase<typeof schema>;
type LinkStatus = typeof applicationLinkAssessments.$inferInsert.status;
type GateOutcome = typeof publicationGateDecisions.$inferInsert.outcome;
type EditorialState = typeof publicationVersions.$inferInsert.editorialState;

interface MaterialChange {
  currentAssertionIds: string[];
  currentValue: unknown;
  fieldName: string;
  previousAssertionIds: string[];
  previousValue: unknown;
  reviewTaskId: string;
  severity: "critical" | "high" | "low" | "medium";
}

export interface PersistIngestionResult {
  edition_id: string;
  editorial_state: EditorialState;
  gate_outcome: GateOutcome;
  publication_version_id: string;
  replayed: boolean;
  review_task_count: number;
}

export class IdempotencyConflictError extends Error {
  constructor(
    message = "Idempotency key was already used for another request."
  ) {
    super(message);
    this.name = "IdempotencyConflictError";
  }
}

const stableJson = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right)
  );
  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
    .join(",")}}`;
};

const sha256 = (value: unknown): string =>
  createHash("sha256").update(stableJson(value)).digest("hex");

const MATERIAL_FIELD_SEVERITY = new Map<string, MaterialChange["severity"]>([
  ["application_deadline", "critical"],
  ["application_url", "critical"],
  ["cost", "high"],
  ["description", "medium"],
  ["edition_year", "critical"],
  ["eligibility", "critical"],
  ["end_date", "high"],
  ["funding", "high"],
  ["image_url", "medium"],
  ["lifecycle_status", "critical"],
  ["start_date", "high"],
  ["title", "high"],
]);

const deterministicUuid = (value: unknown): string => {
  const hash = sha256(value).slice(0, 32).split("");
  hash[12] = "5";
  hash[16] = (8 + (Number.parseInt(hash[16] ?? "0", 16) % 4)).toString(16);
  const compact = hash.join("");
  return [
    compact.slice(0, 8),
    compact.slice(8, 12),
    compact.slice(12, 16),
    compact.slice(16, 20),
    compact.slice(20),
  ].join("-");
};

const valuesDiffer = (left: unknown, right: unknown): boolean =>
  stableJson(left) !== stableJson(right);

const semanticChangeSeverity = (
  criticality: "conditional" | "critical" | "noncritical"
): MaterialChange["severity"] => {
  if (criticality === "critical") {
    return "critical";
  }
  if (criticality === "conditional") {
    return "high";
  }
  return "medium";
};

const normalizedMoneyAmount = (
  value: string | number | null
): string | null => {
  if (value === null) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : String(value).trim();
};

const normalizedApplicationUrl = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      const normalizedKey = key.toLowerCase();
      if (
        normalizedKey.startsWith("utm_") ||
        ["ref", "source", "src"].includes(normalizedKey)
      ) {
        url.searchParams.delete(key);
      }
    }
    url.hash = "";
    url.searchParams.sort();
    return url.toString();
  } catch {
    return value.trim();
  }
};

const normalizedMaterialValue = (
  fieldName: string,
  value: unknown
): unknown => {
  if (["application_fee", "cost", "program_cost"].includes(fieldName)) {
    return normalizedMoneyAmount(value as string | number | null);
  }
  if (fieldName === "application_url") {
    return normalizedApplicationUrl(value);
  }
  return value;
};

const materialChange = ({
  currentAssertionIds = [],
  currentValue,
  editionId,
  fieldName,
  previousAssertionIds = [],
  previousValue,
  snapshotId,
}: {
  currentAssertionIds?: string[];
  currentValue: unknown;
  editionId: string;
  fieldName: string;
  previousAssertionIds?: string[];
  previousValue: unknown;
  snapshotId: string;
}): MaterialChange | null => {
  const severity = MATERIAL_FIELD_SEVERITY.get(fieldName);
  if (!(severity && valuesDiffer(previousValue, currentValue))) {
    return null;
  }
  return {
    currentAssertionIds,
    currentValue,
    fieldName,
    previousAssertionIds,
    previousValue,
    reviewTaskId: deterministicUuid({
      editionId,
      fieldName,
      kind: "material_change",
      snapshotId,
    }),
    severity,
  };
};

const slugPart = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";

const editionIdentityKey = (
  edition: IngestionRequestV1["ingestion"]["edition"]
): string =>
  [
    edition.edition_year ?? slugPart(edition.edition_label),
    edition.cycle ? slugPart(edition.cycle) : "default",
  ].join(":");

const roundIdentityKey = (
  round: IngestionRequestV1["ingestion"]["application_round"]
): string => `${slugPart(round.round_name)}:${slugPart(round.region ?? "all")}`;

const hasExplicitEditionYear = (
  edition: IngestionRequestV1["ingestion"]["edition"]
): boolean => edition.edition_year !== null;

const mapApplicationLinkStatus = (
  assessment: IngestionRequestV1["ingestion"]["application_link"]
): LinkStatus => {
  switch (assessment.status) {
    case "verified_current":
      return assessment.accepts_submissions === true
        ? "current_and_open"
        : "current_but_not_open";
    case "structurally_valid_unverified":
      return "unchecked";
    case "invalid":
      return "broken";
    case "wrong_edition":
      return "old_edition";
    case "generic_homepage":
    case "results_page":
    case "login_only":
    case "closed":
      return assessment.status;
    case "missing":
      return "unknown";
    default:
      return "unknown";
  }
};

const splitDeadline = (
  request: IngestionRequestV1
): Pick<
  typeof applicationRounds.$inferInsert,
  "deadlineDate" | "deadlinePrecision" | "deadlineTime" | "deadlineTimezone"
> => {
  const { application_round: round, compatibility_draft: draft } =
    request.ingestion;
  if (round.deadline_type === "rolling") {
    return {
      deadlineDate: null,
      deadlinePrecision: "rolling",
      deadlineTime: null,
      deadlineTimezone: null,
    };
  }
  if (round.deadline_precision === "exact" && round.deadline) {
    const exactMatch = round.deadline.match(EXACT_DEADLINE_PATTERN);
    if (exactMatch) {
      return {
        deadlineDate: exactMatch[1] ?? round.deadline.slice(0, 10),
        deadlinePrecision: "instant",
        deadlineTime: exactMatch[2] ?? null,
        deadlineTimezone:
          exactMatch[3] === "Z" ? "UTC" : (exactMatch[3] ?? "UTC"),
      };
    }
  }
  if (round.deadline_precision === "date") {
    return {
      deadlineDate:
        draft.application_deadline ?? round.deadline?.slice(0, 10) ?? null,
      deadlinePrecision: "date_only",
      deadlineTime: null,
      deadlineTimezone: null,
    };
  }
  if (draft.application_deadline) {
    return {
      deadlineDate: draft.application_deadline,
      deadlinePrecision: "date_only",
      deadlineTime: null,
      deadlineTimezone: null,
    };
  }
  if (!round.deadline) {
    return {
      deadlineDate: null,
      deadlinePrecision: "unknown",
      deadlineTime: null,
      deadlineTimezone: null,
    };
  }
  const deadline = new Date(round.deadline);
  return {
    deadlineDate: deadline.toISOString().slice(0, 10),
    deadlinePrecision: "instant",
    deadlineTime: deadline.toISOString().slice(11, 19),
    deadlineTimezone: "UTC",
  };
};

const resolveGate = (
  requestedOutcome: IngestionRequestV1["ingestion"]["publication_gate"]["outcome"]
): { editorialState: EditorialState; outcome: GateOutcome } => {
  if (requestedOutcome === "reject") {
    return { editorialState: "rejected", outcome: "reject" };
  }
  if (requestedOutcome === "expired_archive") {
    return { editorialState: "archived", outcome: "expired_archive" };
  }
  return {
    editorialState: "needs_review",
    outcome: "manual_review",
  };
};

const parseStoredResponse = (
  value: Record<string, unknown> | null
): PersistIngestionResult => {
  if (
    !value ||
    typeof value.edition_id !== "string" ||
    typeof value.publication_version_id !== "string" ||
    typeof value.gate_outcome !== "string" ||
    typeof value.editorial_state !== "string" ||
    typeof value.review_task_count !== "number"
  ) {
    throw new IdempotencyConflictError(
      "Stored idempotency response is incomplete; use a new key."
    );
  }
  return {
    edition_id: value.edition_id,
    editorial_state: value.editorial_state as EditorialState,
    gate_outcome: value.gate_outcome as GateOutcome,
    publication_version_id: value.publication_version_id,
    replayed: true,
    review_task_count: value.review_task_count,
  };
};

export const persistIngestion = (
  database: Database,
  request: IngestionRequestV1
): Promise<PersistIngestionResult> => {
  const requestHash = sha256(request);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Keeping the ordered writes in one callback makes the transaction boundary auditable.
  return database.transaction(async (transaction) => {
    const existingRequests = await transaction
      .select()
      .from(idempotencyRequests)
      .where(
        and(
          eq(idempotencyRequests.scope, IDEMPOTENCY_SCOPE),
          eq(idempotencyRequests.key, request.idempotency_key)
        )
      )
      .limit(1);
    const existingRequest = existingRequests[0];
    if (existingRequest) {
      if (existingRequest.requestHash !== requestHash) {
        throw new IdempotencyConflictError();
      }
      if (existingRequest.state !== "completed") {
        throw new IdempotencyConflictError(
          "An ingestion with this idempotency key is still processing."
        );
      }
      return parseStoredResponse(existingRequest.responseBody);
    }

    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + IDEMPOTENCY_TTL_DAYS);
    await transaction.insert(idempotencyRequests).values({
      scope: IDEMPOTENCY_SCOPE,
      key: request.idempotency_key,
      requestHash,
      expiresAt,
    });

    const { ingestion, snapshot } = request;
    const {
      application_round: requestedRound,
      compatibility_draft: draft,
      edition: requestedEdition,
      eligibility_profile: eligibility,
      extraction_run: extractionRun,
      fit_assessment: fit,
      program: requestedProgram,
      publication_gate: requestedGate,
      publication_version: requestedPublicationVersion,
      semantic_fields: semanticFields,
      site_contract: siteContract,
      source,
      source_document: sourceDocument,
    } = ingestion;
    let edition = requestedEdition;
    let program = requestedProgram;
    let publicationVersion = requestedPublicationVersion;
    let round = requestedRound;
    const requestedDeadline = splitDeadline(request);

    if (ingestion.organization) {
      const organization = ingestion.organization;
      await transaction
        .insert(organizations)
        .values({
          id: organization.id,
          canonicalName: organization.canonical_name,
          aliases: organization.aliases,
          organizationType: organization.organization_type,
          countryCode: organization.country,
          officialDomains: organization.official_domains,
          verified: organization.verified,
        })
        .onConflictDoUpdate({
          target: organizations.id,
          set: {
            canonicalName: organization.canonical_name,
            aliases: organization.aliases,
            organizationType: organization.organization_type,
            countryCode: organization.country,
            officialDomains: organization.official_domains,
            verified: organization.verified,
          },
        });
    }

    await transaction
      .insert(sources)
      .values({
        id: source.id,
        organizationId: source.organization_id,
        name: source.name,
        baseUrl: source.base_url,
        sourceType: source.source_type,
        authorityTier: source.authority_tier,
        language: source.language,
        allowedPaths: source.allowed_paths,
        blockedPaths: source.blocked_paths,
        discoveryMethods: source.discovery_methods,
        crawlIntervalHours: source.crawl_interval_hours,
        rateLimitPerMinute: source.rate_limit_per_minute,
        concurrencyLimit: source.concurrency_limit,
        renderingPolicy: source.rendering_policy,
        adapterName: source.adapter_name,
        adapterVersion: source.adapter_version,
        expectedCycles: source.expected_cycles,
        reviewOwner: source.review_owner,
        enabled: source.enabled,
        lastSuccessAt: new Date(snapshot.fetched_at),
      })
      .onConflictDoUpdate({
        target: sources.id,
        set: {
          adapterName: source.adapter_name,
          adapterVersion: source.adapter_version,
          enabled: source.enabled,
          lastSuccessAt: new Date(snapshot.fetched_at),
        },
      });

    await transaction
      .insert(sourceDocuments)
      .values({
        id: sourceDocument.id,
        sourceId: sourceDocument.source_id,
        url: sourceDocument.url,
        canonicalUrl: sourceDocument.canonical_url,
        documentRole: sourceDocument.document_role,
        contentType: sourceDocument.content_type,
        firstSeenAt: new Date(sourceDocument.first_seen_at),
        lastSeenAt: sourceDocument.last_seen_at
          ? new Date(sourceDocument.last_seen_at)
          : null,
        lastChangedAt: sourceDocument.last_changed_at
          ? new Date(sourceDocument.last_changed_at)
          : null,
        operationalState: sourceDocument.state,
        programHint: sourceDocument.program_hint,
        editionHint: sourceDocument.edition_hint,
      })
      .onConflictDoUpdate({
        target: sourceDocuments.id,
        set: {
          contentType: sourceDocument.content_type,
          documentRole: sourceDocument.document_role,
          lastChangedAt: sourceDocument.last_changed_at
            ? new Date(sourceDocument.last_changed_at)
            : null,
          lastSeenAt: sourceDocument.last_seen_at
            ? new Date(sourceDocument.last_seen_at)
            : null,
          operationalState: sourceDocument.state,
        },
      });

    const requestedEditionIdentity = editionIdentityKey(requestedEdition);
    const requestedRoundIdentity = roundIdentityKey(requestedRound);
    const linkedProgramRows = await transaction
      .select({
        canonicalName: programs.canonicalName,
        editionId: editions.id,
        organizerId: programs.organizerId,
        programId: programs.id,
      })
      .from(editionSourceDocuments)
      .innerJoin(editions, eq(editions.id, editionSourceDocuments.editionId))
      .innerJoin(programs, eq(programs.id, editions.programId))
      .where(eq(editionSourceDocuments.sourceDocumentId, sourceDocument.id))
      .orderBy(desc(editionSourceDocuments.lastSeenAt));
    const linkedProgram = linkedProgramRows.find(
      (candidate) =>
        candidate.canonicalName === requestedProgram.canonical_name &&
        candidate.organizerId === requestedProgram.organizer_id
    );
    if (linkedProgram) {
      program = {
        ...program,
        id: linkedProgram.programId,
        organizer_id: linkedProgram.organizerId ?? program.organizer_id,
      };
    }

    const [editionByIdentityRows, requestedEditionIdRows] = await Promise.all([
      transaction
        .select({
          endDate: editions.endDate,
          id: editions.id,
          startDate: editions.startDate,
        })
        .from(editions)
        .where(
          and(
            eq(editions.programId, program.id),
            eq(editions.identityKey, requestedEditionIdentity)
          )
        )
        .limit(1),
      transaction
        .select({
          id: editions.id,
          identityKey: editions.identityKey,
          programId: editions.programId,
        })
        .from(editions)
        .where(eq(editions.id, requestedEdition.id))
        .limit(1),
    ]);
    const editionByIdentity = editionByIdentityRows[0];
    const requestedEditionIdRow = requestedEditionIdRows[0];
    const sourceAlreadyLinksEdition = Boolean(
      editionByIdentity &&
        linkedProgramRows.some(
          (candidate) => candidate.editionId === editionByIdentity.id
        )
    );
    const weakEditionIdentityChanged = Boolean(
      editionByIdentity &&
        !hasExplicitEditionYear(requestedEdition) &&
        (requestedEdition.id !== editionByIdentity.id ||
          valuesDiffer(
            editionByIdentity.startDate,
            requestedEdition.start_date
          ) ||
          valuesDiffer(editionByIdentity.endDate, requestedEdition.end_date))
    );
    if (sourceAlreadyLinksEdition && weakEditionIdentityChanged) {
      throw new IdempotencyConflictError(
        "Recurring source has ambiguous edition identity; preserve the historical edition and resolve the new cycle through review."
      );
    }

    let canonicalEditionId = editionByIdentity?.id ?? requestedEdition.id;
    if (
      !editionByIdentity &&
      requestedEditionIdRow &&
      (requestedEditionIdRow.programId !== program.id ||
        requestedEditionIdRow.identityKey !== requestedEditionIdentity)
    ) {
      canonicalEditionId = deterministicUuid({
        identityKey: requestedEditionIdentity,
        kind: "edition",
        programId: program.id,
      });
    }
    edition = {
      ...requestedEdition,
      id: canonicalEditionId,
      program_id: program.id,
    };
    publicationVersion = {
      ...requestedPublicationVersion,
      edition_id: canonicalEditionId,
    };

    const [roundByIdentityRows, requestedRoundIdRows] = await Promise.all([
      transaction
        .select({
          applicationUrl: applicationRounds.applicationUrl,
          audience: applicationRounds.audience,
          deadlineDate: applicationRounds.deadlineDate,
          deadlinePrecision: applicationRounds.deadlinePrecision,
          deadlineTime: applicationRounds.deadlineTime,
          deadlineTimezone: applicationRounds.deadlineTimezone,
          deadlineType: applicationRounds.deadlineType,
          id: applicationRounds.id,
          opensAt: applicationRounds.opensAt,
          status: applicationRounds.status,
          supersedesRoundId: applicationRounds.supersedesRoundId,
        })
        .from(applicationRounds)
        .where(
          and(
            eq(applicationRounds.editionId, canonicalEditionId),
            eq(applicationRounds.roundKey, requestedRoundIdentity)
          )
        )
        .limit(1),
      transaction
        .select({
          editionId: applicationRounds.editionId,
          id: applicationRounds.id,
          roundKey: applicationRounds.roundKey,
        })
        .from(applicationRounds)
        .where(eq(applicationRounds.id, requestedRound.id))
        .limit(1),
    ]);
    const roundByIdentity = roundByIdentityRows[0];
    const requestedRoundIdRow = requestedRoundIdRows[0];
    const roundEvidenceChanged = Boolean(
      roundByIdentity &&
        valuesDiffer(
          {
            applicationUrl: normalizedApplicationUrl(
              roundByIdentity.applicationUrl
            ),
            audience: [...roundByIdentity.audience].sort(),
            deadlineDate: roundByIdentity.deadlineDate,
            deadlinePrecision: roundByIdentity.deadlinePrecision,
            deadlineTime: roundByIdentity.deadlineTime,
            deadlineTimezone: roundByIdentity.deadlineTimezone,
            deadlineType: roundByIdentity.deadlineType,
            opensAt: roundByIdentity.opensAt?.toISOString() ?? null,
            status: roundByIdentity.status,
            supersedesRoundId: roundByIdentity.supersedesRoundId,
          },
          {
            applicationUrl: normalizedApplicationUrl(
              requestedRound.application_url
            ),
            audience: [...requestedRound.audience].sort(),
            ...requestedDeadline,
            deadlineType: requestedRound.deadline_type,
            opensAt: requestedRound.opens_at
              ? new Date(requestedRound.opens_at).toISOString()
              : null,
            status: requestedRound.status,
            supersedesRoundId: requestedRound.supersedes_round_id,
          }
        )
    );
    const roundStructuralEvidenceChanged = Boolean(
      roundByIdentity &&
        (valuesDiffer(
          [...roundByIdentity.audience].sort(),
          [...requestedRound.audience].sort()
        ) ||
          valuesDiffer(
            roundByIdentity.supersedesRoundId,
            requestedRound.supersedes_round_id
          ) ||
          valuesDiffer(
            roundByIdentity.deadlineType,
            requestedRound.deadline_type
          ))
    );
    if (
      sourceAlreadyLinksEdition &&
      !hasExplicitEditionYear(requestedEdition) &&
      roundByIdentity &&
      roundEvidenceChanged
    ) {
      throw new IdempotencyConflictError(
        "Recurring source has ambiguous yearless edition identity; preserve historical round timing and resolve the cycle through review."
      );
    }
    if (
      roundByIdentity &&
      requestedRound.id !== roundByIdentity.id &&
      roundStructuralEvidenceChanged
    ) {
      throw new IdempotencyConflictError(
        "Application round identity is ambiguous; preserve the existing round and resolve the conflicting round evidence through review."
      );
    }
    let canonicalRoundId = roundByIdentity?.id ?? requestedRound.id;
    if (
      !roundByIdentity &&
      requestedRoundIdRow &&
      (requestedRoundIdRow.editionId !== canonicalEditionId ||
        requestedRoundIdRow.roundKey !== requestedRoundIdentity)
    ) {
      canonicalRoundId = deterministicUuid({
        editionId: canonicalEditionId,
        kind: "application_round",
        roundKey: requestedRoundIdentity,
      });
    }
    round = {
      ...requestedRound,
      edition_id: canonicalEditionId,
      id: canonicalRoundId,
    };

    const [
      existingRawSnapshotRows,
      existingEditionRows,
      existingRoundRows,
      existingEligibilityRows,
      existingAgeRuleRows,
      existingFeeRows,
      existingResolvedRows,
      currentVersionRows,
    ] = await Promise.all([
      transaction
        .select()
        .from(snapshots)
        .where(
          and(
            eq(snapshots.sourceDocumentId, sourceDocument.id),
            eq(snapshots.contentHash, snapshot.content_sha256)
          )
        )
        .orderBy(desc(snapshots.fetchedAt))
        .limit(1),
      transaction
        .select()
        .from(editions)
        .where(eq(editions.id, edition.id))
        .limit(1),
      transaction
        .select()
        .from(applicationRounds)
        .where(eq(applicationRounds.id, round.id))
        .limit(1),
      transaction
        .select()
        .from(eligibilityProfiles)
        .where(eq(eligibilityProfiles.editionId, edition.id))
        .limit(1),
      transaction
        .select()
        .from(eligibilityAgeRules)
        .where(eq(eligibilityAgeRules.editionId, edition.id)),
      transaction
        .select()
        .from(applicationFees)
        .where(eq(applicationFees.editionId, edition.id))
        .limit(1),
      transaction
        .select()
        .from(resolvedFields)
        .where(
          and(
            eq(resolvedFields.entityType, "edition"),
            eq(resolvedFields.entityId, edition.id)
          )
        ),
      transaction
        .select()
        .from(publicationVersions)
        .where(eq(publicationVersions.editionId, edition.id))
        .orderBy(desc(publicationVersions.version))
        .limit(1)
        .for("update"),
    ]);
    const existingRawSnapshot = existingRawSnapshotRows[0];
    const existingEdition = existingEditionRows[0];
    const existingRound = existingRoundRows[0];
    const existingEligibility = existingEligibilityRows[0];
    const existingFee = existingFeeRows[0];
    const currentVersion = currentVersionRows[0];
    const existingSemanticRows = currentVersion
      ? await transaction
          .select()
          .from(fieldSemanticStates)
          .where(
            eq(fieldSemanticStates.publicationVersionId, currentVersion.id)
          )
          .orderBy(desc(fieldSemanticStates.resolvedAt))
      : [];

    let persistedSnapshotId = existingRawSnapshot?.id;
    if (!persistedSnapshotId) {
      const insertedSnapshotRows = await transaction
        .insert(snapshots)
        .values({
          id: snapshot.id,
          sourceDocumentId: sourceDocument.id,
          fetchedAt: new Date(snapshot.fetched_at),
          finalUrl: snapshot.final_url,
          statusCode: snapshot.status_code,
          headers: snapshot.headers,
          fetchMode: snapshot.render_mode,
          contentHash: snapshot.content_sha256,
          semanticHash: snapshot.semantic_sha256,
          storageKey: snapshot.storage_key ?? `inline:${snapshot.id}`,
          rawContent: snapshot.html,
          redirectChain: snapshot.redirect_chain,
          extractorVersion: snapshot.extractor_version,
          elapsedMs: snapshot.elapsed_ms,
        })
        .onConflictDoNothing()
        .returning({ id: snapshots.id });
      persistedSnapshotId = insertedSnapshotRows[0]?.id;
      if (!persistedSnapshotId) {
        const persistedSnapshotRows = await transaction
          .select({ id: snapshots.id })
          .from(snapshots)
          .where(
            and(
              eq(snapshots.sourceDocumentId, sourceDocument.id),
              eq(snapshots.contentHash, snapshot.content_sha256)
            )
          )
          .limit(1);
        persistedSnapshotId = persistedSnapshotRows[0]?.id;
      }
    }
    if (!persistedSnapshotId) {
      throw new Error("Failed to persist or reuse the raw source snapshot.");
    }

    await transaction
      .insert(extractionRuns)
      .values({
        id: extractionRun.id,
        snapshotId: persistedSnapshotId,
        pipelineVersion: extractionRun.pipeline_version,
        startedAt: new Date(extractionRun.started_at),
        completedAt: extractionRun.completed_at
          ? new Date(extractionRun.completed_at)
          : null,
        pageRole: extractionRun.page_role,
        status: extractionRun.status,
        errorType: extractionRun.error_type,
        durationMs: extractionRun.duration_ms,
        assertionCount: extractionRun.assertion_count,
      })
      .onConflictDoNothing();

    await transaction
      .insert(programs)
      .values({
        id: program.id,
        canonicalName: program.canonical_name,
        aliases: program.aliases,
        organizerId: program.organizer_id,
        opportunityTypes: program.opportunity_types,
        subjectAreas: program.subject_areas,
        typicalCycle: program.typical_cycle,
        officialHomepage: program.official_homepage,
        active: program.active,
      })
      .onConflictDoUpdate({
        target: programs.id,
        set: {
          aliases: program.aliases,
          canonicalName: program.canonical_name,
          opportunityTypes: program.opportunity_types,
          subjectAreas: program.subject_areas,
          typicalCycle: program.typical_cycle,
        },
      });

    const editionIdentity = editionIdentityKey(edition);
    await transaction
      .insert(editions)
      .values({
        id: edition.id,
        programId: edition.program_id,
        identityKey: editionIdentity,
        editionLabel: edition.edition_label,
        editionYear: edition.edition_year,
        cycle: edition.cycle,
        startDate: edition.start_date,
        endDate: edition.end_date,
        status: edition.status,
        firstSeenAt: new Date(edition.first_seen_at),
        lastVerifiedAt: edition.last_verified_at
          ? new Date(edition.last_verified_at)
          : new Date(snapshot.fetched_at),
      })
      .onConflictDoUpdate({
        target: editions.id,
        set: {
          cycle: edition.cycle,
          editionLabel: edition.edition_label,
          editionYear: edition.edition_year,
          endDate: edition.end_date,
          lastVerifiedAt: edition.last_verified_at
            ? new Date(edition.last_verified_at)
            : new Date(snapshot.fetched_at),
          startDate: edition.start_date,
          status: edition.status,
        },
      });

    await transaction
      .insert(editionSourceDocuments)
      .values({
        editionId: edition.id,
        sourceDocumentId: sourceDocument.id,
        relationshipRole: sourceDocument.document_role,
        authoritative: source.authority_tier >= 90,
        lastSeenAt: new Date(snapshot.fetched_at),
      })
      .onConflictDoUpdate({
        target: [
          editionSourceDocuments.editionId,
          editionSourceDocuments.sourceDocumentId,
          editionSourceDocuments.relationshipRole,
        ],
        set: {
          authoritative: source.authority_tier >= 90,
          lastSeenAt: new Date(snapshot.fetched_at),
        },
      });

    const deadline = requestedDeadline;
    const existingResolvedByName = new Map(
      existingResolvedRows.map((field) => [field.fieldName, field])
    );
    const existingSemanticByName = new Map<
      string,
      (typeof existingSemanticRows)[number]
    >();
    for (const field of existingSemanticRows) {
      if (!existingSemanticByName.has(field.fieldName)) {
        existingSemanticByName.set(field.fieldName, field);
      }
    }
    const semanticInterpretationChanged = valuesDiffer(
      Object.fromEntries(
        [...existingSemanticByName].map(([fieldName, field]) => [
          fieldName,
          {
            state: field.state,
            value: normalizedMaterialValue(fieldName, field.value),
          },
        ])
      ),
      Object.fromEntries(
        Object.values(semanticFields).map((field) => [
          field.field_name,
          {
            state: field.state,
            value: normalizedMaterialValue(field.field_name, field.value),
          },
        ])
      )
    );
    const resolvedInterpretationChanged = valuesDiffer(
      Object.fromEntries(
        [...existingResolvedByName].map(([fieldName, field]) => [
          fieldName,
          normalizedMaterialValue(fieldName, field.resolvedValue),
        ])
      ),
      Object.fromEntries(
        Object.values(ingestion.resolved_fields).map((field) => [
          field.field_name,
          normalizedMaterialValue(field.field_name, field.value),
        ])
      )
    );
    const currentAssertionIdsFor = (fieldName: string): string[] =>
      ingestion.resolved_fields[fieldName]?.selected_assertion_ids ?? [];
    const previousAssertionIdsFor = (fieldName: string): string[] =>
      existingResolvedByName.get(fieldName)?.selectedAssertionIds ?? [];
    const changesByField = new Map<string, MaterialChange>();
    const registerChange = (change: MaterialChange | null): void => {
      if (change) {
        changesByField.set(change.fieldName, change);
      }
    };
    for (const field of Object.values(ingestion.resolved_fields)) {
      const previous = existingResolvedByName.get(field.field_name);
      if (previous) {
        registerChange(
          materialChange({
            currentAssertionIds: field.selected_assertion_ids,
            currentValue: normalizedMaterialValue(
              field.field_name,
              field.value
            ),
            editionId: edition.id,
            fieldName: field.field_name,
            previousAssertionIds: previous.selectedAssertionIds,
            previousValue: normalizedMaterialValue(
              field.field_name,
              previous.resolvedValue
            ),
            snapshotId: snapshot.id,
          })
        );
      }
    }
    if (existingEdition) {
      for (const [fieldName, previousValue, currentValue] of [
        ["edition_year", existingEdition.editionYear, edition.edition_year],
        ["start_date", existingEdition.startDate, edition.start_date],
        ["end_date", existingEdition.endDate, edition.end_date],
        ["lifecycle_status", existingEdition.status, edition.status],
      ] as const) {
        registerChange(
          materialChange({
            currentAssertionIds: currentAssertionIdsFor(fieldName),
            currentValue,
            editionId: edition.id,
            fieldName,
            previousAssertionIds: previousAssertionIdsFor(fieldName),
            previousValue,
            snapshotId: snapshot.id,
          })
        );
      }
    }
    if (existingRound) {
      for (const [fieldName, previousValue, currentValue] of [
        [
          "application_deadline",
          existingRound.deadlineDate,
          deadline.deadlineDate,
        ],
        [
          "application_url",
          normalizedApplicationUrl(existingRound.applicationUrl),
          normalizedApplicationUrl(round.application_url),
        ],
      ] as const) {
        registerChange(
          materialChange({
            currentAssertionIds: currentAssertionIdsFor(fieldName),
            currentValue,
            editionId: edition.id,
            fieldName,
            previousAssertionIds: previousAssertionIdsFor(fieldName),
            previousValue,
            snapshotId: snapshot.id,
          })
        );
      }
    }
    if (existingEligibility) {
      const currentAgeRules = eligibility.age_rules
        .map((rule) => ({
          birthdate_end: rule.birthdate_end,
          birthdate_end_inclusive: rule.birthdate_end_inclusive,
          birthdate_start: rule.birthdate_start,
          birthdate_start_inclusive: rule.birthdate_start_inclusive,
          exact_age: rule.exact_age,
          maximum_age: rule.maximum_age,
          maximum_inclusive: rule.maximum_inclusive,
          minimum_age: rule.minimum_age,
          minimum_inclusive: rule.minimum_inclusive,
          reference_date: rule.reference_date,
          reference_type: rule.reference_type,
          source_text: rule.source_text,
        }))
        .sort((left, right) =>
          stableJson(left).localeCompare(stableJson(right))
        );
      const previousAgeRules = existingAgeRuleRows
        .map((rule) => ({
          birthdate_end: rule.birthdateEnd,
          birthdate_end_inclusive: rule.birthdateEndInclusive,
          birthdate_start: rule.birthdateStart,
          birthdate_start_inclusive: rule.birthdateStartInclusive,
          exact_age: rule.exactAge,
          maximum_age: rule.maximumAge,
          maximum_inclusive: rule.maximumInclusive,
          minimum_age: rule.minimumAge,
          minimum_inclusive: rule.minimumInclusive,
          reference_date: rule.referenceDate,
          reference_type: rule.referenceType,
          source_text: rule.sourceText,
        }))
        .sort((left, right) =>
          stableJson(left).localeCompare(stableJson(right))
        );
      registerChange(
        materialChange({
          currentAssertionIds: eligibility.source_assertion_ids,
          currentValue: {
            age_rules: currentAgeRules,
            brazil_status: eligibility.brazil_status,
            citizenship_scope: eligibility.citizenship_scope,
            education_levels: eligibility.education_levels,
            residence_scope: eligibility.residence_scope,
            unknowns: eligibility.unknowns,
          },
          editionId: edition.id,
          fieldName: "eligibility",
          previousAssertionIds: existingEligibility.sourceAssertionIds,
          previousValue: {
            age_rules: previousAgeRules,
            brazil_status: existingEligibility.brazilStatus,
            citizenship_scope: existingEligibility.citizenshipScope,
            education_levels: existingEligibility.educationLevels,
            residence_scope: existingEligibility.residenceScope,
            unknowns: existingEligibility.unknowns,
          },
          snapshotId: snapshot.id,
        })
      );
    }
    if (existingFee) {
      registerChange(
        materialChange({
          currentAssertionIds: currentAssertionIdsFor("cost"),
          currentValue: {
            amount: normalizedMoneyAmount(draft.cost),
            currency: draft.currency,
            is_free: draft.is_free,
          },
          editionId: edition.id,
          fieldName: "cost",
          previousAssertionIds: existingFee.sourceAssertionIds,
          previousValue: {
            amount: normalizedMoneyAmount(existingFee.applicationFeeAmount),
            currency: existingFee.currency,
            is_free: existingFee.isFree,
          },
          snapshotId: snapshot.id,
        })
      );
    }
    for (const field of Object.values(semanticFields)) {
      const previous = existingSemanticByName.get(field.field_name);
      if (
        !(
          previous &&
          valuesDiffer(
            {
              state: previous.state,
              value: normalizedMaterialValue(field.field_name, previous.value),
            },
            {
              state: field.state,
              value: normalizedMaterialValue(field.field_name, field.value),
            }
          )
        )
      ) {
        continue;
      }
      changesByField.set(field.field_name, {
        currentAssertionIds: field.supporting_assertion_ids,
        currentValue: {
          state: field.state,
          value: field.value,
        },
        fieldName: field.field_name,
        previousAssertionIds: previous.supportingAssertionIds,
        previousValue: {
          state: previous.state,
          value: previous.value,
        },
        reviewTaskId: deterministicUuid({
          editionId: edition.id,
          fieldName: field.field_name,
          kind: "semantic_material_change",
          snapshotId: snapshot.id,
        }),
        severity: semanticChangeSeverity(field.criticality),
      });
    }
    const materialChanges = [...changesByField.values()];

    await transaction
      .insert(applicationRounds)
      .values({
        id: round.id,
        editionId: round.edition_id,
        roundKey: roundIdentityKey(round),
        roundName: round.round_name,
        opensAt: round.opens_at ? new Date(round.opens_at) : null,
        ...deadline,
        deadlineType: round.deadline_type,
        applicationUrl: round.application_url,
        status: round.status,
        region: round.region,
        audience: round.audience,
        supersedesRoundId: round.supersedes_round_id,
      })
      .onConflictDoUpdate({
        target: applicationRounds.id,
        set: {
          applicationUrl: round.application_url,
          audience: round.audience,
          ...deadline,
          deadlineType: round.deadline_type,
          opensAt: round.opens_at ? new Date(round.opens_at) : null,
          region: round.region,
          roundName: round.round_name,
          status: round.status,
          supersedesRoundId: round.supersedes_round_id,
        },
      });

    if (ingestion.assertions.length > 0) {
      await transaction
        .insert(fieldAssertions)
        .values(
          ingestion.assertions.map((assertion) => ({
            id: assertion.id,
            extractionRunId: assertion.extraction_run_id,
            snapshotId: persistedSnapshotId,
            sourceDocumentId: assertion.source_document_id,
            fieldName: assertion.field_name,
            normalizedValue: assertion.normalized_value,
            rawValue: assertion.raw_value,
            evidenceText: assertion.evidence_text,
            evidenceLocator: assertion.evidence_locator,
            extractor: assertion.extractor,
            sourceAuthority: assertion.source_authority,
            documentRole: assertion.document_role,
            assertedAt: new Date(assertion.asserted_at),
            validFrom: assertion.valid_from
              ? new Date(assertion.valid_from)
              : null,
            validUntil: assertion.valid_until
              ? new Date(assertion.valid_until)
              : null,
            editionSignal: assertion.edition_signal,
            validationStatus: assertion.validation_status,
            critical: assertion.critical,
            supersedesAssertionId: assertion.supersedes_assertion_id,
          }))
        )
        .onConflictDoNothing();
    }

    if (
      existingEdition &&
      currentVersion &&
      materialChanges.length === 0 &&
      !semanticInterpretationChanged &&
      !resolvedInterpretationChanged
    ) {
      const [gateRows, openTaskRows] = await Promise.all([
        transaction
          .select({ outcome: publicationGateDecisions.outcome })
          .from(publicationGateDecisions)
          .where(
            eq(publicationGateDecisions.publicationVersionId, currentVersion.id)
          )
          .orderBy(desc(publicationGateDecisions.decidedAt))
          .limit(1),
        transaction
          .select({ id: reviewTasks.id })
          .from(reviewTasks)
          .where(
            and(
              eq(reviewTasks.entityId, edition.id),
              eq(reviewTasks.status, "open")
            )
          ),
      ]);
      const verifiedAt = new Date(snapshot.fetched_at);
      await transaction
        .update(sourceDocuments)
        .set({
          lastSeenAt: verifiedAt,
          operationalState: "unchanged",
        })
        .where(eq(sourceDocuments.id, sourceDocument.id));
      const unchangedResponse: PersistIngestionResult = {
        edition_id: edition.id,
        editorial_state: currentVersion.editorialState,
        gate_outcome: gateRows[0]?.outcome ?? "manual_review",
        publication_version_id: currentVersion.id,
        replayed: false,
        review_task_count: openTaskRows.length,
      };
      await transaction
        .update(idempotencyRequests)
        .set({
          completedAt: new Date(),
          responseBody: { ...unchangedResponse },
          responseStatus: 200,
          state: "completed",
        })
        .where(
          and(
            eq(idempotencyRequests.scope, IDEMPOTENCY_SCOPE),
            eq(idempotencyRequests.key, request.idempotency_key)
          )
        );
      await transaction.insert(auditEvents).values({
        action: "ingestion.semantic_unchanged",
        actorId: extractionRun.pipeline_version,
        actorKind: "pipeline",
        entityId: edition.id,
        entityType: "edition",
        metadata: {
          extraction_run_id: extractionRun.id,
          fetched_at: snapshot.fetched_at,
          incoming_snapshot_id: snapshot.id,
          raw_snapshot_reused: Boolean(existingRawSnapshot),
          snapshot_id: persistedSnapshotId,
        },
      });
      return unchangedResponse;
    }

    for (const field of Object.values(ingestion.resolved_fields)) {
      await transaction
        .insert(resolvedFields)
        .values({
          entityType: "edition",
          entityId: edition.id,
          fieldName: field.field_name,
          resolvedValue: field.value,
          selectedAssertionIds: field.selected_assertion_ids,
          alternativeAssertionIds: field.alternative_assertion_ids,
          conflict: field.conflict,
          resolutionReason: field.resolution_reason,
          selectedAuthority: field.selected_authority,
        })
        .onConflictDoUpdate({
          target: [
            resolvedFields.entityType,
            resolvedFields.entityId,
            resolvedFields.fieldName,
          ],
          set: {
            alternativeAssertionIds: field.alternative_assertion_ids,
            conflict: field.conflict,
            resolutionReason: field.resolution_reason,
            resolvedValue: field.value,
            selectedAssertionIds: field.selected_assertion_ids,
            selectedAuthority: field.selected_authority,
          },
        });
    }

    await transaction
      .insert(eligibilityProfiles)
      .values({
        editionId: edition.id,
        brazilStatus: eligibility.brazil_status,
        citizenshipScope: eligibility.citizenship_scope,
        residenceScope: eligibility.residence_scope,
        includedNationalities: eligibility.included_nationalities,
        excludedNationalities: eligibility.excluded_nationalities,
        eligibleRegions: eligibility.eligible_regions,
        residenceRegions: eligibility.residence_regions,
        schoolLocationRequirements: eligibility.school_location_requirements,
        educationLevels: eligibility.education_levels,
        gradeRequirements: eligibility.grade_requirements,
        institutionalRestrictions: eligibility.institutional_restrictions,
        languageRequirements: eligibility.language_requirements,
        otherRequirements: eligibility.other_requirements,
        sourceAssertionIds: eligibility.source_assertion_ids,
        conflictingAssertionIds: eligibility.conflicting_assertion_ids,
        unknowns: eligibility.unknowns,
      })
      .onConflictDoUpdate({
        target: eligibilityProfiles.editionId,
        set: {
          brazilStatus: eligibility.brazil_status,
          citizenshipScope: eligibility.citizenship_scope,
          conflictingAssertionIds: eligibility.conflicting_assertion_ids,
          educationLevels: eligibility.education_levels,
          eligibleRegions: eligibility.eligible_regions,
          excludedNationalities: eligibility.excluded_nationalities,
          gradeRequirements: eligibility.grade_requirements,
          includedNationalities: eligibility.included_nationalities,
          institutionalRestrictions: eligibility.institutional_restrictions,
          interpretedAt: new Date(),
          languageRequirements: eligibility.language_requirements,
          otherRequirements: eligibility.other_requirements,
          residenceRegions: eligibility.residence_regions,
          residenceScope: eligibility.residence_scope,
          schoolLocationRequirements: eligibility.school_location_requirements,
          sourceAssertionIds: eligibility.source_assertion_ids,
          unknowns: eligibility.unknowns,
        },
      });

    if (existingEligibility) {
      await transaction
        .delete(eligibilityAgeRules)
        .where(eq(eligibilityAgeRules.editionId, edition.id));
    }
    for (const rule of eligibility.age_rules) {
      const identityKey = sha256(rule);
      await transaction
        .insert(eligibilityAgeRules)
        .values({
          editionId: edition.id,
          identityKey,
          minimumAge: rule.minimum_age,
          maximumAge: rule.maximum_age,
          minimumInclusive: rule.minimum_inclusive,
          maximumInclusive: rule.maximum_inclusive,
          exactAge: rule.exact_age,
          birthdateStart: rule.birthdate_start,
          birthdateEnd: rule.birthdate_end,
          birthdateStartInclusive: rule.birthdate_start_inclusive,
          birthdateEndInclusive: rule.birthdate_end_inclusive,
          referenceType: rule.reference_type,
          referenceDate: rule.reference_date,
          sourceText: rule.source_text,
          sourceAssertionIds: rule.source_assertion_ids,
        })
        .onConflictDoNothing();
    }

    const applicationLinkId = deterministicUuid({
      assessment: ingestion.application_link,
      roundId: round.id,
      snapshotId: snapshot.id,
    });
    await transaction
      .insert(applicationLinkAssessments)
      .values({
        id: applicationLinkId,
        applicationRoundId: round.id,
        status: mapApplicationLinkStatus(ingestion.application_link),
        originalUrl: ingestion.application_link.original_url,
        finalUrl: ingestion.application_link.final_url,
        httpStatus: ingestion.application_link.http_status,
        documentRole: ingestion.application_link.document_role,
        editionYear: ingestion.application_link.edition_year,
        acceptsSubmissions: ingestion.application_link.accepts_submissions,
        checkedAt: ingestion.application_link.checked_at
          ? new Date(ingestion.application_link.checked_at)
          : null,
        reasons: ingestion.application_link.reasons,
      })
      .onConflictDoNothing();

    const productFitId = deterministicUuid({
      editionId: edition.id,
      fit,
      siteContract,
      snapshotId: snapshot.id,
    });
    await transaction
      .insert(productFitAssessments)
      .values({
        id: productFitId,
        editionId: edition.id,
        decision: fit.decision,
        reasons: fit.reasons,
        explanations: fit.explanations,
        evidenceAssertionIds: fit.evidence_assertion_ids,
        siteCollection: siteContract.collection,
        mappedOpportunityTypes: siteContract.mapped_opportunity_types,
        mappedEducationLevels: siteContract.mapped_education_levels,
        unmappedValues: siteContract.unmapped_values,
        siteContractCompatible: siteContract.compatible,
        measuredCohortEligible: false,
      })
      .onConflictDoNothing();

    const acceptsRequestedVersion =
      !currentVersion ||
      (publicationVersion.version === currentVersion.version + 1 &&
        (!publicationVersion.supersedes_version_id ||
          publicationVersion.supersedes_version_id === currentVersion.id));
    const effectivePublicationVersion = currentVersion
      ? {
          id: acceptsRequestedVersion
            ? publicationVersion.id
            : deterministicUuid({
                editionId: edition.id,
                snapshotId: snapshot.id,
                version: currentVersion.version + 1,
              }),
          supersedesVersionId: currentVersion.id,
          version: currentVersion.version + 1,
        }
      : {
          id: publicationVersion.id,
          supersedesVersionId: publicationVersion.supersedes_version_id,
          version: publicationVersion.version,
        };

    if (ingestion.review_tasks.length > 0) {
      await transaction
        .insert(reviewTasks)
        .values(
          ingestion.review_tasks.map((task) => ({
            id: task.id,
            entityType: task.entity_type,
            entityId: edition.id,
            fieldName: task.field_name,
            reason: task.reason,
            severity: task.severity,
            candidateAssertionIds: task.candidate_assertion_ids,
            suggestedValue: task.suggested_value,
            previousValue: task.previous_value,
            explanation: task.explanation,
            status: task.status,
            resolution: task.resolution,
            createdAt: new Date(task.created_at),
            resolvedAt: task.resolved_at ? new Date(task.resolved_at) : null,
          }))
        )
        .onConflictDoNothing();
    }
    if (materialChanges.length > 0) {
      await transaction
        .insert(reviewTasks)
        .values(
          materialChanges.map((change) => ({
            candidateAssertionIds: change.currentAssertionIds,
            entityId: edition.id,
            entityType: "edition",
            explanation: `A recrawl changed "${change.fieldName}" from ${stableJson(change.previousValue)} to ${stableJson(change.currentValue)}. Verify the new source evidence before publishing the update.`,
            fieldName: change.fieldName,
            id: change.reviewTaskId,
            previousValue: change.previousValue,
            reason: "material_source_change",
            severity: change.severity,
            status: "open" as const,
            suggestedValue: change.currentValue,
          }))
        )
        .onConflictDoNothing();
    }

    const gate = resolveGate(requestedGate.outcome);
    const effectiveEditorialState: EditorialState =
      currentVersion &&
      !["expired_archive", "reject"].includes(gate.outcome) &&
      ["approved", "published", "update_pending"].includes(
        currentVersion.editorialState
      ) &&
      materialChanges.length > 0
        ? "update_pending"
        : gate.editorialState;
    const publicSemanticFields = projectSemanticFieldsForPublic(semanticFields);
    const modalityField = semanticFields.modality;
    const modalityValue =
      modalityField?.state === "explicit_value"
        ? modalityField.value
        : "unknown";
    const parsedModality = modalitySchema.safeParse(modalityValue);
    const ageRules =
      semanticFields.age?.state === "explicit_value"
        ? eligibility.age_rules
        : [];
    const brazilEligibility =
      semanticFields.brazilian_eligibility?.state === "explicit_value"
        ? eligibility.brazil_status
        : "unknown";
    const deadlineDate =
      semanticFields.application_deadline?.state === "explicit_value"
        ? deadline.deadlineDate
        : null;
    const applicationUrl =
      semanticFields.application_url?.state === "explicit_value"
        ? round.application_url
        : null;
    const freeField = semanticFields.is_free;
    const isFree =
      freeField?.state === "explicit_value" &&
      typeof freeField.value === "boolean"
        ? freeField.value
        : null;
    const programCost = semanticFields.program_cost;
    const applicationFee = semanticFields.application_fee;
    const hasExplicitCost =
      programCost?.state === "explicit_value" ||
      applicationFee?.state === "explicit_value";
    const costAmount =
      hasExplicitCost && draft.cost !== null ? String(draft.cost) : null;
    const publicProjection = publicOpportunityV1Schema.parse({
      age_rules: ageRules,
      application_deadline_date: deadlineDate,
      application_deadline_time: deadline.deadlineTime,
      application_deadline_timezone: deadline.deadlineTimezone,
      application_link_status: mapApplicationLinkStatus(
        ingestion.application_link
      ),
      application_url: applicationUrl,
      brazil_eligibility: brazilEligibility,
      collection: siteContract.collection,
      cost_amount: costAmount,
      currency: draft.currency,
      deadline_precision: deadline.deadlinePrecision,
      description: draft.description,
      education_levels: siteContract.mapped_education_levels,
      end_date: edition.end_date,
      id: edition.id,
      image_url:
        semanticFields.image?.state === "explicit_value"
          ? draft.image_url
          : null,
      is_free: isFree,
      last_verified_at:
        edition.last_verified_at ?? new Date(snapshot.fetched_at).toISOString(),
      lifecycle: edition.status,
      location:
        ["explicit_value", "not_applicable"].includes(
          semanticFields.city?.state ?? ""
        ) || semanticFields.country?.state === "explicit_value"
          ? draft.location
          : null,
      modality: parsedModality.success ? parsedModality.data : "unknown",
      official_information_url: draft.canonical_url,
      opportunity_types: siteContract.mapped_opportunity_types,
      organizer:
        semanticFields.organizer?.state === "explicit_value"
          ? draft.organizer
          : null,
      publication_version_id: effectivePublicationVersion.id,
      start_date: edition.start_date,
      semantic_fields: publicSemanticFields,
      title: draft.title,
    });
    const insertedPublicationVersions = await transaction
      .insert(publicationVersions)
      .values({
        id: effectivePublicationVersion.id,
        editionId: edition.id,
        version: effectivePublicationVersion.version,
        editorialState: effectiveEditorialState,
        payload: {
          ...publicationVersion.payload,
          public_projection: publicProjection,
        },
        compatibilityPayload: draft,
        supportingAssertionIds: publicationVersion.supporting_assertion_ids,
        createdAt: new Date(publicationVersion.created_at),
        createdBy: publicationVersion.created_by,
        supersedesVersionId: effectivePublicationVersion.supersedesVersionId,
      })
      .onConflictDoNothing()
      .returning({ id: publicationVersions.id });
    if (insertedPublicationVersions.length === 0) {
      throw new IdempotencyConflictError(
        "The next publication version conflicts with an existing version."
      );
    }

    for (const field of Object.values(semanticFields)) {
      const semanticStateId = deterministicUuid({
        fieldName: field.field_name,
        publicationVersionId: effectivePublicationVersion.id,
        semanticState: field.state,
      });
      await transaction.insert(fieldSemanticStates).values({
        id: semanticStateId,
        editionId: edition.id,
        publicationVersionId: effectivePublicationVersion.id,
        extractionRunId: extractionRun.id,
        fieldName: field.field_name,
        state: field.state,
        value: field.value,
        criticality: field.criticality,
        reasonCode: field.reason_code,
        publicExplanation: field.public_explanation,
        supportingAssertionIds: field.supporting_assertion_ids,
        alternativeAssertionIds: field.alternative_assertion_ids,
        conflictingAssertionIds: field.conflicting_assertion_ids,
        gateImpact: field.gate_impact,
        resolvedAt: new Date(field.resolved_at),
        lastVerifiedAt: field.last_verified_at
          ? new Date(field.last_verified_at)
          : null,
      });
      await transaction.insert(fieldApplicabilityAssessments).values({
        id: deterministicUuid({
          kind: "applicability",
          semanticStateId,
        }),
        semanticStateId,
        editionId: edition.id,
        fieldName: field.field_name,
        applicability: field.applicability,
        reasonCode: field.applicability_reason_code,
        evidenceAssertionIds: field.supporting_assertion_ids,
        assessedAt: new Date(field.resolved_at),
      });
      await transaction.insert(fieldSourceCoverage).values({
        id: deterministicUuid({
          kind: "coverage",
          semanticStateId,
        }),
        semanticStateId,
        editionId: edition.id,
        fieldName: field.field_name,
        coverageState: field.source_coverage.state,
        checkedSourceRoles: field.source_coverage.checked_source_roles,
        uncheckedSourceRoles: field.source_coverage.unchecked_source_roles,
        failureCodes: field.source_coverage.failure_codes,
        authoritativeSourcesChecked:
          field.source_coverage.authoritative_sources_checked,
        unprocessedOfficialDocuments:
          field.source_coverage.unprocessed_official_documents,
        assessedAt: field.source_coverage.last_checked_at
          ? new Date(field.source_coverage.last_checked_at)
          : new Date(field.resolved_at),
      });
      await transaction.insert(fieldDisplayProjections).values({
        id: deterministicUuid({
          kind: "display",
          locale: "pt-BR",
          semanticStateId,
        }),
        semanticStateId,
        editionId: edition.id,
        fieldName: field.field_name,
        locale: "pt-BR",
        displayKey: field.display_key,
        displayParameters: field.display_parameters,
        displayText: formatSemanticField(field),
        publicVisible: field.state !== "suppressed",
        createdAt: new Date(field.resolved_at),
      });
    }

    const supersededHistoricalTasks = await transaction
      .update(reviewTasks)
      .set({
        resolution:
          "Superseded by an evidence-backed semantic recapture and a new publication version.",
        resolvedAt: new Date(snapshot.fetched_at),
        status: "resolved",
      })
      .where(
        and(
          eq(reviewTasks.entityId, edition.id),
          eq(reviewTasks.status, "open"),
          or(
            eq(reviewTasks.reason, "historical_semantic_state_pending"),
            eq(reviewTasks.reason, "semantic_state_audit")
          )
        )
      )
      .returning({ id: reviewTasks.id });
    if (supersededHistoricalTasks.length > 0) {
      await transaction
        .insert(auditEvents)
        .values({
          id: deterministicUuid({
            action: "semantic_history_superseded",
            publicationVersionId: effectivePublicationVersion.id,
          }),
          actorId: "ingestion-service",
          actorKind: "service",
          action: "semantic_state_history.superseded",
          entityType: "edition",
          entityId: edition.id,
          metadata: {
            publication_version_id: effectivePublicationVersion.id,
            resolved_review_task_ids: supersededHistoricalTasks.map(
              (task) => task.id
            ),
          },
        })
        .onConflictDoNothing();
    }

    const gateExplanations = [...requestedGate.explanations];
    const gateReasons = [...requestedGate.reasons];
    if (requestedGate.outcome === "auto_ready") {
      gateExplanations.push(
        `Source cohort "${request.source_cohort}" has not passed a measured auto-publication threshold.`
      );
    }
    if (materialChanges.length > 0) {
      gateExplanations.push(
        `${materialChanges.length} material field change(s) require review before the published record is replaced.`
      );
    }
    await transaction
      .insert(publicationGateDecisions)
      .values({
        id: deterministicUuid({
          editionId: edition.id,
          gate,
          publicationVersionId: effectivePublicationVersion.id,
          snapshotId: snapshot.id,
        }),
        editionId: edition.id,
        publicationVersionId: effectivePublicationVersion.id,
        productFitAssessmentId: productFitId,
        outcome: gate.outcome,
        reasons: gateReasons,
        blockingFields: [
          ...new Set([
            ...requestedGate.blocking_fields,
            ...materialChanges.map((change) => change.fieldName),
          ]),
        ],
        explanations: gateExplanations,
        sourceCohort: request.source_cohort,
        sourceCohortMeasured: false,
      })
      .onConflictDoNothing();

    if (materialChanges.length > 0) {
      await transaction.insert(materialChangeEvents).values(
        materialChanges.map((change) => ({
          currentAssertionIds: change.currentAssertionIds,
          currentValue: change.currentValue,
          editionId: edition.id,
          fieldName: change.fieldName,
          previousAssertionIds: change.previousAssertionIds,
          previousValue: change.previousValue,
          publicationVersionId: effectivePublicationVersion.id,
          reviewTaskId: change.reviewTaskId,
          severity: change.severity,
          snapshotId: persistedSnapshotId,
        }))
      );
    }

    await transaction
      .insert(applicationFees)
      .values({
        applicationFeeAmount: costAmount,
        editionId: edition.id,
        isFree,
        currency: costAmount === null ? null : draft.currency,
        sourceAssertionIds: [
          ...new Set([
            ...(semanticFields.application_fee?.supporting_assertion_ids ?? []),
            ...(semanticFields.program_cost?.supporting_assertion_ids ?? []),
            ...(semanticFields.is_free?.supporting_assertion_ids ?? []),
          ]),
        ],
      })
      .onConflictDoUpdate({
        target: applicationFees.editionId,
        set: {
          applicationFeeAmount: costAmount,
          currency: costAmount === null ? null : draft.currency,
          isFree,
          sourceAssertionIds: [
            ...new Set([
              ...(semanticFields.application_fee?.supporting_assertion_ids ??
                []),
              ...(semanticFields.program_cost?.supporting_assertion_ids ?? []),
              ...(semanticFields.is_free?.supporting_assertion_ids ?? []),
            ]),
          ],
        },
      });

    const response: PersistIngestionResult = {
      edition_id: edition.id,
      editorial_state: effectiveEditorialState,
      gate_outcome: gate.outcome,
      publication_version_id: effectivePublicationVersion.id,
      replayed: false,
      review_task_count: ingestion.review_tasks.length + materialChanges.length,
    };
    await transaction
      .update(idempotencyRequests)
      .set({
        completedAt: new Date(),
        responseBody: { ...response },
        responseStatus: 201,
        state: "completed",
      })
      .where(
        and(
          eq(idempotencyRequests.scope, IDEMPOTENCY_SCOPE),
          eq(idempotencyRequests.key, request.idempotency_key)
        )
      );

    return response;
  });
};
