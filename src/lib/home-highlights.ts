import type { HomeCardOpportunity } from "@/components/homepage/opportunity-card";
import { getBrasiliaDaysUntil } from "@/lib/date-utils";

/** How far back "Novas oportunidades" reaches. */
export const NEW_WINDOW_DAYS = 21;
/** Same urgency window the catalog and the featured cards use. */
export const CLOSING_WINDOW_DAYS = 21;

export type HighlightCollection = "international" | "national" | "programs";

export interface HomeHighlight extends HomeCardOpportunity {
  /** dd/mm/yyyy the record joined the catalog; drives the "new" order. */
  addedOn: string | null;
  collection: HighlightCollection;
  /** Name + institution, so the "Todas" view lists a record once even when it sits in two collections. */
  identity: string;
}

export interface HomeHighlights {
  closing: HomeHighlight[];
  fresh: HomeHighlight[];
}

/** Days since a dd/mm/yyyy date (0 = today), in Brasília. */
const daysSince = (brDate: string | null, now: Date): number | null => {
  if (!brDate) {
    return null;
  }
  const until = getBrasiliaDaysUntil(brDate, now);
  return until === null ? null : -until;
};

const byDaysLeft = (a: HomeHighlight, b: HomeHighlight): number =>
  (a.daysLeft ?? Number.POSITIVE_INFINITY) -
  (b.daysLeft ?? Number.POSITIVE_INFINITY);

/**
 * "Novas": joined in the last NEW_WINDOW_DAYS, newest first (ties: nearest
 * deadline). "Prestes a fechar": deadline within CLOSING_WINDOW_DAYS, soonest
 * first. Items must already be visible in the catalog.
 */
export const selectHighlights = (
  items: HomeHighlight[],
  now: Date = new Date()
): HomeHighlights => {
  const cleaned = items.map((item) => ({
    ...item,
    tags: [...new Set(item.tags)],
  }));

  const fresh = cleaned
    .map((item) => ({ item, age: daysSince(item.addedOn, now) }))
    .filter(
      (entry): entry is { item: HomeHighlight; age: number } =>
        entry.age !== null && entry.age >= 0 && entry.age <= NEW_WINDOW_DAYS
    )
    .sort((a, b) => a.age - b.age || byDaysLeft(a.item, b.item))
    .map(({ item }) => ({ ...item, flag: "Nova" }));

  const closing = cleaned
    .filter(
      (item) =>
        item.daysLeft !== null &&
        item.daysLeft >= 0 &&
        item.daysLeft <= CLOSING_WINDOW_DAYS
    )
    .sort(byDaysLeft);

  return { closing, fresh };
};
