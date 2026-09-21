# AGENTS - src/components/homepage

## Folder purpose

The product's home page (`/`): hero with live search and category shortcuts, the verified opportunity selection, the why-list and map teaser, and the contribute band.

## Rules for agents

- Avoid coupling heavy business logic to the home page; shared rules live in `home-data.ts` and `src/lib`.
- Sections are server components. Only `home-search.tsx` and `home-category-shortcuts.tsx` are client components; keep new interactivity in small client islands.
- Verification language ("Verificada", "fontes oficiais") applies only to the curated set in `src/data/showcase-opportunities.json`; never extend it to the catalog.
- Follow the visual system in `/DESIGN.md` (navy + one amber, Atkinson Hyperlegible Next, drawn-line motion) and the surface brief in `/.impeccable/surfaces/`.

## Architecture patterns

- `home-data.ts` turns the verified data into view models: featured cards (open deadlines in Brasília time, nearest first), search entries and map destinations.
- The page (`src/app/(marketing)/page.tsx`) revalidates hourly so countdowns and expired opportunities stay current without a client-side date check.
- Category shortcuts pre-apply catalog filters by writing the catalog's session-storage key (`OPPORTUNITY_FILTER_STORAGE_KEYS`) before navigating.
- Search fetches the full catalogs only after the user focuses the field, and falls back to the verified set when the API fails.
- The map teaser draws the verified destinations the server resolved, then loads the catalogs (with their API-resolved `localizacoes`) once it scrolls into view. Routes go from Brasília to each place abroad; national places are pins.
