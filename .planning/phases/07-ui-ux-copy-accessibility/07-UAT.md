---
status: testing
phase: 07-ui-ux-copy-accessibility
source:
  - 07-01-SUMMARY.md
  - 07-02-SUMMARY.md
  - 07-03-SUMMARY.md
  - 07-04-SUMMARY.md
  - 07-05-SUMMARY.md
  - 07-06-SUMMARY.md
  - 07-07-SUMMARY.md
  - 07-08-SUMMARY.md
  - 07-09-SUMMARY.md
  - 07-10-SUMMARY.md
  - 07-11-SUMMARY.md
  - 07-12-SUMMARY.md
started: 2026-07-13
updated: 2026-07-13
---

## Current Test

number: 1
name: App loads & brand intact (smoke)
expected: |
  The app loads on the deploy (https://rems-app.vercel.app/ or local `npm start`),
  sign-in works, and the dark near-black + #00ff88 green brand is unchanged — no
  broken layout, no off-brand colors, no visual regressions from the token migration.
awaiting: user response

## Tests

### 1. App loads & brand intact (smoke)
expected: App loads, auth (Google + email/password) works, dark near-black + #00ff88 brand preserved, no broken layout after the ~948-hex token migration.
result: issue-resolved
reported: "Home screen — the dashboard isn't loading, and it says that something went wrong (ErrorBoundary fallback)."
severity: blocker
root_cause: "helpers.js normalizePropertyTypeBucket called .toLowerCase() on a null propertyType (a Firestore property doc had propertyType: null). The `= ''` default param only covers undefined, not null, so HomePage dashboard aggregation threw at HomePage.js:186 → helpers.js:21. PRE-EXISTING bug (helpers.js untouched by Phase 7), unmasked during UAT — not a Phase 7 regression."
fix: "Coerced null → '' in normalizePropertyTypeBucket + normalizeAddressValue (matching normalizeLeadWarmth). Added src/utils/helpers.test.js (5 tests). Commit 202b121; pushed to main. Full suite 63/63, lint clean, build green."
awaiting_reverify: true

### 2. Empty states (first-use / no-results / error)
expected: On a list with no data, a designed first-use empty state appears ("No X yet" + one quiet action). Filter a list to zero matches → a distinct "No matches" state with a quiet "Clear filters" affordance (not identical to first-use). A load failure shows a human error message + recovery, never a raw error code.
result: [pending]

### 3. Skeleton loaders — no layout shift (CLS)
expected: On a slow load (>~400ms; throttle network in devtools), pages (Deals, CRM, Contacts, Properties, Tasks, Documents) show shimmer skeletons that mirror the real layout. When content swaps in, nothing jumps or shifts (no layout shift). Fast loads show no skeleton flash.
result: [pending]

### 4. Home KPIs — instant cache + silent refresh
expected: Revisiting Home renders the KPI tiles instantly from cache (no spinner, no skeleton on a warm cache), then numbers refresh silently in the background if they changed — no visible "refreshing" indicator. Only a true cold/first load (cleared cache) shows a KPI skeleton.
result: [pending]

### 5. Pending states + optimistic toggle rollback
expected: Submit/destructive buttons show a pending state (spinner + present-tense label like "Saving…"/"Deleting…", disabled) while in flight. Toggling a task complete/incomplete or a deal status updates the UI instantly (optimistic). If the write fails (e.g. go offline, then toggle), the control silently reverts to its prior state and an error toast shows a human message + recovery (no raw error, no Retry).
result: [pending]

### 6. Keyboard accessibility (focus ring, focus trap, no color-alone)
expected: Tabbing shows a visible brand-green focus ring on buttons/links/inputs/nav (never off-brand blue, never missing). Opening a modal (e.g. a delete confirmation) moves focus into it, Tab/Shift+Tab cycles within the modal, Escape closes it, and focus returns to the trigger. Status shown by color (active/complete/error) always also carries a text label or icon — never color alone.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0

## Gaps

[none yet]
