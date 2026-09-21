import { getBrasiliaDaysUntil } from "@/lib/date-utils";
import { findCountry, findState, type GeoPoint } from "@/lib/geo";
import type {
  InternationalOpportunity,
  NationalOpportunity,
} from "@/lib/opportunities-api";

export type CatalogScope = "international" | "national";

export type CatalogCover =
  | { kind: "photo"; src: string }
  | { kind: "map"; logo: string | null; monogram: string; src: string };

export interface CatalogTag {
  label: string;
  tone: "fund" | "plain";
}

export interface CatalogItem {
  audience: string;
  cover: CatalogCover;
  daysLeft: number | null;
  deadline: string;
  geo: GeoPoint | null;
  href: string;
  id: string;
  institution: string;
  level: string;
  name: string;
  place: string;
  scope: CatalogScope;
  tags: CatalogTag[];
  verified: boolean;
}

export type CatalogSort = "relevancia" | "prazo" | "nome";

/** Deadlines this close get the amber "Prazo próximo" treatment. */
export const URGENT_DAYS = 21;

const COVER_DIR = "/catalog";
const FAVICON_HINTS = ["/s2/favicons", "favicon", "apple-touch-icon", ".ico"];
const PLACEHOLDER_HINTS = ["dummyimage.com"];
const ACRONYM_REGEX = /\(([A-ZÀ-Ú]{2,6})\)/;
const WORD_REGEX = /[A-Za-zÀ-ÿ]+/g;
const MONOGRAM_STOPWORDS = new Set(["da", "das", "de", "do", "dos", "e", "of"]);
const LEVEL_SEPARATOR_REGEX = /\s*[|;]\s*/;
const DIACRITICS_REGEX = /\p{M}/gu;
const MAX_MONOGRAM_LENGTH = 3;

const isUsableImage = (value: string): boolean => {
  const trimmed = value.trim();
  return (
    (trimmed.startsWith("/") || trimmed.startsWith("http")) &&
    !PLACEHOLDER_HINTS.some((hint) => trimmed.includes(hint))
  );
};

const isLogoImage = (value: string): boolean =>
  FAVICON_HINTS.some((hint) => value.toLowerCase().includes(hint));

const monogramFor = (name: string, institution: string): string => {
  const acronym = ACRONYM_REGEX.exec(name)?.[1];
  if (acronym) {
    return acronym;
  }
  const words = (institution || name).match(WORD_REGEX) ?? [];
  return words
    .filter((word) => !MONOGRAM_STOPWORDS.has(word.toLowerCase()))
    .slice(0, MAX_MONOGRAM_LENGTH)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
};

const coverFor = (
  image: string,
  region: string,
  name: string,
  institution: string
): CatalogCover => {
  const src = `${COVER_DIR}/cover-${region}.jpg`;
  if (!isUsableImage(image)) {
    return {
      kind: "map",
      logo: null,
      monogram: monogramFor(name, institution),
      src,
    };
  }
  if (isLogoImage(image)) {
    return {
      kind: "map",
      logo: image,
      monogram: monogramFor(name, institution),
      src,
    };
  }
  return { kind: "photo", src: image };
};

const scholarshipLabel = (tipoBolsa: string): string | null => {
  const normalized = tipoBolsa
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase();
  if (normalized.startsWith("complet") || normalized.includes("integral")) {
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

const shortLevel = (nivelEnsino: string): string =>
  nivelEnsino.split(LEVEL_SEPARATOR_REGEX).filter(Boolean).join(" · ");

const isFree = (taxaAplicacao: string): boolean =>
  taxaAplicacao.toLowerCase().startsWith("gratuit");

export const toInternationalItem = (
  opportunity: InternationalOpportunity,
  verified: boolean,
  now: Date
): CatalogItem => {
  const country = findCountry(opportunity.pais);
  const funding = scholarshipLabel(opportunity.tipoBolsa);
  const level = shortLevel(opportunity.nivelEnsino);
  return {
    audience: opportunity.faixaEtaria,
    cover: coverFor(
      opportunity.imagem,
      country?.region ?? "mundo",
      opportunity.nome,
      opportunity.instituicaoResponsavel
    ),
    daysLeft: getBrasiliaDaysUntil(opportunity.prazoInscricao, now),
    deadline: opportunity.prazoInscricao,
    geo: country,
    href: `/oportunidades/internacionais/${opportunity.id}`,
    id: opportunity.id,
    institution: opportunity.instituicaoResponsavel,
    level,
    name: opportunity.nome,
    place: opportunity.pais,
    scope: "international",
    tags: [
      ...(funding ? [{ label: funding, tone: "fund" as const }] : []),
      ...(level ? [{ label: level, tone: "plain" as const }] : []),
    ],
    verified,
  };
};

export const toNationalItem = (
  opportunity: NationalOpportunity,
  verified: boolean,
  now: Date
): CatalogItem => {
  const state = findState(opportunity.cidadeEstado);
  return {
    audience: opportunity.faixaEtaria,
    cover: coverFor(
      opportunity.imagem,
      state?.region ?? "brasil",
      opportunity.nome,
      opportunity.instituicaoResponsavel
    ),
    daysLeft: getBrasiliaDaysUntil(opportunity.prazoInscricao, now),
    deadline: opportunity.prazoInscricao,
    geo: state,
    href: `/oportunidades/nacionais/${opportunity.id}`,
    id: opportunity.id,
    institution: opportunity.instituicaoResponsavel,
    level: shortLevel(opportunity.nivelEnsino),
    name: opportunity.nome,
    place: opportunity.cidadeEstado || opportunity.pais,
    scope: "national",
    tags: [
      ...(opportunity.tipo
        ? [{ label: opportunity.tipo, tone: "fund" as const }]
        : []),
      { label: opportunity.modalidade, tone: "plain" as const },
      ...(isFree(opportunity.taxaAplicacao)
        ? [{ label: "Gratuita", tone: "plain" as const }]
        : []),
    ],
    verified,
  };
};

const UNKNOWN_DEADLINE = Number.MAX_SAFE_INTEGER;

const byDeadline = (a: CatalogItem, b: CatalogItem): number =>
  (a.daysLeft ?? UNKNOWN_DEADLINE) - (b.daysLeft ?? UNKNOWN_DEADLINE);

const byName = (a: CatalogItem, b: CatalogItem): number =>
  a.name.localeCompare(b.name, "pt-BR");

export const sortCatalogItems = (
  items: CatalogItem[],
  sort: CatalogSort
): CatalogItem[] => {
  const sorted = [...items];
  if (sort === "nome") {
    return sorted.sort(byName);
  }
  if (sort === "prazo") {
    return sorted.sort(byDeadline);
  }
  return sorted.sort(
    (a, b) => Number(b.verified) - Number(a.verified) || byDeadline(a, b)
  );
};
