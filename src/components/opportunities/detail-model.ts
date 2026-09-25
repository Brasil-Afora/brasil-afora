import { VERIFIED_OPPORTUNITIES_DATE } from "@/data/verified-opportunities";
import { priceDetail, priceLabel } from "@/lib/cost-profile";
import { formatIsoDateBr, getBrasiliaDaysUntil } from "@/lib/date-utils";
import { findCountry, findState, type OpportunityLocation } from "@/lib/geo";
import type {
  InternationalOpportunity,
  NationalOpportunity,
} from "@/lib/opportunities-api";
import {
  formatLastVerifiedAt,
  getApplicationTarget,
  getOpportunityLifecycleLabel,
  shouldShowDeadlineCountdown,
} from "@/lib/opportunity-lifecycle";
import {
  type CatalogCover,
  type CatalogScope,
  type CatalogTag,
  coverFor,
  fundingTag,
  isFree,
  shortLevel,
} from "./catalog-model";

// The page presents what the scraper and the catalog actually carry: identity,
// the application round, eligibility, costs/funding, how to apply and where it
// happens. Nothing here is invented; a field the source does not state reads
// "Não informado".

export type FactIcon =
  | "age"
  | "calendar"
  | "clock"
  | "fee"
  | "funding"
  | "language"
  | "level"
  | "modality"
  | "place"
  | "price"
  | "type";

export interface DetailFact {
  icon: FactIcon;
  label: string;
  value: string | null;
}

export interface DetailStep {
  /** Stable identity of the step, used to remember the student's progress. */
  key: string;
  text: string;
}

export interface DetailContact {
  href: string | null;
  text: string;
}

export interface OpportunityDetail {
  /** Prose about applying that isn't a list of steps. */
  applicationTarget: ReturnType<typeof getApplicationTarget>;
  applyParagraphs: string[];
  applySteps: DetailStep[];
  checkedAt: string | null;
  contact: DetailContact | null;
  costs: { label: string; value: string }[];
  cover: CatalogCover;
  daysLeft: number | null;
  deadline: string;
  eligibilityNote: string | null;
  facts: DetailFact[];
  id: string;
  institution: string;
  lifecycleLabel: string | null;
  locations: OpportunityLocation[];
  name: string;
  officialDomain: string | null;
  officialLink: string | null;
  paragraphs: string[];
  place: string;
  requirements: string[];
  scope: CatalogScope;
  /** What "same place" means for similar suggestions (the country abroad). */
  similarPlace: string;
  summary: string | null;
  tags: CatalogTag[];
  type: string;
  updatedAt: string | null;
  verified: boolean;
}

const NOT_STATED_VALUES = new Set(["", "n/a", "na", "nao informado", "-"]);
const DIACRITICS_REGEX = /\p{M}/gu;
const PARAGRAPH_SPLIT_REGEX = /\n\s*\n|\r?\n/;
const SENTENCE_END_REGEX = /^(.{40,260}?[.!?])(\s|$)/;
const NUMBERED_STEP_REGEX =
  /(?:^|\s)\d{1,2}\s*(?:\)|º|°|ª|\.)\s*(?:etapa\s*:?\s*)?/gi;
const LIST_SEPARATOR_REGEX = /\s*(?:;|\r?\n|\s•\s)\s*/;
const SENTENCE_SPLIT_REGEX = /(?<=[.!?])\s+(?=[A-ZÀ-Ú])/;
const EMAIL_REGEX = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const URL_REGEX = /https?:\/\/\S+/;
const TRAILING_PUNCTUATION_REGEX = /[.;]+$/;
const LEADING_WWW_REGEX = /^www\./;
const MIN_SENTENCE_STEP_LENGTH = 25;
const MIN_LIST_ITEMS = 2;

const normalize = (value: string): string =>
  value.normalize("NFD").replace(DIACRITICS_REGEX, "").toLowerCase().trim();

/** Null for empty values and the placeholders the catalog uses for "unknown". */
export const stated = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? "";
  return NOT_STATED_VALUES.has(normalize(trimmed)) ? null : trimmed;
};

const paragraphsOf = (text: string): string[] =>
  text
    .split(PARAGRAPH_SPLIT_REGEX)
    .map((part) => part.trim())
    .filter(Boolean);

const firstSentence = (text: string): string | null => {
  const match = SENTENCE_END_REGEX.exec(text.trim());
  return match ? match[1] : null;
};

const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

const cleanItem = (value: string): string =>
  capitalize(value.trim().replace(TRAILING_PUNCTUATION_REGEX, ""));

/** "a; b; c" or one requirement per line → a list; otherwise nothing. */
const listOf = (text: string | null): string[] => {
  if (!text) {
    return [];
  }
  const items = text.split(LIST_SEPARATOR_REGEX).map(cleanItem).filter(Boolean);
  return items.length >= MIN_LIST_ITEMS ? items : [];
};

/**
 * Selection steps arrive as prose: "1) ... 2) ...", "1º Etapa: ...; ...",
 * or a few sentences. Split them into steps; a single block stays prose.
 */
const stepsOf = (text: string | null): string[] => {
  if (!text) {
    return [];
  }
  let parts: string[];
  const numbered = text.split(NUMBERED_STEP_REGEX).map((part) => part.trim());
  if (numbered.filter(Boolean).length >= MIN_LIST_ITEMS) {
    parts = numbered;
  } else if (text.split(LIST_SEPARATOR_REGEX).length >= MIN_LIST_ITEMS) {
    parts = text.split(LIST_SEPARATOR_REGEX);
  } else {
    const sentences = text.split(SENTENCE_SPLIT_REGEX);
    parts =
      sentences.length >= MIN_LIST_ITEMS &&
      sentences.every((part) => part.length >= MIN_SENTENCE_STEP_LENGTH)
        ? sentences
        : [text];
  }
  return parts.map(cleanItem).filter(Boolean);
};

/** Steps worth ticking off, plus whatever reads better as a paragraph. */
const applicationOf = (
  steps: string | null,
  process: string | null
): Pick<OpportunityDetail, "applyParagraphs" | "applySteps"> => {
  const parts = stepsOf(steps);
  const asList = parts.length >= MIN_LIST_ITEMS;
  return {
    applyParagraphs: [...(asList ? [] : parts), ...(process ? [process] : [])],
    applySteps: asList
      ? parts.map((text) => ({ key: normalize(text), text }))
      : [],
  };
};

const contactOf = (text: string | null): DetailContact | null => {
  if (!text) {
    return null;
  }
  const email = EMAIL_REGEX.exec(text)?.[0];
  if (email) {
    return { href: `mailto:${email}`, text };
  }
  const url = URL_REGEX.exec(text)?.[0];
  return { href: url ?? null, text };
};

const domainOf = (link: string | null): string | null => {
  if (!link) {
    return null;
  }
  try {
    return new URL(link).hostname.replace(LEADING_WWW_REGEX, "");
  } catch {
    return null;
  }
};

const feeLabel = (taxa: string | null): string | null => {
  if (!taxa) {
    return null;
  }
  return isFree(taxa) ? "Gratuita" : taxa;
};

const shared = (
  opportunity: InternationalOpportunity | NationalOpportunity,
  verified: boolean,
  now: Date
) => {
  const officialLink = stated(opportunity.linkOficial);
  return {
    applicationTarget: getApplicationTarget(opportunity),
    lifecycleLabel: getOpportunityLifecycleLabel(opportunity),
    checkedAt: verified
      ? formatIsoDateBr(VERIFIED_OPPORTUNITIES_DATE)
      : formatLastVerifiedAt(opportunity.lastVerifiedAt),
    contact: contactOf(stated(opportunity.contato)),
    daysLeft: shouldShowDeadlineCountdown(opportunity)
      ? getBrasiliaDaysUntil(opportunity.prazoInscricao, now)
      : null,
    deadline: opportunity.prazoInscricao,
    id: opportunity.id,
    institution: stated(opportunity.instituicaoResponsavel) ?? "",
    locations: opportunity.localizacoes ?? [],
    name: opportunity.nome,
    officialDomain: domainOf(officialLink),
    officialLink,
    updatedAt: opportunity.atualizadoEm ?? null,
    verified,
  };
};

export const toInternationalDetail = (
  opportunity: InternationalOpportunity,
  verified: boolean,
  now: Date
): OpportunityDetail => {
  const description = stated(opportunity.descricao) ?? "";
  const place = [stated(opportunity.cidade), stated(opportunity.pais)]
    .filter(Boolean)
    .join(", ");
  const funding = fundingTag(opportunity.custo, opportunity.tipoBolsa ?? "");
  const level = shortLevel(stated(opportunity.nivelEnsino) ?? "") || null;
  const requirements = stated(opportunity.requisitosEspecificos);
  const listedRequirements = listOf(requirements);
  const country = findCountry(opportunity.pais);

  return {
    ...shared(opportunity, verified, now),
    ...applicationOf(
      stated(opportunity.etapasSelecao),
      stated(opportunity.processoInscricao)
    ),
    costs: [
      { label: "Preço", value: priceDetail(opportunity.custo?.price) },
      {
        label: "Financiamento",
        value: funding ?? stated(opportunity.tipoBolsa),
      },
      {
        label: "O que a bolsa cobre",
        value: stated(opportunity.coberturaBolsa),
      },
      { label: "Taxa de inscrição", value: stated(opportunity.taxaAplicacao) },
      {
        label: "Custos por conta do estudante",
        value: stated(opportunity.custosExtras),
      },
    ].filter((item): item is { label: string; value: string } =>
      Boolean(item.value)
    ),
    cover: coverFor(
      opportunity.imagem,
      country?.region ?? "mundo",
      opportunity.nome,
      opportunity.instituicaoResponsavel
    ),
    eligibilityNote: listedRequirements.length > 0 ? null : requirements,
    facts: [
      { icon: "place", label: "Local", value: place || null },
      { icon: "level", label: "Nível de ensino", value: level },
      {
        icon: "price",
        label: "Preço",
        value: priceLabel(opportunity.custo?.price),
      },
      {
        icon: "funding",
        label: "Financiamento",
        value: funding ?? stated(opportunity.tipoBolsa),
      },
      { icon: "clock", label: "Duração", value: stated(opportunity.duracao) },
      {
        icon: "age",
        label: "Idade ou série",
        value: stated(opportunity.faixaEtaria),
      },
      {
        icon: "language",
        label: "Idioma",
        value: stated(opportunity.requisitosIdioma),
      },
      {
        icon: "fee",
        label: "Taxa de inscrição",
        value: feeLabel(stated(opportunity.taxaAplicacao)),
      },
      {
        icon: "calendar",
        label: "Prazo de inscrição",
        value: stated(opportunity.prazoInscricao),
      },
    ],
    paragraphs: paragraphsOf(description),
    place: place || stated(opportunity.pais) || "",
    requirements: listedRequirements,
    scope: "international",
    similarPlace: stated(opportunity.pais) ?? "",
    summary: firstSentence(description),
    tags: [
      ...(funding ? [{ label: funding, tone: "fund" as const }] : []),
      ...(stated(opportunity.tipo)
        ? [{ label: opportunity.tipo, tone: "plain" as const }]
        : []),
    ],
    type: stated(opportunity.tipo) ?? "",
  };
};

export const toNationalDetail = (
  opportunity: NationalOpportunity,
  verified: boolean,
  now: Date
): OpportunityDetail => {
  const about = stated(opportunity.sobre) ?? "";
  const place = stated(opportunity.cidadeEstado) ?? "Brasil";
  const level = shortLevel(stated(opportunity.nivelEnsino) ?? "") || null;
  const listed = (opportunity.requisitosEspecificos ?? [])
    .map((item) => stated(item))
    .filter((item): item is string => Boolean(item))
    .map(cleanItem);
  const state = findState(opportunity.cidadeEstado ?? "");
  const funding = fundingTag(opportunity.custo);

  return {
    ...shared(opportunity, verified, now),
    ...applicationOf(stated(opportunity.etapasSelecao), null),
    costs: [
      { label: "Preço", value: priceDetail(opportunity.custo?.price) },
      { label: "Financiamento", value: funding },
      { label: "O que você ganha", value: stated(opportunity.beneficios) },
      { label: "Custos", value: stated(opportunity.custos) },
      { label: "Taxa de inscrição", value: stated(opportunity.taxaAplicacao) },
      {
        label: "Custos por conta do estudante",
        value: stated(opportunity.custosExtras),
      },
    ].filter((item): item is { label: string; value: string } =>
      Boolean(item.value)
    ),
    cover: coverFor(
      opportunity.imagem,
      state?.region ?? "brasil",
      opportunity.nome,
      opportunity.instituicaoResponsavel
    ),
    eligibilityNote: stated(opportunity.requisitos),
    facts: [
      { icon: "place", label: "Local", value: place },
      { icon: "level", label: "Nível de ensino", value: level },
      { icon: "type", label: "Tipo", value: stated(opportunity.tipo) },
      {
        icon: "price",
        label: "Preço",
        value: priceLabel(opportunity.custo?.price),
      },
      ...(funding
        ? [{ icon: "funding" as const, label: "Financiamento", value: funding }]
        : []),
      { icon: "clock", label: "Duração", value: stated(opportunity.duracao) },
      {
        icon: "age",
        label: "Idade ou série",
        value: stated(opportunity.faixaEtaria),
      },
      {
        icon: "modality",
        label: "Modalidade",
        value: stated(opportunity.modalidade),
      },
      {
        icon: "fee",
        label: "Taxa de inscrição",
        value: feeLabel(stated(opportunity.taxaAplicacao)),
      },
      {
        icon: "calendar",
        label: "Prazo de inscrição",
        value: stated(opportunity.prazoInscricao),
      },
    ],
    paragraphs: paragraphsOf(about),
    place,
    requirements: listed,
    scope: "national",
    similarPlace: "",
    summary: firstSentence(about),
    tags: [
      ...(funding ? [{ label: funding, tone: "fund" as const }] : []),
      ...(stated(opportunity.tipo)
        ? [
            {
              label: opportunity.tipo,
              tone: funding ? ("plain" as const) : ("fund" as const),
            },
          ]
        : []),
      ...(stated(opportunity.modalidade)
        ? [{ label: opportunity.modalidade, tone: "plain" as const }]
        : []),
    ],
    type: stated(opportunity.tipo) ?? "",
  };
};
