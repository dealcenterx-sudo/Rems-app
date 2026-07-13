---
phase: 03-observability
plan: 02
subsystem: testing
tags: [sentry, vitest, node-mocks-http, observability, serverless, error-tracking]

# Dependency graph
requires:
  - phase: 02-test-scaffolding
    provides: tests/api/api-handlers.test.mjs vitest module-cache mock harness
provides:
  - "tests/api/withSentry.test.mjs — unit suite proving the OBS-02 code-wiring half (no-DSN pass-through, capture-then-flush-before-respond on uncaught throw)"
  - "docs/SAAS_READINESS_AUDIT.md finding logging the handled-500s Sentry blind spot, routed to Phase 5 / DATA-02"
affects: [03-03 human-verify DSN smoke, 05-data-reliability DATA-02 loud-not-silent]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "module-cache injection to mock @sentry/node under vitest (clone of api-handlers harness)"
    - "shared order-tracking array + res.status spy to assert flush-before-respond call ordering"

key-files:
  created:
    - tests/api/withSentry.test.mjs
  modified:
    - docs/SAAS_READINESS_AUDIT.md

key-decisions:
  - "OBS-02 test drives an ACTUAL uncaught throw (not a handled error path) — only a thrown error exercises the wrapper's capture/flush catch block"
  - "Handled-500s blind spot documented as a routed-forward finding (Phase 5 / DATA-02) rather than fixed here — instrumenting handler catch blocks is out of scope (locked decision)"

patterns-established:
  - "flush-before-respond assertion: flush mock and a res.status spy both push to one order array; assert order === ['flush','respond']"
  - "reset module-level `initialized` flag between vitest cases by deleting the wrapper AND @sentry/node from requireFromRoot.cache"

requirements-completed: [OBS-02]

coverage:
  - id: D1
    description: "withSentry is a transparent pass-through when no DSN is set — handler result returned untouched, Sentry.init/captureException/flush never called"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "tests/api/withSentry.test.mjs#no DSN: is a pass-through that returns the handler response and never touches Sentry"
        status: pass
    human_judgment: false
  - id: D2
    description: "On an uncaught throw with SENTRY_DSN set, the wrapper calls captureException with the error, awaits flush(2000), then responds 500 { error: 'Internal server error' } — in flush-before-respond order"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "tests/api/withSentry.test.mjs#DSN set + uncaught throw: captures the error, flushes(2000) BEFORE responding 500"
        status: pass
    human_judgment: false
  - id: D3
    description: "A passing handler with DSN set produces NO captureException (wrapper fires only on thrown errors)"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "tests/api/withSentry.test.mjs#DSN set + passing handler: returns the handler result and does NOT capture"
        status: pass
    human_judgment: false
  - id: D4
    description: "OBS-02 handled-500s coverage gap logged as a Medium finding in SAAS_READINESS_AUDIT.md, routed to Phase 5 / DATA-02"
    requirement: OBS-02
    verification:
      - kind: other
        ref: "grep -q 'only captures' docs/SAAS_READINESS_AUDIT.md && grep -q 'DATA-02' docs/SAAS_READINESS_AUDIT.md"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-07-13
status: complete
---

# Phase 3 Plan 02: withSentry Wrapper Test + OBS-02 Gap Finding Summary

**Net-new vitest suite proves the OBS-02 code-wiring half — no-DSN pass-through and capture-then-flush-before-respond on an uncaught throw — with `@sentry/node` mocked via module-cache injection; the handled-500s blind spot is logged and routed forward to Phase 5.**

## Performance

- **Duration:** ~5 min
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Added `tests/api/withSentry.test.mjs` (4 tests) cloning the api-handlers module-cache mock harness to mock `@sentry/node`
- Asserted no-DSN pass-through (Sentry never touched) and, with a DSN, capture → flush(2000) → 500 in that exact order via a shared order-tracking array + `res.status` spy
- Asserted a passing handler with a DSN set does NOT call captureException
- Logged the OBS-02 handled-500s gap as a Medium finding in the audit doc, routed to Phase 5 / DATA-02
- `npm run test:api` green (27 tests = existing 23 + 4 new); `npm run check:constants` green

## Task Commits

1. **Task 1: Add withSentry.test.mjs — no-DSN pass-through + flush-before-respond on uncaught throw** - `0054a8d` (test)
2. **Task 2: Log the OBS-02 coverage gap as a routed-forward finding** - `1023133` (docs)

## Files Created/Modified
- `tests/api/withSentry.test.mjs` - vitest suite mocking `@sentry/node`; proves no-DSN pass-through, capture/flush-before-respond on uncaught throw, no-capture on passing handler
- `docs/SAAS_READINESS_AUDIT.md` - new Medium Risk-Ranked Findings row for the handled-500s Sentry blind spot, routed to Phase 5 / DATA-02

## Decisions Made
- The OBS-02 test triggers an actual uncaught throw because a handled error path would never enter the wrapper's catch block — a normal 500/502 return produces no Sentry event.
- Left `api/_lib/withSentry.js` and all `api/*.js` handlers unmodified; instrumenting catch blocks is the routed Phase 5 / DATA-02 follow-up, out of scope here (locked decision).
- Used a shared order array (flush mock pushes `'flush'`, a `res.status` spy pushes `'respond'`) to prove flush-before-respond, rather than timestamps.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. (The event-landing half of OBS-02 — a live DSN + deployed function smoke — is a human-verify checkpoint in 03-03-PLAN.md.)

## Next Phase Readiness
- OBS-02 code-wiring half is now automatically verified under `npm run test:api`.
- Remaining OBS-02 acceptance (real uncaught error landing in Sentry) is carried to 03-03-PLAN.md as a human-verify checkpoint.
- Handled-500s blind spot is tracked for Phase 5 / DATA-02 so OBS-02's acceptance is explicit, not vacuous.

## Self-Check: PASSED

- FOUND: tests/api/withSentry.test.mjs
- FOUND: docs/SAAS_READINESS_AUDIT.md
- FOUND commit: 0054a8d (Task 1)
- FOUND commit: 1023133 (Task 2)

---
*Phase: 03-observability*
*Completed: 2026-07-13*
