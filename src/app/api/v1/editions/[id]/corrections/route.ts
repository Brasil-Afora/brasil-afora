import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { reviewerCorrectionRequestV1Schema } from "@/contracts/opportunity-v1";
import { db } from "@/db/client";
import {
  ReviewerCorrectionError,
  submitReviewerCorrection,
} from "@/server/review/reviewer-corrections";
import { requireAdminInRoute } from "@/server/route-auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminInRoute(request);
  if (authResult.response) {
    return authResult.response;
  }
  const parsed = reviewerCorrectionRequestV1Schema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          issues: parsed.error.issues.map((issue) => ({
            message: issue.message,
            path: issue.path.map(String).join("."),
          })),
          message: "Request does not satisfy the correction contract.",
        },
      },
      { status: 422 }
    );
  }
  const { id } = await context.params;
  if (id !== parsed.data.edition_id) {
    return NextResponse.json(
      {
        error: {
          code: "EDITION_MISMATCH",
          message: "Route edition does not match the correction payload.",
        },
      },
      { status: 422 }
    );
  }
  try {
    const result = await submitReviewerCorrection(
      db,
      authResult.session.user.id,
      parsed.data
    );
    return NextResponse.json(
      { data: result },
      { status: result.replayed ? 200 : 201 }
    );
  } catch (error) {
    if (error instanceof ReviewerCorrectionError) {
      const status =
        error.code.endsWith("_NOT_FOUND") ||
        error.code === "PUBLICATION_NOT_FOUND"
          ? 404
          : 409;
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "CORRECTION_FAILED",
          message: "Reviewer correction could not be completed.",
        },
      },
      { status: 500 }
    );
  }
}
