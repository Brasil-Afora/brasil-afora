import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import {
  completeRecrawlJob,
  RecrawlWorkflowError,
} from "@/server/maintenance/recrawl-scheduler";
import { requireMaintenanceInRoute } from "@/server/maintenance-auth";

export const dynamic = "force-dynamic";

const completionRequestSchema = z
  .object({
    error: z.string().trim().min(1).max(2000).optional(),
    ingestion_id: z.string().trim().min(1).max(200).optional(),
    lease_token: z.string().uuid(),
    material_change: z.boolean().optional(),
    retryable: z.boolean().optional(),
    success: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!(value.success || value.error)) {
      context.addIssue({
        code: "custom",
        message: "A failure must include an error.",
        path: ["error"],
      });
    }
  });

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireMaintenanceInRoute(request);
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
  const parsed = completionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Recrawl completion request is invalid.",
        },
      },
      { status: 422 }
    );
  }
  const { id } = await context.params;
  try {
    const job = await completeRecrawlJob(
      db,
      id,
      authResult.principal.id,
      parsed.data.lease_token,
      parsed.data
    );
    return NextResponse.json({ data: job });
  } catch (error) {
    if (error instanceof RecrawlWorkflowError) {
      let status = 500;
      if (error.code === "RECRAWL_JOB_NOT_FOUND") {
        status = 404;
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
          code: "RECRAWL_COMPLETION_FAILED",
          message: "Recrawl completion could not be recorded.",
        },
      },
      { status: 500 }
    );
  }
}
