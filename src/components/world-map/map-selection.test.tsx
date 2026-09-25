import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";
import {
  resolveInternationalLocations,
  resolveNationalLocations,
} from "@/server/geo/resolve-location";
import {
  countryByIso,
  isMapOpportunityOpen,
  itemsAt,
  type MapItem,
  pinsOf,
  placeKey,
  placesLabel,
} from "./map-data";
import MapPanel from "./map-panel";

const country = countryByIso("US");
assert.ok(country);
const boston = {
  label: "Boston",
  lat: 42.3584,
  lon: -71.0598,
  precision: "city" as const,
};
const cambridge = {
  label: "Cambridge",
  lat: 42.3751,
  lon: -71.1056,
  precision: "city" as const,
};
const item = (id: string, locations: MapItem["locations"]): MapItem => ({
  id,
  locations,
  audience: "",
  cover: { kind: "photo", src: "/test.jpg" },
  daysLeft: 10,
  deadline: "03/10/2026",
  href: `/oportunidades/internacionais/${id}`,
  institution: "University",
  level: "Graduação",
  name: `Program ${id}`,
  place: "Estados Unidos",
  price: { known: false, label: "Preço não informado" },
  scope: "international",
  tags: [],
  verified: false,
  countries: [country],
  levels: [],
  search: "",
  type: "Intercâmbio",
});
const place = {
  iso: "US",
  keys: [placeKey(boston), placeKey(cambridge)],
  label: "Boston e Cambridge",
};
const items = [
  item("shared", [boston, cambridge, boston]),
  item("boston", [boston]),
  item("cambridge", [cambridge]),
];

test("a multi-city opportunity appears once in the selected list and once per pin", () => {
  assert.deepEqual(
    itemsAt(items, place).map((value) => value.id),
    ["shared", "boston", "cambridge"]
  );
  assert.deepEqual(
    pinsOf(items).map((pin) => pin.count),
    [2, 2]
  );
  assert.equal(new Set(pinsOf(items).flatMap((pin) => pin.ids)).size, 3);
  assert.deepEqual(
    itemsAt(items, { ...place, keys: [placeKey(boston)] }).map(
      (value) => value.id
    ),
    ["shared", "boston"]
  );
});

test("country-only locations are not presented as city opportunities", () => {
  const countryOnly = item("country", [{ ...boston, precision: "country" }]);
  assert.equal(pinsOf([countryOnly]).length, 0);
  assert.equal(itemsAt([countryOnly], place).length, 0);
});

test("multi-city selection shows actual city names on each result", () => {
  const html = renderToStaticMarkup(
    <MapPanel
      activeTypes={[]}
      countries={[{ ...country, items, next: null, types: [] }]}
      failed={false}
      filtersActive={false}
      loading={false}
      onClearFilters={() => undefined}
      onClearPlace={() => undefined}
      onRetry={() => undefined}
      onSelect={() => undefined}
      onToggleType={() => undefined}
      place={place}
      selected={country}
      soonest={[]}
      total={3}
      typeCounts={[]}
      unplaced={[]}
    />
  );
  // The shared record must name its cities in its result, independently of the selection chip.
  const firstRow = html.slice(
    html.indexOf("Program shared"),
    html.indexOf("Program boston")
  );
  assert.ok(firstRow.includes("Boston e Cambridge"));
});

test("resolver preserves accents and university towns for multi-city records", () => {
  assert.deepEqual(
    resolveNationalLocations("são paulo e rio de janeiro").map(
      (location) => location.label
    ),
    ["São Paulo", "Rio de Janeiro"]
  );
  const locations = resolveInternationalLocations(
    "Princeton e Miami",
    "Estados Unidos"
  );
  assert.equal(locations.length, 2);
  assert.equal(locations[0].label, "Princeton");
  assert.ok(locations[0].lat > 40 && locations[0].lat < 41);
  assert.ok(locations[1].lat > 25 && locations[1].lat < 26);
  assert.equal(placesLabel(["Boston", "Cambridge"]), "Boston e Cambridge");
});

test("map includes upcoming curated rounds and rolling intake", () => {
  assert.equal(
    isMapOpportunityOpen(
      { ...item("future", []), curatedStatus: "upcoming" },
      new Date("2026-09-23T12:00:00Z")
    ),
    true
  );
  assert.equal(
    isMapOpportunityOpen({
      ...item("rolling", []),
      curatedStatus: "rolling",
      daysLeft: null,
      deadline: "",
    }),
    true
  );
});
