"use client";

import { GlobeIcon } from "lucide-react";
import { useMemo } from "react";
import type { CatalogFilterField } from "@/components/opportunities/catalog-filters";
import type { CatalogHeaderConfig } from "@/components/opportunities/catalog-header";
import { toInternationalItem } from "@/components/opportunities/catalog-model";
import CatalogPage, {
  OPPORTUNITY_PRESENTATION,
} from "@/components/opportunities/catalog-page";
import { FILTER_OPTIONS } from "@/components/opportunities/filter-options";
import { WORLD_MAP } from "@/components/opportunities/map-windows";
import {
  isVerifiedInternationalOpportunityId,
  verifiedInternationalOpportunities,
} from "@/data/verified-opportunities";
import { useOportunidadesInternacionais } from "@/hooks/use-oportunidades-internacionais";
import useOpportunityFilters, {
  applyOpportunityFilters,
  availableCountryOptions,
  OPPORTUNITY_FILTER_STORAGE_KEYS,
} from "@/hooks/use-opportunity-filters";
import { isOpportunityDeadlineOpen } from "@/lib/date-utils";
import { mergeCatalogOpportunities } from "@/lib/merge-catalog-opportunities";
import type { LocationsById } from "@/server/geo/opportunity-locations";
import type { OpportunitiesFiltros, Opportunity } from "./types";

const initialFiltros: OpportunitiesFiltros = {
  apenasVerificadas: false,
  faixaPreco: [],
  idade: "",
  nivelEnsino: [],
  pais: [],
  prazo: "",
  requisitosIdioma: [],
  taxaAplicacao: [],
  tipo: [],
  tipoBolsa: [],
};

const fields: CatalogFilterField<keyof OpportunitiesFiltros>[] = [
  {
    key: "tipo",
    label: "Tipo de oportunidade",
    options: FILTER_OPTIONS.tiposProgramaInternacional,
    placeholder: "Todos",
  },
  {
    key: "nivelEnsino",
    label: "Nível de ensino",
    options: FILTER_OPTIONS.niveisEnsino,
    placeholder: "Todos",
  },
  {
    key: "faixaPreco",
    label: "Preço",
    options: FILTER_OPTIONS.faixaPreco,
    placeholder: "Qualquer preço",
  },
  {
    key: "tipoBolsa",
    label: "Financiamento",
    options: FILTER_OPTIONS.tipoBolsa,
    placeholder: "Todos",
  },
  {
    key: "pais",
    label: "País de destino",
    options: FILTER_OPTIONS.paises,
    placeholder: "Todos",
    searchable: true,
  },
  {
    key: "requisitosIdioma",
    label: "Idioma exigido",
    options: FILTER_OPTIONS.requisitosIdioma,
    placeholder: "Todos",
  },
  {
    key: "taxaAplicacao",
    label: "Taxa de inscrição",
    options: FILTER_OPTIONS.taxaAplicacao,
    placeholder: "Todas",
  },
];

interface InternacionalMainProps {
  /** Locations of the verified selection, resolved on the server. */
  verifiedLocations: LocationsById;
}

const header: CatalogHeaderConfig = {
  accentClassName: "text-atlantic",
  accentWord: "Internacionais",
  breadcrumb: "Internacional",
  icon: GlobeIcon,
  backdrop: { kind: "map", map: WORLD_MAP },
  subtitle:
    "Bolsas de estudo, intercâmbios, summer programs e cursos para estudantes brasileiros em todo o mundo.",
  titleLead: "Oportunidades",
};

const InternacionalMain = ({ verifiedLocations }: InternacionalMainProps) => {
  const { data, loading, error, retry } = useOportunidadesInternacionais();

  const merged = useMemo<Opportunity[]>(() => {
    const selection = verifiedInternationalOpportunities
      .filter((opportunity) =>
        isOpportunityDeadlineOpen(opportunity.prazoInscricao)
      )
      .map((opportunity) => ({
        ...opportunity,
        localizacoes: verifiedLocations[opportunity.id] ?? [],
      }));
    return mergeCatalogOpportunities<Opportunity>(data, selection);
  }, [data, verifiedLocations]);

  const {
    clearFilters,
    filteredData,
    filtros,
    filtrosTemporarios,
    setFiltros,
    setFiltrosTemporarios,
  } = useOpportunityFilters<Opportunity, OpportunitiesFiltros>(
    merged,
    initialFiltros,
    OPPORTUNITY_FILTER_STORAGE_KEYS.international,
    "international"
  );

  const availableFields = useMemo(
    () =>
      fields.map((field) =>
        field.key === "pais"
          ? { ...field, options: availableCountryOptions(merged) }
          : field
      ),
    [merged]
  );

  const items = useMemo(() => {
    const now = new Date();
    return filteredData.map((opportunity) =>
      toInternationalItem(
        opportunity,
        isVerifiedInternationalOpportunityId(opportunity.id),
        now
      )
    );
  }, [filteredData]);

  return (
    <CatalogPage
      clearFilters={clearFilters}
      countFor={(draft) =>
        applyOpportunityFilters(merged, draft, "international").length
      }
      crossLink={{
        href: "/oportunidades/nacionais",
        label: "Ver oportunidades no Brasil",
      }}
      fields={availableFields}
      filtros={filtros}
      filtrosTemporarios={filtrosTemporarios}
      header={header}
      initialFilters={initialFiltros}
      items={items}
      presentation={OPPORTUNITY_PRESENTATION}
      setFiltros={setFiltros}
      setFiltrosTemporarios={setFiltrosTemporarios}
      sortStorageKey="internacionalOrdenacao"
      status={{ failed: Boolean(error), loading, retry }}
    />
  );
};

export default InternacionalMain;
