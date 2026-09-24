import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  applyRateLimitHeaders,
  checkRateLimit,
  getIpRateLimitKey,
  RATE_LIMIT_PRESETS,
  rateLimitExceededResponse,
  resolveApiRateLimitPreset,
} from "@/lib/rate-limit";

/**
 * Edge entrypoint (Next.js 16 "Proxy", formerly Middleware).
 *
 * Applies the default API rate limit (100 req/min per IP). Authentication
 * (`/api/auth/*`) and ingestion (`/api/v1/ingestions`) routes enforce their
 * own stricter limits inside their route handlers so direct handler
 * invocation (and unit tests) stays protected even when the proxy is
 * bypassed.
 */
export async function proxy(request: NextRequest) {
  const presetName = resolveApiRateLimitPreset(request.nextUrl.pathname);

  if (presetName === null || presetName !== "default") {
    return NextResponse.next();
  }

  const preset = RATE_LIMIT_PRESETS.default;
  const result = await checkRateLimit(getIpRateLimitKey(request), preset);

  if (!result.success) {
    const limited = rateLimitExceededResponse(result);
    return new NextResponse(limited.body, {
      headers: limited.headers,
      status: limited.status,
    });
  }

  const response = NextResponse.next();
  applyRateLimitHeaders(response.headers, result);
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
