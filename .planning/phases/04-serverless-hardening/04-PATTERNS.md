# Phase 4: Serverless Hardening - Pattern Map

**Mapped:** 2026-07-13
**Files analyzed:** 3 (1 net-new test file/additions, 1 doc row, plus 4 existing self-analogs characterized)
**Analogs found:** 3 / 3 (all net-new work has a strong in-repo analog)

> This is a **reconcile-and-verify** phase. Most surfaces shipped in commit `dd6364a`. The net-new work is small: (1) accept-path (happy-path) zod schema tests, (2) delete-media auth/signature unit assertions (mostly already present — extend, don't rebuild), and (3) one `csp-report.js` row added to `docs/TRUST_BOUNDARIES.md`. Do NOT rewrite shipped handlers.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `tests/api/api-handlers.test.mjs` (extend) or new `tests/api/validate-schemas.test.mjs` | test (unit) | transform (schema validation) | `tests/api/api-handlers.test.mjs` (self / same file) | exact |
| delete-media accept-path unit assertions (extend `tests/api/api-handlers.test.mjs`) | test (unit) | request-response + file-I/O (media delete) | `tests/api/api-handlers.test.mjs` delete-media block (lines 465-544) | exact |
| `docs/TRUST_BOUNDARIES.md` (add csp-report row) | doc | — | existing endpoint rows in same table (lines 28-32) | exact |

### Self-analogs (shipped code — extract patterns FROM these, do not modify)

| Shipped File | Role | Data Flow | Purpose |
|--------------|------|-----------|---------|
| `api/_lib/validate.js` | utility (validator) | transform | zod schemas + `validateBody` uniform 400 contract |
| `api/delete-media.js` | route/handler | request-response + file-I/O | auth-gated signed Cloudinary Admin destroy |
| `api/csp-report.js` | route/handler | event-driven (beacon) | unauthenticated CSP violation sink → 204 |
| `docs/TRUST_BOUNDARIES.md` | doc | — | reviewer artifact: endpoint auth table |

---

## Pattern Assignments

### NET-NEW: Accept-path (happy-path) schema tests

**Role:** test (unit) · **Data flow:** transform · **Analog:** `tests/api/api-handlers.test.mjs`

There are two viable structures. **Preferred:** direct-schema unit tests (no handler, no mocks) since the accept-path only needs to prove the schemas pass live-client shapes. Import the CommonJS `validate.js` via the same `createRequire` pattern the suite already uses (`tests/api/api-handlers.test.mjs:1,5`).

**Import pattern to copy** (from `tests/api/api-handlers.test.mjs:1-9`):
```javascript
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const requireFromRoot = createRequire(new URL('../../package.json', import.meta.url));
const { sendEmailSchema, acceptInviteSchema, leadIntakeSchema, deleteMediaSchema } =
  requireFromRoot('./api/_lib/validate.js'); // CommonJS module.exports — validate.js:89-95
```

**Live-client payload shapes to assert PASS** — sourced from actual client call sites (do not invent shapes; these are what production sends):

| Schema | Exact client body | Source call site |
|--------|-------------------|------------------|
| `sendEmailSchema` | `{ to, subject, text, html, cc, bcc }` (subject + one of text/html required) | `src/utils/emailService.js:20` |
| `acceptInviteSchema` | `{ inviteToken }` | `src/components/InviteAcceptor.js:29` |
| `deleteMediaSchema` | `{ publicId, resourceType }` (resourceType `'image'\|'raw'`) | `src/utils/cloudinary.js:59`; callers pass `'raw'` (`DocumentsPage.js:205`, `DealDocumentsTab.js:136`) and `'image'` (`PropertiesPage.js:309`) |
| `leadIntakeSchema` | optional trimmed fields; at least one of name/email/phone | `api/lead-intake.js` (public intake) |

**Test body pattern** (mirror the assertion style — `safeParse().success`):
```javascript
describe('validate schemas — accept-path (live client shapes still pass)', () => {
  it('sendEmailSchema accepts the emailService.js payload', () => {
    // minimal required shape (subject + text) — emailService.js:8,20
    expect(sendEmailSchema.safeParse({ to: 'buyer@example.com', subject: 'Hi', text: 'Body' }).success).toBe(true);
    // html instead of text also passes (superRefine: text OR html) — validate.js:49-55
    expect(sendEmailSchema.safeParse({ to: 'buyer@example.com', subject: 'Hi', html: '<p>x</p>' }).success).toBe(true);
    // blank optional cc/bcc coerced to undefined, not a 400 — validate.js:20-32
    expect(sendEmailSchema.safeParse({ to: 'buyer@example.com', subject: 'Hi', text: 'x', cc: '', bcc: '' }).success).toBe(true);
  });

  it('acceptInviteSchema accepts { inviteToken } from InviteAcceptor.js:29', () => {
    expect(acceptInviteSchema.safeParse({ inviteToken: 'invite-1' }).success).toBe(true);
  });

  it('deleteMediaSchema accepts image and raw client shapes (cloudinary.js:59)', () => {
    expect(deleteMediaSchema.safeParse({ publicId: 'properties/x', resourceType: 'image' }).success).toBe(true);
    expect(deleteMediaSchema.safeParse({ publicId: 'documents/y', resourceType: 'raw' }).success).toBe(true);
    // resourceType defaults to 'image' when omitted — validate.js:86
    expect(deleteMediaSchema.safeParse({ publicId: 'z' }).success).toBe(true);
  });

  it('leadIntakeSchema accepts a single identifying field', () => {
    expect(leadIntakeSchema.safeParse({ email: 'lead@example.com', source: 'Website' }).success).toBe(true);
  });
});
```

**Contrast — the reject-path is ALREADY pinned** (do not duplicate): `api-handlers.test.mjs` lines 106-125 (send-email 400), 217-237 (accept-invite 400), 398-416 (lead-intake 400), 477-494 (delete-media 400). New tests are the *complement* (accept-path).

---

### NET-NEW: delete-media auth-gate + signature unit assertions

**Role:** test (unit) · **Data flow:** request-response + file-I/O · **Analog:** `tests/api/api-handlers.test.mjs:465-544`

Most of this ALREADY exists — the `describe('api/delete-media')` block (lines 465-544) covers: 401 no-token (466-475), 400 malformed (477-494), 503 missing creds (496-510), and 200 happy delete with signature assertions (512-543). **Extend, do not rebuild.** The gaps worth adding are the `not found` idempotency 200 and the 502 provider-rejection branch (`delete-media.js:54-58`), plus explicit assertion that `cloudinary.config` receives `api_secret` (proving signed call).

**Cloudinary module-cache mock pattern to copy** (from `api-handlers.test.mjs:33-40`):
```javascript
const cloudinaryPath = requireFromRoot.resolve('cloudinary'); // line 6
const mockCloudinary = (v2) => {
  requireFromRoot.cache[cloudinaryPath] = {
    id: cloudinaryPath, filename: cloudinaryPath, loaded: true,
    exports: { v2 }               // delete-media.js:2 does require('cloudinary').v2
  };
};
```

**Auth `fetch` (Identity Toolkit) mock pattern to copy** (from `api-handlers.test.mjs:478-481`) — delete-media verifies via `accounts:lookup` and requires `user.localId` (`delete-media.js:12-21,30`):
```javascript
vi.stubGlobal('fetch', vi.fn(async () => ({
  ok: true,
  json: async () => ({ users: [{ localId: 'user-1', email: 'agent@example.com' }] })
})));
```

**Signature/auth assertion pattern to copy** (from `api-handlers.test.mjs:512-543`) — proves the signed Admin call:
```javascript
process.env.CLOUDINARY_API_KEY = 'cloudinary-key';
process.env.CLOUDINARY_API_SECRET = 'cloudinary-secret';   // the secret that signs the request
const destroy = vi.fn(async () => ({ result: 'ok' }));
const config = vi.fn();
mockCloudinary({ config, uploader: { destroy } });
// ...invoke...
expect(config).toHaveBeenCalledWith(expect.objectContaining({
  cloud_name: 'dcirl3j3v', api_key: 'cloudinary-key', api_secret: 'cloudinary-secret'
}));  // secret reaches config server-side → SDK signs destroy — delete-media.js:43-47
expect(destroy).toHaveBeenCalledWith('properties/image-1', { resource_type: 'image', invalidate: true });
```

**Gaps to add (new `it()` cases in the same block):**
```javascript
// idempotent 'not found' → still 200 — delete-media.js:54
it('returns 200 when Cloudinary reports not found (idempotent)', async () => {
  // ...same setup but destroy returns { result: 'not found' }...
  expect(result.status).toBe(200);
  expect(result.body).toEqual({ ok: true, result: 'not found' });
});

// provider rejection → 502 — delete-media.js:58
it('returns 502 when Cloudinary rejects the delete', async () => {
  // ...destroy returns { result: 'error' }...
  expect(result.status).toBe(502);
  expect(result.body.error).toBe('Media provider rejected the delete');
});
```

**Harness invariants (reuse verbatim — do NOT introduce vi.mock):**
- `invoke()` helper: `api-handlers.test.mjs:47-59` (node-mocks-http `createMocks`, POST default).
- `loadHandler()` / cache-clearing: lines 42-45, 11-22.
- `beforeEach`/`afterEach` env + cache reset: lines 75-91. New delete-media env vars are already cleared (lines 81-82).
- Same module-cache injection shape is confirmed in the sibling `tests/api/withSentry.test.mjs:11-18` (`mockSentryNode`) — this is the established, ONLY mocking approach for this lane.

---

### NET-NEW: `docs/TRUST_BOUNDARIES.md` csp-report row

**Role:** doc · **Analog:** existing rows in the same table, `docs/TRUST_BOUNDARIES.md:26-32`

**Column format to copy** (header at lines 26-27):
```markdown
| Endpoint | Caller Proof | Privileged Operation | Failure Behavior |
|---|---|---|---|
```

**Closest-style existing row** — `api/health.js` (line 32) is the analog for a "progressive / intentionally-open" endpoint:
```markdown
| `api/health.js` | None for public status; admin Firebase token for details. | Reports integration diagnostics only to admin. | Public/non-admin callers receive only `{ "status": "ok" }`. |
```

**Row to ADD** (insert after the `health.js` row at line 32) — csp-report is an intentionally-unauthenticated browser beacon, verified against `api/csp-report.js:28-48`:
```markdown
| `api/csp-report.js` | None by design — browsers post CSP Report-Only violations credential-less. | Logs/forwards the violation report (no business-data mutation). | Non-POST returns 405; all valid reports return 204. |
```

**Rationale sentence to add near the table** (matches the doc's prose style, cf. lines 46-50 Cloudinary section) — surfaces WHY it is open so an auditor does not flag it:
> `api/csp-report.js` is intentionally unauthenticated: browsers send CSP violation beacons without credentials, and the endpoint only records the report (never writes business data), so requiring a token would silently drop all reports. This mirrors the CSP spec and is a deliberate, low-risk open beacon.

Also note the existing lead-intake row (line 30) already documents the shared-secret (non-Firebase) rationale — csp-report should be the only other non-Firebase-token endpoint documented.

---

## Shared Patterns

### Uniform 400 validation contract
**Source:** `api/_lib/validate.js:8-18` (+ `formatIssues` 3-6)
**Apply to:** every accept-path/reject-path test assertion
```javascript
// on failure the shared validateBody sends this exact body:
{ error: 'Invalid request payload', details: [{ path: 'field.path', message: '...' }] }
// zod v4 .issues shape (validate.js:3-6) — correct for zod ^4.4.3
```
Tests assert `result.body.error === 'Invalid request payload'` and `details` contains `expect.objectContaining({ path: '<field>' })` — see `api-handlers.test.mjs:120-124`.

### Handler ordering invariant (auth → validate → privileged op)
**Source:** `api/delete-media.js:24-58`; documented in RESEARCH.md "Handler pattern"
**Apply to:** delete-media test expectations
Order: `405` (method) → `401` (auth, before body validation) → `400` (validateBody) → `503` (creds) → `200`/`502`. Tests must supply a valid auth `fetch` mock BEFORE expecting a 400, because auth runs first (`delete-media.js:29-35`).

### Module-cache mock injection (the ONLY mocking approach for tests/api)
**Source:** `tests/api/api-handlers.test.mjs:24-40`; mirrored in `tests/api/withSentry.test.mjs:11-18`
**Apply to:** any new API-lane test
Inject via `requireFromRoot.cache[path] = { id, filename, loaded: true, exports }`. Do NOT use `vi.mock`. Clear the handler from cache before each require (`loadHandler`, lines 42-45) so fresh mocks and module-level flags reset.

### Test runner / commands
**Source:** RESEARCH.md Validation Architecture; `package.json` scripts
- Quick: `npm run test:api` (→ `vitest run tests/api`)
- Full gate: `CI=true npm run test:ci && npm run test:api`
- vitest ^4.1.10 lane is isolated from CRA Jest (roots=`src/`); new `.mjs` files under `tests/api/` are auto-discovered.

---

## No Analog Found

None. Every net-new item has a strong in-repo analog (same file for tests, same table for the doc row).

## Metadata

**Analog search scope:** `api/`, `api/_lib/`, `tests/api/`, `docs/`, `src/utils/`, `src/components/`
**Files scanned:** `api/_lib/validate.js`, `api/delete-media.js`, `api/csp-report.js`, `docs/TRUST_BOUNDARIES.md`, `tests/api/api-handlers.test.mjs`, `tests/api/withSentry.test.mjs`, `src/utils/emailService.js`, `src/utils/cloudinary.js`, `src/components/InviteAcceptor.js` (+ grep of delete-media call sites)
**Pattern extraction date:** 2026-07-13
