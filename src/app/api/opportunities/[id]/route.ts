import { type NextRequest, NextResponse } from "next/server";
import { readInternationalOpportunityRecord } from "@/server/opportunity-detail";
import { PUBLIC_CATALOG_CACHE_HEADERS } from "@/server/public-catalog-cache";

export const dynamic = "force-dynamic";

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const opportunity = await readInternationalOpportunityRecord(id);
    return NextResponse.json(
      { opportunity },
      opportunity ? { headers: PUBLIC_CATALOG_CACHE_HEADERS } : undefined
    );
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch opportunity." },
      { status: 500 }
    );
  }
}
