interface OpportunityRecord {
  ageRange: string;
  applicationDeadline: string | Date;
  applicationFee: string;
  applicationProcess: string;
  city: string;
  contact: string;
  country: string;
  createdAt?: string | Date;
  description: string;
  duration: string;
  educationLevel: string;
  extraCosts: string;
  id: string;
  image: string;
  languageRequirements: string;
  name: string;
  officialLink: string;
  responsibleInstitution: string;
  scholarshipCoverage: string;
  scholarshipType: string;
  selectionSteps: string;
  specificRequirements: string;
  type: string;
  updatedAt?: string | Date;
}

interface NationalOpportunityRecord {
  about: string;
  ageRange: string;
  applicationDeadline: string | Date;
  applicationFee: string;
  benefits: string;
  cityState: string;
  contact: string;
  costs: string;
  country: string;
  createdAt?: string | Date;
  duration: string;
  educationLevel: string;
  extraCosts: string;
  id: string;
  image: string;
  modality: string;
  name: string;
  officialLink: string;
  requirements: string;
  responsibleInstitution: string;
  selectionSteps: string;
  shortDescription: string;
  specificRequirements: string;
  type: string;
  updatedAt?: string | Date;
}

export interface InternationalOpportunity {
  cidade: string;
  coberturaBolsa: string;
  contato: string;
  custosExtras: string;
  descricao: string;
  duracao: string;
  etapasSelecao: string;
  faixaEtaria: string;
  id: string;
  imagem: string;
  instituicaoResponsavel: string;
  linkOficial: string;
  nivelEnsino: string;
  nome: string;
  pais: string;
  prazoInscricao: string;
  processoInscricao: string;
  requisitosEspecificos: string;
  requisitosIdioma: string;
  taxaAplicacao: string;
  tipo: string;
  tipoBolsa: string;
}

export interface NationalOpportunity {
  beneficios: string;
  cidadeEstado: string;
  contato: string;
  custos: string;
  custosExtras: string;
  duracao: string;
  etapasSelecao: string;
  faixaEtaria: string;
  id: string;
  imagem: string;
  instituicaoResponsavel: string;
  linkOficial: string;
  modalidade: "Online" | "Presencial" | "Híbrido";
  nivelEnsino: string;
  nome: string;
  pais: string;
  prazoInscricao: string;
  requisitos: string;
  requisitosEspecificos: string[];
  sobre: string;
  taxaAplicacao: string;
  tipo: string;
}

export type InternationalOpportunityInput = Omit<
  InternationalOpportunity,
  "id"
>;
export type NationalOpportunityInput = Omit<NationalOpportunity, "id">;

const SPECIFIC_REQUIREMENTS_SPLIT_REGEX = /\r?\n|;|\|/;
const BR_DATE_IN_TEXT_REGEX = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/;
const MULTISPACE_REGEX = /\s+/g;
const SHORT_DESCRIPTION_MAX_LENGTH = 220;
const DEFAULT_OPPORTUNITY_IMAGE_URL =
  "https://dummyimage.com/1200x630/0f172a/f8fafc&text=Oportunidade";

class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

const toDateString = (value: string | Date): string => {
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
): "Online" | "Presencial" | "Híbrido" => {
  if (!modality) {
    return "Presencial";
  }

  const modalityLower = modality
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const includesHybridTerm =
    modalityLower.includes("hibrido") || modalityLower.includes("misto");
  const includesOnlineTerm =
    modalityLower.includes("online") ||
    modalityLower.includes("remoto") ||
    modalityLower.includes("ead");
  const includesPresentialTerm =
    modalityLower.includes("presencial") || modalityLower.includes("presenca");

  if (includesHybridTerm || (includesOnlineTerm && includesPresentialTerm)) {
    return "Híbrido";
  }
  if (includesOnlineTerm) {
    return "Online";
  }
  if (includesPresentialTerm) {
    return "Presencial";
  }

  return "Presencial";
};

const mapInternationalOpportunity = (
  item: OpportunityRecord
): InternationalOpportunity => ({
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
  contato: item.contact,
});

const mapNationalOpportunity = (
  item: NationalOpportunityRecord
): NationalOpportunity => ({
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
  contato: item.contact ?? "",
});

const fetchFromApi = async <T>(path: string): Promise<T> => {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    let errorMessage = `Falha ao buscar ${path}: ${response.status}`;

    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody.message) {
        errorMessage = errorBody.message;
      }
    } catch {
      // Ignore invalid JSON response body.
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
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
  const data = await fetchFromApi<{ opportunities: OpportunityRecord[] }>(
    "/api/opportunities"
  );
  return (data.opportunities ?? []).map(mapInternationalOpportunity);
};

export const getInternationalOpportunityById = async (
  id: string
): Promise<InternationalOpportunity | null> => {
  const data = await fetchFromApi<{ opportunity: OpportunityRecord | null }>(
    `/api/opportunities/${id}`
  );
  if (!data.opportunity) {
    return null;
  }

  return mapInternationalOpportunity(data.opportunity);
};

export const getNationalOpportunities = async (): Promise<
  NationalOpportunity[]
> => {
  const data = await fetchFromApi<{
    nationalOpportunities: NationalOpportunityRecord[];
  }>("/api/national-opportunities");

  return (data.nationalOpportunities ?? []).map(mapNationalOpportunity);
};

export const getNationalOpportunityById = async (
  id: string
): Promise<NationalOpportunity | null> => {
  const data = await fetchFromApi<{
    nationalOpportunity: NationalOpportunityRecord | null;
  }>(`/api/national-opportunities/${id}`);

  if (!data.nationalOpportunity) {
    return null;
  }

  return mapNationalOpportunity(data.nationalOpportunity);
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
  return (data.opportunities ?? []).map(mapInternationalOpportunity);
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

  return (data.nationalOpportunities ?? []).map(mapNationalOpportunity);
};

export const addNationalFavorite = async (id: string): Promise<void> => {
  await sendToApi(`/api/national-opportunities/${id}/favorite`, "POST");
};

export const removeNationalFavorite = async (id: string): Promise<void> => {
  await sendToApi(`/api/national-opportunities/${id}/favorite`, "DELETE");
};
