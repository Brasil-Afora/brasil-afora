import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { opportunities } from "@/db/schema/opportunities";
import { resolveInternationalLocations } from "@/server/geo/resolve-location";
import { enrichCuratedRecords } from "@/server/publication/curated-catalog";
import { requireAdminInRoute } from "@/server/route-auth";

export const dynamic = "force-dynamic";

const legacyWriteDisabled = () =>
  NextResponse.json(
    {
      error: {
        code: "LEGACY_WRITE_DISABLED",
        message:
          "Use reviewer corrections and publication decisions; direct public-table mutation is disabled.",
      },
    },
    {
      headers: {
        Deprecation: "true",
        Link: '</api/v1/review-queue>; rel="successor-version"',
      },
      status: 410,
    }
  );

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

    const record = data[0];
    const enriched = record ? (await enrichCuratedRecords([record]))[0] : null;
    return NextResponse.json({
      opportunity: record
        ? {
            ...record,
            locations: resolveInternationalLocations(
              record.city,
              record.country
            ),
            ...enriched,
          }
        : null,
    });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch opportunity." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  _context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminInRoute(request);
  if (authResult.response) {
    return authResult.response;
  }

  return legacyWriteDisabled();
}

export async function DELETE(
  request: NextRequest,
  _context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminInRoute(request);
  if (authResult.response) {
    return authResult.response;
  }

  return legacyWriteDisabled();
}
