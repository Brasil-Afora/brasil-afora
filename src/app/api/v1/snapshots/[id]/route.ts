import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { snapshots, sourceDocuments } from "@/db/schema/ingestion";
import { requireAdminInRoute } from "@/server/route-auth";

export const dynamic = "force-dynamic";

const snapshotIdSchema = z.uuid();
const RAW_PREVIEW_LIMIT = 1_000_000;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminInRoute(request);
  if (authResult.response) {
    return authResult.response;
  }
  const { id } = await context.params;
  if (!snapshotIdSchema.safeParse(id).success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Snapshot ID must be a UUID.",
        },
      },
      { status: 422 }
    );
  }
  const rows = await db
    .select({
      canonicalUrl: sourceDocuments.canonicalUrl,
      contentHash: snapshots.contentHash,
      contentType: sourceDocuments.contentType,
      fetchedAt: snapshots.fetchedAt,
      finalUrl: snapshots.finalUrl,
      headers: snapshots.headers,
      rawContent: snapshots.rawContent,
      redirectChain: snapshots.redirectChain,
      semanticHash: snapshots.semanticHash,
      statusCode: snapshots.statusCode,
      storageKey: snapshots.storageKey,
    })
    .from(snapshots)
    .innerJoin(
      sourceDocuments,
      eq(sourceDocuments.id, snapshots.sourceDocumentId)
    )
    .where(eq(snapshots.id, id))
    .limit(1);
  const snapshot = rows[0];
  if (!snapshot) {
    return NextResponse.json(
      {
        error: {
          code: "SNAPSHOT_NOT_FOUND",
          message: "Snapshot was not found.",
        },
      },
      { status: 404 }
    );
  }
  const rawContent = snapshot.rawContent ?? "";
  return NextResponse.json({
    data: {
      ...snapshot,
      fetchedAt: snapshot.fetchedAt.toISOString(),
      rawContent: rawContent.slice(0, RAW_PREVIEW_LIMIT),
      truncated: rawContent.length > RAW_PREVIEW_LIMIT,
    },
  });
}
