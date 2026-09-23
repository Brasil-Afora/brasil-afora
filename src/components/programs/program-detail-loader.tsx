"use client";
import Link from "next/link";
import { useProgramsQuery } from "@/hooks/queries/use-program-queries";
import ProgramDetail from "./program-detail";

export default function ProgramDetailLoader({ id }: { id: string }) {
  const query = useProgramsQuery();
  if (query.isPending) {
    return (
      <p className="mx-auto max-w-6xl px-6 py-20 text-white" role="status">
        Carregando programa…
      </p>
    );
  }
  if (query.isError) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 text-white" role="alert">
        <p>Não foi possível carregar o programa.</p>
        <button
          onClick={() => {
            query.refetch();
          }}
          type="button"
        >
          Tentar novamente
        </button>
      </div>
    );
  }
  const program = query.data.find(
    (record) => record.id === id || record.aliases?.includes(id)
  );
  if (!program) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 text-white">
        <h1>Programa não encontrado</h1>
        <Link href="/programas-e-bolsas">Ver programas e bolsas</Link>
      </div>
    );
  }
  return <ProgramDetail program={program} />;
}
