import type { FeaturedOpportunity } from "@/components/homepage/home-data";

// Editorial review: 2026-09-23. Order reflects funding, Brazilian access and
// complementary education stages, rather than whichever deadline comes first.
export const HOMEPAGE_SELECTION = [
  {
    name: "Lester B. Pearson International Scholarship",
    reason:
      "Quatro anos de graduação com tuition, livros e apoio integral de residência. Indicação da escola até 09/10; candidatura à universidade até 16/10.",
    actionableUntil: "2026-10-09",
  },
  {
    name: "OIST Research Internship",
    reason:
      "Pesquisa de 4–6 meses no Japão com auxílio, moradia e passagem. Para estudantes de graduação, mestrado e recém-formados elegíveis.",
    actionableUntil: "2026-10-15",
  },
  {
    name: "Chevening Scholarships — Brasil",
    reason:
      "Bolsa integral para mestrado de um ano no Reino Unido. Exige graduação, experiência profissional elegível e retorno ao Brasil.",
    actionableUntil: "2026-10-06",
  },
  {
    name: "Prep Program 2027",
    reason:
      "Mentoria gratuita para brasileiros do ensino médio se candidatarem à graduação no exterior. Não garante bolsa na universidade de destino.",
    actionableUntil: "2026-10-01",
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
