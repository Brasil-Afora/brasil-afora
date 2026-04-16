import type {
  InternationalOpportunity,
  NationalOpportunity,
} from "@/lib/opportunities-api";

export type OpportunityType = "international" | "national";

export type Opportunity = InternationalOpportunity | NationalOpportunity;

export interface OpportunityCardConfig {
  accentColor: "amber" | "blue";
  basePath: string;
  showDuration?: boolean;
  showLocation?: boolean;
  showModalidade?: boolean;
  showScholarship?: boolean;
  type: OpportunityType;
}

export const isInternationalOpportunity = (
  opportunity: Opportunity
): opportunity is InternationalOpportunity => {
  return "pais" in opportunity && "tipoBolsa" in opportunity;
};

export const isNationalOpportunity = (
  opportunity: Opportunity
): opportunity is NationalOpportunity => {
  return "modalidade" in opportunity && "cidadeEstado" in opportunity;
};

export const getOpportunityLocation = (opportunity: Opportunity): string => {
  if (isNationalOpportunity(opportunity)) {
    return opportunity.cidadeEstado || "Brasil";
  }
  return opportunity.pais || "";
};

export const getScholarshipTagClasses = (tipoBolsa: string): string => {
  switch (tipoBolsa?.toLowerCase()) {
    case "parcial":
      return "bg-amber-500 text-black";
    case "completa":
      return "bg-green-500 text-black";
    case "variavel":
      return "bg-blue-500 text-white";
    case "sem bolsa":
      return "bg-gray-500 text-black";
    default:
      return "bg-slate-900 text-white";
  }
};
