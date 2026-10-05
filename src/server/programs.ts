import {
  mergePrograms,
  toCuratedProgram,
} from "@/components/programs/curated-programs";
import { getPrograms } from "@/components/programs/program-model";
import type { Program } from "@/components/programs/types";
import { isProgramVisible } from "@/lib/catalog-visibility";
import { getCuratedPublications } from "@/server/publication/curated-catalog";

/**
 * The programs the catalog shows: the site's own list merged with the curated
 * publications, minus the hidden ones. Served by `GET /api/programs` and read
 * directly by the program pages.
 */
export const getVisiblePrograms = async (): Promise<Program[]> => {
  const publications = await getCuratedPublications();
  return mergePrograms(
    publications.filter((record) => record.program).map(toCuratedProgram),
    getPrograms()
  ).filter((program) => isProgramVisible(program));
};

/** A program by its id or one of its former ids. */
export const findProgram = (
  programs: Program[],
  id: string
): Program | undefined =>
  programs.find((record) => record.id === id || record.aliases?.includes(id));
