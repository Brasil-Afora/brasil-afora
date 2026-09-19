import { describe, expect, it } from "vitest";
import {
  getApplicationTarget,
  getOpportunityLifecycleLabel,
  shouldShowDeadlineCountdown,
} from "./opportunity-lifecycle";

describe("public opportunity lifecycle presentation", () => {
  it("never offers an application action for a verified closed edition", () => {
    const opportunity = {
      applicationLinkStatus: "closed",
      applicationUrl: "https://example.org/apply",
      lifecycleStatus: "closed",
      linkOficial: "https://example.org/program",
    };

    expect(getApplicationTarget(opportunity)).toMatchObject({
      available: false,
      label: "Inscrições encerradas",
    });
    expect(shouldShowDeadlineCountdown(opportunity)).toBe(false);
  });

  it("uses the separate verified application URL only when submissions are open", () => {
    const target = getApplicationTarget({
      applicationLinkStatus: "current_and_open",
      applicationUrl: "https://apply.example.org/form",
      lifecycleStatus: "open",
      linkOficial: "https://example.org/program",
    });

    expect(target).toEqual({
      available: true,
      href: "https://apply.example.org/form",
      label: "Aplicar agora",
    });
  });

  it("does not call an unchecked link open even if the lifecycle says open", () => {
    const opportunity = {
      applicationLinkStatus: "unchecked",
      applicationUrl: "https://example.org/apply",
      lifecycleStatus: "open",
      linkOficial: "https://example.org/program",
    };

    expect(getApplicationTarget(opportunity).available).toBe(false);
    expect(getOpportunityLifecycleLabel(opportunity)).toBe(
      "Confirme o link de inscrição"
    );
  });
});

describe("BF-06 effective Apply policy", () => {
  it("honors an explicit operational block even when editorial state is open", () => {
    const opportunity = {
      applicationLinkStatus: "current_and_open",
      applicationUrl: "https://example.org/apply",
      canApply: false,
      lifecycleStatus: "open",
      linkOficial: "https://example.org/program",
    };

    expect(getApplicationTarget(opportunity).available).toBe(false);
  });

  it("preserves editorial permission through indeterminate operational status", () => {
    const opportunity = {
      applicationLinkStatus: "unknown",
      applicationUrl: "https://example.org/apply",
      canApply: true,
      lifecycleStatus: "open",
      linkOficial: "https://example.org/program",
    };

    expect(getApplicationTarget(opportunity)).toMatchObject({
      available: true,
      href: "https://example.org/apply",
    });
  });

  it("never treats the official information URL as an Apply fallback", () => {
    expect(
      getApplicationTarget({
        applicationUrl: null,
        linkOficial: "https://example.org/program",
      })
    ).toMatchObject({
      available: false,
      href: "#",
    });
  });
});
