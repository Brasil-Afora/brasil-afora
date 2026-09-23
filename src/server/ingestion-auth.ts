import "server-only";

import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const MINIMUM_TOKEN_LENGTH = 32;

const equalSecrets = (left: string, right: string): boolean => {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
};

const readBearerToken = (request: NextRequest): string | null => {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
};

export const requireIngestionInRoute = async (request: NextRequest) => {
  const configuredToken = process.env.INGESTION_API_TOKEN?.trim();
  const suppliedToken = readBearerToken(request);
  if (
    configuredToken &&
    configuredToken.length >= MINIMUM_TOKEN_LENGTH &&
    suppliedToken &&
    equalSecrets(configuredToken, suppliedToken)
  ) {
    return {
      principal: { id: "scraper", kind: "service" as const },
      response: null,
    };
  }

  const { requireAdminInRoute } = await import("@/server/route-auth");
  const adminResult = await requireAdminInRoute(request);
  if (adminResult.response) {
    return { principal: null, response: adminResult.response };
  }
  return {
    principal: {
      id: adminResult.session.user.id,
      kind: "admin" as const,
    },
    response: null,
  };
};

export const ingestionAuthConfigurationError = (): NextResponse | null => {
  const configuredToken = process.env.INGESTION_API_TOKEN?.trim();
  if (configuredToken && configuredToken.length < MINIMUM_TOKEN_LENGTH) {
    return NextResponse.json(
      {
        error: {
          code: "INGESTION_AUTH_MISCONFIGURED",
          message: `INGESTION_API_TOKEN must contain at least ${MINIMUM_TOKEN_LENGTH} characters.`,
        },
      },
      { status: 503 }
    );
  }
  return null;
};
