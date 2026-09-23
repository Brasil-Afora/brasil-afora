import { afterEach, expect, it, vi } from "vitest";
import { mergeCatalogOpportunities } from "./merge-catalog-opportunities";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

it.each([
  "international",
  "national",
] as const)("loads every page of %s curated records without changing verification or geography", async (collection) => {
  vi.stubEnv("NEXT_PUBLIC_STRUCTURED_OPPORTUNITIES", "true");
  const records = Array.from({ length: 328 }, (_, index) => ({
    id: String(index),
    title: `Record ${index}`,
    collection,
    age_rules: [],
    semantic_fields: {},
    education_levels: [],
    opportunity_types: [],
    description: "Description",
    modality: "online",
    locations: [],
    verified: index < 303,
    curatedStatus: index % 2 ? "closed" : "rolling",
    curatedStatusLabel: index % 2 ? "Encerrado" : "Fluxo contínuo",
    program: true,
    application_deadline_date: null,
    official_information_url: "https://example.org",
  }));
  const fetchMock = vi.fn((input: string) => {
    const url = new URL(input, "http://localhost");
    const start = Number(url.searchParams.get("cursor") ?? 0);
    return Promise.resolve(
      Response.json({
        data: {
          items: records.slice(start, start + 100),
          next_cursor:
            start + 100 < records.length ? String(start + 100) : null,
        },
      })
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  const api = await import("./opportunities-api");
  const result = await (collection === "international"
    ? api.getInternationalOpportunities()
    : api.getNationalOpportunities());
  expect(fetchMock).toHaveBeenCalledTimes(4);
  expect(result).toHaveLength(328);
  expect(result.filter((record) => record.verified)).toHaveLength(303);
  expect(result.filter((record) => record.verified === false)).toHaveLength(25);
  expect(
    result.every(
      (record) => record.program && record.localizacoes?.length === 0
    )
  ).toBe(true);
  expect(result[327]).toMatchObject({
    curatedStatus: "closed",
    curatedStatusLabel: "Encerrado",
  });
});

it("keeps live records even when a static verified name matches, without collapsing distinct editions", () => {
  const live = [
    { id: "curated-a", nome: "Programa", verified: false },
    { id: "curated-b", nome: "Programa", verified: true },
  ];
  const selection = [
    { id: "static-a", nome: "PROGRAMA", verified: true },
    { id: "static-b", nome: "Outro", verified: true },
  ];
  expect(mergeCatalogOpportunities(live, selection)).toEqual([
    ...live,
    selection[1],
  ]);
});

it.each([
  "hybrid",
  "in_person",
  "remote",
])("maps imported %s modality and preserves unknown deadlines", async (modality) => {
  vi.stubEnv("NEXT_PUBLIC_STRUCTURED_OPPORTUNITIES", "false");
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string) =>
      Promise.resolve(
        Response.json(
          input.startsWith("/api/v1/")
            ? { data: { items: [], next_cursor: null } }
            : {
                nationalOpportunities: [
                  {
                    id: "curated",
                    name: "Record",
                    applicationDeadline: null,
                    modality,
                    verified: false,
                    locations: [],
                  },
                ],
              }
        )
      )
    )
  );
  const { getNationalOpportunities } = await import("./opportunities-api");
  const [record] = await getNationalOpportunities();
  expect(record.prazoInscricao).toBe("");
  expect(record.verified).toBe(false);
  expect(record.modalidade).toBe(
    (
      {
        hybrid: "Híbrido",
        in_person: "Presencial",
        remote: "Online",
      } as Record<string, string>
    )[modality]
  );
});
