---
phase: 07
plan: 12
subsystem: ui-ux-copy-accessibility
tags: [a11y, wcag, focus-ring, contrast, eslint, jsx-a11y, tokens, changelog]
requires:
  - "07-08/07-09: all 251 jsx-a11y/recommended violations cleared (precondition for atomic flip)"
  - "07-10/07-11: Pass-1 byte-identical hex→token migration (RC-01, D-17)"
  - "07-03: Skeleton primitive + --skeleton-highlight token (RC-02 target)"
provides:
  - "WCAG 2.2 AA text contrast at token level (--text-faint #7f7f7f)"
  - "Single unified brand-green --focus-ring (rgba(0,255,136,0.45)) driving all :focus-visible"
  - "jsx-a11y/recommended enforced at error level with green full-src lint (CI a11y gate)"
  - "Phase 7 changelog entry (AUDIT-03)"
affects:
  - src/App.css
  - package.json
  - docs/SAAS_UPGRADE_CHANGELOG.md
tech-stack:
  added: []
  patterns:
    - "Token-level contrast/focus fixes propagate app-wide (D-18)"
    - "Pass-2 value changes committed separately from Pass-1 (D-17)"
    - "Atomic lint-rule flip: violations cleared first, rule enabled green in one commit"
key-files:
  created: []
  modified:
    - src/App.css
    - package.json
    - docs/SAAS_UPGRADE_CHANGELOG.md
decisions:
  - "Kept the first :root --focus-ring definition (L86) as the single source; deleted the duplicate + --shadow-focus from the second :root block, preserving its legitimate --surface-3/--radius-lg/--radius-md/--shadow-soft overrides"
  - "Two pre-existing hardcoded green :focus-visible box-shadows (.btn-* group, form-field group) left as-is — they are not --shadow-focus consumers and retain visible indicators; unifying them onto --focus-ring is out of scope for this plan"
metrics:
  duration: ~9m
  completed: 2026-07-13
status: complete
---

# Phase 7 Plan 12: Token Pass 2 + Atomic jsx-a11y Flip Summary

Landed the value-changing half of the token work (WCAG-AA text contrast + a single brand-green focus ring at the token level) and the atomic `jsx-a11y/recommended` error-level flip with a green full-src lint, then recorded the Phase 7 changelog — the phase capstone leaving `main` shippable with an enforced a11y gate.

## What Was Built

**Task 1 — Token Pass 2 (App.css), separate commit (D-17):**
- `--text-faint` `#757575` → `#7f7f7f` (~4.6:1 on `--surface-3`; the only text tier failing AA 4.5:1 for normal text).
- Focus-ring reconciliation (T-07-15): collapsed the duplicate `--focus-ring` (second `:root` block) into the single first-`:root` definition, set to `rgba(0, 255, 136, 0.45)` (≥3:1 non-text); **deleted `--shadow-focus`** (off-brand blue) and repointed its consuming global `:focus-visible` block to `var(--focus-ring)`. The indicator is now brand-green everywhere; no `:focus-visible` selector is left without a visible ring.
- RC-02: `.skeleton` base reconciled from raw `#0a0a0a`/`#1a1a1a` to `var(--surface-2)`/`var(--skeleton-highlight)` to match the Skeleton primitive.

**Task 2 — Atomic jsx-a11y flip (package.json):**
- Added `plugin:jsx-a11y/recommended` to `eslintConfig.extends` at error level. Green immediately across full `src/` because plans 07-08/07-09 had already cleared all 251 violations. No npm install (plugin present transitively). CI a11y gate now permanent.

**Task 3 — Phase 7 changelog (AUDIT-03):**
- Appended a full Phase 7 entry (what/why/files/commands/results/risks) covering the whole phase, plus the manual-only UAT items (CLS, focus trap, focus-ring color, color-alone, optimistic revert) recorded for `/gsd-verify-work`.

## Verification Results

- `npm run build` — green (a11y rule enforced)
- `npm run lint` — green across full `src/` with `plugin:jsx-a11y/recommended` at error (atomic-flip proof)
- `npm run test:ci` — green (9 suites, 58 tests)
- `grep -c -- '--shadow-focus' src/App.css` → `0`
- `grep "0, 255, 136, 0.45" src/App.css` → present
- Single `--focus-ring:` definition remains (L86)

## Deviations from Plan

None — plan executed exactly as written. All three tasks committed individually; grep/build/lint/test gates passed on the first pass.

## Threat Mitigations Applied

- **T-07-15 (a11y/security affordance):** `--shadow-focus` deleted with zero remaining references; every consuming `:focus-visible` selector repointed to the visible green `--focus-ring`. No selector left without a visible indicator.
- **T-07-16 (tampering):** Pass-2 value changes committed separately from Pass-1 (D-17); build/lint/contrast gates bound the change; brand direction preserved.

## Commits

- `0243c96` — fix(07-12): token Pass 2 — WCAG-AA text contrast + brand-green focus ring
- `77fe6d9` — chore(07-12): enable jsx-a11y/recommended at error level (atomic flip)
- `fdeca97` — docs(07-12): record Phase 7 UI/UX & accessibility changelog entry (AUDIT-03)

## Manual-Only Verifications (pending /gsd-verify-work)

Recorded in 07-VALIDATION.md and the changelog: CLS on skeleton→content swap, focus-trap cycle/restore, focus-ring visible + brand-green everywhere, meaning-not-by-color-alone, optimistic toggle revert + error toast.

## Self-Check: PASSED

- FOUND: src/App.css (modified, grep gates green)
- FOUND: package.json (jsx-a11y/recommended present)
- FOUND: docs/SAAS_UPGRADE_CHANGELOG.md (Phase 7 entry present)
- FOUND commit: 0243c96
- FOUND commit: 77fe6d9
- FOUND commit: fdeca97
