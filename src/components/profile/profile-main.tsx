"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getInternationalFavorites,
  getNationalFavorites,
  removeInternationalFavorite,
  removeNationalFavorite,
} from "../../lib/opportunities-api";
import ProfileConfirmationPopup from "./profile-confirmation-popup";
import ProfileOpportunities from "./profile-opportunities";
import type { FavoriteOpportunity } from "./types";

interface ConfirmationState {
  categoria: "internacional" | "nacional";
  detalhePath: string;
  id: string;
  name: string;
}

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

const ProfileMain = () => {
  const [favoriteOpportunities, setFavoriteOpportunities] = useState<
    FavoriteOpportunity[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"favorites">("favorites");
  const [confirmationPopup, setConfirmationPopup] =
    useState<ConfirmationState | null>(null);

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const [international, national] = await Promise.all([
        getInternationalFavorites(),
        getNationalFavorites(),
      ]);

      const internationalFavorites: FavoriteOpportunity[] = international.map(
        (op) => ({
          id: op.id,
          nome: op.nome,
          imagem: op.imagem,
          pais: op.pais,
          prazoInscricao: op.prazoInscricao,
          categoria: "internacional" as const,
          detalhePath: `/oportunidades/internacionais/${op.id}`,
        })
      );

      const nationalFavorites: FavoriteOpportunity[] = national.map((op) => ({
        id: op.id,
        nome: op.nome,
        imagem: op.imagem,
        pais: op.pais,
        prazoInscricao: op.prazoInscricao,
        categoria: "nacional" as const,
        detalhePath: `/oportunidades/nacionais/${op.id}`,
      }));

      setFavoriteOpportunities(
        dedupeFavoriteOpportunities([
          ...internationalFavorites,
          ...nationalFavorites,
        ])
      );
    } catch {
      toast("Erro ao carregar favoritos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleRemoveFromList = (
    detalhePath: string,
    name: string,
    id: string,
    categoria: "internacional" | "nacional"
  ) => {
    setConfirmationPopup({ detalhePath, name, id, categoria });
  };

  const handleConfirmRemove = async () => {
    if (!confirmationPopup) {
      return;
    }
    const { id, name, categoria } = confirmationPopup;

    try {
      if (categoria === "internacional") {
        await removeInternationalFavorite(id);
      } else {
        await removeNationalFavorite(id);
      }
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
  };

  if (loading) {
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
