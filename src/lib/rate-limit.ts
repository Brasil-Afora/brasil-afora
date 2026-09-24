/**
 * Reusable rate limiting for API routes and authentication.
 *
 * Uses a distributed store (Upstash Redis / Vercel KV REST) when the
 * corresponding environment variables are available. Otherwise it falls
 * back to an in-memory fixed-window counter, which is only suitable for
 * single-instance development. In production without a distributed store a
 * warning is logged once so operators know to configure one.
 *
 * The implementation is runtime-agnostic (Web `Request`/`Response` only) so
 * it can be used from route handlers (Node runtime) and from `proxy.ts`
 * (Edge runtime).
 */

export interface RateLimitConfig {
  /** Prefix used to namespace keys in the backing store. */
  keyPrefix: string;
  /** Maximum number of requests allowed per window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  limit: number;
  remaining: number;
  /** Epoch timestamp in ms when the current window resets. */
  resetMs: number;
  /** Seconds until the client may retry (0 when allowed). */
  retryAfterSeconds: number;
  success: boolean;
}

const MINUTE_MS = 60_000;

const parsePositiveInt = (
  value: string | undefined,
  fallback: number
): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Differentiated limits per route family. Operators may override them via
 * environment variables without code changes.
 */
export const RATE_LIMIT_PRESETS = {
  auth: {
    keyPrefix: "rl:auth",
    limit: parsePositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 10),
    windowMs: parsePositiveInt(
      process.env.RATE_LIMIT_AUTH_WINDOW_MS,
      MINUTE_MS
    ),
  },
  ingestion: {
    keyPrefix: "rl:ingestion",
    limit: parsePositiveInt(process.env.RATE_LIMIT_INGESTION_MAX, 30),
    windowMs: parsePositiveInt(
      process.env.RATE_LIMIT_INGESTION_WINDOW_MS,
      MINUTE_MS
    ),
  },
  default: {
    keyPrefix: "rl:api",
    limit: parsePositiveInt(process.env.RATE_LIMIT_DEFAULT_MAX, 100),
    windowMs: parsePositiveInt(
      process.env.RATE_LIMIT_DEFAULT_WINDOW_MS,
      MINUTE_MS
    ),
  },
} satisfies Record<string, RateLimitConfig>;

export type RateLimitPresetName = keyof typeof RATE_LIMIT_PRESETS;

/**
 * Pure helper that maps an API pathname to its rate limit preset.
 * Auth and ingestion routes have stricter limits; everything else under
 * `/api` uses the default preset.
 */
export const resolveApiRateLimitPreset = (
  pathname: string
): RateLimitPresetName | null => {
  if (!(pathname === "/api" || pathname.startsWith("/api/"))) {
    return null;
  }
  if (pathname.startsWith("/api/auth")) {
    return "auth";
  }
  if (pathname.startsWith("/api/v1/ingestions")) {
    return "ingestion";
  }
  return "default";
};

/** Extracts the client IP from common proxy headers. */
export const getClientIp = (request: Request): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  for (const header of ["x-real-ip", "cf-connecting-ip"]) {
    const value = request.headers.get(header)?.trim();
    if (value) {
      return value;
    }
  }
  return "unknown";
};

/**
 * Fast non-cryptographic hash (polynomial rolling hash, mod a large prime)
 * used only to bucket Authorization header values into rate limit keys
 * without storing the raw token in the backing store. This is not a
 * security boundary.
 */
export const hashRateLimitIdentifier = (value: string): string => {
  const MODULUS = 1_000_000_007;
  const BASE = 31;
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * BASE + value.charCodeAt(index)) % MODULUS;
  }
  return hash.toString(16).padStart(8, "0");
};

/** Builds an ingestion key scoped by client IP and caller token. */
export const getIngestionRateLimitKey = (request: Request): string => {
  const ip = getClientIp(request);
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const tokenId = authorization
    ? hashRateLimitIdentifier(authorization)
    : "anon";
  return `${ip}:${tokenId}`;
};

/** Builds a per-IP key for routes limited purely by caller address. */
export const getIpRateLimitKey = (request: Request): string =>
  getClientIp(request);

interface MemoryBucket {
  count: number;
  resetAt: number;
}

interface RateLimitStore {
  increment(
    key: string,
    windowMs: number
  ): Promise<{
    count: number;
    resetMs: number;
  }>;
}

const MAX_MEMORY_KEYS = 10_000;

const TRAILING_SLASH_PATTERN = /\/$/;

const getGlobalMemoryBuckets = (): Map<string, MemoryBucket> => {
  const globalStore = globalThis as unknown as {
    __rateLimitBuckets?: Map<string, MemoryBucket>;
  };
  if (!globalStore.__rateLimitBuckets) {
    globalStore.__rateLimitBuckets = new Map<string, MemoryBucket>();
  }
  return globalStore.__rateLimitBuckets;
};

const pruneMemoryBuckets = (
  buckets: Map<string, MemoryBucket>,
  now: number
): void => {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
};

const createMemoryStore = (): RateLimitStore => ({
  increment: (key: string, windowMs: number) => {
    const buckets = getGlobalMemoryBuckets();
    const now = Date.now();
    if (buckets.size >= MAX_MEMORY_KEYS) {
      pruneMemoryBuckets(buckets, now);
    }
    const existing = buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const resetAt = now + windowMs;
      buckets.set(key, { count: 1, resetAt });
      return Promise.resolve({ count: 1, resetMs: resetAt });
    }
    existing.count += 1;
    return Promise.resolve({
      count: existing.count,
      resetMs: existing.resetAt,
    });
  },
});

interface UpstashCredentials {
  token: string;
  url: string;
}

const getUpstashCredentials = (): UpstashCredentials | null => {
  const url = (
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  )?.trim();
  const token = (
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  )?.trim();
  if (!(url && token)) {
    return null;
  }
  return { url: url.replace(TRAILING_SLASH_PATTERN, ""), token };
};

const createUpstashStore = (
  credentials: UpstashCredentials
): RateLimitStore => {
  const runPipeline = async (
    commands: string[][]
  ): Promise<{ count: number; ttlMs: number }> => {
    const response = await fetch(`${credentials.url}/pipeline`, {
      body: JSON.stringify(commands),
      headers: {
        Authorization: `Bearer ${credentials.token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Upstash pipeline failed with ${response.status}`);
    }
    const payload = (await response.json()) as Array<{ result: unknown }>;
    const count = Number(payload[0]?.result);
    const ttlMs = Number(payload[1]?.result);
    if (!Number.isFinite(count)) {
      throw new Error("Upstash pipeline returned a non-numeric counter");
    }
    return {
      count,
      ttlMs: Number.isFinite(ttlMs) ? ttlMs : -1,
    };
  };

  return {
    increment: async (key: string, windowMs: number) => {
      const { count, ttlMs } = await runPipeline([
        ["INCR", key],
        ["PTTL", key],
      ]);
      let resetMs: number;
      if (count <= 1 || ttlMs < 0) {
        await runPipeline([["PEXPIRE", key, String(windowMs)]]);
        resetMs = Date.now() + windowMs;
      } else {
        resetMs = Date.now() + ttlMs;
      }
      return { count, resetMs };
    },
  };
};

let cachedStore: RateLimitStore | null = null;
let productionWarningLogged = false;

const getStore = (): RateLimitStore => {
  if (cachedStore) {
    return cachedStore;
  }
  const credentials = getUpstashCredentials();
  if (credentials) {
    cachedStore = createUpstashStore(credentials);
    return cachedStore;
  }
  if (process.env.NODE_ENV === "production" && !productionWarningLogged) {
    productionWarningLogged = true;
    console.warn(
      "[rate-limit] No distributed store configured (set UPSTASH_REDIS_REST_URL" +
        " and UPSTASH_REDIS_REST_TOKEN, or KV_REST_API_URL and KV_REST_API_TOKEN)." +
        " Falling back to in-memory rate limiting, which does not work across" +
        " multiple instances. Configure a distributed store for production."
    );
  }
  cachedStore = createMemoryStore();
  return cachedStore;
};

/** Clears cached store state. Intended for tests only. */
export const resetRateLimitForTests = (): void => {
  cachedStore = null;
  productionWarningLogged = false;
  getGlobalMemoryBuckets().clear();
};

const toResult = (
  config: RateLimitConfig,
  count: number,
  resetMs: number
): RateLimitResult => {
  const success = count <= config.limit;
  const remaining = Math.max(0, config.limit - count);
  const retryAfterSeconds = success
    ? 0
    : Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
  return {
    limit: config.limit,
    remaining,
    resetMs,
    retryAfterSeconds,
    success,
  };
};

/**
 * Checks the rate limit for a fully-qualified key. Falls back to the
 * in-memory store when the distributed store is unreachable so a Redis
 * outage degrades to local limiting instead of failing open or closed.
 */
export const checkRateLimit = async (
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> => {
  const namespacedKey = `${config.keyPrefix}:${key}`;
  try {
    const { count, resetMs } = await getStore().increment(
      namespacedKey,
      config.windowMs
    );
    return toResult(config, count, resetMs);
  } catch {
    const { count, resetMs } = await createMemoryStore().increment(
      `fallback:${namespacedKey}`,
      config.windowMs
    );
    return toResult(config, count, resetMs);
  }
};

/** Applies standard `RateLimit-*` headers plus `Retry-After` on 429s. */
export const applyRateLimitHeaders = (
  headers: Headers,
  result: RateLimitResult
): void => {
  headers.set("RateLimit-Limit", String(result.limit));
  headers.set("RateLimit-Remaining", String(result.remaining));
  headers.set("RateLimit-Reset", String(Math.ceil(result.resetMs / 1000)));
  if (!result.success) {
    headers.set("Retry-After", String(result.retryAfterSeconds));
  }
};

/** Builds a 429 JSON response body with rate limit headers. */
export const rateLimitExceededResponse = (
  result: RateLimitResult
): Response => {
  const headers = new Headers({ "Content-Type": "application/json" });
  applyRateLimitHeaders(headers, result);
  return new Response(
    JSON.stringify({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please retry later.",
      },
    }),
    { headers, status: 429 }
  );
};
