"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { HighlightCollection, HomeHighlight } from "@/lib/home-highlights";
import { OpportunityCard } from "./opportunity-card";

const PREVIEW_COUNT = 4;
/** Phones show fewer cards before "Ver todas" so the featured section stays close. */
const MOBILE_PREVIEW_COUNT = 2;

type Tab = "all" | HighlightCollection;

const TAB_LABELS: Record<Tab, string> = {
  all: "Todas",
  international: "Internacionais",
  national: "Nacionais",
  programs: "Programas e Bolsas",
};

const TAB_ORDER: Tab[] = ["all", "international", "national", "programs"];

interface HighlightBlockProps {
  description: string;
  emptyText: string;
  items: HomeHighlight[];
  title: string;
}

const HighlightBlock = ({
  description,
  emptyText,
  items,
  title,
}: HighlightBlockProps) => {
  const headingId = useId();
  const listId = useId();
  const [tab, setTab] = useState<Tab>("all");
  const [expanded, setExpanded] = useState(false);

  const counts = useMemo(() => {
    const result: Record<Tab, number> = {
      all: new Set(items.map((item) => item.identity)).size,
      international: 0,
      national: 0,
      programs: 0,
    };
    for (const item of items) {
      result[item.collection] += 1;
    }
    return result;
  }, [items]);

  const visibleTabs = TAB_ORDER.filter(
    (key) => key === "all" || counts[key] > 0
  );
  const filtered = useMemo(() => {
    if (tab !== "all") {
      return items.filter((item) => item.collection === tab);
    }
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.identity)) {
        return false;
      }
      seen.add(item.identity);
      return true;
    });
  }, [items, tab]);
  const shown = expanded ? filtered : filtered.slice(0, PREVIEW_COUNT);

  const selectTab = (key: Tab) => {
    setTab(key);
    setExpanded(false);
  };

  return (
    <section aria-labelledby={headingId} className="mt-10 first:mt-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3
            className="text-balance font-bold text-[1.375rem] text-white leading-tight sm:text-[1.5rem]"
            id={headingId}
          >
            {title}
            <span className="ml-2 align-middle font-semibold text-[15px] text-mist tabular-nums">
              <span className="sr-only">: </span>
              {counts.all}
              <span className="sr-only"> oportunidades</span>
            </span>
          </h3>
          <p className="mt-1.5 max-w-2xl text-[15px] text-mist leading-relaxed">
            {description}
          </p>
        </div>
        {visibleTabs.length > 2 && (
          <div
            aria-label={`Filtrar ${title.toLowerCase()} por catálogo`}
            className="flex flex-wrap gap-2"
            role="toolbar"
          >
            {visibleTabs.map((key) => (
              <button
                aria-controls={listId}
                aria-pressed={tab === key}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-navy-700 bg-navy-900 px-3 text-[13px] text-slate-100 transition-colors hover:border-signal/60 aria-pressed:border-signal aria-pressed:bg-signal/15"
                key={key}
                onClick={() => selectTab(key)}
                type="button"
              >
                {TAB_LABELS[key]}
                <span className="text-mist tabular-nums">{counts[key]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length > 0 ? (
        <>
          <ul
            className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 xl:grid-cols-4"
            id={listId}
          >
            {shown.map((item, index) => (
              <li
                className={`min-w-0 ${!expanded && index >= MOBILE_PREVIEW_COUNT ? "hidden sm:flex" : "flex"}`}
                key={item.id}
              >
                <OpportunityCard opportunity={item} />
              </li>
            ))}
          </ul>
          {filtered.length > MOBILE_PREVIEW_COUNT && (
            <div
              className={`mt-5 justify-center ${filtered.length > PREVIEW_COUNT ? "flex" : "flex sm:hidden"}`}
            >
              <button
                aria-controls={listId}
                aria-expanded={expanded}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-navy-600 px-5 font-semibold text-[15px] text-white transition-colors hover:border-signal/60 hover:bg-navy-800"
                onClick={() => setExpanded((value) => !value)}
                type="button"
              >
                {expanded ? (
                  <>
                    Mostrar menos
                    <ChevronUpIcon aria-hidden="true" className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Ver todas as {filtered.length}
                    <ChevronDownIcon aria-hidden="true" className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        <p
          className="mt-6 rounded-xl border border-navy-700 bg-navy-900/70 px-5 py-6 text-[15px] text-mist"
          id={listId}
        >
          {emptyText}
        </p>
      )}
    </section>
  );
};

const HomeHighlights = ({
  closing,
  fresh,
}: {
  closing: HomeHighlight[];
  fresh: HomeHighlight[];
}) => {
  if (fresh.length === 0 && closing.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="novidades-titulo"
      className="mx-auto w-full max-w-[84rem] px-5 pt-10 sm:px-8 lg:pt-11"
    >
      <h2 className="sr-only" id="novidades-titulo">
        Novidades e prazos do catálogo
      </h2>
      {fresh.length > 0 && (
        <HighlightBlock
          description="Oportunidades que entraram no catálogo nas últimas duas semanas, das mais recentes para as mais antigas."
          emptyText="Nenhuma oportunidade nova nas últimas três semanas."
          items={fresh}
          title="Novas oportunidades"
        />
      )}
      {closing.length > 0 && (
        <HighlightBlock
          description="Inscrições que se encerram nos próximos 21 dias, do prazo mais próximo ao mais distante."
          emptyText="Nenhum prazo se encerra nos próximos 21 dias."
          items={closing}
          title="Prestes a fechar"
        />
      )}
    </section>
  );
};

export default HomeHighlights;
