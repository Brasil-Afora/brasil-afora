/** Only attach to successful, session-independent public catalog responses. */
export const PUBLIC_CATALOG_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "Vercel-CDN-Cache-Control": "public, s-maxage=300",
} as const;
