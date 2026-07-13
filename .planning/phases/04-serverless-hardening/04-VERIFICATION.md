---
phase: 04-serverless-hardening
verified: 2026-07-13T09:40:00Z
status: human_needed
score: 3/3 code-wiring halves verified (2 external halves pending human verification)
behavior_unverified: 0
overrides_applied: 0
requirements_verified: [SEC-01, SEC-02, SEC-03]
human_verification:
  - test: "Provision CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET as Vercel runtime env vars, deploy, upload a throwaway asset in the deployed app, delete it through a media-delete flow (DocumentsPage / PropertiesPage / DealDocumentsTab), and confirm the asset is gone from the Cloudinary Media Library dashboard (network 200 result:'ok'). Then re-delete the same asset and confirm 200 result:'not found' idempotently."
    expected: "The real asset leaves the Cloudinary account; the second delete is a clean idempotent 200. (SEC-03 external half.)"
    why_human: "A real Cloudinary Admin destroy cannot be observed from this environment — it needs live credentials that exist only in the Vercel runtime plus a production deploy. Locally proven only via mocked handler branches."
  - test: "Once SENTRY_DSN is provisioned (Phase 3 deferral) and a production soak window runs, watch serverless logs / Sentry for any 400 'Invalid request payload' responses on real client traffic; confirm no live-client payload is rejected by enforce-mode validation."
    expected: "No live-client payload receives a 400 during the soak. (SEC-01 external half — 'log-then-enforce rollout with Sentry watching'.)"
    why_human: "The soak requires a Sentry DSN (Phase 3 deferral) and live production traffic; enforce-only code has no log-mode toggle by locked decision. The automatable accept-path suite stands in as local evidence."
deferred: []
---

# Phase 4: Serverless Hardening Verification Report

**Phase Goal:** Every serverless endpoint validates its input server-side, the client/server trust boundary is documented, and user-deleted media is actually deleted — with live clients never breaking during rollout
**Verified:** 2026-07-13T09:40:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

This is a reconcile-and-verify phase: the hardening code shipped in bulk commit `dd6364a`; this session added net-new tests plus one doc row (no handler rewrites). Every requirement was intentionally SPLIT (locked decision) into an automatable code-wiring half (verified now) and an external half requiring a credentialed production deploy (deferred to human verification).

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Malformed payloads to send-email, accept-invite, lead-intake receive uniform zod-derived 400s, while every payload the live client actually sends still succeeds | ✓ VERIFIED (code half) + human (soak) | `validateBody` wired in all 4 mutating handlers (send-email:47, accept-invite:35, lead-intake:32, delete-media:34); uniform `{error:'Invalid request payload', details}` body (validate.js:11-14); reject-path pinned (8 400-assertions in api-handlers.test.mjs); accept-path suite proves exact client shapes pass — payloads match real call sites (emailService.js:20, InviteAcceptor.js:29, cloudinary.js:59, lead-intake). The "log-then-enforce with Sentry watching" soak is the external half → human verification. |
| 2 | A reviewer can read documented trust boundaries, and auth-token verification is audited and confirmed across all endpoints | ✓ VERIFIED | All 6 api/*.js endpoints have rows in docs/TRUST_BOUNDARIES.md (send-email, accept-invite, lead-intake, delete-media, health, csp-report); completeness audit test machine-checks every handler basename appears in the doc + the two non-Firebase-token postures; documented auth mechanisms match code (lead-intake x-api-key confirmed at lead-intake.js:19; csp-report open beacon). Fully closed, no external half. |
| 3 | Deleting media removes the asset from Cloudinary via an auth-verified api/delete-media.js (signed Admin API call) — or the audit documents an explicit, reasoned deferral | ✓ VERIFIED (code half + documented deferral) + human (real asset) | delete-media.js: Firebase-token auth gate (401 on invalid), signed Admin destroy (api_secret → cloudinary.config → uploader.destroy, pinned at test line 537), payload validation, idempotent 200-on-not-found (test:545) and 502-on-provider-rejection (test:569). The real-asset-removal external half is documented as an explicit, reasoned deferral (changelog + 04-03-SUMMARY), which the roadmap criterion explicitly permits; also routed to human verification. |

**Score:** 3/3 roadmap criteria — all code-wiring halves verified; SEC-02 fully closed; 2 external halves (SEC-01 soak, SEC-03 real delete) routed to human verification.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tests/api/validate-schemas.test.mjs` | accept-path schema suite (SEC-01) | ✓ VERIFIED | 4 it() cases loading CommonJS validate.js via createRequire; asserts exact live-client shapes pass; no vi.mock |
| `tests/api/api-handlers.test.mjs` (delete-media deltas) | idempotent-200 + provider-502 (SEC-03) | ✓ VERIFIED | Two new cases (lines 545, 569) reuse invoke/loadHandler/mockCloudinary + auth stub; api_secret assertion intact |
| `tests/api/trust-boundaries-audit.test.mjs` | fs-vs-doc completeness audit (SEC-02) | ✓ VERIFIED | it.each over readdirSync(api/) asserts every basename in doc; asserts shared-secret + unauthenticated postures |
| `docs/TRUST_BOUNDARIES.md` (csp-report row) | previously-missing endpoint row + rationale | ✓ VERIFIED | Row at line 33 + prose rationale at line 35 (intentional open beacon) |
| `docs/SAAS_UPGRADE_CHANGELOG.md` (Phase 4 entry) | AUDIT-03 standing task | ✓ VERIFIED | Phase 4 verification entry at line 638; names both test files, enforce-only decision, deferred external halves; env vars by NAME only |
| `api/_lib/validate.js` | zod schemas (subject under test) | ✓ VERIFIED (untouched) | Not modified since dd6364a; enforce-only, no log-mode toggle |
| `api/delete-media.js` | signed Admin delete handler | ✓ VERIFIED (untouched) | Not modified since dd6364a |

### Key Link Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| send-email/accept-invite/lead-intake/delete-media handlers | api/_lib/validate.js | `validateBody(req, res, <schema>)` — server-side gate | ✓ WIRED |
| src/utils/cloudinary.js deleteFromCloudinary | api/delete-media.js | fetch POST {publicId, resourceType} + Bearer token | ✓ WIRED |
| delete-media.js | Cloudinary Admin API | api_secret → cloudinary.config → uploader.destroy (signed) | ✓ WIRED |
| trust-boundaries-audit.test.mjs | api/ + docs/TRUST_BOUNDARIES.md | readdirSync globs handlers, asserts each in doc string | ✓ WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| API test lane green | `npm run test:api` | 4 files, 41 tests passed | ✓ PASS |
| CRA Jest lane green (src/ isolation intact) | `npm run test:ci` | 5 suites, 42 tests passed | ✓ PASS |
| Constants/secret guard | `npm run check:constants` | OK — admin email only in allowed locations | ✓ PASS |
| delete-media idempotent 200-on-not-found | named test (api-handlers.test.mjs:545) | passes within test:api | ✓ PASS |
| delete-media 502-on-provider-rejection | named test (api-handlers.test.mjs:569) | passes within test:api | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SEC-01 | 04-01, 04-03 | zod validation + uniform 400s, live clients never break | ✓ code half SATISFIED / soak → human | validateBody wired in 4 handlers; accept-path suite green; enforce-only by locked decision |
| SEC-02 | 04-02, 04-03 | auth audited + trust boundary documented across all endpoints | ✓ SATISFIED | All 6 endpoints documented + machine-checked completeness audit |
| SEC-03 | 04-01, 04-03 | user-deleted media actually deleted via signed Admin call | ✓ code half SATISFIED / real-delete → human | Auth-gated signed destroy + idempotency/provider branches pinned; real asset removal documented deferral |

All 3 phase requirement IDs (SEC-01, SEC-02, SEC-03) map to Phase 4 in REQUIREMENTS.md (lines 133-135) and are accounted for. No orphaned requirements.

### Anti-Patterns Found

None. No debt markers (TBD/FIXME/XXX/HACK/PLACEHOLDER) in phase-modified files. No secret literals in docs (check:constants green). No production handler modified this session (git confirms validate.js/delete-media.js untouched since dd6364a; all session commits are test/docs).

### Human Verification Required

Two external-resource halves cannot be observed from this environment. Both are intentional, roadmap-permitted deferrals — NOT gaps.

1. **SEC-03 real Cloudinary asset deletion** — Provision CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET as Vercel runtime env vars, deploy, upload a throwaway asset, delete it in-app, confirm removal from the Cloudinary dashboard (200 result:'ok'), then re-delete and confirm idempotent 200 result:'not found'.
2. **SEC-01 log-then-enforce Sentry-watched soak** — Once SENTRY_DSN is provisioned (Phase 3 deferral) and a production soak runs, watch logs/Sentry for any 400s on real client traffic. Enforce-only code has no log-mode toggle by locked decision; the accept-path suite is the local stand-in.

Closure path: `/gsd-verify-work 4` after a production deploy carrying the Cloudinary Admin credentials and the Sentry DSN.

### Gaps Summary

No gaps. The automatable code-wiring halves of all three SEC requirements are green and regression-guarded: server-side zod validation is wired into every mutating endpoint with uniform 400s (reject-path pinned) and proven not to reject real live-client payloads (accept-path suite, shapes confirmed against actual call sites); the client/server trust boundary is documented for all 6 endpoints with a machine-checked completeness audit; and delete-media is an auth-verified signed Admin delete with idempotency and loud-failure branches pinned. The two remaining items (real Cloudinary asset removal, Sentry-watched production soak) genuinely require live credentials + a production deploy and are explicit, reasoned deferrals — roadmap success criterion 3 explicitly permits a documented deferral, and the SEC-01 soak mirrors the Phase 3 SENTRY_DSN deferral precedent. Correct terminal state: human_needed.

---

_Verified: 2026-07-13T09:40:00Z_
_Verifier: Claude (gsd-verifier)_
