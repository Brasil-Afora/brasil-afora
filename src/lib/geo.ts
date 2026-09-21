// Approximate locations (capital cities) used to place decorative map pins and
// pick a regional night-map cover. Precision is deliberately coarse.

export interface GeoPoint {
  lat: number;
  lon: number;
}

export type WorldRegion =
  | "africa"
  | "america-do-norte"
  | "america-latina"
  | "asia"
  | "europa"
  | "oceania";

export type BrazilRegion =
  | "centro-oeste"
  | "nordeste"
  | "norte"
  | "sudeste"
  | "sul";

interface CountryGeo extends GeoPoint {
  /** ISO 3166-1 alpha-2, as used by GeoNames. */
  iso: string;
  region: WorldRegion;
}

interface StateGeo extends GeoPoint {
  region: BrazilRegion;
}

/** Where an opportunity takes place, as resolved on the server. */
export interface OpportunityLocation extends GeoPoint {
  label: string;
  precision: "city" | "country" | "state";
}

/** A located opportunity, as the maps draw it. */
export interface MapDestination extends OpportunityLocation {
  country: string;
  name: string;
  scope: "international" | "national";
}

const DIACRITICS_REGEX = /\p{M}/gu;
const UF_CODE_REGEX = /\b([A-Z]{2})\b/g;

export const normalizePlaceName = (value: string): string =>
  value.normalize("NFD").replace(DIACRITICS_REGEX, "").toLowerCase().trim();

// Keys are normalized Portuguese names (see normalizePlaceName).
const COUNTRIES: Record<string, CountryGeo> = {
  alemanha: { iso: "DE", lat: 52.52, lon: 13.4, region: "europa" },
  andorra: { iso: "AD", lat: 42.51, lon: 1.52, region: "europa" },
  "arabia saudita": { iso: "SA", lat: 24.71, lon: 46.68, region: "asia" },
  argentina: { iso: "AR", lat: -34.6, lon: -58.38, region: "america-latina" },
  australia: { iso: "AU", lat: -35.28, lon: 149.13, region: "oceania" },
  austria: { iso: "AT", lat: 48.21, lon: 16.37, region: "europa" },
  azerbaijao: { iso: "AZ", lat: 40.41, lon: 49.87, region: "asia" },
  bahrein: { iso: "BH", lat: 26.23, lon: 50.59, region: "asia" },
  belgica: { iso: "BE", lat: 50.85, lon: 4.35, region: "europa" },
  benin: { iso: "BJ", lat: 6.5, lon: 2.6, region: "africa" },
  botswana: { iso: "BW", lat: -24.65, lon: 25.91, region: "africa" },
  brasil: { iso: "BR", lat: -15.79, lon: -47.88, region: "america-latina" },
  bulgaria: { iso: "BG", lat: 42.7, lon: 23.32, region: "europa" },
  "burkina faso": { iso: "BF", lat: 12.37, lon: -1.52, region: "africa" },
  "cabo verde": { iso: "CV", lat: 14.93, lon: -23.51, region: "africa" },
  canada: { iso: "CA", lat: 45.42, lon: -75.7, region: "america-do-norte" },
  catar: { iso: "QA", lat: 25.29, lon: 51.53, region: "asia" },
  cazaquistao: { iso: "KZ", lat: 51.17, lon: 71.45, region: "asia" },
  chile: { iso: "CL", lat: -33.45, lon: -70.67, region: "america-latina" },
  china: { iso: "CN", lat: 39.9, lon: 116.41, region: "asia" },
  chipre: { iso: "CY", lat: 35.19, lon: 33.38, region: "europa" },
  colombia: { iso: "CO", lat: 4.71, lon: -74.07, region: "america-latina" },
  "coreia do sul": { iso: "KR", lat: 37.57, lon: 126.98, region: "asia" },
  "costa rica": { iso: "CR", lat: 9.93, lon: -84.08, region: "america-latina" },
  croacia: { iso: "HR", lat: 45.81, lon: 15.98, region: "europa" },
  dinamarca: { iso: "DK", lat: 55.68, lon: 12.57, region: "europa" },
  egito: { iso: "EG", lat: 30.04, lon: 31.24, region: "africa" },
  "emirados arabes unidos": {
    iso: "AE",
    lat: 24.45,
    lon: 54.38,
    region: "asia",
  },
  escocia: { iso: "GB", lat: 55.95, lon: -3.19, region: "europa" },
  eslovaquia: { iso: "SK", lat: 48.15, lon: 17.11, region: "europa" },
  espanha: { iso: "ES", lat: 40.42, lon: -3.7, region: "europa" },
  "estados unidos": {
    iso: "US",
    lat: 38.91,
    lon: -77.04,
    region: "america-do-norte",
  },
  estonia: { iso: "EE", lat: 59.44, lon: 24.75, region: "europa" },
  eua: { iso: "US", lat: 38.91, lon: -77.04, region: "america-do-norte" },
  filipinas: { iso: "PH", lat: 14.6, lon: 120.98, region: "asia" },
  finlandia: { iso: "FI", lat: 60.17, lon: 24.94, region: "europa" },
  franca: { iso: "FR", lat: 48.86, lon: 2.35, region: "europa" },
  gambia: { iso: "GM", lat: 13.45, lon: -16.58, region: "africa" },
  gana: { iso: "GH", lat: 5.6, lon: -0.19, region: "africa" },
  georgia: { iso: "GE", lat: 41.72, lon: 44.79, region: "asia" },
  grecia: { iso: "GR", lat: 37.98, lon: 23.73, region: "europa" },
  guine: { iso: "GN", lat: 9.64, lon: -13.58, region: "africa" },
  holanda: { iso: "NL", lat: 52.37, lon: 4.9, region: "europa" },
  "hong kong": { iso: "HK", lat: 22.32, lon: 114.17, region: "asia" },
  hungria: { iso: "HU", lat: 47.5, lon: 19.04, region: "europa" },
  india: { iso: "IN", lat: 28.61, lon: 77.21, region: "asia" },
  indonesia: { iso: "ID", lat: -6.21, lon: 106.85, region: "asia" },
  inglaterra: { iso: "GB", lat: 51.51, lon: -0.13, region: "europa" },
  irlanda: { iso: "IE", lat: 53.35, lon: -6.26, region: "europa" },
  islandia: { iso: "IS", lat: 64.15, lon: -21.94, region: "europa" },
  israel: { iso: "IL", lat: 31.77, lon: 35.21, region: "asia" },
  italia: { iso: "IT", lat: 41.9, lon: 12.5, region: "europa" },
  japao: { iso: "JP", lat: 35.68, lon: 139.69, region: "asia" },
  jordania: { iso: "JO", lat: 31.95, lon: 35.93, region: "asia" },
  kuwait: { iso: "KW", lat: 29.38, lon: 47.99, region: "asia" },
  libano: { iso: "LB", lat: 33.89, lon: 35.5, region: "asia" },
  lituania: { iso: "LT", lat: 54.69, lon: 25.28, region: "europa" },
  luxemburgo: { iso: "LU", lat: 49.61, lon: 6.13, region: "europa" },
  madagascar: { iso: "MG", lat: -18.88, lon: 47.51, region: "africa" },
  malasia: { iso: "MY", lat: 3.14, lon: 101.69, region: "asia" },
  malta: { iso: "MT", lat: 35.9, lon: 14.51, region: "europa" },
  marrocos: { iso: "MA", lat: 34.02, lon: -6.83, region: "africa" },
  mexico: { iso: "MX", lat: 19.43, lon: -99.13, region: "america-latina" },
  mocambique: { iso: "MZ", lat: -25.97, lon: 32.57, region: "africa" },
  monaco: { iso: "MC", lat: 43.74, lon: 7.42, region: "europa" },
  namibia: { iso: "NA", lat: -22.56, lon: 17.07, region: "africa" },
  nigeria: { iso: "NG", lat: 9.08, lon: 7.4, region: "africa" },
  noruega: { iso: "NO", lat: 59.91, lon: 10.75, region: "europa" },
  "nova zelandia": { iso: "NZ", lat: -41.29, lon: 174.78, region: "oceania" },
  oma: { iso: "OM", lat: 23.59, lon: 58.41, region: "asia" },
  "paises baixos": { iso: "NL", lat: 52.37, lon: 4.9, region: "europa" },
  peru: { iso: "PE", lat: -12.05, lon: -77.04, region: "america-latina" },
  polonia: { iso: "PL", lat: 52.23, lon: 21.01, region: "europa" },
  portugal: { iso: "PT", lat: 38.72, lon: -9.14, region: "europa" },
  qatar: { iso: "QA", lat: 25.29, lon: 51.53, region: "asia" },
  "reino unido": { iso: "GB", lat: 51.51, lon: -0.13, region: "europa" },
  "republica dominicana": {
    iso: "DO",
    lat: 18.49,
    lon: -69.93,
    region: "america-latina",
  },
  "republica tcheca": { iso: "CZ", lat: 50.08, lon: 14.44, region: "europa" },
  romenia: { iso: "RO", lat: 44.43, lon: 26.1, region: "europa" },
  ruanda: { iso: "RW", lat: -1.95, lon: 30.06, region: "africa" },
  russia: { iso: "RU", lat: 55.76, lon: 37.62, region: "europa" },
  "san marino": { iso: "SM", lat: 43.94, lon: 12.45, region: "europa" },
  senegal: { iso: "SN", lat: 14.72, lon: -17.47, region: "africa" },
  seychelles: { iso: "SC", lat: -4.62, lon: 55.45, region: "africa" },
  singapura: { iso: "SG", lat: 1.35, lon: 103.82, region: "asia" },
  somalia: { iso: "SO", lat: 2.05, lon: 45.32, region: "africa" },
  suecia: { iso: "SE", lat: 59.33, lon: 18.07, region: "europa" },
  suica: { iso: "CH", lat: 46.95, lon: 7.45, region: "europa" },
  tailandia: { iso: "TH", lat: 13.76, lon: 100.5, region: "asia" },
  tanzania: { iso: "TZ", lat: -6.16, lon: 35.75, region: "africa" },
  tchequia: { iso: "CZ", lat: 50.08, lon: 14.44, region: "europa" },
  togo: { iso: "TG", lat: 6.13, lon: 1.22, region: "africa" },
  tunisia: { iso: "TN", lat: 36.81, lon: 10.18, region: "africa" },
  turquia: { iso: "TR", lat: 39.93, lon: 32.86, region: "asia" },
  ucrania: { iso: "UA", lat: 50.45, lon: 30.52, region: "europa" },
  uganda: { iso: "UG", lat: 0.35, lon: 32.58, region: "africa" },
  vietna: { iso: "VN", lat: 21.03, lon: 105.85, region: "asia" },
  zambia: { iso: "ZM", lat: -15.39, lon: 28.32, region: "africa" },
};

const COUNTRY_NAMES = Object.keys(COUNTRIES).sort(
  (a, b) => b.length - a.length
);

/** Every known country mentioned in a free-text country field. */
export const findCountries = (value: string): CountryGeo[] => {
  const normalized = normalizePlaceName(value);
  const exact = COUNTRIES[normalized];
  if (exact) {
    return [exact];
  }
  return COUNTRY_NAMES.filter((candidate) =>
    normalized.includes(candidate)
  ).map((candidate) => COUNTRIES[candidate]);
};

/** First known country mentioned in a free-text country field. */
export const findCountry = (value: string): CountryGeo | null => {
  const normalized = normalizePlaceName(value);
  const exact = COUNTRIES[normalized];
  if (exact) {
    return exact;
  }
  const name = COUNTRY_NAMES.find((candidate) =>
    normalized.includes(candidate)
  );
  return name ? COUNTRIES[name] : null;
};

// State capitals.
const STATES: Record<string, StateGeo> = {
  AC: { lat: -9.97, lon: -67.81, region: "norte" },
  AL: { lat: -9.67, lon: -35.74, region: "nordeste" },
  AM: { lat: -3.12, lon: -60.02, region: "norte" },
  AP: { lat: 0.03, lon: -51.07, region: "norte" },
  BA: { lat: -12.97, lon: -38.5, region: "nordeste" },
  CE: { lat: -3.73, lon: -38.52, region: "nordeste" },
  DF: { lat: -15.79, lon: -47.88, region: "centro-oeste" },
  ES: { lat: -20.32, lon: -40.34, region: "sudeste" },
  GO: { lat: -16.69, lon: -49.26, region: "centro-oeste" },
  MA: { lat: -2.53, lon: -44.3, region: "nordeste" },
  MG: { lat: -19.92, lon: -43.94, region: "sudeste" },
  MS: { lat: -20.47, lon: -54.62, region: "centro-oeste" },
  MT: { lat: -15.6, lon: -56.1, region: "centro-oeste" },
  PA: { lat: -1.46, lon: -48.5, region: "norte" },
  PB: { lat: -7.12, lon: -34.86, region: "nordeste" },
  PE: { lat: -8.05, lon: -34.88, region: "nordeste" },
  PI: { lat: -5.09, lon: -42.8, region: "nordeste" },
  PR: { lat: -25.43, lon: -49.27, region: "sul" },
  RJ: { lat: -22.91, lon: -43.17, region: "sudeste" },
  RN: { lat: -5.79, lon: -35.21, region: "nordeste" },
  RO: { lat: -8.76, lon: -63.9, region: "norte" },
  RR: { lat: 2.82, lon: -60.67, region: "norte" },
  RS: { lat: -30.03, lon: -51.23, region: "sul" },
  SC: { lat: -27.59, lon: -48.55, region: "sul" },
  SE: { lat: -10.91, lon: -37.07, region: "nordeste" },
  SP: { lat: -23.55, lon: -46.63, region: "sudeste" },
  TO: { lat: -10.18, lon: -48.33, region: "norte" },
};

const STATE_NAMES: [RegExp, string][] = [
  [/\bsao paulo\b/, "SP"],
  [/\brio de janeiro\b/, "RJ"],
  [/\bminas gerais\b/, "MG"],
  [/\bespirito santo\b/, "ES"],
  [/\brio grande do sul\b/, "RS"],
  [/\bsanta catarina\b/, "SC"],
  [/\bparana\b/, "PR"],
  [/\bbahia\b/, "BA"],
  [/\bpernambuco\b/, "PE"],
  [/\bceara\b/, "CE"],
  [/\bmaranhao\b/, "MA"],
  [/\bamazonia\b/, "AM"],
  [/\bamazonas\b/, "AM"],
  [/\bbrasilia\b/, "DF"],
  [/\bgoias\b/, "GO"],
];

/** Brazilian state named or abbreviated in a free-text "cidade, UF" field. */
export const findState = (value: string): StateGeo | null => {
  for (const match of value.matchAll(UF_CODE_REGEX)) {
    const state = STATES[match[1]];
    if (state) {
      return state;
    }
  }
  const normalized = normalizePlaceName(value);
  const named = STATE_NAMES.find(([pattern]) => pattern.test(normalized));
  return named ? STATES[named[1]] : null;
};
