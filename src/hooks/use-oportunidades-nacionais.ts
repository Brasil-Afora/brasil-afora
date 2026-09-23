"use client";

import { useMemo } from "react";
import type { Opportunity } from "@/components/national-opportunities/types";
import { useNationalOpportunitiesQuery } from "@/hooks/queries/use-opportunity-queries";
import { isOpportunityDeadlineOpen } from "@/lib/date-utils";

interface UseOportunidadesNacionaisResult {
  data: Opportunity[];
  error: string | null;
  loading: boolean;
  retry: () => void;
}

export const useOportunidadesNacionais =
  (): UseOportunidadesNacionaisResult => {
    const query = useNationalOpportunitiesQuery();

    const data = useMemo<Opportunity[]>(() => {
      return (query.data ?? []).filter((opportunity) =>
        isOpportunityDeadlineOpen(opportunity.prazoInscricao)
      );
    }, [query.data]);

    return {
      data,
      loading: query.isPending,
      error: query.error
        ? "Não foi possível carregar as oportunidades agora. Tente novamente em alguns instantes."
        : null,
      retry: () => {
        query.refetch().catch(() => undefined);
      },
    };
  };
