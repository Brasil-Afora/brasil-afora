import {
  mergePrograms,
  toCuratedProgram,
} from "@/components/programs/curated-programs";
import { getPrograms } from "@/components/programs/program-model";
import { isProgramVisible } from "@/lib/catalog-visibility";
import { getCuratedPublications } from "@/server/publication/curated-catalog";

export const runtime = "nodejs";
export async function GET() {
  try {
    const publications = await getCuratedPublications();
    return Response.json(
      mergePrograms(
        publications.filter((record) => record.program).map(toCuratedProgram),
        getPrograms()
      ).filter((program) => isProgramVisible(program))
    );
  } catch {
    return Response.json(
      { error: "Não foi possível carregar os programas." },
      { status: 503 }
    );
  }
}
