# Missing-information display policy

Public wording is generated centrally in `src/lib/semantic-fields.ts`.
Components consume `semantic_fields[field].display_text`; they do not invent a
generic fallback.

## Required language

Examples:

- `not_stated` age: “Idade não especificada pelo organizador”
- pending age: “Regra de idade em verificação”
- unrestricted age: “Sem limite de idade”
- conflicting deadline: “Há informações conflitantes sobre o prazo”
- missing disclosed cost: “Informações de custo em verificação”
- waived application fee: “Sem taxa de inscrição”
- online destination city: “Não se aplica — oportunidade online”

Public explanations are safe Portuguese summaries. Internal stack traces,
parser exceptions, and raw operational failure data remain admin-only.

## Prohibited final placeholders

Structured public cards and details must not use these as the final answer:

```text
N/A
N/D
null
undefined
-
Não informado
```

Legacy compatibility writes use field-specific wording as well. Unknown values
fail closed in filters:

- unknown age does not match an age search;
- unknown cost does not match “Gratuito” or “Pago”;
- unknown modality does not become in-person;
- unknown Brazilian eligibility does not become eligible.

## Fallback images

A presentation fallback image may be used when image state is missing or
uncertain, but it does not change the semantic image state to explicit. Image
rights/provenance validation remains a production blocker.
