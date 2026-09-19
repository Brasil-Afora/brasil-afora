# BF-06 Operational Availability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development while implementing each task. This checkout is intentionally dirty; preserve all pre-existing work and do not stage, reset, clean, deploy, or run production migrations.

**Goal:** Overlay fresh operational application-link availability onto the approved public projection so operational evidence can suppress Apply without mutating or granting beyond approved editorial publication.

**Architecture:** Keep `publication_versions.payload.public_projection` as the approved editorial source of truth. Reuse `application_link_assessments` as the operational source, compute effective `can_apply` centrally in `list-public-opportunities.ts`, and expose the latest operational link status while preserving approved lifecycle and application URL. The verifier records operational evidence and review alerts but does not rewrite canonical edition/round lifecycle. The existing frontend lifecycle helper consumes `can_apply`, keeping card/detail behavior consistent.

**Tech Stack:** TypeScript, Next.js 16, Drizzle ORM, PostgreSQL/PGlite, Vitest, Biome.

**Spec:** User-supplied BF-06 brief in this conversation.

## Global Constraints

- Operational state may remove permission to apply, but may never grant permission beyond approved editorial state.
- Do not create or mutate publication versions solely because link verification changes.
- Closed and broken remain distinct operational states.
- Unknown, blocked, redirected, unchecked, or never-run verification must not automatically become confirmed closure.
- A later trustworthy available check may remove an operational block only when approved editorial state still permits applying.
- No schema migration unless existing persistence cannot express the distinction; `application_link_assessments` already can.
- Preserve all pre-existing dirty-worktree edits.

---

### Task 1: Add BF-06 RED integration coverage

**Files:**
- Create: `src/server/publication/operational-availability.test.ts`
- Modify: `src/contracts/opportunity-v1.test.ts`

**Interfaces:**
- Consumes: `verifyApplicationLink()`, `listPublicOpportunities()`, existing schema/migrations.
- Produces: deterministic regressions for open+closed, open+broken, open+available, pending update+closed, recovery, unknown/unverified, editorial closed+available, no approved URL, and future+available.

- [ ] Write fixture helpers that seed one published projection plus canonical round and optional pending version in PGlite.
- [ ] Assert publication rows remain byte/field stable across operational verification.
- [ ] Assert verifier closure does not rewrite edition/round editorial lifecycle.
- [ ] Assert effective public status and `can_apply` for every BF-06 matrix case.
- [ ] Run `node_modules/.bin/vitest run src/server/publication/operational-availability.test.ts` and record expected failures caused by the missing overlay and lifecycle mutation.

### Task 2: Stop verifier lifecycle mutation

**Files:**
- Modify: `src/server/link-verification/application-link-verifier.ts`

**Interfaces:**
- Consumes: persisted `application_link_assessments` classification.
- Produces: fresh assessment, freshness timestamp, audit/review alert; no canonical editorial lifecycle rewrite.

- [ ] Remove the `application_rounds.status='closed'` and `editions.status='closed'` updates from operational verification.
- [ ] Keep edition freshness timestamp and degraded-link review-task behavior.
- [ ] Re-run BF-06 tests to confirm canonical lifecycle assertions pass while projection assertions remain RED.

### Task 3: Centralize effective public actionability

**Files:**
- Modify: `src/contracts/opportunity-v1.ts`
- Modify: `src/server/publication/list-public-opportunities.ts`

**Interfaces:**
- Consumes: approved `PublicOpportunityV1`, canonical rounds only to locate assessments for the approved application URL, latest operational assessment.
- Produces: `application_link_status` reflecting latest operational evidence, optional/explicit `can_apply`, operational freshness timestamp, with all approved editorial fields otherwise unchanged.

- [ ] Add backward-compatible `can_apply?: boolean` to the public contract so old stored publication payloads still parse.
- [ ] Define editorial permission from the approved lifecycle, keep the approved application URL as a separate required gate, and treat stored link status only as prior operational evidence until a fresher assessment exists.
- [ ] Define blocking operational states for confirmed/unusable outcomes (`closed`, `broken`, `current_but_not_open`, `old_edition`, `generic_homepage`, `results_page`, `login_only`) while neutral/indeterminate states do not automatically revoke approval.
- [ ] Select latest assessment only for round(s) representing the approved application URL; never manufacture an application URL from live canonical data.
- [ ] Overlay status/freshness/`can_apply` onto the approved projection without changing title, description, lifecycle, URL, deadline, eligibility, or publication version.
- [ ] Apply the same effective computation to the fallback projection path.
- [ ] Re-run BF-06 tests until GREEN.

### Task 4: Consume `can_apply` in the frontend policy helper

**Files:**
- Modify: `src/lib/opportunity-lifecycle.ts`
- Modify: `src/lib/opportunity-lifecycle.test.ts`
- Modify: `src/lib/opportunities-api.ts`
- Modify: `src/components/international-opportunities/types.ts`
- Modify: `src/components/national-opportunities/types.ts`
- Modify: `src/components/opportunities/types.ts` if the shared union requires it.

**Interfaces:**
- Consumes: API `can_apply` plus approved lifecycle/URL/status.
- Produces: one shared CTA decision used by both national and international detail pages and lifecycle badges/cards.

- [ ] Add RED helper tests showing explicit `canApply=false` suppresses Apply even with editorial open, explicit `canApply=true` preserves Apply through indeterminate operational status, and `canApply=true` cannot override editorial closed/no URL.
- [ ] Map API `can_apply` to `canApply` on UI domain records.
- [ ] Prefer explicit `canApply` in `getApplicationTarget` while retaining legacy behavior when the field is absent.
- [ ] Keep broken/unknown labels distinct from confirmed editorial closure.
- [ ] Keep the legacy feature-flag read path safe by sourcing CTA actionability from v1; fail Apply closed if v1 actionability metadata is unavailable.
- [ ] Run lifecycle/frontend tests until GREEN.

### Task 5: Full verification

**Files:** none unless a BF-06-caused regression is found.

- [ ] Run BF-06 targeted tests.
- [ ] Run all seven BF-04 targeted regressions.
- [ ] Run all ten BF-05 targeted regressions.
- [ ] Run relevant link-verifier/lifecycle/public-projection tests.
- [ ] Run full `node_modules/.bin/vitest run` and classify only the known unrelated scheduler failure separately if it remains.
- [ ] Run `node_modules/.bin/tsc --noEmit`.
- [ ] Run `npm run lint` / Biome.
- [ ] Run migration tests even though no migration is expected.
- [ ] Review final diff against the saved pre-BF06 copies in `/tmp/bf06-baseline` and report every touched file plus remaining concrete risks.
