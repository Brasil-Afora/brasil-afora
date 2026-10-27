import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import ProgramDetailLoader from "@/components/programs/program-detail-loader";
import { PROGRAMS_PATH } from "@/components/programs/program-model";
import type { Program } from "@/components/programs/types";
import { searchTitle } from "@/server/opportunity-metadata";
import { findProgram, getVisiblePrograms } from "@/server/programs";

// Refresh public content without rendering the same page on every visit.
export const revalidate = 900;

export function generateStaticParams() {
  return [];
}

/**
 * Metadata and page share one read. Infrastructure failures propagate so ISR
 * retains the last successful page instead of caching a loading skeleton.
 */
const readPrograms = cache(async (): Promise<Program[]> => {
  return await getVisiblePrograms();
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
  // A program leaves the list when its round closes, but search engines and
  // shared links still point at it: send them to the catalog instead of a
  // dead end. Temporary, because the next round brings the page back.
  if (programs && !findProgram(programs, id)) {
    redirect(PROGRAMS_PATH);
  }
  return <ProgramDetailLoader id={id} initialPrograms={programs} />;
}
