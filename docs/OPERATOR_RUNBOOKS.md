# Operator runbooks

Command-oriented. Every runbook assumes `$WEB` is the public origin and `$DB`
is the production `DATABASE_URL`. Credentials come from the environment group,
never from this file.

A runbook that mutates production is marked ⛔ and requires the operator
checkpoint named in `docs/PRODUCTION_ROLLOUT_SEQUENCE.md`.

---

## 1. Web deploy ⛔

```bash
# Confirm the target SHA first — never deploy "latest".
git -C brasil-afora rev-parse release-2026-09-21-web
```

Deploy that exact SHA from the Vercel project dashboard. Note: pushing to
`main` triggers an automatic production deployment of **two** projects
(`brasil-afora`, `passaporte-global`). Decide beforehand whether you are
fast-forwarding `main` or deploying a SHA directly.

Verify:
```bash
curl -sS -o /dev/null -w '%{http_code}\n' "$WEB/api/v1/opportunities"   # 200
```

## 2. Migration ⛔

```bash
pg_dump "$DB" -Fc -f "backup-$(date -u +%Y%m%dT%H%M%SZ).dump"   # never skip
DATABASE_URL="$DB" bun run db:migrate
psql "$DB" -c "SELECT count(*) FROM drizzle.__drizzle_migrations;"          # 7
psql "$DB" -c "SELECT count(*) FROM information_schema.tables
               WHERE table_schema='public' AND table_type='BASE TABLE';"    # 38
```

Migrations are forward-only. There is no down-migration; recovery is restore
(runbook 16).

## 3. Source-worker deploy / restart

```bash
# Render dashboard: Manual Deploy → the release SHA, or Restart.
# Verify it authenticated and found an empty queue:
#   log line from one cycle, no 401/403
```

Safe to restart at any time: an in-flight job's lease expires after 15 minutes
and BF-08 reclaims it.

## 4. Link-worker deploy / restart

```bash
# Start command (the condition flag is required):
bun --conditions react-server src/workers/application-link-worker.ts
# One batch only, for a canary or a manual drain:
bun --conditions react-server src/workers/application-link-worker.ts --once
```

SIGTERM finishes the job in flight before exiting.

## 5. Scheduler enable / disable

```bash
# Disable: suspend the Render cron job. Confirm it is suspended, then:
psql "$DB" -c "SELECT max(created_at) FROM audit_events
               WHERE action='recrawl.schedule.completed';"
# No new rows after the suspension time = the scheduler is genuinely off.
```

Disable the scheduler **first** in every incident: it is the only thing that
creates new work.

## 6. Manual scheduler execution

```bash
curl --fail -sS -X POST "$WEB/api/v1/maintenance/recrawls/schedule" \
  -H "authorization: Bearer $SCHEDULER_TOKEN" \
  -H 'content-type: application/json' -d '{}'
# → {"data":{"application_link_jobs":N,"source_document_jobs":M}}
```

Idempotent within an hour: the deduplication key buckets by hour, so a second
call in the same hour creates nothing.

## 7. Queue inspection

```bash
psql "$DB" -c "SELECT job_kind, status, count(*) FROM recrawl_jobs GROUP BY 1,2 ORDER BY 1,2;"
psql "$DB" -c "SELECT extract(epoch FROM now()-min(scheduled_for)) AS oldest_queued_s
               FROM recrawl_jobs WHERE status='queued';"
psql "$DB" -c "SELECT id, job_kind, priority, reason, scheduled_for
               FROM recrawl_jobs WHERE status='queued'
               ORDER BY priority DESC, scheduled_for LIMIT 20;"
```

## 8. Dead-letter investigation

```bash
psql "$DB" -c "SELECT id, job_kind, attempts, max_attempts,
                      completed_at, left(last_error,200) AS err
               FROM recrawl_jobs WHERE status='dead_lettered'
               ORDER BY completed_at DESC LIMIT 20;"
```

`last_error` preserves the machine code (e.g.
`ApplicationLinkVerificationError: APPLICATION_URL_MISSING: …`). Triage by
code, not by prose.

To retry one job after fixing the cause:
```sql
UPDATE recrawl_jobs
   SET status='queued', attempts=0, lease_token=NULL, locked_by=NULL,
       locked_at=NULL, completed_at=NULL, last_error=NULL,
       scheduled_for=now()
 WHERE id = '<job-id>' AND status='dead_lettered';
```
Only ever re-queue a job whose failure cause you have actually fixed.

## 9. Stale lease investigation

```bash
psql "$DB" -c "SELECT id, job_kind, locked_by, locked_at, attempts
               FROM recrawl_jobs
               WHERE status='running' AND locked_at < now() - interval '15 minutes';"
```

**Do not clear these by hand.** BF-08 reclaims an expired lease on the next
claim, incrementing attempts exactly once. Manual clearing is what creates the
double-execution the fencing exists to prevent. If rows persist across several
claim cycles, the worker is dying mid-job — investigate the worker, not the row.

## 10. Supervised ONE run ⛔

```bash
brasil-afora-source-run \
  --web-base-url "$WEB" \
  --adapter one_ufma \
  --source-cohort supervised_source_run
# Requires SOURCE_RUN_OPERATOR_TOKEN and BRASIL_AFORA_INGESTION_TOKEN.
```

Manual only. Never schedule this. Afterwards run runbook 11 and review every
resulting review task before anything is approved.

## 11. Source health review

```bash
curl -sS "$WEB/api/v1/maintenance/source-runs?source_id=$SOURCE_ID" \
  -H "authorization: Bearer $SOURCE_RUN_OPERATOR_TOKEN"
psql "$DB" -c "SELECT status, started_at, finished_at, pages_expected,
                      pages_succeeded, pages_failed, candidates_discovered,
                      candidates_valid, reconciliation_eligible, error_categories
               FROM source_runs ORDER BY started_at DESC LIMIT 10;"
```

`candidates_valid = 0` on a `healthy` run is the anomaly that matters: a source
that has silently stopped yielding looks exactly like a source with no news.

## 12. Source disable

```sql
UPDATE sources SET enabled = false WHERE id = '<source-id>';
```

`scheduleDueRecrawls` only considers `enabled = true` sources, so this stops
new work immediately. Already-queued jobs for that source remain; cancel them
explicitly if needed:
```sql
UPDATE recrawl_jobs SET status='dead_lettered', completed_at=now(),
       last_error='source disabled by operator'
 WHERE source_id='<source-id>' AND status='queued';
```

## 13. Credential rotation

See `docs/PRODUCTION_TOPOLOGY.md` §3 (R1–R5). Summary for a maintenance token:

```bash
# 1. suspend the scheduler cron
# 2. stop the holder service
# 3. set the new value on the web AND the holder (values must be distinct
#    from every other maintenance credential, ≥32 chars)
# 4. redeploy the web, then the holder
# 5. verify scope is intact before re-enabling the scheduler:
curl -sS -o /dev/null -w '%{http_code}\n' -X POST "$WEB/api/v1/maintenance/recrawls/claims" \
  -H "authorization: Bearer $SOURCE_WORKER_TOKEN" -d '{"limit":1}'   # 200
curl -sS -o /dev/null -w '%{http_code}\n' -X POST "$WEB/api/v1/maintenance/recrawls/schedule" \
  -H "authorization: Bearer $SOURCE_WORKER_TOKEN" -d '{}'            # 403
# 6. re-enable the scheduler
```

A 503 from any maintenance route after rotation means two credentials share a
value, or one is under 32 characters.

## 14. Web rollback ⛔

```bash
# Vercel dashboard → Deployments → the previous production deployment → Promote.
```

Rolling back the web past this release also rolls back the auth contract. The
previous release (`ffdffe2`) accepts only `MAINTENANCE_WORKER_TOKEN`, so:

1. disable the scheduler,
2. stop both workers,
3. promote the previous web deployment,
4. leave the workers stopped unless you also roll them back (runbook 15) and
   restore `MAINTENANCE_WORKER_TOKEN`.

The site itself is fine with workers stopped — the queue simply stalls, and
nothing is published either way. **Measured:** the pre-release web serves the
fully migrated database correctly (compatibility row 2), so a web rollback
after migration needs no database action.

## 15. Worker rollback ⛔

```bash
# Render dashboard → the worker service → Manual Deploy → the previous SHA.
```

Roll both workers back together with the web (see runbook 14). A rolled-back
Python worker needs `MAINTENANCE_WORKER_TOKEN` restored, and the rolled-back
web must be the version that still accepts it. There is no application-link
worker before this release, so rolling it back means deleting the service.

## 16. Database restore ⛔

Restore into a **new** database and repoint, rather than restoring over a live
one:

```bash
createdb brasil_afora_restored
pg_restore -d brasil_afora_restored --no-owner --no-privileges backup-<stamp>.dump

# Verify before repointing anything:
psql brasil_afora_restored -c "SELECT count(*) FROM information_schema.tables
  WHERE table_schema='public' AND table_type='BASE TABLE';"     # 38
psql brasil_afora_restored -c "SELECT count(*) FROM drizzle.__drizzle_migrations;"  # 7
psql brasil_afora_restored -c "SELECT count(*) FROM users;"
psql brasil_afora_restored -c "SELECT count(*) FROM opportunities;"
psql brasil_afora_restored -c "SELECT count(*) FROM publication_versions;"

# Then: disable the scheduler, stop both workers, repoint DATABASE_URL on the
# web and the link worker, redeploy both, restart the workers last.
```

Rehearsed 2026-09-20 against a production-shaped clone: `pg_restore` completed
in under one second with zero warnings, restoring 38 tables / 495 columns /
7 journal rows, with a byte-identical content digest across users,
opportunities, national opportunities, link assessments, and queue jobs — and
an accidental schema mutation made after the snapshot was correctly absent
from the restore.
