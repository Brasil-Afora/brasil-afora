import { describe, expect, it } from "vitest";
import {
  opportunityPath,
  opportunityPathSegment,
  parseOpportunityParam,
  slugifyOpportunityName,
} from "./opportunity-path";

const UUID = "d1c6abf8-1234-4abc-8def-0123456789ab";

describe("opportunity paths", () => {
  it("turns a name into a plain ASCII slug", () => {
    expect(slugifyOpportunityName("Bolsa Lester B. Pearson — 2027")).toBe(
      "bolsa-lester-b-pearson-2027"
    );
    expect(
      slugifyOpportunityName("Sony: concurso de fotografia para até 19 anos")
    ).toBe("sony-concurso-de-fotografia-para-ate-19-anos");
  });

  it("cuts long names at a word boundary", () => {
    const slug = slugifyOpportunityName(
      "Programa de Iniciação Científica e Mestrado da Sociedade Brasileira de Matemática Aplicada"
    );
    expect(slug.length).toBeLessThanOrEqual(70);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug).toBe(
      "programa-de-iniciacao-cientifica-e-mestrado-da-sociedade-brasileira-de"
    );
  });

  it("adds the id block to database records only", () => {
    expect(opportunityPathSegment(UUID, "Yale Young Global Scholars")).toBe(
      "yale-young-global-scholars-d1c6abf8"
    );
    expect(opportunityPathSegment("lester-b-pearson-2027", "Pearson")).toBe(
      "lester-b-pearson-2027"
    );
    expect(opportunityPathSegment(UUID, "—")).toBe("d1c6abf8");
    expect(opportunityPath("national", UUID, "OBMEP")).toBe(
      "/oportunidades/nacionais/obmep-d1c6abf8"
    );
  });

  it("reads old UUID links, slug addresses and verified ids", () => {
    expect(parseOpportunityParam(UUID.toUpperCase())).toEqual({
      kind: "id",
      id: UUID,
    });
    expect(
      parseOpportunityParam("yale-young-global-scholars-d1c6abf8")
    ).toEqual({ kind: "short-id", shortId: "d1c6abf8" });
    expect(parseOpportunityParam("d1c6abf8")).toEqual({
      kind: "short-id",
      shortId: "d1c6abf8",
    });
    expect(parseOpportunityParam("lester-b-pearson-2027")).toEqual({
      kind: "id",
      id: "lester-b-pearson-2027",
    });
  });
});
