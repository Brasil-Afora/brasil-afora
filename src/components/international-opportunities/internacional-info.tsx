"use client";

import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { toInternationalDetail } from "@/components/opportunities/detail-model";
import { WORLD_MAP } from "@/components/opportunities/map-windows";
import OpportunityDetailPage from "@/components/opportunities/opportunity-detail";
import { isVerifiedInternationalOpportunityId } from "@/data/verified-opportunities";
import { opportunityQueryKeys } from "@/hooks/queries/opportunity-query-keys";
import { useInternationalOpportunityByIdQuery } from "@/hooks/queries/use-opportunity-queries";
import useOpportunityFavorite from "@/hooks/use-opportunity-favorite";
import type { OpportunityLocation } from "@/lib/geo";
import {
  addInternationalFavorite,
  getInternationalFavorites,
  removeInternationalFavorite,
} from "@/lib/opportunities-api";
import InternacionalConfirmationPopup from "./internacional-confirmation-popup";

const INTERNACIONAL_ROUTE_PREFIX = "/oportunidades/internacionais";

interface InternacionalInfoProps {
  id: string;
  /** Locations of a verified opportunity, resolved on the server. */
  verifiedLocations?: OpportunityLocation[];
}

const InternacionalInfo = ({
  id,
  verifiedLocations,
}: InternacionalInfoProps) => {
  const isVerifiedOpportunity = isVerifiedInternationalOpportunityId(id);
  const opportunityQuery = useInternationalOpportunityByIdQuery(id);
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
    addFavorite: addInternationalFavorite,
    enabled: !isVerifiedOpportunity,
    favoritesQueryKey: opportunityQueryKeys.internationalFavorites(),
    getFavorites: getInternationalFavorites,
    id,
    removeFavorite: removeInternationalFavorite,
    routePath: `${INTERNACIONAL_ROUTE_PREFIX}/${id}`,
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
    return toInternationalDetail(
      withLocations,
      isVerifiedOpportunity,
      new Date()
    );
  }, [isVerifiedOpportunity, opportunity, verifiedLocations]);

  return (
    <>
      <OpportunityDetailPage
        backHref={INTERNACIONAL_ROUTE_PREFIX}
        backLabel="Internacional"
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
        map={WORLD_MAP}
      />
      <InternacionalConfirmationPopup
        onCancel={() => setConfirmationOpen(false)}
        onConfirm={() => {
          handleConfirmRemove().catch(() => undefined);
        }}
        opportunity={showConfirmation ? opportunity : null}
      />
    </>
  );
};

export default InternacionalInfo;
