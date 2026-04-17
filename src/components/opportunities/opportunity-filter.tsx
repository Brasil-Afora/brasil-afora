"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import FilterDropdown from "@/components/ui/filter-dropdown";
import { Input } from "@/components/ui/input";
import { FILTER_OPTIONS } from "./filter-options";

type AccentColor = "amber" | "blue";

interface InternationalFilters {
  idade: string;
  nivelEnsino: string[];
  pais: string[];
  requisitosIdioma: string[];
  taxaAplicacao: string[];
  tipo: string[];
  tipoBolsa: string[];
}

interface NationalFilters {
  idade: string;
  modalidade: string[];
  nivelEnsino: string[];
  taxaAplicacao: string[];
  tipo: string[];
}

type Filters = InternationalFilters | NationalFilters;

interface OpportunityFilterProps<T extends Filters> {
  accentColor: AccentColor;
  filtros: T;
  filtrosIniciais: T;
  setFiltros: Dispatch<SetStateAction<T>>;
  type: "international" | "national";
}

const isInternationalFilters = (
  filters: Filters
): filters is InternationalFilters => {
  return "pais" in filters;
};

function OpportunityFilter<T extends Filters>({
  filtros,
  setFiltros,
  filtrosIniciais,
  type,
  accentColor,
}: OpportunityFilterProps<T>) {
  const filterRef = useRef<HTMLDivElement>(null);

  const handleCheckboxChange = useCallback(
    (key: keyof T, value: string) => {
      const currentArray = (filtros[key] as string[]) || [];
      if (currentArray.includes(value)) {
        setFiltros((prev) => ({
          ...prev,
          [key]: currentArray.filter((item) => item !== value),
        }));
      } else {
        setFiltros((prev) => ({ ...prev, [key]: [...currentArray, value] }));
      }
    },
    [filtros, setFiltros]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value } = e.target;
      setFiltros((prev) => ({ ...prev, [id]: value }));
    },
    [setFiltros]
  );

  const isFilterActive = useCallback(() => {
    const hasBaseFilters =
      filtros.idade !== "" ||
      [filtros.nivelEnsino, filtros.tipo, filtros.taxaAplicacao].some(
        (filter) => filter.length > 0
      );

    if (isInternationalFilters(filtros)) {
      return (
        hasBaseFilters ||
        [filtros.pais, filtros.requisitosIdioma, filtros.tipoBolsa].some(
          (filter) => filter.length > 0
        )
      );
    }

    return hasBaseFilters || (filtros as NationalFilters).modalidade.length > 0;
  }, [filtros]);

  const accentClasses = {
    focus:
      accentColor === "blue" ? "focus:ring-blue-500" : "focus:ring-amber-500",
    button:
      accentColor === "blue"
        ? "bg-blue-500 text-white hover:bg-blue-600"
        : "bg-amber-500 text-black hover:bg-amber-600",
    label: accentColor === "blue" ? "text-blue-400" : "text-amber-500",
  };

  const inputClasses = `p-2 rounded bg-slate-950 text-white border border-slate-900 focus:outline-none focus:ring-1 ${accentClasses.focus} h-10 w-full text-sm`;

  return (
    <div className="flex flex-col gap-2 font-inter" ref={filterRef}>
      <FilterDropdown
        cols={2}
        label="Tipo de Programa"
        onChange={(value) => handleCheckboxChange("tipo" as keyof T, value)}
        options={
          type === "international"
            ? FILTER_OPTIONS.tiposProgramaInternacional
            : FILTER_OPTIONS.tiposProgramaNacional
        }
        placeholder="Qualquer programa"
        selected={filtros.tipo}
      />

      <FilterDropdown
        cols={1}
        label="Nível de Ensino"
        onChange={(value) =>
          handleCheckboxChange("nivelEnsino" as keyof T, value)
        }
        options={FILTER_OPTIONS.niveisEnsino}
        placeholder="Qualquer nível"
        selected={filtros.nivelEnsino}
      />

      {type === "international" && isInternationalFilters(filtros) && (
        <>
          <FilterDropdown
            cols={2}
            label="Países de Destino"
            onChange={(value) => handleCheckboxChange("pais" as keyof T, value)}
            options={FILTER_OPTIONS.paises}
            placeholder="Todos os países"
            searchable
            searchPlaceholder="Pesquisar país..."
            selected={filtros.pais}
          />

          <FilterDropdown
            cols={2}
            label="Idiomas"
            onChange={(value) =>
              handleCheckboxChange("requisitosIdioma" as keyof T, value)
            }
            options={FILTER_OPTIONS.requisitosIdioma}
            placeholder="Qualquer idioma"
            selected={filtros.requisitosIdioma}
          />
        </>
      )}

      <FilterDropdown
        cols={1}
        label="Taxa de Aplicação"
        onChange={(value) =>
          handleCheckboxChange("taxaAplicacao" as keyof T, value)
        }
        options={FILTER_OPTIONS.taxaAplicacao}
        placeholder="Qualquer taxa"
        selected={filtros.taxaAplicacao}
      />

      {type === "international" && isInternationalFilters(filtros) && (
        <FilterDropdown
          cols={1}
          label="Tipo de Bolsa"
          onChange={(value) =>
            handleCheckboxChange("tipoBolsa" as keyof T, value)
          }
          options={FILTER_OPTIONS.tipoBolsa}
          placeholder="Qualquer bolsa"
          selected={filtros.tipoBolsa}
        />
      )}

      {type === "national" && !isInternationalFilters(filtros) && (
        <FilterDropdown
          cols={1}
          label="Modalidade"
          onChange={(value) =>
            handleCheckboxChange("modalidade" as keyof T, value)
          }
          options={FILTER_OPTIONS.modalidade}
          placeholder="Qualquer modalidade"
          selected={(filtros as NationalFilters).modalidade}
        />
      )}

      <div className="w-full">
        <label className="mb-1 block text-white text-xs" htmlFor="idade">
          <span className={accentClasses.label}>Sua idade</span>
        </label>
        <Input
          className={inputClasses}
          id="idade"
          onChange={handleInputChange}
          placeholder="Ex: 18"
          type="number"
          value={filtros.idade}
        />
      </div>

      <div className="mt-2 hidden md:block">
        <Button
          className={`w-full rounded-lg py-2 font-semibold text-sm transition-colors duration-200 ${isFilterActive() ? accentClasses.button : "cursor-not-allowed bg-slate-900 text-slate-500"}`}
          disabled={!isFilterActive()}
          onClick={() => setFiltros(filtrosIniciais)}
          type="button"
          variant="ghost"
        >
          Limpar Filtros
        </Button>
      </div>
    </div>
  );
}

export default OpportunityFilter;
export type { InternationalFilters, NationalFilters };
