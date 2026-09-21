import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type MapDestination, type MapPoint, ROUTE_ORIGIN } from "./home-data";

// The teaser image is public/map.jpg (equirectangular) cropped to this window:
// the Americas and the Atlantic, where the routes run. The SVG overlay works
// in lon+180 / 90-lat units, so its viewBox is the same window.
const MAP_IMAGE = "/home/americas-atlantic-night.jpg";
const VIEW = { west: -170, east: 60, north: 65, south: -50 };
const VIEW_WIDTH = VIEW.east - VIEW.west;
const VIEW_HEIGHT = VIEW.north - VIEW.south;
const ARC_BOW = 0.22;
const ROUTE_STAGGER = 12;

const project = ({ lat, lon }: MapPoint) => ({ x: lon + 180, y: 90 - lat });

const arcPath = (from: MapPoint, to: MapPoint): string => {
  const a = project(from);
  const b = project(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  // Bow each route to the right of its direction of travel.
  const cx = (a.x + b.x) / 2 - dy * ARC_BOW;
  const cy = (a.y + b.y) / 2 + dx * ARC_BOW;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
};

const countByCountry = (destinations: MapDestination[]) => {
  const counts = new Map<string, number>();
  for (const destination of destinations) {
    counts.set(destination.country, (counts.get(destination.country) ?? 0) + 1);
  }
  return [...counts.entries()];
};

const HomeMapTeaser = ({
  destinations,
}: {
  destinations: MapDestination[];
}) => {
  const origin = project(ROUTE_ORIGIN);
  const abroad = destinations.filter((d) => d.scope === "international");
  const national = destinations.filter((d) => d.scope === "national");

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
            {abroad.map((destination, index) => (
              <path
                className="ba-route ba-stroke"
                d={arcPath(ROUTE_ORIGIN, destination)}
                fill="none"
                key={destination.id}
                pathLength={1}
                stroke="var(--color-signal)"
                strokeLinecap="round"
                strokeWidth={0.85}
                style={
                  {
                    "--route-start": `${10 + index * ROUTE_STAGGER}%`,
                    "--route-end": `${45 + index * ROUTE_STAGGER}%`,
                  } as React.CSSProperties
                }
              />
            ))}
            {[...abroad, ...national].map((destination) => {
              const point = project(destination);
              return (
                <g key={`${destination.id}-pin`}>
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
              Do Brasil para a seleção verificada:
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
