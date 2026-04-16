"use client";

import { type QueryKey, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { opportunityQueryKeys } from "@/hooks/queries/opportunity-query-keys";
import { useSession } from "@/lib/auth-client";

interface FavoriteItem {
  id: string;
}

interface UseOpportunityFavoriteParams {
  addFavorite: (id: string) => Promise<void>;
  favoritesQueryKey: QueryKey;
  getFavorites: () => Promise<FavoriteItem[]>;
  id: string;
  removeFavorite: (id: string) => Promise<void>;
  routePath: string;
}

interface UseOpportunityFavoriteResult {
  clearPopup: () => void;
  handleConfirmRemove: () => Promise<void>;
  handleFavoriteToggle: () => Promise<void>;
  isFavorited: boolean;
  popup: { message: string; visible: boolean };
  setConfirmationOpen: (value: boolean) => void;
  showConfirmation: boolean;
}

const LOGIN_ROUTE = "/login";
const POPUP_DURATION_MS = 3000;

const isUnauthorizedError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const normalizedMessage = error.message.toLowerCase();
  return (
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("401")
  );
};

const useOpportunityFavorite = ({
  addFavorite,
  favoritesQueryKey,
  getFavorites,
  id,
  removeFavorite,
  routePath,
}: UseOpportunityFavoriteParams): UseOpportunityFavoriteResult => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } = useSession();
  const favoritesQuery = useQuery({
    queryKey: favoritesQueryKey,
    queryFn: getFavorites,
  });

  const [isFavorited, setIsFavorited] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [popup, setPopup] = useState({ visible: false, message: "" });

  useEffect(() => {
    if (!favoritesQuery.data) {
      return;
    }

    setIsFavorited(favoritesQuery.data.some((favorite) => favorite.id === id));
  }, [favoritesQuery.data, id]);

  useEffect(() => {
    if (!popup.visible) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPopup((prev) => ({ ...prev, visible: false }));
    }, POPUP_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [popup.visible]);

  const redirectToLogin = useCallback(() => {
    router.push(`${LOGIN_ROUTE}?redirectTo=${encodeURIComponent(routePath)}`);
  }, [routePath, router]);

  const handleFavoriteToggle = useCallback(async () => {
    if (!(session || isSessionPending)) {
      redirectToLogin();
      return;
    }

    if (isFavorited) {
      setShowConfirmation(true);
      return;
    }

    try {
      await addFavorite(id);
      await Promise.all([
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
      setIsFavorited(true);
      setPopup({
        visible: true,
        message: "Oportunidade adicionada aos seus Favoritos!",
      });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        redirectToLogin();
        return;
      }

      setPopup({
        visible: true,
        message: "Erro ao adicionar aos favoritos.",
      });
    }
  }, [
    addFavorite,
    id,
    isFavorited,
    isSessionPending,
    queryClient,
    redirectToLogin,
    session,
  ]);

  const handleConfirmRemove = useCallback(async () => {
    try {
      await removeFavorite(id);
      await Promise.all([
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
      setIsFavorited(false);
      setPopup({
        visible: true,
        message: "Oportunidade removida dos seus Favoritos.",
      });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        redirectToLogin();
        return;
      }

      setPopup({
        visible: true,
        message: "Erro ao remover dos favoritos.",
      });
    } finally {
      setShowConfirmation(false);
    }
  }, [id, queryClient, redirectToLogin, removeFavorite]);

  const clearPopup = useCallback(() => {
    setPopup((prev) => ({ ...prev, visible: false }));
  }, []);

  return {
    clearPopup,
    handleConfirmRemove,
    handleFavoriteToggle,
    isFavorited,
    popup,
    setConfirmationOpen: setShowConfirmation,
    showConfirmation,
  };
};

export default useOpportunityFavorite;
