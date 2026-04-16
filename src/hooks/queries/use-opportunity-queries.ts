"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addInternationalFavorite,
  addNationalFavorite,
  createInternationalOpportunity,
  createNationalOpportunity,
  deleteInternationalOpportunity,
  deleteNationalOpportunity,
  getInternationalFavorites,
  getInternationalOpportunities,
  getInternationalOpportunityById,
  getNationalFavorites,
  getNationalOpportunities,
  getNationalOpportunityById,
  type InternationalOpportunityInput,
  type NationalOpportunityInput,
  removeInternationalFavorite,
  removeNationalFavorite,
  updateInternationalOpportunity,
  updateNationalOpportunity,
} from "@/lib/opportunities-api";
import { opportunityQueryKeys } from "./opportunity-query-keys";

export const useInternationalOpportunitiesQuery = () => {
  return useQuery({
    queryKey: opportunityQueryKeys.internationalList(),
    queryFn: getInternationalOpportunities,
  });
};

export const useNationalOpportunitiesQuery = () => {
  return useQuery({
    queryKey: opportunityQueryKeys.nationalList(),
    queryFn: getNationalOpportunities,
  });
};

export const useInternationalOpportunityByIdQuery = (id: string) => {
  return useQuery({
    queryKey: opportunityQueryKeys.internationalById(id),
    queryFn: () => getInternationalOpportunityById(id),
    enabled: id.length > 0,
  });
};

export const useNationalOpportunityByIdQuery = (id: string) => {
  return useQuery({
    queryKey: opportunityQueryKeys.nationalById(id),
    queryFn: () => getNationalOpportunityById(id),
    enabled: id.length > 0,
  });
};

export const useInternationalFavoritesQuery = () => {
  return useQuery({
    queryKey: opportunityQueryKeys.internationalFavorites(),
    queryFn: getInternationalFavorites,
  });
};

export const useNationalFavoritesQuery = () => {
  return useQuery({
    queryKey: opportunityQueryKeys.nationalFavorites(),
    queryFn: getNationalFavorites,
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

export const useCreateInternationalOpportunityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InternationalOpportunityInput) =>
      createInternationalOpportunity(payload),
    onSuccess: () => invalidateOpportunityCaches(queryClient),
  });
};

export const useUpdateInternationalOpportunityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: InternationalOpportunityInput;
    }) => updateInternationalOpportunity(id, payload),
    onSuccess: () => invalidateOpportunityCaches(queryClient),
  });
};

export const useDeleteInternationalOpportunityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteInternationalOpportunity(id),
    onSuccess: () => invalidateOpportunityCaches(queryClient),
  });
};

export const useCreateNationalOpportunityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: NationalOpportunityInput) =>
      createNationalOpportunity(payload),
    onSuccess: () => invalidateOpportunityCaches(queryClient),
  });
};

export const useUpdateNationalOpportunityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: NationalOpportunityInput;
    }) => updateNationalOpportunity(id, payload),
    onSuccess: () => invalidateOpportunityCaches(queryClient),
  });
};

export const useDeleteNationalOpportunityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteNationalOpportunity(id),
    onSuccess: () => invalidateOpportunityCaches(queryClient),
  });
};

export const useAddInternationalFavoriteMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => addInternationalFavorite(id),
    onSuccess: () => invalidateOpportunityCaches(queryClient),
  });
};

export const useRemoveInternationalFavoriteMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => removeInternationalFavorite(id),
    onSuccess: () => invalidateOpportunityCaches(queryClient),
  });
};

export const useAddNationalFavoriteMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => addNationalFavorite(id),
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
