import { and, desc, eq, lt } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { auditEvents } from "@/db/schema/ingestion";
import { requireAdminInRoute } from "@/server/route-auth";

export const dynamic = "force-dynamic";

const querySchema = z
  .object({
    cursor: z.uuid().optional(),
    entity_id: z.uuid().optional(),
    entity_type: z.string().trim().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export async function GET(request: NextRequest) {
  const authResult = await requireAdminInRoute(request);
  if (authResult.response) {
    return authResult.response;
  }
  const unknownParameters = [
    ...new Set(request.nextUrl.searchParams.keys()),
  ].filter(
    (name) => !["cursor", "entity_id", "entity_type", "limit"].includes(name)
  );
  if (unknownParameters.length > 0) {
    return NextResponse.json(
      {
        error: {
          code: "UNKNOWN_QUERY_PARAMETER",
          message: `Unknown query parameters: ${unknownParameters.join(", ")}`,
        },
      },
      { status: 422 }
    );
  }
  const parsed = querySchema.safeParse({
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    entity_id: request.nextUrl.searchParams.get("entity_id") ?? undefined,
    entity_type: request.nextUrl.searchParams.get("entity_type") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Audit-event query is invalid.",
        },
      },
      { status: 422 }
    );
  }

  const cursorRows = parsed.data.cursor
    ? await db
        .select({ createdAt: auditEvents.createdAt })
        .from(auditEvents)
        .where(eq(auditEvents.id, parsed.data.cursor))
        .limit(1)
    : [];
  if (parsed.data.cursor && cursorRows.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "CURSOR_NOT_FOUND",
          message: "Audit-event cursor does not exist.",
        },
      },
      { status: 422 }
    );
  }
  const filters = [
    parsed.data.entity_id
      ? eq(auditEvents.entityId, parsed.data.entity_id)
      : undefined,
    parsed.data.entity_type
      ? eq(auditEvents.entityType, parsed.data.entity_type)
      : undefined,
    cursorRows[0]
      ? lt(auditEvents.createdAt, cursorRows[0].createdAt)
      : undefined,
  ].filter((filter) => filter !== undefined);
  const rows = await db
    .select()
    .from(auditEvents)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(auditEvents.createdAt))
    .limit(parsed.data.limit + 1);
  const hasMore = rows.length > parsed.data.limit;
  const items = rows.slice(0, parsed.data.limit);
  return NextResponse.json({
    data: {
      items,
      next_cursor: hasMore ? (items.at(-1)?.id ?? null) : null,
    },
  });
}
