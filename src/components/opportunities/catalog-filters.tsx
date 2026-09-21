"use client";

import { BadgeCheckIcon, ChevronDownIcon } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useId } from "react";
import FilterDropdown from "@/components/ui/filter-dropdown";
import { DEADLINE_WINDOWS } from "./filter-options";

export interface CatalogFilterField<K extends string = string> {
  key: K;
  label: string;
  options: readonly string[];
  placeholder: string;
  searchable?: boolean;
}

export interface CatalogFilterValues {
  apenasVerificadas: boolean;
  idade: string;
  prazo: string;
}

interface CatalogFiltersProps<F extends CatalogFilterValues> {
  fields: CatalogFilterField<Extract<keyof F, string>>[];
  filtros: F;
  setFiltros: Dispatch<SetStateAction<F>>;
}

const fieldClassName =
  "h-10 w-full rounded-lg border border-navy-700 bg-navy-950/60 px-3 text-[14px] text-slate-100 transition-colors placeholder:text-mist hover:border-navy-600 focus-visible:border-signal/70 focus-visible:outline-none";

function CatalogFilters<F extends CatalogFilterValues>({
  fields,
  filtros,
  setFiltros,
}: CatalogFiltersProps<F>) {
  const ageId = useId();
  const deadlineId = useId();
  const verifiedId = useId();

  const toggleOption = (key: keyof F, option: string) => {
    setFiltros((previous) => {
      const current = (previous[key] as string[] | undefined) ?? [];
      const next = current.includes(option)
        ? current.filter((value) => value !== option)
        : [...current, option];
      return { ...previous, [key]: next };
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field) => (
        <FilterDropdown
          cols={field.options.length > 12 ? 2 : 1}
          key={field.key}
          label={field.label}
          onChange={(option) => toggleOption(field.key, option)}
          options={field.options}
          placeholder={field.placeholder}
          searchable={field.searchable}
          searchPlaceholder="Pesquisar…"
          selected={(filtros[field.key] as string[] | undefined) ?? []}
        />
      ))}

      <div>
        <label className="mb-1.5 block text-[13px] text-mist" htmlFor={ageId}>
          Sua idade
        </label>
        <input
          className={`${fieldClassName} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
          id={ageId}
          inputMode="numeric"
          max={99}
          min={5}
          onChange={(event) =>
            setFiltros((previous) => ({
              ...previous,
              idade: event.target.value,
            }))
          }
          placeholder="Ex.: 17"
          type="number"
          value={filtros.idade}
        />
      </div>

      <div>
        <label
          className="mb-1.5 block text-[13px] text-mist"
          htmlFor={deadlineId}
        >
          Prazo de inscrição
        </label>
        <div className="relative">
          <select
            className={`${fieldClassName} cursor-pointer appearance-none pr-9 [color-scheme:dark]`}
            id={deadlineId}
            onChange={(event) =>
              setFiltros((previous) => ({
                ...previous,
                prazo: event.target.value,
              }))
            }
            value={filtros.prazo}
          >
            {DEADLINE_WINDOWS.map((window) => (
              <option key={window.value} value={window.value}>
                {window.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-mist"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-navy-700/70 border-t pt-4">
        <label
          className="flex items-center gap-2 text-[14px] text-slate-100"
          htmlFor={verifiedId}
        >
          <BadgeCheckIcon
            aria-hidden="true"
            className="h-4 w-4 text-verified"
          />
          Apenas verificadas
        </label>
        <button
          aria-checked={filtros.apenasVerificadas}
          className="relative h-6 w-11 shrink-0 cursor-pointer rounded-full border border-navy-600 bg-navy-800 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 aria-checked:border-verified aria-checked:bg-verified"
          id={verifiedId}
          onClick={() =>
            setFiltros((previous) => ({
              ...previous,
              apenasVerificadas: !previous.apenasVerificadas,
            }))
          }
          role="switch"
          type="button"
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${filtros.apenasVerificadas ? "translate-x-5" : ""}`}
          />
        </button>
      </div>
    </div>
  );
}

export default CatalogFilters;
