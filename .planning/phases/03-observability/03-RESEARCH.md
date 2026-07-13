# Phase 3: Observability - Research

**Researched:** 2026-07-13
**Domain:** Error/performance monitoring (Sentry) reconciliation for a React 19 CRA + Vercel serverless app
**Confidence:** HIGH (code characterization) / MEDIUM (external verification split)

## Summary

Phase 3 is a **reconciliation/characterization** phase, not greenfield. The observability code was already shipped by a prior automated run (commit `dd6364a`, "feat: complete saas professionalization upgrade"). All the moving parts exist: client init (`src/utils/observability.js`), a serverless wrapper (`api/_lib/withSentry.js`) applied to all six API handlers, the `ErrorBoundary`→Sentry bridge, web-vitals reporting wired in `src/index.js`, and `@sentry/react` + `@sentry/node` v10 deps. The job is to (a) characterize what exists, (b) identify the gap between shipped code and the three success criteria, and (c) — most importantly — split acceptance into what is **verifiable locally/statically** vs what **requires a live Sentry DSN + a deployed production build**.

The critical, non-obvious finding is an **OBS-02 coverage gap**: `withSentry` only reports errors the handler *throws*, but every wrapped handler catches its own errors internally and returns `res.status(500)/502` **without re-throwing**. As wired, gracefully-handled serverless failures never reach Sentry — only truly uncaught throws do. The planner must decide whether the OBS-02 smoke test triggers an uncaught throw (accepting current semantics) or whether catch blocks get instrumented.

The second key finding matches the Phase 1/2 pattern: the three success criteria are all phrased as "appears in Sentry [in production]," which **cannot be observed in this environment** (no DSN is configured, no production deploy). Just as Phase 2 split the emulator run (Java 21) into CI/human verification, Phase 3 must split each criterion into a locally-automatable **code-wiring** assertion and a production **event-landing** assertion gated behind a live DSN.

**Primary recommendation:** Plan this phase as *verify-and-reconcile*, not build. Automate the code-wiring half (init gating no-op, ErrorBoundary bridge, flush-before-respond, web-vitals hook wired, no-DSN keeps lint/test/build green) with unit tests that mock `@sentry/*`. Explicitly mark the three "event lands in Sentry" criteria as Manual/CI verification requiring `REACT_APP_SENTRY_DSN` + `SENTRY_DSN` set in Vercel and a deployed build. Resolve the OBS-02 throw-vs-catch semantics with the user before locking acceptance.

## Project Constraints (from CLAUDE.md / .claude/CLAUDE.md)

- **No framework migration** — React 19 + CRA (react-scripts 5) + Firebase + Cloudinary + Vercel stay as-is.
- **Backward-compatible only** — do not break Google sign-in or email/password auth; do not remove production workflows without approval.
- **No secrets in code or docs** — document env var *names* only, never values. The Sentry DSN is a client-embeddable identifier (not a secret) but still lives in Vercel env, never hardcoded.
- **Build + lint + tests before shipping** — `npm run build`, `npm run lint`, `npm run test:ci` must stay green. Per-phase merge to `main` auto-deploys production, so `main` must stay shippable.
- **Design tokens** — use `var(--…)` tokens, not raw hex (relevant only if any observability UI is touched; `ErrorBoundary` already uses `PageState`).
- **GSD workflow enforcement** — no direct edits outside a GSD workflow.
- **Docs sync** — new env vars must be appended to `docs/ENVIRONMENT.md` before the phase is considered complete (already done for all Sentry vars — see below).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OBS-01 | Production client errors captured in Sentry (init gated on `REACT_APP_SENTRY_DSN`; ErrorBoundary bridged), verified with a real production error | Code exists and is correctly wired (`observability.js` `initObservability`/`isSentryEnabled`, `ErrorBoundary.componentDidCatch`→`captureError`→`Sentry.captureException`). Gating verifiable locally; "real production error appears" needs live DSN + deploy. |
| OBS-02 | Serverless function errors captured via a `withSentry` wrapper that flushes before responding | `withSentry` awaits `Sentry.flush(2000)` before responding in its catch block (correct per Vercel freeze best practice). **Gap:** wrapper only catches *thrown* errors; all handlers swallow their own errors and return 500/502 without re-throwing. Flush-before-respond verifiable locally; event-landing needs live DSN + deploy + an actually-uncaught error. |
| OBS-03 | Web-vitals metrics flow to Sentry from the existing `web-vitals` dependency | `src/index.js` calls `reportWebVitals(captureWebVital)`; `captureWebVital` emits `Sentry.captureMessage` per metric. Hook-wiring verifiable locally; metrics appearing in Sentry needs live DSN + deploy. Note: sent as info-level **messages/Issues**, not Sentry Performance metrics. |
</phase_requirements>

> No CONTEXT.md exists for this phase (`has_context: false`). No locked decisions to honor beyond CLAUDE.md and the roadmap success criteria. The planner should route the OBS-02 throw-vs-catch question and the local-vs-production acceptance split through `/gsd-discuss-phase` or a `checkpoint:human-verify` before locking.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Client error capture (React render + async) | Browser / Client | — | `@sentry/react` runs in the SPA; `ErrorBoundary` catches render errors, `captureError` handles manual/async |
| Client init gating | Build-time client | — | `REACT_APP_SENTRY_DSN` is inlined at CRA build; `isSentryEnabled()` compiles to a constant no-op when unset |
| Serverless error capture | API / Backend (Vercel functions) | — | `@sentry/node` + `withSentry` wrapper; DSN read at runtime from `SENTRY_DSN`/`REACT_APP_SENTRY_DSN` |
| Flush-before-freeze | API / Backend | — | Lambda freezes on response; `await Sentry.flush()` must drain the async buffer before returning |
| Web-vitals reporting | Browser / Client | — | `web-vitals` measures in-browser; `reportWebVitals(captureWebVital)` forwards to Sentry |
| Event ingestion + display | External (Sentry SaaS) | CDN egress | Events leave via `https://*.ingest.sentry.io` (already CSP-whitelisted in `connect-src`) |

## Current State Inventory (shipped code characterization)

> This phase reconciles existing code. This table is the ground truth the planner verifies against.

| Artifact | What it does | Wiring status | Notes / gap |
|----------|-------------|---------------|-------------|
| `src/utils/observability.js` | `isSentryEnabled()` (DSN presence), `initObservability()`, `captureError()`, `captureWebVital()` | ✅ Correct | Every function early-returns when `!isSentryEnabled()` → clean no-op. `initialized` flag guards double-init. `parseSampleRate` clamps to [0,1], default 0. |
| `src/index.js` | Calls `initObservability()` at module load; `reportWebVitals(captureWebVital)` at end | ✅ Correct | Init runs before render. Web-vitals hook is wired. |
| `src/components/ErrorBoundary.js` | `componentDidCatch` → `captureError(error, { componentStack })` + `console.error` | ✅ Bridged | Class component; forwards to Sentry via `captureError`→`Sentry.captureException`. |
| `src/reportWebVitals.js` | Dynamic-imports `web-vitals`, calls `getCLS/getFID/getFCP/getLCP/getTTFB(onPerfEntry)` | ✅ Correct | Uses **web-vitals v2 API** (matches installed `^2.1.4`). Fires `captureWebVital` per metric. |
| `api/_lib/withSentry.js` | Wraps handler; on thrown error → `captureException` + **`await Sentry.flush(2000)`** → then 500 | ⚠️ Partial | Flush-before-respond is correct. **Only catches thrown errors** (see Gap #1). DSN = `SENTRY_DSN \|\| REACT_APP_SENTRY_DSN`, runtime-read. |
| All 6 API handlers | `send-email`, `accept-invite`, `lead-intake`, `health`, `delete-media`, `csp-report` all export `withSentry(handler)` | ⚠️ See Gap #1 | Each has an internal top-level try/catch returning 500/502 **without re-throwing** → their handled errors never reach the wrapper's catch. |
| `src/components/AnalyticsDashboard.js` | Missing-index fallback calls `captureError(...)` | ✅ Pre-shipped | This is **DATA-02 (Phase 5)** groundwork already present; out of Phase 3 scope but proves the client capture path is used. |
| `vercel.json` CSP | `connect-src` includes `https://*.ingest.sentry.io` | ✅ Present | Report-Only today; no CSP blocker for Sentry ingest. |
| `package.json` | `@sentry/react ^10.63.0`, `@sentry/node ^10.63.0`, `web-vitals ^2.1.4` | ✅ Installed | Already present; no new install needed. |
| `docs/ENVIRONMENT.md` | Documents all 6 Sentry env var names + purpose + consumer + scope | ✅ Complete | `REACT_APP_SENTRY_DSN/ENVIRONMENT/TRACES_SAMPLE_RATE` (build-time client) + `SENTRY_DSN/ENVIRONMENT/TRACES_SAMPLE_RATE` (runtime server). |

## Local-vs-Production Verification Split (the crux of this phase)

Mirrors the Phase 2 pattern (emulator/Java-21 → CI/human). Each success criterion decomposes into a **code-wiring** half (automatable here, no DSN) and an **event-landing** half (needs live DSN + deployed build; **not observable in this environment**).

| SC | Code-wiring half — AUTOMATABLE LOCALLY/STATICALLY | Event-landing half — HUMAN/CI, needs live DSN + prod deploy |
|----|----------------------------------------------------|--------------------------------------------------------------|
| OBS-01 | `isSentryEnabled()` is false and `Sentry.init` is NOT called when `REACT_APP_SENTRY_DSN` unset (no-op); `ErrorBoundary.componentDidCatch` calls `captureError`→`Sentry.captureException`; when DSN set (mocked), `initObservability` calls `Sentry.init` once | A deliberately-triggered production client error actually appears as an Issue in the Sentry project |
| OBS-02 | `withSentry` awaits `Sentry.flush()` **before** `res.status(500)` returns (assert call order on a mocked `@sentry/node`); wrapper calls `captureException` on a thrown error; no-DSN → wrapper is a pass-through no-op | A serverless error actually appears in Sentry (**requires an uncaught throw** — see Gap #1) after deploy with `SENTRY_DSN` set |
| OBS-03 | `reportWebVitals(captureWebVital)` is wired in `index.js`; `captureWebVital` calls `Sentry.captureMessage` with metric tags/contexts; no-op when DSN unset | Web-vitals messages actually appear in the Sentry project from the live app |
| (cross-cutting) | **No-DSN path keeps `npm run lint` + `npm run test:ci` + `npm run build` green** (this is the default state of this environment — no DSN configured) | N/A |

**Why the event-landing half cannot be done here:** No `REACT_APP_SENTRY_DSN` / `SENTRY_DSN` is configured in this environment, and Vercel deploys production from `main`. Observing an event in a Sentry project requires (1) a real DSN in Vercel build+runtime env, and (2) a deployed build. Recommend documenting these as `checkpoint:human-verify` items with an exact repro (e.g., a temporary throw route, or the browser console `throw`), exactly as Phase 2 delegated the emulator pass to CI/human.

## Gap Analysis (shipped code vs success criteria)

### Gap #1 — CRITICAL: `withSentry` only reports *thrown* errors; handlers swallow theirs (OBS-02)
**What:** `withSentry` wraps `await handler(req,res)` in try/catch and only `captureException`+flushes when the handler **throws**. But `accept-invite.js` (`catch → res.status(500)`), `lead-intake.js` (`catch → res.status(500)`), and `send-email.js` (`catch → res.status(502)`) all catch their own errors and return a response **without re-throwing**. Those errors resolve the promise normally, so the wrapper's catch never fires and Sentry sees nothing.
**Impact:** OBS-02's "a serverless function error appears in Sentry" is only satisfied for **truly uncaught** errors (e.g., a throw outside/before the handler's try, a middleware throw, or an unexpected synchronous error). A smoke test that hits a normal error path (bad payload, provider 502) will NOT produce a Sentry event.
**Planner decision (route to user):**
  - **Option A (minimal, matches "wrapper" wording):** Accept current semantics. OBS-02 smoke test deliberately triggers an *uncaught* throw (temporary test route or forced throw). Document that gracefully-handled 500s are intentionally not reported in v1.
  - **Option B (fuller coverage):** Instrument each handler's catch block to call a shared `captureException` (like `AnalyticsDashboard` does client-side for DATA-02) before returning 500/502. Larger change; touches all handlers; must keep 400/401/405 validation paths *un*-reported (those are client errors, not regressions).
**Recommendation:** Option A for Phase 3 (the requirement literally says "via a `withSentry` wrapper that flushes before responding" — which is satisfied), and note Option B as a candidate for the Phase 5 "loud not silent" theme (DATA-02 already establishes the pattern). `[ASSUMED]` — confirm with user.

### Gap #2 — Web-vitals arrive as Issues/messages, not Performance metrics (OBS-03)
**What:** `captureWebVital` uses `Sentry.captureMessage(\`Web Vital: ${name}\`, { level: 'info', tags, contexts })`. This makes vitals visible in Sentry's **Issues** stream as info-level events, not in the Performance/Web Vitals dashboard (which needs `browserTracingIntegration` + `tracesSampleRate > 0`).
**Impact:** OBS-03 ("web-vitals metrics visible in Sentry") is satisfied *literally* — they are visible — but not as native performance metrics. `tracesSampleRate` defaults to 0, so no tracing.
**Recommendation:** Accept as-is for v1 (matches shipped code and the requirement wording). Note the tradeoff. Native Web Vitals via tracing is a possible v2 enhancement (aligns with v2-05 deferral of source-map upload).

### Gap #3 — No unit tests exist for the observability code (Wave 0)
**What:** No `*.test.js` covers `observability.js`, `withSentry.js`, or the `ErrorBoundary`→Sentry bridge. The only automatable acceptance (the code-wiring half above) currently has zero test coverage.
**Impact:** The "green build/lint/test with no DSN" claim is true today but unguarded against regression.
**Recommendation:** Wave 0 — add unit tests mocking `@sentry/react` and `@sentry/node` (see Validation Architecture). These are the primary automatable deliverable of this phase.

### Gap #4 — `web-vitals` v2 API; `getFID` deprecated (minor, out of scope)
**What:** `reportWebVitals.js` uses v2 names (`getCLS/getFID/...`). In web-vitals v4+, FID was removed in favor of INP and functions renamed (`onCLS/onINP/...`). Installed version is `^2.1.4`, so the code is internally consistent and works.
**Impact:** None for Phase 3. A web-vitals major upgrade would be a separate, breaking change — out of scope (no framework/dep churn mandated).

## Environment / Config Behavior (must document for planner)

### CRA build-time inlining — the gating subtlety
`REACT_APP_*` vars are **inlined at build time** by react-scripts, not read at runtime. `[VERIFIED: reactjs docs / CRA behavior, cross-checked with observability.js]`
- If `REACT_APP_SENTRY_DSN` is **unset at build**, `process.env.REACT_APP_SENTRY_DSN` compiles to `undefined` → `isSentryEnabled()` is a constant `false` → `Sentry.init` is never called → **clean no-op** (the current state of this environment). `[VERIFIED: observability.js:10-13]`
- To enable client Sentry, the DSN must be set as a **Vercel build-time env var** (available to the build), not just a runtime secret.

### Server-side — runtime-read
`api/_lib/withSentry.js` reads `SENTRY_DSN || REACT_APP_SENTRY_DSN` at **runtime** (Vercel serverless functions read `process.env` on invocation). `[VERIFIED: withSentry.js:13]` No build inlining needed server-side; set `SENTRY_DSN` as a runtime env var in Vercel.

### Env vars (all already documented in `docs/ENVIRONMENT.md`)
| Variable | Scope | Required? | Purpose |
|----------|-------|-----------|---------|
| `REACT_APP_SENTRY_DSN` | Build-time client | Optional | Enables client Sentry; unset = disabled no-op |
| `REACT_APP_SENTRY_ENVIRONMENT` | Build-time client | Optional | Environment label (falls back to `NODE_ENV`) |
| `REACT_APP_SENTRY_TRACES_SAMPLE_RATE` | Build-time client | Optional | 0–1, defaults 0 |
| `SENTRY_DSN` | Runtime server | Optional | Enables serverless Sentry; unset = disabled no-op |
| `SENTRY_ENVIRONMENT` | Runtime server | Optional | Environment label (falls back to `NODE_ENV`/`production`) |
| `SENTRY_TRACES_SAMPLE_RATE` | Runtime server | Optional | 0–1, defaults 0 |

**No new env vars need to be added.** The planner should verify these entries stay accurate, not create them.

### CSP is not a blocker
`vercel.json` `connect-src` already whitelists `https://*.ingest.sentry.io` (Content-Security-Policy-Report-Only). `[VERIFIED: vercel.json:36]` Sentry ingest will not be CSP-blocked once a DSN is configured.

## Package Legitimacy Audit

> Reconciliation phase — all packages **already installed** via commit `dd6364a`. No new installs required. Verdicts below are for completeness.

| Package | Registry | Age (latest publish) | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|----------------------|-----------|-------------|---------|-------------|
| `@sentry/react` | npm | latest patch 2026-07-10 | ~20.0M/wk | github.com/getsentry/sentry-javascript | SUS (false-positive) | Approved — already installed |
| `@sentry/node` | npm | latest patch 2026-07-10 | ~22.6M/wk | github.com/getsentry/sentry-javascript | SUS (false-positive) | Approved — already installed |
| `web-vitals` | npm | 2026-05-28 | ~22.9M/wk | github.com/GoogleChrome/web-vitals | OK | Approved — already installed |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** `@sentry/react`, `@sentry/node` — the `too-new` flag fired on the most-recent patch publish date (days old), a known false positive for actively-maintained packages. Both are the official `getsentry/sentry-javascript` packages with 20M+ weekly downloads, `deprecated: false`, `postinstall: null`, and are **already installed and in production**. No `checkpoint:human-verify` needed since no install occurs in this phase; if the planner adds a version bump, gate it.

## Common Pitfalls

### Pitfall 1: Treating "appears in Sentry" as locally verifiable
**What goes wrong:** Planning tasks that assert an event lands in Sentry without a DSN/deploy. It cannot be observed here.
**How to avoid:** Split every criterion per the Local-vs-Production table. Automate the code-wiring half; mark event-landing as `checkpoint:human-verify`.
**Warning signs:** A task whose verification command has no way to produce output without network egress to Sentry.

### Pitfall 2: Assuming the OBS-02 smoke test will produce an event
**What goes wrong:** Triggering a normal error path (400/500 from a handler's own catch) and expecting Sentry to capture it — it won't (Gap #1).
**How to avoid:** The serverless smoke test must trigger an **uncaught** throw, or the acceptance is vacuous.
**Warning signs:** "Error returned a 500 in prod but nothing in Sentry" — that's the handler swallowing it, not a Sentry misconfig.

### Pitfall 3: Setting the DSN as a runtime-only var and expecting the client to report
**What goes wrong:** Client Sentry stays disabled because `REACT_APP_SENTRY_DSN` was not present at **build** time.
**How to avoid:** Set client DSN as a build-time env var in Vercel and rebuild/redeploy; server DSN can be runtime-only.

### Pitfall 4: Missing the flush and losing serverless events
**What goes wrong:** Removing/awaiting-incorrectly the `Sentry.flush(2000)` — the lambda freezes and the async buffer dies. `[VERIFIED: getsentry discussion #4959, Vercel docs]`
**How to avoid:** Keep `await Sentry.flush(timeout)` before returning on any event-producing path. Current code does this in the catch block.

## Code Examples

### Verified: flush-before-respond on Vercel (shipped, correct)
```javascript
// Source: api/_lib/withSentry.js — matches getsentry discussion #4959 guidance
const withSentry = (handler) => async (req, res) => {
  const enabled = initSentry();
  try {
    return await handler(req, res);
  } catch (error) {
    if (enabled) {
      Sentry.captureException(error, { tags: { api_route: req.url || 'unknown' }, extra: { method: req.method } });
      await Sentry.flush(2000); // drain async buffer before lambda freeze
    }
    if (!res.headersSent) return res.status(500).json({ error: 'Internal server error' });
    throw error;
  }
};
```

### Verified: build-time-gated client init no-op (shipped, correct)
```javascript
// Source: src/utils/observability.js
export const isSentryEnabled = () => Boolean(process.env.REACT_APP_SENTRY_DSN); // inlined at CRA build
export const initObservability = () => {
  if (initialized || !isSentryEnabled()) return; // clean no-op when DSN unset
  Sentry.init({ dsn: process.env.REACT_APP_SENTRY_DSN, environment: ..., tracesSampleRate: ... });
  initialized = true;
};
```

### Suggested Wave 0 test shape (mock the SDK, assert wiring)
```javascript
// Assert init is a no-op with no DSN, and captureException fires on error — no live DSN needed.
jest.mock('@sentry/react');
// delete process.env.REACT_APP_SENTRY_DSN → initObservability() → expect(Sentry.init).not.toHaveBeenCalled()
// set DSN → initObservability() → expect(Sentry.init).toHaveBeenCalledTimes(1)
// captureError(new Error('x')) with DSN set → expect(Sentry.captureException).toHaveBeenCalled()
```

## Validation Architecture

> `nyquist_validation` key not explicitly false in config → treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest via react-scripts (client, `roots=src/`) + node --test / vitest-style harness under `tests/` for API (`npm run test:api`) |
| Config file | `package.json` (`.eslintConfig` + CRA Jest defaults); `tests/` isolated from CRA per Phase 2 |
| Quick run command | `CI=true npm run test:ci` (client unit tests) |
| Full suite command | `npm run lint && CI=true npm run test:ci && npm run test:api && npm run build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OBS-01 | Init no-op when DSN unset; init once when set; ErrorBoundary→captureException bridge | unit (mock `@sentry/react`) | `CI=true npm run test:ci` | ❌ Wave 0 |
| OBS-01 | Real production client error lands in Sentry | manual/CI | (deploy + trigger) | N/A — human-verify |
| OBS-02 | `withSentry` awaits `flush` before responding; captureException on throw; no-DSN pass-through | unit (mock `@sentry/node`) | `npm run test:api` | ❌ Wave 0 |
| OBS-02 | Real serverless (uncaught) error lands in Sentry | manual/CI | (deploy + trigger uncaught throw) | N/A — human-verify |
| OBS-03 | `reportWebVitals(captureWebVital)` wired; `captureWebVital`→`captureMessage`; no-op w/o DSN | unit | `CI=true npm run test:ci` | ❌ Wave 0 |
| OBS-03 | Web-vitals messages appear in Sentry | manual/CI | (deploy + observe) | N/A — human-verify |
| (all) | No-DSN path keeps lint+test+build green | smoke | full suite command above | ✅ (default env state) |

### Sampling Rate
- **Per task commit:** `CI=true npm run test:ci` (client) or `npm run test:api` (server)
- **Per wave merge:** full suite command
- **Phase gate:** full suite green before `/gsd-verify-work`; production event-landing items carried as documented human-verify checkpoints (Phase 1/2 precedent)

### Wave 0 Gaps
- [ ] `src/utils/observability.test.js` — covers OBS-01 (init gating, captureError) + OBS-03 (captureWebVital), mocking `@sentry/react`
- [ ] `src/components/ErrorBoundary.test.js` — covers OBS-01 bridge (`componentDidCatch`→`captureError`)
- [ ] `tests/api/withSentry.test.mjs` — covers OBS-02 (flush-before-respond ordering, captureException on throw, no-DSN pass-through), mocking `@sentry/node`
- [ ] Confirm mocking `@sentry/*` does not disturb CRA Jest isolation (Phase 2 invariant: client tests under `src/`, API tests under `tests/`)

## Security Domain

> `security_enforcement` not disabled → included. Observability is low-surface; the relevant concern is not leaking data into Sentry and treating the DSN correctly.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V7 Error Handling & Logging | yes | Errors go to Sentry, not the client (handlers return generic messages: "Internal server error"); no stack traces leaked to users |
| V8 Data Protection / Privacy | yes | Ensure PII (emails, tokens, payloads) isn't over-captured in `extra`/`contexts`. `withSentry` sends `method` + `api_route` only; client `captureError` sends `componentStack`. Verify no auth tokens/secrets land in Sentry payloads. |
| V6 Cryptography | no | N/A |
| V5 Input Validation | no (Phase 4 owns SEC-01) | N/A here |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Sensitive data leakage into error payloads | Information Disclosure | Keep `extra`/`contexts` minimal; do not attach request bodies, headers, or tokens; DSN is client-embeddable (not a secret) but keep it in env |
| Generic 500s already returned to client | Info Disclosure (mitigated) | Handlers return `{ error: 'Internal server error' }` — no internals leaked; Sentry gets the detail server-side |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | OBS-02 is satisfied by the wrapper catching *uncaught* throws (Option A), and gracefully-handled 500s not being reported is acceptable for v1 | Gap #1 | If user expects all handler failures in Sentry, catch blocks must be instrumented (larger change) — reframe acceptance before locking |
| A2 | Web-vitals-as-`captureMessage` (Issues, not Performance metrics) satisfies OBS-03 "visible in Sentry" | Gap #2 | If native Performance/Web-Vitals dashboard is required, needs `browserTracingIntegration` + `tracesSampleRate>0` — a real code change |
| A3 | The event-landing half of all 3 criteria will be verified as human/CI checkpoints post-deploy with a real DSN (matching Phase 1/2 precedent) | Local-vs-Prod split | If the phase gate demands local proof of events, it's un-satisfiable in this environment |
| A4 | No `REACT_APP_SENTRY_DSN`/`SENTRY_DSN` is configured in this environment (clean no-op is the current, intended state) | Env behavior | If a DSN is actually set somewhere at build, no-op assumption is wrong |

## Open Questions (RESOLVED)

> Both resolved by user-locked decisions at plan time: Q1 → Option A (verify the wrapper's uncaught-throw path; the handled-500s blind spot is logged as a finding in docs/SAAS_READINESS_AUDIT.md routed to Phase 5 / DATA-02 — no catch-block instrumentation this phase). Q2 → DSN provisioning + post-deploy smoke are human-verify checkpoints (plan 03-03, autonomous:false); the automatable code-wiring half is covered by Wave 0 unit tests.

1. **OBS-02 semantics — throw vs instrument (A1)** *(RESOLVED → Option A; gap logged for Phase 5 / DATA-02.)*
   - What we know: `withSentry` flushes correctly but only on thrown errors; handlers swallow their own.
   - What's unclear: Whether the user wants Option A (accept, smoke via uncaught throw) or Option B (instrument catch blocks).
   - Recommendation: Route to `/gsd-discuss-phase`; default to Option A, flag Option B as Phase 5 (DATA-02 "loud not silent") candidate.
2. **Who sets the production DSN and when?**
   - What we know: Client DSN is build-time; server DSN is runtime; both live in Vercel env.
   - What's unclear: Whether a Sentry project/DSN exists yet and who provisions it.
   - Recommendation: Make DSN provisioning + a post-deploy smoke a documented human-verify checkpoint; the phase can still pass its automatable code-wiring gate without it (Phase 1/2 precedent).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@sentry/react` | Client capture | ✓ | ^10.63.0 | — |
| `@sentry/node` | Serverless capture | ✓ | ^10.63.0 | — |
| `web-vitals` | OBS-03 | ✓ | ^2.1.4 | — |
| Node | Build/test | ✓ | engines 22.x (CI uses Node 24) | — |
| Live Sentry DSN | Event-landing verification (OBS-01/02/03 prod half) | ✗ | — | Document as human-verify checkpoint post-deploy (no local fallback) |
| Vercel production deploy | Event-landing verification | ✗ (not observable here) | — | CI/human verification after merge to `main` |

**Missing dependencies with no fallback:** Live Sentry DSN + production deploy — blocks only the *event-landing* half of acceptance, not the code-wiring half. Handle via documented human-verify checkpoints.
**Missing dependencies with fallback:** none additional.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@sentry/browser` manual + `Sentry.Handlers` | Unified `@sentry/react` / `@sentry/node` v8–v10 with functional integrations | Sentry v8 (2024) | Shipped code is v10; `init`/`captureException`/`captureMessage`/`flush` are stable across v7–v10 |
| web-vitals v2 `getCLS/getFID/...` | web-vitals v3 `onCLS/...`, v4 replaces FID with INP | v3 (2022), v4 (2024) | Installed v2 is consistent with `reportWebVitals.js`; upgrade is out of scope |

**Deprecated/outdated:**
- `getFID` / FID metric — superseded by INP in web-vitals v4. Not relevant while pinned to v2. Out of scope.

## Sources

### Primary (HIGH confidence)
- Shipped code, read directly this session: `src/utils/observability.js`, `api/_lib/withSentry.js`, `src/components/ErrorBoundary.js`, `src/index.js`, `src/reportWebVitals.js`, all 6 `api/*.js` handlers, `vercel.json`, `package.json`, `docs/ENVIRONMENT.md`
- `.planning/phases/02-test-scaffolding/02-VERIFICATION.md` — local-vs-CI/prod verification precedent
- `package-legitimacy check` seam output (npm registry signals)

### Secondary (MEDIUM confidence — websearch cross-checked with official sources)
- docs.sentry.io — React/Node usage + configuration/apis (captureException/captureMessage/flush/init surface) `[CITED: docs.sentry.io/platforms/javascript]`
- getsentry/sentry-javascript Discussion #4959 + Vercel docs — flush-before-freeze on serverless `[CITED: github.com/getsentry/sentry-javascript/discussions/4959]`
- CRA `REACT_APP_*` build-time inlining behavior `[CITED: create-react-app.dev / react docs]`

### Tertiary (LOW confidence)
- None relied upon.

## Metadata

**Confidence breakdown:**
- Current-state characterization: HIGH — all code read directly this session
- Gap analysis (esp. OBS-02): HIGH — confirmed by reading every wrapped handler's catch pattern
- Local-vs-prod split: HIGH — grounded in this environment's no-DSN state + Phase 1/2 precedent
- Sentry v10 API correctness: MEDIUM — websearch against official docs (context7 not fetched)
- Flush-before-freeze best practice: MEDIUM — official getsentry discussion + Vercel docs

**Research date:** 2026-07-13
**Valid until:** 2026-08-12 (stable; Sentry SDK v10 + pinned deps)
