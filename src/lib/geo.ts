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
  region: WorldRegion;
}

interface StateGeo extends GeoPoint {
  region: BrazilRegion;
}

const DIACRITICS_REGEX = /\p{M}/gu;
const UF_CODE_REGEX = /\b([A-Z]{2})\b/g;

export const normalizePlaceName = (value: string): string =>
  value.normalize("NFD").replace(DIACRITICS_REGEX, "").toLowerCase().trim();

// Keys are normalized Portuguese names (see normalizePlaceName).
const COUNTRIES: Record<string, CountryGeo> = {
  alemanha: { lat: 52.52, lon: 13.4, region: "europa" },
  andorra: { lat: 42.51, lon: 1.52, region: "europa" },
  "arabia saudita": { lat: 24.71, lon: 46.68, region: "asia" },
  argentina: { lat: -34.6, lon: -58.38, region: "america-latina" },
  australia: { lat: -35.28, lon: 149.13, region: "oceania" },
  austria: { lat: 48.21, lon: 16.37, region: "europa" },
  azerbaijao: { lat: 40.41, lon: 49.87, region: "asia" },
  bahrein: { lat: 26.23, lon: 50.59, region: "asia" },
  belgica: { lat: 50.85, lon: 4.35, region: "europa" },
  benin: { lat: 6.5, lon: 2.6, region: "africa" },
  botswana: { lat: -24.65, lon: 25.91, region: "africa" },
  brasil: { lat: -15.79, lon: -47.88, region: "america-latina" },
  bulgaria: { lat: 42.7, lon: 23.32, region: "europa" },
  "burkina faso": { lat: 12.37, lon: -1.52, region: "africa" },
  "cabo verde": { lat: 14.93, lon: -23.51, region: "africa" },
  canada: { lat: 45.42, lon: -75.7, region: "america-do-norte" },
  catar: { lat: 25.29, lon: 51.53, region: "asia" },
  cazaquistao: { lat: 51.17, lon: 71.45, region: "asia" },
  chile: { lat: -33.45, lon: -70.67, region: "america-latina" },
  china: { lat: 39.9, lon: 116.41, region: "asia" },
  chipre: { lat: 35.19, lon: 33.38, region: "europa" },
  colombia: { lat: 4.71, lon: -74.07, region: "america-latina" },
  "coreia do sul": { lat: 37.57, lon: 126.98, region: "asia" },
  "costa rica": { lat: 9.93, lon: -84.08, region: "america-latina" },
  croacia: { lat: 45.81, lon: 15.98, region: "europa" },
  dinamarca: { lat: 55.68, lon: 12.57, region: "europa" },
  egito: { lat: 30.04, lon: 31.24, region: "africa" },
  "emirados arabes unidos": { lat: 24.45, lon: 54.38, region: "asia" },
  escocia: { lat: 55.95, lon: -3.19, region: "europa" },
  eslovaquia: { lat: 48.15, lon: 17.11, region: "europa" },
  espanha: { lat: 40.42, lon: -3.7, region: "europa" },
  "estados unidos": { lat: 38.91, lon: -77.04, region: "america-do-norte" },
  estonia: { lat: 59.44, lon: 24.75, region: "europa" },
  eua: { lat: 38.91, lon: -77.04, region: "america-do-norte" },
  filipinas: { lat: 14.6, lon: 120.98, region: "asia" },
  finlandia: { lat: 60.17, lon: 24.94, region: "europa" },
  franca: { lat: 48.86, lon: 2.35, region: "europa" },
  gambia: { lat: 13.45, lon: -16.58, region: "africa" },
  gana: { lat: 5.6, lon: -0.19, region: "africa" },
  georgia: { lat: 41.72, lon: 44.79, region: "asia" },
  grecia: { lat: 37.98, lon: 23.73, region: "europa" },
  guine: { lat: 9.64, lon: -13.58, region: "africa" },
  holanda: { lat: 52.37, lon: 4.9, region: "europa" },
  "hong kong": { lat: 22.32, lon: 114.17, region: "asia" },
  hungria: { lat: 47.5, lon: 19.04, region: "europa" },
  india: { lat: 28.61, lon: 77.21, region: "asia" },
  indonesia: { lat: -6.21, lon: 106.85, region: "asia" },
  inglaterra: { lat: 51.51, lon: -0.13, region: "europa" },
  irlanda: { lat: 53.35, lon: -6.26, region: "europa" },
  islandia: { lat: 64.15, lon: -21.94, region: "europa" },
  israel: { lat: 31.77, lon: 35.21, region: "asia" },
  italia: { lat: 41.9, lon: 12.5, region: "europa" },
  japao: { lat: 35.68, lon: 139.69, region: "asia" },
  jordania: { lat: 31.95, lon: 35.93, region: "asia" },
  kuwait: { lat: 29.38, lon: 47.99, region: "asia" },
  libano: { lat: 33.89, lon: 35.5, region: "asia" },
  lituania: { lat: 54.69, lon: 25.28, region: "europa" },
  luxemburgo: { lat: 49.61, lon: 6.13, region: "europa" },
  madagascar: { lat: -18.88, lon: 47.51, region: "africa" },
  malasia: { lat: 3.14, lon: 101.69, region: "asia" },
  malta: { lat: 35.9, lon: 14.51, region: "europa" },
  marrocos: { lat: 34.02, lon: -6.83, region: "africa" },
  mexico: { lat: 19.43, lon: -99.13, region: "america-latina" },
  mocambique: { lat: -25.97, lon: 32.57, region: "africa" },
  monaco: { lat: 43.74, lon: 7.42, region: "europa" },
  namibia: { lat: -22.56, lon: 17.07, region: "africa" },
  nigeria: { lat: 9.08, lon: 7.4, region: "africa" },
  noruega: { lat: 59.91, lon: 10.75, region: "europa" },
  "nova zelandia": { lat: -41.29, lon: 174.78, region: "oceania" },
  oma: { lat: 23.59, lon: 58.41, region: "asia" },
  "paises baixos": { lat: 52.37, lon: 4.9, region: "europa" },
  peru: { lat: -12.05, lon: -77.04, region: "america-latina" },
  polonia: { lat: 52.23, lon: 21.01, region: "europa" },
  portugal: { lat: 38.72, lon: -9.14, region: "europa" },
  qatar: { lat: 25.29, lon: 51.53, region: "asia" },
  "reino unido": { lat: 51.51, lon: -0.13, region: "europa" },
  "republica dominicana": { lat: 18.49, lon: -69.93, region: "america-latina" },
  "republica tcheca": { lat: 50.08, lon: 14.44, region: "europa" },
  romenia: { lat: 44.43, lon: 26.1, region: "europa" },
  ruanda: { lat: -1.95, lon: 30.06, region: "africa" },
  russia: { lat: 55.76, lon: 37.62, region: "europa" },
  "san marino": { lat: 43.94, lon: 12.45, region: "europa" },
  senegal: { lat: 14.72, lon: -17.47, region: "africa" },
  seychelles: { lat: -4.62, lon: 55.45, region: "africa" },
  singapura: { lat: 1.35, lon: 103.82, region: "asia" },
  somalia: { lat: 2.05, lon: 45.32, region: "africa" },
  suecia: { lat: 59.33, lon: 18.07, region: "europa" },
  suica: { lat: 46.95, lon: 7.45, region: "europa" },
  tailandia: { lat: 13.76, lon: 100.5, region: "asia" },
  tanzania: { lat: -6.16, lon: 35.75, region: "africa" },
  tchequia: { lat: 50.08, lon: 14.44, region: "europa" },
  togo: { lat: 6.13, lon: 1.22, region: "africa" },
  tunisia: { lat: 36.81, lon: 10.18, region: "africa" },
  turquia: { lat: 39.93, lon: 32.86, region: "asia" },
  ucrania: { lat: 50.45, lon: 30.52, region: "europa" },
  uganda: { lat: 0.35, lon: 32.58, region: "africa" },
  vietna: { lat: 21.03, lon: 105.85, region: "asia" },
  zambia: { lat: -15.39, lon: 28.32, region: "africa" },
};

const COUNTRY_NAMES = Object.keys(COUNTRIES).sort(
  (a, b) => b.length - a.length
);

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
