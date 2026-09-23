import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { verifiedNationalOpportunities } from "@/data/verified-opportunities";
import { CatalogRow } from "./catalog-items";
import { toNationalItem } from "./catalog-model";

describe("current catalog lifecycle rendering", () => {
  it.each([
    "closed",
    "cancelled",
  ])("does not count down a %s round with a future deadline", (lifecycleStatus) => {
    const item = toNationalItem(
      {
        ...verifiedNationalOpportunities[0],
        prazoInscricao: "31/12/2026",
        lifecycleStatus,
      },
      false,
      new Date("2026-09-23")
    );
    expect(item.daysLeft).toBeNull();
    const html = renderToStaticMarkup(createElement(CatalogRow, { item }));
    expect(html).toContain(
      lifecycleStatus === "cancelled" ? "Cancelada" : "Inscrições encerradas"
    );
    expect(html).not.toContain("Prazo próximo");
  });
});
