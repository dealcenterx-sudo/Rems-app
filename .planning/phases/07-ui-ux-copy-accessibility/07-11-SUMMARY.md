---
phase: 07-ui-ux-copy-accessibility
plan: 11
subsystem: ui-tokens
tags: [ui-05, tokens, css, pass-1, byte-identical, cluster-b]
status: complete
requires:
  - "07-02 (Pass-1 exact-match tokens: --white, --text-muted-2, --skeleton-highlight, gray ramp, --danger-alt)"
  - "07-10 (cluster-A sweep + the SVG-attribute/chart-color pitfall precedent)"
provides:
  - "Byte-identical tokenization of the remaining component files (cluster B), completing the component-tree Pass 1"
affects:
  - src/components/CRMDashboard.js
  - src/components/DocumentsPage.js
  - src/components/CRMReportsPage.js
  - src/components/DealFinancialsTab.js
  - src/components/CRMCampaignsPage.js
  - src/components/DealsDashboard.js
  - src/components/CRMLeadDetailPage.js
  - src/components/CRMEmailInboxPage.js
  - src/components/ActiveDealsPage.js
  - src/components/DealPortalPage.js
  - src/components/SettingsPage.js
  - src/components/LoginPage.js
  - src/components/HomePage.js
  - src/components/ContactsPage.js
  - src/components/MyDealsPage.js
  - src/App.js
  - src/components/ActivityLogView.js
  - src/components/ClosedDealsPage.js
  - src/components/ImageUpload.js
  - src/components/Layout.js
  - src/components/Skeleton.js
  - src/components/UserManagement.js
  - src/components/WebsitesPage.js
tech-stack:
  added: []
  patterns:
    - "Skip hex that is the whole value of a JSX presentation attribute (fill=/stroke=/color=\"#..\") — var() does not resolve in SVG attrs"
    - "Skip hex inside color={}/fill={}/stroke={} JSX expression containers (Icon color ternaries) — SVG, var() does not resolve"
    - "Skip hex in `x || '#hex'` fallbacks and in color-map objects whose values feed template-literal alpha-concat (${color}15) — var() cannot be alpha-suffixed"
    - "Skip hex in data-config/data arrays (label:/bg: keys) that feed <Cell fill> or alpha-concat (D-16)"
    - "Convert only hex inside CSS style-object values / composite CSS strings, where a byte-identical :root token exists"
key-files:
  created: []
  modified:
    - src/components/CRMDashboard.js
    - src/components/DocumentsPage.js
    - src/components/CRMReportsPage.js
    - src/components/DealFinancialsTab.js
    - src/components/CRMCampaignsPage.js
    - src/components/DealsDashboard.js
    - src/components/CRMLeadDetailPage.js
    - src/components/CRMEmailInboxPage.js
    - src/components/ActiveDealsPage.js
    - src/components/DealPortalPage.js
    - src/components/SettingsPage.js
    - src/components/LoginPage.js
    - src/components/HomePage.js
    - src/components/ContactsPage.js
    - src/components/MyDealsPage.js
    - src/App.js
    - src/components/ActivityLogView.js
    - src/components/ClosedDealsPage.js
    - src/components/ImageUpload.js
    - src/components/Layout.js
    - src/components/Skeleton.js
    - src/components/UserManagement.js
    - src/components/WebsitesPage.js
decisions:
  - "Byte-identical only (D-17/RC-01): no #ffffff->--text-primary consolidation, no token value changes — deferred to Pass 2 (plan 12)"
  - "Extended the plan-10 sweep with two general guards — color={}/fill={}/stroke={} JSX-expression spans (Icon ternaries) and `|| '#hex'` fallbacks — after finding SVG Icon color ternaries and alpha-concat color maps not covered by the plan-10 JSX-attr guard alone"
  - "MyDealsPage STATUS_COLORS map left raw + documented in code (feeds `${statusColor}15` alpha-concat); Analytics/dashboard chart-data arrays and no-token decoratives stay inline (D-16)"
metrics:
  duration: ~40m
  completed: 2026-07-13
  tasks: 3
  files: 23
  replacements: 324
status_note: complete
requirements: [UI-05]
---

# Phase 7 Plan 11: Token Migration Pass 1, Cluster B Summary

Byte-identical hex→`var(--token)` sweep across the remaining 23 component files (324 replacements), completing the UI-05 Pass-1 component sweep with a provably zero-visual-change diff — every replaced hex equals its token's `:root` value; no token values changed.

## What Was Built

Pass 1 (UI-05) cluster B — every component file carrying byte-identical-mappable raw hex that was not in plan 10 (cluster A) or plan 05 (Loading/ConfirmModal/Toast). Each semantic hex literal in a CSS context was replaced with a token whose `src/App.css` `:root` value is byte-identical. Tokens consumed are the plan-02 exact-match additions plus pre-existing semantic tokens (`--accent`, `--info`, `--warning`, `--danger`, `--danger-alt`, `--white`, `--text-muted-2`, `--skeleton-highlight`, surfaces, `--gray-*` ramp, `--border-strong`, `--accent-strong`, `--text-*`).

- **Task 1** (CRMDashboard, DocumentsPage, CRMReportsPage, DealFinancialsTab, CRMCampaignsPage, DealsDashboard, CRMLeadDetailPage, CRMEmailInboxPage): 174 replacements — commit `018c636`.
- **Task 2** (ActiveDealsPage, DealPortalPage, SettingsPage, LoginPage; DealEditModal had 0 hex): 77 replacements — commit `5ef385a`.
- **Task 3** (HomePage, ContactsPage, MyDealsPage + straggler grep: App.js, ActivityLogView, ClosedDealsPage, ImageUpload, Layout, Skeleton, UserManagement, WebsitesPage): 73 replacements — commit `634a72e`.

### Method (mechanical, diff-reviewable)
A throwaway Python sweep (`/tmp/hexsweep.py`) matched 3/6-digit hex (lookahead excludes 8-digit alpha) and replaced only hex with a byte-identical token, applying five guards: (1) skip JSX presentation attributes (`fill="#.."`/`stroke=`/`color="#.."`); (2) skip `color={}`/`fill={}`/`stroke={}` JSX-expression containers (Icon color ternaries); (3) skip `x || '#hex'` fallbacks; (4) skip data-config/array lines (`label:`/`bg:` keys); (5) skip backtick template literals (alpha-concat / interpolation). MyDealsPage's `STATUS_COLORS` map (no `label:` key, feeds alpha-concat) was handled by hand — only its four genuinely-CSS hex converted, the map left raw and documented.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Extended the sweep guards for SVG Icon color ternaries and alpha-concat color maps**
- **Found during:** Task 3 pre-scan (ContactsPage/DealsPage/CRMPage/MyDealsPage)
- **Issue:** The plan-10 JSX-attr guard (skip `="#.."`) does not cover `<Icon color={cond ? '#00ff88' : '#888888'} />` (quote preceded by `?`/`:`, not `=`) nor bare color-map objects like `STATUS_COLORS = { new: '#ffaa00' }` whose values flow into `` `${statusColor}15` `` alpha-concat. Converting either would produce `var(--token)` inside an SVG attribute or an invalid `var(--token)15` string — a real rendered-color change, violating the byte-identical guarantee.
- **Fix:** Added two general guards to the sweep (JSX `color={}`/`fill={}`/`stroke={}` expression spans, and `|| '#hex'` fallbacks); handled `MyDealsPage.STATUS_COLORS` by hand and added a code comment documenting why it stays raw.
- **Files modified:** src/components/ContactsPage.js, src/components/MyDealsPage.js (plus DealsPage/CRMPage/CRMMessagesPage correctly received 0 conversions)
- **Commit:** 634a72e

## Left Inline (documented, per D-16)

- **SVG presentation attributes / Icon color props:** `fill=`/`stroke=`/`color="#.."` and `color={ternary}` on Icon/`<Check>`/`<Users>`/Recharts — `var()` does not resolve in SVG attribute values (e.g. LoginPage Google-logo `#4285F4`/`#34A853`/`#FBBC05`/`#EA4335`, ContactsPage/DealsPage/CRMPage nav-icon ternaries, CRMMessagesPage `#8a8a8a`).
- **Alpha-concat color sources:** `MyDealsPage.STATUS_COLORS`, `CRMCampaignsPage` status config (`bg:`/`${cfg.color}33`), `DealsDashboard.DEAL_STATUSES`, `HomePage.quickLinks` (`${link.color}15`), `CRMDashboard`/`DealFinancialsTab`/`CRMReportsPage` KPI/segment arrays feeding `<Cell fill>`/gradients.
- **8-digit alpha hex:** `#00ff8844`, `#00ff8815`, `#ffaa0015`, etc. — no byte-identical token; Pass-2 candidates.
- **Non-token decoratives / one-offs:** `#aa00ff`, `#ff6600`, `#ff8800`, `#e0e0e0`, `#ddd`, `#aaa`, `#999`, `#0d0d0d`, `#1a3c2a`, `#0b1710` — no exact `:root` token; Pass-2 candidates.

## Verification

- `npm run lint` — clean (all three tasks)
- `npm run build` — compiled successfully (all three tasks)
- `npm run test:ci` — 9 suites / 58 tests passed (Task 3 gate)
- Diff balance: removed-hex lines equal added-`var()` lines (Task 1 & 2 balanced; Task 3 75/73 = +2 for the MyDealsPage documentation comment) — confirms a pure color-source substitution with no value drift.
- Straggler grep: no byte-identical-mappable raw hex remains in components — only documented decorative/chart one-offs and SVG-attribute hex.

## Threat Flags

None — mechanical CSS color-source substitution; no runtime data boundary touched (T-07-14 mitigated by the byte-identical build/lint/diff gate).

## Self-Check: PASSED
- All 23 modified files exist on disk (confirmed).
- Commits exist: 018c636 (Task 1), 5ef385a (Task 2), 634a72e (Task 3) confirmed in git log.
