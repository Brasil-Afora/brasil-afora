import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { getReviewQueuePage } from "@/server/review/review-queue";
import { requireAdminInRoute } from "@/server/route-auth";

export const dynamic = "force-dynamic";

const querySchema = z
  .object({
    cursor: z.uuid().optional(),
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
  ].filter((name) => !["cursor", "limit"].includes(name));
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
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Review queue query is invalid.",
        },
      },
      { status: 422 }
    );
  }
  const page = await getReviewQueuePage(
    db,
    parsed.data.limit,
    parsed.data.cursor
  );
  return NextResponse.json({ data: page });
}
