# Production-readiness scorecard

Scores are evidence-based as of 2026-07-25. Fixture-backed work is **Implemented**, never **Measured**.

| Area | Score | Evidence and remaining risk |
| --- | ---: | --- |
| Crawler acquisition | 6/10 | Policy-aware HTTP, robots, limits, semantic snapshots, browser fallback exist. No reviewed 10–20-source pilot or live health metrics. |
| Extraction | 6/10 | Deterministic structured/DOM extraction and evidence assertions pass fixtures. No 250–300-document gold corpus. |
| Eligibility | 8/10 | Citizenship, residence, geography, age/reference, education, institution restrictions, explicit unrestricted states, source coverage, applicability, and adversarial fixtures are structured. Precision/recall remains unmeasured. |
| Entity resolution | 7/10 | program/edition/round identity, stable URLs/hashes, duplicate candidates, same-content replay, and source-document-anchored recrawls exist. Merge precision remains unmeasured across sources. |
| Persistence | 8/10 | Additive FK schema, normalized semantic state/applicability/coverage/display tables, transactions, idempotency, immutable evidence/version history, clean local PostgreSQL migration, local dump/restore drill, and dry/apply audit. Real staging migration not run. |
| API | 8/10 | Strict v1 writes/reads, auth scopes, pagination, audit, optimistic versions, compatibility shutdown. Selected-version rollback and filter-vocabulary endpoint missing. |
| Public frontend | 8/10 | Centralized Portuguese semantic wording, fail-closed age/cost/modality/eligibility filters, structured feature flag, exact dates, lifecycle/apply state, URL separation, and fallback image. Accessibility/browser matrix incomplete. |
| Reviewer workflow | 8/10 | Full field-state/applicability/coverage/evidence controls, alternatives, source preview, arbitrary corrections, canonical projection, approve/reject/archive/unpublish/recrawl. Selected-version rollback remains missing. |
| Publication safety | 9/10 | Mandatory gate, current semantic blocker enforcement, approval/task-resolution/outbox transaction, version-isolated public projection, stale-event supersession, and no legacy bypass. No cohort may auto-publish yet. |
| Lifecycle maintenance | 8/10 | SSRF-safe semantic link checks, recrawl priorities/locks/retries/dead-letter, material changes, closure overlay. Conditional HTTP/per-source health incomplete. |
| Testing | 8/10 | 103 Python tests and 43 monolith tests cover semantic state, coverage, applicability, filters, rendering policy, migration, corrections, publication isolation, recrawl, and outbox behavior. Local PostgreSQL IFES replay, lint, type checks, and production build pass. No deployed staging E2E, accessibility, load, or gold corpus. |
| Security | 7/10 | Scoped auth, SSRF/DNS/redirect protection, robots, sanitization, limits, audit, zero known dependency advisories. PDF sandbox/limits, image validator, retention sign-off incomplete. |
| Observability | 4/10 | Auditable state and runbook queries exist. No deployed metrics, dashboards, or alert routes. |
| Deployment readiness | 5/10 | CI, additive migrations, feature flag, dry-run backfill, rollout/rollback docs, local real-source pilot, and local restore drill exist. No staging credentials, deployed canary, or production restore drill. |
| **Overall** | **7.3/10** | Semantic integrity and reviewer/public honesty are materially stronger, and the local vertical slice works. Deployed launch proof and measured extraction quality are still absent. |

## Executive status

- **Fully integrated and tested:** fixture/source result → strict ingestion → canonical persistence → evidence review/correction → approval/outbox → structured public read → recrawl/material update → verified closure.
- **Implemented in isolation:** PDF extraction, browser fallback, source registry, and backfill/audit command.
- **Measured:** deterministic tests plus one local real-source operational path. No source-cohort accuracy metrics.
- **Production-ready:** the manual-review safety architecture and compatibility rollout design are close, subject to staging validation.
- **Unsafe:** auto-publishing any cohort; broad crawling; unreviewed images; claiming extraction precision; launch without operational telemetry.
- **Eligible auto-publish cohorts:** none.
- **Launch blockers:** real staging DB/deployment, policy-reviewed multi-source pilot, gold-corpus metrics, image/PDF production hardening, telemetry/alerts, selected-version rollback, and deployed restore drill.

## Prioritized roadmap

1. Repeat the proven local official-source path in staging and run the staging backup/restore drill.
2. Implement representative-image validation/rights persistence and PDF sandbox/storage limits.
3. Register 10–20 reviewed official sources; keep every record manual.
4. Build the 250–300-document/30-domain gold corpus and evaluation runner; measure correction time and critical-field safety.
5. Add production metrics/alerts and per-source health.
6. Add selected-version publication rollback and remaining reviewer identity/source actions.
7. Only then evaluate a narrow, source-specific auto-ready cohort.
