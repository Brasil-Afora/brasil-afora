# Brasil Afora

Platform for discovering international and national academic opportunities, with favorites, profile area, map visualization, and admin management.

## Tech stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Better Auth (email/password and optional Google login)
- PostgreSQL + Drizzle ORM
- TanStack Query for client data fetching/caching
- Tailwind CSS 4 + Base UI + Sonner
- Bun for local scripts and package management

## Main features

- Public catalog for international and national opportunities
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

Create a `.env` file in the project root:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/brasil_afora
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
BETTER_AUTH_SECRET=change-me-in-production

# Optional: Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Notes:

- `DATABASE_URL` is required for Drizzle and runtime DB access.
- `BETTER_AUTH_SECRET` must be a secure secret outside local development.
- Google login is enabled only when both Google variables are set.

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
