# Security, privacy, and crawler policy

## Threat model

Primary risks are SSRF through discovered/application URLs, hostile HTML/PDF content, redirect-to-private-network attacks, excessive crawling, stale or deceptive sources, privilege bypass, arbitrary legacy writes, token leakage, and unsafe publication of unsupported claims.

## Implemented controls

- Only HTTP/HTTPS on ports 80/443; URL credentials are rejected.
- Localhost, internal suffixes, IPv4/IPv6 private/reserved space, and IPv4-mapped IPv6 are blocked.
- Every DNS result is validated and the validated address is pinned for the request. Every redirect target is revalidated; redirects are manual and bounded to five.
- Robots rules for `BrasilAforaBot` and wildcard groups are honored with longest-rule matching and a bounded cache.
- Fetch time and response bytes are bounded. The checker does not accept cookies, bypass login/CAPTCHA, submit forms, or treat HTTP 200 as an open application.
- Static HTTP is preferred; isolated Playwright rendering is fallback-only.
- Reviewer/admin actions require an authenticated admin session. Ingestion, maintenance, and outbox use independent scoped bearer tokens.
- Strict Zod validation, body limits, UUID validation, optimistic versions, idempotency, database transactions, audit events, and legacy-write shutdown protect application boundaries.
- Reviewer source previews strip scripts, styles, and tags; raw snapshots are admin-only and capped at 1 MiB per response.
- Production dependency audit is a required CI step. On 2026-07-23 direct framework/auth dependencies were upgraded and audited with no known remaining advisory.

## Source policy

Every enabled source must have an identified owner, official/authority tier, reviewed allowed/blocked paths, discovery methods, cadence, rate/concurrency limits, rendering policy, expected roles/cycles, and reviewer owner. Robots permission is necessary but not sufficient; source terms must also be reviewed. Search results may discover a page but cannot be sole evidence for a critical fact.

Use an identifiable user agent with a monitored policy/contact URL in production. Stop a source after an access-policy change, takedown request, unexpected login wall, abnormal volume, or repeated blocking. Never evade an access control.

## Data retention

Snapshots, assertions, correction history, publication versions, audit events, and material changes are evidence records. Define jurisdiction-reviewed retention periods before production; until then, restrict access and avoid collecting applicant personal data. This system curates public opportunity information and must not store submitted applications or credentials.

## PDF and image safety

Native PDF extraction is available with page-level text/table evidence, hash/version identity, encrypted/invalid rejection, and explicit image-only pages for controlled OCR review. Before a large pilot, add byte/page/decompression limits, malware scanning, sandboxed processing, and object storage retention.

The public UI safely falls back when no image exists. Representative-image publication still needs MIME, dimensions, broken-link, favicon/logo/tracking-pixel detection, attribution, and rights-policy persistence; therefore image readiness is **Proposed**, not production-ready.

## Incident and takedown

For a dangerous/stale record: unpublish through the reviewer decision endpoint, deliver the outbox event, preserve audit/evidence, stop its source/recrawl jobs, and investigate. For a source complaint: disable the source, record the request in the audit trail, remove public projections if necessary, and retain only data required by the approved retention policy.

