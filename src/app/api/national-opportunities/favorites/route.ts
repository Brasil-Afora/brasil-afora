import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { favoriteNationalOpportunities } from "@/db/schema/favorite-national-opportunities";
import { nationalOpportunities as nationalOpportunitiesTable } from "@/db/schema/national-opportunities";
import { requireSessionInRoute } from "@/server/route-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireSessionInRoute(request);
  if (authResult.response) {
    return authResult.response;
  }

  try {
    const rows = await db
      .select({ nationalOpportunity: nationalOpportunitiesTable })
      .from(favoriteNationalOpportunities)
      .innerJoin(
        nationalOpportunitiesTable,
        eq(
          favoriteNationalOpportunities.nationalOpportunityId,
          nationalOpportunitiesTable.id
        )
      )
      .where(
        eq(favoriteNationalOpportunities.userId, authResult.session.user.id)
      );

    return NextResponse.json({
      nationalOpportunities: rows.map((row) => row.nationalOpportunity),
    });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch favorite national opportunities." },
      { status: 500 }
    );
  }
}
