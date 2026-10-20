import type { FeaturedOpportunity } from "@/components/homepage/home-data";

// Editorial review: 2026-09-25; Notre Dame replaced the closed Aspire pick on 2026-10-20. Order follows the education stage, from high
// school to a master's, and each pick weighs funding and Brazilian access.
export const HOMEPAGE_SELECTION = [
  {
    name: "Yale Young Global Scholars (YYGS)",
    reason:
      "Duas semanas em Yale para o ensino médio, com auxílio de até 100% da tuition também para brasileiros. Early Action até 15/10; Regular até 06/01.",
    actionableUntil: "2027-01-06",
  },
  {
    name: "Notre Dame Leadership Seminars 2027",
    reason:
      "Seminário de liderança de 10 dias em Notre Dame para quem está no penúltimo ano do ensino médio; a universidade paga ensino, moradia e alimentação. Até 20/01/2027.",
    actionableUntil: "2027-01-20",
  },
  {
    name: "Feira Brasileira de Ciências e Engenharia — FEBRACE",
    reason:
      "Feira nacional de ciências para alunos do 8º ano ao ensino médio e técnico. Submissão gratuita até 20/10, às 18h; finalistas se apresentam em março.",
    actionableUntil: "2026-10-20",
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
