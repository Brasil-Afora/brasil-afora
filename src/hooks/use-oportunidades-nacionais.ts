"use client";

import { useMemo } from "react";
import type { Opportunity } from "@/components/national-opportunities/types";
import { useNationalOpportunitiesQuery } from "@/hooks/queries/use-opportunity-queries";

interface UseOportunidadesNacionaisResult {
  data: Opportunity[];
  error: string | null;
  loading: boolean;
}

export const useOportunidadesNacionais =
  (): UseOportunidadesNacionaisResult => {
    const query = useNationalOpportunitiesQuery();

    const data = useMemo<Opportunity[]>(() => {
      return query.data ?? [];
    }, [query.data]);

    return {
      data,
      loading: query.isPending,
      error: query.error instanceof Error ? query.error.message : null,
    };
  };
