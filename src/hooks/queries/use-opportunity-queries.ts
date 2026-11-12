"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getInternationalOpportunities,
  getInternationalOpportunityById,
  getNationalOpportunities,
  getNationalOpportunityById,
  type InternationalOpportunity,
  type NationalOpportunity,
  removeInternationalFavorite,
  removeNationalFavorite,
} from "@/lib/opportunities-api";
import { opportunityQueryKeys } from "./opportunity-query-keys";

interface ListQueryOptions {
  enabled?: boolean;
}

export const useInternationalOpportunitiesQuery = ({
  enabled = true,
}: ListQueryOptions = {}) => {
  return useQuery({
    queryKey: opportunityQueryKeys.internationalList(),
    queryFn: getInternationalOpportunities,
    enabled,
  });
};

export const useNationalOpportunitiesQuery = ({
  enabled = true,
}: ListQueryOptions = {}) => {
  return useQuery({
    queryKey: opportunityQueryKeys.nationalList(),
    queryFn: getNationalOpportunities,
    enabled,
  });
};

/** `initialData` is the record the server already read for the page. */
export const useInternationalOpportunityByIdQuery = (
  id: string,
  initialData?: InternationalOpportunity
) => {
  return useQuery({
    queryKey: opportunityQueryKeys.internationalById(id),
    queryFn: () => getInternationalOpportunityById(id),
    enabled: id.length > 0,
    initialData,
  });
};

export const useNationalOpportunityByIdQuery = (
  id: string,
  initialData?: NationalOpportunity
) => {
  return useQuery({
    queryKey: opportunityQueryKeys.nationalById(id),
    queryFn: () => getNationalOpportunityById(id),
    enabled: id.length > 0,
    initialData,
  });
};

const invalidateOpportunityCaches = async (
  queryClient: ReturnType<typeof useQueryClient>
) => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: opportunityQueryKeys.internationalList(),
    }),
    queryClient.invalidateQueries({
      queryKey: opportunityQueryKeys.nationalList(),
    }),
    queryClient.invalidateQueries({
      queryKey: opportunityQueryKeys.internationalFavorites(),
    }),
    queryClient.invalidateQueries({
      queryKey: opportunityQueryKeys.nationalFavorites(),
    }),
    queryClient.invalidateQueries({
      queryKey: opportunityQueryKeys.profileFavorites(),
    }),
  ]);
};

export const useRemoveInternationalFavoriteMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => removeInternationalFavorite(id),
    onSuccess: () => invalidateOpportunityCaches(queryClient),
  });
};

export const useRemoveNationalFavoriteMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => removeNationalFavorite(id),
    onSuccess: () => invalidateOpportunityCaches(queryClient),
  });
};
