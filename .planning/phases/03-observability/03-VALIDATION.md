---
phase: 3
slug: observability
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-13
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | CRA Jest (`src/` — client Sentry init + ErrorBoundary bridge, `@sentry/react` mocked) + Node/Vitest (`tests/api/` — `withSentry` wrapper, `@sentry/node` mocked) |
| **Config file** | package.json (CRA Jest `roots` = `<rootDir>/src`); vitest for `tests/` |
| **Quick run command** | `npm run test:ci` (client) / `npm run test:api` (server wrapper) |
| **Full suite command** | `npm run check:constants && npm run lint && npm run test:ci && npm run test:api && npm run build` |
| **Estimated runtime** | ~120s |

---

## Sampling Rate

- **After every task commit:** Run the suite covering the touched layer (`npm run test:ci` for client, `npm run test:api` for the wrapper)
- **After every plan wave:** Run `npm run lint && npm run test:ci && npm run test:api`
- **Before `/gsd-verify-work`:** Full suite green; the three "event appears in Sentry" items verified via a post-deploy smoke with a real DSN (human/CI)
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

*To be filled by the planner — one row per task, mapping OBS-01..03 to automated (code-wiring) commands vs human-verify (event-landing).*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-T1 | 03-01 | 1 | OBS-01, OBS-03 | T-03-01 | captureError/captureWebVital send only caller context + metric fields (no PII/secrets); init no-op without DSN | unit (mock @sentry/react) | `CI=true npx react-scripts test --watchAll=false src/utils/observability.test.js` | ❌ Wave 0 | ⬜ pending |
| 03-01-T2 | 03-01 | 1 | OBS-01 | T-03-01 | ErrorBoundary bridges caught error to captureError with componentStack only | unit (mock ../utils/observability) | `CI=true npx react-scripts test --watchAll=false src/components/ErrorBoundary.test.js` | ❌ Wave 0 | ⬜ pending |
| 03-02-T1 | 03-02 | 1 | OBS-02 | T-03A-01, T-03A-02 | wrapper flushes before responding; captureException tags carry only api_route+method; no-DSN no-op | unit (mock @sentry/node) | `npm run test:api` | ❌ Wave 0 | ⬜ pending |
| 03-02-T2 | 03-02 | 1 | OBS-02 | T-03A-03 | handled-500s blind spot logged, not silently accepted | doc | `grep -q "only captures" docs/SAAS_READINESS_AUDIT.md` | n/a | ⬜ pending |
| 03-03-T1 | 03-03 | 2 | OBS-01 | T-03V-02 | production client error lands in Sentry | human-verify | (deploy + trigger; DSN required) | n/a | ⬜ pending |
| 03-03-T2 | 03-03 | 2 | OBS-02 | T-03V-03 | production UNCAUGHT serverless throw lands in Sentry | human-verify | (deploy + uncaught throw; DSN required) | n/a | ⬜ pending |
| 03-03-T3 | 03-03 | 2 | OBS-03 | T-03V-02 | web-vitals messages land in Sentry | human-verify | (deploy + page loads; DSN required) | n/a | ⬜ pending |
| 03-03-T4 | 03-03 | 2 | OBS-01, OBS-02, OBS-03 | T-03V-01 | changelog records outcome; env var names only | auto | `grep -q "withSentry.test.mjs" docs/SAAS_UPGRADE_CHANGELOG.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Unit tests for `src/utils/observability.js` — init is a no-op when `REACT_APP_SENTRY_DSN` unset; enabled path calls `Sentry.init` with the DSN (`@sentry/react` mocked)
- [ ] Unit test for the `src/components/ErrorBoundary.js` → `Sentry.captureException` bridge
- [ ] Unit test for `api/_lib/withSentry.js` — no-op without DSN; on an UNCAUGHT throw it captures and `await`s flush BEFORE responding (`@sentry/node` mocked)

*These are net-new: research found zero existing coverage of the observability layer. This is the phase's primary automatable deliverable.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Deliberate client error appears in Sentry | OBS-01 | Needs a live `REACT_APP_SENTRY_DSN` + deployed build | With DSN set in Vercel, trigger a client error in production; confirm the issue appears in the Sentry project |
| Serverless (uncaught) error appears in Sentry | OBS-02 | Needs live `SENTRY_DSN` + deployed function | Trigger an UNCAUGHT throw in a wrapped handler in production; confirm the issue appears (note: handled 500s are NOT reported — logged gap for a later phase) |
| Web-vitals metrics appear in Sentry | OBS-03 | Needs live DSN + real page loads | Load the production app; confirm web-vitals `captureMessage` events appear in the Sentry project |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (code-wiring half) or a human-verify checkpoint (event-landing half)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
