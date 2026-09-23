import { z } from "zod";

export const masterRecordSchema = z
  .object({
    name: z.string().min(1),
    organization: z.string(),
    scope: z.enum(["national", "international", "regional"]),
    type: z.string(),
    country: z.string(),
    city: z.string(),
    format: z.string(),
    levels: z.array(z.string()),
    fields: z.array(z.string()),
    brazilian_eligibility: z.string(),
    eligibility: z.string(),
    nationality_restrictions: z.string(),
    age_requirements: z.string(),
    academic_requirements: z.string(),
    language_requirements: z.string(),
    cost: z.string(),
    application_fee: z.string(),
    funding: z.string(),
    funding_details: z.string(),
    applications_status: z.enum([
      "open",
      "rolling",
      "closed",
      "upcoming",
      "next_cycle_not_announced",
      "unknown",
    ]),
    application_opening: z.string(),
    deadline: z.string(),
    deadline_status: z.string(),
    program_dates: z.string(),
    official_url: z.url(),
    description: z.string(),
    why_it_matters: z.string(),
    recurring: z.string(),
    verification_notes: z.string(),
    sources: z.array(z.string()),
  })
  .strict();
export type MasterRecord = z.infer<typeof masterRecordSchema>;
export const qaRecordSchema = z
  .object({
    name: z.string(),
    organization: z.string(),
    verification_badge_recommended: z.boolean(),
    badge_reason: z.string(),
  })
  .passthrough();
export type MasterStatus = MasterRecord["applications_status"];
const DIACRITICS = /\p{M}/gu;
const NON_WORD = /[^a-z0-9]+/g;
const WWW_PREFIX = /^www\./;
const TRAILING_SLASHES = /\/+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const normalizeName = (s: string): string =>
  s
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(NON_WORD, " ")
    .trim();
export const identityKey = (
  r: Pick<MasterRecord, "name" | "organization">
): string => `${normalizeName(r.name)}|${normalizeName(r.organization)}`;
export const normalizeOfficialUrl = (s: string): string => {
  const u = new URL(s);
  const query = [...u.searchParams]
    .filter(([key]) => !key.startsWith("utm_"))
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .sort()
    .join("&");
  return `${u.hostname.replace(WWW_PREFIX, "")}${u.pathname.replace(TRAILING_SLASHES, "")}${query ? `?${query}` : ""}`;
};
export const currentDeadline = (
  r: Pick<MasterRecord, "deadline" | "deadline_status">
): string | null =>
  ["confirmed", "priority"].includes(r.deadline_status) &&
  ISO_DATE.test(r.deadline) &&
  !Number.isNaN(Date.parse(r.deadline)) &&
  new Date(r.deadline).toISOString().slice(0, 10) === r.deadline
    ? r.deadline
    : null;
export const effectiveStatus = (
  r: Pick<MasterRecord, "applications_status" | "deadline" | "deadline_status">,
  today: string
): MasterStatus => {
  const deadline = currentDeadline(r);
  return r.applications_status === "open" && deadline && deadline < today
    ? "closed"
    : r.applications_status;
};
export const isProgramRecord = (
  r: Pick<MasterRecord, "type" | "recurring">
): boolean =>
  r.recurring === "yes" &&
  ["scholarship", "mentorship", "language_program"].includes(r.type);
export const MASTER_STATUS_LABELS: Record<MasterStatus, string> = {
  open: "Inscrições abertas",
  rolling: "Inscrições contínuas",
  closed: "Inscrições encerradas",
  upcoming: "Inscrições em breve",
  next_cycle_not_announced: "Próximo ciclo ainda não anunciado",
  unknown: "Situação das inscrições não informada",
};
export const TYPE_LABELS: Record<string, string> = {
  academic_program: "Programa acadêmico",
  winter_program: "Programa de inverno",
  summer_program: "Summer School",
  fellowship: "Fellowship",
  scholarship: "Bolsa de estudos",
  research: "Pesquisa",
  competition: "Competição",
  grant: "Auxílio financeiro",
  mentorship: "Programas de Mentoria",
  volunteering: "Voluntariado",
  internship: "Estágio",
  postgraduate: "Pós-graduação",
  language_program: "Curso de idiomas",
};
export const LEVEL_LABELS: Record<string, string> = {
  primary_school: "Ensino fundamental",
  technical_school: "Ensino técnico",
  multiple: "Múltiplos níveis",
  elementary_middle: "Ensino fundamental",
  middle_school: "Ensino fundamental",
  elementary_school: "Ensino fundamental",
  high_school: "Ensino médio",
  undergraduate: "Graduação",
  graduate: "Pós-graduação",
  postgraduate: "Pós-graduação",
  masters: "Mestrado",
  phd: "Doutorado",
  doctoral: "Doutorado",
  postdoc: "Pós-doutorado",
  gap_year: "Ano sabático",
  recent_graduate: "Recém-formados",
  teacher_educator: "Educadores",
  professional: "Profissionais",
  all: "Todos os níveis",
};
export const FORMAT_LABELS: Record<string, string> = {
  in_person: "Presencial",
  online: "Online",
  remote: "Online",
  hybrid: "Híbrido",
  unknown: "Não informado",
};
export interface CuratedMetadata {
  badgeReason: string;
  imageSource: string | null;
  importedAt: string;
  program: boolean;
  source: MasterRecord;
  sourceHash: string;
  verified: boolean;
}
