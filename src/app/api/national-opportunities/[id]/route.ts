import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { nationalOpportunities } from "@/db/schema/national-opportunities";
import { requireAdminInRoute } from "@/server/route-auth";

export const dynamic = "force-dynamic";

const buildUpdatePayload = (raw: Record<string, unknown>) => {
  const payload: Record<string, string> = {};
  const allowed = [
    "name",
    "image",
    "country",
    "type",
    "educationLevel",
    "modality",
    "applicationDeadline",
    "about",
    "shortDescription",
    "duration",
    "cityState",
    "ageRange",
    "requirements",
    "specificRequirements",
    "responsibleInstitution",
    "applicationFee",
    "benefits",
    "costs",
    "extraCosts",
    "selectionSteps",
    "officialLink",
    "contact",
  ] as const;

  for (const key of allowed) {
    if (raw[key] !== undefined) {
      payload[key] = String(raw[key]);
    }
  }

  return payload;
};

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const data = await db
      .select()
      .from(nationalOpportunities)
      .where(eq(nationalOpportunities.id, id))
      .limit(1);

    return NextResponse.json({ nationalOpportunity: data[0] ?? null });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch national opportunity." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminInRoute(request);
  if (authResult.response) {
    return authResult.response;
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const payload = buildUpdatePayload(body);

    if (Object.keys(payload).length > 0) {
      await db
        .update(nationalOpportunities)
        .set(payload)
        .where(eq(nationalOpportunities.id, id));
    }

    return NextResponse.json({
      message: "National opportunity updated successfully.",
    });
  } catch {
    return NextResponse.json(
      { message: "Failed to update national opportunity." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminInRoute(request);
  if (authResult.response) {
    return authResult.response;
  }

  try {
    const { id } = await context.params;
    await db
      .delete(nationalOpportunities)
      .where(eq(nationalOpportunities.id, id));

    return NextResponse.json({
      message: "National opportunity deleted successfully.",
    });
  } catch {
    return NextResponse.json(
      { message: "Failed to delete national opportunity." },
      { status: 500 }
    );
  }
}
