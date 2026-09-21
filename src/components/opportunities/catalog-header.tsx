import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { GeoPoint } from "@/lib/geo";
import type { MapWindow } from "./map-windows";

export type CatalogMapWindow = MapWindow;

export interface CatalogHeaderConfig {
  accentClassName: string;
  accentWord: string;
  breadcrumb: string;
  icon: LucideIcon;
  map: CatalogMapWindow;
  subtitle: string;
  titleLead: string;
}

const PIN_PRECISION = 2;
// Radii relative to the map's height, which is the dimension fixed in pixels,
// so pins look the same size on the world and the Brazil maps.
const HALO_RATIO = 26;
const DOT_RATIO = 80;

const uniquePins = (points: GeoPoint[]): GeoPoint[] => {
  const seen = new Map<string, GeoPoint>();
  for (const point of points) {
    const key = `${point.lat.toFixed(PIN_PRECISION)}:${point.lon.toFixed(PIN_PRECISION)}`;
    seen.set(key, point);
  }
  return [...seen.values()];
};

/**
 * The night-lights map for the catalog's territory, with a pin wherever the
 * opportunities currently listed take place. Purely decorative: the list below
 * carries the same information in text.
 */
export const CatalogMap = ({
  map,
  pins,
}: {
  map: CatalogMapWindow;
  pins: GeoPoint[];
}) => {
  const width = map.east - map.west;
  const height = map.north - map.south;
  const visiblePins = uniquePins(pins).filter(
    (pin) =>
      pin.lon >= map.west &&
      pin.lon <= map.east &&
      pin.lat <= map.north &&
      pin.lat >= map.south
  );

  return (
    <div
      className="absolute inset-y-0 left-1/2 h-full -translate-x-1/2 lg:right-0 lg:left-auto lg:translate-x-0"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <div className="absolute inset-0 [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent_0%,black_25%,black_75%,transparent_100%),linear-gradient(to_bottom,transparent_0%,black_14%,black_80%,transparent_100%)] lg:[mask-image:linear-gradient(to_right,transparent_0%,black_30%),linear-gradient(to_bottom,transparent_0%,black_14%,black_80%,transparent_100%)]">
        <Image
          alt=""
          className="object-fill brightness-[2.1] contrast-[1.05] saturate-[0.85]"
          fill
          preload
          sizes="(min-width: 1024px) 40rem, 100vw"
          src={map.src}
        />
      </div>
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
      >
        {visiblePins.map((pin) => {
          const x = pin.lon - map.west;
          const y = map.north - pin.lat;
          return (
            <g key={`${pin.lat}:${pin.lon}`}>
              <circle
                cx={x}
                cy={y}
                fill="var(--color-signal)"
                fillOpacity={0.2}
                r={height / HALO_RATIO}
              />
              <circle
                cx={x}
                cy={y}
                fill="var(--color-signal)"
                r={height / DOT_RATIO}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const CatalogHeader = ({
  config,
  pins,
}: {
  config: CatalogHeaderConfig;
  pins: GeoPoint[];
}) => {
  const Icon = config.icon;

  return (
    <section className="relative isolate overflow-hidden border-navy-700/50 border-b">
      <div
        aria-hidden="true"
        className="relative h-36 overflow-hidden sm:h-44 lg:absolute lg:inset-y-0 lg:right-0 lg:-z-10 lg:h-auto lg:w-[62%]"
      >
        <CatalogMap map={config.map} pins={pins} />
      </div>

      <div className="mx-auto w-full max-w-[84rem] px-5 pt-3 pb-9 sm:px-8 lg:flex lg:min-h-[20rem] lg:flex-col lg:justify-center lg:py-10">
        <nav aria-label="Trilha de navegação">
          <ol className="flex items-center gap-2 text-[13px] text-mist">
            <li>
              <Link
                className="underline-offset-4 transition-colors hover:text-white hover:underline"
                href="/"
              >
                Início
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </li>
            <li aria-current="page" className="text-slate-200">
              {config.breadcrumb}
            </li>
          </ol>
        </nav>

        <div className="mt-5 flex items-start gap-5">
          <span
            aria-hidden="true"
            className={`mt-1 hidden h-16 w-16 shrink-0 items-center justify-center rounded-full border border-navy-600 bg-navy-950/60 sm:flex ${config.accentClassName}`}
          >
            <Icon className="h-8 w-8" strokeWidth={1.6} />
          </span>
          <div>
            <h1 className="text-balance font-bold text-[clamp(2.1rem,1.3rem+2.3vw,3.2rem)] text-white leading-[1.05] tracking-[-0.02em]">
              {config.titleLead}{" "}
              <span className={config.accentClassName}>
                {config.accentWord}
              </span>
            </h1>
            <p className="mt-3 max-w-[36rem] text-[16px] text-mist leading-relaxed">
              {config.subtitle}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CatalogHeader;
