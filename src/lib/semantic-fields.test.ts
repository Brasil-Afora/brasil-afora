import { describe, expect, it } from "vitest";
import type { SemanticFieldResolution } from "@/contracts/opportunity-v1";
import { semanticFieldResolutionSchema } from "@/contracts/opportunity-v1";
import {
  formatSemanticField,
  projectSemanticFieldsForPublic,
} from "./semantic-fields";

const ASSERTION_ID = "00000000-0000-4000-8000-000000000001";

const field = (
  overrides: Partial<SemanticFieldResolution> = {}
): SemanticFieldResolution => ({
  alternative_assertion_ids: [],
  applicability: "conditionally_required",
  applicability_reason_code: "field_policy_default",
  conflicting_assertion_ids: [],
  criticality: "conditional",
  display_key: "age.pending_verification",
  display_parameters: {},
  field_name: "age",
  gate_impact: "review",
  last_verified_at: "2026-07-25T12:00:00Z",
  public_explanation: "A regra de idade ainda está em verificação.",
  reason_code: "authoritative_source_set_incomplete",
  resolved_at: "2026-07-25T12:00:00Z",
  source_coverage: {
    authoritative_sources_checked: 1,
    checked_source_roles: ["opportunity_detail"],
    failure_codes: [],
    last_checked_at: "2026-07-25T12:00:00Z",
    state: "partial",
    unchecked_source_roles: ["pdf_notice"],
    unprocessed_official_documents: true,
  },
  state: "pending_verification",
  supporting_assertion_ids: [],
  value: null,
  ...overrides,
});

describe("semantic field display policy", () => {
  it.each([
    ["pending_verification", "Regra de idade em verificação"],
    ["not_stated", "Idade não especificada pelo organizador"],
    ["conflicting", "Há informações conflitantes sobre a idade"],
    ["extraction_failed", "Regra de idade em verificação"],
  ] as const)("renders %s with a field-specific message", (state, expected) => {
    expect(formatSemanticField(field({ state }))).toBe(expected);
  });

  it("renders evidence-backed unrestricted and not-applicable meanings", () => {
    expect(
      formatSemanticField(
        field({
          reason_code: "official_explicit_age_unrestricted",
          state: "explicitly_unrestricted",
          supporting_assertion_ids: [ASSERTION_ID],
        })
      )
    ).toBe("Sem limite de idade");
    expect(
      formatSemanticField(
        field({
          applicability: "not_applicable",
          applicability_reason_code: "fully_online_opportunity",
          field_name: "city",
          reason_code: "fully_online_opportunity",
          state: "not_applicable",
        })
      )
    ).toBe("Não se aplica — oportunidade online");
  });

  it("renders a structured age range without losing state metadata", () => {
    const age = field({
      display_key: "age.range",
      display_parameters: { maximum: 18, minimum: 15 },
      gate_impact: "none",
      reason_code: "official_explicit_age_value",
      state: "explicit_value",
      supporting_assertion_ids: [ASSERTION_ID],
      value: [{ maximum_age: 18, minimum_age: 15 }],
    });
    const projection = projectSemanticFieldsForPublic({ age });

    expect(formatSemanticField(age)).toBe("15 a 18 anos");
    expect(projection.age).toMatchObject({
      display_text: "15 a 18 anos",
      source_coverage: "partial",
      state: "explicit_value",
    });
  });
});

describe("semantic contract invariants", () => {
  it("rejects not-stated when authoritative coverage is incomplete", () => {
    const result = semanticFieldResolutionSchema.safeParse(
      field({ state: "not_stated" })
    );

    expect(result.success).toBe(false);
  });

  it("accepts not-stated only after sufficient source coverage", () => {
    const result = semanticFieldResolutionSchema.safeParse(
      field({
        source_coverage: {
          authoritative_sources_checked: 1,
          checked_source_roles: ["opportunity_detail"],
          failure_codes: [],
          last_checked_at: "2026-07-25T12:00:00Z",
          state: "sufficient",
          unchecked_source_roles: [],
          unprocessed_official_documents: false,
        },
        state: "not_stated",
      })
    );

    expect(result.success).toBe(true);
  });

  it("rejects unrestricted values without evidence", () => {
    const result = semanticFieldResolutionSchema.safeParse(
      field({ state: "explicitly_unrestricted" })
    );

    expect(result.success).toBe(false);
  });
});
