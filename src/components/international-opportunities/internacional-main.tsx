"use client";

import { GlobeIcon } from "lucide-react";
import { useMemo } from "react";
import type { CatalogFilterField } from "@/components/opportunities/catalog-filters";
import type { CatalogHeaderConfig } from "@/components/opportunities/catalog-header";
import { toInternationalItem } from "@/components/opportunities/catalog-model";
import CatalogPage from "@/components/opportunities/catalog-page";
import { FILTER_OPTIONS } from "@/components/opportunities/filter-options";
import {
  isVerifiedInternationalOpportunityId,
  verifiedInternationalOpportunities,
} from "@/data/verified-opportunities";
import { useOportunidadesInternacionais } from "@/hooks/use-oportunidades-internacionais";
import useOpportunityFilters, {
  applyOpportunityFilters,
  OPPORTUNITY_FILTER_STORAGE_KEYS,
} from "@/hooks/use-opportunity-filters";
import { isOpportunityDeadlineOpen } from "@/lib/date-utils";
import type { LocationsById } from "@/server/geo/opportunity-locations";
import type { OpportunitiesFiltros, Opportunity } from "./types";

const initialFiltros: OpportunitiesFiltros = {
  apenasVerificadas: false,
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
    key: "tipoBolsa",
    label: "Financiamento",
    options: FILTER_OPTIONS.tipoBolsa,
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
  map: {
    src: "/catalog/header-mundo.jpg",
    west: -130,
    east: 160,
    north: 66,
    south: -48,
  },
  subtitle:
    "Bolsas de estudo, intercâmbios, summer programs e cursos para estudantes brasileiros em todo o mundo.",
  titleLead: "Oportunidades",
};

const nameKey = (name: string): string =>
  name.trim().toLocaleLowerCase("pt-BR");

const InternacionalMain = ({ verifiedLocations }: InternacionalMainProps) => {
  const { data, loading, error, retry } = useOportunidadesInternacionais();

  // The verified selection and the catalog form one list; a catalog record
  // that duplicates a verified one by name is dropped.
  const merged = useMemo<Opportunity[]>(() => {
    const verified = verifiedInternationalOpportunities
      .filter((opportunity) =>
        isOpportunityDeadlineOpen(opportunity.prazoInscricao)
      )
      .map((opportunity) => ({
        ...opportunity,
        localizacoes: verifiedLocations[opportunity.id] ?? [],
      }));
    const verifiedNames = new Set(verified.map((item) => nameKey(item.nome)));
    return [
      ...verified,
      ...data.filter((item) => !verifiedNames.has(nameKey(item.nome))),
    ];
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
      fields={fields}
      filtros={filtros}
      filtrosTemporarios={filtrosTemporarios}
      header={header}
      initialFilters={initialFiltros}
      items={items}
      setFiltros={setFiltros}
      setFiltrosTemporarios={setFiltrosTemporarios}
      sortStorageKey="internacionalOrdenacao"
      status={{ failed: Boolean(error), loading, retry }}
    />
  );
};

export default InternacionalMain;
