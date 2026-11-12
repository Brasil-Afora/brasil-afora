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

let cachedVerifiedLocations: {
  international: LocationsById;
  national: LocationsById;
} | null = null;

/** Locations of the verified selection, keyed by opportunity id. */
export const getVerifiedLocations = (): {
  international: LocationsById;
  national: LocationsById;
} => {
  if (cachedVerifiedLocations) {
    return cachedVerifiedLocations;
  }
  cachedVerifiedLocations = {
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
  };
  return cachedVerifiedLocations;
};

const isOpen = (deadline: string, now: Date): boolean => {
  const daysLeft = getBrasiliaDaysUntil(deadline, now);
  return daysLeft !== null && daysLeft >= 0;
};

/** Map destinations of the verified opportunities still open today. */
export const getVerifiedDestinations = (
  now: Date = new Date()
): MapDestination[] => {
  const locations = getVerifiedLocations();
  return [
    ...verifiedInternationalOpportunities
      .filter((opportunity) => isOpen(opportunity.prazoInscricao, now))
      .flatMap((opportunity) =>
        (locations.international[opportunity.id] ?? []).map((location) => ({
          ...location,
          country: opportunity.pais,
          name: opportunity.nome,
          scope: "international" as const,
        }))
      ),
    ...verifiedNationalOpportunities
      .filter((opportunity) => isOpen(opportunity.prazoInscricao, now))
      .flatMap((opportunity) =>
        (locations.national[opportunity.id] ?? []).map((location) => ({
          ...location,
          country: "Brasil",
          name: opportunity.nome,
          scope: "national" as const,
        }))
      ),
  ];
};
