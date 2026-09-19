# Web release inventory

`RELEASE_INVENTORY.tsv` classifies and hashes every candidate file in this authoritative checkout except the inventory files themselves and Git/verification-workspace metadata.

Included classifications:

- `PRODUCTION CODE`: Next.js routes, product UI, contracts, schema code, ingestion, review, publication, and maintenance services, plus runtime static assets.
- `MIGRATION`: all seven ordered SQL migrations and their committed Drizzle snapshots where present.
- `TEST`: Vitest, migration, contract, repository, maintenance, and UI tests.
- `SOURCE CONFIG`: CI, TypeScript, Biome, Next, Drizzle, Compose, and repository configuration.
- `PACKAGE METADATA`: `package.json` and `bun.lock`.
- `DOCUMENTATION/RUNBOOK`: architecture, API, security, migration, operations, rollback, and release-baseline documentation.

Historical generated/runtime exclusions:

- `.next/` (about 1.0 GB), `node_modules/` (about 736 MB), and `coverage/` (about 1.6 MB).
- `next-env.d.ts`, `*.tsbuildinfo`, logs, local build output, and `.DS_Store`.
- `.env*`, keys, credentials, disposable PostgreSQL data, and local service/launch state.

No environment file or disposable PostgreSQL data file was present in the historical source manifest.

Integration authority:

- Upstream base: live `origin/main` at `f0a2cebfb21693369a20ebc27a66d177ff272088`.
- Historical dirty base: `f31f8b9eea647a28d41f76f28f7982d29be20e48`.
- Historical tracked patch and 89 untracked paths were reconstructed without deleting upstream-only showcase files.
- Three overlapping files were intentionally merged: both opportunity detail components retain upstream verified-showcase behavior plus BF application-actionability safety; `src/lib/opportunities-api.ts` retains upstream verified records plus BF structured/legacy reads and strict date validation.
