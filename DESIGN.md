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
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 400
    letterSpacing: "0.05em"
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

The home page reads like a departure board: where, for whom, and until when, before anything else. A dusk skyline dissolves into deep navy; one hot amber marks what you can act on. The world was pinned by the owner's mockup (2026-09-21) and built code-first. Every reading surface uses Atkinson Hyperlegible Next, a face drawn for legibility, because the audience runs from 12-year-olds on phones to postgraduates.

**Key Characteristics:**
- Deep navy ground with hairline navy rules instead of heavy containers.
- A single amber for action, the active nav, urgent deadlines and drawn routes.
- Real photographs (campuses, a dusk skyline, a night map) as the only imagery; no illustration, no crests.
- Facts rendered as data: deadline dates in tabular figures, a countdown beside each.
- One handwritten note per page, on a photograph.

## Colors

### Primary
- **Signal Amber** (`signal-amber`): the primary button ("Buscar", "Enviar oportunidade"), the active nav underline, urgent countdowns, catalog links, and the drawn map routes. Hover lifts to **Bright Amber** (`signal-amber-bright`).

### Secondary
- **Funding Blue** (`funding-blue`): the first tag on a card, which states the funding fact ("Bolsa integral", "Bolsa variável") or the program type.
- **Atlantic Blue** (`atlantic-blue`): the international catalog's scope accent: the word "Internacionais" in its title, its header icon, the filter panel's icon and "Limpar filtros" link.
- **Verified Green** (`verified-green`): only the "Verificada" badge, with navy text for contrast.

### Neutral
- **Navy Ground** (`navy-ground`): page background.
- **Navy Header** (`navy-header`): header when scrolled, cards, panels, chips (usually at 60–70% over the ground).
- **Navy Field** (`navy-field`): the search field and hovered rows.
- **Navy Rule** (`navy-rule`) and **Strong Rule** (`navy-rule-strong`): 1px borders, dividers, icon rings.
- **Ink** (`ink`) for body text on navy; **Mist** (`mist`) for secondary text; **Mist Dim** (`mist-dim`) only for footer fine print.

### Named Rules
**The One Amber Rule.** Amber means "act here" or "this is close". It never decorates a heading, an icon ring or a background field, with one deliberate exception below.

**The Scope Accent Rule.** Each catalog owns one accent for its title word, header icon and filter-panel links: Atlantic Blue for Internacional, Signal Amber for Nacional (the pairing the site already used before the redesign). The map page takes Signal Amber too, the color of its lit countries. Buttons stay amber everywhere.

**The Scoped Trust Rule.** Green and the "Verificada" badge appear only on opportunities from the curated verified set. Catalog items never borrow them.

## Typography

**Display / reading:** Atkinson Hyperlegible Next (400–700).
**Wordmark:** Bebas Neue, only in the logo lockup ("BRASIL" white, "AFORA" amber).
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

A single centered container (`container`, 84rem) with a 20px gutter on phones and 32px from 640px up; the header shares the same container so the logo aligns with content. The desktop hero is a text column (max 44rem) over a photo that owns the right 58% of the band and bleeds to the viewport edge. Opportunity cards sit in one column on phones, two from 640px, and auto-fit columns of at least 17rem from 1280px. The why-list and map card pair up from 1024px (roughly 1 : 1.05). Category chips wrap on larger screens and become a single horizontally scrolling row on phones.

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

### Map page (/mapa)
The night-lights world at full resolution (EPSG:4326 tiles to zoom 4), always filling its frame and opening on the Atlantic. Countries with open opportunities glow amber in three steps (1, 2–4, 5+), blended in "screen" mode so their own city lights stay white; every other border is a faint mist line. Amber dots mark cities, and a white ring marks Brasília.
- **Choosing a country** (on the map, or in the list beside it) flies there. The outlines fade out during the flight and back in on landing, then the routes from Brasília draw themselves. The chosen country gets a brighter outline and a label. The choice is kept in the URL (`?pais=ca`), and the detail page's "Onde acontece" card links to it.
- **Panel:** the destinations list (small country silhouette, name, next deadline, count) plus "Fecham primeiro", the three nearest deadlines. For a chosen country it shows type chips that toggle the type filter, then that country's opportunities by deadline and a link to the catalog pre-filtered to it.
- **Filters:** search (country, city, institution, program), type, level, and "Apenas verificadas", all built from the data actually present.
- On phones the map comes first, and a "Ver lista" button jumps to the chosen country's list.

### Map teaser
The night-lights map of the Americas and Atlantic, brightened slightly, with amber routes drawn from Brasília to each open verified destination and pins for national ones, plus a country legend.

**The Drawn Line Rule.** The only motion is amber lines drawing themselves: the photo note's underline on load and the map routes as they scroll into view. Under reduced motion they render already drawn.

## Do's and Don'ts

### Do:
- **Do** show the deadline and a days-left countdown on every opportunity surface; turn the countdown amber at 21 days or fewer.
- **Do** credit every sourced photograph (see `public/home/SOURCES.md`, `public/opportunities/showcase/SOURCES.md`).
- **Do** keep reading text in Atkinson Hyperlegible Next at 13px or larger.

### Don't:
- **Don't** put eyebrow/kicker labels above headings.
- **Don't** use amber as decoration or green outside the verified set.
- **Don't** draw fake university crests or logos; use the institution name with a landmark icon.
- **Don't** add a second handwritten note or a second motion idea.
