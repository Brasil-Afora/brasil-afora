import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { requireOutboxInRoute } from "@/server/outbox-auth";
import { deliverPendingOutbox } from "@/server/publication/publication-workflow";

export const dynamic = "force-dynamic";

const deliveryRequestSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(25),
  })
  .strict();

export async function POST(request: NextRequest) {
  const authResult = await requireOutboxInRoute(request);
  if (authResult.response) {
    return authResult.response;
  }
  const rawBody = await request.text();
  let body: unknown = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    body = null;
  }
  const parsed = deliveryRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Outbox delivery request is invalid.",
        },
      },
      { status: 422 }
    );
  }
  const result = await deliverPendingOutbox(
    db,
    authResult.principal.id,
    parsed.data.limit
  );
  return NextResponse.json({ data: result });
}
