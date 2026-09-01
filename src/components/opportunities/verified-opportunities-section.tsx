import { BadgeCheckIcon } from "lucide-react";
import OpportunityList from "./opportunity-list";
import type { Opportunity, OpportunityCardConfig } from "./types";

interface VerifiedOpportunitiesSectionProps {
  config: OpportunityCardConfig;
  data: Opportunity[];
  description: string;
  verifiedLabel: string;
}

const VerifiedOpportunitiesSection = ({
  config,
  data,
  description,
  verifiedLabel,
}: VerifiedOpportunitiesSectionProps) => {
  const accentClasses =
    config.accentColor === "blue"
      ? {
          border: "border-blue-500/20",
          badge: "border-blue-400/25 bg-blue-500/10 text-blue-300",
        }
      : {
          border: "border-amber-500/20",
          badge: "border-amber-400/25 bg-amber-500/10 text-amber-300",
        };

  return (
    <section
      className={`mb-8 overflow-hidden rounded-2xl border ${accentClasses.border} bg-slate-950/40 py-5 shadow-black/10 shadow-xl`}
    >
      <div className="px-4 sm:px-6">
        <div
          className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold text-xs ${accentClasses.badge}`}
        >
          <BadgeCheckIcon className="h-4 w-4" />
          {verifiedLabel}
        </div>
        <h2 className="font-bold text-2xl text-white">Seleção verificada</h2>
        <p className="mt-1 max-w-3xl text-sm text-white/60 leading-relaxed">
          {description}
        </p>
      </div>
      <OpportunityList config={config} data={data} />
    </section>
  );
};

export default VerifiedOpportunitiesSection;
