---
phase: 07-ui-ux-copy-accessibility
plan: 06
subsystem: ui
tags: [react, skeleton, swr, perceived-performance, loading-states, localstorage-cache]

# Dependency graph
requires:
  - phase: 07-03
    provides: Skeleton primitive (Skeleton/SkeletonText/SkeletonCard/SkeletonTableRow/SkeletonKpiTile) + useDelayedFlag 400ms gate
  - phase: 07-04
    provides: PageState empty/error branches wired into each list/dashboard page
provides:
  - Delayed (400ms) layout-mirroring skeletons in the loading branch of Deals, CRM, Contacts, Properties, Tasks, and Documents
  - HomePage silent SWR — cached KPIs render instantly (even when stale), refetch silently in the background, swap in with no refresh indicator
  - Delayed cold/no-cache KPI skeleton on HomePage first load only
affects: [07-verify, ui-review, perceived-performance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Delay-then-show skeleton gating: useDelayedFlag(loading, 400) → skeleton only past threshold, sub-threshold loads render null then swap to content (no flash)"
    - "Silent SWR over existing localStorage cache: return stale payload with isStale flag rather than discarding; render-stale-then-refetch"

key-files:
  created: []
  modified:
    - src/components/ActiveDealsPage.js
    - src/components/CRMLeadsPage.js
    - src/components/ContactsPage.js
    - src/components/PropertiesPage.js
    - src/components/TasksPage.js
    - src/components/DocumentsPage.js
    - src/components/HomePage.js

key-decisions:
  - "readHomeKpiCache returns { payload, isStale } and never discards a live cache entry; only a genuine miss returns null → cold load"
  - "Cold-load HomePage skeleton mirrors Quick Links + the 4 KPI containers (6/3/1/5 item rows) rather than a generic spinner"
  - "ContactsPage skeleton lives in the existing inline loading branch (not a full-page return); other five pages use full-page returns"

patterns-established:
  - "Pattern 1: useDelayedFlag(loading, 400) hook declared before the first early return; loading branch renders {showSkeleton && <PageSkeleton/>} so sub-threshold loads show nothing"
  - "Pattern 2: SWR cache read returns stale-but-usable payload + isStale; effect renders cache immediately and calls loadDashboardData(true) for a silent background refresh"

requirements-completed: [UI-02, UI-03]

coverage:
  - id: D1
    description: "Over-threshold (~400ms) loads on Deals, CRM, Contacts, Properties, Tasks, Documents show layout-mirroring skeletons; sub-threshold loads swap straight to content with no skeleton flash"
    requirement: "UI-02"
    verification:
      - kind: automated_ui
        ref: "npm run build (green) + grep -l useDelayedFlag src/components/TasksPage.js src/components/PropertiesPage.js"
        status: pass
      - kind: manual_procedural
        ref: "Throttled load shows skeleton >400ms with no CLS; fast load shows no skeleton — phase-verify manual check"
        status: unknown
    human_judgment: true
    rationale: "No-layout-shift (CLS) and the 400ms perceptual threshold require throttled-network human observation; the plan explicitly defers CLS to manual phase-verify."
  - id: D2
    description: "HomePage renders cached KPIs instantly even when stale, refetches silently in the background, and swaps in fresh numbers with no visible refresh indicator; cold/no-cache load shows a delayed KPI skeleton"
    requirement: "UI-03"
    verification:
      - kind: automated_ui
        ref: "npm run lint + npm run build (green); readHomeKpiCache returns {payload,isStale}, effect renders cache then loadDashboardData(true)"
        status: pass
      - kind: manual_procedural
        ref: "Reload Home with warm cache: numbers appear instantly with no spinner/flash, then update silently — phase-verify manual check"
        status: unknown
    human_judgment: true
    rationale: "Silent-refresh perception (no visible indicator, instant paint) is a subjective visual judgment best confirmed by a human on a real reload."

# Metrics
duration: ~25min
completed: 2026-07-13
status: complete
---

# Phase 7 Plan 06: Delayed Skeletons + Home Silent SWR Summary

**Layout-mirroring 400ms-delayed skeletons wired into six list/dashboard loading branches, plus HomePage KPI cache converted to silent render-stale-then-refetch SWR with a cold-load-only skeleton.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-13T11:06:00Z
- **Completed:** 2026-07-13T11:31:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Replaced the inline `loading-spinner` in Deals (ActiveDealsPage), CRM (CRMLeadsPage), Contacts, Properties, Tasks, and Documents with a `useDelayedFlag(loading, 400)`-gated skeleton that mirrors each page's real layout (cards-grid for Deals/Properties/Documents, tables for CRM/Contacts, header + stat tiles + list for Tasks) — sub-threshold loads render nothing then swap straight to content (no flash).
- Converted `readHomeKpiCache` from discard-when-stale to returning `{ payload, isStale }`, so cached KPIs render instantly even past the 30s TTL, then refetch silently in the background and swap in fresh numbers with no visible refresh indicator (D-11 silent SWR).
- Added a delayed KPI-tile skeleton on HomePage that fires only on a true cold/no-cache first load (cache hits set `loading=false` immediately, so the skeleton never appears on an SWR render).
- Preserved the existing cache key, TTL, per-scope keying, and `{stats, tasks}` payload shape — no new store added (locked no-new-dependency).

## Task Commits

Each task was committed atomically:

1. **Task 1: Delayed skeleton wiring on list/dashboard pages** - `3b3bdad` (feat)
2. **Task 2: HomePage silent SWR + cold-load KPI skeleton** - `4b9bd20` (feat)

## Files Created/Modified
- `src/components/ActiveDealsPage.js` - Delayed cards-grid + filter-chip skeleton in loading branch
- `src/components/CRMLeadsPage.js` - Delayed 11-column table-row skeleton in loading branch
- `src/components/ContactsPage.js` - Delayed 6-column table-row skeleton in the inline loading branch
- `src/components/PropertiesPage.js` - Delayed card-grid skeleton (property card height ~320px)
- `src/components/TasksPage.js` - Delayed header + grid-four stat tiles + list-row skeleton
- `src/components/DocumentsPage.js` - Delayed card-grid skeleton (document card height ~150px)
- `src/components/HomePage.js` - Silent SWR cache read + delayed cold-load KPI skeleton mirroring Quick Links and the 4 KPI containers

## Decisions Made
- `readHomeKpiCache` returns `{ payload, isStale }` and only returns `null` on a genuine cache miss/parse failure, so stale entries still render instantly — this is the single behavioral change enabling silent SWR without touching cache scoping (aligned with threat T-07-08 disposition: accept).
- The HomePage cold-load skeleton mirrors the actual dashboard (Quick Links row + 4 KPI containers with 6/3/1/5 rows) instead of a generic block, so a cold load looks like the page filling in rather than a placeholder screen.
- Each skeleton uses only `var(--token)` values (spacing, radius, borders) and the Skeleton primitive's own tokenized fill — no raw hex introduced.

## Deviations from Plan

None - plan executed exactly as written. (One incidental correction: used the existing `--border-subtle` token in the Contacts skeleton row divider since a bare `--border` token does not exist in the design system.)

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Skeleton + delay-then-show pattern is now applied consistently across all six primary list/dashboard surfaces and Home; remaining phase-07 plans can rely on this as the standard loading affordance.
- Manual phase-verify still owes two checks: throttled-load skeleton visibility with no CLS, and Home KPI instant paint + silent refresh. Both are documented as manual (human_judgment) coverage items.

## Self-Check: PASSED

All 7 modified files present; both task commits (`3b3bdad`, `4b9bd20`) exist in git history.

---
*Phase: 07-ui-ux-copy-accessibility*
*Completed: 2026-07-13*
