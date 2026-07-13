---
phase: 07-ui-ux-copy-accessibility
plan: 01
subsystem: ui
tags: [copy, error-handling, firebase-auth, react, security]

# Dependency graph
requires:
  - phase: 07-ui-ux-copy-accessibility
    provides: UI-SPEC copywriting contract, CONTEXT decisions D-01/D-03/D-05/D-06/D-07
provides:
  - One-page copy standard (docs/COPY-STANDARD.md) that all Phase 7 copy tasks cite
  - Central error map src/utils/errorMessages.js (code → { message, recovery }), leak-safe
  - mapError + toToastString accessors for Toast/PageState error surfacing
  - LoginPage repointed to the central map with auth flows intact
affects: [empty-error-states, optimistic-toggle-toasts, destructive-confirmations, copy-sweep, page-state-error]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Central error map: single code → { message, recovery } source of truth, leak-proof fallback"
    - "Copy standard doc authored before any copy sweep (COPY-01 gate)"

key-files:
  created:
    - docs/COPY-STANDARD.md
    - src/utils/errorMessages.js
    - src/utils/errorMessages.test.js
  modified:
    - src/components/LoginPage.js

key-decisions:
  - "errorMessages fallback returns curated GENERIC_ERROR, never err.message (security gate T-07-01)"
  - "Exported both mapError (object) and toToastString (composed string) for varied call sites"
  - "LoginPage uses toToastString so single displayed string keeps message + recovery"

patterns-established:
  - "Error copy: message = plain problem sentence, recovery = one imperative step; no SDK detail leaked"
  - "Copy voice: sentence case, verb+object buttons, one term per concept, no fluff"

requirements-completed: [COPY-01, COPY-02]

coverage:
  - id: D1
    description: "One-page copy standard exists on disk before any copy sweep (COPY-01)"
    requirement: "COPY-01"
    verification:
      - kind: automated_ui
        ref: "test -f docs/COPY-STANDARD.md && grep -qi 'sentence case' && grep -qi 'recovery'"
        status: pass
    human_judgment: false
  - id: D2
    description: "Central error map returns { message, recovery } for known codes and a leak-safe generic for unknown codes (COPY-02, T-07-01)"
    requirement: "COPY-02"
    verification:
      - kind: unit
        ref: "src/utils/errorMessages.test.js (7 tests, incl. no-leak sentinel assertion)"
        status: pass
    human_judgment: false
  - id: D3
    description: "LoginPage sources auth error copy from the central map; email/password, Google sign-in, and password-reset error paths unchanged"
    requirement: "COPY-02"
    verification:
      - kind: unit
        ref: "npm run lint + npm run build (green)"
        status: pass
    human_judgment: true
    rationale: "Live auth error UX (sign-in/signup/reset failure toasts) needs a manual smoke; deferred to phase verify per plan acceptance criteria."

# Metrics
duration: 3min
completed: 2026-07-13
status: complete
---

# Phase 07 Plan 01: Copy Foundations Summary

**One-page copy standard plus a leak-safe central error map (`code → { message, recovery }`) generalized from `friendlyAuthError`, with LoginPage repointed to it.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-13T10:40:59Z
- **Completed:** 2026-07-13T10:44Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Authored `docs/COPY-STANDARD.md` — the one-page voice/copy reference (sentence case, verb+object buttons, one-term-per-concept, error-copy format, empty-state variants, destructive-confirmation rule, banned fluff). This is the COPY-01 gate every downstream copy task cites.
- Built `src/utils/errorMessages.js` — single source of truth mapping 9 auth + 4 Firestore/API codes to `{ message, recovery }`, with `mapError` and `toToastString` accessors.
- Closed the T-07-01 information-disclosure risk: unknown codes return a curated `GENERIC_ERROR`, never the raw SDK `err.message`. Proven by a unit test feeding a distinctive sentinel string and asserting its absence from the mapped output.
- Repointed `LoginPage.js` from local `friendlyAuthError` to the central map; email/password, Google, and password-reset error paths preserved; lint + build green.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author the one-page copy standard (COPY-01)** - `f881ef3` (docs)
2. **Task 2: Create central errorMessages.js map + test (COPY-02, D-05)** - `25fea0e` (test, RED) → `00c28dc` (feat, GREEN)
3. **Task 3: Repoint LoginPage to the central map** - `9887fb6` (refactor)

_TDD task 2 used the RED → GREEN cycle; no refactor commit needed (implementation was clean on first pass)._

## Files Created/Modified
- `docs/COPY-STANDARD.md` - One-page copy standard (voice, buttons, terms, error/empty/destructive contracts, banned patterns)
- `src/utils/errorMessages.js` - Central `code → { message, recovery }` map + `mapError`/`toToastString`; leak-proof generic fallback
- `src/utils/errorMessages.test.js` - 7 unit tests incl. the no-leak sentinel assertion for the unknown-code fallback
- `src/components/LoginPage.js` - Removed local `friendlyAuthError`; imports `toToastString`; 3 error call sites repointed

## Decisions Made
- **Leak-safe fallback (security):** the unknown-code path returns `GENERIC_ERROR` (`{ message: "Something went wrong.", recovery: "Please try again." }`) rather than the analog's `err?.message`. This is the single behavioral change from `friendlyAuthError` and the core of T-07-01 mitigation.
- **Two accessors:** `mapError` returns the object (for PageState error states / structured use); `toToastString` composes `"{message} {recovery}"` for single-string call sites like LoginPage's error banner.
- **Auth message consolidation:** the three "incorrect credential" codes (`invalid-credential`, `wrong-password`, `user-not-found`) map to one identical `{ message, recovery }` to avoid disclosing which field was wrong — consistent with the prior behavior and account-enumeration safety.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- COPY-01 standard and COPY-02 error map are on disk and ready for downstream Phase 7 plans:
  - Empty/error states (PageState `tone="error"`) can source copy from `mapError`.
  - Optimistic-toggle failure toasts (D-13) can use `toToastString`.
  - Copy sweep (D-06) cites `docs/COPY-STANDARD.md`.
- No blockers. Live auth-error smoke test deferred to phase verify (acceptance criteria).

---
*Phase: 07-ui-ux-copy-accessibility*
*Completed: 2026-07-13*

## Self-Check: PASSED
All created files present on disk; all task commits (f881ef3, 25fea0e, 00c28dc, 9887fb6) verified in git history.
