"use client";

import { MapPinnedIcon } from "lucide-react";
import { useMemo } from "react";
import type { CatalogFilterField } from "@/components/opportunities/catalog-filters";
import type { CatalogHeaderConfig } from "@/components/opportunities/catalog-header";
import { toNationalItem } from "@/components/opportunities/catalog-model";
import CatalogPage from "@/components/opportunities/catalog-page";
import { FILTER_OPTIONS } from "@/components/opportunities/filter-options";
import { BRAZIL_MAP } from "@/components/opportunities/map-windows";
import {
  isVerifiedNationalOpportunityId,
  isVerifiedNationalOpportunityName,
  verifiedNationalOpportunities,
} from "@/data/verified-opportunities";
import { useOportunidadesNacionais } from "@/hooks/use-oportunidades-nacionais";
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
  modalidade: [],
  nivelEnsino: [],
  prazo: "",
  taxaAplicacao: [],
  tipo: [],
};

const fields: CatalogFilterField<keyof OpportunitiesFiltros>[] = [
  {
    key: "tipo",
    label: "Tipo de oportunidade",
    options: FILTER_OPTIONS.tiposProgramaNacional,
    placeholder: "Todos",
  },
  {
    key: "nivelEnsino",
    label: "Nível de ensino",
    options: FILTER_OPTIONS.niveisEnsino,
    placeholder: "Todos",
  },
  {
    key: "modalidade",
    label: "Modalidade",
    options: FILTER_OPTIONS.modalidade,
    placeholder: "Todas",
  },
  {
    key: "taxaAplicacao",
    label: "Taxa de inscrição",
    options: FILTER_OPTIONS.taxaAplicacao,
    placeholder: "Todas",
  },
];

interface NacionalMainProps {
  /** Locations of the verified selection, resolved on the server. */
  verifiedLocations: LocationsById;
}

const header: CatalogHeaderConfig = {
  accentClassName: "text-signal",
  accentWord: "Nacionais",
  breadcrumb: "Nacional",
  icon: MapPinnedIcon,
  map: BRAZIL_MAP,
  subtitle:
    "Olimpíadas, feiras de ciências, imersões e programas de liderança para estudantes em todo o Brasil.",
  titleLead: "Oportunidades",
};

const NacionalMain = ({ verifiedLocations }: NacionalMainProps) => {
  const { data, loading, error, retry } = useOportunidadesNacionais();

  // The verified selection and the catalog form one list; a catalog record
  // that duplicates a verified one by name is dropped.
  const merged = useMemo<Opportunity[]>(
    () => [
      ...verifiedNationalOpportunities
        .filter((opportunity) =>
          isOpportunityDeadlineOpen(opportunity.prazoInscricao)
        )
        .map((opportunity) => ({
          ...opportunity,
          localizacoes: verifiedLocations[opportunity.id] ?? [],
        })),
      ...data.filter((item) => !isVerifiedNationalOpportunityName(item.nome)),
    ],
    [data, verifiedLocations]
  );

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
    OPPORTUNITY_FILTER_STORAGE_KEYS.national,
    "national"
  );

  const items = useMemo(() => {
    const now = new Date();
    return filteredData.map((opportunity) =>
      toNationalItem(
        opportunity,
        isVerifiedNationalOpportunityId(opportunity.id),
        now
      )
    );
  }, [filteredData]);

  return (
    <CatalogPage
      clearFilters={clearFilters}
      countFor={(draft) =>
        applyOpportunityFilters(merged, draft, "national").length
      }
      crossLink={{
        href: "/oportunidades/internacionais",
        label: "Ver oportunidades no exterior",
      }}
      fields={fields}
      filtros={filtros}
      filtrosTemporarios={filtrosTemporarios}
      header={header}
      initialFilters={initialFiltros}
      items={items}
      setFiltros={setFiltros}
      setFiltrosTemporarios={setFiltrosTemporarios}
      sortStorageKey="nacionalOrdenacao"
      status={{ failed: Boolean(error), loading, retry }}
    />
  );
};

export default NacionalMain;
