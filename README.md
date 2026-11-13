# Brasil Afora

Platform for discovering international and national academic opportunities, with favorites, profile area, map visualization, and admin management.

Live site: https://brasil-afora.vercel.app

## Tech stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Better Auth (email/password and optional Google login)
- PostgreSQL + Drizzle ORM
- TanStack Query for client data fetching/caching
- Tailwind CSS 4 + Base UI + Sonner
- Bun for local scripts and package management

## Main features

- Public catalog for international and national opportunities
- Curated showcase of verified international scholarships and programs
- Opportunity detail pages
- Favorite opportunities for authenticated users
- Profile page for user favorites and checklist flows
- Admin area to create and manage opportunities
- World map page for exploration

## Project architecture

The app follows a three-layer architecture: UI (components and hooks) → BFF (API layer) → Data access (database). This separation keeps business logic out of components and ensures clear responsibility boundaries.

- Route handlers in the API layer validate permissions, translate input/output, and delegate database operations
- Domain-specific hooks encapsulate data fetching and caching logic
- Components consume domain hooks rather than implementing data fetching directly
- Server-side guards protect routes through both page guards and API responses

## Prerequisites

- Bun 1.1+
- Node.js 20+
- Docker (optional, for local PostgreSQL)

## Environment variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
# Required at startup (all environments)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/brasil_afora
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
BETTER_AUTH_SECRET=change-me-generate-with-openssl-rand-hex-32
RESEND_API_KEY=re_example
RESEND_FROM_EMAIL=Brasil Afora <noreply@example.org>
GOOGLE_CLIENT_ID=replace-with-google-client-id
GOOGLE_CLIENT_SECRET=replace-with-google-client-secret
```

Notes:

- **Required at startup (`src/lib/env.ts`):** `DATABASE_URL` (or `DATABASE_PRIVATE_URL` at runtime), `BETTER_AUTH_URL` (falls back to `NEXT_PUBLIC_APP_URL`), `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`. All of these throw on startup if missing or blank — including the Google OAuth variables, since Google login is unconditionally enabled in `src/lib/auth.ts` (use non-empty placeholder values locally if you are not testing Google sign-in).
- **Database (`src/db/client.ts`, `drizzle.config.ts`):** Runtime connections prefer `DATABASE_PRIVATE_URL` over `DATABASE_URL`, and support an optional `DATABASE_SSL_CA` PEM certificate (`\n`-escaped). Drizzle CLI commands (`db:generate`, `db:migrate`, `db:studio`) and database scripts read `DATABASE_URL` directly.
- **Public URL (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BACKEND_URL`):** `NEXT_PUBLIC_APP_URL` sets the client auth base URL (falling back to `NEXT_PUBLIC_BACKEND_URL`, then `http://localhost:3000`) and the canonical URL for metadata, `robots.txt`, and `sitemap.xml` (falling back to `https://brasil-afora.vercel.app`).
- **CORS (`CORS_ORIGIN`):** Comma-separated list of trusted browser origins. **Required in production** (`NODE_ENV=production`); defaults to `http://localhost:3000` in development.
- **Feature flags:** Set `NEXT_PUBLIC_STRUCTURED_OPPORTUNITIES=true` to enable structured opportunity reads.
- **Service tokens (optional):** `INGESTION_API_TOKEN`, `MAINTENANCE_WORKER_TOKEN`, and `OUTBOX_WORKER_TOKEN` allow bearer-token auth for automation routes (otherwise admin session auth is required). Whenever set, each must be at least 32 characters or the route returns `503`.
- **Rate limiting:** In-memory by default. Multi-instance production deployments need `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL` + `KV_REST_API_TOKEN`). Limits can be tuned with `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_AUTH_WINDOW_MS`, `RATE_LIMIT_INGESTION_MAX`, `RATE_LIMIT_INGESTION_WINDOW_MS`, `RATE_LIMIT_DEFAULT_MAX`, and `RATE_LIMIT_DEFAULT_WINDOW_MS`.
- **Scripts & tests:** `bun run local:bootstrap-reviewer` requires `LOCAL_REVIEWER_EMAIL` (must end in `.local`) and `LOCAL_REVIEWER_PASSWORD` (min 12 chars) against a local database. Cross-language tests in `bun run test` require `BRASIL_AFORA_PYTHON_REPO` and `BRASIL_AFORA_PYTHON`.
- See `.env.example` and `docs/SECURITY_HEADERS.md` for the full list and production checklist.

## Local setup

1. Install dependencies:

```bash
bun install
```

2. Start PostgreSQL (optional helper):

```bash
docker compose up -d
```

3. Generate and apply database migrations:

```bash
bun run db:generate
bun run db:migrate
```

4. Start development server:

```bash
bun run dev
```

Open `http://localhost:3000`.

## Authorization and access patterns

- Public read access for opportunity catalogs
- Authenticated sessions required for favorite management
- Admin role required for opportunity creation and management
- Server-side route guards enforce authorization at both page and API levels

## Development workflow

- Keep data reads/writes inside route handlers and domain hooks
- Reuse query keys and invalidate related queries on mutations
- Run `bun run fix` before opening a PR
