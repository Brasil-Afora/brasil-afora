import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { opportunities } from "@/db/schema/opportunities";
import { requireAdminInRoute } from "@/server/route-auth";

export const dynamic = "force-dynamic";

type OpportunityCreateInput = Omit<
  typeof opportunities.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;

const normalizeOpportunityInput = (
  raw: Record<string, unknown>
): OpportunityCreateInput => {
  const payload: OpportunityCreateInput = {
    name: "",
    image: "",
    country: "",
    city: "",
    responsibleInstitution: "",
    type: "",
    description: "",
    educationLevel: "",
    ageRange: "",
    languageRequirements: "",
    specificRequirements: "",
    applicationFee: "",
    scholarshipType: "",
    scholarshipCoverage: "",
    extraCosts: "",
    duration: "",
    applicationDeadline: "",
    selectionSteps: "",
    applicationProcess: "",
    officialLink: "",
    contact: "",
  };

  for (const key of Object.keys(payload) as Array<
    keyof OpportunityCreateInput
  >) {
    payload[key] = String(raw[key] ?? "") as OpportunityCreateInput[typeof key];
  }

  return payload;
};

export async function GET() {
  try {
    const data = await db.select().from(opportunities);
    return NextResponse.json({ opportunities: data });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch opportunities." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminInRoute(request);
  if (authResult.response) {
    return authResult.response;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    await db.insert(opportunities).values(normalizeOpportunityInput(body));

    return NextResponse.json(
      { message: "Opportunity created successfully." },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { message: "Failed to create opportunity." },
      { status: 500 }
    );
  }
}

export function PUT() {
  return NextResponse.json({ message: "Method Not Allowed." }, { status: 405 });
}

export function DELETE() {
  return NextResponse.json({ message: "Method Not Allowed." }, { status: 405 });
}
