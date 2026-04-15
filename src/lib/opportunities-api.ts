import { BACKEND_BASE_URL, buildBackendUrl } from "./backend";

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

interface RawInternationalOpportunity {
  about?: string;
  ageRange?: string;
  applicationDeadline?: string | number | Date;
  applicationFee?: string;
  applicationProcess?: string;
  benefits?: string;
  city?: string;
  cityState?: string;
  contact?: string;
  costs?: string;
  country?: string;
  description?: string;
  duration?: string;
  educationLevel?: string;
  extraCosts?: string;
  id?: string | number;
  image?: string;
  languageRequirements?: string;
  modality?: string;
  name?: string;
  officialLink?: string;
  requirements?: string;
  responsibleInstitution?: string;
  scholarshipCoverage?: string;
  scholarshipType?: string;
  selectionSteps?: string;
  shortDescription?: string;
  specificRequirements?: string;
  type?: string;
}

interface RawNationalOpportunity {
  about?: string;
  ageRange?: string;
  applicationDeadline?: string | number | Date;
  applicationFee?: string;
  benefits?: string;
  cityState?: string;
  contact?: string;
  costs?: string;
  country?: string;
  duration?: string;
  educationLevel?: string;
  extraCosts?: string;
  id?: string | number;
  image?: string;
  modality?: string;
  name?: string;
  officialLink?: string;
  requirements?: string;
  responsibleInstitution?: string;
  selectionSteps?: string;
  shortDescription?: string;
  specificRequirements?: string;
  type?: string;
}

interface InternationalOpportunitiesResponse {
  favorites?: RawInternationalOpportunity[];
  opportunities?: RawInternationalOpportunity[];
}

interface NationalOpportunitiesResponse {
  favorites?: RawNationalOpportunity[];
  nationalOpportunities?: RawNationalOpportunity[];
  opportunities?: RawNationalOpportunity[];
}

const API_BASE_URL_WITHOUT_TRAILING_SLASH = BACKEND_BASE_URL;

const INTERNATIONAL_OPPORTUNITIES_PATH = "/opportunities";
const NATIONAL_OPPORTUNITIES_PATH = "/national-opportunities";
const SPECIFIC_REQUIREMENTS_SPLIT_REGEX = /\r?\n|;|\|/;
const BR_DATE_IN_TEXT_REGEX = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/;
const MULTISPACE_REGEX = /\s+/g;
const SHORT_DESCRIPTION_MAX_LENGTH = 220;
const DEFAULT_OPPORTUNITY_IMAGE_URL =
  "https://dummyimage.com/1200x630/0f172a/f8fafc&text=Oportunidade";

const normalizeImageUrl = (value: string | undefined): string => {
  if (!value) {
    return "";
  }

  const image = value.trim();

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  if (image.startsWith("/")) {
    return `${API_BASE_URL_WITHOUT_TRAILING_SLASH}${image}`;
  }

  return `${API_BASE_URL_WITHOUT_TRAILING_SLASH}/${image}`;
};

const toDateString = (value: string | number | Date | undefined): string => {
  if (value === undefined || value === null) {
    return "";
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

const splitSpecificRequirements = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(SPECIFIC_REQUIREMENTS_SPLIT_REGEX)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const isBrazilCountry = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }

  const normalizedCountry = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return normalizedCountry === "brasil" || normalizedCountry === "brazil";
};

const normalizeOutboundImage = (value: string): string => {
  const trimmedValue = value.trim();

  if (trimmedValue) {
    return trimmedValue;
  }

  return DEFAULT_OPPORTUNITY_IMAGE_URL;
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

const mapInternationalOpportunity = (
  item: RawInternationalOpportunity
): InternationalOpportunity => ({
  id: String(item.id ?? ""),
  nome: item.name ?? "",
  imagem: normalizeImageUrl(item.image),
  pais: item.country ?? "",
  cidade: item.city ?? "",
  instituicaoResponsavel: item.responsibleInstitution ?? "",
  tipo: item.type ?? "",
  descricao: item.description ?? "",
  nivelEnsino: item.educationLevel ?? "",
  faixaEtaria: item.ageRange ?? "",
  requisitosIdioma: item.languageRequirements ?? "",
  requisitosEspecificos: item.specificRequirements ?? "",
  taxaAplicacao: item.applicationFee ?? "",
  tipoBolsa: item.scholarshipType ?? "",
  coberturaBolsa: item.scholarshipCoverage ?? "",
  custosExtras: item.extraCosts ?? "",
  duracao: item.duration ?? "",
  prazoInscricao: toDateString(item.applicationDeadline),
  etapasSelecao: item.selectionSteps ?? "",
  processoInscricao: item.applicationProcess ?? "",
  linkOficial: item.officialLink ?? "",
  contato: item.contact ?? "",
});

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

const mapNationalOpportunity = (
  item: RawNationalOpportunity
): NationalOpportunity => ({
  id: String(item.id ?? ""),
  nome: item.name ?? "",
  imagem: normalizeImageUrl(item.image),
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

const mapInternationalAsNationalOpportunity = (
  item: RawInternationalOpportunity
): NationalOpportunity => ({
  id: String(item.id ?? ""),
  nome: item.name ?? "",
  imagem: normalizeImageUrl(item.image),
  pais: item.country ?? "Brasil",
  tipo: item.type ?? "",
  nivelEnsino: item.educationLevel ?? "",
  modalidade: normalizeModality(
    [
      item.modality,
      item.description,
      item.about,
      item.selectionSteps,
      item.applicationProcess,
      item.cityState,
      item.city,
    ]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(" ")
  ),
  prazoInscricao: toDateString(item.applicationDeadline),
  sobre: item.about ?? item.description ?? "",
  duracao: item.duration ?? "",
  cidadeEstado: item.cityState ?? item.city ?? "",
  faixaEtaria: item.ageRange ?? "",
  requisitos: item.requirements ?? item.languageRequirements ?? "",
  requisitosEspecificos: splitSpecificRequirements(item.specificRequirements),
  instituicaoResponsavel: item.responsibleInstitution ?? "",
  taxaAplicacao: item.applicationFee ?? "",
  beneficios: item.benefits ?? item.scholarshipType ?? "",
  custos: item.costs ?? item.scholarshipCoverage ?? "",
  custosExtras: item.extraCosts ?? "",
  etapasSelecao: item.selectionSteps ?? item.applicationProcess ?? "",
  linkOficial: item.officialLink ?? "",
  contato: item.contact ?? "",
});

const getInternationalResponseItems = (
  data: InternationalOpportunitiesResponse
): RawInternationalOpportunity[] => {
  return data.opportunities ?? data.favorites ?? [];
};

const getNationalResponseItems = (
  data: NationalOpportunitiesResponse
): RawNationalOpportunity[] => {
  return (
    data.nationalOpportunities ?? data.opportunities ?? data.favorites ?? []
  );
};

const isLikelyNationalFavorite = (
  item: RawInternationalOpportunity
): boolean => {
  const hasCountry = Boolean(item.country?.trim());
  const hasNationalShapeSignals = Boolean(
    item.cityState?.trim() ||
      item.modality?.trim() ||
      item.requirements?.trim() ||
      item.about?.trim()
  );

  return (
    isBrazilCountry(item.country) || hasNationalShapeSignals || !hasCountry
  );
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

const mapNationalInputToOpportunitiesFallbackApi = (
  payload: NationalOpportunityInput
) => {
  const applicationDeadline = toApiDateIfValid(payload.prazoInscricao);
  const description = payload.sobre.trim() || payload.nome.trim();
  const contact = toOptionalSingleLine(payload.contato);

  return {
    name: payload.nome,
    image: normalizeOutboundImage(payload.imagem),
    country: payload.pais,
    city: payload.cidadeEstado,
    responsibleInstitution: payload.instituicaoResponsavel,
    type: payload.tipo,
    description,
    educationLevel: payload.nivelEnsino,
    ageRange: payload.faixaEtaria,
    languageRequirements: payload.requisitos,
    specificRequirements: payload.requisitosEspecificos.join("; "),
    applicationFee: payload.taxaAplicacao,
    scholarshipType: payload.beneficios,
    scholarshipCoverage: payload.custos,
    extraCosts: payload.custosExtras,
    duration: payload.duracao,
    ...(applicationDeadline ? { applicationDeadline } : {}),
    selectionSteps: payload.etapasSelecao,
    applicationProcess: payload.etapasSelecao,
    officialLink: payload.linkOficial,
    ...(contact ? { contact } : {}),
    modality: payload.modalidade,
  };
};

class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

const UPDATE_METHODS = ["PUT"] as const;

const isMethodFallbackStatus = (status: number): boolean => {
  return status === 404 || status === 405 || status === 501;
};

const isMutationAttemptFallbackStatus = (status: number): boolean => {
  return isMethodFallbackStatus(status) || status === 500;
};

const fetchFromApi = async <T>(path: string): Promise<T> => {
  const response = await fetch(buildBackendUrl(path), {
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
      // Keep default message when backend error body is not JSON.
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
};

const sendToApi = async (
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown
): Promise<void> => {
  const hasBody = body !== undefined;
  const requestInit: RequestInit = {
    method,
    credentials: "include",
  };

  if (hasBody) {
    requestInit.headers = {
      "Content-Type": "application/json",
    };
    requestInit.body = JSON.stringify(body);
  }

  const response = await fetch(buildBackendUrl(path), requestInit);

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
        } else {
          errorMessage = `${errorMessage} - ${responseText.slice(0, 240)}`;
        }
      } catch {
        errorMessage = `${errorMessage} - ${responseText.slice(0, 240)}`;
      }
    }

    throw new ApiRequestError(errorMessage, response.status);
  }
};

const sendToApiWith404Fallback = async (
  primaryPath: string,
  fallbackPath: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown
): Promise<void> => {
  try {
    await sendToApi(primaryPath, method, body);
  } catch (error) {
    if (
      error instanceof ApiRequestError &&
      error.status === 404 &&
      primaryPath !== fallbackPath
    ) {
      await sendToApi(fallbackPath, method, body);
      return;
    }

    throw error;
  }
};

const sendToApiWithMethodFallback = async (
  path: string,
  methods: ReadonlyArray<"PUT" | "PATCH">,
  body?: unknown
): Promise<void> => {
  let lastError: unknown;

  for (const method of methods) {
    try {
      await sendToApi(path, method, body);
      return;
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        isMethodFallbackStatus(error.status)
      ) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`Falha ao atualizar recurso em ${path}.`);
};

interface ApiMutationAttempt {
  body?: unknown;
  method: "POST" | "PUT" | "DELETE";
  path: string;
}

const sendToApiWithAttempts = async (
  attempts: readonly ApiMutationAttempt[],
  context: string
): Promise<void> => {
  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      await sendToApi(attempt.path, attempt.method, attempt.body);
      return;
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        isMutationAttemptFallbackStatus(error.status)
      ) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`Falha ao executar ${context}.`);
};

export const getInternationalOpportunities = async (): Promise<
  InternationalOpportunity[]
> => {
  const data = await fetchFromApi<InternationalOpportunitiesResponse>(
    INTERNATIONAL_OPPORTUNITIES_PATH
  );

  return (data.opportunities ?? [])
    .filter((item) => !isBrazilCountry(item.country))
    .map(mapInternationalOpportunity);
};

export const getInternationalOpportunityById = async (
  id: string
): Promise<InternationalOpportunity | null> => {
  const opportunities = await getInternationalOpportunities();

  return opportunities.find((item) => item.id === id) ?? null;
};

export const getNationalOpportunities = async (): Promise<
  NationalOpportunity[]
> => {
  const data = await fetchFromApi<NationalOpportunitiesResponse>(
    NATIONAL_OPPORTUNITIES_PATH
  );

  const nationalOpportunities = (data.nationalOpportunities ?? []).map(
    mapNationalOpportunity
  );

  if (nationalOpportunities.length > 0) {
    return nationalOpportunities;
  }

  const fallbackData = await fetchFromApi<InternationalOpportunitiesResponse>(
    INTERNATIONAL_OPPORTUNITIES_PATH
  );

  return (fallbackData.opportunities ?? [])
    .filter((item) => isBrazilCountry(item.country))
    .map(mapInternationalAsNationalOpportunity);
};

export const getNationalOpportunityById = async (
  id: string
): Promise<NationalOpportunity | null> => {
  const opportunities = await getNationalOpportunities();

  return opportunities.find((item) => item.id === id) ?? null;
};

const hasNationalRecordInNationalCollection = async (
  id: string
): Promise<boolean> => {
  try {
    const data = await fetchFromApi<NationalOpportunitiesResponse>(
      NATIONAL_OPPORTUNITIES_PATH
    );

    return getNationalResponseItems(data).some((item) => {
      return String(item.id ?? "") === id;
    });
  } catch {
    return false;
  }
};

const updateNationalRecordInInternationalCollection = async (
  id: string,
  payload: NationalOpportunityInput
): Promise<void> => {
  const fallbackBody = mapNationalInputToOpportunitiesFallbackApi(payload);
  const updateInternationalPath = `${INTERNATIONAL_OPPORTUNITIES_PATH}/${id}`;

  try {
    await sendToApiWithMethodFallback(
      updateInternationalPath,
      UPDATE_METHODS,
      fallbackBody
    );
    return;
  } catch (fallbackError) {
    if (
      fallbackError instanceof ApiRequestError &&
      fallbackError.status === 500 &&
      fallbackBody.modality === "Híbrido"
    ) {
      await sendToApiWithMethodFallback(
        updateInternationalPath,
        UPDATE_METHODS,
        {
          ...fallbackBody,
          modality: "Hibrido",
        }
      );
      return;
    }

    throw fallbackError;
  }
};

export const createInternationalOpportunity = async (
  payload: InternationalOpportunityInput
): Promise<void> => {
  await sendToApi(
    INTERNATIONAL_OPPORTUNITIES_PATH,
    "POST",
    mapInternationalInputToApi(payload)
  );
};

export const updateInternationalOpportunity = async (
  id: string,
  payload: InternationalOpportunityInput
): Promise<void> => {
  await sendToApiWithMethodFallback(
    `${INTERNATIONAL_OPPORTUNITIES_PATH}/${id}`,
    UPDATE_METHODS,
    mapInternationalInputToApi(payload)
  );
};

export const deleteInternationalOpportunity = async (
  id: string
): Promise<void> => {
  await sendToApi(`${INTERNATIONAL_OPPORTUNITIES_PATH}/${id}`, "DELETE");
};

export const createNationalOpportunity = async (
  payload: NationalOpportunityInput
): Promise<void> => {
  const nationalRequestBody = mapNationalInputToApi(payload);

  try {
    await sendToApi(NATIONAL_OPPORTUNITIES_PATH, "POST", nationalRequestBody);
    return;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      const fallbackBody = mapNationalInputToOpportunitiesFallbackApi(payload);

      try {
        await sendToApi(INTERNATIONAL_OPPORTUNITIES_PATH, "POST", fallbackBody);
        return;
      } catch (fallbackError) {
        if (
          fallbackError instanceof ApiRequestError &&
          fallbackError.status === 500 &&
          fallbackBody.modality === "Híbrido"
        ) {
          await sendToApi(INTERNATIONAL_OPPORTUNITIES_PATH, "POST", {
            ...fallbackBody,
            modality: "Hibrido",
          });
          return;
        }

        throw fallbackError;
      }
    }

    if (
      error instanceof ApiRequestError &&
      error.status === 500 &&
      nationalRequestBody.modality === "Híbrido"
    ) {
      await sendToApi(NATIONAL_OPPORTUNITIES_PATH, "POST", {
        ...nationalRequestBody,
        modality: "Hibrido",
      });
      return;
    }

    throw error;
  }
};

export const updateNationalOpportunity = async (
  id: string,
  payload: NationalOpportunityInput
): Promise<void> => {
  const requestBody = mapNationalInputToApi(payload);
  const updateNationalPath = `${NATIONAL_OPPORTUNITIES_PATH}/${id}`;
  const existsInNationalCollection =
    await hasNationalRecordInNationalCollection(id);

  if (!existsInNationalCollection) {
    await updateNationalRecordInInternationalCollection(id, payload);
    return;
  }

  try {
    await sendToApiWithMethodFallback(
      updateNationalPath,
      UPDATE_METHODS,
      requestBody
    );
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      await updateNationalRecordInInternationalCollection(id, payload);
      return;
    }

    if (
      error instanceof ApiRequestError &&
      error.status === 500 &&
      requestBody.modality === "Híbrido"
    ) {
      await sendToApiWithMethodFallback(updateNationalPath, UPDATE_METHODS, {
        ...requestBody,
        modality: "Hibrido",
      });
      return;
    }

    throw error;
  }
};

export const deleteNationalOpportunity = async (id: string): Promise<void> => {
  await sendToApiWith404Fallback(
    `${NATIONAL_OPPORTUNITIES_PATH}/${id}`,
    `${INTERNATIONAL_OPPORTUNITIES_PATH}/${id}`,
    "DELETE"
  );
};

export const getInternationalFavorites = async (): Promise<
  InternationalOpportunity[]
> => {
  const data = await fetchFromApi<InternationalOpportunitiesResponse>(
    `${INTERNATIONAL_OPPORTUNITIES_PATH}/favorites`
  );

  return getInternationalResponseItems(data).map(mapInternationalOpportunity);
};

export const addInternationalFavorite = async (id: string): Promise<void> => {
  await sendToApiWithAttempts(
    [
      {
        path: `${INTERNATIONAL_OPPORTUNITIES_PATH}/${id}/favorite`,
        method: "POST",
      },
      {
        path: `${INTERNATIONAL_OPPORTUNITIES_PATH}/favorites`,
        method: "PUT",
        body: { opportunityId: id },
      },
      {
        path: `${INTERNATIONAL_OPPORTUNITIES_PATH}/favorites`,
        method: "PUT",
        body: { id },
      },
    ],
    "adicao de favorito internacional"
  );
};

export const removeInternationalFavorite = async (
  id: string
): Promise<void> => {
  await sendToApiWithAttempts(
    [
      {
        path: `${INTERNATIONAL_OPPORTUNITIES_PATH}/${id}/favorite`,
        method: "DELETE",
      },
      {
        path: `${INTERNATIONAL_OPPORTUNITIES_PATH}/favorites`,
        method: "DELETE",
        body: { opportunityId: id },
      },
      {
        path: `${INTERNATIONAL_OPPORTUNITIES_PATH}/favorites`,
        method: "DELETE",
        body: { id },
      },
    ],
    "remocao de favorito internacional"
  );
};

export const getNationalFavorites = async (): Promise<
  NationalOpportunity[]
> => {
  try {
    const data = await fetchFromApi<NationalOpportunitiesResponse>(
      `${NATIONAL_OPPORTUNITIES_PATH}/favorites`
    );

    const nationalFavorites = getNationalResponseItems(data);

    if (nationalFavorites.length > 0) {
      return nationalFavorites.map(mapNationalOpportunity);
    }
  } catch {
    // Fallback below handles environments where the national favorites route is unavailable.
  }

  const fallbackData = await fetchFromApi<InternationalOpportunitiesResponse>(
    `${INTERNATIONAL_OPPORTUNITIES_PATH}/favorites`
  );

  return getInternationalResponseItems(fallbackData)
    .filter((item) => isLikelyNationalFavorite(item))
    .map(mapInternationalAsNationalOpportunity);
};

const isNationalFavoritePersisted = async (id: string): Promise<boolean> => {
  try {
    const nationalData = await fetchFromApi<NationalOpportunitiesResponse>(
      `${NATIONAL_OPPORTUNITIES_PATH}/favorites`
    );

    const nationalItems = getNationalResponseItems(nationalData);
    if (
      nationalItems.some((item) => {
        return String(item.id ?? "") === id;
      })
    ) {
      return true;
    }
  } catch {
    // Continue with cross-route verification.
  }

  try {
    const fallbackData = await fetchFromApi<InternationalOpportunitiesResponse>(
      `${INTERNATIONAL_OPPORTUNITIES_PATH}/favorites`
    );

    return getInternationalResponseItems(fallbackData).some((item) => {
      return String(item.id ?? "") === id && isLikelyNationalFavorite(item);
    });
  } catch {
    return false;
  }
};

export const addNationalFavorite = async (id: string): Promise<void> => {
  const attempts: readonly ApiMutationAttempt[] = [
    {
      path: `${NATIONAL_OPPORTUNITIES_PATH}/${id}/favorite`,
      method: "POST",
    },
    {
      path: `${NATIONAL_OPPORTUNITIES_PATH}/favorites`,
      method: "PUT",
      body: { opportunityId: id },
    },
    {
      path: `${NATIONAL_OPPORTUNITIES_PATH}/favorites`,
      method: "PUT",
      body: { id },
    },
    {
      path: `${NATIONAL_OPPORTUNITIES_PATH}/favorites`,
      method: "POST",
      body: { opportunityId: id },
    },
    {
      path: `${NATIONAL_OPPORTUNITIES_PATH}/favorites`,
      method: "POST",
      body: { id },
    },
    {
      path: `${INTERNATIONAL_OPPORTUNITIES_PATH}/${id}/favorite`,
      method: "POST",
    },
    {
      path: `${INTERNATIONAL_OPPORTUNITIES_PATH}/favorites`,
      method: "PUT",
      body: { opportunityId: id },
    },
    {
      path: `${INTERNATIONAL_OPPORTUNITIES_PATH}/favorites`,
      method: "PUT",
      body: { id },
    },
    {
      path: `${INTERNATIONAL_OPPORTUNITIES_PATH}/favorites`,
      method: "POST",
      body: { opportunityId: id },
    },
    {
      path: `${INTERNATIONAL_OPPORTUNITIES_PATH}/favorites`,
      method: "POST",
      body: { id },
    },
  ];

  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      await sendToApi(attempt.path, attempt.method, attempt.body);

      if (await isNationalFavoritePersisted(id)) {
        return;
      }

      lastError = new Error(
        `Tentativa sem persistencia confirmada: ${attempt.method} ${attempt.path}`
      );
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        isMutationAttemptFallbackStatus(error.status)
      ) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("Falha ao confirmar adicao de favorito nacional.");
};

export const removeNationalFavorite = async (id: string): Promise<void> => {
  await sendToApiWithAttempts(
    [
      {
        path: `${NATIONAL_OPPORTUNITIES_PATH}/${id}/favorite`,
        method: "DELETE",
      },
      {
        path: `${NATIONAL_OPPORTUNITIES_PATH}/favorites`,
        method: "DELETE",
        body: { opportunityId: id },
      },
      {
        path: `${NATIONAL_OPPORTUNITIES_PATH}/favorites`,
        method: "DELETE",
        body: { id },
      },
      {
        path: `${INTERNATIONAL_OPPORTUNITIES_PATH}/${id}/favorite`,
        method: "DELETE",
      },
      {
        path: `${INTERNATIONAL_OPPORTUNITIES_PATH}/favorites`,
        method: "DELETE",
        body: { opportunityId: id },
      },
      {
        path: `${INTERNATIONAL_OPPORTUNITIES_PATH}/favorites`,
        method: "DELETE",
        body: { id },
      },
    ],
    "remocao de favorito nacional"
  );
};
