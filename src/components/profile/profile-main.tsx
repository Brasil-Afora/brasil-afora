"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { opportunityQueryKeys } from "@/hooks/queries/opportunity-query-keys";
import {
  useRemoveInternationalFavoriteMutation,
  useRemoveNationalFavoriteMutation,
} from "@/hooks/queries/use-opportunity-queries";
import { useProfileFavorites } from "@/hooks/use-profile-favorites";
import ProfileConfirmationPopup from "./profile-confirmation-popup";
import ProfileOpportunities from "./profile-opportunities";
import type { FavoriteOpportunity } from "./types";

interface ConfirmationState {
  categoria: "internacional" | "nacional";
  detalhePath: string;
  id: string;
  name: string;
}

const ProfileMain = () => {
  const queryClient = useQueryClient();
  const removeInternationalFavoriteMutation =
    useRemoveInternationalFavoriteMutation();
  const removeNationalFavoriteMutation = useRemoveNationalFavoriteMutation();

  const favoritesQuery = useProfileFavorites();

  const [favoriteOpportunities, setFavoriteOpportunities] = useState<
    FavoriteOpportunity[]
  >([]);
  const [activeTab, setActiveTab] = useState<"favorites">("favorites");
  const [confirmationPopup, setConfirmationPopup] =
    useState<ConfirmationState | null>(null);

  useEffect(() => {
    if (favoritesQuery.data) {
      setFavoriteOpportunities(favoritesQuery.data);
    }
  }, [favoritesQuery.data]);

  useEffect(() => {
    if (favoritesQuery.error) {
      toast("Erro ao carregar favoritos.");
    }
  }, [favoritesQuery.error]);

  const handleRemoveFromList = (
    detalhePath: string,
    name: string,
    id: string,
    categoria: "internacional" | "nacional"
  ) => {
    setConfirmationPopup({ detalhePath, name, id, categoria });
  };

  const handleConfirmRemove = useCallback(async () => {
    if (!confirmationPopup) {
      return;
    }

    const { id, name, categoria } = confirmationPopup;

    try {
      if (categoria === "internacional") {
        await removeInternationalFavoriteMutation.mutateAsync(id);
      } else {
        await removeNationalFavoriteMutation.mutateAsync(id);
      }

      await queryClient.invalidateQueries({
        queryKey: opportunityQueryKeys.profileFavorites(),
      });

      setFavoriteOpportunities((prev) => {
        return prev.filter((fav) => {
          return !(fav.id === id && fav.categoria === categoria);
        });
      });
      toast(`"${name}" removido(a) com sucesso!`);
    } catch {
      toast("Erro ao remover favorito.");
    }

    setConfirmationPopup(null);
  }, [
    confirmationPopup,
    queryClient,
    removeInternationalFavoriteMutation,
    removeNationalFavoriteMutation,
  ]);

  if (favoritesQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
        <p className="text-white/60 text-xl">Carregando favoritos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black p-8 font-inter text-white">
      <h1 className="mb-8 text-center font-extrabold text-5xl text-amber-500">
        Meu Perfil
      </h1>

      <div className="mx-auto mb-8 flex w-full max-w-sm rounded-full border border-slate-950 bg-slate-900 p-1 shadow-lg">
        <Button
          className={`flex-1 rounded-full px-4 py-2 font-semibold text-sm transition-colors duration-200 ${activeTab === "favorites" ? "bg-amber-500 text-black" : "text-white hover:bg-slate-800"}`}
          onClick={() => setActiveTab("favorites")}
          type="button"
          variant="ghost"
        >
          Oportunidades Salvas
        </Button>
      </div>

      {activeTab === "favorites" && (
        <ProfileOpportunities
          favoriteOpportunities={favoriteOpportunities}
          handleRemoveFromList={handleRemoveFromList}
        />
      )}

      <ProfileConfirmationPopup
        name={confirmationPopup?.name ?? null}
        onCancel={() => setConfirmationPopup(null)}
        onConfirm={handleConfirmRemove}
      />
    </div>
  );
};

export default ProfileMain;
