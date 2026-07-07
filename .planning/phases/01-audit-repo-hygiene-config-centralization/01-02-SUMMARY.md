---
phase: 01-audit-repo-hygiene-config-centralization
plan: 02
subsystem: repo-hygiene + serverless-auth
tags: [hygiene, security, health-endpoint, info-disclosure]
requires:
  - api/_lib/config.js (ADMIN_EMAIL, FIREBASE_API_KEY — created in plan 01-01)
  - api/_lib/firebaseAdmin.js (getDb — adminInit probe)
  - api/_lib/withSentry.js (observability wrapper)
provides:
  - api/health.js split-response auth gate (bare {status:'ok'} public; five-flag diagnostics admin-only)
  - repo free of stale archive, screenshot.js, and puppeteer devDependency
affects:
  - api/health.js
  - package.json
  - .gitignore
tech-stack:
  added: []
  patterns:
    - "identitytoolkit accounts:lookup token verification (not Admin SDK) for self-diagnosing health endpoint"
    - "split-response: no 401/403 differential — non-admin/invalid tokens get identical bare 200"
key-files:
  created: []
  modified:
    - api/health.js
    - package.json
    - .gitignore
  deleted:
    - screenshot.js
    - rems-project-source-2026-04-09/ (untracked — not git-recoverable)
    - rems-project-source-2026-04-09.zip (untracked — not git-recoverable)
decisions:
  - "All target state pre-existed in commit dd6364a; reconciled contract and verified acceptance criteria rather than rewriting satisfied files"
  - "D-07 resolved: no external /api/health detail-parsing consumers observed; gate deployed and verified in production"
metrics:
  duration: ~15m
  completed: 2026-07-07
status: complete
---

# Phase 1 Plan 02: Repo Hygiene & Health Endpoint Gating Summary

Removed the stale source archive, obsolete `screenshot.js`, and its orphaned `puppeteer` devDependency, and auth-gated `api/health.js` with a split response so unauthenticated and non-admin callers learn nothing about env/infra while a valid admin token still returns the unchanged five diagnostic flags. All target state pre-existed in commit `dd6364a` (prior automated run); this plan reconciled the plan contract against existing code, verified every acceptance criterion, and cleared the mandatory D-07 human checkpoint.

## What Was Built

### Task 1 — Repo hygiene (HYG-01, HYG-02 / D-13, D-14)
- `rems-project-source-2026-04-09/` and its `.zip` are absent from the working tree. These were **untracked/gitignored and never committed** (RESEARCH Pitfall 1), so removal was plain filesystem deletion — **not git-recoverable** (D-14 authorized no pre-removal copy).
- `screenshot.js` is no longer tracked (`git ls-files screenshot.js` → 0) and absent from disk; git history keeps it recoverable (was tracked at commit `0b3cb88`).
- `puppeteer` (screenshot.js's only consumer) is absent from `package.json` devDependencies, dropping ~200MB of dead install weight.
- `.gitignore` lines 26-27 (`/rems-project-source-*`, `/rems-project-source-*.zip`) still cover future exports.

**Verification:** `HYGIENE_OK` — `test ! -e` archive/zip/screenshot.js && `git ls-files` empty && no puppeteer devDep.

### Task 2 — Split-response health endpoint (HYG-03 / D-06, D-08)
`api/health.js` implements the D-06 split response:
- No token → `res.status(200).json({ status: 'ok' })`.
- Token verified via Google identitytoolkit `accounts:lookup` using `FIREBASE_API_KEY` (from `api/_lib/config.js`) — **not** `getAuthAdmin().verifyIdToken()`. Rationale (RESEARCH Pitfall 4): the endpoint diagnoses a broken `FIREBASE_SERVICE_ACCOUNT`/admin-SDK init; using the Admin SDK for auth would depend on the exact thing being diagnosed (circular).
- Admin gate: only `user.email === ADMIN_EMAIL && user.emailVerified` returns the diagnostics object. Invalid tokens **and** valid non-admin tokens receive the identical bare `{ status: 'ok' }` — no 401/403 differential (no privilege-disclosure / endpoint-enumeration surface).
- Admin-gated payload preserves the **same five flags** as before (D-08, no expansion): `resendConfigured`, `firebaseAdminConfigured`, `leadIntakeConfigured`, `adminInit` (via `getDb()` probe), `matchingKeyNames`.
- The `withSentry` observability wrapper on the export is preserved.

**Verification:** `HEALTH_GATE_OK` — loads under plain Node; grep confirms identitytoolkit URL, `status: 'ok'`, `ADMIN_EMAIL`; zero `status(401)`/`status(403)`.

## Deploy-Facing Acceptance (HYG-03)

Production spot-check confirmed: `curl -s https://rems-app.vercel.app/api/health` → exactly `{"status":"ok"}` (HTTP 200). No env/infra leak, no 401/403 differential.

## D-07 Checkpoint Result (for audit + changelog in plan 01-03)

**Resolved:** "approved — no external detail consumers." No external `/api/health` detail-parsing consumers observed; the endpoint's detailed diagnostics are now admin-gated. The gate is already deployed and verified in production returning bare `{"status":"ok"}` (HTTP 200), so simple up/down monitors are unaffected. Record this as the audit/changelog finding for D-07 (plan 01-03).

## Deviations from Plan

None — all acceptance criteria were satisfied by the pre-existing implementation (commit `dd6364a`). No task files required modification; both tasks are satisfied-by-existing-implementation. No new task commits were created because the working tree already matched the plan contract and all automated + deploy-facing verifications passed.

## Threat Mitigations Verified

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-01-H1 (env schema disclosure) | Split response — bare `{status:'ok'}` for non-admin callers | Verified in code + production |
| T-01-H2 (admin-email spoofing) | identitytoolkit token verification + `emailVerified` | Verified in code |
| T-01-H3 (endpoint enumeration) | No 401/403 differential — identical bare 200 | Verified (grep: 0 occurrences) |
| T-01-H5 (unknown monitor breakage) | D-07 human log-check completed; bare response stays HTTP 200 | Resolved — no consumers |

## Self-Check: PASSED

- `api/health.js` exists and loads clean — FOUND
- `screenshot.js` absent (git ls-files → 0) — CONFIRMED
- archive + zip absent — CONFIRMED
- puppeteer absent from devDependencies — CONFIRMED
- prior implementation committed in `dd6364a` — FOUND in history
