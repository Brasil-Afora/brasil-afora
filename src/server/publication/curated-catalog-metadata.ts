import { radarPresentation } from "@/data/radar-presentation";
import { applySourceClosure } from "@/data/source-closures";
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
export const getCuratedCatalogMetadata = (value: unknown, id?: string) => {
  const parsed = curatedPublicationSchema.safeParse(value);
  if (!parsed.success) {
    return {} as {
      locations?: ReturnType<typeof resolveInternationalLocations>;
      modality?: string;
    };
  }
  const { verified, program } = parsed.data;
  const source = applySourceClosure(id, parsed.data.source);
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
  const display = radarPresentation(source.name);
  const presentation = mapMasterToLegacy(
    display
      ? { ...source, name: display.name, description: display.summary }
      : source,
    display?.image ?? parsed.data.image,
    today
  );
  if (display) {
    presentation.international.ageRange = display.audience;
    presentation.national.ageRange = display.audience;
  }
  return {
    ...(display ? { name: display.name, image: display.image } : {}),
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
