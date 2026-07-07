# REMS - SaaS Upgrade Plan

## Overview

This plan uses the roadmap phase names in `.planning/ROADMAP.md` as the authoritative execution map. The work upgrades REMS from a functional real estate CRM into a professional SaaS product without framework migration, data-model rewrites, or production-breaking changes.

Each phase should leave `main` shippable. Each phase also updates `docs/SAAS_UPGRADE_CHANGELOG.md` before handoff.

**The brief's eight named phases** map onto this execution order exactly as follows (user-confirmed): (1) Audit, Repo Hygiene & Config Centralization, (2) Test Scaffolding, (3) Observability, (4) Serverless Hardening, (5) Data Reliability & Infrastructure Headers, (6) Firestore Rules Hardening, (7) UI/UX, Copy & Accessibility, (8) Landing Page, Trust & Final Polish. The mapping order is a settled roadmap-level decision, not open for redesign.

**Implementation status.** Phase 1 is **complete and verified this session**. The code for **Phases 2–8 was shipped ahead of schedule in a single bulk commit (`dd6364a`) and is deployed**, but each of those phases still requires its own verification under this milestone's phase-by-phase process — independent review, production smoke tests, manual Firebase publishes (rules/indexes), and configured-secret checks — before it can be considered done. See `docs/SAAS_READINESS_AUDIT.md` for the per-finding Status and `docs/SAAS_UPGRADE_CHANGELOG.md` for what shipped per phase. Maintaining that changelog and the audit's Status column is a standing task for every phase.

---

## Phase 1 - Audit, Repo Hygiene & Config Centralization

**Goal:** Establish the reviewer-facing documentation and clean foundation for later hardening.

**Primary files:**
- `docs/SAAS_READINESS_AUDIT.md`
- `docs/SAAS_UPGRADE_PLAN.md`
- `docs/SAAS_UPGRADE_CHANGELOG.md`
- `docs/ENVIRONMENT.md`
- `src/config.js`
- `api/_lib/config.js`
- `scripts/check-constants.js`
- `api/health.js`
- `api/send-email.js`
- `api/lead-intake.js`
- `.github/workflows/ci.yml`
- `package.json`

**Tasks:**
- Write audit, upgrade plan, changelog, and environment reference.
- Remove ignored source snapshot artifacts and obsolete root screenshot script.
- Centralize admin identity and role constants.
- Move server-side Firebase API key lookup into config with environment fallback.
- Add `npm run check:constants` and wire it into CI.
- Gate detailed health diagnostics behind an admin Firebase token while preserving a bare public health response.

**Risks:**
- Unknown external consumers may parse the old `/api/health` JSON shape.
- Missing a hardcoded admin identity consumer would preserve drift.
- Removing the obsolete screenshot dependency may affect only local tooling, but should still be documented.

**Acceptance criteria:**
- Public docs exist and contain the required sections.
- The admin identity literal appears only in the allowed config/rules locations inside tracked code.
- Unauthenticated `/api/health` reveals no integration details.
- Existing auth flows are unchanged.

**Verification commands:**
- `npm run check:constants`
- `npm run lint`
- `npm run test:ci`
- `npm run build`

---

## Phase 2 - Test Scaffolding

**Goal:** Add characterization tests for the riskiest change surfaces before changing their behavior.

**Primary files:**
- `firestore.rules`
- `package.json`
- `.github/workflows/ci.yml`
- New Firestore rules tests
- New API handler tests

**Tasks:**
- Add emulator-backed Firestore rules tests for user scoping, admin override, assignment access, deal portal inheritance, and append-only activity log behavior.
- Add API handler tests for auth validation, payload validation, and error paths.
- Wire new test scripts into CI without disturbing CRA Jest.

**Risks:**
- Emulator setup can be slow or brittle if over-scoped.
- Tests must characterize current production behavior before later hardening changes it.

**Acceptance criteria:**
- `npm run test:rules` passes.
- `npm run test:api` passes.
- CI runs both suites plus existing lint/test/build.

**Verification commands:**
- `npm run test:rules`
- `npm run test:api`
- `npm run lint`
- `npm run test:ci`
- `npm run build`

---

## Phase 3 - Observability

**Goal:** Make production regressions visible before riskier hardening and UI work lands.

**Primary files:**
- `src/components/ErrorBoundary.js`
- `src/reportWebVitals.js`
- API shared wrappers under `api/_lib/`
- `docs/ENVIRONMENT.md`

**Tasks:**
- Add Sentry client initialization gated by `REACT_APP_SENTRY_DSN`.
- Bridge the existing ErrorBoundary into Sentry.
- Add serverless error capture wrapper with flush-before-response behavior.
- Send web-vitals to Sentry.

**Risks:**
- DSN must be documented without exposing values.
- Error capture should not break production if the DSN is unset.

**Acceptance criteria:**
- Client errors, serverless errors, and web-vitals are observable when configured.
- App behavior is unchanged when Sentry config is absent.

**Verification commands:**
- `npm run lint`
- `npm run test:ci`
- `npm run build`
- Production Sentry smoke event check

---

## Phase 4 - Serverless Hardening

**Goal:** Validate API inputs and clarify the client/server trust boundary.

**Primary files:**
- `api/send-email.js`
- `api/accept-invite.js`
- `api/lead-intake.js`
- New `api/delete-media.js` if implemented
- `src/utils/cloudinary.js`
- `docs/TRUST_BOUNDARIES.md`

**Tasks:**
- Add schema validation for serverless payloads using a log-then-enforce rollout.
- Audit auth token verification across API functions.
- Implement or formally defer authenticated Cloudinary delete.
- Document trust boundaries and failure behavior.

**Risks:**
- Tight validation can reject live client payloads if introduced abruptly.
- Cloudinary Admin API requires secret configuration and must not be exposed to the browser.

**Acceptance criteria:**
- Malformed payloads get uniform 400s after enforcement.
- Live client payloads continue to succeed.
- Media delete behavior is real or explicitly deferred with rationale.

**Verification commands:**
- `npm run test:api`
- `npm run lint`
- `npm run test:ci`
- `npm run build`

---

## Phase 5 - Data Reliability & Infrastructure Headers

**Goal:** Ensure non-admin flows are reliable and begin infrastructure hardening.

**Primary files:**
- `firestore.indexes.json`
- `docs/FIRESTORE_INDEXES.md`
- `src/components/AnalyticsDashboard.js`
- `vercel.json`
- `api/csp-report.js`
- Build/deploy configuration

**Tasks:**
- Audit all non-admin `userId` scoped ordered queries.
- Create and document required composite indexes.
- Make analytics missing-index fallback report to observability.
- Add static asset cache headers and `index.html` no-cache behavior.
- Begin CSP Report-Only with an integration-tested allowlist.

**Risks:**
- Firestore indexes must be created in Firebase Console and reach READY before dependent code is considered complete.
- CSP Report-Only should be monitored before enforcement.

**Acceptance criteria:**
- Non-admin smoke flows complete without index errors.
- Required indexes are documented and READY.
- CSP Report-Only is live and collecting reports.

**Verification commands:**
- `npm run lint`
- `npm run test:ci`
- `npm run build`
- Non-admin production smoke test

---

## Phase 6 - Firestore Rules Hardening

**Goal:** Remove the rules admin email fallback safely.

**Primary files:**
- `firestore.rules`
- Firestore rules tests
- Access model documentation

**Tasks:**
- Verify production data has the admin role document set correctly.
- Add/update tests around admin access behavior.
- Publish additive/subtractive rules changes manually through Firebase Console.
- Smoke test admin and non-admin accounts after each publish.

**Risks:**
- Removing the fallback before verifying production data can lock out the admin.
- Git changes do not deploy rules automatically.

**Acceptance criteria:**
- Published rules no longer depend on the admin email fallback.
- Admin and non-admin smoke tests pass after each rules publish.

**Verification commands:**
- `npm run test:rules`
- `npm run lint`
- `npm run test:ci`
- `npm run build`
- Manual Firebase Console publish confirmation

---

## Phase 7 - UI/UX, Copy & Accessibility

**Goal:** Bring the app experience to enterprise SaaS polish while preserving the dark UI and green accent direction.

**Primary files:**
- `src/App.css`
- `src/components/PageState.js`
- `src/components/Loading.js`
- `src/components/ConfirmModal.js`
- Major page components under `src/components/`
- `docs/COPY_STANDARD.md`
- Error mapping utilities if added

**Tasks:**
- Write the copy standard before rewriting copy.
- Add designed empty, loading, pending, and error states.
- Migrate hardcoded colors to tokens before changing token values.
- Improve contrast, focus states, modal focus behavior, keyboard reachability, and non-color status cues.
- Add or enable jsx-a11y linting if feasible in scope.

**Risks:**
- Broad UI rewrites can break workflows.
- Token changes should be separated from token migration.

**Acceptance criteria:**
- Major surfaces feel intentional in empty/loading/error states.
- Text and focus contrast meet accessibility targets.
- Existing workflows remain intact on desktop and mobile.

**Verification commands:**
- `npm run lint`
- `npm run test:ci`
- `npm run build`
- Browser smoke tests on desktop and mobile widths

---

## Phase 8 - Landing Page, Trust & Final Polish

**Goal:** Make the product understandable and trustworthy to outside evaluators.

**Primary files:**
- `src/App.js`
- `src/components/PublicLandingPage.js`
- `src/components/LoginPage.js`
- `src/App.css`
- `public/index.html`
- `vercel.json`
- Final docs/changelog updates

**Tasks:**
- Add a public marketing landing page for signed-out visitors.
- Keep signed-in users landing directly in the app.
- Add accurate title/meta/OG tags.
- Publish a trust page describing actual controls.
- Keep CSP Report-Only until production reports and auth/media/document smoke tests prove the allowlist is complete; flip to enforced only after a clean soak.
- Run final intentionality and non-admin smoke pass.

**Risks:**
- Invite links, direct routes, and hard refresh behavior must keep working.
- Trust claims must reflect actual implemented controls, not aspirational compliance.

**Acceptance criteria:**
- Signed-out visitors understand REMS and can sign in.
- Signed-in routing, invite links, and role shells still work.
- CSP enforcement does not block auth, Firestore, Cloudinary, PDF preview, or app scripts.

**Verification commands:**
- `npm run lint`
- `npm run test:ci`
- `npm run test:api`
- `npm run check:constants`
- `npm run build`
- `npm run test:rules`
- `npm audit --audit-level=high`
- Full production smoke test across auth states and roles
