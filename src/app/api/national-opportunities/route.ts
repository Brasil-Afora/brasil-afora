import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { nationalOpportunities } from "@/db/schema/national-opportunities";
import { requireAdminInRoute } from "@/server/route-auth";

export const dynamic = "force-dynamic";

type NationalOpportunityCreateInput = Omit<
  typeof nationalOpportunities.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;

const normalizeNationalInput = (
  raw: Record<string, unknown>
): NationalOpportunityCreateInput => {
  const payload: NationalOpportunityCreateInput = {
    name: "",
    image: "",
    country: "",
    type: "",
    educationLevel: "",
    modality: "",
    applicationDeadline: "",
    about: "",
    shortDescription: "",
    duration: "",
    cityState: "",
    ageRange: "",
    requirements: "",
    specificRequirements: "",
    responsibleInstitution: "",
    applicationFee: "",
    benefits: "",
    costs: "",
    extraCosts: "",
    selectionSteps: "",
    officialLink: "",
    contact: "",
  };

  for (const key of Object.keys(payload) as Array<
    keyof NationalOpportunityCreateInput
  >) {
    payload[key] = String(
      raw[key] ?? ""
    ) as NationalOpportunityCreateInput[typeof key];
  }

  return payload;
};

export async function GET() {
  try {
    const data = await db.select().from(nationalOpportunities);
    return NextResponse.json({ nationalOpportunities: data });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch national opportunities." },
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
    await db.insert(nationalOpportunities).values(normalizeNationalInput(body));

    return NextResponse.json(
      { message: "National opportunity created successfully." },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { message: "Failed to create national opportunity." },
      { status: 500 }
    );
  }
}
