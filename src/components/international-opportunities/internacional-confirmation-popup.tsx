"use client";

import ConfirmationModal from "@/components/ui/confirmation-modal";
import type { Opportunity } from "./types";

interface InternacionalConfirmationPopupProps {
  onCancel: () => void;
  onConfirm: () => void;
  opportunity: Opportunity | null;
}

const InternacionalConfirmationPopup = ({
  opportunity,
  onConfirm,
  onCancel,
}: InternacionalConfirmationPopupProps) => {
  if (!opportunity) {
    return null;
  }

  return (
    <ConfirmationModal
      accentColor="blue"
      isOpen
      message={`Tem certeza que deseja remover ${opportunity.nome} dos seus Favoritos?`}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};

export default InternacionalConfirmationPopup;
