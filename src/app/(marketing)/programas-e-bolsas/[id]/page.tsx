import type { Metadata } from "next";
import ProgramDetailLoader from "@/components/programs/program-detail-loader";
import {
  getProgramById,
  getPrograms,
  PROGRAMS_PATH,
} from "@/components/programs/program-model";

export const generateStaticParams = () =>
  getPrograms().map((program) => ({ id: program.id }));

export async function generateMetadata(
  props: PageProps<"/programas-e-bolsas/[id]">
): Promise<Metadata> {
  const { id } = await props.params;
  const program = getProgramById(id);
  if (!program) {
    return { title: "Programa · Programas e Bolsas" };
  }
  const url = `${PROGRAMS_PATH}/${id}`;
  const title = `${program.nome} · ${program.instituicaoResponsavel}`;
  return {
    alternates: { canonical: url },
    description: program.resumo,
    openGraph: { description: program.resumo, title, url },
    title,
  };
}

export default async function ProgramDetailPage(
  props: PageProps<"/programas-e-bolsas/[id]">
) {
  const { id } = await props.params;
  return <ProgramDetailLoader id={id} />;
}
