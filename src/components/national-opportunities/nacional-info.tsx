"use client";

import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { toNationalDetail } from "@/components/opportunities/detail-model";
import { BRAZIL_MAP } from "@/components/opportunities/map-windows";
import OpportunityDetailPage from "@/components/opportunities/opportunity-detail";
import { isVerifiedNationalOpportunityId } from "@/data/verified-opportunities";
import { opportunityQueryKeys } from "@/hooks/queries/opportunity-query-keys";
import { useNationalOpportunityByIdQuery } from "@/hooks/queries/use-opportunity-queries";
import useOpportunityFavorite from "@/hooks/use-opportunity-favorite";
import type { OpportunityLocation } from "@/lib/geo";
import {
  addNationalFavorite,
  getNationalFavorites,
  removeNationalFavorite,
} from "@/lib/opportunities-api";
import NacionalConfirmationPopup from "./nacional-confirmation-popup";

const NACIONAL_ROUTE_PREFIX = "/oportunidades/nacionais";

interface NacionalInfoProps {
  id: string;
  /** Locations of a verified opportunity, resolved on the server. */
  verifiedLocations?: OpportunityLocation[];
}

const NacionalInfo = ({ id, verifiedLocations }: NacionalInfoProps) => {
  const isVerifiedOpportunity = isVerifiedNationalOpportunityId(id);
  const opportunityQuery = useNationalOpportunityByIdQuery(id);
  const opportunity = opportunityQuery.data ?? null;

  // Verified records are saved in the site's own data, not in the catalog
  // database, so they can't be favorited yet.
  const {
    clearPopup,
    handleConfirmRemove,
    handleFavoriteToggle,
    isFavorited,
    popup,
    setConfirmationOpen,
    showConfirmation,
  } = useOpportunityFavorite({
    addFavorite: addNationalFavorite,
    enabled: !isVerifiedOpportunity,
    favoritesQueryKey: opportunityQueryKeys.nationalFavorites(),
    getFavorites: getNationalFavorites,
    id,
    removeFavorite: removeNationalFavorite,
    routePath: `${NACIONAL_ROUTE_PREFIX}/${id}`,
  });

  useEffect(() => {
    if (popup.visible) {
      toast(popup.message);
      clearPopup();
    }
  }, [clearPopup, popup.message, popup.visible]);

  const detail = useMemo(() => {
    if (!opportunity) {
      return null;
    }
    const withLocations = isVerifiedOpportunity
      ? { ...opportunity, localizacoes: verifiedLocations ?? [] }
      : opportunity;
    return toNationalDetail(withLocations, isVerifiedOpportunity, new Date());
  }, [isVerifiedOpportunity, opportunity, verifiedLocations]);

  return (
    <>
      <OpportunityDetailPage
        backHref={NACIONAL_ROUTE_PREFIX}
        backLabel="Nacional"
        detail={detail}
        error={
          opportunityQuery.error instanceof Error
            ? opportunityQuery.error.message
            : null
        }
        favorite={{
          enabled: !isVerifiedOpportunity,
          isSaved: isFavorited,
          onToggle: () => {
            handleFavoriteToggle().catch(() => undefined);
          },
        }}
        loading={opportunityQuery.isPending}
        map={BRAZIL_MAP}
      />
      <NacionalConfirmationPopup
        onCancel={() => setConfirmationOpen(false)}
        onConfirm={() => {
          handleConfirmRemove().catch(() => undefined);
        }}
        opportunity={showConfirmation ? opportunity : null}
      />
    </>
  );
};

export default NacionalInfo;
