import type { FeaturedOpportunity } from "@/components/homepage/home-data";

// Editorial review: 2026-09-25. Order follows the education stage, from high
// school to a master's, and each pick weighs funding and Brazilian access.
export const HOMEPAGE_SELECTION = [
  {
    name: "Yale Young Global Scholars (YYGS)",
    reason:
      "Duas semanas em Yale para o ensino médio, com auxílio de até 100% da tuition também para brasileiros. Early Action até 15/10; Regular até 06/01.",
    actionableUntil: "2027-01-06",
  },
  {
    name: "Feira Brasileira de Ciências e Engenharia — FEBRACE",
    reason:
      "Feira nacional de ciências para alunos do 8º ano ao ensino médio e técnico. Submissão gratuita até 20/10, às 18h; finalistas se apresentam em março.",
    actionableUntil: "2026-10-20",
  },
  {
    name: "Aspire Leaders Program — Cohort 4 de 2026 (Brasil)",
    reason:
      "Seis semanas de liderança online e gratuita para universitários e recém-formados de 18 a 29 anos, de primeira geração ou baixa renda. Até 16/10.",
    actionableUntil: "2026-10-16",
  },
  {
    name: "Yenching Academy — Master's Fellowship",
    reason:
      "Mestrado em estudos da China na Universidade de Pequim; todo admitido recebe tuition, moradia, estipêndio e passagem. Até 30/11, 9h de Pequim (22h de 29/11 em Brasília).",
    actionableUntil: "2026-11-29",
  },
] as const;

export const selectHomepageOpportunities = (
  eligible: FeaturedOpportunity[],
  today: string
): FeaturedOpportunity[] =>
  HOMEPAGE_SELECTION.flatMap((selection) => {
    const opportunity = eligible.find((item) => item.name === selection.name);
    return opportunity &&
      today <= selection.actionableUntil &&
      opportunity.daysLeft >= 0
      ? [{ ...opportunity, selectionReason: selection.reason }]
      : [];
  });
