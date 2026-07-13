---
phase: 5
slug: data-reliability-infrastructure-headers
status: draft
nyquist_compliant: false
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
