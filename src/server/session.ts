import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

interface SessionUser {
  email?: string;
  id: string;
  image?: string | null;
  name?: string;
  role?: string | null;
}

interface SessionPayload {
  session?: unknown;
  user?: SessionUser;
}

export const getServerSession = async (): Promise<SessionPayload | null> => {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  return session;
};

export const requireUserSession = async (redirectTo = "/login") => {
  const session = await getServerSession();

  if (!session?.user) {
    redirect(redirectTo);
  }

  return session;
};

export const requireAdminSession = async (redirectTo = "/perfil") => {
  const session = await requireUserSession(
    `/login?redirectTo=${encodeURIComponent("/admin")}`
  );
  const role = session.user?.role;

  if (role !== "admin") {
    redirect(redirectTo);
  }

  return session;
};
