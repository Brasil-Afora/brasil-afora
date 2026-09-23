import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { getPublicOpportunityById } from "@/server/publication/list-public-opportunities";

export const dynamic = "force-dynamic";

const opportunityIdSchema = z.uuid();

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!opportunityIdSchema.safeParse(id).success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Opportunity ID must be a UUID.",
        },
      },
      { status: 422 }
    );
  }
  const opportunity = await getPublicOpportunityById(db, id);
  if (!opportunity) {
    return NextResponse.json(
      {
        error: {
          code: "OPPORTUNITY_NOT_FOUND",
          message: "Published opportunity was not found.",
        },
      },
      { status: 404 }
    );
  }
  return NextResponse.json({ data: opportunity });
}
