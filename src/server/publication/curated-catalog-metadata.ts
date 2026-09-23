import {
  effectiveStatus,
  MASTER_STATUS_LABELS,
} from "@/lib/curated-import/master";
import { mapMasterToLegacy } from "@/lib/curated-import/projection";
import {
  resolveInternationalLocations,
  resolveNationalLocations,
} from "@/server/geo/resolve-location";
import { curatedPublicationSchema } from "./curated-projection";

/** Metadata is derived only from a validated immutable curated publication. */
export const getCuratedCatalogMetadata = (value: unknown) => {
  const parsed = curatedPublicationSchema.safeParse(value);
  if (!parsed.success) {
    return {};
  }
  const { source, verified, program } = parsed.data;
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const status = effectiveStatus(source, today);
  const physicalLocations =
    source.scope === "international"
      ? resolveInternationalLocations(source.city, source.country)
      : resolveNationalLocations(source.city);
  const locations = ["remote", "online"].includes(source.format)
    ? []
    : physicalLocations;
  const presentation = mapMasterToLegacy(source, parsed.data.image, today);
  return {
    curatedInternational:
      source.scope === "international" ? presentation.international : undefined,
    curatedNational:
      source.scope === "international" ? undefined : presentation.national,
    verified,
    curatedStatus: status,
    curatedStatusLabel: MASTER_STATUS_LABELS[status],
    program,
    modality: source.format,
    locations,
    sourceUrls: source.sources,
  };
};
