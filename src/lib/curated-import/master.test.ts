import { describe, expect, it } from "vitest";
import {
  currentDeadline,
  effectiveStatus,
  identityKey,
  isProgramRecord,
  normalizeOfficialUrl,
} from "./master";

describe("curated master semantics", () => {
  it("keeps URL paths and meaningful query parameters distinct", () => {
    expect(normalizeOfficialUrl("https://example.org/ab=c")).not.toBe(
      normalizeOfficialUrl("https://example.org/a?b=c")
    );
    expect(normalizeOfficialUrl("https://example.org/a?b=x%26c%3Dy")).not.toBe(
      normalizeOfficialUrl("https://example.org/a?b=x&c=y")
    );
  });
  it("rejects impossible calendar dates instead of rolling them forward", () => {
    expect(
      currentDeadline({ deadline: "2026-02-30", deadline_status: "confirmed" })
    ).toBeNull();
  });
  it("never turns previous-cycle dates into current deadlines", () => {
    expect(
      currentDeadline({
        deadline: "2026-01-20",
        deadline_status: "previous_cycle_only",
      })
    ).toBeNull();
    expect(
      currentDeadline({ deadline: "", deadline_status: "unknown" })
    ).toBeNull();
    expect(
      currentDeadline({ deadline: "2026-10-02", deadline_status: "confirmed" })
    ).toBe("2026-10-02");
  });
  it("closes a dated open round once its deadline has passed", () => {
    expect(
      effectiveStatus(
        {
          applications_status: "open",
          deadline: "2026-09-22",
          deadline_status: "confirmed",
        },
        "2026-09-23"
      )
    ).toBe("closed");
    expect(
      effectiveStatus(
        {
          applications_status: "next_cycle_not_announced",
          deadline: "2026-01-01",
          deadline_status: "previous_cycle_only",
        },
        "2026-09-23"
      )
    ).toBe("next_cycle_not_announced");
  });
  it("retains different program identities that share an organization URL", () => {
    expect(
      identityKey({ name: "Course A", organization: "University" })
    ).not.toBe(identityKey({ name: "Course B", organization: "University" }));
    expect(normalizeOfficialUrl("http://www.example.org/a/?utm_source=x")).toBe(
      "example.org/a"
    );
  });
  it("routes recurring scholarships and mentorships to the programs model", () => {
    expect(isProgramRecord({ type: "scholarship", recurring: "yes" })).toBe(
      true
    );
    expect(isProgramRecord({ type: "competition", recurring: "yes" })).toBe(
      false
    );
  });
});
