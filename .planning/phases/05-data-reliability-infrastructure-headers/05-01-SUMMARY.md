---
phase: 05-data-reliability-infrastructure-headers
plan: 01
subsystem: testing
tags: [jest, testing-library, firestore, sentry, observability, analytics, composite-index]

# Dependency graph
requires:
  - phase: 03 (observability)
    provides: captureError bridge (src/utils/observability.js) — DSN-gated Sentry no-op
  - phase: dd6364a (shipped code)
    provides: AnalyticsDashboard missing-index fallback + 15 composite index defs
provides:
  - Machine-checked proof (unit test) that the AnalyticsDashboard missing-index fallback is loud (calls captureError) and graceful (still returns data)
  - Reconciled confirmation that firestore.indexes.json (15 defs) fully covers the non-admin where('userId')+orderBy query surface (DATA-01 code/doc half COMPLETE)
affects: [05-03 (live index READY + non-admin smoke), data-reliability]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Component error-path test: mock LOCAL ../utils/observability bridge (never auto-mock @sentry/react); assert on captureError.mock.calls"
    - "Multi-getDocs mock ordering: mockRejectedValueOnce(err).mockResolvedValue(snap) for Promise.all load paths that fire getDocs N>1 times"

key-files:
  created:
    - src/components/AnalyticsDashboard.test.js
  modified: []

key-decisions:
  - "Persistent mockResolvedValue (not mockResolvedValueOnce) for calls 2+ so the 3rd getDocs (deals fallback refetch) resolves — a single Once would return undefined → snapshot.docs throws"
  - "Task 2 (DATA-01 reconcile) is verify-only: firestore.indexes.json left unchanged; coverage recorded here"

patterns-established:
  - "Loud-fallback test pattern: force failed-precondition on call #1, assert captureError tag + scope flag, then assert refetch count for graceful degradation"

requirements-completed: [DATA-01, DATA-02]

coverage:
  - id: D1
    description: "AnalyticsDashboard missing-index fallback reports loudly via captureError({feature:'analytics-index-fallback', collectionName:'deals'}) and still returns data via the equality-only refetch"
    requirement: "DATA-02"
    verification:
      - kind: unit
        ref: "src/components/AnalyticsDashboard.test.js#reports the missing-index fallback loudly via captureError and still returns data"
        status: pass
    human_judgment: false
  - id: D2
    description: "firestore.indexes.json (15 composite defs) covers every non-admin where('userId')+orderBy query site (DATA-01 code/doc half)"
    requirement: "DATA-01"
    verification:
      - kind: automated
        ref: "node -e require('./firestore.indexes.json') asserts >=13 defs && grep userId → INDEX_COVERAGE_RECONCILED"
        status: pass
    human_judgment: true
    rationale: "The code/doc half is machine-confirmed here, but DATA-01 is only fully satisfied when all 15 indexes are READY in the Firebase Console (two-channel deploy; firestore.indexes.json does not deploy from git) — the live half is verified in Plan 03."

# Metrics
duration: 2min
completed: 2026-07-13
status: complete
---

# Phase 5 Plan 01: Data Reliability (Local Half) Summary

**Net-new unit test proving the AnalyticsDashboard missing-index fallback is loud (calls captureError with the analytics-index-fallback tag) and graceful (equality-only refetch still returns data), plus a verify-only reconcile confirming the 15 shipped composite index defs cover the full non-admin query surface.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-07-13T09:15:41Z
- **Completed:** 2026-07-13T09:17:09Z
- **Tasks:** 2
- **Files modified:** 1 (created)

## Accomplishments
- DATA-02 is now machine-checked: `src/components/AnalyticsDashboard.test.js` asserts the `failed-precondition` fallback calls `captureError` exactly once with `expect.objectContaining({ feature: 'analytics-index-fallback', collectionName: 'deals' })` and `userScoped: true` (scope preservation, T-05A-02).
- Graceful degradation proven: the equality-only refetch runs (3rd `getDocs` call) and data still resolves after reporting.
- Full suite green: 43 tests pass (42 existing + 1 new) under `npm run test:ci`; lint clean.
- DATA-01 code/doc half reconciled: firestore.indexes.json has 15 composite defs covering every non-admin `where('userId')+orderBy` query site (createdAt/dueDate/submittedAt orderBy fields all backed by a matching userId composite). No def missing; no edit made.

## Task Commits

1. **Task 1: Net-new AnalyticsDashboard missing-index fallback test (DATA-02)** - `093ec1d` (test)
2. **Task 2: Reconcile DATA-01 index-coverage claim (verify-only, no edit)** - no commit (no code change; reconcile recorded here)

**Plan metadata:** committed with SUMMARY.md + STATE.md + ROADMAP.md

## Files Created/Modified
- `src/components/AnalyticsDashboard.test.js` (created) - Unit test for the missing-index fallback path; mocks firebase/firestore (getDocs driven per-call), ../utils/observability (captureError jest.fn), ../firebase (db + auth.currentUser.uid), ../utils/helpers (isAdminUser→false), recharts (stubbed to null); renders inside ToastProvider.
- `firestore.indexes.json` (verify-only, unchanged) - Confirmed 15 composite defs; coverage cross-referenced against all non-admin where+orderBy query sites in src/components.

## Index Coverage Reconciliation (DATA-01 code/doc half)

Non-admin `where('userId')+orderBy` query sites map to existing composite defs by orderBy field:
- `orderBy('createdAt')` (deals, properties, contacts, documents, deal-documents) → covered by `userId,createdAt` (+ `userId,status,createdAt`, `userId,contactType,createdAt`, `userId,category,createdAt`, `dealId,createdAt`) defs.
- `orderBy('dueDate')` (tasks) → covered by `tasks: userId,dueDate`.
- `orderBy('submittedAt')` (leads) → covered by `leads: userId,submittedAt`.

Verification command output: `INDEX_DEFS 15`, `INDEX_COVERAGE_RECONCILED`. No newly-introduced query site is uncovered. **DATA-01 code/doc half COMPLETE.** The live Console READY state remains for Plan 03.

## Decisions Made
- Used `mockRejectedValueOnce(indexError).mockResolvedValue(snapshot)` (persistent for calls 2+) because `loadAllData` fires `getDocs` three times via `Promise.all` (deals-initial rejects, properties-initial resolves, deals-fallback refetch resolves). A single `mockResolvedValueOnce` would leave call #3 undefined → `snapshot.docs` throws.
- Kept Task 2 verify-only per plan — firestore.indexes.json is not edited; coverage is recorded in this SUMMARY.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. The live index-READY state and non-admin production smoke are handled in Plan 03.

## Next Phase Readiness
- DATA-02 locked by a passing unit test; DATA-01 code/doc half confirmed complete.
- Remaining DATA work is the LIVE half (Plan 03): all 15 composite indexes READY in Firebase Console + non-admin smoke with no index errors.

## Self-Check: PASSED

- FOUND: src/components/AnalyticsDashboard.test.js
- FOUND: commit 093ec1d

---
*Phase: 05-data-reliability-infrastructure-headers*
*Completed: 2026-07-13*
