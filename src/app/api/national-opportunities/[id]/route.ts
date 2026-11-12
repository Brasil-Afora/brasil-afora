import { type NextRequest, NextResponse } from "next/server";
import { readNationalOpportunityRecord } from "@/server/opportunity-detail";
import { PUBLIC_CATALOG_CACHE_HEADERS } from "@/server/public-catalog-cache";

export const dynamic = "force-dynamic";

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
