import { describe, expect, it } from "vitest";
import type {
  NationalOpportunity,
  StructuredSemanticField,
} from "@/lib/opportunities-api";
import { applyBaseFilters } from "./use-opportunity-filters";

const publicField = (
  state: string,
  value: unknown = null
): StructuredSemanticField => ({
  applicability: "conditionally_required",
  criticality: "conditional",
  display_key: `test.${state}`,
  display_text: "Test",
  explanation: "Test",
  gate_impact: "none",
  last_verified_at: "2026-07-25T12:00:00Z",
  source_coverage: "sufficient",
  state,
  value,
});

const opportunity = (
  semanticFields: Record<string, StructuredSemanticField>
): NationalOpportunity => ({
  applicationLinkStatus: "current_and_open",
  applicationUrl: "https://example.org/apply",
  beneficios: "Benefícios em verificação",
  cidadeEstado: "Local em verificação",
  contato: "Contato disponível na página oficial",
  custos: "Informações de custo em verificação",
  custosExtras: "Custos adicionais em verificação",
  duracao: "Duração em verificação",
  etapasSelecao: "Etapas de seleção em verificação",
  faixaEtaria: "Regra de idade em verificação",
  id: "opportunity-1",
  imagem: "/home.png",
  instituicaoResponsavel: "Organizador em verificação",
  lastVerifiedAt: "2026-07-25T12:00:00Z",
  lifecycleStatus: "open",
  linkOficial: "https://example.org/opportunity",
  modalidade: "Em verificação",
  nivelEnsino: "Nível de ensino em verificação",
  nome: "Programa de teste",
  pais: "Brasil",
  prazoInscricao: "Prazo em verificação",
  requisitos: "Requisitos em verificação",
  requisitosEspecificos: [],
  semanticFields,
  sobre: "Descrição de teste",
  taxaAplicacao: "Taxa de inscrição em verificação",
  tipo: "Competição",
});

const filters = (
  overrides: Partial<{
    idade: string;
    nivelEnsino: string[];
    taxaAplicacao: string[];
    tipo: string[];
  }> = {}
) => ({
  idade: "",
  nivelEnsino: [],
  taxaAplicacao: [],
  tipo: [],
  ...overrides,
});

describe("semantic-safe opportunity filters", () => {
  it("does not treat pending age as unrestricted", () => {
    const item = opportunity({
      age: publicField("pending_verification"),
    });

    expect(applyBaseFilters([item], filters({ idade: "17" }))).toEqual([]);
  });

  it("matches an explicitly unrestricted age", () => {
    const item = opportunity({
      age: publicField("explicitly_unrestricted"),
    });

    expect(applyBaseFilters([item], filters({ idade: "17" }))).toEqual([item]);
  });

  it("matches only evidence-backed structured age ranges", () => {
    const item = {
      ...opportunity({ age: publicField("explicit_value") }),
      structuredAgeRules: [
        {
          exact_age: null,
          maximum_age: 18,
          maximum_inclusive: true,
          minimum_age: 15,
          minimum_inclusive: true,
          source_text: "15 a 18 anos",
        },
      ],
    };

    expect(applyBaseFilters([item], filters({ idade: "17" }))).toEqual([item]);
    expect(applyBaseFilters([item], filters({ idade: "20" }))).toEqual([]);
  });

  it("does not classify unknown cost as free or paid", () => {
    const item = opportunity({
      application_fee: publicField("pending_verification"),
      is_free: publicField("pending_verification"),
    });

    expect(
      applyBaseFilters([item], filters({ taxaAplicacao: ["Gratuito"] }))
    ).toEqual([]);
    expect(
      applyBaseFilters([item], filters({ taxaAplicacao: ["Pago"] }))
    ).toEqual([]);
  });

  it("distinguishes an explicit waived fee from a positive fee", () => {
    const waived = opportunity({
      application_fee: publicField("explicitly_unrestricted"),
    });
    const paid = opportunity({
      application_fee: publicField("explicit_value", 50),
    });

    expect(
      applyBaseFilters([waived, paid], filters({ taxaAplicacao: ["Gratuito"] }))
    ).toEqual([waived]);
    expect(
      applyBaseFilters([waived, paid], filters({ taxaAplicacao: ["Pago"] }))
    ).toEqual([paid]);
  });
});
