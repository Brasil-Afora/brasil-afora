"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./opportunity-map.css";
import { GlobeIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import type { GeoPoint } from "@/lib/geo";
import {
  allCountryOutlines,
  BRAZIL_ISO,
  type CountrySummary,
  type MapCountry,
  type MapPin,
  type Polygon,
} from "./map-data";

// The night-lights world as Leaflet tiles in plate carrée (EPSG:4326), so the
// equirectangular source and the country outlines line up without
// reprojection. Countries with open opportunities glow amber; pins mark the
// cities; choosing a country flies there and draws its routes from Brasília.

const TILE_URL = "/map-tiles/v1/{z}/{x}/{y}.webp";
/** Zoom level at which the tiles are the source's own pixels. */
const NATIVE_ZOOM = 4;
/** Past the source's pixels, but not so far that the lights turn to mush. */
const MAX_ZOOM = 5.5;
/** How close choosing a country flies: sharp, with its neighbours in view. */
const MAX_FIT_ZOOM = 4.5;
/** The part of the world worth looking at; the map always fills its frame
 * with it, so no empty sea shows past the poles or the date line. */
const WORLD = L.latLngBounds([-60, -180], [84, 180]);
/** Opening view: the Atlantic, with Brazil and most destinations in frame. */
const HOME_CENTER: L.LatLngTuple = [16, -32];
const FLY_SECONDS = 1.1;
const FRAME_PADDING = 0.18;
const ROUTE_BOW = 0.22;
const ROUTE_STEPS = 48;
const MANY_OPPORTUNITIES = 5;
const SOME_OPPORTUNITIES = 2;

/** Where every route starts: Brasília, the middle of the country. */
const ORIGIN: GeoPoint = { lat: -15.79, lon: -47.88 };

interface OpportunityMapProps {
  countries: CountrySummary[];
  onSelect: (iso: string | null) => void;
  pins: MapPin[];
  /** The chosen country, which may have nothing open under the filters. */
  selected: MapCountry | null;
}

const toLatLngs = (polygon: Polygon): L.LatLngExpression[][] =>
  polygon.map((ring) => ring.map(([lon, lat]) => [lat, lon]));

const tierOf = (count: number): 1 | 2 | 3 => {
  if (count >= MANY_OPPORTUNITIES) {
    return 3;
  }
  return count >= SOME_OPPORTUNITIES ? 2 : 1;
};

const plural = (count: number) =>
  `${count} ${count === 1 ? "oportunidade" : "oportunidades"}`;

/** Tooltip content as a node, so names from the data are never parsed as HTML. */
const tooltipNode = (title: string, detail?: string): HTMLElement => {
  const node = document.createElement("span");
  const strong = document.createElement("strong");
  strong.textContent = title;
  node.append(strong);
  if (detail) {
    const small = document.createElement("span");
    small.textContent = detail;
    node.append(small);
  }
  return node;
};

/** A route bowed to the right of its direction of travel, as a polyline. */
const routePoints = (from: GeoPoint, to: GeoPoint): L.LatLngExpression[] => {
  const dx = to.lon - from.lon;
  const dy = to.lat - from.lat;
  const control = {
    lat: (from.lat + to.lat) / 2 - dx * ROUTE_BOW,
    lon: (from.lon + to.lon) / 2 + dy * ROUTE_BOW,
  };
  return Array.from({ length: ROUTE_STEPS + 1 }, (_, step) => {
    const t = step / ROUTE_STEPS;
    const u = 1 - t;
    return [
      u * u * from.lat + 2 * u * t * control.lat + t * t * to.lat,
      u * u * from.lon + 2 * u * t * control.lon + t * t * to.lon,
    ];
  });
};

/** The mainland plus every pin, so the whole story fits the frame. */
const frameOf = (country: MapCountry, pins: MapPin[]): L.LatLngBounds => {
  const outline = country.polygons[0]?.[0] ?? [];
  const points: L.LatLngTuple[] = [
    [country.anchor.lat, country.anchor.lon],
    ...outline.map(([lon, lat]): L.LatLngTuple => [lat, lon]),
    ...pins
      .filter((pin) => pin.iso === country.iso)
      .map((pin): L.LatLngTuple => [pin.lat, pin.lon]),
  ];
  return L.latLngBounds(points).pad(FRAME_PADDING);
};

/**
 * Dots are HTML markers, not SVG circles: Leaflet scales its vector layer
 * during a zoom and redraws it only at the end, which made pins balloon and
 * then snap back. Markers just move.
 */
const dotMarker = (
  point: GeoPoint,
  className: string,
  size: number,
  interactive = true
): L.Marker =>
  L.marker([point.lat, point.lon], {
    icon: L.divIcon({ className, iconSize: [size, size] }),
    interactive,
    keyboard: false,
  });

const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The lowest zoom at which the world still covers the whole frame. */
const coverZoom = (map: L.Map): number =>
  Math.ceil(map.getBoundsZoom(WORLD, true) * 4) / 4;

/**
 * Flies to a country's frame, or back to the opening view. Leaflet scales its
 * vector layer during a flight and redraws it only on landing, so outlines
 * would swell and blur; they fade out for the trip and back in on arrival.
 */
const moveCamera = (map: L.Map, target: L.LatLngBounds | null) => {
  const animate = !prefersReducedMotion();
  if (animate) {
    const container = map.getContainer();
    container.classList.add("is-flying");
    map.once("moveend", () => container.classList.remove("is-flying"));
  }
  if (target) {
    map.flyToBounds(target, {
      animate,
      duration: FLY_SECONDS,
      maxZoom: MAX_FIT_ZOOM,
    });
  } else {
    map.flyTo(HOME_CENTER, map.getMinZoom(), {
      animate,
      duration: FLY_SECONDS,
    });
  }
};

type CountryShapeLayer = L.Path | L.Marker;

const markSelected = (
  paths: Map<string, CountryShapeLayer[]>,
  iso: string | null
) => {
  for (const [key, shapes] of paths) {
    for (const shape of shapes) {
      shape.getElement()?.classList.toggle("is-selected", key === iso);
    }
  }
};

/** Where the routes go: the country's city pins, or its capital. */
const destinationsOf = (country: MapCountry, pins: MapPin[]): GeoPoint[] => {
  const targets = pins.filter((pin) => pin.iso === country.iso);
  return targets.length > 0 ? targets : [country.anchor];
};

const selectionKey = (country: MapCountry | null, pins: MapPin[]): string =>
  country
    ? `${country.iso}|${destinationsOf(country, pins)
        .map((point) => `${point.lat},${point.lon}`)
        .join(";")}`
    : "";

/** Routes from Brasília to the country's pins; none for Brazil itself. */
const drawRoutes = (
  layer: L.LayerGroup,
  country: MapCountry,
  pins: MapPin[]
) => {
  if (country.iso === BRAZIL_ISO) {
    return;
  }
  for (const destination of destinationsOf(country, pins)) {
    const route = L.polyline(routePoints(ORIGIN, destination), {
      className: "map-route",
      interactive: false,
      pane: "routes",
    }).addTo(layer);
    // A unit path length lets CSS draw every route at the same pace.
    route.getElement()?.setAttribute("pathLength", "1");
  }
};

const drawLabel = (layer: L.LayerGroup, country: MapCountry) => {
  L.tooltip({
    className: "map-label",
    direction: "top",
    offset: [0, -10],
    permanent: true,
  })
    .setLatLng([country.anchor.lat, country.anchor.lon])
    .setContent(tooltipNode(country.name))
    .addTo(layer);
};

const OpportunityMap = ({
  countries,
  onSelect,
  pins,
  selected,
}: OpportunityMapProps) => {
  const containerRef = useRef<HTMLElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const countryLayerRef = useRef<L.LayerGroup | null>(null);
  const pinLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const countryPathsRef = useRef(new Map<string, CountryShapeLayer[]>());
  const onSelectRef = useRef(onSelect);
  const framedRef = useRef<string | null>(null);
  const drawnRef = useRef("");
  const selectedIsoRef = useRef<string | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  // The map itself: tiles, faint borders and empty layers, created once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const map = L.map(container, {
      attributionControl: false,
      crs: L.CRS.EPSG4326,
      maxBounds: WORLD,
      maxBoundsViscosity: 1,
      maxZoom: MAX_ZOOM,
      wheelPxPerZoomLevel: 110,
      zoomControl: false,
      zoomDelta: 0.5,
      zoomSnap: 0.25,
    });
    map.setMinZoom(coverZoom(map));
    map.setView(HOME_CENTER, map.getMinZoom(), { animate: false });

    L.tileLayer(TILE_URL, {
      bounds: L.latLngBounds([-90, -180], [90, 180]),
      className: "map-night",
      maxNativeZoom: NATIVE_ZOOM,
      maxZoom: MAX_ZOOM,
      noWrap: true,
    }).addTo(map);

    map.createPane("routes").style.zIndex = "420";

    L.polygon(allCountryOutlines().map(toLatLngs), {
      className: "map-border",
      interactive: false,
    }).addTo(map);

    dotMarker(ORIGIN, "map-origin", 9, false).addTo(map);

    countryLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    pinLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // A fresh map has nothing drawn or framed yet.
    drawnRef.current = "";
    framedRef.current = null;

    const resize = new ResizeObserver(() => {
      map.invalidateSize();
      map.setMinZoom(coverZoom(map));
    });
    resize.observe(container);

    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Lit countries: fill strength by how many opportunities are open there.
  useEffect(() => {
    const layer = countryLayerRef.current;
    if (!layer) {
      return;
    }
    layer.clearLayers();
    const paths = new Map<string, CountryShapeLayer[]>();
    for (const country of countries) {
      const className = `map-country tier-${tierOf(country.items.length)}`;
      // Countries too small for an outline get a ring at the capital.
      const shapes: CountryShapeLayer[] =
        country.polygons.length > 0
          ? [L.polygon(country.polygons.map(toLatLngs), { className })]
          : [dotMarker(country.anchor, `${className} map-country-dot`, 16)];
      for (const shape of shapes) {
        shape
          .bindTooltip(
            tooltipNode(country.name, plural(country.items.length)),
            {
              className: "map-tooltip",
              direction: "top",
              offset: [0, -6],
              sticky: true,
            }
          )
          .on("click", () => onSelectRef.current(country.iso))
          .addTo(layer);
      }
      paths.set(country.iso, shapes);
    }
    countryPathsRef.current = paths;
    // New shapes after a filter change: keep the chosen one lit.
    markSelected(paths, selectedIsoRef.current);
  }, [countries]);

  // City pins, drawn above the countries.
  useEffect(() => {
    const layer = pinLayerRef.current;
    if (!layer) {
      return;
    }
    layer.clearLayers();
    for (const pin of pins) {
      dotMarker(pin, "map-pin", 20)
        .bindTooltip(tooltipNode(pin.label, plural(pin.count)), {
          className: "map-tooltip",
          direction: "top",
          offset: [0, -8],
        })
        .on("click", () => onSelectRef.current(pin.iso))
        .addTo(layer);
    }
  }, [pins]);

  // The chosen country: highlight, routes from Brasília, label and camera.
  useEffect(() => {
    const map = mapRef.current;
    const routes = routeLayerRef.current;
    if (!(map && routes)) {
      return;
    }
    selectedIsoRef.current = selected?.iso ?? null;
    markSelected(countryPathsRef.current, selectedIsoRef.current);

    const key = selected?.iso ?? null;
    const flying = framedRef.current !== key;

    // Redraw (and re-animate) the routes only when their ends change, not on
    // every keystroke in the search, and only once the camera has landed so
    // they draw themselves in the final view.
    const drawKey = selectionKey(selected, pins);
    if (drawnRef.current !== drawKey) {
      drawnRef.current = drawKey;
      routes.clearLayers();
      if (selected) {
        drawLabel(routes, selected);
        const draw = () => {
          if (drawnRef.current === drawKey) {
            drawRoutes(routes, selected, pins);
          }
        };
        if (flying && !prefersReducedMotion()) {
          map.once("moveend", draw);
        } else {
          draw();
        }
      }
    }

    // Fly only when the choice changes.
    if (flying) {
      framedRef.current = key;
      moveCamera(map, selected ? frameOf(selected, pins) : null);
    }
  }, [pins, selected]);

  const zoomBy = (delta: number) => {
    mapRef.current?.setZoom((mapRef.current?.getZoom() ?? 0) + delta);
  };

  const controlClassName =
    "flex h-10 w-10 items-center justify-center text-slate-100 transition-colors hover:bg-navy-800 hover:text-white focus-visible:outline-2 focus-visible:outline-signal focus-visible:-outline-offset-2";

  return (
    <div className="relative h-full w-full">
      <section
        aria-label="Mapa de oportunidades. Use as setas para mover e + ou − para aproximar; a lista ao lado traz os mesmos destinos."
        className="opportunity-map h-full w-full"
        ref={containerRef}
      />

      <div className="absolute top-4 left-4 z-[500] flex flex-col divide-y divide-navy-700 overflow-hidden rounded-xl border border-navy-700 bg-navy-900/90 shadow-[0_12px_28px_-14px_rgba(0,0,0,0.9)]">
        <button
          aria-label="Aproximar"
          className={controlClassName}
          onClick={() => zoomBy(1)}
          type="button"
        >
          <PlusIcon aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          aria-label="Afastar"
          className={controlClassName}
          onClick={() => zoomBy(-1)}
          type="button"
        >
          <MinusIcon aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          aria-label="Voltar à visão geral"
          className={controlClassName}
          onClick={() => {
            if (selected) {
              onSelect(null);
            } else if (mapRef.current) {
              moveCamera(mapRef.current, null);
            }
          }}
          type="button"
        >
          <GlobeIcon aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-4 left-4 z-[500] rounded-xl border border-navy-700/80 bg-navy-950/85 px-3.5 py-3 text-[12px] text-mist"
      >
        <p className="font-semibold text-slate-100">Inscrições abertas</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="map-swatch tier-1" />1
          </span>
          <span className="flex items-center gap-1.5">
            <span className="map-swatch tier-2" />
            2–4
          </span>
          <span className="flex items-center gap-1.5">
            <span className="map-swatch tier-3" />
            5+
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-signal shadow-[0_0_8px_2px_rgba(255,155,15,0.55)]" />
            Cidade
          </span>
        </div>
      </div>
    </div>
  );
};

export default OpportunityMap;
