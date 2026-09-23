import {
  findCountries,
  findState,
  normalizePlaceName,
  type OpportunityLocation,
} from "@/lib/geo";
import cityIndex from "./cities.json";

// Server-only: cities.json is ~1.7 MB and must never reach a client bundle.

type CityRow =
  | [string, number, number, string, number]
  | [string, number, number, string, number, string[]];

interface City {
  lat: number;
  lon: number;
  name: string;
  population: number;
}

const MAX_WORDS_PER_NAME = 4;
const MIN_NAME_LENGTH = 4;
const BRAZIL = "BR";
const SEGMENT_SEPARATOR = /[,;()/|–—]+|\s+-\s+|\s+e\s+/;
const WORD = /[a-z]+(?:'[a-z]+)?/g;

// Words that describe scope, not a place, and must never match a town.
const NOT_PLACES = new Set([
  "brasil",
  "campus",
  "capital",
  "cidade",
  "diversos",
  "edicao",
  "estado",
  "etapa",
  "etapas",
  "exterior",
  "final",
  "hibrido",
  "internacional",
  "mundo",
  "nacional",
  "online",
  "pais",
  "paises",
  "presencial",
  "regionais",
  "regional",
  "remoto",
  "sede",
  "toda",
  "todo",
  "todos",
  "universidade",
  "varia",
  "varios",
]);

/**
 * University towns that share a name with a bigger place. The index keeps the
 * most populous city per name, which put "Princeton" in Florida, "Hanover" in
 * Maryland and "Pasadena" in Texas; in a catalog of academic opportunities the
 * name means the university town. Stanford is too small to be in the index at
 * all. Add a town here when a record's pin lands on its namesake.
 */
const UNIVERSITY_TOWNS: Record<string, Record<string, City>> = {
  US: {
    amherst: { lat: 42.373, lon: -72.52, name: "amherst", population: 0 },
    hanover: { lat: 43.702, lon: -72.29, name: "hanover", population: 0 },
    pasadena: { lat: 34.148, lon: -118.145, name: "pasadena", population: 0 },
    princeton: { lat: 40.349, lon: -74.659, name: "princeton", population: 0 },
    stanford: { lat: 37.424, lon: -122.166, name: "stanford", population: 0 },
  },
};

let citiesByCountry: Map<string, Map<string, City>> | null = null;

/** Name → most populous city with that name (or alternate name), per country. */
const getCityIndex = (): Map<string, Map<string, City>> => {
  if (citiesByCountry) {
    return citiesByCountry;
  }
  citiesByCountry = new Map();
  for (const row of cityIndex.cities as CityRow[]) {
    const [name, lat, lon, country, population] = row;
    const alternates = row.length > 5 ? (row[5] as string[]) : [];
    let names = citiesByCountry.get(country);
    if (!names) {
      names = new Map();
      citiesByCountry.set(country, names);
    }
    const city: City = { lat, lon, name, population };
    for (const key of [name, ...alternates]) {
      const existing = names.get(key);
      if (!existing || existing.population < population) {
        names.set(key, city);
      }
    }
  }
  for (const [country, towns] of Object.entries(UNIVERSITY_TOWNS)) {
    const names = citiesByCountry.get(country);
    for (const [key, town] of Object.entries(towns)) {
      names?.set(key, town);
    }
  }
  return citiesByCountry;
};

/** Words that stay lowercase inside a Portuguese place name. */
const PARTICLES = new Set(["da", "das", "de", "do", "dos", "e"]);

/** "rio de janeiro" -> "Rio de Janeiro", not "Rio De Janeiro". */
const titleCase = (value: string): string =>
  value
    .split(" ")
    .map((word, index) =>
      index > 0 && PARTICLES.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");

/** Words as written, accents and all (split on anything else). */
const ORIGINAL_WORD = /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)?/gu;

/**
 * The name a record itself used for a matched city: "São Paulo", "Rio de
 * Janeiro", "Londres". The index only holds plain ASCII names ("sao paulo",
 * "london"), which read wrong on a Portuguese page, so the record's own words
 * are found by normalizing them one at a time. All-lowercase text is
 * title-cased; a match the words can't be traced to (never expected) falls
 * back to the index name.
 */
const labelFor = (text: string, candidate: string, city: City): string => {
  const words = text.match(ORIGINAL_WORD) ?? [];
  const target = candidate.split(" ");
  for (let start = 0; start + target.length <= words.length; start++) {
    const run = words.slice(start, start + target.length);
    if (
      run.every((word, index) => normalizePlaceName(word) === target[index])
    ) {
      const written = run.join(" ");
      return written === written.toLowerCase() ? titleCase(written) : written;
    }
  }
  return titleCase(city.name);
};

interface FoundCity {
  city: City;
  label: string;
}

/** A city named twice in one record keeps the first way it was written. */
const remember = (found: Map<string, FoundCity>, city: City, label: string) => {
  const key = `${city.lat}:${city.lon}`;
  if (!found.has(key)) {
    found.set(key, { city, label });
  }
};

/** Cities named in free text, longest names first, within the given countries. */
const findCities = (text: string, countries: string[]): FoundCity[] => {
  const index = getCityIndex();
  const found = new Map<string, FoundCity>();
  for (const segment of normalizePlaceName(text).split(SEGMENT_SEPARATOR)) {
    const words = segment.match(WORD) ?? [];
    let start = 0;
    while (start < words.length) {
      let consumed = 1;
      for (let size = MAX_WORDS_PER_NAME; size >= 1; size -= 1) {
        const candidate = words.slice(start, start + size).join(" ");
        if (
          start + size > words.length ||
          candidate.length < MIN_NAME_LENGTH ||
          NOT_PLACES.has(candidate)
        ) {
          continue;
        }
        const city = countries
          .map((country) => index.get(country)?.get(candidate))
          .find(Boolean);
        if (city) {
          remember(found, city, labelFor(text, candidate, city));
          consumed = size;
          break;
        }
      }
      start += consumed;
    }
  }
  return [...found.values()];
};

const cityLocations = (cities: FoundCity[]): OpportunityLocation[] =>
  cities.map(({ city, label }) => ({
    label,
    lat: city.lat,
    lon: city.lon,
    precision: "city",
  }));

/** International records: city text within the record's country or countries. */
export const resolveInternationalLocations = (
  city: string,
  country: string
): OpportunityLocation[] => {
  const countries = findCountries(country);
  if (countries.length === 0) {
    return [];
  }
  const cities = findCities(
    city,
    countries.map((item) => item.iso)
  );
  if (cities.length > 0) {
    return cityLocations(cities);
  }
  return countries.map((item) => ({
    label: country,
    lat: item.lat,
    lon: item.lon,
    precision: "country",
  }));
};

/**
 * National records: a city in Brazil, else the capital of a named state.
 * Nationwide or online programs ("Nacional", "Todo o Brasil") get no pin.
 */
export const resolveNationalLocations = (
  cityState: string
): OpportunityLocation[] => {
  const cities = findCities(cityState, [BRAZIL]);
  if (cities.length > 0) {
    return cityLocations(cities);
  }
  const state = findState(cityState);
  return state
    ? [{ label: cityState, lat: state.lat, lon: state.lon, precision: "state" }]
    : [];
};
