# Phase 1: Audit, Repo Hygiene & Config Centralization - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the reviewer-facing audit foundation and repo cleanup that every later phase builds on: `docs/SAAS_READINESS_AUDIT.md` and `docs/SAAS_UPGRADE_PLAN.md` written, `docs/SAAS_UPGRADE_CHANGELOG.md` scaffolded, the stray source archive and `screenshot.js` removed, `api/health.js` auth-gated, and the admin email + shared constants centralized in `src/config.js` (client) and `api/_lib/config.js` (server) with a CI grep proof. Requirements: AUDIT-01..04, HYG-01..05. No new product capabilities; no changes to auth flows or data model meaning.

</domain>

<decisions>
## Implementation Decisions

### Audit documents (AUDIT-01, AUDIT-02, AUDIT-03)
- **D-01:** `SAAS_READINESS_AUDIT.md` is a **showcase artifact** — written for outside evaluators (investors, recruiters, technical reviewers). Professional, structured, demonstrates engineering judgment; the audit itself is part of the showcase.
- **D-02:** **Full candor with remediation status.** Name every finding with file references and severity, even while unfixed, in the public repo. Honesty is the trust play (consistent with the "no fake badges" requirement). None of the findings are secrets-level.
- **D-03:** **Concise + evidence** depth: tight exec summary, ~1 paragraph per weakness area, risk-ranked findings table with severity / file:line / impact / fix per row. Target ~8–12 pages; every claim verifiable in the code.
- **D-04:** The audit is a **living document**: every finding carries a status column (Open / In progress / Fixed in Phase N), and each subsequent phase updates its rows as a standing task (alongside the AUDIT-03 changelog standing task).
- **D-05:** Audit findings must include the two items flagged in STATE.md: Firestore backup posture (unverified — record as finding) and the result of the `api/health.js` traffic check (D-07).

### api/health.js (HYG-03)
- **D-06:** **Split response shape**: unauthenticated GET returns bare `{ status: 'ok' }` (reveals nothing about env/infra); a valid **admin** Firebase ID token unlocks the diagnostics detail. Satisfies HYG-03 regardless of whether an external monitor exists.
- **D-07:** Before the change ships, the **user checks the Vercel dashboard logs** for recent traffic to `/api/health` (execution must pause and ask). The result is recorded as an audit finding either way.
- **D-08:** The admin-gated detail returns the **same flags as today** (boolean presence for RESEND / FIREBASE / LEAD_INTAKE config + admin-SDK init status). No expanded diagnostics — keep the phase small.

### Config centralization (HYG-04, HYG-05, AUDIT-04)
- **D-09:** Scope = **admin email + obvious siblings**: admin email literal, roles list, and the `api/send-email.js` Firebase API key (moved to env-var read). Cloudinary config **stays** in `src/utils/cloudinary.js` (already the single source per CLAUDE.md). No broad constants sweep.
- **D-10:** Env vars documented in a new **`docs/ENVIRONMENT.md`** — names, purpose, where consumed, never values. Later phases append to it (Sentry DSN in Phase 3, Cloudinary secret in Phase 4). Audit and changelog link to it.
- **D-11:** Firebase API key rollout is **env var with fallback**: code reads `process.env.FIREBASE_API_KEY`, falling back to the current literal kept in `api/_lib/config.js` if unset. Zero deploy risk (the key is a public web key); user sets the Vercel variable at leisure.
- **D-12:** The CI proof is an **npm script + CI step**: `npm run check:constants` (e.g., `scripts/check-constants.js`) fails if the admin email literal appears anywhere outside `src/config.js`, `api/_lib/config.js`, and `firestore.rules` (manually synced). Runs locally and as a step in `.github/workflows/ci.yml`.

### Repo hygiene (HYG-01, HYG-02)
- **D-13:** **`screenshot.js` is deleted**, not relocated — its hardcoded `/root/...` paths can't run locally and Phase 8 will take fresh screenshots with new tooling. Git history keeps it recoverable. (HYG-02's "removed if obsolete" branch.)
- **D-14:** `rems-project-source-2026-04-09/` and its `.zip` are **purely stale** — remove with plain `git rm` (no history rewrite, per HYG-01), no pre-removal diff or local copy needed. Verify `.gitignore` covers future exports.

### Claude's Discretion
- Exact structure/section ordering of the three docs (within the required sections listed in AUDIT-01/02/03).
- How admin verification is implemented in `api/health.js` (reuse the existing token-verification pattern from `api/send-email.js` or firebase-admin `verifyIdToken` — planner/researcher picks based on code).
- Shape of the config modules (named exports, constant names) — follow existing conventions (UPPER_SNAKE_CASE constants, named exports).
- Implementation details of `scripts/check-constants.js`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Codebase maps (findings inventory for the audit)
- `.planning/codebase/CONCERNS.md` — the risk findings the audit formalizes: admin email in 8+ files (exact file:line list), hardcoded Firebase API key at `api/send-email.js:5`, `api/health.js` exposure, Cloudinary delete no-op, missing indexes fallback, untested rules/API
- `.planning/codebase/STRUCTURE.md` — directory layout, naming conventions, where new code goes (`scripts/`, `api/_lib/`)
- `.planning/codebase/INTEGRATIONS.md` — current env-var inventory (`FIREBASE_SERVICE_ACCOUNT`, `RESEND_API_KEY`, `EMAIL_FROM`, `LEAD_INTAKE_KEY`) seeding `docs/ENVIRONMENT.md`

### Project docs
- `docs/DATABASE_SCHEMA.md` — Firestore collections reference (audit's stack/product sections cite it)
- `.planning/ROADMAP.md` — the 8-phase execution order that `docs/SAAS_UPGRADE_PLAN.md` must map the brief's named phases onto
- `.planning/REQUIREMENTS.md` — AUDIT-01..04 and HYG-01..05 acceptance wording

### Existing config surfaces
- `firestore.rules` — contains the admin email (line 16); stays manually synced and is an allowed location in the CI grep check
- `.github/workflows/ci.yml` — where the `check:constants` step is added (lint → test → build order preserved)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/send-email.js` — existing Firebase ID-token verification pattern (identitytoolkit lookup) that `api/health.js` gating can reuse; also the file whose hardcoded API key (line 5) moves to env var
- `api/_lib/firebaseAdmin.js` — Admin SDK init (`getDb()`, `getAuthAdmin()`); `api/_lib/` is the established home for the new server `config.js`
- `src/utils/helpers.js` — current admin-detection logic (lines 4, 164) that will import from the new `src/config.js`

### Established Patterns
- Constants: UPPER_SNAKE_CASE, named exports (`export const ADMIN_EMAIL = ...`)
- CI: `.github/workflows/ci.yml` runs lint → test:ci → build on push/PR to main; Node 24
- Deployment: merge to main auto-deploys production — every commit in this phase must leave main shippable (hence the fallback pattern in D-11)

### Integration Points
- Admin email consumers to repoint at config: `src/firebase.js:25`, `src/utils/helpers.js:4,164`, `src/components/NewDealPage.js:35`, `src/components/CRMMessagesPage.js:143`, `src/components/DealsDashboard.js:61`, `src/components/CRMEmailInboxPage.js:73,86,264`, `api/lead-intake.js:7` (per CONCERNS.md; researcher should re-grep to confirm completeness)
- `package.json` scripts — add `check:constants`
- `docs/` — the three new deliverable docs plus `ENVIRONMENT.md` live alongside `DATABASE_SCHEMA.md`

</code_context>

<specifics>
## Specific Ideas

- The audit should read like a senior team's assessment — the document quality itself is evidence of engineering capability (that's the showcase framing from PROJECT.md).
- Execution must include a pause point where the user checks Vercel logs for `/api/health` traffic before that change merges (D-07).
- `docs/SAAS_UPGRADE_PLAN.md` maps the user brief's 8 named phases onto the roadmap's research-backed execution order — this mapping is a roadmap-level decision already made, not open for redesign.

</specifics>

<deferred>
## Deferred Ideas

- Expanded health diagnostics (commit SHA, deploy time, per-integration reachability) — declined for Phase 1 (D-08); revisit if observability work in Phase 3 wants it.
- Broad constants sweep (cache TTLs, collection names, magic strings) — declined for Phase 1 (D-09); Phase 7's token migration covers the styling side.

</deferred>

---

*Phase: 1-Audit, Repo Hygiene & Config Centralization*
*Context gathered: 2026-07-06*
