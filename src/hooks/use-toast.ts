"use client";

import { useCallback } from "react";
import { toast } from "sonner";

interface ToastState {
  message: string;
  visible: boolean;
}

interface UseToastResult {
  hide: () => void;
  show: (message: string) => void;
  toast: ToastState;
}

function useToast(autoHideMs = 3000): UseToastResult {
  const currentToast: ToastState = {
    visible: false,
    message: "",
  };

  const show = useCallback(
    (message: string) => {
      toast(message, { duration: autoHideMs });
    },
    [autoHideMs]
  );

  const hide = useCallback(() => {
    toast.dismiss();
  }, []);

  return { toast: currentToast, show, hide };
}

export default useToast;
