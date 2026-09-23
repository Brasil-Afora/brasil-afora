"use client";

import { ArrowDownIcon, BadgeCheckIcon, SearchIcon, XIcon } from "lucide-react";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import FilterDropdown from "@/components/ui/filter-dropdown";
import {
  useInternationalOpportunitiesQuery,
  useNationalOpportunitiesQuery,
} from "@/hooks/queries/use-opportunity-queries";
import type { LocationsById } from "@/server/geo/opportunity-locations";
import {
  applyMapFilters,
  buildMapItems,
  countActiveFilters,
  countryByIso,
  EMPTY_FILTERS,
  filterOptions,
  type MapFilters,
  pinsOf,
  soonestOf,
  summarizeCountries,
} from "./map-data";
import MapPanel from "./map-panel";

// Leaflet needs the browser; the rest of the page renders around it.
const OpportunityMap = dynamic(() => import("./opportunity-map"), {
  loading: () => <div className="h-full w-full animate-pulse bg-[#0b0d20]" />,
  ssr: false,
});

const COUNTRY_PARAM = "pais";

const subscribeNoop = () => () => undefined;

/** False during prerender and hydration, true once running in the browser. */
const useIsClient = (): boolean =>
  useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

/** The chosen country lives in the URL (?pais=ca), so a view can be shared. */
const useCountryParam = () => {
  const [iso, setIso] = useState<string | null>(null);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get(
      COUNTRY_PARAM
    );
    setIso(value ? value.toUpperCase() : null);
  }, []);

  const select = useCallback((next: string | null) => {
    setIso(next);
    const url = new URL(window.location.href);
    if (next) {
      url.searchParams.set(COUNTRY_PARAM, next.toLowerCase());
    } else {
      url.searchParams.delete(COUNTRY_PARAM);
    }
    window.history.replaceState(null, "", url);
  }, []);

  return [iso, select] as const;
};

const fieldClassName =
  "h-10 w-full rounded-lg border border-navy-700 bg-navy-950/60 px-3 text-[14px] text-slate-100 transition-colors placeholder:text-mist hover:border-navy-600 focus-visible:border-signal/70 focus-visible:outline-none";

const toggle = (values: string[], value: string): string[] =>
  values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];

interface MapExplorerProps {
  /** Locations of the verified selection, resolved on the server. */
  verifiedLocations: { international: LocationsById; national: LocationsById };
}

const MapExplorer = ({ verifiedLocations }: MapExplorerProps) => {
  const isClient = useIsClient();
  const internationalQuery = useInternationalOpportunitiesQuery();
  const nationalQuery = useNationalOpportunitiesQuery();
  const [filters, setFilters] = useState<MapFilters>(EMPTY_FILTERS);
  const [selectedIso, select] = useCountryParam();
  const panelRef = useRef<HTMLElement>(null);
  const searchId = useId();
  const verifiedId = useId();

  const items = useMemo(
    () =>
      isClient
        ? buildMapItems({
            international: internationalQuery.data ?? [],
            national: nationalQuery.data ?? [],
            now: new Date(),
            verifiedLocations,
          })
        : [],
    [isClient, internationalQuery.data, nationalQuery.data, verifiedLocations]
  );
  const filtered = useMemo(
    () => applyMapFilters(items, filters),
    [items, filters]
  );
  const { countries, unplaced } = useMemo(
    () => summarizeCountries(filtered),
    [filtered]
  );
  const pins = useMemo(() => pinsOf(filtered), [filtered]);
  const soonest = useMemo(() => soonestOf(filtered), [filtered]);
  const options = useMemo(() => filterOptions(items), [items]);
  const everyCountry = useMemo(
    () => summarizeCountries(items).countries,
    [items]
  );

  const selected = selectedIso
    ? (everyCountry.find((country) => country.iso === selectedIso) ??
      countryByIso(selectedIso))
    : null;

  // Type chips count under every filter but the type one, so choosing a
  // type doesn't make the other choices disappear.
  const typeCounts = useMemo(() => {
    if (!selectedIso) {
      return [];
    }
    const base = applyMapFilters(items, { ...filters, types: [] });
    return (
      summarizeCountries(base).countries.find(
        (country) => country.iso === selectedIso
      )?.types ?? []
    );
  }, [filters, items, selectedIso]);

  // A new country starts at the top of its list.
  const choose = (iso: string | null) => {
    select(iso);
    panelRef.current?.scrollTo({ top: 0 });
  };

  const activeCount = countActiveFilters(filters);
  const clearFilters = () => setFilters(EMPTY_FILTERS);

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="lg:w-[22rem]">
          <label
            className="mb-1.5 block text-[13px] text-mist"
            htmlFor={searchId}
          >
            Buscar
          </label>
          <div className="relative">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-mist"
            />
            <input
              autoComplete="off"
              className={`${fieldClassName} pl-9 [&::-webkit-search-cancel-button]:hidden`}
              id={searchId}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  query: event.target.value,
                }))
              }
              placeholder="País, cidade, instituição ou programa"
              type="search"
              value={filters.query}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:flex">
          <div className="lg:w-52">
            <FilterDropdown
              label="Tipo"
              onChange={(option) =>
                setFilters((previous) => ({
                  ...previous,
                  types: toggle(previous.types, option),
                }))
              }
              options={options.types}
              placeholder="Todos"
              selected={filters.types}
            />
          </div>
          <div className="lg:w-52">
            <FilterDropdown
              label="Nível de ensino"
              onChange={(option) =>
                setFilters((previous) => ({
                  ...previous,
                  levels: toggle(previous.levels, option),
                }))
              }
              options={options.levels}
              placeholder="Todos"
              selected={filters.levels}
            />
          </div>
        </div>

        <div className="flex h-10 items-center justify-between gap-3 lg:justify-start lg:px-2">
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
            aria-checked={filters.verifiedOnly}
            className="relative h-6 w-11 shrink-0 cursor-pointer rounded-full border border-navy-600 bg-navy-800 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 aria-checked:border-verified aria-checked:bg-verified"
            id={verifiedId}
            onClick={() =>
              setFilters((previous) => ({
                ...previous,
                verifiedOnly: !previous.verifiedOnly,
              }))
            }
            role="switch"
            type="button"
          >
            <span
              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${filters.verifiedOnly ? "translate-x-5" : ""}`}
            />
          </button>
        </div>

        {activeCount > 0 && (
          <button
            className="inline-flex h-10 items-center gap-1.5 self-start rounded-lg px-2 text-[14px] text-mist transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-signal lg:ml-auto lg:self-auto"
            onClick={clearFilters}
            type="button"
          >
            <XIcon aria-hidden="true" className="h-4 w-4" />
            Limpar filtros
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        {/* `isolate` keeps Leaflet's pane z-indexes (400+) and the map's own
            controls (500) inside this box. Without it they outrank the sticky
            header and the mobile drawer (z-50) and paint over both. */}
        <div className="relative isolate h-[62svh] min-h-[22rem] overflow-hidden rounded-2xl border border-navy-700 lg:h-[clamp(32rem,calc(100svh-13rem),40rem)]">
          <OpportunityMap
            countries={countries}
            onSelect={choose}
            pins={pins}
            selected={selected}
          />
          {selected && (
            <button
              className="absolute top-4 right-4 z-[500] inline-flex h-10 items-center gap-2 rounded-full bg-signal px-4 font-semibold text-[14px] text-navy-950 shadow-[0_12px_28px_-12px_rgba(0,0,0,0.9)] lg:hidden"
              onClick={() =>
                panelRef.current?.scrollIntoView({ behavior: "smooth" })
              }
              type="button"
            >
              Ver lista
              <ArrowDownIcon aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>

        <aside
          aria-label="Destinos e oportunidades"
          className="scroll-mt-20 rounded-2xl border border-navy-700 bg-navy-900/60 p-5 lg:h-[clamp(32rem,calc(100svh-13rem),40rem)] lg:overflow-y-auto"
          ref={panelRef}
        >
          <MapPanel
            activeTypes={filters.types}
            countries={countries}
            failed={Boolean(internationalQuery.error || nationalQuery.error)}
            filtersActive={activeCount > 0}
            loading={
              !isClient ||
              internationalQuery.isPending ||
              nationalQuery.isPending
            }
            onClearFilters={clearFilters}
            onRetry={() => {
              internationalQuery.refetch().catch(() => undefined);
              nationalQuery.refetch().catch(() => undefined);
            }}
            onSelect={choose}
            onToggleType={(type) =>
              setFilters((previous) => ({
                ...previous,
                types: toggle(previous.types, type),
              }))
            }
            selected={selected}
            soonest={soonest}
            total={filtered.length}
            typeCounts={typeCounts}
            unplaced={unplaced}
          />
        </aside>
      </div>

      <p className="mt-4 text-[12px] text-mist-dim">
        Só inscrições abertas. Cidades pelo texto de cada oportunidade, via{" "}
        <a
          className="underline decoration-navy-600 underline-offset-2 hover:text-slate-200"
          href="https://www.geonames.org/"
          rel="noopener noreferrer"
          target="_blank"
        >
          GeoNames
        </a>{" "}
        (CC BY 4.0); fronteiras do Natural Earth.
        {/* The daylight map is only on screen in the light theme; so is its
            credit (globals.css, .ba-when-light). */}
        <span className="ba-when-light">
          {" "}
          Mapa diurno: NASA Earth Observatory (Blue Marble).
        </span>
      </p>
    </>
  );
};

export default MapExplorer;
