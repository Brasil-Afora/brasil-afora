import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { scheduleDueRecrawls } from "@/server/maintenance/recrawl-scheduler";
import { requireMaintenanceInRoute } from "@/server/maintenance-auth";

export const dynamic = "force-dynamic";

const scheduleRequestSchema = z.object({}).strict();

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
  if (!scheduleRequestSchema.safeParse(body).success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Recrawl scheduling request is invalid.",
        },
      },
      { status: 422 }
    );
  }
  const result = await scheduleDueRecrawls(
    db,
    authResult.principal.id,
    new Date()
  );
  return NextResponse.json({ data: result });
}
