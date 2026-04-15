"use client";

import useStaggeredAnimation from "../../hooks/use-staggered-animation";
import OpportunityCard from "./opportunity-card";
import type { Opportunity, OpportunityCardConfig } from "./types";

interface OpportunityListProps {
  config: OpportunityCardConfig;
  data: Opportunity[];
}

const OpportunityList = ({ data, config }: OpportunityListProps) => {
  const visibleItems = useStaggeredAnimation(data.length, 30, true);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="p-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 gap-8 font-inter sm:grid-cols-2 lg:grid-cols-3">
          {data.map((opportunity, index) => (
            <OpportunityCard
              config={config}
              isVisible={visibleItems.includes(index)}
              key={opportunity.id}
              opportunity={opportunity}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OpportunityList;
