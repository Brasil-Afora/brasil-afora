import type { CatalogFilterValues } from "@/components/opportunities/catalog-filters";
import {
  type CatalogCover,
  type CatalogSort,
  type CatalogTag,
  coverFor,
  URGENT_DAYS,
} from "@/components/opportunities/catalog-model";
import { PROGRAMS } from "@/data/programs";
import { getBrasiliaDaysUntil } from "@/lib/date-utils";
import { findCountry } from "@/lib/geo";
import type { Program, ProgramBenefit, ProgramType } from "./types";

export const PROGRAMS_PATH = "/programas-e-bolsas";

// ---------------------------------------------------------------------------
// Data access. TODO(data): the only reader of the starter list; swap for a
// query hook (Drizzle schema → route handler → React Query) when programs
// move to the database.

export const getPrograms = (): Program[] => PROGRAMS;

export const getProgramById = (id: string): Program | null =>
  PROGRAMS.find((program) => program.id === id) ?? null;

// ---------------------------------------------------------------------------
// Enrollment status. A program is listed in every state; only the wording and
// the order change. Derived from dates on the client, never prerendered.

export type ProgramStatusKind =
  | "aberto"
  | "continuo"
  | "em-breve"
  | "a-confirmar"
  | "encerrado";

export interface ProgramStatus {
  /** Days until the deadline, while enrollment is open. */
  daysLeft: number | null;
  /** The date or forecast that goes with the label, if any. */
  detail: string | null;
  kind: ProgramStatusKind;
  label: string;
  /** The label where space is tight (card and row footers). */
  shortLabel: string;
  /** Open and closing within URGENT_DAYS: the amber treatment. */
  urgent: boolean;
}

/** Filter labels for each status, in the order they are listed. */
export const STATUS_FILTER_LABELS: Record<ProgramStatusKind, string> = {
  aberto: "Inscrições abertas",
  continuo: "O ano todo",
  "em-breve": "Em breve",
  "a-confirmar": "Datas a confirmar",
  encerrado: "Encerradas",
};

const STATUS_RANK: Record<ProgramStatusKind, number> = {
  aberto: 0,
  continuo: 1,
  "em-breve": 2,
  "a-confirmar": 3,
  encerrado: 4,
};

const SOURCE_ENROLLMENT: Record<
  string,
  Pick<ProgramStatus, "kind" | "label" | "shortLabel">
> = {
  closed: {
    kind: "encerrado",
    label: "Inscrições encerradas",
    shortLabel: "Encerradas",
  },
  next_cycle_not_announced: {
    kind: "a-confirmar",
    label: "Próximo ciclo ainda não anunciado",
    shortLabel: "Datas a confirmar",
  },
  unknown: {
    kind: "a-confirmar",
    label: "Situação das inscrições não informada",
    shortLabel: "Datas a confirmar",
  },
  open: { kind: "aberto", label: "Inscrições abertas", shortLabel: "Abertas" },
  upcoming: { kind: "em-breve", label: "Em breve", shortLabel: "Em breve" },
};
const sourceEnrollmentStatus = (program: Program): ProgramStatus | null => {
  const source = program.inscricoes.situacaoNaFonte;
  if (!(source && SOURCE_ENROLLMENT[source])) {
    return null;
  }
  return {
    ...SOURCE_ENROLLMENT[source],
    daysLeft: null,
    urgent: false,
    detail: program.inscricoes.nota ?? null,
  };
};

export const programStatus = (program: Program, now: Date): ProgramStatus => {
  const { abertura, continuo, nota, prazoInscricao, previsao } =
    program.inscricoes;
  const base = { daysLeft: null, urgent: false };

  if (continuo) {
    return {
      ...base,
      detail: null,
      kind: "continuo",
      label: "Inscrições o ano todo",
      shortLabel: "Inscrições o ano todo",
    };
  }
  const reported = program.inscricoes.situacaoNaFonte;
  const sourceStatus = sourceEnrollmentStatus(program);
  if (sourceStatus && reported !== "open" && reported !== "upcoming") {
    return sourceStatus;
  }
  const opensIn = abertura ? getBrasiliaDaysUntil(abertura, now) : null;
  if (opensIn !== null && opensIn > 0) {
    return {
      ...base,
      detail: `Abrem em ${abertura}`,
      kind: "em-breve",
      label: "Em breve",
      shortLabel: "Em breve",
    };
  }
  const closesIn = prazoInscricao
    ? getBrasiliaDaysUntil(prazoInscricao, now)
    : null;
  if (closesIn !== null && closesIn >= 0) {
    return {
      daysLeft: closesIn,
      detail: `Até ${prazoInscricao}`,
      kind: "aberto",
      label: "Inscrições abertas",
      shortLabel: "Abertas",
      urgent: closesIn <= URGENT_DAYS,
    };
  }
  if (closesIn !== null) {
    return {
      ...base,
      detail: previsao
        ? `Próxima: ${previsao}`
        : `Encerradas em ${prazoInscricao}`,
      kind: "encerrado",
      label: "Inscrições encerradas",
      shortLabel: "Encerradas",
    };
  }
  if (sourceStatus) {
    return sourceStatus;
  }
  if (previsao) {
    return {
      ...base,
      detail: `Previsão: ${previsao}`,
      kind: "em-breve",
      label: "Em breve",
      shortLabel: "Em breve",
    };
  }
  return {
    ...base,
    detail: nota ?? null,
    kind: "a-confirmar",
    label: "Datas a confirmar",
    shortLabel: "Datas a confirmar",
  };
};

// ---------------------------------------------------------------------------
// Card view model

export interface ProgramItem {
  audience: string;
  cover: CatalogCover;
  /** "Estudar no exterior · Reino Unido", "Estudar no Brasil". */
  destination: string;
  /** "Online · 12 meses"; empty when the source says neither. */
  format: string;
  href: string;
  id: string;
  institution: string;
  levels: string;
  name: string;
  status: ProgramStatus;
  summary: string;
  tags: CatalogTag[];
  type: ProgramType;
  verified: boolean;
}

const FAVICON_SIZE = 128;
const MAX_PLAIN_TAGS = 2;
const FUNDING_BENEFITS: ProgramBenefit[] = ["Bolsa integral", "Bolsa parcial"];

/** The benefit a program type already implies, so its tag isn't repeated. */
const IMPLIED_BENEFIT: Partial<Record<ProgramType, ProgramBenefit>> = {
  Mentoria: "Mentoria",
  Preparatório: "Preparação",
};

/** The official site's icon, which the cover shows on a white tile. */
const logoFor = (link: string): string => {
  try {
    const { hostname } = new URL(link);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=${FAVICON_SIZE}`;
  } catch {
    return "";
  }
};

export const programCover = (program: Program): CatalogCover => {
  const country = program.pais ? findCountry(program.pais) : null;
  const abroadOnly =
    program.destino.length === 1 && program.destino[0] === "No exterior";
  let region = "brasil";
  if (country) {
    region = country.region;
  } else if (abroadOnly) {
    region = "mundo";
  }
  return coverFor(
    program.imagem ?? logoFor(program.linkOficial),
    region,
    program.nome,
    program.instituicaoResponsavel
  );
};

/**
 * First tag (funding blue): the kind of program, or the scholarship's size for
 * a Bolsa. Then up to two benefits the type doesn't already say.
 */
export const programTags = (program: Program): CatalogTag[] => {
  const funding = FUNDING_BENEFITS.find((benefit) =>
    program.beneficios.includes(benefit)
  );
  const headline = program.tipo === "Bolsa" && funding ? funding : program.tipo;
  const plain = program.beneficios
    .filter(
      (benefit) =>
        benefit !== headline && benefit !== IMPLIED_BENEFIT[program.tipo]
    )
    .slice(0, MAX_PLAIN_TAGS);
  return [
    { label: headline, tone: "fund" },
    ...plain.map((label) => ({ label, tone: "plain" as const })),
  ];
};

export const destinationLabel = (program: Program): string => {
  const places = program.destino.map((destino) =>
    destino === "No Brasil" ? "no Brasil" : "no exterior"
  );
  const lead = `Estudar ${places.join(" ou ")}`;
  return program.pais ? `${lead} · ${program.pais}` : lead;
};

export const formatLabel = (program: Program): string =>
  [program.modalidade, program.duracao].filter(Boolean).join(" · ");

export const toProgramItem = (program: Program, now: Date): ProgramItem => ({
  audience: program.publico,
  verified: program.verified ?? false,
  cover: programCover(program),
  destination: destinationLabel(program),
  format: formatLabel(program),
  href: `${PROGRAMS_PATH}/${program.id}`,
  id: program.id,
  institution: program.instituicaoResponsavel,
  levels: program.niveis.join(" · "),
  name: program.nome,
  status: programStatus(program, now),
  summary: program.resumo,
  tags: programTags(program),
  type: program.tipo,
});

// ---------------------------------------------------------------------------
// Filters

/** No age, deadline window or verified switch: the sources state none of them. */
export interface ProgramFilters extends CatalogFilterValues {
  beneficios: string[];
  destino: string[];
  inscricoes: string[];
  modalidade: string[];
  niveis: string[];
  tipo: string[];
}

export const INITIAL_PROGRAM_FILTERS: ProgramFilters = {
  beneficios: [],
  destino: [],
  inscricoes: [],
  modalidade: [],
  niveis: [],
  tipo: [],
};

/** Session storage key; other surfaces write here to open the page filtered. */
export const PROGRAM_FILTER_STORAGE_KEY = "programasFiltros";

const matches = (selected: string[], values: readonly string[]): boolean =>
  selected.length === 0 || selected.some((value) => values.includes(value));

export const applyProgramFilters = (
  programs: Program[],
  filtros: ProgramFilters,
  now: Date = new Date()
): Program[] =>
  programs.filter(
    (program) =>
      matches(filtros.tipo, [program.tipo]) &&
      matches(filtros.niveis, program.niveis) &&
      matches(filtros.beneficios, program.beneficios) &&
      matches(filtros.destino, program.destino) &&
      matches(
        filtros.modalidade,
        program.modalidade ? [program.modalidade] : []
      ) &&
      matches(filtros.inscricoes, [
        STATUS_FILTER_LABELS[programStatus(program, now).kind],
      ])
  );

// ---------------------------------------------------------------------------
// Order

const NO_DEADLINE = Number.MAX_SAFE_INTEGER;

const byDeadline = (a: ProgramItem, b: ProgramItem): number =>
  (a.status.daysLeft ?? NO_DEADLINE) - (b.status.daysLeft ?? NO_DEADLINE);

const byName = (a: ProgramItem, b: ProgramItem): number =>
  a.name.localeCompare(b.name, "pt-BR");

const byStatus = (a: ProgramItem, b: ProgramItem): number =>
  STATUS_RANK[a.status.kind] - STATUS_RANK[b.status.kind];

/** "relevancia" puts what you can apply to now first, then what opens next. */
export const sortProgramItems = (
  items: ProgramItem[],
  sort: CatalogSort
): ProgramItem[] => {
  const sorted = [...items];
  if (sort === "nome") {
    return sorted.sort(byName);
  }
  if (sort === "prazo") {
    return sorted.sort((a, b) => byDeadline(a, b) || byStatus(a, b));
  }
  return sorted.sort(
    (a, b) => byStatus(a, b) || byDeadline(a, b) || byName(a, b)
  );
};

// ---------------------------------------------------------------------------
// Related programs: same kind first, then a shared level, open ones ahead.

const RELATED_COUNT = 3;

export const relatedPrograms = (
  program: Program,
  now: Date,
  programs: Program[] = PROGRAMS
): ProgramItem[] =>
  programs
    .filter((other) => other.id !== program.id)
    .map((other) => {
      const sameType = other.tipo === program.tipo ? 2 : 0;
      const sharedLevel = other.niveis.some((level) =>
        program.niveis.includes(level)
      )
        ? 1
        : 0;
      return { other, score: sameType + sharedLevel };
    })
    .filter(({ score }) => score > 0)
    .map(({ other, score }) => ({ item: toProgramItem(other, now), score }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        STATUS_RANK[a.item.status.kind] - STATUS_RANK[b.item.status.kind]
    )
    .slice(0, RELATED_COUNT)
    .map(({ item }) => item);
