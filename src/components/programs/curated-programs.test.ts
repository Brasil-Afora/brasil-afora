import { describe, expect, it } from "vitest";
import type { MasterRecord } from "@/lib/curated-import/master";
import type { CuratedPublication } from "@/server/publication/curated-projection";
import { mergePrograms, toCuratedProgram } from "./curated-programs";
import { programStatus } from "./program-model";

const source: MasterRecord = {
  name: "Programa Exemplo",
  organization: "Instituto Exemplo",
  scope: "national",
  type: "scholarship",
  country: "Brasil",
  city: "",
  format: "unknown",
  levels: ["high_school"],
  fields: ["Ciências"],
  brazilian_eligibility: "Brasileiros podem participar",
  eligibility: "Estudantes",
  nationality_restrictions: "",
  age_requirements: "",
  academic_requirements: "",
  language_requirements: "",
  cost: "Consulte a fonte",
  application_fee: "Não informado",
  funding: "Bolsa",
  funding_details: "Consulte condições",
  applications_status: "next_cycle_not_announced",
  application_opening: "",
  deadline: "2025-01-10",
  deadline_status: "previous_cycle_only",
  program_dates: "Não anunciado",
  official_url: "https://example.org/",
  description: "Descrição pesquisada",
  why_it_matters: "Acesso aos estudos",
  recurring: "yes",
  verification_notes: "Ciclo anterior encerrado",
  sources: ["https://example.org/edital"],
};
const publication: CuratedPublication & { id: string } = {
  id: "published-id",
  source,
  verified: false,
  badgeReason: "",
  sourceHash: "a".repeat(64),
  importedAt: "2026-09-23T12:00:00.000Z",
  image: "/catalog/header-programas-v1.jpg",
  imageSource: null,
  program: true,
  authorizationReference: "test",
};
const now = new Date("2026-09-23T12:00:00Z");
describe("published programs", () => {
  it("does not turn a previous cycle into a current deadline or forecast", () => {
    const program = toCuratedProgram(publication);
    expect(program.inscricoes.prazoInscricao).toBeUndefined();
    expect(program.inscricoes.previsao).toBeUndefined();
    expect(programStatus(program, now).kind).toBe("a-confirmar");
    expect(programStatus(program, now).label).toBe(
      "Próximo ciclo ainda não anunciado"
    );
    expect(program.descricao).toContain("Prazo de ciclo anterior: 2025-01-10");
    expect(program.descricao).toContain("Ciências");
    expect(program.fontes).toEqual(source.sources);
  });
  it("translates internal codes while retaining funding prose and the published verification recommendation", () => {
    const program = toCuratedProgram({
      ...publication,
      verified: true,
      source: {
        ...source,
        brazilian_eligibility: "likely",
        fields: ["engineering", "research"],
        funding: "Bolsa de até R$ 2.000",
      },
    });
    expect(program.requisitos).not.toContain("likely");
    expect(program.requisitos).toContain(
      "Possível participação de brasileiros; confirme as condições na fonte oficial"
    );
    expect(program.descricao).toContain("Engenharia · Pesquisa");
    expect(program.beneficiosDetalhe).toContain("Bolsa de até R$ 2.000");
    expect(program.verified).toBe(true);
  });
  it("ages an open confirmed deadline but preserves reported closed and unknown states", () => {
    const dated = toCuratedProgram({
      ...publication,
      source: {
        ...source,
        applications_status: "open",
        deadline: "2026-09-22",
        deadline_status: "confirmed",
      },
    });
    expect(programStatus(dated, now).kind).toBe("encerrado");
    for (const status of ["closed", "unknown"] as const) {
      const program = toCuratedProgram({
        ...publication,
        source: {
          ...source,
          applications_status: status,
          deadline: "2026-12-22",
          deadline_status: "confirmed",
        },
      });
      expect(programStatus(program, now).kind).toBe(
        status === "closed" ? "encerrado" : "a-confirmar"
      );
    }
  });
  it("supersedes a starter identity, retains its old URL, and keeps siblings sharing an official URL", () => {
    const program = toCuratedProgram(publication);
    const starter = { ...program, id: "starter-id" };
    const sibling = {
      ...program,
      id: "different-program",
      nome: "Outro programa",
    };
    const merged = mergePrograms([program], [starter, sibling]);
    expect(merged.map((p) => p.id)).toEqual([
      "published-id",
      "different-program",
    ]);
    expect(merged[0].aliases).toContain("starter-id");
  });
  it("merges the reviewed renamed Prep starter and preserves its route", () => {
    const current = {
      ...toCuratedProgram(publication),
      nome: "Prep Program 2027",
    };
    const starter = {
      ...current,
      id: "prep-program-fundacao-estudar",
      nome: "Prep Program",
    };
    const result = mergePrograms([current], [starter]);
    expect(result).toHaveLength(1);
    expect(result[0].aliases).toContain(starter.id);
  });
});
