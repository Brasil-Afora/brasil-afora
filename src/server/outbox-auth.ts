import "server-only";

import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const MINIMUM_TOKEN_LENGTH = 32;

const readBearerToken = (request: NextRequest): string | null => {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  return authorization.slice("Bearer ".length).trim() || null;
};

const equalSecrets = (left: string, right: string): boolean => {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
};

export const requireOutboxInRoute = async (request: NextRequest) => {
  const configuredToken = process.env.OUTBOX_WORKER_TOKEN?.trim();
  if (configuredToken && configuredToken.length < MINIMUM_TOKEN_LENGTH) {
    return {
      principal: null,
      response: NextResponse.json(
        {
          error: {
            code: "OUTBOX_AUTH_MISCONFIGURED",
            message: `OUTBOX_WORKER_TOKEN must contain at least ${MINIMUM_TOKEN_LENGTH} characters.`,
          },
        },
        { status: 503 }
      ),
    };
  }
  const suppliedToken = readBearerToken(request);
  if (
    configuredToken &&
    suppliedToken &&
    equalSecrets(configuredToken, suppliedToken)
  ) {
    return {
      principal: { id: "outbox-worker", kind: "service" as const },
      response: null,
    };
  }

  const { requireAdminInRoute } = await import("@/server/route-auth");
  const adminResult = await requireAdminInRoute(request);
  if (adminResult.response) {
    return { principal: null, response: adminResult.response };
  }
  return {
    principal: { id: adminResult.session.user.id, kind: "admin" as const },
    response: null,
  };
};
