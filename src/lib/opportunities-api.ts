import {
  getVerifiedInternationalOpportunityById,
  getVerifiedNationalOpportunityById,
} from "@/data/verified-opportunities";
import type { MasterStatus } from "@/lib/curated-import/master";
import type { OpportunityLocation } from "@/lib/geo";

interface OpportunityRecord {
  ageRange: string;
  applicationDeadline: string | Date | null;
  applicationFee: string;
  applicationLinkStatus?: string | null;
  applicationProcess: string;
  applicationUrl?: string | null;
  canApply?: boolean | null;
  city: string;
  contact: string;
  country: string;
  createdAt?: string | Date;
  curatedStatus?: MasterStatus;
  curatedStatusLabel?: string;
  description: string;
  duration: string;
  educationLevel: string;
  extraCosts: string;
  id: string;
  image: string;
  languageRequirements: string;
  lastVerifiedAt?: string | Date | null;
  lifecycleStatus?: string | null;
  /** Resolved on the server from the city/state text. */
  locations?: OpportunityLocation[];
  name: string;
  officialLink: string;
  program?: boolean;
  responsibleInstitution: string;
  scholarshipCoverage: string;
  scholarshipType: string;
  selectionSteps: string;
  specificRequirements: string;
  type: string;
  updatedAt?: string | Date;
  verified?: boolean;
}

interface NationalOpportunityRecord {
  about: string;
  ageRange: string;
  applicationDeadline: string | Date | null;
  applicationFee: string;
  applicationLinkStatus?: string | null;
  applicationUrl?: string | null;
  benefits: string;
  canApply?: boolean | null;
  cityState: string;
  contact: string;
  costs: string;
  country: string;
  createdAt?: string | Date;
  curatedStatus?: MasterStatus;
  curatedStatusLabel?: string;
  duration: string;
  educationLevel: string;
  extraCosts: string;
  id: string;
  image: string;
  lastVerifiedAt?: string | Date | null;
  lifecycleStatus?: string | null;
  /** Resolved on the server from the city/state text. */
  locations?: OpportunityLocation[];
  modality: string;
  name: string;
  officialLink: string;
  program?: boolean;
  requirements: string;
  responsibleInstitution: string;
  selectionSteps: string;
  shortDescription: string;
  specificRequirements: string;
  type: string;
  updatedAt?: string | Date;
  verified?: boolean;
}

export interface StructuredAgeRule {
  exact_age: number | null;
  maximum_age: number | null;
  maximum_inclusive: boolean;
  minimum_age: number | null;
  minimum_inclusive: boolean;
  source_text: string;
}

export interface StructuredSemanticField {
  applicability: string;
  criticality: string;
  display_key: string;
  display_text: string;
  explanation: string;
  gate_impact: string;
  last_verified_at: string | null;
  source_coverage: string;
  state: string;
  value: unknown;
}

interface StructuredOpportunityRecord {
  age_rules: StructuredAgeRule[];
  application_deadline_date: string | null;
  application_link_status: string;
  application_url: string | null;
  brazil_eligibility: string;
  can_apply?: boolean;
  collection: "international" | "national" | "unknown";
  curatedInternational?: Omit<OpportunityRecord, "id">;
  curatedNational?: Omit<NationalOpportunityRecord, "id">;
  curatedStatus?: MasterStatus;
  curatedStatusLabel?: string;
  description: string;
  education_levels: string[];
  id: string;
  image_url: string | null;
  is_free: boolean | null;
  last_verified_at: string | null;
  lifecycle: string;
  location: string | null;
  locations?: OpportunityLocation[];
  modality: "hybrid" | "in_person" | "online" | "unknown";
  official_information_url: string;
  opportunity_types: string[];
  organizer: string | null;
  program?: boolean;
  semantic_fields: Record<string, StructuredSemanticField>;
  title: string;
  verified?: boolean;
}

type StructuredActionability = Pick<
  StructuredOpportunityRecord,
  | "application_link_status"
  | "application_url"
  | "can_apply"
  | "collection"
  | "id"
  | "last_verified_at"
  | "lifecycle"
>;

export interface InternationalOpportunity {
  applicationLinkStatus?: string | null;
  applicationUrl?: string | null;
  /** Last time the record changed in the catalog (dd/mm/yyyy), when known. */
  atualizadoEm?: string;
  canApply?: boolean | null;
  cidade: string;
  coberturaBolsa: string;
  contato: string;
  curatedStatus?: MasterStatus;
  curatedStatusLabel?: string;
  custosExtras: string;
  descricao: string;
  duracao: string;
  etapasSelecao: string;
  faixaEtaria: string;
  id: string;
  imagem: string;
  instituicaoResponsavel: string;
  lastVerifiedAt?: string | null;
  lifecycleStatus?: string | null;
  linkOficial: string;
  /** Where it takes place; filled in by the API (and for the verified set by the server page). */
  localizacoes?: OpportunityLocation[];
  nivelEnsino: string;
  nome: string;
  pais: string;
  prazoInscricao: string;
  processoInscricao: string;
  program?: boolean;
  requisitosEspecificos: string;
  requisitosIdioma: string;
  semanticFields?: Record<string, StructuredSemanticField>;
  structuredAgeRules?: StructuredAgeRule[];
  taxaAplicacao: string;
  tipo: string;
  tipoBolsa: string;
  verified?: boolean;
}

export interface NationalOpportunity {
  applicationLinkStatus?: string | null;
  applicationUrl?: string | null;
  /** Last time the record changed in the catalog (dd/mm/yyyy), when known. */
  atualizadoEm?: string;
  beneficios: string;
  canApply?: boolean | null;
  cidadeEstado: string;
  contato: string;
  curatedStatus?: MasterStatus;
  curatedStatusLabel?: string;
  custos: string;
  custosExtras: string;
  duracao: string;
  etapasSelecao: string;
  faixaEtaria: string;
  id: string;
  imagem: string;
  instituicaoResponsavel: string;
  lastVerifiedAt?: string | null;
  lifecycleStatus?: string | null;
  linkOficial: string;
  /** Where it takes place; filled in by the API (and for the verified set by the server page). */
  localizacoes?: OpportunityLocation[];
  modalidade: "Em verificação" | "Híbrido" | "Online" | "Presencial";
  nivelEnsino: string;
  nome: string;
  pais: string;
  prazoInscricao: string;
  program?: boolean;
  requisitos: string;
  requisitosEspecificos: string[];
  semanticFields?: Record<string, StructuredSemanticField>;
  sobre: string;
  structuredAgeRules?: StructuredAgeRule[];
  taxaAplicacao: string;
  tipo: string;
  verified?: boolean;
}

// Locations and timestamps are derived on the server, never entered.
export type InternationalOpportunityInput = Omit<
  InternationalOpportunity,
  | "verified"
  | "curatedStatus"
  | "curatedStatusLabel"
  | "program"
  | "applicationLinkStatus"
  | "applicationUrl"
  | "canApply"
  | "id"
  | "localizacoes"
  | "atualizadoEm"
  | "lastVerifiedAt"
  | "lifecycleStatus"
  | "semanticFields"
  | "structuredAgeRules"
>;
export type NationalOpportunityInput = Omit<
  NationalOpportunity,
  | "verified"
  | "curatedStatus"
  | "curatedStatusLabel"
  | "program"
  | "applicationLinkStatus"
  | "applicationUrl"
  | "canApply"
  | "id"
  | "localizacoes"
  | "atualizadoEm"
  | "lastVerifiedAt"
  | "lifecycleStatus"
  | "semanticFields"
  | "structuredAgeRules"
>;

const SPECIFIC_REQUIREMENTS_SPLIT_REGEX = /\r?\n|;|\|/;
const BR_DATE_IN_TEXT_REGEX = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/;
const MULTISPACE_REGEX = /\s+/g;
const SHORT_DESCRIPTION_MAX_LENGTH = 220;
const DEFAULT_OPPORTUNITY_IMAGE_URL =
  "https://dummyimage.com/1200x630/0f172a/f8fafc&text=Oportunidade";
const ISO_DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const STRUCTURED_OPPORTUNITIES_ENABLED =
  process.env.NEXT_PUBLIC_STRUCTURED_OPPORTUNITIES === "true";
const OPPORTUNITY_TYPE_LABELS: Record<string, string> = {
  academic_mobility: "Mobilidade acadêmica",
  competition: "Competição",
  conference: "Conferência",
  cultural_exchange: "Intercâmbio cultural",
  degree: "Graduação",
  fellowship: "Fellowship",
  internship: "Estágio/Trabalho",
  language_course: "Curso de idiomas",
  leadership_program: "Programas de Liderança",
  mentorship: "Programas de Mentoria",
  model_un: "Simulações da ONU",
  olympiad: "Olimpíadas",
  research: "Pesquisa",
  scholarship: "Bolsa de estudos",
  science_fair: "Feiras de Ciências",
  short_course: "Curso curta duração",
  summer_program: "Curso de verão",
  unknown: "Tipo de oportunidade em verificação",
  volunteering: "Voluntariado/Social",
  work_program: "Programa de trabalho",
  workshop: "Evento/Workshop",
};
const EDUCATION_LEVEL_LABELS: Record<string, string> = {
  elementary_middle: "Ensino Fundamental",
  gap_year: "Ano Sabático",
  graduate: "Pós-graduação",
  high_school: "Ensino Médio",
  institution: "Instituição",
  international_secondary: "Ensino Médio internacional",
  recent_graduate: "Recém-formado",
  school_team: "Equipe escolar",
  teacher_educator: "Professor/Educador",
  technical_secondary: "Ensino Médio técnico",
  undergraduate: "Graduação",
  university_team: "Equipe universitária",
};

class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

const toDateString = (value: string | Date | null): string => {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    const dateOnlyMatch = ISO_DATE_ONLY_PATTERN.exec(value.trim());
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      const parsedUtc = new Date(
        Date.UTC(Number(year), Number(month) - 1, Number(day))
      );
      const isValidDateOnly =
        parsedUtc.getUTCFullYear() === Number(year) &&
        parsedUtc.getUTCMonth() + 1 === Number(month) &&
        parsedUtc.getUTCDate() === Number(day);

      return isValidDateOnly ? `${day}/${month}/${year}` : "";
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();

  return `${day}/${month}/${year}`;
};

const toApiDateString = (value: string): string => {
  const parts = value.split("/");
  if (parts.length !== 3) {
    return value;
  }

  const [day, month, year] = parts;
  if (!(day && month && year)) {
    return value;
  }

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const extractFirstBrDateToken = (value: string): string | undefined => {
  const match = BR_DATE_IN_TEXT_REGEX.exec(value);

  if (!match) {
    return undefined;
  }

  const [, day, month, year] = match;
  if (!(day && month && year)) {
    return undefined;
  }

  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
};

const toApiDateIfValid = (value: string): string | undefined => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return undefined;
  }

  const normalizedDateToken =
    extractFirstBrDateToken(trimmedValue) ?? trimmedValue;
  const isoLikeValue = toApiDateString(normalizedDateToken);
  const parsedDate = new Date(isoLikeValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return undefined;
  }

  return isoLikeValue;
};

const toSingleLine = (value: string): string => {
  return value.replace(MULTISPACE_REGEX, " ").trim();
};

const toOptionalSingleLine = (value: string): string | undefined => {
  const normalizedValue = toSingleLine(value);
  if (!normalizedValue) {
    return undefined;
  }

  return normalizedValue;
};

const toShortDescription = (value: string): string => {
  const normalized = toSingleLine(value);
  if (!normalized) {
    return "";
  }

  if (normalized.length <= SHORT_DESCRIPTION_MAX_LENGTH) {
    return normalized;
  }

  const truncated = normalized.slice(0, SHORT_DESCRIPTION_MAX_LENGTH);
  const safeCutoffThreshold = Math.floor(SHORT_DESCRIPTION_MAX_LENGTH * 0.6);
  const lastSpaceIndex = truncated.lastIndexOf(" ");

  if (lastSpaceIndex > safeCutoffThreshold) {
    return `${truncated.slice(0, lastSpaceIndex)}...`;
  }

  return `${truncated}...`;
};

const normalizeOutboundImage = (value: string): string => {
  const trimmedValue = value.trim();
  if (trimmedValue) {
    return trimmedValue;
  }

  return DEFAULT_OPPORTUNITY_IMAGE_URL;
};

const splitSpecificRequirements = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(SPECIFIC_REQUIREMENTS_SPLIT_REGEX)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const normalizeModality = (
  modality: string | undefined
): "Em verificação" | "Híbrido" | "Online" | "Presencial" => {
  if (!modality) {
    return "Em verificação";
  }

  const modalityLower = modality
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const includesHybridTerm =
    modalityLower.includes("hybrid") ||
    modalityLower.includes("hibrido") ||
    modalityLower.includes("misto");
  const includesOnlineTerm =
    modalityLower.includes("online") ||
    modalityLower.includes("remoto") ||
    modalityLower.includes("remote") ||
    modalityLower.includes("ead");
  const includesPresentialTerm =
    modalityLower.includes("in_person") ||
    modalityLower.includes("presencial") ||
    modalityLower.includes("presenca");

  if (includesHybridTerm || (includesOnlineTerm && includesPresentialTerm)) {
    return "Híbrido";
  }
  if (includesOnlineTerm) {
    return "Online";
  }
  if (includesPresentialTerm) {
    return "Presencial";
  }

  return "Em verificação";
};

type LegacyActionabilityRecord = Pick<
  OpportunityRecord,
  | "verified"
  | "curatedStatus"
  | "curatedStatusLabel"
  | "program"
  | "applicationLinkStatus"
  | "applicationUrl"
  | "lastVerifiedAt"
  | "lifecycleStatus"
>;

interface MappedActionability {
  applicationLinkStatus: string | null;
  applicationUrl: string | null;
  canApply: boolean | null;
  lastVerifiedAt: string | null;
  lifecycleStatus: string | null;
}

const normalizedLastVerifiedAt = (
  value: string | Date | null | undefined
): string | null => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value ?? null;
};

const mapLegacyActionability = (
  item: LegacyActionabilityRecord,
  actionability: StructuredActionability | null
): MappedActionability => {
  if (actionability) {
    return {
      applicationLinkStatus: actionability.application_link_status,
      applicationUrl: actionability.application_url,
      canApply: actionability.can_apply ?? null,
      lastVerifiedAt: actionability.last_verified_at,
      lifecycleStatus: actionability.lifecycle,
    };
  }
  return {
    applicationLinkStatus: item.applicationLinkStatus ?? null,
    applicationUrl: item.applicationUrl ?? null,
    canApply: false,
    lastVerifiedAt: normalizedLastVerifiedAt(item.lastVerifiedAt),
    lifecycleStatus: item.lifecycleStatus ?? null,
  };
};

const updatedAtOf = (value: string | Date | undefined): string | undefined =>
  value ? toDateString(value) : undefined;

const mapInternationalOpportunity = (
  item: OpportunityRecord,
  actionability: StructuredActionability | null = null
): InternationalOpportunity => ({
  verified: item.verified,
  curatedStatus: item.curatedStatus,
  curatedStatusLabel: item.curatedStatusLabel,
  program: item.program,
  id: String(item.id),
  nome: item.name,
  imagem: item.image,
  pais: item.country,
  cidade: item.city,
  instituicaoResponsavel: item.responsibleInstitution,
  tipo: item.type,
  descricao: item.description,
  nivelEnsino: item.educationLevel,
  faixaEtaria: item.ageRange,
  requisitosIdioma: item.languageRequirements,
  requisitosEspecificos: item.specificRequirements,
  taxaAplicacao: item.applicationFee,
  tipoBolsa: item.scholarshipType,
  coberturaBolsa: item.scholarshipCoverage,
  custosExtras: item.extraCosts,
  duracao: item.duration,
  prazoInscricao: toDateString(item.applicationDeadline),
  etapasSelecao: item.selectionSteps,
  processoInscricao: item.applicationProcess,
  linkOficial: item.officialLink,
  ...mapLegacyActionability(item, actionability),
  contato: item.contact,
  localizacoes: item.locations ?? [],
  atualizadoEm: updatedAtOf(item.updatedAt),
});

const mapNationalOpportunity = (
  item: NationalOpportunityRecord,
  actionability: StructuredActionability | null = null
): NationalOpportunity => ({
  verified: item.verified,
  curatedStatus: item.curatedStatus,
  curatedStatusLabel: item.curatedStatusLabel,
  program: item.program,
  id: String(item.id ?? ""),
  nome: item.name ?? "",
  imagem: item.image ?? "",
  pais: item.country ?? "Brasil",
  tipo: item.type ?? "",
  nivelEnsino: item.educationLevel ?? "",
  modalidade: normalizeModality(item.modality),
  prazoInscricao: toDateString(item.applicationDeadline),
  sobre: item.about ?? "",
  duracao: item.duration ?? "",
  cidadeEstado: item.cityState ?? "",
  faixaEtaria: item.ageRange ?? "",
  requisitos: item.requirements ?? "",
  requisitosEspecificos: splitSpecificRequirements(item.specificRequirements),
  instituicaoResponsavel: item.responsibleInstitution ?? "",
  taxaAplicacao: item.applicationFee ?? "",
  beneficios: item.benefits ?? "",
  custos: item.costs ?? "",
  custosExtras: item.extraCosts ?? "",
  etapasSelecao: item.selectionSteps ?? "",
  linkOficial: item.officialLink ?? "",
  ...mapLegacyActionability(item, actionability),
  contato: item.contact ?? "",
  localizacoes: item.locations ?? [],
  atualizadoEm: updatedAtOf(item.updatedAt),
});

const structuredAgeText = (rules: StructuredAgeRule[]): string =>
  rules
    .map((rule) => rule.source_text)
    .filter(Boolean)
    .join("; ");

const semanticText = (
  item: StructuredOpportunityRecord,
  fieldName: string,
  fallback: string
): string => item.semantic_fields[fieldName]?.display_text ?? fallback;

const structuredTypeText = (values: string[]): string =>
  values.map((value) => OPPORTUNITY_TYPE_LABELS[value] ?? value).join("; ");

const structuredEducationText = (values: string[]): string =>
  values.map((value) => EDUCATION_LEVEL_LABELS[value] ?? value).join("; ");

const structuredFeeText = (isFree: boolean | null): string => {
  if (isFree === true) {
    return "Gratuito";
  }
  if (isFree === false) {
    return "Pago";
  }
  return "Informações de custo em verificação";
};

const mapStructuredInternationalOpportunity = (
  item: StructuredOpportunityRecord
): InternationalOpportunity => {
  if (item.curatedInternational) {
    return mapInternationalOpportunity(
      {
        ...item.curatedInternational,
        id: item.id,
        verified: item.verified,
        curatedStatus: item.curatedStatus,
        curatedStatusLabel: item.curatedStatusLabel,
        program: item.program,
        locations: item.locations,
      },
      item
    );
  }
  return {
    id: item.id,
    nome: item.title,
    verified: item.verified,
    curatedStatus: item.curatedStatus,
    curatedStatusLabel: item.curatedStatusLabel,
    program: item.program,
    localizacoes: item.locations,
    imagem: item.image_url ?? "/home.png",
    pais: semanticText(item, "country", "País em verificação"),
    cidade: semanticText(item, "city", "Cidade em verificação"),
    instituicaoResponsavel: semanticText(
      item,
      "organizer",
      "Organizador em verificação"
    ),
    tipo: structuredTypeText(item.opportunity_types),
    descricao: semanticText(item, "description", item.description),
    nivelEnsino: semanticText(
      item,
      "education_level",
      structuredEducationText(item.education_levels) ||
        "Nível de ensino em verificação"
    ),
    faixaEtaria: semanticText(
      item,
      "age",
      structuredAgeText(item.age_rules) || "Regra de idade em verificação"
    ),
    structuredAgeRules: item.age_rules,
    semanticFields: item.semantic_fields,
    requisitosIdioma: semanticText(
      item,
      "language",
      "Requisitos de idioma em verificação"
    ),
    requisitosEspecificos: semanticText(
      item,
      "required_documents",
      "Requisitos específicos em verificação"
    ),
    taxaAplicacao: semanticText(
      item,
      "application_fee",
      structuredFeeText(item.is_free)
    ),
    tipoBolsa: semanticText(item, "scholarship", "Bolsa em verificação"),
    coberturaBolsa: semanticText(
      item,
      "full_funding",
      "Cobertura da bolsa em verificação"
    ),
    custosExtras: semanticText(
      item,
      "mandatory_additional_costs",
      "Custos adicionais em verificação"
    ),
    duracao: semanticText(item, "duration", "Duração em verificação"),
    prazoInscricao: item.application_deadline_date
      ? toDateString(item.application_deadline_date)
      : "",
    etapasSelecao: "Etapas de seleção em verificação",
    processoInscricao: "Processo de inscrição em verificação",
    linkOficial: item.official_information_url,
    applicationLinkStatus: item.application_link_status,
    applicationUrl: item.application_url,
    canApply: item.can_apply ?? null,
    lastVerifiedAt: item.last_verified_at,
    lifecycleStatus: item.lifecycle,
    contato: "Contato disponível na página oficial",
  };
};

const mapStructuredNationalOpportunity = (
  item: StructuredOpportunityRecord
): NationalOpportunity => {
  if (item.curatedNational) {
    return mapNationalOpportunity(
      {
        ...item.curatedNational,
        id: item.id,
        verified: item.verified,
        curatedStatus: item.curatedStatus,
        curatedStatusLabel: item.curatedStatusLabel,
        program: item.program,
        locations: item.locations,
      },
      item
    );
  }
  return {
    id: item.id,
    nome: item.title,
    verified: item.verified,
    curatedStatus: item.curatedStatus,
    curatedStatusLabel: item.curatedStatusLabel,
    program: item.program,
    localizacoes: item.locations,
    imagem: item.image_url ?? "/home.png",
    pais: "Brasil",
    tipo: structuredTypeText(item.opportunity_types),
    nivelEnsino: structuredEducationText(item.education_levels),
    modalidade: normalizeModality(item.modality),
    prazoInscricao: item.application_deadline_date
      ? toDateString(item.application_deadline_date)
      : "",
    sobre: item.description,
    duracao: semanticText(item, "duration", "Duração em verificação"),
    cidadeEstado: semanticText(
      item,
      "city",
      item.location ?? "Local em verificação"
    ),
    faixaEtaria: semanticText(
      item,
      "age",
      structuredAgeText(item.age_rules) || "Regra de idade em verificação"
    ),
    structuredAgeRules: item.age_rules,
    semanticFields: item.semantic_fields,
    requisitos: semanticText(
      item,
      "required_documents",
      "Requisitos em verificação"
    ),
    requisitosEspecificos: [],
    instituicaoResponsavel: semanticText(
      item,
      "organizer",
      "Organizador em verificação"
    ),
    taxaAplicacao: semanticText(
      item,
      "application_fee",
      structuredFeeText(item.is_free)
    ),
    beneficios: semanticText(item, "benefits", "Benefícios em verificação"),
    custos: semanticText(
      item,
      "program_cost",
      "Informações de custo em verificação"
    ),
    custosExtras: semanticText(
      item,
      "mandatory_additional_costs",
      "Custos adicionais em verificação"
    ),
    etapasSelecao: "Etapas de seleção em verificação",
    linkOficial: item.official_information_url,
    applicationLinkStatus: item.application_link_status,
    applicationUrl: item.application_url,
    canApply: item.can_apply ?? null,
    lastVerifiedAt: item.last_verified_at,
    lifecycleStatus: item.lifecycle,
    contato: "Contato disponível na página oficial",
  };
};

const fetchFromApi = async <T>(path: string): Promise<T> => {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    let errorMessage = `Falha ao buscar ${path}: ${response.status}`;

    try {
      const errorBody = (await response.json()) as {
        error?: { message?: string };
        message?: string;
      };
      const responseMessage = errorBody.error?.message ?? errorBody.message;
      if (responseMessage) {
        errorMessage = responseMessage;
      }
    } catch {
      // Ignore invalid JSON response body.
    }

    throw new ApiRequestError(errorMessage, response.status);
  }

  return (await response.json()) as T;
};

const fetchStructuredActionabilityById = async (
  id: string
): Promise<StructuredActionability | null> => {
  try {
    const result = await fetchFromApi<{ data: StructuredActionability }>(
      `/api/v1/opportunities/${id}`
    );
    return result.data;
  } catch {
    return null;
  }
};

const fetchStructuredPages = async <T extends { id: string }>(
  collection: "international" | "national",
  onPage: (items: T[]) => void
): Promise<void> => {
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  while (true) {
    const params = new URLSearchParams({ collection, limit: "100" });
    if (cursor) {
      params.set("cursor", cursor);
    }
    const result = await fetchFromApi<{
      data: { items: T[]; next_cursor: string | null };
    }>(`/api/v1/opportunities?${params.toString()}`);
    onPage(result.data.items);
    const nextCursor = result.data.next_cursor;
    if (!nextCursor) {
      return;
    }
    if (seenCursors.has(nextCursor)) {
      throw new Error("A paginação do catálogo retornou um cursor repetido.");
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }
};

const fetchStructuredOpportunities = async (
  collection: "international" | "national"
): Promise<StructuredOpportunityRecord[]> => {
  const index = new Map<string, StructuredOpportunityRecord>();
  await fetchStructuredPages<StructuredOpportunityRecord>(
    collection,
    (items) => {
      for (const item of items) {
        index.set(item.id, item);
      }
    }
  );
  return [...index.values()];
};

const fetchStructuredActionabilityIndex = async (
  collection: "international" | "national"
): Promise<Map<string, StructuredActionability>> => {
  const index = new Map<string, StructuredActionability>();
  try {
    await fetchStructuredPages<StructuredActionability>(collection, (items) => {
      for (const item of items) {
        index.set(item.id, item);
      }
    });
  } catch {
    // Legacy records remain available when the optional v1 service is unavailable.
  }
  return index;
};

const sendToApi = async (
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown
): Promise<void> => {
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `Falha ao executar ${method} em ${path}: ${response.status}`;
    const responseText = await response.text();

    if (responseText) {
      try {
        const errorBody = JSON.parse(responseText) as {
          error?: string;
          message?: string;
        };
        if (errorBody.message) {
          errorMessage = errorBody.message;
        } else if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch {
        errorMessage = `${errorMessage} - ${responseText.slice(0, 240)}`;
      }
    }

    throw new ApiRequestError(errorMessage, response.status);
  }
};

const mapInternationalInputToApi = (payload: InternationalOpportunityInput) => {
  const applicationDeadline = toApiDateIfValid(payload.prazoInscricao);
  const contact = toOptionalSingleLine(payload.contato);

  return {
    name: payload.nome,
    image: normalizeOutboundImage(payload.imagem),
    country: payload.pais,
    city: payload.cidade,
    responsibleInstitution: payload.instituicaoResponsavel,
    type: payload.tipo,
    description: payload.descricao,
    educationLevel: payload.nivelEnsino,
    ageRange: payload.faixaEtaria,
    languageRequirements: payload.requisitosIdioma,
    specificRequirements: payload.requisitosEspecificos,
    applicationFee: payload.taxaAplicacao,
    scholarshipType: payload.tipoBolsa,
    scholarshipCoverage: payload.coberturaBolsa,
    extraCosts: payload.custosExtras,
    duration: payload.duracao,
    ...(applicationDeadline ? { applicationDeadline } : {}),
    selectionSteps: payload.etapasSelecao,
    applicationProcess: payload.processoInscricao,
    officialLink: payload.linkOficial,
    ...(contact ? { contact } : {}),
  };
};

const mapNationalInputToApi = (payload: NationalOpportunityInput) => {
  const about = payload.sobre.trim();
  const shortDescriptionSource = about || payload.requisitos || payload.nome;
  const applicationDeadline = toApiDateIfValid(payload.prazoInscricao);
  const contact = toOptionalSingleLine(payload.contato);

  return {
    name: payload.nome,
    image: normalizeOutboundImage(payload.imagem),
    country: payload.pais,
    type: payload.tipo,
    educationLevel: payload.nivelEnsino,
    modality: payload.modalidade,
    ...(applicationDeadline ? { applicationDeadline } : {}),
    about,
    shortDescription: toShortDescription(shortDescriptionSource),
    duration: payload.duracao,
    cityState: payload.cidadeEstado,
    ageRange: payload.faixaEtaria,
    requirements: payload.requisitos,
    specificRequirements: payload.requisitosEspecificos.join("; "),
    responsibleInstitution: payload.instituicaoResponsavel,
    applicationFee: payload.taxaAplicacao,
    benefits: payload.beneficios,
    costs: payload.custos,
    extraCosts: payload.custosExtras,
    selectionSteps: payload.etapasSelecao,
    officialLink: payload.linkOficial,
    ...(contact ? { contact } : {}),
  };
};

export const getInternationalOpportunities = async (): Promise<
  InternationalOpportunity[]
> => {
  if (STRUCTURED_OPPORTUNITIES_ENABLED) {
    const structured = await fetchStructuredOpportunities("international");
    return structured.map(mapStructuredInternationalOpportunity);
  }
  const [data, actionability] = await Promise.all([
    fetchFromApi<{ opportunities: OpportunityRecord[] }>("/api/opportunities"),
    fetchStructuredActionabilityIndex("international"),
  ]);
  return (data.opportunities ?? []).map((item) =>
    mapInternationalOpportunity(
      item,
      actionability.get(String(item.id)) ?? null
    )
  );
};

export const getInternationalOpportunityById = async (
  id: string
): Promise<InternationalOpportunity | null> => {
  const verifiedOpportunity = getVerifiedInternationalOpportunityById(id);
  if (verifiedOpportunity) {
    return verifiedOpportunity;
  }

  if (STRUCTURED_OPPORTUNITIES_ENABLED) {
    try {
      const structured = await fetchFromApi<{
        data: StructuredOpportunityRecord;
      }>(`/api/v1/opportunities/${id}`);
      return structured.data.collection === "international"
        ? mapStructuredInternationalOpportunity(structured.data)
        : null;
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }
  const [data, actionability] = await Promise.all([
    fetchFromApi<{ opportunity: OpportunityRecord | null }>(
      `/api/opportunities/${id}`
    ),
    fetchStructuredActionabilityById(id),
  ]);
  if (!data.opportunity) {
    return null;
  }

  return mapInternationalOpportunity(
    data.opportunity,
    actionability?.collection === "international" ? actionability : null
  );
};

export const getNationalOpportunities = async (): Promise<
  NationalOpportunity[]
> => {
  if (STRUCTURED_OPPORTUNITIES_ENABLED) {
    const structured = await fetchStructuredOpportunities("national");
    return structured.map(mapStructuredNationalOpportunity);
  }
  const [data, actionability] = await Promise.all([
    fetchFromApi<{
      nationalOpportunities: NationalOpportunityRecord[];
    }>("/api/national-opportunities"),
    fetchStructuredActionabilityIndex("national"),
  ]);

  return (data.nationalOpportunities ?? []).map((item) =>
    mapNationalOpportunity(item, actionability.get(String(item.id)) ?? null)
  );
};

export const getNationalOpportunityById = async (
  id: string
): Promise<NationalOpportunity | null> => {
  const verifiedOpportunity = getVerifiedNationalOpportunityById(id);
  if (verifiedOpportunity) {
    return verifiedOpportunity;
  }

  if (STRUCTURED_OPPORTUNITIES_ENABLED) {
    try {
      const structured = await fetchFromApi<{
        data: StructuredOpportunityRecord;
      }>(`/api/v1/opportunities/${id}`);
      return structured.data.collection === "national"
        ? mapStructuredNationalOpportunity(structured.data)
        : null;
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }
  const [data, actionability] = await Promise.all([
    fetchFromApi<{
      nationalOpportunity: NationalOpportunityRecord | null;
    }>(`/api/national-opportunities/${id}`),
    fetchStructuredActionabilityById(id),
  ]);

  if (!data.nationalOpportunity) {
    return null;
  }

  return mapNationalOpportunity(
    data.nationalOpportunity,
    actionability?.collection === "national" ? actionability : null
  );
};

export const createInternationalOpportunity = async (
  payload: InternationalOpportunityInput
): Promise<void> => {
  await sendToApi(
    "/api/opportunities",
    "POST",
    mapInternationalInputToApi(payload)
  );
};

export const updateInternationalOpportunity = async (
  id: string,
  payload: InternationalOpportunityInput
): Promise<void> => {
  await sendToApi(
    `/api/opportunities/${id}`,
    "PUT",
    mapInternationalInputToApi(payload)
  );
};

export const deleteInternationalOpportunity = async (
  id: string
): Promise<void> => {
  await sendToApi(`/api/opportunities/${id}`, "DELETE");
};

export const createNationalOpportunity = async (
  payload: NationalOpportunityInput
): Promise<void> => {
  await sendToApi(
    "/api/national-opportunities",
    "POST",
    mapNationalInputToApi(payload)
  );
};

export const updateNationalOpportunity = async (
  id: string,
  payload: NationalOpportunityInput
): Promise<void> => {
  await sendToApi(
    `/api/national-opportunities/${id}`,
    "PUT",
    mapNationalInputToApi(payload)
  );
};

export const deleteNationalOpportunity = async (id: string): Promise<void> => {
  await sendToApi(`/api/national-opportunities/${id}`, "DELETE");
};

export const getInternationalFavorites = async (): Promise<
  InternationalOpportunity[]
> => {
  const data = await fetchFromApi<{ opportunities: OpportunityRecord[] }>(
    "/api/opportunities/favorites"
  );
  return (data.opportunities ?? []).map((item) =>
    mapInternationalOpportunity(item)
  );
};

export const addInternationalFavorite = async (id: string): Promise<void> => {
  await sendToApi(`/api/opportunities/${id}/favorite`, "POST");
};

export const removeInternationalFavorite = async (
  id: string
): Promise<void> => {
  await sendToApi(`/api/opportunities/${id}/favorite`, "DELETE");
};

export const getNationalFavorites = async (): Promise<
  NationalOpportunity[]
> => {
  const data = await fetchFromApi<{
    nationalOpportunities: NationalOpportunityRecord[];
  }>("/api/national-opportunities/favorites");

  return (data.nationalOpportunities ?? []).map((item) =>
    mapNationalOpportunity(item)
  );
};

export const addNationalFavorite = async (id: string): Promise<void> => {
  await sendToApi(`/api/national-opportunities/${id}/favorite`, "POST");
};

export const removeNationalFavorite = async (id: string): Promise<void> => {
  await sendToApi(`/api/national-opportunities/${id}/favorite`, "DELETE");
};
