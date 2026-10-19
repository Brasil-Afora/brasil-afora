import type { MetadataRoute } from "next";
import {
  getPrograms,
  PROGRAMS_PATH,
} from "@/components/programs/program-model";
import type { Program } from "@/components/programs/types";
import {
  VERIFIED_OPPORTUNITIES_DATE,
  verifiedInternationalOpportunities,
  verifiedNationalOpportunities,
} from "@/data/verified-opportunities";
import { isCatalogOpportunityVisible } from "@/lib/catalog-visibility";

// Catalog records are added and edited between deploys, so the sitemap is
// built per request instead of frozen at build time.
export const dynamic = "force-dynamic";

const DEFAULT_SITE_URL = "https://brasil-afora.vercel.app";
const TRAILING_SLASH_PATTERN = /\/$/;
const INTERNATIONAL_PATH = "/oportunidades/internacionais";
const NATIONAL_PATH = "/oportunidades/nacionais";

interface OpportunityPage {
  id: string;
  updatedAt: Date;
}

interface CatalogPages {
  international: OpportunityPage[];
  national: OpportunityPage[];
}

const getSiteUrl = (): string => {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!configuredUrl) {
    return DEFAULT_SITE_URL;
  }

  try {
    return new URL(configuredUrl)
      .toString()
      .replace(TRAILING_SLASH_PATTERN, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
};

interface CatalogRow {
  applicationDeadline: string | null;
  curatedStatus?: string;
  id: string;
  updatedAt: Date;
}

/** The catalog's own rule: closed and past-deadline rounds are not listed. */
const isListed = (row: CatalogRow, now: Date): boolean =>
  isCatalogOpportunityVisible(
    {
      curatedStatus: row.curatedStatus,
      prazoInscricao:
        row.applicationDeadline?.split("-").reverse().join("/") ?? "",
    },
    now
  );

/**
 * Every listed catalog record has its own detail page. Returns empty lists
 * when the database can't be read, so the sitemap still serves the static and
 * verified pages instead of failing.
 */
const getCatalogPages = async (now: Date): Promise<CatalogPages> => {
  try {
    const [
      { db },
      { opportunities },
      { nationalOpportunities },
      { enrichCuratedRecords },
    ] = await Promise.all([
      import("@/db/client"),
      import("@/db/schema/opportunities"),
      import("@/db/schema/national-opportunities"),
      import("@/server/publication/curated-catalog"),
    ]);
    const [international, national] = await Promise.all([
      db
        .select({
          id: opportunities.id,
          updatedAt: opportunities.updatedAt,
          applicationDeadline: opportunities.applicationDeadline,
          publicationVersionId: opportunities.publicationVersionId,
        })
        .from(opportunities)
        .then(enrichCuratedRecords),
      db
        .select({
          id: nationalOpportunities.id,
          updatedAt: nationalOpportunities.updatedAt,
          applicationDeadline: nationalOpportunities.applicationDeadline,
          publicationVersionId: nationalOpportunities.publicationVersionId,
        })
        .from(nationalOpportunities)
        .then(enrichCuratedRecords),
    ]);
    const listed = (rows: CatalogRow[]): OpportunityPage[] =>
      rows
        .filter((row) => isListed(row, now))
        .map(({ id, updatedAt }) => ({ id, updatedAt }));
    return { international: listed(international), national: listed(national) };
  } catch {
    return { international: [], national: [] };
  }
};

/**
 * The programs the catalog shows, curated publications included; closed
 * rounds are left out because their pages answer 404. Falls back to the
 * site's own list when the database can't be read.
 */
const getProgramPages = async (): Promise<Program[]> => {
  try {
    const { getVisiblePrograms } = await import("@/server/programs");
    return await getVisiblePrograms();
  } catch {
    return getPrograms();
  }
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();
  const verifiedAt = new Date(VERIFIED_OPPORTUNITIES_DATE);
  const [catalog, programs] = await Promise.all([
    getCatalogPages(lastModified),
    getProgramPages(),
  ]);

  const opportunityEntry = (
    path: string,
    page: OpportunityPage
  ): MetadataRoute.Sitemap[number] => ({
    url: `${siteUrl}${path}/${page.id}`,
    lastModified: page.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  });

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/mapa`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}${NATIONAL_PATH}`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}${INTERNATIONAL_PATH}`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}${PROGRAMS_PATH}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...programs.map((program) => ({
      url: `${siteUrl}${PROGRAMS_PATH}/${program.id}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...verifiedInternationalOpportunities
      .filter((opportunity) =>
        isCatalogOpportunityVisible(opportunity, lastModified)
      )
      .map((opportunity) =>
        opportunityEntry(INTERNATIONAL_PATH, {
          id: opportunity.id,
          updatedAt: verifiedAt,
        })
      ),
    ...verifiedNationalOpportunities
      .filter((opportunity) =>
        isCatalogOpportunityVisible(opportunity, lastModified)
      )
      .map((opportunity) =>
        opportunityEntry(NATIONAL_PATH, {
          id: opportunity.id,
          updatedAt: verifiedAt,
        })
      ),
    ...catalog.international.map((page) =>
      opportunityEntry(INTERNATIONAL_PATH, page)
    ),
    ...catalog.national.map((page) => opportunityEntry(NATIONAL_PATH, page)),
  ];
}
