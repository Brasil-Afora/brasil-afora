# Security headers, rate limiting, and production env

See `.env.example` for the full variable list. This page explains the
security controls added on top of `docs/SECURITY_AND_CRAWLER_POLICY.md`.

## Security headers (`next.config.ts`)

`headers()` applies these to `/:path*`:

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | Restrictive baseline; see below |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` (production only) |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

CSP notes:

- `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com
  https://www.google-analytics.com (+ wildcards)` — `'unsafe-inline'` is
  required by the theme-init inline script in `src/app/layout.tsx` and by
  Next.js runtime inline scripts. Map tiles are self-hosted
  (`/map-tiles/...`), so no third-party tile CDN is allowlisted.
- `'unsafe-eval'` is appended to `script-src` only outside production so
  local HMR keeps working.
- Removing `'unsafe-inline'` is future work: generate a per-request nonce
  in `proxy.ts`, send it via the CSP header, and pass it to
  `next/script` (`nonce` prop) for the theme-init script.

## Rate limiting (`src/lib/rate-limit.ts`, `proxy.ts`)

Fixed-window limits per minute:

| Route family | Limit | Key |
| --- | --- | --- |
| `/api/auth/*` | 10 req/min | client IP (enforced in the route handler) |
| `/api/v1/ingestions` | 30 req/min | client IP + caller token hash (enforced in the route handler) |
| Other `/api/*` | 100 req/min | client IP (enforced in `proxy.ts`) |

Exceeded requests receive `429` with `RATE_LIMIT_EXCEEDED` plus
`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and
`Retry-After` headers.

Overrides (no code change needed):

```bash
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_AUTH_WINDOW_MS=60000
RATE_LIMIT_INGESTION_MAX=30
RATE_LIMIT_INGESTION_WINDOW_MS=60000
RATE_LIMIT_DEFAULT_MAX=100
RATE_LIMIT_DEFAULT_WINDOW_MS=60000
```

### Distributed store (required for multi-instance production)

By default the limiter keeps counters in memory (single instance /
development). When `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
(or the Vercel KV equivalents `KV_REST_API_URL` + `KV_REST_API_TOKEN`)
are set, counters move to Redis via its REST pipeline. In production
without these variables the app logs a one-time warning and keeps the
in-memory fallback — do not run multiple instances that way, since each
instance would enforce its own budget.

## CORS (`src/lib/env.ts`, `src/lib/auth.ts`)

- `CORS_ORIGIN` accepts a comma-separated allowlist and feeds Better Auth
  `trustedOrigins` together with `BETTER_AUTH_URL`.
- **Production:** `CORS_ORIGIN` is required — startup throws
  `Missing required environment variable: CORS_ORIGIN` when it is unset,
  instead of silently trusting `http://localhost:3000`.
- **Development:** defaults to `http://localhost:3000` when unset.

## Safe error logging (`src/lib/logger.ts`)

- `logError(context, error, metadata?)` logs a single JSON object with
  only `context`, `message`, `code`, and redacted metadata.
- `sanitizeForLogging` redacts keys matching `html`, `authorization`,
  `cookie`, `token`, `secret`, `password` (and variants such as
  `apiKey`, `clientSecret`, `session`), truncates long strings
  (e.g. HTML snapshots), and survives circular references.
- Rule: never pass raw request bodies, snapshots, tokens, or headers to
  `console.*` — route handlers must use `logError`.

## CI secrets (`.github/workflows/ci.yml`)

- Secret-capable values (`BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`) come from
  `${{ secrets.* }}`.
- Pure build values (`BETTER_AUTH_URL`, `DATABASE_URL`,
  `NEXT_PUBLIC_APP_URL`, `CORS_ORIGIN`, …) stay as plain workflow env.
- The `Prepare test secrets` step generates ephemeral values
  (`openssl rand -hex 32`) when secrets are unavailable (fork PRs), so
  the pipeline still runs without real credentials.

## Production checklist

```bash
CORS_ORIGIN=https://brasil-afora.vercel.app
BETTER_AUTH_URL=https://brasil-afora.vercel.app
NEXT_PUBLIC_APP_URL=https://brasil-afora.vercel.app
BETTER_AUTH_SECRET=<openssl rand -hex 32>
INGESTION_API_TOKEN=<min 32 chars>
MAINTENANCE_WORKER_TOKEN=<min 32 chars>
OUTBOX_WORKER_TOKEN=<min 32 chars>
UPSTASH_REDIS_REST_URL=<redis rest url>
UPSTASH_REDIS_REST_TOKEN=<redis rest token>
```

## Drizzle ORM beta note

`drizzle-orm` / `drizzle-kit` are pinned to `1.0.0-beta.9`: no stable
1.x release exists yet (latest stable `0.45.3` predates the `casing`
API in use), so downgrading would break the app. A tracking comment
lives in `package.json` (`//drizzle-beta-tracking`). When 1.x stable
lands: upgrade, run `bun install`, `bun run db:generate`, then the full
`check` / `typecheck` / `test` / `build` suite.
