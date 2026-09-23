import { desc, eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  type PublicOpportunityFilterV1,
  type PublicOpportunityV1,
  publicOpportunityV1Schema,
} from "@/contracts/opportunity-v1";
import type { schema } from "@/db/schema";
import {
  applicationLinkAssessments,
  applicationRounds,
  publicationVersions,
} from "@/db/schema/ingestion";

import { getCuratedCatalogMetadata } from "./curated-catalog-metadata";

type CatalogPublicOpportunity = PublicOpportunityV1 &
  Omit<ReturnType<typeof getCuratedCatalogMetadata>, "modality">;

type Database = NodePgDatabase<typeof schema>;

export interface PublicOpportunityPage {
  items: CatalogPublicOpportunity[];
  next_cursor: string | null;
}

export const getPublicOpportunityById = async (
  database: Database,
  id: string
): Promise<CatalogPublicOpportunity | null> => {
  let cursor: string | undefined;
  while (true) {
    const page = await listPublicOpportunities(database, {
      cursor,
      limit: 100,
    });
    const opportunity = page.items.find((item) => item.id === id);
    if (opportunity) {
      return opportunity;
    }
    if (!page.next_cursor) {
      return null;
    }
    cursor = page.next_cursor;
  }
};

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

const ageMatches = (record: PublicOpportunityV1, age: number): boolean => {
  const ageField = record.semantic_fields.age;
  if (ageField?.state === "explicitly_unrestricted") {
    return true;
  }
  if (ageField?.state !== "explicit_value") {
    return false;
  }
  return record.age_rules.some((rule) => {
    if (rule.exact_age !== null) {
      return age === rule.exact_age;
    }
    if (rule.minimum_age === null && rule.maximum_age === null) {
      return false;
    }
    const minimumMatches =
      rule.minimum_age === null ||
      age > rule.minimum_age ||
      (age === rule.minimum_age && rule.minimum_inclusive);
    const maximumMatches =
      rule.maximum_age === null ||
      age < rule.maximum_age ||
      (age === rule.maximum_age && rule.maximum_inclusive);
    return minimumMatches && maximumMatches;
  });
};

const intersects = <T>(left: T[], right: T[]): boolean =>
  left.some((value) => right.includes(value));

const APPLY_ALLOWED_LIFECYCLES = new Set<PublicOpportunityV1["lifecycle"]>([
  "closing_soon",
  "extended",
  "open",
]);
const OPERATIONAL_APPLY_BLOCK_STATUSES = new Set<
  PublicOpportunityV1["application_link_status"]
>([
  "broken",
  "closed",
  "current_but_not_open",
  "generic_homepage",
  "login_only",
  "old_edition",
  "results_page",
]);

type ApplicationLinkAssessment = typeof applicationLinkAssessments.$inferSelect;
type ApplicationRound = typeof applicationRounds.$inferSelect;
interface OperationalAssessmentHistory {
  decisive?: ApplicationLinkAssessment;
  latest: ApplicationLinkAssessment;
}

const normalizeApplicationUrl = (value: string): string => {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return value.trim();
  }
};

const operationalAssessmentKey = (editionId: string, url: string): string =>
  `${editionId}:${normalizeApplicationUrl(url)}`;

const assessmentObservedAt = (assessment: ApplicationLinkAssessment): number =>
  (assessment.checkedAt ?? assessment.createdAt).getTime();

const isDecisiveOperationalStatus = (
  status: PublicOpportunityV1["application_link_status"]
): boolean =>
  status === "current_and_open" || OPERATIONAL_APPLY_BLOCK_STATUSES.has(status);

const indexOperationalAssessments = (
  roundRows: ApplicationRound[],
  linkRows: ApplicationLinkAssessment[]
): Map<string, OperationalAssessmentHistory> => {
  const roundsById = new Map(roundRows.map((row) => [row.id, row]));
  const indexed = new Map<string, OperationalAssessmentHistory>();
  for (const link of linkRows) {
    const round = roundsById.get(link.applicationRoundId);
    if (!(round && link.originalUrl)) {
      continue;
    }
    const key = operationalAssessmentKey(round.editionId, link.originalUrl);
    const previous = indexed.get(key);
    const latest =
      !previous ||
      assessmentObservedAt(link) > assessmentObservedAt(previous.latest)
        ? link
        : previous.latest;
    let decisive = previous?.decisive;
    if (
      isDecisiveOperationalStatus(link.status) &&
      (!decisive || assessmentObservedAt(link) > assessmentObservedAt(decisive))
    ) {
      decisive = link;
    }
    indexed.set(key, { decisive, latest });
  }
  return indexed;
};

const findOperationalAssessment = (
  indexed: Map<string, OperationalAssessmentHistory>,
  editionId: string,
  applicationUrl: string | null
): OperationalAssessmentHistory | undefined =>
  applicationUrl
    ? indexed.get(operationalAssessmentKey(editionId, applicationUrl))
    : undefined;

const applyOperationalAvailability = (
  approved: PublicOpportunityV1,
  assessmentHistory?: OperationalAssessmentHistory
): PublicOpportunityV1 => {
  const editorialAllowsApply = APPLY_ALLOWED_LIFECYCLES.has(approved.lifecycle);
  const approvedUrlExists = Boolean(approved.application_url);
  const priorOperationalAllowsApply = !OPERATIONAL_APPLY_BLOCK_STATUSES.has(
    approved.application_link_status
  );
  let operationalAllowsApply = priorOperationalAllowsApply;
  const decisiveAssessment = assessmentHistory?.decisive;
  const latestAssessment = assessmentHistory?.latest;

  if (decisiveAssessment?.status === "current_and_open") {
    operationalAllowsApply = true;
  } else if (
    decisiveAssessment &&
    OPERATIONAL_APPLY_BLOCK_STATUSES.has(decisiveAssessment.status)
  ) {
    operationalAllowsApply = false;
  }

  return publicOpportunityV1Schema.parse({
    ...approved,
    application_link_status:
      latestAssessment?.status ?? approved.application_link_status,
    can_apply:
      editorialAllowsApply && approvedUrlExists && operationalAllowsApply,
    last_verified_at: latestAssessment
      ? (latestAssessment.checkedAt ?? latestAssessment.createdAt).toISOString()
      : approved.last_verified_at,
  });
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Each filter is an independent, explicit product contract predicate.
function matchesFilter(
  record: PublicOpportunityV1,
  filter: PublicOpportunityFilterV1
): boolean {
  if (filter.collection && record.collection !== filter.collection) {
    return false;
  }
  if (
    filter.opportunity_type?.length &&
    !intersects(record.opportunity_types, filter.opportunity_type)
  ) {
    return false;
  }
  if (
    filter.education_level?.length &&
    !intersects(record.education_levels, filter.education_level)
  ) {
    return false;
  }
  if (filter.modality?.length && !filter.modality.includes(record.modality)) {
    return false;
  }
  if (
    filter.brazil_eligibility?.length &&
    !filter.brazil_eligibility.includes(record.brazil_eligibility)
  ) {
    return false;
  }
  if (filter.age !== undefined && !ageMatches(record, filter.age)) {
    return false;
  }
  if (
    filter.deadline_from &&
    (!record.application_deadline_date ||
      record.application_deadline_date < filter.deadline_from)
  ) {
    return false;
  }
  if (
    filter.deadline_to &&
    (!record.application_deadline_date ||
      record.application_deadline_date > filter.deadline_to)
  ) {
    return false;
  }
  if (
    filter.lifecycle?.length &&
    !filter.lifecycle.includes(record.lifecycle)
  ) {
    return false;
  }
  return filter.is_free === undefined || record.is_free === filter.is_free;
}

export const listPublicOpportunities = async (
  database: Database,
  filter: PublicOpportunityFilterV1
): Promise<PublicOpportunityPage> => {
  const versionRows = await database
    .select()
    .from(publicationVersions)
    .where(eq(publicationVersions.editorialState, "published"))
    .orderBy(desc(publicationVersions.version), desc(publicationVersions.id));
  const versions = [...latestBy(versionRows, (row) => row.editionId).values()];
  if (versions.length === 0) {
    return { items: [], next_cursor: null };
  }
  const editionIds = versions.map((version) => version.editionId);
  const roundRows = await database
    .select()
    .from(applicationRounds)
    .where(inArray(applicationRounds.editionId, editionIds));
  const roundIds = roundRows.map((round) => round.id);
  const linkRows =
    roundIds.length > 0
      ? await database
          .select()
          .from(applicationLinkAssessments)
          .where(
            inArray(applicationLinkAssessments.applicationRoundId, roundIds)
          )
          .orderBy(desc(applicationLinkAssessments.createdAt))
      : [];

  const operationalAssessmentsByApprovedUrl = indexOperationalAssessments(
    roundRows,
    linkRows
  );
  const records = versions.flatMap((version) => {
    const storedProjection = publicOpportunityV1Schema.safeParse(
      version.payload.public_projection
    );
    if (!storedProjection.success) {
      return [];
    }
    const { modality: _curatedModality, ...metadata } =
      getCuratedCatalogMetadata(version.payload.curated_master);
    return [
      {
        ...applyOperationalAvailability(
          storedProjection.data,
          findOperationalAssessment(
            operationalAssessmentsByApprovedUrl,
            version.editionId,
            storedProjection.data.application_url
          )
        ),
        ...metadata,
      },
    ];
  });
  const filtered = records.filter((record) => matchesFilter(record, filter));
  const startIndex = filter.cursor
    ? Math.max(
        filtered.findIndex(
          (record) => record.publication_version_id === filter.cursor
        ) + 1,
        0
      )
    : 0;
  const page = filtered.slice(startIndex, startIndex + filter.limit);
  const hasMore = startIndex + filter.limit < filtered.length;
  return {
    items: page,
    next_cursor:
      hasMore && page.length > 0
        ? (page.at(-1)?.publication_version_id ?? null)
        : null,
  };
};
