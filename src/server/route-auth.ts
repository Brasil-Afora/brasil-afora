import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type SessionData = typeof auth.$Infer.Session;

export const getRequestSession = async (
  request: NextRequest
): Promise<SessionData | null> => {
  const session = await auth.api.getSession({ headers: request.headers });
  return session;
};

export const requireSessionInRoute = async (request: NextRequest) => {
  const session = await getRequestSession(request);

  if (!session?.user) {
    return {
      session: null,
      response: NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 }
      ),
    } as const;
  }

  return { session, response: null } as const;
};

export const requireAdminInRoute = async (request: NextRequest) => {
  const authResult = await requireSessionInRoute(request);

  if (authResult.response) {
    return authResult;
  }

  if (authResult.session.user.role !== "admin") {
    return {
      session: null,
      response: NextResponse.json({ message: "Forbidden." }, { status: 403 }),
    } as const;
  }

  return authResult;
};
