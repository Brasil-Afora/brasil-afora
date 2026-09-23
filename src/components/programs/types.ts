// Programas e Bolsas: recurring programs (scholarships, mentorships, prep and
// access programs) rather than one-off opportunities. A program outlives any
// single deadline: when enrollment closes it stays listed, with the next
// edition, instead of disappearing like an expired opportunity.
//
// Field names follow the opportunity contract where the meaning is the same
// (nome, instituicaoResponsavel, linkOficial, prazoInscricao, modalidade,
// duracao, imagem, atualizadoEm), so a shared core stays possible later. The
// option lists below are the filter vocabulary: keep records to these values.

export const PROGRAM_TYPES = [
  "Bolsa",
  "Mentoria",
  "Preparatório",
  "Programa de acesso",
  "Intercâmbio",
  "Formação",
  "Idiomas",
  "Outro",
] as const;

export const PROGRAM_LEVELS = [
  "Ensino fundamental",
  "Ensino médio",
  "Ano sabático",
  "Graduação",
  "Pós-graduação",
] as const;

/** What the student gets. "Gratuito" means taking part costs nothing. */
export const PROGRAM_BENEFITS = [
  "Bolsa integral",
  "Bolsa parcial",
  "Gratuito",
  "Mentoria",
  "Preparação",
  "Mensalidade",
  "Moradia",
  "Viagem",
  "Auxílio financeiro",
] as const;

export const PROGRAM_MODALITIES = ["Online", "Presencial", "Híbrido"] as const;

/** Where the program leads: studying in Brazil or abroad. */
export const PROGRAM_DESTINATIONS = ["No Brasil", "No exterior"] as const;

export type ProgramType = (typeof PROGRAM_TYPES)[number];
export type ProgramLevel = (typeof PROGRAM_LEVELS)[number];
export type ProgramBenefit = (typeof PROGRAM_BENEFITS)[number];
export type ProgramModality = (typeof PROGRAM_MODALITIES)[number];
export type ProgramDestination = (typeof PROGRAM_DESTINATIONS)[number];

/**
 * The current (or next) enrollment round. Status is derived from these, so a
 * record never carries a hand-set "aberto/encerrado" that goes stale. Dates
 * are dd/mm/aaaa, like prazoInscricao in the opportunity catalogs.
 *
 * - `continuo` → "Inscrições o ano todo"
 * - before `abertura` → "Em breve"
 * - up to `prazoInscricao` → "Inscrições abertas", with a countdown
 * - after `prazoInscricao` → "Encerradas", with `previsao` as the next round
 * - only `previsao` → "Em breve"; only `nota` (or nothing) → "Datas a confirmar"
 */
export interface ProgramEnrollment {
  /** Opening day, when known. */
  abertura?: string;
  /** Enrollment is open all year (rolling). */
  continuo?: boolean;
  /** What the source says when it gives no dates. */
  nota?: string;
  /** Last day to apply. */
  prazoInscricao?: string;
  /** When the next round is expected, e.g. "fevereiro de 2027". */
  previsao?: string;
}

export interface ProgramDate {
  /** dd/mm/aaaa, or a month/period when that is all the source states. */
  data: string;
  label: string;
}

export interface Program {
  /** When the team last checked the record against the source (dd/mm/aaaa). */
  atualizadoEm: string;
  /** Benefits as filter values; the first one is the card's headline tag. */
  beneficios: ProgramBenefit[];
  /** The benefits spelled out, one line each. */
  beneficiosDetalhe: string[];
  /** Other dates of the current round (result, start…). */
  datas?: ProgramDate[];
  /** Weekly commitment, when the source states it. */
  dedicacao?: string;
  /** Paragraphs separated by a blank line. */
  descricao: string;
  destino: ProgramDestination[];
  duracao?: string;
  /** Selection steps, in order; the student ticks them on the page. */
  etapasSelecao: string[];
  /** Readable id, used in the URL: /programas-e-bolsas/<id>. */
  id: string;
  /** Photo for the card cover; without one the cover is a night map. */
  imagem?: string;
  inscricoes: ProgramEnrollment;
  instituicaoResponsavel: string;
  linkOficial: string;
  /** Where it runs, in the source's words ("Online", a city list…). */
  local: string;
  /** Absent when the source does not say (or it varies by course). */
  modalidade?: ProgramModality;
  niveis: ProgramLevel[];
  nome: string;
  /** Country it leads to, when there is one (sets the cover's region). */
  pais?: string;
  /** One line: who it is for, e.g. "9º ano do ensino fundamental". */
  publico: string;
  requisitos: string[];
  /** One sentence for cards and the page's lede. */
  resumo: string;
  tipo: ProgramType;
  /** "Fundação", "Governo federal", "Associação de estudantes"… */
  tipoOrganizacao?: string;
}
