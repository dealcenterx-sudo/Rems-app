---
phase: 01-audit-repo-hygiene-config-centralization
plan: 01
subsystem: config-centralization
tags: [config, ci, hygiene, HYG-04, HYG-05]
requires: []
provides:
  - src/config.js (ADMIN_EMAIL, ROLES, SELF_SERVICE_ROLES)
  - api/_lib/config.js (ADMIN_EMAIL, FIREBASE_API_KEY, CLOUDINARY_CLOUD_NAME)
  - scripts/check-constants.js (CI grep proof)
  - npm run check:constants
affects:
  - src/firebase.js
  - src/utils/helpers.js
  - src/components/NewDealPage.js
  - src/components/CRMMessagesPage.js
  - src/components/DealsDashboard.js
  - src/components/CRMEmailInboxPage.js
  - src/utils/permissions.test.js
  - api/send-email.js
  - api/lead-intake.js
  - .github/workflows/ci.yml
  - package.json
tech-stack:
  added: []
  patterns:
    - ESM named-export constants module (src/config.js) mirroring src/utils/cloudinary.js
    - CommonJS module.exports config (api/_lib/config.js) mirroring api/_lib/firebaseAdmin.js
    - env-var-with-checked-in-fallback for FIREBASE_API_KEY (D-11)
    - git ls-files + Node fs literal scan (no shell grep, BSD/GNU-safe)
key-files:
  created:
    - src/config.js
    - api/_lib/config.js
    - scripts/check-constants.js
  modified: []
decisions:
  - "All plan target state was already implemented by prior commit dd6364a; this run reconciled the contract and verified acceptance criteria rather than rewriting satisfied files (no downgrade to no-op without reading)."
metrics:
  duration: ~10m (reconciliation + verification; no code diff produced)
  completed: 2026-07-07
status: complete
---

# Phase 1 Plan 01: Config Centralization Summary

Admin email + shared role constants are single-sourced in `src/config.js` (client) and `api/_lib/config.js` (server), the Firebase web API key reads from `process.env.FIREBASE_API_KEY` with a checked-in fallback, and a CI-enforced `check:constants` grep proof fails the build if the admin email literal reappears outside the three allowed locations — implementing HYG-04 and HYG-05.

## What Was Done

All three tasks in the plan were **already fully implemented by prior commit `dd6364a`** ("feat: complete saas professionalization upgrade"). Per the run's reconciliation directive, each file was read and each acceptance criterion re-verified against the live tree. No file diverged from the plan's contract, so no source edits were required and no per-task commits were produced (a task with no real diff is recorded as already-satisfied, not force-committed).

### Task 1 — Client and server config modules — already-satisfied by existing implementation
- `src/config.js` (ESM): exports `ADMIN_EMAIL`, `ROLES`, `SELF_SERVICE_ROLES`; 3 `export const`; zero import statements (dependency-free, so `permissions.test.js`'s `jest.mock('../firebase')` stays sufficient — D-09). SELF_SERVICE_ROLES carries the "admin is never self-service" invariant comment.
- `api/_lib/config.js` (CommonJS): `module.exports = { ADMIN_EMAIL, CLOUDINARY_CLOUD_NAME, FIREBASE_API_KEY }`; `FIREBASE_API_KEY` uses `process.env.FIREBASE_API_KEY || <public web key fallback>` (D-11). Pre-existing `CLOUDINARY_CLOUD_NAME` export preserved.
- Verify: `node -e "require('./api/_lib/config')"` loads; both keys truthy. PASS.

### Task 2 — Repoint client consumers — already-satisfied by existing implementation
- `src/firebase.js` imports `{ ADMIN_EMAIL, SELF_SERVICE_ROLES } from './config'`; no local definitions remain; `firebaseConfig.apiKey` untouched.
- `src/utils/helpers.js` imports `ADMIN_EMAIL` from `../config`; `isAdmin()` and `isAdminUser()` both use the constant; helpers not consolidated (D-09).
- Four components (`NewDealPage`, `CRMMessagesPage`, `DealsDashboard`, `CRMEmailInboxPage`) import `ADMIN_EMAIL` and use it at all six occurrences; per-line optional-chaining preserved (`currentUser.email` vs `currentUser?.email` unchanged); CRMEmailInboxPage:74 sample-data `from:` fallback swapped identically.
- `src/utils/permissions.test.js` imports `ADMIN_EMAIL` from `../config`; admin fixture uses `email: ADMIN_EMAIL` (the load-bearing 10th occurrence — RESEARCH Pitfall 2).
- Verify: `npm run test:ci` → 3 suites, 29 tests, all green. PASS.

### Task 3 — Server consumers + check-constants proof + CI step — already-satisfied by existing implementation
- `api/send-email.js`: `const { FIREBASE_API_KEY } = require('./_lib/config')`; no `AIzaSy` literal remains (grep count 0); lookup URL untouched.
- `api/lead-intake.js`: `const { ADMIN_EMAIL } = require('./_lib/config')`; consumer at line 44 untouched; module loads under plain Node.
- `scripts/check-constants.js`: reads `ADMIN_EMAIL` via `require('../api/_lib/config')` (never embeds the literal); enumerates via `git ls-files src api scripts public .github firestore.rules vercel.json package.json`; allowlists exactly `src/config.js`, `api/_lib/config.js`, `firestore.rules`; exits 1 with violating paths on stderr, 0 with a one-line OK.
- `package.json`: `"check:constants": "node scripts/check-constants.js"` present.
- `.github/workflows/ci.yml`: `Check constants` step runs `npm run check:constants` immediately after `Install dependencies` and before `Lint`; Build step's deliberate `CI: false` untouched.
- Verify: `npm run check:constants` exits 0 clean; **sabotage test performed** (planted the literal in `src/components/DealsDashboard.js`) → exit 1, named the file → reverted → exit 0. PASS.

## Verification Results

| Check | Result |
|-------|--------|
| `node -e "require('./api/_lib/config')"` both keys truthy | PASS |
| `src/config.js` exports (3) + zero imports | PASS |
| `npm run test:ci` | PASS (3 suites, 29 tests) |
| `npm run check:constants` clean | exit 0 |
| Sabotage: planted literal | exit 1, named `src/components/DealsDashboard.js`, reverted |
| `grep -c AIzaSy api/send-email.js` | 0 |
| CI wired (`check:constants` before Lint) | PASS |
| Admin email literal in tracked code | only `src/config.js` + `api/_lib/config.js` (firestore.rules allowlisted, currently 0 occurrences) |

## Deviations from Plan

None. Plan target state was pre-existing; no auto-fixes (Rules 1-3) or architectural changes (Rule 4) were needed. No per-task commits were created because there was no real diff — all three tasks are recorded as satisfied-by-existing-implementation (commit dd6364a).

## Notes

- `firestore.rules` currently contains **0** occurrences of the admin email literal (the prior codex run appears to have already removed it). This is out of scope for this plan (rules email-fallback removal is Phase 6/SEC-04, lockout-gated) and does not affect this plan's acceptance criteria — `firestore.rules` is an allowlisted location whether or not the literal is present, and `check:constants` passes either way.
- Untracked working-tree files `AGENTS.md` and `docs/CLAUDE_HANDOFF.md` are unrelated to this plan and were left untouched.

## Self-Check: PASSED
- src/config.js — FOUND
- api/_lib/config.js — FOUND
- scripts/check-constants.js — FOUND
- All acceptance-criteria commands re-run green this session (see Verification Results).
- No new per-task commits claimed (none produced — existing implementation via dd6364a verified in `git log`).
