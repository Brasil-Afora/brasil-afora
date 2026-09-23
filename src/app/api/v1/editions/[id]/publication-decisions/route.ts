import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { publicationDecisionRequestV1Schema } from "@/contracts/opportunity-v1";
import { db } from "@/db/client";
import {
  decidePublication,
  PublicationWorkflowError,
} from "@/server/publication/publication-workflow";
import { requireAdminInRoute } from "@/server/route-auth";

export const dynamic = "force-dynamic";

const STATUS_BY_ERROR_CODE: Record<string, number> = {
  CRITICAL_REVIEW_OPEN: 409,
  GATE_BLOCKED: 409,
  GATE_DECISION_MISSING: 409,
  IDEMPOTENCY_CONFLICT: 409,
  PUBLICATION_NOT_FOUND: 404,
  VERSION_CONFLICT: 409,
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminInRoute(request);
  if (authResult.response) {
    return authResult.response;
  }
  const parsed = publicationDecisionRequestV1Schema.safeParse(
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
          message: "Request does not satisfy the publication contract.",
        },
      },
      { status: 422 }
    );
  }

  try {
    const { id } = await context.params;
    const result = await decidePublication(
      db,
      id,
      authResult.session.user.id,
      parsed.data
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof PublicationWorkflowError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: STATUS_BY_ERROR_CODE[error.code] ?? 422 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "PUBLICATION_DECISION_FAILED",
          message: "Publication decision could not be completed.",
        },
      },
      { status: 500 }
    );
  }
}
