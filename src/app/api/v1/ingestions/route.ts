import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ingestionRequestV1Schema } from "@/contracts/opportunity-v1";
import { db } from "@/db/client";
import {
  IdempotencyConflictError,
  persistIngestion,
} from "@/server/ingestion/persist-ingestion";
import {
  ingestionAuthConfigurationError,
  requireIngestionInRoute,
} from "@/server/ingestion-auth";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 10 * 1024 * 1024;

const validationError = (issues: { message: string; path: PropertyKey[] }[]) =>
  NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        issues: issues.map((issue) => ({
          message: issue.message,
          path: issue.path.map(String).join("."),
        })),
        message: "Request does not satisfy the opportunity contract.",
      },
    },
    { status: 422 }
  );

export async function POST(request: NextRequest) {
  const configurationError = ingestionAuthConfigurationError();
  if (configurationError) {
    return configurationError;
  }
  const authResult = await requireIngestionInRoute(request);
  if (authResult.response) {
    return authResult.response;
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_BYTES) {
    return NextResponse.json(
      {
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "Ingestion payload exceeds the 10 MiB limit.",
        },
      },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return validationError([
      { message: "Request body must be valid JSON.", path: [] },
    ]);
  }
  const parsed = ingestionRequestV1Schema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.issues);
  }

  try {
    const result = await persistIngestion(db, parsed.data);
    return NextResponse.json(
      { data: result },
      { status: result.replayed ? 200 : 201 }
    );
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json(
        {
          error: {
            code: "IDEMPOTENCY_CONFLICT",
            message: error.message,
          },
        },
        { status: 409 }
      );
    }
    console.error("Ingestion transaction failed.", error);
    return NextResponse.json(
      {
        error: {
          code: "INGESTION_FAILED",
          message: "The ingestion transaction could not be completed.",
        },
      },
      { status: 500 }
    );
  }
}
