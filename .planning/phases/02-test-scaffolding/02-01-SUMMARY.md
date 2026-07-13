---
phase: 02-test-scaffolding
plan: 01
subsystem: testing
tags: [vitest, node-mocks-http, serverless, zod, firebase-admin, characterization-tests]

# Dependency graph
requires:
  - phase: 01
    provides: shipped test infrastructure (tests/api/api-handlers.test.mjs, test:api script, CI wiring) in commit dd6364a
provides:
  - Deepened API characterization suite pinning send-email/accept-invite 200 success payload shapes
  - accept-invite missing-token 401 and 404 invite-not-found branch coverage
  - Non-POST 405 method-guard assertions for send-email, accept-invite, lead-intake
affects: [04-security, SEC-01, api-handler-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Characterization tests assert ACTUAL current status/body, locking behavior before a later hardening rewrite"
    - "New API test cases reuse the shipped mockFirebaseAdmin / makeCollection / loadHandler / invoke harness verbatim"

key-files:
  created: []
  modified:
    - tests/api/api-handlers.test.mjs

key-decisions:
  - "Task 1 (reconcile-and-verify) produced no diff — verification-only; all coverage additions landed in the single Task 2 commit"
  - "accept-invite 200 test seeds a custom deals doc via makeCollection({ doc }) so dealSnap.exists returns true with propertyAddress"

patterns-established:
  - "405 method-guard tests pass { method: 'GET' } to the shipped invoke() helper; the method check is first in every handler so minimal/no mock setup is needed"
  - "send-email 200 stubs fetch twice (identitytoolkit lookup then resend send), both ok:true"

requirements-completed: [TEST-02]

coverage:
  - id: D1
    description: "send-email returns 200 with body { ok: true, id } on a successful send (G-A1)"
    requirement: "TEST-02"
    verification:
      - kind: unit
        ref: "tests/api/api-handlers.test.mjs#returns 200 with the provider message id on a successful send"
        status: pass
    human_judgment: false
  - id: D2
    description: "accept-invite returns 200 with { ok: true, dealId, propertyAddress } for a matching invite (G-A1)"
    requirement: "TEST-02"
    verification:
      - kind: unit
        ref: "tests/api/api-handlers.test.mjs#returns 200 and links the deal for a matching invite"
        status: pass
    human_judgment: false
  - id: D3
    description: "accept-invite returns 401 'Missing auth token' when no authorization header is sent (G-A2)"
    requirement: "TEST-02"
    verification:
      - kind: unit
        ref: "tests/api/api-handlers.test.mjs#rejects requests with no authorization header"
        status: pass
    human_judgment: false
  - id: D4
    description: "accept-invite returns 404 'Invite not found or already used' on an empty deal-parties query (G-A2)"
    requirement: "TEST-02"
    verification:
      - kind: unit
        ref: "tests/api/api-handlers.test.mjs#returns 404 when the invite token matches no deal party"
        status: pass
    human_judgment: false
  - id: D5
    description: "send-email, accept-invite, and lead-intake each reject a non-POST request with 405 'Method not allowed' (G-A3)"
    requirement: "TEST-02"
    verification:
      - kind: unit
        ref: "tests/api/api-handlers.test.mjs#rejects non-POST requests with 405 (x3)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Shipped TEST-02 contract confirmed green against live handlers: each of send-email/accept-invite/lead-intake has 401 auth, 400 payload with details[].path, and an error-path assertion"
    requirement: "TEST-02"
    verification:
      - kind: unit
        ref: "npm run test:api (23/23 pass)"
        status: pass
    human_judgment: false

# Metrics
duration: 3min
completed: 2026-07-13
status: complete
---

# Phase 2 Plan 01: API Handler Characterization Reconcile-and-Verify Summary

**Verified the shipped serverless-handler suite green against the live handlers and deepened it with 7 characterization tests: send-email/accept-invite 200 payload shapes, accept-invite missing-token 401 + 404 not-found, and non-POST 405 method guards for all three required handlers.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-07-13T02:54:05Z
- **Completed:** 2026-07-13T02:56:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Confirmed the shipped 16-test suite (commit dd6364a) satisfies the TEST-02 three-category contract (401 auth, 400 payload with `details[].path`, error path) for send-email, accept-invite, and lead-intake — no rolldown/Java issue on this host, ran green as-is
- Added 7 characterization tests (16 → 23), pinning the current behavior of the two riskiest surfaces before Phase 4/SEC-01 rewrites payload validation
- send-email 200 `{ ok: true, id: 'email-1' }` and accept-invite 200 `{ ok: true, dealId, propertyAddress }` payload shapes locked (G-A1)
- accept-invite missing-token 401 and 404 invite-not-found branches now covered (G-A2)
- Non-POST GET → 405 `{ error: 'Method not allowed' }` asserted for all three handlers (G-A3)
- No production handler file modified; all additions reuse the shipped mocking harness verbatim

## Task Commits

1. **Task 1: Reconcile and verify the shipped API suite against the live handlers** — no commit (verification-only; produced no diff). `npm run test:api` ran 16/16 green and the TEST-02 contract was confirmed to hold against the on-disk handlers.
2. **Task 2: Deepen API characterization — 200 payloads, missing-token/404, method guards** — `77a6fb7` (test)

**Plan metadata:** (docs: complete plan — this SUMMARY, STATE.md, ROADMAP.md, REQUIREMENTS.md)

## Files Created/Modified
- `tests/api/api-handlers.test.mjs` - Added 7 `it(...)` blocks across the send-email, accept-invite, and lead-intake describe blocks (200 success, missing-token 401, 404 not-found, 405 method guards)

## Decisions Made
- Task 1 is a reconcile-and-verify step with no expected diff; recording it as a verification checkpoint rather than an empty commit. All coverage additions are in the single Task 2 test commit.
- The accept-invite 200 test builds `db.collection('deals')` via `makeCollection({ doc: () => dealDoc })` so the handler's `dealSnap.exists` path returns a seeded `propertyAddress` — reusing the shipped `makeCollection` helper rather than a bespoke mock.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- RESEARCH flagged two potential environmental blockers (Java 21 for `test:rules`, wrong-arch rolldown binding for Vitest). Neither affected this plan: `npm run test:api` does not require Java, and the rolldown binding on this host was already platform-correct — no `npm ci` was needed. Suite ran green on the first invocation.

## Pre-task vs post-task `it(` count
- Pre-task: 16
- Post-task: 23 (strictly greater — acceptance criterion met)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- send-email and accept-invite success payloads and previously-untested branches are now pinned, giving Phase 4/SEC-01 a diffable baseline before it rewrites payload validation.
- Remaining Phase 2 work (plans 02-02 rules-coverage deepening, 02-03 TESTING.md docs) is independent of this plan.

## Self-Check: PASSED

- FOUND: tests/api/api-handlers.test.mjs
- FOUND: .planning/phases/02-test-scaffolding/02-01-SUMMARY.md
- FOUND: commit 77a6fb7

---
*Phase: 02-test-scaffolding*
*Completed: 2026-07-13*
