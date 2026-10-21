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

export interface CountryGeo extends GeoPoint {
  /** ISO 3166-1 alpha-2, as used by GeoNames. */
  iso: string;
  /** Its usual Portuguese name, the same for every alias ("EUA", "Holanda"). */
  name: string;
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
  alemanha: {
    iso: "DE",
    name: "Alemanha",
    lat: 52.52,
    lon: 13.4,
    region: "europa",
  },
  andorra: {
    iso: "AD",
    name: "Andorra",
    lat: 42.51,
    lon: 1.52,
    region: "europa",
  },
  armenia: {
    iso: "AM",
    name: "Armênia",
    lat: 40.18,
    lon: 44.51,
    region: "asia",
  },
  "arabia saudita": {
    iso: "SA",
    name: "Arábia Saudita",
    lat: 24.71,
    lon: 46.68,
    region: "asia",
  },
  argentina: {
    iso: "AR",
    name: "Argentina",
    lat: -34.6,
    lon: -58.38,
    region: "america-latina",
  },
  australia: {
    iso: "AU",
    name: "Austrália",
    lat: -35.28,
    lon: 149.13,
    region: "oceania",
  },
  austria: {
    iso: "AT",
    name: "Áustria",
    lat: 48.21,
    lon: 16.37,
    region: "europa",
  },
  azerbaijao: {
    iso: "AZ",
    name: "Azerbaijão",
    lat: 40.41,
    lon: 49.87,
    region: "asia",
  },
  bahrein: {
    iso: "BH",
    name: "Bahrein",
    lat: 26.23,
    lon: 50.59,
    region: "asia",
  },
  belgica: {
    iso: "BE",
    name: "Bélgica",
    lat: 50.85,
    lon: 4.35,
    region: "europa",
  },
  benin: { iso: "BJ", name: "Benin", lat: 6.5, lon: 2.6, region: "africa" },
  botswana: {
    iso: "BW",
    name: "Botswana",
    lat: -24.65,
    lon: 25.91,
    region: "africa",
  },
  brasil: {
    iso: "BR",
    name: "Brasil",
    lat: -15.79,
    lon: -47.88,
    region: "america-latina",
  },
  bulgaria: {
    iso: "BG",
    name: "Bulgária",
    lat: 42.7,
    lon: 23.32,
    region: "europa",
  },
  "burkina faso": {
    iso: "BF",
    name: "Burkina Faso",
    lat: 12.37,
    lon: -1.52,
    region: "africa",
  },
  "cabo verde": {
    iso: "CV",
    name: "Cabo Verde",
    lat: 14.93,
    lon: -23.51,
    region: "africa",
  },
  camboja: {
    iso: "KH",
    name: "Camboja",
    lat: 11.56,
    lon: 104.92,
    region: "asia",
  },
  canada: {
    iso: "CA",
    name: "Canadá",
    lat: 45.42,
    lon: -75.7,
    region: "america-do-norte",
  },
  catar: { iso: "QA", name: "Catar", lat: 25.29, lon: 51.53, region: "asia" },
  cazaquistao: {
    iso: "KZ",
    name: "Cazaquistão",
    lat: 51.17,
    lon: 71.45,
    region: "asia",
  },
  chile: {
    iso: "CL",
    name: "Chile",
    lat: -33.45,
    lon: -70.67,
    region: "america-latina",
  },
  china: { iso: "CN", name: "China", lat: 39.9, lon: 116.41, region: "asia" },
  chipre: {
    iso: "CY",
    name: "Chipre",
    lat: 35.19,
    lon: 33.38,
    region: "europa",
  },
  colombia: {
    iso: "CO",
    name: "Colômbia",
    lat: 4.71,
    lon: -74.07,
    region: "america-latina",
  },
  "coreia do sul": {
    iso: "KR",
    name: "Coreia do Sul",
    lat: 37.57,
    lon: 126.98,
    region: "asia",
  },
  "costa rica": {
    iso: "CR",
    name: "Costa Rica",
    lat: 9.93,
    lon: -84.08,
    region: "america-latina",
  },
  croacia: {
    iso: "HR",
    name: "Croácia",
    lat: 45.81,
    lon: 15.98,
    region: "europa",
  },
  dinamarca: {
    iso: "DK",
    name: "Dinamarca",
    lat: 55.68,
    lon: 12.57,
    region: "europa",
  },
  egito: { iso: "EG", name: "Egito", lat: 30.04, lon: 31.24, region: "africa" },
  "emirados arabes unidos": {
    iso: "AE",
    name: "Emirados Árabes Unidos",
    lat: 24.45,
    lon: 54.38,
    region: "asia",
  },
  escocia: {
    iso: "GB",
    name: "Reino Unido",
    lat: 55.95,
    lon: -3.19,
    region: "europa",
  },
  eslovaquia: {
    iso: "SK",
    name: "Eslováquia",
    lat: 48.15,
    lon: 17.11,
    region: "europa",
  },
  espanha: {
    iso: "ES",
    name: "Espanha",
    lat: 40.42,
    lon: -3.7,
    region: "europa",
  },
  "estados unidos": {
    iso: "US",
    name: "Estados Unidos",
    lat: 38.91,
    lon: -77.04,
    region: "america-do-norte",
  },
  estonia: {
    iso: "EE",
    name: "Estônia",
    lat: 59.44,
    lon: 24.75,
    region: "europa",
  },
  eua: {
    iso: "US",
    name: "Estados Unidos",
    lat: 38.91,
    lon: -77.04,
    region: "america-do-norte",
  },
  filipinas: {
    iso: "PH",
    name: "Filipinas",
    lat: 14.6,
    lon: 120.98,
    region: "asia",
  },
  finlandia: {
    iso: "FI",
    name: "Finlândia",
    lat: 60.17,
    lon: 24.94,
    region: "europa",
  },
  franca: {
    iso: "FR",
    name: "França",
    lat: 48.86,
    lon: 2.35,
    region: "europa",
  },
  gambia: {
    iso: "GM",
    name: "Gâmbia",
    lat: 13.45,
    lon: -16.58,
    region: "africa",
  },
  gana: { iso: "GH", name: "Gana", lat: 5.6, lon: -0.19, region: "africa" },
  georgia: {
    iso: "GE",
    name: "Geórgia",
    lat: 41.72,
    lon: 44.79,
    region: "asia",
  },
  grecia: {
    iso: "GR",
    name: "Grécia",
    lat: 37.98,
    lon: 23.73,
    region: "europa",
  },
  guine: { iso: "GN", name: "Guiné", lat: 9.64, lon: -13.58, region: "africa" },
  holanda: {
    iso: "NL",
    name: "Países Baixos",
    lat: 52.37,
    lon: 4.9,
    region: "europa",
  },
  "hong kong": {
    iso: "HK",
    name: "Hong Kong",
    lat: 22.32,
    lon: 114.17,
    region: "asia",
  },
  hungria: {
    iso: "HU",
    name: "Hungria",
    lat: 47.5,
    lon: 19.04,
    region: "europa",
  },
  india: { iso: "IN", name: "Índia", lat: 28.61, lon: 77.21, region: "asia" },
  indonesia: {
    iso: "ID",
    name: "Indonésia",
    lat: -6.21,
    lon: 106.85,
    region: "asia",
  },
  inglaterra: {
    iso: "GB",
    name: "Reino Unido",
    lat: 51.51,
    lon: -0.13,
    region: "europa",
  },
  irlanda: {
    iso: "IE",
    name: "Irlanda",
    lat: 53.35,
    lon: -6.26,
    region: "europa",
  },
  islandia: {
    iso: "IS",
    name: "Islândia",
    lat: 64.15,
    lon: -21.94,
    region: "europa",
  },
  israel: { iso: "IL", name: "Israel", lat: 31.77, lon: 35.21, region: "asia" },
  italia: { iso: "IT", name: "Itália", lat: 41.9, lon: 12.5, region: "europa" },
  japao: { iso: "JP", name: "Japão", lat: 35.68, lon: 139.69, region: "asia" },
  jordania: {
    iso: "JO",
    name: "Jordânia",
    lat: 31.95,
    lon: 35.93,
    region: "asia",
  },
  kuwait: { iso: "KW", name: "Kuwait", lat: 29.38, lon: 47.99, region: "asia" },
  laos: { iso: "LA", name: "Laos", lat: 17.97, lon: 102.63, region: "asia" },
  libano: { iso: "LB", name: "Líbano", lat: 33.89, lon: 35.5, region: "asia" },
  lituania: {
    iso: "LT",
    name: "Lituânia",
    lat: 54.69,
    lon: 25.28,
    region: "europa",
  },
  luxemburgo: {
    iso: "LU",
    name: "Luxemburgo",
    lat: 49.61,
    lon: 6.13,
    region: "europa",
  },
  madagascar: {
    iso: "MG",
    name: "Madagascar",
    lat: -18.88,
    lon: 47.51,
    region: "africa",
  },
  malasia: {
    iso: "MY",
    name: "Malásia",
    lat: 3.14,
    lon: 101.69,
    region: "asia",
  },
  malta: { iso: "MT", name: "Malta", lat: 35.9, lon: 14.51, region: "europa" },
  marrocos: {
    iso: "MA",
    name: "Marrocos",
    lat: 34.02,
    lon: -6.83,
    region: "africa",
  },
  mexico: {
    iso: "MX",
    name: "México",
    lat: 19.43,
    lon: -99.13,
    region: "america-latina",
  },
  mocambique: {
    iso: "MZ",
    name: "Moçambique",
    lat: -25.97,
    lon: 32.57,
    region: "africa",
  },
  monaco: {
    iso: "MC",
    name: "Mônaco",
    lat: 43.74,
    lon: 7.42,
    region: "europa",
  },
  namibia: {
    iso: "NA",
    name: "Namíbia",
    lat: -22.56,
    lon: 17.07,
    region: "africa",
  },
  nigeria: {
    iso: "NG",
    name: "Nigéria",
    lat: 9.08,
    lon: 7.4,
    region: "africa",
  },
  noruega: {
    iso: "NO",
    name: "Noruega",
    lat: 59.91,
    lon: 10.75,
    region: "europa",
  },
  "nova zelandia": {
    iso: "NZ",
    name: "Nova Zelândia",
    lat: -41.29,
    lon: 174.78,
    region: "oceania",
  },
  oma: { iso: "OM", name: "Omã", lat: 23.59, lon: 58.41, region: "asia" },
  "paises baixos": {
    iso: "NL",
    name: "Países Baixos",
    lat: 52.37,
    lon: 4.9,
    region: "europa",
  },
  peru: {
    iso: "PE",
    name: "Peru",
    lat: -12.05,
    lon: -77.04,
    region: "america-latina",
  },
  polonia: {
    iso: "PL",
    name: "Polônia",
    lat: 52.23,
    lon: 21.01,
    region: "europa",
  },
  portugal: {
    iso: "PT",
    name: "Portugal",
    lat: 38.72,
    lon: -9.14,
    region: "europa",
  },
  qatar: { iso: "QA", name: "Catar", lat: 25.29, lon: 51.53, region: "asia" },
  "reino unido": {
    iso: "GB",
    name: "Reino Unido",
    lat: 51.51,
    lon: -0.13,
    region: "europa",
  },
  "republica dominicana": {
    iso: "DO",
    name: "República Dominicana",
    lat: 18.49,
    lon: -69.93,
    region: "america-latina",
  },
  "republica tcheca": {
    iso: "CZ",
    name: "República Tcheca",
    lat: 50.08,
    lon: 14.44,
    region: "europa",
  },
  romenia: {
    iso: "RO",
    name: "Romênia",
    lat: 44.43,
    lon: 26.1,
    region: "europa",
  },
  ruanda: {
    iso: "RW",
    name: "Ruanda",
    lat: -1.95,
    lon: 30.06,
    region: "africa",
  },
  russia: {
    iso: "RU",
    name: "Rússia",
    lat: 55.76,
    lon: 37.62,
    region: "europa",
  },
  "san marino": {
    iso: "SM",
    name: "San Marino",
    lat: 43.94,
    lon: 12.45,
    region: "europa",
  },
  senegal: {
    iso: "SN",
    name: "Senegal",
    lat: 14.72,
    lon: -17.47,
    region: "africa",
  },
  seychelles: {
    iso: "SC",
    name: "Seychelles",
    lat: -4.62,
    lon: 55.45,
    region: "africa",
  },
  singapura: {
    iso: "SG",
    name: "Singapura",
    lat: 1.35,
    lon: 103.82,
    region: "asia",
  },
  somalia: {
    iso: "SO",
    name: "Somália",
    lat: 2.05,
    lon: 45.32,
    region: "africa",
  },
  suecia: {
    iso: "SE",
    name: "Suécia",
    lat: 59.33,
    lon: 18.07,
    region: "europa",
  },
  suica: { iso: "CH", name: "Suíça", lat: 46.95, lon: 7.45, region: "europa" },
  tailandia: {
    iso: "TH",
    name: "Tailândia",
    lat: 13.76,
    lon: 100.5,
    region: "asia",
  },
  tanzania: {
    iso: "TZ",
    name: "Tanzânia",
    lat: -6.16,
    lon: 35.75,
    region: "africa",
  },
  tchequia: {
    iso: "CZ",
    name: "República Tcheca",
    lat: 50.08,
    lon: 14.44,
    region: "europa",
  },
  togo: { iso: "TG", name: "Togo", lat: 6.13, lon: 1.22, region: "africa" },
  tunisia: {
    iso: "TN",
    name: "Tunísia",
    lat: 36.81,
    lon: 10.18,
    region: "africa",
  },
  turquia: {
    iso: "TR",
    name: "Turquia",
    lat: 39.93,
    lon: 32.86,
    region: "asia",
  },
  ucrania: {
    iso: "UA",
    name: "Ucrânia",
    lat: 50.45,
    lon: 30.52,
    region: "europa",
  },
  uganda: {
    iso: "UG",
    name: "Uganda",
    lat: 0.35,
    lon: 32.58,
    region: "africa",
  },
  uruguai: {
    iso: "UY",
    name: "Uruguai",
    lat: -34.9,
    lon: -56.16,
    region: "america-latina",
  },
  vietna: {
    iso: "VN",
    name: "Vietnã",
    lat: 21.03,
    lon: 105.85,
    region: "asia",
  },
  zambia: {
    iso: "ZM",
    name: "Zâmbia",
    lat: -15.39,
    lon: 28.32,
    region: "africa",
  },
};

// Whole words only, so "oma" doesn't match inside "roma" or "diploma".
const COUNTRY_PATTERNS = Object.keys(COUNTRIES)
  .sort((a, b) => b.length - a.length)
  .map((name) => [name, new RegExp(`\\b${name}\\b`)] as const);

const PARENTHETICAL_REGEX = /\([^)]*\)/g;

/** Every known country mentioned in a free-text country field. */
export const findCountries = (value: string): CountryGeo[] => {
  const normalized = normalizePlaceName(value);
  const exact = COUNTRIES[normalized];
  if (exact) {
    return [exact];
  }
  return COUNTRY_PATTERNS.filter(([, pattern]) => pattern.test(normalized)).map(
    ([name]) => COUNTRIES[name]
  );
};

/**
 * The countries a free-text country field names, once each by their usual
 * name: "Estados Unidos; Canadá" is two countries, "Estados Unidos / Online"
 * and "Estados Unidos (final)" are just "Estados Unidos". Parentheses only
 * qualify ("(organização)", "(competição realizada na escola no Brasil)"), so
 * the places they mention don't count.
 */
export const countryNamesIn = (value: string): string[] => [
  ...new Set(
    findCountries(value.replace(PARENTHETICAL_REGEX, " ")).map(
      (country) => country.name
    )
  ),
];

/** The country with exactly this Portuguese name (any case or accents). */
export const findCountryByName = (value: string): CountryGeo | null =>
  COUNTRIES[normalizePlaceName(value)] ?? null;

/** The country with this ISO 3166-1 alpha-2 code, if known. */
export const findCountryByIso = (iso: string): CountryGeo | null =>
  Object.values(COUNTRIES).find((country) => country.iso === iso) ?? null;

/** First known country mentioned in a free-text country field. */
export const findCountry = (value: string): CountryGeo | null => {
  const normalized = normalizePlaceName(value);
  const exact = COUNTRIES[normalized];
  if (exact) {
    return exact;
  }
  const found = COUNTRY_PATTERNS.find(([, pattern]) =>
    pattern.test(normalized)
  );
  return found ? COUNTRIES[found[0]] : null;
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
