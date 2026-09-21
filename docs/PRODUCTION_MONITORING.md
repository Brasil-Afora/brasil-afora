# Production monitoring and operator diagnostics

Minimum observability required before the scheduler is enabled. Every signal
below is derivable from data the application already writes — no new
instrumentation is required, only collection and alerting.

`W` = web logs/metrics, `Q` = SQL against the production database,
`L` = worker process logs (structured JSON, one object per line).

---

## Web

| Signal | Source | Alert |
| ------ | ------ | ----- |
| 5xx rate | W | > 1% of requests over 5 min |
| Database connection errors | W | any, immediately |
| Ingestion endpoint errors (`/api/v1/ingestions` 4xx/5xx) | W | > 3 in 10 min |
| Maintenance auth failures (401) | W | > 10 in 10 min — a stale credential or a probe |
| Maintenance **scope** failures (403 `MAINTENANCE_SCOPE_FORBIDDEN`) | W | **any in steady state.** Every legitimate caller holds the capability it uses, so a 403 means a misconfigured service or a misused credential |
| `MAINTENANCE_AUTH_MISCONFIGURED` / `MAINTENANCE_AUTH_SCOPE_COLLAPSE` (503) | W | **any, page immediately** — the credential set is unsound and every maintenance route is refusing |

Known pre-existing exception: `GET /login` returns 500 (SSR `window is not
defined`). Exclude that route from the 5xx alert or the alert will never be
quiet; track it as its own defect.

## Queue

```sql
SELECT status, count(*) FROM recrawl_jobs GROUP BY status;
SELECT job_kind, count(*) FROM recrawl_jobs WHERE status='queued' GROUP BY job_kind;
SELECT extract(epoch FROM now() - min(scheduled_for)) AS oldest_queued_seconds
  FROM recrawl_jobs WHERE status='queued';
SELECT count(*) FROM recrawl_jobs WHERE status='dead_lettered';
SELECT count(*) FROM audit_events
  WHERE action='recrawl.dead_lettered' AND created_at > now() - interval '1 hour';
SELECT count(*) FROM recrawl_jobs
  WHERE status='running' AND locked_at < now() - interval '15 minutes';  -- stale, reclaimable
SELECT count(*) FROM recrawl_jobs WHERE attempts >= max_attempts;
```

| Signal | Alert |
| ------ | ----- |
| queued count | > 500 |
| running count | > 2× the number of worker instances |
| dead-lettered count | > 5 new in one hour |
| oldest queued age | > 6 hours (the tightest scheduling cadence) |
| stale reclaimable count | > 0 for two consecutive checks — a worker is dying mid-job |
| max-attempt terminalizations | > 3 in one hour |

Track `queued` **per job kind**. A single total hides the failure this release
fixes: before it, `application_link` grew without bound while
`source_document` looked healthy.

## Source-document worker

| Signal | Source | Alert |
| ------ | ------ | ----- |
| Process alive | Render service health | not running |
| Release SHA | deploy metadata | ≠ the frozen release pair |
| Completed jobs / hour | `audit_events` where `actor_id='source-worker'` and `action='recrawl.completed'` | 0 for 3 h while `queued > 0` |
| Retryable failures | `action='recrawl.retry_scheduled'` | > 10 / h |
| Permanent failures | `action='recrawl.dead_lettered'` | > 3 / h |

## Application-link worker

Same five signals with `actor_id='link-worker'`, plus the assessment mix:

```sql
SELECT status, count(*) FROM application_link_assessments
  WHERE checked_at > now() - interval '24 hours' GROUP BY status;
```

| Signal | Alert |
| ------ | ----- |
| `available` | — (baseline) |
| `closed` | sudden > 3× the 7-day average |
| `broken` | > 20% of the day's checks |
| `unknown` + `blocked` | > 30% of the day's checks — likely a crawler-policy or network problem, not a real link failure |

Worker log events (one JSON object per line): `started`, `job_completed`,
`job_failed`, `batch_failed`, `shutdown_requested`, `stopped`. Alert on repeated `batch_failed`, which means
the queue API itself is unreachable or refusing.

## Source runs

```sql
SELECT source_id, status, started_at, finished_at,
       pages_expected, pages_succeeded, pages_failed,
       candidates_discovered, candidates_valid, reconciliation_eligible
  FROM source_runs ORDER BY started_at DESC LIMIT 20;
SELECT source_id, max(finished_at) FROM source_runs
  WHERE status='healthy' GROUP BY source_id;
```

| Signal | Alert |
| ------ | ----- |
| Latest run status | `failed` |
| Last healthy completion | older than 30 days for an active source |
| `reconciliation_eligible` | false on a run the operator intended to reconcile |
| Zero-yield anomaly | `candidates_valid = 0` while `status='healthy'` — **always investigate**: a source that silently stops yielding looks identical to a source with nothing new |
| Page failures | `pages_failed > 0`, or `pages_succeeded < pages_expected` |

## Publication safety

The single most important alert. Automation must never increase what the
public sees.

```sql
SELECT count(*) FROM publication_versions WHERE editorial_state='published';
SELECT count(*) FROM publication_versions
  WHERE created_at > now() - interval '1 hour';
-- any publication in the last hour NOT attributable to a human reviewer:
SELECT pv.id, pv.created_at, ae.actor_id, ae.actor_kind
  FROM publication_versions pv
  LEFT JOIN audit_events ae
    ON ae.entity_id = pv.id AND ae.created_at BETWEEN pv.created_at - interval '5 seconds'
                                                  AND pv.created_at + interval '5 seconds'
  WHERE pv.created_at > now() - interval '1 hour'
    AND (ae.actor_kind IS DISTINCT FROM 'user');
```

**Alert: page immediately** if the published count rises with no corresponding
reviewer action, or if any `publication_versions` row is created by an actor of
kind `service`.

## ONE supervision safety

```sql
-- A supervised-run source must never receive an unattended queue job.
SELECT j.id, j.job_kind, j.requested_by, j.payload
  FROM recrawl_jobs j
  JOIN sources s ON s.id = j.source_id
 WHERE 'supervised_run' = ANY(s.discovery_methods)
   AND NOT (j.payload ? 'source_run_id');
```

**Alert: page immediately** on any row. This is the invariant that keeps ONE
supervised; a single row means the scheduler exclusion has regressed.

Also alert if a `recrawl.schedule.completed` audit event reports
`source_document_jobs > 0` in the same hour that a supervised-only source
gained a job.

## Operator diagnostic one-liners

```bash
# Queue at a glance
psql "$DB" -c "SELECT job_kind, status, count(*) FROM recrawl_jobs GROUP BY 1,2 ORDER BY 1,2;"

# Who is doing what (scoped principals make this legible)
psql "$DB" -c "SELECT actor_id, action, count(*) FROM audit_events
               WHERE created_at > now() - interval '24 hours'
               GROUP BY 1,2 ORDER BY 1,2;"

# Dead-letter triage — the error code is preserved in last_error
psql "$DB" -c "SELECT id, job_kind, attempts, left(last_error,120)
               FROM recrawl_jobs WHERE status='dead_lettered'
               ORDER BY completed_at DESC LIMIT 20;"
```
