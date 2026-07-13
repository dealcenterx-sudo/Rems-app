# Phase 7: UI/UX, Copy & Accessibility - Research

**Researched:** 2026-07-13
**Domain:** Front-end polish of an existing React 19 / CRA SPA — measuring the real mechanical surface (a11y lint backlog, hex→token migration, reusable-component APIs, focus/skeleton CSS reality, optimistic call sites) so the planner can scope accurately.
**Confidence:** HIGH — every number below was produced by running tools against this exact codebase in this session.

## Summary

This phase has an already-approved design contract (`07-UI-SPEC.md`) and 21 locked decisions (`07-CONTEXT.md`). The design questions are settled; the open questions are mechanical: *how big is each surface, and what do the reusable primitives actually expose?* This research measured all six.

Headline measured facts: **251** net-new `eslint-plugin-jsx-a11y` violations at recommended-error level (current lint is 100% clean, so all 251 are additive and must be fixed in the same commit that flips the rule). **1,160** hardcoded hex literals across **38** `.js` files — but only ~35% map *byte-identically* to an existing `:root` token; the three largest recurring values (`#ffffff` ×207, `#888888` ×180, `#1a1a1a` ×150) have **no** exact token today, so Pass 1 is mostly *adding* exact-match tokens rather than mapping to existing ones. The focus-ring bug described in the UI-SPEC is confirmed exactly (dual `:root`, faint green loser, blue `--shadow-focus` winner). A `.skeleton` CSS class and `shimmer` keyframe already exist. The optimistic-toggle handlers exist and are pinpointed.

**Primary recommendation:** Plan the token migration as **add-tokens-first** (not map-to-existing), gate Pass 1 on `npm run build` + `npm run lint` green, and treat three UI-SPEC/CONTEXT instructions as Pass-2 value changes (not Pass-1) because they are not byte-identical. Extend three primitives' APIs (`LoadingButton` pending label, `ConfirmModal` loading + focus trap, string-composition for `Toast.error`) rather than assuming they already support the contract.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Empty/loading/skeleton states (UI-01/02) | Browser / Client (React components) | — | Pure presentation; data already fetched in-component |
| Home KPI SWR (UI-03) | Browser / Client (localStorage cache) | — | Existing client-side cache; no server involved |
| Pending buttons / optimistic toggles (UI-04/06) | Browser / Client | Database (Firestore write is the confirm) | UI state is optimistic; Firestore is source of truth on confirm/rollback |
| Error-code → message map (COPY-02) | Browser / Client util | — | Maps Firebase SDK client error codes; no new backend |
| Token / contrast / focus (UI-05, A11Y-01) | Browser / Client (CSS `:root`) | — | Design-token layer in `src/App.css` |
| Focus trap / keyboard / semantic HTML (A11Y-02) | Browser / Client | — | DOM/interaction concern |
| jsx-a11y lint gate (A11Y-03) | Build / CI (ESLint) | — | Static analysis in `package.json` eslintConfig + CI |

Every capability lives in the browser/client tier. No API, serverless, or Firestore-rules change is in scope. This confirms the CONTEXT out-of-scope boundary (no data-model change, no new capability).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Empty-state voice is **minimal & factual**, not marketing-warm — terse copy fitting the enterprise-austere dark brand. No cutesy personality.
- **D-02:** First-use vs no-results are **distinct where it matters** — apply the distinction on the ~6 primary list surfaces (Deals, CRM/Leads, Contacts, Properties, Tasks, Documents). Simpler/secondary surfaces get one generic empty state.
- **D-03:** Keep copy terse/factual, but a **no-results** state offers a quiet **clear-filters** affordance so a filtered-to-zero list never reads identically to a brand-new account. CTAs are understated (single quiet action), never marketing buttons.
- **D-04:** Build empty states on the existing **`PageState`** primitive (`src/components/PageState.js`) — no parallel component.
- **D-05:** Firebase/API error codes → human messages live in **one central util** (`src/utils/errorMessages.js`), mapping `code → { message, recovery }`, reused everywhere. Generalizes the existing `friendlyAuthError` in `LoginPage.js`. Single source of truth, unit-testable.
- **D-06:** Copy sweep targets **high-traffic surfaces first** — Home, Deals, CRM, Contacts, Properties, Tasks, Documents, Settings, auth, confirmation dialogs. Admin-only/rare corners noted for later.
- **D-07:** Destructive-action confirmation copy (COPY-03) must be **verified against actual handler behavior** before rewriting — never describe an outcome the handler doesn't perform.
- **D-08:** Build **one reusable `<Skeleton>` shimmer primitive** (subtle gradient over `--surface-2`/`--surface-3`) plus composed shapes: text-line, card, table-row, KPI tile. No skeleton primitive exists yet (`Loading.js` = spinners only).
- **D-09:** Skeletons use **delay-then-show** — render only if loading exceeds ~300–500ms; sub-threshold loads go straight to content. (UI-SPEC contract value: **400ms**.)
- **D-10:** Skeleton pages: Home, Deals, CRM, Contacts, Properties, Tasks, Documents. Mirror final layout with **no layout shift** (CLS) on swap-in.
- **D-11:** Home KPIs use **silent SWR** — render cached KPIs instantly, refetch in background, swap in when ready, no visible refresh indicator. Extend the existing HomePage localStorage KPI cache (30s TTL); no new store.
- **D-12:** Optimistic updates apply to **toggles only** — task complete/incomplete and task/deal status changes. All other mutations use normal pending→confirm. Inline edits and drag/reorder are NOT optimistic.
- **D-13:** On optimistic-write failure: **silently revert** UI + show an **error toast** with human message + recovery from the central map (D-05) via `Toast`. No inline error, no Retry.
- **D-14:** Pending state standardizes on the existing **`LoadingButton`** pattern: inline spinner + disabled + label switches to present-tense verb ("Saving…", "Deleting…"). Every submit/destructive button.
- **D-15:** While standardizing `LoadingButton`, fix its **hardcoded hex** (`#ffffff`, `#00ff88`) to tokens (part of UI-05 migration). *(See divergence note — this specific mapping is a Pass-2 value change, not Pass-1 byte-identical.)*
- **D-16:** Migration scope is **semantic colors → tokens** — migrate every hex that maps to an existing semantic token; add tokens for recurring values that lack one. Leave truly one-off decorative values (single chart-series color) inline **but documented**. (~1,200 hex across ~30 files.)
- **D-17:** Two-pass discipline with an **exact-equivalent + build/lint gate**: Pass 1 maps each hex only to a byte-identical token (or adds an exact-match token) so computed styles are unchanged by construction; gate on green build + lint + diff review. Pass 2 adjusts token *values* for contrast. Separate commits; no value changes in Pass 1.
- **D-18:** Fix contrast (WCAG 2.2 AA, 4.5:1) and the `#00ff88` focus ring (3:1) **at the token level** in Pass 2. Remove/reconcile the off-brand `--shadow-focus` blue token and the duplicated `--focus-ring` definition in `src/App.css`.
- **D-19:** Build a small reusable **`useFocusTrap`** hook in `src/utils/` (focus first element on open, cycle Tab/Shift+Tab, restore focus on close), pairing with `useEscapeKey`. No new dependency. Apply to `ConfirmModal` and **major** modals; exhaustive per-drawer coverage deferred.
- **D-20:** Ensure Escape-close + initial-focus-on-open on modals, keyboard-reachable interactive elements, semantic HTML on major pages, and **meaning never conveyed by color alone** (add text/icon cues where status is color-coded).
- **D-21:** Enable `eslint-plugin-jsx-a11y` **recommended ruleset at error level** and fix all violations within this phase so CI lint stays green.

### Claude's Discretion
- Exact shimmer timing/easing, skeleton shape composition per page, precise delay threshold within ~300–500ms (UI-SPEC fixes 400ms).
- The full token list added in Pass 1 and the specific contrast-corrected values in Pass 2 (must meet 4.5:1 / 3:1 and preserve brand direction).
- Copy-standard wording specifics (sentence case, verb+object buttons, one term per concept, error format).
- Mobile/responsive behavior of new states (desktop-first, must not break mobile).
- Internal structure of `errorMessages.js` and which Firebase/API codes to map (cover codes the live flows actually surface).

### Deferred Ideas (OUT OF SCOPE)
- Exhaustive per-string copy sweep of admin-only/rare components (high-traffic first — D-06).
- Exhaustive focus-trap/keyboard audit of every modal/drawer/portal tab (ConfirmModal + major modals only — D-19).
- Full token migration of one-off decorative/chart colors (left inline + documented — D-16).
- Visual-regression screenshot tooling (rejected for exact-equivalent + build/lint gate — D-17).
- Retry action inside error toasts (rejected — D-13).
- Landing page, trust page, CSP enforcement — Phase 8.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Every list/dashboard surface (~10+, incl. buyer/seller shell) shows a designed empty state with first-use + no-results variants | `PageState` API measured (props: tone/icon/eyebrow/title/message/actions/children + built-in `aria-live`). Already imported in 5 pages; absent in HomePage, DealsPage, CRMLeadsPage, TasksPage, MyDealsPage (buyer/seller shell). All target pages already have empty branches to wire into. |
| UI-02 | Loads >~500ms show skeletons mirroring final layout; no CLS | Existing `.skeleton`/`.skeleton-card`/`.skeleton-text` CSS classes + `shimmer` keyframe already in App.css (base `#0a0a0a`, highlight `#1a1a1a`). No React `<Skeleton>` primitive yet. reduced-motion already globally handled. |
| UI-03 | Home KPIs render instantly from cache + refresh in background (SWR) | Measured HomePage cache: `HOME_KPI_CACHE_TTL_MS=30_000`, key `rems-home-dashboard-cache-v1:{scope}`, scoped by admin/uid, payload `{stats,tasks}`. Current logic *discards* stale cache — SWR requires rendering stale-then-refetch. |
| UI-04 | Every submit/destructive button shows pending state in flight | `LoadingButton` measured — exists but hardcodes label `'Loading...'` with **no prop to set a present-tense verb** and spinner color `#ffffff`. API extension required. |
| UI-05 | Hardcoded hex migrated to `:root` tokens BEFORE any value change (two passes) | 1,160 hex across 38 files measured; byte-identical-mappable vs needs-new-token vs decorative categorized below. |
| UI-06 | Task/status toggles respond optimistically with rollback on failure | Exact handlers located: `TasksPage.handleToggleComplete` (L466–479, currently reloads from Firestore = anti-optimistic) and `ActiveDealsPage.updateDealStatus` (L102–135, already captures `previousStatus`). |
| COPY-01 | One-page copy standard before any sweep | No standard file exists today; net-new doc. Voice locked in UI-SPEC Copywriting Contract. |
| COPY-02 | Firebase/API error codes → human messages + recovery | `friendlyAuthError` in `LoginPage.js` (L17–41) maps 7 auth codes → **string** (not `{message,recovery}`); generalize into `errorMessages.js`. Fallback currently leaks `err.message` — new map must not. |
| COPY-03 | All labels/helper text/empty states/confirmations follow standard; destructive verified against handler | `ConfirmModal` copy is caller-supplied; handlers measured (e.g. deal status uses `updateDoc`, not delete). Verify each per D-07. |
| A11Y-01 | Text contrast 4.5:1 + `#00ff88` focus ring 3:1 fixed at token level | Focus bug confirmed at exact lines (73, 4345/4347, 4351, 4494). `--text-faint #757575` (~4.0:1) only in App.css, not components. |
| A11Y-02 | Modals trap focus + Escape-close; keyboard reachable; semantic HTML; never color-alone | `useEscapeKey` exists; `ConfirmModal` focuses cancel on open but does **not** trap focus. `useFocusTrap` is net-new. |
| A11Y-03 | jsx-a11y recommended enabled + passing in lint | Plugin 6.10.2 already installed; current lint clean; **251** net-new violations at recommended level, enumerated below. |
</phase_requirements>

## Standard Stack

**No new packages.** This is a locked no-new-dependency phase (`.claude/CLAUDE.md`, PROJECT.md, UI-SPEC Registry Safety). Everything needed already exists in the tree.

| Asset | Version / Location | Purpose | Status |
|-------|-------------------|---------|--------|
| `eslint-plugin-jsx-a11y` | **6.10.2**, in `node_modules` (bundled by `eslint-config-react-app`) | A11Y-03 lint gate | Installed, **not** referenced in `package.json` eslintConfig yet |
| `eslint` | 8.57.1 | Lint runner | Installed |
| `react-scripts` | 5.0.1 | CRA build/lint/test tooling | Installed |
| `PageState` | `src/components/PageState.js` | Empty/error states (UI-01) | Exists; extend usage |
| `LoadingButton` / `LoadingSpinner` / `LoadingOverlay` | `src/components/Loading.js` | Pending state (UI-04) | Exists; **API + token fixes needed** |
| `Toast` / `useToast` | `src/components/Toast.js` | Error/success surfacing (UI-06/COPY) | Exists; `error()` takes a **string** |
| `ConfirmModal` | `src/components/ConfirmModal.js` | Destructive confirms (COPY-03) | Exists; **needs focus trap + loading state** |
| `useEscapeKey` | `src/utils/useEscapeKey.js` | Escape handling | Exists; pairs with new `useFocusTrap` |
| `.skeleton` CSS + `shimmer` keyframe | `src/App.css` L100–124, L108 | Skeleton foundation (UI-02) | **Already exists** — build React primitive on top |

**New files to create (per naming conventions):**
- `src/components/Skeleton.js` — the `<Skeleton>` primitive + composed shapes (D-08)
- `src/utils/useFocusTrap.js` — focus-trap hook (D-19)
- `src/utils/errorMessages.js` — central `code → { message, recovery }` map (D-05)
- `src/utils/errorMessages.test.js` — unit test (COPY-02 is "unit-testable")
- A copy-standard doc (COPY-01) — location is planner's discretion (e.g. `docs/COPY-STANDARD.md`)

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages** (locked no-new-dependency constraint). `eslint-plugin-jsx-a11y@6.10.2` is already present as a transitive dependency of the existing `eslint-config-react-app`; it is only being *enabled*, not added. No `npm install` occurs. No SLOP/SUS surface.

## Architecture Patterns

### System Architecture Diagram

```
User interaction
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│  React component (page)                                       │
│   ├── loading? ──► delay 400ms ──► <Skeleton> (mirrors layout)│  UI-02
│   ├── empty?   ──► <PageState tone="empty|error"/>            │  UI-01
│   └── data     ──► content                                    │
│                                                               │
│  Toggle action (task complete / deal status)                 │
│   ├─► optimistic setState (instant)          ── UI-06 ───┐    │
│   ├─► updateDoc(Firestore)                               │    │
│   └─► catch ─► revert setState ─► Toast.error(msg+recov) ◄┘    │
│                       │                                        │
│  Submit/destructive button ─► <LoadingButton loading>  ── UI-04│
│                                                               │
│  errorMessages.js:  code ──► { message, recovery }  ── COPY-02 │
└───────────────┬───────────────────────────────┬──────────────┘
                │ reads var(--token)             │ writes
                ▼                                ▼
     src/App.css :root tokens            Firestore (source of truth)
     (Pass1: add exact tokens →          (confirm / rollback anchor)
      Pass2: fix contrast/focus)  UI-05, A11Y-01
```

### Pattern 1: Delay-then-show skeleton (D-09, 400ms)
**What:** Only mount the skeleton after a timer; below threshold, render content directly (avoids flash).
**When:** Every skeleton page (Home, Deals, CRM, Contacts, Properties, Tasks, Documents).
**Shape:**
```javascript
// pattern the planner should standardize (e.g. a useDelayedFlag(loading, 400) hook)
const showSkeleton = useDelayedFlag(loading, 400); // false until loading has been true ≥400ms
return showSkeleton ? <PageSkeleton /> : (loading ? null : <Content/>);
```
Note: keep skeleton shapes reserving exact height of real rows (no CLS, D-10).

### Pattern 2: Optimistic toggle with rollback (UI-06/D-12/D-13)
The `ActiveDealsPage.updateDealStatus` handler already captures `previousStatus` (L105) — use it as the rollback anchor. Convert both toggle handlers from "await → reload" to "setState optimistic → updateDoc → catch revert + toast".
```javascript
// TasksPage.handleToggleComplete — target shape
const prev = task.status;
const next = prev === 'completed' ? 'pending' : 'completed';
setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: next } : t)); // optimistic
try {
  await updateDoc(doc(db, 'tasks', task.id), { status: next, completedDate: ..., updatedAt: ... });
} catch (e) {
  setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: prev } : t)); // revert
  const { message, recovery } = mapError(e);
  toast.error(`${message} ${recovery}`);
}
```

### Pattern 3: Central error map surfaced through existing Toast (D-05/D-13)
`Toast.error(message, duration)` accepts a **string only**. The `{ message, recovery }` object must be composed into a string at the call site (e.g. `` `${message} ${recovery}` ``) or `errorMessages.js` should also export a `toToastString(code)` helper. The planner must decide; the Toast API will not carry structured fields without modification.

### Anti-Patterns to Avoid
- **Mapping `#ffffff`→`--text-primary` in Pass 1:** `--text-primary` is `#f1f1f1`, not `#ffffff`. That is a *value change* and belongs in Pass 2 (or add a `--white`/`--text-on-accent` token in Pass 1). Doing it in Pass 1 breaks the byte-identical guarantee (D-17).
- **Reloading from Firestore inside a toggle handler:** the current `handleToggleComplete` calls `loadData()` after the write — that is the opposite of optimistic. Remove the reload from the hot path.
- **Assuming `LoadingButton` shows "Saving…":** it hardcodes `'Loading...'`. Without an API change every button says the same generic word (violates D-14 present-tense verbs).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Empty/error state layout | New empty component | Existing `PageState` (D-04) | Already has icon/eyebrow/title/message/actions + `aria-live` wired |
| Escape-to-close | New key listener per modal | Existing `useEscapeKey` | Already used by ConfirmModal |
| Shimmer animation | New keyframe | Existing `shimmer` keyframe + `.skeleton*` classes (App.css L100–124) | Already present; wrap in a React primitive |
| KPI caching | New store/library (SWR lib, react-query) | Existing localStorage cache in HomePage | Locked no-new-dep; cache already scoped + TTL'd |
| Error-code translation | Per-page string maps | One `errorMessages.js` generalizing `friendlyAuthError` | Single source of truth, unit-testable (D-05) |
| A11y static checks | Manual audit only | `eslint-plugin-jsx-a11y` (already installed) | Deterministic, CI-enforced (A11Y-03) |

**Key insight:** Nearly every primitive this phase needs already exists in the repo. The work is *extending APIs and wiring consistently*, not building foundations. The two genuinely new artifacts are `<Skeleton>` (React wrapper over existing CSS) and `useFocusTrap`.

## Common Pitfalls

### Pitfall 1: Pass-1 token migration silently changes a pixel
**What goes wrong:** Mapping a hex to a "close" token (e.g. `#888888`→`--text-muted #8a8a8a`, or `#ffffff`→`--text-primary #f1f1f1`) alters computed color.
**Why it happens:** The three highest-frequency component hexes are *near* tokens but not equal (see table). It's tempting to "just use the muted token."
**How to avoid:** Enforce byte-identical mapping. For recurring non-matching values, **add a new exact-match token** in Pass 1 (`--white: #ffffff`, and a decision for `#888888` / `#1a1a1a`). Gate on `npm run build` + `npm run lint` + diff review with zero rendered-color change.
**Warning signs:** Any Pass-1 diff line where the token's `:root` value ≠ the hex it replaced.

### Pitfall 2: Flipping jsx-a11y to error breaks CI mid-phase
**What goes wrong:** CI runs lint on every push; 251 violations become hard errors the instant the rule flips.
**Why it happens:** `.github/workflows/ci.yml` lint step is blocking; auto-merge depends on it.
**How to avoid:** Fix all 251 in the **same commit/PR** that enables the rule (D-21). Do not enable-then-fix across commits.
**Warning signs:** A commit that edits `package.json` eslintConfig without touching the 23 affected component files.

### Pitfall 3: LoadingButton pending label is generic
**What goes wrong:** Every button reads "Loading..." — fails the present-tense-verb contract (D-14).
**How to avoid:** Add a prop (e.g. `loadingLabel` / `pendingLabel`) to `LoadingButton`; default could fall back to `'Loading…'` but callers pass `"Saving…"`, `"Deleting…"`, etc.
**Warning signs:** No new prop in `Loading.js` diff.

### Pitfall 4: Destructive confirmation copy describes the wrong outcome
**What goes wrong:** Copy says "permanently deleted" when the handler soft-updates a status (e.g. deal "close" sets `status`, not delete).
**How to avoid:** D-07 — read each handler before writing its confirmation. `updateDealStatus` writes `status`, not `deleteDoc`; `handleDelete` (TasksPage L481) does `deleteDoc`. Different consequences, different copy.

## Runtime State Inventory

Not a rename/refactor/migration phase in the data sense — but UI-05 is a *string-replacement across code*, so the inventory question ("what still holds the old value after files change?") is worth an explicit answer:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no hex/token value is persisted in Firestore, localStorage, or any datastore. The HomePage cache stores `{stats,tasks}` numbers only. | None — verified by reading HomePage cache payload and confirming tokens are CSS-only |
| Live service config | None — no external service references colors/tokens | None |
| OS-registered state | None | None |
| Secrets/env vars | None — no color/token env var | None |
| Build artifacts | `build/` output embeds current hex; regenerated by `npm run build`. jsx-a11y enablement changes lint behavior in CI only. | Rebuild on ship (normal deploy) |

**Nothing found requiring data migration.** The migration is purely source-code (CSS/JS) → verified by grep + reading the cache implementation.

## Code Examples

### Existing `PageState` API (UI-01 foundation) — `src/components/PageState.js`
```javascript
// Props: tone ('empty'|'error'|'warning'|'success'), icon (Component), eyebrow, title, message, actions, children
// Renders <section aria-live={tone==='error'?'assertive':'polite'}> with .page-state* classes.
<PageState tone="empty" icon={DealIcon} title="No deals yet"
  message="Deals you create appear here." actions={<button className="btn-primary">New deal</button>} />
```
Note: `title` is always rendered as `<h2 className="page-state-title">`. For no-results, pass `title="No matches"` + a `Clear filters` action (D-03).

### Existing `friendlyAuthError` to generalize (COPY-02) — `LoginPage.js` L17–41
Maps 7 `auth/*` codes → **string**. Fallback returns `err?.message` (leaks raw message — the new `errorMessages.js` must return a safe generic instead). New shape per D-05: `code → { message, recovery }`.

### Focus-ring reconciliation targets (A11Y-01) — `src/App.css`
```css
/* L73  (:root #1)  */ --focus-ring: 0 0 0 3px rgba(0, 255, 136, 0.25);   /* green, LOSES */
/* L4345 (:root #2) */ :root { --surface-3:#141414; --focus-ring: 0 0 0 3px rgba(0,255,136,0.18); /* green, WINS */
/* L4351            */          --shadow-focus: 0 0 0 3px rgba(0, 136, 255, 0.25); }  /* BLUE */
/* L4494 (global :focus-visible on buttons/links/inputs/nav a/button/input/select/textarea) */
                       box-shadow: var(--shadow-focus);   /* ← app's primary focus = BLUE */
```
Contract (Pass 2): collapse to one `--focus-ring` (keep it in a single `:root`), delete `--shadow-focus`, repoint L4494 (and any other `--shadow-focus` consumer) to `--focus-ring`, bump opacity to ≥0.45 for 3:1. **Caution:** the L4345 `:root` block also legitimately defines `--surface-3`, `--radius-lg`, `--radius-md`, `--shadow-soft` — do not delete the whole block, only the duplicate `--focus-ring` line and the `--shadow-focus` line.

### Existing skeleton CSS (UI-02) — `src/App.css` L100–124
```css
.skeleton { background: linear-gradient(90deg, #0a0a0a 25%, #1a1a1a 50%, #0a0a0a 75%);
            background-size: 200% 100%; animation: shimmer 1.2s infinite; border-radius: 4px; }
@keyframes shimmer { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }
.skeleton-card { height:120px; } .skeleton-text { height:12px; }
```
Divergence: base is `#0a0a0a` (`--surface-1`), UI-SPEC recommends `--surface-2 #0f0f0f`. Planner reconciles (the React `<Skeleton>` can standardize on tokens). `#0a0a0a`/`#1a1a1a` here are also Pass-1 migration targets.

## Measured Surface (the core deliverable of this research)

### 1. jsx-a11y violation surface (A11Y-03) — VERIFIED

- Plugin **already installed** (`eslint-plugin-jsx-a11y@6.10.2`, transitive via `eslint-config-react-app`); **not** yet in `package.json` eslintConfig.
- **Current `npm run lint` is 100% clean** (react-app's bundled a11y subset already passes). Therefore all violations below are **net-new** from enabling `recommended`.
- **Total: 251 violations** across ~23 files.

| Count | Rule (jsx-a11y/…) |
|------:|-------------------|
| 118 | `label-has-associated-control` |
| 65 | `click-events-have-key-events` |
| 64 | `no-static-element-interactions` |
| 3 | `no-autofocus` |
| 1 | `no-noninteractive-element-interactions` |

**Most-affected files (violations):** CRMLeadDetailPage.js 39, PropertiesPage.js 30, NewDealPage.js 24, TasksPage.js 23, CRMEmailInboxPage.js 12, DealEditModal.js 11, DealProgressTab.js 11, DocumentsPage.js 11, CRMLeadsPage.js 10, DealChatTab.js 9, DealFinancialsTab.js 9, DealPartiesTab.js 9, ActiveDealsPage.js 8, ContactsPage.js 8, DealDocumentsTab.js 8, ConfirmModal.js 4, DealsDashboard.js 4, LeadDrawer.js 4, SettingsPage.js 4, plus 3-and-under across the rest.

**Executor command to reproduce/verify** (config in project root so the plugin resolves):
```bash
cat > .a11y-eslintrc.json <<'EOF'
{ "root": true, "extends": ["react-app", "plugin:jsx-a11y/recommended"] }
EOF
npx eslint --no-eslintrc --resolve-plugins-relative-to . -c .a11y-eslintrc.json --ext .js src/ -f json
rm .a11y-eslintrc.json
```
**Interpretation:** 118 `label-has-associated-control` are mostly form fields where `<label>` isn't tied to its control (add `htmlFor`/`id` or wrap). The 65+64 click/static pairs are `onClick` on `<div>`/`<span>` — either convert to `<button>` or add `role` + `onKeyDown` + `tabIndex`. `no-autofocus` (3) and the single noninteractive case are quick. This is a real, bounded ~1–2 wave effort concentrated in the CRM/Deals/Properties/Tasks pages.

### 2. Hex→token migration surface (UI-05) — VERIFIED

- **1,160** hex literals in `src/**/*.js` across **38** files. (Claim was ~1,200 / ~30; count is close, **file count is 38, not 30** — divergence, see below.) App.css itself has 418 more.
- Per-file (top): PropertiesPage 134, AnalyticsDashboard 90, TasksPage 83, CRMLeadsPage 69, NewDealPage 64, LeadDrawer 53, DealDocumentsTab 50, DealProgressTab 48, DealPartiesTab 48, DealChatTab 46, CRMDashboard 43, DocumentsPage 42, CRMReportsPage 42, DealFinancialsTab 40, CRMCampaignsPage 35, DealsDashboard 30, ActiveDealsPage 30, LoginPage 25, CRMLeadDetailPage 24, SettingsPage 22 … (18 more files with ≤16 each).

**Value frequency vs existing tokens** (the scoping-critical breakdown):

| Hex (count) | Exact `:root` token? | Pass-1 disposition |
|-------------|----------------------|--------------------|
| `#00ff88` (134) | `--accent` ✅ | Map to `var(--accent)` |
| `#0088ff` (68) | `--info` ✅ | Map to `var(--info)` |
| `#0f0f0f` (81) | `--surface-2` ✅ | Map |
| `#0a0a0a` (38) | `--surface-1` ✅ | Map |
| `#ffaa00` (38) | `--warning` ✅ | Map |
| `#000000` (20) + `#000` (7) | `--surface-0` ✅ | Map (shorthand computes identically) |
| `#ff3333` (17) | `--danger` ✅ | Map |
| `#2a2a2a` (6) | `--border-strong` ✅ | Map |
| `#8a8a8a` (4) | `--text-muted` ✅ | Map |
| **`#ffffff` (149) + `#fff` (58) = 207** | **none** (≠ `--text-primary #f1f1f1`) | **Add token** (e.g. `--white`/`--text-on-accent`) |
| **`#888888` (137) + `#888` (43) = 180** | **none** (≠ `--text-muted #8a8a8a`) | **Add token** or Pass-2 consolidation decision |
| **`#1a1a1a` (150)** | **none** (between `--surface-3` & `--border-strong`) | **Add token** (UI-SPEC suggests `--skeleton-highlight`; also used by existing `.skeleton`) |
| `#111` (35) | none (≈`#111111`) | Add token or map to nearest w/ decision |
| `#333` (32), `#555` (25), `#444` (7), `#666666` (5) | none (gray ramp) | Add ramp tokens |
| `#ff4444` (10) | none (≠ `--danger-hover #ff4d4d`) | Add token |
| `#aa00ff` (21), `#ff6600` (6), `#ff8800` (2), `#e0e0e0` (2) | none | **Decorative/chart — leave inline + document (D-16)** |

**Scoping headline:** Only ~**413** occurrences (~35%) map byte-identically to an *existing* token. The **majority is dominated by three values with no exact token** (`#ffffff` 207, `#888888` 180, `#1a1a1a` 150 = 537 alone). **Pass 1 is therefore primarily an "add exact-match token" exercise, not a "map to existing token" exercise** — this reframes the CONTEXT/UI-SPEC mental model and is the single most important planning input from this research. The alpha-suffixed variants (`#00ff8815`, `#00ff8820`, `${color}20`) also appear (Toast, selection, LoadingSpinner) and need per-case handling (token + separate alpha, or a dedicated soft token).

### 3. Reusable component APIs — VERIFIED (exact signatures)

| Component | Signature / key facts | Extension needed for this phase |
|-----------|----------------------|--------------------------------|
| `PageState` | `{ tone='empty', icon:Icon, eyebrow, title, message, actions=null, children=null }`. `<section aria-live=...>`, `title` always `<h2>`. | None structurally — apply widely; add `error` tone for load failures (D-05). |
| `LoadingSpinner` | `{ size=40, color='#00ff88' }`. Uses `${color}20` faded ring. `aria-hidden`. | D-15: default `#00ff88`→`var(--accent)`. |
| `LoadingOverlay` | `{ message='Loading...' }`. `role="status" aria-live="polite"`, text at `var(--text-faint)` 14px. | `--text-faint` fails AA at 14px (Pass-2 fix). |
| `LoadingButton` | `{ loading, children, ...props }`. Renders `disabled`, spinner `color={style?.color \|\| '#ffffff'}`, label = **`loading ? 'Loading...' : children`**. | **Add pending-label prop** (D-14 present-tense verbs); `#ffffff`→token (D-15). |
| `Toast` / `useToast` | `useToast()` → `{ success, error, info, addToast, removeToast }`. `error(message:string, duration?)`. Hardcoded hex: bg `#00ff8815`/`#ff333315`/`#0088ff15`, text `#ffffff`, close `#888888`. | `error` takes **string only** → compose `{message,recovery}` at call site (D-13). Hex→token. |
| `ConfirmModal` | `{ open, title, message, confirmLabel='Confirm', cancelLabel='Cancel', danger=true, onConfirm, onCancel }`. Has `role="dialog" aria-modal aria-labelledby/describedby`, focuses cancel on open, `useEscapeKey`. **No focus trap.** Confirm button is a plain `<button>`, **no loading state.** Hardcoded `#ff3333/#1a1a1a/#ffffff/#888888`. | Add `useFocusTrap` (D-19); add a `loading`/`confirming` prop or swap confirm to `LoadingButton` for D-14 pending on destructive confirms; hex→token. |
| `useEscapeKey` | `(onEscape, active=true)`. | Pairs with new `useFocusTrap`. |
| HomePage KPI cache | `HOME_KPI_CACHE_TTL_MS=30_000`; key `rems-home-dashboard-cache-v1:{scope}`; scope via `getHomeScope(isAdmin, uid)`; payload `{stats,tasks}`; `readHomeKpiCache` returns **null when stale** (discards). | SWR (D-11): render stale immediately, then refetch + swap — change the "discard when stale" behavior. |

### 4. Loading/empty branches per page — VERIFIED

`PageState` already imported in: **DocumentsPage, ActiveDealsPage, PropertiesPage, ContactsPage, DealPortalPage**. Not yet in: **HomePage, DealsPage, CRMLeadsPage, TasksPage, MyDealsPage** (MyDealsPage = the buyer/seller client shell). `Loading.js` imported only in DealPortalPage — most pages roll their own inline loading UI.

| Page | loading state | empty branch | PageState | Wiring note |
|------|:---:|:---:|:---:|-------------|
| HomePage | yes | yes | no | KPI SWR + skeleton on cold load; add PageState for empty |
| DealsPage | minimal | none | no | Router/shell → delegates to ActiveDealsPage/ClosedDealsPage/DealsDashboard |
| ActiveDealsPage | yes | yes | yes (2) | Optimistic status handler lives here |
| CRMLeadsPage | yes | yes | no | Add PageState + skeleton |
| ContactsPage | yes | yes | yes (3) | Extend variants (first-use vs no-results) |
| PropertiesPage | yes | yes | yes (3) | Largest hex file too |
| TasksPage | yes | yes | no | Optimistic complete handler here; add PageState |
| DocumentsPage | yes | yes | yes (2) | — |
| MyDealsPage (buyer/seller shell) | yes | yes | no | UI-01 explicitly includes this shell |

All target pages already have a `loading` state var and an empty branch — skeletons/empty states can be wired into existing branches **without restructuring**.

### 5. Focus / shimmer / reduced-motion CSS reality — VERIFIED

- `--focus-ring` defined **twice**: L73 `:root` (green 0.25) and L4347 in a **second `:root` block** (L4345) (green 0.18). Same specificity → **later (0.18) wins**. ✅ matches UI-SPEC.
- `--shadow-focus: rgba(0,136,255,0.25)` **blue** at L4351, consumed by the **global `:focus-visible` block** (L4473–4495) covering `.btn-*`, `.icon-button`, nav/subnav, `a/button/input/select/textarea` → **the app's primary focus indicator renders blue everywhere**. ✅ confirmed the described bug.
- Other `:focus`/`:focus-visible` rules (L2692, 2724, 2729, 2736, 4469) use `var(--focus-ring)` (green faint) — so the codebase currently mixes green-faint and blue focus.
- `shimmer` keyframe **exists** (L108). ✅ `.skeleton`/`.skeleton-card`/`.skeleton-text` classes exist (L100–124). Base uses `#0a0a0a` (not the UI-SPEC's `--surface-2`) — minor divergence to reconcile.
- `@media (prefers-reduced-motion: reduce)` **already exists** (L4875) and globally sets `animation-duration:0.01ms !important` on `*` — so the skeleton shimmer is *already* effectively disabled under reduced motion. The UI-SPEC's "render static fill under reduced motion" is largely satisfied by this global rule; the new `<Skeleton>` inherits it. Verify the frozen `background-position` doesn't leave an odd gradient (may want an explicit static background under the media query).

### 6. Optimistic-toggle call sites (UI-06) — VERIFIED

- **`TasksPage.handleToggleComplete`** — `src/components/TasksPage.js` **L466–479** (invoked at L960 `onClick={() => handleToggleComplete(task)}`). Currently: `await updateDoc(...)` then `loadData(pageIndex,false)` — **reloads from Firestore (anti-optimistic)**. Already has `try/catch` + `toast.error('Failed to update task…')`.
- **`ActiveDealsPage.updateDealStatus`** — `src/components/ActiveDealsPage.js` **L102–135+**. Already captures `const previousStatus = currentDeal?.status` (L105) — ready-made rollback anchor. Also performs side effects after the write (seller `activelySelling`, `loadDeals()`, `setSelectedDeal`, `logActivity`, `notifyUsers`) — keep these post-confirm; only the `status` should reflect optimistically.
- Related destructive (NOT optimistic, but copy-verify per D-07): `TasksPage.handleDelete` L481 uses `deleteDoc` (true delete); deal "close" uses `updateDoc status` (not delete). Confirmation copy must match.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Blue focus ring via `--shadow-focus` | Brand-green `--focus-ring` at ≥3:1 | On-brand, WCAG 2.2 AA non-text contrast (A11Y-01) |
| Generic "Loading..." pending label | Present-tense verb via new `LoadingButton` prop | Enterprise polish (D-14) |
| Toggle: await write → reload | Optimistic setState → write → rollback on catch | Instant feel (UI-06) |
| Per-page `toast.error('Failed…')` strings | Central `errorMessages.js` `{message,recovery}` | Consistency + testability (COPY-02) |
| Discard stale KPI cache | SWR: render stale, refetch, swap | Instant Home (UI-03) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | *(none)* | — | All findings in this research were produced by running tools (`eslint`, `grep`, reading source) against the live codebase this session. No `[ASSUMED]` claims. |

## Open Questions

> **RESOLVED (2026-07-13)** — all three questions below were decided by the user during planning and recorded in `07-CONTEXT.md` `<research_clarifications>` **RC-01** (exact-token additions `--white`/`--text-muted-2`/`--skeleton-highlight` in Pass 1; consolidation/recolor deferred to Pass 2) and **RC-02** (skeleton base = `--surface-2`). The plans implement these resolutions (RC-01 → plan 07-02/07-10/07-11; RC-02 → plan 07-03/07-12). The "Recommendation" lines below are retained for audit context.

1. **How to reconcile `#888888` (180 uses) — add a token or consolidate to `--text-muted`?**
   - Known: `#888888` ≠ `--text-muted #8a8a8a` (byte-identical rule forbids Pass-1 mapping).
   - Unclear: whether the ~2-unit difference is intentional or drift.
   - Recommendation: Pass 1 add an exact `--text-muted-2: #888888` (or `--text-3`) to stay byte-identical; consider consolidating to `--text-muted` in Pass 2 as an explicit value decision.

2. **`#ffffff`/`#fff` (207 uses) target token name.**
   - D-15 says map LoadingButton `#ffffff`→`--text-primary`, but that changes `#ffffff`→`#f1f1f1` (a value change).
   - Recommendation: Pass 1 add `--white: #ffffff` (or `--text-on-accent`) for byte-identical migration; make the `#ffffff`→`#f1f1f1` decision (if desired) an explicit Pass-2 change. **Flag to user** — this is a locked-decision (D-15) that contradicts the Pass-1 byte-identical rule (D-17).

3. **Skeleton base color: existing `.skeleton` uses `#0a0a0a`, UI-SPEC recommends `--surface-2 #0f0f0f`.**
   - Recommendation: standardize the new `<Skeleton>` on `var(--surface-2)` per UI-SPEC; update `.skeleton` in the same Pass-2 visual change (or keep both and document).

## Environment Availability

Purely code/config changes; no external runtime dependency. The only tooling touched (`eslint`, `eslint-plugin-jsx-a11y@6.10.2`, `react-scripts@5.0.1`) is already installed and verified this session. **No missing dependencies.**

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest via `react-scripts@5.0.1` + `@testing-library/react@16.3.1` |
| Config file | none (CRA-managed); eslint in `package.json` |
| Quick run command | `npx react-scripts test --watchAll=false <file>` |
| Full suite command | `npm run test:ci` |
| Lint gate | `npm run lint` |
| Build gate | `npm run build` |

Existing tests: `utils/permissions.test.js`, `utils/observability.test.js`, `utils/notifications.test.js`, `components/ErrorBoundary.test.js`, `components/roleNav.test.js`, `components/AnalyticsDashboard.test.js`.

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Command | Exists? |
|-----|----------|-----------|---------|---------|
| COPY-02 | `errorMessages.js` maps known codes → `{message,recovery}`; unknown → safe generic (no leak) | unit | `npx react-scripts test --watchAll=false src/utils/errorMessages.test.js` | ❌ Wave 0 |
| A11Y-02 | `useFocusTrap` cycles Tab/Shift+Tab, restores focus | unit (RTL) | `npx react-scripts test --watchAll=false src/utils/useFocusTrap.test.js` | ❌ Wave 0 |
| A11Y-03 | jsx-a11y recommended passes | lint | `npm run lint` | ✅ (gate after fixes) |
| UI-05 | Zero rendered-color change in Pass 1 | build+lint+diff | `npm run build && npm run lint` + diff review | ✅ mechanism exists |
| UI-06 | Toggle reverts on write failure | unit (RTL, mock Firestore reject) | `npx react-scripts test --watchAll=false src/components/TasksPage.test.js` | ❌ optional Wave 0 |
| UI-01/02/03/04, COPY-01/03, A11Y-01 | Visual/interaction | manual UAT | `/gsd-verify-work` + browser | manual |

### Sampling Rate
- **Per task commit:** `npm run lint` (+ targeted test if the task added one).
- **Per wave merge:** `npm run test:ci` + `npm run build`.
- **Phase gate:** `npm run lint` (jsx-a11y error-level green) + `npm run build` + `npm run test:ci` all green before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `src/utils/errorMessages.test.js` — covers COPY-02 (known codes, recovery present, unknown-code safe fallback with no `err.message` leak)
- [ ] `src/utils/useFocusTrap.test.js` — covers A11Y-02 focus cycling + restore
- [ ] *(optional)* `src/components/TasksPage.test.js` — covers UI-06 optimistic rollback
- Framework install: none needed (Jest/RTL present)

## Security Domain

`security_enforcement: true`, ASVS level 1. This is a client-side presentation/a11y/copy phase introducing **no new attack surface** (no new endpoints, no data-model change, no new dependency, no auth/session change).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Untouched — do not break Google/email auth (CLAUDE.md) |
| V3 Session Management | no | Untouched |
| V4 Access Control | no | Firestore rules unchanged; UI checks remain progressive enhancement |
| V5 Input Validation / Output Encoding | minor | New copy/error strings are static; **do not interpolate raw `err.message`/error codes into UI** (current `friendlyAuthError` fallback leaks `err.message` — the new `errorMessages.js` must return a safe generic, per D-05 "no security detail leaked") |
| V6 Cryptography | no | N/A |
| V7 Error Handling | yes | Central error map must not surface stack traces, Firestore internals, or security-relevant codes to users |

### Known Threat Patterns for React/CRA + Firebase
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Error-message info leak (raw SDK errors in toast/PageState) | Information Disclosure | `errorMessages.js` returns curated `{message,recovery}`; generic fallback; never echo `err.message` |
| Focus indicator removed without replacement | (a11y, not security) | `:focus-visible` must always render a visible ring (A11Y-01) |
| XSS via copy | Tampering | All copy is static JSX text (React auto-escapes); no `dangerouslySetInnerHTML` introduced |

## Sources

### Primary (HIGH confidence — tool-verified this session)
- `npx eslint … plugin:jsx-a11y/recommended` over `src/` — 251 violations, rule + file breakdown
- `npm run lint` — current baseline clean
- `grep` hex counts/frequency over `src/**/*.js` and `src/App.css`
- Direct reads: `PageState.js`, `Loading.js`, `Toast.js`, `ConfirmModal.js`, `useEscapeKey.js`, `HomePage.js` (cache), `LoginPage.js` (`friendlyAuthError`), `TasksPage.js` L460–489, `ActiveDealsPage.js` L95–135, `App.css` L73/100–124/4340–4370/4460–4495/4875
- `package.json` scripts + eslintConfig; `node_modules` version checks

### Secondary / Tertiary
- None required — all claims tool-verified against the codebase.

## Metadata

**Confidence breakdown:**
- Standard stack / no-new-dep: HIGH — versions checked in `node_modules`, lint run.
- jsx-a11y surface: HIGH — exact count/rules/files produced by running the recommended ruleset.
- Hex migration surface: HIGH — grep counts + token cross-reference; the byte-identical categorization is exact.
- Component APIs: HIGH — read verbatim from source.
- Focus/skeleton CSS: HIGH — confirmed at exact line numbers.
- Optimistic sites: HIGH — handlers read verbatim.

**Divergences flagged (CONTEXT/UI-SPEC vs code):**
1. Hex is **1,160 across 38 files**, not ~1,200/~30 (file count materially higher).
2. **Most recurring hexes do NOT match existing tokens** — Pass 1 is add-token-first, not map-to-existing (only ~35% byte-identical).
3. **D-15 `#ffffff`→`--text-primary` is a value change** violating the D-17 Pass-1 byte-identical rule — belongs in Pass 2 (or add `--white` in Pass 1). Needs user confirmation.
4. `LoadingButton` has **no pending-label prop** — API extension required for D-14.
5. `Toast.error` takes a **string**, not `{message,recovery}` — call sites must compose.
6. `ConfirmModal` confirm button is **not** a `LoadingButton` and has no loading state — needs work for D-14 pending-on-destructive.
7. Existing `.skeleton` base is `#0a0a0a` (surface-1), UI-SPEC recommends surface-2.
8. `prefers-reduced-motion` global rule **already exists** (L4875) — skeleton reduced-motion largely handled.

**Research date:** 2026-07-13
**Valid until:** ~2026-08-12 (stable domain; re-measure counts if significant component churn lands first)
