import { expect, it } from "vitest";
import type { FeaturedOpportunity } from "@/components/homepage/home-data";
import {
  HOMEPAGE_SELECTION,
  selectHomepageOpportunities,
} from "./homepage-selection";

const eligible = HOMEPAGE_SELECTION.map(({ name }, index) => ({
  name,
  id: String(index),
  daysLeft: 30,
  deadline: "06/11/2026",
  href: "/test",
  image: "/test.jpg",
  institution: "Institution",
  level: "Graduação",
  officialLink: "https://example.org",
  place: "Brasil",
  scope: "international",
  tags: [],
})) satisfies FeaturedOpportunity[];

it("selects four editorial picks instead of promoting the nearest deadline", () => {
  const selected = selectHomepageOpportunities(
    [
      { ...eligible[0], name: "Paid course", daysLeft: 1 },
      ...eligible.slice().reverse(),
    ],
    "2026-09-25"
  );
  expect(selected.map((item) => item.name)).toEqual(
    HOMEPAGE_SELECTION.map((item) => item.name)
  );
  expect(selected.every((item) => item.selectionReason)).toBe(true);
});

it("removes unavailable picks and each pick after its own cutoff", () => {
  expect(selectHomepageOpportunities([], "2026-09-25")).toEqual([]);
  expect(
    selectHomepageOpportunities(eligible, "2026-10-17").map((item) => item.name)
  ).toEqual([
    "Yale Young Global Scholars (YYGS)",
    "Feira Brasileira de Ciências e Engenharia — FEBRACE",
    "Yenching Academy — Master's Fellowship",
  ]);
  expect(
    selectHomepageOpportunities(eligible, "2026-11-30").map((item) => item.name)
  ).toEqual(["Yale Young Global Scholars (YYGS)"]);
  expect(
    selectHomepageOpportunities(
      eligible.map((item) => ({ ...item, daysLeft: -1 })),
      "2026-09-25"
    )
  ).toEqual([]);
});
