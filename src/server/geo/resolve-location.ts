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
const MAX_LOCATIONS = 3;
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
  return citiesByCountry;
};

const titleCase = (value: string): string =>
  value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

/** Cities named in free text, longest names first, within the given countries. */
const findCities = (text: string, countries: string[]): City[] => {
  const index = getCityIndex();
  const found = new Map<string, City>();
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
          found.set(`${city.lat}:${city.lon}`, city);
          consumed = size;
          break;
        }
      }
      start += consumed;
    }
  }
  return [...found.values()];
};

const cityLocations = (cities: City[]): OpportunityLocation[] =>
  cities.slice(0, MAX_LOCATIONS).map((city) => ({
    label: titleCase(city.name),
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
  return countries.slice(0, MAX_LOCATIONS).map((item) => ({
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
