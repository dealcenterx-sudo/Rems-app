# Phase 2: Test Scaffolding - Pattern Map

**Mapped:** 2026-07-12
**Files analyzed:** 5 shipped artifacts + 3 optional coverage-deepening targets
**Analogs found:** 5 / 5 (self-analogs — code shipped in commit `dd6364a`)

> **Reconcile-and-verify phase, not greenfield.** The test infrastructure already exists and passes. Every file below IS its own analog: new/optional test cases must copy the established pattern from the block cited, not invent a new style. Deviation from these patterns is a defect, not a choice.

## File Classification

| File (already shipped) | Role | Data Flow | Closest Analog | Match Quality |
|------------------------|------|-----------|----------------|---------------|
| `tests/api/api-handlers.test.mjs` | test (unit, in-process handler) | request-response (mocked, no network) | itself (5 `describe` blocks) | self / exact |
| `tests/rules/firestore.rules.test.js` | test (integration, emulator-backed) | CRUD (allow/deny assertions) | itself (3 `describe` blocks) | self / exact |
| `firebase.json` | config (emulator host/port) | N/A | itself | self / exact |
| `package.json` scripts (`test:api`, `test:rules`) | config (npm script wiring) | N/A | itself + existing `test:ci` | self / exact |
| `.github/workflows/ci.yml` | config (CI pipeline) | batch / pipeline | itself | self / exact |

### Optional coverage deepenings (RESEARCH.md gaps) → analog to copy

| Proposed new test case | Gap ID | Role | Closest existing block to copy | Match Quality |
|------------------------|--------|------|--------------------------------|---------------|
| `users`-block role/assignment immutability | G-R2 | rules test | `firestore.rules.test.js` "does not grant admin access from the admin email…" block (lines 144-149) + seed docs (lines 29-56) | exact (same file, same helpers) |
| Remaining 5 portal collections (`deal-parties`, `deal-channels`, `deal-documents`, `deal-progress`, `deal-lender-pushes`) create+read | G-R1 | rules test | `firestore.rules.test.js` "allows assigned deal reads and deal-portal access…" block (lines 164-181) | exact (copy `deal-messages` assertions) |
| `send-email` / `accept-invite` 200-success payload shape | G-A1 | api test | `api-handlers.test.mjs` "creates the lead and notification…" (lines 286-321) — the only 200 happy-path in the file | exact (same mocking harness) |
| `accept-invite` missing-token 401 + 404 invite-not-found | G-A2 | api test | `api-handlers.test.mjs` "rejects requests with an invalid Firebase auth token" (lines 167-184) | exact |
| `405` method-guard assertions (all handlers) | G-A3 | api test | `api-handlers.test.mjs` `invoke()` helper (lines 47-59) — pass `method: 'GET'` | exact |

## Pattern Assignments

### `tests/api/api-handlers.test.mjs` (test, request-response)

**Analog:** itself. Any new API test case copies these four patterns verbatim.

**Imports + module-cache mocking harness** (lines 1-45): the file resolves real handler paths off `package.json`, mocks Firebase Admin / Cloudinary by writing fake modules directly into `requireFromRoot.cache`, and reloads the handler per test. New tests reuse `mockFirebaseAdmin(...)`, `mockCloudinary(...)`, `loadHandler(name)` — do not re-implement.

**Invoke + assert helper** (lines 47-59): `invoke(handler, {headers, body})` runs a `node-mocks-http` POST and returns `{status, body}`. For a 405 test (G-A3), pass `{ method: 'GET' }`.

**Per-test env reset** (lines 75-91): `beforeEach` clears the module cache, restores mocks, and deletes every secret env var; `afterEach` clears cache + unstubs globals. New tests set only the env vars they need inside the test body (e.g. `process.env.RESEND_API_KEY = 'resend-key'`).

**Auth-token stub pattern** (lines 108-111, 337-339): a valid Firebase token is faked by stubbing `fetch` to return `{ ok:true, json: async () => ({ users:[{ email/localId }] }) }`. Handlers using `getAuthAdmin` instead mock `verifyIdToken` (lines 189-192).

**Payload-validation assertion shape** (lines 119-125): 400s assert `body.error === 'Invalid request payload'` and `body.details` contains `expect.objectContaining({ path: '<field>' })` — the zod `details[].path` contract. Copy this shape for any new 400 test.

**200 happy-path pattern** (lines 286-321): mock the db `collection(name)` to return a `makeCollection({ add })` per collection, assert `result.status === 200`, assert the exact `body` payload, and assert `add` was called with `expect.objectContaining(...)`. This is the ONLY existing 200 template — G-A1 (send-email/accept-invite success) must copy it, asserting the documented shapes `{ok:true,id}` and `{ok:true,dealId,propertyAddress}`.

---

### `tests/rules/firestore.rules.test.js` (test, CRUD)

**Analog:** itself. Any new rules assertion copies these patterns.

**Emulator init reads live rules from disk** (lines 101-110): `initializeTestEnvironment({ projectId, firestore: { host:'127.0.0.1', port:8080, rules: readFileSync('firestore.rules','utf8') } })`. Never inline rule strings — always read the on-disk file so the test stays honest when a later phase edits rules.

**Seed via `withSecurityRulesDisabled`** (lines 25-99): a single `seed()` writes the fixed dataset — `admin-uid` (role admin), `agent-a` (`assignedProperties:['prop-assigned']`, `assignedDeals:['deal-assigned']`), `other-user`, and `admin-email-agent` (admin email, role agent). `beforeEach` runs `clearFirestore()` then `seed()`. New assertions should reuse these existing fixture docs; add a new seed doc only when no existing one fits.

**Authed-context accessor** (lines 22-23): `authedDb(uid, claims)` → `testEnv.authenticatedContext(uid, claims).firestore()`. Drive the emulator through the client SDK (`getDoc`/`setDoc`/`addDoc`/`updateDoc`/`deleteDoc`).

**Allow/deny assertion pattern** (lines 122-135): wrap every operation in `assertSucceeds(...)` or `assertFails(...)` from `@firebase/rules-unit-testing`. Group related assertions in one `it`.

**Portal `canAccessDeal()` pattern to replicate for G-R1** (lines 172-180): the `deal-messages` block asserts read of a seeded portal doc + create allowed for `deal-assigned` + create denied for `deal-other`. For the five untested collections copy this exact three-assertion shape, substituting the collection name and (for `deal-parties`/`deal-channels`/`deal-documents`/`deal-progress`) adding the `update/delete` branch (those allow non-admin update/delete via `canAccessDeal`, unlike `deal-messages`/`deal-lender-pushes` which restrict update/delete to admin — see `firestore.rules` lines 105-136).

**`users`-block pattern to author for G-R2** (analog: lines 144-149 admin-email block + rules at `firestore.rules` lines 35-56): assert self-create with `role:'admin'` fails; self-update changing `role`, `assignedProperties`, or `assignedDeals` fails; a benign self-update (unchanged role/assignments) succeeds; admin update of another user's role succeeds. Use existing `agent-a` / `admin-uid` fixtures. This is the explicit safety net for Phase 6 / SEC-04.

---

### `firebase.json` (config)

**Analog:** itself (lines 1-16). Emulator config: `firestore.rules` → `firestore.rules`, `firestore.indexes` → `firestore.indexes.json`, emulator on `127.0.0.1:8080` (matches the port hardcoded in the rules test line 106), `ui.enabled:false`, `singleProjectMode:true`. Do not change the port or `singleProjectMode` — the rules test and `test:rules` script depend on them. No modification expected this phase.

---

### `package.json` scripts (config)

**Analog:** itself (lines 27-37).

```
"test:ci":    "react-scripts test --watchAll=false"   // CRA Jest, src/ only — DO NOT rename or repoint
"test:api":   "vitest run tests/api"
"test:rules": "firebase emulators:exec --only firestore --project rems-rules-test \"vitest run tests/rules\""
```

The `--project rems-rules-test` value must match `projectId` in the rules test (line 20). `test:ci` is frozen (criterion 3 requires CRA Jest to behave exactly as before). No new scripts expected unless the planner adds a convenience runner.

---

### `.github/workflows/ci.yml` (config, pipeline)

**Analog:** itself (lines 1-56). The gate order is `check:constants → lint → test:ci → test:api → test:rules → build`.

- **Java 21 install** (lines 25-29): `actions/setup-java@v4`, `distribution: temurin`, `java-version: 21` — required by firebase-tools 15.x's emulator. This step is what makes `test:rules` runnable in CI (it cannot run on the Java-8 dev host).
- **Node 24** (lines 19-23) with `cache: npm`; `npm ci` (line 32) resolves the platform-correct rolldown binding for Vitest.
- **Build env** (lines 51-55): `CI: false` deliberately, so CRA does not promote warnings to errors — keep parity comment intact.

New test cases require no CI change: `test:api` and `test:rules` already sweep the whole `tests/` tree.

## Shared Patterns

### Vitest as the second runner (isolation from CRA Jest)
**Source:** `package.json` (`test:api`/`test:rules` invoke `vitest run <path>`); CRA Jest `roots` = `<rootDir>/src`.
**Apply to:** All new test files.
**Rule:** New handler/rules tests MUST live under `tests/` (never `src/`), or CRA Jest will sweep them and break criterion 3. The API file uses `.mjs`; the rules file uses `.js` — both are outside `src/` so `react-scripts test` cannot see them.

### zod validation contract
**Source:** `api/_lib/validate.js` (asserted via `api-handlers.test.mjs` lines 119-125).
**Apply to:** Every API test asserting a 400.
**Contract:** `{ error: 'Invalid request payload', details: [{ path: '<field>' }, ...] }`.

### Emulator-truth pattern
**Source:** `firestore.rules.test.js` lines 101-110.
**Apply to:** Every rules test.
**Rule:** Load rules from disk with `readFileSync('firestore.rules','utf8')`; never hardcode rule text. Assertions run against the current on-disk rules — the CI safety net for the Console-paste deploy channel.

### Fixed-fixture seeding
**Source:** `firestore.rules.test.js` lines 25-99.
**Apply to:** Every rules test.
**Rule:** Reuse the four seeded user docs (`admin-uid`, `agent-a`, `other-user`, `admin-email-agent`) and the seeded contacts/properties/deals/portal/log docs. `beforeEach` already does `clearFirestore()` + `seed()`; add a seed doc only when no existing fixture fits the new assertion.

## No Analog Found

None. Every file this phase touches already exists in commit `dd6364a` and serves as its own analog. All optional coverage deepenings map cleanly to an existing test block (table above). No file requires falling back to RESEARCH.md `## Code Examples`.

## Environmental Notes for the Planner (not code patterns)

These are run prerequisites, not analog files, but they gate verification:
- **Java 21** required to run `test:rules` locally (dev host has Java 8; CI has 21). RESEARCH.md recommends documenting this and accepting a green CI run as proof for criterion 1.
- **Clean `npm ci`** on the host resolves the correct `@rolldown/binding-*` for Vitest 4.x.

## Metadata

**Analog search scope:** `tests/api/`, `tests/rules/`, `firebase.json`, `package.json`, `.github/workflows/`, `firestore.rules`
**Files scanned:** 6 (all read in full or targeted ranges; no re-reads)
**Pattern extraction date:** 2026-07-12
