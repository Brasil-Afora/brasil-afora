import { beforeEach, describe, expect, it } from "vitest";
import {
  applyRateLimitHeaders,
  checkRateLimit,
  getClientIp,
  getIngestionRateLimitKey,
  hashRateLimitIdentifier,
  RATE_LIMIT_PRESETS,
  rateLimitExceededResponse,
  resetRateLimitForTests,
  resolveApiRateLimitPreset,
} from "./rate-limit";

let keySequence = 0;

const uniqueKey = (prefix: string): string =>
  `${prefix}-${Date.now()}-${keySequence++}`;

beforeEach(() => {
  resetRateLimitForTests();
});

describe("rate limit presets", () => {
  it("uses stricter limits for auth and ingestion routes", () => {
    expect(RATE_LIMIT_PRESETS.auth.limit).toBe(10);
    expect(RATE_LIMIT_PRESETS.ingestion.limit).toBe(30);
    expect(RATE_LIMIT_PRESETS.default.limit).toBe(100);
  });

  it("uses one-minute windows by default", () => {
    expect(RATE_LIMIT_PRESETS.auth.windowMs).toBe(60_000);
    expect(RATE_LIMIT_PRESETS.ingestion.windowMs).toBe(60_000);
    expect(RATE_LIMIT_PRESETS.default.windowMs).toBe(60_000);
  });
});

describe("resolveApiRateLimitPreset", () => {
  it("maps auth paths to the auth preset", () => {
    expect(resolveApiRateLimitPreset("/api/auth/session")).toBe("auth");
    expect(resolveApiRateLimitPreset("/api/auth/callback/google")).toBe("auth");
  });

  it("maps ingestion paths to the ingestion preset", () => {
    expect(resolveApiRateLimitPreset("/api/v1/ingestions")).toBe("ingestion");
  });

  it("maps other api paths to the default preset", () => {
    expect(resolveApiRateLimitPreset("/api/v1/opportunities")).toBe("default");
    expect(resolveApiRateLimitPreset("/api/opportunities")).toBe("default");
    expect(resolveApiRateLimitPreset("/api/programs")).toBe("default");
  });

  it("returns null outside /api", () => {
    expect(resolveApiRateLimitPreset("/mapa")).toBeNull();
    expect(resolveApiRateLimitPreset("/")).toBeNull();
  });
});

describe("checkRateLimit", () => {
  it("allows requests up to the limit and blocks beyond it", async () => {
    const key = uniqueKey("allow");
    const config = { keyPrefix: "rl:test", limit: 3, windowMs: 60_000 };

    expect((await checkRateLimit(key, config)).success).toBe(true);
    expect((await checkRateLimit(key, config)).success).toBe(true);
    const lastAllowed = await checkRateLimit(key, config);
    expect(lastAllowed.success).toBe(true);
    expect(lastAllowed.remaining).toBe(0);

    const blocked = await checkRateLimit(key, config);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks buckets independently per key", async () => {
    const config = { keyPrefix: "rl:test", limit: 1, windowMs: 60_000 };
    expect((await checkRateLimit(uniqueKey("a"), config)).success).toBe(true);
    expect((await checkRateLimit(uniqueKey("b"), config)).success).toBe(true);
  });

  it("resets after the window expires", async () => {
    const key = uniqueKey("window");
    const config = { keyPrefix: "rl:test", limit: 1, windowMs: 50 };

    expect((await checkRateLimit(key, config)).success).toBe(true);
    expect((await checkRateLimit(key, config)).success).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 70));
    expect((await checkRateLimit(key, config)).success).toBe(true);
  });

  it("enforces the ingestion preset at 30 requests per minute", async () => {
    const key = uniqueKey("ingestion");
    for (let index = 0; index < 30; index += 1) {
      expect(
        (await checkRateLimit(key, RATE_LIMIT_PRESETS.ingestion)).success
      ).toBe(true);
    }
    expect(
      (await checkRateLimit(key, RATE_LIMIT_PRESETS.ingestion)).success
    ).toBe(false);
  });

  it("enforces the auth preset at 10 requests per minute", async () => {
    const key = uniqueKey("auth");
    for (let index = 0; index < 10; index += 1) {
      expect((await checkRateLimit(key, RATE_LIMIT_PRESETS.auth)).success).toBe(
        true
      );
    }
    expect((await checkRateLimit(key, RATE_LIMIT_PRESETS.auth)).success).toBe(
      false
    );
  });
});

describe("client identification", () => {
  it("prefers the first x-forwarded-for entry", () => {
    const request = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(request)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip and then unknown", () => {
    const withRealIp = new Request("http://localhost/api/test", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(getClientIp(withRealIp)).toBe("9.9.9.9");
    expect(getClientIp(new Request("http://localhost/api/test"))).toBe(
      "unknown"
    );
  });

  it("scopes ingestion keys by token without embedding the raw token", () => {
    const build = (token: string | null) => {
      const headers: Record<string, string> = { "x-forwarded-for": "1.1.1.1" };
      if (token) {
        headers.authorization = `Bearer ${token}`;
      }
      return new Request("http://localhost/api/v1/ingestions", { headers });
    };
    const first = getIngestionRateLimitKey(build("token-a"));
    const second = getIngestionRateLimitKey(build("token-a"));
    const other = getIngestionRateLimitKey(build("token-b"));
    const anonymous = getIngestionRateLimitKey(build(null));

    expect(first).toBe(second);
    expect(first).not.toBe(other);
    expect(first).not.toBe(anonymous);
    expect(first).not.toContain("token-a");
    expect(hashRateLimitIdentifier("token-a")).not.toContain("token-a");
  });
});

describe("rate limit responses", () => {
  it("builds a 429 response with headers and error code", async () => {
    const blocked = await checkRateLimit(uniqueKey("response"), {
      keyPrefix: "rl:test",
      limit: 0,
      windowMs: 60_000,
    });
    expect(blocked.success).toBe(false);

    const response = rateLimitExceededResponse(blocked);
    expect(response.status).toBe(429);
    expect(response.headers.get("RateLimit-Limit")).toBe("0");
    expect(response.headers.get("Retry-After")).toBe(
      String(blocked.retryAfterSeconds)
    );
    const body = (await response.json()) as {
      error: { code: string };
    };
    expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("applies RateLimit headers to successful responses", () => {
    const headers = new Headers();
    applyRateLimitHeaders(headers, {
      limit: 10,
      remaining: 9,
      resetMs: 1_700_000_000_000,
      retryAfterSeconds: 0,
      success: true,
    });
    expect(headers.get("RateLimit-Limit")).toBe("10");
    expect(headers.get("RateLimit-Remaining")).toBe("9");
    expect(headers.get("RateLimit-Reset")).toBe("1700000000");
    expect(headers.get("Retry-After")).toBeNull();
  });
});
