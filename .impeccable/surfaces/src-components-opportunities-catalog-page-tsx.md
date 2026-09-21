---
version: 1
slug: "src-components-opportunities-catalog-page-tsx"
primary_target: "src/components/opportunities/catalog-page.tsx"
related_targets: ["src/components/international-opportunities/internacional-main.tsx","src/components/national-opportunities/nacional-main.tsx"]
---

# Surface: Catalogs (`/oportunidades/internacionais`, `/oportunidades/nacionais`)

Mode: Operate (find and compare). Audience: Brazilian students at every level scanning for something they can apply to before the deadline. Task: narrow by type, level, place, age and deadline; compare; open a detail page. Constraints: expired items stay hidden; verification language only on the curated set; real catalog is small and mostly favicon-only, so sparse states must look intentional; no alerts feature exists (the mockup's "Criar alerta" was replaced by the submission form).

## Direction contract

THESIS: One honest list per territory. It refuses the old split between a "verified" box and a legacy grid: verified and catalog items share one grid, one set of filters, one order.
OWN-WORLD: The home page's world (DESIGN.md), plus a scope accent (Atlantic Blue for Internacional, Signal Amber for Nacional) and regional night-map covers with logo tiles for records without photos.
STORY: A student sees how many opportunities are open, narrows them with filters that also cover the verified set, spots deadlines at a glance, and opens one.
FIRST VIEWPORT: Breadcrumb, icon ring and two-tone title left; the territory's night map right with pins where the current results are; below, the sticky filter panel and the first row of three cards.
FORM: Owner-pinned mockup (2026-09-21), with the owner's permission to take liberties; the handwritten note was removed at the owner's request. Code-led.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Signature interaction: the mobile filter sheet previews "Mostrar N resultados" live before applying; header pins follow the current results.

Unresolved: detail pages (`/[id]`) still use the previous visual style.
