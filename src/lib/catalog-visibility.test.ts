import { expect, it } from "vitest";
import {
  isCatalogOpportunityVisible,
  isProgramVisible,
} from "./catalog-visibility";

const now = new Date("2026-09-23T12:00:00Z");
it("keeps genuinely continuous intake but excludes inactive and unknown cycles", () => {
  for (const curatedStatus of [
    "closed",
    "next_cycle_not_announced",
    "unknown",
    "open",
    "upcoming",
  ]) {
    expect(
      isCatalogOpportunityVisible({ curatedStatus, prazoInscricao: "" }, now)
    ).toBe(false);
  }
  expect(
    isCatalogOpportunityVisible(
      { curatedStatus: "rolling", prazoInscricao: "" },
      now
    )
  ).toBe(true);
  expect(isProgramVisible({ inscricoes: { continuo: true } }, now)).toBe(true);
  expect(
    isProgramVisible(
      { inscricoes: { continuo: true, situacaoNaFonte: "closed" } },
      now
    )
  ).toBe(false);
});
it("includes announced future rounds and rejects invalid dates", () => {
  expect(
    isCatalogOpportunityVisible(
      { curatedStatus: "upcoming", prazoInscricao: "01/10/2026" },
      now
    )
  ).toBe(true);
  expect(
    isCatalogOpportunityVisible(
      { curatedStatus: "open", prazoInscricao: "31/09/2026" },
      now
    )
  ).toBe(false);
  expect(
    isCatalogOpportunityVisible(
      { curatedStatus: "rolling", prazoInscricao: "22/09/2026" },
      now
    )
  ).toBe(false);
});
it("expires at midnight in Brasilia even when UTC has already advanced", () => {
  const opportunity = { prazoInscricao: "23/09/2026" };
  expect(
    isCatalogOpportunityVisible(opportunity, new Date("2026-09-24T02:59:59Z"))
  ).toBe(true);
  expect(
    isCatalogOpportunityVisible(opportunity, new Date("2026-09-24T03:00:00Z"))
  ).toBe(false);
});
