import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SourceRunWorkflowError } from "@/server/maintenance/source-runs";

const runIdSchema = z.uuid();

/** A malformed run id is a 404, never a database cast error (a retryable 500). */
export const sourceRunIdOrNotFound = (
  id: string
): { id: string; response: null } | { response: NextResponse } => {
  if (runIdSchema.safeParse(id).success) {
    return { id, response: null };
  }
  return {
    response: NextResponse.json(
      {
        error: {
          code: "SOURCE_RUN_NOT_FOUND",
          message: "The source run does not exist.",
        },
      },
      { status: 404 }
    ),
  };
};

const STATUS_BY_CODE: Record<string, number> = {
  SOURCE_DISABLED: 409,
  SOURCE_IDENTITY_CONFLICT: 409,
  SOURCE_RUN_ALREADY_RUNNING: 409,
  SOURCE_RUN_CANDIDATE_OUTSIDE_SOURCE: 422,
  SOURCE_RUN_NOT_FOUND: 404,
  SOURCE_RUN_NOT_RUNNING: 409,
};

export const parseSourceRunBody = async <T extends z.ZodType>(
  request: NextRequest,
  requestSchema: T
): Promise<
  { data: z.infer<T>; response: null } | { response: NextResponse }
> => {
  const rawBody = await request.text();
  let body: unknown = null;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    body = null;
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      response: NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Source-run request is invalid.",
          },
        },
        { status: 422 }
      ),
    };
  }
  return { data: parsed.data, response: null };
};

export const sourceRunErrorResponse = (
  error: unknown,
  fallbackCode: string
): NextResponse => {
  if (error instanceof SourceRunWorkflowError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: STATUS_BY_CODE[error.code] ?? 500 }
    );
  }
  return NextResponse.json(
    {
      error: {
        code: fallbackCode,
        message: "The source-run operation could not be completed.",
      },
    },
    { status: 500 }
  );
};
