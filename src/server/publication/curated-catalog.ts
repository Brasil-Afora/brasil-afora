import { eq, inArray } from "drizzle-orm";
import { radarPresentation } from "@/data/radar-presentation";
import { applySourceClosure } from "@/data/source-closures";
import { db } from "@/db/client";
import { publicationVersions } from "@/db/schema/ingestion";
import { MASTER_STATUS_LABELS } from "@/lib/curated-import/master";
import { getCuratedCatalogMetadata } from "./curated-catalog-metadata";
import { curatedPublicationSchema } from "./curated-projection";

/** Only metadata from the record's published immutable version may reach a catalog. */
export const enrichCuratedRecords = async <
  T extends { publicationVersionId: string | null },
>(
  rows: T[]
) => {
  const ids = rows.flatMap((x) =>
    x.publicationVersionId ? [x.publicationVersionId] : []
  );
  const versions = ids.length
    ? await db
        .select()
        .from(publicationVersions)
        .where(inArray(publicationVersions.id, ids))
    : [];
  const byId = new Map(
    versions
      .filter((x) => x.editorialState === "published")
      .map((x) => [x.id, x])
  );
  return rows.map((row) => {
    const version = row.publicationVersionId
      ? byId.get(row.publicationVersionId)
      : undefined;
    const metadata = getCuratedCatalogMetadata(
      version?.payload.curated_master,
      version?.editionId
    );
    return {
      ...row,
      ...metadata,
      ...currentStatusFields(row, metadata),
    };
  });
};

const STATUS_LABELS = new Set<string>(Object.values(MASTER_STATUS_LABELS));

/**
 * The row froze the round's status text at import; once the round closes the
 * current status must replace it, or a closed detail page still says "open".
 */
const currentStatusFields = (
  row: {
    applicationProcess?: string | null;
    publicationVersionId: string | null;
  },
  metadata: ReturnType<typeof getCuratedCatalogMetadata>
) => {
  if (!("curatedStatus" in metadata)) {
    return {};
  }
  const current = metadata.curatedInternational ?? metadata.curatedNational;
  if (!current) {
    return {};
  }
  const process = metadata.curatedInternational?.applicationProcess;
  return {
    lifecycleStatus: current.lifecycleStatus,
    ...(process &&
    row.applicationProcess &&
    STATUS_LABELS.has(row.applicationProcess)
      ? { applicationProcess: process }
      : {}),
  };
};
export const getCuratedPublications = async () => {
  const versions = await db
    .select()
    .from(publicationVersions)
    .where(eq(publicationVersions.editorialState, "published"));
  const latest = new Map<string, (typeof versions)[number]>();
  for (const v of versions) {
    if (v.version > (latest.get(v.editionId)?.version ?? 0)) {
      latest.set(v.editionId, v);
    }
  }
  return [...latest.values()].flatMap((v) => {
    const parsed = curatedPublicationSchema.safeParse(v.payload.curated_master);
    return parsed.success
      ? [
          {
            id: v.editionId,
            ...parsed.data,
            image:
              radarPresentation(parsed.data.source.name)?.image ??
              parsed.data.image,
            source: applySourceClosure(v.editionId, parsed.data.source),
          },
        ]
      : [];
  });
};
