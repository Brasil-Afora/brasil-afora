import { describe, expect, it } from "vitest";
import type { CostProfile } from "@/lib/cost-profile";
import type { NationalOpportunity } from "@/lib/opportunities-api";
import { applyOpportunityFilters } from "./use-opportunity-filters";

const opportunity = (
  id: string,
  custo: CostProfile | undefined,
  taxaAplicacao = "Não informado"
): NationalOpportunity => ({
  beneficios: "",
  cidadeEstado: "São Paulo, SP",
  contato: "",
  custo,
  custos: "",
  custosExtras: "",
  duracao: "",
  etapasSelecao: "",
  faixaEtaria: "",
  id,
  imagem: "",
  instituicaoResponsavel: "",
  linkOficial: "https://example.org",
  modalidade: "Online",
  nivelEnsino: "Ensino Médio",
  nome: id,
  pais: "Brasil",
  prazoInscricao: "Prazo em verificação",
  requisitos: "",
  requisitosEspecificos: [],
  sobre: "",
  taxaAplicacao,
  tipo: "Competição",
});

const filters = (overrides: Record<string, string[]>) => ({
  apenasVerificadas: false,
  faixaPreco: [],
  idade: "",
  modalidade: [],
  nivelEnsino: [],
  prazo: "",
  taxaAplicacao: [],
  tipo: [],
  tipoBolsa: [],
  ...overrides,
});

const ids = (records: NationalOpportunity[]) => records.map((r) => r.id);

const catalog = [
  opportunity("full", {
    funding: "full",
    price: { kind: "covered" },
  }),
  opportunity("need", {
    funding: "full_possible",
    price: { amount: 7500, currency: "USD", kind: "amount" },
  }),
  opportunity("partial", {
    funding: "partial",
    price: { amount: 159.9, currency: "BRL", kind: "amount" },
  }),
  opportunity("none", { funding: "none", price: { kind: "paid" } }),
  opportunity("unknown", undefined),
];

describe("funding filter", () => {
  it("files need-based full aid under Integral", () => {
    expect(
      ids(
        applyOpportunityFilters(
          catalog,
          filters({ tipoBolsa: ["Integral"] }),
          "national"
        )
      )
    ).toEqual(["full", "need"]);
  });

  it("still honors options saved before the rename", () => {
    expect(
      ids(
        applyOpportunityFilters(
          catalog,
          filters({ tipoBolsa: ["Variável"] }),
          "national"
        )
      )
    ).toEqual(["full", "need"]);
  });

  it("never files unknown funding as Sem bolsa", () => {
    expect(
      ids(
        applyOpportunityFilters(
          catalog,
          filters({ tipoBolsa: ["Sem bolsa"] }),
          "national"
        )
      )
    ).toEqual(["none"]);
  });
});

describe("price filter", () => {
  it("selects by band, counting a covered scholarship as free", () => {
    expect(
      ids(
        applyOpportunityFilters(
          catalog,
          filters({ faixaPreco: ["Gratuito", "Até R$ 1 mil"] }),
          "national"
        )
      )
    ).toEqual(["full", "partial"]);
  });

  it("groups undisclosed and unknown prices", () => {
    expect(
      ids(
        applyOpportunityFilters(
          catalog,
          filters({ faixaPreco: ["Valor não divulgado"] }),
          "national"
        )
      )
    ).toEqual(["none", "unknown"]);
  });
});

describe("application fee filter", () => {
  it("reads a zero amount as free", () => {
    const records = [
      opportunity("zero", undefined, "US$ 0."),
      opportunity("paid", undefined, "US$ 75."),
    ];
    expect(
      ids(
        applyOpportunityFilters(
          records,
          filters({ taxaAplicacao: ["Gratuito"] }),
          "national"
        )
      )
    ).toEqual(["zero"]);
  });

  it("prefers the cost profile over the text", () => {
    const records = [
      opportunity("public", { applicationFee: "free_public_school" }, "R$ 20"),
    ];
    expect(
      ids(
        applyOpportunityFilters(
          records,
          filters({ taxaAplicacao: ["Gratuito"] }),
          "national"
        )
      )
    ).toEqual(["public"]);
  });
});
