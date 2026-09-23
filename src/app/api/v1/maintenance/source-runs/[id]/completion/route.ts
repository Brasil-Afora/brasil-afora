import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  parseSourceRunBody,
  sourceRunErrorResponse,
  sourceRunIdOrNotFound,
} from "@/server/maintenance/source-run-http";
import {
  completeSourceRun,
  sourceRunObservationSchema,
} from "@/server/maintenance/source-runs";
import { requireMaintenanceInRoute } from "@/server/maintenance-auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireMaintenanceInRoute(request);
  if (authResult.response) {
    return authResult.response;
  }
  const parsed = await parseSourceRunBody(request, sourceRunObservationSchema);
  if (parsed.response) {
    return parsed.response;
  }
  const runId = sourceRunIdOrNotFound((await context.params).id);
  if (runId.response) {
    return runId.response;
  }
  const { id } = runId;
  try {
    const run = await completeSourceRun(
      db,
      id,
      authResult.principal.id,
      parsed.data
    );
    return NextResponse.json({ data: { run } });
  } catch (error) {
    return sourceRunErrorResponse(error, "SOURCE_RUN_COMPLETION_FAILED");
  }
}
