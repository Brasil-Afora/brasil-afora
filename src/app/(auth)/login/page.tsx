import SignInPage from "@/components/auth/sign-in-page";

export const dynamic = "force-dynamic";

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return <SignInPage redirectTo={params.redirectTo} />;
}
