"use client";

import { TrophyIcon } from "lucide-react";
import { useMemo } from "react";
import type { AppliedFilter } from "@/components/opportunities/opportunities-main-layout";
import OpportunitiesMainLayout from "@/components/opportunities/opportunities-main-layout";
import OpportunityList from "@/components/opportunities/opportunity-list";
import type { OpportunityCardConfig } from "@/components/opportunities/types";
import { useOportunidadesNacionais } from "@/hooks/use-oportunidades-nacionais";
import useOpportunityFilters from "@/hooks/use-opportunity-filters";
import NacionalFilter from "./nacional-filter";
import type { OpportunitiesFiltros, Opportunity } from "./types";

const initialFiltros: OpportunitiesFiltros = {
  idade: "",
  nivelEnsino: [],
  tipo: [],
  taxaAplicacao: [],
  modalidade: [],
};

const cardConfig: OpportunityCardConfig = {
  type: "national",
  basePath: "/oportunidades/nacionais",
  accentColor: "amber",
  showModalidade: true,
};

const NacionalMain = () => {
  const {
    data: oportunidadesNacionais,
    loading,
    error,
  } = useOportunidadesNacionais();

  const {
    clearFilters,
    filteredData,
    filtros,
    filtrosTemporarios,
    isFilterActive,
    setFiltros,
    setFiltrosTemporarios,
  } = useOpportunityFilters<Opportunity, OpportunitiesFiltros>(
    oportunidadesNacionais,
    initialFiltros,
    "nacionalFiltros",
    "national"
  );

  const appliedFilters: AppliedFilter[] = useMemo(() => {
    const result: AppliedFilter[] = [];

    if (filtros.idade) {
      result.push({ key: "idade", value: `Idade: ${filtros.idade}` });
    }
    for (const n of filtros.nivelEnsino) {
      result.push({ key: "nivelEnsino", value: n });
    }
    for (const t of filtros.tipo) {
      result.push({ key: "tipo", value: t });
    }
    for (const t of filtros.taxaAplicacao) {
      result.push({ key: "taxaAplicacao", value: t });
    }
    for (const m of filtros.modalidade) {
      result.push({ key: "modalidade", value: m });
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
      accentColor="amber"
      appliedFilters={appliedFilters}
      error={error}
      filterComponent={
        <NacionalFilter
          filtros={filtros}
          filtrosIniciais={initialFiltros}
          setFiltros={setFiltros}
        />
      }
      icon={TrophyIcon}
      isFilterActive={isFilterActive}
      loading={loading}
      mobileFilterComponent={
        <NacionalFilter
          filtros={filtrosTemporarios}
          filtrosIniciais={initialFiltros}
          setFiltros={setFiltrosTemporarios}
        />
      }
      onApplyMobileFilters={handleApplyMobileFilters}
      onClearFilters={handleClearFilters}
      onRemoveFilter={handleRemoveFilter}
      resultCount={filteredData.length}
      subtitle="Encontre olimpíadas, feiras científicas e projetos de liderança no Brasil."
      title="Oportunidades Nacionais"
    >
      <OpportunityList config={cardConfig} data={filteredData} />
    </OpportunitiesMainLayout>
  );
};

export default NacionalMain;
