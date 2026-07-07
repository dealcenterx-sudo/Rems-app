# Phase 1: Audit, Repo Hygiene & Config Centralization - Pattern Map

**Mapped:** 2026-07-06
**Files analyzed:** 18 new/modified (+2 deletions)
**Analogs found:** 13 / 18 (5 prose docs use structure from RESEARCH.md, style from `docs/DATABASE_SCHEMA.md`)

## File Classification

| New/Modified File | Change | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|--------|------|-----------|----------------|---------------|
| `src/config.js` | NEW | config (ESM) | n/a (constants) | `src/utils/cloudinary.js` | exact (named-export constants module) |
| `api/_lib/config.js` | NEW | config (CommonJS) | n/a (constants) | `api/_lib/firebaseAdmin.js` | exact (CJS `module.exports` in `api/_lib/`) |
| `scripts/check-constants.js` | NEW | utility script | batch (file scan) | none — `scripts/` dir doesn't exist yet | no analog (use RESEARCH.md sketch) |
| `api/health.js` | MODIFY | serverless handler | request-response | `api/send-email.js` | exact (same auth pattern, same runtime) |
| `api/send-email.js` | MODIFY | serverless handler | request-response | itself (1-line swap) | exact |
| `api/lead-intake.js` | MODIFY | serverless handler | request-response | itself (1-line swap) | exact |
| `src/firebase.js` | MODIFY | config/service init | n/a | itself (constant → import swap) | exact |
| `src/utils/helpers.js` | MODIFY | utility | n/a | itself (lines 4, 164) | exact |
| `src/components/NewDealPage.js` | MODIFY | component | CRUD | itself (line 35) | exact |
| `src/components/CRMMessagesPage.js` | MODIFY | component | CRUD | itself (line 143) | exact |
| `src/components/DealsDashboard.js` | MODIFY | component | CRUD | itself (line 61) | exact |
| `src/components/CRMEmailInboxPage.js` | MODIFY | component | CRUD | itself (lines 73, 86, 264) | exact |
| `src/utils/permissions.test.js` | MODIFY | test | n/a | itself (line 9 fixture) | exact |
| `.github/workflows/ci.yml` | MODIFY | CI config | n/a | itself (existing step shape) | exact |
| `package.json` | MODIFY | config | n/a | itself (scripts block) | exact |
| `docs/SAAS_READINESS_AUDIT.md` | NEW | doc | n/a | `docs/DATABASE_SCHEMA.md` (tone/style only) | partial — structure locked by AUDIT-01 + D-03/D-04 |
| `docs/SAAS_UPGRADE_PLAN.md` | NEW | doc | n/a | same | partial — structure locked by AUDIT-02 |
| `docs/SAAS_UPGRADE_CHANGELOG.md` | NEW | doc | n/a | same | partial — structure locked by AUDIT-03 |
| `docs/ENVIRONMENT.md` | NEW | doc | n/a | same | partial — structure locked by D-10 |
| `screenshot.js` | DELETE | — | — | — | `git rm` (tracked, commit 0b3cb88) |
| `rems-project-source-2026-04-09{,/.zip}` | DELETE | — | — | — | plain `rm -rf` (untracked — `git rm` will FAIL) |

## Pattern Assignments

### `src/config.js` (NEW — config, ESM)

**Analog:** `src/utils/cloudinary.js` — the repo's only existing "constants module with named ESM exports."

**Constants-module pattern** (`src/utils/cloudinary.js` lines 1-3):
```javascript
// Cloudinary Configuration
export const CLOUDINARY_CLOUD_NAME = 'dcirl3j3v';
export const CLOUDINARY_UPLOAD_PRESET = 'rems_unsigned'; // We'll create this in Cloudinary
```

**Values to centralize** — current definitions being replaced:

`src/firebase.js` lines 25-29 (verified this session):
```javascript
const ADMIN_EMAIL = 'dealcenterx@gmail.com';

// Roles a user may pick for themselves at signup. Admin is never
// self-service — Firestore rules also reject role: 'admin' on create.
const SELF_SERVICE_ROLES = ['agent', 'buyer', 'seller'];
```

Target shape (RESEARCH.md Code Examples, follows the cloudinary.js analog exactly):
```javascript
export const ADMIN_EMAIL = 'dealcenterx@gmail.com';
export const ROLES = ['admin', 'agent', 'buyer', 'seller'];
export const SELF_SERVICE_ROLES = ['agent', 'buyer', 'seller'];
```

Carry the comment from `src/firebase.js:27-28` over to `SELF_SERVICE_ROLES` — it documents a rules-layer invariant.

---

### `api/_lib/config.js` (NEW — config, CommonJS)

**Analog:** `api/_lib/firebaseAdmin.js` — establishes the `api/_lib/` shared-module conventions.

**Module conventions to copy** (`api/_lib/firebaseAdmin.js` lines 1-4, 33):
```javascript
// Shared Firebase Admin initialization for serverless functions.
// Requires FIREBASE_SERVICE_ACCOUNT (the service account JSON) in env.
// firebase-admin v14 is fully modular — no legacy namespace API.
const { initializeApp, cert, getApps } = require('firebase-admin/app');
// ...
module.exports = { getDb, getAuthAdmin, FieldValue };
```
Conventions: header comment explaining purpose + env requirements, `const` requires, single `module.exports` object at the bottom.

**Env-var-with-fallback pattern** — the key being moved, currently at `api/send-email.js` lines 4-5:
```javascript
// Firebase public web API key — used only to validate caller ID tokens.
const FIREBASE_API_KEY = 'AIzaSyCI2EX7aR0ZphG36_IlUQqt0nFozedj5pI';
```
becomes (per D-11):
```javascript
const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY || 'AIzaSyCI2EX7aR0ZphG36_IlUQqt0nFozedj5pI';
```
Export `{ ADMIN_EMAIL, FIREBASE_API_KEY }`. The `process.env.X || fallback` shape matches the existing repo idiom at `api/send-email.js:52` (`process.env.EMAIL_FROM || 'REMS <onboarding@resend.dev>'`).

---

### `api/health.js` (MODIFY — serverless handler, request-response)

**Analog:** `api/send-email.js` — the identitytoolkit token-verification pattern (chosen over `api/accept-invite.js`'s `verifyIdToken` because Admin SDK auth would depend on the exact thing health.js diagnoses — RESEARCH Pitfall 4).

**Bearer-token extraction pattern** (`api/send-email.js` lines 18-19):
```javascript
const authHeader = req.headers.authorization || '';
const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
```

**Identitytoolkit lookup pattern** (`api/send-email.js` lines 25-41):
```javascript
const lookup = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  }
);
if (!lookup.ok) {
  return res.status(401).json({ error: 'Invalid auth token' });
}
const lookupData = await lookup.json();
senderEmail = lookupData.users?.[0]?.email || null;
```
**Deviation required by D-06:** where send-email.js returns 401 on failure, health.js returns `res.status(200).json({ status: 'ok' })` for missing/invalid/non-admin tokens — no 401/403 differential, no schema leak. Admin check: `user.email === ADMIN_EMAIL && user.emailVerified` with `ADMIN_EMAIL` from `./_lib/config`.

**Diagnostics payload to preserve verbatim behind the gate** (current `api/health.js` lines 6-23 — D-08, same 5 fields):
```javascript
const keys = Object.keys(process.env).filter((k) =>
  /RESEND|FIREBASE|LEAD|EMAIL/i.test(k)
);

let adminInit = 'ok';
try {
  getDb();
} catch (error) {
  adminInit = error.message || 'failed';
}

return res.status(200).json({
  resendConfigured: Boolean(process.env.RESEND_API_KEY),
  firebaseAdminConfigured: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT),
  leadIntakeConfigured: Boolean(process.env.LEAD_INTAKE_KEY),
  adminInit,
  matchingKeyNames: keys
});
```
Keep `const { getDb } = require('./_lib/firebaseAdmin')` — it powers the `adminInit` probe only, never authentication.

Full target shape: RESEARCH.md Code Examples → "api/health.js (gated shape)".

---

### `api/send-email.js` and `api/lead-intake.js` (MODIFY — literal swaps)

**Pattern: behavior-preserving literal swap** — nothing else changes (RESEARCH Pattern 2).

`api/send-email.js` — replace lines 4-5:
```javascript
// Firebase public web API key — used only to validate caller ID tokens.
const FIREBASE_API_KEY = 'AIzaSyCI2EX7aR0ZphG36_IlUQqt0nFozedj5pI';
```
with `const { FIREBASE_API_KEY } = require('./_lib/config');`. The lookup URL at line 27 already interpolates the constant name — untouched.

`api/lead-intake.js` — replace line 7:
```javascript
const ADMIN_EMAIL = 'dealcenterx@gmail.com';
```
with `const { ADMIN_EMAIL } = require('./_lib/config');`. The consumer at line 44 (`authAdmin.getUserByEmail(ADMIN_EMAIL)`) is untouched. Note the existing require style at line 5 to match: `const { getDb, getAuthAdmin } = require('./_lib/firebaseAdmin');`.

---

### `src/firebase.js` (MODIFY — constant → import swap)

Current (lines 25, 29):
```javascript
const ADMIN_EMAIL = 'dealcenterx@gmail.com';
// ...
const SELF_SERVICE_ROLES = ['agent', 'buyer', 'seller'];
```
Replace both local definitions with `import { ADMIN_EMAIL, SELF_SERVICE_ROLES } from './config';` added to the import block (lines 1-4). **Not in RESEARCH.md's consumer table:** line 29's `SELF_SERVICE_ROLES` must also come from config since `src/config.js` exports it — leaving both defined creates the two-sources-of-truth bug for roles that this phase kills for the email. `firebaseConfig.apiKey` at line 7 stays as-is (client web config, out of scope).

---

### `src/utils/helpers.js` (MODIFY — lines 4 and 164)

Current line 1-4:
```javascript
import { auth } from '../firebase';

// Centralised admin check — change this constant to update across the whole app
const ADMIN_EMAIL = 'dealcenterx@gmail.com';
```
Replace line 4 with `import { ADMIN_EMAIL } from '../config';` (and drop the now-stale "change this constant" comment or update it to point at `src/config.js`).

Current line 164:
```javascript
export const isAdmin = () => auth.currentUser?.email === 'dealcenterx@gmail.com';
```
becomes `export const isAdmin = () => auth.currentUser?.email === ADMIN_EMAIL;`. **Do NOT merge `isAdmin` into `isAdminUser`** — helper consolidation is explicitly out of scope (D-09, RESEARCH Anti-Patterns).

---

### Component consumers (MODIFY — 4 files, 6 occurrences)

All four already import from relative paths like `import { db, auth } from '../firebase';` — add `import { ADMIN_EMAIL } from '../config';` alongside. Exact lines (verified by `git grep` this session):

| File:Line | Current code | After |
|-----------|-------------|-------|
| `src/components/NewDealPage.js:35` | `const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';` | `=== ADMIN_EMAIL` |
| `src/components/CRMMessagesPage.js:143` | `const isAdmin = auth.currentUser?.email === 'dealcenterx@gmail.com';` | `=== ADMIN_EMAIL` |
| `src/components/DealsDashboard.js:61` | `const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';` | `=== ADMIN_EMAIL` |
| `src/components/CRMEmailInboxPage.js:73` | `from: auth.currentUser?.email \|\| 'dealcenterx@gmail.com',` | `\|\| ADMIN_EMAIL` (sample-data fallback, not an admin check — swap is still identical) |
| `src/components/CRMEmailInboxPage.js:86` | `const isAdmin = auth.currentUser?.email === 'dealcenterx@gmail.com';` | `=== ADMIN_EMAIL` |
| `src/components/CRMEmailInboxPage.js:264` | `const isAdmin = auth.currentUser?.email === 'dealcenterx@gmail.com';` | `=== ADMIN_EMAIL` |

Preserve each line's optional-chaining exactly as-is (`currentUser.email` vs `currentUser?.email` differs between files) — behavior-preserving means byte-identical apart from the literal.

---

### `src/utils/permissions.test.js` (MODIFY — line 9, load-bearing fixture)

Current lines 1-9:
```javascript
import { canUserAccess, canUserManageProperty, getEditableFields, canEditField, ALL_FIELDS } from './permissions';

// helpers.js pulls auth from firebase; keep the SDK out of unit tests
jest.mock('../firebase', () => ({
  auth: { currentUser: null },
  db: {}
}));

const admin = { userId: 'admin-1', email: 'dealcenterx@gmail.com', role: 'admin', assignedProperties: [] };
```
Add `import { ADMIN_EMAIL } from '../config';` and change the fixture to `email: ADMIN_EMAIL`. The `jest.mock('../firebase', ...)` stays — `src/config.js` must NOT import from `src/firebase.js` (pure constants, no deps) or this mock stops being sufficient. The test at line 18 ("admin email counts even without the admin role") only stays meaningful if the fixture tracks the real constant (RESEARCH Pitfall 2).

---

### `scripts/check-constants.js` (NEW — no analog; `scripts/` dir does not exist)

No script analog in the repo. Use the RESEARCH.md Code Examples sketch verbatim as the pattern. Key design constraints already decided:
- `const { ADMIN_EMAIL } = require('../api/_lib/config');` — script never embeds the literal, so it needs no allowlist entry
- File enumeration via `execSync('git ls-files src api scripts public .github firestore.rules vercel.json package.json')` — never an `fs` walk, never shell `grep` (BSD/GNU divergence)
- Allowlist exactly: `src/config.js`, `api/_lib/config.js`, `firestore.rules`
- Exit 1 with violating paths listed on stderr; exit 0 with a one-line OK

CommonJS (`require`) since it runs under plain `node`, matching `api/` convention rather than `src/`.

---

### `package.json` (MODIFY — scripts block)

Current scripts block (verified):
```json
"scripts": {
  "start": "react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "test:ci": "react-scripts test --watchAll=false",
  "lint": "eslint src --ext .js",
  "eject": "react-scripts eject"
}
```
Add: `"check:constants": "node scripts/check-constants.js"` — same terse single-command style, no `&&` chains.

---

### `.github/workflows/ci.yml` (MODIFY — one new step)

**Step shape to copy** (current lines 25-34):
```yaml
      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm run test:ci
        env:
          CI: true
```
Insert between `Install dependencies` and `Lint` (fastest-fail first; preserves the required lint → test → build order):
```yaml
      - name: Check constants
        run: npm run check:constants
```
Do NOT touch the `Build` step's `CI: false` (lines 38-40) — it is deliberate (CRA promotes warnings to errors under CI=true; RESEARCH Pitfall 7).

---

### The four `docs/` deliverables (NEW — prose)

**Analog (tone/style only):** `docs/DATABASE_SCHEMA.md` — the sole existing `docs/` file. Style traits to match: `#` title with project prefix ("REMS - ..."), short `## Overview`, `---` section dividers, fenced code blocks with inline `//` comments, references to concrete files/functions ("`ensureUserExists()` in `src/firebase.js`").

Structure is NOT discretionary — locked by requirements + CONTEXT:

| Doc | Locked structure |
|-----|------------------|
| `SAAS_READINESS_AUDIT.md` | Exec Summary → Stack → Product Purpose → User Flows → Weaknesses by Area (~1 para each) → Risk-Ranked Findings table (Severity / Finding / File:Line / Impact / Fix / **Status**, Critical→Low) → Roadmap → Safe Execution Plan → Definition of Done. Findings seed list: RESEARCH.md "Audit Findings Seed List" (15 items, all verified) |
| `SAAS_UPGRADE_PLAN.md` | Per phase: goal / files / tasks / risks / acceptance criteria / verification commands. **Blocker:** brief's 8 phase names need user confirmation (RESEARCH Open Question 1) |
| `SAAS_UPGRADE_CHANGELOG.md` | `## Phase N — <name> (date)` sections with What / Why / Files / Commands / Results / Risks; Phase 1 entry written in this phase, recording actual commands run |
| `ENVIRONMENT.md` | Table: `Variable \| Purpose \| Consumed by \| Scope \| Required?` — names only, never values. Must include all 7: `FIREBASE_SERVICE_ACCOUNT`, `RESEND_API_KEY`, `EMAIL_FROM`, `LEAD_INTAKE_KEY`, `FIREBASE_API_KEY` (new), `REACT_APP_DEV_BYPASS`, `REACT_APP_CRM_EMAIL_WEBHOOK_URL` |

Do not write the admin email literal into any doc — refer to `ADMIN_EMAIL` (RESEARCH Anti-Patterns).

## Shared Patterns

### Bearer-token parsing (serverless)
**Source:** `api/send-email.js:18-19` (identical in `api/accept-invite.js:20-21`)
**Apply to:** `api/health.js`
```javascript
const authHeader = req.headers.authorization || '';
const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
```

### Serverless error responses
**Source:** `api/send-email.js`, `api/lead-intake.js`, `api/accept-invite.js`
**Apply to:** `api/health.js` — with the D-06 exception
Convention: early-return `res.status(N).json({ error: '...' })` guards, generic messages that never leak internals. **health.js deviates deliberately:** all non-admin outcomes return `200 { status: 'ok' }` — never 401/403 — so the privileged response is undiscoverable.

### Env var with checked-in fallback
**Source:** `api/send-email.js:52` — `process.env.EMAIL_FROM || 'REMS <onboarding@resend.dev>'`
**Apply to:** `api/_lib/config.js` (`FIREBASE_API_KEY`)

### UPPER_SNAKE_CASE named-export constants
**Source:** `src/utils/cloudinary.js:2-3` (ESM), `api/lead-intake.js:7` (CJS const style)
**Apply to:** `src/config.js`, `api/_lib/config.js`

### Header-comment module documentation
**Source:** `api/_lib/firebaseAdmin.js:1-3`, `api/send-email.js:1-2`
**Apply to:** both new config modules and `scripts/check-constants.js` — top-of-file `//` comment stating purpose and env requirements.

## No Analog Found

| File | Role | Reason | Fallback |
|------|------|--------|----------|
| `scripts/check-constants.js` | utility script | No `scripts/` dir; no standalone Node scripts in repo (`screenshot.js` is being deleted and is not a pattern to copy) | RESEARCH.md Code Examples sketch (design already reviewed against Pitfalls 2-3) |
| Four `docs/*.md` | prose docs | Only one existing doc (`DATABASE_SCHEMA.md`); structures locked by AUDIT-01..04 + D-03/D-04/D-10 | Style from `DATABASE_SCHEMA.md`; structure from requirements |

## Deletion Notes (not pattern work, but plan-critical)

- `screenshot.js`: **tracked** (commit 0b3cb88) → `git rm screenshot.js`. Consider `npm uninstall puppeteer` in same commit (screenshot.js is its only consumer — RESEARCH Open Question 2; flag to user).
- `rems-project-source-2026-04-09{,/.zip}`: **untracked/gitignored, never committed** → plain `rm -rf`. Any plan step using `git rm` here will fail; never "fix" with `git add -f` (RESEARCH Pitfall 1).
- `firestore.rules:16` keeps its literal — allowlisted, manually synced, removal is Phase 6.

## Metadata

**Analog search scope:** `api/`, `api/_lib/`, `src/`, `src/utils/`, `src/components/`, `docs/`, `.github/workflows/`, repo root
**Files read this session:** 12 (send-email.js, health.js, firebaseAdmin.js, lead-intake.js head, accept-invite.js head, ci.yml, helpers.js head+164, firebase.js head, permissions.test.js head, cloudinary.js head, package.json scripts, DATABASE_SCHEMA.md head, firestore.rules 10-24) + `git grep` occurrence verification
**Pattern extraction date:** 2026-07-06
