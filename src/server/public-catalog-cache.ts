/** Only attach to successful, session-independent public catalog responses. */
export const PUBLIC_CATALOG_CACHE_HEADERS = {
  "Cache-Control":
    "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  "Vercel-CDN-Cache-Control": "public, s-maxage=300",
} as const;

const CATALOG_CACHE_TTL_MS = 60_000;

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const memoryCatalogCache = new Map<string, CacheEntry<unknown>>();
const inFlightCatalogReads = new Map<string, Promise<unknown>>();

/**
 * Short-lived in-process cache for full-catalog reads. Avoids repeating full
 * table scans and city geo-resolution on every concurrent request while
 * letting errors propagate uncached. Disabled in unit tests so mocked DB
 * responses stay isolated per test.
 */
export const withCatalogCache = async <T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs: number = CATALOG_CACHE_TTL_MS
): Promise<T> => {
  if (process.env.NODE_ENV === "test") {
    return await loader();
  }
  const now = Date.now();
  const cached = memoryCatalogCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }
  const existingPromise = inFlightCatalogReads.get(key);
  if (existingPromise) {
    return (await existingPromise) as T;
  }
  const promise = loader()
    .then((result) => {
      memoryCatalogCache.set(key, {
        expiresAt: Date.now() + ttlMs,
        value: result,
      });
      return result;
    })
    .finally(() => {
      inFlightCatalogReads.delete(key);
    });
  inFlightCatalogReads.set(key, promise);
  return await promise;
};

export const invalidateCatalogCache = (): void => {
  memoryCatalogCache.clear();
};
