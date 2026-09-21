# Production-clone migration and restore rehearsal — 2026-09-20

No production system was touched. Everything below ran against a disposable
PostgreSQL 17.11 cluster on `127.0.0.1:55432`.

## What stood in for production, and how much it is worth

Production's database is not reachable from the environment this rehearsal ran
in: the Vercel projects that deploy `Brasil-Afora/brasil-afora`
(`brasil-afora`, `passaporte-global`) live in an account this session has no
access to, and no Brasil Afora project exists in the reachable Vercel or
Supabase accounts. So no production data — anonymized or otherwise — could be
copied.

The substitute is a **schema-faithful synthetic clone**:

1. A fresh database was brought to production's exact current schema by running
   `drizzle-kit push` from the **deployed production commit itself**
   (`f0a2ceb`) — which is precisely how production's schema was created. The
   result was 8 tables and **no** `drizzle.__drizzle_migrations` journal,
   matching production's real, unusual starting state.
2. Synthetic but structurally representative data was inserted: 120 users
   (one admin, a quarter unverified), 210 accounts across credential and Google
   providers, 90 sessions, 30 pending verifications, 45 international and 30
   national opportunities (a third already past deadline), 240 + 120 favorites
   with live foreign keys. 885 rows total.

**Confidence this provides — high for schema, moderate for data.** The schema
side is not an approximation: it is byte-for-byte what production's own
deployed code produces, so every structural risk (the missing journal, the
`IF NOT EXISTS` adoption of existing tables, column-count growth, foreign-key
validity) was exercised against the real thing. What it cannot cover is
production's actual data *volume* and any drift production may have accumulated
outside `drizzle-kit push` — a column hand-edited in a console, for example.
Migration timing in particular must be measured on production, not inferred
from this rehearsal.

**Recommended before the real migration:** dump production's schema only
(`pg_dump --schema-only`) and diff it against the clone's pre-migration schema.
That closes the one remaining gap — undetected production drift — and costs one
command. It is listed as a precondition in the rollout sequence.

## Results

### Pre-migration inventory

| Table | Rows |
| ----- | ---- |
| accounts | 210 |
| favorite_national_opportunities | 120 |
| favorite_opportunities | 240 |
| national_opportunities | 30 |
| opportunities | 45 |
| sessions | 90 |
| users | 120 |
| verifications | 30 |

8 base tables, 94 columns, no migration journal.
Content digest (users.email + both opportunity name sets):
`e4b928d5633cf13a083d7617b9014077`.

### Backup

`pg_dump -Fc` — 1 s, 47 852 bytes.

### Migration

`bun run db:migrate` — **1 s, clean, no errors.**

| | Before | After |
| - | ------ | ----- |
| Base tables | 8 | **38** |
| Public columns | 94 | **495** |
| Journal rows | none | **7** |
| Content digest | `e4b928d5…` | **`e4b928d5…` (identical)** |

All seven migrations recorded in `drizzle.__drizzle_migrations`. Migration 1's
`IF NOT EXISTS` guards adopted the eight pre-existing tables without touching a
single row. BF-08 columns (`lease_token`, `locked_at`, `locked_by`, `attempts`,
`max_attempts`, `job_kind`, `application_round_id`) and the BF-10 `source_runs`
table (22 columns) all present.

### Post-migration application reads

Real `next start` production server against the migrated clone:

| Path | Status |
| ---- | ------ |
| `/` | 200 |
| `/oportunidades/internacionais` | 200 |
| `/oportunidades/nacionais` | 200 |
| `/mapa` | 200 |
| `/sitemap.xml`, `/robots.txt` | 200 |
| `/api/opportunities` | 200 — all 45 migrated rows served |
| `/api/national-opportunities` | 200 |
| `/api/v1/opportunities` | 200 |
| `/login` | **500 — pre-existing, see below** |

`/oportunidades` is 404 because no page exists at that path; the two
subroutes are the real pages. Unchanged from production.

### Pre-existing defect found (not caused by this release)

`GET /login` returns 500 with `ReferenceError: window is not defined` during
SSR. Confirmed against **live production**: `https://brasil-afora.vercel.app/login`
returns 500 today. Neither the release pair nor this release's changes touch
any authentication UI. It is a real defect, it is not a rollout blocker, and it
must be excluded from health checks and 5xx alerting so it does not mask a real
regression.

Separately: `https://brasilafora.com.br/login` returns **404**, not 500 — the
two production Vercel projects fed by this one repository do not serve
identical builds. Resolve which is authoritative before the rollout.

### Queue reads and writes

`POST /recrawls/schedule` with the scheduler credential → 200
`{"application_link_jobs":0,"source_document_jobs":0}`.
`GET /maintenance/source-runs?source_id=…` with the operator credential → 200.

### Real-process link-worker smoke

Two application-link jobs seeded against a real edition; the actual worker
process run once (`bun --conditions react-server src/workers/application-link-worker.ts --once`)
against the real HTTP maintenance API and the migrated database:

| Job | Outcome |
| --- | ------- |
| URL on a blocked port | job `completed`, attempts 1, assessment `status=blocked`, `document_role=error_page`, reason `UNSAFE_PORT`, `material_change=true` |
| Round with no application URL | job `dead_lettered`, attempts 1, `last_error` = `ApplicationLinkVerificationError: APPLICATION_URL_MISSING: …` |

Audit trail, with the new scoped principals visible:

| action | actor_id | count |
| ------ | -------- | ----- |
| `application_link.verified` | `link-worker` | 1 |
| `recrawl.completed` | `link-worker` | 1 |
| `recrawl.dead_lettered` | `link-worker` | 1 |
| `recrawl.schedule.completed` | `scheduler` | 1 |

**Publication safety:** `publication_versions` 0, `publication_gate_decisions`
0, `outbox_events` 0. Nothing was published. No review task was opened, which
is correct — `blocked` is not one of the degraded statuses
(`broken`/`closed`/`old_edition`/`results_page`) that open one.

## Backup and restore rehearsal

1. **Snapshot** the post-migration database: `pg_dump -Fc`, 1 s, 144 061 bytes.
   Content digest across users, both opportunity sets, link assessments, and
   queue jobs: `d7e0e682e87c40c73820c786e3836606`.
2. **Mutate destructively**, simulating a bad release: deleted all favorites,
   deleted every expired opportunity (45 → 30), prefixed every user email with
   `corrupted-`, deleted all link assessments, and added a stray column to
   `recrawl_jobs`. Digest became `806a0b5e57dc5b7a3f0af39dff739423`.
3. **Restore into a separate database** (`ba_restore_target`) —
   `pg_restore --no-owner --no-privileges`, exit 0, **zero warnings**, under 1 s.
4. **Verified:**

| Check | Result |
| ----- | ------ |
| Content digest | `d7e0e682e87c40c73820c786e3836606` — **identical to pre-mutation** |
| Base tables | 38 |
| Public columns | 495 |
| Journal rows | 7 |
| users / opportunities / favorites | 120 / 45 / 240 — all restored |
| link assessments | 1 — restored |
| Stray `accidental_column` | **absent** |

The restored database was then served by the **current production web build**
(`f0a2ceb`) — see below.

## Compatibility measurements

| Combination | Result |
| ----------- | ------ |
| New DB + **old production web** (`f0a2ceb`) | **Safe.** All pages 200, all 45 opportunities served, `/api/v1/*` 404 as expected. This is the rollout's migrate-before-deploy window and the post-migration rollback target. |
| New web + retired `MAINTENANCE_WORKER_TOKEN` | 401 — fails closed |
| New web + completion/checkpoint without `lease_token` | 422 — fails closed |
| New web + pre-BF10 DB | source-run endpoints **500** (`relation "source_runs" does not exist`); public reads and the recrawl queue still 200 |

Full cross-scope authorization matrix, measured over real HTTP: see
`docs/DEPLOYMENT_COMPATIBILITY.md`.

## Reproducing

```bash
initdb -D "$PGDATA" -U postgres --auth=trust -E UTF8 --locale=C
pg_ctl -D "$PGDATA" -o "-p 55432 -k /tmp/ba-pg-sock -c listen_addresses=127.0.0.1" start
createdb -h 127.0.0.1 -p 55432 -U postgres ba_prod_clone

git worktree add ../prodsrc f0a2ceb
(cd ../prodsrc && bun install && DATABASE_URL=… bunx drizzle-kit push --force)
psql … -f seed-prod-like.sql

DATABASE_URL=… bun run db:migrate
```
