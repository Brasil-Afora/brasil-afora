import { type NextRequest, NextResponse } from "next/server";
import { readNationalOpportunityRecord } from "@/server/opportunity-detail";
import { PUBLIC_CATALOG_CACHE_HEADERS } from "@/server/public-catalog-cache";
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
    const nationalOpportunity = await readNationalOpportunityRecord(id);
    return NextResponse.json(
      { nationalOpportunity },
      nationalOpportunity
        ? { headers: PUBLIC_CATALOG_CACHE_HEADERS }
        : undefined
    );
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch national opportunity." },
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
