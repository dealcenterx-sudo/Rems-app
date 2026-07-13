# Phase 3: Observability - Pattern Map

**Mapped:** 2026-07-13
**Files analyzed:** 3 net-new test files + 5 shipped self-analogs (verify-only)
**Analogs found:** 3 / 3 (every net-new test file has an exact-harness analog in the repo)

> This is a **reconcile-and-verify + add-tests** phase (RESEARCH.md Gap #3, Wave 0). The shipped observability code (commit `dd6364a`) is the "self-analog" the tests characterize. No source edits — the only net-new production artifacts are three test files. This map gives the planner exact copy-from anchors for both (a) the established shipped patterns to assert against, and (b) the two test harnesses to clone.

## File Classification

| Net-New / Verified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------------|------|-----------|----------------|---------------|
| `src/utils/observability.test.js` *(new)* | test (unit) | event-driven | `src/utils/notifications.test.js` | exact (CRA Jest + `jest.mock`) |
| `src/components/ErrorBoundary.test.js` *(new)* | test (unit) | event-driven | `src/utils/notifications.test.js` / `permissions.test.js` | role-match (CRA Jest; module-mock) |
| `tests/api/withSentry.test.mjs` *(new)* | test (integration) | request-response | `tests/api/api-handlers.test.mjs` | exact (vitest + node-mocks-http + module-cache mock) |
| `src/utils/observability.js` *(verify)* | utility | event-driven | self (shipped) | n/a — subject under test |
| `api/_lib/withSentry.js` *(verify)* | middleware (wrapper) | request-response | self (shipped) | n/a — subject under test |
| `src/components/ErrorBoundary.js` *(verify)* | component (class) | event-driven | self (shipped) | n/a — subject under test |
| `src/index.js` *(verify)* | entry point | event-driven | self (shipped) | n/a — wiring assertion only |
| `src/reportWebVitals.js` *(verify)* | utility | event-driven | self (shipped) | n/a — wiring assertion only |

**Mock matrix (critical):**

| Test file | Runner | Mocks | Mock mechanism |
|-----------|--------|-------|----------------|
| `src/utils/observability.test.js` | CRA Jest (`test:ci`) | `@sentry/react` | `jest.mock('@sentry/react')` |
| `src/components/ErrorBoundary.test.js` | CRA Jest (`test:ci`) | `../utils/observability` (spy on `captureError`) | `jest.mock` or `jest.spyOn` |
| `tests/api/withSentry.test.mjs` | vitest (`test:api`) | `@sentry/node` | module-cache injection via `requireFromRoot.cache[...]` |

---

## Shipped Patterns to Assert Against (self-analogs)

### `src/utils/observability.js` (utility, event-driven) — SUBJECT of `observability.test.js`

**DSN gating no-op** (lines 10-21) — assert `Sentry.init` NOT called when DSN unset, called once when set:
```javascript
export const isSentryEnabled = () => Boolean(process.env.REACT_APP_SENTRY_DSN);

export const initObservability = () => {
  if (initialized || !isSentryEnabled()) return;   // clean no-op when unset
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.REACT_APP_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: parseSampleRate(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE)
  });
  initialized = true;   // module-level flag guards double-init
};
```
> Test note: `initialized` is module-scoped. To re-test the enabled path after a no-DSN test, use `jest.resetModules()` + `require` inside `jest.isolateModules`, or set the DSN *before* the first `initObservability()` call. The DSN is read via `process.env.REACT_APP_SENTRY_DSN` — set/delete it per test in `beforeEach`/`afterEach` (mirrors the API harness env-cleanup at `api-handlers.test.mjs:75-91`).

**captureError bridge** (lines 23-28) — assert `Sentry.captureException` called with `{ extra: context }` when enabled, no-op when disabled:
```javascript
export const captureError = (error, context = {}) => {
  if (!isSentryEnabled()) return;
  Sentry.captureException(error, { extra: context });
};
```

**captureWebVital → captureMessage** (lines 30-48) — OBS-03; assert `Sentry.captureMessage('Web Vital: <name>', { level:'info', tags, contexts })`, and no-op when `!metric` or DSN unset:
```javascript
export const captureWebVital = (metric) => {
  if (!isSentryEnabled() || !metric) return;
  Sentry.captureMessage(`Web Vital: ${metric.name}`, {
    level: 'info',
    tags: { web_vital: metric.name, rating: metric.rating || 'unknown' },
    contexts: { web_vital: { id: metric.id, name: metric.name, value: metric.value, delta: metric.delta } }
  });
};
```

### `api/_lib/withSentry.js` (middleware, request-response) — SUBJECT of `withSentry.test.mjs`

**Init gate + flush-before-respond** (lines 12-48) — the OBS-02 core; assert (a) no-DSN → pass-through no-op, (b) on thrown error with DSN set → `captureException` THEN `flush(2000)` THEN `res.status(500)` (order matters):
```javascript
const initSentry = () => {
  const dsn = process.env.SENTRY_DSN || process.env.REACT_APP_SENTRY_DSN;  // runtime-read (not build-inlined)
  if (initialized || !dsn) return false;
  Sentry.init({ dsn, environment: ..., tracesSampleRate: ... });
  initialized = true;
  return true;
};

const withSentry = (handler) => async (req, res) => {
  const enabled = initSentry();
  try {
    return await handler(req, res);
  } catch (error) {
    if (enabled) {
      Sentry.captureException(error, { tags: { api_route: req.url || req.query?.path || 'unknown' }, extra: { method: req.method } });
      await Sentry.flush(2000);   // drain async buffer before lambda freeze
    }
    if (!res.headersSent) return res.status(500).json({ error: 'Internal server error' });
    throw error;
  }
};
module.exports = { initSentry, withSentry };
```
> **Gap #1 (RESEARCH.md:82-88):** the wrapper only fires on *thrown* errors; wrapped handlers catch their own and return 500/502 without re-throwing, so the catch never runs for handled failures. The unit test must pass a handler that **throws** to exercise the capture/flush path. Assert call-order (e.g. via `vi.fn` call timestamps or a shared order-tracking array) so `flush` precedes the `res.status(500)` return.

### `src/components/ErrorBoundary.js` (component, event-driven) — SUBJECT of `ErrorBoundary.test.js`

**componentDidCatch → captureError bridge** (lines 20-23) — OBS-01; render a throwing child, assert `captureError` called with `{ componentStack }` and fallback UI shows:
```javascript
componentDidCatch(error, info) {
  captureError(error, { componentStack: info.componentStack });
  console.error('[ErrorBoundary]', error, info.componentStack);
}
```
> Mock `../utils/observability` so the test asserts `captureError` was called without needing a real `@sentry/react`. Suppress the expected React error log with a `console.error` spy (see `api-handlers.test.mjs:548` for the `console.warn`-spy precedent). Fallback UI (lines 27-45) renders `<PageState .../>` with title "Something went wrong" + a "Try again" button — assert on that text.

### `src/index.js` (entry point) + `src/reportWebVitals.js` (utility) — WIRING assertion only

`src/index.js:7,9,20` — assert the wiring exists: `initObservability()` runs at module load (line 9) and `reportWebVitals(captureWebVital)` is called (line 20). `reportWebVitals.js:1-11` uses the web-vitals **v2** API (`getCLS/getFID/getFCP/getLCP/getTTFB`) matching installed `^2.1.4`. A full render-time unit test of `index.js` is heavy (mounts the app); prefer asserting the `captureWebVital`→`captureMessage` contract in `observability.test.js` and treating the `index.js` hook as a static/wiring check (grep or a light import assertion).

---

## Test Harness Copy-From Anchors

### Client tests → copy from `src/utils/notifications.test.js` (runs under `test:ci`)

**Module-mock + reset pattern** (lines 1-17) — this is the exact shape for `observability.test.js` (swap `firebase`/`firebase/firestore` for `@sentry/react`):
```javascript
import { notifyUsers, dealRecipients } from './notifications';
import { addDoc } from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn()
}));

beforeEach(() => {
  // CRA jest resets mock implementations between tests; restore here.
  addDoc.mockImplementation(() => Promise.resolve());
});
```
> For `observability.test.js`: `jest.mock('@sentry/react')` (auto-mock — `init`/`captureException`/`captureMessage` become `jest.fn()`), `import * as Sentry from '@sentry/react'`, then assert on `Sentry.init`, `Sentry.captureException`, `Sentry.captureMessage`. Manage `process.env.REACT_APP_SENTRY_DSN` in `beforeEach`/`afterEach`. Use `jest.resetModules()` / `jest.isolateModules` to reset the module-level `initialized` flag between the disabled- and enabled-init cases.

**Assertion style** (`permissions.test.js:1-30`) — plain `describe`/`it` + `expect(...).toBe/.toEqual/.toMatchObject`; `jest.mock('../firebase', ...)` to keep the SDK out of unit tests. Same convention applies to `ErrorBoundary.test.js` (add `@testing-library/react` `render` — already a dep, used repo-wide).

### Server test → copy from `tests/api/api-handlers.test.mjs` (runs under `test:api`, vitest)

**Module-cache mock injection** (lines 1-45) — clone this for `withSentry.test.mjs`, but inject a mock `@sentry/node` instead of `firebaseAdmin`/`cloudinary`:
```javascript
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';

const requireFromRoot = createRequire(new URL('../../package.json', import.meta.url));
const sentryNodePath = requireFromRoot.resolve('@sentry/node');   // <-- new: resolve @sentry/node

const mockSentryNode = (exports) => {
  requireFromRoot.cache[sentryNodePath] = { id: sentryNodePath, filename: sentryNodePath, loaded: true, exports };
};
```
> Mirror `mockFirebaseAdmin` (lines 24-31) / `mockCloudinary` (33-40) exactly — same cache-object shape `{ id, filename, loaded: true, exports }`. Delete `requireFromRoot.cache[withSentryPath]` before each `require('./_lib/withSentry.js')` so the fresh mock is picked up (parallels `loadHandler`, lines 42-45). Mock exports should be `{ init: vi.fn(), captureException: vi.fn(), captureMessage: vi.fn(), flush: vi.fn(async () => true) }`.

**invoke() helper** (lines 47-59) — reuse verbatim to drive the wrapped handler through `node-mocks-http`:
```javascript
const invoke = async (handler, options = {}) => {
  const { req, res } = createMocks({ method: 'POST', headers: {}, body: {}, ...options });
  await handler(req, res);
  return { status: res._getStatusCode(), body: res._isJSON() ? res._getJSONData() : res._getData() };
};
```
> For `withSentry`: wrap a throwing handler — `const wrapped = withSentry(async () => { throw new Error('boom'); })` — then `await invoke(wrapped)` and assert `status === 500`, `Sentry.captureException` called, `Sentry.flush` called with `2000`, and flush ordered before the response. Also test a passing handler (no capture) and the no-DSN pass-through (returns handler result untouched, `Sentry.init`/`captureException` never called).

**Env-var cleanup** (lines 75-91) — copy the `beforeEach`/`afterEach` that `delete`s `process.env.SENTRY_DSN` / `REACT_APP_SENTRY_DSN` (already present at lines 83-84) and calls `vi.restoreAllMocks()` / clears the module cache. This is exactly the isolation `withSentry.test.mjs` needs to toggle the DSN-enabled vs no-op paths and reset the module-level `initialized` flag between cases.

---

## Shared Patterns

### DSN gating (no-op when unset)
**Source:** `src/utils/observability.js:10` + `api/_lib/withSentry.js:13`
**Apply to:** every test — the default env state has NO DSN, so the primary assertion in all three files is "clean no-op / pass-through, and `Sentry.*` never called." Set the DSN explicitly only in the enabled-path cases.
```javascript
// client: process.env.REACT_APP_SENTRY_DSN (build-inlined in prod, but a normal env read in Jest)
// server: process.env.SENTRY_DSN || process.env.REACT_APP_SENTRY_DSN (runtime read)
```

### Module-level `initialized` guard
**Source:** `observability.js:3,13,20` and `withSentry.js:5,14,21`
**Apply to:** both subjects double-init-guard via a module-scoped `initialized` boolean. Tests that assert "init called once" or that need both disabled+enabled paths MUST reset module state (`jest.resetModules()` for Jest; delete the module from `requireFromRoot.cache` for vitest) between cases.

### Env-cleanup in setup/teardown
**Source:** `tests/api/api-handlers.test.mjs:75-91`
**Apply to:** all three test files — `delete` the Sentry DSN env vars in `beforeEach`, restore mocks in `afterEach`, so no test leaks DSN state into another.

### Console-spy to silence expected error logs
**Source:** `api-handlers.test.mjs:548` (`vi.spyOn(console,'warn')`)
**Apply to:** `ErrorBoundary.test.js` (React logs caught render errors to `console.error`) and any withSentry throw test — spy/suppress to keep test output clean.

## No Analog Found

None. Every net-new file maps to an existing in-repo harness. (`ErrorBoundary.test.js` is the only "role-match rather than exact" case: no existing test renders a React component, but `@testing-library/react` is already a project dependency and the `jest.mock` + assertion conventions come directly from `notifications.test.js` / `permissions.test.js`.)

## Metadata

**Analog search scope:** `src/utils/*.test.js`, `tests/api/`, all shipped observability sources (`src/utils/observability.js`, `api/_lib/withSentry.js`, `src/components/ErrorBoundary.js`, `src/index.js`, `src/reportWebVitals.js`), `package.json` scripts + deps
**Files scanned:** ~12
**Pattern extraction date:** 2026-07-13
