# Production rollout sequence, canaries, and abort criteria

Not executed. This is the plan for a separately authorized rollout.

Operator checkpoints — an explicit human go/no-go — are required immediately
before steps **3** (backup and migration), **11** (worker enablement), **16**
(scheduler enablement), and **17** (first supervised ONE run).

This is the **first** rollout of the ingestion system to production. Today's
production database has no queue, no workers, and no migration journal — only
the eight application tables created by `drizzle-kit push` at `f0a2ceb`. Steps
that mention queue state apply from the second rollout onward and are marked.

---

## 0. Preconditions

- [ ] Hosted release gate green for the exact release pair. Read the run's SHA
      assertion lines yourself; do not accept a green badge.
- [ ] **Production schema matches what the rehearsal assumed.** The rehearsal
      could not reach production; it reproduced the schema from `f0a2ceb`.
      Close that gap before anything else:
      ```bash
      pg_dump "$PRODUCTION_DATABASE_URL" --schema-only --no-owner --no-privileges > prod-schema.sql
      psql "$PRODUCTION_DATABASE_URL" -tAc "SELECT version();"
      psql "$PRODUCTION_DATABASE_URL" -tAc "SELECT count(*) FROM information_schema.tables
                                            WHERE table_schema='public' AND table_type='BASE TABLE';"   -- expect 8
      psql "$PRODUCTION_DATABASE_URL" -tAc "SELECT to_regclass('drizzle.__drizzle_migrations');"      -- expect empty
      ```
      Diff `prod-schema.sql` against a schema-only dump of a database built by
      `drizzle-kit push` at `f0a2ceb` (the rehearsal's method). **Abort** on any
      unexplained difference: a column added by hand in a console is exactly
      what `IF NOT EXISTS` would silently skip. Migrations were rehearsed on
      PostgreSQL 17; if production is older, note it and re-rehearse on that
      major version first.
- [ ] Every credential in `docs/PRODUCTION_TOPOLOGY.md` §3 provisioned: ≥32
      characters, and no two of the six bearer credentials sharing a value
      (the web returns 503 on every maintenance route if they do).
- [ ] `MAINTENANCE_WORKER_TOKEN` absent from every production environment group.
- [ ] **Which Vercel project is authoritative is decided and written down.**
      `Brasil-Afora/brasil-afora` feeds two production projects, `brasil-afora`
      and `passaporte-global`, and they already serve different builds
      (`brasilafora.com.br/login` → 404, `brasil-afora.vercel.app/login` → 500).
- [ ] **Nobody pushes to `main` before step 9.** A push to `main` deploys both
      Vercel projects immediately. Before step 7 that would put the new web in
      front of the unmigrated database — compatibility row 10, forbidden.

---

## 1–17. Sequence

1. **Freeze the release pair.** Announce a change freeze on both repositories.
2. **Confirm the hosted gate** for the exact pair (both SHAs in the log).
3. **⛔ OPERATOR CHECKPOINT — backup and migration.** Take the provider's
   snapshot *and* a logical dump to durable storage off the database host.
   Record the snapshot id, dump path, byte size, and `sha256`.
   ```bash
   pg_dump "$PRODUCTION_DATABASE_URL" -Fc -f "pre-migration-$(date -u +%Y%m%dT%H%M%SZ).dump"
   shasum -a 256 pre-migration-*.dump
   ```
   Rehearsal: 1 s for 47 KB / 885 rows. Production is larger; measure it.
4. **Disable the scheduler.** *(Second rollout onward.)* On the first rollout
   there is no scheduler yet — confirm no cron job exists.
5. **Drain workers.** *(Second rollout onward.)* Stop every worker, then wait
   until `SELECT count(*) FROM recrawl_jobs WHERE status='running'` is 0; if a
   job is wedged, wait out its 15-minute lease rather than editing rows. On
   the first rollout there are no workers and no `recrawl_jobs` table — skip.
6. **Record the pre-migration baseline.** This is what step 8 and Canary A
   compare against.
   ```sql
   SELECT 'users', count(*) FROM users
   UNION ALL SELECT 'accounts', count(*) FROM accounts
   UNION ALL SELECT 'sessions', count(*) FROM sessions
   UNION ALL SELECT 'verifications', count(*) FROM verifications
   UNION ALL SELECT 'opportunities', count(*) FROM opportunities
   UNION ALL SELECT 'national_opportunities', count(*) FROM national_opportunities
   UNION ALL SELECT 'favorite_opportunities', count(*) FROM favorite_opportunities
   UNION ALL SELECT 'favorite_national_opportunities', count(*) FROM favorite_national_opportunities;
   ```
   *(Second rollout onward, also record:)*
   `SELECT job_kind, status, count(*) FROM recrawl_jobs GROUP BY 1,2;`
7. **Migrate.**
   ```bash
   DATABASE_URL="$PRODUCTION_DATABASE_URL" bun run db:migrate
   ```
   Migration 1 is fully `IF NOT EXISTS`-guarded and adopts the existing eight
   tables. Rehearsed on a production-shaped clone: 1 s, 8 → 38 tables, legacy
   content digest identical before and after.
8. **Verify the schema and the legacy data.**
   ```sql
   SELECT count(*) FROM drizzle.__drizzle_migrations;                            -- 7
   SELECT count(*) FROM information_schema.tables
     WHERE table_schema='public' AND table_type='BASE TABLE';                     -- 38
   SELECT to_regclass('public.source_runs') IS NOT NULL;                          -- true
   SELECT count(*) FROM information_schema.columns
     WHERE table_name='recrawl_jobs' AND column_name='lease_token';               -- 1
   ```
   Re-run the step 6 counts: **every one must be identical.**
   The site is still serving the old web against the new database here. That
   combination was measured safe (compatibility row 2), so there is no rush.
9. **Deploy the web** to the authoritative project, by exact SHA. Decide in
   advance whether that is a fast-forward of `main` (which also deploys the
   second project) or a direct deployment of the SHA; write it down.
10. **Smoke the web and the credential model** — with probes that change
    nothing. A real `/claims` call with a worker credential would lease a live
    job and charge it an attempt, so every maintenance probe here is one that
    is refused *after* authentication and *before* any SQL:
    ```bash
    probe() { curl -sS -o /dev/null -w "%{http_code}  $1\n" -X POST "$WEB$2" \
      -H "authorization: Bearer $3" -H 'content-type: application/json' --data-binary "$4"; }
    curl -sS -o /dev/null -w '%{http_code}  public API\n' "$WEB/api/v1/opportunities"      # 200
    curl -sS -o /dev/null -w '%{http_code}  catalog\n' "$WEB/oportunidades/internacionais"  # 200
    probe "source worker, wrong kind" /api/v1/maintenance/recrawls/claims   "$SOURCE_WORKER_TOKEN" '{"job_kinds":["application_link"]}'   # 403
    probe "link worker, wrong kind"   /api/v1/maintenance/recrawls/claims   "$LINK_WORKER_TOKEN"   '{"job_kinds":["source_document"]}'    # 403
    probe "scheduler cannot claim"    /api/v1/maintenance/recrawls/claims   "$SCHEDULER_TOKEN"     '{"limit":1}'                          # 403
    probe "source worker cannot schedule" /api/v1/maintenance/recrawls/schedule "$SOURCE_WORKER_TOKEN" '{}'                            # 403
    probe "unknown credential"        /api/v1/maintenance/recrawls/claims   "<any unconfigured 32+ char value>" '{"limit":1}'             # 401
    curl -sS -o /dev/null -w '%{http_code}  operator read\n' \
      "$WEB/api/v1/maintenance/source-runs?source_id=00000000-0000-4000-8000-000000000000" \
      -H "authorization: Bearer $SOURCE_RUN_OPERATOR_TOKEN"                                   # 200
    ```
    Every 403 proves two things at once: the credential is live (a wrong one
    is 401) and its scope is intact (a collapsed one would be 200). A 503 on
    any of them means the credential set is unsound — abort.
    `/login` returns 500 today; that is pre-existing, not a regression.
11. **⛔ OPERATOR CHECKPOINT — worker enablement.**
12. **Deploy the source worker** (`scripts/run-source-worker.sh`). In this
    release the only registered source, ONE, is supervised-only, so the
    unattended worker has no work: expect it to claim nothing, every cycle.
13. **Deploy the link worker.** Same — nothing is queued until the scheduler
    runs.
14. **Verify both are idle and authenticated.** The source worker prints `[]`
    each cycle; the link worker logs `started` and no `batch_failed`. Any 401,
    403 or 503 in either log: stop and fix the credential.
15. **Canaries A, B, C** (below).
16. **⛔ OPERATOR CHECKPOINT — scheduler enablement.** Create and enable the cron
    job. Observe one full hour: exactly one `recrawl.schedule.completed` audit
    event per hour, link jobs rising and draining, no dead-letter spike, and
    the two page-level alerts in `docs/PRODUCTION_MONITORING.md` silent.
17. **⛔ OPERATOR CHECKPOINT — first supervised ONE run.** Later, deliberately, by
    hand. Canary D.

---

## Canaries

Every canary checks two invariants. **P1:** the number of `published`
publication versions is unchanged. **P2:** the unreviewed-publication query in
`docs/PRODUCTION_MONITORING.md` ("Publication safety") returns no rows. Note
that ingestion legitimately creates *draft* publication versions, so a change
in the total `publication_versions` count is not by itself a failure.

### Canary A — web and database only

No scheduler, no worker, no live source.

| Check | Expected |
| ----- | -------- |
| `GET /api/v1/opportunities` | 200 |
| `/`, `/oportunidades/internacionais`, `/oportunidades/nacionais`, `/mapa` | 200 |
| `GET /api/opportunities` | 200; count equals step 6's `opportunities` |
| Step 10 probes | exactly the codes listed there |
| Web error log | no database errors |

**Abort if:** any public page 5xx (other than the known `/login`); any legacy
count differs from step 6; any probe returns an unexpected code; any 503.

### Canary B — one synthetic source-document job (real Python worker)

No source in this release is unattended, so the canary proves the worker's
authentication and lease handling rather than a crawl. Insert one job whose
URL belongs to no registered source:

```sql
INSERT INTO recrawl_jobs (job_kind, reason, priority, deduplication_key, requested_by,
                          scheduled_for, max_attempts, payload)
VALUES ('source_document', 'canary-b', 100, 'canary-b-' || now()::text, 'rollout-operator',
        now(), 3, '{"url":"https://canary.invalid/document"}'::jsonb);
```

Let the source worker take one cycle.

| Check | Expected |
| ----- | -------- |
| The job | `dead_lettered`, `attempts=1`, `last_error` contains `no enabled registered source` |
| `audit_events` | one `recrawl.dead_lettered` with `actor_id='source-worker'` |
| Ingestion | none — no `idempotency_requests` row |
| P1, P2 | hold |

**Abort if:** the job is retried instead of dead-lettered; the audit actor is
not `source-worker`; any ingestion is attempted.

### Canary C — one synthetic application-link job

Use an application round on an edition that has **no approved publication**,
so a verification cannot change any public listing, and give it an
application URL on a host you control. Insert one `application_link` job for
it and run the link worker once:

```bash
bun --conditions react-server src/workers/application-link-worker.ts --once
```

| Check | Expected |
| ----- | -------- |
| The job | `completed`, `attempts=1` |
| `application_link_assessments` | exactly one new row for that round |
| `editions.last_verified_at` | refreshed |
| Review task | opened **only** for `broken`/`closed`/`old_edition`/`results_page` |
| `audit_events` | `application_link.verified` + `recrawl.completed`, both `actor_id='link-worker'` |
| The worker's environment | contains no `DATABASE_URL` |
| P1, P2 | hold |

Rehearsed hosted in the release gate on every run: a URL on a refused port
produces `status=blocked` and completes; a round with no URL dead-letters on
attempt 1 with `APPLICATION_URL_MISSING`.

**Abort if:** any publication state changes; the worker claims a
`source_document` job; an infrastructure failure dead-letters a job instead of
requeueing it.

### Canary D — supervised ONE run (manual, much later)

```bash
brasil-afora-source-run --web-base-url "$WEB" --adapter one_ufma \
  --registry config/sources.toml --source-cohort supervised_source_run
```

Review by hand: run status, `pages_expected` vs `pages_succeeded`, error
categories, the evidence for each candidate, every review task created, that
**nothing was published**, and that no unattended job exists for the ONE
source (the ONE-safety query in the monitoring doc returns no rows).

**Abort if:** the run is `healthy` with zero valid candidates; anything becomes
public without a reviewer action; the scheduler enqueues an unattended job for
a supervised-run source.

---

## Global abort criteria

Abort and roll back at any stage if:

- P1 or P2 fails — automation changed what the public sees without a reviewer;
- a supervised-run source acquires an unattended queue job;
- more than 5 jobs dead-letter in the first hour;
- any maintenance route returns 503 (the credential set is unsound);
- any credential is granted a capability it should not hold.
