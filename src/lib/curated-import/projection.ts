import {
  currentDeadline,
  effectiveStatus,
  FORMAT_LABELS,
  LEVEL_LABELS,
  MASTER_STATUS_LABELS,
  type MasterRecord,
  TYPE_LABELS,
} from "./master";

const LIFECYCLES = {
  open: "open",
  rolling: "open",
  closed: "closed",
  upcoming: "announced",
  next_cycle_not_announced: "expected",
  unknown: "unknown",
} as const;
const known = (s: string) => s.trim() || "Não informado";
export const masterDescription = (r: MasterRecord): string =>
  [
    r.description,
    r.why_it_matters === r.description ? "" : r.why_it_matters,
    ...[
      ["Elegibilidade", r.eligibility],
      ["Nacionalidade", r.nationality_restrictions],
      ["Requisitos acadêmicos", r.academic_requirements],
      ["Idade", r.age_requirements],
      ["Idiomas", r.language_requirements],
      ["Custos", r.cost],
      ["Taxa de inscrição", r.application_fee],
      ["Financiamento", r.funding],
      ["Cobertura e condições", r.funding_details],
      ["Datas do programa", r.program_dates],
      ["Abertura das inscrições", r.application_opening],
      [
        "Prazo de ciclo anterior",
        r.deadline_status === "previous_cycle_only" ? r.deadline : "",
      ],
      ["Observações", r.verification_notes],
    ]
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`),
  ]
    .filter(Boolean)
    .join("\n\n");
export const mapMasterToLegacy = (
  r: MasterRecord,
  image: string,
  today: string
) => {
  const status = effectiveStatus(r, today);
  const common = {
    name: r.name,
    image,
    country: r.country || (r.format === "online" ? "Online" : "Não informado"),
    type: TYPE_LABELS[r.type] ?? "Outra oportunidade",
    educationLevel: r.levels.map((x) => LEVEL_LABELS[x] ?? x).join("; "),
    ageRange: known(r.age_requirements),
    specificRequirements: [
      r.eligibility,
      r.nationality_restrictions,
      r.academic_requirements,
    ]
      .filter(Boolean)
      .join("\n"),
    applicationFee: known(r.application_fee),
    duration: known(r.program_dates),
    applicationDeadline: currentDeadline(r),
    selectionSteps: "Consulte as etapas na página oficial",
    officialLink: r.official_url,
    officialInformationUrl: r.official_url,
    applicationUrl: null,
    responsibleInstitution: known(r.organization),
    lifecycleStatus: LIFECYCLES[status],
    contact: "Consulte a página oficial",
    extraCosts: known(r.cost),
  };
  const description = masterDescription(r);
  return {
    international: {
      ...common,
      city: r.city,
      description,
      languageRequirements: known(r.language_requirements),
      scholarshipType: r.funding
        ? "Financiamento: consulte condições"
        : "Não informado",
      scholarshipCoverage: known(
        [r.funding, r.funding_details].filter(Boolean).join("\n")
      ),
      applicationProcess: MASTER_STATUS_LABELS[status],
    },
    national: {
      ...common,
      country: r.country || "Brasil",
      modality: FORMAT_LABELS[r.format] ?? "Não informado",
      about: description,
      shortDescription: r.description.slice(0, 220),
      cityState: r.city,
      requirements: known(r.eligibility),
      benefits: known(
        [r.funding, r.funding_details].filter(Boolean).join("\n")
      ),
      costs: known(r.cost),
    },
  };
};
