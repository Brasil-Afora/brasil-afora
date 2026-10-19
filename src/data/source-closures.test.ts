import { expect, it } from "vitest";
import type { MasterRecord } from "@/lib/curated-import/master";
import { getCuratedCatalogMetadata } from "@/server/publication/curated-catalog-metadata";
import { applySourceClosure } from "./source-closures";

const MPOWER_GLOBAL_CITIZEN = "c657bdc0-0569-4435-ae6c-fb7f60f47d9e";

const source: MasterRecord = {
  name: "MPOWER Global Citizen Scholarship",
  organization: "MPOWER Financing",
  scope: "international",
  type: "scholarship",
  country: "Estados Unidos",
  city: "",
  format: "online",
  levels: ["undergraduate"],
  fields: [],
  brazilian_eligibility: "eligible",
  eligibility: "",
  nationality_restrictions: "",
  age_requirements: "",
  academic_requirements: "",
  language_requirements: "",
  cost: "",
  application_fee: "",
  funding: "",
  funding_details: "",
  applications_status: "open",
  application_opening: "",
  deadline: "2026-12-31",
  deadline_status: "confirmed",
  program_dates: "",
  official_url: "https://www.mpowerfinancing.com/scholarships/global-citizen",
  description: "",
  why_it_matters: "",
  recurring: "yes",
  verification_notes: "",
  sources: [],
};

it("closes a round the official page closed before its published deadline", () => {
  expect(
    applySourceClosure(MPOWER_GLOBAL_CITIZEN, source).applications_status
  ).toBe("closed");
});

it("never hides a newly published cycle or an unrelated record", () => {
  expect(
    applySourceClosure(MPOWER_GLOBAL_CITIZEN, {
      ...source,
      deadline: "2027-12-31",
    }).applications_status
  ).toBe("open");
  expect(
    applySourceClosure("00000000-0000-4000-a000-000000000000", source)
      .applications_status
  ).toBe("open");
  expect(applySourceClosure(undefined, source).applications_status).toBe(
    "open"
  );
});

it("reports the closure through the catalog metadata the API serves", () => {
  const publication = {
    source,
    verified: true,
    badgeReason: "",
    sourceHash: "a".repeat(64),
    importedAt: "2026-10-03T12:00:00.000Z",
    image: "/home.png",
    imageSource: null,
    program: true,
    authorizationReference: "test",
  };
  expect(
    getCuratedCatalogMetadata(publication, MPOWER_GLOBAL_CITIZEN)
  ).toMatchObject({
    curatedStatus: "closed",
    curatedStatusLabel: "Inscrições encerradas",
    curatedInternational: {
      lifecycleStatus: "closed",
      applicationProcess: "Inscrições encerradas",
    },
  });
  expect(getCuratedCatalogMetadata(publication)).toMatchObject({
    curatedStatus: "open",
  });
});
