---
phase: 04-serverless-hardening
plan: 02
subsystem: api
tags: [security, csp, trust-boundaries, vitest, docs, serverless]

# Dependency graph
requires:
  - phase: 04-serverless-hardening (plan 01)
    provides: existing tests/api vitest suite pinning per-endpoint auth postures (send-email, accept-invite, lead-intake, delete-media, csp-report)
provides:
  - Complete trust-boundary documentation covering all six api/ endpoints, including the previously-undocumented csp-report browser beacon with an explicit intentional-open rationale
  - An automated fs-vs-doc completeness audit test that fails if any api/ handler lacks a TRUST_BOUNDARIES.md row (drift regression guard)
affects: [serverless-hardening, security-review, audit-milestone]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Static fs-glob-vs-doc completeness audit (readdirSync + readFileSync + it.each) — no handler load, no mocks"
key-files:
  created:
    - tests/api/trust-boundaries-audit.test.mjs
  modified:
    - docs/TRUST_BOUNDARIES.md

key-decisions:
  - "csp-report documented as an intentional, low-risk open beacon mirroring the CSP spec — not a defect"
  - "Audit test uses positive completeness (every handler basename must appear in the doc) so future undocumented endpoints fail the suite"

patterns-established:
  - "Trust-boundary doc coverage is machine-checked: a filesystem-vs-doc audit test enforces that every api/*.js endpoint stays documented"

requirements-completed: [SEC-02]

coverage:
  - id: D1
    description: "docs/TRUST_BOUNDARIES.md documents api/csp-report.js — the intentionally-unauthenticated browser beacon (None-by-design caller proof, logs/forwards op, 405 non-POST / 204 valid failure behavior) plus a prose rationale for why it needs no auth"
    requirement: SEC-02
    verification:
      - kind: unit
        ref: "tests/api/trust-boundaries-audit.test.mjs#documents api/csp-report.js in docs/TRUST_BOUNDARIES.md"
        status: pass
      - kind: other
        ref: "grep -q 'api/csp-report.js' docs/TRUST_BOUNDARIES.md && grep -qi credential && grep -q 204"
        status: pass
    human_judgment: false
  - id: D2
    description: "Automated completeness audit asserts every api/*.js handler (excluding _lib) has a matching row in docs/TRUST_BOUNDARIES.md, and that the two non-Firebase-token postures (lead-intake shared secret, csp-report open beacon) are documented"
    requirement: SEC-02
    verification:
      - kind: unit
        ref: "tests/api/trust-boundaries-audit.test.mjs (8 cases) via npm run test:api"
        status: pass
    human_judgment: false

# Metrics
duration: 1min
completed: 2026-07-13
status: complete
---

# Phase 04 Plan 02: Trust-Boundary Doc + Completeness Audit Summary

**Closed the single SEC-02 gap by documenting api/csp-report.js as an intentional open beacon in TRUST_BOUNDARIES.md and added a machine-check that every api/ handler stays documented.**

## Performance

- **Duration:** 1m 7s
- **Started:** 2026-07-13T06:13:39Z
- **Completed:** 2026-07-13T06:14:46Z
- **Tasks:** 2
- **Files modified:** 2 (1 modified, 1 created)

## Accomplishments
- Added the `api/csp-report.js` row to the Serverless API Functions table (after `api/health.js`), documenting its unauthenticated-by-design caller proof, logs/forwards operation, and 405/204 failure behavior
- Added a prose rationale explaining WHY csp-report is intentionally unauthenticated (credential-less browser beacon, no business-data write), noting lead-intake and csp-report as the only two non-Firebase-token endpoints
- Created `tests/api/trust-boundaries-audit.test.mjs` — a static fs-vs-doc completeness audit proving every api/*.js endpoint is documented and that the two non-Firebase-token postures are surfaced
- Confirmed `npm run test:api` green (33 existing + 8 new = 41 tests) and `npm run check:constants` green after the doc edit

## Task Commits

Each task was committed atomically:

1. **Task 1: Add csp-report.js row + rationale to TRUST_BOUNDARIES.md** - `795a022` (docs)
2. **Task 2: Add auth-audit completeness test** - `c733ba8` (test)

## Files Created/Modified
- `docs/TRUST_BOUNDARIES.md` - Added csp-report endpoint row + intentional-open-beacon rationale prose
- `tests/api/trust-boundaries-audit.test.mjs` - New vitest completeness audit (readdirSync api/, assert each basename in doc, assert two non-Firebase-token postures)

## Decisions Made
- Documented csp-report as a deliberate low-risk open beacon (mirrors CSP spec) rather than flagging it as a defect — matches RESEARCH Pitfall 2.
- Test uses positive completeness (`it.each` over discovered handlers) so a future undocumented endpoint fails the suite, rather than a fixed hardcoded list.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. No secret or admin-email literal was written to the doc (`npm run check:constants` confirms).

## Next Phase Readiness
- SEC-02 automatable half fully satisfied: trust boundary documented for every endpoint and machine-checked against drift.
- Plan 04-03 remains incomplete in this phase.

## Self-Check: PASSED

- docs/TRUST_BOUNDARIES.md — FOUND
- tests/api/trust-boundaries-audit.test.mjs — FOUND
- .planning/phases/04-serverless-hardening/04-02-SUMMARY.md — FOUND
- Commit 795a022 — FOUND
- Commit c733ba8 — FOUND

---
*Phase: 04-serverless-hardening*
*Completed: 2026-07-13*
