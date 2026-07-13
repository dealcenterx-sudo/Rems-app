---
phase: 5
slug: data-reliability-infrastructure-headers
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-13
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | CRA Jest (`src/` — the net-new DATA-02 analytics-fallback test, `../utils/observability` + firestore mocked) |
| **Config file** | package.json (CRA Jest `roots` = `<rootDir>/src`) |
| **Quick run command** | `npm run test:ci` |
| **Full suite command** | `npm run check:constants && npm run lint && npm run test:ci && npm run test:api && npm run build` |
| **Estimated runtime** | ~120s |

---

## Sampling Rate

- **After every task commit:** `npm run test:ci` (client) / relevant lane
- **After every plan wave:** `npm run lint && npm run test:ci && npm run test:api`
- **Before `/gsd-verify-work`:** full suite green; `npm run build` picks up `INLINE_RUNTIME_CHUNK=false` (no inline runtime chunk in build/)
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

*To be filled by the planner — map DATA-01/02/03 + INFRA-02/03 to automated (index-coverage grep, DATA-02 unit test, INLINE_RUNTIME_CHUNK in tracked file, CSP allowlist greps, build) vs human-verify (index READY in Console, non-admin flow smoke, CSP report collection live).*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-T1 | 01 | 1 | DATA-02 | T-05A-01/02 | Missing-index fallback calls captureError (loud) + preserves userId scope on refetch | unit | `CI=true npx react-scripts test --watchAll=false src/components/AnalyticsDashboard.test.js` | ❌ Wave 0 — net-new | ⬜ pending |
| 05-01-T2 | 01 | 1 | DATA-01 | — | Index-coverage reconcile (no over-broad def) | static/manual | `node -e "..." firestore.indexes.json` (≥13 defs) | ✅ (verify-only) | ⬜ pending |
| 05-02-T1 | 02 | 1 | INFRA-03 | T-05B-01 | External runtime chunk removes inline-script 'unsafe-inline' need | config grep + build | `grep -q 'INLINE_RUNTIME_CHUNK=false react-scripts build' package.json`; `npm run build` emits `build/static/js/runtime-*.js` | ✅ (edit) | ⬜ pending |
| 05-02-T2 | 02 | 1 | INFRA-03 / INFRA-02 | T-05B-02/03 | CSP allowlist scoped to known hosts; stays Report-Only; cache headers intact | config assertion | `node -e "…CSP_ALLOWLIST_OK…"` (3 hosts present, Report-Only preserved, immutable intact) | ✅ (edit) | ⬜ pending |
| 05-03-T1 | 03 | 2 | DATA-01 | T-05C-02 | Composite indexes READY in Console (two-channel deploy) | human-verify | Firebase Console Indexes / `firebase deploy --only firestore:indexes` | manual-only (live) | ⬜ pending |
| 05-03-T2 | 03 | 2 | DATA-03 | T-05C-02 | Non-admin completes all six flows, no fallback | human-verify | non-admin prod smoke (Home/Deals/CRM/Properties/Tasks/Analytics) | manual-only (live) | ⬜ pending |
| 05-03-T3 | 03 | 2 | INFRA-02 / INFRA-03 / DATA-02 | T-05C-01/03 | Cache headers live, no inline runtime, CSP Report-Only reports collecting | human-verify | `curl -sI` headers; view-source no inline runtime; Sentry csp-report-only events | manual-only (live) | ⬜ pending |
| 05-04-T1 | 04 | 3 | AUDIT-03 (DATA/INFRA) | T-05D-01 | Changelog records outcome; env vars by NAME only | doc grep | `grep -qi 'Phase 5' && grep -q 'INLINE_RUNTIME_CHUNK' docs/SAAS_UPGRADE_CHANGELOG.md` | ✅ (edit) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Net-new unit test: the AnalyticsDashboard missing-index fallback path calls `captureError` (DATA-02) — mock `../utils/observability` + firestore, simulate a `failed-precondition`/index error, assert it reports (loud, not silent)

*DATA-01 index coverage and INFRA-02 cache headers already exist (shipped); this phase confirms them + adds the DATA-02 test + the INFRA-03 fix + CSP allowlist fixes.*

---

## Manual-Only Verifications (LIVE / Console)

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Every composite index is READY | DATA-01 | Only the operator can read Firebase Console index state | Firebase Console → Firestore → Indexes → confirm each def in firestore.indexes.json shows **Enabled/READY** (or create via `firebase deploy --only firestore:indexes`) |
| Non-admin completes all major flows | DATA-03 | Requires a real non-admin login on prod | Non-admin account: complete Home, Deals, CRM, Properties, Tasks, Analytics with NO index errors and NO silent fallbacks (watch console + Sentry) |
| CSP Report-Only header live + reports collected | INFRA-03 | Requires a deploy + real traffic | After deploy: confirm `Content-Security-Policy-Report-Only` header on prod responses; browse; confirm violation reports arrive at `api/csp-report.js`→Sentry. Watch for the flagged allowlist holes (Google sign-in, Sentry us-region ingest). |
| Analytics fallback event visible in Sentry when triggered | DATA-02 | Requires triggering a live missing-index condition | If an index is briefly missing / via a forced trigger, confirm the `analytics-index-fallback` event lands in Sentry |

---

## Validation Sign-Off

- [ ] DATA-02 fallback test green; all local suites green
- [ ] `INLINE_RUNTIME_CHUNK=false` in a tracked, Vercel-reachable location; build has no inline runtime chunk
- [ ] CSP allowlist fixes applied (Report-Only — safe); header present in vercel.json
- [ ] Index READY + non-admin smoke + CSP report collection are human-verify checkpoints
- [ ] No watch-mode flags
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
