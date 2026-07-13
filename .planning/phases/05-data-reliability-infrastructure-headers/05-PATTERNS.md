# Phase 5: Data Reliability & Infrastructure Headers - Pattern Map

**Mapped:** 2026-07-13
**Files analyzed:** 4 (1 net-new test, 1 net-new/edit build-config, 1 edit vercel.json, 2 verify-only)
**Analogs found:** 3 / 3 (all files with a code deliverable have a strong in-repo analog)

> This is a reconcile-and-verify phase. Most Phase 5 code already shipped in commit `dd6364a`. Only THREE items carry a real code/config change: (1) net-new DATA-02 unit test, (2) INFRA-03 `INLINE_RUNTIME_CHUNK=false` location, (3) INFRA-03 CSP allowlist edits in `vercel.json`. The rest are self-analog verify-only.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/AnalyticsDashboard.test.js` (NET-NEW) | test | event-driven (error path) | `src/components/ErrorBoundary.test.js` + `src/utils/observability.test.js` | exact (same jest.mock('../utils/observability') pattern + @testing-library render) |
| INLINE_RUNTIME_CHUNK location — `package.json` `build` script OR `.env.production` (NET-NEW/EDIT) | config | batch (build-time) | `package.json` `scripts` block (self-analog) | config — see gitignore resolution below |
| `vercel.json` (EDIT — CSP allowlist) | config | request-response (edge headers) | `vercel.json` itself (self-analog; extend existing `Content-Security-Policy-Report-Only`) | exact (self) |
| `firestore.indexes.json` (VERIFY-ONLY) | config | CRUD (query accel) | self (already complete, 15 defs) | verify-only |
| `vercel.json` cache headers (VERIFY-ONLY, INFRA-02) | config | request-response | self (already complete) | verify-only |

---

## RESOLVED: `.env.production` vs `.gitignore` `.env*` — INFRA-03 location decision

**This is the blocking decision for INFRA-03. It is resolved here so the planner does not pick a location that silently fails to reach Vercel.**

Verified facts (from `git check-ignore -v` and `ls`):

```
$ git check-ignore -v .env.production
.gitignore:37:.env*   .env.production        <-- IGNORED

$ git check-ignore -v .env
.gitignore:37:.env*   .env                    <-- IGNORED

$ git ls-files | grep .env
(nothing — NO env file is tracked)

.env.local exists on disk but is gitignored (lines 16 & 37) and CRA-local-only → never reaches Vercel build.
```

`.gitignore` line 37 is a broad `.env*` rule (added after the CRA-default lines 16-19):

```
16  .env.local
17  .env.development.local
18  .env.test.local
19  .env.production.local
...
37  .env*
```

**Consequence:** RESEARCH.md "Option 1" (create a tracked `.env.production`) does **NOT work as written** — `.env.production` matches `.env*` and git will refuse to add it normally. A plain `Write` of `.env.production` produces an untracked file that never deploys to Vercel (same failure mode as the current `.env.local`).

**Two working paths for the planner (pick one):**

- **PATH A — build-script prefix (RECOMMENDED; least gitignore friction).** Edit `package.json` `build` script only. No `.gitignore` change, nothing new to force-add, fully git-visible, reproducible on Vercel's Linux builder and Node-24 CI.

  Current (`package.json:29`):
  ```json
  "build": "react-scripts build",
  ```
  Change to:
  ```json
  "build": "INLINE_RUNTIME_CHUNK=false react-scripts build",
  ```
  Caveat: bare `VAR=value cmd` is POSIX shell syntax — fine on Vercel/CI (Linux) but breaks on a Windows dev shell. If Windows support is wanted, use `cross-env` (not currently a dep). REMS CI + Vercel are Linux, so bare prefix is acceptable per RESEARCH.md INFRA-03 Option 2.

- **PATH B — tracked `.env.production` + `.gitignore` negation.** Keep the flag as build env config, but you MUST make it trackable:
  1. Add a negation to `.gitignore` (after line 37) so the file is not ignored:
     ```
     !.env.production
     ```
     (a later `!pattern` un-ignores a file caught by an earlier `.env*`; order matters — the negation must come AFTER line 37).
  2. `Write` `.env.production` with:
     ```
     INLINE_RUNTIME_CHUNK=false
     ```
  3. `git add .env.production` will now succeed (verify with `git check-ignore -v .env.production` returning nothing).

  This exposes ALL future `.env.production` contents to git — only put the non-secret `INLINE_RUNTIME_CHUNK` flag here (it is not a secret; DSNs and keys must NOT go here). Do NOT loosen the `.env*` rule any further.

**Do NOT use** a Vercel dashboard env var (RESEARCH Option 3) as the primary path — it is invisible non-git state, the exact anti-pattern the two-channel-deploy notes warn against.

**Post-deploy verification (either path):** deployed `index.html` must have NO large inline bootstrap `<script>` and instead reference `/static/js/runtime-*.js`; the CSP Report-Only soak should show no `script-src`/`inline` self-violation.

---

## Pattern Assignments

### `src/components/AnalyticsDashboard.test.js` (test, error-path, NET-NEW) — DATA-02

**Subject under test:** `src/components/AnalyticsDashboard.js:65-71` — the `captureError(error, { feature: 'analytics-index-fallback', ... })` call inside the `failed-precondition` / `/index/i` catch in `loadCollectionInRange` (defined at `AnalyticsDashboard.js:46`, first `getDocs` at line 60, catch guard at line 63, fallback refetch at line 73).

**Load trigger (what makes the code run under render):** `AnalyticsDashboard.js:131-133` `useEffect(() => { loadAllData(); }, [loadAllData])` → `loadAllData` (`110-129`) calls `loadCollectionInRange('deals', userFilter)` and `loadCollectionInRange('properties', userFilter)`. `userFilter` is `[]` for admin and `[where('userId','==',uid)]` for non-admin (`115`), gated by `isAdminUser()` from `../utils/helpers`. To force the userId-scoped path (`userScoped: true`), mock `isAdminUser` → `false` and give `auth.currentUser.uid`.

**Analog 1 — mock-the-observability-bridge pattern** (`ErrorBoundary.test.js:1-10`, copy verbatim shape):
```javascript
import React from 'react';
import { render, screen } from '@testing-library/react';
import { captureError } from '../utils/observability';

// Mock the observability bridge so the test asserts on captureError without
// pulling @sentry/react into the component test at all.
jest.mock('../utils/observability', () => ({
  captureError: jest.fn()
}));
```

**Analog 2 — assert-on-captureError-call pattern** (`ErrorBoundary.test.js:28-34`):
```javascript
expect(captureError).toHaveBeenCalledTimes(1);
const [thrownError, context] = captureError.mock.calls[0];
expect(thrownError).toBeInstanceOf(Error);
expect(context).toEqual(
  expect.objectContaining({ componentStack: expect.any(String) })
);
```
For DATA-02 the context assertion becomes (per RESEARCH.md:105):
```javascript
expect(context).toEqual(
  expect.objectContaining({ feature: 'analytics-index-fallback', collectionName: 'deals' })
);
```

**Analog 3 — DO-NOT-auto-mock @sentry note + factory rationale** (`observability.test.js:4-12`): explicit factory mock only; auto-mock breaks on the Sentry export shape ("Failed to get mock metadata"). Here we mock the LOCAL `../utils/observability` module (like ErrorBoundary.test.js), which sidesteps Sentry entirely — even cleaner.

**What this test must additionally mock (NOT in either analog — new to this test; component imports at `AnalyticsDashboard.js:1-7`):**
- `firebase/firestore` — make the FIRST `getDocs` reject with `{ code: 'failed-precondition' }` (or an Error whose message matches `/index/i`) and the SECOND `getDocs` resolve with docs (`{ docs: [{ id, data: () => ({...}) }] }`). Stub `collection`, `query`, `where`, `orderBy` as identity/no-op fns.
- `../firebase` — export `db` (any object) and `auth` (`{ currentUser: { uid: 'test-uid' } }`).
- `../utils/helpers` — `isAdminUser: jest.fn(() => false)` to force the userId-scoped fallback branch (`userScoped: true`).
- `recharts` — optional; heavy. Can stub chart components to `() => null` to keep render light (component renders charts once data resolves).

**Render harness (component calls `useToast()` at `AnalyticsDashboard.js:10`):** wrap in `ToastProvider` — exported from `src/components/Toast.js:44` (named) and `:171` (default). Example:
```javascript
import { ToastProvider } from './Toast';
render(<ToastProvider><AnalyticsDashboard /></ToastProvider>);
```

**Assertions (DATA-02 acceptance):**
1. `captureError` called with `expect.objectContaining({ feature: 'analytics-index-fallback', collectionName: 'deals' })`.
2. The second (equality-only) `getDocs` was invoked → fallback still returns data (use `await waitFor(...)` since load is async in `useEffect`).

**Run command (targeted, per RESEARCH.md:279):**
```
CI=true npx react-scripts test --watchAll=false src/components/AnalyticsDashboard
```

---

### INLINE_RUNTIME_CHUNK location (config, build-time, NET-NEW/EDIT) — INFRA-03

See the fully-resolved **"`.env.production` vs `.gitignore`"** section above. Analog is the self `package.json` `scripts` block (`package.json:28-31`). Recommended = PATH A (edit `build` script). This is a hard prerequisite for CSP `script-src 'self'` cleanliness (RESEARCH.md Pitfall 1).

---

### `vercel.json` (config, edge headers, EDIT) — INFRA-03 CSP allowlist fixes

**Analog:** self — extend the existing `Content-Security-Policy-Report-Only` value at `vercel.json:36` (inside the `/(.*)` header block, lines 27-38). Keep it Report-Only this phase (enforcement is Phase 8).

**Exact current header value (`vercel.json:36`) — the string to edit:**
```
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https: https://images.unsplash.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://api.cloudinary.com https://res.cloudinary.com https://*.ingest.sentry.io; worker-src 'self' blob:; child-src 'self' blob:; frame-src 'self' https://accounts.google.com; media-src 'self' blob: https:; form-action 'self'; report-uri /api/csp-report; report-to csp-endpoint
```

**Directive-by-directive edits (the three highest-probability holes from RESEARCH.md:140-153):**

1. **`script-src`** — currently `script-src 'self'`. Google sign-in (`signInWithPopup`) loads `https://apis.google.com/js/api.js`. Add `https://apis.google.com`:
   ```
   script-src 'self' https://apis.google.com
   ```

2. **`connect-src` / `frame-src`** — Firebase authDomain `rems-app-44205.firebaseapp.com` (from `src/firebase.js`) is used as an auth handler iframe. Add `https://*.firebaseapp.com` to BOTH `connect-src` and `frame-src`:
   ```
   connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://api.cloudinary.com https://res.cloudinary.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.firebaseapp.com
   frame-src 'self' https://accounts.google.com https://*.firebaseapp.com
   ```

3. **Sentry ingest region host** — current `https://*.ingest.sentry.io` matches `oNNN.ingest.sentry.io` but NOT region-specific `oNNN.ingest.us.sentry.io`. Add `https://*.ingest.us.sentry.io` to `connect-src` (shown folded into #2 above). Both the analytics-fallback `captureError` AND the CSP reporter's own ingest depend on this host resolving.

**Sequencing caveat (RESEARCH.md Pitfall 3):** these are the *known* Google-sign-in + Sentry-region candidates that CLAUDE.md's "do not break Google sign-in" makes worth pre-adding. Do NOT blindly widen further — let the Report-Only soak surface the rest, then tighten. Confirm the live `REACT_APP_SENTRY_DSN` host before finalizing the Sentry region entry (may be `.us.` or `.de.`).

---

## Shared Patterns

### Missing-index detection (reuse, do NOT reinvent)
**Source:** `src/components/AnalyticsDashboard.js:63`
**Apply to:** any new fallback path (none planned this phase — noted so the planner doesn't hand-roll a second detector)
```javascript
if ((error?.code === 'failed-precondition') || /index/i.test(String(error?.message || ''))) {
```

### Client error → Sentry (reuse the bridge, never call Sentry directly)
**Source:** `src/utils/observability.js` (`captureError`), imported at `AnalyticsDashboard.js:7`
**Apply to:** the DATA-02 test subject; any future component error reporting. DSN-gated no-op, uniform `{ extra }` shape, already unit-tested in `observability.test.js`.

### Component test harness (mock local module + @testing-library render)
**Source:** `src/components/ErrorBoundary.test.js:1-10, 22-34`
**Apply to:** `AnalyticsDashboard.test.js`. Mock `../utils/observability` with a `jest.fn()` factory; render with `@testing-library/react`; assert on `captureError.mock.calls`. Never auto-mock `@sentry/react` (`observability.test.js:4-6`).

---

## No Analog Found

None. Every code/config deliverable has an in-repo analog (the two net-new items are a test with two strong test analogs, and a build-config edit whose analog is the self `package.json`/`vercel.json`).

## Verify-Only (self-analog — CONFIRM, do NOT edit)

| File | Requirement | State | Confirm action (no code change) |
|------|-------------|-------|-------------------------------|
| `firestore.indexes.json` | DATA-01 | 15 defs present; complete coverage of every non-admin where+orderBy query (RESEARCH.md:52-79) | Operator confirms each index READY in Firebase Console (or `firebase deploy --only firestore:indexes`) — LIVE half, no git change |
| `vercel.json` cache headers (`:15-26`) | INFRA-02 | `/static/(.*)` → `immutable`; `/` + `/index.html` → `no-cache` already shipped | `curl -sI` post-deploy — no edit |

## LIVE Checkpoints (no code analog — human-verify, route to `human_needed`)

- **DATA-01 live:** all 15 composite indexes READY in Firebase Console (two-channel deploy; `firestore.indexes.json` does NOT deploy from git).
- **DATA-03 smoke:** non-admin test account completes Home, Deals, CRM, Properties, Tasks, Analytics with no index errors / no amber fallback banner. Gated on DATA-01 READY.
- **INFRA-02/03 live:** `curl -sI` confirms edge cache headers; deployed `index.html` has no inline runtime script (references `/static/js/runtime-*.js`).
- **CSP soak:** Report-Only header live (already in `vercel.json`) + violation reports actually arriving in Sentry via `api/csp-report.js`; confirm the flagged Google-sign-in / Sentry-region candidates.

## Metadata

**Analog search scope:** `src/components/`, `src/utils/`, repo root (`vercel.json`, `.gitignore`, `package.json`, `firestore.indexes.json`)
**Files scanned:** `AnalyticsDashboard.js`, `ErrorBoundary.test.js`, `observability.test.js`, `vercel.json`, `.gitignore`, `package.json`, `Toast.js` (exports), `firestore.indexes.json` (existence)
**Pattern extraction date:** 2026-07-13
