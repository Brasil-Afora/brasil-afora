import { isOpportunityDeadlineOpen } from "./date-utils";

/** Curated recurring records remain discoverable with their explicit cycle status. */
export const isCatalogOpportunityVisible = (opportunity: {
  curatedStatus?: string;
  prazoInscricao: string;
}): boolean =>
  Boolean(opportunity.curatedStatus) ||
  isOpportunityDeadlineOpen(opportunity.prazoInscricao);
