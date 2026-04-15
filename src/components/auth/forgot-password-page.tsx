"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { authClient } from "../../lib/auth-client";
import AuthLayout from "./auth-layout";
import { AuthButton, AuthError, AuthInput, AuthSuccess } from "./auth-ui";

interface ForgotPasswordFormValues {
  email: string;
}

const ForgotPasswordPage = () => {
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<ForgotPasswordFormValues>({
    defaultValues: {
      email: "",
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmitForm = async ({ email }: ForgotPasswordFormValues) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const { error: authError } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    setIsLoading(false);

    if (authError) {
      setError("Ocorreu um erro. Verifique o e-mail e tente novamente.");
      return;
    }

    setSuccess(
      "Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha."
    );
  };

  return (
    <AuthLayout
      subtitle="Informe seu e-mail para receber as instruções de redefinição"
      title="Esqueceu sua senha?"
    >
      <form className="space-y-5" onSubmit={handleSubmit(handleSubmitForm)}>
        <AuthError message={error} />
        <AuthSuccess message={success} />

        <AuthInput
          autoComplete="email"
          errorMessage={errors.email?.message}
          id="email"
          label="E-mail"
          placeholder="seu@email.com"
          registration={register("email", {
            required: "Informe seu e-mail.",
          })}
          required
          type="email"
        />

        <AuthButton isLoading={isLoading} type="submit">
          Enviar link de redefinição
        </AuthButton>

        <p className="text-center text-slate-400 text-sm">
          Lembrou a senha?{" "}
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

export default ForgotPasswordPage;
