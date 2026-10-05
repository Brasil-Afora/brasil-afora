import { getVisiblePrograms } from "@/server/programs";

export const runtime = "nodejs";
export async function GET() {
  try {
    return Response.json(await getVisiblePrograms());
  } catch {
    return Response.json(
      { error: "Não foi possível carregar os programas." },
      { status: 503 }
    );
  }
}
