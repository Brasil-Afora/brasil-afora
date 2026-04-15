"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type VerifyEmailStatus = "verifying" | "success" | "error" | "pending";

interface UseVerifyEmailResult {
  emailForResend: string;
  handleResend: () => Promise<void>;
  isResending: boolean;
  resendError: string | null;
  resendSuccess: string | null;
  setEmailForResend: (value: string) => void;
  status: VerifyEmailStatus;
}

const getInitialStatus = (token: string | null): VerifyEmailStatus => {
  return token ? "verifying" : "pending";
};

const useVerifyEmail = (): UseVerifyEmailResult => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailFromQuery = searchParams.get("email") ?? "";

  const [status, setStatus] = useState<VerifyEmailStatus>(
    getInitialStatus(token)
  );
  const [emailForResend, setEmailForResend] = useState(emailFromQuery);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    setEmailForResend(emailFromQuery);
  }, [emailFromQuery]);

  useEffect(() => {
    setStatus(getInitialStatus(token));

    if (!token) {
      return;
    }

    let isMounted = true;

    const verifyToken = async () => {
      try {
        const { error } = await authClient.verifyEmail({ query: { token } });

        if (!isMounted) {
          return;
        }

        setStatus(error ? "error" : "success");
      } catch {
        if (isMounted) {
          setStatus("error");
        }
      }
    };

    verifyToken().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (status !== "success" || !token) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.replace("/perfil");
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [router, status, token]);

  const handleResend = useCallback(async () => {
    setIsResending(true);
    setResendError(null);
    setResendSuccess(null);

    try {
      let userEmail = emailForResend.trim();

      if (!userEmail) {
        const session = await authClient.getSession();
        userEmail = session.data?.user?.email ?? "";
      }

      if (!userEmail) {
        setResendError("Informe seu e-mail para reenviar a verificação.");
        return;
      }

      const { error } = await authClient.sendVerificationEmail({
        email: userEmail,
        callbackURL: `${window.location.origin}/perfil`,
      });

      if (error) {
        setResendError("Não foi possível reenviar o e-mail. Tente novamente.");
        return;
      }

      setResendSuccess("E-mail de verificação reenviado com sucesso!");
    } catch {
      setResendError("Não foi possível reenviar o e-mail. Tente novamente.");
    } finally {
      setIsResending(false);
    }
  }, [emailForResend]);

  return {
    emailForResend,
    handleResend,
    isResending,
    resendError,
    resendSuccess,
    setEmailForResend,
    status,
  };
};

export default useVerifyEmail;
