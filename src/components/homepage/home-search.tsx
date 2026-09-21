"use client";

import { ArrowRightIcon, BadgeCheckIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  useInternationalOpportunitiesQuery,
  useNationalOpportunitiesQuery,
} from "@/hooks/queries/use-opportunity-queries";
import { isOpportunityDeadlineOpen } from "@/lib/date-utils";
import {
  CATALOG_PATHS,
  normalizeSearchText,
  type SearchEntry,
  searchEntries,
  toInternationalSearchEntry,
  toNationalSearchEntry,
} from "./home-data";

const MAX_RESULTS = 6;

const describeResultCount = (count: number, query: string): string => {
  if (count === 0) {
    return `Nenhum resultado para “${query}”`;
  }
  const noun = count === 1 ? "resultado" : "resultados";
  return `${count} ${noun} para “${query}”`;
};

interface HomeSearchProps {
  verifiedEntries: SearchEntry[];
}

const useCatalogEntries = (
  enabled: boolean,
  verifiedEntries: SearchEntry[]
) => {
  const international = useInternationalOpportunitiesQuery({ enabled });
  const national = useNationalOpportunitiesQuery({ enabled });

  const entries = useMemo(() => {
    const verifiedNames = new Set(
      verifiedEntries.map((entry) => normalizeSearchText(entry.name.trim()))
    );
    const isNew = (name: string, deadline: string) =>
      !verifiedNames.has(normalizeSearchText(name.trim())) &&
      isOpportunityDeadlineOpen(deadline);

    return [
      ...verifiedEntries,
      ...(international.data ?? [])
        .filter((item) => isNew(item.nome, item.prazoInscricao))
        .map((item) => toInternationalSearchEntry(item, false)),
      ...(national.data ?? [])
        .filter((item) => isNew(item.nome, item.prazoInscricao))
        .map((item) => toNationalSearchEntry(item, false)),
    ];
  }, [international.data, national.data, verifiedEntries]);

  return {
    entries,
    failed: international.isError || national.isError,
    loading: enabled && (international.isPending || national.isPending),
  };
};

const HomeSearch = ({ verifiedEntries }: HomeSearchProps) => {
  const router = useRouter();
  const inputId = useId();
  const listboxId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [catalogRequested, setCatalogRequested] = useState(false);

  const { entries, failed, loading } = useCatalogEntries(
    catalogRequested,
    verifiedEntries
  );
  const results = useMemo(
    () => searchEntries(entries, query, MAX_RESULTS),
    [entries, query]
  );

  // Close the results once focus leaves the search entirely (click or Tab away).
  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }
    const handleFocusOut = (event: FocusEvent) => {
      if (!form.contains(event.relatedTarget as Node | null)) {
        setIsOpen(false);
      }
    };
    form.addEventListener("focusout", handleFocusOut);
    return () => form.removeEventListener("focusout", handleFocusOut);
  }, []);

  const trimmedQuery = query.trim();
  const showPanel = isOpen && trimmedQuery.length > 0;
  const activeResult = results[activeIndex];

  const openResult = (entry: SearchEntry) => {
    setIsOpen(false);
    router.push(entry.href);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeResult) {
      openResult(activeResult);
      return;
    }
    if (trimmedQuery.length === 0) {
      inputRef.current?.focus();
      return;
    }
    setIsOpen(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "Enter" && showPanel && activeResult) {
      event.preventDefault();
      openResult(activeResult);
      return;
    }
    if (results.length === 0) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    }
  };

  return (
    <search className="relative block">
      <form onSubmit={handleSubmit} ref={formRef}>
        <label className="sr-only" htmlFor={inputId}>
          Buscar oportunidades
        </label>
        <div className="flex h-14 items-stretch overflow-hidden rounded-xl border border-navy-700 bg-navy-800/85 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)] transition-[border-color,box-shadow] duration-300 focus-within:border-signal/70 focus-within:shadow-[0_0_0_4px_rgba(255,155,15,0.14)]">
          <SearchIcon
            aria-hidden="true"
            className="ml-4 h-5 w-5 shrink-0 self-center text-mist sm:ml-5"
          />
          <input
            aria-activedescendant={
              showPanel && activeResult
                ? `${listboxId}-${activeResult.id}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={showPanel}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent px-3 text-[15px] text-white caret-signal outline-none placeholder:text-mist sm:px-4 sm:text-base"
            id={inputId}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(-1);
              setIsOpen(true);
              setCatalogRequested(true);
            }}
            onFocus={() => {
              setCatalogRequested(true);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="País, instituição ou programa"
            ref={inputRef}
            role="combobox"
            type="text"
            value={query}
          />
          <button
            className="shrink-0 bg-signal px-4 font-semibold text-[15px] text-navy-950 transition-colors duration-200 hover:bg-signal-strong focus-visible:bg-signal-strong focus-visible:outline-none sm:px-8"
            type="submit"
          >
            Buscar
          </button>
        </div>

        {showPanel && (
          <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-xl border border-navy-700 bg-navy-900 shadow-[0_28px_60px_-20px_rgba(0,0,0,0.85)]">
            <p className="border-navy-700 border-b px-4 py-2.5 text-[13px] text-mist">
              {loading && results.length === 0
                ? "Buscando no catálogo…"
                : describeResultCount(results.length, trimmedQuery)}
            </p>

            <div
              aria-label="Resultados da busca"
              className="max-h-[22rem] overflow-y-auto py-1"
              id={listboxId}
              role="listbox"
            >
              {results.map((entry, index) => (
                <div
                  aria-selected={index === activeIndex}
                  className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors ${index === activeIndex ? "bg-navy-700/60" : "hover:bg-navy-800"}`}
                  id={`${listboxId}-${entry.id}`}
                  key={entry.id}
                  onClick={() => openResult(entry)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      openResult(entry);
                    }
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="option"
                  tabIndex={-1}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[15px] text-white">
                      {entry.name}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-mist">
                      {entry.scope === "international"
                        ? "Internacional"
                        : "Nacional"}{" "}
                      · {entry.place} · {entry.kind} · Prazo {entry.deadline}
                    </p>
                  </div>
                  {entry.verified && (
                    <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-verified/15 px-2 py-0.5 font-semibold text-[11px] text-verified">
                      <BadgeCheckIcon
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                      />
                      Verificada
                    </span>
                  )}
                </div>
              ))}
            </div>

            {results.length === 0 && !loading && (
              <p className="px-4 pb-3 text-[13px] text-mist">
                Tente o nome de um país, de uma instituição ou de um tipo de
                programa, como “Canadá”, “olimpíada” ou “mestrado”.
              </p>
            )}
            {failed && (
              <p className="px-4 pb-3 text-[13px] text-signal-strong">
                O catálogo completo não respondeu agora; os resultados mostram
                só a seleção verificada.
              </p>
            )}

            <div className="flex flex-wrap gap-x-6 gap-y-2 border-navy-700 border-t px-4 py-3 text-[13px]">
              <Link
                className="inline-flex items-center gap-1.5 text-mist transition-colors hover:text-white"
                href={CATALOG_PATHS.international}
              >
                Catálogo internacional
                <ArrowRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
              <Link
                className="inline-flex items-center gap-1.5 text-mist transition-colors hover:text-white"
                href={CATALOG_PATHS.national}
              >
                Catálogo nacional
                <ArrowRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </form>
    </search>
  );
};

export default HomeSearch;
