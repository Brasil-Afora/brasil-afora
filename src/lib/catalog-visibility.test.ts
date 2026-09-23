import { expect, it } from "vitest";
import { isCatalogOpportunityVisible } from "./catalog-visibility";

it("keeps curated closed and unannounced cycles discoverable", () => {
  expect(
    isCatalogOpportunityVisible({
      curatedStatus: "closed",
      prazoInscricao: "2000-01-01",
    })
  ).toBe(true);
  expect(
    isCatalogOpportunityVisible({
      curatedStatus: "next_cycle_not_announced",
      prazoInscricao: "",
    })
  ).toBe(true);
  expect(isCatalogOpportunityVisible({ prazoInscricao: "2000-01-01" })).toBe(
    false
  );
});
