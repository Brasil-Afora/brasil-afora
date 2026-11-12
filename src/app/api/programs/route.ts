import { getVisiblePrograms } from "@/server/programs";
import {
  PUBLIC_CATALOG_CACHE_HEADERS,
  withCatalogCache,
} from "@/server/public-catalog-cache";

export const runtime = "nodejs";
export async function GET() {
  try {
    const programs = await withCatalogCache("api:programs", getVisiblePrograms);
    return Response.json(programs, {
      headers: PUBLIC_CATALOG_CACHE_HEADERS,
    });
  } catch {
    return Response.json(
      { error: "Não foi possível carregar os programas." },
      { status: 503 }
    );
  }
}
