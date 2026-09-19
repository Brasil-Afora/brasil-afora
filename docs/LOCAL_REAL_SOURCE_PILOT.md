# Local real-source pilot

## Scope and truth boundary

On 2026-07-23 the complete manual-publication path ran on one Mac using a clean
PostgreSQL 17 database and the local Next.js application. The source was the
official Ifes page for **PS 49/2026 – Processo Seletivo Unificado – Cursos de
Graduação**.

This is stronger evidence than a fixture test, but it is not a staging or
production deployment. The later deadline-extension exercise used a clearly
labelled, controlled copy of the captured source to prove material-change
handling. It must not be interpreted as a real Ifes deadline extension.

## Executed path

1. Provisioned an empty local PostgreSQL database.
2. Applied every migration to the empty database.
3. Seeded one local-only admin reviewer through the guarded bootstrap command.
4. Started the website with separate local ingestion, maintenance, and outbox
   credentials.
5. Fetched the live official Ifes page and submitted the strict v1 ingestion.
6. Reviewed captured evidence in the browser, corrected uncertain fields, and
   approved publication version 19.
7. Ran application-link verification against the official form.
8. Delivered the transactional outbox event.
9. Verified the structured API, legacy compatibility API, national listing,
   detail page, representative image, deadline, and `Aplicar agora` action.
10. Scheduled, claimed, executed, and completed an unchanged recrawl. The
    semantic replay preserved reviewer corrections and created no new version.
11. Submitted a controlled deadline-extension capture. The same source document
    resolved to the existing edition, version 20 became `update_pending`, and
    the old approved projection remained public.
12. Reviewed the material changes, approved version 29, delivered the second
    outbox event, and verified the updated public record.
13. Dumped the complete database, restored it into a fresh temporary database,
    verified 33 tables, one public row, and publication version 29, then removed
    the temporary drill database.

## Defects exposed and fixed

- Empty PostgreSQL could not migrate because legacy base tables were assumed.
- Python and TypeScript taxonomy values used incompatible labels.
- Page authors were mistaken for opportunity organizers.
- Accessibility/navigation text created false start and end dates.
- Publication dates and fee-waiver dates could outrank the real application
  deadline.
- Generic `course` classification survived alongside the more specific
  `degree`.
- HTML entities remained in descriptions.
- Review tasks without candidate assertions had no correction form.
- Reviewers could not correct fields that had no automatically opened task.
- Scalar collection corrections were serialized as arrays.
- Nullable incorrect fields could not be cleared.
- Reviewer corrections changed only the display projection, not canonical
  round, eligibility, classification, edition, or organizer records.
- The application-link checker used an obsolete Node DNS callback shape and
  reported a valid URL as invalid.
- Link-check network errors were mislabeled as invalid URLs.
- Approved editions resurfaced because the queue selected old review versions
  after filtering out the latest approved version.
- A corrected organizer changed the scraper's proposed program identity and
  risked duplicate editions. Recrawls now anchor to the edition already linked
  to the exact source document.
- Tracking-parameter removal and numeric formatting produced false material
  changes.
- Compatibility-table updates left education and other fields stale after a
  newly approved version.

## Verified result

- One canonical program and one canonical edition.
- Two stored semantic snapshots: the live capture and controlled changed
  capture.
- Zero open review tasks after both approvals.
- Two successfully delivered outbox events.
- One national public row.
- Latest structured/publication version: 29.
- Latest application-link state: `current_and_open`, HTTP 200, with a visible
  application form.
- Unchanged recrawl completed with `material_change=false`.
- Controlled material update created five material-change events and remained
  isolated from the public record until approval.
- Validation at the original run passed: 90 scraper tests at 84.52% coverage,
  20 website tests, lint, TypeScript checking, and a complete Next.js
  production build. After the semantic-state replay the suites contain 103
  scraper tests and 43 website tests, with lint, type checking, and production
  build passing again.

## Remaining production blockers

- Repeat this path on a separately deployed staging environment.
- Run a 10–20-source controlled pilot and build the labelled gold corpus.
- Measure field precision/recall and reviewer correction time by source cohort.
- Add production metrics, alerts, image rights/provenance checks, and PDF
  sandbox/storage limits.
- Implement selected-version rollback.
- Test accessibility, load, worker recovery, and backup restore in the deployed
  environment.
- Keep every source on mandatory human approval until cohort-specific evidence
  justifies narrower automation.

## Semantic-state replay — 2026-07-25

The controlled IFES fixture was replayed after the semantic-state migration.
All 51 policy fields were persisted with independent value, state,
applicability, source coverage, display, and gate information. A real title
conflict blocked approval, the reviewer selected the full source heading as a
new evidence assertion, version 35 was approved, and outbox delivery replaced
the public projection. Historical audit tasks and stale outbox events were
superseded without overwriting the new public version. Final state: zero open
review tasks and zero pending or dead-lettered outbox events. See
`SEMANTIC_STATE_MIGRATION_REPORT.md`.
