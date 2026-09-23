---
name: Brasil Afora
description: Academic opportunities for Brazilian students, in Brazil and abroad — dusk navy, one hot amber, verified facts up front.
colors:
  navy-ground: "#03111f"
  navy-header: "#071628"
  navy-surface: "#0a1c31"
  navy-field: "#0e233a"
  navy-rule: "#1a3148"
  navy-rule-strong: "#2a4563"
  ink: "#f1f5f9"
  mist: "#aabad4"
  mist-dim: "#8093b0"
  signal-amber: "#ff9b0f"
  signal-amber-bright: "#ffb33f"
  funding-blue: "#1d4fc0"
  atlantic-blue: "#5b9bff"
  lilac: "#b9a2ff"
  verified-green: "#0cb261"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "clamp(2.3rem, 1.1rem + 3vw, 3.6rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.25
  title-sm:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  panel-title:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
  card-title:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.375
  body-lede:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.625
  body-lg:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  ui:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.35
  micro:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
  wordmark:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    letterSpacing: "-0.02em"
  hand:
    fontFamily: "Caveat, cursive"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 0.95
rounded:
  tag: "9999px"
  field: "14px"
  card: "14px"
  panel: "18px"
spacing:
  gutter-mobile: "20px"
  gutter: "32px"
  container: "1344px"
  stack: "20px"
  section: "56px"
components:
  button-primary:
    backgroundColor: "{colors.signal-amber}"
    textColor: "{colors.navy-ground}"
    rounded: "{rounded.field}"
    height: "48px"
    padding: "0 24px"
  button-primary-hover:
    backgroundColor: "{colors.signal-amber-bright}"
  button-outline:
    textColor: "{colors.ink}"
    rounded: "{rounded.tag}"
    height: "40px"
    padding: "0 20px"
  search-field:
    backgroundColor: "{colors.navy-field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    height: "56px"
  chip:
    backgroundColor: "{colors.navy-header}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tag}"
    height: "40px"
    padding: "0 16px"
  card:
    backgroundColor: "{colors.navy-header}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  tag-funding:
    backgroundColor: "{colors.funding-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.tag}"
    padding: "4px 10px"
  badge-verified:
    backgroundColor: "{colors.verified-green}"
    textColor: "{colors.navy-ground}"
    rounded: "{rounded.tag}"
    padding: "4px 10px"
---

# Design System: Brasil Afora

## Overview

**Creative North Star: "The Departure Board at Dusk"**

The home page reads like a departure board: where, for whom, and until when, before anything else. Universities at night dissolve into deep navy (by day, on paper, in the light theme); one hot amber marks what you can act on. The world was pinned by the owner's mockup (2026-09-21) and built code-first. Every reading surface uses Atkinson Hyperlegible Next, a face drawn for legibility, because the audience runs from 12-year-olds on phones to postgraduates.

**Key Characteristics:**
- Deep navy ground with hairline navy rules instead of heavy containers.
- A single amber for action, the active nav, urgent deadlines and drawn routes.
- Real photographs (campuses and libraries by night and by day, a night map) as the only imagery; no illustration, no crests.
- Facts rendered as data: deadline dates in tabular figures, a countdown beside each.
- One handwritten note per page, on a photograph.

## Colors

### Primary
- **Signal Amber** (`signal-amber`): the primary button ("Buscar", "Enviar oportunidade"), the active nav underline, urgent countdowns, catalog links, and the drawn map routes. Hover lifts to **Bright Amber** (`signal-amber-bright`).

### Secondary
- **Funding Blue** (`funding-blue`): the first tag on a card, which states the funding fact ("Bolsa integral", "Bolsa variável") or the program type.
- **Atlantic Blue** (`atlantic-blue`): the international catalog's scope accent: the word "Internacionais" in its title, its header icon, the filter panel's icon and "Limpar filtros" link.
- **Lilac** (`lilac`, `#5f45b8` on paper): the Programas e Bolsas scope accent, in the same three places. It's the only hue that reads apart from amber, both blues and green without borrowing a meaning from them.
- **Verified Green** (`verified-green`): only the "Verificada" badge, with navy text for contrast.

### Neutral
- **Navy Ground** (`navy-ground`): page background.
- **Navy Header** (`navy-header`): header when scrolled, cards, panels, chips (usually at 60–70% over the ground).
- **Navy Field** (`navy-field`): the search field and hovered rows.
- **Navy Rule** (`navy-rule`) and **Strong Rule** (`navy-rule-strong`): 1px borders, dividers, icon rings.
- **Ink** (`ink`) for body text on navy; **Mist** (`mist`) for secondary text; **Mist Dim** (`mist-dim`) only for footer fine print.

### Named Rules
**The One Amber Rule.** Amber means "act here" or "this is close". It never decorates a heading, an icon ring or a background field, with one deliberate exception below.

**The Scope Accent Rule.** Each catalog owns one accent for its title word, header icon and filter-panel links: Atlantic Blue for Internacional, Signal Amber for Nacional (the pairing the site already used before the redesign), Lilac for Programas e Bolsas. The map page takes Signal Amber too, the color of its lit countries. Buttons stay amber everywhere.

**The Scoped Trust Rule.** Green and the "Verificada" badge appear only on opportunities from the curated verified set. Catalog items never borrow them.

## Typography

**Display / reading:** Atkinson Hyperlegible Next (400–700).
**Wordmark:** Sora 600, only in the logo lockup ("Brasil" white, "Afora" amber, Title Case).
**Hand:** Caveat 600, only for the single photo note.

### Hierarchy
- **Display** (`display`): the hero headline, two lines at desktop, balanced.
- **Headline** (`headline`): section titles such as "Oportunidades selecionadas" (1.75rem on mobile).
- **Title** (`title`): panel titles (why-list, map card, contribute band).
- **Card title** (`card-title`): opportunity names, balanced, up to three lines.
- **Title small / panel title** (`title-sm`, `panel-title`): result counts and empty-state titles (20px); the filter panel and mobile sheet titles (18px).
- **Body lede / body** (`body-lede`, `body-lg`, `body`): hero promise at 17px, page subtitles at 16px, section copy at 15px, measure capped near 37rem.
- **UI** (`ui`): controls, chips, meta rows and card details at 14px.
- **Label / caption / micro** (`label`, `caption`, `micro`): field labels and institution lines (13px), tags and badges (12px), the compact logo-tile monogram (11px); dates use tabular figures.

### Named Rules
**The No Kicker Rule.** Headings carry their own weight. No eyebrow or tracked-caps label sits above a heading, even though the reference mockup had them.

## Layout

A single centered container (`container`, 84rem) with a 20px gutter on phones and 32px from 640px up; the header shares the same container so the logo aligns with content. The desktop hero is a text column (max 44rem) over a photo that owns the right 58% of the band and bleeds to the viewport edge (in the light theme, a plate beside the column instead). Opportunity cards sit in one column on phones, two from 640px, and auto-fit columns of at least 17rem from 1280px. The why-list and map card pair up from 1024px (roughly 1 : 1.05). Category chips wrap on larger screens and become a single horizontally scrolling row on phones.

## Elevation & Depth

Flat, layered by tone: surfaces are navy tints separated by 1px rules. Shadows appear only on things that float or lift: the search results popover, a card lifted 4px on hover, the verified badge over photos, and the header once the page scrolls (solid navy; no backdrop blur, which would trap the fixed mobile drawer). Shadows always have a vertical offset and soft blur.

**The Hairline Rule.** Separate with a 1px navy rule before reaching for a shadow or a filled container.

## Shapes

Tags, chips, outline buttons and badges are full pills (`tag`). Fields and cards share one gentle radius (`field`, `card`, 14px); larger panels step up to 18px (`panel`). Photos are cropped to their card edge; no masks approximating shapes, except soft gradient fades where the hero photo dissolves into the navy.

## Components

### Buttons
- **Primary:** amber fill, navy label, 48px tall (the search button fills the 56px field height). Hover to bright amber.
- **Outline:** 40px pill, amber border at ~70%, white label; fills amber with navy text on hover ("Abrir mapa").

### Chips
Category shortcuts: 40px pills on translucent navy with a navy rule, a 16px lucide icon in mist, and a label in ink; the border warms to amber on hover and focus. Each opens a catalog with its filter pre-applied.

### Cards / Containers
Opportunity card: 160px photo on top with the green "Verificada" badge, then institution line (mist, landmark icon), title, a meta list (place, level, deadline with countdown), tags, and a footer rule holding "Fonte oficial ↗" (opens the official page) and "Ver detalhes →". The whole card is one link via the title; the source link sits above it. Lifts 4px and brightens its rule on hover.

### Inputs / Fields
Search: 56px field on navy field color, search icon in mist, amber caret; focus warms the border to amber with a soft amber halo. Results open as a popover listbox (keyboard: arrows, Enter, Escape) with a result count, verified badges, and links to both catalogs.

### Navigation
Header: logo lockup left, four centered links at 15px, profile menu right. The active link is amber with a 2px amber underline that grows from the left on hover. Transparent over the page until scroll, then solid navy with a hairline and a soft shadow.

### Catalog pages (Internacional, Nacional)
- **Header:** breadcrumb, a 64px icon ring and a two-tone title (scope accent on the last word) over a night-lights map of the catalog's territory, with amber pins where the listed opportunities take place. No handwritten note here (owner's call, 2026-09-21).
- **Filter panel:** a sticky 19rem card of labeled fields (multi-select dropdowns, age, deadline window, a green "Apenas verificadas" switch) with the contribute card below it. On phones the same fields live in a bottom sheet whose apply button previews the result count.
- **Opportunity card:** 160px cover (the photo, or the regional night map with the institution's logo or monogram on a white tile), status badge ("Verificada" green, "Prazo próximo" amber), institution, title, tags, meta list (place, deadline, audience), and a footer with the countdown and a round arrow that fills amber on hover.
- **List row:** thumbnail, institution and title, place and level, a stacked deadline column, arrow. Grid or list is the reader's choice and is remembered.
- **Pagination:** nine per page; the current page is an amber square.

### Opportunity page
Built only from what the scraper and catalog actually carry; a field the source doesn't state reads "Não informado", and a missing section says so in a dashed note instead of filler. No quotes, FAQ or document lists (the scraper doesn't extract them).
- **Hero:** breadcrumb, institution tile, title, the description's first sentence, and "Acessar site oficial" / "Salvar" (catalog entries only) / "Compartilhar", over the cover dissolving in from the right.
- **Facts card:** place, level, funding or type, duration, age or grade, language or modality, fee and deadline, each with a lucide icon.
- **Sections:** Visão geral, Quem pode participar, Custos e benefícios, Como se candidatar, under a sticky tab bar that sits flush under the header and follows the scroll. Requirements are neutral bullets, not green checks.
- **Application steps:** the student's own checklist. Each step is a native checkbox drawn as a numbered ring; ticked steps fill ink with a check, the first unticked one gets an amber ring and "Próxima etapa", and a segmented bar counts progress. Nothing is inferred from dates. Progress is kept per opportunity in this browser (`brasil-afora:etapas:<scope>:<id>`) until it moves to the profile as "applications in progress".
- **Sidebar:** deadline card with countdown and CTA, source card (verified: checked on the official source and when; catalog: last update and the official domain), a mini map with the place's pins, and three similar open opportunities. On phones a bottom bar keeps the deadline and "Site oficial" in reach.

### Programas e Bolsas (/programas-e-bolsas)
The third catalog: recurring programs (bolsas, mentorias, preparatórios, programas de acesso, intercâmbios, formação) rather than one-off opportunities. It sits in the nav between Nacional and Mapa ("Programas" below 1024px), and a home chip ("Mentorias e preparatórios") opens it pre-filtered.
- **Header:** the catalog header with a photograph instead of a map: the Suzzallo Library reading room, lamps lit. The other two headers show the night lights of a territory; this one shows the lights where the preparation happens. It dissolves into the navy like the maps, and on paper it becomes a plate that starts where the copy column ends (a dark photo can't fade into paper). Credited under the photo.
- **Not on the map.** Programs have no pins, no "Onde acontece" map card, and no presence on /mapa.
- **Time is a round, not a deadline.** An opportunity counts down to one date and disappears after it; a program stays listed and shows where its enrollment round stands: *Abertas · faltam N dias* (amber dot, amber text within 21 days, plus the "Prazo próximo" badge), *Em breve* (ringed dot, with the forecast), *Encerradas* (with the next round), *Inscrições o ano todo*, or *Datas a confirmar* (with the source's note). Derived from dates on the client, never stored.
- **Card:** the opportunity card's shell and cover (night map of the destination with the organization's icon on a white tile). The funding-blue tag is the program type, or the scholarship's size for a Bolsa; up to two benefit tags follow. Meta rows: para quem, formato (modalidade · duração), destino. The footer holds the round status instead of a countdown.
- **Filters:** tipo, para quem (nível), o que oferece, para estudar (no Brasil / no exterior), modalidade, inscrições. No age, deadline-window or verified controls: the sources state none of them.
- **Program page:** the opportunity page's hero, facts card, section tabs (Visão geral, Para quem é, O que oferece, Como participar) and step checklist. The sidebar has an "Inscrições" card with the round's dates, a "Quem oferece" card, and related programs. No "Salvar" yet (favorites are database-backed; programs aren't there yet), and no verification language: programs are catalog information.

### Map page (/mapa)
The night-lights world at full resolution (EPSG:4326 tiles to zoom 4), always filling its frame and opening on the Atlantic. Countries with open opportunities glow amber in three steps (1, 2–4, 5+), blended in "screen" mode so their own city lights stay white; every other border is a faint mist line. Amber dots mark cities, and a white ring marks Brasília.
- **Choosing a country** (on the map, or in the list beside it) flies there. The outlines fade out during the flight and back in on landing, then the routes from Brasília draw themselves. The chosen country gets a brighter outline and a label. The choice is kept in the URL (`?pais=ca`), and the detail page's "Onde acontece" card links to it.
- **Panel:** the destinations list (small country silhouette, name, next deadline, count) plus "Fecham primeiro", the three nearest deadlines. For a chosen country it shows type chips that toggle the type filter, then that country's opportunities by deadline and a link to the catalog pre-filtered to it.
- **Filters:** search (country, city, institution, program), type, level, and "Apenas verificadas", all built from the data actually present.
- On phones the map comes first, and a "Ver lista" button jumps to the chosen country's list.

### Profile page (/perfil)
Only what the account and this browser actually hold; the mockup's academic profile, alerts and saved searches have no data behind them and are left out.
- **Header:** avatar (photo or initials), "Olá, {first name}", and the night map pinned where the student's own opportunities are. Three counts link down the page: em andamento, salvas na conta, prazos em 30 dias.
- **Em andamento:** every opportunity with a status, a task or a ticked step, saved or not. A row shows cover, institution, name, place, deadline, a neutral progress bar (steps and tasks) and a status pill (Preparando, Inscrição enviada, Aprovado in white). Pin keeps it on top. Opening it shows the source's steps (the same checklist as the opportunity page, kept in sync), a status control and the student's own tasks; removing a task offers "Desfazer". Marking "Aprovado" throws a short confetti burst (not under reduced motion).
- **Salvas:** saved opportunities not yet started, as cards with a filled heart to remove (confirmed) and "Começar", which moves one to Em andamento.
- **Parecidas com as suas:** three open catalog cards of the same type or country.
- **Sidebar:** "Prazos próximos" (open, not yet sent, within 30 days; amber within 21) and "Sua conta" (name, email, member since, a line saying the tracking lives in this browser, admin link, Sair).

### Hero photo

One pool of twenty-four Wikimedia Commons photos (`src/components/homepage/hero-photos.ts`), universities rather than skylines, shared by both themes (owner, 2026-09-22): the same photo appears on the navy ground and on the paper plate, and only the grade changes. The pool mixes golden hour, blue hour, night, warm interiors and daylight, and covers the destinations the catalog actually sends students to — Edinburgh, Harvard, MIT, Oxford, Cambridge, Columbia, Princeton, Stanford, Yale, Toronto, UBC, Trinity College Dublin, Coimbra, Heidelberg, the Suzzallo reading room, and four Brazilian ones (USP's Museu Paulista, UFRJ, UFPR and Rio's Real Gabinete Português de Leitura). Coimbra is there because it takes ENEM, and Yale, Toronto and UBC appear on the home's verified cards. The `day/` and `night/` folders describe the light in the photo, not the theme.

- Only the current, previous and next photos are mounted, and a photo fades in only once it has loaded. The first photo is preloaded; the rest load lazily as the rotation reaches them.
- The start photo is keyed to the hour on the server (the page revalidates hourly), so returning visitors don't always open on the same city and nothing swaps after hydration.
- Each photo carries its own focal point (`position`). Night subjects sit center-right, where the dissolve is opaque. An optional `tone` overrides the grade (Edinburgh keeps its warm dusk grade).
**The Low-Key Night Rule.** On the navy ground every photo is brought to roughly the same level, so it sits behind the headline instead of competing with it: Edinburgh is the reference (mean luminance ~72–80 in the visible part of the frame), and `toneDark` pulls the brighter ones down — a sunlit campus lands around 0.5 brightness, which turns its blue sky into deep navy. Deep-night photos were tried and dropped (owner, 2026-09-22): a lit building against black goes grey or glows like a box, while a warm sky behind a dark subject melts into the navy. On the paper plate the reverse applies: the darkest photos get a `toneLight` lift so they read as prints rather than black rectangles. A photo brighter than that, or one with a cold or green cast, gets a per-photo `tone` that pulls it into line — green especially, because green belongs to "Verificada" and a floodlit lawn muddles that signal. Measured before and after in the session that added the set (2026-09-22); the range now runs 31–79. Photos that can't be graded into the set are replaced, not kept.

- One image is mounted per slide and the themes share it, so nothing loads twice and flipping the theme keeps the picture on screen.
- Its credit (place · Foto: author, license, both linked) shows under the photo while it is on screen; the footer says so. Sources and changes are in `public/home/SOURCES.md`.

### Map teaser
The night-lights map of the Americas and Atlantic, brightened slightly, with amber routes drawn from Brasília to each open verified destination and pins for national ones, plus a country legend.

**The Drawn Line Rule.** The only drawn motion is amber lines drawing themselves: the photo note's underline on load and the map routes as they scroll into view. Under reduced motion they render already drawn.

**The Hero Photo Exception.** The one other motion, asked for by the owner (2026-09-22): the hero photo slowly crossfades through its set (8s hold, 1.6s fade, the incoming photo settling from a 3.5% scale). It holds still under reduced motion and in hidden tabs, and a pause button sits beside the credit. Nothing else on the page fades or slides.

## Light theme

Dark navy stays the default. The academic light theme (Fundação Estudar-inspired: warm paper, navy ink, golden amber for action) applies under `[data-theme="light"]`, toggled by the sun/moon button in the header and persisted in `localStorage` + cookie (`ba-theme`, see `src/hooks/use-theme.ts`). A `next/script` bootstrap in `src/app/layout.tsx` applies the stored value before first paint.

- **Tokens:** navy ground/surface/field/rule remap to paper/white/inset/hairline (`#faf7f1` → `#ddd2bd`); `mist`/`mist-dim` deepen to ink tones; `atlantic` deepens to `#1e56c8`; the slate ramp flips (900/950 become white/paper wells, 100/200 become ink). Amber fills keep the brand `#ff9b0f`; amber *text* deepens to `#b45309` for contrast. (Keep `@theme` non-inline in `globals.css` — `inline` bakes token values into utilities and the light remap stops working.)
- **Bridges:** hard-coded `text-white` on grounds that become paper flips to ink, except on fills that stay dark (fund/blue/red/slate-700 badges) and on photography (the handwritten note). Labels on amber fills are pinned to deep navy in either theme.
- **Header:** goes solid paper in light mode (no transparent-over-photo state).
- **Photography** (hero, catalog maps, covers, night map) stays as-is; white text over photos stays white. The hero pool is shared with the dark theme and only its grade changes (see The Low-Key Night Rule).
- **Hero photo is a plate, not a dissolve.** A dark photo can't fade into paper: every step of the fade mixes shadow with cream into a grey smear, so light mode drops the masks and fades. On desktop the photo is a hard-edged plate beside the text block, aligned to its top and bottom, rounded (18px) on the left and bleeding off the right edge; the copy column (chips included) narrows to clear it, and the credit sits under the plate like a print caption. On phones it is an inset 18px print above the headline. The plate shows a paper-dark tone (`navy-800`) until its photo loads. The handwritten note stays on the photo, white, over a soft shade.

## Do's and Don'ts

### Do:
- **Do** show the deadline and a days-left countdown on every opportunity surface; turn the countdown amber at 21 days or fewer.
- **Do** credit every sourced photograph (see `public/home/SOURCES.md`, `public/opportunities/showcase/SOURCES.md`).
- **Do** keep reading text in Atkinson Hyperlegible Next at 13px or larger.

### Don't:
- **Don't** put eyebrow/kicker labels above headings.
- **Don't** use amber as decoration or green outside the verified set.
- **Don't** draw fake university crests or logos; use the institution name with a landmark icon.
- **Don't** add a second handwritten note or a motion idea beyond the drawn lines and the hero crossfade.
