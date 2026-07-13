---
phase: 4
slug: serverless-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
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

*To be filled by the planner — map SEC-01/02/03 to automated (validation logic, auth-audit, delete-media auth+signature unit tests, trust-boundary doc) vs human-verify (real Cloudinary destroy, Sentry-watched soak).*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|

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

- [ ] All tasks have `<automated>` verify or Wave 0 deps (automatable half) or a human-verify checkpoint (external half)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
