import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { clusterByDistance } from "@/lib/cluster";
import type { GeoPoint } from "@/lib/geo";
import MapImage from "./map-image";
import type { MapWindow } from "./map-windows";

export type CatalogMapWindow = MapWindow;

/** A sourced photograph, credited on the page while it is shown. */
export interface CatalogHeaderPhoto {
  author: string;
  license: string;
  licenseUrl: string;
  /** object-position focal point (x% y%). */
  position: string;
  sourceUrl: string;
  src: string;
  /** What the photo shows, for the credit line. */
  subject: string;
}

/**
 * What sits behind the title: the night-lights map of a catalog's territory
 * (with pins where its items take place), or a photograph for a catalog that
 * is not about a place.
 */
export type CatalogHeaderBackdrop =
  | { kind: "map"; map: CatalogMapWindow }
  | { kind: "photo"; photo: CatalogHeaderPhoto };

export interface CatalogHeaderConfig {
  accentClassName: string;
  accentWord: string;
  backdrop: CatalogHeaderBackdrop;
  breadcrumb: string;
  icon: LucideIcon;
  subtitle: string;
  titleLead: string;
}

// Radii relative to the map's height, which is the dimension fixed in pixels,
// so pins look the same size on the world and the Brazil maps.
const HALO_RATIO = 26;
const DOT_RATIO = 80;
/** Places closer than two halos share one mark, which grows with the log of
 * its count: a catalog of hundreds would otherwise pile its dots into one
 * amber stain over São Paulo or the US Northeast. */
const CLUSTER_RATIO = 13;
const MAX_HALO_GROWTH = 2.2;
const MAX_DOT_GROWTH = 1.8;

interface Mark extends GeoPoint {
  count: number;
}

/** A pin, and the opportunity it belongs to when known: one opportunity can
 * list several cities, and a mark counts it once. */
export type HeaderPin = GeoPoint & { id?: string };

const marksOf = (points: HeaderPin[], radius: number): Mark[] =>
  clusterByDistance(
    points,
    ({ lat, lon }) => ({ x: lon, y: -lat }),
    () => 1,
    radius
  ).map((cluster) => ({
    count: new Set(cluster.items.map((point, index) => point.id ?? `#${index}`))
      .size,
    lat: -cluster.y,
    lon: cluster.x,
  }));

const growth = (count: number, max: number): number =>
  Math.min(max, 1 + 0.35 * Math.log2(count));

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
  pins: HeaderPin[];
}) => {
  const width = map.east - map.west;
  const height = map.north - map.south;
  const visiblePins = marksOf(
    pins.filter(
      (pin) =>
        pin.lon >= map.west &&
        pin.lon <= map.east &&
        pin.lat <= map.north &&
        pin.lat >= map.south
    ),
    height / CLUSTER_RATIO
  );

  return (
    // On the navy ground this is a full-bleed map dissolving into the page.
    // On paper it becomes the print itself — the aspect ratio below is what
    // lets it be fitted rather than cropped (globals.css, .ba-catalog-map).
    <div
      className="ba-catalog-map absolute inset-y-0 left-1/2 h-full -translate-x-1/2 lg:right-0 lg:left-auto lg:translate-x-0"
      style={
        {
          aspectRatio: `${width} / ${height}`,
          "--ba-map-ratio": width / height,
        } as CSSProperties
      }
    >
      <div className="ba-catalog-map-mask absolute inset-0 [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent_0%,black_25%,black_75%,transparent_100%),linear-gradient(to_bottom,transparent_0%,black_14%,black_80%,transparent_100%)] lg:[mask-image:linear-gradient(to_right,transparent_0%,black_30%),linear-gradient(to_bottom,transparent_0%,black_14%,black_80%,transparent_100%)]">
        <MapImage
          alt=""
          className="object-fill"
          day={map.daySrc}
          fetchPriority="high"
          fill
          night={map.src}
          nightClassName="brightness-[2.1] contrast-[1.05] saturate-[0.85]"
          sizes="(min-width: 1024px) 40rem, 100vw"
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
                r={(height / HALO_RATIO) * growth(pin.count, MAX_HALO_GROWTH)}
              />
              <circle
                cx={x}
                cy={y}
                fill="var(--color-signal)"
                r={(height / DOT_RATIO) * growth(pin.count, MAX_DOT_GROWTH)}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const creditLinkClassName =
  "whitespace-nowrap underline decoration-navy-600 underline-offset-2 transition-colors hover:text-slate-100";

/**
 * The photo dissolves into the navy the same way the maps do; in the light
 * theme it becomes a hard-edged plate instead (globals.css, .ba-catalog-photo),
 * because a dark photo can't fade into paper.
 */
export const CatalogPhoto = ({ photo }: { photo: CatalogHeaderPhoto }) => (
  <div className="ba-catalog-photo absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent_100%)] lg:[mask-composite:intersect] lg:[mask-image:linear-gradient(to_right,transparent_0%,black_32%),linear-gradient(to_bottom,black_78%,transparent_100%)]">
    <Image
      alt=""
      className="ba-catalog-photo-image object-cover"
      fill
      preload
      sizes="(min-width: 1024px) 62vw, 100vw"
      src={photo.src}
      style={{ objectPosition: photo.position }}
    />
  </div>
);

const PhotoCredit = ({ photo }: { photo: CatalogHeaderPhoto }) => (
  <p className="ba-catalog-photo-credit px-5 pt-2 text-right text-[12px] text-mist leading-snug sm:px-8 lg:absolute lg:right-[max(2rem,calc(50%-40rem))] lg:bottom-2.5 lg:max-w-[40%] lg:px-0 lg:pt-0">
    <span className="text-slate-200">{photo.subject}</span>
    <span aria-hidden="true"> · </span>
    Foto:{" "}
    <a
      className={creditLinkClassName}
      href={photo.sourceUrl}
      rel="noopener noreferrer"
      target="_blank"
    >
      {photo.author}
    </a>
    ,{" "}
    <a
      className={creditLinkClassName}
      href={photo.licenseUrl}
      rel="noopener noreferrer"
      target="_blank"
    >
      {photo.license}
    </a>
  </p>
);

const CatalogHeader = ({
  config,
  pins,
}: {
  config: CatalogHeaderConfig;
  pins: HeaderPin[];
}) => {
  const Icon = config.icon;
  const { backdrop } = config;

  return (
    <section
      className="ba-catalog-header relative isolate overflow-hidden border-navy-700/50 border-b"
      data-backdrop={backdrop.kind}
    >
      <div
        aria-hidden="true"
        className={`relative h-36 overflow-hidden sm:h-44 lg:absolute lg:inset-y-0 lg:right-0 lg:-z-10 lg:h-auto lg:w-[62%] ${backdrop.kind === "photo" ? "ba-catalog-photo-frame" : "ba-catalog-map-frame"}`}
      >
        {backdrop.kind === "map" ? (
          <CatalogMap map={backdrop.map} pins={pins} />
        ) : (
          <CatalogPhoto photo={backdrop.photo} />
        )}
      </div>
      {backdrop.kind === "photo" && <PhotoCredit photo={backdrop.photo} />}

      <div className="ba-catalog-copy mx-auto w-full max-w-[84rem] px-5 pt-3 pb-9 sm:px-8 lg:flex lg:min-h-[20rem] lg:flex-col lg:justify-center lg:py-10">
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
          <div className="ba-catalog-title">
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
