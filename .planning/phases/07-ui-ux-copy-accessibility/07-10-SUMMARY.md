---
phase: 07-ui-ux-copy-accessibility
plan: 10
subsystem: ui-tokens
tags: [ui-05, tokens, css, pass-1, byte-identical]
status: complete
requires:
  - "07-02 (Pass-1 exact-match tokens: --white, --text-muted-2, --skeleton-highlight, gray ramp, --danger-alt)"
provides:
  - "Byte-identical tokenization of the 10 heaviest hex component files (cluster A)"
affects:
  - src/components/PropertiesPage.js
  - src/components/AnalyticsDashboard.js
  - src/components/TasksPage.js
  - src/components/CRMLeadsPage.js
  - src/components/NewDealPage.js
  - src/components/LeadDrawer.js
  - src/components/DealDocumentsTab.js
  - src/components/DealProgressTab.js
  - src/components/DealPartiesTab.js
  - src/components/DealChatTab.js
tech-stack:
  added: []
  patterns:
    - "Skip hex that is the whole value of a JSX attribute (opening quote preceded by '=') — SVG presentation attrs (Recharts fill=/stroke=, Icon color=) do not resolve var()"
    - "Convert hex inside style-object string values (colon-delimited) and composite CSS strings (border/gradient) — var() valid there"
    - "Chart-series data colors that feed <Cell fill={entry.color}> stay raw hex (D-16)"
key-files:
  created: []
  modified:
    - src/components/PropertiesPage.js
    - src/components/AnalyticsDashboard.js
    - src/components/TasksPage.js
    - src/components/CRMLeadsPage.js
    - src/components/NewDealPage.js
    - src/components/LeadDrawer.js
    - src/components/DealDocumentsTab.js
    - src/components/DealProgressTab.js
    - src/components/DealPartiesTab.js
    - src/components/DealChatTab.js
decisions:
  - "Byte-identical only (D-17/RC-01): no #ffffff→--text-primary consolidation, no token value changes — deferred to Pass 2 (plan 12)"
  - "JSX-attribute hex (SVG fill/stroke/Icon color) left inline because var() does not resolve in SVG presentation attributes — zero-rendering-risk by construction"
  - "Alpha-suffixed 8-digit hex (#00ff8815/#00ff8820/#0088ff20/#ffaa0015) left inline — no byte-identical token; Pass-2 candidates"
metrics:
  duration: ~35m
  completed: 2026-07-13
  tasks: 2
  files: 10
  replacements: 624
status_note: complete
---

# Phase 7 Plan 10: Token Migration Pass 1, Cluster A Summary

Byte-identical hex→`var(--token)` sweep across the 10 heaviest hex component files (624 replacements), producing a zero-visual-change diff by construction — every replaced hex equals its token's `:root` value; no token values changed.

## What Was Built

Pass 1 (UI-05) component sweep of cluster A. Each semantic hex literal was replaced with a token whose `src/App.css` `:root` value is byte-identical (3-digit shorthand expands by char-doubling to the same computed color). Tokens consumed were those defined in plan 07-02 plus pre-existing semantic tokens:

| Hex | Token | Hex | Token |
|-----|-------|-----|-------|
| `#00ff88` | `--accent` | `#ffffff`/`#fff` | `--white` |
| `#0088ff` | `--info` | `#888888`/`#888` | `--text-muted-2` |
| `#0f0f0f` | `--surface-2` | `#1a1a1a` | `--skeleton-highlight` |
| `#0a0a0a` | `--surface-1` | `#111`/`#333`/`#444`/`#555`/`#666666` | gray ramp `--gray-*` |
| `#ffaa00` | `--warning` | `#ff4444` | `--danger-alt` |
| `#000000`/`#000` | `--surface-0` | `#2a2a2a` | `--border-strong` |
| `#ff3333` | `--danger` | `#00cc6a` | `--accent-strong` |

**Task 1** (Properties/Analytics/Tasks/CRMLeads/NewDeal): 403 net replacements — commit `9f227c7`.
**Task 2** (LeadDrawer + 4 deal-portal tabs): 221 replacements — commit `a5becd0`.

### Method (mechanical, diff-reviewable)
A throwaway Python sweep matched 3/6-digit hex (lookahead excludes 8-digit alpha), skipped any hex that is the entire value of a JSX attribute (opening quote preceded by `=`), and replaced only colon-delimited style-object values and composite CSS strings where a byte-identical token existed. This automatically protected all Recharts `fill=`/`stroke=` SVG presentation attributes and SVG Icon `color=` props (where `var()` does not resolve) across every file, with no hand-editing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reverted chart-series data colors in AnalyticsDashboard**
- **Found during:** Task 1 diff review
- **Issue:** The sweep converted the `color:` values in the `dealStatusData`/`propertyStatusData` object arrays (colon-delimited, so not caught by the JSX-attr guard). These values flow into Recharts `<Cell fill={entry.color}>` — an SVG presentation attribute where `var()` does not resolve, which would have silently changed the pie-chart colors (a visual change, violating the byte-identical guarantee).
- **Fix:** Reverted those 6 values to raw hex (`#ffaa00`/`#00ff88`/`#0088ff`/`#00ff88`/`#ffaa00`/`#ff3333`) and added a code comment marking them as intentional chart-series colors (D-16).
- **Files modified:** src/components/AnalyticsDashboard.js
- **Commit:** 9f227c7

## Left Inline (documented, per D-16)

- **SVG presentation attributes:** Recharts `stroke=`/`fill=` (axis/grid/line/bar/pie) and SVG Icon `color=` props — `var()` does not resolve in SVG attribute values; converting would break rendering.
- **Chart-series data colors:** `dealStatusData`/`propertyStatusData` (feed `<Cell fill>`).
- **Alpha-suffixed 8-digit hex:** `#00ff8815`, `#00ff8820`, `#0088ff20`, `#0088ff15`, `#ffaa0015` — no byte-identical token; string-concat/soft-token handling deferred to Pass 2.
- **Non-token decoratives / one-offs:** `#aa00ff`, `#8884d8`, `#ff0088`, `#ff8800`, `#331111`, `#151515`, `#1e1e1e`, `#0d0d0d`, `#050505`, `#00cc66`, `#e0e0e0`, `#ccc`, `#ddd`, `#aaa`, `#999` — no exact `:root` token; Pass-2 candidates.

## Verification

- `npm run lint` — clean (both tasks)
- `npm run build` — compiled successfully (both tasks)
- Diff balance: removed-hex lines equal added-`var()` lines (Task 1 282/282 + 2 doc-comment lines; Task 2 152/152) — confirms a pure color-source substitution with no value drift.

## Self-Check: PASSED
- Files modified exist: all 10 confirmed on disk.
- Commits exist: 9f227c7 (Task 1), a5becd0 (Task 2) confirmed in git log.
