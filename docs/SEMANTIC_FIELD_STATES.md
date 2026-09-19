# Semantic field states

## Purpose

Brasil Afora stores a field's value separately from the reason that a value is
present or absent. A missing value must never silently become “no restriction,”
“free,” “in person,” or “eligible.” The canonical implementation is shared by
the scraper contract, normalized PostgreSQL tables, reviewer queue, public API,
display formatter, and filters.

## Canonical states

| State | Meaning | Evidence rule | Typical gate effect |
| --- | --- | --- | --- |
| `explicit_value` | The source states a concrete value. | Supporting assertion or an auditable domain-derived value. | None if internally consistent. |
| `explicitly_unrestricted` | The source explicitly says there is no restriction. | At least one supporting source assertion is mandatory. | None. |
| `not_applicable` | The field is irrelevant for this opportunity. | Applicability must also be `not_applicable`, with a reason code. | None. |
| `not_stated` | Sufficient authoritative sources were checked and do not state it. | Coverage must be `complete` or `sufficient`. | Depends on criticality. |
| `unresolved` | Evidence exists but cannot yet be interpreted safely. | Preserve evidence and alternatives. | Review or block. |
| `conflicting` | Credible assertions materially disagree. | Preserve all conflicting assertion IDs. | Review or block. |
| `extraction_failed` | A required source could not be interpreted. | Preserve failure code and source coverage. | Review or block. |
| `pending_verification` | Required authoritative-source work remains. | Record checked and unchecked roles. | Review or block. |
| `suppressed` | The value is deliberately hidden by an editorial policy. | Reviewer reason and audit event are required. | None unless product policy says otherwise. |

`critical`, `conditional`, and `noncritical` are product-policy attributes, not
confidence estimates. `block`, `review`, and `none` are the resulting gate
impact for one version of one field.

## Source coverage

Coverage is field-specific:

- `complete`: all authoritative sources required by policy were processed.
- `sufficient`: enough authoritative evidence was processed to decide the field.
- `partial`: at least one useful source was processed, but the required source
  set is not known to be complete.
- `incomplete`: a known required source failed or was not processed.
- `blocked`: policy, access, or robots controls prevented processing.
- `unknown`: historical or untracked coverage.

`not_stated` is invalid for `partial`, `incomplete`, `blocked`, or `unknown`
coverage. Explicit values may be valid with partial overall coverage when the
field itself has direct official evidence and no known unchecked conflicting
source.

## Lifecycle

1. The scraper creates immutable assertions and resolves every policy field.
2. Ingestion validates cross-references and persists state, applicability,
   coverage, and Portuguese display projection in one transaction.
3. Recrawls compare both state and value. Material transitions create a new
   publication version and never alter the approved public projection.
4. Reviewers create a new assertion and publication version when changing a
   state. Approval is rejected while any current field has `gate_impact=block`.
5. Approval resolves the version's review tasks, writes an outbox event, and
   changes the public projection only after delivery.

Application fee, total program cost, additional costs, and `is_free` are
separate fields. In particular, “no application fee” never proves that the
program is free.

## Storage and API

The normalized tables are:

- `field_semantic_states`
- `field_applicability_assessments`
- `field_source_coverage`
- `field_display_projections`

They are immutable by publication version. The public API exposes a bounded
projection (`state`, `value`, `display_text`, explanation, coverage,
applicability, criticality, gate impact, and last verification). The admin API
additionally exposes assertions, alternatives, failure codes, and checked and
unchecked source roles.

## Operational commands

```bash
DATABASE_URL=postgresql://... npm run semantic:audit
DATABASE_URL=postgresql://... npm run semantic:backfill
```

The first command is read-only. Apply mode creates one consolidated,
idempotent review task per affected current publication version; it never
guesses a field value.
