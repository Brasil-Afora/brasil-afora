# Operator runbooks

Command-oriented. `$WEB` is the public origin, `$DB` the production
`DATABASE_URL`. Credentials come from the environment group, never from this
file. Runbooks marked ⛔ mutate production and need the operator checkpoint
named in `docs/PRODUCTION_ROLLOUT_SEQUENCE.md`.

A reference used throughout — **non-mutating credential probes**. Each is
refused after authentication and before any SQL, so it proves a credential is
live (a wrong one is 401) and correctly scoped (a collapsed one is 200)
without touching a job:

```bash
probe() { curl -sS -o /dev/null -w "%{http_code}  $1\n" -X POST "$WEB$2" \
  -H "authorization: Bearer $3" -H 'content-type: application/json' --data-binary "$4"; }
probe source-worker /api/v1/maintenance/recrawls/claims   "$SOURCE_WORKER_TOKEN" '{"job_kinds":["application_link"]}'  # 403
probe link-worker   /api/v1/maintenance/recrawls/claims   "$LINK_WORKER_TOKEN"   '{"job_kinds":["source_document"]}'   # 403
probe scheduler     /api/v1/maintenance/recrawls/claims   "$SCHEDULER_TOKEN"     '{"limit":1}'                         # 403
curl -sS -o /dev/null -w '%{http_code}  operator\n' \
  "$WEB/api/v1/maintenance/source-runs?source_id=00000000-0000-4000-8000-000000000000" \
  -H "authorization: Bearer $SOURCE_RUN_OPERATOR_TOKEN"                                                                # 200
```

Never use a real `/claims` call as a health check: it leases a live job and
charges it an attempt.

---

## 1. Web deploy ⛔

```bash
git -C brasil-afora rev-parse release-2026-09-21-web^{commit}   # deploy exactly this
```

Deploy that SHA to the authoritative Vercel project. Pushing to `main`
deploys **both** production projects (`brasil-afora`, `passaporte-global`)
at once — decide beforehand whether that is intended.

```bash
curl -sS -o /dev/null -w '%{http_code}\n' "$WEB/api/v1/opportunities"   # 200
```

Then run the non-mutating probes above.

## 2. Migration ⛔

```bash
pg_dump "$DB" -Fc -f "pre-migration-$(date -u +%Y%m%dT%H%M%SZ).dump"   # never skip
DATABASE_URL="$DB" bun run db:migrate
psql "$DB" -tAc "SELECT count(*) FROM drizzle.__drizzle_migrations;"          # 7
psql "$DB" -tAc "SELECT count(*) FROM information_schema.tables
                 WHERE table_schema='public' AND table_type='BASE TABLE';"    # 38
```

Forward-only: there are no down-migrations. Recovery is restore (runbook 16).

## 3. Source-worker deploy / restart

Start command (from the scraper repository root):

```bash
scripts/run-source-worker.sh
```

It runs one bounded batch against `config/sources.toml`, idles
`SOURCE_WORKER_IDLE_SLEEP_SECONDS`, and repeats. It **exits non-zero** when
the worker cannot operate at all (credential refused, registry invalid, web
unreachable) so the host restarts it and the crash loop is visible; job-level
failures are recorded on the queue and do not stop it. SIGTERM stops it within
a second; a batch in flight is killed and its lease expires (BF-08 reclaims
the job, one attempt charged).

In this release no registered source is unattended, so every cycle claims
nothing and prints `[]`. That is healthy.

## 4. Link-worker deploy / restart

```bash
bun --conditions react-server src/workers/application-link-worker.ts          # service
bun --conditions react-server src/workers/application-link-worker.ts --once   # one job, for canaries
```

The flag is required. The worker needs only `WEB_BASE_URL` and
`LINK_WORKER_TOKEN` — **no `DATABASE_URL`**; if one is present in its
environment, remove it. SIGTERM lets the job in flight finish (at most ~75 s:
the web caps a verification at 45 s, the worker waits up to 75 s for the
route) and cuts an idle sleep short; a second signal exits immediately.

## 5. Scheduler enable / disable

Suspend or resume the Render cron job, then confirm:

```bash
psql "$DB" -tAc "SELECT max(created_at) FROM audit_events WHERE action='recrawl.schedule.completed';"
```

No new rows after the suspension time means it is really off. Disable the
scheduler **first** in every incident — it is the only thing that creates work.

## 6. Manual scheduler execution ⛔

```bash
curl --fail -sS -X POST "$WEB/api/v1/maintenance/recrawls/schedule" \
  -H "authorization: Bearer $SCHEDULER_TOKEN" -H 'content-type: application/json' -d '{}'
# → {"data":{"application_link_jobs":N,"source_document_jobs":M}}
```

Idempotent within an hour: the deduplication key buckets by hour.

## 7. Queue inspection

```bash
psql "$DB" -c "SELECT job_kind, status, count(*) FROM recrawl_jobs GROUP BY 1,2 ORDER BY 1,2;"
psql "$DB" -c "SELECT job_kind, extract(epoch FROM now()-min(scheduled_for)) AS oldest_queued_s
               FROM recrawl_jobs WHERE status='queued' GROUP BY job_kind;"
psql "$DB" -c "SELECT id, job_kind, priority, reason, scheduled_for FROM recrawl_jobs
               WHERE status='queued' ORDER BY priority DESC, scheduled_for LIMIT 20;"
```

## 8. Dead-letter investigation

```bash
psql "$DB" -c "SELECT id, job_kind, attempts, max_attempts, completed_at, left(last_error,200)
               FROM recrawl_jobs WHERE status='dead_lettered' ORDER BY completed_at DESC LIMIT 20;"
```

`last_error` keeps the machine code (e.g.
`PermanentLinkJobError: APPLICATION_URL_MISSING: …`,
`execution: WorkerExecutionError: no enabled registered source owns …`).
Triage by code. To retry one job **after fixing its cause** ⛔:

```sql
UPDATE recrawl_jobs
   SET status='queued', attempts=0, lease_token=NULL, locked_by=NULL, locked_at=NULL,
       completed_at=NULL, last_error=NULL, scheduled_for=now()
 WHERE id = '<job-id>' AND status = 'dead_lettered';
INSERT INTO audit_events (action, actor_id, actor_kind, entity_id, entity_type, metadata)
VALUES ('recrawl.requeued_by_operator', '<your-name>', 'operator', '<job-id>', 'recrawl_job',
        '{"reason":"<why>"}'::jsonb);
```

## 9. Stale lease investigation

```bash
psql "$DB" -c "SELECT id, job_kind, locked_by, locked_at, attempts FROM recrawl_jobs
               WHERE status='running' AND locked_at < now() - interval '15 minutes';"
```

Do not clear these by hand. BF-08 reclaims an expired lease on the next claim
and charges exactly one attempt; hand-clearing is how double execution
happens. Link verifications are capped at 45 s — far inside the 15-minute
lease — so a stale link job means the worker died, not that it is still
verifying. If rows persist across several claim cycles, investigate the worker.

## 10. Supervised ONE run ⛔

```bash
brasil-afora-source-run --web-base-url "$WEB" --adapter one_ufma \
  --registry config/sources.toml --source-cohort supervised_source_run
```

Needs `SOURCE_RUN_OPERATOR_TOKEN` and `BRASIL_AFORA_INGESTION_TOKEN`. Exit 0
means a healthy run; 3 means degraded or failed. Manual only — never schedule
it. Afterwards run runbook 11 and review every review task before anything is
approved.

## 11. Source health review

```bash
curl -sS "$WEB/api/v1/maintenance/source-runs?source_id=$SOURCE_ID" \
  -H "authorization: Bearer $SOURCE_RUN_OPERATOR_TOKEN"
psql "$DB" -c "SELECT status, started_at, finished_at, pages_expected, pages_succeeded,
                      pages_failed, candidates_discovered, candidates_valid,
                      reconciliation_eligible, error_categories
               FROM source_runs ORDER BY started_at DESC LIMIT 10;"
```

`candidates_valid = 0` on a `healthy` run is the anomaly that matters.

## 12. Source disable ⛔

```sql
UPDATE sources SET enabled = false WHERE id = '<source-id>';
```

The scheduler only considers enabled sources, so no new work is created. Jobs
already queued for the source — **both** kinds, because the scheduler records
`source_id` on application-link jobs too — remain. To cancel them, deliberately
and with an audit trail:

```sql
WITH cancelled AS (
  UPDATE recrawl_jobs
     SET status='dead_lettered', completed_at=now(),
         last_error='source disabled by operator'
   WHERE source_id = '<source-id>' AND status = 'queued'
  RETURNING id)
INSERT INTO audit_events (action, actor_id, actor_kind, entity_id, entity_type, metadata)
SELECT 'recrawl.cancelled_by_operator', '<your-name>', 'operator', id, 'recrawl_job',
       '{"reason":"source disabled"}'::jsonb
  FROM cancelled;
```

## 13. Credential rotation ⛔

See `docs/PRODUCTION_TOPOLOGY.md` §3 (R1–R5). For a maintenance token:

1. Suspend the scheduler.
2. Stop the credential's holder.
3. **Validate the new value before applying it:** ≥32 characters, and
   different from every other maintenance, ingestion and outbox credential.
   A short or duplicated value makes **every** maintenance route return 503 —
   for every principal, admin sessions included — until it is fixed. That is
   deliberate (an unsound credential set is an incident), so check first.
4. Set it on the web and on the holder; redeploy the web, then the holder.
5. Run the non-mutating probes at the top of this document.
6. Resume the scheduler.

## 14. Web rollback ⛔

The previous production web is **`f0a2ceb`** (`origin/main` before this
rollout). It has no `/api/v1/*` routes at all, so it cannot serve the
workers — but it was **measured to serve the fully migrated database
correctly** (compatibility row 2), so rolling the web back needs no database
action.

1. Suspend the scheduler.
2. Stop both workers (against `f0a2ceb` every maintenance call is a 404).
3. Vercel → Deployments → the `f0a2ceb` production deployment → Promote.
4. Leave the workers stopped until the web moves forward again.

Nothing is published or lost while the workers are stopped; the queue simply
waits.

## 15. Worker rollback ⛔

There is no earlier version of either worker in production — this release
introduces them. Rolling a worker back means **stopping** it (Render: suspend
the service). If only one worker misbehaves, suspend just that one; the
capability model keeps the other unaffected.

## 16. Database restore ⛔

Restore into a **new** database and repoint; never restore over a live one.
Which dump you restore decides which web may serve it:

| Restoring | Tables | Web that may serve it | Workers |
| --------- | ------ | --------------------- | ------- |
| the step-3 **pre-migration** dump | 8, no journal | **only `f0a2ceb`** — the new web against it is forbidden (compatibility row 10) | stopped |
| a **post-migration** snapshot | 38, journal of 7 | `f0a2ceb` or the release web | per runbook 14 |

```bash
createdb brasil_afora_restored
pg_restore -d brasil_afora_restored --no-owner --no-privileges <dump>

# Verify before repointing anything:
psql brasil_afora_restored -tAc "SELECT count(*) FROM information_schema.tables
                                 WHERE table_schema='public' AND table_type='BASE TABLE';"  # 8 or 38
psql brasil_afora_restored -tAc "SELECT to_regclass('drizzle.__drizzle_migrations');"       # empty for pre-migration
psql brasil_afora_restored -tAc "SELECT count(*) FROM users;"                               # vs rollout step 6
psql brasil_afora_restored -tAc "SELECT count(*) FROM opportunities;"                       # vs rollout step 6
```

Then: suspend the scheduler, stop both workers, roll the web back if the table
above requires it, repoint `DATABASE_URL` on the web, redeploy it, and restart
workers last (only if the web is the release web).

Rehearsed 2026-09-20 on a production-shaped clone: `pg_restore` under one
second, zero warnings; 38 tables, 495 columns, 7 journal rows; a
byte-identical content digest across users, both opportunity sets, link
assessments and queue jobs; and a schema change made after the snapshot was
correctly absent from the restore.
