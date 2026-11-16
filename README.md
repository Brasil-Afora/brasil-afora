# Brasil Afora

Platform for discovering international and national academic opportunities for Brazilian students — scholarships, summer programs, exchanges, academic olympiads, science fairs, and mentorships — with curated verification, interactive map exploration, personal favorites, and an editorial review pipeline.

Live site: https://brasilafora.org

![Brasil Afora homepage](docs/assets/homepage.png)

## Features

- **International & National Catalogs** (`/oportunidades/internacionais`, `/oportunidades/nacionais`): Public catalogs with search and session-persisted filters (age, education level, opportunity type, fees, country, language, scholarship type, and modality), dedicated detail pages, and automatic filtering of expired deadlines.
- **Verified Showcase**: Curated selection of opportunities verified against official sources on a recorded date (`src/data/showcase-opportunities.json`), alongside closing-soon and newly added highlights on the homepage.
- **Programs & Scholarships** (`/programas-e-bolsas`): Dedicated directory for recurring programs, mentorships, prep initiatives, and access programs with cycle forecasts.
- **Interactive World Map** (`/mapa`): Country-level opportunity explorer built with Leaflet, React Leaflet, GeoJSON boundaries, and self-hosted map tiles.
- **Accounts, Favorites & Tracking** (`/perfil`): Better Auth authentication (email/password with verification and password reset via Resend + React Email, plus Google OAuth) enabling saved favorites and application tracking.
- **Editorial Review & v1 Ingestion Pipeline** (`/admin/review`, `/api/v1/*`): Structured ingestion, immutable snapshot storage, field-level semantic state resolution, human correction assertions, and outbox-driven publication with scheduled recrawls and link verification.
- **Accessible pt-BR Experience**: Portuguese (`pt-BR`) interface with dark and light themes and Atkinson Hyperlegible Next + Sora typography.

## Tech Stack

- **Framework**: Next.js 16 (App Router, React Compiler, standalone output), React 19, TypeScript 5
- **Styling & UI**: Tailwind CSS 4, Base UI (`@base-ui/react`), Lucide Icons, Sonner
- **Data & Forms**: TanStack Query v5, React Hook Form, Zod v4
- **Maps**: Leaflet, React Leaflet
- **Database**: PostgreSQL 17, Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Auth & Email**: Better Auth, Resend, React Email
- **Tooling & Testing**: Bun (`1.3.14`), Biome / Ultracite, Vitest, PGlite

## Architecture & Routes

The application follows a three-layer App Router architecture:

1. **UI Layer (`src/components`, `src/hooks`)**: Server and Client Components that consume domain-specific TanStack Query hooks with centralized query keys (`src/hooks/queries`).
2. **BFF Layer (`src/app/api`)**: Route Handlers that validate sessions, roles, and Zod contracts (`src/contracts`), enforce rate limits, and translate inputs/outputs.
3. **Server & Data Layer (`src/server`, `src/db`)**: Business logic, publication projections, geo resolution, and typed PostgreSQL access via Drizzle ORM. The browser never accesses the database directly.

### Main Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Homepage with search, category shortcuts, verified picks, highlights, and map teaser |
| `/oportunidades/internacionais` | Public | International opportunities catalog and detail pages (`/[id]`) |
| `/oportunidades/nacionais` | Public | National opportunities catalog and detail pages (`/[id]`) |
| `/programas-e-bolsas` | Public | Recurring programs, scholarships, mentorships, and detail pages (`/[id]`) |
| `/mapa` | Public | Interactive world map filtering opportunities by country |
| `/creditos-imagens` | Public | Third-party photograph and asset attributions |
| `/privacidade` | Public | Privacy policy |
| `/login`, `/cadastro`, `/esqueci-senha`, `/redefinir-senha`, `/verificar-email` | Public | Authentication, registration, password reset, and email verification |
| `/perfil` | Authenticated | User profile, saved favorites, and application tracking |
| `/admin/review` | Admin | Editorial review queue, semantic field corrections, and publication decisions (`/admin` redirects here) |

### API Surface & Authorization

- **Public & Favorites (`/api/opportunities/*`, `/api/national-opportunities/*`, `/api/programs`)**: Public read endpoints with HTTP/in-process catalog caching (`GET`); authenticated session required for favorites; legacy direct `POST` writes are disabled (`410 Gone`).
- **Auth (`/api/auth/[...all]`)**: Better Auth handler for email/password and Google OAuth.
- **Structured v1 API (`/api/v1/*`)**:
  - Public structured reads: `GET /api/v1/opportunities`, `GET /api/v1/opportunities/{id}`
  - Admin reviewer endpoints: `/api/v1/review-queue`, `/api/v1/snapshots/{id}`, `/api/v1/audit-events`, `/api/v1/editions/{id}/corrections`, `/api/v1/editions/{id}/publication-decisions`, `/api/v1/editions/{id}/recrawls`
  - Service-token worker endpoints: `/api/v1/ingestions` (`INGESTION_API_TOKEN`), `/api/v1/outbox/deliveries` (`OUTBOX_WORKER_TOKEN`), `/api/v1/maintenance/*` & `/api/v1/application-rounds/{id}/link-checks` (`MAINTENANCE_WORKER_TOKEN`).

## Project Structure

```text
.
├── docs/                  # Architecture, API v1 contract, security, and operations docs
├── public/                # Logos, catalog/curated imagery, and static assets
├── src/
│   ├── app/               # App Router pages ((marketing), (app), (auth)) and API routes
│   ├── components/        # UI components organized by domain
│   ├── contracts/         # Shared Zod schemas (API v1)
│   ├── data/              # Curated showcase, programs, image credits, and cost profiles
│   ├── db/                # Drizzle client, PostgreSQL schemas, and migrations
│   ├── hooks/             # TanStack Query hooks and client state hooks
│   ├── lib/               # Env validation, auth config, copy, geo, rate limiting, helpers
│   ├── mail/              # Resend client and React Email templates
│   ├── scripts/           # Audit, backfill, and local reviewer bootstrap scripts
│   └── server/            # Geo resolution, ingestion, review queue, publication, and recrawls
├── docker-compose.yml     # Local PostgreSQL 17 service
├── drizzle.config.ts      # Drizzle Kit configuration
├── next.config.ts         # Next.js config, standalone build, and security/cache headers
└── vitest.config.ts       # Vitest configuration
```

## Prerequisites

- **Bun** `1.3+` (`packageManager: bun@1.3.14`)
- **Node.js** `24.x`
- **PostgreSQL 17** (or **Docker** with `docker compose` for local development)

## Environment Variables

Copy `.env.example` to `.env` and configure the required values:

```bash
cp .env.example .env
```

Key configuration notes (see [`.env.example`](.env.example) and [`src/lib/env.ts`](src/lib/env.ts)):

- **Required at startup**:
  - `DATABASE_URL` (runtime connections also accept `DATABASE_PRIVATE_URL` and optional `DATABASE_SSL_CA`)
  - `BETTER_AUTH_URL` (falls back to `NEXT_PUBLIC_APP_URL`) and `BETTER_AUTH_SECRET`
  - `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
  - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (Google login is unconditionally enabled in `src/lib/auth.ts`; keep non-empty placeholders locally if you are not testing Google OAuth)
- **URLs & CORS**:
  - `NEXT_PUBLIC_APP_URL` configures client auth base URL and canonical metadata/`robots.txt`/`sitemap.xml` URLs.
  - `CORS_ORIGIN` is **required in production** (`NODE_ENV=production`) as a comma-separated list of trusted origins (defaults to `http://localhost:3000` in development).
- **Optional**:
  - `NEXT_PUBLIC_STRUCTURED_OPPORTUNITIES=true` to enable structured v1 opportunity reads.
  - `INGESTION_API_TOKEN`, `MAINTENANCE_WORKER_TOKEN`, and `OUTBOX_WORKER_TOKEN` (minimum 32 characters whenever set; otherwise routes fall back to admin session auth or return `503` if malformed).
  - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (or Vercel KV `KV_REST_API_*`) for distributed rate limiting in multi-instance production deployments, plus `RATE_LIMIT_*` overrides.
  - `LOCAL_REVIEWER_EMAIL` (`.local`) and `LOCAL_REVIEWER_PASSWORD` (min 12 chars) for `bun run local:bootstrap-reviewer`; `BRASIL_AFORA_PYTHON_REPO` and `BRASIL_AFORA_PYTHON` for cross-language Vitest suites.

## Local Setup

1. Install dependencies:

```bash
bun install
```

2. Start PostgreSQL (optional Docker helper):

```bash
docker compose up -d
```

3. Generate (if schema changed) and apply database migrations:

```bash
bun run db:migrate
```

4. Start the development server:

```bash
bun run dev
```

Open `http://localhost:3000`.

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Start the Next.js development server |
| `bun run build` | Build the production standalone bundle |
| `bun run build-assets` | Copy `public` and `.next/static` into `.next/standalone` |
| `bun run start` | Run the standalone production server (`bun .next/standalone/server.js`) |
| `bun run typecheck` | Run `next typegen` and `tsc --noEmit` |
| `bun run test` | Run Vitest suites and `showcase-opportunities.test.mjs` |
| `bun run check` / `bun run fix` | Run Ultracite / Biome checks or auto-fix formatting and lint issues |
| `bun run db:generate` / `bun run db:migrate` / `bun run db:studio` | Manage Drizzle migrations and inspect the database |
| `bun run auth:generate` | Regenerate Better Auth Drizzle schema (`src/db/schema/auth.ts`) |
| `bun run local:bootstrap-reviewer` | Create a local admin reviewer account against a local DB |

## Documentation

- [`PRODUCT.md`](PRODUCT.md) — Product scope, positioning, and editorial principles
- [`docs/CURRENT_SYSTEM_MAP.md`](docs/CURRENT_SYSTEM_MAP.md) — End-to-end ingestion, review, and publication architecture
- [`docs/API_V1.md`](docs/API_V1.md) — v1 API contract, authentication boundaries, and write invariants
- [`docs/SECURITY_HEADERS.md`](docs/SECURITY_HEADERS.md) — CSP, security headers, rate limiting, and production env notes
- [`docs/OPERATIONS_RUNBOOK.md`](docs/OPERATIONS_RUNBOOK.md) — Operational procedures and maintenance workflows

## License

Copyright (c) 2026 Brasil Afora and its contributors. All rights reserved.

This repository is public so its source can be read and reviewed, **not** open source. Without prior written permission from Brasil Afora, you may not copy, modify, redistribute, deploy, or extract the opportunity catalog and research data (`src/data/`). See [`LICENSE`](LICENSE) for full terms.
