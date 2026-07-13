# Phase 5: Data Reliability & Infrastructure Headers - Research

**Researched:** 2026-07-13
**Domain:** Firestore composite indexes, observability wiring, Vercel static caching + CSP Report-Only
**Confidence:** HIGH (this is a reconcile-and-verify phase; the authoritative source is the shipped codebase, read directly)

## Summary

Phase 5's code was already shipped in bulk commit `dd6364a` (codex) and is being reconciled/verified under GSD — not built greenfield. Nearly every artifact the five success criteria call for already exists on disk: `firestore.indexes.json` (15 composite index defs), `docs/FIRESTORE_INDEXES.md`, the AnalyticsDashboard missing-index fallback that reports to Sentry, `api/csp-report.js`, and a fully-populated `vercel.json` with immutable static caching + a `Content-Security-Policy-Report-Only` header. So the phase is mostly about **verifying** the shipped work and closing three concrete gaps — not writing large new code.

The landscape has shifted since these items were deferred in earlier phases: **Sentry is now LIVE in production** (Phase 3 UAT confirmed client errors + web-vitals landing; `REACT_APP_SENTRY_DSN` build-time + `SENTRY_DSN` runtime set in Vercel), the **hardened Firestore rules are LIVE** (Phase 6 published), and **JDK 21 runs the rules emulator in CI**. Concretely this makes DATA-02 (analytics fallback → Sentry) genuinely testable and lets the CSP soak be observed post-deploy.

Following the Phase 1–4 precedent, every requirement splits into a **LOCALLY-VERIFIABLE code/doc half** (verifiable now) and a **LIVE / CONSOLE / DEPLOY half** (index READY state, non-admin production smoke, CSP violation collection) that requires operator action. The operator has Firebase Console access and a non-admin test account, so the live halves are reachable — they just can't be observed from this environment.

**Primary recommendation:** Treat this as a verification phase with three net-new work items: (1) a **DATA-02 unit test** for the analytics fallback→Sentry wiring (net-new; no such test exists), (2) **wire `INLINE_RUNTIME_CHUNK=false` into a Vercel-reachable, git-tracked location** (INFRA-03 — currently set NOWHERE that reaches production), and (3) a **CSP allowlist review** for known holes (Google sign-in `apis.google.com`, Firebase authDomain `*.firebaseapp.com`, region-specific Sentry ingest host) that the Report-Only soak will surface. Everything else is verify-and-document.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Composite index definitions (`firestore.indexes.json`) | Database / Storage | — | Index defs are Firestore config; deploy via Console, not git |
| Query construction (where+orderBy) | Browser / Client | — | Firestore web SDK queries live directly in React components |
| Missing-index fallback → Sentry | Browser / Client | API (Sentry ingest) | Client detects `failed-precondition`, reports via `@sentry/react` |
| CSP violation collection | API / Backend | Browser (report generation) | Browser emits report; `api/csp-report.js` (serverless) ingests → Sentry |
| Static-asset cache headers | CDN / Static | — | Vercel edge serves `vercel.json` headers on `/static/*` |
| `INLINE_RUNTIME_CHUNK=false` | Frontend build (CRA) | CDN | Build-time env var changes emitted bundle shape; consumed by Vercel build |

## Project Constraints (from CLAUDE.md / .claude/CLAUDE.md)

- **Two-channel deploy:** Code auto-deploys on merge to `main`; `firestore.rules` and `firestore.indexes.json` do NOT deploy from git — the operator must create/verify indexes in Firebase Console. "READY in Console" must be an explicit acceptance criterion (STATE.md blocker confirms this).
- **Index gotcha:** non-admin queries combining `where('userId'…)` with `orderBy` need composite indexes; admin queries (no userId scope) don't. "Works for admin, breaks for a test account" = missing index, not a rules problem.
- **No secrets in code/docs** — env vars referenced by NAME only.
- **Backward-compatible only**; no data-model/collection changes; do not break Google sign-in or email/password auth.
- **Design tokens:** use `var(--…)`, not raw hex (relevant if the fallback banner UI is touched; note existing `AnalyticsDashboard.js` uses raw hex — do NOT expand that debt).
- **Build + lint + tests before shipping**; each phase must leave `main` shippable.
- **CSP stays Report-Only this phase.** Enforcement (INFRA-01) is Phase 8, after a clean 5-action smoke.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | All non-admin `where('userId') + orderBy` queries have composite indexes created, READY, documented in `firestore.indexes.json` | Full query-site → index cross-reference below: all 15 index defs present; **every** non-admin where+orderBy query is covered by an existing def (code/doc half DONE). Remaining: operator confirms each index READY in Console (live half). |
| DATA-02 | AnalyticsDashboard missing-index fallback reports to Sentry (loud, not silent) | `AnalyticsDashboard.js:65` calls `captureError(error, {feature:'analytics-index-fallback', …})` inside the `failed-precondition`/`/index/i` catch — WIRED. Gap: no unit test asserts it. Net-new test opportunity (mock observability, simulate missing-index error, assert `captureError` called). Sentry now live → also verifiable post-deploy. |
| DATA-03 | Non-admin accounts complete Home, Deals, CRM, Properties, Tasks, Analytics without index errors or silent fallbacks | HUMAN production smoke with the operator's non-admin account. Not locally observable. Depends on all DATA-01 indexes being READY first. |
| INFRA-02 | Static assets serve `Cache-Control: immutable`; `index.html` serves `no-cache` | `vercel.json` already sets `/static/(.*)` → `public, max-age=31536000, immutable` and `/index.html` + `/` → `no-cache, no-store, must-revalidate`. Code half DONE; confirm response headers post-deploy (curl -I). |
| INFRA-03 | `INLINE_RUNTIME_CHUNK=false` so CSP needs no `'unsafe-inline'` script-src | **GAP: not set anywhere git-tracked / Vercel-reachable.** `.env.local` is gitignored (won't reach Vercel); `build` script is plain `react-scripts build`. Must add to a tracked `.env`/`.env.production`, the build script, or a Vercel project env var. Interacts with CSP (see Pitfall 1). |

*Note: INFRA-01 (CSP enforcement) is NOT in this phase's scope — Phase 5 ships the Report-Only groundwork only; INFRA-01 completes in Phase 8. Success criterion 5 = "Report-Only header live + reports being collected."*
</phase_requirements>

## DATA-01: Query-Site → Index Coverage Cross-Reference

**Method:** grepped `src/components/**` for `where('userId'…)` and `orderBy(`, then read every construction site. A composite index is required only when a non-admin (userId-scoped) query combines with `orderBy` (or a range filter). Admin branches drop the userId filter and are separately handled by the admin-oriented index defs.

| Query site | Non-admin query shape | Required index | Covered by def? |
|------------|----------------------|----------------|-----------------|
| `AnalyticsDashboard.js:46-54,115` | `deals` / `properties`: userId + range(createdAt) + orderBy(createdAt desc) | `{userId, createdAt DESC}` | ✅ deals & properties defs |
| `DealsDashboard.js:68` | `deals`: userId + orderBy(createdAt desc) | `{userId, createdAt DESC}` | ✅ |
| `ActiveDealsPage.js:52-58` | `deals`: userId + [status] + orderBy(createdAt desc) | `{userId, createdAt DESC}` and `{userId, status, createdAt DESC}` | ✅ both defs present |
| `ClosedDealsPage.js:30-33` | `deals`: userId + status=='closed' + orderBy(createdAt desc) | `{userId, status, createdAt DESC}` | ✅ |
| `PropertiesPage.js:141-149` | `properties`: userId + orderBy(createdAt **asc OR desc**) | `{userId, createdAt DESC}` **and** `{userId, createdAt ASC}` | ✅ both directions present (explains why both defs exist) |
| `ContactsPage.js:77-84` | `contacts`: userId + [contactType] + orderBy(createdAt desc) | `{userId, createdAt DESC}` and `{userId, contactType, createdAt DESC}` | ✅ both defs present |
| `CRMLeadsPage.js:58-68` | `leads`: userId + range(submittedAt) + orderBy(submittedAt desc) | `{userId, submittedAt DESC}` | ✅ (range+orderBy on same field reuses the composite) |
| `CRMDashboard.js:175` | `leads`: userId + orderBy(submittedAt desc) | `{userId, submittedAt DESC}` | ✅ |
| `DocumentsPage.js:58-63` | `documents`: userId + [category] + orderBy(createdAt desc) | `{userId, createdAt DESC}` and `{userId, category, createdAt DESC}` | ✅ both defs present |
| `TasksPage.js:401-405` | `tasks`: userId + orderBy(dueDate asc) | `{userId, dueDate ASC}` | ✅ |
| `HomePage.js:145` | `tasks`: userId + orderBy(dueDate asc) + limit(4) | `{userId, dueDate ASC}` | ✅ |
| `DealDocumentsTab.js:47` | `deal-documents`: dealId + orderBy(createdAt desc) | `{dealId, createdAt DESC}` | ✅ |
| `DealChatTab.js:78` | `deal-messages`: dealId + channelId + orderBy(createdAt asc) | `{dealId, channelId, createdAt ASC}` | ✅ |

**Queries that do NOT need a composite index (verified, so the plan doesn't chase phantom gaps):**
- `HomePage.js:89-99` — `getCountFromServer` count aggregations with **multiple equality filters only** (`userId + contactType + activelyBuying`, `userId + contactType + buyerType`, `userId + status`). No `orderBy`. Firestore serves multi-equality (incl. count aggregations) by **merging single-field indexes** — no composite index required [CITED: firebase.google.com/docs/firestore/query-data/aggregation-queries]. *Flag for smoke: if the Console ever prompts for one of these, add it — but none is expected.*
- `TasksPage.js:366-372`, `NewDealPage.js:43-57`, `CRMMessagesPage.js:147`, `CRMEmailInboxPage.js:90,267`, `CRMCampaignsPage.js:175` — userId (± one equality) **with no `orderBy`** (sorting done client-side). Equality-only → no composite index.
- Admin-only `orderBy` queries (`UserManagement.js:39-40`, `DealsDashboard.js:65`, etc.) — admin drops the userId filter; single-field `orderBy` needs no composite index, but the admin-scoped defs (`{status, createdAt DESC}`, `{contactType, createdAt DESC}`, `{category, createdAt DESC}`) cover admin filter+orderBy combos and are present.

**DATA-01 finding: NO uncovered non-admin where+orderBy query found.** The 15 shipped index defs are a complete match for the current query surface. The code/doc half of DATA-01 is DONE. The only outstanding work is the operator confirming each of the 15 indexes is **READY** in the Firebase Console (live half) — the STATE.md two-channel-deploy blocker explicitly calls this out ("Phase 5 indexes still pending READY").

> `campaigns` collection (`CRMCampaignsPage.js`) is queried userId-only and sorted in memory; it is not in Core Collections or `firestore.indexes.json` and needs no index. Note for completeness, not a gap.

## DATA-02: Fallback → Sentry Wiring (VERIFIED in code; test GAP)

`src/components/AnalyticsDashboard.js` `loadCollectionInRange` (lines 46–86):
```js
} catch (error) {
  if ((error?.code === 'failed-precondition') || /index/i.test(String(error?.message || ''))) {
    setQueryError(`Analytics is using a slower fallback for ${collectionName} while indexes finish. Results remain available.`);
    captureError(error, {
      feature: 'analytics-index-fallback',
      collectionName,
      hasStartBound: Boolean(start),
      hasEndBound: Boolean(end),
      userScoped: userFilter.length > 0
    });
    // Equality-only query needs no composite index; filter and sort locally.
    const snapshot = await getDocs(query(...getArgs(false, false)));
    return sortByCreatedAtDesc(...).filter(...);
  }
  throw error;
}
```
- `captureError` is imported from `src/utils/observability.js:7` — the same Sentry bridge Phase 3 verified live. `captureError` no-ops without `REACT_APP_SENTRY_DSN` and calls `Sentry.captureException(error, {extra: context})` when enabled. So the fallback is **loud** (Sentry event + on-screen `status-banner-warning`), not silent. **DATA-02 code half is WIRED.**
- **GAP:** `src/utils/observability.test.js` tests `captureError` in isolation, but **no test asserts the AnalyticsDashboard fallback path actually calls `captureError`** when a missing-index error is thrown. This is the clear net-new work item for DATA-02.

**Recommended test approach (net-new):** unit-test the fallback wiring. Mock `../utils/observability` (`jest.mock('../utils/observability', () => ({ captureError: jest.fn() }))`), mock `firebase/firestore` so the first `getDocs` rejects with `{ code: 'failed-precondition' }` and the second resolves with docs, render `AnalyticsDashboard` (wrapped in the `ToastProvider` it depends on via `useToast`), then assert `captureError` was called with `expect.objectContaining({ feature: 'analytics-index-fallback', collectionName: 'deals' })` and that the fallback still returns data. Follows the established `jest.mock` factory pattern already used in `observability.test.js` / `notifications.test.js` (auto-mock breaks on the Sentry export shape — do NOT auto-mock). Runs under CRA Jest (`npm run test:ci`), not vitest.

## DATA-03: Non-admin Multi-Flow Smoke (LIVE / HUMAN)

Success criterion 3 requires a **non-admin test account** completing Home, Deals, CRM, Properties, Tasks, and Analytics with no index errors and no silent fallbacks. This is a production smoke the operator runs (they have a non-admin account). It is gated on **all DATA-01 indexes being READY** first. Not observable from this environment. Document as a human-verify checkpoint. Watch for: the amber "using a slower fallback" banner (means an index isn't READY), console `failed-precondition` errors, or empty lists where data should appear.

## INFRA-02: Cache Headers (VERIFIED in `vercel.json`)

`vercel.json` `headers` already satisfies the criterion:
- `/static/(.*)` → `Cache-Control: public, max-age=31536000, immutable` ✅ (fingerprinted CRA assets, safe to cache forever)
- `/index.html` and `/` → `Cache-Control: no-cache, no-store, must-revalidate` ✅ (closes the stale-chunk trap — the HTML always revalidates so it references current chunk hashes)
- `/pdf.worker.min.mjs` → `public, max-age=86400` (1-day; reasonable for the pinned worker)

**INFRA-02 code half is DONE.** Verify post-deploy with `curl -sI https://rems-app.vercel.app/static/js/<hash>.js` and `curl -sI https://rems-app.vercel.app/index.html` to confirm the edge actually emits these headers (Vercel header precedence + SPA rewrites can interact).

## INFRA-03: INLINE_RUNTIME_CHUNK=false (GAP — set nowhere Vercel-reachable)

**Finding:** `INLINE_RUNTIME_CHUNK` appears in **zero** git-tracked files. `grep -rn INLINE_RUNTIME_CHUNK` (excluding node_modules/.planning) returns nothing. The `build` script is plain `react-scripts build`. A `.env.local` exists but is **gitignored** (`git check-ignore .env.local` → ignored; `.gitignore` lines 16 & 37) and CRA `.env.local` is a local-only file that does **not** reach the Vercel build — so even if it contains the flag locally, production builds inline the runtime chunk.

By default CRA (`react-scripts` 5) **inlines the webpack runtime chunk as an inline `<script>` in `index.html`**. Setting `INLINE_RUNTIME_CHUNK=false` emits the runtime as an external `/static/js/runtime-*.js` file instead, so no inline script is needed — which is exactly what lets `script-src 'self'` work without `'unsafe-inline'` [CITED: create-react-app.dev advanced configuration]. This is a hard dependency of the CSP goal (see Pitfall 1).

**Options for setting it (pick one; plan should decide):**
1. **Tracked `.env` / `.env.production` at repo root** containing `INLINE_RUNTIME_CHUNK=false` (and `GENERATE_SOURCEMAP=false` if desired). CRA reads these at build time; committing them makes the setting reproducible in Vercel's build. Cleanest, git-visible, no dashboard state. **Recommended** — but confirm no secrets go in it (this flag is not a secret).
2. **Prefix the build script:** `"build": "INLINE_RUNTIME_CHUNK=false react-scripts build"`. Works on Vercel's Linux builder and in CI (Node 24 Linux). Cross-platform caveat if anyone builds on Windows (`cross-env` would be needed) — but CI/Vercel are Linux, so acceptable.
3. **Vercel project env var** `INLINE_RUNTIME_CHUNK=false` (Build & Deploy scope) via dashboard. Works, but it's invisible dashboard state (same anti-pattern the project fought in Phase 1/6 two-channel-deploy notes). If chosen, document the var by name.

Option 1 or 2 keeps the setting in git and reproducible; prefer those over dashboard-only state. **Verify post-deploy:** the shipped `index.html` should have NO large inline bootstrap script and instead reference `/static/js/runtime-*.js`; the CSP soak should show no violation for an inline script on `'self'`.

## INFRA-01 Groundwork: CSP Report-Only (VERIFIED live in `vercel.json`; allowlist review needed)

`vercel.json` `/(.*)` headers already ship:
- `Content-Security-Policy-Report-Only: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https: https://images.unsplash.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://api.cloudinary.com https://res.cloudinary.com https://*.ingest.sentry.io; worker-src 'self' blob:; child-src 'self' blob:; frame-src 'self' https://accounts.google.com; media-src 'self' blob: https:; form-action 'self'; report-uri /api/csp-report; report-to csp-endpoint` ✅
- `Reporting-Endpoints: csp-endpoint="/api/csp-report"` ✅ (modern Reporting API; paired with legacy `report-uri` for coverage)
- `api/csp-report.js` normalizes both legacy `csp-report` and Reporting-API `body` shapes, then `Sentry.captureMessage('CSP Report-Only violation', {level:'warning', tags:{feature:'csp-report-only', violated_directive}, extra:report})` via the `withSentry` wrapper, `flush(1000)`, returns 204 ✅. Since `SENTRY_DSN` is live in the Vercel runtime (Phase 3), collected reports will land in Sentry.

**Allowlist review — coverage vs. current integrations:**

| Integration | Directive coverage | Status |
|-------------|-------------------|--------|
| Firestore / Identity Toolkit / Secure Token | `connect-src https://*.googleapis.com` | ✅ covers `firestore.googleapis.com`, `identitytoolkit.googleapis.com`, `securetoken.googleapis.com` |
| Firebase RTDB | `https://*.firebaseio.com` | ✅ (unused by REMS but harmless) |
| Cloudinary unsigned upload + delivery | `connect-src https://api.cloudinary.com https://res.cloudinary.com`; `img-src https:` | ✅ (direct unsigned upload; no widget host needed) |
| Sentry ingest | `connect-src https://*.ingest.sentry.io` | ⚠️ **POTENTIAL HOLE** — matches `oNNN.ingest.sentry.io` but NOT region-specific `oNNN.ingest.us.sentry.io` / `.de.sentry.io`. If the live DSN host is regional, ingest is blocked. Verify the actual `REACT_APP_SENTRY_DSN` host during soak. |
| PDF worker | `worker-src 'self' blob:` | ✅ (`public/pdf.worker.min.mjs` is same-origin; pdfjs may spawn blob worker) |
| Google sign-in popup | `frame-src https://accounts.google.com` | ⚠️ **POTENTIAL HOLE** — Firebase `signInWithPopup` also loads `https://apis.google.com/js/api.js` (needs `script-src https://apis.google.com`) and uses the authDomain `rems-app-44205.firebaseapp.com` as an auth iframe/handler (may need `frame-src`/`connect-src https://*.firebaseapp.com`). Neither is in the current allowlist. |
| Google Fonts | `style-src … https://fonts.googleapis.com`, `font-src https://fonts.gstatic.com` | ✅ |
| Firebase auth helper assets (gstatic) | — | ⚠️ possible `https://www.gstatic.com` / `https://apis.google.com` for auth; surfaces in soak |

**These are exactly what Report-Only exists to surface** — do NOT pre-emptively widen the allowlist blindly; let the soak produce real violation data, then tighten. But the plan should call out that **Google sign-in (`apis.google.com`, `*.firebaseapp.com`) and the Sentry region host are the highest-probability violations**, because CLAUDE.md forbids breaking Google sign-in and Phase 8 enforcement will hard-block anything still violating. Success criterion 5 only requires the Report-Only header live + reports collected — both already true in code; the operator must confirm reports actually arrive in Sentry post-deploy.

## Architecture Patterns

### Verification flow (data path for this phase)
```
Non-admin client
  ├─ Firestore where(userId)+orderBy query ──► Firestore query planner
  │      ├─ index READY  ──► results (happy path, DATA-03)
  │      └─ index MISSING ──► failed-precondition error
  │              └─ AnalyticsDashboard catch ──► captureError() ──► Sentry (DATA-02)
  │                                          └─ status-banner-warning (loud UI)
  │                                          └─ equality-only refetch + client sort (graceful)
  │
  ├─ Static asset request ──► Vercel edge ──► Cache-Control immutable / no-cache (INFRA-02)
  │
  └─ Page render (script-src 'self', no inline runtime once INFRA-03 set)
         └─ any CSP violation ──► browser report ──► /api/csp-report ──► Sentry (INFRA-01 groundwork)
```

### Deploy-channel pattern (critical)
Two independent deploy channels — the plan MUST separate them:
- **Git channel (auto):** code + `vercel.json` headers deploy on merge to `main`. Covers DATA-02 test, INFRA-02, INFRA-03 (if git-tracked), CSP header.
- **Console channel (manual):** `firestore.indexes.json` does NOT deploy from git — operator creates/verifies indexes in Console → READY. Covers DATA-01 live half. (`firebase deploy --only firestore:indexes` via CLI is an alternative if the operator prefers CLI over Console clicks.)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Missing-index detection | Custom error-string parser everywhere | The existing `error?.code === 'failed-precondition'` + `/index/i` guard already in `AnalyticsDashboard.js` | Firestore returns a stable `failed-precondition` code; reuse the shipped pattern, don't reinvent per-page |
| Reporting a client error to Sentry | Direct `Sentry.captureException` in components | `captureError()` from `src/utils/observability.js` | DSN-gated no-op, uniform `{extra}` shape, already unit-tested |
| CSP report ingestion | New endpoint | Existing `api/csp-report.js` + `withSentry` | Already normalizes both report shapes, flushes, 204s |
| Cache-busting HTML | Query-string versioning | `no-cache` on `index.html` + `immutable` on fingerprinted `/static/*` | CRA already fingerprints; the header combo is the canonical fix |

## Common Pitfalls

### Pitfall 1: Shipping CSP `script-src 'self'` while CRA still inlines the runtime chunk
**What goes wrong:** With `INLINE_RUNTIME_CHUNK` unset (current state), CRA emits an inline `<script>` bootstrap in `index.html`. Under `script-src 'self'` (no `'unsafe-inline'`), that inline script **violates CSP on every page load** — flooding the Report-Only soak with self-inflicted violations and, once Phase 8 enforces, breaking the app entirely.
**Why it happens:** INFRA-03 (`INLINE_RUNTIME_CHUNK=false`) is the prerequisite that removes the inline script; it's currently set nowhere Vercel-reachable.
**How to avoid:** Land INFRA-03 in a git-tracked/Vercel-reachable location **with or before** relying on CSP soak cleanliness. Sequence: INFRA-03 → deploy → confirm no inline runtime script → then the CSP soak data is meaningful.
**Warning signs:** CSP reports with `violated-directive: script-src` and `blocked-uri: inline`; a large inline `<script>` present in the deployed `index.html`.

### Pitfall 2: Treating "index def in JSON" as "index READY"
**What goes wrong:** `firestore.indexes.json` is documentation/config; Firestore does not build indexes from git. A def present in the file does NOT mean the index exists in production. Non-admin users hit `failed-precondition` until the operator creates it in Console.
**How to avoid:** Keep DATA-01's live half as an explicit human-verify checkpoint ("all 15 indexes READY in Console"). Merge dependent DATA-03 smoke only after READY. (STATE.md flags this exact blocker.)
**Warning signs:** "works for admin, breaks for a test account"; the analytics fallback banner appears.

### Pitfall 3: Widening the CSP allowlist blindly instead of soaking
**What goes wrong:** Pre-emptively adding hosts defeats the purpose of Report-Only and can permit more than needed before enforcement.
**How to avoid:** Deploy Report-Only as-is, collect real violation reports (especially the flagged Google-sign-in and Sentry-region candidates), then tighten precisely. But DO pre-verify the known Google sign-in path since CLAUDE.md forbids breaking it.

### Pitfall 4: DATA-02 test using Jest auto-mock on `@sentry/react`
**What goes wrong:** Auto-mock fails on the Sentry package export shape ("Failed to get mock metadata") — documented in STATE.md and `observability.test.js`.
**How to avoid:** Use an explicit `jest.mock('../utils/observability', () => ({ captureError: jest.fn() }))` factory (mock the local module, not the SDK). Test runs under CRA Jest (`test:ci`), not vitest.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `report-uri` only | `report-uri` + `Reporting-Endpoints`/`report-to` (both shipped) | Legacy + modern browser coverage; `api/csp-report.js` normalizes both |
| Silent index fallback | `captureError` + on-screen warning banner | Degradation is visible (DATA-02) |
| Deferred Sentry (no DSN) | Sentry LIVE in Vercel (Phase 3 UAT) | DATA-02 and CSP report collection now genuinely verifiable post-deploy |

## Runtime State Inventory

Phase 5 is not a rename/refactor, but it has a **deploy-channel state** dimension worth pinning:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no data migration; indexes are query accelerators, not data | None |
| Live service config | **Firebase Console composite indexes** — 15 defs in git, READY state unknown/pending in production Console (not git-derived) | Operator creates/verifies READY in Console (DATA-01 live half) — or `firebase deploy --only firestore:indexes` |
| OS-registered state | None | None |
| Secrets/env vars | `REACT_APP_SENTRY_DSN` (build), `SENTRY_DSN` (runtime) already LIVE in Vercel (Phase 3). `INLINE_RUNTIME_CHUNK=false` — **NOT set anywhere Vercel-reachable** | Add INLINE_RUNTIME_CHUNK to tracked `.env`/build script/Vercel env (INFRA-03) |
| Build artifacts | CRA emits inline runtime chunk today; changes to external `runtime-*.js` once INFRA-03 lands | Rebuild + redeploy; verify `index.html` has no inline bootstrap script |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Live `REACT_APP_SENTRY_DSN` host is `oNNN.ingest.sentry.io` (matched by `*.ingest.sentry.io`), not a regional `*.ingest.us.sentry.io` | CSP allowlist | If regional, Sentry ingest is CSP-blocked; soak will show it — verify actual DSN host |
| A2 | Firebase `signInWithPopup` will trigger `apis.google.com` / `*.firebaseapp.com` CSP violations under current allowlist | CSP allowlist | If Firebase's current SDK path avoids those hosts, no violation — soak confirms; low risk to flag either way |
| A3 | Committing `INLINE_RUNTIME_CHUNK=false` in a tracked `.env`/`.env.production` is acceptable to the operator (vs. dashboard env) | INFRA-03 | If operator prefers dashboard-only, use Vercel env var instead; functional either way |
| A4 | No non-admin where+orderBy query exists outside `src/components/**` (e.g., in utils) | DATA-01 | grep scoped to components (all Firestore queries live there per architecture notes); low risk |

## Open Questions (RESOLVED)

> Q1 (INLINE_RUNTIME_CHUNK location) → RESOLVED: `.env.production` is gitignored by `.gitignore:37` (`.env*`), so use PATH A — the `package.json` build script (`INLINE_RUNTIME_CHUNK=false react-scripts build`); see 05-PATTERNS.md + plan 05-02. Q2 (Sentry region) → RESOLVED: the live bundle uses `ingest.us.sentry.io`, so `*.ingest.us.sentry.io` is added to CSP connect-src (wildcards match one label); plan 05-03 T3 re-checks the live region. Q3 (index create method) → RESOLVED: plan 05-03 T1 allows either Console or `firebase deploy --only firestore:indexes`.


1. **Where should `INLINE_RUNTIME_CHUNK=false` live?**
   - Known: not set anywhere git-tracked; `.env.local` is gitignored and won't reach Vercel.
   - Unclear: operator preference (tracked `.env` vs. build-script prefix vs. Vercel dashboard env).
   - Recommendation: tracked `.env.production` (git-visible, reproducible) or build-script prefix; avoid dashboard-only state per two-channel-deploy lessons. Confirm in discuss/plan.

2. **Is the live Sentry DSN region-specific?**
   - Known: dummy test DSN is `o0.ingest.sentry.io`; allowlist uses `*.ingest.sentry.io`.
   - Unclear: whether prod DSN is `*.ingest.us.sentry.io`.
   - Recommendation: operator checks the DSN host; if regional, add it to `connect-src` (this phase, since Sentry ingest for the CSP reporter and analytics fallback both depend on it).

3. **Create indexes via Console clicks or `firebase deploy --only firestore:indexes`?**
   - Recommendation: CLI deploy is faster and less error-prone for 15 defs, and the operator has firebase-tools (^15.22.4 in devDeps). Console works too. Either satisfies "READY."

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Firebase Console / operator access | DATA-01 index READY, DATA-03 smoke | ✓ (operator) | — | — |
| Non-admin test account | DATA-03 smoke | ✓ (operator has one) | — | — |
| Vercel deploy (auto on merge) | INFRA-02/03, CSP header, DATA-02 live | ✓ | — | — |
| Sentry (live DSN) | DATA-02 event landing, CSP report collection | ✓ LIVE | — | — |
| `firebase-tools` (index deploy) | DATA-01 (CLI option) | ✓ | ^15.22.4 (devDeps) | Console UI |
| CRA Jest (`test:ci`) | DATA-02 unit test | ✓ | react-scripts 5.0.1 | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none blocking — all live halves reachable by the operator.

## Package Legitimacy Audit

**Not applicable — this phase installs NO new packages.** All wiring reuses existing dependencies already vetted in prior phases: `@sentry/react` ^10.63.0, `@sentry/node` ^10.63.0, `firebase` ^12.8.0, `firebase-tools` ^15.22.4. No `npm install` required.

## Validation Architecture

> `.planning/config.json` did not disable `nyquist_validation`; included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest via `react-scripts` 5.0.1 (client) + vitest 4 (api/rules) |
| Config file | `package.json` `eslintConfig` + CRA defaults; vitest for `tests/api`, `tests/rules` |
| Quick run command | `CI=true npx react-scripts test --watchAll=false src/components/AnalyticsDashboard` |
| Full suite command | `npm run test:ci` (client) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Every non-admin where+orderBy covered by an index def | static/manual cross-ref (this doc) + Console READY | manual + `firebase deploy --only firestore:indexes` | N/A (config, not unit-testable) |
| DATA-02 | Analytics missing-index fallback calls `captureError` | unit | `CI=true npx react-scripts test --watchAll=false AnalyticsDashboard` | ❌ Wave 0 — net-new `src/components/AnalyticsDashboard.test.js` |
| DATA-03 | Non-admin completes all flows, no fallback | manual (prod smoke) | operator UAT with non-admin account | manual-only (justified: needs live indexes + prod) |
| INFRA-02 | Static immutable / html no-cache | manual (curl) | `curl -sI https://rems-app.vercel.app/static/js/*.js` | manual-only (edge behavior) |
| INFRA-03 | No inline runtime script; flag set | manual (build inspect) | grep deployed `index.html` for inline bootstrap | manual-only (build output) |
| INFRA-01 groundwork | Report-Only header live, reports collected | manual (curl + Sentry) | `curl -sI …` for header; Sentry for reports | manual-only (live) |

### Sampling Rate
- **Per task commit:** targeted `react-scripts test` for the new AnalyticsDashboard test.
- **Per wave merge:** `npm run test:ci` (client), `npm run lint`, `npm run build`.
- **Phase gate:** full suite green + build clean before `/gsd-verify-work`; live halves routed to human-verify (Phase 3/4 precedent → likely terminal state `human_needed`).

### Wave 0 Gaps
- [ ] `src/components/AnalyticsDashboard.test.js` — net-new; covers DATA-02 (mock observability + firestore, simulate `failed-precondition`, assert `captureError` called with `feature:'analytics-index-fallback'`, assert fallback still returns data). Must wrap render in `ToastProvider` (component calls `useToast()`).

## Security Domain

> `security_enforcement` not disabled; included.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | `api/csp-report.js` `normalizeReport` tolerates arbitrary report bodies (open beacon by design, SEC-02) — no injection sink; reports go to Sentry as data, not executed |
| V6 Cryptography | no | — |
| V14 Config / Headers | yes | CSP Report-Only, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy all in `vercel.json` (this phase strengthens CSP) |
| V4 Access Control | indirect | Firestore rules (Phase 6, LIVE) enforce userId scoping; DATA-01 indexes only accelerate already-authorized queries — no new access surface |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Inline-script XSS | Tampering | CSP `script-src 'self'` (needs INFRA-03 to drop inline runtime; enforcement Phase 8) |
| Clickjacking | Spoofing | `frame-ancestors 'none'` + `X-Frame-Options: DENY` (shipped) |
| CSP report endpoint abuse (unauth beacon) | DoS | Documented low-risk open beacon (STATE.md/SEC-02); 204 fast-return, Sentry-side rate handling |
| Data over-exposure via missing index fallback | Info Disclosure | Fallback re-runs the SAME userId-scoped query (equality-only) then sorts client-side — scope preserved, no broadening |

## Sources

### Primary (HIGH confidence — read directly this session)
- `firestore.indexes.json`, `docs/FIRESTORE_INDEXES.md` — 15 index defs + doc
- `src/components/AnalyticsDashboard.js` (fallback→captureError wiring), `src/utils/observability.js`, `src/utils/observability.test.js`
- `vercel.json` (cache + CSP headers), `api/csp-report.js`, `api/_lib/withSentry.js`, `src/index.js`
- Query sites: grep of `src/components/**` for `where('userId'` + `orderBy(` (13 index-relevant sites enumerated above)
- `.gitignore` (`.env.local` ignored), `package.json` (build script, deps), `src/firebase.js` (authDomain `rems-app-44205.firebaseapp.com`)
- `.planning/STATE.md`, `.planning/phases/03-observability/03-VERIFICATION.md`, `.planning/phases/04-serverless-hardening/04-VERIFICATION.md` (Sentry-live confirmation + local-vs-live split precedent)

### Secondary (MEDIUM confidence — verified via web)
- [Firestore aggregation queries — multiple equality filters reuse/merge single-field indexes; composite needed only for aggregations on multiple fields or equality+range/order](https://firebase.google.com/docs/firestore/query-data/aggregation-queries)
- [Firestore index types overview](https://firebase.google.com/docs/firestore/query-data/index-overview)

### Tertiary (LOW confidence — training knowledge, flagged in Assumptions Log)
- CRA `INLINE_RUNTIME_CHUNK=false` emits external runtime chunk (create-react-app advanced config) — [ASSUMED but well-established]
- Firebase `signInWithPopup` loading `apis.google.com` / authDomain iframe — [ASSUMED]; the Report-Only soak is the ground truth

## Metadata

**Confidence breakdown:**
- DATA-01 coverage: HIGH — every query site read and cross-referenced against 15 defs; no gap found
- DATA-02 wiring: HIGH — `captureError` call read at `AnalyticsDashboard.js:65`; test gap confirmed by directory scan
- INFRA-02: HIGH — headers read verbatim from `vercel.json`
- INFRA-03: HIGH (gap) — grep confirms `INLINE_RUNTIME_CHUNK` set nowhere tracked; `.env.local` gitignored
- CSP allowlist holes: MEDIUM — flagged candidates rest on Firebase-SDK/Sentry-region behavior best confirmed by the live soak

**Research date:** 2026-07-13
**Valid until:** 2026-08-12 (stable; codebase-anchored — re-verify only if `vercel.json`, `firestore.indexes.json`, or `AnalyticsDashboard.js` change)
