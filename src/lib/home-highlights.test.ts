import { describe, expect, it } from "vitest";
import {
  CLOSING_WINDOW_DAYS,
  type HomeHighlight,
  NEW_WINDOW_DAYS,
  selectHighlights,
} from "./home-highlights";

// 20/10/2026 at noon in Brasília.
const NOW = new Date("2026-10-20T15:00:00Z");

const item = (
  id: string,
  overrides: Partial<HomeHighlight> = {}
): HomeHighlight => ({
  addedOn: null,
  collection: "international",
  daysLeft: null,
  deadline: "",
  href: `/oportunidades/internacionais/${id}`,
  id,
  identity: id,
  image: "",
  institution: "Org",
  level: "",
  name: id,
  officialLink: "",
  place: "",
  tags: [],
  ...overrides,
});

describe("selectHighlights", () => {
  it("lists items added within the window, newest first, flagged as new", () => {
    const { fresh } = selectHighlights(
      [
        item("old", { addedOn: "03/10/2026" }),
        item("edge", { addedOn: "06/10/2026" }),
        item("recent", { addedOn: "18/10/2026" }),
        item("today", { addedOn: "20/10/2026" }),
        item("undated"),
      ],
      NOW
    );
    expect(NEW_WINDOW_DAYS).toBe(14);
    expect(fresh.map((x) => x.id)).toEqual(["today", "recent", "edge"]);
    expect(fresh.every((x) => x.flag === "Nova")).toBe(true);
  });

  it("breaks ties between same-day additions by the nearest deadline", () => {
    const { fresh } = selectHighlights(
      [
        item("later", { addedOn: "15/10/2026", daysLeft: 40 }),
        item("rolling", { addedOn: "15/10/2026" }),
        item("sooner", { addedOn: "15/10/2026", daysLeft: 5 }),
      ],
      NOW
    );
    expect(fresh.map((x) => x.id)).toEqual(["sooner", "later", "rolling"]);
  });

  it("lists deadlines within the closing window, soonest first", () => {
    const { closing } = selectHighlights(
      [
        item("far", { daysLeft: CLOSING_WINDOW_DAYS + 1 }),
        item("edge", { daysLeft: CLOSING_WINDOW_DAYS }),
        item("today", { daysLeft: 0 }),
        item("past", { daysLeft: -1 }),
        item("rolling"),
        item("week", { daysLeft: 7 }),
      ],
      NOW
    );
    expect(closing.map((x) => x.id)).toEqual(["today", "week", "edge"]);
  });

  it("drops repeated tags so cards render unique keys", () => {
    const { closing } = selectHighlights(
      [item("mentoria", { daysLeft: 3, tags: ["Mentoria", "Mentoria"] })],
      NOW
    );
    expect(closing[0]?.tags).toEqual(["Mentoria"]);
  });
});
