import {
  CATALOG_PATHS,
  type FeaturedOpportunity,
  normalizeSearchText,
  type SearchEntry,
} from "@/components/homepage/home-data";
import { isCatalogOpportunityVisible } from "@/lib/catalog-visibility";
import { selectHomepageOpportunities } from "@/lib/curated-import/homepage-selection";
import {
  currentDeadline,
  effectiveStatus,
  LEVEL_LABELS,
  TYPE_LABELS,
} from "@/lib/curated-import/master";
import { getBrasiliaDaysUntil } from "@/lib/date-utils";
import type { MapDestination } from "@/lib/geo";
import { getCuratedPublications } from "./curated-catalog";
import { getCuratedCatalogMetadata } from "./curated-catalog-metadata";

const placeLabel = (country: string, format: string) =>
  country || (format === "online" ? "Online" : "Local não informado");

const levelLabel = (levels: string[]) =>
  levels.map((level) => LEVEL_LABELS[level] ?? level).join(" · ");

export const getCuratedHomepage = async () => {
  const publications = await getCuratedPublications();
  if (!publications.length) {
    return null;
  }
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const featured: FeaturedOpportunity[] = [];
  const entries: SearchEntry[] = [];
  const destinations: MapDestination[] = [];
  for (const publication of publications) {
    const { source, id, image, verified } = publication;
    const scope =
      source.scope === "international" ? "international" : "national";
    const deadline = currentDeadline(source);
    const formattedDeadline = deadline?.split("-").reverse().join("/") ?? "";
    const status = effectiveStatus(source, today);
    if (
      !isCatalogOpportunityVisible({
        curatedStatus: status,
        prazoInscricao: formattedDeadline,
      })
    ) {
      continue;
    }
    const href = `${CATALOG_PATHS[scope]}/${id}`;
    const text = normalizeSearchText(
      [
        source.name,
        source.organization,
        source.city,
        source.country,
        ...source.fields,
      ].join(" ")
    );
    entries.push({
      id: `${scope}:${id}`,
      name: source.name,
      href,
      scope,
      verified,
      kind: TYPE_LABELS[source.type] ?? "Programa",
      place: source.city || source.country,
      deadline: formattedDeadline,
      curatedStatus: status,
      primaryText: text,
      text: `${text} ${normalizeSearchText(source.description)}`,
    });
    if (!verified) {
      continue;
    }
    const metadata = getCuratedCatalogMetadata(publication);
    for (const location of metadata.locations ?? []) {
      destinations.push({
        ...location,
        country: source.country,
        name: source.name,
        scope,
      });
    }
    const daysLeft = getBrasiliaDaysUntil(formattedDeadline);
    if (daysLeft === null || status === "upcoming") {
      continue;
    }
    featured.push({
      id,
      href,
      daysLeft,
      deadline: formattedDeadline,
      image,
      institution: source.organization,
      level: levelLabel(source.levels),
      name: source.name,
      officialLink: source.official_url,
      place: placeLabel(source.country, source.format),
      scope,
      tags: [TYPE_LABELS[source.type] ?? "Programa"],
    });
  }
  return {
    featured: selectHomepageOpportunities(featured, today),
    entries,
    destinations,
  };
};
