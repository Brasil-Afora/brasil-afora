// Builds src/server/geo/cities.json from GeoNames "cities15000.txt"
// (https://download.geonames.org/export/dump/cities15000.zip, CC BY 4.0).
//
//   node scripts/build-geo-index.mjs path/to/cities15000.txt
//
// Keeps every city with 15k+ inhabitants: normalized name, coordinates,
// country code and population (thousands). Larger cities also keep their
// Latin-script alternate names so Portuguese forms ("Nova Iorque",
// "Munique") resolve too.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ALTERNATES_MIN_POPULATION = 200_000;
const MIN_NAME_LENGTH = 4;
const MAX_NAME_LENGTH = 32;
const LATIN_NAME = /^[a-z][a-z .'-]*$/;
const DIACRITICS = /\p{M}/gu;

const normalize = (value) =>
  value.normalize("NFD").replace(DIACRITICS, "").toLowerCase().trim();

const [, , source] = process.argv;
if (!source) {
  throw new Error("Usage: node scripts/build-geo-index.mjs cities15000.txt");
}

const cities = [];
for (const line of readFileSync(source, "utf8").split("\n")) {
  if (!line) {
    continue;
  }
  const columns = line.split("\t");
  const name = normalize(columns[2] || columns[1]);
  const population = Number(columns[14]) || 0;
  const alternates = new Set();
  if (population >= ALTERNATES_MIN_POPULATION) {
    for (const raw of [columns[1], ...columns[3].split(",")]) {
      const alternate = normalize(raw);
      if (
        alternate !== name &&
        alternate.length >= MIN_NAME_LENGTH &&
        alternate.length <= MAX_NAME_LENGTH &&
        LATIN_NAME.test(alternate)
      ) {
        alternates.add(alternate);
      }
    }
  }
  const entry = [
    name,
    Number(Number(columns[4]).toFixed(3)),
    Number(Number(columns[5]).toFixed(3)),
    columns[8],
    Math.round(population / 1000),
  ];
  if (alternates.size > 0) {
    entry.push([...alternates]);
  }
  cities.push(entry);
}

const output = path.resolve("src/server/geo/cities.json");
writeFileSync(
  output,
  JSON.stringify({
    source: "GeoNames cities15000, CC BY 4.0, https://www.geonames.org/",
    fields: [
      "name",
      "lat",
      "lon",
      "country",
      "populationThousands",
      "alternates",
    ],
    cities,
  })
);
console.log(`${cities.length} cities -> ${output}`);
