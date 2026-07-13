---
phase: 07-ui-ux-copy-accessibility
plan: 04
subsystem: ui-empty-error-states
tags: [ui-01, copy-03, empty-states, pagestate, error-states]
status: complete
requires:
  - "PageState primitive (src/components/PageState.js)"
  - "errorMessages.mapError (src/utils/errorMessages.js, plan 01)"
  - "docs/COPY-STANDARD.md (plan 01)"
provides:
  - "First-use / no-results / error PageState wiring on 8 list & dashboard surfaces"
  - "Load-failure error states sourced from the central error map (leak-safe)"
affects:
  - "HomePage, CRMLeadsPage, TasksPage, MyDealsPage, ContactsPage, PropertiesPage, DocumentsPage, ActiveDealsPage"
tech-stack:
  added: []
  patterns:
    - "loadError state + mapError(error) in each load catch; render via PageState tone=error"
    - "first-use vs no-results distinguished by data-length vs filtered-length + active-filter check"
    - "Try again action calls the page's existing load function (or a reload-key bump)"
key-files:
  created: []
  modified:
    - src/components/ContactsPage.js
    - src/components/PropertiesPage.js
    - src/components/DocumentsPage.js
    - src/components/TasksPage.js
    - src/components/CRMLeadsPage.js
    - src/components/HomePage.js
    - src/components/MyDealsPage.js
    - src/components/ActiveDealsPage.js
decisions:
  - "CRMLeadsPage keeps its pre-existing sample-lead demo row as the first-use experience (backward-compat); its new PageState wiring covers no-results + first-use-when-empty + error"
  - "HomePage retains its richer multi-action onboarding card as first-use and gains a PageState error state; single-CTA PageState would have reduced onboarding UX"
  - "Added load-failure error states to all 5 primary lists (not only Task 2's 3 pages) to satisfy plan must-have #3 (leak-safe error branches everywhere)"
  - "SWR-safe: HomePage background refresh failures stay silent over cached KPIs; only cold loads surface the error state"
metrics:
  duration: ~20m
  tasks: 2
  files: 8
  completed: 2026-07-13
---

# Phase 07 Plan 04: Empty & Error States on List/Dashboard Surfaces Summary

Wired first-use, no-results, and load-failure states across all eight REMS list and dashboard surfaces on the existing `PageState` primitive, with leak-safe error copy from the central `errorMessages` map and empty-state copy following `docs/COPY-STANDARD.md`.

## What was built

**Task 1 — Primary lists (first-use + no-results + error):**
- **ContactsPage / PropertiesPage / DocumentsPage** (already imported `PageState`): extended to distinct first-use ("No … yet" + quiet add action) and no-results ("No matches" + quiet `Clear filters`) variants, plus a `tone="error"` branch.
- **TasksPage / CRMLeadsPage** (previously lacked `PageState`): imported it and replaced the ad-hoc `empty-state-card` markup with the two-variant + error wiring.
- Each page gained a `loadError` state set from `mapError(error)` in its load `catch`, cleared at load start, rendered as a `PageState tone="error"` with a `Try again` action calling the existing load function.

**Task 2 — HomePage, MyDealsPage, ActiveDealsPage:**
- **HomePage**: added a `PageState` error state (Try again → `loadDashboardData()`); background SWR refresh failures stay silent over cached KPIs (only cold loads surface the error). Cleaned banned emoji/marketing copy from the welcome hero, first-run onboarding card, and recent-tasks widget per the copy standard.
- **MyDealsPage** (buyer/seller client shell, explicitly in UI-01): replaced the emoji `empty-state-card` with a generic first-use `PageState`, and added an error state with a reload-key `Try again` handler.
- **ActiveDealsPage**: split the single empty state into first-use ("No deals yet") vs no-results ("No matches" + `Clear filters` resetting the status filter), plus an error branch.

## Copy & security compliance
- All new copy is sentence case, terse, factual — verb+object actions (`Add contact`, `New task`, `Clear filters`, `Try again`) per `docs/COPY-STANDARD.md`.
- Error states render `{message} {recovery}` from `errorMessages.mapError`; **no raw `err.message`** is interpolated anywhere (mitigates threat T-07-05, Information Disclosure).
- Removed banned emoji (👋, 🔑, 🏡, 🤝) and exclamation points from the touched empty-state copy.

## Deviations from Plan

### Auto-added (Rule 2 — missing critical functionality)
**1. [Rule 2] Error states on the 5 primary lists, not only Task 2's 3 pages**
- **Found during:** Task 1
- **Rationale:** Plan must-have #3 ("Load-failure branches render a PageState error state sourced from errorMessages.js") is unqualified, and the objective calls for an error-tone state for load failures generally. Task 1's pages previously swallowed load errors with a bare `console.error`.
- **Change:** Added `loadError` state + `mapError` wiring + a `PageState tone="error"` branch to ContactsPage, PropertiesPage, DocumentsPage, TasksPage, and CRMLeadsPage.
- **Commit:** 0c97b4e

### Backward-compat judgments (documented, not restructured)
**2. CRMLeadsPage first-use is the existing sample-lead demo row**
- CRMLeadsPage renders a `sampleLead` when no real leads exist (a deliberate demo/onboarding behavior with a "Sample" badge). Per CLAUDE.md ("backward-compatible changes unless explicitly approved" / "do not remove current production workflows"), this was preserved. The new wiring adds: no-results `PageState` (active filters → "No matches" + Clear filters) and a first-use "No leads yet" `PageState` for the reachable no-filter-empty path, plus the error state.

**3. HomePage keeps its multi-action onboarding card as first-use**
- HomePage already had a designed first-run onboarding card with five quick-start actions — a stronger first-use experience than a single-CTA `PageState`. It was retained (copy cleaned to standard) and complemented with a new `PageState` error state. Emoji/marketing copy in the external-user welcome and recent-tasks widget were also cleaned.

## Verification
- `npm run lint` — clean (0 warnings/errors)
- `npm run build` — Compiled successfully
- `CI=true npm run test:ci` — 8 suites / 55 tests passed
- `grep -l PageState` confirms all 8 target files import/use `PageState`
- Manual per-surface visual verification of each empty/no-results/error variant is deferred to phase verify (per plan).

## Threat Flags
None — no new network endpoints, auth paths, or schema changes. The single trust boundary (load error → user-visible copy) is mitigated as specified (T-07-05): all error copy is curated via `errorMessages.js`.

## Known Stubs
None.

## Self-Check: PASSED
- All 8 modified source files present on disk.
- SUMMARY.md present.
- Commits 0c97b4e and bfbdabe present in git history.
