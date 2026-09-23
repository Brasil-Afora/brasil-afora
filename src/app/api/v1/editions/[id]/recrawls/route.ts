import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import {
  RecrawlWorkflowError,
  requestEditionRecrawl,
} from "@/server/maintenance/recrawl-scheduler";
import { requireAdminInRoute } from "@/server/route-auth";

export const dynamic = "force-dynamic";

const requestRecrawlSchema = z
  .object({
    idempotency_key: z.string().trim().min(8).max(200),
    reason: z.string().trim().min(5).max(1000),
  })
  .strict();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminInRoute(request);
  if (authResult.response) {
    return authResult.response;
  }
  const rawBody = await request.text();
  let body: unknown = null;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    body = null;
  }
  const parsed = requestRecrawlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Recrawl request is invalid.",
        },
      },
      { status: 422 }
    );
  }
  const { id } = await context.params;
  try {
    const jobs = await requestEditionRecrawl(
      db,
      id,
      authResult.session.user.id,
      parsed.data.reason,
      parsed.data.idempotency_key
    );
    return NextResponse.json({ data: { jobs } }, { status: 201 });
  } catch (error) {
    if (error instanceof RecrawlWorkflowError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        {
          status: error.code === "EDITION_SOURCES_NOT_FOUND" ? 404 : 500,
        }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "RECRAWL_REQUEST_FAILED",
          message: "Recrawl could not be requested.",
        },
      },
      { status: 500 }
    );
  }
}
