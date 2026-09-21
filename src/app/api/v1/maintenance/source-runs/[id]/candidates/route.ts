import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  parseSourceRunBody,
  sourceRunErrorResponse,
  sourceRunIdOrNotFound,
} from "@/server/maintenance/source-run-http";
import {
  enqueueSourceRunCandidates,
  sourceRunCandidatesRequestSchema,
} from "@/server/maintenance/source-runs";
import { requireMaintenanceCapability } from "@/server/maintenance-auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireMaintenanceCapability(
    request,
    "source-run:manage"
  );
  if (authResult.response) {
    return authResult.response;
  }
  const parsed = await parseSourceRunBody(
    request,
    sourceRunCandidatesRequestSchema
  );
  if (parsed.response) {
    return parsed.response;
  }
  const runId = sourceRunIdOrNotFound((await context.params).id);
  if (runId.response) {
    return runId.response;
  }
  const { id } = runId;
  try {
    const jobs = await enqueueSourceRunCandidates(
      db,
      id,
      authResult.principal.id,
      parsed.data.candidates
    );
    return NextResponse.json({ data: { jobs } });
  } catch (error) {
    return sourceRunErrorResponse(error, "SOURCE_RUN_CANDIDATES_FAILED");
  }
}
