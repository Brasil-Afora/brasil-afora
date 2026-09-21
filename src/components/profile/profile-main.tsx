"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { opportunityQueryKeys } from "@/hooks/queries/opportunity-query-keys";
import {
  useRemoveInternationalFavoriteMutation,
  useRemoveNationalFavoriteMutation,
} from "@/hooks/queries/use-opportunity-queries";
import { useProfileFavorites } from "@/hooks/use-profile-favorites";
import type { LocationsById } from "@/server/geo/opportunity-locations";
import ProfileDashboard from "./profile-dashboard";
import type { ProfileUser } from "./profile-header";
import type { ProfileItem } from "./profile-model";

interface ProfileMainProps {
  user: ProfileUser;
  /** Locations of the verified selection, resolved on the server. */
  verifiedLocations: { international: LocationsById; national: LocationsById };
}

/** The signed-in profile: account favorites plus this browser's tracking. */
const ProfileMain = ({ user, verifiedLocations }: ProfileMainProps) => {
  const queryClient = useQueryClient();
  const favoritesQuery = useProfileFavorites();
  const removeInternational = useRemoveInternationalFavoriteMutation();
  const removeNational = useRemoveNationalFavoriteMutation();
  const [pendingRemoval, setPendingRemoval] = useState<ProfileItem | null>(
    null
  );

  const confirmRemoval = async () => {
    const item = pendingRemoval;
    setPendingRemoval(null);
    if (!item?.favorite) {
      return;
    }
    try {
      if (item.favorite === "internacional") {
        await removeInternational.mutateAsync(item.id);
      } else {
        await removeNational.mutateAsync(item.id);
      }
      await queryClient.invalidateQueries({
        queryKey: opportunityQueryKeys.profileFavorites(),
      });
      toast(`${item.name} saiu das salvas.`);
    } catch {
      toast("Não foi possível remover agora. Tente de novo.");
    }
  };

  return (
    <>
      <ProfileDashboard
        favorites={favoritesQuery.data ?? []}
        favoritesFailed={Boolean(favoritesQuery.error)}
        favoritesLoading={favoritesQuery.isPending}
        onRemoveFavorite={setPendingRemoval}
        onRetryFavorites={() => {
          favoritesQuery.refetch().catch(() => undefined);
        }}
        user={user}
        verifiedLocations={verifiedLocations}
      />
      <ConfirmationModal
        confirmText="Remover"
        isOpen={Boolean(pendingRemoval)}
        message={`Remover "${pendingRemoval?.name ?? ""}" das suas salvas?`}
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => {
          confirmRemoval().catch(() => undefined);
        }}
      />
    </>
  );
};

export default ProfileMain;
