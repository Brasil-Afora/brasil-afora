"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { authClient } from "../../lib/auth-client";
import AuthLayout from "./auth-layout";
import { AuthButton, AuthError, AuthInput, AuthSuccess } from "./auth-ui";

interface ResetPasswordFormValues {
  confirmPassword: string;
  password: string;
}

const ResetPasswordPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<ResetPasswordFormValues>({
    defaultValues: {
      confirmPassword: "",
      password: "",
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmitForm = async ({
    confirmPassword,
    password,
  }: ResetPasswordFormValues) => {
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (!token) {
      setError(
        "Link de redefinição inválido ou expirado. Solicite um novo link."
      );
      return;
    }

    setIsLoading(true);

    const { error: authError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    setIsLoading(false);

    if (authError) {
      setError(
        "Link expirado ou inválido. Solicite um novo link de redefinição."
      );
      return;
    }

    setSuccess("Senha redefinida com sucesso!");
    setTimeout(() => router.push("/login"), 2000);
  };

  return (
    <AuthLayout
      subtitle="Escolha uma nova senha para sua conta"
      title="Redefinir senha"
    >
      <form className="space-y-5" onSubmit={handleSubmit(handleSubmitForm)}>
        <AuthError message={error} />
        <AuthSuccess message={success} />

        <AuthInput
          autoComplete="new-password"
          errorMessage={errors.password?.message}
          id="password"
          label="Nova senha"
          placeholder="Mínimo 8 caracteres"
          registration={register("password", {
            minLength: {
              value: 8,
              message: "A senha deve ter pelo menos 8 caracteres.",
            },
            required: "Informe uma nova senha.",
          })}
          required
          type="password"
        />

        <AuthInput
          autoComplete="new-password"
          errorMessage={errors.confirmPassword?.message}
          id="confirm-password"
          label="Confirmar nova senha"
          placeholder="Repita a nova senha"
          registration={register("confirmPassword", {
            required: "Confirme sua senha.",
          })}
          required
          type="password"
        />

        <AuthButton isLoading={isLoading} type="submit">
          Redefinir senha
        </AuthButton>

        <p className="text-center text-slate-400 text-sm">
          <Link
            className="font-semibold text-amber-500 hover:text-amber-400"
            href="/login"
          >
            Voltar ao login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
