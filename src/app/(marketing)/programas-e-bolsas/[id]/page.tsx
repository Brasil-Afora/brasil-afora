import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import ProgramDetailLoader from "@/components/programs/program-detail-loader";
import { PROGRAMS_PATH } from "@/components/programs/program-model";
import type { Program } from "@/components/programs/types";
import { searchTitle } from "@/server/opportunity-metadata";
import { findProgram, getVisiblePrograms } from "@/server/programs";

// Read per request: the list merges curated publications from the database
// and hides programs whose round has closed.
export const dynamic = "force-dynamic";

/**
 * Read once per request (metadata and page share it). Undefined when the list
 * can't be read; the page then fetches it in the browser as before.
 */
const readPrograms = cache(async (): Promise<Program[] | undefined> => {
  try {
    return await getVisiblePrograms();
  } catch {
    return;
  }
});

export async function generateMetadata(
  props: PageProps<"/programas-e-bolsas/[id]">
): Promise<Metadata> {
  const { id } = await props.params;
  const programs = await readPrograms();
  const program = programs ? findProgram(programs, id) : undefined;
  if (!program) {
    return { title: "Programa · Programas e Bolsas" };
  }
  const url = `${PROGRAMS_PATH}/${program.id}`;
  const name = `${program.nome} · ${program.instituicaoResponsavel}`;
  return {
    alternates: { canonical: url },
    description: program.resumo,
    openGraph: { description: program.resumo, title: name, url },
    title: searchTitle(name),
  };
}

export default async function ProgramDetailPage(
  props: PageProps<"/programas-e-bolsas/[id]">
) {
  const { id } = await props.params;
  const programs = await readPrograms();
  if (programs && !findProgram(programs, id)) {
    notFound();
  }
  return <ProgramDetailLoader id={id} initialPrograms={programs} />;
}
