---
phase: 03-observability
verified: 2026-07-13T05:25:30Z
status: human_needed
score: 12/16 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Provision REACT_APP_SENTRY_DSN as a Vercel BUILD-TIME env var, deploy, trigger a deliberate client render error under ErrorBoundary in production"
    expected: "A new client-error Issue appears in the Sentry project within ~1 min, carrying a componentStack for the ErrorBoundary path (OBS-01 event-landing)"
    why_human: "Requires a live Sentry DSN + production deploy; no DSN is provisioned in this environment and the agent has no production deploy access. Explicitly DEFERRED post-deploy by user decision."
  - test: "Provision SENTRY_DSN as a Vercel RUNTIME env var, deploy, trigger an UNCAUGHT throw in a withSentry-wrapped handler (outside the handler's own try/catch)"
    expected: "An Issue appears in Sentry with the api_route tag and method extra (OBS-02 event-landing). Handled 500s/502s are known NOT to appear — logged gap routed to Phase 5 / DATA-02."
    why_human: "Requires live SENTRY_DSN + deployed serverless function; cannot be observed without a DSN + deploy. Explicitly DEFERRED post-deploy by user decision."
  - test: "With REACT_APP_SENTRY_DSN set at build time and deployed, load/interact with the production app so web-vitals (CLS/FID/FCP/LCP/TTFB) are measured"
    expected: "Info-level events titled 'Web Vital: <name>' with web_vital tags/contexts appear in the Sentry Issues stream (OBS-03 event-landing)"
    why_human: "Requires live DSN + production deploy + real browser performance measurement. Explicitly DEFERRED post-deploy by user decision."
  - test: "Confirm the required env var NAMES are present in Vercel: REACT_APP_SENTRY_DSN (build-time client) and SENTRY_DSN (runtime server)"
    expected: "Both names configured in Vercel Project Settings -> Environment Variables (values never recorded in repo/docs)"
    why_human: "Vercel dashboard state is external to the repo and cannot be inspected programmatically."
---

# Phase 3: Observability Verification Report

**Phase Goal:** Every production regression from later phases is visible immediately — client errors, serverless errors, and performance metrics all flow to Sentry
**Verified:** 2026-07-13T05:25:30Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Context

This is a **reconcile-and-verify** phase. The Sentry production code shipped earlier in bulk commit `dd6364a`; this session added three NET-NEW characterization test files verifying the code-wiring, plus doc entries. Each of OBS-01/02/03 was deliberately SPLIT (user-locked decision) into:

- an **automatable code-wiring half** — verifiable now (and verified below via the two test suites)
- a **human-verify event-landing half** — a real event appearing in a Sentry project post-deploy, which CANNOT be verified here (no DSN provisioned, no production deploy access) and is **explicitly DEFERRED** by user decision.

Per that split, the correct terminal state is `human_needed` — NOT `passed` (event-landing unproven) and NOT `gaps_found` (the code-wiring half is fully verified and the deferral is the accepted, documented state).

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | `npm run test:ci` passes with the new client observability suites (OBS-01/OBS-03 code-wiring) | ✓ VERIFIED | Ran `CI=true react-scripts test --watchAll=false` → 42 passed, 5 suites; observability.test.js + ErrorBoundary.test.js among them (13 new tests) |
| 2 | With `REACT_APP_SENTRY_DSN` unset, `isSentryEnabled()` false, `initObservability()` no-ops, `captureError`/`captureWebVital` no-op — Sentry never touched | ✓ VERIFIED | observability.js:10,13,24,31 gate on `isSentryEnabled()`; observability.test.js:46-54,73-76,105-108 assert no-op; suite green |
| 3 | With DSN set, `initObservability()` calls `Sentry.init` exactly once (double-init guarded); `captureError(err,ctx)` → `captureException(err,{extra:ctx})` | ✓ VERIFIED | observability.js:12-21,23-28; observability.test.js:56-69 (init-once + guard), :78-93 (extra-context) — behavioral tests pass |
| 4 | `captureWebVital(metric)` → `captureMessage('Web Vital: <name>',{level:'info',tags,contexts})` when enabled; no-op when metric falsy or DSN unset (OBS-03) | ✓ VERIFIED | observability.js:30-48; observability.test.js:96-145 assert title/level/tags/contexts + both no-op guards; green |
| 5 | `ErrorBoundary.componentDidCatch` bridges caught render error to `captureError({componentStack})` and renders 'Something went wrong'/'Try again' fallback (OBS-01) | ✓ VERIFIED | ErrorBoundary.js:20-23,27-45; ErrorBoundary.test.js:18-43 renders throwing child, asserts bridge + fallback; green |
| 6 | `jest.mock('@sentry/react')` does not disturb CRA Jest isolation — full test:ci stays green | ✓ VERIFIED | Full suite 42/42 green with the mock present |
| 7 | `npm run test:api` passes with the new withSentry suite (OBS-02 code-wiring) | ✓ VERIFIED | Ran `vitest run tests/api` → 27 passed, 2 files (4 new in withSentry.test.mjs) |
| 8 | With no DSN, `withSentry` is a pass-through: handler result returned untouched; init/captureException/flush never called | ✓ VERIFIED | withSentry.js:25-29; withSentry.test.mjs:73-100 assert pass-through + zero Sentry calls; green |
| 9 | With `SENTRY_DSN` set + a THROWING handler: `captureException` then `await flush(2000)` then `res.status(500)` — flush-before-respond order | ✓ VERIFIED | withSentry.js:30-47; withSentry.test.mjs:102-137 assert `order === ['flush','respond']` via shared array + res.status spy — ordering invariant exercised by a passing behavioral test |
| 10 | With DSN set + a passing handler: NO captureException (wrapper fires only on thrown errors) | ✓ VERIFIED | withSentry.test.mjs:139-154 assert no capture; green |
| 11 | OBS-02 handled-500s blind spot logged in `docs/SAAS_READINESS_AUDIT.md`, routed to Phase 5 / DATA-02 | ✓ VERIFIED | SAAS_READINESS_AUDIT.md:98 — Medium finding citing withSentry.js + accept-invite/lead-intake/send-email, Status routes to Phase 5 / DATA-02 |
| 12 | Phase 3 verification outcome recorded in `docs/SAAS_UPGRADE_CHANGELOG.md` (AUDIT-03) | ✓ VERIFIED | SAAS_UPGRADE_CHANGELOG.md:589+ "Phase 3 - Observability Verification (AUDIT-03)" entry names all three test files, gate commands, OBS-02 gap routing, env var NAMES only |
| 13 | A production CLIENT error appears as an Issue in Sentry (OBS-01 event-landing) | ⏸ HUMAN (deferred) | Requires live DSN + deploy — DEFERRED post-deploy by user; see Human Verification #1 |
| 14 | An UNCAUGHT serverless throw appears as an Issue in Sentry (OBS-02 event-landing) | ⏸ HUMAN (deferred) | Requires live DSN + deploy — DEFERRED; see Human Verification #2 |
| 15 | Web-vitals captureMessage events appear in Sentry from the live app (OBS-03 event-landing) | ⏸ HUMAN (deferred) | Requires live DSN + deploy — DEFERRED; see Human Verification #3 |
| 16 | Required env var NAMES confirmed present in Vercel (REACT_APP_SENTRY_DSN build-time, SENTRY_DSN runtime) | ⏸ HUMAN (deferred) | Vercel dashboard external to repo — DEFERRED; see Human Verification #4 |

**Score:** 12/16 truths verified. 4 event-landing/config truths routed to human verification (deploy-gated, explicitly deferred by user — accepted terminal state).

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/utils/observability.test.js` | Client DSN-gating + captureError + captureWebVital suite | ✓ VERIFIED | 11 tests, all green; created in commit 605fa5f; wired via `import ./observability` |
| `src/components/ErrorBoundary.test.js` | componentDidCatch→captureError bridge + fallback UI | ✓ VERIFIED | 2 tests, green; commit 52778a2; renders real ErrorBoundary |
| `tests/api/withSentry.test.mjs` | Server no-DSN pass-through + flush-before-respond | ✓ VERIFIED | 4 tests, green; commit 0054a8d; requires real withSentry.js |
| `docs/SAAS_READINESS_AUDIT.md` | OBS-02 handled-500s finding routed to Phase 5 | ✓ VERIFIED | New Medium row at line 98 |
| `docs/SAAS_UPGRADE_CHANGELOG.md` | Phase 3 AUDIT-03 verification entry | ✓ VERIFIED | Entry at line 589+ |

### Subject-Under-Test Integrity (reconcile-and-verify guard)

| Production source | Last touched | Modified this session? |
| ----------------- | ------------ | ---------------------- |
| `src/utils/observability.js` | dd6364a (shipped) | No |
| `src/components/ErrorBoundary.js` | dd6364a (shipped) | No |
| `api/_lib/withSentry.js` | dd6364a (shipped) | No |

Confirms the phase RECONCILED-AND-VERIFIED shipped code without rewriting the subjects. `git status` shows no production source in the working tree.

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `src/index.js` | `observability.js` | `initObservability()` + `reportWebVitals(captureWebVital)` | ✓ WIRED | index.js:7,9,20 — init on boot, web-vitals forwarded |
| `ErrorBoundary.js` | `observability.js` | `captureError(error,{componentStack})` in componentDidCatch | ✓ WIRED | ErrorBoundary.js:2,21 |
| `api/*.js` (6 handlers) | `withSentry.js` | `withSentry(handler)` wrapper | ✓ WIRED | health, csp-report, accept-invite, send-email, delete-media, lead-intake all import withSentry |
| observability.test.js | `@sentry/react` | jest.mock factory | ✓ WIRED | Explicit factory mock (auto-mock incompatible) |
| withSentry.test.mjs | `@sentry/node` | requireFromRoot.cache injection | ✓ WIRED | Clones api-handlers harness |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Client observability suites pass | `CI=true react-scripts test --watchAll=false src/utils/observability.test.js src/components/ErrorBoundary.test.js` | 13 passed | ✓ PASS |
| Full CRA suite green (mock isolation) | `CI=true react-scripts test --watchAll=false` | 42 passed / 5 suites | ✓ PASS |
| Server withSentry suite passes | `npm run test:api` | 27 passed / 2 files | ✓ PASS |
| Event landing in live Sentry | (requires DSN + deploy) | n/a | ? SKIP → human |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| OBS-01 | 03-01, 03-03 | Production client errors captured in Sentry (init gated on REACT_APP_SENTRY_DSN; ErrorBoundary bridged) | ✓ SATISFIED (code-wiring) / ? NEEDS HUMAN (event-landing, deferred) | observability.test.js + ErrorBoundary.test.js green; event-landing = Human Verification #1 |
| OBS-02 | 03-02, 03-03 | Serverless errors captured via withSentry wrapper that flushes before responding | ✓ SATISFIED (code-wiring) / ? NEEDS HUMAN (event-landing, deferred) | withSentry.test.mjs green (flush-before-respond asserted); handled-500s gap routed to Phase 5; event-landing = Human Verification #2 |
| OBS-03 | 03-01, 03-03 | Web-vitals metrics flow to Sentry via existing web-vitals dependency | ✓ SATISFIED (code-wiring) / ? NEEDS HUMAN (event-landing, deferred) | captureWebVital forwarding tested + wired in index.js; event-landing = Human Verification #3 |

All three requirement IDs from PLAN frontmatter (OBS-01, OBS-02, OBS-03) map to REQUIREMENTS.md lines 32-34 and REQUIREMENTS traceability table lines 130-132. No orphaned requirements.

### Anti-Patterns Found

None. No debt markers (TBD/FIXME/XXX), stubs, or empty implementations in the phase files. The `return res.status(500)` in withSentry.js is intentional error handling, not a stub. Test files contain no anti-patterns.

### Human Verification Required

The event-landing half of all three requirements requires a live Sentry DSN + production deploy, neither available in this environment. The user has explicitly DEFERRED all three post-deploy. These are the accepted, documented terminal state — NOT gaps.

**1. OBS-01 — client error lands in Sentry**
Test: Set REACT_APP_SENTRY_DSN (build-time) in Vercel, deploy, trigger a deliberate client render error under ErrorBoundary.
Expected: A client-error Issue with componentStack appears in Sentry within ~1 min.
Why human: Requires live DSN + production deploy.

**2. OBS-02 — uncaught serverless throw lands in Sentry**
Test: Set SENTRY_DSN (runtime) in Vercel, deploy, trigger an UNCAUGHT throw in a withSentry-wrapped handler.
Expected: Issue with api_route tag + method extra. (Handled 500s intentionally NOT reported — Phase 5 / DATA-02.)
Why human: Requires live DSN + deployed function.

**3. OBS-03 — web-vitals land in Sentry**
Test: With build-time DSN deployed, load/interact with the production app.
Expected: Info-level 'Web Vital: <name>' events with web_vital tags/contexts in Sentry.
Why human: Requires live DSN + deploy + real browser measurement.

**4. Vercel env var names confirmed**
Test: Confirm REACT_APP_SENTRY_DSN (build-time) and SENTRY_DSN (runtime) names present in Vercel.
Expected: Both names configured (values never recorded).
Why human: External dashboard state.

Recommended closure path: `/gsd-verify-work 3` after the first production deploy carrying the DSNs.

### Gaps Summary

No gaps. The automatable code-wiring half of OBS-01/02/03 is fully verified: 42 CRA tests + 27 vitest tests green, all key links wired, production subjects unmodified (reconcile-and-verify integrity preserved), the OBS-02 handled-500s blind spot correctly characterized and routed to Phase 5 / DATA-02, and the changelog/audit docs recorded. The only outstanding items are the three deploy-gated event-landing checkpoints, deferred by explicit user decision pending a Sentry DSN + production deploy — an accepted terminal state, hence `human_needed` rather than `gaps_found` or `passed`.

---

_Verified: 2026-07-13T05:25:30Z_
_Verifier: Claude (gsd-verifier)_
