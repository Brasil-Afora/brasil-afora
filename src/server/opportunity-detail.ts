import { eq } from "drizzle-orm";
import {
  getVerifiedInternationalOpportunityById,
  getVerifiedNationalOpportunityById,
} from "@/data/verified-opportunities";
import { db } from "@/db/client";
import { nationalOpportunities } from "@/db/schema/national-opportunities";
import { opportunities } from "@/db/schema/opportunities";
import {
  type InternationalOpportunity,
  type NationalOpportunity,
  type NationalOpportunityRecord,
  type OpportunityRecord,
  resolveInternationalOpportunity,
  resolveNationalOpportunity,
  resolveStructuredInternationalOpportunity,
  resolveStructuredNationalOpportunity,
  STRUCTURED_OPPORTUNITIES_ENABLED,
  type StructuredOpportunityRecord,
} from "@/lib/opportunities-api";
import {
  resolveInternationalLocations,
  resolveNationalLocations,
} from "@/server/geo/resolve-location";
import { enrichCuratedRecords } from "@/server/publication/curated-catalog";
import { getPublicOpportunityById } from "@/server/publication/list-public-opportunities";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The international record as `GET /api/opportunities/[id]` returns it. */
export const readInternationalOpportunityRecord = async (id: string) => {
  const [record] = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.id, id))
    .limit(1);
  if (!record) {
    return null;
  }
  // Same spread order the route always had: the enriched record wins.
  const [enriched = null] = await enrichCuratedRecords([record]);
  return {
    ...record,
    locations: resolveInternationalLocations(record.city, record.country),
    ...enriched,
  };
};

/** The national record as `GET /api/national-opportunities/[id]` returns it. */
export const readNationalOpportunityRecord = async (id: string) => {
  const [record] = await db
    .select()
    .from(nationalOpportunities)
    .where(eq(nationalOpportunities.id, id))
    .limit(1);
  if (!record) {
    return null;
  }
  // Same spread order the route always had: the enriched record wins.
  const [enriched = null] = await enrichCuratedRecords([record]);
  return {
    ...record,
    locations: resolveNationalLocations(record.cityState),
    ...enriched,
  };
};

/**
 * Round-trips a value through JSON, as the API response does, so the server
 * render maps exactly what the browser would have fetched (dates as strings).
 */
const asApiJson = <T>(value: unknown): T =>
  JSON.parse(JSON.stringify(value)) as T;

const readPublicOpportunity = async (
  id: string
): Promise<StructuredOpportunityRecord | null> => {
  try {
    const record = await getPublicOpportunityById(db, id);
    return record ? asApiJson<StructuredOpportunityRecord>(record) : null;
  } catch {
    return null;
  }
};

/**
 * The opportunity a detail page shows, read on the server so the page ships
 * with its content instead of a loading skeleton (search engines index the
 * first HTML). Mirrors `getInternationalOpportunityById` in the browser.
 * Undefined when it can't be read here; the page then fetches it as before.
 */
export const getInternationalOpportunityForPage = async (
  id: string
): Promise<InternationalOpportunity | undefined> => {
  const verified = getVerifiedInternationalOpportunityById(id);
  if (verified) {
    return verified;
  }
  if (!UUID_REGEX.test(id)) {
    return;
  }
  try {
    if (STRUCTURED_OPPORTUNITIES_ENABLED) {
      const structured = await readPublicOpportunity(id);
      return structured
        ? (resolveStructuredInternationalOpportunity(structured) ?? undefined)
        : undefined;
    }
    const [record, actionability] = await Promise.all([
      readInternationalOpportunityRecord(id),
      readPublicOpportunity(id),
    ]);
    return (
      resolveInternationalOpportunity(
        record ? asApiJson<OpportunityRecord>(record) : null,
        actionability
      ) ?? undefined
    );
  } catch {
    return;
  }
};

/** National counterpart of `getInternationalOpportunityForPage`. */
export const getNationalOpportunityForPage = async (
  id: string
): Promise<NationalOpportunity | undefined> => {
  const verified = getVerifiedNationalOpportunityById(id);
  if (verified) {
    return verified;
  }
  if (!UUID_REGEX.test(id)) {
    return;
  }
  try {
    if (STRUCTURED_OPPORTUNITIES_ENABLED) {
      const structured = await readPublicOpportunity(id);
      return structured
        ? (resolveStructuredNationalOpportunity(structured) ?? undefined)
        : undefined;
    }
    const [record, actionability] = await Promise.all([
      readNationalOpportunityRecord(id),
      readPublicOpportunity(id),
    ]);
    return (
      resolveNationalOpportunity(
        record ? asApiJson<NationalOpportunityRecord>(record) : null,
        actionability
      ) ?? undefined
    );
  } catch {
    return;
  }
};
