"use client";

import ConfirmationModal from "@/components/ui/confirmation-modal";
import type { Opportunity } from "./types";

interface NacionalConfirmationPopupProps {
  onCancel: () => void;
  onConfirm: () => void;
  opportunity: Opportunity | null;
}

const NacionalConfirmationPopup = ({
  opportunity,
  onConfirm,
  onCancel,
}: NacionalConfirmationPopupProps) => {
  if (!opportunity) {
    return null;
  }

  return (
    <ConfirmationModal
      accentColor="amber"
      isOpen
      message={`Tem certeza que deseja remover ${opportunity.nome} dos seus Favoritos?`}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};

export default NacionalConfirmationPopup;
