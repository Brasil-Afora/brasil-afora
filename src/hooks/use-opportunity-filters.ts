"use client";

import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import {
  FILTER_ALIASES,
  FILTER_OPTIONS,
} from "@/components/opportunities/filter-options";
import {
  isVerifiedInternationalOpportunityId,
  isVerifiedNationalOpportunityId,
} from "@/data/verified-opportunities";
import { getBrasiliaDaysUntil } from "@/lib/date-utils";
import type {
  InternationalOpportunity,
  NationalOpportunity,
} from "@/lib/opportunities-api";
import { applyBaseFilters } from "./opportunity-semantic-filters";

import useSessionStorage from "./use-session-storage";

type Opportunity = InternationalOpportunity | NationalOpportunity;

interface BaseFilters {
  apenasVerificadas: boolean;
  idade: string;
  nivelEnsino: string[];
  prazo: string;
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

type Filters = InternationalFilters | NationalFilters;
type CatalogType = "international" | "national";

// Session storage keys the catalogs read their filters from. Other surfaces
// (the home page category shortcuts) write here to open a catalog pre-filtered.
export const OPPORTUNITY_FILTER_STORAGE_KEYS = {
  international: "internacionalFiltros",
  national: "nacionalFiltros",
} as const;

const DIACRITICS_REGEX = /\p{M}/gu;
const AGE_RANGE_REGEX = /(\d{1,2})\s*(?:a|-|–|—|até|ate)\s*(\d{1,2})\s*anos/;
const AGE_MIN_REGEX =
  /(?:a partir de|acima de|mínimo de|minimo de|maiores de)\s*(\d{1,2})/;
const AGE_MAX_REGEX = /(?:até|ate|menores de|no máximo)\s*(\d{1,2})\s*anos/;
const AGE_PLUS_REGEX = /(\d{1,2})\s*\+/;

const normalize = (value: string): string =>
  value.normalize("NFD").replace(DIACRITICS_REGEX, "").toLowerCase();

const optionStems = (option: string): readonly string[] =>
  FILTER_ALIASES[option] ?? [normalize(option)];

/** True when the free text mentions any of the selected options. */
const matchesAnyOption = (text: string, selected: string[]): boolean => {
  const haystack = normalize(text);
  return selected.some((option) =>
    optionStems(option).some((stem) => haystack.includes(stem))
  );
};

/** Use the same matching rule as filtering, including multi-country records. */
export const availableCountryOptions = (
  opportunities: { pais: string }[]
): string[] =>
  FILTER_OPTIONS.paises
    .filter((country) =>
      opportunities.some((opportunity) =>
        matchesAnyOption(opportunity.pais, [country])
      )
    )
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

/**
 * Age ranges are free text ("16 a 18 anos em 19/07/2027", "Qualquer idade").
 * Only a range we can actually read may exclude an opportunity; anything we
 * cannot parse stays visible rather than silently disappearing.
 */
const isAgeAccepted = (faixaEtaria: string, age: number): boolean => {
  const text = faixaEtaria.toLowerCase();
  const range = AGE_RANGE_REGEX.exec(text);
  if (range) {
    return age >= Number(range[1]) && age <= Number(range[2]);
  }
  const minimum = AGE_MIN_REGEX.exec(text) ?? AGE_PLUS_REGEX.exec(text);
  if (minimum) {
    return age >= Number(minimum[1]);
  }
  const maximum = AGE_MAX_REGEX.exec(text);
  if (maximum) {
    return age <= Number(maximum[1]);
  }
  return true;
};

const isVerified = (type: CatalogType, id: string): boolean =>
  type === "international"
    ? isVerifiedInternationalOpportunityId(id)
    : isVerifiedNationalOpportunityId(id);

const matchesBaseFilters = (
  opportunity: Opportunity,
  filtros: BaseFilters,
  type: CatalogType,
  now: Date
): boolean => {
  const hasSemantics =
    opportunity.semanticFields !== undefined ||
    opportunity.structuredAgeRules !== undefined;
  if (hasSemantics && applyBaseFilters([opportunity], filtros).length === 0) {
    return false;
  }
  const age = Number(filtros.idade);
  if (
    !hasSemantics &&
    filtros.idade !== "" &&
    !Number.isNaN(age) &&
    !isAgeAccepted(opportunity.faixaEtaria ?? "", age)
  ) {
    return false;
  }
  if (
    filtros.tipo.length > 0 &&
    !matchesAnyOption(opportunity.tipo, filtros.tipo)
  ) {
    return false;
  }
  if (
    filtros.nivelEnsino.length > 0 &&
    !matchesAnyOption(opportunity.nivelEnsino, filtros.nivelEnsino)
  ) {
    return false;
  }
  if (
    !hasSemantics &&
    filtros.taxaAplicacao.length > 0 &&
    !matchesAnyOption(opportunity.taxaAplicacao, filtros.taxaAplicacao)
  ) {
    return false;
  }
  if (filtros.prazo) {
    const daysLeft = getBrasiliaDaysUntil(opportunity.prazoInscricao, now);
    if (daysLeft === null || daysLeft > Number(filtros.prazo)) {
      return false;
    }
  }
  if (
    filtros.apenasVerificadas &&
    !(opportunity.verified ?? isVerified(type, opportunity.id))
  ) {
    return false;
  }
  return true;
};

const matchesInternationalFilters = (
  opportunity: InternationalOpportunity,
  filtros: InternationalFilters
): boolean =>
  (filtros.pais.length === 0 ||
    matchesAnyOption(opportunity.pais, filtros.pais)) &&
  (filtros.requisitosIdioma.length === 0 ||
    matchesAnyOption(opportunity.requisitosIdioma, filtros.requisitosIdioma)) &&
  (filtros.tipoBolsa.length === 0 ||
    matchesAnyOption(opportunity.tipoBolsa, filtros.tipoBolsa));

const matchesNationalFilters = (
  opportunity: NationalOpportunity,
  filtros: NationalFilters
): boolean =>
  filtros.modalidade.length === 0 ||
  matchesAnyOption(opportunity.modalidade, filtros.modalidade);

/** Applies a catalog's filters; exported so drafts can preview their count. */
export const applyOpportunityFilters = <T extends Opportunity>(
  data: T[],
  filtros: Filters,
  type: CatalogType,
  now: Date = new Date()
): T[] =>
  data.filter((opportunity) => {
    if (!matchesBaseFilters(opportunity, filtros, type, now)) {
      return false;
    }
    return type === "international"
      ? matchesInternationalFilters(
          opportunity as InternationalOpportunity,
          filtros as InternationalFilters
        )
      : matchesNationalFilters(
          opportunity as NationalOpportunity,
          filtros as NationalFilters
        );
  });

export const countActiveFilters = (filtros: Filters): number => {
  let count = 0;
  for (const value of Object.values(filtros)) {
    if (Array.isArray(value)) {
      count += value.length;
    } else if (value === true || (typeof value === "string" && value !== "")) {
      count += 1;
    }
  }
  return count;
};

interface UseOpportunityFiltersResult<
  T extends Opportunity,
  F extends Filters,
> {
  clearFilters: () => void;
  filteredData: T[];
  filtros: F;
  filtrosTemporarios: F;
  isFilterActive: boolean;
  setFiltros: Dispatch<SetStateAction<F>>;
  setFiltrosTemporarios: Dispatch<SetStateAction<F>>;
}

function useOpportunityFilters<T extends Opportunity, F extends Filters>(
  data: T[],
  initialFilters: F,
  storageKey: string,
  type: CatalogType
): UseOpportunityFiltersResult<T, F> {
  const [filtros, setFiltros] = useSessionStorage<F>(
    storageKey,
    initialFilters
  );
  const [filtrosTemporarios, setFiltrosTemporarios] = useState<F>(filtros);

  const filteredData = useMemo(
    () => applyOpportunityFilters(data, filtros, type),
    [data, filtros, type]
  );

  const isFilterActive = countActiveFilters(filtros) > 0;

  const clearFilters = () => {
    setFiltros(initialFilters);
    setFiltrosTemporarios(initialFilters);
  };

  return {
    filtros,
    setFiltros,
    filtrosTemporarios,
    setFiltrosTemporarios,
    filteredData,
    isFilterActive,
    clearFilters,
  };
}

export default useOpportunityFilters;
export type { InternationalFilters, NationalFilters };
