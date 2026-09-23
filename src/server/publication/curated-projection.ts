import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import type { schema } from "@/db/schema";
import { nationalOpportunities } from "@/db/schema/national-opportunities";
import { opportunities } from "@/db/schema/opportunities";
import { masterRecordSchema } from "@/lib/curated-import/master";
import { mapMasterToLegacy } from "@/lib/curated-import/projection";

type Transaction = Parameters<
  Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]
>[0];
export const curatedPublicationSchema = z
  .object({
    source: masterRecordSchema,
    verified: z.boolean(),
    badgeReason: z.string(),
    sourceHash: z.string().length(64),
    importedAt: z.iso.datetime(),
    image: z.string(),
    imageSource: z.string().nullable(),
    program: z.boolean(),
    authorizationReference: z.string().min(1),
  })
  .strict();
export type CuratedPublication = z.infer<typeof curatedPublicationSchema>;
/** Called only by the ordinary approved-version outbox, never by a public route. */
export const publishCuratedProjection = async (
  transaction: Transaction,
  editionId: string,
  versionId: string,
  value: unknown
): Promise<void> => {
  const metadata = curatedPublicationSchema.parse(value);
  const rows = mapMasterToLegacy(
    metadata.source,
    metadata.image,
    metadata.importedAt.slice(0, 10)
  );
  const common = {
    id: editionId,
    publicationVersionId: versionId,
    lastVerifiedAt: null,
  };
  if (metadata.source.scope === "international") {
    const row = { ...rows.international, ...common };
    await transaction
      .insert(opportunities)
      .values(row)
      .onConflictDoUpdate({ target: opportunities.id, set: row });
  } else {
    const row = { ...rows.national, ...common };
    await transaction
      .insert(nationalOpportunities)
      .values(row)
      .onConflictDoUpdate({ target: nationalOpportunities.id, set: row });
  }
};
