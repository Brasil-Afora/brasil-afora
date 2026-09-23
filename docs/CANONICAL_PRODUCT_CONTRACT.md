# Canonical product contract v1

The executable source of truth is [`src/contracts/opportunity-v1.ts`](../src/contracts/opportunity-v1.ts). Stable enum identifiers are stored and transported; Portuguese labels are a separate display map.

## Identity and versioning

`organization → program → edition → application_round` is the canonical identity chain. A source URL identifies a `source_document`; each retrieval is an immutable `snapshot`; each interpretation is an `extraction_run`. `publication_versions` are append-only editorial releases. Program aliases and canonical URLs support matching without merging editions merely because titles are similar.

## Evidence model

Every extracted value is a `field_assertion` with raw/normalized value, evidence excerpt and locator, source document, snapshot, extractor, authority, document role, edition signal, validation state, and time. A `resolved_field` selects assertions while retaining alternatives and conflict state. Human corrections create new human assertions and new publication versions; raw history is never overwritten.

Critical uncertainty fails closed into a review task. Confidence is represented by assertion validation, authority, conflict, selected/alternative evidence, product-fit decision, and review severity rather than one misleading scalar. Python draft fields also retain per-field confidence for prioritization.

## Product contract matrix

| Website behavior | Canonical representation | API v1 | Frontend use | Evidence / validation | Automated coverage |
| --- | --- | --- | --- | --- | --- |
| Title/description/organizer | resolved assertions + version projection | `title`, `description`, `organizer` | cards/details | non-empty title; evidence links | ingestion/workflow E2E |
| Collection/type | product fit + stable type IDs | `collection`, `opportunity_types` | lists/badges/filters | taxonomy compatibility gate | contract + public filters |
| Education | `eligibility_profiles.education_levels` | stable `education_levels` | eligibility/filter | unknown preserved | contract + lifecycle helper |
| Age | `eligibility_age_rules` with min/max, inclusive flags, birthdate bounds, reference type/date | `age_rules`; `age` filter | structured matching | grade is never converted to age | schema + repository filter |
| Citizenship/residence | separate scope fields and regions | `brazil_eligibility` summary; evidence in review | cautious eligibility state | explicit exclusion blocks; ambiguity reviews | Python adversarial tests |
| Modality | `in_person`, `online`, `hybrid`, `unknown` | `modality` | badges/filter | unknown is not defaulted | contract tests |
| Deadline | date, optional time/timezone, precision, type | four deadline fields | exact date-only display/countdown | selected assertion + conflict review | date/migration/workflow tests |
| Lifecycle | edition/round state plus latest link assessment | `lifecycle` | closed/upcoming/open UI | HTTP 200 alone is insufficient | link-verifier tests |
| URLs | official URL separate from application URL | both fields + link status | distinct buttons; apply only when verified open | SSRF-safe verifier, role/current-edition/form signals | six security/semantic tests |
| Cost | nullable free flag, amount/currency, coverage fields | `is_free`, amount/currency | details/filter | unsupported booleans remain null | contract/repository tests |
| Image | version projection nullable URL | `image_url` | safe fallback | **Proposed:** MIME/dimension/rights gate | fallback only |
| Freshness | edition verification and link check time | `last_verified_at` | card/detail status | latest persisted assessment | workflow tests |

## Safety invariants

- No ingestion request can set a publication version to approved or published.
- No approval can pass an open critical review task or reject/archive gate.
- Only outbox delivery writes compatibility public tables.
- Public normalized reads come from the approved version projection; only verified operational lifecycle overlays it.
- Unknown modality, cost, residence, citizenship, age reference, and deadline precision remain explicit.
- Date-only values are PostgreSQL `date`; source times/timezones are stored only when supplied.

## Compatibility

The old public tables remain projections because the existing website still depends on them. New columns preserve official/application URL separation, publication-version identity, lifecycle, and last-verification time. The structured feature flag switches reads to `/api/v1/opportunities`; rollback is disabling that flag, not deleting canonical history.

