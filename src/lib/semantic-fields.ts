import type {
  PublicSemanticField,
  SemanticFieldResolution,
} from "@/contracts/opportunity-v1";

const FIELD_LABELS: Record<string, string> = {
  accommodation_coverage: "Cobertura de hospedagem",
  age: "Idade",
  application_deadline: "Prazo de inscrição",
  application_fee: "Taxa de inscrição",
  application_opening: "Abertura das inscrições",
  application_round: "Rodada de inscrição",
  application_url: "Link de inscrição",
  benefits: "Benefícios",
  birthdate: "Data de nascimento",
  brazilian_eligibility: "Elegibilidade de brasileiros",
  citizenship: "Nacionalidade",
  city: "Cidade",
  country: "País",
  current_edition: "Edição atual",
  deadline_type: "Tipo de prazo",
  description: "Descrição",
  duration: "Duração",
  education_level: "Nível de ensino",
  full_funding: "Financiamento integral",
  grade: "Série ou ano escolar",
  image: "Imagem",
  institution_restriction: "Restrição institucional",
  is_free: "Custo",
  language: "Idioma",
  lifecycle_status: "Situação",
  mandatory_additional_costs: "Custos adicionais obrigatórios",
  meals: "Cobertura de alimentação",
  modality: "Modalidade",
  nomination_requirement: "Indicação institucional",
  official_information_url: "Página oficial",
  organizer: "Organizador",
  partial_funding: "Financiamento parcial",
  participation_format: "Forma de participação",
  passport_requirement: "Exigência de passaporte",
  prior_experience: "Experiência prévia",
  program_cost: "Custo do programa",
  program_end: "Término do programa",
  program_start: "Início do programa",
  required_documents: "Documentos exigidos",
  residence: "Residência",
  results_date: "Data do resultado",
  scholarship: "Bolsa",
  school_location: "Localização da escola",
  source_authority: "Autoridade da fonte",
  state: "Estado",
  stipend: "Auxílio financeiro",
  team_size: "Tamanho da equipe",
  title: "Título",
  travel_coverage: "Cobertura de viagem",
  travel_requirement: "Necessidade de viagem",
  visa_requirement: "Exigência de visto",
};

const NOT_STATED_TEXT: Record<string, string> = {
  age: "Idade não especificada pelo organizador",
  application_deadline: "Prazo não informado pelo organizador",
  application_fee: "Taxa de inscrição não informada pelo organizador",
  brazilian_eligibility:
    "Elegibilidade de brasileiros não especificada pelo organizador",
  citizenship: "Nacionalidade não especificada pelo organizador",
  city: "Cidade não divulgada pelo organizador",
  country: "País não divulgado pelo organizador",
  location: "Local não divulgado pelo organizador",
  modality: "Modalidade não especificada pelo organizador",
  organizer: "Organizador não identificado nas fontes oficiais",
  program_cost: "Custo não divulgado pelo organizador",
  residence: "Residência não especificada pelo organizador",
  results_date: "Data do resultado não publicada pelo organizador",
};

const PENDING_TEXT: Record<string, string> = {
  age: "Regra de idade em verificação",
  application_deadline: "Prazo em verificação",
  application_fee: "Taxa de inscrição em verificação",
  application_url: "Link de inscrição em verificação",
  brazilian_eligibility: "Elegibilidade de brasileiros em verificação",
  citizenship: "Elegibilidade nacional em verificação",
  city: "Cidade em verificação",
  country: "País em verificação",
  modality: "Modalidade em verificação",
  program_cost: "Informações de custo em verificação",
  residence: "Regra de residência em verificação",
};

const CONFLICT_TEXT: Record<string, string> = {
  age: "Há informações conflitantes sobre a idade",
  application_deadline: "Há informações conflitantes sobre o prazo",
  application_fee: "Há informações conflitantes sobre a taxa de inscrição",
  brazilian_eligibility:
    "Há informações conflitantes sobre a elegibilidade de brasileiros",
  modality: "Há informações conflitantes sobre a modalidade",
  program_cost: "Há informações conflitantes sobre o custo",
};

const UNRESTRICTED_TEXT: Record<string, string> = {
  age: "Sem limite de idade",
  application_fee: "Sem taxa de inscrição",
  citizenship: "Aberto a todas as nacionalidades",
  prior_experience: "Não exige experiência prévia",
  residence: "Sem restrição de residência",
};

const NOT_APPLICABLE_TEXT: Record<string, string> = {
  city: "Não se aplica — oportunidade online",
  state: "Não se aplica — oportunidade online",
  travel_coverage: "Não se aplica — não há viagem",
  travel_requirement: "Não se aplica — oportunidade online",
  visa_requirement: "Não se aplica — oportunidade sem viagem internacional",
  passport_requirement: "Não se aplica — oportunidade sem viagem internacional",
};

const MODALITY_TEXT: Record<string, string> = {
  hybrid: "Híbrido",
  in_person: "Presencial",
  online: "Online",
};

const DEADLINE_TYPE_TEXT: Record<string, string> = {
  fixed: "Prazo com data definida",
  not_announced: "Prazo ainda não anunciado",
  rolling: "Inscrições contínuas",
  until_filled: "Até o preenchimento das vagas",
};

const BRAZIL_ELIGIBILITY_TEXT: Record<string, string> = {
  eligible: "Aberto a brasileiros",
  ineligible: "Brasileiros não são elegíveis",
  likely_eligible:
    "Brasileiros provavelmente são elegíveis; confirme os critérios",
};

const VALUE_LABELS: Record<string, Record<string, string>> = {
  application_round: {
    main: "Rodada principal",
  },
  citizenship: {
    all_nationalities: "Aberto a todas as nacionalidades",
    brazil_explicitly_accepted: "Aberto a cidadãos brasileiros",
    brazil_explicitly_excluded: "Cidadãos brasileiros não são elegíveis",
    international_unspecified: "Elegibilidade internacional em verificação",
    regional_inclusion: "Aberto à região indicada pelo organizador",
    restricted_nationalities: "Restrito às nacionalidades indicadas",
  },
  education_level: {
    elementary_middle: "Ensino Fundamental",
    gap_year: "Ano sabático",
    graduate: "Pós-graduação",
    high_school: "Ensino Médio",
    institution: "Instituição de ensino",
    international_secondary: "Ensino Médio internacional",
    recent_graduate: "Recém-formado",
    school_team: "Equipe escolar",
    teacher_educator: "Professor ou educador",
    technical_secondary: "Ensino Médio técnico",
    undergraduate: "Graduação",
    university_team: "Equipe universitária",
  },
  lifecycle_status: {
    announced: "Anunciada",
    applications_not_open: "Inscrições ainda não abertas",
    archived: "Arquivada",
    cancelled: "Cancelada",
    closed: "Inscrições encerradas",
    closing_soon: "Inscrições encerram em breve",
    completed: "Concluída",
    expected: "Prevista",
    extended: "Prazo prorrogado",
    open: "Inscrições abertas",
    unknown: "Situação em verificação",
  },
  residence: {
    brazil_accepted: "Aberto a residentes no Brasil",
    brazil_excluded: "Residentes no Brasil não são elegíveis",
    brazil_required: "Exige residência no Brasil",
    no_restriction: "Sem restrição de residência",
    restricted_regions: "Residência restrita às regiões indicadas",
  },
  source_authority: {
    official_application_portal: "Portal oficial de inscrição",
    official_institution: "Instituição oficial",
    official_program: "Programa oficial",
    reputable_aggregator: "Agregador reconhecido",
    verified_institutional_repost: "Republicação institucional verificada",
  },
};

const formatDate = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Centralized field-specific rendering prevents scattered generic placeholders and keeps every public fallback auditable.
const displayScalar = (fieldName: string, value: unknown): string => {
  if (
    fieldName === "current_edition" &&
    typeof value === "object" &&
    value !== null
  ) {
    const edition = value as {
      edition_label?: unknown;
      edition_year?: unknown;
    };
    if (
      typeof edition.edition_label === "string" ||
      typeof edition.edition_year === "number"
    ) {
      return `Edição ${String(edition.edition_label ?? edition.edition_year)}`;
    }
  }
  if (fieldName === "application_deadline") {
    const formatted = formatDate(value);
    return formatted ? `Inscrições até ${formatted}` : "Prazo em verificação";
  }
  if (fieldName === "modality" && typeof value === "string") {
    return MODALITY_TEXT[value] ?? "Modalidade em verificação";
  }
  if (fieldName === "deadline_type" && typeof value === "string") {
    return DEADLINE_TYPE_TEXT[value] ?? "Tipo de prazo em verificação";
  }
  if (fieldName === "brazilian_eligibility" && typeof value === "string") {
    return (
      BRAZIL_ELIGIBILITY_TEXT[value] ??
      "Elegibilidade de brasileiros em verificação"
    );
  }
  if (fieldName === "is_free" && typeof value === "boolean") {
    return value ? "Gratuito" : "Há custos";
  }
  if (
    ["application_fee", "program_cost"].includes(fieldName) &&
    (typeof value === "number" || typeof value === "string")
  ) {
    if (Number(value) === 0) {
      return fieldName === "application_fee"
        ? "Sem taxa de inscrição"
        : "Gratuito";
    }
    const amount = Number(value);
    return `Valor informado: ${
      Number.isFinite(amount)
        ? new Intl.NumberFormat("pt-BR", {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          }).format(amount)
        : String(value)
    }`;
  }
  if (Array.isArray(value)) {
    const simpleValues = value.filter(
      (item): item is string | number =>
        typeof item === "string" || typeof item === "number"
    );
    if (simpleValues.length > 0) {
      return simpleValues
        .map((item) => VALUE_LABELS[fieldName]?.[String(item)] ?? String(item))
        .join("; ");
    }
  }
  if (typeof value === "string") {
    return VALUE_LABELS[fieldName]?.[value] ?? value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }
  return `${FIELD_LABELS[fieldName] ?? "Informação"} em verificação`;
};

const displayAge = (field: SemanticFieldResolution): string => {
  const minimum = field.display_parameters.minimum;
  const maximum = field.display_parameters.maximum;
  const exact = field.display_parameters.exact;
  if (typeof exact === "number") {
    return `${exact} anos`;
  }
  if (typeof minimum === "number" && typeof maximum === "number") {
    return `${minimum} a ${maximum} anos`;
  }
  if (typeof minimum === "number") {
    return `A partir de ${minimum} anos`;
  }
  if (typeof maximum === "number") {
    return `Até ${maximum} anos`;
  }
  return "Regra de idade em verificação";
};

export const formatSemanticField = (field: SemanticFieldResolution): string => {
  const label = FIELD_LABELS[field.field_name] ?? field.field_name;
  switch (field.state) {
    case "explicit_value":
      return field.field_name === "age"
        ? displayAge(field)
        : displayScalar(field.field_name, field.value);
    case "explicitly_unrestricted":
      return (
        UNRESTRICTED_TEXT[field.field_name] ??
        `${label}: sem restrição, conforme o organizador`
      );
    case "not_applicable":
      return (
        NOT_APPLICABLE_TEXT[field.field_name] ??
        `${label}: não se aplica a esta oportunidade`
      );
    case "not_stated":
      return (
        NOT_STATED_TEXT[field.field_name] ??
        `${label} não informado pelo organizador`
      );
    case "conflicting":
      return (
        CONFLICT_TEXT[field.field_name] ??
        `Há informações conflitantes sobre ${label.toLocaleLowerCase("pt-BR")}`
      );
    case "extraction_failed":
    case "pending_verification":
    case "unresolved":
      return PENDING_TEXT[field.field_name] ?? `${label} em verificação`;
    case "suppressed":
      return `${label} não exibido por política editorial`;
    default:
      return `${label} em verificação`;
  }
};

export const projectSemanticFieldsForPublic = (
  fields: Record<string, SemanticFieldResolution>
): Record<string, PublicSemanticField> =>
  Object.fromEntries(
    Object.entries(fields).map(([fieldName, field]) => [
      fieldName,
      {
        applicability: field.applicability,
        criticality: field.criticality,
        display_key: field.display_key,
        display_text: formatSemanticField(field),
        explanation: publicSemanticExplanation(field),
        gate_impact: field.gate_impact,
        last_verified_at: field.last_verified_at,
        source_coverage: field.source_coverage.state,
        state: field.state,
        value: field.value,
      },
    ])
  );

const publicSemanticExplanation = (field: SemanticFieldResolution): string => {
  const label = FIELD_LABELS[field.field_name] ?? "Este campo";
  switch (field.state) {
    case "explicit_value":
      return `${label}: informação confirmada em uma fonte oficial consultada.`;
    case "explicitly_unrestricted":
      return `${label}: a fonte oficial declara explicitamente que não há essa restrição.`;
    case "not_applicable":
      return `${label}: este campo não se aplica às características desta oportunidade.`;
    case "not_stated":
      return `${label}: as fontes oficiais suficientes foram consultadas, mas o organizador não publicou essa informação.`;
    case "conflicting":
      return `${label}: fontes confiáveis apresentam informações diferentes; consulte a página oficial antes de decidir.`;
    case "extraction_failed":
      return `${label}: não foi possível concluir a leitura de uma fonte necessária; a equipe está verificando.`;
    case "pending_verification":
    case "unresolved":
      return `${label}: ainda faltam fontes ou evidências suficientes para concluir a verificação.`;
    case "suppressed":
      return `${label}: informação não exibida conforme a política editorial do Brasil Afora.`;
    default:
      return `${label}: informação em verificação.`;
  }
};

export const semanticDisplayText = (
  fields: Record<string, PublicSemanticField>,
  fieldName: string,
  fallback: string
): string => fields[fieldName]?.display_text ?? fallback;
