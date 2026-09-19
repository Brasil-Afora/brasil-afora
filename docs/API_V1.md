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
- `POST /api/v1/maintenance/recrawls/schedule`
- `POST /api/v1/maintenance/recrawls/claims`
- `POST /api/v1/maintenance/recrawls/{uuid}/completion`
- `POST /api/v1/application-rounds/{uuid}/link-checks`

Maintenance endpoints use `$MAINTENANCE_WORKER_TOKEN`. All service tokens must be at least 32 characters and are intentionally scoped separately.

## Write invariants

Strict bodies reject unknown keys. `not_stated` requires sufficient source coverage, `explicitly_unrestricted` requires evidence, and `not_applicable` must agree with applicability. Idempotent ingestion/correction/decision keys conflict if reused for different content. Reviewer decisions use optimistic version checks. Legacy opportunity writes return 410 after admin authentication. Approval refuses current semantic blockers; approval, review-task resolution, and outbox insertion share one database transaction.

## Compatibility gaps

Safe unpublish exists. Selected-version rollback is not yet an API action; create a reviewed new version or unpublish while a dedicated rollback operation is implemented. Structured filter vocabularies are currently published in the v1 contract/display-label map rather than a separate endpoint.
