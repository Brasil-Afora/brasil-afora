"use client";

import { useQuery } from "@tanstack/react-query";
import type { FavoriteOpportunity } from "@/components/profile/types";
import { opportunityQueryKeys } from "@/hooks/queries/opportunity-query-keys";
import {
  getInternationalFavorites,
  getNationalFavorites,
} from "@/lib/opportunities-api";
import { opportunityPath } from "@/lib/opportunity-path";

const dedupeFavoriteOpportunities = (
  items: FavoriteOpportunity[]
): FavoriteOpportunity[] => {
  const itemsById = new Map<string, FavoriteOpportunity>();

  for (const item of items) {
    const current = itemsById.get(item.id);

    if (!current || current.categoria === "internacional") {
      itemsById.set(item.id, item);
    }
  }

  return [...itemsById.values()];
};

export const useProfileFavorites = () => {
  return useQuery({
    queryKey: opportunityQueryKeys.profileFavorites(),
    queryFn: async () => {
      const [international, national] = await Promise.all([
        getInternationalFavorites(),
        getNationalFavorites(),
      ]);

      const internationalFavorites: FavoriteOpportunity[] = international.map(
        (opportunity) => ({
          id: opportunity.id,
          nome: opportunity.nome,
          imagem: opportunity.imagem,
          pais: opportunity.pais,
          prazoInscricao: opportunity.prazoInscricao,
          categoria: "internacional" as const,
          detalhePath: opportunityPath(
            "international",
            opportunity.id,
            opportunity.nome
          ),
        })
      );

      const nationalFavorites: FavoriteOpportunity[] = national.map(
        (opportunity) => ({
          id: opportunity.id,
          nome: opportunity.nome,
          imagem: opportunity.imagem,
          pais: opportunity.pais,
          prazoInscricao: opportunity.prazoInscricao,
          categoria: "nacional" as const,
          detalhePath: opportunityPath(
            "national",
            opportunity.id,
            opportunity.nome
          ),
        })
      );

      return dedupeFavoriteOpportunities([
        ...internationalFavorites,
        ...nationalFavorites,
      ]);
    },
  });
};
