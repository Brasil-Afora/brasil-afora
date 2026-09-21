# Production topology, secrets, and Render configuration

Status: proposed, not deployed. No production service, database, scheduler, or
worker described here has been created or enabled by the work that produced
this document.

Release pair this topology targets:

| Side   | Repository                          | Tag                          |
| ------ | ----------------------------------- | ---------------------------- |
| Web    | `Brasil-Afora/brasil-afora`         | `release-2026-09-21-web`     |
| Python | `Brasil-Afora/brasil-afora-scraper` | `release-2026-09-21-scraper` |

The historical baselines `release-baseline-web-2026-09-19` (`ffdffe2`) and
`release-baseline-2026-09-19` (`189459f`) are archival and never rewritten.

---

## 1. Services

Four runtime units plus the existing database. The two workers are separate
services: they hold different credentials, claim different job kinds, fail
independently and scale independently. Putting them in one process would put
both job kinds behind one credential again — exactly what the capability model
exists to prevent.

Only the web holds a database credential. Both workers reach the system
through the web's HTTP API under their own scoped bearer credential.

### 1.1 Web — Vercel (existing)

The web stays where it is: Vercel, deployed from `Brasil-Afora/brasil-afora`.
That repository currently feeds **two** production projects, `brasil-afora`
and `passaporte-global`, which already serve different builds; which one is
authoritative must be settled before the rollout (rollout precondition).

If the web is ever moved to a Render Web Service instead:

| Setting      | Value |
| ------------ | ----- |
| Runtime      | Node 26.7.0, Bun 1.3.14 |
| Region       | the database's region |
| Build        | `bun install --frozen-lockfile && bun run build` |
| Start        | `bun run start -p $PORT` |
| Health check | `GET /api/v1/opportunities` (public, unauthenticated, reads the database) |
| Instances    | 1 for the first rollout |

Never use `/login` as a health check: it returns 500 in production today
(pre-existing SSR defect).

The link-check route declares `maxDuration = 60`. Vercel honours it (the
project's plan must allow 60 s); a Render web service ignores it.

### 1.2 Source-document worker — Render Background Worker

| Setting          | Value |
| ---------------- | ----- |
| Runtime          | Python 3.14.7 |
| Region           | the web's region |
| Build            | `uv sync --frozen --no-editable` |
| Start            | `scripts/run-source-worker.sh` |
| Instances        | 1 |
| Shutdown delay   | 30 s (default) — it stops within a second |
| Restart          | on failure, with backoff |

`brasil-afora-worker` runs one bounded batch and exits. The wrapper loops it
against `config/sources.toml` (the reviewed registry — the packaged default is
deliberately empty, and a worker started on it refuses to run). It exits
non-zero when the worker cannot operate at all, so Render restarts it and the
crash loop is visible; job failures are recorded on the queue and do not stop
it. Behaviour verified as a real process: idle cycle, SIGTERM exit in 0.03 s,
non-zero exit propagated when the web refuses the credential, exit 2 on a
missing registry.

**In this release the unattended worker has no work.** The only registered
source, ONE, is supervised-only, and the scheduler never schedules unattended
jobs for it. The service is still deployed: it proves the hosting path and its
credential continuously, and picks up work the moment an unattended source is
registered.

### 1.3 Application-link worker — Render Background Worker

| Setting          | Value |
| ---------------- | ----- |
| Runtime          | Bun 1.3.14 |
| Region           | the web's region |
| Build            | `bun install --frozen-lockfile` |
| Start            | `bun --conditions react-server src/workers/application-link-worker.ts` |
| Instances        | 1 |
| Shutdown delay   | **90 s** |
| Restart          | on failure, with backoff |

`--conditions react-server` is required: shared modules are marked with the
`server-only` package, which resolves to an empty module only under that
condition; without it the process exits at start-up.

It holds **no `DATABASE_URL`**. It claims and completes jobs over the
maintenance API and verifies each one by calling the web's
`POST /api/v1/application-rounds/{id}/link-checks`. The process that fetches
untrusted, externally sourced URLs therefore cannot write to the database
except through that one route.

Bounds, all enforced in code:

- each outbound HTTP request: 10 s **total** (5 s for robots.txt) — a hard
  limit on the whole exchange, not just socket idleness;
- each verification: **45 s** end to end, far inside the 15-minute queue
  lease, so a job can never be reclaimed while its verification still runs;
- the route: `maxDuration = 60`; the worker waits up to 75 s for it.

It claims one job per cycle (`LINK_WORKER_BATCH_LIMIT=1`): every job in a
claimed batch is leased at claim time, so a larger batch lengthens shutdown
without adding throughput. SIGTERM lets the job in flight finish (≤ 75 s,
hence the 90 s shutdown delay) and cuts an idle sleep short; a second signal
exits at once. When its own reach to the web fails, it backs off
exponentially (up to 30 min) instead of reclaiming, so a broken deployment
cannot burn attempts across the queue.

### 1.4 Scheduler — Render Cron Job

| Setting  | Value |
| -------- | ----- |
| Schedule | `0 * * * *` (hourly, UTC) |
| Command  | below |

```bash
curl --fail --silent --show-error --max-time 60 \
  -X POST "$WEB_BASE_URL/api/v1/maintenance/recrawls/schedule" \
  -H "authorization: Bearer $SCHEDULER_TOKEN" \
  -H 'content-type: application/json' -d '{}'
```

Hourly matches the scheduler's own deduplication key, which buckets by hour.
`--fail` matters: without it curl exits 0 on a 403, and a scheduler whose
credential was rotated away would look healthy while scheduling nothing.

### 1.5 ONE source runs — manual, supervised, no service

No cron job, no worker, no scheduled command. An operator runs
`brasil-afora-source-run … --registry config/sources.toml` by hand, reviews the
evidence, and publishes nothing automatically. Enforced in code, not only by
convention: the scheduler excludes every source whose `discovery_methods`
contains `supervised_run`; supervised-run jobs carry `source_run_id`, which
unattended claims exclude; and claiming by explicit job ids requires the
operator's `source-run:manage` capability.

### 1.6 Database — the existing production database, migrated in place

This rollout does **not** provision a database. It migrates the one production
already uses (wherever its `DATABASE_URL` points today) from 8 tables to 38.
Rehearsed on PostgreSQL 17; record production's `SELECT version()` before the
rollout (precondition). Backups: the provider's automated backups plus the
manual snapshot and logical dump taken at rollout step 3.

---

## 2. Service dependency order

```
PostgreSQL ── Web ──┬── Source worker   (HTTPS: claims, completion, ingestion)
                    ├── Link worker     (HTTPS: claims, completion, link checks)
                    └── Scheduler cron  (HTTPS: schedule)
```

Only the web holds `DATABASE_URL`.

---

## 3. Environment and secrets matrix

No values here. **W** web runtime, **S** source worker, **L** link worker,
**C** scheduler cron, **B** web build, **CI** release gate only.

| Name | W | S | L | C | B | CI | Secret | Must match | Rotation |
| ---- |:-:|:-:|:-:|:-:|:-:|:--:|:------:| ---------- | -------- |
| `DATABASE_URL` | ✅ | | | | ✅ | ✅ | secret | — (web only) | R1 |
| `SCHEDULER_TOKEN` | ✅ | | | ✅ | | ✅ | secret | web ↔ cron | R2 |
| `SOURCE_WORKER_TOKEN` | ✅ | ✅ | | | | ✅ | secret | web ↔ source worker | R2 |
| `LINK_WORKER_TOKEN` | ✅ | | ✅ | | | ✅ | secret | web ↔ link worker | R2 |
| `SOURCE_RUN_OPERATOR_TOKEN` | ✅ | | | | | ✅ | secret | web ↔ operator workstation | R2 |
| `INGESTION_API_TOKEN` | ✅ | | | | | ✅ | secret | = `BRASIL_AFORA_INGESTION_TOKEN` | R2 |
| `BRASIL_AFORA_INGESTION_TOKEN` | | ✅ | | | | ✅ | secret | = web `INGESTION_API_TOKEN` | R2 |
| `OUTBOX_WORKER_TOKEN` | ✅ | | | | | | secret | web ↔ outbox caller (none yet) | R2 |
| `BETTER_AUTH_SECRET` | ✅ | | | | ✅ | ✅ | secret | one value across web instances | R3 |
| `BETTER_AUTH_URL` | ✅ | | | | ✅ | ✅ | public | = public origin | — |
| `NEXT_PUBLIC_APP_URL` | ✅ | | | | ✅ | ✅ | public | = public origin; baked into the build | — |
| `GOOGLE_CLIENT_ID` | ✅ | | | | ✅ | ✅ | public | = Google console | R4 |
| `GOOGLE_CLIENT_SECRET` | ✅ | | | | ✅ | ✅ | secret | = Google console | R4 |
| `RESEND_API_KEY` | ✅ | | | | ✅ | ✅ | secret | = Resend | R4 |
| `RESEND_FROM_EMAIL` | ✅ | | | | ✅ | ✅ | public | a verified sender | — |
| `CORS_ORIGIN` | ✅ | | | | | | public | comma-separated origins | — |
| `NEXT_PUBLIC_STRUCTURED_OPPORTUNITIES` | ✅ | | | | ✅ | ✅ | public | build-time flag | — |
| `WEB_BASE_URL` | | ✅ | ✅ | ✅ | | | public | = web public origin | — |
| `SOURCE_WORKER_REGISTRY` | | ✅ | | | | | public | default `config/sources.toml` | — |
| `SOURCE_WORKER_IDLE_SLEEP_SECONDS` | | ✅ | | | | | public | default 60 | — |
| `LINK_WORKER_BATCH_LIMIT` | | | ✅ | | | | public | 1–100, default 1 (see §1.3) | — |
| `LINK_WORKER_IDLE_SLEEP_MS` | | | ✅ | | | | public | ≥1000, default 30000 | — |
| `BRASIL_AFORA_SCRAPER_DEPLOY_KEY` | | | | | | ✅ | secret | release-gate repository only | R5 |

`DATABASE_URL` is marked for build time because `src/lib/env.ts` requires it
at module load; the build never connects.

### Retired

`MAINTENANCE_WORKER_TOKEN`. Nothing reads it; a request bearing it is refused
(verified in the release gate with the variable actually set on the server).
Delete it from every environment group so no operator believes it is live.

### Rules

- Every bearer credential is ≥32 characters.
- The four maintenance credentials are pairwise distinct, and distinct from
  `INGESTION_API_TOKEN` and `OUTBOX_WORKER_TOKEN`. A shared value would merge
  two actors' capabilities, so the web refuses to authenticate anything — 503
  on every maintenance route, admin sessions included — until it is fixed. The
  503 body is generic; the server log names the variables.
- `BRASIL_AFORA_SCRAPER_DEPLOY_KEY` is CI-only and read-only; never in a
  production environment group.
- `NEXT_PUBLIC_*` values are baked in at build time: changing one needs a
  rebuild.

### Rotation

- **R1 `DATABASE_URL`** — rotate the database password, update the web,
  redeploy the web. No worker holds it.
- **R2 bearer credentials** — single-valued, so rotation is a brief outage of
  one capability, not of the site. Suspend the scheduler, stop the holder,
  **validate the new value** (length and distinctness — an invalid one takes
  every maintenance route down), set it on the web and the holder, redeploy the
  web then the holder, run the non-mutating probes in
  `docs/OPERATOR_RUNBOOKS.md`, resume the scheduler.
- **R3 `BETTER_AUTH_SECRET`** — invalidates every session. Announce; rotate
  off-peak.
- **R4 third-party keys** — rotate at the provider, then update and redeploy
  the web.
- **R5 CI deploy key** — delete the deploy key on
  `Brasil-Afora/brasil-afora-scraper`, add a new **read-only** one, update the
  `BRASIL_AFORA_SCRAPER_DEPLOY_KEY` secret on
  `Brasil-Afora/brasil-afora-release-gate`, re-run the gate.

---

## 4. Capability model

| Credential | Principal id | Capabilities |
| ---------- | ------------ | ------------ |
| `SCHEDULER_TOKEN` | `scheduler` | `queue:schedule` |
| `SOURCE_WORKER_TOKEN` | `source-worker` | `queue:claim:source_document`, `queue:write` |
| `LINK_WORKER_TOKEN` | `link-worker` | `queue:claim:application_link`, `queue:write`, `link-check:run` |
| `SOURCE_RUN_OPERATOR_TOKEN` | `source-run-operator` | `source-run:manage`, `queue:claim:source_document`, `queue:write` |
| `INGESTION_API_TOKEN` | `scraper` | ingestion submission only (separate module) |
| `OUTBOX_WORKER_TOKEN` | `outbox-worker` | outbox delivery only (separate module) |
| admin session | the user's id | every maintenance capability |

Three enforcement points:

1. **Claim scope.** `job_kinds` is checked against the credential; omitting it
   narrows to the credential's own kinds and never means "all kinds". An
   explicitly empty list claims nothing.
2. **Lease fencing.** Checkpoint and completion require `locked_by` to equal
   the calling principal *and* the lease token to match, so even a credential
   holding `queue:write` cannot change a job it did not claim.
3. **Job-id claims.** Claiming by explicit `job_ids` is the supervised
   source-run path, the one claim that bypasses BF-10's `source_run_id`
   exclusion, so it additionally requires `source-run:manage`.

The principal id is written to `audit_events.actor_id`, so the trail
distinguishes `scheduler`, `source-worker`, `link-worker` and
`source-run-operator`.
