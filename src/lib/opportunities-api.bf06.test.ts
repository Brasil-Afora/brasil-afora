import { afterEach, describe, expect, it, vi } from "vitest";
import { getApplicationTarget } from "./opportunity-lifecycle";

const INTERNATIONAL_ID = "20000000-0000-4000-8000-000000000001";
const NATIONAL_ID = "20000000-0000-4000-8000-000000000002";

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });

const legacyInternational = {
  ageRange: "16-18",
  applicationDeadline: "2026-12-31",
  applicationFee: "Gratuito",
  applicationProcess: "Online",
  applicationUrl: "https://example.org/apply/2026",
  city: "Lisboa",
  contact: "Contato oficial",
  country: "Portugal",
  description: "Programa internacional",
  duration: "2 semanas",
  educationLevel: "Ensino Médio",
  extraCosts: "Nenhum",
  id: INTERNATIONAL_ID,
  image: "/home.png",
  languageRequirements: "Inglês",
  lastVerifiedAt: "2026-09-01T12:00:00Z",
  lifecycleStatus: "open",
  name: "Programa internacional",
  officialLink: "https://example.org/program/2026",
  responsibleInstitution: "Example Foundation",
  scholarshipCoverage: "Integral",
  scholarshipType: "Completa",
  selectionSteps: "Formulário",
  specificRequirements: "Documento",
  type: "Bolsa",
};

const legacyNational = {
  about: "Programa nacional",
  ageRange: "16-18",
  applicationDeadline: "2026-12-31",
  applicationFee: "Gratuito",
  applicationUrl: "https://example.org/apply/brasil-2026",
  benefits: "Mentoria",
  cityState: "São Paulo, SP",
  contact: "Contato oficial",
  costs: "Nenhum",
  country: "Brasil",
  duration: "1 semana",
  educationLevel: "Ensino Médio",
  extraCosts: "Nenhum",
  id: NATIONAL_ID,
  image: "/home.png",
  lastVerifiedAt: "2026-09-01T12:00:00Z",
  lifecycleStatus: "open",
  modality: "Presencial",
  name: "Programa nacional",
  officialLink: "https://example.org/program/brasil-2026",
  requirements: "Estudante",
  responsibleInstitution: "Example Foundation",
  selectionSteps: "Formulário",
  shortDescription: "Programa nacional",
  specificRequirements: "Documento",
  type: "Bolsa",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("BF-06 legacy public-read actionability", () => {
  it("uses v1 actionability to suppress the international legacy detail CTA", async () => {
    vi.stubEnv("NEXT_PUBLIC_STRUCTURED_OPPORTUNITIES", "false");
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const path = String(input);
      if (path === `/api/opportunities/${INTERNATIONAL_ID}`) {
        return jsonResponse({ opportunity: legacyInternational });
      }
      if (path === `/api/v1/opportunities/${INTERNATIONAL_ID}`) {
        return jsonResponse({
          data: {
            application_link_status: "closed",
            application_url: "https://example.org/apply/2026",
            can_apply: false,
            collection: "international",
            id: INTERNATIONAL_ID,
            last_verified_at: "2026-09-15T18:00:00Z",
            lifecycle: "open",
          },
        });
      }
      throw new Error(`Unexpected fetch: ${path}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { getInternationalOpportunityById } = await import(
      "./opportunities-api"
    );

    const opportunity = await getInternationalOpportunityById(INTERNATIONAL_ID);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(opportunity).toMatchObject({
      applicationLinkStatus: "closed",
      applicationUrl: "https://example.org/apply/2026",
      canApply: false,
      lifecycleStatus: "open",
    });
    expect(opportunity && getApplicationTarget(opportunity).available).toBe(
      false
    );
  });

  it("preserves backward-compatible actionability when v1 omits can_apply", async () => {
    vi.stubEnv("NEXT_PUBLIC_STRUCTURED_OPPORTUNITIES", "false");
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const path = String(input);
      if (path === `/api/opportunities/${INTERNATIONAL_ID}`) {
        return jsonResponse({ opportunity: legacyInternational });
      }
      if (path === `/api/v1/opportunities/${INTERNATIONAL_ID}`) {
        return jsonResponse({
          data: {
            application_link_status: "current_and_open",
            application_url: "https://example.org/apply/2026",
            collection: "international",
            id: INTERNATIONAL_ID,
            last_verified_at: "2026-09-15T18:00:00Z",
            lifecycle: "open",
          },
        });
      }
      throw new Error(`Unexpected fetch: ${path}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { getInternationalOpportunityById } = await import(
      "./opportunities-api"
    );

    const opportunity = await getInternationalOpportunityById(INTERNATIONAL_ID);

    expect(opportunity).toMatchObject({
      applicationLinkStatus: "current_and_open",
      applicationUrl: "https://example.org/apply/2026",
      canApply: null,
      lifecycleStatus: "open",
    });
    expect(opportunity && getApplicationTarget(opportunity).available).toBe(
      true
    );
  });

  it("uses v1 actionability to suppress the national legacy detail CTA", async () => {
    vi.stubEnv("NEXT_PUBLIC_STRUCTURED_OPPORTUNITIES", "false");
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const path = String(input);
      if (path === `/api/national-opportunities/${NATIONAL_ID}`) {
        return jsonResponse({ nationalOpportunity: legacyNational });
      }
      if (path === `/api/v1/opportunities/${NATIONAL_ID}`) {
        return jsonResponse({
          data: {
            application_link_status: "broken",
            application_url: "https://example.org/apply/brasil-2026",
            can_apply: false,
            collection: "national",
            id: NATIONAL_ID,
            last_verified_at: "2026-09-15T18:00:00Z",
            lifecycle: "open",
          },
        });
      }
      throw new Error(`Unexpected fetch: ${path}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { getNationalOpportunityById } = await import("./opportunities-api");

    const opportunity = await getNationalOpportunityById(NATIONAL_ID);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(opportunity).toMatchObject({
      applicationLinkStatus: "broken",
      applicationUrl: "https://example.org/apply/brasil-2026",
      canApply: false,
      lifecycleStatus: "open",
    });
    expect(opportunity && getApplicationTarget(opportunity).available).toBe(
      false
    );
  });
});

describe("BF-06 legacy list actionability", () => {
  it("uses v1 actionability for international legacy list records", async () => {
    vi.stubEnv("NEXT_PUBLIC_STRUCTURED_OPPORTUNITIES", "false");
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const path = String(input);
      if (path === "/api/opportunities") {
        return jsonResponse({ opportunities: [legacyInternational] });
      }
      if (path === "/api/v1/opportunities?collection=international&limit=100") {
        return jsonResponse({
          data: {
            items: [
              {
                application_link_status: "closed",
                application_url: "https://example.org/apply/2026",
                can_apply: false,
                collection: "international",
                id: INTERNATIONAL_ID,
                last_verified_at: "2026-09-15T18:00:00Z",
                lifecycle: "open",
              },
            ],
            next_cursor: null,
          },
        });
      }
      throw new Error(`Unexpected fetch: ${path}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { getInternationalOpportunities } = await import(
      "./opportunities-api"
    );

    const opportunities = await getInternationalOpportunities();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(opportunities[0]).toMatchObject({
      applicationLinkStatus: "closed",
      canApply: false,
      lifecycleStatus: "open",
    });
    expect(
      opportunities[0] && getApplicationTarget(opportunities[0]).available
    ).toBe(false);
  });

  it("fails legacy Apply closed when v1 actionability metadata is unavailable", async () => {
    vi.stubEnv("NEXT_PUBLIC_STRUCTURED_OPPORTUNITIES", "false");
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const path = String(input);
      if (path === "/api/opportunities") {
        return jsonResponse({ opportunities: [legacyInternational] });
      }
      if (path === "/api/v1/opportunities?collection=international&limit=100") {
        return new Response("unavailable", { status: 503 });
      }
      throw new Error(`Unexpected fetch: ${path}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { getInternationalOpportunities } = await import(
      "./opportunities-api"
    );

    const opportunities = await getInternationalOpportunities();

    expect(opportunities[0]).toMatchObject({
      applicationUrl: "https://example.org/apply/2026",
      canApply: false,
      lifecycleStatus: "open",
    });
    expect(
      opportunities[0] && getApplicationTarget(opportunities[0]).available
    ).toBe(false);
  });
});
