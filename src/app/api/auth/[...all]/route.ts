import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  applyRateLimitHeaders,
  checkRateLimit,
  getIpRateLimitKey,
  RATE_LIMIT_PRESETS,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";

const handler = toNextJsHandler(auth);

const withAuthRateLimit = async (
  request: NextRequest,
  invoke: (request: NextRequest) => Promise<Response>
): Promise<Response> => {
  const result = await checkRateLimit(
    getIpRateLimitKey(request),
    RATE_LIMIT_PRESETS.auth
  );

  if (!result.success) {
    const limited = rateLimitExceededResponse(result);
    return NextResponse.json(await limited.json(), {
      headers: limited.headers,
      status: limited.status,
    });
  }

  const response = await invoke(request);
  applyRateLimitHeaders(response.headers, result);
  return response;
};

export const GET = (request: NextRequest) =>
  withAuthRateLimit(request, handler.GET);

export const POST = (request: NextRequest) =>
  withAuthRateLimit(request, handler.POST);
