import { and, desc, eq, gt, isNull, lt, or } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  compatibilityDraftSchema,
  type PublicationDecisionRequestV1,
  publicOpportunityV1Schema,
} from "@/contracts/opportunity-v1";
import type { schema } from "@/db/schema";
import {
  auditEvents,
  fieldSemanticStates,
  idempotencyRequests,
  outboxEvents,
  productFitAssessments,
  publicationGateDecisions,
  publicationVersions,
  reviewTasks,
} from "@/db/schema/ingestion";
import { nationalOpportunities } from "@/db/schema/national-opportunities";
import { opportunities } from "@/db/schema/opportunities";

const DECISION_SCOPE = "publication-decision.v1";
const IDEMPOTENCY_TTL_DAYS = 30;
const MAX_OUTBOX_ATTEMPTS = 5;
const OUTBOX_LOCK_MINUTES = 10;
const EVENT_TYPE_BY_ACTION = {
  approve: "publication.approved",
  archive: "publication.archived",
  reject: "publication.rejected",
  unpublish: "publication.unpublished",
} as const;

type Database = NodePgDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type EditorialState = typeof publicationVersions.$inferInsert.editorialState;

export interface PublicationDecisionResult {
  action: PublicationDecisionRequestV1["action"];
  editorial_state: EditorialState;
  event_id: string;
  publication_version_id: string;
  replayed: boolean;
}

export interface OutboxDeliveryResult {
  dead_lettered: number;
  delivered: number;
  failed: number;
}

export class PublicationWorkflowError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PublicationWorkflowError";
    this.code = code;
  }
}

const stateForAction = (
  action: PublicationDecisionRequestV1["action"]
): EditorialState => {
  switch (action) {
    case "approve":
      return "approved";
    case "reject":
      return "rejected";
    case "archive":
      return "archived";
    case "unpublish":
      return "unpublished";
    default:
      return "needs_review";
  }
};

const parseDecisionResponse = (
  value: Record<string, unknown> | null
): PublicationDecisionResult => {
  if (
    !value ||
    typeof value.action !== "string" ||
    typeof value.editorial_state !== "string" ||
    typeof value.event_id !== "string" ||
    typeof value.publication_version_id !== "string"
  ) {
    throw new PublicationWorkflowError(
      "IDEMPOTENCY_CONFLICT",
      "Stored decision response is incomplete; use a new idempotency key."
    );
  }
  return {
    action: value.action as PublicationDecisionResult["action"],
    editorial_state:
      value.editorial_state as PublicationDecisionResult["editorial_state"],
    event_id: value.event_id,
    publication_version_id: value.publication_version_id,
    replayed: true,
  };
};

const findCurrentVersion = async (
  transaction: Transaction,
  editionId: string
) => {
  const versions = await transaction
    .select()
    .from(publicationVersions)
    .where(eq(publicationVersions.editionId, editionId))
    .orderBy(desc(publicationVersions.version))
    .limit(1)
    .for("update");
  const version = versions[0];
  if (!version) {
    throw new PublicationWorkflowError(
      "PUBLICATION_NOT_FOUND",
      "No publication version exists for this edition."
    );
  }
  return version;
};

const assertApprovalIsAllowed = async (
  transaction: Transaction,
  publicationVersionId: string
) => {
  const [gateRows, semanticBlockingRows] = await Promise.all([
    transaction
      .select({ outcome: publicationGateDecisions.outcome })
      .from(publicationGateDecisions)
      .where(
        eq(publicationGateDecisions.publicationVersionId, publicationVersionId)
      )
      .orderBy(desc(publicationGateDecisions.decidedAt))
      .limit(1),
    transaction
      .select({
        fieldName: fieldSemanticStates.fieldName,
        state: fieldSemanticStates.state,
      })
      .from(fieldSemanticStates)
      .where(
        and(
          eq(fieldSemanticStates.publicationVersionId, publicationVersionId),
          eq(fieldSemanticStates.gateImpact, "block")
        )
      ),
  ]);
  if (semanticBlockingRows.length > 0) {
    const blockingFields = semanticBlockingRows
      .map((field) => `${field.fieldName} (${field.state})`)
      .join(", ");
    throw new PublicationWorkflowError(
      "SEMANTIC_FIELDS_BLOCK_APPROVAL",
      `Resolve os campos críticos antes da aprovação: ${blockingFields}.`
    );
  }
  const gate = gateRows[0];
  if (!gate) {
    throw new PublicationWorkflowError(
      "GATE_DECISION_MISSING",
      "A publication gate decision is required before approval."
    );
  }
  if (gate.outcome === "reject" || gate.outcome === "expired_archive") {
    throw new PublicationWorkflowError(
      "GATE_BLOCKED",
      `Publication gate outcome "${gate.outcome}" cannot be approved.`
    );
  }
};

export const decidePublication = (
  database: Database,
  editionId: string,
  reviewerId: string,
  request: PublicationDecisionRequestV1
): Promise<PublicationDecisionResult> =>
  database.transaction(async (transaction) => {
    const scope = `${DECISION_SCOPE}:${editionId}`;
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
    const requestFingerprint = JSON.stringify({
      action: request.action,
      editionId,
      expected: request.expected_publication_version,
      reason: request.reason,
    });
    if (existing) {
      if (existing.requestHash !== requestFingerprint) {
        throw new PublicationWorkflowError(
          "IDEMPOTENCY_CONFLICT",
          "Idempotency key was already used for another decision."
        );
      }
      return parseDecisionResponse(existing.responseBody);
    }

    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + IDEMPOTENCY_TTL_DAYS);
    await transaction.insert(idempotencyRequests).values({
      scope,
      key: request.idempotency_key,
      requestHash: requestFingerprint,
      expiresAt,
    });

    const version = await findCurrentVersion(transaction, editionId);
    if (version.version !== request.expected_publication_version) {
      throw new PublicationWorkflowError(
        "VERSION_CONFLICT",
        `Expected version ${request.expected_publication_version}, but current version is ${version.version}.`
      );
    }
    if (request.action === "approve") {
      await assertApprovalIsAllowed(transaction, version.id);
    }

    const targetState = stateForAction(request.action);
    await transaction
      .update(publicationVersions)
      .set({
        approvedAt: request.action === "approve" ? new Date() : null,
        approvedBy: request.action === "approve" ? reviewerId : null,
        editorialState: targetState,
      })
      .where(eq(publicationVersions.id, version.id));

    const resolvedTaskRows =
      request.action === "approve"
        ? await transaction
            .update(reviewTasks)
            .set({
              resolution: `Resolved by publication approval: ${request.reason}`,
              resolvedAt: new Date(),
              reviewerId,
              status: "resolved",
            })
            .where(
              and(
                eq(reviewTasks.entityId, editionId),
                eq(reviewTasks.status, "open")
              )
            )
            .returning({ id: reviewTasks.id })
        : [];

    const eventType = EVENT_TYPE_BY_ACTION[request.action];
    const eventRows = await transaction
      .insert(outboxEvents)
      .values({
        aggregateType: "publication_version",
        aggregateId: version.id,
        eventType,
        payload: {
          action: request.action,
          edition_id: editionId,
          publication_version_id: version.id,
          publication_version: version.version,
          reviewer_id: reviewerId,
        },
        deduplicationKey: `${eventType}:${version.id}:${version.version}`,
      })
      .onConflictDoUpdate({
        target: outboxEvents.deduplicationKey,
        set: { availableAt: new Date() },
      })
      .returning({ id: outboxEvents.id });
    const event = eventRows[0];
    if (!event) {
      throw new PublicationWorkflowError(
        "OUTBOX_WRITE_FAILED",
        "Publication event could not be recorded."
      );
    }

    await transaction.insert(auditEvents).values({
      actorId: reviewerId,
      actorKind: "reviewer",
      action: eventType,
      entityType: "publication_version",
      entityId: version.id,
      metadata: {
        edition_id: editionId,
        from_state: version.editorialState,
        reason: request.reason,
        resolved_review_task_ids: resolvedTaskRows.map((task) => task.id),
        to_state: targetState,
      },
    });

    const response: PublicationDecisionResult = {
      action: request.action,
      editorial_state: targetState,
      event_id: event.id,
      publication_version_id: version.id,
      replayed: false,
    };
    await transaction
      .update(idempotencyRequests)
      .set({
        completedAt: new Date(),
        responseBody: { ...response },
        responseStatus: 200,
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

const displayModality = (value: string | null): string => {
  switch (value) {
    case "in_person":
      return "Presencial";
    case "online":
      return "Online";
    case "hybrid":
      return "Híbrido";
    default:
      return "Modalidade em verificação";
  }
};

const EDUCATION_LEVEL_LABELS: Record<string, string> = {
  elementary_middle: "Ensino Fundamental",
  gap_year: "Ano sabático",
  graduate: "Pós-graduação",
  high_school: "Ensino Médio",
  institution: "Instituição",
  international_secondary: "Ensino Médio internacional",
  recent_graduate: "Recém-formados",
  school_team: "Equipe escolar",
  teacher_educator: "Professores e educadores",
  technical_secondary: "Ensino Técnico",
  undergraduate: "Graduação",
  university_team: "Equipe universitária",
};

const displayEducationLevels = (values: string[]): string =>
  values.map((value) => EDUCATION_LEVEL_LABELS[value] ?? value).join(", ") ||
  "Nível de ensino em verificação";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Compatibility mapping is explicit so unknown legacy values are never inferred.
async function publishCompatibilityProjection(
  transaction: Transaction,
  publicationVersionId: string
) {
  const versionRows = await transaction
    .select()
    .from(publicationVersions)
    .where(eq(publicationVersions.id, publicationVersionId))
    .limit(1);
  const version = versionRows[0];
  if (!version) {
    throw new PublicationWorkflowError(
      "PUBLICATION_NOT_FOUND",
      "Outbox event references a missing publication version."
    );
  }
  const draftResult = compatibilityDraftSchema.safeParse(
    version.compatibilityPayload
  );
  if (!draftResult.success) {
    throw new PublicationWorkflowError(
      "INVALID_PUBLICATION_PAYLOAD",
      "Compatibility projection no longer satisfies contract v1."
    );
  }
  const draft = draftResult.data;
  const publicResult = publicOpportunityV1Schema.safeParse(
    version.payload.public_projection
  );
  if (!publicResult.success) {
    throw new PublicationWorkflowError(
      "INVALID_PUBLICATION_PAYLOAD",
      "Structured public projection no longer satisfies contract v1."
    );
  }
  const publicProjection = publicResult.data;
  if (!(draft.application_deadline && draft.image_url)) {
    throw new PublicationWorkflowError(
      "LEGACY_PROJECTION_INCOMPLETE",
      "Current public tables require a fixed deadline and representative image."
    );
  }

  const fitRows = await transaction
    .select({ collection: productFitAssessments.siteCollection })
    .from(productFitAssessments)
    .where(eq(productFitAssessments.editionId, version.editionId))
    .orderBy(desc(productFitAssessments.assessedAt))
    .limit(1);
  const collection = fitRows[0]?.collection ?? "unknown";
  const opportunityType =
    publicProjection.opportunity_types[0] ??
    draft.categories[0] ??
    "Tipo de oportunidade em verificação";
  const educationLevel = displayEducationLevels(
    publicProjection.education_levels
  );
  const officialInformationUrl = draft.canonical_url;
  const applicationUrl = draft.application_url;
  const lastVerifiedAt = draft.extracted_at
    ? new Date(draft.extracted_at)
    : new Date();

  if (collection === "national") {
    await transaction
      .insert(nationalOpportunities)
      .values({
        id: version.editionId,
        name: draft.title,
        image: draft.image_url,
        country: "Brasil",
        type: opportunityType,
        educationLevel,
        modality: displayModality(draft.modality),
        applicationDeadline: draft.application_deadline,
        about: draft.description,
        shortDescription: draft.description.slice(0, 220),
        duration: "Duração em verificação",
        cityState: draft.location ?? "Local em verificação",
        ageRange: "Regra de idade em verificação",
        requirements: draft.eligibility.join("\n"),
        specificRequirements: draft.eligibility.join("\n"),
        responsibleInstitution: draft.organizer ?? "Organizador em verificação",
        applicationFee:
          draft.is_free === true
            ? "Gratuito"
            : "Taxa de inscrição em verificação",
        benefits: "Benefícios em verificação",
        costs:
          draft.cost === null
            ? "Informações de custo em verificação"
            : String(draft.cost),
        extraCosts: "Custos adicionais em verificação",
        selectionSteps: "Etapas de seleção em verificação",
        officialLink: officialInformationUrl,
        officialInformationUrl,
        applicationUrl,
        publicationVersionId: version.id,
        lifecycleStatus: draft.status === "active" ? "open" : "unknown",
        lastVerifiedAt,
        contact: "Contato disponível na página oficial",
      })
      .onConflictDoUpdate({
        target: nationalOpportunities.id,
        set: {
          about: draft.description,
          applicationDeadline: draft.application_deadline,
          applicationFee:
            draft.is_free === true
              ? "Gratuito"
              : "Taxa de inscrição em verificação",
          applicationUrl,
          benefits: "Benefícios em verificação",
          cityState: draft.location ?? "Local em verificação",
          contact: "Contato disponível na página oficial",
          costs:
            draft.cost === null
              ? "Informações de custo em verificação"
              : String(draft.cost),
          country: "Brasil",
          duration: "Duração em verificação",
          educationLevel,
          extraCosts: "Custos adicionais em verificação",
          image: draft.image_url,
          lastVerifiedAt,
          lifecycleStatus: draft.status === "active" ? "open" : "unknown",
          name: draft.title,
          officialInformationUrl,
          officialLink: officialInformationUrl,
          publicationVersionId: version.id,
          requirements: draft.eligibility.join("\n"),
          responsibleInstitution:
            draft.organizer ?? "Organizador em verificação",
          selectionSteps: "Etapas de seleção em verificação",
          shortDescription: draft.description.slice(0, 220),
          specificRequirements: draft.eligibility.join("\n"),
          type: opportunityType,
        },
      });
    return;
  }
  if (collection !== "international") {
    throw new PublicationWorkflowError(
      "COLLECTION_UNMAPPED",
      "Opportunity collection must be national or international before delivery."
    );
  }

  await transaction
    .insert(opportunities)
    .values({
      id: version.editionId,
      name: draft.title,
      image: draft.image_url,
      country: draft.location ?? "País em verificação",
      city: "Cidade em verificação",
      responsibleInstitution: draft.organizer ?? "Organizador em verificação",
      type: opportunityType,
      description: draft.description,
      educationLevel,
      ageRange: "Regra de idade em verificação",
      languageRequirements: "Requisitos de idioma em verificação",
      specificRequirements: draft.eligibility.join("\n"),
      applicationFee:
        draft.is_free === true
          ? "Gratuito"
          : "Taxa de inscrição em verificação",
      scholarshipType: "Tipo de bolsa em verificação",
      scholarshipCoverage: "Cobertura da bolsa em verificação",
      extraCosts: "Custos adicionais em verificação",
      duration: "Duração em verificação",
      applicationDeadline: draft.application_deadline,
      selectionSteps: "Etapas de seleção em verificação",
      applicationProcess: "Processo de inscrição em verificação",
      officialLink: officialInformationUrl,
      officialInformationUrl,
      applicationUrl,
      publicationVersionId: version.id,
      lifecycleStatus: draft.status === "active" ? "open" : "unknown",
      lastVerifiedAt,
      contact: "Contato disponível na página oficial",
    })
    .onConflictDoUpdate({
      target: opportunities.id,
      set: {
        applicationDeadline: draft.application_deadline,
        applicationFee:
          draft.is_free === true
            ? "Gratuito"
            : "Taxa de inscrição em verificação",
        applicationProcess: "Processo de inscrição em verificação",
        applicationUrl,
        city: "Cidade em verificação",
        contact: "Contato disponível na página oficial",
        country: draft.location ?? "País em verificação",
        description: draft.description,
        duration: "Duração em verificação",
        educationLevel,
        extraCosts: "Custos adicionais em verificação",
        image: draft.image_url,
        languageRequirements: "Requisitos de idioma em verificação",
        lastVerifiedAt,
        lifecycleStatus: draft.status === "active" ? "open" : "unknown",
        name: draft.title,
        officialInformationUrl,
        officialLink: officialInformationUrl,
        publicationVersionId: version.id,
        responsibleInstitution: draft.organizer ?? "Organizador em verificação",
        scholarshipCoverage: "Cobertura da bolsa em verificação",
        scholarshipType: "Tipo de bolsa em verificação",
        selectionSteps: "Etapas de seleção em verificação",
        specificRequirements: draft.eligibility.join("\n"),
        type: opportunityType,
      },
    });
}

type OutboxEvent = typeof outboxEvents.$inferSelect;

const claimPendingEvents = (
  database: Database,
  workerId: string,
  limit = 25
): Promise<OutboxEvent[]> =>
  database.transaction(async (transaction) => {
    const staleBefore = new Date(Date.now() - OUTBOX_LOCK_MINUTES * 60 * 1000);
    const events = await transaction
      .select()
      .from(outboxEvents)
      .where(
        and(
          isNull(outboxEvents.publishedAt),
          isNull(outboxEvents.deadLetteredAt),
          or(
            isNull(outboxEvents.lockedAt),
            lt(outboxEvents.lockedAt, staleBefore)
          )
        )
      )
      .orderBy(outboxEvents.availableAt)
      .limit(Math.min(Math.max(limit, 1), 100))
      .for("update", { skipLocked: true });
    const lockedAt = new Date();
    for (const event of events) {
      await transaction
        .update(outboxEvents)
        .set({ lockedAt, lockedBy: workerId })
        .where(eq(outboxEvents.id, event.id));
    }
    return events;
  });

const deliverEvent = (
  database: Database,
  workerId: string,
  event: OutboxEvent
): Promise<void> =>
  database.transaction(async (transaction) => {
    let supersededByPublicationVersionId: string | null = null;
    if (event.eventType === "publication.approved") {
      const targetRows = await transaction
        .select({
          editionId: publicationVersions.editionId,
          version: publicationVersions.version,
        })
        .from(publicationVersions)
        .where(eq(publicationVersions.id, event.aggregateId))
        .limit(1);
      const target = targetRows[0];
      if (!target) {
        throw new PublicationWorkflowError(
          "PUBLICATION_NOT_FOUND",
          "Outbox event references a missing publication version."
        );
      }
      const newerPublishedRows = await transaction
        .select({ id: publicationVersions.id })
        .from(publicationVersions)
        .where(
          and(
            eq(publicationVersions.editionId, target.editionId),
            eq(publicationVersions.editorialState, "published"),
            gt(publicationVersions.version, target.version)
          )
        )
        .orderBy(desc(publicationVersions.version))
        .limit(1);
      supersededByPublicationVersionId = newerPublishedRows[0]?.id ?? null;
      if (!supersededByPublicationVersionId) {
        await publishCompatibilityProjection(transaction, event.aggregateId);
        await transaction
          .update(publicationVersions)
          .set({ editorialState: "published" })
          .where(eq(publicationVersions.id, event.aggregateId));
      }
    } else if (
      event.eventType === "publication.unpublished" ||
      event.eventType === "publication.archived" ||
      event.eventType === "publication.rejected"
    ) {
      await transaction
        .delete(opportunities)
        .where(eq(opportunities.publicationVersionId, event.aggregateId));
      await transaction
        .delete(nationalOpportunities)
        .where(
          eq(nationalOpportunities.publicationVersionId, event.aggregateId)
        );
    } else {
      throw new PublicationWorkflowError(
        "UNSUPPORTED_OUTBOX_EVENT",
        `Unsupported outbox event type "${event.eventType}".`
      );
    }
    await transaction
      .update(outboxEvents)
      .set({
        attempts: event.attempts + 1,
        lastError: null,
        lockedAt: null,
        lockedBy: workerId,
        publishedAt: new Date(),
      })
      .where(eq(outboxEvents.id, event.id));
    await transaction.insert(auditEvents).values({
      actorId: workerId,
      actorKind: "service",
      action: supersededByPublicationVersionId
        ? "outbox.superseded"
        : "outbox.delivered",
      entityType: "outbox_event",
      entityId: event.id,
      metadata: {
        event_type: event.eventType,
        superseded_by_publication_version_id: supersededByPublicationVersionId,
      },
    });
  });

const recordDeliveryFailure = async (
  database: Database,
  workerId: string,
  event: OutboxEvent,
  error: unknown
): Promise<boolean> => {
  const attempts = event.attempts + 1;
  const deadLettered = attempts >= MAX_OUTBOX_ATTEMPTS;
  await database
    .update(outboxEvents)
    .set({
      attempts,
      deadLetteredAt: deadLettered ? new Date() : null,
      lastError:
        error instanceof Error ? error.message : "Unknown delivery error",
      lockedAt: null,
      lockedBy: workerId,
    })
    .where(eq(outboxEvents.id, event.id));
  return deadLettered;
};

export const deliverPendingOutbox = async (
  database: Database,
  workerId: string,
  limit = 25
): Promise<OutboxDeliveryResult> => {
  const events = await claimPendingEvents(database, workerId, limit);
  const result: OutboxDeliveryResult = {
    dead_lettered: 0,
    delivered: 0,
    failed: 0,
  };
  for (const event of events) {
    try {
      await deliverEvent(database, workerId, event);
      result.delivered += 1;
    } catch (error) {
      const deadLettered = await recordDeliveryFailure(
        database,
        workerId,
        event,
        error
      );
      result.failed += 1;
      if (deadLettered) {
        result.dead_lettered += 1;
      }
    }
  }
  return result;
};
