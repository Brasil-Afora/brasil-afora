import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { favoriteOpportunities } from "@/db/schema/favorite-opportunities";
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
      .insert(favoriteOpportunities)
      .values({
        userId: authResult.session.user.id,
        opportunityId: id,
      })
      .onConflictDoNothing();

    return NextResponse.json({ message: "Opportunity added to favorites." });
  } catch {
    return NextResponse.json(
      { message: "Failed to add opportunity to favorites." },
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
      .delete(favoriteOpportunities)
      .where(
        and(
          eq(favoriteOpportunities.userId, authResult.session.user.id),
          eq(favoriteOpportunities.opportunityId, id)
        )
      );

    return NextResponse.json({
      message: "Opportunity removed from favorites.",
    });
  } catch {
    return NextResponse.json(
      { message: "Failed to remove opportunity from favorites." },
      { status: 500 }
    );
  }
}
