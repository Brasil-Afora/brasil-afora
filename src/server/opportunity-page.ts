import { sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db/client";
import { nationalOpportunities } from "@/db/schema/national-opportunities";
import { opportunities } from "@/db/schema/opportunities";
import {
  type InternationalOpportunity,
  type NationalOpportunity,
  STRUCTURED_OPPORTUNITIES_ENABLED,
} from "@/lib/opportunities-api";
import {
  type OpportunityPathScope,
  opportunityPath,
  parseOpportunityParam,
} from "@/lib/opportunity-path";
import {
  getInternationalOpportunityForPage,
  getNationalOpportunityForPage,
} from "@/server/opportunity-detail";
import {
  getOpportunityMetadata,
  type OpportunityMetadata,
} from "@/server/opportunity-metadata";
import { listPublicOpportunities } from "@/server/publication/list-public-opportunities";

const PUBLIC_PAGE_SIZE = 100;

const findStructuredIdByShortId = async (
  shortId: string
): Promise<string | null> => {
  let cursor: string | undefined;
  while (true) {
    const page = await listPublicOpportunities(db, {
      cursor,
      limit: PUBLIC_PAGE_SIZE,
    });
    const match = page.items.find((item) => item.id.startsWith(shortId));
    if (match) {
      return match.id;
    }
    if (!page.next_cursor) {
      return null;
    }
    cursor = page.next_cursor;
  }
};

/** The full UUID behind the id block of a slug address. */
const findIdByShortId = async (
  scope: OpportunityPathScope,
  shortId: string
): Promise<string | null> => {
  const table =
    scope === "international" ? opportunities : nationalOpportunities;
  try {
    const [row] = await db
      .select({ id: table.id })
      .from(table)
      .where(sql`${table.id}::text like ${`${shortId}%`}`)
      .orderBy(table.id)
      .limit(1);
    if (row) {
      return row.id;
    }
    return STRUCTURED_OPPORTUNITIES_ENABLED
      ? await findStructuredIdByShortId(shortId)
      : null;
  } catch {
    return null;
  }
};

export interface OpportunityPage<T> {
  /** The record's own id (UUID or verified id), as the API and favorites use. */
  id: string;
  metadata: OpportunityMetadata;
  opportunity: T | undefined;
  /** The page's canonical address. */
  path: string;
}

const resolveOpportunityPage = async <T extends { nome: string }>(
  scope: OpportunityPathScope,
  segment: string,
  read: (id: string) => Promise<T | undefined>
): Promise<OpportunityPage<T> | null> => {
  const param = parseOpportunityParam(segment);
  // A verified id may happen to end like an id block, so fall back to it.
  const id =
    param.kind === "short-id"
      ? ((await findIdByShortId(scope, param.shortId)) ?? segment)
      : param.id;
  const metadata = await getOpportunityMetadata(scope, id);
  if (!metadata) {
    return null;
  }
  const opportunity = await read(id);
  return {
    id,
    metadata,
    opportunity,
    path: opportunityPath(scope, id, opportunity?.nome ?? metadata.title),
  };
};

/**
 * The international record a detail-page segment points at, whether the link
 * is a slug address or an old UUID one. Cached per request, so metadata and
 * page share one read.
 */
export const getInternationalOpportunityPage = cache(
  (
    segment: string
  ): Promise<OpportunityPage<InternationalOpportunity> | null> =>
    resolveOpportunityPage(
      "international",
      segment,
      getInternationalOpportunityForPage
    )
);

/** National counterpart of `getInternationalOpportunityPage`. */
export const getNationalOpportunityPage = cache(
  (segment: string): Promise<OpportunityPage<NationalOpportunity> | null> =>
    resolveOpportunityPage("national", segment, getNationalOpportunityForPage)
);
