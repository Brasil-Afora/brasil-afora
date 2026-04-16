import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { favoriteNationalOpportunities } from "@/db/schema/favorite-national-opportunities";
import { requireSessionInRoute } from "@/server/route-auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSessionInRoute(request);
  if (authResult.response) {
    return authResult.response;
  }

  try {
    const { id } = await context.params;
    await db
      .insert(favoriteNationalOpportunities)
      .values({
        userId: authResult.session.user.id,
        nationalOpportunityId: id,
      })
      .onConflictDoNothing();

    return NextResponse.json({
      message: "National opportunity added to favorites.",
    });
  } catch {
    return NextResponse.json(
      { message: "Failed to add national opportunity to favorites." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSessionInRoute(request);
  if (authResult.response) {
    return authResult.response;
  }

  try {
    const { id } = await context.params;
    await db
      .delete(favoriteNationalOpportunities)
      .where(
        and(
          eq(favoriteNationalOpportunities.userId, authResult.session.user.id),
          eq(favoriteNationalOpportunities.nationalOpportunityId, id)
        )
      );

    return NextResponse.json({
      message: "National opportunity removed from favorites.",
    });
  } catch {
    return NextResponse.json(
      { message: "Failed to remove national opportunity from favorites." },
      { status: 500 }
    );
  }
}
