---
phase: 7
slug: ui-ux-copy-accessibility
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-13
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

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {N}-01-01 | 01 | 1 | REQ-{XX} | — | N/A | unit / lint / build | `{command}` | ✅ / ❌ W0 | ⬜ pending |

*Populated by the planner against each PLAN.md task. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/errorMessages.test.js` — unit stubs for the central error map (COPY-02, D-05)
- [ ] `src/utils/permissions.test.js` — existing; pattern reference for new util tests

*Existing jest infrastructure (react-scripts) covers component/util testing; no framework install needed.*

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

- [ ] All tasks have `<automated>` verify (lint/build/unit) or a Manual-Only entry above
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`--watch` never in CI commands)
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
