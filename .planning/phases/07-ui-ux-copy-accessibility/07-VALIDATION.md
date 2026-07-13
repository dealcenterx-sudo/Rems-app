---
phase: 7
slug: ui-ux-copy-accessibility
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-13
finalized: 2026-07-13
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest (via react-scripts / CRA) |
| **Config file** | none — `react-scripts test`; ESLint config in `package.json` `eslintConfig` |
| **Quick run command** | `npm run lint` |
| **Full suite command** | `npm run test:ci && npm run lint && npm run build` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint`
- **After every plan wave:** Run `npm run test:ci && npm run lint && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Plan Verification Map

Every task in each plan carries its own `<verify><automated>` block; this table summarizes the
automated gate per plan. Authoritative per-task commands live in the PLAN.md `<verify>` blocks.

| Plan | Wave | Requirements | Automated verify | Wave-0 test co-created | Status |
|------|------|--------------|------------------|-----------------------|--------|
| 07-01 | 1 | COPY-01, COPY-02 | `errorMessages.test.js` (leak-absent) + lint | `src/utils/errorMessages.test.js` | ⬜ pending |
| 07-02 | 1 | UI-05 | `npm run build` + `npm run lint` (byte-identical, additive tokens) | — | ⬜ pending |
| 07-03 | 2 | UI-02, A11Y-02 | `useFocusTrap.test.js` + build/lint | `src/utils/useFocusTrap.test.js` | ⬜ pending |
| 07-04 | 2 | UI-01, COPY-03 | build + lint | — | ⬜ pending |
| 07-05 | 3 | UI-04, COPY-03, A11Y-02 | build + lint (LoadingButton/ConfirmModal/Toast) | — | ⬜ pending |
| 07-06 | 3 | UI-02, UI-03 | build + lint (skeleton wiring + Home SWR) | — | ⬜ pending |
| 07-07 | 4 | UI-04, UI-06, COPY-03 | `TasksPage.test.js` optimistic rollback + build/lint | rollback unit test | ⬜ pending |
| 07-08 | 5 | A11Y-02 | scoped jsx-a11y eslint (cluster) → 0 violations | — | ⬜ pending |
| 07-09 | 5 | A11Y-02 | scoped jsx-a11y eslint (cluster) → 0 violations | — | ⬜ pending |
| 07-10 | 6 | UI-05 | `npm run build` + `npm run lint` + diff review (byte-identical) | — | ⬜ pending |
| 07-11 | 6 | UI-05 | `npm run build` + `npm run lint` + diff review (byte-identical) | — | ⬜ pending |
| 07-12 | 7 | UI-05, A11Y-01, A11Y-03 | full-src `npm run lint` after jsx-a11y flip + build (Pass-2 contrast/focus) | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. `nyquist_compliant: true` — every task carries an automated verify; no 3-consecutive-without-verify gap; no watch-mode flags; perceptual items covered in Manual-Only below.*

---

## Wave 0 Requirements

No separate Wave 0 — the phase's unit tests are **co-created inside their owning tasks** rather than
stubbed up front (existing jest/react-scripts infrastructure needs no install):

- `src/utils/errorMessages.test.js` — created in plan 07-01 (central error map, leak-absent assertion; COPY-02, D-05)
- `src/utils/useFocusTrap.test.js` — created in plan 07-03 (focus-trap cycle/restore; A11Y-02, D-19)
- optimistic-rollback unit test in `src/**/TasksPage.test.js` — created in plan 07-07 (UI-06)
- `src/utils/permissions.test.js` — existing; pattern reference for the new util tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No layout shift (CLS) on skeleton→content swap | UI-02 | Visual/perceptual; not unit-assertable | Load each skeleton page throttled >400ms; confirm content swaps in with no jump |
| Focus trap cycles + restores focus | A11Y-02 | Keyboard interaction across real DOM/portals | Open ConfirmModal + major modals; Tab/Shift+Tab stays within; Escape closes; focus returns to invoker |
| Focus ring visible + brand-green everywhere | A11Y-01 | Perceptual contrast of the indicator | Keyboard-navigate buttons/links/inputs/nav; confirm green ring, never blue, never missing |
| Meaning never by color alone | A11Y-02 | Requires human judgment on each status cue | Inspect status pills/toasts; confirm each color cue has a text/icon pair |
| Optimistic toggle revert + error toast on failure | UI-06 | Requires induced write failure | Simulate offline/denied write; confirm control reverts and error toast shows message+recovery |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (lint/build/unit) or a Manual-Only entry above
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (unit tests co-created in-task; nothing missing)
- [x] No watch-mode flags (`--watch` never in CI commands)
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-13 (verified by gsd-plan-checker — plans satisfy Nyquist)
