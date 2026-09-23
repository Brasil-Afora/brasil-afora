import {
  type CatalogItem,
  toInternationalItem,
  toNationalItem,
} from "@/components/opportunities/catalog-model";
import {
  isVerifiedInternationalOpportunityId,
  isVerifiedNationalOpportunityId,
  verifiedInternationalOpportunities,
  verifiedNationalOpportunities,
} from "@/data/verified-opportunities";
import {
  type CountryGeo,
  findCountries,
  findCountryByIso,
  findCountryByName,
  type GeoPoint,
  normalizePlaceName,
} from "@/lib/geo";
import type {
  InternationalOpportunity,
  NationalOpportunity,
} from "@/lib/opportunities-api";
import type { LocationsById } from "@/server/geo/opportunity-locations";
import countryShapes from "./countries.json";

// The map page works on open opportunities only, grouped by the country they
// happen in. Countries come from each record's own country text; pins from the
// locations the server resolved from its city text. Nothing is placed by hand.

/** [lon, lat] rings of one polygon; the first ring is the outline. */
export type Polygon = [number, number][][];

interface CountryShape {
  id: string;
  name: string;
  polygons: Polygon[];
}

export interface MapItem extends CatalogItem {
  /** The countries it happens in. */
  countries: MapCountry[];
  levels: string[];
  search: string;
  type: string;
}

export interface MapCountry {
  /** Where its label sits (the capital). */
  anchor: GeoPoint;
  iso: string;
  name: string;
  /** Empty for countries too small for the outline set (Singapore, Malta…). */
  polygons: Polygon[];
}

export interface CountrySummary extends MapCountry {
  items: MapItem[];
  next: MapItem | null;
  types: { count: number; label: string }[];
}

export interface MapPin extends GeoPoint {
  /** Distinct opportunities here (ids.length). */
  count: number;
  /** The opportunities located here. One can list several cities, so a
   * cluster counts the union of its pins' ids, never the sum. */
  ids: string[];
  iso: string;
  /** The place's identity (placeKey), shared with the items located there. */
  key: string;
  label: string;
}

/**
 * One or more places chosen on the map: the list narrows to what's open
 * there. `iso` is the country the places are in.
 */
export interface MapPlace {
  iso: string;
  keys: string[];
  label: string;
}

/** The same key for a pin and for the locations that made it. */
export const placeKey = ({ lat, lon }: GeoPoint): string =>
  `${lat.toFixed(PIN_PRECISION)}:${lon.toFixed(PIN_PRECISION)}`;

/** Items that take place in any of the chosen places. */
export const itemsAt = (items: MapItem[], place: MapPlace): MapItem[] => {
  const keys = new Set(place.keys);
  return items.filter((item) =>
    item.locations.some(
      (location) =>
        location.precision !== "country" && keys.has(placeKey(location))
    )
  );
};

/** "Boston", "Boston e Cambridge", "Boston, Cambridge e Providence", then
 * "Boston, Cambridge, Providence e mais 4 lugares". Names heaviest first. */
const NAMED_PLACES = 3;
export const placesLabel = (names: string[]): string => {
  if (names.length <= 1) {
    return names[0] ?? "";
  }
  if (names.length <= NAMED_PLACES) {
    return `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
  }
  const others = names.length - NAMED_PLACES;
  return `${names.slice(0, NAMED_PLACES).join(", ")} e mais ${others} ${others === 1 ? "lugar" : "lugares"}`;
};

export interface MapFilters {
  levels: string[];
  query: string;
  types: string[];
  verifiedOnly: boolean;
}

export const EMPTY_FILTERS: MapFilters = {
  levels: [],
  query: "",
  types: [],
  verifiedOnly: false,
};

const BRAZIL = "BR";
const PIN_PRECISION = 2;
const LEVEL_SEPARATOR_REGEX = /\s*[|;·]\s*/;
const WHITESPACE_REGEX = /\s+/;

// ---------------------------------------------------------------------------
// Countries

const SHAPES = countryShapes as CountryShape[];

const area = (polygon: Polygon): number => {
  const ring = polygon[0] ?? [];
  let sum = 0;
  for (let index = 0; index < ring.length; index++) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[(index + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum / 2);
};

/** Largest outline first: the mainland, which is what the map frames. */
const byArea = (a: Polygon, b: Polygon): number => area(b) - area(a);

const shapeByIso = new Map<string, CountryShape>();
for (const shape of SHAPES) {
  const country = findCountryByName(shape.name);
  if (country) {
    shapeByIso.set(country.iso, {
      ...shape,
      polygons: [...shape.polygons].sort(byArea),
    });
  }
}

const countryOf = (geo: CountryGeo, fallbackName: string): MapCountry => {
  const shape = shapeByIso.get(geo.iso);
  return {
    anchor: { lat: geo.lat, lon: geo.lon },
    iso: geo.iso,
    name: shape?.name ?? fallbackName,
    polygons: shape?.polygons ?? [],
  };
};

/** A country the map can draw, even when nothing is open there. */
export const countryByIso = (iso: string): MapCountry | null => {
  const geo = findCountryByIso(iso);
  const shape = shapeByIso.get(iso);
  return geo && shape ? countryOf(geo, shape.name) : null;
};

/** Every outline, for the faint borders under the lit countries. */
export const allCountryOutlines = (): Polygon[] =>
  SHAPES.flatMap((shape) => shape.polygons);

// ---------------------------------------------------------------------------
// Items

const normalize = (value: string): string => normalizePlaceName(value);

const levelsOf = (nivelEnsino: string): string[] =>
  nivelEnsino
    .split(LEVEL_SEPARATOR_REGEX)
    .map((level) => level.trim())
    .filter(Boolean);

const nameKey = (name: string): string =>
  name.trim().toLocaleLowerCase("pt-BR");

export const isMapOpportunityOpen = (item: CatalogItem): boolean =>
  item.curatedStatus
    ? ["open", "rolling"].includes(item.curatedStatus) &&
      (item.daysLeft === null || item.daysLeft >= 0)
    : (item.daysLeft !== null && item.daysLeft >= 0) ||
      item.lifecycleLabel === "Inscrições contínuas" ||
      item.lifecycleLabel === "Inscrições abertas";

/** Published catalog records supersede starter records with matching names. */
const mergeByName = <T extends { nome: string }>(
  verified: T[],
  catalog: T[]
): T[] => {
  const names = new Set(catalog.map((item) => nameKey(item.nome)));
  return [
    ...catalog,
    ...verified.filter((item) => !names.has(nameKey(item.nome))),
  ];
};

interface MapSources {
  international: InternationalOpportunity[];
  national: NationalOpportunity[];
  now: Date;
  verifiedLocations: { international: LocationsById; national: LocationsById };
}

/** Countries named in a record; one without an outline keeps the record's name. */
const countriesOf = (pais: string): MapCountry[] => {
  const found = [
    ...new Map(findCountries(pais).map((geo) => [geo.iso, geo])).values(),
  ];
  return found.map((geo) =>
    countryOf(geo, found.length === 1 ? pais.trim() : geo.iso)
  );
};

export const buildMapItems = ({
  international,
  national,
  now,
  verifiedLocations,
}: MapSources): MapItem[] => {
  const abroad = mergeByName(
    verifiedInternationalOpportunities.map((opportunity) => ({
      ...opportunity,
      localizacoes: verifiedLocations.international[opportunity.id] ?? [],
    })),
    international
  ).map((opportunity) => ({
    ...toInternationalItem(
      opportunity,
      opportunity.verified ??
        isVerifiedInternationalOpportunityId(opportunity.id),
      now
    ),
    countries: countriesOf(opportunity.pais),
    levels: levelsOf(opportunity.nivelEnsino),
    search: normalize(
      [
        opportunity.nome,
        opportunity.instituicaoResponsavel,
        opportunity.pais,
        opportunity.cidade,
        opportunity.tipo,
      ].join(" ")
    ),
    type: opportunity.tipo.trim(),
  }));

  const home = mergeByName(
    verifiedNationalOpportunities.map((opportunity) => ({
      ...opportunity,
      localizacoes: verifiedLocations.national[opportunity.id] ?? [],
    })),
    national
  ).map((opportunity) => ({
    ...toNationalItem(
      opportunity,
      opportunity.verified ?? isVerifiedNationalOpportunityId(opportunity.id),
      now
    ),
    countries: countriesOf("Brasil"),
    levels: levelsOf(opportunity.nivelEnsino),
    search: normalize(
      [
        opportunity.nome,
        opportunity.instituicaoResponsavel,
        opportunity.cidadeEstado,
        "Brasil",
        opportunity.tipo,
      ].join(" ")
    ),
    type: opportunity.tipo.trim(),
  }));

  return [...abroad, ...home].filter(isMapOpportunityOpen);
};

// ---------------------------------------------------------------------------
// Filters

/** Distinct values, most common first, first spelling wins. */
const optionsOf = (values: string[]): string[] => {
  const counts = new Map<string, { count: number; label: string }>();
  for (const value of values) {
    const key = normalize(value);
    const entry = counts.get(key) ?? { count: 0, label: value };
    entry.count++;
    counts.set(key, entry);
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((entry) => entry.label);
};

export const filterOptions = (items: MapItem[]) => ({
  levels: optionsOf(items.flatMap((item) => item.levels)),
  types: optionsOf(items.map((item) => item.type).filter(Boolean)),
});

const includesNormalized = (values: string[], selected: string[]) => {
  const wanted = new Set(selected.map(normalize));
  return values.some((value) => wanted.has(normalize(value)));
};

export const applyMapFilters = (
  items: MapItem[],
  filters: MapFilters
): MapItem[] => {
  const words = normalize(filters.query)
    .split(WHITESPACE_REGEX)
    .filter(Boolean);
  return items.filter(
    (item) =>
      (!filters.verifiedOnly || item.verified) &&
      (filters.types.length === 0 ||
        includesNormalized([item.type], filters.types)) &&
      (filters.levels.length === 0 ||
        includesNormalized(item.levels, filters.levels)) &&
      words.every((word) => item.search.includes(word))
  );
};

export const countActiveFilters = (filters: MapFilters): number =>
  filters.types.length +
  filters.levels.length +
  (filters.verifiedOnly ? 1 : 0) +
  (filters.query.trim() ? 1 : 0);

// ---------------------------------------------------------------------------
// Grouping

const UNKNOWN_DEADLINE = Number.MAX_SAFE_INTEGER;

const byDeadline = (a: MapItem, b: MapItem): number =>
  (a.daysLeft ?? UNKNOWN_DEADLINE) - (b.daysLeft ?? UNKNOWN_DEADLINE);

const typesOf = (items: MapItem[]) =>
  optionsOf(items.map((item) => item.type).filter(Boolean)).map((label) => ({
    count: items.filter((item) => normalize(item.type) === normalize(label))
      .length,
    label,
  }));

const SOONEST = 3;

/** The few opportunities that close first. */
export const soonestOf = (items: MapItem[]): MapItem[] =>
  [...items].sort(byDeadline).slice(0, SOONEST);

export const summarizeCountries = (
  items: MapItem[]
): { countries: CountrySummary[]; unplaced: MapItem[] } => {
  const groups = new Map<string, { country: MapCountry; items: MapItem[] }>();
  const unplaced: MapItem[] = [];
  for (const item of items) {
    if (item.countries.length === 0) {
      unplaced.push(item);
    }
    for (const country of item.countries) {
      const group = groups.get(country.iso) ?? { country, items: [] };
      group.items.push(item);
      groups.set(country.iso, group);
    }
  }
  const countries = [...groups.values()]
    .map(({ country, items: group }): CountrySummary => {
      const sorted = [...group].sort(byDeadline);
      return {
        ...country,
        items: sorted,
        next:
          sorted.find((item) => item.deadline && item.daysLeft !== null) ??
          null,
        types: typesOf(sorted),
      };
    })
    .sort(
      (a, b) =>
        b.items.length - a.items.length ||
        (a.next && b.next ? byDeadline(a.next, b.next) : 0) ||
        a.name.localeCompare(b.name, "pt-BR")
    );
  return { countries, unplaced };
};

const distance = (a: GeoPoint, b: GeoPoint): number =>
  Math.hypot(a.lat - b.lat, a.lon - b.lon);

/** Which of the item's countries a location sits in (the nearest capital). */
const countryForPoint = (item: MapItem, point: GeoPoint): string | null => {
  if (item.scope === "national") {
    return BRAZIL;
  }
  if (item.countries.length === 0) {
    return null;
  }
  return item.countries.reduce((best, country) =>
    distance(country.anchor, point) < distance(best.anchor, point)
      ? country
      : best
  ).iso;
};

/**
 * One pin per city or state; a location known only as "the country" is left
 * to the country's own highlight rather than faking a capital-city pin.
 */
export const pinsOf = (items: MapItem[]): MapPin[] => {
  const pins = new Map<string, MapPin>();
  for (const item of items) {
    for (const location of item.locations) {
      if (location.precision === "country") {
        continue;
      }
      const iso = countryForPoint(item, location);
      if (!iso) {
        continue;
      }
      const key = placeKey(location);
      const pin = pins.get(key);
      if (pin) {
        if (!pin.ids.includes(item.id)) {
          pin.ids.push(item.id);
          pin.count = pin.ids.length;
        }
      } else {
        pins.set(key, {
          count: 1,
          ids: [item.id],
          iso,
          key,
          label: location.label,
          lat: location.lat,
          lon: location.lon,
        });
      }
    }
  }
  return [...pins.values()];
};

export const BRAZIL_ISO = BRAZIL;
