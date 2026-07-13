---
phase: 05-data-reliability-infrastructure-headers
plan: 02
subsystem: infrastructure-headers
tags: [csp, cache-headers, build-config, security-headers, vercel]
requires: []
provides:
  - INLINE_RUNTIME_CHUNK=false build script (git-tracked, Vercel-reachable)
  - CSP Report-Only allowlist covering Google sign-in + Sentry region host
affects:
  - package.json
  - vercel.json
tech-stack:
  added: []
  patterns:
    - "CRA build-time env prefix (PATH A) over gitignored .env.production"
    - "Precise CSP directive string-extension, header kept Report-Only"
key-files:
  created:
    - .planning/phases/05-data-reliability-infrastructure-headers/05-02-SUMMARY.md
  modified:
    - package.json
    - vercel.json
decisions:
  - "INLINE_RUNTIME_CHUNK set via package.json build script (PATH A), not .env.production (gitignored at .gitignore:37, never reaches Vercel)"
  - "CSP allowlist extended only for the three known Google-sign-in / Sentry-region hosts; header stays Report-Only so nothing is enforced (Phase 8 tightens after soak)"
metrics:
  duration: ~6m
  completed: 2026-07-13
requirements: [INFRA-02, INFRA-03]
status: complete
---

# Phase 5 Plan 02: Infrastructure Headers (Local Half) Summary

INFRA-03's two real edits landed in git-tracked, Vercel-reachable locations — the CRA build script now sets `INLINE_RUNTIME_CHUNK=false` (no inline runtime `<script>` in `index.html`) and the `Content-Security-Policy-Report-Only` allowlist pre-covers Google sign-in (`apis.google.com`) and the region-specific Sentry ingest host (`*.ingest.us.sentry.io`) plus the Firebase auth handler (`*.firebaseapp.com`) — while INFRA-02 cache headers were reconciled unchanged.

## What Was Built

### Task 1 — INLINE_RUNTIME_CHUNK=false (INFRA-03, PATH A) — commit `2246170`
- `package.json` `build` script changed from `react-scripts build` to `INLINE_RUNTIME_CHUNK=false react-scripts build`.
- No `.env` / `.env.production` created — both match `.gitignore:37` (`.env*`) and would never reach the Vercel build (confirmed via `git check-ignore -v .env.production` → ignored).
- `npm run build` succeeds; `build/index.html` contains **zero inline `<script>` blocks** — it loads only external `/static/js/main.*.js` with `defer`. This satisfies the CSP objective: `script-src 'self'` works without `'unsafe-inline'`.

### Task 2 — CSP Report-Only allowlist + INFRA-02 reconcile (INFRA-03 / INFRA-02) — commit `9308634`
- `vercel.json` `Content-Security-Policy-Report-Only` value string-extended (header key and all other directives byte-for-byte preserved):
  - `script-src` → added `https://apis.google.com`
  - `connect-src` → added `https://*.ingest.us.sentry.io` and `https://*.firebaseapp.com`
  - `frame-src` → added `https://*.firebaseapp.com`
- Header remains `Content-Security-Policy-Report-Only`; no `'unsafe-inline'` added; `report-uri` / `report-to` / `Reporting-Endpoints` unchanged.
- **INFRA-02 reconciled (verify-only, no edit):** `vercel.json` still sets `/static/(.*)` → `Cache-Control: public, max-age=31536000, immutable` and `/` + `/index.html` → `no-cache, no-store, must-revalidate`. Confirmed intact.

## Verification

| Gate | Result |
|------|--------|
| `grep INLINE_RUNTIME_CHUNK=false package.json` | pass (`BUILD_SCRIPT_SET`) |
| CSP allowlist node assertion (3 hosts, cache intact, Report-Only) | pass (`CSP_ALLOWLIST_OK`) |
| `npm run check:constants` | pass (admin email only in allowed locations) |
| `npm run lint` | pass (no errors) |
| `npm run build` | pass (build folder ready; no inline runtime script in index.html) |
| `npm run test:ci` | pass (6 suites, 43 tests) |

## Deviations from Plan

**1. [Rule 1 - Factual reconciliation] Acceptance criterion `runtime-*.js` external file does not literally apply under react-scripts 5.0.1**
- **Found during:** Task 1 build verification.
- **Issue:** The plan's acceptance criterion / must-have truth #1 expects an external `build/static/js/runtime-*.js` file. That is a CRA-4-ism. In react-scripts 5.0.1 there is **no** `optimization.runtimeChunk` config (`grep runtimeChunk node_modules/react-scripts/config/webpack.config.js` → empty), so the webpack runtime is folded into `main.js` — no separate `runtime-*.js` chunk is ever emitted, with or without the flag.
- **Impact / why the edit is still correct:** The actual security objective — "no inline `<script>` runtime block in `index.html` so `script-src 'self'` needs no `'unsafe-inline'`" — **is met**: `index.html` loads only external `main.*.js`. The `InlineChunkHtmlPlugin` (webpack.config.js:638) is gated by `shouldInlineRuntimeChunk` (`= INLINE_RUNTIME_CHUNK !== 'false'`, line 59), so the flag defensively guarantees the runtime is never inlined now or if a future config/upgrade reintroduces a runtime chunk. The build-script edit is the required git-tracked, Vercel-reachable location per plan.
- **Files modified:** none beyond the planned `package.json` edit.
- **Commit:** `2246170`

No other deviations. No auth gates. No new packages installed (zero supply-chain surface, per threat register T-05B-SC).

## Threat Surface

No new security-relevant surface beyond the plan's `<threat_model>`. Both edits add only non-secret host allowlist strings and a non-secret build flag (T-05B-03 mitigated). CSP additions are scoped wildcards and the header stays Report-Only (T-05B-02 mitigated). Inline-runtime removal confirmed (T-05B-01 mitigated).

## Deferred to Plan 03 (live half — not observable here)
- `curl -sI` the deployed edge cache headers (INFRA-02 live).
- Confirm deployed `index.html` has no inline runtime script (references external JS only).
- Confirm the `Content-Security-Policy-Report-Only` header is live and violation reports are arriving in Sentry via `api/csp-report.js`; validate the flagged Google-sign-in / Sentry-region candidates against real soak data.

## Self-Check: PASSED
- FOUND: package.json (build script = `INLINE_RUNTIME_CHUNK=false react-scripts build`)
- FOUND: vercel.json (CSP allowlist extended, Report-Only, cache headers intact)
- FOUND: commit 2246170
- FOUND: commit 9308634
