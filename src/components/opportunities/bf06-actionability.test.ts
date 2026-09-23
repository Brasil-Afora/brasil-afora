import { describe, expect, it } from "vitest";
import { verifiedNationalOpportunities } from "@/data/verified-opportunities";
import { toNationalDetail } from "./detail-model";

describe("BF-06 redesigned detail-page actionability", () => {
  it("keeps an old application URL unavailable for closed rounds", () => {
    const detail = toNationalDetail(
      {
        ...verifiedNationalOpportunities[0],
        lifecycleStatus: "closed",
        applicationUrl: "https://example.org/apply",
        applicationLinkStatus: "current_and_open",
        canApply: false,
      },
      false,
      new Date("2026-09-23")
    );
    expect(detail.applicationTarget.available).toBe(false);
    expect(detail.daysLeft).toBeNull();
    expect(detail.lifecycleLabel).toBe("Inscrições encerradas");
  });
  it("exposes a verified open application target separately from the information page", () => {
    const detail = toNationalDetail(
      {
        ...verifiedNationalOpportunities[0],
        lifecycleStatus: "open",
        applicationUrl: "https://example.org/apply",
        applicationLinkStatus: "current_and_open",
        canApply: true,
      },
      false,
      new Date("2026-09-23")
    );
    expect(detail.applicationTarget).toEqual({
      available: true,
      href: "https://example.org/apply",
      label: "Aplicar agora",
    });
    expect(detail.officialLink).not.toBe(detail.applicationTarget.href);
  });
});
