import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { buildBackendUrl } from "@/lib/backend";

interface SessionUser {
  email?: string;
  id: string;
  image?: string | null;
  name?: string;
  role?: string;
}

interface SessionPayload {
  session?: unknown;
  user?: SessionUser;
}

const parseSessionPayload = (payload: unknown): SessionPayload | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const directPayload = payload as SessionPayload;
  if (directPayload.user?.id) {
    return directPayload;
  }

  const nestedPayload = (payload as { data?: SessionPayload }).data;
  if (nestedPayload?.user?.id) {
    return nestedPayload;
  }

  return null;
};

export const getServerSession = async (): Promise<SessionPayload | null> => {
  const cookieHeader = (await cookies()).toString();

  const response = await fetch(buildBackendUrl("/auth/get-session"), {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) {
    return null;
  }

  const payload = parseSessionPayload(await response.json());
  return payload;
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
