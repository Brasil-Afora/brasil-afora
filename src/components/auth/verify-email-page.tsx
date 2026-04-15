"use client";

import { CircleCheckIcon, LoaderCircleIcon } from "lucide-react";
import Link from "next/link";
import useVerifyEmail from "@/hooks/use-verify-email";
import AuthLayout from "./auth-layout";
import { AuthButton, AuthError, AuthInput, AuthSuccess } from "./auth-ui";

const subtitles: Record<string, string> = {
  verifying: "Aguarde enquanto verificamos seu e-mail...",
  success: "Sua conta foi confirmada",
  error: "Não foi possível verificar seu e-mail",
  pending: "Verifique sua caixa de entrada",
};

const getSubtitle = (status: string) =>
  subtitles[status] ?? "Verifique sua caixa de entrada";

const VerifyEmailPage = () => {
  const {
    emailForResend,
    handleResend,
    isResending,
    resendError,
    resendSuccess,
    setEmailForResend,
    status,
  } = useVerifyEmail();

  return (
    <AuthLayout subtitle={getSubtitle(status)} title="Verificação de e-mail">
      <div className="space-y-5">
        {status === "verifying" && (
          <div className="flex items-center justify-center py-8">
            <LoaderCircleIcon
              aria-hidden="true"
              className="h-10 w-10 animate-spin text-amber-500"
            />
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-900/30 text-green-400">
              <CircleCheckIcon aria-hidden="true" className="h-8 w-8" />
            </div>
            <p className="text-slate-300">
              E-mail verificado com sucesso! Você já pode acessar todos os
              recursos da plataforma.
            </p>
            <p className="text-slate-400 text-sm">
              Redirecionando para o seu perfil...
            </p>
            <Link
              className="inline-block w-full rounded-lg bg-amber-500 px-4 py-2.5 text-center font-semibold text-slate-950 text-sm transition-colors hover:bg-amber-400"
              href="/perfil"
            >
              Ir para o perfil
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <p className="text-center text-slate-300">
              O link de verificação é inválido ou expirou. Solicite um novo
              e-mail de verificação.
            </p>
            <AuthInput
              autoComplete="email"
              id="resend-email"
              label="E-mail para reenvio"
              onChange={setEmailForResend}
              placeholder="seu@email.com"
              required
              type="email"
              value={emailForResend}
            />
            <AuthError message={resendError} />
            <AuthSuccess message={resendSuccess} />
            <AuthButton
              isLoading={isResending}
              onClick={handleResend}
              type="button"
            >
              Reenviar e-mail de verificação
            </AuthButton>
          </div>
        )}

        {status === "pending" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
              <p className="text-slate-300">
                Enviamos um e-mail de verificação para o endereço cadastrado.
                Clique no link do e-mail para confirmar sua conta.
              </p>
            </div>
            <AuthInput
              autoComplete="email"
              id="pending-email"
              label="E-mail para reenvio"
              onChange={setEmailForResend}
              placeholder="seu@email.com"
              required
              type="email"
              value={emailForResend}
            />
            <AuthError message={resendError} />
            <AuthSuccess message={resendSuccess} />
            <AuthButton
              isLoading={isResending}
              onClick={handleResend}
              type="button"
              variant="outline"
            >
              Reenviar e-mail de verificação
            </AuthButton>
            <p className="text-center text-slate-400 text-sm">
              <Link
                className="font-semibold text-amber-500 hover:text-amber-400"
                href="/login"
              >
                Voltar ao login
              </Link>
            </p>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default VerifyEmailPage;
