---
phase: 07-ui-ux-copy-accessibility
plan: 05
subsystem: shared-ui-primitives
tags: [ui, a11y, copy, tokens, loadingbutton, confirmmodal, toast]
requires:
  - "07-01 (errorMessages.js + toToastString composition path)"
  - "07-02 (Pass-1 byte-identical tokens: --white/--text-muted-2/--skeleton-highlight)"
  - "07-03 (useFocusTrap hook)"
provides:
  - "LoadingButton pendingLabel prop (single pending-state pattern for the phase)"
  - "ConfirmModal focus trap + confirming/pendingLabel pending confirm"
  - "Toast.js tokenized styling + documented error composition path"
  - "D-07 destructive-copy contract verification for all 9 ConfirmModal callers"
affects:
  - "plan 07 (optimistic toggles + pending-button adoption consume these primitives)"
  - "ConfirmModal callers wiring verified pendingLabel strings"
tech-stack:
  added: []
  patterns:
    - "Present-tense pending labels via LoadingButton pendingLabel prop (D-14)"
    - "Focus trap paired with useEscapeKey on modals (D-19)"
    - "Error composition at call site via errorMessages.toToastString (D-13)"
key-files:
  created: []
  modified:
    - src/components/Loading.js
    - src/components/ConfirmModal.js
    - src/components/Toast.js
decisions:
  - "errorMessages.toToastString (already shipped in 07-01) is the single documented Toast error composition path; Toast.error stays string-only (no structured fields) per D-13"
  - "Toast alpha-suffixed backgrounds (#00ff8815 etc.) have no byte-identical token (--accent-soft/--danger-soft use different alpha); left inline + documented, deferred to Pass 2 / plan 12"
  - "ConfirmModal fallback pending label = confirmLabel (callers may override with a present-tense verb via pendingLabel)"
metrics:
  duration: ~12m
  completed: 2026-07-13
  tasks: 3
  files: 3
status: complete
---

# Phase 07 Plan 05: Standardize Shared Interaction Primitives Summary

Standardized the three shared UI primitives (LoadingButton, ConfirmModal, Toast) so the rest of phase 07 can adopt them: LoadingButton gained a present-tense `pendingLabel` prop, ConfirmModal gained `useFocusTrap` + a pending confirm button, and Toast's error composition path was confirmed (`errorMessages.toToastString`) — all three files byte-identically tokenized per RC-01 and excluded from the plans 10/11 token sweep.

## What Was Built

- **Task 1 — LoadingButton (`src/components/Loading.js`)** — Added a `pendingLabel` prop; when `loading`, renders `pendingLabel` (falls back to `'Loading…'`) instead of the hardcoded generic, so callers pass present-tense verbs ("Saving…", "Deleting…"). Byte-identical tokens (RC-01): spinner default `#ffffff`→`var(--white)`, `LoadingSpinner` default `#00ff88`→`var(--accent)`, gap `8px`→`var(--space-2)`. Disabled affordance (opacity 0.6, cursor not-allowed) preserved. Commit `92de537`.
- **Task 2 — ConfirmModal (`src/components/ConfirmModal.js`)** — Added `modalRef` + `useFocusTrap(modalRef, open)` beside the existing `useEscapeKey(onCancel, open)`; the trap now owns initial focus (first control), Tab/Shift+Tab cycling, and focus restore on close (the manual `cancelRef.current?.focus()` effect was removed as subsumed). Added `confirming`/`pendingLabel` props and swapped the plain confirm `<button>` for `<LoadingButton loading={confirming} pendingLabel=…>`; cancel is disabled while confirming. Byte-identical tokens: `#ff3333`→`var(--danger)`, `#1a1a1a`→`var(--skeleton-highlight)`, `#ffffff`→`var(--white)`, `#888888`→`var(--text-muted-2)`. Commit `941f528`.
- **Task 3 — Toast (`src/components/Toast.js`)** — Byte-identical tokens: text `#ffffff`→`var(--white)`, close `#888888`→`var(--text-muted-2)`, borders + icon colors `#00ff88`/`#ff3333`/`#0088ff`→`var(--accent)`/`var(--danger)`/`var(--info)`. The error composition path is `errorMessages.toToastString(err)` (returns `${message} ${recovery}`, leak-safe via `mapError`); `Toast.error(message, duration)` stays string-only per D-13. Commit `9603cf1`.

## Destructive-Confirmation Copy Contract (COPY-03 / D-07)

All 9 current `ConfirmModal` call sites were verified against their actual `onConfirm` handler behavior. Copy is caller-supplied, so plan 07 wires the verified `pendingLabel` (present-tense verb) per site. Current copy is D-07-compliant (no caller describes an outcome the handler does not perform):

| Caller | Handler op | Copy outcome | Verified | Suggested pendingLabel |
|--------|-----------|--------------|----------|------------------------|
| `ContactsPage` `confirmDeleteContact` | `deleteDoc(contacts)` | "can't be undone" | ✓ real delete | `Deleting…` |
| `TasksPage` `confirmDeleteTask` → `handleDelete` | `deleteDoc(tasks)` | "can't be undone" | ✓ real delete | `Deleting…` |
| `PropertiesPage` `confirmDeleteProperty` → `deleteProperty` | `deleteDoc(properties)` | "can't be undone" | ✓ real delete | `Deleting…` |
| `DocumentsPage` `confirmDeleteDocument` → `deleteDocument` | `deleteDoc(documents)` | "can't be undone" | ✓ real delete | `Deleting…` |
| `ActiveDealsPage` `confirmDeleteDeal` | `deleteDoc(deals)` | "can't be undone" | ✓ real delete | `Deleting…` |
| `DealDocumentsTab` `deleteDocument` | `deleteDoc(deal-documents)` | "permanently remove … from the deal" | ✓ real delete | `Deleting…` |
| `DealPartiesTab` `removeParty` | `deleteDoc(deal-parties)` | "removes … revokes portal presence … can't be undone" | ✓ real delete | `Removing…` |
| `CRMLeadDetailPage` `performDeleteActivityEntry` | `updateDoc` (removes entry from lead activity array) | "permanently remove … from the lead's activity log" | ✓ accurate (array element removal is permanent) | `Deleting…` |
| `ActiveDealsPage` `confirmCloseDeal` → `updateDealStatus` | `updateDoc(status:'closed')` | "move to Closed Deals … marked inactive … reopen later" | ✓ correctly NOT phrased as delete | `Closing…` |

Key D-07 note: `confirmCloseDeal` is an `updateDoc` status change (reversible) — its copy correctly says "move to Closed Deals … reopen it later" and must NOT be rewritten to imply deletion. `performDeleteActivityEntry` is an `updateDoc` (array element removal) but the removal is permanent, so "permanently remove" is accurate.

## Deviations from Plan

None — plan executed as written. One expected no-op: Task 3 lists `src/utils/errorMessages.js`, but `toToastString(err)` already shipped in plan 07-01 and satisfies the composition-path requirement, so no edit to that file was needed (it remains the single documented path).

## Known Stubs

None.

## Threat Flags

None. The two register items were mitigated: T-07-06 (error composition uses `errorMessages` curated output only — no raw `err.message` path introduced); T-07-07 (focus trap restores focus on close and pairs with `useEscapeKey`; `useFocusTrap` is TDD-tested in plan 07-03).

## Verification

- `npm run lint` — clean (no errors) after each task
- `npm run build` — green after each task
- `CI=true npm run test:ci` — 8 suites, 55 tests passing (incl. `useFocusTrap.test.js`, `errorMessages.test.js`)
- `grep` gates: `pendingLabel` in Loading.js; `useFocusTrap` + `LoadingButton` in ConfirmModal.js; `toToastString` in errorMessages.js — all present
- Manual (phase verify, deferred to phase verification): ConfirmModal Tab-cycles, Escape-closes, restores focus on close; confirm shows pending when `confirming` passed

## Self-Check: PASSED

- FOUND: src/components/Loading.js (pendingLabel prop, tokens)
- FOUND: src/components/ConfirmModal.js (useFocusTrap, LoadingButton confirm, tokens)
- FOUND: src/components/Toast.js (tokens)
- FOUND commit 92de537 (Task 1)
- FOUND commit 941f528 (Task 2)
- FOUND commit 9603cf1 (Task 3)
