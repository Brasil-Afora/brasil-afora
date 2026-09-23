import {
  currentDeadline,
  identityKey,
  LEVEL_LABELS,
  normalizeOfficialUrl,
} from "@/lib/curated-import/master";
import { masterDescription } from "@/lib/curated-import/projection";
import type { CuratedPublication } from "@/server/publication/curated-projection";
import type { Program, ProgramLevel, ProgramModality } from "./types";

const LEVELS: Record<string, ProgramLevel> = {
  primary_school: "Ensino fundamental",
  elementary_middle: "Ensino fundamental",
  middle_school: "Ensino fundamental",
  elementary_school: "Ensino fundamental",
  high_school: "Ensino médio",
  undergraduate: "Graduação",
  gap_year: "Ano sabático",
  graduate: "Pós-graduação",
  postgraduate: "Pós-graduação",
  masters: "Pós-graduação",
  phd: "Pós-graduação",
  doctoral: "Pós-graduação",
  postdoc: "Pós-graduação",
};
const MODALITIES: Record<string, ProgramModality> = {
  in_person: "Presencial",
  online: "Online",
  remote: "Online",
  hybrid: "Híbrido",
};
const ELIGIBILITY_LABELS: Record<string, string> = {
  confirmed: "Participação de brasileiros confirmada",
  likely:
    "Possível participação de brasileiros; confirme as condições na fonte oficial",
  unknown: "Elegibilidade de brasileiros não informada",
  not_eligible: "Brasileiros não elegíveis",
};
const FIELD_LABELS: Record<string, string> = {
  mathematics: "Matemática",
  engineering: "Engenharia",
  research: "Pesquisa",
  science: "Ciências",
  sciences: "Ciências",
  humanities: "Humanidades",
  arts: "Artes",
  technology: "Tecnologia",
  education: "Educação",
  business: "Negócios",
  computer_science: "Ciência da computação",
  social_sciences: "Ciências sociais",
  all: "Todas as áreas",
  multiple: "Múltiplas áreas",
  unknown: "Área não informada",
};
const FUNDING_LABELS: Record<string, string> = {
  fully_funded: "Financiamento integral",
  partially_funded: "Financiamento parcial",
  full: "Financiamento integral",
  partial: "Financiamento parcial",
  unknown: "Financiamento não informado",
  none: "Sem financiamento informado",
};
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PROGRAM_TYPE = {
  scholarship: "Bolsa",
  mentorship: "Mentoria",
  language_program: "Idiomas",
} as const;
const dateLabel = (date: string) => date.split("-").reverse().join("/");
const openingDate = (date: string): string | undefined => {
  if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(date))) {
    return undefined;
  }
  return new Date(date).toISOString().slice(0, 10) === date
    ? dateLabel(date)
    : undefined;
};
export const toCuratedProgram = (
  publication: CuratedPublication & { id: string }
): Program => {
  const r = publication.source;
  const deadline = currentDeadline(r);
  const funding = FUNDING_LABELS[r.funding] ?? r.funding;
  return {
    id: publication.id,
    nome: r.name,
    verified: publication.verified,
    instituicaoResponsavel: r.organization || "Não informado",
    tipo: PROGRAM_TYPE[r.type as keyof typeof PROGRAM_TYPE] ?? "Outro",
    resumo: r.description,
    descricao: [
      masterDescription({ ...r, funding }),
      r.fields.length
        ? `Áreas: ${r.fields.map((field) => FIELD_LABELS[field] ?? field).join(" · ")}`
        : "",
      r.levels.length
        ? `Público e níveis: ${r.levels.map((level) => LEVEL_LABELS[level] ?? level).join(" · ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    niveis: [
      ...new Set(
        r.levels.flatMap((level) => (LEVELS[level] ? [LEVELS[level]] : []))
      ),
    ],
    publico: r.eligibility || "Não informado",
    beneficios: r.type === "mentorship" ? ["Mentoria"] : [],
    beneficiosDetalhe: [funding, r.funding_details].filter(Boolean),
    modalidade: MODALITIES[r.format],
    local: [r.city, r.country].filter(Boolean).join(" · ") || "Não informado",
    pais: r.country || undefined,
    destino: r.scope === "international" ? ["No exterior"] : ["No Brasil"],
    requisitos: [
      r.eligibility,
      ELIGIBILITY_LABELS[r.brazilian_eligibility] ?? "",
      r.nationality_restrictions,
      r.age_requirements,
      r.academic_requirements,
      r.language_requirements,
    ].filter(Boolean),
    etapasSelecao: [],
    inscricoes: {
      abertura: openingDate(r.application_opening),
      prazoInscricao: deadline ? dateLabel(deadline) : undefined,
      continuo: r.applications_status === "rolling",
      nota: r.verification_notes || undefined,
      situacaoNaFonte: r.applications_status,
    },
    datas: r.program_dates
      ? [{ label: "Datas do programa", data: r.program_dates }]
      : [],
    linkOficial: r.official_url,
    atualizadoEm: dateLabel(publication.importedAt.slice(0, 10)),
    imagem: publication.image || undefined,
    fontes: r.sources,
  };
};
const key = (p: Program) =>
  identityKey({ name: p.nome, organization: p.instituicaoResponsavel });
/** Published records supersede starter records by identity, never by shared domain. */
export const mergePrograms = (
  published: Program[],
  starter: Program[]
): Program[] => {
  const merged = new Map<string, Program>();
  for (const program of published) {
    merged.set(key(program), program);
  }
  for (const program of starter) {
    const existing = [...merged.values()].find(
      (p) =>
        key(p) === key(program) ||
        (p.nome === program.nome &&
          normalizeOfficialUrl(p.linkOficial) ===
            normalizeOfficialUrl(program.linkOficial))
    );
    if (existing) {
      merged.set(key(existing), {
        ...existing,
        aliases: [...(existing.aliases ?? []), program.id],
      });
    } else {
      merged.set(key(program), program);
    }
  }
  return [...merged.values()];
};
