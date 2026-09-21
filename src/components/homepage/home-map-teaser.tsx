"use client";

import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { WORLD_MAP } from "@/components/opportunities/map-windows";
import {
  useInternationalOpportunitiesQuery,
  useNationalOpportunitiesQuery,
} from "@/hooks/queries/use-opportunity-queries";
import useScrollReveal from "@/hooks/use-scroll-reveal";
import { isOpportunityDeadlineOpen } from "@/lib/date-utils";
import type { GeoPoint, MapDestination } from "@/lib/geo";

// The world crop and its window live in map-windows.ts (see the cache note
// there before re-cropping). The SVG overlay works in lon+180 / 90-lat units,
// so its viewBox is the same window.
const MAP_IMAGE = WORLD_MAP.src;
const VIEW = WORLD_MAP;
const VIEW_WIDTH = VIEW.east - VIEW.west;
const VIEW_HEIGHT = VIEW.north - VIEW.south;
const ARC_BOW = 0.22;
const ROUTE_STAGGER = 8;
const MAX_ROUTES = 14;
const PIN_PRECISION = 1;
const REVEAL_OPTIONS = { threshold: 0.1 };

/** Origin of the routes: Brasília, the geographic middle of the country. */
const ROUTE_ORIGIN: GeoPoint = { lat: -15.79, lon: -47.88 };

const project = ({ lat, lon }: GeoPoint) => ({ x: lon + 180, y: 90 - lat });

const arcPath = (from: GeoPoint, to: GeoPoint): string => {
  const a = project(from);
  const b = project(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  // Bow each route to the right of its direction of travel.
  const cx = (a.x + b.x) / 2 - dy * ARC_BOW;
  const cy = (a.y + b.y) / 2 + dx * ARC_BOW;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
};

const pointKey = ({ lat, lon }: GeoPoint): string =>
  `${lat.toFixed(PIN_PRECISION)}:${lon.toFixed(PIN_PRECISION)}`;

const isInView = ({ lat, lon }: GeoPoint): boolean =>
  lon >= VIEW.west &&
  lon <= VIEW.east &&
  lat <= VIEW.north &&
  lat >= VIEW.south;

const uniquePoints = (destinations: MapDestination[]): MapDestination[] => [
  ...new Map(destinations.map((item) => [pointKey(item), item])).values(),
];

/** Opportunities per country (an opportunity with two cities counts once). */
const countByCountry = (destinations: MapDestination[]) => {
  const names = new Map<string, Set<string>>();
  for (const destination of destinations) {
    const set = names.get(destination.country) ?? new Set<string>();
    set.add(destination.name);
    names.set(destination.country, set);
  }
  return [...names.entries()]
    .map(([country, set]) => [country, set.size] as const)
    .sort((a, b) => b[1] - a[1]);
};

const nameKey = (name: string): string =>
  name.trim().toLocaleLowerCase("pt-BR");

/**
 * Catalog opportunities are fetched once the map scrolls into view; each
 * already carries the locations the API resolved from its city text.
 */
const useCatalogDestinations = (
  enabled: boolean,
  verifiedDestinations: MapDestination[]
): MapDestination[] => {
  const international = useInternationalOpportunitiesQuery({ enabled });
  const national = useNationalOpportunitiesQuery({ enabled });

  return useMemo(() => {
    const verifiedNames = new Set(
      verifiedDestinations.map((item) => nameKey(item.name))
    );
    const isNewAndOpen = (name: string, deadline: string) =>
      !verifiedNames.has(nameKey(name)) && isOpportunityDeadlineOpen(deadline);

    return [
      ...(international.data ?? [])
        .filter((item) => isNewAndOpen(item.nome, item.prazoInscricao))
        .flatMap((item) =>
          (item.localizacoes ?? []).map((location) => ({
            ...location,
            country: item.pais,
            name: item.nome,
            scope: "international" as const,
          }))
        ),
      ...(national.data ?? [])
        .filter((item) => isNewAndOpen(item.nome, item.prazoInscricao))
        .flatMap((item) =>
          (item.localizacoes ?? []).map((location) => ({
            ...location,
            country: "Brasil",
            name: item.nome,
            scope: "national" as const,
          }))
        ),
    ];
  }, [international.data, national.data, verifiedDestinations]);
};

const HomeMapTeaser = ({
  verifiedDestinations,
}: {
  verifiedDestinations: MapDestination[];
}) => {
  const [mapRef, mapVisible] = useScrollReveal(REVEAL_OPTIONS);
  const catalogDestinations = useCatalogDestinations(
    mapVisible,
    verifiedDestinations
  );
  const destinations = [...verifiedDestinations, ...catalogDestinations];
  const visible = destinations.filter(isInView);
  const routes = uniquePoints(
    visible.filter((item) => item.scope === "international")
  ).slice(0, MAX_ROUTES);
  const pins = uniquePoints(visible);
  const origin = project(ROUTE_ORIGIN);

  return (
    <section
      aria-labelledby="mapa-titulo"
      className="flex flex-col rounded-2xl border border-navy-700 bg-navy-900/60 p-6 sm:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            className="font-bold text-[1.375rem] text-white leading-tight"
            id="mapa-titulo"
          >
            Veja oportunidades no mapa
          </h2>
          <p className="mt-2 max-w-sm text-[15px] text-mist leading-relaxed">
            Clique em um país para descobrir as oportunidades disponíveis nele.
          </p>
        </div>
        <Link
          className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-full border border-signal/70 px-5 font-semibold text-[14px] text-white transition-colors duration-200 hover:bg-signal hover:text-navy-950"
          href="/mapa"
        >
          Abrir mapa
          <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>

      <figure className="mt-6">
        <div
          className="relative overflow-hidden rounded-lg bg-navy-950 ring-1 ring-navy-700"
          ref={mapRef}
          style={{ aspectRatio: `${VIEW_WIDTH} / ${VIEW_HEIGHT}` }}
        >
          <Image
            alt=""
            className="object-cover brightness-[1.6] saturate-[0.8]"
            fill
            sizes="(min-width: 1024px) 40rem, 100vw"
            src={MAP_IMAGE}
          />
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
            viewBox={`${VIEW.west + 180} ${90 - VIEW.north} ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          >
            {routes.map((destination, index) => (
              <path
                className="ba-route ba-stroke"
                d={arcPath(ROUTE_ORIGIN, destination)}
                fill="none"
                key={pointKey(destination)}
                pathLength={1}
                stroke="var(--color-signal)"
                strokeLinecap="round"
                strokeWidth={0.8}
                style={
                  {
                    "--route-start": `${10 + index * ROUTE_STAGGER}%`,
                    "--route-end": `${45 + index * ROUTE_STAGGER}%`,
                  } as React.CSSProperties
                }
              />
            ))}
            {pins.map((destination) => {
              const point = project(destination);
              return (
                <g key={`pin-${pointKey(destination)}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    fill="var(--color-signal)"
                    fillOpacity={0.22}
                    r={3.2}
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    fill="var(--color-signal)"
                    r={1.3}
                  />
                </g>
              );
            })}
            <circle
              cx={origin.x}
              cy={origin.y}
              fill="none"
              r={3.6}
              stroke="#ffffff"
              strokeWidth={0.6}
            />
            <circle cx={origin.x} cy={origin.y} fill="#ffffff" r={1.4} />
          </svg>
        </div>
        {destinations.length > 0 && (
          <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-mist">
            <span className="text-slate-200">
              Onde estão as oportunidades abertas:
            </span>
            {countByCountry(destinations).map(([country, count]) => (
              <span className="inline-flex items-center gap-1.5" key={country}>
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full bg-signal"
                />
                {country} · {count}
              </span>
            ))}
          </figcaption>
        )}
      </figure>
    </section>
  );
};

export default HomeMapTeaser;
