# Phase 7: UI/UX, Copy & Accessibility - Pattern Map

**Mapped:** 2026-07-13
**Files analyzed:** 3 new artifacts + 1 new test + ~15 modified surfaces
**Analogs found:** 19 / 19 (every new/modified file has an in-repo analog)

> Every primitive this phase needs already exists in the repo. The work is **extending APIs and wiring consistently**, not building foundations. Two genuinely new artifacts (`<Skeleton>`, `useFocusTrap`) are thin wrappers over existing CSS/patterns. Honor the RC-01/RC-02 clarifications: Pass-1 adds byte-identical tokens `--white: #ffffff`, `--text-muted-2: #888888`, `--skeleton-highlight: #1a1a1a`; skeleton base is `var(--surface-2)`.

---

## File Classification

### New artifacts

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/components/Skeleton.js` | component (presentational primitive) | render-only | `src/components/Loading.js` (export style) + `.skeleton` CSS in `src/App.css` L100-129 | role-match (structure) + exact (CSS source) |
| `src/utils/useFocusTrap.js` | hook | event-driven (keydown/focus) | `src/utils/useEscapeKey.js` | exact (sibling hook, same concern) |
| `src/utils/errorMessages.js` | utility (pure map) | transform (code → object) | `friendlyAuthError` in `src/components/LoginPage.js` L17-41 + `src/utils/permissions.js` (pure-util shape) | exact (generalizes the real function) |
| `src/utils/errorMessages.test.js` | test | unit | `src/utils/permissions.test.js` | exact (same test idiom) |
| copy-standard doc (e.g. `docs/COPY-STANDARD.md`) | doc | n/a | UI-SPEC Copywriting Contract | n/a (net-new doc) |

### Modified surfaces

| Modified File | Role | Data Flow | Analog Branch/Pattern | Match Quality |
|---------------|------|-----------|-----------------------|---------------|
| `src/components/Loading.js` (`LoadingButton`) | component | render-only | self (add prop + token fix, L41-62) | exact |
| `src/components/ConfirmModal.js` | component (modal) | event-driven | self + `useEscapeKey` pairing (L1-25) | exact |
| `src/components/Toast.js` (`error`) | component | event-driven | self (`error` L68-70; call sites compose string) | exact |
| `src/components/PageState.js` (usage, not structure) | component | render-only | `ContactsPage.js` L485-503 (two-variant wiring) | exact |
| `src/components/HomePage.js` (SWR) | component | request-response (cache) | self (`readHomeKpiCache` L14-24) | exact |
| `src/components/TasksPage.js` (`handleToggleComplete`) | component | optimistic-write | `ActiveDealsPage.updateDealStatus` (rollback anchor) | role+flow match |
| `src/components/ActiveDealsPage.js` (`updateDealStatus`) | component | optimistic-write | self (already captures `previousStatus` L105) | exact |
| Page loading/empty branches (Home, Deals/ActiveDealsPage, CRMLeadsPage, ContactsPage, PropertiesPage, TasksPage, DocumentsPage, MyDealsPage) | component | render-only | `ContactsPage.js` L485-503 | exact |
| `src/App.css` `:root` (token add Pass 1 / contrast Pass 2) | config (tokens) | n/a | self L19-81 (`:root`), L100-111 (`.skeleton`) | exact |
| `package.json` `eslintConfig` | config | n/a | self (existing `extends: ["react-app", "react-app/jest"]`) | exact |

---

## Pattern Assignments

### `src/components/Skeleton.js` (NEW — component, render-only)

**Analog A (export/structure):** `src/components/Loading.js` — copy its named-export, inline-`style`, `aria-hidden` decorative pattern. This is the closest structural sibling (a presentational primitive family with composed variants).

Export style to mirror (Loading.js L3-15):
```javascript
export const LoadingSpinner = ({ size = 40, color = '#00ff88' }) => (
  <div
    aria-hidden="true"
    style={{ width: size, height: size, /* ... */ animation: 'spin 0.8s linear infinite' }}
  />
);
```
Follow this for `Skeleton` and its composed shapes (`SkeletonText`, `SkeletonCard`, `SkeletonTableRow`, `SkeletonKpiTile`): named exports, `{ ...props } = {}` destructuring with defaults, `aria-hidden="true"` on the container (UI-SPEC: skeleton is decorative — SR hears the page's existing `aria-live`).

**Analog B (CSS source of truth):** `src/App.css` L100-111 — the existing `.skeleton` rule + `shimmer` keyframe. **Reuse the keyframe; reconcile the base fill per RC-02.**
```css
/* src/App.css L100-111 — EXISTING */
.skeleton {
  background: linear-gradient(90deg, #0a0a0a 25%, #1a1a1a 50%, #0a0a0a 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
  border-radius: 4px;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
```
**RC-02 reconciliation (binding):** the new primitive uses **`var(--surface-2)`** base (`#0f0f0f`) with the **`--skeleton-highlight`** (`#1a1a1a`) sweep, NOT `#0a0a0a`. Target gradient (from UI-SPEC L140):
```
linear-gradient(90deg, var(--surface-2) 25%, var(--skeleton-highlight) 50%, var(--surface-2) 75%)
```
Update the existing `.skeleton` rule to match so the two do not diverge. `--skeleton-highlight: #1a1a1a` is added in Pass 1 (RC-01), so the sweep color is a token, not inline.

**Contract details (UI-SPEC L133-148):** duration `1.2s` linear infinite; border-radius `var(--radius-sm)`/`var(--radius-md)` per shape; each composed shape reserves exact height/width of real content (no CLS, D-10). Under `@media (prefers-reduced-motion: reduce)` render static `--surface-2` fill (note: App.css L4875 global rule already freezes animations — verify the frozen gradient position isn't ugly; consider an explicit static background under the media query).

**Delay-then-show (D-09, 400ms):** standardize a small `useDelayedFlag(loading, 400)` helper (planner's discretion where it lives). Pattern from RESEARCH L151-155:
```javascript
const showSkeleton = useDelayedFlag(loading, 400); // false until loading has been true ≥400ms
return showSkeleton ? <PageSkeleton /> : (loading ? null : <Content/>);
```

---

### `src/utils/useFocusTrap.js` (NEW — hook, event-driven)

**Analog:** `src/utils/useEscapeKey.js` (complete file) — mirror its structure **exactly**: `useEffect` with an `active` guard, add/remove listener in the effect, cleanup in the returned function, JSDoc one-liner, `export default`.
```javascript
// src/utils/useEscapeKey.js — FULL FILE, the template to mirror
import { useEffect } from 'react';

/** Calls onEscape when the Escape key is pressed while active. */
const useEscapeKey = (onEscape, active = true) => {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (event) => {
      if (event.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onEscape, active]);
};

export default useEscapeKey;
```
**`useFocusTrap` contract (D-19, UI-SPEC L206):** signature `useFocusTrap(containerRef, active = true)`. On activate: capture `document.activeElement` (the invoker), focus the first tabbable element inside `containerRef`. On Tab/Shift+Tab keydown: cycle within the container (wrap first↔last). On deactivate/unmount cleanup: restore focus to the captured invoker. No new dependency — query tabbables via `container.querySelectorAll` of focusable selectors. Same `active`-guard + `return undefined` early-exit + listener-cleanup discipline as the analog.

**Test analog:** `src/utils/permissions.test.js` (idiom below) — but this one uses RTL for DOM/focus assertions. Location `src/utils/useFocusTrap.test.js` (RESEARCH Wave 0). Cover: cycles Tab/Shift+Tab, restores focus on close.

---

### `src/utils/errorMessages.js` (NEW — utility, transform)

**Analog:** `friendlyAuthError` in `src/components/LoginPage.js` L17-41 — this is the exact function to **generalize and lift out**.
```javascript
// src/components/LoginPage.js L16-41 — the pattern to generalize
// Raw Firebase codes read like stack traces; show people something they can act on.
const friendlyAuthError = (err) => {
  const code = err?.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Incorrect email or password. Please try again.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Try signing in instead.';
  }
  // ... 5 more auth/* codes ...
  return err?.message || 'Something went wrong. Please try again.'; // ← LEAKS err.message
};
```
**Generalize per D-05 / UI-SPEC L108-112:**
- Shape: export a map/function `mapError(err) → { message, recovery }` (not a bare string). `message` = one plain sentence naming the problem (no codes, no stack, no security detail). `recovery` = one imperative next step.
- **Security fix (SECURITY domain, V5/V7):** the fallback MUST NOT return `err?.message`. Replace with a safe generic, e.g. `{ message: 'Something went wrong.', recovery: 'Please try again.' }`. This is the one behavioral change from the analog.
- Migrate the 7 `auth/*` codes above, plus the Firestore/API codes the live flows surface (`permission-denied`, `unavailable`, `not-found`, `deadline-exceeded`, etc. — Claude's discretion, cover what flows actually surface).
- After creating it, repoint `LoginPage.js` to consume it (keep the auth flow working — CLAUDE.md critical rule).

**Pure-util + named-export convention:** follow `src/utils/permissions.js` (arrow fns, named `export const`, JSDoc on exported fns) per CONVENTIONS.md.

**Test analog:** `src/utils/permissions.test.js` L1-36 — same `describe`/`it`/`expect` idiom, no Firebase SDK in the test:
```javascript
// src/utils/permissions.test.js L14-35 — test idiom to copy
describe('canUserAccess', () => {
  it('admin can access any resource', () => {
    expect(canUserAccess(admin, { userId: 'someone-else' })).toBe(true);
  });
  it('denies on missing user or resource', () => {
    expect(canUserAccess(null, { userId: 'agent-1' })).toBe(false);
  });
});
```
For `errorMessages.test.js` (COPY-02): assert known codes return `{message, recovery}` with a non-empty recovery; assert **unknown code returns the safe generic and never echoes `err.message`** (feed an err with a distinctive `.message` and assert it is absent from output).

---

### `src/components/Loading.js` — `LoadingButton` (MODIFY — component)

**Analog:** self, L41-62. Add a pending-label prop and fix hex → tokens.
```javascript
// src/components/Loading.js L41-62 — CURRENT
export const LoadingButton = ({ loading, children, ...props }) => {
  const { style, ...restProps } = props;
  return (
    <button {...restProps} disabled={loading || props.disabled} style={{ /* ... */ gap: '8px' }}>
      {loading && <LoadingSpinner size={16} color={style?.color || '#ffffff'} />}
      {loading ? 'Loading...' : children}   {/* ← generic label, D-14 fail */}
    </button>
  );
};
```
**Changes (D-14/D-15, UI-SPEC L150-159):**
- Add prop `pendingLabel` (or `loadingLabel`): `{loading ? (pendingLabel || 'Loading…') : children}` — callers pass present-tense verbs ("Saving…", "Deleting…", "Sending…").
- Token fix: spinner `color={style?.color || '#ffffff'}` → `var(--text-primary)` (per UI-SPEC L158); gap `'8px'` → `var(--space-2)`.
- `LoadingSpinner` default `color = '#00ff88'` (L3) → `var(--accent)`.
- Note: these hex fixes are **Pass-1-adjacent** but D-15's `#ffffff → --text-primary` (`#f1f1f1`) is a **value change** → per RC-01 it belongs to Pass 2, OR use the new `--white` token in Pass 1 if byte-identical is required for this button. Planner decides; do not silently change the pixel in Pass 1.

---

### `src/components/ConfirmModal.js` (MODIFY — modal)

**Analog:** self (L1-25) — it already pairs `useEscapeKey` and focuses cancel on open. Add `useFocusTrap` alongside, and swap the confirm button to `LoadingButton`.
```javascript
// src/components/ConfirmModal.js L1-25 — CURRENT (the pattern to extend)
import React, { useEffect, useId, useRef } from 'react';
import useEscapeKey from '../utils/useEscapeKey';
// ...
const cancelRef = useRef(null);
useEscapeKey(onCancel, open);            // ← already here
useEffect(() => { if (open) cancelRef.current?.focus(); }, [open]);  // ← replace/augment with trap
```
**Changes (D-19/D-14, RESEARCH L330):**
- Add a `modalRef` on `.modal-content`; call `useFocusTrap(modalRef, open)` right next to the existing `useEscapeKey(onCancel, open)`. The trap subsumes the manual `cancelRef.current?.focus()` (or keep initial-focus but let the trap handle cycling + restore).
- Add a `loading`/`confirming` prop; swap the plain confirm `<button>` (L57-59) to `<LoadingButton loading={confirming} pendingLabel={...}>` so destructive confirms show pending state (D-14).
- Hex → tokens (part of UI-05): `#ff3333`→`var(--danger)`, `#1a1a1a`→`var(--skeleton-highlight)` (or Pass-2 border token), `#ffffff`→`var(--white)` (Pass 1) / `var(--text-primary)` (Pass 2 per RC-01), `#888888`→`var(--text-muted-2)` (Pass 1).

---

### `src/components/Toast.js` — `error` (MODIFY — component)

**Analog:** self, L68-70 (`error`) + call sites. `error(message, duration)` takes a **string only** (L68-70). Per D-13, the `{ message, recovery }` object is composed into a string **at the call site** (RESEARCH L174-175):
```javascript
// src/components/Toast.js L68-70 — error takes a STRING
const error = useCallback((message, duration) => {
  return addToast(message, 'error', duration);
}, [addToast]);
```
**Wiring (no structural Toast change required):** at optimistic-failure call sites, compose `` toast.error(`${message} ${recovery}`) `` from `errorMessages.mapError(e)`. (Optionally `errorMessages.js` exports a `toToastString(err)` helper — planner's discretion; do NOT add structured fields to the Toast API unless needed.)
**Hex → tokens (UI-05):** `#00ff8815`/`#ff333315`/`#0088ff15` (alpha-suffixed — needs `--accent-soft`-style token or separate alpha handling), text `#ffffff`→`var(--white)`, close `#888888`→`var(--text-muted-2)`, borders → `var(--accent)`/`var(--danger)`/`var(--info)`.

---

### Page empty/loading branches (MODIFY — Home, Deals/ActiveDealsPage, CRMLeadsPage, ContactsPage, PropertiesPage, TasksPage, DocumentsPage, MyDealsPage)

**Analog:** `src/components/ContactsPage.js` L485-503 — the canonical two-variant `PageState` wiring (first-use vs no-results) to replicate on the ~6 primary list surfaces (D-02/D-03).
```javascript
// src/components/ContactsPage.js L485-503 — the wiring pattern to copy
{loading ? (
  <div className="loading-container"><div className="loading-spinner" /></div>   // ← replace w/ delayed <Skeleton>
) : contacts.length === 0 ? (
  <PageState icon={Users} eyebrow="Contacts" title="No contacts yet"
    message="Add your first buyer, seller, agent, lender, or investor record." />   // first-use
) : filteredContacts.length === 0 ? (
  <PageState icon={Search} eyebrow="Contacts" title="No contacts match this view"
    message="Try another subtab or adjust your search." />   // no-results (D-03: distinct + clear-filters affordance)
) : (
  <div className="tasks-table">/* content */</div>
)}
```
**Changes:**
- Replace the inline `loading-spinner` branch with the delayed `<Skeleton>` mirroring that page's layout (D-09/D-10, no CLS).
- Add `PageState tone="error"` branch for load failures, sourcing copy from `errorMessages.js` (UI-SPEC L104-106) with a `Try again` action where a retry handler exists.
- `PageState` structure itself is unchanged (D-04) — pages that lack it (`HomePage, DealsPage, CRMLeadsPage, TasksPage, MyDealsPage`) import and add it; pages that have it (`ContactsPage`, `PropertiesPage`, `DocumentsPage`, `ActiveDealsPage`) extend variants.
- `PageState` API for reference (unchanged, `src/components/PageState.js`): `{ tone='empty'|'error'|'warning'|'success', icon, eyebrow, title, message, actions, children }`; renders `<h2 className="page-state-title">` and built-in `aria-live` (`assertive` for error, else `polite`).

---

### `src/components/HomePage.js` — silent SWR (MODIFY — component)

**Analog:** self, L14-35 (`readHomeKpiCache`/`writeHomeKpiCache`). The cache exists; SWR only changes the **discard-when-stale** behavior (D-11).
```javascript
// src/components/HomePage.js L14-24 — CURRENT: discards stale (returns null)
const readHomeKpiCache = (scope) => {
  try {
    const raw = localStorage.getItem(`${HOME_KPI_CACHE_KEY}:${scope}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - parsed.savedAt > HOME_KPI_CACHE_TTL_MS) return null;  // ← discards stale
    return parsed.payload;
  } catch { return null; }
};
```
**Change (D-11/UI-SPEC L148):** render stale cached KPIs **immediately** (return payload even when stale, or add a `{ payload, isStale }` return), then refetch in the background and swap in fresh numbers — **no visible refresh indicator, no skeleton on cached render**. Skeleton KPI tiles only on true cold/no-cache first load. Do not add a new store (locked no-new-dep); extend this localStorage cache in place.

---

### Optimistic toggles (MODIFY — `TasksPage.handleToggleComplete`, `ActiveDealsPage.updateDealStatus`)

**Best analog:** `ActiveDealsPage.updateDealStatus` (L102-139) already captures the rollback anchor (`previousStatus`, L105) and does side effects post-write — model the Tasks handler after it.
```javascript
// src/components/ActiveDealsPage.js L102-139 — CURRENT (rollback anchor already present)
const updateDealStatus = async (dealId, newStatus) => {
  try {
    const currentDeal = deals.find((d) => d.id === dealId);
    const previousStatus = currentDeal?.status;              // ← rollback anchor (L105)
    await updateDoc(doc(db, 'deals', dealId), { status: newStatus, updatedAt: ... });
    // ...seller update, loadDeals(), setSelectedDeal, logActivity, notifyUsers (keep post-confirm)...
  } catch (error) {
    console.error('Error updating deal:', error);
    toast.error('Error updating deal status');              // ← generic; replace via errorMessages
  }
};
```
**Anti-pattern to remove — `TasksPage.handleToggleComplete` (L466-479) reloads from Firestore (opposite of optimistic):**
```javascript
// src/components/TasksPage.js L466-479 — CURRENT (anti-optimistic: awaits then loadData)
const handleToggleComplete = async (task) => {
  try {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await updateDoc(doc(db, 'tasks', task.id), { status: newStatus, completedDate: ..., updatedAt: ... });
    loadData(pageIndex, false);   // ← REMOVE from hot path (anti-optimistic reload)
  } catch (error) {
    toast.error('Failed to update task. Please try again.');   // ← replace via errorMessages
  }
};
```
**Target shape (UI-06/D-12/D-13, RESEARCH L160-172):** optimistic `setState` first → `updateDoc` → on catch, revert `setState` to prior value + `toast.error(\`${message} ${recovery}\`)` from `errorMessages.mapError(e)`. No inline error, no Retry. In `ActiveDealsPage`, keep the existing post-confirm side effects (seller `activelySelling`, `loadDeals`, `setSelectedDeal`, `logActivity`, `notifyUsers`); only `status` reflects optimistically. Verify destructive copy separately (`TasksPage.handleDelete` L481 is a true `deleteDoc`; deal "close" is `updateDoc status` — D-07).

---

### `src/App.css` `:root` (MODIFY — config, two passes)

**Analog:** self, L19-81 (existing `:root` token block) — add tokens in the same style.
**Pass 1 (byte-identical, RC-01 binding):** add exact-match tokens next to L24 and remap all occurrences:
```css
/* Pass 1 additions — byte-identical, NO computed-style change */
--white: #ffffff;              /* 207 occurrences; do NOT use --text-primary #f1f1f1 in Pass 1 */
--text-muted-2: #888888;       /* 180 occurrences; ≠ --text-muted #8a8a8a */
--skeleton-highlight: #1a1a1a; /* 150 occurrences; skeleton sweep + reconciles .skeleton */
```
Also map the values that DO have exact tokens (RESEARCH L300-317): `#00ff88`→`--accent`, `#0088ff`→`--info`, `#0f0f0f`→`--surface-2`, `#0a0a0a`→`--surface-1`, `#ffaa00`→`--warning`, `#000000`/`#000`→`--surface-0`, `#ff3333`→`--danger`, `#2a2a2a`→`--border-strong`, `#8a8a8a`→`--text-muted`. Gray-ramp values lacking tokens (`#111`, `#333`, `#555`, `#444`, `#666666`) get new ramp tokens; decorative/chart (`#aa00ff`, `#ff6600`, `#e0e0e0`) stay inline **but documented** (D-16). Gate: green `npm run build` + `npm run lint` + diff review; every diff line's `:root` value must equal the hex it replaced.

**Pass 2 (contrast/focus, separate commit — D-18/UI-SPEC L171-195):** reconcile the focus-ring bug.
```css
/* CURRENT bug (RESEARCH L246-254) */
/* L73  (:root #1) */  --focus-ring: 0 0 0 3px rgba(0, 255, 136, 0.25);   /* green, LOSES */
/* L4347 (:root #2) */ --focus-ring: 0 0 0 3px rgba(0, 255, 136, 0.18);   /* green, WINS (too faint) */
/* L4351 */            --shadow-focus: 0 0 0 3px rgba(0, 136, 255, 0.25);  /* BLUE */
/* L4494 */            box-shadow: var(--shadow-focus);   /* app's primary focus = BLUE */
```
Fix: collapse to ONE `--focus-ring` (keep a single `:root` definition), delete `--shadow-focus`, repoint L4494 (and any other consumer) to `--focus-ring`, set opacity ≥0.45 for 3:1 non-text contrast (UI-SPEC target `rgba(0, 255, 136, 0.45)`). **Caution (RESEARCH L254):** the L4345 second `:root` block also legitimately defines `--surface-3`, `--radius-lg`, `--radius-md`, `--shadow-soft` — delete only the duplicate `--focus-ring` line and the `--shadow-focus` line, not the block. Also bump `--text-faint` `#757575`→`#7f7f7f` (~4.6:1 on `--surface-3`). Reconcile `.skeleton` base to `var(--surface-2)` here (RC-02) if not already done in Pass 1's token remap.

---

### `package.json` `eslintConfig` (MODIFY — config)

**Analog:** self — existing `eslintConfig` extends `["react-app", "react-app/jest"]` (CRA convention). Add the recommended a11y set:
```json
"eslintConfig": { "extends": ["react-app", "react-app/jest", "plugin:jsx-a11y/recommended"] }
```
`eslint-plugin-jsx-a11y@6.10.2` is **already installed** (transitive via `eslint-config-react-app`) — no `npm install`. **Critical (D-21, RESEARCH L203-207):** enabling this flips **251** net-new violations to errors; CI lint is blocking. Fix all 251 **in the same commit/PR** that adds this line — never enable-then-fix across commits.

---

## Shared Patterns

### Central error mapping (COPY-02 / D-05 / D-13)
**Source:** new `src/utils/errorMessages.js` generalizing `friendlyAuthError` (`LoginPage.js` L17-41).
**Apply to:** every `toast.error(...)` and `PageState tone="error"` — optimistic handlers (`TasksPage`, `ActiveDealsPage`), auth flows (`LoginPage`), page error branches.
**Rule:** compose `` `${message} ${recovery}` `` at the call site; never leak `err.message`.

### Pending state (UI-04 / D-14)
**Source:** `src/components/Loading.js` `LoadingButton` (L41-62) + new `pendingLabel` prop.
**Apply to:** every submit/destructive button (including `ConfirmModal` confirm). Present-tense verb labels ("Saving…", "Deleting…", "Sending…").

### Focus + Escape modal a11y (A11Y-02 / D-19/D-20)
**Source:** `src/utils/useEscapeKey.js` (existing) + new `src/utils/useFocusTrap.js`.
**Apply to:** `ConfirmModal` and the major modals (exhaustive per-drawer coverage deferred). Escape-close + initial-focus-on-open + Tab cycle + focus restore.

### Empty-state layout (UI-01 / D-04)
**Source:** `src/components/PageState.js` (existing, structure unchanged) — wired per `ContactsPage.js` L485-503.
**Apply to:** all list/dashboard surfaces incl. buyer/seller shell (`MyDealsPage`). First-use vs no-results distinct on the 6 primary lists (D-02/D-03).

### `var(--token)` inline-style convention (UI-05 / CONVENTIONS.md)
**Source:** `src/App.css :root` (L19-81).
**Apply to:** all edited components — never introduce raw hex or raw-px in new/edited surfaces; use `var(--token)` and `--space-*`. Pass-1 adds tokens byte-identically (RC-01); Pass-2 changes values.

### Never color-alone (D-20)
**Apply to:** any status conveyed by color (accent = active/success, `--danger` = error, `--warning`) — pair with a text label or icon cue (relevant to status pills, success/error toasts, Home KPI emphasis).

---

## No Analog Found

None. Every new/modified file has a concrete in-repo analog. The two "new" primitives are thin wrappers over existing assets:

| File | Why it still has an analog |
|------|---------------------------|
| `src/components/Skeleton.js` | Wraps existing `.skeleton` CSS + `shimmer` keyframe (App.css L100-111); structure mirrors `Loading.js` |
| `src/utils/useFocusTrap.js` | Sibling of `useEscapeKey.js` — identical hook shape, same modal-a11y concern |
| copy-standard doc | Net-new markdown doc, but its content contract is UI-SPEC's Copywriting section — no *code* analog needed |

---

## Metadata

**Analog search scope:** `src/components/` (Loading, PageState, ConfirmModal, Toast, LoginPage, HomePage, TasksPage, ActiveDealsPage, ContactsPage), `src/utils/` (useEscapeKey, permissions, permissions.test), `src/App.css` (`:root`, `.skeleton`, focus block), `package.json`.
**Files scanned:** 13 source files read + grep across `src/**` for cache/PageState usage.
**Binding clarifications honored:** RC-01 (Pass-1 exact tokens `--white`/`--text-muted-2`/`--skeleton-highlight`), RC-02 (skeleton base `--surface-2`).
**Pattern extraction date:** 2026-07-13
</content>
</invoke>
