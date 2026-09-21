import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import {
  parseSourceRunBody,
  sourceRunErrorResponse,
} from "@/server/maintenance/source-run-http";
import {
  getSourceRunHealth,
  sourceRunStartRequestSchema,
  startSourceRun,
} from "@/server/maintenance/source-runs";
import { requireMaintenanceCapability } from "@/server/maintenance-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authResult = await requireMaintenanceCapability(
    request,
    "source-run:manage"
  );
  if (authResult.response) {
    return authResult.response;
  }
  const parsed = await parseSourceRunBody(request, sourceRunStartRequestSchema);
  if (parsed.response) {
    return parsed.response;
  }
  try {
    const run = await startSourceRun(db, authResult.principal.id, parsed.data);
    return NextResponse.json({ data: { run } }, { status: 201 });
  } catch (error) {
    return sourceRunErrorResponse(error, "SOURCE_RUN_START_FAILED");
  }
}

const healthQuerySchema = z.object({ source_id: z.uuid() }).strict();

export async function GET(request: NextRequest) {
  const authResult = await requireMaintenanceCapability(
    request,
    "source-run:manage"
  );
  if (authResult.response) {
    return authResult.response;
  }
  const parsed = healthQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "source_id must be a UUID.",
        },
      },
      { status: 422 }
    );
  }
  const health = await getSourceRunHealth(db, parsed.data.source_id);
  return NextResponse.json({ data: health });
}
