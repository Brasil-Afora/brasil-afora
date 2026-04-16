import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { favoriteOpportunities } from "@/db/schema/favorite-opportunities";
import { opportunities } from "@/db/schema/opportunities";
import { requireSessionInRoute } from "@/server/route-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireSessionInRoute(request);
  if (authResult.response) {
    return authResult.response;
  }

  try {
    const rows = await db
      .select({ opportunity: opportunities })
      .from(favoriteOpportunities)
      .innerJoin(
        opportunities,
        eq(favoriteOpportunities.opportunityId, opportunities.id)
      )
      .where(eq(favoriteOpportunities.userId, authResult.session.user.id));

    return NextResponse.json({
      opportunities: rows.map((row) => row.opportunity),
    });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch favorite opportunities." },
      { status: 500 }
    );
  }
}
