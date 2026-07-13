---
phase: 02-test-scaffolding
verified: 2026-07-13T00:07:00Z
status: passed
score: 15/15 must-haves verified
behavior_unverified: 0 # RESOLVED — JDK 21 installed (openjdk@21); `npm run test:rules` executed by the verifier this session: emulator booted, 15/15 green (exit 0)
overrides_applied: 0
resolution: |
  The behavior-unverified item (test:rules emulator green pass) was resolved and
  INDEPENDENTLY RE-RUN by the verifier this session under openjdk@21
  (/usr/local/opt/openjdk@21): `npm run test:rules` booted the Firestore emulator
  and reported 15/15 passing (exit 0).

  The emulator run corrected a static-trace error in the initial verification: the
  activity_log append-only assertions. The `match /{document=**}` admin catch-all
  (firestore.rules:207-209, `allow read, write: if isAdmin()`) is OR'd with — and
  overrides — activity_log's `allow update, delete: if false` (firestore.rules:194),
  so an admin CAN edit/delete audit entries. Per user decision, Phase 2 characterizes
  this ACTUAL behavior (the test asserts admin update/delete succeeds, with a SEC-04
  pointer) and the append-only violation is logged as a HIGH audit-integrity finding
  in docs/SAAS_READINESS_AUDIT.md, deferred to Phase 6 / SEC-04. This is a
  characterization phase — capturing true current behavior is the goal, and the gap is
  tracked, not hidden.
---

# Phase 2: Test Scaffolding Verification Report

**Phase Goal:** The two riskiest change surfaces — Firestore rules (deployed by manual Console paste, invisible to CI) and serverless handlers — are covered by characterization tests of current behavior before any phase changes them
**Verified:** 2026-07-13
**Status:** passed
**Re-verification:** Yes — after the JDK-21 emulator run resolved the one human-verification item

## Goal Achievement

Both risky change surfaces are covered by executing characterization tests of current behavior:

- **Serverless handlers** — `npm run test:api` → 23/23 green (executed). All three required handlers (send-email, accept-invite, lead-intake) have auth (401), payload (400 zod contract), and error-path assertions, plus 200 payload-shape, missing-token/404, and 405 method-guard deepenings.
- **Firestore rules** — `npm run test:rules` → 15/15 green (executed by the verifier under openjdk@21, emulator booted, exit 0). Covers userId scoping, admin override, assignedProperties/assignedDeals access, deal-portal `canAccessDeal()` across all six collections, users-block role/assignment immutability, and activity_log append-only behavior.

The emulator run also earned its keep: it surfaced a real HIGH audit-integrity gap (the `match /{document=**}` admin catch-all defeats activity_log append-only against the admin account) that static hand-tracing missed. Per the characterization-phase goal, the test now pins the true current behavior and the gap is logged for Phase 6 / SEC-04 — exactly the "safety net before hardening" this phase exists to provide.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `npm run test:rules` shows PASSING emulator tests covering the 5 categories (Roadmap SC-1 / TEST-01) | ✓ VERIFIED | Verifier ran `npm run test:rules` under openjdk@21 → 15/15 green, exit 0; emulator booted on 127.0.0.1:8080 |
| 2 | `npm run test:api` shows passing handler tests: auth/payload/error for send-email, accept-invite, lead-intake (Roadmap SC-2 / TEST-02) | ✓ VERIFIED | `npm run test:api` → 23/23 green (executed) |
| 3 | CI runs both suites alongside lint→test→build, and `test:ci` behaves exactly as before (Roadmap SC-3 / TEST-03) | ✓ VERIFIED | ci.yml lines 45-49 run test:api then test:rules after Test (41) before Build (51); `CI=true npm run test:ci` → 29/29, 3 suites all under src/ |
| 4 | Rules suite reads firestore.rules from disk (readFileSync) — honest across Console-paste deploy | ✓ VERIFIED | firestore.rules.test.js:127 `rules: readFileSync('firestore.rules', 'utf8')` |
| 5 | Users-block role/assignment immutability pinned — SEC-04 safety net (G-R2) | ✓ VERIFIED | `describe('users self-service rules')` 3 it-blocks; passed on the emulator run; traced to rules 35-56 |
| 6 | Each of six deal-portal collections exercises canAccessDeal() read/create-allowed/create-denied (G-R1) | ✓ VERIFIED | `describe('deal-portal collections')` covers parties/channels/documents/progress + lender-pushes + deal-messages; passed on emulator; traced to rules 105-136 |
| 7 | Rules suite covers userId scoping + admin override + admin-email-without-role denied | ✓ VERIFIED | 3 userId-scoped it-blocks; passed on emulator; traced to rules 13-17, 60-64 |
| 8 | Rules suite covers assignedProperties + assignedDeals access | ✓ VERIFIED | `describe('assignment-based access')`; passed on emulator; traced to rules 141-152, 75-84 |
| 9 | Rules suite covers activity_log append-only (current behavior characterized) | ✓ VERIFIED | Passed on emulator; append-only holds for non-admins; admin edit/delete succeeds (catch-all override) — characterized with SEC-04 pointer + HIGH audit finding |
| 10 | send-email/accept-invite/lead-intake each have 401 auth, 400 payload (zod contract), and error-path assertions | ✓ VERIFIED | `Invalid request payload` + `details` arrayContaining path at lines 120-121, 233-234, 412-413; error paths 502/503/403/401 |
| 11 | 400 assertions check zod contract (error === 'Invalid request payload' + details with field path) | ✓ VERIFIED | api-handlers.test.mjs lines 120-121, 233-234, 412-413, 490-491 |
| 12 | send-email + accept-invite have 200 success payload-shape assertions (G-A1) | ✓ VERIFIED | it-blocks at lines 149 ({ ok, id }) and 270 ({ ok, dealId, propertyAddress }) |
| 13 | accept-invite missing-token 401 + invite-not-found 404 branches (G-A2) | ✓ VERIFIED | lines 315/330 (Missing auth token), 333/354 (Invite not found or already used) |
| 14 | send-email/accept-invite/lead-intake each reject non-POST with 405 (G-A3) | ✓ VERIFIED | 405 'Method not allowed' at lines 171/177, 357/368, 455/461 |
| 15 | Developer can find documented run prerequisites (Java 21, clean npm ci) in docs/TESTING.md | ✓ VERIFIED | docs/TESTING.md references all 3 lanes + Java 21 + npm ci fix + CRA isolation invariant; check:constants green |

**Score:** 15/15 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tests/api/api-handlers.test.mjs` | Serverless handler characterization | ✓ VERIFIED | 23 it-blocks, 5 describe blocks; executes green |
| `tests/rules/firestore.rules.test.js` | Emulator rules characterization | ✓ VERIFIED | Reads rules from disk; 15/15 green under JDK-21 emulator (verifier-run) |
| `docs/TESTING.md` | Run prerequisites documented | ✓ VERIFIED | All 3 lanes + Java 21 + npm ci + isolation invariant |
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
| Rules emulator green | `npm run test:rules` (JDK 21) | 15 passed (15), exit 0, emulator booted | ✓ PASS |
| CRA Jest isolation | `CI=true npm run test:ci` | 29 passed, 3 suites, all src/ | ✓ PASS |
| Constants gate over docs | `npm run check:constants` | OK | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TEST-01 | 02-02 | Emulator-backed rules tests cover userId scoping, admin override, assignments, canAccessDeal inheritance, activity_log append-only | ✓ SATISFIED | 15/15 green under JDK-21 emulator (verifier-run) |
| TEST-02 | 02-01 | `npm run test:api` covers auth/payload/error for send-email, accept-invite, lead-intake | ✓ SATISFIED | 23/23 green, executed |
| TEST-03 | 02-03 | CI runs rules + API suites alongside lint→test→build without disturbing CRA Jest | ✓ SATISFIED | CI wired; test:ci isolation verified (29/29, src/ only) |

All three declared requirement IDs (TEST-01, TEST-02, TEST-03) are accounted for. REQUIREMENTS.md maps exactly these three to Phase 2 (lines 126-128) — no orphaned requirements.

### Anti-Patterns Found

None. Scanned `tests/api/api-handlers.test.mjs`, `tests/rules/firestore.rules.test.js`, `docs/TESTING.md` — no TBD/FIXME/XXX/PLACEHOLDER/stub markers. `firestore.rules` unmodified by phase commits (last touched in base commit dd6364a; phase commits are test/docs-only).

### Notable Finding (tracked, not a Phase 2 gap)

**HIGH — activity_log append-only is not enforced against the admin account.** The `match /{document=**}` admin catch-all (`firestore.rules:207-209`, `allow read, write: if isAdmin()`) is OR'd with and overrides `activity_log`'s `allow update, delete: if false` (`firestore.rules:194`), so an admin can edit/delete audit-trail entries — defeating the tamper-evidence CLAUDE.md documents. Proven by this session's emulator run (admin `updateDoc`/`deleteDoc` succeed). Phase 2 correctly characterizes this current behavior (the test asserts success with a SEC-04 pointer) rather than asserting a guarantee that does not hold. Logged as a HIGH finding in `docs/SAAS_READINESS_AUDIT.md`, deferred to Phase 6 / SEC-04 (rules hardening; requires manual Console publish). This does not block Phase 2 — the phase's job is to characterize the real surface before hardening, which it did, and this finding is the safety net working as intended.

### Gaps Summary

No gaps. Both risky surfaces are covered by executing characterization tests: handlers 23/23 green, rules 15/15 green under a JDK-21 emulator (independently re-run by the verifier). CI wires both suites with Java 21 provisioning, and CRA-Jest isolation is intact (29/29, src/ only). The phase goal — characterization of current behavior before any hardening phase touches these surfaces — is achieved, and the emulator run additionally surfaced a real HIGH audit-integrity gap now tracked for Phase 6 / SEC-04.

---

_Verified: 2026-07-13_
_Verifier: Claude (gsd-verifier)_
