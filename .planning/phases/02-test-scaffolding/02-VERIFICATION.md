---
phase: 02-test-scaffolding
verified: 2026-07-12T00:00:00Z
status: human_needed
score: 14/15 must-haves verified
behavior_unverified: 1 # test:rules emulator green pass — present + wired + assertions traced, but emulator not executable on this host (Java 8; needs JDK 21 / green CI)
overrides_applied: 0
behavior_unverified_items:
  - truth: "Developer can run `npm run test:rules` and see PASSING emulator-backed rules tests (TEST-01 / Roadmap SC-1)"
    test: "In a JDK-21 environment (or via a CI run that provisions temurin 21), run `npm run test:rules` and confirm the Firestore emulator boots and all 15 collected cases pass green."
    expected: "firebase emulators:exec boots the Firestore emulator on 127.0.0.1:8080 and `vitest run tests/rules` exits 0 with 15 passing cases (userId scoping, admin override, assignment access, deal-portal canAccessDeal across all six collections, users-block immutability, activity_log append-only)."
    why_human: "The dev host runs Java 8; firebase-tools 15.x requires Java 21 to start the emulator, so the emulator-backed assertions cannot be exercised locally. Suite parses, collects 15 cases, and every assertion was hand-traced against on-disk firestore.rules — but the runtime green pass is behavior grep/collection cannot observe. Documented environment constraint (02-VALIDATION.md Manual-Only; docs/TESTING.md), not a code gap."
human_verification:
  - test: "Run `npm run test:rules` in a JDK-21 environment or confirm a green CI run of the 'Firestore rules tests' step in .github/workflows/ci.yml."
    expected: "Firestore emulator boots and all 15 rules cases pass."
    why_human: "Emulator requires Java 21; dev host has Java 8. Authoritative TEST-01 pass is delegated to CI (temurin 21) or a local JDK 21."
---

# Phase 2: Test Scaffolding Verification Report

**Phase Goal:** The two riskiest change surfaces — Firestore rules (deployed by manual Console paste, invisible to CI) and serverless handlers — are covered by characterization tests of current behavior before any phase changes them
**Verified:** 2026-07-12
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

The characterization coverage for both risky surfaces exists, is substantive, and is wired into CI. The serverless-handler surface is fully verified by direct execution (`npm run test:api` → 23/23 green). The Firestore-rules surface is present, honest (every assertion hand-traced against on-disk `firestore.rules`), and collects 15 cases — but its authoritative emulator-backed green pass cannot run on this host (Java 8; requires JDK 21) and is delegated to CI per the phase's documented Manual-Only constraint. That one runtime pass is the sole item routed to human verification.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `npm run test:rules` shows PASSING emulator tests covering the 5 categories (Roadmap SC-1 / TEST-01) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `npx vitest list tests/rules` collects 15 cases spanning all 5 categories; assertions hand-traced against firestore.rules (all correct); emulator green pass not executable here (Java 8) → human/CI |
| 2 | `npm run test:api` shows passing handler tests: auth/payload/error for send-email, accept-invite, lead-intake (Roadmap SC-2 / TEST-02) | ✓ VERIFIED | `npm run test:api` → 23/23 green (executed this session) |
| 3 | CI runs both suites alongside lint→test→build, and `test:ci` behaves exactly as before (Roadmap SC-3 / TEST-03) | ✓ VERIFIED | ci.yml lines 45-49 run test:api then test:rules after Test (41) before Build (51); `CI=true npm run test:ci` → 29/29, 3 suites all under src/ |
| 4 | Rules suite reads firestore.rules from disk (readFileSync) — honest across Console-paste deploy | ✓ VERIFIED | firestore.rules.test.js:127 `rules: readFileSync('firestore.rules', 'utf8')` |
| 5 | Users-block role/assignment immutability pinned — SEC-04 safety net (G-R2) | ✓ VERIFIED | `describe('users self-service rules')` 3 it-blocks; assertFails on self admin-create, role escalation, self-reassignment; assertSucceeds benign + admin bypass — traced to rules 35-56 |
| 6 | Each of six deal-portal collections exercises canAccessDeal() read/create-allowed/create-denied (G-R1) | ✓ VERIFIED | `describe('deal-portal collections')` covers parties/channels/documents/progress (write-open) + lender-pushes (admin-only mutate) + deal-messages (existing); traced to rules 105-136 |
| 7 | Rules suite covers userId scoping + admin override + admin-email-without-role denied | ✓ VERIFIED | vitest list shows the three userId-scoped it-blocks; traced to rules 13-17, 60-64 |
| 8 | Rules suite covers assignedProperties + assignedDeals access | ✓ VERIFIED | `describe('assignment-based access')`; traced to rules 141-152 (properties) and 75-84 (deals) |
| 9 | Rules suite covers activity_log append-only | ✓ VERIFIED | `describe('activity_log append-only behavior')`; traced to rules 191-195 (update/delete: if false) |
| 10 | send-email/accept-invite/lead-intake each have 401 auth, 400 payload (zod contract), and error-path assertions | ✓ VERIFIED | grep shows `Invalid request payload` + `details` arrayContaining path at lines 120-121, 233-234, 412-413; error paths 502/503/403/401 present |
| 11 | 400 assertions check zod contract (error === 'Invalid request payload' + details with field path) | ✓ VERIFIED | api-handlers.test.mjs lines 120-121, 233-234, 412-413, 490-491 |
| 12 | send-email + accept-invite have 200 success payload-shape assertions (G-A1) | ✓ VERIFIED | it-blocks at lines 149 ({ ok, id }) and 270 ({ ok, dealId, propertyAddress }) |
| 13 | accept-invite missing-token 401 + invite-not-found 404 branches (G-A2) | ✓ VERIFIED | lines 315/330 (Missing auth token), 333/354 (Invite not found or already used) |
| 14 | send-email/accept-invite/lead-intake each reject non-POST with 405 (G-A3) | ✓ VERIFIED | 405 'Method not allowed' asserted at lines 171/177, 357/368, 455/461 |
| 15 | Developer can find documented run prerequisites (Java 21, clean npm ci) in docs/TESTING.md | ✓ VERIFIED | docs/TESTING.md references test:ci/test:api/test:rules, Java 21 prereq, npm ci rolldown fix, CRA isolation invariant; check:constants green |

**Score:** 14/15 truths verified (1 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tests/api/api-handlers.test.mjs` | Serverless handler characterization | ✓ VERIFIED | 18KB, 23 it-blocks, 5 describe blocks; executes green |
| `tests/rules/firestore.rules.test.js` | Emulator rules characterization | ✓ VERIFIED (parse/collect) | 10KB, reads rules from disk, collects 15 cases; emulator run deferred to JDK-21/CI |
| `docs/TESTING.md` | Run prerequisites documented | ✓ VERIFIED | 3.8KB, all 3 lanes + Java 21 + npm ci + isolation invariant |
| `.github/workflows/ci.yml` | Both suites wired + Java 21 | ✓ VERIFIED | Setup Java temurin 21; test:api + test:rules between Test and Build |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| tests/rules/firestore.rules.test.js | firestore.rules | readFileSync at init | ✓ WIRED | Line 127 — suite tests on-disk rules, guarding Console-paste drift |
| tests/api/api-handlers.test.mjs | api/send-email.js, accept-invite.js, lead-intake.js | node-mocks-http harness | ✓ WIRED | 23/23 green against live handlers; all 3 handler files exist |
| .github/workflows/ci.yml | npm run test:api / test:rules | CI steps 45-49 | ✓ WIRED | After test:ci (41), before build (51) |
| package.json test:ci | src/ only | CRA default roots=<rootDir>/src | ✓ WIRED | 29/29, 3 suites all in src/; tests/ not swept |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| API suite green | `npm run test:api` | 23 passed (23) | ✓ PASS |
| Rules suite parses/collects | `npx vitest list tests/rules` | 15 cases enumerated | ✓ PASS |
| CRA Jest isolation | `CI=true npm run test:ci` | 29 passed, 3 suites, all src/ | ✓ PASS |
| Rules emulator green | `npm run test:rules` | Not run — Java 8 host (needs JDK 21) | ? SKIP → human |
| Constants gate over docs | `npm run check:constants` | OK | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TEST-01 | 02-02 | Emulator-backed rules tests cover userId scoping, admin override, assignments, canAccessDeal inheritance, activity_log append-only | ? NEEDS HUMAN | Coverage present + traced + CI-wired; emulator green pass needs JDK-21/CI |
| TEST-02 | 02-01 | `npm run test:api` covers auth/payload/error for send-email, accept-invite, lead-intake | ✓ SATISFIED | 23/23 green, executed |
| TEST-03 | 02-03 | CI runs rules + API suites alongside lint→test→build without disturbing CRA Jest | ✓ SATISFIED | CI wired; test:ci isolation verified (29/29, src/ only) |

All three declared requirement IDs (TEST-01, TEST-02, TEST-03) are accounted for. REQUIREMENTS.md maps exactly these three to Phase 2 (lines 126-128) — no orphaned requirements.

### Anti-Patterns Found

None. Scanned `tests/api/api-handlers.test.mjs`, `tests/rules/firestore.rules.test.js`, `docs/TESTING.md` — no TBD/FIXME/XXX/PLACEHOLDER/stub markers. `firestore.rules` confirmed unmodified by phase commits (last touched in base commit dd6364a; phase test commits 77a6fb7/d6adefc/9acead5 are test-only).

### Human Verification Required

#### 1. Firestore rules emulator green pass (TEST-01)

**Test:** In a JDK-21 environment run `npm run test:rules`, OR confirm a green run of the "Firestore rules tests" step in `.github/workflows/ci.yml` on CI (which provisions temurin 21).
**Expected:** The Firestore emulator boots on 127.0.0.1:8080 and all 15 collected cases pass.
**Why human:** This host runs Java 8; firebase-tools 15.x requires Java 21 to start the emulator. Suite parses, collects 15 cases, and every assertion was hand-traced against on-disk `firestore.rules` and matches — but the runtime green pass is behavior that cannot be observed without a JDK-21 runtime. This is the documented Manual-Only constraint (02-VALIDATION.md; docs/TESTING.md), not a code defect.

### Gaps Summary

No gaps. The two risky surfaces are covered by honest characterization tests. The serverless-handler suite is verified by direct green execution. The rules suite is present, reads the on-disk rules, collects all 15 cases, and every assertion traces correctly to `firestore.rules` — the only unverified element is the emulator's runtime green pass, which is blocked by a known, documented host constraint (Java 8 vs required Java 21) and delegated to CI. Per the phase's explicit instruction, this is a human/CI verification item, not a gap. Once a green CI run (or local JDK-21 run) of `test:rules` is confirmed, all 15 truths are VERIFIED and the phase is fully passed.

---

_Verified: 2026-07-12_
_Verifier: Claude (gsd-verifier)_
