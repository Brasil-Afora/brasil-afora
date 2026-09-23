# Field applicability policy

Applicability answers “does this field make sense here?” independently from
“did the organizer publish a value?”

| Applicability | Use |
| --- | --- |
| `required` | Every publishable opportunity needs the field. |
| `conditionally_required` | Required only when the opportunity's structure makes it relevant. |
| `optional` | Helpful but not publication-critical. |
| `not_applicable` | A documented condition makes the field irrelevant. |
| `unknown_applicability` | The system cannot yet decide whether it applies. |

## Deterministic rules currently implemented

- A fully online opportunity makes destination city/state, travel requirement,
  travel coverage, visa, and passport fields not applicable.
- `rolling` and `until_filled` application rounds make a fixed
  `application_deadline` date not applicable; `deadline_type` remains explicit.
- Explicit individual participation can make `team_size` not applicable.

Everything else retains its registry policy (`required`,
`conditionally_required`, or `optional`) until evidence supports a narrower
rule. Absence alone never proves non-applicability.

## Reviewer rules

- Setting semantic state `not_applicable` requires applicability
  `not_applicable` and a human/source reason.
- Setting another semantic state while applicability is `not_applicable` is
  rejected by the strict contract.
- A reviewer correction is append-only: it creates an assertion, a new
  applicability assessment, a new display projection, and a new publication
  version.
- `suppressed` is not an applicability state and must not be used as a shortcut.

Future source-specific applicability rules must include tests for the positive
condition, the nearest negative condition, recrawl transitions, and public
wording.
