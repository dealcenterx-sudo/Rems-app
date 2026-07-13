# Phase 7: UI/UX, Copy & Accessibility - Context

**Gathered:** 2026-07-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Make every surface of REMS feel like enterprise SaaS — designed empty/loading/pending
states, professional copy following a written standard, and WCAG 2.2 AA accessibility
fixed at the design-token level — while preserving the dark near-black + `#00ff88`
brand and breaking no production workflow.

**In scope:** empty states (UI-01), skeleton loaders (UI-02), SWR Home KPIs (UI-03),
pending button states (UI-04), hex→token migration (UI-05), optimistic toggles (UI-06),
a one-page copy standard + sweep + error mapping (COPY-01/02/03), token-level contrast
+ focus ring, focus-trap/keyboard/semantic-HTML, and `eslint-plugin-jsx-a11y`
(A11Y-01/02/03).

**Out of scope (other phases / milestone):** the public landing/trust pages and CSP
enforcement (Phase 8), new CRM capabilities, framework migration, and any data-model
change. This phase clarifies HOW to polish what exists — it adds no new product
capability.

</domain>

<decisions>
## Implementation Decisions

### Empty States & Copy Voice (UI-01, COPY-01/02/03)
- **D-01:** Empty-state voice is **minimal & factual**, not marketing-warm — terse
  copy that fits the enterprise-austere dark brand. No cutesy personality.
- **D-02:** First-use vs no-results are **distinct where it matters** — apply the
  distinction on the ~6 primary list surfaces (Deals, CRM/Leads, Contacts, Properties,
  Tasks, Documents). Simpler/secondary surfaces get one generic empty state.
- **D-03:** Reconciliation of D-01 + D-02: keep copy terse/factual, but a **no-results**
  state still offers a quiet **clear-filters** affordance so a filtered-to-zero list
  never reads identically to a brand-new account. CTAs, where present, are understated
  (a single quiet action), never marketing buttons.
- **D-04:** Build empty states on the existing **`PageState`** primitive
  (`src/components/PageState.js`) — do not introduce a parallel component.
- **D-05:** Firebase/API error codes → human messages live in **one central util**
  (`src/utils/errorMessages.js`), mapping `code → { message, recovery }`, reused
  everywhere. Generalizes the existing `friendlyAuthError` pattern in `LoginPage.js`.
  Single source of truth, unit-testable.
- **D-06:** Copy sweep targets **high-traffic surfaces first** — Home, Deals, CRM,
  Contacts, Properties, Tasks, Documents, Settings, auth, and confirmation dialogs.
  Admin-only / rare corners are noted for a later pass, not swept now.
- **D-07:** Destructive-action confirmation copy (COPY-03) must be **verified against
  actual handler behavior** before rewriting — do not describe an outcome the handler
  doesn't perform.

### Skeletons & Perceived Speed (UI-02, UI-03)
- **D-08:** Build **one reusable `<Skeleton>` shimmer primitive** (subtle gradient
  sweep over `--surface-2`/`--surface-3` tokens) plus a small set of composed shapes:
  text-line, card, table-row, KPI tile. Pages assemble these to mirror their own layout.
  No skeleton primitive exists yet (`Loading.js` provides spinners only).
- **D-09:** Skeletons use **delay-then-show** — render only if loading exceeds
  ~300–500ms; sub-threshold loads go straight to content with no skeleton flash.
- **D-10:** Skeleton pages: Home, Deals, CRM, Contacts, Properties, Tasks, Documents.
  Mirror final layout with **no layout shift** (CLS) when content swaps in.
- **D-11:** Home KPIs use **silent SWR** — render cached KPIs instantly, refetch in the
  background, swap in new numbers when ready, no visible refresh indicator. Extend the
  existing HomePage localStorage KPI cache (30s TTL) rather than adding a new store.

### Interaction Feedback (UI-04, UI-06)
- **D-12:** Optimistic updates apply to **toggles only** — task complete/incomplete and
  task/deal status changes. All other mutations use normal pending→confirm. Inline field
  edits and drag/reorder are NOT optimistic in this phase.
- **D-13:** On optimistic-write failure: **silently revert** the UI to prior state and
  show an **error toast** with a human message + recovery, sourced from the central error
  map (D-05) via the existing `Toast` system. No inline-per-control error, no Retry action.
- **D-14:** Pending state standardizes on the existing **`LoadingButton`** pattern:
  inline spinner + disabled + label switches to present-tense verb ("Saving…",
  "Deleting…"). Applies to every submit/destructive button.
- **D-15:** While standardizing `LoadingButton`, fix its **hardcoded hex** (`#ffffff`,
  `#00ff88`) to design tokens (part of the UI-05 migration, not a separate visual change).

### Tokens & Accessibility (UI-05, A11Y-01/02/03)
- **D-16:** Migration scope is **semantic colors → tokens** — migrate every hex that maps
  to an existing semantic token (text tiers, surfaces, borders, accent, state colors);
  add tokens for recurring values that lack one. Leave truly one-off decorative values
  (e.g., a single chart-series color) inline **but documented**. (~1,200 hex across ~30
  component files today.)
- **D-17:** Two-pass discipline (UI-05) with an **exact-equivalent + build/lint gate**:
  Pass 1 maps each hex only to a token whose value is byte-identical (or adds an
  exact-match token) so computed styles are unchanged **by construction**; gate on green
  build + lint + diff review. Pass 2 then adjusts token *values* for contrast. The two
  passes are separate commits; no token value changes in Pass 1.
- **D-18:** Fix contrast (WCAG 2.2 AA, 4.5:1) and the `#00ff88` focus ring (3:1) **at the
  token level** in Pass 2 so the change propagates everywhere. Also remove/reconcile the
  leftover off-brand `--shadow-focus` blue token and the duplicated `--focus-ring`
  definition found in `src/App.css`.
- **D-19:** Focus trap: build a small reusable **`useFocusTrap`** hook (focus first
  element on open, cycle Tab/Shift+Tab within, restore focus on close) in `src/utils/`,
  pairing with the existing `useEscapeKey`. No new dependency. Apply to `ConfirmModal`
  and the **major** modals; exhaustive per-modal coverage of every drawer/tab is a later
  concern, not this phase's bar.
- **D-20:** Ensure Escape-close + initial-focus-on-open on modals, keyboard-reachable
  interactive elements, semantic HTML on major pages, and **meaning never conveyed by
  color alone** (add text/icon cues where status is color-coded).
- **D-21:** Enable `eslint-plugin-jsx-a11y` **recommended ruleset at error level** and
  fix all violations within this phase so CI lint stays green. (CI runs lint on every
  push — the backlog must be cleared before the rule flips to error, or done in the same
  change that fixes violations.)

### Claude's Discretion
- Exact shimmer timing/easing, skeleton shape composition per page, and the precise
  delay threshold within the ~300–500ms band.
- The full token list added in Pass 1 and the specific contrast-corrected values in
  Pass 2 (must meet 4.5:1 / 3:1 and preserve brand direction).
- Copy-standard wording specifics (sentence case, verb+object buttons, one term per
  concept, error format) — write the one-page standard, then apply it.
- Mobile/responsive behavior of the new states (desktop-first, but must not break
  mobile) — follow existing responsive patterns; no explicit decision was requested.
- Internal structure of `errorMessages.js` and which specific Firebase/API codes to map
  (cover the codes the live flows actually surface).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` — Phase 7 section (goal, success criteria, UI hint)
- `.planning/REQUIREMENTS.md` — UI-01…06, COPY-01…03, A11Y-01…03 (exact wording of each)
- `.planning/PROJECT.md` — core value, brand constraints, out-of-scope
- `./CLAUDE.md` and `./.claude/CLAUDE.md` — brand tokens, 11px type floor,
  `--text-faint` minimum contrast tier, ConfirmModal/logActivity conventions

### Brand, tokens & conventions
- `src/App.css` — `:root` design tokens (text tiers, surfaces, borders, accent,
  `--focus-ring`); source of truth for the hex→token migration and the token-level
  contrast/focus fixes. Note existing duplicated `--focus-ring` + off-brand
  `--shadow-focus` to reconcile.
- `.planning/codebase/CONVENTIONS.md` — inline-style-object + `var(--token)` rule,
  hook naming (`use*` in `src/utils/`), named/default export patterns
- `.planning/codebase/STRUCTURE.md` — component/page layout
- `.planning/codebase/STACK.md` — React 19 / CRA constraints

### Reusable assets referenced in decisions
- `src/components/PageState.js` — empty/error/warning/success primitive (D-04)
- `src/components/Loading.js` — `LoadingSpinner`/`LoadingOverlay`/`LoadingButton`;
  spinners only, no skeleton; hardcoded hex to fix (D-08, D-14, D-15)
- `src/components/Toast.js` — toast system for rollback + error surfacing (D-13)
- `src/components/ConfirmModal.js` — destructive confirmations; focus-trap target (D-19)
- `src/utils/useEscapeKey.js` — Escape handling to pair with `useFocusTrap` (D-19)
- `src/components/HomePage.js` — existing localStorage KPI cache to extend for SWR (D-11)
- `src/components/LoginPage.js` — `friendlyAuthError` pattern to generalize (D-05)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PageState.js`: flexible empty-state primitive (icon, eyebrow, title, message,
  actions, `aria-live`) — foundation for UI-01; phase applies it consistently rather
  than building new.
- `Loading.js`: `LoadingButton` is the pending-state basis (UI-04); `LoadingSpinner`
  reusable inside skeletons/overlays. No skeleton component exists — build one (UI-02).
- `Toast.js` + `ConfirmModal.js`: existing feedback/confirmation infra for rollback
  (UI-06) and destructive copy (COPY-03).
- `useEscapeKey.js`: pairs with the new `useFocusTrap` hook for modal a11y (A11Y-02).
- HomePage KPI cache (localStorage, 30s TTL): extend to true SWR (UI-03).
- `friendlyAuthError` in `LoginPage.js`: pattern to generalize into central
  `errorMessages.js` (COPY-02).

### Established Patterns
- Colors via `var(--token)` design tokens in `src/App.css :root`; inline style objects
  in components. ~1,200 hardcoded hex remain across ~30 files (UI-05 migration surface).
- Local React state + Firebase as source of truth; direct Firestore reads/writes in
  components (optimistic toggles wrap these — UI-06).
- Firebase error-code → friendly-message translation already exists for auth; extend
  the same idea app-wide.

### Integration Points
- New `Skeleton` primitive + `useFocusTrap` hook + `errorMessages.js` util land in
  `src/components/` and `src/utils/` per naming conventions.
- Skeletons/empty states wire into each page's existing loading/empty branches
  (Home, Deals, CRM, Contacts, Properties, Tasks, Documents + buyer/seller client shell).
- `eslint-plugin-jsx-a11y` config goes in `package.json` `eslintConfig` (CRA
  `react-app` extends); CI lint gate enforces it (A11Y-03).

</code_context>

<specifics>
## Specific Ideas

- Enterprise-austere, not startup-cheerful: the whole polish pass should read as a
  serious production SaaS demoable to investors/technical reviewers.
- Pass 1 of the token migration must be provably zero-visual-change (byte-identical
  token mapping) before any contrast value moves in Pass 2 — this is a safety rule, not
  a preference.
- Silent, instant-feeling app: cached KPIs and delay-then-show skeletons avoid both
  flashing loaders and stale-looking spinners.

</specifics>

<deferred>
## Deferred Ideas

- Exhaustive per-string copy sweep of admin-only and rare/edge components (this phase
  does high-traffic surfaces first — D-06).
- Exhaustive focus-trap/keyboard audit of every modal, drawer, and portal tab (this
  phase covers ConfirmModal + major modals — D-19).
- Full token migration of one-off decorative/chart colors (left inline + documented in
  this phase — D-16).
- Visual-regression screenshot tooling for the token migration (considered; rejected in
  favor of exact-equivalent + build/lint gate to keep phase scope bounded — D-17).
- Retry action inside error toasts on optimistic-write failure (considered; rejected for
  simplicity — D-13).
- Landing page, trust page, and CSP enforcement — Phase 8.

</deferred>

---

*Phase: 7-ui-ux-copy-accessibility*
*Context gathered: 2026-07-13*
