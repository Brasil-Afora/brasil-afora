import { getCostProfile } from "@/lib/cost-profile";
import type {
  InternationalOpportunity,
  NationalOpportunity,
} from "@/lib/opportunities-api";
import showcaseData from "./showcase-opportunities.json";

export const VERIFIED_OPPORTUNITIES_DATE = showcaseData.verifiedAt;

export const verifiedInternationalOpportunities = (
  showcaseData.international as InternationalOpportunity[]
).map((opportunity) => ({
  ...opportunity,
  custo: getCostProfile(opportunity.id),
}));

export const verifiedNationalOpportunities = (
  showcaseData.national as NationalOpportunity[]
).map((opportunity) => ({
  ...opportunity,
  custo: getCostProfile(opportunity.id),
}));

const internationalById = new Map(
  verifiedInternationalOpportunities.map((opportunity) => [
    opportunity.id,
    opportunity,
  ])
);

const nationalById = new Map(
  verifiedNationalOpportunities.map((opportunity) => [
    opportunity.id,
    opportunity,
  ])
);

const verifiedNationalNames = new Set(
  verifiedNationalOpportunities.map((opportunity) =>
    opportunity.nome.trim().toLocaleLowerCase("pt-BR")
  )
);

export const getVerifiedInternationalOpportunityById = (
  id: string
): InternationalOpportunity | null => internationalById.get(id) ?? null;

export const getVerifiedNationalOpportunityById = (
  id: string
): NationalOpportunity | null => nationalById.get(id) ?? null;

export const isVerifiedInternationalOpportunityId = (id: string): boolean =>
  internationalById.has(id);

export const isVerifiedNationalOpportunityId = (id: string): boolean =>
  nationalById.has(id);

export const isVerifiedNationalOpportunityName = (name: string): boolean =>
  verifiedNationalNames.has(name.trim().toLocaleLowerCase("pt-BR"));
