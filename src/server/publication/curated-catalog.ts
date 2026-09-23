import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { publicationVersions } from "@/db/schema/ingestion";
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
    return {
      ...row,
      ...getCuratedCatalogMetadata(version?.payload.curated_master),
    };
  });
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
    return parsed.success ? [{ id: v.editionId, ...parsed.data }] : [];
  });
};
