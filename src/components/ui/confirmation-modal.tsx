import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmationModalProps {
  accentColor?: "amber" | "blue";
  cancelText?: string;
  confirmText?: string;
  isOpen: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmationModal = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  accentColor = "amber",
}: ConfirmationModalProps) => {
  if (!isOpen) {
    return null;
  }

  const accentClasses =
    accentColor === "blue"
      ? "bg-blue-500 hover:bg-blue-600"
      : "bg-amber-500 hover:bg-amber-600";

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="w-full max-w-md border border-slate-950 bg-slate-900 p-8 text-center shadow-xl">
        <AlertDialogHeader className="place-items-center text-center">
          <AlertDialogTitle className="sr-only">Confirmação</AlertDialogTitle>
          <AlertDialogDescription className="mb-6 text-lg text-white">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="-mb-0 -ml-0 flex justify-center gap-4 border-0 bg-transparent p-0 sm:flex-row sm:justify-center">
          <AlertDialogAction
            className={`rounded-full ${accentClasses} px-6 py-2 font-semibold text-black transition-colors`}
            onClick={onConfirm}
          >
            {confirmText}
          </AlertDialogAction>
          <AlertDialogCancel
            className="rounded-full bg-slate-950 px-6 py-2 font-semibold text-white transition-colors hover:bg-slate-800"
            onClick={onCancel}
          >
            {cancelText}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationModal;
