import { ChevronRightIcon, MapIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import MapExplorer from "@/components/world-map/map-explorer";
import { getVerifiedLocations } from "@/server/geo/opportunity-locations";

export const metadata: Metadata = {
  title: "Mapa de oportunidades",
  description:
    "Veja no mapa onde há bolsas, intercâmbios, olimpíadas e programas com inscrições abertas para estudantes brasileiros.",
  alternates: { canonical: "/mapa" },
};

export default function MapPage() {
  return (
    <div className="min-h-screen bg-navy-950 font-reading text-slate-100">
      <div className="mx-auto w-full max-w-[84rem] px-5 pt-5 pb-16 sm:px-8 lg:pt-8">
        <nav aria-label="Trilha de navegação">
          <ol className="flex items-center gap-2 text-[13px] text-mist">
            <li>
              <Link
                className="underline-offset-4 transition-colors hover:text-white hover:underline"
                href="/"
              >
                Início
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </li>
            <li aria-current="page" className="text-slate-200">
              Mapa
            </li>
          </ol>
        </nav>

        <div className="mt-5 flex items-start gap-5">
          <span
            aria-hidden="true"
            className="mt-1 hidden h-16 w-16 shrink-0 items-center justify-center rounded-full border border-navy-600 bg-navy-900/60 text-signal sm:flex"
          >
            <MapIcon className="h-8 w-8" strokeWidth={1.6} />
          </span>
          <div>
            <h1 className="text-balance font-bold text-[clamp(2.1rem,1.3rem+2.3vw,3.2rem)] text-white leading-[1.05] tracking-[-0.02em]">
              Oportunidades no <span className="text-signal">mapa</span>
            </h1>
            <p className="mt-3 max-w-[40rem] text-[16px] text-mist leading-relaxed">
              Escolha um país destacado para ver o que está com inscrições
              abertas lá: bolsas, intercâmbios, olimpíadas e programas para
              estudantes brasileiros.
            </p>
          </div>
        </div>

        <MapExplorer verifiedLocations={getVerifiedLocations()} />
      </div>
    </div>
  );
}
