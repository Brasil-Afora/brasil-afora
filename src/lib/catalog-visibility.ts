import { getBrasiliaDaysUntil } from "./date-utils";

/** Only actionable or announced rounds are public; explicitly rolling intake stays. */
export const isCatalogOpportunityVisible = (
  opportunity: {
    curatedStatus?: string;
    prazoInscricao: string;
  },
  now = new Date()
): boolean => {
  const { curatedStatus, prazoInscricao } = opportunity;
  if (
    curatedStatus &&
    !["open", "upcoming", "rolling"].includes(curatedStatus)
  ) {
    return false;
  }
  const days = getBrasiliaDaysUntil(prazoInscricao, now);
  if (days !== null) {
    return days >= 0;
  }
  return curatedStatus === "rolling" && !prazoInscricao.trim();
};

export const isProgramVisible = (
  program: {
    verified?: boolean;
    inscricoes: {
      prazoInscricao?: string;
      situacaoNaFonte?: string;
      continuo?: boolean;
    };
  },
  now = new Date()
): boolean =>
  (program.verified === true &&
    program.inscricoes.situacaoNaFonte === "open" &&
    !program.inscricoes.prazoInscricao?.trim()) ||
  isCatalogOpportunityVisible(
    {
      prazoInscricao: program.inscricoes.prazoInscricao ?? "",
      curatedStatus:
        program.inscricoes.situacaoNaFonte ??
        (program.inscricoes.continuo ? "rolling" : undefined),
    },
    now
  );
