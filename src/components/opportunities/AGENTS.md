# AGENTS - src/components/opportunities

## Folder purpose

The shared catalog used by the international and national listing pages (`catalog-*`), plus filter options and shared types.

## Rules for agents

- Verified and catalog opportunities form one list: filters, sorting and pagination apply to both. Only the curated set gets the "Verificada" badge.
- Keep filter matching in `src/hooks/use-opportunity-filters.ts`. When the verified data describes a type in prose, add a stem to `FILTER_ALIASES` in `filter-options.ts` instead of special-casing it in components.
- Colors come from the brand tokens in `globals.css`; each catalog passes its scope accent through `CatalogHeaderConfig.accentClassName`.
- Reuse `FilterDropdown` for multi-select filters; single choices use a native `<select>`.
- Card covers without a photo use the regional night maps in `public/catalog/` (see `catalog-model.ts` and `src/lib/geo.ts`).
- Map pins come from `localizacoes`: the list API resolves them from each record's city/state text (`src/server/geo/resolve-location.ts`, GeoNames), and the server pages resolve the verified set. Never hard-code coordinates for an opportunity.

## Architecture patterns

- `*-main.tsx` (per domain) fetches, merges verified + catalog data, applies filters and maps records to `CatalogItem` view models; `catalog-page.tsx` renders everything else.
- `catalog-page.tsx` gates results on hydration, so prerendered HTML never contains build-time deadlines or countdowns.
- Sort order lives in session storage per catalog; grid/list view in local storage.
- The mobile sheet edits a draft copy of the filters and previews the result count before applying.
