"use client";

import { useEffect, useState } from "react";
import type { Opportunity } from "../components/national-opportunities/types";
import { getNationalOpportunities } from "../lib/opportunities-api";

interface UseOportunidadesNacionaisResult {
  data: Opportunity[];
  error: string | null;
  loading: boolean;
}

export const useOportunidadesNacionais =
  (): UseOportunidadesNacionaisResult => {
    const [data, setData] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      let cancelled = false;

      const fetchData = async () => {
        try {
          const result = await getNationalOpportunities();
          if (!cancelled) {
            setData(result);
          }
        } catch (err) {
          if (!cancelled) {
            setError(
              err instanceof Error
                ? err.message
                : "Erro ao carregar oportunidades nacionais."
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

      fetchData();

      return () => {
        cancelled = true;
      };
    }, []);

    return { data, loading, error };
  };
