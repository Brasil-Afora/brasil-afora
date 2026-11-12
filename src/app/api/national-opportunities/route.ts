import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { nationalOpportunities } from "@/db/schema/national-opportunities";
import { resolveNationalLocations } from "@/server/geo/resolve-location";
import {
  PUBLIC_CATALOG_CACHE_HEADERS,
  withCatalogCache,
} from "@/server/public-catalog-cache";
import { enrichCuratedRecords } from "@/server/publication/curated-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await withCatalogCache(
      "api:national-opportunities",
      async () => {
        const data = await db.select().from(nationalOpportunities);
        return await enrichCuratedRecords(
          data.map((item) => ({
            ...item,
            locations: resolveNationalLocations(item.cityState),
          }))
        );
      }
    );
    return NextResponse.json(
      {
        nationalOpportunities: payload,
      },
      { headers: PUBLIC_CATALOG_CACHE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch national opportunities." },
      { status: 500 }
    );
  }
}
