import { getVisiblePrograms } from "@/server/programs";
import { PUBLIC_CATALOG_CACHE_HEADERS } from "@/server/public-catalog-cache";

export const runtime = "nodejs";
export async function GET() {
  try {
    return Response.json(await getVisiblePrograms(), {
      headers: PUBLIC_CATALOG_CACHE_HEADERS,
    });
  } catch {
    return Response.json(
      { error: "Não foi possível carregar os programas." },
      { status: 503 }
    );
  }
}
