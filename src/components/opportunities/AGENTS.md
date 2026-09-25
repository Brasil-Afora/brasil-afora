# AGENTS - src/components/opportunities

## Folder purpose

The shared catalog used by the international, national and Programas e Bolsas listing pages (`catalog-*`), plus filter options and shared types.

## Rules for agents

- Verified and catalog opportunities form one list: filters, sorting and pagination apply to both. Only the curated set gets the "Verificada" badge.
- Price, funding (Integral / Parcial / Sem bolsa) and the application-fee category come from `src/data/cost-profiles.json`, keyed by record id and read through `src/lib/cost-profile.ts`. The research stores these as free prose, so a record without a profile can't be filtered by them and shows "Preço não informado". When opportunities are added, add their profiles (`bun run cost:missing` lists the gaps). Take a price only from the record's own text; never estimate one the organizer doesn't publish. Need-based or limited full aid is `full_possible`: filed under "Integral", labeled "Bolsa de até 100%".
- Keep filter matching in `src/hooks/use-opportunity-filters.ts`. When the verified data describes a type in prose, add a stem to `FILTER_ALIASES` in `filter-options.ts` instead of special-casing it in components.
- Colors come from the brand tokens in `globals.css`; each catalog passes its scope accent through `CatalogHeaderConfig.accentClassName`.
- Reuse `FilterDropdown` for multi-select filters; single choices use a native `<select>`.
- Card covers without a photo use the regional night maps in `public/catalog/` (see `catalog-model.ts` and `src/lib/geo.ts`).
- Map pins come from `localizacoes`: the list API resolves them from each record's city/state text (`src/server/geo/resolve-location.ts`, GeoNames), and the server pages resolve the verified set. Never hard-code coordinates for an opportunity.

## Architecture patterns

- `*-main.tsx` (per domain) fetches, merges verified + catalog data, applies filters and maps records to `CatalogItem` view models; `catalog-page.tsx` renders everything else.
- `CatalogPage` is generic over the item: each catalog passes a `CatalogPresentation` (card, row, sort, count/empty/contribute copy, optional map pins). Opportunities use `OPPORTUNITY_PRESENTATION`; programs bring their own (`src/components/programs/`).
- The header backdrop is either the territory's night map (`kind: "map"`) or a credited photograph (`kind: "photo"`).
- The age, deadline-window and verified controls render only when the catalog's filter state carries `idade`, `prazo` or `apenasVerificadas`.
- `catalog-page.tsx` gates results on hydration, so prerendered HTML never contains build-time deadlines or countdowns.
- Sort order lives in session storage per catalog; grid/list view in local storage.
- The mobile sheet edits a draft copy of the filters and previews the result count before applying.
