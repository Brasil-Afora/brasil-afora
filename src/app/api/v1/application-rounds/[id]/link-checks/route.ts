import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import {
  ApplicationLinkVerificationError,
  verifyApplicationLinkWithChange,
} from "@/server/link-verification/application-link-verifier";
import { requireMaintenanceCapability } from "@/server/maintenance-auth";

export const dynamic = "force-dynamic";
// The verification's own network deadline is 45s; this leaves room for the
// database writes that follow it. Honoured by Vercel, ignored elsewhere.
export const maxDuration = 60;

const linkCheckRequestSchema = z.object({}).strict();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireMaintenanceCapability(
    request,
    "link-check:run"
  );
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
  const parsed = linkCheckRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Link-check request is invalid.",
        },
      },
      { status: 422 }
    );
  }
  const { id } = await context.params;
  try {
    const verification = await verifyApplicationLinkWithChange(
      db,
      id,
      authResult.principal.id
    );
    return NextResponse.json(
      {
        data: verification.assessment,
        meta: {
          material_change: verification.materialChange,
          previous_status: verification.previousStatus,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ApplicationLinkVerificationError) {
      let status = 500;
      if (error.code === "APPLICATION_ROUND_NOT_FOUND") {
        status = 404;
      } else if (error.code === "APPLICATION_URL_MISSING") {
        status = 422;
      }
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "LINK_CHECK_FAILED",
          message: "Application-link verification failed.",
        },
      },
      { status: 500 }
    );
  }
}
