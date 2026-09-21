import {
  VERIFIED_OPPORTUNITIES_DATE,
  verifiedInternationalOpportunities,
  verifiedNationalOpportunities,
} from "@/data/verified-opportunities";
import { formatIsoDateBr, getBrasiliaDaysUntil } from "@/lib/date-utils";
import type {
  InternationalOpportunity,
  NationalOpportunity,
} from "@/lib/opportunities-api";

export type OpportunityScope = "international" | "national";

export const CATALOG_PATHS: Record<OpportunityScope, string> = {
  international: "/oportunidades/internacionais",
  national: "/oportunidades/nacionais",
};

export const VERIFIED_CHECK_DATE = formatIsoDateBr(VERIFIED_OPPORTUNITIES_DATE);

export interface FeaturedOpportunity {
  daysLeft: number;
  deadline: string;
  href: string;
  id: string;
  image: string;
  institution: string;
  level: string;
  name: string;
  officialLink: string;
  place: string;
  scope: OpportunityScope;
  tags: string[];
}

const SHORT_DURATION_MAX_LENGTH = 14;
const DIACRITICS_REGEX = /\p{M}/gu;
const WHITESPACE_REGEX = /\s+/;

export const normalizeSearchText = (value: string): string =>
  value.normalize("NFD").replace(DIACRITICS_REGEX, "").toLowerCase();

const scholarshipTag = (tipoBolsa: string): string | null => {
  const normalized = normalizeSearchText(tipoBolsa);
  if (normalized.startsWith("complet")) {
    return "Bolsa integral";
  }
  if (normalized.startsWith("parcial")) {
    return "Bolsa parcial";
  }
  if (normalized.startsWith("variavel")) {
    return "Bolsa variável";
  }
  return null;
};

const internationalTags = (opportunity: InternationalOpportunity): string[] => {
  const tags: string[] = [];
  const scholarship = scholarshipTag(opportunity.tipoBolsa);
  if (scholarship) {
    tags.push(scholarship);
  }
  if (opportunity.duracao.length <= SHORT_DURATION_MAX_LENGTH) {
    tags.push(opportunity.duracao);
  }
  return tags;
};

const nationalTags = (opportunity: NationalOpportunity): string[] => {
  const tags = [opportunity.tipo];
  if (normalizeSearchText(opportunity.taxaAplicacao).startsWith("gratuit")) {
    tags.push("Inscrição gratuita");
  }
  return tags;
};

const toFeatured = (
  opportunity: InternationalOpportunity | NationalOpportunity,
  scope: OpportunityScope,
  daysLeft: number
): FeaturedOpportunity => ({
  daysLeft,
  deadline: opportunity.prazoInscricao,
  href: `${CATALOG_PATHS[scope]}/${opportunity.id}`,
  id: opportunity.id,
  image: opportunity.imagem,
  institution: opportunity.instituicaoResponsavel,
  level: opportunity.nivelEnsino,
  name: opportunity.nome,
  officialLink: opportunity.linkOficial,
  place: opportunity.pais,
  scope,
  tags:
    scope === "international"
      ? internationalTags(opportunity as InternationalOpportunity)
      : nationalTags(opportunity as NationalOpportunity),
});

/** Verified opportunities still open in Brasília today, nearest deadline first. */
export const getFeaturedOpportunities = (
  now: Date = new Date()
): FeaturedOpportunity[] => {
  const entries: (readonly [
    InternationalOpportunity | NationalOpportunity,
    OpportunityScope,
  ])[] = [
    ...verifiedInternationalOpportunities.map(
      (opportunity) => [opportunity, "international"] as const
    ),
    ...verifiedNationalOpportunities.map(
      (opportunity) => [opportunity, "national"] as const
    ),
  ];

  const featured: FeaturedOpportunity[] = [];
  for (const [opportunity, scope] of entries) {
    const daysLeft = getBrasiliaDaysUntil(opportunity.prazoInscricao, now);
    if (daysLeft !== null && daysLeft >= 0) {
      featured.push(toFeatured(opportunity, scope, daysLeft));
    }
  }

  return featured.sort((a, b) => a.daysLeft - b.daysLeft);
};

// ---------------------------------------------------------------------------
// Search

export interface SearchEntry {
  deadline: string;
  href: string;
  id: string;
  kind: string;
  name: string;
  place: string;
  /** Name, institution, place, type and level: the fields a query should hit. */
  primaryText: string;
  scope: OpportunityScope;
  /** Primary text plus the long description, for weaker matches. */
  text: string;
  verified: boolean;
}

export const toInternationalSearchEntry = (
  opportunity: InternationalOpportunity,
  verified: boolean
): SearchEntry => {
  const primary = [
    opportunity.nome,
    opportunity.instituicaoResponsavel,
    opportunity.pais,
    opportunity.cidade,
    opportunity.tipo,
    opportunity.tipoBolsa,
    opportunity.nivelEnsino,
  ].join(" ");

  return {
    deadline: opportunity.prazoInscricao,
    href: `${CATALOG_PATHS.international}/${opportunity.id}`,
    id: `international:${opportunity.id}`,
    kind: opportunity.tipo,
    name: opportunity.nome,
    place: opportunity.pais,
    primaryText: normalizeSearchText(primary),
    scope: "international",
    text: normalizeSearchText(`${primary} ${opportunity.descricao}`),
    verified,
  };
};

export const toNationalSearchEntry = (
  opportunity: NationalOpportunity,
  verified: boolean
): SearchEntry => {
  const primary = [
    opportunity.nome,
    opportunity.instituicaoResponsavel,
    opportunity.pais,
    opportunity.cidadeEstado,
    opportunity.tipo,
    opportunity.modalidade,
    opportunity.nivelEnsino,
  ].join(" ");

  return {
    deadline: opportunity.prazoInscricao,
    href: `${CATALOG_PATHS.national}/${opportunity.id}`,
    id: `national:${opportunity.id}`,
    kind: opportunity.tipo,
    name: opportunity.nome,
    place: opportunity.cidadeEstado || opportunity.pais,
    primaryText: normalizeSearchText(primary),
    scope: "national",
    text: normalizeSearchText(`${primary} ${opportunity.sobre}`),
    verified,
  };
};

/** Search entries for the verified set, built on the server for the hero search. */
export const getVerifiedSearchEntries = (
  featured: FeaturedOpportunity[]
): SearchEntry[] => {
  const openIds = new Set(featured.map((opportunity) => opportunity.id));

  return [
    ...verifiedInternationalOpportunities
      .filter((opportunity) => openIds.has(opportunity.id))
      .map((opportunity) => toInternationalSearchEntry(opportunity, true)),
    ...verifiedNationalOpportunities
      .filter((opportunity) => openIds.has(opportunity.id))
      .map((opportunity) => toNationalSearchEntry(opportunity, true)),
  ];
};

export const searchEntries = (
  entries: SearchEntry[],
  query: string,
  limit: number
): SearchEntry[] => {
  const tokens = normalizeSearchText(query)
    .split(WHITESPACE_REGEX)
    .filter(Boolean);
  if (tokens.length === 0) {
    return [];
  }

  const ranked: { entry: SearchEntry; rank: number }[] = [];
  for (const entry of entries) {
    if (tokens.every((token) => entry.primaryText.includes(token))) {
      ranked.push({ entry, rank: 0 });
    } else if (tokens.every((token) => entry.text.includes(token))) {
      ranked.push({ entry, rank: 1 });
    }
  }

  return ranked
    .sort(
      (a, b) =>
        a.rank - b.rank || Number(b.entry.verified) - Number(a.entry.verified)
    )
    .slice(0, limit)
    .map(({ entry }) => entry);
};
