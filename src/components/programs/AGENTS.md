# AGENTS - src/components/programs

## Folder purpose

Programas e Bolsas (`/programas-e-bolsas`): recurring programs such as scholarships, mentorships, prep and access programs, as opposed to one-off opportunities. It is the third catalog, next to Internacional and Nacional.

## Rules for agents

- Records live in `src/data/programs.ts` (hand-entered starter set) and are read only through `program-model.ts` (`getPrograms`, `getProgramById`). When programs move to the database, swap those two functions for a query hook; nothing else reads the list.
- Keep records to the vocabulary in `types.ts` (`PROGRAM_TYPES`, `PROGRAM_LEVELS`, `PROGRAM_BENEFITS`, `PROGRAM_MODALITIES`, `PROGRAM_DESTINATIONS`). The filters are built from those lists and match values exactly.
- Status (abertas, em breve, encerradas, ano todo, a confirmar) is derived from `inscricoes` dates on the client (`programStatus`). Never store a hand-set status, and never render it before hydration (`useIsClient`).
- A program never leaves the list when its round closes. It shows "Encerradas" with the next round's `previsao`.
- Programs are not on the map: no pins, no `/mapa`, no "Onde acontece" map card.
- The scope accent is Lilac (`text-lilac`). Buttons stay amber, and green stays reserved for the verified opportunity set: no "Verificada" badge here.
- A field the source doesn't state is left out of the record; the page says "Não informado" or shows a dashed note.

## Architecture patterns

- `programs-main.tsx` renders the shared `CatalogPage` with a `CatalogPresentation<ProgramItem>` (card, row, order, copy) and a photo header backdrop.
- `program-detail.tsx` composes the opportunity page's parts (`detail-parts.tsx`): hero, facts card, section tabs, step checklist (saved as `brasil-afora:etapas:program:<id>`), plus program-only sidebar cards (Inscrições with the round's dates, Quem oferece, Programas parecidos).
