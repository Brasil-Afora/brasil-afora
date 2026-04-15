import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface ToastProps {
  message: string;
  onClose: () => void;
  visible: boolean;
}

const Toast = ({ visible, message, onClose }: ToastProps) => {
  const onCloseRef = useRef(onClose);
  const lastKeyRef = useRef("");

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!(visible && message)) {
      return;
    }

    const toastKey = `${message}-${visible}`;
    if (lastKeyRef.current === toastKey) {
      return;
    }

    lastKeyRef.current = toastKey;

    toast(message, {
      action: {
        label: "Fechar",
        onClick: () => onCloseRef.current(),
      },
      onDismiss: () => onCloseRef.current(),
    });
  }, [visible, message]);

  return null;
};

export default Toast;
