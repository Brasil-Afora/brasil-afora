"use client";

import { useId, useMemo, useState } from "react";
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

interface FilterDropdownProps {
  cols?: 1 | 2;
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  selected: string[];
}

const FilterDropdown = ({
  label,
  placeholder,
  options,
  selected,
  onChange,
  cols = 1,
  searchable = false,
  searchPlaceholder = "Pesquisar...",
}: FilterDropdownProps) => {
  const [searchValue, setSearchValue] = useState("");
  const labelId = useId();
  const valueId = useId();

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

  const dropdownButtonClasses =
    "flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-navy-700 bg-navy-950/60 px-3 text-left font-normal text-[14px] text-slate-100 transition-colors hover:border-navy-600 hover:bg-navy-900 hover:text-white focus-visible:border-signal/70 focus-visible:outline-none focus-visible:ring-0 aria-expanded:border-navy-600 aria-expanded:bg-navy-900 aria-expanded:text-white [&>svg]:shrink-0 [&>svg]:text-mist [&>svg]:transition-transform [&>svg]:duration-200 aria-expanded:[&>svg]:rotate-180";
  const dropdownMenuClasses =
    "rounded-xl border border-navy-700 bg-navy-900 p-2 text-slate-100 shadow-[0_24px_48px_-20px_rgba(0,0,0,0.85)] ring-0 before:hidden";
  const checkboxClasses =
    "border-navy-600 bg-navy-950 data-checked:border-signal data-checked:bg-signal data-checked:text-navy-950";
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
            className="gap-2 py-1.5 pr-2 text-[14px] text-slate-100 hover:bg-navy-800 focus:bg-navy-800 focus:text-white data-highlighted:bg-navy-800 data-highlighted:text-white"
            key={opt}
            value={opt}
          >
            <Checkbox
              checked={selectedOptions.has(opt)}
              className={checkboxClasses}
            />
            <span>{opt}</span>
          </ComboboxItem>
        )}
      </ComboboxCollection>
    </ComboboxGroup>
  );

  return (
    <div className="relative w-full">
      <p className="mb-1.5 block text-[13px] text-mist" id={labelId}>
        {label}
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
              aria-labelledby={`${labelId} ${valueId}`}
              className={dropdownButtonClasses}
              type="button"
              variant="ghost"
            />
          }
        >
          <ComboboxValue>
            {(values) => (
              <span className="min-w-0 flex-1 truncate" id={valueId}>
                {getDisplayText(values as string | string[] | null)}
              </span>
            )}
          </ComboboxValue>
        </ComboboxTrigger>

        <ComboboxContent align="start" className={dropdownMenuClasses}>
          {searchable && (
            <ComboboxInput
              className="mb-2 w-full rounded-md bg-navy-950 text-[13px] text-white placeholder:text-mist"
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={searchPlaceholder}
              showClear
              showTrigger={false}
            />
          )}

          <ComboboxEmpty className="text-mist">
            Nenhuma opção encontrada.
          </ComboboxEmpty>

          {shouldUseScrollArea ? (
            <ScrollArea className="h-56 pr-1 [&_[data-slot=scroll-area-scrollbar]]:mr-0.5 [&_[data-slot=scroll-area-scrollbar]]:w-2.5 [&_[data-slot=scroll-area-scrollbar]]:rounded-full [&_[data-slot=scroll-area-scrollbar]]:bg-navy-800 [&_[data-slot=scroll-area-thumb]]:rounded-full [&_[data-slot=scroll-area-thumb]]:bg-navy-600">
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
