# Phase 1: Audit, Repo Hygiene & Config Centralization - Research

**Researched:** 2026-07-06
**Domain:** Repo hygiene, config centralization, docs deliverables, serverless auth gating (React 19 CRA + Firebase + Vercel)
**Confidence:** HIGH (nearly every claim verified directly in the codebase this session)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Audit documents (AUDIT-01, AUDIT-02, AUDIT-03)
- **D-01:** `SAAS_READINESS_AUDIT.md` is a **showcase artifact** — written for outside evaluators (investors, recruiters, technical reviewers). Professional, structured, demonstrates engineering judgment; the audit itself is part of the showcase.
- **D-02:** **Full candor with remediation status.** Name every finding with file references and severity, even while unfixed, in the public repo. Honesty is the trust play (consistent with the "no fake badges" requirement). None of the findings are secrets-level.
- **D-03:** **Concise + evidence** depth: tight exec summary, ~1 paragraph per weakness area, risk-ranked findings table with severity / file:line / impact / fix per row. Target ~8–12 pages; every claim verifiable in the code.
- **D-04:** The audit is a **living document**: every finding carries a status column (Open / In progress / Fixed in Phase N), and each subsequent phase updates its rows as a standing task (alongside the AUDIT-03 changelog standing task).
- **D-05:** Audit findings must include the two items flagged in STATE.md: Firestore backup posture (unverified — record as finding) and the result of the `api/health.js` traffic check (D-07).

#### api/health.js (HYG-03)
- **D-06:** **Split response shape**: unauthenticated GET returns bare `{ status: 'ok' }` (reveals nothing about env/infra); a valid **admin** Firebase ID token unlocks the diagnostics detail. Satisfies HYG-03 regardless of whether an external monitor exists.
- **D-07:** Before the change ships, the **user checks the Vercel dashboard logs** for recent traffic to `/api/health` (execution must pause and ask). The result is recorded as an audit finding either way.
- **D-08:** The admin-gated detail returns the **same flags as today** (boolean presence for RESEND / FIREBASE / LEAD_INTAKE config + admin-SDK init status). No expanded diagnostics — keep the phase small.

#### Config centralization (HYG-04, HYG-05, AUDIT-04)
- **D-09:** Scope = **admin email + obvious siblings**: admin email literal, roles list, and the `api/send-email.js` Firebase API key (moved to env-var read). Cloudinary config **stays** in `src/utils/cloudinary.js` (already the single source per CLAUDE.md). No broad constants sweep.
- **D-10:** Env vars documented in a new **`docs/ENVIRONMENT.md`** — names, purpose, where consumed, never values. Later phases append to it (Sentry DSN in Phase 3, Cloudinary secret in Phase 4). Audit and changelog link to it.
- **D-11:** Firebase API key rollout is **env var with fallback**: code reads `process.env.FIREBASE_API_KEY`, falling back to the current literal kept in `api/_lib/config.js` if unset. Zero deploy risk (the key is a public web key); user sets the Vercel variable at leisure.
- **D-12:** The CI proof is an **npm script + CI step**: `npm run check:constants` (e.g., `scripts/check-constants.js`) fails if the admin email literal appears anywhere outside `src/config.js`, `api/_lib/config.js`, and `firestore.rules` (manually synced). Runs locally and as a step in `.github/workflows/ci.yml`.

#### Repo hygiene (HYG-01, HYG-02)
- **D-13:** **`screenshot.js` is deleted**, not relocated — its hardcoded `/root/...` paths can't run locally and Phase 8 will take fresh screenshots with new tooling. Git history keeps it recoverable. (HYG-02's "removed if obsolete" branch.)
- **D-14:** `rems-project-source-2026-04-09/` and its `.zip` are **purely stale** — remove with plain `git rm` (no history rewrite, per HYG-01), no pre-removal diff or local copy needed. Verify `.gitignore` covers future exports.

### Claude's Discretion
- Exact structure/section ordering of the three docs (within the required sections listed in AUDIT-01/02/03).
- How admin verification is implemented in `api/health.js` (reuse the existing token-verification pattern from `api/send-email.js` or firebase-admin `verifyIdToken` — planner/researcher picks based on code).
- Shape of the config modules (named exports, constant names) — follow existing conventions (UPPER_SNAKE_CASE constants, named exports).
- Implementation details of `scripts/check-constants.js`.

### Deferred Ideas (OUT OF SCOPE)
- Expanded health diagnostics (commit SHA, deploy time, per-integration reachability) — declined for Phase 1 (D-08); revisit if observability work in Phase 3 wants it.
- Broad constants sweep (cache TTLs, collection names, magic strings) — declined for Phase 1 (D-09); Phase 7's token migration covers the styling side.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUDIT-01 | Complete SaaS Readiness Audit at `docs/SAAS_READINESS_AUDIT.md` (exec summary, stack, product purpose, user flows, weaknesses by area, risk-ranked findings Critical→Low, roadmap, safe execution plan, Definition of Done) | Findings inventory fully verified this session (see "Audit Findings Seed List"); source docs enumerated; D-03 structure guidance in Architecture Patterns |
| AUDIT-02 | 8-phase upgrade plan at `docs/SAAS_UPGRADE_PLAN.md` with goal/files/tasks/risks/acceptance criteria/verification commands per phase | ROADMAP.md phase details verified (goals, criteria per phase); **gap found**: the brief's literal 8 phase names are not preserved in `.planning/` — see Open Questions #1 |
| AUDIT-03 | Running changelog at `docs/SAAS_UPGRADE_CHANGELOG.md` (what/why/files/commands/results/risks per phase) | Format recommendation in Architecture Patterns; Phase 1 entry content = this phase's own changes |
| AUDIT-04 | All required env vars documented by name (never value) with purpose and where consumed | Complete env-var inventory verified by grep — including 2 vars missed by prior codebase maps (`REACT_APP_DEV_BYPASS`, `REACT_APP_CRM_EMAIL_WEBHOOK_URL`) |
| HYG-01 | Repo no longer contains `rems-project-source-2026-04-09/` or its `.zip` (plain `git rm`, no history rewrite) | **Factual correction verified**: archive + zip are gitignored and were NEVER committed — `git rm` will fail; plain `rm -rf` is the correct action (see Pitfall 1) |
| HYG-02 | `screenshot.js` relocated to `scripts/` or removed if obsolete | D-13 locks removal. Verified tracked (commit 0b3cb88); `git rm screenshot.js` works; puppeteer devDep becomes unused (Open Question #2) |
| HYG-03 | `api/health.js` requires admin auth token; unauthenticated callers learn nothing | Both existing token-verification patterns read and compared; recommendation: identitytoolkit lookup pattern (works even when the admin SDK — the thing being diagnosed — is broken) |
| HYG-04 | Admin email + shared constants in `src/config.js` (client) and `api/_lib/config.js` (server); CI grep proof | All 10 code occurrences of the literal verified by grep (one MORE than CONCERNS.md listed — `src/utils/permissions.test.js:9` is functionally load-bearing); check script design in Code Examples |
| HYG-05 | `api/send-email.js` reads Firebase API key from env var | Verified hardcoded at `api/send-email.js:5`; D-11 fallback pattern; key is a public identifier per official Firebase docs [CITED: firebase.google.com/docs/projects/api-keys] |
</phase_requirements>

## Summary

This phase is almost entirely codebase-internal: three prose deliverables in `docs/`, mechanical repo cleanup, one endpoint auth-gate, and a constant-centralization refactor with a CI grep proof. **No new npm packages are required** — the check script uses Node built-ins, and both token-verification patterns needed for `api/health.js` already exist in the repo (`api/send-email.js` identitytoolkit lookup; `api/accept-invite.js` Admin SDK `verifyIdToken`).

Research surfaced four material corrections/discoveries that change the plan:
1. **HYG-01's premise is wrong in a helpful way** — `rems-project-source-2026-04-09/` and the `.zip` are gitignored and were never committed (`git ls-files` returns nothing; `git status --ignored` shows `!!`). `git rm` will fail with "pathspec did not match". The correct action is a plain `rm -rf` of local untracked files — no commit needed for the removal itself. Consequence: **git history will NOT keep them recoverable** (D-14 already authorized removal without a copy, but the plan must say this out loud).
2. **The admin email has a 10th code occurrence** that CONCERNS.md missed: `src/utils/permissions.test.js:9` — and it is functionally load-bearing (the test "admin email counts even without the admin role" only passes if the fixture email equals the real constant). It must import `ADMIN_EMAIL` from the new `src/config.js`, or the grep check and the test will fight forever.
3. **Two undocumented env vars exist** and must appear in both `docs/ENVIRONMENT.md` and the audit: `REACT_APP_DEV_BYPASS` (`src/App.js:154` — skips the client-side auth gate when `'true'` at build time; a security-relevant audit finding) and `REACT_APP_CRM_EMAIL_WEBHOOK_URL` (`src/components/CRMEmailInboxPage.js:227`, `CRMLeadDetailPage.js:663`).
4. **The brief's literal "8 named phases" list is not preserved anywhere in `.planning/`** — `docs/SAAS_UPGRADE_PLAN.md` must map those names onto the roadmap order, but only the roadmap side of the mapping exists on disk. The planner needs the user to supply/confirm the brief's phase names (Open Question #1).

**Primary recommendation:** Plan this as 3–4 small plans: (A) repo hygiene + health.js gating (with the D-07 pause point), (B) config centralization + check-constants CI step, (C) the three docs + ENVIRONMENT.md (written last so they record the *finished* Phase 1 state). Every commit must leave `main` shippable — the fallback pattern in D-11 and the behavior-preserving literal swap make that achievable with zero deploy risk.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Audit/plan/changelog/env docs | Repo docs (`docs/`) | — | Prose artifacts; product deliverables per PROJECT.md decision (GSD artifacts stay in `.planning/`) |
| Archive + screenshot.js removal | Repo working tree / git | — | Pure hygiene; archive is untracked (rm), screenshot.js is tracked (git rm) |
| Health endpoint gating | API / Backend (`api/health.js`) | — | Auth decisions must be server-side; token verified against Google before any detail is returned |
| Admin-email client constant | Browser / Client (`src/config.js`) | — | Progressive-enhancement UI checks only; Firestore rules remain the enforcement layer (CLAUDE.md) |
| Admin-email server constant | API / Backend (`api/_lib/config.js`) | — | CommonJS serverless functions can't import ESM `src/` modules; mirrored constant per Pitfall research |
| Admin-email rules literal | Database (`firestore.rules`) | — | Rules language cannot read env vars or imports; stays manually synced, allowlisted in grep check |
| Firebase API key (server) | API / Backend (`api/_lib/config.js`) | Vercel env (`FIREBASE_API_KEY`) | Env-var read with checked-in fallback (D-11); key is a public identifier, not a secret |
| `check:constants` proof | CI (`.github/workflows/ci.yml`) + local script | — | Must run identically locally and in CI (D-12); plain Node, no deps |

## Project Constraints (from CLAUDE.md)

Directives that bind this phase (from `CLAUDE.md` + `.claude/CLAUDE.md`):

- **Deployment model:** push to `main` auto-deploys production — every commit must leave main shippable.
- **Firestore rules:** repo `firestore.rules` is source of truth but Firebase doesn't read it from git; changes require manual Console paste (offer pbcopy). *This phase does NOT change rules* — the email literal at `firestore.rules:16` stays (allowlisted).
- **Do not break** Google sign-in or email/password auth flows. (Health gating touches neither; config swap is behavior-preserving.)
- **Cloudinary config stays** in `src/utils/cloudinary.js` — do NOT fold it into the new config modules (also locked by D-09).
- **No secrets in code or docs** — env vars documented by *name only* (AUDIT-04, D-10). The Firebase web API key is explicitly NOT a secret [CITED: firebase.google.com/docs/projects/api-keys], so keeping its fallback literal in `api/_lib/config.js` complies.
- **Constants convention:** UPPER_SNAKE_CASE, named exports (`export const ADMIN_EMAIL = ...`).
- **Build + lint + tests before shipping** significant changes; CI runs lint → test:ci → build on Node 24 (`package.json` engines says 22.x; local Node is v24.13.0 — the check script must use plain built-ins that work on both).
- **Avoid destructive git actions** — no history rewrite (also locked by HYG-01/D-14 and Out of Scope table).
- **Audit trail:** `logActivity()` applies to app data changes — not applicable to this phase's docs/config work.
- **Small reviewable changes over rewrites.**

## Standard Stack

### Core (all existing — no additions)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node built-ins (`fs`, `path`, `child_process`) | Node 22/24 | `scripts/check-constants.js` | Zero-dependency script; runs identically locally and in CI [VERIFIED: codebase — CI uses Node 24, local v24.13.0] |
| firebase-admin | 13.10.0 (installed) | Already used by `api/accept-invite.js` for `verifyIdToken` | [VERIFIED: node_modules/firebase-admin/package.json = 13.10.0] |
| Google Identity Toolkit REST (`accounts:lookup`) | n/a (HTTP API) | Token verification without the Admin SDK — existing pattern in `api/send-email.js:26-33` | [VERIFIED: codebase — in production today] |
| Jest via react-scripts 5 | installed | Existing test suite must stay green after `permissions.test.js` imports from config | [VERIFIED: codebase — `npm run test:ci`] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `git ls-files` | system git | Scope the constants check to tracked code files | Inside `check-constants.js` — respects tracked-only, no `.gitignore` parsing needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| identitytoolkit lookup for health gating | `getAuthAdmin().verifyIdToken()` (accept-invite pattern) | Admin SDK path is cleaner BUT fails exactly when `FIREBASE_SERVICE_ACCOUNT` is broken — the failure mode `api/health.js` exists to diagnose. Use identitytoolkit (see Architecture Patterns) |
| Plain Node walk in check script | `grep -rn` in an npm script | Shell grep differs across BSD/GNU (macOS local vs ubuntu CI); a Node script is deterministic on both and can `require()` the config to avoid embedding the literal |
| Checked-in `ADMIN_EMAIL` constant | `REACT_APP_ADMIN_EMAIL` env var | CRA inlines env at build time; unset/typo'd var silently becomes `undefined` → admin loses admin UI everywhere. Constant can't be unset (locked direction per D-09/D-11 and PITFALLS.md Pitfall 6) |

**Installation:** none — no new packages.

**Version verification:** No packages to install; `firebase-admin@13.10.0` confirmed installed via `node -e "require('./node_modules/firebase-admin/package.json').version"`.

## Package Legitimacy Audit

This phase installs **no external packages**. No audit rows required.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                     UNAUTHENTICATED CALLER
                              |
                              v
                    GET /api/health ──────────────► { status: 'ok' }   (learns nothing)
                              |
              Authorization: Bearer <idToken>?
                              |
                              v
        POST https://identitytoolkit.googleapis.com/v1/accounts:lookup
              key = FIREBASE_API_KEY  (from api/_lib/config.js:
                                       process.env.FIREBASE_API_KEY || fallback literal)
                              |
                 valid token? email extracted?
                              |
                              v
        email === ADMIN_EMAIL (from api/_lib/config.js)?
              |                               |
             yes                              no
              v                               v
   full diagnostics payload          { status: 'ok' }   (indistinguishable from unauth)
   (same 5 fields as today)


   CONFIG FLOW (build/deploy time):
   src/config.js  ──import──►  src/firebase.js, src/utils/helpers.js,
   (ADMIN_EMAIL,               4 components, src/utils/permissions.test.js
    ROLES, ...)
   api/_lib/config.js ──require──► api/lead-intake.js, api/send-email.js, api/health.js
   firestore.rules:16  (manual 3rd copy — allowlisted, synced by hand)

   CI PROOF (every push/PR to main):
   npm run check:constants ──► node scripts/check-constants.js
        │  reads ADMIN_EMAIL by require('../api/_lib/config.js')
        │  scans `git ls-files src api scripts public .github` + root code files
        └─► exit 1 if literal found outside {src/config.js, api/_lib/config.js, firestore.rules}
```

### Recommended Project Structure (new/changed files only)

```
docs/
├── SAAS_READINESS_AUDIT.md      # AUDIT-01 (new)
├── SAAS_UPGRADE_PLAN.md         # AUDIT-02 (new)
├── SAAS_UPGRADE_CHANGELOG.md    # AUDIT-03 (new, Phase 1 entry recorded)
├── ENVIRONMENT.md               # AUDIT-04 / D-10 (new)
└── DATABASE_SCHEMA.md           # existing — cited by audit
src/
└── config.js                    # NEW: ADMIN_EMAIL, ROLES, SELF_SERVICE_ROLES (ESM named exports)
api/_lib/
└── config.js                    # NEW: ADMIN_EMAIL, FIREBASE_API_KEY (CommonJS module.exports)
scripts/
└── check-constants.js           # NEW: the CI grep proof (plain Node)
(deleted: screenshot.js [git rm], rems-project-source-2026-04-09{,/.zip} [plain rm — untracked])
```

### Pattern 1: Split-response health endpoint (D-06/D-08)

**What:** Unauthenticated → bare `{ status: 'ok' }`. Valid admin token → the exact current payload (`resendConfigured`, `firebaseAdminConfigured`, `leadIntakeConfigured`, `adminInit`, `matchingKeyNames`). A valid **non-admin** token gets the same bare response as unauthenticated — never a 403 — so nothing reveals that a richer response exists.
**When to use:** `api/health.js` only.
**Why identitytoolkit and not Admin SDK:** the endpoint's documented purpose (comments + commit b8555a8) is diagnosing `FIREBASE_SERVICE_ACCOUNT` / admin-init failures. `verifyIdToken` requires a working Admin SDK — a circular dependency on the broken thing. The identitytoolkit lookup (`api/send-email.js:26-33` pattern) needs only the public web API key, which D-11 guarantees is always available via the fallback. [VERIFIED: codebase — both patterns read this session]

### Pattern 2: Behavior-preserving literal swap

**What:** Every consumer replaces `'dealcenterx@gmail.com'` with an imported `ADMIN_EMAIL` — nothing else changes. Do NOT consolidate the duplicate helpers (`isAdminUser` at `helpers.js:10` vs `isAdmin` at `helpers.js:164` vs inline component checks) in this phase; that's a behavior-risk refactor outside D-09's scope.
**Complete consumer list** (verified by `git grep` this session — one more than CONCERNS.md):

| File:Line | Usage | Repoint to |
|-----------|-------|-----------|
| `src/firebase.js:25` | `ADMIN_EMAIL` const (role assignment at signup) | `import { ADMIN_EMAIL } from './config'` |
| `src/utils/helpers.js:4` | `ADMIN_EMAIL` const for `isAdminUser()` | `import { ADMIN_EMAIL } from '../config'` |
| `src/utils/helpers.js:164` | inline literal in `isAdmin()` | same import |
| `src/components/NewDealPage.js:35` | inline admin check | `import { ADMIN_EMAIL } from '../config'` |
| `src/components/CRMMessagesPage.js:143` | inline admin check | same |
| `src/components/DealsDashboard.js:61` | inline admin check | same |
| `src/components/CRMEmailInboxPage.js:73` | sample-data `from:` fallback (NOT an admin check) | same — swap is still behavior-identical |
| `src/components/CRMEmailInboxPage.js:86,264` | inline admin checks | same |
| `src/utils/permissions.test.js:9` | **load-bearing test fixture** ("admin email counts even without the admin role") | `import { ADMIN_EMAIL } from '../config'` in the fixture |
| `api/lead-intake.js:7` | `ADMIN_EMAIL` const (notify admin) | `const { ADMIN_EMAIL } = require('./_lib/config')` |
| `firestore.rules:16` | `isAdmin()` email fallback | **stays** — manually synced, allowlisted (removal is Phase 6/SEC-04) |

### Pattern 3: ESM/CommonJS split config

**What:** `src/` is ESM (CRA/webpack); `api/` is CommonJS (`module.exports` throughout, verified). One config file cannot serve both without a build step. Two small mirrored files + the rules copy = three documented locations, which is exactly what HYG-04's allowlist encodes.
**Example:** see Code Examples below.

### Pattern 4: Docs written last, recording finished state

**What:** `SAAS_READINESS_AUDIT.md` findings carry a Status column (D-04); Phase 1's own fixes (health gating, config centralization, hygiene) should read "Fixed in Phase 1" when the audit merges. Therefore sequence code work before (or alongside) doc finalization, and the changelog's Phase 1 entry records actual commands run and their results (AUDIT-03's what/why/files/commands/results/risks shape).
**Audit structure (AUDIT-01 required sections, in order):** Executive Summary → Stack → Product Purpose → User Flows → Weaknesses by Area (~1 para each) → Risk-Ranked Findings table (Severity / Finding / File:Line / Impact / Fix / Status, ordered Critical→Low) → Roadmap → Safe Execution Plan → Definition of Done.
**Changelog structure (AUDIT-03):** one `## Phase N — <name> (date)` section per phase with `What / Why / Files / Commands / Results / Risks` subsections; Phase 1 entry written in this phase; "maintained every phase" is a standing task.
**ENVIRONMENT.md structure (D-10):** table of `Variable | Purpose | Consumed by | Scope (build-time client / runtime server) | Required?` — names only, never values; later phases append.

### Audit Findings Seed List (all verified this session)

The audit formalizes these; severity assignment is executor judgment but the inventory is fixed:

1. Admin email hardcoded in 10 code locations + `firestore.rules:16` (list above) — being fixed in Phase 1.
2. Hardcoded Firebase API key at `api/send-email.js:5` — fixed in Phase 1 (env var + fallback). Note in the finding that the key is a public identifier per Firebase docs, so severity is process-hygiene not secret-exposure [CITED: firebase.google.com/docs/projects/api-keys].
3. `api/health.js` discloses env-var name schema (`matchingKeyNames`) to unauthenticated callers — fixed in Phase 1.
4. `REACT_APP_DEV_BYPASS` (`src/App.js:154`): build-time flag that skips the client-side auth gate. UI-only bypass (Firestore rules still enforce), but must be documented and confirmed unset in Vercel production env — **new finding, not in CONCERNS.md**.
5. Stray archive `rems-project-source-2026-04-09{,/.zip}` (~3.6 MB on disk) — corrected finding: untracked, never committed; local-disk cleanup only.
6. `screenshot.js` at repo root with unusable hardcoded paths (`/root/.cache/ms-playwright/...`, `/tmp/shot-*.png`) + `puppeteer` devDependency used only by it.
7. Cloudinary delete is a no-op TODO (`src/utils/cloudinary.js:48`) — Fixed in Phase 4 (SEC-03).
8. Missing-index silent fallback in `AnalyticsDashboard.js:62-75` — Fixed in Phase 5 (DATA-02).
9. Firestore rules and `api/` handlers untested — Fixed in Phase 2 (TEST-01/02).
10. No error tracking (`ErrorBoundary.js:18` console-only) — Fixed in Phase 3 (OBS-01..03).
11. Rules admin-email fallback (`firestore.rules:14-20`) — Fixed in Phase 6 (SEC-04), lockout-gated.
12. Firestore backup posture **unverified** (D-05 / STATE.md) — record as Open finding.
13. `/api/health` external-traffic check result (D-07) — record whichever way it lands.
14. 938 hardcoded hex values vs 161 token usages (PITFALLS.md audit) — Fixed in Phase 7 (UI-05).
15. `CRMLeadDetailPage.js` is 2,678 lines / 30+ state pieces — documented as known debt (no phase fixes it; out-of-scope note).

### Anti-Patterns to Avoid

- **`git rm` on the archive:** it will error ("pathspec did not match") — the files are untracked. Use `rm -rf`. [VERIFIED: `git ls-files` empty, `git status --ignored` shows `!!`]
- **History rewrite (filter-repo/BFG):** explicitly out of scope (REQUIREMENTS Out of Scope table; PITFALLS.md Pitfall 5) — and now moot since the archive was never in history.
- **403 for non-admin tokens on `/api/health`:** leaks that a privileged response exists; return the bare shape instead.
- **Embedding the email literal in `check-constants.js`:** the script would then need its own allowlist entry; `require('../api/_lib/config')` instead.
- **Touching `firestore.rules` in this phase:** the email fallback removal is Phase 6's lockout-gated job. Phase 1 only *documents* the rules copy.
- **Coupling the config refactor to helper consolidation:** swapping inline checks for `isAdminUser()` calls changes call graphs; the literal-for-constant swap is grep-verifiable and behavior-identical.
- **Writing the admin email literal into the new docs:** keeps docs greppable-clean; refer to "the admin email" or `ADMIN_EMAIL`. (The check scope excludes `docs/`, but discipline avoids future scope arguments. Existing literals in `CLAUDE.md`, `.claude/CLAUDE.md`, `docs/DATABASE_SCHEMA.md`, `.planning/**` are why the check MUST scope to code paths only.)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ID-token verification | Custom JWT decode/signature check | Existing identitytoolkit lookup pattern (`api/send-email.js:26-33`) or `getAuthAdmin().verifyIdToken()` (`api/accept-invite.js:27`) | Both are proven in production in this repo; hand-rolling JWT verification is a classic vulnerability factory |
| Tracked-file enumeration in check script | Recursive `fs` walk + `.gitignore` parser | `git ls-files <paths>` via `child_process.execSync` | git already knows what's tracked; a walk would scan `node_modules`/`build` or need ignore logic |
| Cross-platform grep | `grep -rn` shell pipelines in package.json | Plain Node `fs.readFileSync` + `String.includes` over the `git ls-files` list | BSD (macOS) vs GNU (CI ubuntu) grep flag differences; Node is identical on both |

**Key insight:** every capability this phase needs already exists in the repo or in Node built-ins. The phase's risk is not technical difficulty — it's completeness (missing one literal, one env var, one consumer) — which is why the grep check itself is the deliverable that keeps it done.

## Runtime State Inventory

This phase is a refactor/cleanup — inventory answered explicitly:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None** — the admin email *value* does not change; Firestore docs (`users`, `activity_log`, etc.) keep the same email strings. Verified: no collection/key/user_id renames in scope | none |
| Live service config | **Two items:** (1) possible external monitors hitting `/api/health` — invisible to grep, which is exactly why D-07 mandates the user checking Vercel logs before merge (pause point); (2) Vercel env vars — new optional `FIREBASE_API_KEY` to be set by user at leisure (fallback covers unset) | checkpoint:human-verify for D-07; document env var in ENVIRONMENT.md |
| OS-registered state | **None** — no scheduled tasks, daemons, or registered processes reference anything renamed. Verified by phase scope (web app + serverless) | none |
| Secrets/env vars | **No renames.** Existing `FIREBASE_SERVICE_ACCOUNT`, `RESEND_API_KEY`, `EMAIL_FROM`, `LEAD_INTAKE_KEY` untouched. New optional `FIREBASE_API_KEY` (additive, fallback if unset). Client build-time vars `REACT_APP_DEV_BYPASS`, `REACT_APP_CRM_EMAIL_WEBHOOK_URL` untouched but newly documented | ENVIRONMENT.md entries |
| Build artifacts | **None** — CRA `build/` is gitignored and regenerated per deploy; no installed-package or artifact renames. `puppeteer` devDep becomes orphaned if screenshot.js is deleted (Open Question #2) | optionally `npm uninstall puppeteer` |

**The canonical question answered:** after all files are updated, the only runtime systems still holding old state are (a) any external `/api/health` consumer — handled by D-06's always-200 bare response plus the D-07 log check — and (b) the manually-synced `firestore.rules` copy, which intentionally keeps the literal until Phase 6.

## Common Pitfalls

### Pitfall 1: `git rm` fails on the archive because it was never committed
**What goes wrong:** Plan says `git rm -r rems-project-source-2026-04-09*` per HYG-01/D-14 wording; git errors with "did not match any file(s) known to git"; an agent might then "fix" it with `git add -f` first (disaster) or skip the removal.
**Why it happens:** CONCERNS.md asserted the archive is "committed to the repository despite .gitignore rules" — that claim is wrong. `git ls-files` returns nothing for both paths; `git status --porcelain --ignored` lists them as `!!` (ignored, untracked); `git log --all` shows no commit ever touched them. [VERIFIED: this session]
**How to avoid:** Use plain `rm -rf rems-project-source-2026-04-09 rems-project-source-2026-04-09.zip`. Verify with `ls` and `git status --ignored`. Record the corrected finding in the audit (and note deletion is not git-recoverable — D-14 authorized no pre-removal copy).
**Warning signs:** any plan step containing `git rm` for these paths, or `git add -f`.

### Pitfall 2: The grep check and permissions.test.js deadlock
**What goes wrong:** Config refactor updates the 9 locations CONCERNS.md listed; `check:constants` then fails on `src/utils/permissions.test.js:9`. If someone "fixes" the test by changing the fixture email to a fake, the test `"admin email counts even without the admin role"` silently stops testing the real fallback path.
**How to avoid:** The fixture imports the constant: `import { ADMIN_EMAIL } from '../config'` and uses `email: ADMIN_EMAIL`. Test stays meaningful, grep stays clean.
**Warning signs:** test fixture with `admin@example.com` in the admin object; check-constants allowlisting `*.test.js`.

### Pitfall 3: Check scope accidentally includes docs/planning files
**What goes wrong:** A naive `grep -rn "email" .` scope fails on `CLAUDE.md`, `.claude/CLAUDE.md`, `docs/DATABASE_SCHEMA.md`, and a dozen `.planning/**` files that legitimately mention the admin email [VERIFIED: `git grep -l` this session]. Either the check never passes or the allowlist balloons.
**How to avoid:** Scope the scan to code paths only: `git ls-files src api scripts public .github` plus root-level code files (`firestore.rules`, `vercel.json`, `package.json`). Allowlist exactly `src/config.js`, `api/_lib/config.js`, `firestore.rules`. This matches HYG-04's wording ("appears only in…") as applied to code.
**Warning signs:** allowlist longer than 3 entries; check scanning `*.md` outside code dirs.

### Pitfall 4: Health gating that depends on the broken thing (circular diagnostics)
**What goes wrong:** Gating with `getAuthAdmin().verifyIdToken()` means when `FIREBASE_SERVICE_ACCOUNT` is missing/corrupt — the primary failure `api/health.js` was built to diagnose (commit b8555a8) — the admin cannot authenticate to see the diagnosis.
**How to avoid:** Use the identitytoolkit `accounts:lookup` pattern with `FIREBASE_API_KEY` from `api/_lib/config.js` (always present via D-11 fallback). Check `users[0].email === ADMIN_EMAIL`; optionally also require `users[0].emailVerified` as cheap defense-in-depth (the admin signs in via Google, always verified). Email-based check is safe here: Firebase enforces one account per email, and the admin account already exists, so the address cannot be claimed by an attacker [VERIFIED: pattern matches `firestore.rules:16` which trusts the same claim].
**Warning signs:** `require('./_lib/firebaseAdmin')` used for *authentication* (using it for the `adminInit` status probe is fine and required by D-08).

### Pitfall 5: Shipping the health change before the D-07 traffic check
**What goes wrong:** Merge auto-deploys; an unknown uptime monitor that parsed the old JSON shape starts alerting (or worse, silently goes green forever on `{status:'ok'}`).
**How to avoid:** The plan MUST contain an explicit pause/checkpoint before the health commit merges: user checks Vercel dashboard logs for `/api/health` traffic; result recorded as an audit finding either way (D-05/D-07). Note the bare response still returns HTTP 200, so simple up/down monitors keep working — only detail-parsing consumers would notice.
**Warning signs:** health.js task with no `checkpoint:human-verify` predecessor.

### Pitfall 6: Partial migration / two sources of truth (PITFALLS.md Pitfall 6, confirmed)
**What goes wrong:** 9 of 10 call sites use the new constant, one keeps the literal — the exact bug this task exists to prevent.
**How to avoid:** The consumer table above is exhaustive (re-grepped this session). The check script is the enforcement; run it locally before the commit, add CI step in the same commit as the refactor so main is never green with a partial migration.
**Warning signs:** `npm run check:constants` not in the same commit/PR as the consumer edits.

### Pitfall 7: CI=true build behavior and step ordering in ci.yml
**What goes wrong:** Adding the check step carelessly reorders or breaks the existing pipeline; CONTEXT requires lint → test → build order preserved. Also note the existing `Build` step deliberately sets `CI: false` (CRA promotes warnings to errors otherwise) — don't "clean that up."
**How to avoid:** Insert `- name: Check constants / run: npm run check:constants` immediately after `Install dependencies` and before `Lint` (fastest-fail first, order of the original three preserved). [VERIFIED: current ci.yml read this session]

## Code Examples

All patterns derived from code verified in this repo.

### src/config.js (new — ESM, follows UPPER_SNAKE_CASE named-export convention)
```javascript
// Source: convention per src/utils/helpers.js + CONTEXT.md D-09
// Single client-side source of truth for the admin identity and role lists.
// NOTE: firestore.rules contains a manually-synced copy of ADMIN_EMAIL (see docs/ENVIRONMENT.md).
export const ADMIN_EMAIL = 'dealcenterx@gmail.com';

export const ROLES = ['admin', 'agent', 'buyer', 'seller'];

// Roles a user may pick for themselves at signup (admin is never self-service).
export const SELF_SERVICE_ROLES = ['agent', 'buyer', 'seller'];
```

### api/_lib/config.js (new — CommonJS, mirrors client constant)
```javascript
// Source: pattern per api/_lib/firebaseAdmin.js (CommonJS) + CONTEXT.md D-11
// Server-side config. ADMIN_EMAIL is manually mirrored in src/config.js and firestore.rules.
const ADMIN_EMAIL = 'dealcenterx@gmail.com';

// Firebase public web API key — an identifier, not a secret (used to validate ID tokens
// via identitytoolkit). Reads the Vercel env var when set; falls back to the checked-in
// literal so deploys never break while the env var is unset. (D-11)
const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY || 'AIzaSyCI2EX7aR0ZphG36_IlUQqt0nFozedj5pI';

module.exports = { ADMIN_EMAIL, FIREBASE_API_KEY };
```

### api/health.js (gated shape — reuses send-email.js token pattern)
```javascript
// Source: token verification pattern from api/send-email.js:17-44 [VERIFIED: codebase]
const { getDb } = require('./_lib/firebaseAdmin');
const { ADMIN_EMAIL, FIREBASE_API_KEY } = require('./_lib/config');

module.exports = async (req, res) => {
  const bare = { status: 'ok' };

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return res.status(200).json(bare);

  let user = null;
  try {
    const lookup = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }) }
    );
    if (lookup.ok) user = (await lookup.json()).users?.[0] || null;
  } catch { /* fall through to bare */ }

  // Non-admin and invalid tokens get the same bare response — no 403, no schema leak.
  if (!user || user.email !== ADMIN_EMAIL || !user.emailVerified) {
    return res.status(200).json(bare);
  }

  // Admin-gated detail: same flags as before the change (D-08).
  const keys = Object.keys(process.env).filter((k) => /RESEND|FIREBASE|LEAD|EMAIL/i.test(k));
  let adminInit = 'ok';
  try { getDb(); } catch (error) { adminInit = error.message || 'failed'; }

  return res.status(200).json({
    status: 'ok',
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    firebaseAdminConfigured: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT),
    leadIntakeConfigured: Boolean(process.env.LEAD_INTAKE_KEY),
    adminInit,
    matchingKeyNames: keys
  });
};
```

### scripts/check-constants.js (design sketch — plain Node, no deps)
```javascript
// Source: D-12 + git ls-files scoping decision (see Pitfall 3)
// Fails (exit 1) if the admin email literal appears in tracked code files
// outside the allowed locations. Reads the literal from server config so
// this script itself never needs an allowlist entry.
const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const { ADMIN_EMAIL } = require('../api/_lib/config');

const ALLOWED = new Set(['src/config.js', 'api/_lib/config.js', 'firestore.rules']);
// Code scope only — docs/, .planning/, CLAUDE.md legitimately mention the email.
const files = execSync(
  'git ls-files src api scripts public .github firestore.rules vercel.json package.json',
  { encoding: 'utf8' }
).split('\n').filter(Boolean);

const violations = files.filter(
  (f) => !ALLOWED.has(f) && readFileSync(f, 'utf8').includes(ADMIN_EMAIL)
);

if (violations.length) {
  console.error('Admin email literal found outside allowed config locations:');
  violations.forEach((f) => console.error(`  ${f}`));
  process.exit(1);
}
console.log('check:constants OK — admin email only in allowed locations.');
```
`package.json`: `"check:constants": "node scripts/check-constants.js"`. CI step inserted after `npm ci`, before Lint.

### permissions.test.js fixture fix (the 10th occurrence)
```javascript
// Source: src/utils/permissions.test.js:9 [VERIFIED: codebase]
import { ADMIN_EMAIL } from '../config';
// ...
const admin = { userId: 'admin-1', email: ADMIN_EMAIL, role: 'admin', assignedProperties: [] };
// The "admin email counts even without the admin role" test now tracks the real constant.
```

### send-email.js change (HYG-05)
```javascript
// Replace api/send-email.js:5
// - const FIREBASE_API_KEY = 'AIzaSy...';
const { FIREBASE_API_KEY } = require('./_lib/config');
// (rest of handler unchanged — lookup URL already interpolates FIREBASE_API_KEY)
```

### Hygiene commands (exact, verified against actual git state)
```bash
# Archive: UNTRACKED — plain rm, no git involvement (Pitfall 1)
rm -rf rems-project-source-2026-04-09 rems-project-source-2026-04-09.zip
# Verify: nothing on disk, nothing in git status --ignored
ls rems-project-source-* 2>/dev/null; git status --porcelain --ignored | grep rems-project || echo CLEAN

# screenshot.js: TRACKED (commit 0b3cb88) — git rm works, history keeps it recoverable (D-13)
git rm screenshot.js
# .gitignore lines 26-27 already cover future exports [VERIFIED] — no change needed
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Firebase API keys treated as secrets | Officially documented as identifiers safe in code when API-restricted | Long-standing Firebase guidance | D-11's fallback literal is compliant; audit finding is process-hygiene, not exposure [CITED: firebase.google.com/docs/projects/api-keys] |
| firebase-admin legacy namespace API | Modular API (`firebase-admin/app`, `/auth`) | v12+ | Already adopted in `api/_lib/firebaseAdmin.js` [VERIFIED] |

**Deprecated/outdated:** nothing in this phase's surface.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `FIREBASE_API_KEY` env var is not currently set in Vercel (cannot inspect the dashboard) | Config centralization | None — D-11's fallback makes either state safe |
| A2 | No external uptime monitor consumes `/api/health` detail fields | health.js gating | Monitor mis-parses new shape; mitigated by D-07's mandatory user log-check pause AND by keeping HTTP 200 on the bare response |
| A3 | The Firebase web API key has appropriate API restrictions configured in Google Cloud Console (Firebase docs require restriction for the "safe to expose" guarantee) | Audit content | Unrestricted key allows quota abuse; recommend recording "verify key restrictions" as an audit finding rather than assuming |
| A4 | The brief's 8 named phase titles match the deliverable areas listed in PROJECT.md Active requirements | AUDIT-02 | SAAS_UPGRADE_PLAN.md maps the wrong names; must be confirmed with user (Open Question #1) |
| A5 | `REACT_APP_DEV_BYPASS` is unset in Vercel production builds | Audit finding #4 | If set, production skips the client auth gate (rules still enforce data access, but the app shell renders unauthenticated) — the audit finding should ask the user to confirm |

## Open Questions

1. **What are the brief's literal 8 phase names for `docs/SAAS_UPGRADE_PLAN.md`?**
   - What we know: ROADMAP.md fixes the execution order and states the mapping is written in Phase 1; CONTEXT.md says the mapping itself is "a roadmap-level decision already made, not open for redesign."
   - What's unclear: the original brief's phase titles are not preserved in `.planning/` (PROJECT.md lists ~12 deliverable areas, not 8 named phases).
   - Recommendation: planner adds a task step that asks the user to paste/confirm the brief's 8 phase names before that doc is written (a natural fit alongside the D-07 pause), or drafts a reconstruction from PROJECT.md's Active list for the user to approve.
2. **Remove the `puppeteer` devDependency with `screenshot.js`?**
   - What we know: `screenshot.js` is puppeteer's only consumer [VERIFIED: `git grep puppeteer` → screenshot.js only]; Phase 8 will pick fresh screenshot tooling (D-13 rationale).
   - What's unclear: D-13 only mentions the file, not the dependency.
   - Recommendation: remove it in the same commit (`npm uninstall puppeteer`) — dead ~200MB+ install weight, trivially restorable; low risk, but flag in the plan so the user sees it.
3. **D-07 result (pending by design):** external `/api/health` traffic — execution pauses for the user's Vercel log check; audit records the result either way. Not resolvable at research time.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | check-constants script, build | ✓ | v24.13.0 local (CI: 24; engines: 22.x) | — |
| git | hygiene tasks, `git ls-files` in script | ✓ | system git (repo operations verified) | — |
| npm | scripts, CI | ✓ | bundled with Node 24 | — |
| Vercel dashboard access | D-07 log check, `FIREBASE_API_KEY` env var | user-held | — | Pause point; fallback literal covers env var |
| firebase-admin | health.js `adminInit` probe (existing) | ✓ | 13.10.0 installed | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** `FIREBASE_API_KEY` Vercel env var (fallback literal per D-11); Vercel log access is user-mediated via checkpoint.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest via react-scripts 5.0.1 (CRA defaults, `src/setupTests.js`) |
| Config file | none (CRA-inherited) — do not add one (TEST-03 in Phase 2 depends on CRA Jest staying untouched) |
| Quick run command | `npm run test:ci` |
| Full suite command | `npm run lint && npm run test:ci && npm run build && npm run check:constants` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUDIT-01 | Audit doc exists with required sections | smoke + manual review | `test -f docs/SAAS_READINESS_AUDIT.md && grep -q "Definition of Done" docs/SAAS_READINESS_AUDIT.md` | ❌ created by phase |
| AUDIT-02 | Plan doc exists, 8 phases mapped | smoke + manual review | `test -f docs/SAAS_UPGRADE_PLAN.md` | ❌ created by phase |
| AUDIT-03 | Changelog exists with Phase 1 entry | smoke | `grep -q "Phase 1" docs/SAAS_UPGRADE_CHANGELOG.md` | ❌ created by phase |
| AUDIT-04 | Every env var documented by name | smoke | `for v in FIREBASE_SERVICE_ACCOUNT RESEND_API_KEY EMAIL_FROM LEAD_INTAKE_KEY FIREBASE_API_KEY REACT_APP_DEV_BYPASS REACT_APP_CRM_EMAIL_WEBHOOK_URL; do grep -q "$v" docs/ENVIRONMENT.md || echo "MISSING $v"; done` | ❌ created by phase |
| HYG-01 | Archive gone from working tree | smoke | `ls rems-project-source-* 2>/dev/null; test $? -ne 0` | n/a (deletion) |
| HYG-02 | screenshot.js untracked and gone | smoke | `git ls-files screenshot.js \| wc -l` → 0 and `test ! -f screenshot.js` | n/a (deletion) |
| HYG-03 | Unauth health call reveals nothing | manual-only (production) — **justification:** endpoint behavior is only meaningful on deployed Vercel runtime; local `vercel dev` not configured | post-deploy: `curl -s https://rems-app.vercel.app/api/health` → exactly `{"status":"ok"}`; with admin Bearer token → full detail | human-verify at phase end |
| HYG-04 | Literal only in allowed locations | unit (script) | `npm run check:constants` (also sabotage-test once: add literal to a component, expect exit 1, revert) | ❌ Wave 0 — the script IS the phase deliverable |
| HYG-05 | send-email reads key from env path | smoke | `grep -c "AIzaSy" api/send-email.js` → 0; `grep -q "FIREBASE_API_KEY" api/_lib/config.js` | n/a |
| (regression) | Existing tests green after config refactor | unit | `npm run test:ci` (permissions.test.js now imports ADMIN_EMAIL) | ✅ exists |

### Sampling Rate
- **Per task commit:** `npm run test:ci` + `npm run check:constants` (after the script lands)
- **Per wave merge:** `npm run lint && npm run test:ci && npm run build && npm run check:constants`
- **Phase gate:** full suite green + production curl checks (HYG-03) + doc smoke greps before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `scripts/check-constants.js` — covers HYG-04 (created by this phase; no pre-existing gap)
- No framework install or config gaps — existing CRA Jest covers the only code-adjacent test change (permissions fixture import).

## Security Domain

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (health gating) | Firebase ID token verified server-side via Google identitytoolkit — never trust client-asserted identity; reuse proven repo pattern |
| V3 Session Management | no | Firebase-managed tokens; unchanged |
| V4 Access Control | yes (core of HYG-03) | Admin check server-side (`email === ADMIN_EMAIL` + `emailVerified`); non-admin gets identical bare response (no privilege disclosure); Firestore rules remain data enforcement layer |
| V5 Input Validation | minimal | No new user input surfaces; Bearer-token parsing follows existing pattern. Full zod validation is Phase 4 (SEC-01) |
| V6 Cryptography | no | Token signature verification delegated to Google — never hand-roll |
| V8 Data Protection | yes | Env-var *names* only in docs (D-10); no values ever; secrets stay in Vercel |
| V14 Configuration | yes | This phase's whole point: single source of truth + CI-enforced; `matchingKeyNames` schema disclosure closed |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Env schema disclosure via `/api/health` | Information Disclosure | Split response (D-06); bare 200 for all non-admin callers |
| Admin-email spoofing to unlock health detail | Spoofing | Google-signed ID token verification; one-account-per-email in Firebase Auth (admin account exists → address unclaimable); `emailVerified` check as defense-in-depth |
| Enumeration of privileged endpooint behavior | Information Disclosure | Non-admin tokens receive same response as unauthenticated (no 401/403 differential) |
| Grep-check bypass via string construction (`'dealcenterx' + '@gmail.com'`) | Tampering | Out of scope for a literal check; mitigated by code review + the fact that all current occurrences are plain literals [VERIFIED] |
| Build-time auth bypass (`REACT_APP_DEV_BYPASS`) | Elevation of Privilege (UI-layer) | Document in ENVIRONMENT.md + audit finding + user confirms unset in production Vercel env (rules still enforce data access regardless) |

## Sources

### Primary (HIGH confidence — direct codebase verification this session)
- `git grep dealcenterx@gmail.com` — exhaustive occurrence list (10 code locations + rules + docs/planning files)
- `git ls-files` / `git status --ignored` / `git log --all` — archive untracked/never committed; screenshot.js tracked at commit 0b3cb88
- Read in full: `api/health.js`, `api/send-email.js`, `api/accept-invite.js` (1-45), `api/lead-intake.js` (1-40), `api/_lib/firebaseAdmin.js`, `src/firebase.js` (1-90), `src/utils/helpers.js` (1-30), `src/utils/permissions.js` (head) + `permissions.test.js` (head), `firestore.rules` (1-40), `.github/workflows/ci.yml`, `package.json`, `vercel.json`, `screenshot.js`, `.gitignore` (rems lines)
- `git grep process.env` — complete env-var inventory including the 2 undocumented client vars
- `.planning/codebase/CONCERNS.md`, `STRUCTURE.md`, `INTEGRATIONS.md`, `TESTING.md`; `.planning/research/PITFALLS.md` (Pitfalls 5 & 6 directly on-point); `.planning/ROADMAP.md`; `.planning/PROJECT.md`

### Secondary (MEDIUM confidence)
- [CITED: firebase.google.com/docs/projects/api-keys] — Firebase API keys are identifiers, safe in code when API-restricted; restriction caveat feeds audit finding A3

### Tertiary (LOW confidence)
- none used

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all patterns already in production in this repo
- Architecture: HIGH — designs derived from verified existing code and locked CONTEXT decisions
- Pitfalls: HIGH — the two most important (untracked archive, load-bearing test fixture) were discovered and verified by direct tool use this session; PITFALLS.md corroborates the rest
- AUDIT-02 mapping input: LOW — the brief's 8 phase names are unrecoverable from the repo (Open Question #1)

**Research date:** 2026-07-06
**Valid until:** ~2026-08-05 (stable domain; codebase facts valid until the phase itself changes them)
