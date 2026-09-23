"use client";

import { LibraryBigIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { CatalogFilterField } from "@/components/opportunities/catalog-filters";
import type { CatalogHeaderConfig } from "@/components/opportunities/catalog-header";
import CatalogPage, {
  type CatalogPresentation,
} from "@/components/opportunities/catalog-page";
import { useProgramsQuery } from "@/hooks/queries/use-program-queries";
import { useCatalogClock } from "@/hooks/use-catalog-clock";
import useSessionStorage from "@/hooks/use-session-storage";
import { isProgramVisible } from "@/lib/catalog-visibility";
import { ProgramCard, ProgramRow } from "./program-items";
import {
  applyProgramFilters,
  getPrograms,
  INITIAL_PROGRAM_FILTERS,
  PROGRAM_FILTER_STORAGE_KEY,
  type ProgramFilters,
  type ProgramItem,
  STATUS_FILTER_LABELS,
  sortProgramItems,
  toProgramItem,
} from "./program-model";
import {
  PROGRAM_BENEFITS,
  PROGRAM_DESTINATIONS,
  PROGRAM_LEVELS,
  PROGRAM_MODALITIES,
  PROGRAM_TYPES,
} from "./types";

const fields: CatalogFilterField<keyof ProgramFilters>[] = [
  {
    key: "tipo",
    label: "Tipo de programa",
    options: PROGRAM_TYPES,
    placeholder: "Todos",
  },
  {
    key: "niveis",
    label: "Para quem",
    options: PROGRAM_LEVELS,
    placeholder: "Todos os níveis",
  },
  {
    key: "beneficios",
    label: "O que oferece",
    options: PROGRAM_BENEFITS,
    placeholder: "Qualquer benefício",
  },
  {
    key: "destino",
    label: "Para estudar",
    options: PROGRAM_DESTINATIONS,
    placeholder: "No Brasil ou no exterior",
  },
  {
    key: "modalidade",
    label: "Modalidade",
    options: PROGRAM_MODALITIES,
    placeholder: "Todas",
  },
  {
    key: "inscricoes",
    label: "Inscrições",
    options: Object.values(STATUS_FILTER_LABELS),
    placeholder: "Qualquer situação",
  },
];

/**
 * The reading room of the University of Washington's Suzzallo Library, lamps
 * lit: the catalogs of places show the night lights of a territory; this one
 * shows where the preparation happens.
 */
const header: CatalogHeaderConfig = {
  accentClassName: "text-lilac",
  accentWord: "Bolsas",
  backdrop: {
    kind: "photo",
    photo: {
      author: "Guywelch2000",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      position: "50% 42%",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Suzzallo_Reading_Room_University_of_Washington_restoration_Seattle_Washington_2026.jpg",
      src: "/catalog/header-programas-v1.jpg",
      subject: "Sala de leitura da Biblioteca Suzzallo (EUA)",
    },
  },
  breadcrumb: "Programas e Bolsas",
  icon: LibraryBigIcon,
  subtitle:
    "Bolsas de estudo, mentorias, preparatórios e programas de acesso que abrem novas turmas a cada ciclo e acompanham você até a próxima etapa.",
  titleLead: "Programas e",
};

const presentation: CatalogPresentation<ProgramItem> = {
  contribute: {
    title: "Conhece um programa ou bolsa que não está aqui?",
    body: "Envie pelo formulário e ajude outros estudantes a encontrá-lo.",
  },
  count: ["programa encontrado", "programas encontrados"],
  empty: {
    filtered: {
      title: "Nenhum programa com esses filtros",
      body: "Tente remover um filtro. Mostramos inscrições abertas, contínuas ou com novo ciclo anunciado.",
    },
    none: {
      title: "Os primeiros programas estão a caminho",
      body: "Esta seção está sendo montada. Enquanto isso, veja as oportunidades com inscrições abertas.",
    },
  },
  keyOf: (item) => item.id,
  loading: "Carregando programas…",
  renderCard: (item, eager) => <ProgramCard eager={eager} item={item} />,
  renderRow: (item) => <ProgramRow item={item} />,
  sortItems: sortProgramItems,
  sortOptions: [
    { value: "relevancia", label: "Abertas primeiro" },
    { value: "prazo", label: "Prazo mais próximo" },
    { value: "nome", label: "Nome (A–Z)" },
  ],
};

const ProgramsMain = () => {
  const query = useProgramsQuery();
  const now = useCatalogClock();
  const programs = useMemo(
    () =>
      (query.data ?? getPrograms()).filter((program) =>
        isProgramVisible(program, now)
      ),
    [query.data, now]
  );
  const [filtros, setFiltros] = useSessionStorage<ProgramFilters>(
    PROGRAM_FILTER_STORAGE_KEY,
    INITIAL_PROGRAM_FILTERS
  );
  const [filtrosTemporarios, setFiltrosTemporarios] =
    useState<ProgramFilters>(filtros);

  const items = useMemo(() => {
    return applyProgramFilters(programs, filtros, now).map((program) =>
      toProgramItem(program, now)
    );
  }, [programs, filtros, now]);

  const clearFilters = () => {
    setFiltros(INITIAL_PROGRAM_FILTERS);
    setFiltrosTemporarios(INITIAL_PROGRAM_FILTERS);
  };

  return (
    <CatalogPage
      clearFilters={clearFilters}
      countFor={(draft) => applyProgramFilters(programs, draft).length}
      crossLink={{
        href: "/oportunidades/nacionais",
        label: "Ver oportunidades no Brasil",
      }}
      fields={fields}
      filtros={filtros}
      filtrosTemporarios={filtrosTemporarios}
      header={header}
      initialFilters={INITIAL_PROGRAM_FILTERS}
      items={items}
      presentation={presentation}
      setFiltros={setFiltros}
      setFiltrosTemporarios={setFiltrosTemporarios}
      sortStorageKey="programasOrdenacao"
      status={{
        failed: query.isError,
        loading: query.isPending,
        retry: () => {
          query.refetch();
        },
      }}
    />
  );
};

export default ProgramsMain;
