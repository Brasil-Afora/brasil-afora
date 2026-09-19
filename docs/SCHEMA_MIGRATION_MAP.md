# Schema migration map

All changes are additive. The migrations are ordered and are also executed from scratch by `src/db/migrations/migration.test.ts`.

| Migration | Adds or changes | Rollback posture |
| --- | --- | --- |
| `20260723224642_fixed_mantis` | canonical organizations, sources/documents/snapshots/runs/assertions/resolution, program/edition/round, structured eligibility, link/fit/gate/review/publication/outbox/idempotency/corrections; compatibility columns and indexes; `pg_trgm` | Disable structured-read flag first. Drop only new FKs/columns/tables after backup and after confirming no v1-only publication exists. |
| `20260723225823_add_audit_events` | append-only audit events and indexes | Retain by default; dropping loses operational evidence. |
| `20260723233636_lifecycle_maintenance` | edition-source links, recrawl queue/locks/dead-letter data, material-change events | Stop schedulers/workers, retain rows for audit, then drop in reverse dependency order if absolutely necessary. |

## Deployment sequence

1. Snapshot/backup the database and record migration table state.
2. Run `bun run db:migrate` in staging.
3. Run `bun run data:audit` without `--apply`; archive the JSON report.
4. Run `bun run data:audit -- --apply` only after review. It creates deterministic review tasks/audit events for canonically linked legacy rows and never guesses ambiguous corrections.
5. Deploy v1 writes and reviewer evidence with legacy reads.
6. Enable `NEXT_PUBLIC_STRUCTURED_OPPORTUNITIES=true` as a canary.
7. Keep automatic publication disabled; deliver only reviewer-approved outbox events.

## Rollback

Application rollback is preferred: turn off structured reads, stop ingestion/maintenance/outbox workers, and deploy the prior application. Additive tables remain harmless. Database reversal is a last resort: restore the pre-migration backup or apply a reviewed reverse migration in staging first. Never drop evidence tables to resolve an application deploy issue.

## Data audit

`bun run data:audit` reports passed deadlines, missing canonical linkage/edition, generic or conflated application URLs, placeholder images, missing eligibility/age, suspicious national modality, and duplicate candidates. Default is dry run. **Unknown:** production counts were not available in this workspace.

