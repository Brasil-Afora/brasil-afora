# Rollout and rollback

## Environment requirements

- Local/test: fixture extraction and PGlite migration/workflow tests.
- Staging: isolated PostgreSQL, reviewer auth, object storage policy, service tokens, email/OAuth test credentials, worker processes, and a real deployed URL.
- Production: separate secrets, backups, canary controls, monitored workers, incident contact, and reviewed retention/takedown policy.

## Rollout sequence

1. Deploy framework/auth dependency fixes and disabled legacy writes.
2. Back up staging; apply additive migrations; run tests.
3. Run `bun run data:audit` and `npm run semantic:audit` in dry-run mode and review both reports.
4. Apply only deterministic review-task backfill with `npm run semantic:backfill`.
5. Deploy ingestion/reviewer evidence panels with no automatic publication.
6. Configure separate 32+ character ingestion, maintenance, and outbox tokens.
7. Ingest a small reviewed official source, correct it, approve it, deliver outbox, and verify the public UI.
8. Enable structured reads behind `NEXT_PUBLIC_STRUCTURED_OPPORTUNITIES=true` for a canary.
9. Run recrawl/link-check and verify material update or closure behavior.
10. Expand to 10–20 policy-reviewed sources with manual approval.
11. Build/label the real corpus and measure source-specific safety metrics.
12. Consider automatic publication only for a cohort meeting every gate threshold.

## Rollback

- **Structured public read:** set the feature flag false and redeploy; compatibility projections continue serving.
- **Publication:** unpublish through v1 and run the outbox worker. Do not directly delete canonical evidence.
- **Application:** deploy the prior build and stop new workers.
- **Migration:** prefer leaving additive schema in place. If reversal is mandatory, stop writers, restore the verified pre-migration backup, and reconcile outbox/idempotency events before resuming.
- **Source pilot:** disable the source, cancel/stop queued work, and retain evidence/audit.

## Staging acceptance path

The automated PGlite test demonstrates the fixture path. The local PostgreSQL
pilot in `LOCAL_REAL_SOURCE_PILOT.md` additionally proves one live official
source, browser review, publication, unchanged recrawl, controlled material
change, public replacement, and local dump/restore. A separately deployed
staging run is still **Unknown/blocked by environment access** and must not be
represented by the local pilot.
