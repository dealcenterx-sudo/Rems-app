---
phase: 4
slug: serverless-hardening
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-13
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node/Vitest (`tests/api/*.mjs`) with `node-mocks-http` + module-cache mocks (mock `cloudinary`, mock auth `fetch`) |
| **Config file** | package.json scripts; vitest for `tests/` |
| **Quick run command** | `npm run test:api` |
| **Full suite command** | `npm run check:constants && npm run lint && npm run test:ci && npm run test:api && npm run build` |
| **Estimated runtime** | ~120s |

---

## Sampling Rate

- **After every task commit:** `npm run test:api`
- **After every plan wave:** `npm run lint && npm run test:ci && npm run test:api`
- **Before `/gsd-verify-work`:** Full suite green; the external items (real Cloudinary deletion, Sentry-watched validation soak) verified post-deploy with credentials
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-T1 | 04-01 | 1 | SEC-01 | T-04-01 | Real live-client payload shapes pass zod validation (accept-path) | unit (vitest) | `npm run test:api` | 🆕 tests/api/validate-schemas.test.mjs | ⬜ pending |
| 04-01-T2 | 04-01 | 1 | SEC-03 | T-04-03 | delete-media: not-found→200 idempotent, provider-error→502 (cloudinary mocked) | unit (vitest) | `npm run test:api` | ✅ tests/api/api-handlers.test.mjs | ⬜ pending |
| 04-02-T1 | 04-02 | 1 | SEC-02 | T-04-02 | csp-report row + rationale added (intentionally-unauthenticated beacon) | doc | `grep -q "csp-report" docs/TRUST_BOUNDARIES.md` | ✅ docs/TRUST_BOUNDARIES.md | ⬜ pending |
| 04-02-T2 | 04-02 | 1 | SEC-02 | T-04-02 | machine-check: every api/ endpoint has a trust-boundary row matching its auth posture | unit (vitest, fs-glob) | `npm run test:api` | 🆕 tests/api/trust-boundaries-audit.test.mjs | ⬜ pending |
| 04-03-T1 | 04-03 | 2 | SEC-03 | T-04-03 | real Cloudinary asset removal (live Admin creds + real asset) | human-verify | (deploy + creds; Cloudinary dashboard) | n/a | ⬜ pending |
| 04-03-T2 | 04-03 | 2 | SEC-01 | T-04-01 | log-then-enforce validation soak with Sentry watching (enforce-only + Phase-3 DSN deferred) | human-verify | (deploy + Sentry DSN soak) | n/a | ⬜ pending |
| 04-03-T3 | 04-03 | 2 | SEC-01, SEC-02, SEC-03 | — | changelog records Phase 4 outcome; env var names only | auto | `grep -qi "Phase 4" docs/SAAS_UPGRADE_CHANGELOG.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Accept-path tests: the exact payload shapes the live client sends to send-email / accept-invite / lead-intake pass zod validation (net-new; the reject/400 path is already covered by the Phase 2 suite)
- [ ] delete-media auth-gate + signed-destroy unit assertions (extend/confirm existing coverage; `cloudinary` mocked)

*Reject/400 uniform-contract coverage already exists in `tests/api/api-handlers.test.mjs` (Phase 2).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real media deletion removes the asset from Cloudinary | SEC-03 | Needs live `CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` + a real uploaded asset | With creds set, delete media in the deployed app; confirm the asset is gone from the Cloudinary dashboard (and a second delete returns 200 idempotently) |
| Log-then-enforce validation soak with Sentry watching | SEC-01 | Code is enforce-only; needs the deferred Phase 3 Sentry DSN + a production soak window | After a deploy with the Sentry DSN, watch for any 400s on real client traffic during a soak; confirm no live-client payload is rejected |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 deps (automatable half) or a human-verify checkpoint (external half)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-13
