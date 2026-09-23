"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BadgeCheckIcon,
  ChevronRightIcon,
  MapPinIcon,
  RotateCwIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import CatalogCover from "@/components/opportunities/catalog-cover";
import { URGENT_DAYS } from "@/components/opportunities/catalog-model";
import { OPPORTUNITY_FILTER_STORAGE_KEYS } from "@/hooks/use-opportunity-filters";
import { formatDaysLeft } from "@/lib/date-utils";
import CountrySilhouette from "./country-silhouette";
import {
  BRAZIL_ISO,
  type CountrySummary,
  itemsAt,
  type MapCountry,
  type MapItem,
  type MapPlace,
  placesLabel,
} from "./map-data";

const INTERNATIONAL_CATALOG = "/oportunidades/internacionais";
const NATIONAL_CATALOG = "/oportunidades/nacionais";
const SKELETON_ROWS = 5;

const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

const isUrgent = (item: MapItem): boolean =>
  item.daysLeft !== null && item.daysLeft <= URGENT_DAYS;

/** Opens the international catalog already filtered to this country. */
const presetCountry = (name: string) => {
  try {
    window.sessionStorage.setItem(
      OPPORTUNITY_FILTER_STORAGE_KEYS.international,
      JSON.stringify({ pais: [name] })
    );
  } catch {
    // Storage can be unavailable (private mode); the catalog still opens.
  }
};

// ---------------------------------------------------------------------------
// Opportunity row

const OpportunityItem = ({
  item,
  showPlace,
  showCities = false,
}: {
  item: MapItem;
  /** Where it is, when the list isn't already about one country. */
  showPlace: boolean;
  showCities?: boolean;
}) => (
  <li className="group relative flex gap-3 rounded-xl border border-navy-700 bg-navy-950/50 p-2.5 transition-colors hover:border-navy-600 hover:bg-navy-900">
    <CatalogCover
      className="h-[4.5rem] w-20 shrink-0 rounded-lg"
      compact
      cover={item.cover}
      sizes="5rem"
    />
    <div className="min-w-0 flex-1 py-0.5">
      {item.institution && (
        <p className="truncate text-[12px] text-mist">{item.institution}</p>
      )}
      <p className="line-clamp-2 font-semibold text-[14px] text-white leading-snug">
        <Link
          className="outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:underline focus-visible:decoration-signal"
          href={item.href}
        >
          {item.name}
        </Link>
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px] text-mist tabular-nums">
        {item.verified && (
          <BadgeCheckIcon
            aria-label="Verificada"
            className="h-3.5 w-3.5 shrink-0 text-verified"
          />
        )}
        <span>
          {item.curatedStatus === "upcoming" ? "Em breve · " : ""}
          {item.deadline ? `Prazo ${item.deadline}` : "Inscrições contínuas"}
        </span>
        {item.daysLeft !== null && (
          <span
            className={`font-semibold ${isUrgent(item) ? "text-signal" : "text-slate-200"}`}
          >
            · {formatDaysLeft(item.daysLeft)}
          </span>
        )}
      </p>
      {(showPlace || item.scope === "national") && item.place && (
        <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-mist">
          <MapPinIcon aria-hidden="true" className="h-3 w-3 shrink-0" />
          {showCities
            ? placesLabel([
                ...new Set(
                  item.locations
                    .filter((location) => location.precision !== "country")
                    .map((location) => location.label)
                ),
              ]) || item.place
            : item.place}
        </p>
      )}
    </div>
  </li>
);

// ---------------------------------------------------------------------------
// Overview: every destination with something open

const DestinationRow = ({
  country,
  onSelect,
}: {
  country: CountrySummary;
  onSelect: (iso: string) => void;
}) => (
  <li>
    <button
      className="group flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-navy-800/60 focus-visible:outline-2 focus-visible:outline-signal focus-visible:-outline-offset-2"
      onClick={() => onSelect(country.iso)}
      type="button"
    >
      <CountrySilhouette
        className="h-8 w-10 shrink-0 text-signal"
        country={country}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-[15px] text-white">
          {country.name}
          {country.iso === BRAZIL_ISO && (
            <span className="font-normal text-mist"> · nacionais</span>
          )}
        </span>
        {country.next && (
          <span className="block text-[13px] text-mist tabular-nums">
            Próximo prazo {country.next.deadline}
          </span>
        )}
      </span>
      <span className="rounded-full bg-navy-800 px-2.5 py-0.5 font-semibold text-[13px] text-white tabular-nums">
        {country.items.length}
        <span className="sr-only">
          {" "}
          {country.items.length === 1 ? "oportunidade" : "oportunidades"}
        </span>
      </span>
      <ChevronRightIcon
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-mist transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-signal"
      />
    </button>
  </li>
);

const Overview = ({
  countries,
  failed,
  filtersActive,
  loading,
  onClearFilters,
  onRetry,
  onSelect,
  soonest,
  total,
  unplaced,
}: {
  countries: CountrySummary[];
  failed: boolean;
  filtersActive: boolean;
  loading: boolean;
  onClearFilters: () => void;
  onRetry: () => void;
  onSelect: (iso: string) => void;
  soonest: MapItem[];
  total: number;
  unplaced: MapItem[];
}) => (
  <div>
    <h2 className="font-bold text-[20px] text-white">Destinos</h2>
    <p aria-live="polite" className="mt-1 text-[14px] text-mist">
      {loading && countries.length === 0
        ? "Carregando oportunidades…"
        : `${plural(total, "oportunidade disponível", "oportunidades disponíveis")} em ${plural(countries.length, "país", "países")}`}
    </p>

    {failed && (
      <p className="mt-4 flex items-start gap-2 rounded-lg border border-navy-700 border-dashed px-3 py-2.5 text-[13px] text-mist">
        O catálogo não respondeu agora; o mapa mostra só as verificadas.
        <button
          className="ml-auto inline-flex shrink-0 items-center gap-1 font-semibold text-signal hover:text-signal-strong"
          onClick={onRetry}
          type="button"
        >
          <RotateCwIcon aria-hidden="true" className="h-3.5 w-3.5" />
          Tentar de novo
        </button>
      </p>
    )}

    {loading && countries.length === 0 ? (
      <ul aria-hidden="true" className="mt-4 space-y-2">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <li
            className="h-14 animate-pulse rounded-lg bg-navy-800/60"
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders.
            key={index}
          />
        ))}
      </ul>
    ) : (
      <ul className="mt-3 divide-y divide-navy-700/60">
        {countries.map((country) => (
          <DestinationRow
            country={country}
            key={country.iso}
            onSelect={onSelect}
          />
        ))}
      </ul>
    )}

    {!loading && countries.length === 0 && (
      <div className="mt-4 rounded-lg border border-navy-700 border-dashed px-4 py-4 text-[14px] text-mist">
        Nenhuma oportunidade disponível com esses filtros.
        {filtersActive && (
          <button
            className="mt-2 block font-semibold text-signal hover:text-signal-strong"
            onClick={onClearFilters}
            type="button"
          >
            Limpar filtros
          </button>
        )}
      </div>
    )}

    {soonest.length > 0 && (
      <section aria-labelledby="fecham-primeiro" className="mt-7">
        <h3
          className="font-semibold text-[15px] text-white"
          id="fecham-primeiro"
        >
          Fecham primeiro
        </h3>
        <ul className="mt-3 space-y-2.5">
          {soonest.map((item) => (
            <OpportunityItem item={item} key={item.id} showPlace />
          ))}
        </ul>
      </section>
    )}

    {unplaced.length > 0 && (
      <p className="mt-5 border-navy-700/60 border-t pt-4 text-[13px] text-mist leading-relaxed">
        {plural(
          unplaced.length,
          "oportunidade não tem",
          "oportunidades não têm"
        )}{" "}
        um país definido (online ou em vários lugares).{" "}
        <Link
          className="text-signal underline-offset-2 hover:underline"
          href={INTERNATIONAL_CATALOG}
        >
          Ver no catálogo
        </Link>
      </p>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// One country

const CountryView = ({
  activeTypes,
  country,
  filtersActive,
  onBack,
  onClearFilters,
  onClearPlace,
  onToggleType,
  place,
  summary,
  typeCounts,
}: {
  activeTypes: string[];
  country: MapCountry;
  filtersActive: boolean;
  onBack: () => void;
  onClearFilters: () => void;
  onClearPlace: () => void;
  onToggleType: (type: string) => void;
  place: MapPlace | null;
  summary: CountrySummary | null;
  /** Types open here under every filter but the type one, so chips stay put. */
  typeCounts: { count: number; label: string }[];
}) => {
  const everywhere = summary?.items ?? [];
  const items = place ? itemsAt(everywhere, place) : everywhere;
  const isBrazil = country.iso === BRAZIL_ISO;
  const catalogHref = isBrazil ? NATIONAL_CATALOG : INTERNATIONAL_CATALOG;

  return (
    <div>
      <button
        className="-ml-1 inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-[14px] text-mist transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-signal"
        onClick={onBack}
        type="button"
      >
        <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
        Todos os destinos
      </button>

      <div className="mt-4 flex items-center gap-4">
        <CountrySilhouette
          className="h-14 w-16 shrink-0 text-signal"
          country={country}
        />
        <div className="min-w-0">
          <h2 className="font-bold text-[1.375rem] text-white leading-tight">
            {country.name}
          </h2>
          <p aria-live="polite" className="mt-0.5 text-[14px] text-mist">
            {plural(
              items.length,
              "oportunidade disponível",
              "oportunidades disponíveis"
            )}
            {isBrazil && items.length > 0 && !place && " no Brasil"}
          </p>
        </div>
      </div>

      {place && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-signal bg-signal/15 py-1 pr-1 pl-3 text-[13px] text-white">
            <MapPinIcon
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 text-signal"
            />
            {place.label}
            <button
              aria-label={`Mostrar todas as cidades de ${country.name}`}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-mist transition-colors hover:bg-navy-800 hover:text-white focus-visible:outline-2 focus-visible:outline-signal"
              onClick={onClearPlace}
              type="button"
            >
              <XIcon aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      )}

      {(typeCounts.length > 1 || activeTypes.length > 0) && (
        <ul aria-label="Filtrar por tipo" className="mt-4 flex flex-wrap gap-2">
          {typeCounts.map((type) => {
            const active = activeTypes.includes(type.label);
            return (
              <li key={type.label}>
                <button
                  aria-pressed={active}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-navy-700 bg-navy-900 px-3 text-[13px] text-slate-100 transition-colors hover:border-signal/60 aria-pressed:border-signal aria-pressed:bg-signal/15 aria-pressed:text-white"
                  onClick={() => onToggleType(type.label)}
                  type="button"
                >
                  {type.label}
                  <span className="font-semibold text-mist tabular-nums">
                    {type.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 0 ? (
        <ul className="mt-5 space-y-2.5">
          {items.map((item) => (
            <OpportunityItem
              item={item}
              key={item.id}
              // With several cities chosen, each row says which one it's in.
              showCities={Boolean(place && place.keys.length > 1)}
              showPlace={Boolean(place && place.keys.length > 1)}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-lg border border-navy-700 border-dashed px-4 py-4 text-[14px] text-mist">
          {filtersActive
            ? `Nenhuma oportunidade em ${country.name} com esses filtros.`
            : `Nenhuma oportunidade disponível em ${country.name} no momento.`}
          {filtersActive && (
            <button
              className="mt-2 block font-semibold text-signal hover:text-signal-strong"
              onClick={onClearFilters}
              type="button"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      <Link
        className="mt-5 inline-flex items-center gap-1.5 font-medium text-[14px] text-signal hover:text-signal-strong"
        href={catalogHref}
        onClick={() => {
          if (!isBrazil) {
            presetCountry(country.name);
          }
        }}
      >
        {isBrazil
          ? "Ver o catálogo nacional"
          : `Ver ${country.name} no catálogo`}
        <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  );
};

export interface MapPanelProps {
  activeTypes: string[];
  countries: CountrySummary[];
  failed: boolean;
  filtersActive: boolean;
  loading: boolean;
  onClearFilters: () => void;
  onClearPlace: () => void;
  onRetry: () => void;
  onSelect: (iso: string | null) => void;
  onToggleType: (type: string) => void;
  /** A city chosen on the map narrows the country's list to it. */
  place: MapPlace | null;
  selected: MapCountry | null;
  /** The next few deadlines under the current filters. */
  soonest: MapItem[];
  total: number;
  typeCounts: { count: number; label: string }[];
  unplaced: MapItem[];
}

const MapPanel = ({
  activeTypes,
  countries,
  failed,
  filtersActive,
  loading,
  onClearFilters,
  onClearPlace,
  onRetry,
  onSelect,
  onToggleType,
  place,
  selected,
  soonest,
  total,
  typeCounts,
  unplaced,
}: MapPanelProps) =>
  selected ? (
    <CountryView
      activeTypes={activeTypes}
      country={selected}
      filtersActive={filtersActive}
      onBack={() => onSelect(null)}
      onClearFilters={onClearFilters}
      onClearPlace={onClearPlace}
      onToggleType={onToggleType}
      place={place}
      summary={
        countries.find((country) => country.iso === selected.iso) ?? null
      }
      typeCounts={typeCounts}
    />
  ) : (
    <Overview
      countries={countries}
      failed={failed}
      filtersActive={filtersActive}
      loading={loading}
      onClearFilters={onClearFilters}
      onRetry={onRetry}
      onSelect={onSelect}
      soonest={soonest}
      total={total}
      unplaced={unplaced}
    />
  );

export default MapPanel;
