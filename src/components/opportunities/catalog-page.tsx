"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  ChevronDownIcon,
  FilterIcon,
  LayoutGridIcon,
  ListIcon,
  RotateCwIcon,
  SearchXIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useId, useRef, useState } from "react";
import useIsClient from "@/hooks/use-is-client";
import useLocalStorage from "@/hooks/use-local-storage";
import useSessionStorage from "@/hooks/use-session-storage";
import type { GeoPoint } from "@/lib/geo";
import CatalogFilters, {
  type CatalogFilterField,
  type CatalogFilterValues,
} from "./catalog-filters";
import CatalogHeader, { type CatalogHeaderConfig } from "./catalog-header";
import { CatalogCard, CatalogCardSkeleton, CatalogRow } from "./catalog-items";
import {
  type CatalogItem,
  type CatalogSort,
  sortCatalogItems,
} from "./catalog-model";
import CatalogPagination from "./catalog-pagination";
import { DEADLINE_WINDOWS } from "./filter-options";

const PAGE_SIZE = 9;
const LOADING_PLACEHOLDERS = 3;
// The first row is above the fold on desktop; load its covers right away.
const EAGER_CARDS = 3;
const SUBMISSION_FORM_URL = "https://forms.gle/dJrD1eg4y3VHGFap9";

export interface CatalogSortOption {
  label: string;
  value: CatalogSort;
}

interface CatalogCopyBlock {
  body: string;
  title: string;
}

/**
 * What a catalog lists and how it names it. The shell (header, filter panel,
 * toolbar, pagination, mobile sheet) is shared; each catalog brings its own
 * card, row, order and words.
 */
export interface CatalogPresentation<T> {
  contribute: CatalogCopyBlock;
  /** Result count heading: [singular, plural]. */
  count: [string, string];
  empty: {
    /** Filters exclude everything. */
    filtered: CatalogCopyBlock;
    /** Nothing is listed at all. */
    none: CatalogCopyBlock;
  };
  keyOf: (item: T) => string;
  loading: string;
  /** Where the listed items take place; omitted for catalogs off the map. */
  pinsOf?: (items: T[]) => GeoPoint[];
  renderCard: (item: T, eager: boolean) => ReactNode;
  renderRow: (item: T) => ReactNode;
  sortItems: (items: T[], sort: CatalogSort) => T[];
  sortOptions: CatalogSortOption[];
}

const OPPORTUNITY_EMPTY_BODY =
  "Tente remover um filtro ou ampliar o prazo. Novas oportunidades entram no catálogo com frequência.";

/** The international and national catalogs. */
export const OPPORTUNITY_PRESENTATION: CatalogPresentation<CatalogItem> = {
  contribute: {
    title: "Conhece uma oportunidade que não está aqui?",
    body: "Envie pelo formulário e ajude outros estudantes a encontrá-la.",
  },
  count: ["oportunidade encontrada", "oportunidades encontradas"],
  empty: {
    filtered: {
      title: "Nenhuma oportunidade com esses filtros",
      body: OPPORTUNITY_EMPTY_BODY,
    },
    none: {
      title: "Nenhuma oportunidade com esses filtros",
      body: OPPORTUNITY_EMPTY_BODY,
    },
  },
  keyOf: (item) => `${item.scope}-${item.id}`,
  loading: "Carregando oportunidades…",
  pinsOf: (items) => items.flatMap((item) => item.locations),
  renderCard: (item, eager) => <CatalogCard eager={eager} item={item} />,
  renderRow: (item) => <CatalogRow item={item} />,
  sortItems: sortCatalogItems,
  sortOptions: [
    { value: "relevancia", label: "Verificadas primeiro" },
    { value: "prazo", label: "Prazo mais próximo" },
    { value: "nome", label: "Nome (A–Z)" },
  ],
};

type CatalogView = "grid" | "list";

interface CatalogStatus {
  failed: boolean;
  loading: boolean;
  retry: () => void;
}

interface CatalogPageProps<F extends CatalogFilterValues, T> {
  clearFilters: () => void;
  countFor: (draft: F) => number;
  crossLink: { href: string; label: string };
  fields: CatalogFilterField<Extract<keyof F, string>>[];
  filtros: F;
  filtrosTemporarios: F;
  header: CatalogHeaderConfig;
  initialFilters: F;
  items: T[];
  presentation: CatalogPresentation<T>;
  setFiltros: Dispatch<SetStateAction<F>>;
  setFiltrosTemporarios: Dispatch<SetStateAction<F>>;
  sortStorageKey: string;
  status: CatalogStatus;
}

interface AppliedChip {
  key: string;
  label: string;
  value: string | null;
}

const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

function appliedChips<F extends CatalogFilterValues>(
  filtros: F,
  fields: CatalogFilterField[]
): AppliedChip[] {
  const chips: AppliedChip[] = [];
  for (const field of fields) {
    const values =
      (filtros[field.key as keyof F] as string[] | undefined) ?? [];
    for (const value of values) {
      chips.push({ key: field.key, label: value, value });
    }
  }
  if (filtros.idade) {
    chips.push({ key: "idade", label: `Idade: ${filtros.idade}`, value: null });
  }
  const deadline = DEADLINE_WINDOWS.find(
    (window) => window.value === filtros.prazo
  );
  if (filtros.prazo && deadline) {
    chips.push({ key: "prazo", label: deadline.label, value: null });
  }
  if (filtros.apenasVerificadas) {
    chips.push({
      key: "apenasVerificadas",
      label: "Apenas verificadas",
      value: null,
    });
  }
  return chips;
}

const SelectSort = ({
  onChange,
  options,
  value,
}: {
  onChange: (sort: CatalogSort) => void;
  options: CatalogSortOption[];
  value: CatalogSort;
}) => {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:flex-none">
      <label
        className="hidden whitespace-nowrap text-[14px] text-mist sm:block"
        htmlFor={id}
      >
        Ordenar por
      </label>
      <div className="relative min-w-0 flex-1 sm:flex-none">
        <select
          aria-label="Ordenar por"
          className="h-10 w-full cursor-pointer appearance-none truncate rounded-lg border border-navy-700 bg-navy-900 pr-9 pl-3 text-[14px] text-slate-100 transition-colors [color-scheme:dark] hover:border-navy-600 focus-visible:border-signal/70 focus-visible:outline-none"
          id={id}
          onChange={(event) => onChange(event.target.value as CatalogSort)}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-mist"
        />
      </div>
    </div>
  );
};

const VIEW_OPTIONS = [
  { view: "grid", label: "Em grade", Icon: LayoutGridIcon },
  { view: "list", label: "Em lista", Icon: ListIcon },
] as const;

const ViewToggle = ({
  onChange,
  value,
}: {
  onChange: (view: CatalogView) => void;
  value: CatalogView;
}) => (
  <fieldset className="flex shrink-0 rounded-lg border border-navy-700 p-0.5">
    <legend className="sr-only">Visualização</legend>
    {VIEW_OPTIONS.map(({ view, label, Icon }) => (
      <button
        aria-label={label}
        aria-pressed={value === view}
        className="flex h-8 w-9 items-center justify-center rounded-md text-mist transition-colors hover:text-white aria-pressed:bg-navy-800 aria-pressed:text-white"
        key={view}
        onClick={() => onChange(view)}
        type="button"
      >
        <Icon aria-hidden="true" className="h-4 w-4" />
      </button>
    ))}
  </fieldset>
);

const ContributeCard = ({
  className = "",
  copy,
}: {
  className?: string;
  copy: CatalogCopyBlock;
}) => (
  <aside
    className={`rounded-xl border border-navy-700 bg-navy-900/60 p-5 ${className}`}
  >
    <h2 className="font-semibold text-[16px] text-white">{copy.title}</h2>
    <p className="mt-1.5 text-[14px] text-mist leading-relaxed">{copy.body}</p>
    <a
      className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-signal/70 px-5 font-semibold text-[14px] text-white transition-colors duration-200 hover:bg-signal hover:text-navy-950"
      href={SUBMISSION_FORM_URL}
      rel="noopener noreferrer"
      target="_blank"
    >
      Enviar oportunidade
      <span className="sr-only">(abre em nova aba)</span>
      <ArrowUpRightIcon aria-hidden="true" className="h-4 w-4" />
    </a>
  </aside>
);

const AppliedChips = ({
  chips,
  onClear,
  onRemove,
}: {
  chips: AppliedChip[];
  onClear: () => void;
  onRemove: (chip: AppliedChip) => void;
}) =>
  chips.length > 0 ? (
    <ul
      aria-label="Filtros aplicados"
      className="mt-4 flex flex-wrap items-center gap-2"
    >
      {chips.map((chip) => (
        <li key={`${chip.key}-${chip.label}`}>
          <button
            aria-label={`Remover filtro ${chip.label}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-navy-700 bg-navy-900 pr-2 pl-3 text-[13px] text-slate-100 transition-colors hover:border-signal/60"
            onClick={() => onRemove(chip)}
            type="button"
          >
            {chip.label}
            <XIcon aria-hidden="true" className="h-3.5 w-3.5 text-mist" />
          </button>
        </li>
      ))}
      <li>
        <button
          className="h-8 px-2 text-[13px] text-mist underline-offset-4 hover:text-white hover:underline"
          onClick={onClear}
          type="button"
        >
          Limpar tudo
        </button>
      </li>
    </ul>
  ) : null;

const FailedNotice = ({ onRetry }: { onRetry: () => void }) => (
  <div
    className="mt-5 flex flex-col gap-3 rounded-xl border border-signal/40 bg-signal/5 px-4 py-3.5 text-[14px] text-slate-100 sm:flex-row sm:items-center sm:justify-between"
    role="status"
  >
    <p>
      O catálogo completo não carregou agora. Por enquanto, você vê só a seleção
      verificada.
    </p>
    <button
      className="inline-flex h-9 shrink-0 items-center gap-2 self-start rounded-lg border border-signal/60 px-3.5 font-semibold text-[13px] transition-colors hover:bg-signal hover:text-navy-950 sm:self-auto"
      onClick={onRetry}
      type="button"
    >
      <RotateCwIcon aria-hidden="true" className="h-4 w-4" />
      Tentar de novo
    </button>
  </div>
);

const EmptyResults = ({
  canClear,
  copy,
  crossLink,
  onClear,
}: {
  canClear: boolean;
  copy: CatalogCopyBlock;
  crossLink: { href: string; label: string };
  onClear: () => void;
}) => (
  <div className="flex flex-col items-center rounded-xl border border-navy-700 border-dashed px-6 py-14 text-center">
    <span className="flex h-14 w-14 items-center justify-center rounded-full border border-navy-600 text-mist">
      <SearchXIcon aria-hidden="true" className="h-6 w-6" />
    </span>
    <h3 className="mt-4 font-bold text-[20px] text-white">{copy.title}</h3>
    <p className="mt-2 max-w-md text-[15px] text-mist leading-relaxed">
      {copy.body}
    </p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      {canClear && (
        <button
          className="inline-flex h-10 items-center rounded-xl bg-signal px-5 font-semibold text-[14px] text-navy-950 transition-colors hover:bg-signal-strong"
          onClick={onClear}
          type="button"
        >
          Limpar filtros
        </button>
      )}
      <Link
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-navy-600 px-5 font-semibold text-[14px] text-white transition-colors hover:border-signal/60"
        href={crossLink.href}
      >
        {crossLink.label}
        <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  </div>
);

function ResultList<T>({
  items,
  placeholders,
  presentation,
  view,
}: {
  items: T[];
  placeholders: number;
  presentation: CatalogPresentation<T>;
  view: CatalogView;
}) {
  return (
    <ul
      className={
        view === "grid"
          ? "grid grid-cols-[repeat(auto-fill,minmax(min(100%,16.5rem),1fr))] gap-5"
          : "flex flex-col gap-3"
      }
    >
      {items.map((item, index) => (
        <li className="flex min-w-0" key={presentation.keyOf(item)}>
          {view === "grid" ? (
            presentation.renderCard(item, index < EAGER_CARDS)
          ) : (
            <div className="w-full">{presentation.renderRow(item)}</div>
          )}
        </li>
      ))}
      {Array.from({ length: placeholders }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity.
        <li className="flex" key={`placeholder-${index}`}>
          <div className="w-full">
            <CatalogCardSkeleton />
          </div>
        </li>
      ))}
    </ul>
  );
}

function FilterSheet({
  children,
  draftCount,
  onApply,
  onClear,
  onOpenChange,
  open,
}: {
  children: ReactNode;
  draftCount: number;
  onApply: () => void;
  onClear: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/60 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-2xl border-navy-700 border-t bg-navy-900 font-reading text-slate-100 shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.8)] outline-none transition-transform duration-300 ease-out data-ending-style:translate-y-full data-starting-style:translate-y-full">
          <div className="flex items-center justify-between border-navy-700 border-b px-5 py-4">
            <DialogPrimitive.Title className="font-bold text-[18px] text-white">
              Filtros
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Fechar filtros"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-mist hover:bg-navy-800 hover:text-white"
            >
              <XIcon aria-hidden="true" className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
          <div className="flex gap-3 border-navy-700 border-t px-5 py-4">
            <button
              className="h-11 flex-1 rounded-xl border border-navy-600 font-semibold text-[15px] text-white transition-colors hover:bg-navy-800"
              onClick={onClear}
              type="button"
            >
              Limpar
            </button>
            <button
              className="h-11 flex-[2] rounded-xl bg-signal font-semibold text-[15px] text-navy-950 transition-colors hover:bg-signal-strong"
              onClick={onApply}
              type="button"
            >
              Mostrar {plural(draftCount, "resultado", "resultados")}
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function CatalogPage<F extends CatalogFilterValues, T>({
  clearFilters,
  countFor,
  crossLink,
  fields,
  filtros,
  filtrosTemporarios,
  header,
  initialFilters,
  items,
  presentation,
  setFiltros,
  setFiltrosTemporarios,
  sortStorageKey,
  status,
}: CatalogPageProps<F, T>) {
  const isClient = useIsClient();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useSessionStorage<CatalogSort>(
    sortStorageKey,
    "relevancia"
  );
  const [view, setView] = useLocalStorage<CatalogView>(
    "catalogoVisualizacao",
    "grid"
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  // The page resets whenever the filters or the order change.
  const signature = `${JSON.stringify(filtros)}|${sort}`;
  const [pageState, setPageState] = useState({ page: 1, signature });
  const requestedPage = pageState.signature === signature ? pageState.page : 1;

  const sorted = presentation.sortItems(items, sort);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const firstIndex = (page - 1) * PAGE_SIZE;
  const lastIndex = Math.min(firstIndex + PAGE_SIZE, sorted.length);
  const chips = appliedChips(filtros, fields);

  // Before hydration (and while nothing has loaded) only placeholders show;
  // the verified selection renders at once and the catalog fills in after it.
  const waitingForFirstItems = status.loading && items.length === 0;
  const ready = isClient && !waitingForFirstItems;
  let placeholders = 0;
  if (!ready) {
    placeholders = PAGE_SIZE;
  } else if (status.loading && page === pageCount) {
    placeholders = LOADING_PLACEHOLDERS;
  }

  const goToPage = (next: number) => {
    setPageState({ page: next, signature });
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const removeChip = (chip: AppliedChip) => {
    setFiltros((previous) => {
      const key = chip.key as keyof F;
      const current = previous[key];
      if (Array.isArray(current)) {
        return {
          ...previous,
          [key]: current.filter((value) => value !== chip.value),
        };
      }
      return { ...previous, [key]: initialFilters[key] };
    });
  };

  const openSheet = () => {
    setFiltrosTemporarios(filtros);
    setSheetOpen(true);
  };

  const applySheet = () => {
    setFiltros(filtrosTemporarios);
    setSheetOpen(false);
  };

  const pins = ready && presentation.pinsOf ? presentation.pinsOf(items) : [];

  return (
    <div className="min-h-screen bg-navy-950 font-reading text-slate-100">
      <CatalogHeader config={header} pins={pins} />

      <div className="mx-auto grid w-full max-w-[84rem] gap-8 px-5 pt-8 pb-16 sm:px-8 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-10">
        <div className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-5">
            <section
              aria-labelledby="filtros-titulo"
              className="rounded-xl border border-navy-700 bg-navy-900/60 p-5"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2
                  className="flex items-center gap-2 font-bold text-[18px] text-white"
                  id="filtros-titulo"
                >
                  <FilterIcon
                    aria-hidden="true"
                    className={`h-4 w-4 ${header.accentClassName}`}
                  />
                  Filtros
                </h2>
                <button
                  className={`text-[13px] underline-offset-4 transition-opacity hover:underline disabled:cursor-default disabled:no-underline disabled:opacity-40 ${header.accentClassName}`}
                  disabled={chips.length === 0}
                  onClick={clearFilters}
                  type="button"
                >
                  Limpar filtros
                </button>
              </div>
              <CatalogFilters
                fields={fields}
                filtros={filtros}
                setFiltros={setFiltros}
              />
            </section>
            <ContributeCard copy={presentation.contribute} />
          </div>
        </div>

        <div className="min-w-0 scroll-mt-24" ref={resultsRef}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              aria-live="polite"
              className="font-bold text-[20px] text-white tabular-nums"
            >
              {ready
                ? plural(items.length, ...presentation.count)
                : presentation.loading}
            </h2>
            <div className="flex w-full items-center gap-2.5 sm:w-auto">
              <button
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-navy-700 bg-navy-900 px-3.5 text-[14px] text-slate-100 transition-colors hover:border-navy-600 lg:hidden"
                onClick={openSheet}
                type="button"
              >
                <SlidersHorizontalIcon aria-hidden="true" className="h-4 w-4" />
                Filtros
                {chips.length > 0 && (
                  <span className="rounded-full bg-signal px-1.5 font-semibold text-[12px] text-navy-950 tabular-nums">
                    {chips.length}
                  </span>
                )}
              </button>
              <SelectSort
                onChange={setSort}
                options={presentation.sortOptions}
                value={sort}
              />
              <ViewToggle onChange={setView} value={view} />
            </div>
          </div>

          <AppliedChips
            chips={chips}
            onClear={clearFilters}
            onRemove={removeChip}
          />
          {status.failed && <FailedNotice onRetry={status.retry} />}

          <div className="mt-6">
            {ready && items.length === 0 ? (
              <EmptyResults
                canClear={chips.length > 0}
                copy={
                  chips.length > 0
                    ? presentation.empty.filtered
                    : presentation.empty.none
                }
                crossLink={crossLink}
                onClear={clearFilters}
              />
            ) : (
              <ResultList
                items={ready ? sorted.slice(firstIndex, lastIndex) : []}
                placeholders={placeholders}
                presentation={presentation}
                view={view}
              />
            )}
          </div>

          {ready && items.length > 0 && (
            <div className="mt-8 flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
              <p className="text-[14px] text-mist tabular-nums">
                Mostrando {firstIndex + 1}–{lastIndex} de{" "}
                {plural(sorted.length, "resultado", "resultados")}
              </p>
              {pageCount > 1 && (
                <CatalogPagination
                  onChange={goToPage}
                  page={page}
                  pageCount={pageCount}
                />
              )}
            </div>
          )}

          <ContributeCard
            className="mt-10 lg:hidden"
            copy={presentation.contribute}
          />

          {header.backdrop.kind === "map" && (
            <p className="mt-10 text-[12px] text-mist-dim">
              Localizações do mapa:{" "}
              <a
                className="underline decoration-navy-600 underline-offset-2 hover:text-slate-200"
                href="https://www.geonames.org/"
                rel="noopener noreferrer"
                target="_blank"
              >
                GeoNames
              </a>{" "}
              (CC BY 4.0).
            </p>
          )}
        </div>
      </div>

      <FilterSheet
        draftCount={countFor(filtrosTemporarios)}
        onApply={applySheet}
        onClear={() => setFiltrosTemporarios(initialFilters)}
        onOpenChange={setSheetOpen}
        open={sheetOpen}
      >
        <CatalogFilters
          fields={fields}
          filtros={filtrosTemporarios}
          setFiltros={setFiltrosTemporarios}
        />
      </FilterSheet>
    </div>
  );
}

export default CatalogPage;
