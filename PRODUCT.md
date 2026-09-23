# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Brazilian students at every level, from the final years of ensino fundamental (8º/9º ano) through ensino médio, graduação and pós-graduação, looking for academic opportunities they are eligible for, in Brazil and abroad. Confirmed 2026-09-21: the home page speaks to all levels, not only high school.

## Product Purpose

Brasil Afora gathers academic opportunities (bolsas de estudo, summer programs, intercâmbios, olimpíadas, feiras científicas, and other programs) in one free place, so a student can find what fits their level, age and interests, and act before the deadline. Success means a student leaves with an opportunity they are eligible for and the official link to apply.

## Positioning

A curated "Verificada" selection whose eligibility for Brazilian students, deadlines and official links were checked against official sources on a recorded date, shown next to a broader national and international catalog.

## Operating Context

- Two catalogs: internacionais and nacionais, each with filters (idade, nível de ensino, tipo, taxa; plus país, idioma and tipo de bolsa for internacionais, modalidade for nacionais). Filters persist per session.
- A third section, Programas e Bolsas (`/programas-e-bolsas`), for recurring programs: scholarships, mentorships, prep and access programs. It is a hand-entered starter set in `src/data/programs.ts` until the scraper/admin model is decided. Programs stay listed when a round closes (with the next round's forecast), and they are not on the map.
- Detail pages per opportunity; a world map (`/mapa`) where clicking a country lists its opportunities.
- Public reading without an account; an account is only needed to save favorites. Admins create and edit opportunities.
- New opportunities can be suggested through a Google Form; contact is by e-mail (passaporteglobalbr@gmail.com).

## Capabilities and Constraints

- Next.js 16 App Router, Tailwind CSS 4, Biome/Ultracite, Drizzle + PostgreSQL, Better Auth, TanStack Query. UI copy is Portuguese (pt-BR).
- Expired opportunities (deadline before today) are hidden from listings.
- Verification claims apply **only** to the curated set in `src/data/showcase-opportunities.json` (`verifiedAt`). The wider catalog must not be described as verified. Confirmed 2026-09-21.

## Brand Commitments

- Name: Brasil Afora. Wordmark "Brasil" white plus "Afora" amber in Sora 600 (Title Case), with `public/logo-20260413.png`.
- Dark navy ground with amber as the brand accent.
- The home page follows the mockup the owner supplied on 2026-09-21 (dark navy hero with a dusk city photo, search bar, category chips, verified opportunity cards, why-strip and map teaser).

## Evidence on Hand

- Curated opportunities with images and licenses: `src/data/showcase-opportunities.json`, `public/opportunities/showcase/` (sources in `SOURCES.md`).
- Home hero photos: twenty-four university photos from Wikimedia Commons, shared by both themes (`public/home/edinburgh-evening-skyline.jpg` and `public/home/hero/`), each credited on the page while shown and in `public/home/SOURCES.md`.
- World night map: `public/map.jpg`.
- No testimonials, user counts, partner logos or institution crests exist. Do not fabricate them.

## Product Principles

1. Eligibility and deadline first: a student should see where, for whom and until when before anything else.
2. Claim only what the data proves; verification language stays scoped to the verified set.
3. Brazil and the world side by side. National opportunities are not a lesser tier.
4. Free to explore: no account wall in front of reading.

## Accessibility & Inclusion

Content is free and meant to be simple to read ("100% acessível" is an existing promise on the home page). Audience includes younger students (from about 12 years old) reading on phones.
