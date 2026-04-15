"use client";

import { GlobeIcon } from "lucide-react";
import { useMemo } from "react";
import { useOportunidadesInternacionais } from "../../hooks/use-oportunidades-internacionais";
import useOpportunityFilters from "../../hooks/use-opportunity-filters";
import type { AppliedFilter } from "../opportunities/opportunities-main-layout";
import OpportunitiesMainLayout from "../opportunities/opportunities-main-layout";
import OpportunityList from "../opportunities/opportunity-list";
import type { OpportunityCardConfig } from "../opportunities/types";
import InternacionalFilter from "./internacional-filter";
import type { OpportunitiesFiltros, Opportunity } from "./types";

const initialFiltros: OpportunitiesFiltros = {
  idade: "",
  pais: [],
  nivelEnsino: [],
  tipo: [],
  requisitosIdioma: [],
  taxaAplicacao: [],
  tipoBolsa: [],
};

const cardConfig: OpportunityCardConfig = {
  type: "international",
  basePath: "/oportunidades/internacionais",
  accentColor: "blue",
  showScholarship: true,
  showDuration: true,
};

const InternacionalMain = () => {
  const {
    data: oportunidadesInternacionais,
    loading,
    error,
  } = useOportunidadesInternacionais();

  const {
    clearFilters,
    filteredData,
    filtros,
    filtrosTemporarios,
    isFilterActive,
    setFiltros,
    setFiltrosTemporarios,
  } = useOpportunityFilters<Opportunity, OpportunitiesFiltros>(
    oportunidadesInternacionais,
    initialFiltros,
    "internacionalFiltros",
    "international"
  );

  const appliedFilters: AppliedFilter[] = useMemo(() => {
    const result: AppliedFilter[] = [];

    if (filtros.idade) {
      result.push({ key: "idade", value: `Idade: ${filtros.idade}` });
    }
    for (const p of filtros.pais) {
      result.push({ key: "pais", value: p });
    }
    for (const n of filtros.nivelEnsino) {
      result.push({ key: "nivelEnsino", value: n });
    }
    for (const t of filtros.tipo) {
      result.push({ key: "tipo", value: t });
    }
    for (const i of filtros.requisitosIdioma) {
      result.push({ key: "requisitosIdioma", value: i });
    }
    for (const t of filtros.taxaAplicacao) {
      result.push({ key: "taxaAplicacao", value: t });
    }
    for (const t of filtros.tipoBolsa) {
      result.push({ key: "tipoBolsa", value: t });
    }

    return result;
  }, [filtros]);

  const handleRemoveFilter = (key: string, valueToRemove: string) => {
    setFiltros((prev) => {
      const filterKey = key as keyof OpportunitiesFiltros;
      if (Array.isArray(prev[filterKey])) {
        return {
          ...prev,
          [filterKey]: (prev[filterKey] as string[]).filter(
            (val) => val !== valueToRemove
          ),
        };
      }
      return { ...prev, [filterKey]: initialFiltros[filterKey] };
    });
  };

  const handleClearFilters = () => {
    clearFilters();
  };

  const handleApplyMobileFilters = () => {
    setFiltros(filtrosTemporarios);
  };

  return (
    <OpportunitiesMainLayout
      accentColor="blue"
      appliedFilters={appliedFilters}
      error={error}
      filterComponent={
        <InternacionalFilter
          filtros={filtros}
          filtrosIniciais={initialFiltros}
          setFiltros={setFiltros}
        />
      }
      icon={GlobeIcon}
      isFilterActive={isFilterActive}
      loading={loading}
      mobileFilterComponent={
        <InternacionalFilter
          filtros={filtrosTemporarios}
          filtrosIniciais={initialFiltros}
          setFiltros={setFiltrosTemporarios}
        />
      }
      onApplyMobileFilters={handleApplyMobileFilters}
      onClearFilters={handleClearFilters}
      onRemoveFilter={handleRemoveFilter}
      resultCount={filteredData.length}
      subtitle="Explore bolsas de estudo, summer camps e intercâmbios ao redor do mundo."
      title="Oportunidades Internacionais"
    >
      <OpportunityList config={cardConfig} data={filteredData} />
    </OpportunitiesMainLayout>
  );
};

export default InternacionalMain;
