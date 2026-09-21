# Production rollout sequence, canaries, and abort criteria

Not executed. This document is the plan for a separately authorized rollout.

Operator checkpoints — an explicit human go/no-go — are required immediately
before steps 3, 11, 15, and 17.

---

## 0. Preconditions

- [ ] Hosted release gate green for the exact release pair (both SHAs asserted).
- [ ] `docs/DEPLOYMENT_COMPATIBILITY.md` reviewed; no forbidden combination is
      possible given the order below.
- [ ] Every credential in `docs/PRODUCTION_TOPOLOGY.md` §3 provisioned, ≥32
      chars, all four maintenance credentials distinct.
- [ ] `MAINTENANCE_WORKER_TOKEN` deleted from every production environment group.
- [ ] Confirm which Vercel project is authoritative. `Brasil-Afora/brasil-afora`
      currently feeds **two** production projects, `brasil-afora` and
      `passaporte-global`, and they do not behave identically
      (`brasilafora.com.br/login` → 404, `brasil-afora.vercel.app/login` → 500).
      Both deploy on push to `main`.

---

## 1–17. Sequence

1. **Freeze the release pair.** Announce a change freeze on both repositories.
2. **Confirm the hosted gate.** Re-read the gate run and verify it asserted the
   exact pair. Do not accept a green run whose SHA assertion you have not read.
3. **⛔ OPERATOR CHECKPOINT — backup.** Take a manual PostgreSQL snapshot *and*
   a `pg_dump -Fc` to durable storage outside the database host. Record the
   snapshot id, the dump path, its byte size, and its `sha256`.
   ```bash
   pg_dump "$PRODUCTION_DATABASE_URL" -Fc -f "backup-$(date -u +%Y%m%dT%H%M%SZ).dump"
   ```
   Rehearsal timing: 1 s for 47 KB / 8 tables / 885 rows. Production will be
   larger; measure, do not assume.
4. **Disable the scheduler.** Suspend the Render cron job. Confirm suspended.
5. **Drain and stop old workers.** Stop every worker service. Then wait for the
   queue to quiesce:
   ```sql
   SELECT status, count(*) FROM recrawl_jobs GROUP BY status;
   SELECT count(*) FROM recrawl_jobs WHERE status = 'running';
   ```
   Do not proceed while `running > 0`. If a job is wedged, wait out its
   15-minute lease rather than editing rows.
6. **Record queue state.** Persist the counts from step 5 and:
   ```sql
   SELECT job_kind, status, count(*) FROM recrawl_jobs GROUP BY 1,2 ORDER BY 1,2;
   SELECT max(created_at) FROM audit_events;
   ```
7. **Migrate.**
   ```bash
   DATABASE_URL="$PRODUCTION_DATABASE_URL" bun run db:migrate
   ```
   Production has no migration journal today; migration 1 is fully
   `IF NOT EXISTS`-guarded and adopts the existing tables. Rehearsed against a
   production-shaped clone: 1 s, 8 → 38 tables, zero row changes to legacy data.
8. **Verify the schema.**
   ```sql
   SELECT count(*) FROM drizzle.__drizzle_migrations;                       -- expect 7
   SELECT count(*) FROM information_schema.tables
     WHERE table_schema='public' AND table_type='BASE TABLE';               -- expect 38
   SELECT count(*) FROM information_schema.columns WHERE table_schema='public'; -- expect 495
   SELECT to_regclass('public.source_runs') IS NOT NULL AS bf10_present;
   SELECT count(*) FROM information_schema.columns
     WHERE table_name='recrawl_jobs' AND column_name='lease_token';         -- expect 1
   ```
   Also confirm legacy row counts are unchanged from step 6.
   **The site is still serving old web against the new DB here. That is a
   measured-safe combination (compatibility row 2), so there is no rush.**
9. **Deploy the web.** Publish the release-pair web SHA to the production
   project. Because pushing to `main` auto-deploys, either fast-forward `main`
   to the release SHA deliberately, or deploy the SHA directly from the Vercel
   dashboard — decide which before starting, and write it down.
10. **Smoke the web and auth.**
    ```bash
    curl -sS -o /dev/null -w '%{http_code}\n' "$WEB/api/v1/opportunities"       # 200
    curl -sS -o /dev/null -w '%{http_code}\n' "$WEB/oportunidades/internacionais" # 200
    curl -sS -o /dev/null -w '%{http_code}\n' -X POST "$WEB/api/v1/maintenance/recrawls/claims" \
      -H "authorization: Bearer $SOURCE_WORKER_TOKEN" -H 'content-type: application/json' -d '{"limit":1}'  # 200
    curl -sS -o /dev/null -w '%{http_code}\n' -X POST "$WEB/api/v1/maintenance/recrawls/schedule" \
      -H "authorization: Bearer $SOURCE_WORKER_TOKEN" -H 'content-type: application/json' -d '{}'           # 403
    ```
    The 403 is as important as the 200s: it proves the scopes are live and not
    collapsed. `/login` returns 500 today — that is pre-existing, not a
    regression, and must not abort the rollout.
11. **⛔ OPERATOR CHECKPOINT — worker enablement.**
12. **Deploy the source worker.** Start it; confirm it claims nothing yet (the
    queue was drained and the scheduler is still off).
13. **Deploy the link worker.** Same.
14. **Verify both workers are idle and authenticated.** Each should log one
    empty claim cycle and no 401/403.
15. **⛔ OPERATOR CHECKPOINT — canary.** Run canaries A, B, C below.
16. **⛔ OPERATOR CHECKPOINT — scheduler enablement.** Re-enable the cron job.
    Observe for one full hour: exactly one `recrawl.schedule.completed` audit
    event, queue depth rising and falling, no dead-letter spike.
17. **⛔ OPERATOR CHECKPOINT — first supervised ONE run.** Later, deliberately,
    by hand. Canary D.

---

## Canaries

### Canary A — web and database only

No scheduler, no worker, no live source.

| Check | Expected |
| ----- | -------- |
| `GET /api/v1/opportunities` | 200, JSON body |
| `GET /oportunidades/internacionais`, `/nacionais`, `/mapa`, `/` | 200 |
| `GET /api/opportunities` | 200, legacy row count matches step 6 |
| `POST /recrawls/claims` with `SOURCE_WORKER_TOKEN` | 200, `{"jobs":[]}` |
| `POST /recrawls/schedule` with `SOURCE_WORKER_TOKEN` | 403 `MAINTENANCE_SCOPE_FORBIDDEN` |
| `POST /recrawls/claims` with the retired token | 401 |
| DB error rate | zero |

**Abort if:** any public page 5xx (other than the known `/login`); the legacy
opportunity count differs from step 6; any scope check returns the wrong code;
the retired token authenticates anything.

### Canary B — one synthetic source-document job

Insert a single job for a source you control. Scheduler stays off; run the
source worker once by hand.

| Check | Expected |
| ----- | -------- |
| Job reaches `completed` | yes |
| `attempts` | 1 |
| `audit_events` | `recrawl.ingestion_checkpointed` then `recrawl.completed`, `actor_id='source-worker'` |
| `publication_versions` count | **unchanged** |
| Approved/public opportunity count | **unchanged** |

**Abort if:** the job dead-letters; any publication count moves; the audit actor
is anything other than `source-worker`.

### Canary C — one synthetic application-link job

Insert one `application_link` job against a round you control, then:

```bash
bun --conditions react-server src/workers/application-link-worker.ts --once
```

| Check | Expected |
| ----- | -------- |
| Job reaches `completed` | yes |
| One new row in `application_link_assessments` | yes |
| `editions.last_verified_at` refreshed | yes |
| Review task | opened **only** if the status is `broken`/`closed`/`old_edition`/`results_page` |
| `publication_versions`, `publication_gate_decisions`, `outbox_events` | **unchanged** |
| `audit_events` | `application_link.verified` + `recrawl.completed`, `actor_id='link-worker'` |

Rehearsed against the clone: a URL on a blocked port produced `status=blocked`,
`document_role=error_page`, job `completed`, zero publications; a round with no
URL dead-lettered on attempt 1 with `APPLICATION_URL_MISSING`.

**Abort if:** any publication table changes; the worker claims a
`source_document` job; a transient failure dead-letters instead of requeueing.

### Canary D — supervised ONE run (manual, much later)

```bash
brasil-afora-source-run --web-base-url "$WEB_BASE_URL" --adapter one_ufma ...
```

Review, by hand:

- source-run status, `pages_expected` vs `pages_succeeded`, error categories
- the evidence captured for each candidate
- the review tasks created
- that **nothing was published**
- that no unattended recrawl was scheduled for the ONE source

**Abort if:** the run yields zero candidates while reporting healthy; any
opportunity becomes public without a reviewer action; the scheduler enqueues an
unattended job for a supervised-run source.

### Global abort criteria

Abort and roll back at any stage if:

- approved or public opportunity counts change without a reviewer action;
- a supervised-run source acquires an unattended queue job;
- dead-lettered jobs exceed 5 in the first hour;
- the maintenance API returns 503 (`MAINTENANCE_AUTH_MISCONFIGURED` or
  `MAINTENANCE_AUTH_SCOPE_COLLAPSE`) — the credential set is unsound;
- any credential authenticates a capability it should not hold.
