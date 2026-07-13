---
phase: 03-observability
plan: 01
subsystem: testing
tags: [sentry, observability, jest, react-testing-library, error-boundary, web-vitals]

# Dependency graph
requires:
  - phase: 02 (shipped in commit dd6364a)
    provides: src/utils/observability.js, src/components/ErrorBoundary.js (client Sentry wiring under test)
provides:
  - Characterization unit suites for the shipped client-side Sentry wiring (DSN gating, captureError bridge, captureWebVital forwarding, ErrorBoundary componentDidCatch bridge)
  - Regression guard proving the DSN-gated no-op is the current/intended env state
affects: [03-02, 03-03, observability, testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client observability tests mock @sentry/react with an explicit jest.mock factory (auto-mock fails on the package export shape)"
    - "Module-level `initialized` guard reset between disabled/enabled cases via jest.isolateModules + fresh require"
    - "Component error-boundary tests mock ../utils/observability to keep @sentry/react out of the render test; console.error spy silences expected React noise"

key-files:
  created:
    - src/utils/observability.test.js
    - src/components/ErrorBoundary.test.js
  modified: []

key-decisions:
  - "Used an explicit jest.mock('@sentry/react', factory) instead of the planned auto-mock — auto-mock throws 'Failed to get mock metadata' on @sentry/react's export shape (deviation Rule 3)"
  - "Characterization tests for already-shipped code: no RED phase — the subjects exist and are correct, so tests pass on first green run"

patterns-established:
  - "Sentry client mock: explicit factory { init, captureException, captureMessage, flush } — reusable for any client Sentry test"
  - "Enabled/disabled DSN path isolation: require @sentry/react + subject fresh inside jest.isolateModules to reset module-level state"

requirements-completed: [OBS-01, OBS-03]

coverage:
  - id: D1
    description: "isSentryEnabled/initObservability DSN gating: clean no-op when REACT_APP_SENTRY_DSN unset, Sentry.init called exactly once (double-init guarded) when set"
    requirement: "OBS-01"
    verification:
      - kind: unit
        ref: "src/utils/observability.test.js#initObservability (DSN gating)"
        status: pass
    human_judgment: false
  - id: D2
    description: "captureError bridges to Sentry.captureException with context under { extra }, no-op when DSN unset"
    requirement: "OBS-01"
    verification:
      - kind: unit
        ref: "src/utils/observability.test.js#captureError"
        status: pass
    human_judgment: false
  - id: D3
    description: "captureWebVital forwards to Sentry.captureMessage('Web Vital: <name>', {level, tags, contexts}) when enabled; no-op when DSN unset or metric falsy"
    requirement: "OBS-03"
    verification:
      - kind: unit
        ref: "src/utils/observability.test.js#captureWebVital"
        status: pass
    human_judgment: false
  - id: D4
    description: "ErrorBoundary.componentDidCatch bridges caught render error to captureError({ componentStack }) and renders the 'Something went wrong' / 'Try again' fallback"
    requirement: "OBS-01"
    verification:
      - kind: unit
        ref: "src/components/ErrorBoundary.test.js#ErrorBoundary"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-07-13
status: complete
---

# Phase 3 Plan 01: Client Observability Unit Suites Summary

**Net-new CRA Jest suites characterizing the shipped client Sentry wiring — DSN-gated no-op init, captureError→captureException bridge, captureWebVital→captureMessage forwarding, and the ErrorBoundary componentDidCatch bridge — all green with @sentry/react mocked and no live DSN.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-13T05:00:33Z
- **Completed:** 2026-07-13T05:08:00Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- `src/utils/observability.test.js` (11 tests): asserts `isSentryEnabled()` false/true by DSN; `initObservability()` is a clean no-op when DSN unset and calls `Sentry.init` exactly once (double-init guarded) when set; `captureError` bridges to `Sentry.captureException(err, { extra })` and no-ops without a DSN; `captureWebVital` forwards to `Sentry.captureMessage` with title/level/tags/contexts and no-ops for falsy metric or missing DSN (OBS-01, OBS-03).
- `src/components/ErrorBoundary.test.js` (2 tests): a throwing child trips `componentDidCatch`→`captureError(error, { componentStack })` and renders the "Something went wrong" / "Try again" fallback; a non-throwing child renders normally and `captureError` is not called (OBS-01).
- Full `npm run test:ci` stays green — 42 tests across 5 suites (29 pre-existing + 13 new). The `jest.mock('@sentry/react')` does not disturb CRA Jest isolation.

## Task Commits

Each task was committed atomically:

1. **Task 1: observability.test.js — DSN gating, captureError, captureWebVital** - `605fa5f` (test)
2. **Task 2: ErrorBoundary.test.js — componentDidCatch bridge + fallback UI** - `52778a2` (test)

_Characterization tests for already-shipped code: no RED→GREEN split — subjects exist and are correct, so each suite passed on first run._

## Files Created/Modified
- `src/utils/observability.test.js` - CRA Jest suite (11 tests) mocking `@sentry/react`; asserts DSN gating, captureError extra-context bridge, captureWebVital message shape + no-op guards
- `src/components/ErrorBoundary.test.js` - CRA Jest suite (2 tests) mocking `../utils/observability`; asserts componentDidCatch→captureError bridge and recovery fallback UI

## Decisions Made
- Replaced the planned `jest.mock('@sentry/react')` auto-mock with an explicit factory `{ init, captureException, captureMessage, flush }` — auto-mock throws "Failed to get mock metadata" against `@sentry/react`'s build/cjs export shape. The factory mock is the pattern `notifications.test.js` already uses.
- Kept the enabled/disabled DSN cases isolated with `jest.isolateModules` + a fresh `require` of both `@sentry/react` and `./observability`, so the module-level `initialized` guard resets and the freshly-required mock captures the `init` call.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @sentry/react auto-mock replaced with explicit factory mock**
- **Found during:** Task 1 (observability.test.js)
- **Issue:** `jest.mock('@sentry/react')` (auto-mock, as the plan action described) failed the suite to run: "Failed to get mock metadata: .../@sentry/react/build/cjs/index.js" — jest cannot auto-generate a mock for the package's export shape.
- **Fix:** Used an explicit factory `jest.mock('@sentry/react', () => ({ init: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn(), flush: jest.fn(() => Promise.resolve(true)) }))`, stubbing only the surface the tests assert on. Matches the factory-mock precedent in `notifications.test.js`.
- **Files modified:** src/utils/observability.test.js (test file only; subject unchanged)
- **Verification:** `CI=true npx react-scripts test --watchAll=false src/utils/observability.test.js` → 11/11 pass; full `npm run test:ci` → 42/42 pass.
- **Committed in:** 605fa5f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The factory-mock substitution was required for the suite to run at all; it asserts the identical Sentry surface the plan specified. No production source modified; no scope creep.

## Issues Encountered
- `@sentry/react` auto-mock incompatibility (resolved via factory mock — see Deviations).

## User Setup Required
None - no external service configuration required. (Live-DSN event-landing verification is carried to 03-03-PLAN.md as a human-verify checkpoint.)

## Next Phase Readiness
- The code-wiring half of OBS-01 and OBS-03 is now regression-guarded under `npm run test:ci`.
- 03-02 (server-side `withSentry` vitest suite) and 03-03 (live-DSN human-verify) remain.
- No blockers. Production source (`observability.js`, `ErrorBoundary.js`) untouched — main stays shippable.

## Self-Check: PASSED
- FOUND: src/utils/observability.test.js
- FOUND: src/components/ErrorBoundary.test.js
- FOUND commit: 605fa5f (Task 1)
- FOUND commit: 52778a2 (Task 2)
- Subjects unmodified: observability.js / ErrorBoundary.js last touched at dd6364a (shipped), not by this plan

---
*Phase: 03-observability*
*Completed: 2026-07-13*
