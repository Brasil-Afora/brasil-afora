import {
  CalendarDaysIcon,
  ExternalLinkIcon,
  GraduationCapIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Image from "next/image";
import showcaseOpportunities from "@/data/showcase-opportunities.json";

interface ShowcaseOpportunity {
  country: string;
  deadlineLabel: string;
  description: string;
  educationLevel: string;
  image: string;
  name: string;
  officialLink: string;
  scholarshipCoverage: string;
  scholarshipType: string;
  type: string;
}

const opportunities = showcaseOpportunities as ShowcaseOpportunity[];

export const INTERNATIONAL_SHOWCASE_COUNT = opportunities.length;

const scholarshipLabel = (type: string): string => {
  if (type.toLowerCase() === "completa") {
    return "Bolsa integral";
  }
  return "Auxílio financeiro";
};

const InternacionalShowcase = () => {
  return (
    <section aria-labelledby="showcase-heading" className="mb-10">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 font-semibold text-blue-300 text-xs uppercase tracking-wide">
            <ShieldCheckIcon className="h-3.5 w-3.5" />
            Verificadas em 1 set. 2026
          </div>
          <h2 className="font-bold text-2xl text-white" id="showcase-heading">
            Oportunidades em destaque
          </h2>
          <p className="mt-1 max-w-2xl text-slate-400 text-sm">
            Uma seleção curta de programas com informações conferidas nas
            páginas oficiais das instituições.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {opportunities.map((opportunity) => (
          <article
            className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-blue-950/40"
            key={opportunity.officialLink}
          >
            <div className="relative h-48 overflow-hidden">
              <Image
                alt={`Campus relacionado a ${opportunity.name}`}
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                src={opportunity.image}
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900 to-transparent" />
              <span className="absolute top-4 left-4 rounded-full bg-slate-950/90 px-3 py-1 font-semibold text-blue-300 text-xs backdrop-blur">
                {scholarshipLabel(opportunity.scholarshipType)}
              </span>
            </div>

            <div className="flex min-h-[330px] flex-col p-5">
              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-200">
                  {opportunity.type}
                </span>
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-200">
                  {opportunity.educationLevel}
                </span>
              </div>

              <h3 className="line-clamp-2 min-h-14 font-bold text-white text-xl">
                {opportunity.name}
              </h3>

              <div className="mt-3 space-y-2 text-slate-300 text-sm">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4 shrink-0 text-blue-400" />
                  <span>{opportunity.country}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="h-4 w-4 shrink-0 text-blue-400" />
                  <span>{opportunity.deadlineLabel}</span>
                </div>
                <div className="flex items-start gap-2">
                  <GraduationCapIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                  <span className="line-clamp-2">
                    {opportunity.scholarshipCoverage}
                  </span>
                </div>
              </div>

              <p className="mt-4 line-clamp-3 text-slate-400 text-sm leading-relaxed">
                {opportunity.description}
              </p>

              <a
                className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 font-semibold text-white transition hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                href={opportunity.officialLink}
                rel="noopener noreferrer"
                target="_blank"
              >
                Ver página oficial
                <ExternalLinkIcon className="h-4 w-4" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default InternacionalShowcase;
