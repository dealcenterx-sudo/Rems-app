---
phase: 07-ui-ux-copy-accessibility
plan: 07
subsystem: ui
tags: [react, firestore, optimistic-ui, loading-button, toast, accessibility]

# Dependency graph
requires:
  - phase: 07-01
    provides: errorMessages central map (mapError/toToastString) for leak-safe rollback copy
  - phase: 07-05
    provides: LoadingButton pendingLabel + ConfirmModal confirming/pendingLabel props
  - phase: 07-06
    provides: TasksPage/ActiveDealsPage load + skeleton wiring the toggles sit on top of
provides:
  - Optimistic task complete/incomplete toggle with silent rollback + mapped error toast
  - Optimistic deal status toggle preserving post-confirm side effects, with rollback anchor
  - Optimistic-rollback RTL unit test for TasksPage
  - LoadingButton pending state on NewDealPage submit and ActiveDealsPage close/delete confirms
affects: [ui-review, verify-work, accessibility]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic toggle: capture prior value -> setState new -> await write -> revert setState + toToastString(err) on catch"
    - "Destructive confirm keeps ConfirmModal open with a pending confirm button (confirming/pendingLabel) until the write settles"

key-files:
  created:
    - src/components/TasksPage.test.js
  modified:
    - src/components/TasksPage.js
    - src/components/ActiveDealsPage.js
    - src/components/NewDealPage.js

key-decisions:
  - "Toast rollback copy composed via errorMessages.toToastString (message + recovery), never raw err.message (T-07-10)"
  - "Task toggle aria-label added to give the icon-only control an accessible name (test anchor + a11y)"
  - "ActiveDealsPage close/delete confirms hold the modal open with a pending button rather than closing immediately, so users see the in-flight state"

patterns-established:
  - "Optimistic toggles: state-only revert on write failure, no Firestore reload on the success hot path"
  - "Present-tense pending labels on submit/destructive controls (Creating deal…, Closing…, Deleting…)"

requirements-completed: [UI-04, UI-06]

coverage:
  - id: D1
    description: "Task complete/incomplete toggle updates optimistically before the write resolves"
    requirement: "UI-06"
    verification:
      - kind: unit
        ref: "src/components/TasksPage.test.js#updates the toggle optimistically before the write resolves"
        status: pass
    human_judgment: false
  - id: D2
    description: "On write failure the task toggle silently reverts and shows a mapped error toast (message+recovery), no Retry, no Firestore reload"
    requirement: "UI-06"
    verification:
      - kind: unit
        ref: "src/components/TasksPage.test.js#reverts the toggle and shows a mapped error toast when the write fails"
        status: pass
    human_judgment: false
  - id: D3
    description: "Task toggle does not reload tasks from Firestore on the success hot path"
    requirement: "UI-06"
    verification:
      - kind: unit
        ref: "src/components/TasksPage.test.js#does not reload tasks from Firestore on the success hot path"
        status: pass
    human_judgment: false
  - id: D4
    description: "Deal status toggle is optimistic with rollback anchor; post-confirm side effects (seller update, loadDeals, logActivity, notifyUsers) run only after a successful write"
    requirement: "UI-06"
    verification:
      - kind: manual_procedural
        ref: "Induce a denied/offline deal status write; confirm revert + mapped error toast and that side effects did not fire"
        status: unknown
    human_judgment: true
    rationale: "ActiveDealsPage has no render harness in this plan; the deal path is covered by lint+build and mirrors the unit-tested TasksPage pattern — live denied-write behavior needs a human at phase verify."
  - id: D5
    description: "NewDealPage submit and ActiveDealsPage close/delete controls show a present-tense pending state; destructive copy matches handler behavior (D-07)"
    requirement: "UI-04"
    verification:
      - kind: manual_procedural
        ref: "Submit a deal and confirm close/delete; observe 'Creating deal…'/'Closing…'/'Deleting…' pending buttons"
        status: unknown
    human_judgment: true
    rationale: "Pending-state visibility is a visual/timing behavior; lint+build pass and grep confirms wiring, but the in-flight label render is best confirmed visually at phase verify."

# Metrics
duration: 12min
completed: 2026-07-13
status: complete
---

# Phase 7 Plan 07: Optimistic Toggles & Pending Buttons Summary

**Task and deal status toggles now update instantly with state-only rollback + leak-safe error toasts, and the deal submit/close/delete controls show present-tense pending states.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-13T11:30:00Z
- **Completed:** 2026-07-13T11:42:31Z
- **Tasks:** 2 (Task 1 TDD: RED + GREEN)
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- Converted `TasksPage.handleToggleComplete` from the anti-optimistic "await updateDoc → loadData()" pattern to optimistic `setState` → `updateDoc` → revert-on-catch; the success hot path no longer reloads from Firestore.
- Made `ActiveDealsPage.updateDealStatus` optimistic using the already-captured `previousStatus` as the rollback anchor, keeping all post-confirm side effects (seller `activelySelling`, `loadDeals`, `setSelectedDeal`, `logActivity`, `notifyUsers`) after a successful write only.
- Rollback error toasts are composed from `errorMessages.toToastString` (message + recovery), never raw `err.message`; no inline error, no Retry (D-13).
- Added an RTL optimistic-rollback unit test for TasksPage (3 cases) and adopted `LoadingButton` pending labels on NewDealPage submit and the ActiveDealsPage close/delete confirms.

## Task Commits

1. **Task 1 (RED): failing optimistic-toggle rollback test** - `0b7c936` (test)
2. **Task 1 (GREEN): optimistic task & deal toggles with rollback** - `2106d8d` (feat)
3. **Task 2: LoadingButton pending state on submit/destructive controls** - `b3d03be` (feat)

_Task 1 was TDD (test → feat); no refactor commit needed._

## Files Created/Modified
- `src/components/TasksPage.test.js` - New RTL test: optimistic update before write resolves, silent revert + mapped error toast on failure, no reload on success.
- `src/components/TasksPage.js` - Optimistic `handleToggleComplete`; removed hot-path `loadData()` reload; `toToastString` rollback toast; aria-label on the toggle control.
- `src/components/ActiveDealsPage.js` - Optimistic `updateDealStatus` with rollback; `closing`/`deleting` pending states; `confirming`/`pendingLabel` wired to close/delete ConfirmModals.
- `src/components/NewDealPage.js` - Submit button converted to `LoadingButton` with `pendingLabel="Creating deal…"`; hex remapped to `--accent`/`--surface-0` tokens.

## Decisions Made
- Used `toToastString(err)` (composes `${message} ${recovery}`) at the call sites rather than adding structured fields to the Toast API, matching the D-13 "compose at call site" contract.
- Added `aria-label` to the icon-only task toggle — it both gives the control an accessible name (a11y) and serves as the test's role query anchor.
- Close/delete confirms now keep the modal open with a pending confirm button until the write settles, instead of closing the modal before awaiting, so the pending state is actually visible.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical a11y] Added accessible name to the task toggle**
- **Found during:** Task 1 (optimistic toggle conversion)
- **Issue:** The task complete/incomplete toggle is an icon-only `<button>` with no accessible name — invisible to screen readers and unqueryable by role.
- **Fix:** Added `aria-label` reflecting the action ("Mark task complete" / "Mark task incomplete").
- **Files modified:** src/components/TasksPage.js
- **Verification:** RTL test queries the button by role+name; unit tests pass, lint green.
- **Committed in:** 2106d8d (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 missing-critical a11y)
**Impact on plan:** The aria-label is a correctness/a11y improvement aligned with the phase's accessibility goals and required for a role-based test query. No scope creep.

## Issues Encountered
- Initial test used `waitFor` + `getByRole`, which `testing-library/prefer-find-by` flags as a lint error; switched to `findByRole` and dropped the now-unused `waitFor` import. Lint green afterward.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Optimistic toggles and pending buttons are wired and unit/lint/build verified.
- Phase-verify manual check outstanding (D4/D5): induce a denied/offline write on the deal status toggle to confirm revert + toast and observe the in-flight pending labels.

## Self-Check: PASSED

All created/modified files exist on disk; all three task commits (`0b7c936`, `2106d8d`, `b3d03be`) are present in git history.

---
*Phase: 07-ui-ux-copy-accessibility*
*Completed: 2026-07-13*
