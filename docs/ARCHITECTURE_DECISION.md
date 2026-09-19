# Architecture decision: evidence-first modular monolith

## Decision

Partially replace the former scraper-to-flat-draft design with a source-managed evidence pipeline and keep the website as a modular monolith. The Python process handles policy-aware acquisition and interpretation. The Next.js/PostgreSQL application owns the canonical transaction, reviewer decisions, publication state, public contract, and maintenance queues.

This follows the scheduler/downloader/spider/item-pipeline separation used by mature crawlers while avoiding premature Kafka, a browser farm, a vector database, or microservices. Browser rendering is fallback-only. Deterministic parsers and structured metadata run before model-assisted extraction; model-supplied critical fields must review.

## Why

- Accuracy requires immutable evidence, edition-aware identity, field conflicts, and human corrections—not a larger CSS-selector list.
- A program is not an annual edition, and an edition can have multiple application rounds.
- HTTP availability is not application availability.
- Version-scoped public projections prevent unapproved recrawl values from leaking into production.
- PostgreSQL transactions, row locking, idempotency keys, outbox, retry, and dead-letter state are sufficient at current scale.

## Trade-offs

- Manual Pydantic/Zod parity is simpler now but can drift; generated types are a later optimization.
- PostgreSQL queues reduce infrastructure but require disciplined indexing/locking and may eventually need a dedicated queue at much higher volume.
- Keeping compatibility tables duplicates a projection, but enables canary rollout and fast read rollback.
- Source-specific adapters cost maintenance; they should be added only after generic extraction failures are measured.
- Raw content currently fits a bounded inline pilot. Object storage is required before a large PDF corpus.

## Automatic publication

No source cohort is eligible today. The code understands `auto_ready`, but human approval remains mandatory because the required real-source precision, sample size, correction rate, and expired-as-active rate are **not measured**.

