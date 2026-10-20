import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { CATALOG_PATHS, type FeaturedOpportunity } from "./home-data";
import { OpportunityCard } from "./opportunity-card";

const FeaturedOpportunities = ({
  opportunities,
}: {
  opportunities: FeaturedOpportunity[];
}) => (
  <section
    aria-labelledby="selecionadas-titulo"
    className="mx-auto w-full max-w-[84rem] px-5 pt-10 pb-16 sm:px-8 lg:pt-11"
  >
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2
          className="text-balance font-bold text-[1.75rem] text-white leading-tight tracking-[-0.01em] sm:text-[2rem]"
          id="selecionadas-titulo"
        >
          Oportunidades selecionadas
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] text-mist leading-relaxed">
          Quatro escolhas com inscrições abertas, selecionadas pelo apoio
          financeiro, pela relevância acadêmica e pelo acesso de estudantes
          brasileiros.
        </p>
      </div>
      <div className="flex shrink-0 gap-5 text-[14px]">
        <Link
          className="inline-flex items-center gap-1.5 font-medium text-signal transition-colors hover:text-signal-strong"
          href={CATALOG_PATHS.international}
        >
          Internacionais
          <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
        </Link>
        <Link
          className="inline-flex items-center gap-1.5 font-medium text-signal transition-colors hover:text-signal-strong"
          href={CATALOG_PATHS.national}
        >
          Nacionais
          <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </div>

    {opportunities.length > 0 ? (
      <ul className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {opportunities.map((opportunity) => (
          <li className="flex min-w-0" key={opportunity.id}>
            <OpportunityCard opportunity={opportunity} />
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-7 rounded-xl border border-navy-700 bg-navy-900/70 px-5 py-6 text-[15px] text-mist">
        Os prazos da seleção verificada se encerraram. Enquanto a próxima
        seleção é conferida, explore os catálogos internacional e nacional.
      </p>
    )}
  </section>
);

export default FeaturedOpportunities;
