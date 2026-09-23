"use client";

import type {
  InternationalOpportunity,
  NationalOpportunity,
} from "@/lib/opportunities-api";

type Opportunity = InternationalOpportunity | NationalOpportunity;

interface BaseFilters {
  idade: string;
  nivelEnsino: string[];
  taxaAplicacao: string[];
  tipo: string[];
}

interface InternationalFilters extends BaseFilters {
  pais: string[];
  requisitosIdioma: string[];
  tipoBolsa: string[];
}

interface NationalFilters extends BaseFilters {
  modalidade: string[];
}

const OPPORTUNITY_TYPE_SPLIT_REGEX = /\s*[;,|]\s*|\s+\/\s+|\s+e\s+/i;
const AGE_RANGE_REGEX =
  /^\s*(?:idades?\s+(?:entre|de)\s+|ages?\s+)?(\d{1,2})\s*(?:-|–|—|a|to)\s*(\d{1,2})(?:\s*(?:anos?|years?))?\s*$/i;
const MINIMUM_AGE_REGEX =
  /^\s*(?:a partir de\s+|at least\s+)?(\d{1,2})\s*(?:\+|anos?\s+ou\s+mais|years?\s+(?:or|and)\s+older)\s*$/i;
const EXACT_AGE_REGEX = /^\s*(\d{1,2})(?:\s*(?:anos?|years?))?\s*$/i;

const splitOpportunityTypes = (tipo: string): string[] =>
  tipo
    .split(OPPORTUNITY_TYPE_SPLIT_REGEX)
    .map((item) => item.trim())
    .filter(Boolean);

const matchesSelectedTypes = (
  opportunityType: string,
  selectedTypes: string[]
): boolean => {
  const normalizedSelected = selectedTypes.map((type) => type.toLowerCase());
  const parsedTypes = splitOpportunityTypes(opportunityType).map((type) =>
    type.toLowerCase()
  );
  return parsedTypes.some((type) => normalizedSelected.includes(type));
};

const isAgeInRange = (faixaEtaria: string, age: number): boolean => {
  const range = AGE_RANGE_REGEX.exec(faixaEtaria);
  if (range) {
    return age >= Number(range[1]) && age <= Number(range[2]);
  }

  const minimum = MINIMUM_AGE_REGEX.exec(faixaEtaria);
  if (minimum) {
    return age >= Number(minimum[1]);
  }

  const exact = EXACT_AGE_REGEX.exec(faixaEtaria);
  return exact ? age === Number(exact[1]) : false;
};

const matchesStructuredAgeRule = (
  rule: NonNullable<Opportunity["structuredAgeRules"]>[number],
  age: number
): boolean => {
  if (rule.exact_age !== null) {
    return age === rule.exact_age;
  }
  if (rule.minimum_age === null && rule.maximum_age === null) {
    return false;
  }
  const minimumMatches =
    rule.minimum_age === null ||
    age > rule.minimum_age ||
    (age === rule.minimum_age && rule.minimum_inclusive);
  const maximumMatches =
    rule.maximum_age === null ||
    age < rule.maximum_age ||
    (age === rule.maximum_age && rule.maximum_inclusive);
  return minimumMatches && maximumMatches;
};

const semanticField = (opportunity: Opportunity, fieldName: string) =>
  opportunity.semanticFields?.[fieldName];

const numericCost = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object" && value !== null && "amount" in value) {
    return numericCost((value as { amount: unknown }).amount);
  }
  return null;
};

const matchesApplicationFee = (
  opportunity: Opportunity,
  selectedFees: string[]
): boolean => {
  const isFree = semanticField(opportunity, "is_free");
  const applicationFee = semanticField(opportunity, "application_fee");
  let classification: "Gratuito" | "Pago" | null = null;

  if (applicationFee?.state === "explicitly_unrestricted") {
    classification = "Gratuito";
  } else if (applicationFee?.state === "explicit_value") {
    const amount = numericCost(applicationFee.value);
    if (amount !== null) {
      classification = amount === 0 ? "Gratuito" : "Pago";
    }
  } else if (isFree?.state === "explicit_value") {
    if (isFree.value === true) {
      classification = "Gratuito";
    } else if (isFree.value === false) {
      classification = "Pago";
    }
  } else if (!(applicationFee || isFree)) {
    const legacyValue = opportunity.taxaAplicacao.toLowerCase();
    if (legacyValue.includes("gratuito")) {
      classification = "Gratuito";
    } else if (legacyValue.includes("pago")) {
      classification = "Pago";
    }
  }

  return classification !== null && selectedFees.includes(classification);
};

export const applyBaseFilters = <T extends Opportunity>(
  data: T[],
  filtros: BaseFilters
): T[] => {
  let result = data;

  if (filtros.idade) {
    const idadeInput = Number(filtros.idade);
    if (!Number.isNaN(idadeInput)) {
      result = result.filter((op) => {
        const ageField = semanticField(op, "age");
        if (ageField?.state === "explicitly_unrestricted") {
          return true;
        }
        if (ageField && ageField.state !== "explicit_value") {
          return false;
        }
        if (op.structuredAgeRules !== undefined) {
          return op.structuredAgeRules.some((rule) =>
            matchesStructuredAgeRule(rule, idadeInput)
          );
        }
        return op.faixaEtaria
          ? isAgeInRange(op.faixaEtaria, idadeInput)
          : false;
      });
    }
  }

  if (filtros.nivelEnsino.length > 0) {
    result = result.filter((op) =>
      filtros.nivelEnsino.some((nivel) =>
        op.nivelEnsino.toLowerCase().includes(nivel.toLowerCase())
      )
    );
  }

  if (filtros.taxaAplicacao.length > 0) {
    result = result.filter((op) =>
      matchesApplicationFee(op, filtros.taxaAplicacao)
    );
  }

  return result;
};

export const applyInternationalFilters = (
  data: InternationalOpportunity[],
  filtros: InternationalFilters
): InternationalOpportunity[] => {
  let result = applyBaseFilters(data, filtros);

  if (filtros.pais.length > 0) {
    result = result.filter((op) =>
      filtros.pais.some((pais) =>
        op.pais.toLowerCase().includes(pais.toLowerCase())
      )
    );
  }

  if (filtros.requisitosIdioma.length > 0) {
    result = result.filter((op) =>
      filtros.requisitosIdioma.some((idioma) =>
        op.requisitosIdioma.toLowerCase().includes(idioma.toLowerCase())
      )
    );
  }

  if (filtros.tipoBolsa.length > 0) {
    result = result.filter((op) =>
      filtros.tipoBolsa.some((tipo) =>
        op.tipoBolsa.toLowerCase().includes(tipo.toLowerCase())
      )
    );
  }

  if (filtros.tipo.length > 0) {
    result = result.filter((op) => matchesSelectedTypes(op.tipo, filtros.tipo));
  }

  return result;
};

export const applyNationalFilters = (
  data: NationalOpportunity[],
  filtros: NationalFilters
): NationalOpportunity[] => {
  let result = applyBaseFilters(data, filtros);

  if (filtros.tipo.length > 0) {
    result = result.filter((op) =>
      filtros.tipo.some((tipo) =>
        op.tipo.toLowerCase().includes(tipo.toLowerCase())
      )
    );
  }

  if (filtros.modalidade.length > 0) {
    result = result.filter((op) =>
      filtros.modalidade.some((modalidade) =>
        op.modalidade.toLowerCase().includes(modalidade.toLowerCase())
      )
    );
  }

  return result;
};
