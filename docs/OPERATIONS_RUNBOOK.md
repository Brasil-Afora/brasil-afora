# Operations runbook

## Worker cadence

1. Call recrawl scheduling hourly with `SCHEDULER_TOKEN` (see `docs/OPERATOR_RUNBOOKS.md` for the full, current runbooks).
2. Workers claim bounded jobs using `FOR UPDATE SKIP LOCKED`.
3. Fetch and submit a v1 ingestion using the job source document.
4. Complete the job with success/material-change metadata or a bounded error.
5. Run application-link checks more often near deadlines and for published-active records.
6. Deliver outbox events with `OUTBOX_WORKER_TOKEN`. Each worker presents only its own scoped credential.

Locks expire, retries back off, and jobs/events dead-letter after bounded attempts. Reviewer-requested recrawls are idempotent.

## Daily checks

- Open critical review tasks and oldest review age.
- Link assessments that became closed, old-edition, generic, broken, or blocked.
- Failed/dead-letter recrawl jobs and outbox events.
- Published-active records whose `last_verified_at` exceeds source cadence.
- Deadline, application URL, eligibility, cost, date, and edition material-change alerts.
- Unexpected source volume, browser fallback, or repeated policy blocks.

## Operational queries

Use the admin audit API for entity history and the database for aggregate operations. Relevant tables are `review_tasks`, `application_link_assessments`, `recrawl_jobs`, `outbox_events`, `material_change_events`, `snapshots`, and `audit_events`. A hosted metrics exporter/dashboard is **Proposed**; these queries are the current observable control plane.

## Failure procedures

- **Source fetch failures:** pause the source after repeated policy/4xx drift; do not increase browser use automatically. Check robots/terms and adapter assumptions.
- **Application link closes:** verified closure updates operational lifecycle immediately, removes the apply action publicly, and opens a high/critical review alert.
- **Material recrawl change:** old approved projection remains public; inspect `update_pending`, compare evidence, correct if needed, then approve the new version.
- **Outbox failure:** inspect `last_error`; fix payload/constraint; retry by restoring `available_at` and clearing dead-letter only with an audit entry.
- **Review backlog:** prioritize critical link/deadline/eligibility tasks and near-deadline editions; do not enable auto-publish.
- **Bad publication:** unpublish, deliver the event, verify public 404/removal, then create a corrected version. Selected-version rollback is not yet implemented.
- **Migration failure:** stop deployment/workers, retain the failed logs, restore the backup or deploy the prior app; do not delete new evidence tables ad hoc.

## Required metrics and alert thresholds

Instrument source fetch/yield, browser fallback, retry/parse/adapter failures, review size/age/time, corrections, link failures, outbox failures, recrawl lag, stale publications, expired-as-active, storage growth, and cost per approved record. Thresholds must be established from pilot data; none are **Measured** yet.

