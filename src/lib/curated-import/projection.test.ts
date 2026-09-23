import { expect, it } from "vitest";
import { mapMasterToLegacy } from "./projection";

const source = {
  name: "Many campuses",
  organization: "University",
  scope: "international",
  type: "research",
  country: "França; Suíça",
  city: "Paris; Genebra",
  format: "hybrid",
  levels: ["undergraduate"],
  fields: [],
  brazilian_eligibility: "confirmed",
  eligibility: "Estudantes",
  nationality_restrictions: "",
  age_requirements: "",
  academic_requirements: "",
  language_requirements: "",
  cost: "2026: US$ 7,500",
  application_fee: "",
  funding: "Até 100% da tuition",
  funding_details: "Viagem não incluída",
  applications_status: "next_cycle_not_announced",
  application_opening: "",
  deadline: "2026-01-01",
  deadline_status: "previous_cycle_only",
  program_dates: "",
  official_url: "https://example.org",
  description: "Pesquisa",
  why_it_matters: "Pesquisa",
  recurring: "yes",
  verification_notes: "",
  sources: ["https://example.org"],
} as const;
it("preserves full location and historical funding without manufacturing a deadline", () => {
  const row = mapMasterToLegacy(
    {
      ...source,
      levels: [...source.levels],
      fields: [],
      sources: [...source.sources],
    },
    "/opportunities/test.jpg",
    "2026-09-23"
  );
  expect(row.international.city).toBe("Paris; Genebra");
  expect(row.international.country).toBe("França; Suíça");
  expect(row.international.applicationDeadline).toBeNull();
  expect(row.international.scholarshipCoverage).toBe(
    "Até 100% da tuition\nViagem não incluída"
  );
  expect(row.international.extraCosts).toContain("2026: US$ 7,500");
  expect(row.international.description).toContain("2026-01-01");
});
