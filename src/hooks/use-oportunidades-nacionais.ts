"use client";

import { useMemo } from "react";
import type { Opportunity } from "@/components/national-opportunities/types";
import { useNationalOpportunitiesQuery } from "@/hooks/queries/use-opportunity-queries";
import { useCatalogClock } from "@/hooks/use-catalog-clock";
import { isCatalogOpportunityVisible } from "@/lib/catalog-visibility";

interface UseOportunidadesNacionaisResult {
  data: Opportunity[];
  error: string | null;
  loading: boolean;
  retry: () => void;
}

export const useOportunidadesNacionais =
  (): UseOportunidadesNacionaisResult => {
    const query = useNationalOpportunitiesQuery();

    const now = useCatalogClock();
    const data = useMemo<Opportunity[]>(() => {
      return (query.data ?? []).filter((opportunity) =>
        isCatalogOpportunityVisible(opportunity, now)
      );
    }, [query.data, now]);

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
