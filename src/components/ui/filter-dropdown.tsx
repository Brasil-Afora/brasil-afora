"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { ScrollArea } from "@/components/ui/scroll-area";

type AccentColor = "amber" | "blue";

interface FilterDropdownProps {
  accentColor?: AccentColor;
  cols?: 1 | 2;
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  selected: string[];
}

const getAccentClasses = (color: AccentColor) => ({
  label: color === "blue" ? "text-blue-400" : "text-amber-500",
  focus: color === "blue" ? "focus:ring-blue-500" : "focus:ring-amber-500",
  checkbox:
    color === "blue"
      ? "text-blue-500 focus:ring-blue-500"
      : "text-amber-500 focus:ring-amber-500",
});

const FilterDropdown = ({
  label,
  placeholder,
  options,
  selected,
  onChange,
  cols = 1,
  accentColor = "blue",
  searchable = false,
  searchPlaceholder = "Pesquisar...",
}: FilterDropdownProps) => {
  const accent = getAccentClasses(accentColor);
  const [searchValue, setSearchValue] = useState("");

  const selectedOptions = useMemo(() => new Set(selected), [selected]);

  const visibleOptions = useMemo(() => {
    if (!searchable) {
      return options;
    }

    const normalizeSearchText = (value: string) =>
      value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const normalizedSearch = normalizeSearchText(searchValue.trim());
    if (normalizedSearch.length === 0) {
      return options;
    }

    return options.filter((option) =>
      normalizeSearchText(option).includes(normalizedSearch)
    );
  }, [options, searchable, searchValue]);

  const normalizeValues = (value: string | string[] | null | undefined) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string" && value.length > 0) {
      return [value];
    }

    return [];
  };

  const getDisplayText = (
    value: string | string[] | null | undefined
  ): string => {
    const normalizedValues = normalizeValues(value);

    if (normalizedValues.length === 0) {
      return placeholder;
    }

    if (normalizedValues.length === 1) {
      return normalizedValues[0] ?? placeholder;
    }

    return `${normalizedValues.length} selecionados`;
  };

  const handleValueChange = (value: string | string[] | null) => {
    const nextValues = new Set(normalizeValues(value));
    const currentValues = new Set(selected);

    for (const option of options) {
      if (currentValues.has(option) !== nextValues.has(option)) {
        onChange(option);
      }
    }
  };

  const dropdownButtonClasses = `p-2 rounded bg-slate-950 text-white border border-slate-900 hover:text-white focus:text-white aria-expanded:text-white focus:outline-none focus:ring-1 ${accent.focus} h-10 w-full flex justify-between items-center cursor-pointer text-sm`;
  const dropdownMenuClasses =
    "z-20 w-full rounded-lg border border-slate-950 bg-slate-900 p-3 text-white shadow-xl";
  const checkboxClasses = `rounded ${accent.checkbox} bg-slate-950 border-slate-900`;
  const maxVisibleItems = cols === 2 ? 12 : 8;
  const shouldUseScrollArea = visibleOptions.length > maxVisibleItems;

  const optionsItems = (
    <ComboboxGroup
      className={cols === 2 ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}
      items={visibleOptions}
    >
      <ComboboxCollection>
        {(opt) => (
          <ComboboxItem
            className="gap-2 pr-2 text-sm text-white hover:bg-slate-800/80 focus:bg-slate-800/80 focus:text-white data-highlighted:bg-slate-800/80 data-highlighted:text-white"
            key={opt}
            value={opt}
          >
            <Checkbox
              checked={selectedOptions.has(opt)}
              className={checkboxClasses}
            />
            <span className="text-white">{opt}</span>
          </ComboboxItem>
        )}
      </ComboboxCollection>
    </ComboboxGroup>
  );

  return (
    <div className="relative w-full">
      <p className="mb-1 block text-white text-xs">
        <span className={accent.label}>{label}</span>
      </p>

      <Combobox
        items={visibleOptions}
        itemToStringValue={(item) => item}
        multiple
        onValueChange={handleValueChange}
        value={selected}
      >
        <ComboboxTrigger
          className="w-full"
          render={
            <Button
              className={dropdownButtonClasses}
              type="button"
              variant="ghost"
            />
          }
        >
          <ComboboxValue>
            {(values) => (
              <span>{getDisplayText(values as string | string[] | null)}</span>
            )}
          </ComboboxValue>
        </ComboboxTrigger>

        <ComboboxContent align="start" className={dropdownMenuClasses}>
          {searchable && (
            <ComboboxInput
              className="mb-2 w-full rounded bg-slate-900 text-white text-xs placeholder:text-slate-400"
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={searchPlaceholder}
              showClear
              showTrigger={false}
            />
          )}

          <ComboboxEmpty>Nenhuma opção encontrada.</ComboboxEmpty>

          {shouldUseScrollArea ? (
            <ScrollArea className="h-56 pr-1 [&_[data-slot=scroll-area-scrollbar]]:mr-0.5 [&_[data-slot=scroll-area-scrollbar]]:w-2.5 [&_[data-slot=scroll-area-scrollbar]]:rounded-full [&_[data-slot=scroll-area-scrollbar]]:bg-slate-800/80 [&_[data-slot=scroll-area-thumb]]:rounded-full [&_[data-slot=scroll-area-thumb]]:bg-slate-500/95">
              <ComboboxList className="max-h-none overflow-visible p-1">
                {optionsItems}
              </ComboboxList>
            </ScrollArea>
          ) : (
            <ComboboxList>{optionsItems}</ComboboxList>
          )}
        </ComboboxContent>
      </Combobox>
    </div>
  );
};

export default FilterDropdown;
