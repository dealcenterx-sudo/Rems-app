---
phase: 07-ui-ux-copy-accessibility
plan: 09
subsystem: ui-accessibility
tags: [a11y, jsx-a11y, keyboard, labels, semantic-html, d-20]
requires:
  - "07-07 (optimistic toggles preserved)"
  - "07-08 (cluster-A fix conventions reused verbatim)"
provides:
  - "Zero jsx-a11y/recommended violations in cluster-B files + all stragglers (whole src/ tree now clean)"
  - "Keyboard-reachable deal-portal tabs, modals, secondary pages, and login flow with label/control associations"
affects:
  - "plan 12 (atomic jsx-a11y/recommended enablement in package.json — now unblocked; both clusters clear)"
tech-stack:
  added: []
  patterns:
    - "label htmlFor + control id association (behavior/DOM preserving)"
    - "role=button + tabIndex=0 + onKeyDown(Enter/Space) for click-only interactive divs (aria-pressed on toggle chips/checklist rows)"
    - "role=presentation modal overlay + target-check backdrop close (removes stopPropagation on dialog content)"
    - "managed focus via useRef/useEffect replacing autoFocus (LeadDrawer inline-edit fields)"
    - "collection/display-only labels converted to div (radiogroups, filter-group headers, computed amounts)"
key-files:
  created:
    - ".planning/phases/07-ui-ux-copy-accessibility/07-09-SUMMARY.md"
  modified:
    - "src/components/DealEditModal.js"
    - "src/components/DealProgressTab.js"
    - "src/components/DealChatTab.js"
    - "src/components/DealFinancialsTab.js"
    - "src/components/DealPartiesTab.js"
    - "src/components/DealDocumentsTab.js"
    - "src/components/LeadDrawer.js"
    - "src/components/ConfirmModal.js"
    - "src/components/CRMEmailInboxPage.js"
    - "src/components/DocumentsPage.js"
    - "src/components/ActiveDealsPage.js"
    - "src/components/DealsDashboard.js"
    - "src/components/SettingsPage.js"
    - "src/components/AnalyticsDashboard.js"
    - "src/components/CRMCampaignsPage.js"
    - "src/components/ClosedDealsPage.js"
    - "src/components/HomePage.js"
    - "src/components/LoginPage.js"
decisions:
  - "Backdrop close converted from content-level stopPropagation to overlay-level target-check (e.target === e.currentTarget) — lets the dialog content drop its interaction handler entirely, clearing no-noninteractive-element-interactions while preserving exact click-to-close behavior"
  - "ConfirmModal: kept plan-05 role=dialog/aria-modal/focus-trap/LoadingButton structure intact; only the overlay gained role=presentation + target-check and the content shed its stopPropagation onClick"
  - "Display-only labels (DealFinancialsTab computed Buyer/Seller Agent Amount) and collection labels (login radiogroup, analytics date-range header, deal-chat roles group) converted to div rather than force-associated — they label a value or a group, not a single control"
  - "LeadDrawer inline-edit autoFocus replaced with a single editRef + useEffect keyed on editing, attached to whichever of select/input renders"
  - "Straggler files (AnalyticsDashboard, CRMCampaignsPage, ClosedDealsPage, HomePage, LoginPage) discovered by the full-src scan were added to this plan's edits per Task 2 instructions"
metrics:
  duration: "~15m"
  completed: 2026-07-13
status: complete
---

# Phase 07 Plan 09: Keyboard/Semantic a11y Fixes (Cluster B) Summary

Cleared all 117 remaining `jsx-a11y/recommended` violations across the 13 declared cluster-B files plus 5 straggler files the full-src scan surfaced — driving the whole `src/` tree to zero jsx-a11y violations (combined with plan 08's cluster A) using the exact label/keyboard/semantic conventions established in plan 08, with zero behavior or visual change.

## What Was Built

### Task 1 — Deal-portal tabs + modals (8 files) — commit `2d6678a`
- **label-has-associated-control:** Added `htmlFor` + matching `id` to every form field in DealEditModal (property address, contract/close dates, purchase/offer price, commission %, split %), DealChatTab (channel name/description), DealDocumentsTab (file/name/category/notes), DealFinancialsTab (loan type, select-lender, note-to-lender), DealPartiesTab (role/name/email/phone/company), DealProgressTab (label/phase/description).
- **click-events-have-key-events + no-static-element-interactions:** Added `role="button"`, `tabIndex={0}`, and `onKeyDown` (Enter/Space) to the DealChatTab channel-list rows and the DealProgressTab checklist rows (standard + custom), with `aria-pressed` reflecting completion state on the toggle rows.
- **Modal overlays:** Marked overlays `role="presentation"` and converted backdrop close from content `stopPropagation` to overlay `target-check` (`e.target === e.currentTarget`) across DealEditModal, DealChatTab, DealDocumentsTab, DealFinancialsTab, DealPartiesTab, DealProgressTab — the dialog content div no longer carries an interaction handler.
- **ConfirmModal:** Overlay gained `role="presentation"` + target-check; content shed its `stopPropagation` onClick. Plan-05 `role="dialog"`/`aria-modal`/focus-trap/`LoadingButton` structure untouched.
- **no-autofocus:** LeadDrawer inline-edit `autoFocus` (select + input) replaced with managed focus (`useRef` + `useEffect` keyed on `editing`); the drawer backdrop gained `role="presentation"`.
- **Collection/display-only labels → div:** DealChatTab "Assign Roles" group header; DealFinancialsTab computed "Buyer/Seller Agent Amount" value labels.

### Task 2 — Secondary pages + straggler sweep (10 files) — commit `8f663c9`
- **label-has-associated-control:** `htmlFor`/`id` associations in CRMEmailInboxPage (to/cc/bcc/subject/body/signature), DocumentsPage upload modal (file/name/category/description/link-to), SettingsPage (display name, email, new/confirm password), ClosedDealsPage (search), LoginPage (email, password).
- **click-events-have-key-events + no-static-element-interactions:** `role="button"` + `tabIndex` + `onKeyDown` on CRMEmailInboxPage email rows, DocumentsPage/ActiveDealsPage/AnalyticsDashboard filter chips (with `aria-pressed`), ActiveDealsPage deal cards, DealsDashboard deal cards + table rows, ClosedDealsPage table rows, HomePage quick-link cards.
- **Modal overlays/backdrops:** `role="presentation"` + target-check on CRMEmailInboxPage compose modal (preserving the `!sending` guard), DocumentsPage upload modal, ActiveDealsPage detail modal, CRMCampaignsPage backdrop.
- **Collection labels → div:** LoginPage signup radiogroup header (radiogroup already has `aria-label`), AnalyticsDashboard "Date Range" filter-group header.
- **Straggler files added per Task 2 instructions:** AnalyticsDashboard, CRMCampaignsPage, ClosedDealsPage, HomePage, LoginPage (the ≤3-violation files outside cluster A the full-src scan revealed).

## D-20 (never color alone)

Status/completion cues in the touched files already pair color with a non-color signal — DealProgressTab checklist rows show a `✓` glyph + line-through on completion; ActiveDealsPage/ClosedDealsPage status badges render `getStatusLabel(...)` text; LoginPage role selection uses a filled radio dot + selected border. No status was conveyed by color alone, so no new cues were required. No color/hex values were changed (token sweep remains plans 10/11).

## Verification

- **Full-src scoped jsx-a11y run:** ZERO violations (was 117 across 18 files). Repro: `printf '{ "root": true, "extends": ["react-app", "plugin:jsx-a11y/recommended"] }' > .a11y-eslintrc.json; npx eslint --no-eslintrc --resolve-plugins-relative-to . -c .a11y-eslintrc.json --ext .js src; rm .a11y-eslintrc.json`
- Combined with plan 08 (cluster A, 134 cleared), the entire `src/` tree is jsx-a11y clean.
- **`npm run lint`** (current global config, rule not yet at error): PASS
- **`npm run build`**: green

## Deviations from Plan

None affecting scope. Per Task 2's explicit instruction, the 5 straggler files surfaced by the full-src scan (AnalyticsDashboard, CRMCampaignsPage, ClosedDealsPage, HomePage, LoginPage) were added to this plan's edits. No architectural changes, no auth gates, no package installs.

## Known Stubs

None.

## Threat Flags

None. T-07-12 (a11y access DoS) is directly mitigated: every click-only handler in cluster B is now keyboard-reachable and the scoped a11y lint proves zero violations across the touched files. No visible-focus indicator was removed (focus-ring work remains scoped to plan 12).

## Notes for Next Plans

- Plan 12 performs the atomic flip of `plugin:jsx-a11y/recommended` to error in `package.json`; both clusters (A in plan 08, B here) are now clear, so that flip lands green.
- Colors/hex were intentionally left untouched (token sweep is plans 10/11); all a11y additions were structural/attribute-only.

## Self-Check: PASSED

All 18 modified source files and the SUMMARY exist on disk; both task commits (`2d6678a`, `8f663c9`) are present in git history.
</content>
</invoke>
