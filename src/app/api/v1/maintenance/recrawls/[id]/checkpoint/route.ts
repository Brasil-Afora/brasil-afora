import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestionRequestV1Schema } from "@/contracts/opportunity-v1";
import { db } from "@/db/client";
import {
  checkpointRecrawlJob,
  RecrawlWorkflowError,
} from "@/server/maintenance/recrawl-scheduler";
import { requireMaintenanceCapability } from "@/server/maintenance-auth";

export const dynamic = "force-dynamic";

const checkpointRequestSchema = z
  .object({
    ingestion: ingestionRequestV1Schema,
    lease_token: z.string().uuid(),
  })
  .strict();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireMaintenanceCapability(request, "queue:write");
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
  const parsed = checkpointRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Recrawl checkpoint request is invalid.",
        },
      },
      { status: 422 }
    );
  }
  const { id } = await context.params;
  try {
    const job = await checkpointRecrawlJob(
      db,
      id,
      authResult.principal.id,
      parsed.data.lease_token,
      parsed.data.ingestion
    );
    return NextResponse.json({ data: job });
  } catch (error) {
    if (error instanceof RecrawlWorkflowError) {
      let status = 500;
      if (error.code === "RECRAWL_JOB_NOT_FOUND") {
        status = 404;
      } else if (error.code === "RECRAWL_CHECKPOINT_UNSUPPORTED") {
        status = 422;
      } else if (
        error.code === "RECRAWL_LOCK_MISMATCH" ||
        error.code === "RECRAWL_LEASE_MISMATCH"
      ) {
        status = 409;
      }
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "RECRAWL_CHECKPOINT_FAILED",
          message: "Recrawl checkpoint could not be recorded.",
        },
      },
      { status: 500 }
    );
  }
}
