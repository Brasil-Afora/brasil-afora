"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  InternationalOpportunity,
  NationalOpportunity,
} from "@/lib/opportunities-api";
import useSessionStorage from "./use-session-storage";

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

type Filters = InternationalFilters | NationalFilters;

const OPPORTUNITY_TYPE_SPLIT_REGEX = /\s*[;,|]\s*|\s+\/\s+|\s+e\s+/i;

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
  const numeros = faixaEtaria.match(/\d+/g)?.map(Number);
  if (!numeros) {
    return false;
  }
  if (numeros.length === 2) {
    return age >= numeros[0] && age <= numeros[1];
  }
  if (numeros.length === 1 && faixaEtaria.includes("+")) {
    return age >= numeros[0];
  }
  if (numeros.length === 1) {
    return age === numeros[0];
  }
  return false;
};

const applyBaseFilters = <T extends Opportunity>(
  data: T[],
  filtros: BaseFilters
): T[] => {
  let result = data;

  if (filtros.idade) {
    const idadeInput = Number(filtros.idade);
    if (!Number.isNaN(idadeInput)) {
      result = result.filter((op) =>
        op.faixaEtaria ? isAgeInRange(op.faixaEtaria, idadeInput) : false
      );
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
      filtros.taxaAplicacao.some((taxa) =>
        op.taxaAplicacao.toLowerCase().includes(taxa.toLowerCase())
      )
    );
  }

  return result;
};

const applyInternationalFilters = (
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

const applyNationalFilters = (
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
  type: "international" | "national"
): UseOpportunityFiltersResult<T, F> {
  const [filtros, setFiltros] = useSessionStorage<F>(
    storageKey,
    initialFilters
  );
  const [filtrosTemporarios, setFiltrosTemporarios] = useState<F>(filtros);
  const isInitialMount = useRef(true);

  const filteredData = useMemo(() => {
    if (type === "international") {
      return applyInternationalFilters(
        data as InternationalOpportunity[],
        filtros as InternationalFilters
      ) as T[];
    }
    return applyNationalFilters(
      data as NationalOpportunity[],
      filtros as NationalFilters
    ) as T[];
  }, [data, filtros, type]);

  const filtrosSignature = useMemo(() => JSON.stringify(filtros), [filtros]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      const hasSignature = filtrosSignature.length > 0;
      if (hasSignature) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [filtrosSignature]);

  const hasBaseFilters =
    filtros.idade !== "" ||
    filtros.nivelEnsino.length > 0 ||
    filtros.tipo.length > 0 ||
    filtros.taxaAplicacao.length > 0;

  const isFilterActive = useMemo(() => {
    if (hasBaseFilters) {
      return true;
    }

    if (type === "international") {
      const internationalFilters = filtros as InternationalFilters;

      return (
        internationalFilters.pais.length > 0 ||
        internationalFilters.requisitosIdioma.length > 0 ||
        internationalFilters.tipoBolsa.length > 0
      );
    }

    const nationalFilters = filtros as NationalFilters;
    return nationalFilters.modalidade.length > 0;
  }, [filtros, hasBaseFilters, type]);

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
