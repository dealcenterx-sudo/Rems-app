---
phase: 04-serverless-hardening
plan: 01
subsystem: serverless-api-tests
tags: [testing, vitest, zod, security, serverless]
requires:
  - api/_lib/validate.js (zod schemas — subject under test)
  - api/delete-media.js (handler — subject under test)
provides:
  - accept-path schema coverage proving live-client payloads pass zod validation (SEC-01)
  - delete-media idempotency-200 and provider-502 branch coverage (SEC-03)
affects:
  - tests/api (vitest lane)
tech-stack:
  added: []
  patterns:
    - "createRequire(requireFromRoot) to load CommonJS validate.js in an .mjs vitest suite"
    - "module-cache injection (mockCloudinary) for API-lane mocks — no vi.mock"
    - "auth fetch stub before validation before privileged op (handler ordering invariant)"
key-files:
  created:
    - tests/api/validate-schemas.test.mjs
  modified:
    - tests/api/api-handlers.test.mjs
decisions:
  - "Wrote accept-path as direct schema unit tests (no handler/mocks) per PATTERNS preferred structure — the accept-path only needs to prove schemas pass live-client shapes"
  - "Did NOT add a log-then-enforce mode toggle (explicit scope-creep guard in plan/SEC-01); validate.js is enforce-only and unmodified"
  - "Reused the existing describe('api/delete-media') harness verbatim for the two deltas; no vi.mock introduced"
metrics:
  tasks_completed: 2
  files_created: 1
  files_modified: 1
  tests_before: 27
  tests_after: 33
status: complete
---

# Phase 4 Plan 01: Serverless Hardening — Accept-Path + delete-media Deltas Summary

Added the two net-new automatable test surfaces Wave 0 research identified as missing: a direct-schema ACCEPT-PATH suite proving every exact live-client payload shape still passes zod validation (SEC-01), and two delete-media handler deltas (idempotent 200-on-not-found and 502-on-provider-rejection) extending the existing suite (SEC-03) — with zero production handler changes.

## What Was Built

### Task 1 — Accept-path schema suite (SEC-01)
`tests/api/validate-schemas.test.mjs` (new): four `it()` cases loading the CommonJS `api/_lib/validate.js` via `createRequire`, asserting `.safeParse(...).success === true` for the exact shapes the live client sends:
- `sendEmailSchema`: `{to,subject,text}`, `{to,subject,html}`, and blank `cc`/`bcc` (coerced to undefined, not a 400)
- `acceptInviteSchema`: `{inviteToken}`
- `deleteMediaSchema`: `{publicId,resourceType:'image'}`, `{publicId,resourceType:'raw'}`, and `{publicId}` defaulting `resourceType` to `'image'`
- `leadIntakeSchema`: a single identifying field (`{email, source}`)

This is the complement to the already-pinned reject/400 path — proving enforce-mode validation will not 400 real production traffic.

### Task 2 — delete-media delta cases (SEC-03)
Extended the existing `describe('api/delete-media')` block in `tests/api/api-handlers.test.mjs` with two `it()` cases after the happy-path 'ok' test, reusing `invoke()`/`loadHandler`/`mockCloudinary` and the Identity Toolkit auth `fetch` stub verbatim:
- destroy → `{ result: 'not found' }` yields 200 `{ ok: true, result: 'not found' }` (idempotent)
- destroy → `{ result: 'error' }` yields 502 `{ error: 'Media provider rejected the delete' }` (loud failure)

## Verification

- `npm run test:api`: 33 tests passing (27 baseline + 4 accept-path + 2 delete-media deltas), 3 test files
- `npm run lint`: clean
- No production source modified — confirmed both commits touched only `tests/api/*` files
- No new packages installed (zod/cloudinary/vitest/node-mocks-http already present) — zero supply-chain surface

## Commits

- `e3eab0c` test(04-01): add accept-path schema suite proving live-client payloads pass (SEC-01)
- `88b6be3` test(04-01): add delete-media not-found-200 and provider-502 delta cases (SEC-03)

## Deviations from Plan

None — plan executed exactly as written. Both tasks marked `tdd="true"`; as a reconcile-and-verify phase the tests pin the behavior of already-shipped, already-correct handlers, so they pass immediately rather than starting RED. tdd_mode is disabled in config so no gate applied.

## Threat Mitigations

- **T-04-01** (Tampering: over-strict schemas → live-client 400s): mitigated by Task 1 accept-path suite pinning exact live-client shapes as success===true.
- **T-04-02** (Tampering: delete-media idempotency / failure signaling): mitigated by Task 2 pinning 200-on-not-found and 502-on-provider-rejection.
- **T-04-03** / **T-04-SC**: accepted as-is per threat register (no new install surface; uniform 400 body already safe).

## Self-Check: PASSED

- FOUND: tests/api/validate-schemas.test.mjs
- FOUND: tests/api/api-handlers.test.mjs (modified)
- FOUND commit: e3eab0c
- FOUND commit: 88b6be3
