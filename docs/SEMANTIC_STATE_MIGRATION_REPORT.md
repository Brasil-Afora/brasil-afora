# Semantic-state migration report

## Migration

`20260725213000_semantic_field_states/migration.sql` is additive and
idempotent. It creates three enums, four normalized tables, indexes, and a
conservative historical backfill for all 51 policy fields. Historical values
are not trusted merely because a legacy display column is populated: they are
backfilled as `pending_verification` with `unknown` source coverage.

Fresh-database and idempotent replay behavior are covered by the PGlite
migration suite.

## Local PostgreSQL execution — 2026-07-25

Scope: one local IFES edition with 32 historical publication versions.

- Final normalized backfill: 1,632 semantic states (`32 × 51`) and matching
  applicability, coverage, and display rows.
- Initial current-version dry run: 102 findings — 51 insufficient-coverage
  findings and 51 review-required findings. No generic placeholder, false
  unrestricted, false not-applicable, extraction-failure, or conflict finding
  was silently corrected.
- Apply mode inserted one consolidated review task for the affected current
  version. A second apply is idempotent.
- An evidence-backed IFES recapture created version 34, superseded historical
  migration tasks, and persisted all 51 new field states.
- The recapture exposed one real critical conflict in the title. A reviewer
  selected the full official heading with evidence, creating version 35.
- Approval was blocked until the title state changed from `conflicting` to
  `explicit_value`.
- Outbox delivery published version 35. The approved older projection remained
  public until delivery.
- Final operational state: zero open review tasks, zero pending/dead-lettered
  outbox events, and the public API serving version 35.
- Final dry-run distribution: 22 safe field evaluations, 29
  insufficient-coverage findings, and 29 review-required findings. The
  remaining uncertainty is primarily fields whose complete edital was not
  processed; it is visible, not guessed, and has no critical blocker on the
  approved controlled record.

The replay uses a clearly labelled controlled fixture derived from the prior
local IFES pilot. It is engineering evidence, not a claim that the controlled
deadline extension occurred on the live IFES site.

## Rollback

Preferred rollback is application-level:

1. Stop ingestion, reviewer writes, maintenance workers, and outbox delivery.
2. Disable structured reads with `NEXT_PUBLIC_STRUCTURED_OPPORTUNITIES=false`
   and deploy the previous application build.
3. Keep the additive tables in place; older code does not read them.
4. If schema reversal is mandatory, restore the verified pre-migration
   PostgreSQL backup into a new database, validate row counts and outbox state,
   switch the connection string, then resume workers.

Do not drop the semantic tables in place while publication versions or audit
records may depend on them. Never rewrite or delete historical publication
versions to simulate rollback.
