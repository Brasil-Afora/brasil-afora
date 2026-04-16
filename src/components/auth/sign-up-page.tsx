"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { signIn, signUp } from "@/lib/auth-client";
import AuthLayout from "./auth-layout";
import {
  AuthButton,
  AuthError,
  AuthInput,
  AuthSuccess,
  GoogleIcon,
} from "./auth-ui";

interface SignUpFormValues {
  confirmPassword: string;
  email: string;
  name: string;
  password: string;
}

const SignUpPage = () => {
  const router = useRouter();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<SignUpFormValues>({
    defaultValues: {
      confirmPassword: "",
      email: "",
      name: "",
      password: "",
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmitForm = async ({
    confirmPassword,
    email,
    name,
    password,
  }: SignUpFormValues) => {
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

    setIsLoading(true);

    const verificationWaitingUrl = `${window.location.origin}/verificar-email?email=${encodeURIComponent(email)}`;

    const { error: authError } = await signUp.email({
      name,
      email,
      password,
      callbackURL: `${window.location.origin}/perfil`,
    });

    setIsLoading(false);

    if (authError) {
      if (authError.code === "USER_ALREADY_EXISTS") {
        setError("Já existe uma conta com este e-mail.");
      } else {
        setError("Ocorreu um erro ao criar sua conta. Tente novamente.");
      }
      return;
    }

    setSuccess(
      "Conta criada! Verifique seu e-mail para confirmar seu cadastro."
    );
    setTimeout(() => router.push(verificationWaitingUrl), 2000);
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setIsGoogleLoading(true);

    await signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}/perfil`,
    });

    setIsGoogleLoading(false);
  };

  return (
    <AuthLayout
      subtitle="Crie sua conta gratuitamente"
      title="Comece sua jornada"
    >
      <div className="space-y-5">
        <AuthButton
          isLoading={isGoogleLoading}
          onClick={handleGoogleSignUp}
          type="button"
          variant="outline"
        >
          <span className="flex items-center justify-center gap-3">
            <GoogleIcon />
            Cadastrar com Google
          </span>
        </AuthButton>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-700" />
          <span className="text-slate-500 text-sm">ou</span>
          <div className="h-px flex-1 bg-slate-700" />
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(handleSubmitForm)}>
          <AuthError message={error} />
          <AuthSuccess message={success} />

          <AuthInput
            autoComplete="name"
            errorMessage={errors.name?.message}
            id="name"
            label="Nome completo"
            placeholder="Seu nome"
            registration={register("name", {
              required: "Informe seu nome completo.",
            })}
            required
            type="text"
          />

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

          <AuthInput
            autoComplete="new-password"
            errorMessage={errors.password?.message}
            id="password"
            label="Senha"
            placeholder="Mínimo 8 caracteres"
            registration={register("password", {
              minLength: {
                value: 8,
                message: "A senha deve ter pelo menos 8 caracteres.",
              },
              required: "Informe uma senha.",
            })}
            required
            type="password"
          />

          <AuthInput
            autoComplete="new-password"
            errorMessage={errors.confirmPassword?.message}
            id="confirm-password"
            label="Confirmar senha"
            placeholder="Repita sua senha"
            registration={register("confirmPassword", {
              required: "Confirme sua senha.",
            })}
            required
            type="password"
          />

          <AuthButton isLoading={isLoading} type="submit">
            Criar conta
          </AuthButton>
        </form>

        <p className="text-center text-slate-400 text-sm">
          Já tem uma conta?{" "}
          <Link
            className="font-semibold text-amber-500 hover:text-amber-400"
            href="/login"
          >
            Entrar
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default SignUpPage;
