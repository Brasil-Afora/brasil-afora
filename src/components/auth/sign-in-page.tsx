"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "../../lib/auth-client";
import AuthLayout from "./auth-layout";
import { AuthButton, AuthError, AuthInput, GoogleIcon } from "./auth-ui";

interface SignInPageProps {
  redirectTo?: string;
}

const SignInPage = ({ redirectTo }: SignInPageProps) => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const requestedPath = redirectTo;
  const fromPath = requestedPath?.startsWith("/") ? requestedPath : "/perfil";
  const callbackURL = `${window.location.origin}${fromPath}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error: authError } = await signIn.email({
      email,
      password,
      callbackURL,
    });

    setIsLoading(false);

    if (authError) {
      setError("E-mail ou senha incorretos. Tente novamente.");
      return;
    }

    router.push(fromPath);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);

    await signIn.social({
      provider: "google",
      callbackURL,
    });

    setIsGoogleLoading(false);
  };

  return (
    <AuthLayout
      subtitle="Entre com sua conta para continuar"
      title="Bem-vindo de volta"
    >
      <div className="space-y-5">
        <AuthButton
          isLoading={isGoogleLoading}
          onClick={handleGoogleSignIn}
          type="button"
          variant="outline"
        >
          <span className="flex items-center justify-center gap-3">
            <GoogleIcon />
            Entrar com Google
          </span>
        </AuthButton>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-700" />
          <span className="text-slate-500 text-sm">ou</span>
          <div className="h-px flex-1 bg-slate-700" />
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <AuthError message={error} />

          <AuthInput
            autoComplete="email"
            id="email"
            label="E-mail"
            onChange={setEmail}
            placeholder="seu@email.com"
            required
            type="email"
            value={email}
          />

          <div className="space-y-1">
            <AuthInput
              autoComplete="current-password"
              id="password"
              label="Senha"
              onChange={setPassword}
              placeholder="••••••••"
              required
              type="password"
              value={password}
            />
            <div className="flex justify-end">
              <Link
                className="text-amber-500 text-sm hover:text-amber-400"
                href="/esqueci-senha"
              >
                Esqueci minha senha
              </Link>
            </div>
          </div>

          <AuthButton isLoading={isLoading} type="submit">
            Entrar
          </AuthButton>
        </form>

        <p className="text-center text-slate-400 text-sm">
          Não tem uma conta?{" "}
          <Link
            className="font-semibold text-amber-500 hover:text-amber-400"
            href="/cadastro"
          >
            Cadastre-se
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default SignInPage;
