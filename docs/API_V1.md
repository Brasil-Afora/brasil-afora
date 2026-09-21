# API v1 contract

The executable schemas are strict Zod definitions in `src/contracts/opportunity-v1.ts`. Every JSON response is `{ "data": ... }`; errors are `{ "error": { "code", "message", "issues"? } }`.

## Public

- `GET /api/v1/opportunities` — cursor-paginated structured records with field-level semantic states and Portuguese display text. Filters: collection, repeated/comma-separated opportunity type, education level, modality, Brazil eligibility and lifecycle; age; deadline range; free flag; limit. Unknown parameters return 422. Unknown semantic values fail closed.
- `GET /api/v1/opportunities/{edition_uuid}` — one latest published version or 404.

## Reviewer session and admin role

- `GET /api/v1/review-queue?cursor=&limit=` — evidence-aware queue.
- `GET /api/v1/snapshots/{uuid}` — bounded raw snapshot preview and metadata.
- `GET /api/v1/audit-events` — cursor pagination and entity filters.
- `POST /api/v1/editions/{uuid}/corrections` — idempotent human assertion/new version, including semantic state, applicability, reason, and display metadata.
- `POST /api/v1/editions/{uuid}/publication-decisions` — approve, reject, archive, or unpublish using an expected version.
- `POST /api/v1/editions/{uuid}/recrawls` — idempotent reviewer recrawl request.

## Service tokens

- `POST /api/v1/ingestions` — `Authorization: Bearer $INGESTION_API_TOKEN`; maximum 10 MiB; contract version `1.0`.
- `POST /api/v1/outbox/deliveries` — `$OUTBOX_WORKER_TOKEN`; bounded claim/delivery.
- `POST /api/v1/maintenance/recrawls/schedule` — `$SCHEDULER_TOKEN` (`queue:schedule`).
- `POST /api/v1/maintenance/recrawls/claims` — `$SOURCE_WORKER_TOKEN` (source documents), `$LINK_WORKER_TOKEN` (application links), or `$SOURCE_RUN_OPERATOR_TOKEN` (source documents; the only credential that may claim by explicit `job_ids`). An omitted `job_kinds` narrows to the credential's own kinds.
- `POST /api/v1/maintenance/recrawls/{uuid}/checkpoint` and `/completion` — any credential holding `queue:write`, and only for a job that credential itself claimed (BF-08 lease fencing).
- `POST|GET /api/v1/maintenance/source-runs`, `…/{uuid}/candidates`, `…/{uuid}/completion` — `$SOURCE_RUN_OPERATOR_TOKEN` (`source-run:manage`).
- `POST /api/v1/application-rounds/{uuid}/link-checks` — `$LINK_WORKER_TOKEN` (`link-check:run`). Returns `201 {"data": <assessment>, "meta": {"previous_status", "material_change"}}`; verification is capped at 45 s.

Each maintenance credential carries only the capabilities its actor needs; the full model is in `docs/PRODUCTION_TOPOLOGY.md` §4. The historical single `MAINTENANCE_WORKER_TOKEN` is retired and never accepted. Every service token must be at least 32 characters, and no two may share a value — the web refuses to authenticate any maintenance request (503) while two do. An admin session holds every maintenance capability.

## Write invariants

Strict bodies reject unknown keys. `not_stated` requires sufficient source coverage, `explicitly_unrestricted` requires evidence, and `not_applicable` must agree with applicability. Idempotent ingestion/correction/decision keys conflict if reused for different content. Reviewer decisions use optimistic version checks. Legacy opportunity writes return 410 after admin authentication. Approval refuses current semantic blockers; approval, review-task resolution, and outbox insertion share one database transaction.

## Compatibility gaps

Safe unpublish exists. Selected-version rollback is not yet an API action; create a reviewed new version or unpublish while a dedicated rollback operation is implemented. Structured filter vocabularies are currently published in the v1 contract/display-label map rather than a separate endpoint.
