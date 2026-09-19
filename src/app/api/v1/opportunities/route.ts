import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { publicOpportunityFilterV1Schema } from "@/contracts/opportunity-v1";
import { db } from "@/db/client";
import { listPublicOpportunities } from "@/server/publication/list-public-opportunities";

export const dynamic = "force-dynamic";

const ALLOWED_QUERY_PARAMETERS = new Set([
  "age",
  "brazil_eligibility",
  "collection",
  "cursor",
  "deadline_from",
  "deadline_to",
  "education_level",
  "is_free",
  "lifecycle",
  "limit",
  "modality",
  "opportunity_type",
]);

const listParameter = (request: NextRequest, name: string) => {
  const values = request.nextUrl.searchParams.getAll(name);
  if (values.length === 0) {
    return undefined;
  }
  return values.flatMap((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
};

const booleanParameter = (value: string | null): boolean | undefined => {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
};

export async function GET(request: NextRequest) {
  const unknownParameters = [
    ...new Set(request.nextUrl.searchParams.keys()),
  ].filter((name) => !ALLOWED_QUERY_PARAMETERS.has(name));
  if (unknownParameters.length > 0) {
    return NextResponse.json(
      {
        error: {
          code: "UNKNOWN_QUERY_PARAMETER",
          message: `Unknown query parameters: ${unknownParameters.join(", ")}`,
        },
      },
      { status: 422 }
    );
  }
  const isFree = request.nextUrl.searchParams.get("is_free");
  const parsed = publicOpportunityFilterV1Schema.safeParse({
    age: request.nextUrl.searchParams.get("age")
      ? Number(request.nextUrl.searchParams.get("age"))
      : undefined,
    brazil_eligibility: listParameter(request, "brazil_eligibility"),
    collection: request.nextUrl.searchParams.get("collection") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    deadline_from:
      request.nextUrl.searchParams.get("deadline_from") ?? undefined,
    deadline_to: request.nextUrl.searchParams.get("deadline_to") ?? undefined,
    education_level: listParameter(request, "education_level"),
    is_free: booleanParameter(isFree),
    lifecycle: listParameter(request, "lifecycle"),
    limit: request.nextUrl.searchParams.get("limit")
      ? Number(request.nextUrl.searchParams.get("limit"))
      : undefined,
    modality: listParameter(request, "modality"),
    opportunity_type: listParameter(request, "opportunity_type"),
  });
  if (!parsed.success || (isFree && !["true", "false"].includes(isFree))) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          issues: parsed.success
            ? []
            : parsed.error.issues.map((issue) => ({
                message: issue.message,
                path: issue.path.map(String).join("."),
              })),
          message: "Opportunity filter is invalid.",
        },
      },
      { status: 422 }
    );
  }
  const page = await listPublicOpportunities(db, parsed.data);
  return NextResponse.json({ data: page });
}
