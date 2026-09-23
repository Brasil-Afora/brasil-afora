import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { claimRecrawlJobs } from "@/server/maintenance/recrawl-scheduler";
import { requireMaintenanceInRoute } from "@/server/maintenance-auth";

export const dynamic = "force-dynamic";

const claimRequestSchema = z
  .object({
    job_kinds: z
      .array(z.enum(["application_link", "source_document"]))
      .min(1)
      .max(2)
      .optional(),
    job_ids: z.array(z.uuid()).min(1).max(10).optional(),
    limit: z.number().int().min(1).max(100).default(10),
  })
  .strict();

export async function POST(request: NextRequest) {
  const authResult = await requireMaintenanceInRoute(request);
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
  const parsed = claimRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Recrawl claim request is invalid.",
        },
      },
      { status: 422 }
    );
  }
  const jobs = await claimRecrawlJobs(
    db,
    authResult.principal.id,
    parsed.data.limit,
    new Date(),
    parsed.data.job_kinds,
    undefined,
    parsed.data.job_ids
  );
  return NextResponse.json({ data: { jobs } });
}
