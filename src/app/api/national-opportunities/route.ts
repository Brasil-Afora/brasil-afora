import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { nationalOpportunities } from "@/db/schema/national-opportunities";
import { requireAdminInRoute } from "@/server/route-auth";

export const dynamic = "force-dynamic";

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

  return NextResponse.json(
    {
      error: {
        code: "LEGACY_WRITE_DISABLED",
        message:
          "Direct public-table writes are disabled. Create a validated v1 draft, review its evidence, and publish it through the approval outbox.",
      },
    },
    {
      headers: {
        Deprecation: "true",
        Link: '</api/v1/ingestions>; rel="successor-version"',
      },
      status: 410,
    }
  );
}
