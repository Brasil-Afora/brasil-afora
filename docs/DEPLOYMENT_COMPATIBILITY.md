# Deployment compatibility matrix

Each row is **measured** — executed against PostgreSQL (the 2026-09-20
production-shaped clone, or the release gate's hosted PostgreSQL 17) — or
**reasoned** from code that was read but not run. Reasoned rows are never
counted as evidence.

Definitions:

- **Old DB** — production's schema *as expected*: 8 tables from
  `drizzle-kit push` at `f0a2ceb`, no `drizzle.__drizzle_migrations` journal.
  Production was not reachable; the rollout's first precondition diffs the
  real schema against this before anything else runs.
- **New DB** — after all seven migrations: 38 tables, 495 columns, 7 journal
  rows.
- **Old web** — `f0a2ceb`, serving production today. No `/api/v1/*` routes.
- **Baseline web** — `ffdffe2`, the previous release baseline (never deployed).
  Maintenance routes accept only `MAINTENANCE_WORKER_TOKEN`.
- **New web** — this release.
- **Old worker** — Python `189459f`; sends `MAINTENANCE_WORKER_TOKEN`. Never
  deployed to production.
- **New workers** — this release: Python source worker (`SOURCE_WORKER_TOKEN`)
  and the link worker (`LINK_WORKER_TOKEN`, no database credential).

## Matrix

| # | DB | Web | Source worker | Link worker | Safe? | Evidence |
| - | -- | --- | ------------- | ----------- | ----- | -------- |
| 1 | Old | Old | — | — | ✅ current production | live site |
| 2 | New | Old | — | — | ✅ **safe** — the rollout's migrate-before-deploy window, and the web-rollback target | measured: every page 200, all 45 opportunities served, `/api/v1/*` 404 |
| 3 | New | Baseline | — | — | ✅ safe | measured: release-gate runs of the baseline pair |
| 4 | New | New | Old | — | ⚠️ inert, not harmful | measured: the retired token is refused (401) with the variable set on the server; the old worker takes no work |
| 5 | New | New | New | New | ✅ **target** | measured, hosted, as real processes: the Python source worker claims and dead-letters a job under its own credential; the link worker verifies through the route and completes under its lease; all four safety invariants hold |
| 6 | New | New | New | — | ✅ safe | reasoned: link jobs queue and wait; nothing else depends on them |
| 7 | New | Old | New | New | ❌ forbidden (harmless) | reasoned: the old web has no maintenance routes; both workers get 404 and do nothing |
| 8 | New | New | pre-BF08 | — | ✅ fails closed | reasoned: a pre-BF08 worker sends the retired token and gets 401. Separately measured: a completion or checkpoint without `lease_token` is refused 422 even with a valid credential |
| 9 | New minus BF-10 | New | New | New | ❌ **forbidden** | measured: source-run endpoints 500 `relation "source_runs" does not exist`; public reads and the recrawl queue still 200 |
| 10 | Old | New | any | any | ❌ **forbidden** | reasoned from row 9: the whole ingestion schema is missing |

Before this release nothing executed `application_link` jobs: the scheduler
enqueued them and they accumulated, one per round per hour. Row 6 is that
pre-release behaviour; row 5 is the fix.

## Forbidden during rollout, and what would cause it

1. **New web against the unmigrated database** (row 10). Caused by any push to
   `main` before rollout step 7 — `main` deploys both Vercel projects
   immediately. Guarded by the rollout precondition "nobody pushes to `main`
   before step 9".
2. **New web against a pre-migration restore** (row 10 again). Guarded by
   runbook 16's table: a pre-migration dump may only be served by `f0a2ceb`.
3. **Workers in front of the old web** (row 7). Harmless — every call 404s —
   but pointless; runbook 14 stops them before a web rollback.

The forward sequence (migrate at 7, web at 9, workers at 12–13) never passes
through a forbidden row.

## Strict points

### BF-08 lease token

`locked_by` is set to the authenticated principal at claim time; checkpoint
and completion require both `locked_by` and `lease_token` to match. Principal
ids in this release: `source-worker`, `link-worker`, `source-run-operator`.
This is the **first** rollout of any worker, so no job exists that an earlier
principal could have leased. From the second rollout onward, drain first
(rollout step 5): a job left `running` by a different principal cannot be
completed by the new one — it is not lost, its lease expires after 15 minutes
and BF-08 reclaims it, but it is charged an attempt.

### BF-10 source runs

Requires the `source_runs` table (row 9 shows the failure mode) and the
`supervised_run` discovery method, which keeps ONE out of every unattended
path.

### Authorization, measured over real HTTP

Hosted in the release gate on every run, against the production server
process:

| Credential → / Request ↓ | scheduler | source-worker | link-worker | operator | ingestion | retired (configured on server) |
| ------------------------ | --------- | ------------- | ----------- | -------- | --------- | ------------------------------ |
| `POST /recrawls/schedule` | **200** | 403 | 403 | 403 | — | — |
| `POST /recrawls/claims` | 403 | — | — | — | 401 | 401 |
| `…/claims` `["application_link"]` | — | **403** | **200** | — | — | — |
| `…/claims` `["source_document"]` | — | **200** | **403** | — | — | — |
| `…/claims` with `job_ids` | — | **403** | **403** | **200** | — | — |
| `POST /maintenance/source-runs` | — | 403 | — | — | — | — |
| `GET /maintenance/source-runs` | — | — | — | **200** | — | — |
| `POST /application-rounds/{id}/link-checks` | — | — | **201** (via the worker run) | — | — | — |

"—" means the combination is not probed individually; the full table of
capabilities per credential is asserted in `src/server/maintenance-auth.test.ts`,
and the route's own job-kind and job-id behaviour in
`src/app/api/v1/maintenance/recrawls/claims/route.test.ts`.
