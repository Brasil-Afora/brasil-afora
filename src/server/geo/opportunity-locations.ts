import {
  verifiedInternationalOpportunities,
  verifiedNationalOpportunities,
} from "@/data/verified-opportunities";
import { getBrasiliaDaysUntil } from "@/lib/date-utils";
import type { MapDestination, OpportunityLocation } from "@/lib/geo";
import {
  resolveInternationalLocations,
  resolveNationalLocations,
} from "./resolve-location";

export type LocationsById = Record<string, OpportunityLocation[]>;

/** Locations of the verified selection, keyed by opportunity id. */
export const getVerifiedLocations = (): {
  international: LocationsById;
  national: LocationsById;
} => ({
  international: Object.fromEntries(
    verifiedInternationalOpportunities.map((opportunity) => [
      opportunity.id,
      resolveInternationalLocations(opportunity.cidade, opportunity.pais),
    ])
  ),
  national: Object.fromEntries(
    verifiedNationalOpportunities.map((opportunity) => [
      opportunity.id,
      resolveNationalLocations(opportunity.cidadeEstado),
    ])
  ),
});

const isOpen = (deadline: string, now: Date): boolean => {
  const daysLeft = getBrasiliaDaysUntil(deadline, now);
  return daysLeft !== null && daysLeft >= 0;
};

/** Map destinations of the verified opportunities still open today. */
export const getVerifiedDestinations = (
  now: Date = new Date()
): MapDestination[] => [
  ...verifiedInternationalOpportunities
    .filter((opportunity) => isOpen(opportunity.prazoInscricao, now))
    .flatMap((opportunity) =>
      resolveInternationalLocations(opportunity.cidade, opportunity.pais).map(
        (location) => ({
          ...location,
          country: opportunity.pais,
          name: opportunity.nome,
          scope: "international" as const,
        })
      )
    ),
  ...verifiedNationalOpportunities
    .filter((opportunity) => isOpen(opportunity.prazoInscricao, now))
    .flatMap((opportunity) =>
      resolveNationalLocations(opportunity.cidadeEstado).map((location) => ({
        ...location,
        country: "Brasil",
        name: opportunity.nome,
        scope: "national" as const,
      }))
    ),
];
