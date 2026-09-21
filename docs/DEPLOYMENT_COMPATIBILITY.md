# Deployment compatibility matrix

Every row below was either **measured** against a production-shaped PostgreSQL
17 clone during the 2026-09-20 rehearsal, or is marked **reasoned** where it
follows directly from code that was read but not executed. Reasoned rows are
never counted as evidence for the readiness verdict.

Definitions:

- **Old DB** — the current production schema: 8 tables created by
  `drizzle-kit push` at `f0a2ceb`, with no `drizzle.__drizzle_migrations`
  journal.
- **New DB** — the same database after all seven migrations (38 tables, 495
  columns, 7 journal rows).
- **Old web** — `f0a2ceb`, the code currently serving production.
- **Baseline web** — `ffdffe2`, the previous release baseline. Has maintenance
  routes guarded by the single `MAINTENANCE_WORKER_TOKEN`.
- **New web** — this release. Capability-scoped credentials, link worker.
- **Old worker** — Python `189459f`, sends `MAINTENANCE_WORKER_TOKEN`.
- **New worker** — Python this release, sends `SOURCE_WORKER_TOKEN`.

## Matrix

| # | DB  | Web      | Source worker | Link worker | Safe? | Evidence |
| - | --- | -------- | ------------- | ----------- | ----- | -------- |
| 1 | Old | Old      | none          | none        | ✅ Safe — current production | live site 200 |
| 2 | New | Old      | none          | none        | ✅ **Safe** — required rollout window | measured: all pages 200, all 45 opportunities served, `/api/v1/*` 404 as expected |
| 3 | New | Baseline | none          | none        | ✅ Safe | measured: hosted release gate run 35534172715 |
| 4 | New | New      | Old           | none        | ⚠️ Degraded, not harmful | measured: retired token → 401; worker takes no work, queue stalls, nothing corrupted |
| 5 | New | New      | New           | New         | ✅ **Target state** | measured: full suite + real-process smoke |
| 6 | New | New      | New           | none        | ✅ Safe | measured: link jobs queue up unclaimed; see note A |
| 7 | New | Baseline | New           | New         | ❌ **Forbidden** | reasoned: baseline web knows only `MAINTENANCE_WORKER_TOKEN`; both workers 401 |
| 8 | New | New      | pre-BF08      | —           | ✅ Fails closed | measured: completion/checkpoint without `lease_token` → 422 |
| 9 | Old (pre-BF10) | New | New | New    | ❌ **Forbidden** | measured: source-run endpoints 500 `relation "source_runs" does not exist`; public reads and the recrawl queue still 200 |
| 10| Old | New      | any           | any         | ❌ **Forbidden** | reasoned from #9: the whole ingestion schema is absent, not just `source_runs` |

Note A: before this release there was **no** executor for `application_link`
jobs at all. The scheduler enqueued them and nothing ever claimed them, so they
accumulated indefinitely (a fresh job per application round per hour bucket).
Row 6 is therefore the *pre-release* behaviour, and is safe but wasteful;
row 5 is the fix.

## Forbidden during rollout

1. **Baseline or old web in front of new workers** (rows 7, 10). The auth
   contract changed. Web and workers must move together, in the order below.
2. **New web against a database missing the BF-10 migration** (row 9). Run all
   migrations before deploying the new web.
3. **Old and new source workers running concurrently.** Not a correctness
   problem — lease fencing handles concurrency — but the old one holds a
   credential the new web rejects, so it only produces 401 noise.

## Strict points

### BF-08 lease token

`locked_by` is set to the authenticated principal's id at claim time, and
checkpoint/completion require both `locked_by` and `lease_token` to match. The
principal id changed in this release: `maintenance-worker` → `source-worker` /
`link-worker` / `source-run-operator`.

**Consequence:** a job left in `running` state by an old worker cannot be
completed by a new worker. It is not lost — its lease expires after 15 minutes
and BF-08 reclaims it with a fresh attempt — but the rollout must still drain
the queue first (step 5) so no job burns an attempt on the cutover.

### BF-10 source runs

Requires the `source_runs` table and the `supervised_run` discovery method.
Measured behaviour without the migration: 500 on source-run endpoints, with
public reads and the recrawl queue unaffected.

### New auth scopes

Measured cross-scope denial over real HTTP against the migrated clone:

| Credential →<br>Route ↓        | scheduler | source-worker | link-worker | operator | ingestion | retired |
| ------------------------------ | --------- | ------------- | ----------- | -------- | --------- | ------- |
| `POST /recrawls/schedule`      | **200**   | 403           | 403         | 403      | 401       | 401     |
| `POST /recrawls/claims` (default) | 403    | **200**       | **200**     | **200**  | 401       | 401     |
| `POST /recrawls/claims` `["application_link"]` | 403 | **403** | **200** | 403 | 401 | 401 |
| `POST /recrawls/claims` `["source_document"]`  | 403 | **200** | **403** | **200** | 401 | 401 |
| `POST /recrawls/claims` with `job_ids` | 403 | **403** | **403** | **200** | 401 | 401 |
| `POST /maintenance/source-runs`| 403       | 403           | 403         | **auth ok** | 401   | 401     |
| `POST /v1/ingestions`          | 401       | 401           | 401         | 401      | **auth ok** | 401 |

"auth ok" = the request passed authorization and was then rejected on payload
validation (422), which is the expected result for a probe with a deliberately
empty body.
