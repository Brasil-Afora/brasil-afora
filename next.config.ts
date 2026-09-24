import type { NextConfig } from "next";

interface SecurityHeader {
  key: string;
  value: string;
}

/**
 * Builds the Content-Security-Policy value.
 *
 * Notes on trade-offs:
 * - `script-src` keeps `'unsafe-inline'` because the theme-init inline
 *   script in `src/app/layout.tsx` and Next.js runtime inline scripts
 *   require it. A per-request nonce (set via `proxy.ts` + `next/script`
 *   `nonce` prop) is the path to remove it; see docs/SECURITY_HEADERS.md.
 * - `'unsafe-eval'` is added to `script-src` only outside production so
 *   local HMR keeps working. Production builds omit it.
 * - Map tiles are self-hosted (`/map-tiles/...`), so `img-src` does not
 *   need third-party tile CDNs. `https:` is allowed for OG images and
 *   identity-provider avatars.
 */
export const buildContentSecurityPolicy = (isProduction: boolean): string => {
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://*.googletagmanager.com",
    "https://*.google-analytics.com",
  ];
  if (!isProduction) {
    scriptSources.push("'unsafe-eval'");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
};

/**
 * Security headers applied to every response. HSTS is production-only:
 * enabling it in development would pin localhost to HTTPS.
 */
export const buildSecurityHeaders = (
  isProduction: boolean
): SecurityHeader[] => {
  const headers: SecurityHeader[] = [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(isProduction),
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
  ];

  if (isProduction) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
};

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  headers: async () => [
    {
      headers: buildSecurityHeaders(process.env.NODE_ENV === "production"),
      source: "/:path*",
    },
  ],
};

export default nextConfig;
