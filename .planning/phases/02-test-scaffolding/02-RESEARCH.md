# Phase 2: Test Scaffolding - Research

**Researched:** 2026-07-12
**Domain:** Test characterization of already-shipped test infrastructure — Firestore rules (emulator-backed) + serverless API handlers
**Confidence:** HIGH (all findings verified by reading shipped files and running the suites locally)

## Summary

This phase's code was **already shipped** by a prior automated run (commit `dd6364a`) and is being **reconciled and verified** under GSD — not built greenfield. The artifacts exist and are wired: `tests/rules/firestore.rules.test.js` (7 `it` blocks), `tests/api/api-handlers.test.mjs` (16 tests across 5 `describe` blocks), `firebase.json` (emulator config), the `test:api` / `test:rules` npm scripts, and CI wiring that installs Java 21 and runs both suites alongside the existing lint → test → build pipeline.

The characterization work is **substantially complete and passing**. The API suite runs green (16/16) and the CRA Jest suite is unchanged (29/29, 3 suites — only `src/` is swept). All three success criteria are structurally satisfied by the shipped code. The dominant gap is **environmental, not code**: the shipped `test:rules` cannot run on this developer machine because the Firestore emulator in firebase-tools 15.x **requires Java 21+** and the local JDK is Java 8; and a cross-architecture `node_modules` artifact (Apple-Silicon binding present on an x64 host) blocks Vitest until a clean reinstall. CI is unaffected — it installs Java 21 and runs `npm ci` fresh.

**Primary recommendation:** Plan this as a **reconcile-and-verify** phase, not a build. (1) Document the local-run prerequisites (Java 21 + `npm ci`) so criterion 1 is reproducible off-CI; (2) verify both suites green in a Java-21 environment (CI is acceptable proof); (3) decide whether to broaden rules coverage to the untested deal-portal collections and the `users` collection (high value because Phase 6/SEC-04 will mutate exactly those rules). No new packages are needed.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | `npm run test:rules` — emulator-backed tests cover userId scoping, admin override, assignedProperties/assignedDeals, deal-portal `canAccessDeal()` inheritance, activity_log append-only | Shipped `tests/rules/firestore.rules.test.js` covers all five categories (see Characterization). GAP: only `deal-messages` represents the 6 deal-portal collections; `users`-collection rules untested; **local run blocked by Java 8 (needs 21)**. |
| TEST-02 | `npm run test:api` — handler tests cover auth validation, payload validation, error paths for send-email, accept-invite, lead-intake | Shipped `tests/api/api-handlers.test.mjs` covers all three categories for all three handlers (plus delete-media + csp-report bonus). Runs 16/16 green locally. Optional deepening: 200 success + some branch paths for send-email/accept-invite. |
| TEST-03 | CI runs rules + API suites alongside lint → test → build without disturbing CRA's Jest | CI (`ci.yml`) runs check:constants → lint → test:ci → **test:api → test:rules** → build, with Java 21 installed. CRA Jest `roots` = `<rootDir>/src` only; `tests/` is structurally isolated. Verified: `test:ci` still 29/29, tests/ not swept. **MET.** |

> **No CONTEXT.md exists for this phase yet** (`.planning/phases/02-test-scaffolding/` is empty). There are no locked decisions from `/gsd-discuss-phase` constraining this research. The open judgment calls (coverage breadth, how local Java 21 is enforced) are flagged in Open Questions for discuss-phase.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Firestore rules characterization | Database / Storage (rules engine) | CI | Rules are enforced by the Firestore emulator; tested via `@firebase/rules-unit-testing` against `firestore.rules` read from disk |
| Serverless handler characterization | API / Backend | CI | Handlers are Vercel Node functions; tested in-process with mocked Firebase Admin / Cloudinary / `fetch` — no network |
| Test isolation from CRA Jest | Build tooling | — | CRA `react-scripts test` is scoped to `src/`; Vitest owns `tests/` — two independent runners, no overlap |
| CI orchestration | CI/CD | — | GitHub Actions installs Node 24 + Java 21, then runs all gates in sequence |

## Standard Stack

This phase installs **no new packages** — the test toolchain shipped with `dd6364a` and is already in `package.json` devDependencies and the lockfile.

### Core (already installed)
| Library | Installed | Latest | Purpose | Why Standard |
|---------|-----------|--------|---------|--------------|
| `vitest` | 4.1.10 | 4.1.10 | Test runner for both suites | Fast ESM-native runner; the shipped scripts invoke it directly (`vitest run tests/api`, `vitest run tests/rules`) `[VERIFIED: package.json + local run]` |
| `@firebase/rules-unit-testing` | 5.0.1 | 5.0.1 | Emulator-backed rules assertions (`initializeTestEnvironment`, `assertSucceeds`, `assertFails`) | Official Firebase testing library for security rules `[VERIFIED: package.json + local read]` |
| `firebase-tools` | 15.22.4 | 15.23.0 | Provides `firebase emulators:exec` that boots the Firestore emulator around the rules run | Official Firebase CLI `[VERIFIED: package.json + `npx firebase --version`]` |
| `node-mocks-http` | 1.17.2 | 1.18.0 | Fabricates `req`/`res` for handler unit tests (`createMocks`) | Standard for testing Node/Connect-style handlers without a server `[VERIFIED: package.json + local run]` |

### Supporting (already present)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 4.4.3 | Payload schemas the API tests assert against (`api/_lib/validate.js`) | Already the validation layer; tests assert its `details[].path` output `[VERIFIED: file read]` |
| `firebase` (client SDK) | 12.8.0 | `firebase/firestore` helpers used inside rules tests (`getDoc`, `setDoc`, `addDoc`…) | Rules tests drive the emulator through the client SDK `[VERIFIED: file read]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest for handler tests | CRA's Jest (`src/`) | Rejected by design — handlers live in `api/` (outside `src/`), and mixing them into CRA Jest would violate criterion 3's isolation requirement. Keep Vitest. |
| `firebase emulators:exec` wrapper | Manually start/stop emulator in `beforeAll` | `emulators:exec` guarantees clean start/teardown and is the shipped choice; do not change. |

**Installation:** none required. To *run* locally, the environment (not the repo) needs Java 21 and a platform-correct `node_modules` (see Environment Availability).

## Package Legitimacy Audit

> This phase installs **no new external packages**. The table below documents the already-shipped, already-locked test dependencies for completeness. All are official, high-trust packages verified against the npm registry and present in `package-lock.json`.

| Package | Registry | Maturity | Source Repo | Verdict | Disposition |
|---------|----------|----------|-------------|---------|-------------|
| `vitest` | npm | Established, 4.x current | github.com/vitest-dev/vitest | OK | Already installed — no action |
| `@firebase/rules-unit-testing` | npm | Official Firebase | github.com/firebase/firebase-js-sdk | OK | Already installed — no action |
| `firebase-tools` | npm | Official Firebase CLI | github.com/firebase/firebase-tools | OK | Already installed — no action |
| `node-mocks-http` | npm | Established | github.com/eugef/node-mocks-http | OK | Already installed — no action |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Characterization — What the Shipped Tests Actually Cover

### Rules suite (`tests/rules/firestore.rules.test.js`, 7 `it` blocks)

The suite reads `firestore.rules` from disk into the emulator, seeds a fixed dataset (`admin-uid` role=admin, `agent-a` with `assignedProperties:['prop-assigned']` + `assignedDeals:['deal-assigned']`, `other-user`, and `admin-email-agent` who holds the admin *email* but role=agent), then asserts:

| Success-criterion category | Covered? | Evidence (test) |
|----------------------------|----------|-----------------|
| userId scoping | ✓ | owner reads own contact / denied other's; create-as-self allowed / forged `userId` denied |
| admin override | ✓ | admin role doc reads and deletes another user's contact |
| **admin-email-without-role denied** (bonus, supports SEC-04) | ✓ | `admin-email-agent` (email `dealcenterx@gmail.com`, role agent) is denied admin reads/deletes |
| assignedProperties access | ✓ | assigned agent reads + updates `prop-assigned` (keeping owner) but cannot delete |
| assignedDeals access | ✓ | assigned agent reads `deal-assigned`, is denied the deal update (read-only), and can create a `deal-messages` doc for it |
| deal-portal `canAccessDeal()` inheritance | ✓ (partial) | via `deal-messages` only: create allowed for `deal-assigned`, denied for `deal-other` |
| activity_log append-only | ✓ | append-own allowed / forged denied; admin read allowed / agent read denied; update + delete denied for admin |

**Rules coverage gaps (findings for the planner):**
- **G-R1** — Only **`deal-messages`** exercises `canAccessDeal()`. The other five portal collections defined in `firestore.rules` (`deal-parties`, `deal-channels`, `deal-documents`, `deal-progress`, `deal-lender-pushes`) are **untested**, including their admin-only `update/delete` branches (`deal-messages`, `deal-lender-pushes`). One representative collection demonstrates the shared helper, but the phase intent ("characterize the riskiest surfaces *before* any phase changes them") argues for at least one create + one read assertion per portal collection.
- **G-R2** — The **`users`** match block is not directly tested: self-create-cannot-be-admin, and self-update-cannot-change `role`/`assignedProperties`/`assignedDeals`. This is high value because **Phase 6 / SEC-04** removes the admin-email fallback and touches exactly these rules — a characterization test here is the safety net for that change.
- **G-R3** — Untested collections: `leads`, `documents`, `tasks` (the `assignedTo` read/update path), `campaigns`, `notifications` (`actorId`/`recipientId` gates), `companies`, and the catch-all `{document=**}` admin-only rule. Not named in the success criteria, but `tasks.assignedTo` and `notifications` are real behaviors a later phase could regress.

### API suite (`tests/api/api-handlers.test.mjs`, 16 tests, runs green)

Handlers are loaded via CommonJS `require` with the Firebase Admin lib, Cloudinary, and global `fetch` mocked; `node-mocks-http` supplies `req`/`res`.

| Handler | auth validation | payload validation | error path | Notes |
|---------|-----------------|--------------------|-----------|-------|
| `send-email` | 401 missing token ✓ | 400 missing subject/text ✓ | 502 provider rejects ✓ | **Untested:** 503 (RESEND unset), 405 method, 401 invalid-token (lookup `!ok`), 200 success |
| `accept-invite` | 401 invalid token ✓ | 400 missing `inviteToken` ✓ | 503 not configured ✓; 403 different email ✓ | **Untested:** 401 *missing* token branch, 404 invite-not-found, 200 success |
| `lead-intake` | 401 wrong `x-api-key` ✓ | 400 no identifying fields ✓ | 503 not configured ✓; 200 success ✓ | Strongest coverage of the three |
| `delete-media` (bonus, SEC-03) | 401 no token ✓ | 400 missing `publicId` ✓ | 503 no Cloudinary creds ✓; 200 destroy ✓ | Beyond the 3 required handlers |
| `csp-report` (bonus) | n/a (public) | — | 204 accepts report ✓ | Beyond scope |

**API coverage gaps (findings — optional deepening; criterion 2 is already met):**
- **G-A1** — No **200 success** assertion for `send-email` or `accept-invite`. Characterization value: locks the current success payload shape (`{ok:true,id}` / `{ok:true,dealId,propertyAddress}`) before Phase 4 (SEC-01) rewrites validation.
- **G-A2** — `accept-invite` tests the *invalid*-token branch but not the *missing*-token branch (`401 Missing auth token`) nor the `404` invite-not-found path.
- **G-A3** — No `405` method-guard assertions (all handlers reject non-POST).

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────────────────────┐
   npm run test:ci  ─────► react-scripts test  ──► sweeps  src/**/*.test.js   (29 tests, unchanged)
   (CRA Jest)              roots = <rootDir>/src        │  NEVER touches tests/
                                                        ▼
   ─────────────────────────────────────────────────  isolation boundary  ──────────────────

   npm run test:api ─────► vitest run tests/api ──► api-handlers.test.mjs
                                                        │  require('./api/<name>.js')
                                                        ▼
                                          mock: firebaseAdmin.js, cloudinary, global fetch
                                          node-mocks-http createMocks → {req,res}
                                                        │
                                                        ▼   assert status + body  (16 tests)

   npm run test:rules ───► firebase emulators:exec --only firestore
                                 │  (requires Java 21 JDK)
                                 ▼  boots Firestore emulator @127.0.0.1:8080 (firebase.json)
                           vitest run tests/rules ──► firestore.rules.test.js
                                 │  initializeTestEnvironment(rules = readFileSync('firestore.rules'))
                                 ▼  authenticatedContext(uid).firestore() → assertSucceeds/assertFails
                                    seed via withSecurityRulesDisabled                (10 assertions)

   CI (ci.yml): Node 24 + Java 21 ─► check:constants → lint → test:ci → test:api → test:rules → build
```

### Recommended Project Structure (already in place)
```
tests/
├── api/
│   └── api-handlers.test.mjs   # Vitest, in-process handler tests (mocked deps)
└── rules/
    └── firestore.rules.test.js # Vitest under emulators:exec, reads firestore.rules
firebase.json                   # emulator host/port, ui disabled, singleProjectMode
```

### Pattern 1: CRA-Jest isolation via `roots` + file location
**What:** CRA's Jest config hard-codes `roots: ['<rootDir>/src']` and a `testMatch` limited to `src/`. The new suites live in `tests/` (outside `src/`) and the API file uses the `.mjs` extension. Result: `react-scripts test` cannot see them.
**When to use:** Any time you add a second test runner to a CRA app — keep its files out of `src/`.
**Verified:** `[VERIFIED: local run]` — `createJestConfig` prints `roots: ["<rootDir>/src"]`; `npm run test:ci` ran exactly the 3 `src/` suites (29 tests), swept none from `tests/`.

### Pattern 2: In-process handler testing with module-cache mocking
**What:** The API suite resolves the real handler paths, deletes them from `require.cache` before each test, and injects fake `firebaseAdmin.js` / `cloudinary` exports directly into the cache; global `fetch` is stubbed with `vi.stubGlobal`. No network, no emulator.
**When to use:** Fast characterization of Vercel serverless handlers.
```javascript
// Source: tests/api/api-handlers.test.mjs (shipped)
const requireFromRoot = createRequire(new URL('../../package.json', import.meta.url));
const clearApiModules = () => { /* delete cached handler + firebaseAdmin modules */ };
const mockFirebaseAdmin = (exports) => { requireFromRoot.cache[firebaseAdminPath] = { ...meta, exports }; };
vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ users: [{ email: 'agent@example.com' }] }) })));
```

### Pattern 3: Rules tests read the live rules file into the emulator
**What:** `initializeTestEnvironment({ firestore: { rules: readFileSync('firestore.rules','utf8'), host:'127.0.0.1', port:8080 }})`, seed with `withSecurityRulesDisabled`, then assert with `authenticatedContext(uid, claims)`.
**Why it matters:** The test always runs the *current on-disk* `firestore.rules` — so it stays honest when a later phase edits the rules. This is the CI safety net for the Console-paste deploy channel.

### Anti-Patterns to Avoid
- **Adding handler/rules tests under `src/`** — they'd be swept into CRA Jest (which has no emulator and different globals), breaking both criterion 3 and the run. Keep everything in `tests/`.
- **Renaming `test:ci` or repointing it at `tests/`** — criterion 3 requires CRA Jest to behave *exactly as before*. Leave `test:ci` = `react-scripts test --watchAll=false`.
- **Committing a machine-specific `@rolldown/binding-*`** — the correct binding is platform-resolved by npm at install time; never hand-pin it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Booting/stopping the Firestore emulator | Custom spawn/kill of the emulator jar | `firebase emulators:exec --only firestore` (shipped) | Handles download, port, ready-wait, teardown, exit-code propagation |
| Rules allow/deny assertions | Manual try/catch around Firestore calls | `assertSucceeds` / `assertFails` from `@firebase/rules-unit-testing` | Correctly distinguishes permission-denied from other errors |
| Fake `req`/`res` for handlers | Hand-rolled objects | `node-mocks-http` `createMocks` | Implements the Node http surface handlers depend on (`status`, `json`, `_getJSONData`) |
| Second test runner config | New `jest.config` competing with CRA | Vitest with zero config (scripts pass the path) | Avoids CRA-Jest collision entirely |

**Key insight:** Everything this phase needs already exists and is idiomatic. The risk is *regressing* the isolation, not missing a library.

## Common Pitfalls

### Pitfall 1: `test:rules` fails locally with "Java version before 21"
**What goes wrong:** `npm run test:rules` aborts with `Error: firebase-tools no longer supports Java version before 21. Please install a JDK at version 21 or above.`
**Why it happens:** firebase-tools 15.x's Firestore emulator requires Java 21+. The local machine has Java 8 (`1.8.0_402`). `[VERIFIED: local run — reproduced the exact error]`
**How to avoid:** Install Java 21 locally (e.g., Temurin 21) and ensure it's the active `java`. CI already does this via `actions/setup-java@v4` (temurin 21). Document this prerequisite so criterion 1 is reproducible off-CI.
**Warning signs:** `java -version` reports `1.8` or anything < 21.

### Pitfall 2: Vitest won't start — missing `@rolldown/binding-darwin-x64`
**What goes wrong:** `npm run test:api` throws `Cannot find module '@rolldown/binding-darwin-x64'` / `rolldown-binding.darwin-x64.node`.
**Why it happens:** Vitest 4.x depends on rolldown, whose native binding is a **platform-specific optional dependency**. The checked-out `node_modules/@rolldown/` contains only `binding-darwin-arm64`, but this host is `darwin x64`. The tree was populated for Apple Silicon; the x64 binding is absent. This is a `node_modules` artifact, **not** a repo defect — `package.json`/lockfile list every platform binding, and CI's fresh `npm ci` on linux-x64 resolves the right one. `[VERIFIED: local run — inspected node_modules/@rolldown, confirmed fix]`
**How to avoid:** Run a clean `npm ci` (or `rm -rf node_modules && npm install`) on the actual host before running Vitest. Confirmed: with the correct binding present, `test:api` passes 16/16.
**Warning signs:** `ls node_modules/@rolldown/` shows a binding whose arch doesn't match `node -e "console.log(process.arch)"`.

### Pitfall 3: Assuming the API suite is "broken" because it errored once
**What goes wrong:** A first local run errors out (Pitfall 2) and looks like a failing suite.
**Why it happens:** The rolldown binding error masks otherwise-green tests.
**How to avoid:** Separate environment failures from assertion failures. Once the binding is correct, all 16 API tests pass. Don't "fix" the tests — fix the install.

## Runtime State Inventory

Not applicable — this is a test-scaffolding characterization phase, not a rename/refactor/migration. No stored data, live-service config, OS-registered state, secrets, or build artifacts carry a string this phase changes. **None — verified: the phase only reads existing rules/handlers and runs tests.**

## Environment Availability

| Dependency | Required By | Available (this host) | Version | Fallback |
|------------|------------|-----------------------|---------|----------|
| Node.js | both suites, build | ✓ | v24.13.0 | — |
| npm | install/scripts | ✓ | 11.6.2 | — |
| **Java (JDK)** | `test:rules` (Firestore emulator) | ✗ **too old** | 1.8.0_402 (needs **21+**) | none — hard blocker for local rules run |
| firebase-tools CLI | `test:rules` | ✓ | 15.22.4 | — |
| Vitest native binding | both Vitest suites | ✗ **wrong arch** | `darwin-arm64` present on `darwin-x64` host | `npm ci` on host resolves correct binding |
| Firestore emulator jar | `test:rules` | downloaded on first `emulators:exec` run | — | CI downloads it fresh |

**Missing dependencies with no fallback:**
- **Java 21+** on the developer machine. Until installed, `npm run test:rules` cannot run locally (criterion 1 is only reproducible in CI). This is the phase's primary environmental gap and must be documented for the developer.

**Missing dependencies with fallback:**
- Correct rolldown binding — resolved by a clean `npm ci`/`npm install` on the actual host (no repo change).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (this phase) | Vitest 4.1.10 (two independent suites) |
| Framework (untouched) | CRA Jest via `react-scripts` 5.0.1 (`src/` only) |
| Config file | none — scripts pass the path (`vitest run tests/api` / `tests/rules`); `firebase.json` configures the emulator |
| Quick run command | `npm run test:api` (≈1s once binding is correct) |
| Full suite command | `npm run test:api && npm run test:rules` (rules requires Java 21) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | Rules: scoping, admin override, assignment access, `canAccessDeal`, append-only | integration (emulator) | `npm run test:rules` | ✅ `tests/rules/firestore.rules.test.js` (needs Java 21 to run) |
| TEST-02 | Handlers: auth + payload + error paths for send-email / accept-invite / lead-intake | unit | `npm run test:api` | ✅ `tests/api/api-handlers.test.mjs` (16/16 green) |
| TEST-03 | CI runs both suites; CRA Jest unchanged | pipeline | CI `ci.yml`; `npm run test:ci` | ✅ verified 29/29, `tests/` not swept |

### Sampling Rate
- **Per task commit:** `npm run test:api` (fast, no Java) and, if the task touched rules or their tests, `npm run test:rules` in a Java-21 env.
- **Per wave / phase gate:** full pipeline as CI runs it — `check:constants → lint → test:ci → test:api → test:rules → build` all green.

### Wave 0 Gaps
- [ ] **Environment, not code:** Java 21 available for whoever verifies `test:rules` locally (CI already has it). Document the prerequisite (e.g., in a testing/README note).
- [ ] **Environment:** clean `npm ci` on the verifying host so the correct rolldown binding is present.
- [ ] *(optional, planner's call)* Broaden rules tests per G-R1/G-R2 (deal-portal collections + `users`-block role immutability) — highest value because Phase 6/SEC-04 mutates those exact rules.
- [ ] *(optional)* Add 200-success characterization for send-email/accept-invite per G-A1 before Phase 4/SEC-01 rewrites validation.

## Security Domain

This phase is itself a security-assurance activity: it characterizes the two enforcement surfaces (Firestore rules = the real authorization layer per CLAUDE.md; serverless auth/validation) so later hardening phases can't silently regress them.

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control (exercised by the shipped tests) |
|---------------|---------|----------------------------------------------------|
| V1 Architecture | yes | Tests pin the client/server trust boundary: rules are the enforcement layer; handlers verify Firebase ID tokens |
| V2 Authentication | yes | send-email/accept-invite/delete-media verify Firebase ID tokens (401 on missing/invalid); lead-intake uses shared `x-api-key` (401 on wrong key) — all asserted |
| V4 Access Control | yes | Rules tests assert userId scoping, admin override, assignment-based access, `canAccessDeal()` inheritance, append-only audit log; **admin-email-without-role is denied** (guards the SEC-04 change) |
| V5 Input Validation | yes | Handler tests assert zod-backed 400s with `details[].path` for missing/invalid payloads |
| V6 Cryptography | no | No crypto authored here; token verification delegated to Firebase/identitytoolkit |
| V7 Error Handling | yes | Tests assert generic error bodies (e.g., 502/503/500) that don't leak internals |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation (test guards it) |
|---------|--------|--------------------------------------|
| Cross-tenant data read (query another user's records) | Information Disclosure | userId-scoping rules; test asserts `assertFails` on other-user docs |
| Privilege escalation via admin *email* without admin *role* | Elevation of Privilege | rule uses role-on-doc, not email; test `admin-email-agent` denied — directly protects the SEC-04 fallback removal |
| Forged ownership on write (`userId` spoof) | Tampering | `createsAsSelf()` / `keepsOwner()`; test asserts forged create + reassign denied |
| Audit-trail tampering | Repudiation | `activity_log` update/delete = `false`; test asserts admin cannot edit/delete |
| Unauthenticated serverless invocation | Spoofing | token/api-key checks; tests assert 401 |
| Malformed payload injection | Tampering | zod schemas; tests assert uniform 400 |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Java 11 acceptable for Firebase emulator | firebase-tools 15.x requires **Java 21+** | firebase-tools 15.x | Local `test:rules` needs a JDK 21; CI already pins temurin 21 |
| Vitest bundles via esbuild/Vite | Vitest 4.x pulls **rolldown** with platform-specific native bindings | Vitest 4.x | Cross-arch `node_modules` (e.g., arm64 tree on x64 host) breaks startup until `npm ci` |

**Deprecated/outdated:** none relevant. Installed test deps are at or one patch behind latest (vitest 4.1.10 = latest; firebase-tools 15.22.4 vs 15.23.0; node-mocks-http 1.17.2 vs 1.18.0) — no upgrade needed for this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | CI actually passes both new suites (verified structurally + Java 21 wired, but the CI run itself was not observed this session) | TEST-03 / Environment | Low — API suite proven green locally; rules suite depends only on Java 21 which CI provisions. If the emulator download times out in CI, the gate would fail — verify via the latest CI run. |
| A2 | One deal-portal collection (`deal-messages`) is "sufficient" to represent `canAccessDeal()` for criterion 1 | Characterization G-R1 | Medium — success criterion says "deal-portal `canAccessDeal()` inheritance" without naming all six; a strict reading may require broader coverage. Resolve in discuss-phase. |

**If the CI run is confirmed green in a fresh check, A1 resolves to VERIFIED.**

## Open Questions (RESOLVED)

> All three resolved by the Phase 2 plans (discuss-phase was intentionally skipped): Q1 → Plan 02-03 documents the Java 21 prerequisite in docs/TESTING.md and accepts a green CI run as authoritative proof of criterion 1 (no local Java install task). Q2 → Plan 02-02 delivers G-R2 (users-block role-immutability tests) and G-R1 (all six deal-portal collections). Q3 → Plan 02-01 delivers G-A1 (200-success characterizations).

1. **How is the local Java 21 prerequisite enforced/satisfied for verification?** *(RESOLVED → Plan 02-03: documented + green CI accepted as authoritative.)*
   - What we know: CI has Java 21; the current dev host has Java 8, so `test:rules` fails locally.
   - What's unclear: whether the verifier will install Java 21 locally or accept a green CI run as proof of criterion 1.
   - Recommendation: Document the Java 21 requirement in a testing note; accept a passing CI run as the authoritative proof for the emulator-backed suite. Flag for discuss-phase.

2. **Does the phase require broadening rules coverage to all six deal-portal collections and the `users` block (G-R1/G-R2)?**
   - What we know: only `deal-messages` and no `users`-block tests exist today; the shipped suite passes as-is.
   - What's unclear: whether "characterize before change" scope demands per-collection coverage now, or whether it's deferred to when Phase 6/SEC-04 touches those rules.
   - Recommendation: Add `users`-block role-immutability tests in this phase (cheap, and it's the exact safety net for SEC-04); treat per-portal-collection expansion as optional. Confirm in discuss-phase.

3. **Should the API suite gain 200-success characterizations (G-A1) now?**
   - What we know: success payload shapes are currently unasserted for send-email/accept-invite.
   - What's unclear: whether Phase 4 (SEC-01) validation rewrite makes pinning them now worthwhile.
   - Recommendation: Add them — low cost, locks behavior before SEC-01. Discretionary.

## Sources

### Primary (HIGH confidence)
- Shipped repo files (direct reads): `tests/api/api-handlers.test.mjs`, `tests/rules/firestore.rules.test.js`, `firestore.rules`, `api/send-email.js`, `api/accept-invite.js`, `api/lead-intake.js`, `api/_lib/validate.js`, `api/_lib/firebaseAdmin.js`, `api/_lib/withSentry.js`, `firebase.json`, `package.json`, `.github/workflows/ci.yml`
- Local command runs: `npm run test:api` (16/16 pass), `CI=true npm run test:ci` (29/29 pass, `src/` only), `npm run test:rules` (reproduced Java-21 error), `java -version`, `npx firebase --version`, CRA `createJestConfig` roots inspection, `npm view <pkg> version`
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/phases/01-.../01-VERIFICATION.md`, `.planning/config.json`

### Secondary (MEDIUM confidence)
- firebase-tools Java-21 requirement — confirmed by reproducing the exact CLI error message this session

### Tertiary (LOW confidence)
- None. (All external-search providers are disabled in config; no web research was needed for this internal characterization.)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions read from `package.json`, confirmed via `npm view` and local runs
- Characterization / coverage map: HIGH — every claim traced to a specific test block in the shipped files
- CRA isolation (criterion 3): HIGH — verified via `roots` inspection and an observed `test:ci` run
- Environment blockers (Java 21, rolldown arch): HIGH — both reproduced and (for the binding) fixed and re-run this session
- CI green end-to-end: MEDIUM — structurally correct and locally proven per-suite, but the actual CI run was not observed (A1)

**Research date:** 2026-07-12
**Valid until:** 2026-08-11 (stable — internal characterization; only firebase-tools' Java floor or a Vitest major could shift it)
