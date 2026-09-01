"use client";

import { useMemo } from "react";
import type { Opportunity } from "@/components/international-opportunities/types";
import { useInternationalOpportunitiesQuery } from "@/hooks/queries/use-opportunity-queries";
import { isOpportunityDeadlineOpen } from "@/lib/date-utils";

interface UseOportunidadesInternacionaisResult {
  data: Opportunity[];
  error: string | null;
  loading: boolean;
}

export const useOportunidadesInternacionais =
  (): UseOportunidadesInternacionaisResult => {
    const query = useInternationalOpportunitiesQuery();

    const data = useMemo<Opportunity[]>(() => {
      return (query.data ?? []).filter((opportunity) =>
        isOpportunityDeadlineOpen(opportunity.prazoInscricao)
      );
    }, [query.data]);

    return {
      data,
      loading: query.isPending,
      error: query.error instanceof Error ? query.error.message : null,
    };
  };
