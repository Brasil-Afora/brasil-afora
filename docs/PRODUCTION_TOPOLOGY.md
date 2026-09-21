# Production topology, secrets, and Render configuration

Status: proposed, not deployed. No production service, database, scheduler, or
worker described here has been created or enabled by the work that produced
this document.

Release pair this topology targets:

| Side   | Repository                        | Tag                              |
| ------ | --------------------------------- | -------------------------------- |
| Web    | `Brasil-Afora/brasil-afora`       | `release-2026-09-21-web`         |
| Python | `Brasil-Afora/brasil-afora-scraper` | `release-2026-09-21-scraper`   |

The historical baselines `release-baseline-web-2026-09-19` (`ffdffe2`) and
`release-baseline-2026-09-19` (`189459f`) are archival and are never rewritten.

---

## 1. Services

Five runtime units. The two workers are deliberately separate services: they
hold different credentials, claim different job kinds, fail independently, and
scale independently. Putting them in one process would put both job kinds
behind one credential again, which is exactly what the capability model exists
to prevent.

### 1.1 Web — Vercel (existing) or Render Web Service

The web application is today deployed on Vercel from `Brasil-Afora/brasil-afora`
(projects `brasil-afora` and `passaporte-global`). That deployment target is
unchanged by this release. If the web is moved to Render instead:

| Setting      | Value                                                     |
| ------------ | --------------------------------------------------------- |
| Type         | Web Service (Node 26.7.0)                                  |
| Region       | `oregon` — must match the database region                  |
| Build        | `bun install --frozen-lockfile && bun run build`            |
| Start        | `bun run start -p $PORT`                                    |
| Health check | `GET /api/v1/opportunities` (public, no auth, touches the DB) |
| Autoscaling  | off for the first rollout; 1 instance                       |

Do **not** use `/login` as the health check: it returns 500 in production today
(pre-existing SSR defect, see `docs/ROLLOUT_AND_ROLLBACK.md`).

### 1.2 Source-document worker — Render Background Worker

| Setting  | Value                                                                 |
| -------- | --------------------------------------------------------------------- |
| Type     | Background Worker                                                      |
| Runtime  | Python 3.14.7                                                          |
| Region   | same as the database                                                   |
| Build    | `uv sync --frozen --no-editable`                                       |
| Start    | see below                                                              |
| Instances| 1 (the queue is claim-fenced, but one instance keeps crawl politeness simple) |
| Restart  | on failure, with backoff                                               |

`brasil-afora-worker` executes exactly one bounded batch and exits. Render
Background Workers expect a long-lived process, so wrap it:

```bash
while true; do
  brasil-afora-worker --web-base-url "$WEB_BASE_URL" --limit 1 || true
  sleep "${SOURCE_WORKER_IDLE_SLEEP_SECONDS:-60}"
done
```

The `|| true` is deliberate: a single failed batch must not restart the
service, because the queue already classified and recorded that failure. A
crash loop would only re-attempt the same job faster than its retry schedule.

### 1.3 Application-link worker — Render Background Worker

| Setting  | Value                                                                       |
| -------- | ----------------------------------------------------------------------------|
| Type     | Background Worker                                                            |
| Runtime  | Node 26.7.0 / Bun 1.3.14                                                     |
| Region   | same as the database                                                         |
| Build    | `bun install --frozen-lockfile`                                              |
| Start    | `bun --conditions react-server src/workers/application-link-worker.ts`       |
| Instances| 1                                                                            |
| Restart  | on failure, with backoff                                                     |

The `--conditions react-server` flag is required, not cosmetic: the worker
imports server modules marked with the `server-only` package, whose export map
resolves to an empty module only under that condition. Without it the process
exits immediately with "This module cannot be imported from a Client Component
module."

This worker runs its own loop (`LINK_WORKER_IDLE_SLEEP_MS`, default 30s), so
no wrapper is needed. Pass `--once` to run a single batch, which is what the
canary uses.

Shutdown: SIGTERM finishes the job in flight and exits; an idle sleep is cut
short immediately. It claims **one job per cycle by default**
(`LINK_WORKER_BATCH_LIMIT=1`) because every job in a claimed batch is leased at
claim time — a larger batch means a SIGTERM must either wait for all of them or
abandon leases until they expire 15 minutes later. One job is at most ~20 s
(10 s robots.txt fetch + 10 s page fetch, both hard timeouts), which fits inside
Render's default 30 s shutdown grace. Set the service's shutdown delay to 60 s
anyway for margin. Verification is sequential and network-bound, so a larger
batch saves only claim round trips, never throughput.

### 1.4 Scheduler — Render Cron Job

| Setting  | Value                                                                  |
| -------- | ---------------------------------------------------------------------- |
| Type     | Cron Job                                                                |
| Schedule | `0 * * * *` (hourly, UTC)                                               |
| Command  | see below                                                               |

```bash
curl --fail --silent --show-error --max-time 60 \
  -X POST "$WEB_BASE_URL/api/v1/maintenance/recrawls/schedule" \
  -H "authorization: Bearer $SCHEDULER_TOKEN" \
  -H 'content-type: application/json' -d '{}'
```

Hourly matches the scheduler's own deduplication key, which buckets candidates
by hour: running more often creates no extra jobs, running less often loses
resolution on the 6-hour cadence tier.

`--fail` matters. Without it curl exits 0 on an HTTP 403, and a scheduler whose
credential has been rotated away would look healthy while scheduling nothing.

### 1.5 ONE source runs — manual, supervised, no service

ONE stays supervised. There is **no** cron job, no worker, and no scheduled
command for it. An operator runs `brasil-afora-source-run` by hand from a
workstation or a one-off Render job, reviews the resulting evidence, and
publishes nothing automatically.

This is enforced in code, not only by convention: `scheduleDueRecrawls`
excludes every source whose `discovery_methods` contains `supervised_run`, and
supervised-run jobs carry `source_run_id` in their payload, which unscoped
claims explicitly exclude. Both behaviours are covered by
`bf10-source-runs.test.ts`.

### 1.6 Database — Render PostgreSQL 17

| Setting              | Value                                                |
| -------------------- | ---------------------------------------------------- |
| Version              | 17                                                    |
| Region               | same as every service above                           |
| Backups              | daily automated + a manual snapshot before migration  |
| Connections          | web pool default; each worker `max: 4`                |

---

## 2. Service dependency order

```
PostgreSQL
   └── Web  ──────────────┬── Source worker (HTTP to web, DB only via web)
                          ├── Link worker  (HTTP to web for the queue,
                          │                 direct DB for verification writes)
                          └── Scheduler cron (HTTP to web)
```

The link worker is the only unit besides the web with a direct `DATABASE_URL`.
It still takes and releases jobs over HTTP, so BF-08 lease fencing remains
server-authoritative; only the verification write itself is local.

---

## 3. Environment and secrets matrix

No values appear here. `W`=web runtime, `S`=source worker, `L`=link worker,
`C`=scheduler cron, `B`=web build time, `CI`=CI only.

| Name                        | W | S | L | C | B | CI | Secret | Must match                        | Rotation |
| --------------------------- |:-:|:-:|:-:|:-:|:-:|:--:|:------:| --------------------------------- | -------- |
| `DATABASE_URL`              | ✅ |   | ✅ |   |   | ✅ | secret | web ↔ link worker, exactly        | R1 |
| `SCHEDULER_TOKEN`           | ✅ |   |   | ✅ |   |    | secret | web ↔ cron, exactly               | R2 |
| `SOURCE_WORKER_TOKEN`       | ✅ | ✅ |   |   |   |    | secret | web ↔ source worker, exactly      | R2 |
| `LINK_WORKER_TOKEN`         | ✅ |   | ✅ |   |   |    | secret | web ↔ link worker, exactly        | R2 |
| `SOURCE_RUN_OPERATOR_TOKEN` | ✅ |   |   |   |   |    | secret | web ↔ operator workstation        | R2 |
| `INGESTION_API_TOKEN`       | ✅ |   |   |   |   |    | secret | web ↔ `BRASIL_AFORA_INGESTION_TOKEN` | R2 |
| `BRASIL_AFORA_INGESTION_TOKEN` |  | ✅ |   |   |   |    | secret | = web `INGESTION_API_TOKEN`       | R2 |
| `OUTBOX_WORKER_TOKEN`       | ✅ |   |   |   |   |    | secret | web ↔ outbox caller (none yet)    | R2 |
| `BETTER_AUTH_SECRET`        | ✅ |   |   |   | ✅ |  ✅ | secret | single value across web instances | R3 |
| `BETTER_AUTH_URL`           | ✅ |   |   |   | ✅ |  ✅ | public | = public origin                   | — |
| `NEXT_PUBLIC_APP_URL`       | ✅ |   |   |   | ✅ |  ✅ | public | = public origin; baked into the build | — |
| `GOOGLE_CLIENT_ID`          | ✅ |   |   |   | ✅ |  ✅ | public | = Google console                  | R4 |
| `GOOGLE_CLIENT_SECRET`      | ✅ |   |   |   | ✅ |  ✅ | secret | = Google console                  | R4 |
| `RESEND_API_KEY`            | ✅ |   |   |   | ✅ |  ✅ | secret | = Resend dashboard                | R4 |
| `RESEND_FROM_EMAIL`         | ✅ |   |   |   | ✅ |  ✅ | public | verified Resend sender            | — |
| `CORS_ORIGIN`               | ✅ |   |   |   |   |    | public | comma-separated origins           | — |
| `NEXT_PUBLIC_STRUCTURED_OPPORTUNITIES` | ✅ | | | | ✅ | ✅ | public | build-time flag               | — |
| `WEB_BASE_URL`              |   | ✅ | ✅ | ✅ |   |    | public | = web public origin               | — |
| `LINK_WORKER_BATCH_LIMIT`   |   |   | ✅ |   |   |    | public | default 1 — see §1.3 before raising | — |
| `LINK_WORKER_IDLE_SLEEP_MS` |   |   | ✅ |   |   |    | public | default 30000                      | — |
| `SOURCE_WORKER_IDLE_SLEEP_SECONDS` | | ✅ |  |   |   |    | public | default 60                     | — |
| `BRASIL_AFORA_SCRAPER_DEPLOY_KEY`  | | | |   |   | ✅ | secret | release-gate repo only            | R5 |

### Retired

`MAINTENANCE_WORKER_TOKEN` is retired. The web application no longer reads it,
and a request bearing it is rejected. **Delete it from every production
environment group.** Leaving it set is not a vulnerability — nothing accepts it
— but it misleads an operator into believing a credential is live.

### Rules

- Every bearer credential must be ≥32 characters. A shorter one makes the web
  return 503 on all maintenance routes rather than authenticating anything.
- No two maintenance credentials may share a value. The web detects that and
  returns 503 (`MAINTENANCE_AUTH_SCOPE_COLLAPSE`), because a shared secret
  silently merges two capability sets back into one omnipotent token.
- `BRASIL_AFORA_SCRAPER_DEPLOY_KEY` is CI-only and read-only. It must never
  appear in a production runtime environment group.
- `NEXT_PUBLIC_*` values are baked into the client bundle at build time;
  changing one requires a rebuild, not a restart.

### Rotation procedures

- **R1 `DATABASE_URL`** — rotate the database password, update the web and link
  worker environment groups together, redeploy both. The source worker and
  scheduler are unaffected (they hold no database credential).
- **R2 maintenance/ingestion bearer tokens** — these are single-valued, so
  rotation is a brief outage of that one capability, not of the site:
  1. disable the scheduler cron,
  2. stop the affected worker,
  3. set the new value on the web and on the holder,
  4. redeploy the web, then the holder,
  5. re-enable the scheduler.
  Because capabilities are separated, rotating `LINK_WORKER_TOKEN` cannot
  disturb source-document ingestion, and vice versa.
- **R3 `BETTER_AUTH_SECRET`** — invalidates every active session. Announce it;
  rotate off-peak.
- **R4 third-party keys** — rotate in the provider console first, then update
  and redeploy the web.
- **R5 CI deploy key** — delete the deploy key on
  `Brasil-Afora/brasil-afora-scraper`, create a new read-only key, update the
  `BRASIL_AFORA_SCRAPER_DEPLOY_KEY` secret on
  `Brasil-Afora/brasil-afora-release-gate`, re-run the release gate.

---

## 4. Capability model

| Credential                  | Principal id          | Capabilities                                        |
| --------------------------- | --------------------- | --------------------------------------------------- |
| `SCHEDULER_TOKEN`           | `scheduler`           | `queue:schedule`                                     |
| `SOURCE_WORKER_TOKEN`       | `source-worker`       | `queue:claim:source_document`, `queue:write`         |
| `LINK_WORKER_TOKEN`         | `link-worker`         | `queue:claim:application_link`, `queue:write`        |
| `SOURCE_RUN_OPERATOR_TOKEN` | `source-run-operator` | `source-run:manage`, `queue:claim:source_document`, `queue:write` |
| `INGESTION_API_TOKEN`       | `scraper`             | ingestion submission only                            |
| `OUTBOX_WORKER_TOKEN`       | `outbox-worker`       | outbox delivery only                                 |
| admin session               | the user's id         | every maintenance capability (human operator)        |

Three enforcement points, not one:

1. **Claim scope.** `job_kinds` is checked against the credential. Omitting it
   narrows to the credential's own kinds — it never means "all kinds".
2. **Lease fencing.** Checkpoint and completion require `locked_by` to equal
   the calling principal *and* the lease token to match. So even a credential
   holding `queue:write` cannot mutate a job it did not itself claim. Verified
   in `link-worker.test.ts` ("cannot complete a job claimed by another worker
   identity").
3. **Job-id claims.** Claiming by explicit `job_ids` is the supervised
   source-run path and the one claim that bypasses BF-10's `source_run_id`
   exclusion, so it additionally requires `source-run:manage`. Without that,
   an unattended source worker that learned a supervised run's job ids could
   claim work reserved for the run.

The principal id is also written to `audit_events.actor_id`, so the audit trail
now distinguishes `scheduler`, `source-worker`, `link-worker`, and
`source-run-operator` instead of recording one `maintenance-worker` for
everything.
