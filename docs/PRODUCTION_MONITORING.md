# Production monitoring and operator diagnostics

Minimum observability required before the scheduler is enabled. Every signal
is derivable from data the application already writes — no new
instrumentation, only collection and alerting.

Sources: **W** web logs and metrics, **Q** SQL against production, **L**
worker logs (the link worker writes one JSON object per line; the source
worker prints its batch results as JSON and its errors to stderr).

Two alerts page immediately and are the reason this document exists:
**Publication safety** and **ONE supervision safety**, both at the end.

---

## Web

| Signal | Source | Alert |
| ------ | ------ | ----- |
| 5xx rate | W | > 1% of requests over 5 min |
| Database connection errors | W | any |
| `/api/v1/ingestions` 4xx/5xx | W | > 3 in 10 min |
| Maintenance 401s | W | > 10 in 10 min — a stale credential or a probe |
| Maintenance 403 `MAINTENANCE_SCOPE_FORBIDDEN` | W | **any in steady state** — every legitimate caller holds the capability it uses, so a 403 means a misconfigured service or a misused credential |
| Maintenance 503 `MAINTENANCE_AUTH_MISCONFIGURED` / `MAINTENANCE_AUTH_SCOPE_COLLAPSE` | W | **any — page**. Every maintenance route, admin sessions included, is refusing. The server log line `[maintenance-auth] …` names the offending variables; the HTTP body deliberately does not |
| `/api/v1/application-rounds/*/link-checks` duration | W | p95 > 50 s — verifications are hard-capped at 45 s, so this means the database writes after them are slow |

Known pre-existing exception: `GET /login` returns 500 (SSR `window is not
defined`). Exclude that route from the 5xx alert or it will never be quiet;
track it as its own defect.

## Queue

```sql
SELECT job_kind, status, count(*) FROM recrawl_jobs GROUP BY 1,2 ORDER BY 1,2;
SELECT job_kind, extract(epoch FROM now() - min(scheduled_for)) AS oldest_queued_s
  FROM recrawl_jobs WHERE status = 'queued' GROUP BY job_kind;
SELECT count(*) FROM audit_events
 WHERE action = 'recrawl.dead_lettered' AND created_at > now() - interval '1 hour';
SELECT count(*) FROM recrawl_jobs              -- stale, reclaimable
 WHERE status = 'running' AND locked_at < now() - interval '15 minutes';
SELECT count(*) FROM audit_events
 WHERE action = 'recrawl.dead_lettered' AND metadata->>'reason' = 'attempt_ceiling_before_claim'
   AND created_at > now() - interval '1 hour';
```

| Signal | Alert |
| ------ | ----- |
| queued, **per job kind** | > 500 |
| running | > 2 × worker instances |
| dead-lettered | > 5 new in one hour |
| oldest queued | > 6 h (the tightest scheduling cadence) |
| stale reclaimable | > 0 on two consecutive checks — a worker is dying mid-job |
| attempt-ceiling terminalizations | > 3 in one hour |

Track `queued` per kind. One total hides the failure this release fixes:
before it, `application_link` grew without bound while `source_document`
looked healthy.

## Source-document worker

| Signal | Source | Alert |
| ------ | ------ | ----- |
| Process alive | host | not running, or restarting repeatedly |
| Release SHA | deploy metadata | ≠ the frozen release pair |
| `could not operate` on stderr | L | any — the wrapper exits and the host restarts it; this is a configuration or reachability failure, never a job failure |
| Completed / hour | `audit_events` `actor_id='source-worker'`, `action='recrawl.completed'` | 0 for 3 h while source-document jobs are queued |
| Retryable failures | `action='recrawl.retry_scheduled'` | > 10 / h |
| Permanent failures | `action='recrawl.dead_lettered'` | > 3 / h |

In this release no registered source is unattended, so a healthy source
worker claims nothing, every cycle. "0 completed" is therefore normal until an
unattended source is registered; "0 completed **while jobs are queued**" is not.

## Application-link worker

The same five signals with `actor_id='link-worker'`, plus:

| Log event | Meaning | Alert |
| --------- | ------- | ----- |
| `batch_failed` | claiming failed — the web is unreachable or refusing | 3 in a row |
| `backing_off` | its own reach to the web is failing; it has stopped claiming and is backing off exponentially (to 30 min) so it cannot burn attempts across the queue | any |
| `completion_unconfirmed` | a verification finished but the queue never acknowledged it; the lease will expire and the job re-verify | > 5 / h |
| `forced_exit` | a second signal killed it mid-job | any outside a deploy |
| `fatal` | it could not start (bad environment) | any |

Assessment mix over the last day:

```sql
SELECT status, count(*) FROM application_link_assessments
 WHERE checked_at > now() - interval '24 hours' GROUP BY status ORDER BY 2 DESC;
```

The statuses are `current_and_open`, `current_but_not_open`, `closed`,
`old_edition`, `generic_homepage`, `results_page`, `login_only`, `broken`,
`redirected`, `blocked`, `unknown`.

| Signal | Alert |
| ------ | ----- |
| `broken` | > 20% of the day's checks |
| `closed` | > 3 × its 7-day average |
| `blocked` + `unknown` | > 30% — likely crawler policy or network, not real link failures |
| `broken` with reason `VERIFICATION_TIMEOUT` | > 10% — sites are slow, or the web's outbound network is |

### The one public effect the link worker has

It never writes editorial state, but by design (BF-06) the public API reads
the latest assessment on every request: a `current_and_open` result can restore
Apply on a listing a reviewer approved as **open** whose link was previously
blocked. It can never open Apply on a listing that is editorially closed or not
yet open. Review these daily; they are the automation's only lever on what the
public sees:

```sql
-- Latest assessment per round is current_and_open, while the approved
-- publication recorded a blocking link status.
SELECT DISTINCT ON (a.application_round_id)
       a.application_round_id, a.checked_at, a.final_url, a.reasons
  FROM application_link_assessments a
  JOIN application_rounds r ON r.id = a.application_round_id
  JOIN publication_versions pv
    ON pv.edition_id = r.edition_id AND pv.editorial_state = 'published'
 WHERE pv.payload->'public_projection'->>'application_link_status' IN
       ('broken','closed','current_but_not_open','generic_homepage','login_only','old_edition','results_page')
 ORDER BY a.application_round_id, a.created_at DESC;
```

Keep only the rows whose latest status is `current_and_open`. Spot-check each
`final_url` by hand. (A sign-in page with a sign-up link is classified
`login_only` from this release on; before it, such a page read as open.)

## Source runs

```sql
SELECT source_id, status, started_at, finished_at, pages_expected, pages_succeeded,
       pages_failed, candidates_discovered, candidates_valid, reconciliation_eligible
  FROM source_runs ORDER BY started_at DESC LIMIT 20;
SELECT source_id, max(finished_at) AS last_healthy
  FROM source_runs WHERE status = 'healthy' GROUP BY source_id;
```

| Signal | Alert |
| ------ | ----- |
| Latest run | `failed` |
| Last healthy completion | > 30 days ago for an active source |
| `reconciliation_eligible` | false on a run meant to reconcile |
| Zero yield | `candidates_valid = 0` with `status = 'healthy'` — **always investigate**: a source that silently stopped yielding looks identical to one with no news |
| Page failures | `pages_failed > 0`, or `pages_succeeded < pages_expected` |

---

## Publication safety — page

A version becomes public only when the outbox delivers a
`publication.approved` event, and that event is written only by a reviewer's
publication decision (`audit_events.actor_kind = 'reviewer'`). So every
published version must have one. Ingestion (`actor_kind = 'pipeline'`) and the
workers (`'service'`) create *draft* versions and assessments, never published
ones.

```sql
-- Published with no reviewer approval behind it. Must always be empty.
SELECT pv.id, pv.edition_id, pv.version, pv.created_at
  FROM publication_versions pv
 WHERE pv.editorial_state = 'published'
   AND NOT EXISTS (
     SELECT 1 FROM audit_events ae
      WHERE ae.entity_type = 'publication_version'
        AND ae.entity_id   = pv.id
        AND ae.action      = 'publication.approved'
        AND ae.actor_kind  = 'reviewer');
```

**Page on any row.** Also track `SELECT count(*) FROM publication_versions
WHERE editorial_state = 'published'` over time: it may only rise in step with
`publication.approved` audit events.

## ONE supervision safety — page

```sql
-- A supervised-run source must never receive an unattended queue job.
SELECT j.id, j.job_kind, j.requested_by, j.created_at
  FROM recrawl_jobs j
  JOIN sources s ON s.id = j.source_id
 WHERE 'supervised_run' = ANY (s.discovery_methods)
   AND NOT (j.payload ? 'source_run_id');
```

**Page on any row.** This is the invariant that keeps ONE supervised; one row
means the scheduler's exclusion has regressed. The release gate asserts the
same query is empty after its real-process run.

---

## Operator one-liners

```bash
psql "$DB" -c "SELECT job_kind, status, count(*) FROM recrawl_jobs GROUP BY 1,2 ORDER BY 1,2;"

# Who did what — the scoped principals make this legible.
psql "$DB" -c "SELECT actor_id, action, count(*) FROM audit_events
               WHERE created_at > now() - interval '24 hours' GROUP BY 1,2 ORDER BY 1,2;"

# Dead-letter triage — the machine error code is preserved in last_error.
psql "$DB" -c "SELECT id, job_kind, attempts, left(last_error, 140)
               FROM recrawl_jobs WHERE status = 'dead_lettered'
               ORDER BY completed_at DESC LIMIT 20;"
```
