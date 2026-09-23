# Brasil Afora Release Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce two authoritative Git repositories that reproduce the controlled-verified Brasil Afora implementation from clean checkouts and keep ONE supervised.

**Architecture:** Integrate the historical dirty web delta onto live upstream `main`, import only manifest-authorized Python source into a new repository, freeze tested dependencies, harden server-owned source disablement, and prove both repositories plus their cross-language contract from clean clones.

**Tech Stack:** Next.js 16.2.11, React 19.2.4, Bun 1.3.14, TypeScript 5.9.3, Vitest 4.1.10, Drizzle beta.9, pg 8.20.0, Python 3.14.7, uv, pytest, Ruff, PostgreSQL 17/PGlite.

**Spec:** `docs/superpowers/specs/2026-09-19-release-baseline-design.md`

## Global Constraints

- Preserve the historical web and Python trees byte-for-byte.
- Never push, deploy, migrate production, change production secrets, enable schedules, or enable unattended ONE.
- Keep `ONE = supervised`; do not add FEBRACE.
- Do not upgrade dependencies beyond the controlled-verified resolution.
- Use tests first for the intentional source-disable behavior change.
- Never require `PYTHONPATH=src` from an installed Python package.

## Review Focus

- A stale ingestion payload with `source.enabled=true` must not re-enable a database-disabled source.
- Normal scheduling must exclude every `supervised_run` source while explicit supervised ONE execution remains possible.
- Upstream showcase files and changes after `f31f8b9` must survive historical integration.
- Clean cross-language tests must resolve only the configured authoritative Python checkout and installed interpreter.
- Wheels must contain package TOML data but not the operator-only ONE registry.

---

### Task 1: Reconstruct authoritative repositories and inventories

**Files:**
- Create: sibling Python repository from historical manifest
- Create: `docs/release/RELEASE_INVENTORY.md`
- Preserve: upstream showcase assets/data and historical manifests

**Interfaces:**
- Consumes: historical SHA-256 manifests and web base `f31f8b9`
- Produces: isolated web/Python Git working trees containing only release-authorized files

- [ ] Apply the historical tracked web patch with three-way merge against live `origin/main`; resolve every overlap to preserve upstream and BF behavior.
- [ ] Copy historical untracked web files named by the manifest without deleting upstream-only files.
- [ ] Import Python files named by its manifest into a new Git repository; keep generated/evidence/secret classes excluded.
- [ ] Write the exact included/excluded release inventory and commit the reconstruction layers.
- [ ] Compare candidate paths/hashes to historical manifests and record every intended integration difference.

### Task 2: Freeze dependencies and Python packaging

**Files:**
- Modify: `package.json`, `bun.lock`
- Modify: Python `pyproject.toml`, `.github/workflows/ci.yml`
- Create: Python `.python-version`, `uv.lock`
- Test: Python package-data and installed-CLI smoke

**Interfaces:**
- Consumes: historical installed versions
- Produces: frozen Bun and uv installations and an installable Python wheel

- [ ] Pin Drizzle ORM/Kit to `1.0.0-beta.9-e89174b`, pg to `8.20.0`, Vitest to `4.1.10`, TypeScript to `5.9.3`, and preserve Next/React controlled versions.
- [ ] Generate the Bun lock with Bun 1.3.14 and verify a frozen install in a fresh checkout.
- [ ] Pin Python 3.14.7, lock the historical dependency resolution with uv, and verify frozen sync.
- [ ] Build/install the wheel in a fresh virtual environment; assert packaged TOML data exists, the packaged default registry is empty, and installed CLIs run without `PYTHONPATH`.
- [ ] Commit dependency and packaging authority.

### Task 3: Make source disablement authoritative

**Files:**
- Modify: `src/contracts/opportunity-v1.test.ts`
- Modify: `src/server/ingestion/persist-ingestion.ts`

**Interfaces:**
- Consumes: persisted source row and ingestion request source metadata
- Produces: disabled-source rejection before opportunity persistence; ingestion never overwrites existing `sources.enabled`

- [ ] Add a regression test proving an existing disabled source rejects a payload that says `enabled: true`; run it and observe the expected failure.
- [ ] Add a regression test proving an existing enabled source remains enabled without trusting the payload for state ownership; run it red.
- [ ] Implement the minimal server-owned enablement check and remove `enabled` from the conflict update.
- [ ] Run targeted tests green, then the full web suite.
- [ ] Commit the hardening with its regression tests.

### Task 4: Make clean cross-repository CI portable

**Files:**
- Modify: `src/server/maintenance/bf07-end-to-end.test.ts`
- Modify: `src/server/maintenance/bf10-one-pilot-end-to-end.test.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: Python `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `BRASIL_AFORA_PYTHON_REPO` and `BRASIL_AFORA_PYTHON`
- Produces: hosted CI with no Mac path and exact peer checkout

- [ ] Run the historical BF-07/BF-10 tests in the isolated web tree and record the path-dependent failure.
- [ ] Replace absolute paths and `PYTHONPATH` with required environment-derived repository/interpreter paths.
- [ ] Configure web CI to check out the exact Python baseline commit, create its uv environment, and run full web/cross-language verification.
- [ ] Configure Python CI for Python 3.14.7, frozen uv sync, Ruff, pytest, wheel/package-data, and installed CLI checks.
- [ ] Pin third-party actions by immutable commit SHA and commit the CI portability layer.

### Task 5: Prove clean checkouts and publish release identifiers

**Files:**
- Create: `docs/release/BASELINE_VERIFICATION.md`
- Create: `ops/releases/2026-09-19-baseline.toml`

**Interfaces:**
- Consumes: exact Python commit SHA and final web candidate
- Produces: fresh-checkout command/output evidence and paired release identifiers

- [ ] Clone both local repositories into new disposable directories.
- [ ] Run Python frozen install, full pytest, Ruff, wheel/package-data, and installed CLI smoke.
- [ ] Run web frozen install, seven-migration tests/application to disposable PostgreSQL 17 when available, full Vitest, TypeScript, Ultracite/Biome, optimized build, and BF-07/BF-10 E2E against the clean Python checkout.
- [ ] Record exact commands/results, dependency matrix, source-policy proof, historical diff, and remaining production blockers.
- [ ] Commit the release manifest/verification record and record exact final SHAs.

### Task 6: Independent release-baseline review

**Files:**
- Review: both complete repositories, manifests, verification evidence, and historical diffs

**Interfaces:**
- Consumes: final candidate SHAs and verification evidence
- Produces: severity-ranked review with all Critical/Important findings resolved

- [ ] Prepare a whole-baseline review package with inventories, SHA diffs, test logs, and exclusions.
- [ ] Dispatch one fresh independent reviewer to inspect omissions, generated/secrets leakage, source defaults, dependency locks, CI, package data, migrations, and SHA reproducibility.
- [ ] Re-grade findings; fix every Critical/Important item test-first and rerun affected full suites.
- [ ] Record deferred Minor findings and the final `RELEASE BASELINE READY` or `RELEASE BASELINE NOT READY` verdict.
