"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./opportunity-map.css";
import { GlobeIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import useDocumentTheme from "@/hooks/use-document-theme";
import { clusterByDistance } from "@/lib/cluster";
import type { GeoPoint } from "@/lib/geo";
import {
  allCountryOutlines,
  BRAZIL_ISO,
  type CountrySummary,
  type MapCountry,
  type MapPin,
  type MapPlace,
  type Polygon,
  placesLabel,
} from "./map-data";

// The night-lights world as Leaflet tiles in plate carrée (EPSG:4326), so the
// equirectangular source and the country outlines line up without
// reprojection. Countries with open opportunities glow amber; pins mark the
// cities; choosing a country flies there and draws its routes from Brasília.

/** Night lights on the navy ground; on paper, the same world by day (NASA's
 * Blue Marble, cut to the identical grid by scripts/build-map-tiles.mjs). */
const TILE_URLS = {
  dark: "/map-tiles/v1/{z}/{x}/{y}.webp",
  light: "/map-tiles/day-v1/{z}/{x}/{y}.webp",
} as const;
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
/** How far past the viewport, in viewports, the country shapes are drawn.
 * Leaflet redraws its vector layer only when a move ends, so a drag shows
 * whatever was drawn when it began: at its default (0.1) a pan of more than
 * a tenth of the frame reaches the edge of the drawing, and the lit
 * countries stop at a hard line until you let go. At 1.5, one drag can
 * cross a screen and a half, and at the opening zoom the drawing already
 * holds the whole world. */
const VECTOR_PADDING = 1.5;
const FRAME_PADDING = 0.18;
/** Room around a cluster's places when flying in to split it. */
const CLUSTER_FRAME_PADDING = 0.6;
const ROUTE_BOW = 0.22;
const ROUTE_STEPS = 48;
// Country tiers: 1–2, 3–9, 10+. Sized for a catalog of hundreds, where the
// old 1 / 2–4 / 5+ put every country that mattered in the top step.
const MANY_OPPORTUNITIES = 10;
const SOME_OPPORTUNITIES = 3;
/** Pins closer than this on screen merge into one marker with a count. */
const CLUSTER_RADIUS_PX = 30;
/** Routes from Brasília go to this many places at most, the busiest ones:
 * one route per city turned a country with fifty of them into a solid fan. */
const MAX_ROUTES = 6;
/** A place's disc grows with the square root of its count, gently: 11
 * opportunities are 28px, 22 are 31px, and 96 or more stop at 44px, so the
 * busiest city stands out without swallowing its neighbours (at 5px per
 * square root, São Paulo's 96 was a 64px blob next to 13s and 7s). One
 * opportunity stays a plain dot. */
const PIN_SIZE = 20;
const DISC_BASE = 20;
const DISC_GROWTH = 2.4;
const DISC_MAX = 44;
/** How close choosing a city flies: the city with its surroundings. */
const PLACE_ZOOM = 5;

/** Where every route starts: Brasília, the middle of the country. */
const ORIGIN: GeoPoint = { lat: -15.79, lon: -47.88 };

interface OpportunityMapProps {
  countries: CountrySummary[];
  onSelect: (iso: string | null) => void;
  /** A city (or a few close together) chosen on the map. */
  onSelectPlace: (place: MapPlace) => void;
  pins: MapPin[];
  place: MapPlace | null;
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
    keyboard: interactive,
  });

const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The lowest zoom at which the world still covers the whole frame. */
const coverZoom = (map: L.Map): number =>
  Math.ceil(map.getBoundsZoom(WORLD, true) * 4) / 4;

/**
 * Flies to a country's frame (or a cluster's), or back to the opening view.
 * Leaflet scales its vector layer during a flight and redraws it only on
 * landing, so outlines would swell and blur; they're hidden for the trip and
 * shown again on arrival.
 */
const moveCamera = (
  map: L.Map,
  target: L.LatLngBounds | null,
  maxZoom = MAX_FIT_ZOOM
) => {
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
      maxZoom,
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

interface PinCluster extends GeoPoint {
  count: number;
  /** Heaviest first. */
  pins: MapPin[];
}

const discSize = (count: number): number =>
  count <= 1
    ? PIN_SIZE
    : Math.min(
        DISC_MAX,
        Math.round(DISC_BASE + DISC_GROWTH * Math.sqrt(count))
      );

interface Placed {
  /** Distinct opportunities: the union of the pins' ids. */
  count: number;
  pins: MapPin[];
  /** Pin weight for the centre (a pin's own count). */
  weight: number;
  x: number;
  y: number;
}

/** An opportunity listed in two of the cluster's cities counts once. */
const distinctCount = (pins: MapPin[]): number =>
  new Set(pins.flatMap((pin) => pin.ids)).size;

/** Two discs whose edges would overlap, if any. */
const findOverlap = (placed: Placed[]): [number, number] | null => {
  for (let a = 0; a < placed.length; a++) {
    for (let b = a + 1; b < placed.length; b++) {
      const reach = (discSize(placed[a].count) + discSize(placed[b].count)) / 2;
      if (
        Math.hypot(placed[a].x - placed[b].x, placed[a].y - placed[b].y) < reach
      ) {
        return [a, b];
      }
    }
  }
  return null;
};

/**
 * The pins as they'd sit on screen at the map's current zoom, merged where
 * they'd touch (src/lib/cluster.ts), busiest first. Discs grow with their
 * count, so a second pass merges any two that would still overlap. Re-run
 * after every zoom, so clusters split as the map closes in.
 */
const clusterPins = (map: L.Map, pins: MapPin[]): PinCluster[] => {
  const zoom = map.getZoom();
  const placed: Placed[] = clusterByDistance(
    pins,
    (pin) => map.project([pin.lat, pin.lon], zoom),
    (pin) => pin.count,
    CLUSTER_RADIUS_PX
  ).map((cluster) => ({
    count: distinctCount(cluster.items),
    pins: cluster.items,
    weight: cluster.weight,
    x: cluster.x,
    y: cluster.y,
  }));
  let overlap = findOverlap(placed);
  while (overlap) {
    const [a, b] = overlap;
    const [first, second] = [placed[a], placed[b]];
    const weight = first.weight + second.weight;
    const merged = [...first.pins, ...second.pins].sort(
      (x, y) => y.count - x.count
    );
    placed[a] = {
      count: distinctCount(merged),
      pins: merged,
      weight,
      x: (first.x * first.weight + second.x * second.weight) / weight,
      y: (first.y * first.weight + second.y * second.weight) / weight,
    };
    placed.splice(b, 1);
    overlap = findOverlap(placed);
  }
  return placed
    .map((cluster) => {
      const { lat, lng } = map.unproject([cluster.x, cluster.y], zoom);
      return { count: cluster.count, lat, lon: lng, pins: cluster.pins };
    })
    .sort((a, b) => b.count - a.count);
};

const discMarker = (cluster: PinCluster, chosen: boolean): L.Marker => {
  const size = discSize(cluster.count);
  const label = document.createElement("span");
  label.textContent = String(cluster.count);
  return L.marker([cluster.lat, cluster.lon], {
    icon: L.divIcon({
      className: `map-cluster${chosen ? " is-chosen" : ""}`,
      html: label,
      iconSize: [size, size],
    }),
    keyboard: true,
  });
};

/** At maximum zoom, close border cities need an explicit country choice. */
const showBorderChoices = (
  map: L.Map,
  cluster: PinCluster,
  onPlace: (place: MapPlace) => void
) => {
  const choices = document.createElement("div");
  choices.className = "map-place-choices";
  for (const iso of new Set(cluster.pins.map((pin) => pin.iso))) {
    const own = cluster.pins.filter((pin) => pin.iso === iso);
    const label = placesLabel(own.map((pin) => pin.label));
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${label} (${iso}) — ${plural(distinctCount(own))}`;
    button.addEventListener("click", () => {
      map.closePopup();
      onPlace({ iso, keys: own.map((pin) => pin.key), label });
    });
    choices.append(button);
  }
  L.popup()
    .setLatLng([cluster.lat, cluster.lon])
    .setContent(choices)
    .openOn(map);
  choices.querySelector("button")?.focus();
};

/**
 * Every place on the map: a dot for one opportunity, a numbered disc sized by
 * the count otherwise (one city or several close together). Clicking one
 * chooses it: the list narrows to those cities and the camera flies in. A
 * cluster that spans two countries zooms in instead, until it splits.
 */
const drawPins = (
  map: L.Map,
  layer: L.LayerGroup,
  pins: MapPin[],
  place: MapPlace | null,
  onPlace: (place: MapPlace) => void
) => {
  layer.clearLayers();
  const chosenKeys = new Set(place?.keys ?? []);
  for (const cluster of clusterPins(map, pins)) {
    const [first] = cluster.pins;
    if (!first) {
      continue;
    }
    const label = placesLabel(cluster.pins.map((pin) => pin.label));
    const chosen = cluster.pins.some((pin) => chosenKeys.has(pin.key));
    const marker =
      cluster.count <= 1
        ? dotMarker(first, `map-pin${chosen ? " is-chosen" : ""}`, PIN_SIZE)
        : discMarker(cluster, chosen);
    marker.on("add", () => {
      const element = marker.getElement();
      element?.setAttribute("aria-label", `${label}: ${plural(cluster.count)}`);
      element?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          marker.fire("click");
        }
      });
    });
    const oneCountry = cluster.pins.every((pin) => pin.iso === first.iso);
    marker
      .bindTooltip(tooltipNode(label, plural(cluster.count)), {
        className: "map-tooltip",
        direction: "top",
        offset: [0, -discSize(cluster.count) / 2],
      })
      .on("click", () => {
        if (oneCountry) {
          const own = cluster.pins.filter((pin) => pin.iso === first.iso);
          onPlace({
            iso: first.iso,
            keys: own.map((pin) => pin.key),
            label: placesLabel(own.map((pin) => pin.label)),
          });
          return;
        }
        if (map.getZoom() >= map.getMaxZoom()) {
          showBorderChoices(map, cluster, onPlace);
          return;
        }
        const bounds = L.latLngBounds(
          cluster.pins.map((pin): L.LatLngTuple => [pin.lat, pin.lon])
        );
        moveCamera(map, bounds.pad(CLUSTER_FRAME_PADDING), map.getMaxZoom());
      })
      .addTo(layer);
  }
};

/** Where the routes go: the country's city pins, or its capital. */
const destinationsOf = (country: MapCountry, pins: MapPin[]): GeoPoint[] => {
  const targets = pins.filter((pin) => pin.iso === country.iso);
  return targets.length > 0 ? targets : [country.anchor];
};

const selectionKey = (
  country: MapCountry | null,
  pins: MapPin[],
  place: MapPlace | null
): string =>
  country
    ? `${country.iso}|${place?.keys.join(",") ?? ""}|${destinationsOf(
        country,
        pins
      )
        .map((point) => `${point.lat},${point.lon}`)
        .join(";")}`
    : "";

/**
 * Routes from Brasília to the country's busiest places — or to the chosen
 * city — as clustered at the zoom the camera landed on (so a route ends on a
 * marker you can see), at most MAX_ROUTES of them; to the capital when
 * nothing is pinned. None for Brazil itself.
 */
const drawRoutes = (
  map: L.Map,
  layer: L.LayerGroup,
  country: MapCountry,
  pins: MapPin[],
  place: MapPlace | null
) => {
  if (country.iso === BRAZIL_ISO) {
    return;
  }
  const keys = new Set(place?.keys ?? []);
  const own = pins.filter((pin) =>
    place ? keys.has(pin.key) : pin.iso === country.iso
  );
  const destinations: GeoPoint[] =
    own.length > 0
      ? clusterPins(map, own).slice(0, MAX_ROUTES)
      : [country.anchor];
  for (const destination of destinations) {
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

/**
 * Where the camera goes for a choice: the chosen city (close in), else the
 * country's frame, else the opening view. The key says when it changed.
 */
const cameraTarget = (
  selected: MapCountry | null,
  place: MapPlace | null,
  pins: MapPin[]
): { bounds: L.LatLngBounds | null; key: string | null; maxZoom: number } => {
  const placePins = place
    ? pins.filter((pin) => place.keys.includes(pin.key))
    : [];
  if (place && placePins.length > 0) {
    return {
      bounds: L.latLngBounds(
        placePins.map((pin): L.LatLngTuple => [pin.lat, pin.lon])
      ).pad(CLUSTER_FRAME_PADDING),
      key: `place:${place.keys.join(",")}`,
      maxZoom: PLACE_ZOOM,
    };
  }
  return {
    bounds: selected ? frameOf(selected, pins) : null,
    key: selected?.iso ?? null,
    maxZoom: MAX_FIT_ZOOM,
  };
};

/** The chosen country's label now, its routes once the camera lands. */
const showSelection = (
  map: L.Map,
  routes: L.LayerGroup,
  {
    drawKey,
    drawnRef,
    flying,
    pins,
    place,
    selected,
  }: {
    drawKey: string;
    drawnRef: { current: string };
    flying: boolean;
    pins: MapPin[];
    place: MapPlace | null;
    selected: MapCountry | null;
  }
) => {
  routes.clearLayers();
  if (!selected) {
    return;
  }
  drawLabel(routes, selected);
  const draw = () => {
    // A newer choice may have replaced this one during the flight.
    if (drawnRef.current === drawKey) {
      drawRoutes(map, routes, selected, pins, place);
    }
  };
  if (flying && !prefersReducedMotion()) {
    map.once("moveend", draw);
  } else {
    draw();
  }
};

const OpportunityMap = ({
  countries,
  onSelect,
  onSelectPlace,
  pins,
  place,
  selected,
}: OpportunityMapProps) => {
  const containerRef = useRef<HTMLElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const pinsRef = useRef(pins);
  const theme = useDocumentTheme();
  const themeRef = useRef(theme);
  const countryLayerRef = useRef<L.LayerGroup | null>(null);
  const pinLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const countryPathsRef = useRef(new Map<string, CountryShapeLayer[]>());
  const onSelectRef = useRef(onSelect);
  const onSelectPlaceRef = useRef(onSelectPlace);
  const placeRef = useRef(place);
  const framedRef = useRef<string | null>(null);
  const drawnRef = useRef("");
  const selectedIsoRef = useRef<string | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onSelectPlaceRef.current = onSelectPlace;
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
      renderer: L.svg({ padding: VECTOR_PADDING }),
      wheelPxPerZoomLevel: 110,
      zoomControl: false,
      zoomDelta: 0.5,
      zoomSnap: 0.25,
    });
    map.setMinZoom(coverZoom(map));
    map.setView(HOME_CENTER, map.getMinZoom(), { animate: false });

    tileLayerRef.current = L.tileLayer(TILE_URLS[themeRef.current], {
      bounds: L.latLngBounds([-90, -180], [90, 180]),
      className: "map-tiles",
      // Leaflet waits for the gesture to end before loading tiles on touch
      // devices. The whole set is 3 MB, so load them as the map moves.
      keepBuffer: 4,
      maxNativeZoom: NATIVE_ZOOM,
      maxZoom: MAX_ZOOM,
      noWrap: true,
      updateWhenIdle: false,
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
    map.on("zoomend", () => {
      const layer = pinLayerRef.current;
      if (layer) {
        drawPins(map, layer, pinsRef.current, placeRef.current, (chosen) =>
          onSelectPlaceRef.current(chosen)
        );
      }
    });
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

  // The theme can flip while the map is open; swap the tile set in place.
  useEffect(() => {
    themeRef.current = theme;
    tileLayerRef.current?.setUrl(TILE_URLS[theme]);
  }, [theme]);

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

  // City pins, drawn above the countries, clustered for the current zoom (the
  // map re-clusters them itself after every zoom; see the creation effect).
  useEffect(() => {
    pinsRef.current = pins;
    placeRef.current = place;
    const map = mapRef.current;
    const layer = pinLayerRef.current;
    if (!(map && layer)) {
      return;
    }
    drawPins(map, layer, pins, place, (chosen) =>
      onSelectPlaceRef.current(chosen)
    );
  }, [pins, place]);

  // The chosen country (and city): highlight, routes from Brasília, label
  // and camera.
  useEffect(() => {
    const map = mapRef.current;
    const routes = routeLayerRef.current;
    if (!(map && routes)) {
      return;
    }
    selectedIsoRef.current = selected?.iso ?? null;
    markSelected(countryPathsRef.current, selectedIsoRef.current);

    const target = cameraTarget(selected, place, pins);
    const flying = framedRef.current !== target.key;

    // Redraw (and re-animate) the routes only when their ends change, not on
    // every keystroke in the search, and only once the camera has landed so
    // they draw themselves in the final view.
    const drawKey = selectionKey(selected, pins, place);
    if (drawnRef.current !== drawKey) {
      drawnRef.current = drawKey;
      showSelection(map, routes, {
        drawKey,
        drawnRef,
        flying,
        pins,
        place,
        selected,
      });
    }

    // Fly only when the choice changes.
    if (flying) {
      framedRef.current = target.key;
      // Selecting a city while already closer must not zoom back out and
      // merge its marker with neighbouring cities again.
      const maxZoom = place
        ? Math.max(map.getZoom(), target.maxZoom)
        : target.maxZoom;
      moveCamera(map, target.bounds, maxZoom);
    }
  }, [pins, place, selected]);

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
        <p className="font-semibold text-slate-100">Abertas ou em breve</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="map-swatch tier-1" />
            1–2
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="map-swatch tier-2" />
            3–9
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="map-swatch tier-3" />
            10+
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-signal shadow-[0_0_8px_2px_rgba(255,155,15,0.55)]" />
            Cidade
          </span>
        </div>
      </div>
    </div>
  );
};

export default OpportunityMap;
