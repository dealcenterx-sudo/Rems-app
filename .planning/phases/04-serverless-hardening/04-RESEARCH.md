# Phase 4: Serverless Hardening - Research

**Researched:** 2026-07-13
**Domain:** Serverless input validation (zod), trust-boundary documentation, auth-token verification audit, signed Cloudinary Admin delete
**Confidence:** HIGH (code + tests read directly from repo; verification split modeled on Phase 2/3 precedent)

## Summary

This is a **reconcile-and-verify** phase, not greenfield. All three success-criteria surfaces were already shipped in bulk commit `dd6364a` and reconciled through Phases 1-3: `api/_lib/validate.js` (zod schemas + `validateBody` helper), zod wired into `send-email`/`accept-invite`/`lead-intake`, a new auth-verified `api/delete-media.js` (signed Cloudinary Admin `destroy`), `docs/TRUST_BOUNDARIES.md`, and `docs/ENVIRONMENT.md` with the Cloudinary env vars. `zod ^4.4.3`, `cloudinary ^2.9.0`, `vitest ^4.1.10`, and `node-mocks-http ^1.17.2` are all already dependencies. **No new packages need to be installed.** [VERIFIED: repo package.json]

The dominant finding is that the vast majority of SEC-01/02/03 is **already implemented and already characterized by the existing 23-test `tests/api/api-handlers.test.mjs` suite** (which explicitly covers the uniform 400 zod contract for all three payload endpoints, plus delete-media auth/400/503/200 and csp-report). The phase's real work is therefore: (1) close the three small documentation/coverage GAPS identified below, and (2) — following the exact Phase 2/3 precedent — cleanly SPLIT each criterion into a locally/statically verifiable half (done now, in tests) versus an external-resource-gated half (real Cloudinary credentials + live asset, or the not-yet-live Sentry from Phase 3) that must be routed to `human-verify`.

**Primary recommendation:** Do not rewrite the shipped handlers. Plan tasks that (a) audit each handler's auth check and record it in an SEC-02 audit table, (b) add the missing `csp-report` row to `docs/TRUST_BOUNDARIES.md` with an explicit "why unauthenticated" rationale, (c) add a happy-path / accept-path unit characterization of the zod schemas (the current suite only pins the reject/400 path — the "every live-client payload still succeeds" half of SEC-01 is not yet directly tested), and (d) explicitly document that "log-then-enforce rollout with Sentry watching" cannot be verified here because the code is already in enforce mode and Sentry has no DSN (deferred in Phase 3).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Payload validation (SEC-01) | API / Serverless (`api/_lib/validate.js`) | — | Server-side validation is the trust boundary; client checks are UX-only per CLAUDE.md |
| Auth-token verification (SEC-02) | API / Serverless (each `api/*` handler) | Firebase Identity Toolkit / Admin SDK | Endpoints verify Firebase ID tokens; Firestore rules remain the data-enforcement layer |
| Trust-boundary documentation (SEC-02) | Docs (`docs/TRUST_BOUNDARIES.md`) | — | Human-readable reviewer artifact; no runtime tier |
| Media deletion (SEC-03) | API / Serverless (`api/delete-media.js`) | Cloudinary Admin API | Delete requires the Cloudinary API secret, which must never reach the browser |
| Media-delete invocation | Browser / Client (`src/utils/cloudinary.js` → 3 pages) | API | Client obtains Firebase ID token and POSTs to the server endpoint |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | Every serverless endpoint validates input with zod schemas and returns uniform 400s for bad payloads (log-then-enforce rollout so live clients never break) | `api/_lib/validate.js` defines schemas + `validateBody`; wired into send-email/accept-invite/lead-intake (and delete-media). Uniform 400 body `{error:'Invalid request payload', details:[{path,message}]}` VERIFIED in code and pinned by 4 existing tests. GAP: code is enforce-only (no log-mode flag); "Sentry watching" is blocked on the deferred DSN; accept-path ("live client still succeeds") not directly tested. |
| SEC-02 | Auth-token verification is audited across all endpoints and the client/server trust boundary is documented | `docs/TRUST_BOUNDARIES.md` exists and tables 5 endpoints. Each handler's auth check read and characterized below. GAP: `csp-report` endpoint is missing from the doc; the doc should state explicitly why lead-intake (shared secret) and csp-report (browser beacon) are not Firebase-token-gated. |
| SEC-03 | User-deleted media is actually deleted from Cloudinary via a new auth-verified `api/delete-media.js` (signed Admin API call) | `api/delete-media.js` exists: verifies Firebase token via Identity Toolkit, then calls signed `cloudinary.uploader.destroy`. Wired to 3 client flows. 4 tests exist. GAP: actual deletion against Cloudinary needs real `CLOUDINARY_API_KEY`/`SECRET` + a live asset = human-verify (prod/credential-gated). |
</phase_requirements>

## Current-State Characterization (what exists)

### SEC-01 — Payload validation

`api/_lib/validate.js` [VERIFIED: repo] exports:
- `validateBody(req, res, schema)` — `schema.safeParse(req.body || {})`; on failure sends `res.status(400).json({ error: 'Invalid request payload', details: formatIssues(...) })` and returns `null`; on success returns `result.data`. This is the **uniform 400 contract**. `formatIssues` maps zod `error.issues` → `[{ path: issue.path.join('.'), message }]` (zod v4 `.issues` shape — correct for `^4.4.3`).
- `sendEmailSchema` — requires `to` (email); `subject` required via `superRefine`; `text` OR `html` required via `superRefine`; optional `cc`/`bcc` emails. Blank strings coerced to `undefined`.
- `acceptInviteSchema` — `inviteToken` non-empty string.
- `leadIntakeSchema` — all fields optional trimmed strings; `superRefine` requires at least one of `name`/`email`/`phone`.
- `deleteMediaSchema` — `publicId` non-empty; `resourceType` enum `image|raw|video` default `image`.

All four handlers call `validateBody(...)` AFTER their auth check and `if (!input) return;`. [VERIFIED: repo] The 400 responses are therefore uniform across send-email, accept-invite, lead-intake, and delete-media.

**Enforce vs log mode:** The shipped code is **enforce-only**. There is no log-then-enforce toggle, no validation-mode env flag, and no code path that logs a would-be-400 while still processing the request. The success-criterion phrase "log-then-enforce rollout with Sentry watching" is therefore **not satisfiable as written** — the code went straight to enforce. This must be surfaced as an explicit decision (see Open Questions Q1).

### SEC-02 — Auth audit across ALL endpoints

Read and characterized directly from source [VERIFIED: repo]:

| Endpoint | Auth mechanism | Enforced? | In TRUST_BOUNDARIES.md? |
|----------|----------------|-----------|--------------------------|
| `api/send-email.js` | Firebase ID token via Identity Toolkit `accounts:lookup` (401 on missing/invalid) | Yes | Yes |
| `api/accept-invite.js` | Firebase Admin `verifyIdToken` (401 on missing/invalid); also matches invited email → 403 | Yes | Yes |
| `api/lead-intake.js` | Shared secret `x-api-key` == `LEAD_INTAKE_KEY` (401 on mismatch, 503 if unset). NOT Firebase-token gated — intentional public intake. | Yes (shared secret) | Yes |
| `api/delete-media.js` | Firebase ID token via Identity Toolkit `accounts:lookup` → requires `user.localId` (401) | Yes | Yes |
| `api/health.js` | Optional: no token → bare `{status:'ok'}`; admin token (email==ADMIN_EMAIL && emailVerified) → diagnostics | Yes (progressive) | Yes |
| `api/csp-report.js` | **None** — unauthenticated browser beacon (CSP Report-Only POST). Returns 204. | Intentionally open | **NO — MISSING** |

Every privileged endpoint that mutates state or reveals config verifies a caller proof. The two non-Firebase-token endpoints are intentional: `lead-intake` is a public intake gated by a shared secret; `csp-report` is a fire-and-forget browser beacon that must accept unauthenticated POSTs by design (the browser sends CSP violation reports with no credentials). **GAP:** `csp-report` is absent from the trust-boundaries table and needs a row with an explicit rationale.

### SEC-03 — delete-media signed Admin delete

`api/delete-media.js` [VERIFIED: repo]:
1. POST-only (405 otherwise).
2. `verifyFirebaseUser(req)` — extracts `Bearer` token, calls Identity Toolkit `accounts:lookup`; requires `user.localId` else 401.
3. `validateBody(req, res, deleteMediaSchema)` → 400 on bad payload.
4. Reads `CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET`/`CLOUDINARY_CLOUD_NAME`; 503 if any missing.
5. `cloudinary.config({ cloud_name, api_key, api_secret })` then `cloudinary.uploader.destroy(publicId, { resource_type, invalidate: true })`. **This is a SIGNED Admin API call** — the Cloudinary SDK signs the `destroy` request with the configured `api_secret` (server-side; the secret never leaves the function). [VERIFIED: repo + CITED: cloudinary Node SDK docs]
6. Returns 200 for `result === 'ok'` OR `'not found'` (idempotent); 502 otherwise.

**Client wiring** [VERIFIED: grep src/]: `src/utils/cloudinary.js` `deleteFromCloudinary(publicId, resourceType)` obtains `auth.currentUser.getIdToken()` and POSTs to `/api/delete-media`. Called from 3 flows:
- `src/components/DocumentsPage.js:205` — `deleteFromCloudinary(target.publicId, 'raw')`
- `src/components/PropertiesPage.js:309` — `deleteFromCloudinary(publicId, 'image')`
- `src/components/DealDocumentsTab.js:136` — `deleteFromCloudinary(target.publicId, target.resourceType || 'raw')`

All three deal-document/property/document delete flows route through the hardened server endpoint. `deleteFromCloudinary` returns early (`true`) for records with no `publicId` (legacy records) — matching the documented behavior in TRUST_BOUNDARIES.md line 50.

## Local-vs-External Verification Split

This is the central planning artifact — modeled on the Phase 2 (emulator delegated) and Phase 3 (event-landing deferred) precedent. Each criterion splits into a half verifiable NOW and a half requiring external resources.

| Criterion | Locally / statically verifiable NOW | Requires external resource → `human-verify` |
|-----------|--------------------------------------|-----------------------------------------------|
| SEC-01 uniform 400s | Uniform 400 contract across 4 handlers; reject-path pinned by 4 existing tests; add accept-path (happy-path) schema tests proving live-client payload shapes pass | "with Sentry watching" during a log-then-enforce soak — BLOCKED: code is enforce-only + no Sentry DSN (Phase 3 deferred). Real client traffic observation is prod-gated. |
| SEC-02 auth audit + doc | Audit table (above) from source; add `csp-report` row + rationale to TRUST_BOUNDARIES.md; reviewer-readable | None — fully verifiable via code read + doc. (Two-account prod smoke of auth flows is a standing UAT, optional.) |
| SEC-03 signed delete | Auth gate, signature construction (api_secret → config → signed destroy), payload validation, and 3-flow client wiring — all statically verifiable + 4 unit tests with mocked cloudinary + mocked auth | ACTUAL asset removal from Cloudinary needs real `CLOUDINARY_API_KEY`/`SECRET` + a live uploaded asset. NOT locally observable — credential/prod-gated human-verify. |

**Expected terminal state:** `human_needed` (same as Phase 3) — the automatable halves are fully verifiable and green now; the Cloudinary live-delete + the Sentry-watched rollout are the accepted, documented deferrals.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | ^4.4.3 (installed) | Schema validation + uniform 400 derivation | Already the project's validation lib; `safeParse` + `.issues` power the shared `validateBody` |
| `cloudinary` | ^2.9.0 (installed) | Server-side signed Admin `uploader.destroy` | Official Cloudinary Node SDK; signs Admin requests with `api_secret` server-side |
| `vitest` | ^4.1.10 (installed) | API handler test runner (`npm run test:api` → `vitest run tests/api`) | Existing harness for `tests/api/*.mjs`; isolated from CRA Jest (roots=src/) |
| `node-mocks-http` | ^1.17.2 (installed) | Mock `req`/`res` for handler tests | Used by the existing `invoke()` harness |

**No new packages required.** All dependencies present. [VERIFIED: repo package.json]

## Package Legitimacy Audit

No external packages are installed in this phase — all four libraries (`zod`, `cloudinary`, `vitest`, `node-mocks-http`) are pre-existing repo dependencies shipped and used in prior phases. **Package Legitimacy Gate: N/A (zero new installs).**

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### Handler pattern (all six endpoints follow this)
```
withSentry(async (req, res) => {
  1. method guard         → 405
  2. config/creds present → 503 if missing
  3. auth proof           → 401 (Firebase token) or 401 (x-api-key) — endpoint-specific
  4. validateBody(schema) → 400 uniform zod contract; return early on null
  5. privileged operation → 200 | 502 (provider) | 500 (unexpected, caught by withSentry)
})
```
The **order matters and is consistent**: auth BEFORE validation BEFORE privileged op. delete-media places the 503 creds check AFTER validation; send-email places 503 BEFORE auth — minor ordering variance, not a defect.

### Test pattern (reuse the existing harness)
`tests/api/api-handlers.test.mjs` uses `requireFromRoot.cache` injection to mock `cloudinary` (`mockCloudinary`) and `api/_lib/firebaseAdmin.js` (`mockFirebaseAdmin`), `vi.stubGlobal('fetch', ...)` to mock the Identity Toolkit lookup, and `node-mocks-http` `createMocks` via the `invoke()` helper. **Any new delete-media / validate tests should extend this file (or a sibling `.mjs` in `tests/api/`) using the same harness** — do not introduce a new mocking approach. [VERIFIED: repo]

### Anti-Patterns to Avoid
- **Rewriting shipped handlers.** This is reconcile-and-verify; the subjects are unchanged since `dd6364a`. Modifying them breaks the integrity guard the Phase 2/3 verifications relied on. Add tests and docs, not handler rewrites.
- **Claiming the live Cloudinary delete is verified without real credentials.** It cannot be — route to human-verify.
- **Asserting "log-then-enforce rollout" is complete.** The code is enforce-only; do not paper over this — document the decision.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cloudinary Admin request signing | Manual SHA-1 signature + timestamp | `cloudinary.uploader.destroy` with configured `api_secret` | SDK signs correctly; hand-rolling signatures is an error-prone security footgun |
| Uniform 400 error shape | Per-handler ad-hoc error objects | shared `validateBody` + `formatIssues` | Already exists; guarantees uniformity across endpoints (the SEC-01 requirement) |
| Firebase token verification | JWT decode + JWKS fetch | Identity Toolkit `accounts:lookup` (send-email/delete-media/health) or Admin `verifyIdToken` (accept-invite) | Both are the established patterns already in the codebase |

## Runtime State Inventory

Not a rename/refactor/migration phase — but external state matters for verification:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Live service config | Cloudinary Admin credentials (`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) live in Vercel runtime secrets, NOT git; `CLOUDINARY_CLOUD_NAME` has public fallback `dcirl3j3v` in `api/_lib/config.js` | human-verify that the two secrets are set in Vercel (external dashboard state) |
| Secrets/env vars | `LEAD_INTAKE_KEY` (shared secret), `RESEND_API_KEY`, `FIREBASE_API_KEY` (public fallback), `SENTRY_DSN` (unset — Phase 3 deferred) | Document by NAME only; SENTRY_DSN absence blocks the "Sentry watching" rollout half |
| Stored data | Cloudinary assets keyed by `publicId`; Firestore media records store `publicId` | Live-delete verification needs one real uploaded asset (human-verify) |
| OS-registered state | None | None — verified: no schedulers/daemons touch these endpoints |
| Build artifacts | None | None |

## Common Pitfalls

### Pitfall 1: Treating the reject-path tests as full SEC-01 coverage
**What goes wrong:** The 4 existing 400 tests prove malformed payloads are rejected uniformly, but SEC-01 also requires "every payload the live client actually sends still succeeds." That accept-path is NOT directly tested.
**How to avoid:** Add happy-path unit tests that feed the schemas the exact payload shapes the client sends (audit `src/` send-email/accept-invite call sites for their payload shape), asserting `safeParse().success === true`.
**Warning signs:** A schema that is stricter than what the client emits → silent breakage in production. Cross-check `sendEmailSchema`/`acceptInviteSchema` against actual client fetch bodies.

### Pitfall 2: Assuming csp-report being unauthenticated is a defect
**What goes wrong:** An auditor sees an endpoint with no auth and flags it.
**How to avoid:** Document explicitly in TRUST_BOUNDARIES.md that CSP report beacons are unauthenticated by design (browsers send them credential-less) and the endpoint only logs/forwards, never mutates business data.

### Pitfall 3: Trying to verify the live Cloudinary delete locally
**What goes wrong:** Wasted effort attempting a real destroy without credentials, or worse, deleting a real production asset.
**How to avoid:** Verify auth-gating + signature + wiring statically/with mocks; route the real delete to human-verify (upload a throwaway asset in a live/preview deploy, delete it, confirm 200 `result:'ok'` and Cloudinary console removal).

## Code Examples

### Uniform 400 contract (shipped)
```javascript
// Source: api/_lib/validate.js
const validateBody = (req, res, schema) => {
  const result = schema.safeParse(req.body || {});
  if (!result.success) {
    res.status(400).json({
      error: 'Invalid request payload',
      details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    });
    return null;
  }
  return result.data;
};
```

### Signed Cloudinary Admin delete (shipped)
```javascript
// Source: api/delete-media.js
cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: apiKey, api_secret: apiSecret });
const result = await cloudinary.uploader.destroy(input.publicId, {
  resource_type: input.resourceType, invalidate: true
});
// 200 on 'ok' | 'not found' (idempotent); 502 otherwise
```

### Happy-path schema test to ADD (accept-path, SEC-01 gap)
```javascript
// Source: pattern — extend tests/api/ with vitest
import { sendEmailSchema, deleteMediaSchema } from '../../api/_lib/validate.js';
it('accepts the payload shape the live client sends', () => {
  expect(sendEmailSchema.safeParse({ to: 'a@b.com', subject: 'Hi', text: 'x' }).success).toBe(true);
  expect(deleteMediaSchema.safeParse({ publicId: 'properties/x', resourceType: 'image' }).success).toBe(true);
});
```
Note: `validate.js` is CommonJS (`module.exports`); import via the same `requireFromRoot` pattern the existing suite uses, or `createRequire`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.10 (API lane); Jest via react-scripts (src/ lane, isolated) |
| Config file | none for vitest (CLI `vitest run tests/api`); CRA Jest config in package.json |
| Quick run command | `npm run test:api` |
| Full suite command | `CI=true npm run test:ci && npm run test:api && npm run test:rules` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | Uniform 400 reject for malformed send-email/accept-invite/lead-intake/delete-media | unit | `npm run test:api` | ✅ (23 tests, reject-path pinned) |
| SEC-01 | Live-client payload shapes still PASS (accept-path) | unit | `npm run test:api` | ❌ Wave 0 — add schema happy-path tests |
| SEC-02 | Auth check present on each mutating endpoint (401 on missing/invalid) | unit | `npm run test:api` | ✅ (send-email, accept-invite, delete-media, lead-intake auth tests exist) |
| SEC-02 | Trust boundary doc lists ALL endpoints incl. csp-report | doc review | manual read | ❌ Wave 0 — add csp-report row |
| SEC-03 | delete-media auth-gates + signs + validates + returns 200/502/503 | unit | `npm run test:api` | ✅ (4 delete-media tests) |
| SEC-03 | Real asset removed from Cloudinary | manual | live/preview deploy + real creds | ❌ human-verify (credential/prod-gated) |

### Sampling Rate
- **Per task commit:** `npm run test:api`
- **Per wave merge:** `CI=true npm run test:ci && npm run test:api`
- **Phase gate:** All three lanes green + docs updated before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] Accept-path (happy-path) schema characterization tests — proves live-client payloads still succeed (SEC-01 second half). Net-new; no existing coverage.
- [ ] `docs/TRUST_BOUNDARIES.md` — add `api/csp-report.js` row + "unauthenticated browser beacon by design" rationale (SEC-02).
- [ ] (Optional) dedicated `validate.js` unit file if separating schema tests from handler tests is preferred; otherwise extend `api-handlers.test.mjs`.

*(delete-media handler tests, all four payload-endpoint 400 tests, and all auth tests already exist — reuse, do not rebuild.)*

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Firebase ID token verification (Identity Toolkit / Admin `verifyIdToken`); shared-secret for public intake |
| V3 Session Management | no | Stateless serverless; token per request |
| V4 Access Control | yes | Per-endpoint auth proof; admin gate on health; Firestore rules remain data-enforcement layer |
| V5 Input Validation | yes | zod schemas + uniform 400 via `validateBody` (the core of SEC-01) |
| V6 Cryptography | yes | Cloudinary SDK signs Admin `destroy` with `api_secret` server-side — never hand-rolled, secret never sent to browser |

### Known Threat Patterns for serverless + Cloudinary
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated media deletion | Elevation of Privilege / Tampering | Firebase token gate in `delete-media` before any destroy |
| Cloudinary secret leakage to client | Information Disclosure | Secret only in Vercel runtime env + `api/` server; browser calls the endpoint, never Cloudinary Admin directly |
| Malformed payload → unexpected write | Tampering | zod `safeParse` rejects with uniform 400 before the privileged op |
| CSP report beacon abuse (spam) | DoS | Endpoint only logs/forwards, no DB write, returns 204; acceptable low-risk open beacon |
| Payload schema stricter than client → outage | (Availability) | Accept-path tests + (ideally) log-then-enforce; here mitigated by permissive schemas — verify client shapes |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Unvalidated req.body in handlers | Shared zod `validateBody` + uniform 400 | shipped dd6364a | SEC-01 satisfied in code |
| Client-side Cloudinary delete (impossible — needs Admin secret) or orphaned assets | Server `delete-media` signed Admin destroy | shipped dd6364a | SEC-03 satisfied in code |
| zod v3 `.errors` | zod v4 `.issues` | zod v4 | `formatIssues` uses `.issues` — correct for ^4.4.3 |

**Deprecated/outdated:** none relevant to this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `cloudinary.uploader.destroy` with configured `api_secret` produces a correctly signed Admin API request | SEC-03 / Code Examples | Low — documented SDK behavior; verifiable only by live delete (human-verify) |
| A2 | The permissive schemas accept all shapes the live client currently sends (so enforce-mode won't break clients) | SEC-01 / Pitfall 1 | Medium — must be confirmed by auditing client call-site payloads + accept-path tests; the whole point of the log-then-enforce criterion |
| A3 | csp-report being unauthenticated is intended (browser beacon), not an oversight | SEC-02 | Low — matches CSP spec; confirm with user when documenting |

## Open Questions (RESOLVED)

> Both resolved by orchestrator-locked decisions at plan time: Q1 (log-then-enforce with Sentry watching) → accept enforce-only, add accept-path tests proving live-client payloads pass (Plan 04-01), defer the Sentry-watched soak to a human-verify checkpoint tied to the Phase 3 DSN (Plan 04-03) — no log-mode toggle added. Q2 (delete-media 200-on-not-found) → keep the idempotent behavior, characterize it (Plan 04-01) and document it as intended (changelog).


1. **"Log-then-enforce rollout with Sentry watching" — how to satisfy given the code is enforce-only and Sentry has no DSN?**
   - What we know: shipped code returns 400 immediately (enforce); no log-mode flag; SENTRY_DSN unset (Phase 3 deferred).
   - What's unclear: whether the user wants a real log-mode added, or accepts enforce-mode justified by permissive schemas + accept-path tests.
   - Recommendation: Do NOT add a log-mode flag (scope creep, and Sentry can't watch without a DSN). Instead: audit client payload shapes, add accept-path tests proving no live shape 400s, and document that the "Sentry-watched soak" is superseded/deferred (blocked on the Phase-3-deferred DSN). Route the live-traffic observation to the same human-verify bucket as OBS-01/02/03.

2. **Should delete-media 200-on-`not found` be treated as success?**
   - What we know: code returns 200 for both `ok` and `not found` (idempotent delete).
   - Recommendation: Keep — idempotency is correct; document it as intended behavior.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| zod | validate.js | ✓ | ^4.4.3 | — |
| cloudinary SDK | delete-media | ✓ | ^2.9.0 | — |
| vitest | test:api | ✓ | ^4.1.10 | — |
| node-mocks-http | handler tests | ✓ | ^1.17.2 | — |
| CLOUDINARY_API_KEY / _SECRET | live media delete | ✗ (not in local env) | — | none — human-verify in Vercel/preview |
| SENTRY_DSN | "Sentry watching" rollout half | ✗ (Phase 3 deferred) | — | none — deferred to post-deploy human-verify |

**Missing dependencies with no fallback:** Cloudinary Admin credentials + a live asset (real delete verification); Sentry DSN (rollout observation). Both are external/prod-gated → human-verify, consistent with Phase 3.
**Missing dependencies with fallback:** none.

## Project Constraints (from CLAUDE.md / .claude/CLAUDE.md)
- No secrets in code or docs — document env vars by NAME only (ENVIRONMENT.md already complies).
- Backward-compatible changes only; do not break Google/email-password auth flows or current media-delete workflows.
- Build + lint + tests before shipping (`npm run build`, `npm run lint`, `npm run test:ci`, `npm run test:api`).
- Do not hardcode Cloudinary cloud name in components — single config; server uses `api/_lib/config.js` fallback + Vercel secret.
- Each phase must leave `main` shippable; small reviewable changes over rewrites.
- Firestore rules remain the data-enforcement layer; serverless validation is additive, not a replacement.

## Sources

### Primary (HIGH confidence)
- Repo source read directly: `api/_lib/validate.js`, `api/send-email.js`, `api/accept-invite.js`, `api/lead-intake.js`, `api/delete-media.js`, `api/health.js`, `api/csp-report.js`, `api/_lib/config.js`, `src/utils/cloudinary.js`, `tests/api/api-handlers.test.mjs`, `docs/TRUST_BOUNDARIES.md`, `docs/ENVIRONMENT.md`, `package.json`
- `.planning/phases/02-test-scaffolding/02-VERIFICATION.md` and `.planning/phases/03-observability/03-VERIFICATION.md` (local-vs-external split precedent)
- Client call-site grep: DocumentsPage.js:205, PropertiesPage.js:309, DealDocumentsTab.js:136

### Secondary (MEDIUM confidence)
- Cloudinary Node SDK `uploader.destroy` signing behavior [CITED: cloudinary docs — SDK signs Admin requests with api_secret]

### Tertiary (LOW confidence)
- none

## Metadata

**Confidence breakdown:**
- Current-state characterization: HIGH — all code and tests read directly.
- SEC-01/02/03 gap analysis: HIGH — gaps derived from source, not inference.
- Local-vs-external split: HIGH — mirrors verified Phase 2/3 pattern.
- Cloudinary signing detail: MEDIUM — SDK behavior cited, not live-tested.

**Research date:** 2026-07-13
**Valid until:** 2026-08-12 (stable; shipped code unlikely to move before planning)
