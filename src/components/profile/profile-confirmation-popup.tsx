"use client";

import ConfirmationModal from "@/components/ui/confirmation-modal";

interface ProfileConfirmationPopupProps {
  name: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

const ProfileConfirmationPopup = ({
  name,
  onConfirm,
  onCancel,
}: ProfileConfirmationPopupProps) => {
  if (!name) {
    return null;
  }

  return (
    <ConfirmationModal
      accentColor="amber"
      isOpen
      message={`Tem certeza que deseja remover ${name} da sua lista?`}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};

export default ProfileConfirmationPopup;
