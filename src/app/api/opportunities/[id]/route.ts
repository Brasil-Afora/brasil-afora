import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { opportunities } from "@/db/schema/opportunities";
import { requireAdminInRoute } from "@/server/route-auth";

export const dynamic = "force-dynamic";

const buildUpdatePayload = (raw: Record<string, unknown>) => {
  const payload: Record<string, string> = {};
  const allowed = [
    "name",
    "image",
    "country",
    "city",
    "responsibleInstitution",
    "type",
    "description",
    "educationLevel",
    "ageRange",
    "languageRequirements",
    "specificRequirements",
    "applicationFee",
    "scholarshipType",
    "scholarshipCoverage",
    "extraCosts",
    "duration",
    "applicationDeadline",
    "selectionSteps",
    "applicationProcess",
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
      .from(opportunities)
      .where(eq(opportunities.id, id))
      .limit(1);

    return NextResponse.json({ opportunity: data[0] ?? null });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch opportunity." },
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

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({
        message: "Opportunity updated successfully.",
      });
    }

    await db.update(opportunities).set(payload).where(eq(opportunities.id, id));

    return NextResponse.json({ message: "Opportunity updated successfully." });
  } catch {
    return NextResponse.json(
      { message: "Failed to update opportunity." },
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
    await db.delete(opportunities).where(eq(opportunities.id, id));
    return NextResponse.json({ message: "Opportunity deleted successfully." });
  } catch {
    return NextResponse.json(
      { message: "Failed to delete opportunity." },
      { status: 500 }
    );
  }
}
