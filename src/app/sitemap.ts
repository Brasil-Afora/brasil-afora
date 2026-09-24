import type { MetadataRoute } from "next";
import {
  getPrograms,
  PROGRAMS_PATH,
} from "@/components/programs/program-model";
import {
  VERIFIED_OPPORTUNITIES_DATE,
  verifiedInternationalOpportunities,
  verifiedNationalOpportunities,
} from "@/data/verified-opportunities";

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

/**
 * Every catalog record has its own detail page. Returns empty lists when the
 * database can't be read, so the sitemap still serves the static and verified
 * pages instead of failing.
 */
const getCatalogPages = async (): Promise<CatalogPages> => {
  try {
    const [{ db }, { opportunities }, { nationalOpportunities }] =
      await Promise.all([
        import("@/db/client"),
        import("@/db/schema/opportunities"),
        import("@/db/schema/national-opportunities"),
      ]);
    const [international, national] = await Promise.all([
      db
        .select({
          id: opportunities.id,
          updatedAt: opportunities.updatedAt,
        })
        .from(opportunities),
      db
        .select({
          id: nationalOpportunities.id,
          updatedAt: nationalOpportunities.updatedAt,
        })
        .from(nationalOpportunities),
    ]);
    return { international, national };
  } catch {
    return { international: [], national: [] };
  }
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();
  const verifiedAt = new Date(VERIFIED_OPPORTUNITIES_DATE);
  const catalog = await getCatalogPages();

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
    ...getPrograms().map((program) => ({
      url: `${siteUrl}${PROGRAMS_PATH}/${program.id}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...verifiedInternationalOpportunities.map((opportunity) =>
      opportunityEntry(INTERNATIONAL_PATH, {
        id: opportunity.id,
        updatedAt: verifiedAt,
      })
    ),
    ...verifiedNationalOpportunities.map((opportunity) =>
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
