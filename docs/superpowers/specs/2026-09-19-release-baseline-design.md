# Brasil Afora release-baseline design

## Purpose

Turn the already controlled-verified local implementation into reproducible source-control authorities without deploying, migrating production, changing production secrets, or enabling sources/schedules.

## Repository architecture

Use two repositories.

- This repository remains the authority for the Next.js application, product UI, PostgreSQL schema and seven migrations, ingestion/review/publication, and maintenance queue APIs.
- A sibling `brasil-afora-scraper` repository becomes the authority for the Python package, worker, supervised source-run CLI, packaged data, fixtures, and tests.
- A baseline is identified by the exact pair of Git commit SHAs. Cross-language tests receive the sibling checkout through `BRASIL_AFORA_PYTHON_REPO` and use its installed virtual-environment Python; they never name a developer path or use `PYTHONPATH=src`.

The historical dirty web checkout and historical unversioned Python tree are immutable evidence. Deterministic manifests captured before reconstruction are the byte-comparison authority.

## Integration design

The web branch starts from live `origin/main`. Historical tracked edits are applied as a three-way patch from their original `f31f8b9` base so upstream showcase/product changes survive. Historical untracked production files are copied explicitly from the source manifest. Overlapping web files are resolved to preserve both upstream showcase behavior and the verified BF-04 through BF-10 implementation.

The Python repository is imported only from its historical source manifest. Generated output, caches, virtual environments, wheels, egg metadata, screenshots, local databases, secrets, and controlled-operation evidence remain excluded.

## Dependency authority

The first baseline freezes controlled-verified versions instead of upgrading:

- Bun 1.3.14, Node 26.7.0, Next.js 16.2.11, React 19.2.4.
- Drizzle ORM and drizzle-kit `1.0.0-beta.9-e89174b`, matching the historical lock/install, not the mismatched beta.17 declarations.
- `pg` 8.20.0; pg 9 remains unsupported for this baseline.
- Python 3.14.7 and the exact historical installed dependency resolution recorded in a committed `uv.lock`.
- PostgreSQL target 17.

Fresh installation must use only committed metadata and locks.

## Source-policy safety

The packaged Python registry enables no source. ONE exists only in the reviewed operator registry with `discovery_methods = ["supervised_run"]`; the ordinary web scheduler excludes that discovery method.

Source enablement is server-owned. Ingestion input may describe a source but may not turn a disabled database source back on. Existing disabled sources reject ingestion before opportunity persistence. This behavior is added test-first because it intentionally hardens semantics relative to the historical bytes.

`ONE = supervised`

## Verification

The web proof uses a fresh checkout and locked Bun install, migration tests plus a disposable PostgreSQL 17 migration application where locally available, full Vitest, TypeScript, Ultracite/Biome, optimized build, and cross-language BF-07/BF-10 tests against the installed Python sibling.

The Python proof uses a fresh checkout and virtual environment, frozen lock sync, wheel/package-data validation, full pytest, Ruff, and installed console-script help/smoke checks without `PYTHONPATH`.

The final historical diff must account for every difference as integration, dependency/packaging/CI, the planned source-disable hardening, or excluded generated/evidence state. A fresh independent reviewer must leave no unresolved Critical or Important finding.

## Out of scope

Production deployment or migration, Render configuration, secret changes, maintenance-auth scope redesign, a persistent worker process, an application-link worker, production-clone migration rehearsal, unattended ONE, FEBRACE, and production cron remain later work.
