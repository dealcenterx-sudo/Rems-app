# REMS - SaaS Upgrade Changelog

This changelog records shipped SaaS professionalization work by phase. Each phase should include what changed, why it changed, files touched, commands run, command results, and remaining risks.

---

## Phase 1 - Audit, Repo Hygiene & Config Centralization (2026-07-07)

### What

- Started Phase 1 from Claude's WIP planning checkpoint.
- Confirmed the roadmap phase names are authoritative for the public upgrade plan.
- Added public documentation scaffolding for the audit, upgrade plan, changelog, and environment reference.
- Centralized the admin identity and role constants in client/server config files.
- Added `npm run check:constants` and wired it into CI.
- Updated application/API call sites to use config constants instead of scattered literals.
- Moved the server-side Firebase API key lookup to server config with an environment fallback.
- Gated detailed `/api/health` diagnostics behind an admin Firebase token while preserving a bare public status response.
- Removed obsolete `screenshot.js`.
- Removed ignored local source snapshot artifacts from the workspace.

### Why

Phase 1 creates the reviewer-facing source of truth before deeper SaaS hardening begins. The docs also give Claude Code a concise handoff target when limits reset.

### Files Modified

- `docs/SAAS_READINESS_AUDIT.md`
- `docs/SAAS_UPGRADE_PLAN.md`
- `docs/SAAS_UPGRADE_CHANGELOG.md`
- `docs/ENVIRONMENT.md`
- `src/config.js`
- `api/_lib/config.js`
- `scripts/check-constants.js`
- `.github/workflows/ci.yml`
- `package.json`
- `package-lock.json`
- `api/health.js`
- `api/send-email.js`
- `api/lead-intake.js`
- `src/firebase.js`
- `src/utils/helpers.js`
- `src/utils/permissions.test.js`
- `src/components/NewDealPage.js`
- `src/components/CRMMessagesPage.js`
- `src/components/DealsDashboard.js`
- `src/components/CRMEmailInboxPage.js`
- `screenshot.js`

### Commands Run

- `git branch --show-current`
- `git log --oneline -8`
- `git status --short --branch`
- `rg --files docs`
- `git show --stat --oneline --decorate --summary HEAD`
- `git show --name-status --oneline HEAD`
- `rg --files -g '*SAAS*' -g '*SaaS*' -g '*saas*'`
- `rg --files .planning`
- `sed -n ...` reads over planning, docs, CI, package, and codebase inventory files
- `git branch -vv`
- `git ls-files screenshot.js rems-project-source-2026-04-09 rems-project-source-2026-04-09.zip`
- `git status --ignored --short rems-project-source-2026-04-09 rems-project-source-2026-04-09.zip`
- `rg -n "<admin-email>|<firebase-web-api-key>|REACT_APP_DEV_BYPASS|REACT_APP_CRM_EMAIL_WEBHOOK_URL|process\\.env" src api firestore.rules .github vercel.json package.json`
- `npm run check:constants`
- `rm -rf rems-project-source-2026-04-09 rems-project-source-2026-04-09.zip`
- `git status --short --ignored rems-project-source-2026-04-09 rems-project-source-2026-04-09.zip screenshot.js`
- `npm run lint`
- `npm run test:ci`
- `npm run build`
- `npm audit --audit-level=high`
- `npm uninstall puppeteer`

### Results

- Branch confirmed: `saas-professionalization-upgrade`.
- Latest WIP commit confirmed: `3b64a6c wip: preserve Claude SaaS upgrade progress`.
- Working tree had no tracked diff at handoff; `AGENTS.md` was untracked.
- The three requested SaaS docs were missing before this phase started.
- Planning artifacts indicated Phase 1 was ready for planning/implementation, not completed.
- Source archive artifacts were ignored/untracked, not tracked in git.
- `screenshot.js` was confirmed tracked.
- `npm run check:constants` passed after config centralization.
- The only tracked code locations containing the admin identity literal are now `src/config.js`, `api/_lib/config.js`, and `firestore.rules`.
- `api/send-email.js` now reads `FIREBASE_API_KEY` through `api/_lib/config.js`.
- Unauthenticated or non-admin `/api/health` requests now receive only `{ "status": "ok" }`.
- Ignored source snapshot artifacts were removed from the local workspace.
- `screenshot.js` was removed from tracked source.
- `puppeteer` was removed from `devDependencies`; it was only used by the deleted screenshot script.
- **D-07 traffic check resolved (approved — no external consumers):** no external `/api/health` detail-parsing consumers were observed; the detailed diagnostics are now admin-gated; the gate is deployed and verified in production returning bare `{"status":"ok"}` (HTTP 200), so simple up/down monitors are unaffected. Recorded as an audit finding.
- **`REACT_APP_DEV_BYPASS` confirmed:** documented in `docs/ENVIRONMENT.md` as a security-relevant build-time client auth-gate bypass (`src/App.js`); user confirmed it is unset in production (Firestore rules enforce data access regardless).
- `npm run lint` passed.
- `npm run test:ci` passed: 3 suites, 29 tests.
- `npm run build` passed. CRA emitted a Node/toolchain deprecation warning for `fs.F_OK`, but compiled successfully.
- `npm audit --audit-level=high` initially failed in sandbox due npm registry DNS access, then completed with approved network access.
- `npm audit --audit-level=high` remains red after Puppeteer removal: 59 vulnerabilities reported (10 low, 24 moderate, 24 high, 1 critical). Remaining fixes are transitive and mostly tied to CRA/react-scripts or Firebase/Admin dependency chains; `npm audit fix --force` proposes breaking changes and was not run.

### Remaining Risks

- Firestore backup/export posture is unverified (recorded as an Open audit finding).
- Firebase web API key Google Cloud API restrictions are unverified (the key is a public identifier; restriction is a hardening recommendation, not a secret-exposure fix).
- Dependency audit debt remains and should be handled in a dedicated dependency/security phase rather than forced into this hygiene change.
- Phases 2–8 code shipped in bulk commit `dd6364a` still requires per-phase GSD verification before those findings move from "pending verification" to "Fixed."

---

## Phase 2 - Test Scaffolding (2026-07-07)

### What

- Added a separate Vitest API handler test suite under `tests/api/`.
- Added emulator-backed Firestore rules test scaffolding under `tests/rules/`.
- Added `firebase.json` emulator configuration pointing at the repo `firestore.rules` and `firestore.indexes.json`.
- Added `npm run test:api` and `npm run test:rules`.
- Wired both new suites into GitHub Actions CI.
- Added explicit CI Java 21 setup because current `firebase-tools` requires JDK 21+ for emulators.

### Why

Phase 2 creates characterization coverage before later phases harden serverless handlers and Firestore rules. This is especially important because Firestore rules deploy through Firebase Console manually, outside the normal Vercel code deployment path.

### Files Modified

- `package.json`
- `package-lock.json`
- `.github/workflows/ci.yml`
- `firebase.json`
- `tests/api/api-handlers.test.mjs`
- `tests/rules/firestore.rules.test.js`
- `docs/SAAS_READINESS_AUDIT.md`
- `docs/SAAS_UPGRADE_CHANGELOG.md`

### Commands Run

- `node -e "for (const p of ['@firebase/rules-unit-testing','firebase-tools','jest']) ..."`
- `npm install -D vitest@^4.1.10 @firebase/rules-unit-testing@^5.0.1 firebase-tools@^15.22.4 node-mocks-http@^1.17.2`
- `npm install -D vitest@^4.1.10 @firebase/rules-unit-testing@^5.0.1 firebase-tools@^15.22.4 node-mocks-http@^1.17.2 --cache .npm-cache`
- `npm run test:api`
- `npm run test:rules`
- `java -version`
- `/usr/libexec/java_home -V`
- `npm run check:constants`
- `npm run test:ci`
- `npm run lint`
- `npm run build`
- `rm -rf .npm-cache`
- `npm audit --audit-level=high`

### Results

- First dependency install failed because the home npm cache contained inaccessible files.
- Dependency install succeeded with a workspace-local npm cache; the temporary cache was removed afterward.
- npm warned that local Node is v24.13.0 while `package.json` declares `22.x`; this is an existing local/runtime mismatch and CI already uses Node 24.
- API tests passed: 1 file, 11 tests.
- CRA Jest still passed: 3 suites, 29 tests.
- `npm run check:constants` passed.
- `npm run lint` passed.
- `npm run build` passed. CRA emitted the existing Node/toolchain `fs.F_OK` deprecation warning, but compiled successfully.
- `npm run test:rules` did not run locally because the machine only has Java 8 and `firebase-tools` requires Java 21+.
- CI now installs Temurin Java 21 before running `npm run test:rules`.
- `npm audit --audit-level=high` remains red after adding test tooling: 61 vulnerabilities reported (10 low, 27 moderate, 23 high, 1 critical). Forced fixes would downgrade or break key tooling and were not run.

### Remaining Risks

- Firestore rules tests are written and wired but still need a successful run in an environment with JDK 21+.
- The rules suite is characterization coverage for the current rules file; it does not prove that the Firebase Console currently has the same rules published.
- Dependency audit debt from Phase 1 remains.

---

## Phase 3 - Observability (2026-07-07)

### What

- Installed Sentry client/server SDKs.
- Added client observability initialization gated by `REACT_APP_SENTRY_DSN`.
- Wired the existing React `ErrorBoundary` to capture render errors when Sentry is configured.
- Wired CRA web-vitals reporting into Sentry message capture when Sentry is configured.
- Added a serverless `withSentry` wrapper gated by `SENTRY_DSN` or `REACT_APP_SENTRY_DSN`.
- Wrapped existing API handlers with `withSentry` without changing their business logic.
- Documented Sentry environment variables in `docs/ENVIRONMENT.md`.

### Why

Phase 3 makes later regressions visible before serverless hardening, infrastructure headers, and UI polish. The implementation is fully env-gated so unset Sentry configuration keeps current runtime behavior unchanged.

### Files Modified

- `package.json`
- `package-lock.json`
- `src/utils/observability.js`
- `src/index.js`
- `src/components/ErrorBoundary.js`
- `api/_lib/withSentry.js`
- `api/send-email.js`
- `api/accept-invite.js`
- `api/lead-intake.js`
- `api/health.js`
- `docs/ENVIRONMENT.md`
- `docs/SAAS_READINESS_AUDIT.md`
- `docs/SAAS_UPGRADE_CHANGELOG.md`

### Commands Run

- `npm install @sentry/react@^10.63.0 @sentry/node@^10.63.0`
- `npm install @sentry/react@^10.63.0 @sentry/node@^10.63.0 --cache .npm-cache`
- `npm run test:api`
- `npm run check:constants`
- `npm run lint`
- `npm run test:ci`
- `npm run build`
- `npm audit --audit-level=high`
- `rm -rf .npm-cache`

### Results

- First Sentry install hit the known home npm cache permission problem.
- Sentry install succeeded with a workspace-local npm cache; the temporary cache was removed afterward.
- npm again warned that local Node is v24.13.0 while `package.json` declares `22.x`.
- API tests passed after wrapping handlers: 1 file, 11 tests.
- `npm run check:constants` passed.
- `npm run lint` passed.
- CRA Jest passed: 3 suites, 29 tests.
- `npm run build` passed. CRA emitted the existing `fs.F_OK` deprecation warning and the main bundle increased by about 29.9 kB gzip due to Sentry client code.
- `npm audit --audit-level=high` remains red: 61 vulnerabilities reported (10 low, 27 moderate, 23 high, 1 critical). Forced fixes remain breaking and were not run.

### Remaining Risks

- Real Sentry event delivery was not production-verified because DSNs are not configured in this workspace.
- Source-map upload is not implemented in Phase 3; production Sentry events may show minified stack frames until a later source-map step is added.
- Serverless capture only sees uncaught handler errors. Existing handlers still catch many expected provider/auth failures and return typed responses without reporting, which is intentional until Phase 4 validation/observability policy is defined.
- Dependency audit debt remains.

---

## Phase 4 - Serverless Hardening (2026-07-07)

### What

- Installed `zod` for serverless request-body validation.
- Added a shared API validation helper with uniform 400 responses.
- Added schemas for email send, invite acceptance, lead intake, and media delete requests.
- Added authenticated `api/delete-media.js` for Cloudinary Admin API deletes.
- Replaced the browser-side Cloudinary delete placeholder with an ID-token-authenticated serverless call.
- Wired property, document, and deal-document delete flows to delete Cloudinary media when a `publicId` is present.
- Started storing `publicId` and `resourceType` for newly uploaded deal documents.
- Documented client/server/data trust boundaries and Cloudinary failure behavior.
- Updated API handler tests for validation responses and Cloudinary delete behavior.
- Updated environment documentation with Cloudinary Admin API variables.

### Why

Phase 4 closes the main serverless input and media-lifecycle gaps before infrastructure headers, rules hardening, and UI polish. The Cloudinary Admin API secret stays server-side, while malformed API requests now fail consistently.

### Files Modified

- `package.json`
- `package-lock.json`
- `api/_lib/config.js`
- `api/_lib/validate.js`
- `api/send-email.js`
- `api/accept-invite.js`
- `api/lead-intake.js`
- `api/delete-media.js`
- `src/utils/cloudinary.js`
- `src/components/PropertiesPage.js`
- `src/components/DocumentsPage.js`
- `src/components/DealDocumentsTab.js`
- `tests/api/api-handlers.test.mjs`
- `docs/ENVIRONMENT.md`
- `docs/TRUST_BOUNDARIES.md`
- `docs/SAAS_READINESS_AUDIT.md`
- `docs/SAAS_UPGRADE_PLAN.md`
- `docs/SAAS_UPGRADE_CHANGELOG.md`

### Commands Run

- `npm install zod@^4.4.3 --cache .npm-cache`
- `npm run test:api`
- `npm run check:constants`
- `npm run lint`
- `npm run test:ci`
- `npm run test:rules`
- `npm run build`
- `npm audit --audit-level=high`
- `rm -rf .npm-cache`
- `git status --short`
- `rg -n "CLOUDINARY_CLOUD_NAME|rems_unsigned|dcirl3j3v" src api docs package.json`

### Results

- `zod` install succeeded with the workspace-local npm cache because the home npm cache still has permission issues.
- API tests passed after schema tuning: 1 file, 15 tests.
- `npm run check:constants` passed.
- `npm run lint` passed.
- CRA Jest passed: 3 suites, 29 tests.
- `npm run build` passed. CRA emitted the existing `fs.F_OK` deprecation warning, but compiled successfully.
- `npm run test:rules` remains blocked locally because `firebase-tools` requires Java 21+ and this machine has an older Java runtime. CI is already configured to install Temurin Java 21 before running the rules suite.
- `npm audit --audit-level=high` remains red: 61 vulnerabilities reported (10 low, 27 moderate, 23 high, 1 critical). Forced fixes would introduce breaking dependency/tooling changes and were not run in Phase 4.
- The temporary `.npm-cache` directory was removed after installation.
- Cloudinary cloud-name literals remain limited to config/documentation locations, not component implementations.

### Remaining Risks

- Cloudinary deletes require `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in Vercel runtime env before the endpoint can operate in production.
- Existing Cloudinary-backed records without `publicId` cannot be deleted from Cloudinary by the app; they still delete from Firestore as before.
- The new media-delete endpoint has not been smoke-tested against production Cloudinary credentials.
- Live client payload compatibility should be watched after deployment because validation is now enforced.
- Firestore rules tests still need a successful Java 21 run locally or in CI.
- Dependency audit debt remains outside the Phase 4 scope.

---

## Phase 5 - Data Reliability & Infrastructure Headers (2026-07-07)

### What

- Audited current `userId`-scoped and filtered ordered Firestore queries.
- Expanded `firestore.indexes.json` for non-admin deals, properties, leads, contacts, documents, tasks, and deal portal ordered queries.
- Added `docs/FIRESTORE_INDEXES.md` with operator-facing index requirements and smoke-test surfaces.
- Reported Analytics Dashboard missing-index fallback to Sentry when client observability is configured.
- Added Vercel cache headers for `index.html`, `/`, static build assets, and the checked-in PDF worker.
- Added CSP Report-Only, reporting headers, and an unauthenticated `api/csp-report.js` receiver.
- Added API test coverage for the CSP report endpoint.

### Why

Phase 5 makes non-admin query behavior less fragile and starts infrastructure hardening without enforcing CSP yet. The headers are intentionally conservative: static assets can cache aggressively, app HTML stays fresh, and CSP violations are reported before any production blocking policy is attempted.

### Files Modified

- `firestore.indexes.json`
- `docs/FIRESTORE_INDEXES.md`
- `docs/SAAS_READINESS_AUDIT.md`
- `docs/SAAS_UPGRADE_PLAN.md`
- `docs/SAAS_UPGRADE_CHANGELOG.md`
- `src/components/AnalyticsDashboard.js`
- `api/_lib/withSentry.js`
- `api/csp-report.js`
- `tests/api/api-handlers.test.mjs`
- `vercel.json`

### Commands Run

- `sed -n ...` reads over Firestore indexes, Vercel headers, Analytics Dashboard, query surfaces, and docs.
- `rg -n "where\\([^\\n]*(userId|assigned|createdBy|ownerId)|orderBy\\(" src api tests firestore.indexes.json`
- `rg -n "where\\('dealId'|where\\(\"dealId\"|orderBy\\('createdAt'|orderBy\\(\"createdAt\"" src/components`
- `npm run test:api`
- `node -e "JSON.parse(require('fs').readFileSync('firestore.indexes.json','utf8')); console.log('firestore.indexes.json OK')"`
- `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('vercel.json OK')"`
- `npm run check:constants`
- `npm run lint`
- `npm run test:ci`
- `npm run build`
- `npm run test:rules`
- `npm audit --audit-level=high`

### Results

- API tests passed: 1 file, 16 tests.
- `firestore.indexes.json` parsed successfully.
- `vercel.json` parsed successfully.
- `npm run check:constants` passed.
- `npm run lint` passed.
- CRA Jest passed: 3 suites, 29 tests.
- `npm run build` passed. CRA emitted the existing `fs.F_OK` deprecation warning, but compiled successfully.
- `npm run test:rules` remains blocked locally because `firebase-tools` requires Java 21+ and this machine has an older Java runtime. CI is already configured to install Temurin Java 21 before running the rules suite.
- `npm audit --audit-level=high` remains red: 61 vulnerabilities reported (10 low, 27 moderate, 23 high, 1 critical). Forced fixes would introduce breaking dependency/tooling changes and were not run in Phase 5.

### Remaining Risks

- Firestore composite indexes in `firestore.indexes.json` still need to be created or verified as READY in Firebase production before non-admin smoke testing is considered complete.
- CSP is Report-Only and should be monitored before Phase 8 considers enforcement.
- CSP reports are captured by the new endpoint; Sentry forwarding depends on `SENTRY_DSN` being configured.
- Header behavior was validated by config/build checks, not by a deployed Vercel smoke test.
- Dependency audit debt remains outside the Phase 5 scope.

---

## Phase 6 - Firestore Rules Hardening (2026-07-07)

### What

- Removed the Firestore rules admin email fallback.
- Updated `isAdmin()` in `firestore.rules` to grant admin access only from `users/{uid}.role == "admin"`.
- Added a rules regression test that an account using the admin email (`ADMIN_EMAIL`) without an admin role document does not receive admin access.
- Updated config comments and docs that previously described the rules email fallback.
- Recorded that production admin role data was confirmed by the user before making the rules change.

### Why

Phase 6 moves Firestore enforcement to durable role-document authorization. Email addresses remain useful for operator workflows and UI defaults, but Firestore data access should not depend on a hardcoded email fallback once production has the admin role document.

### Files Modified

- `firestore.rules`
- `tests/rules/firestore.rules.test.js`
- `src/config.js`
- `api/_lib/config.js`
- `docs/DATABASE_SCHEMA.md`
- `docs/SAAS_READINESS_AUDIT.md`
- `docs/SAAS_UPGRADE_CHANGELOG.md`

### Commands Run

- `sed -n ...` reads over `firestore.rules`, Firestore rules tests, Phase 6 plan, and schema docs.
- `rg -n "dealcenterx|ADMIN_EMAIL|admin email|isAdmin|role.*admin|request\\.auth\\.token\\.email" firestore.rules tests/rules docs src api`
- `rg -n "firestore\\.rules.*ADMIN_EMAIL|manually synced|admin email fallback|request\\.auth\\.token\\.email|<admin-email>|Admin can read all data" firestore.rules docs src/config.js api/_lib/config.js tests/rules` (admin-email literal redacted here to keep docs greppable-clean)
- `npm run test:rules`
- `npm run check:constants`
- `npm run test:api`
- `npm run lint`
- `npm run test:ci`
- `npm run build`
- `npm audit --audit-level=high`

### Results

- Production admin role document was confirmed by the user before removing the fallback.
- Firestore rules no longer reference `request.auth.token.email` or the admin email literal.
- The admin email literal remains only in the central config files and a rules regression test that proves email alone is insufficient.
- `npm run check:constants` passed.
- API tests passed: 1 file, 16 tests.
- `npm run lint` passed.
- CRA Jest passed: 3 suites, 29 tests.
- `npm run build` passed. CRA emitted the existing `fs.F_OK` deprecation warning, but compiled successfully.
- `npm run test:rules` remains blocked locally because `firebase-tools` requires Java 21+ and this machine has an older Java runtime. CI is already configured to install Temurin Java 21 before running the rules suite.
- `npm audit --audit-level=high` remains red: 61 vulnerabilities reported (10 low, 27 moderate, 23 high, 1 critical). Forced fixes would introduce breaking dependency/tooling changes and were not run in Phase 6.

### Remaining Risks

- `firestore.rules` changes are not live until the user publishes the updated rules in Firebase Console.
- Admin and non-admin smoke tests must be run after manual Firebase rules publish.
- Local rules tests still need Java 21+ or CI to verify the updated rules suite.
- Client UI still uses `ADMIN_EMAIL` in some legacy admin-display/scoping helpers; Firestore enforcement no longer trusts email alone.
- Dependency audit debt remains outside the Phase 6 scope.

---

## Phase 7 - UI/UX, Copy & Accessibility (2026-07-07)

### What

- Added a product copy standard before rewriting user-facing copy.
- Added a reusable `PageState` component for empty, warning, success, and error states.
- Added shared `page-state`, `status-banner`, and `sr-only` styles in the existing dark UI language.
- Added an `AlertCircle` icon to the local icon set.
- Updated the global `ErrorBoundary` to use the shared error state.
- Added semantic loading status behavior to `LoadingOverlay` and tokenized the default spinner accent.
- Updated Deal Portal loading, no-selection, not-found, and load-error states.
- Added basic tab semantics to Deal Portal section navigation.
- Standardized empty/no-results states on Active Deals, Contacts, Properties, and Documents.
- Changed the Analytics fallback message from internal-mode language to user-facing operational copy.
- Improved `ConfirmModal` semantics with dialog roles, labels, descriptions, and safe default focus on Cancel.

### Why

Phase 7 starts SaaS polish with reusable patterns instead of scattered one-off UI. The pass improves copy consistency, screen-reader semantics, keyboard safety around destructive confirms, and visible empty/error states while preserving the current dark visual direction.

### Files Modified

- `docs/COPY_STANDARD.md`
- `src/App.css`
- `src/components/PageState.js`
- `src/components/Loading.js`
- `src/components/ErrorBoundary.js`
- `src/components/DealPortalPage.js`
- `src/components/ConfirmModal.js`
- `src/components/Icons.js`
- `src/components/AnalyticsDashboard.js`
- `src/components/ActiveDealsPage.js`
- `src/components/ContactsPage.js`
- `src/components/PropertiesPage.js`
- `src/components/DocumentsPage.js`
- `docs/SAAS_READINESS_AUDIT.md`
- `docs/SAAS_UPGRADE_PLAN.md`
- `docs/SAAS_UPGRADE_CHANGELOG.md`

### Commands Run

- `sed -n ...` reads over the Phase 7 plan, global CSS, loading/error components, deal portal, modal, and selected list-page empty states.
- `rg -n "empty|loading|error|No |Failed|Nothing|spinner|focus|button|input|select|textarea|card-surface|btn-" src/App.css src/components`
- `rg -n "empty-state-card|className=\"empty-state\"|No .*yet|No .*found|Nothing to" src/components`
- `npm run lint`
- `npm run test:ci`
- `npm run build`
- `npm start`
- `curl -I http://localhost:3000`
- `npm audit --audit-level=high`
- `npm run check:constants`

### Results

- `npm run lint` passed.
- CRA Jest passed: 3 suites, 29 tests.
- `npm run build` passed. CRA emitted the existing `fs.F_OK` deprecation warning, but compiled successfully.
- First `npm start` attempt failed inside the sandbox with `listen EPERM: operation not permitted 0.0.0.0`; rerun with approved local server permissions succeeded.
- Local dev server compiled successfully at `http://localhost:3000`.
- `curl -I http://localhost:3000` returned `HTTP/1.1 200 OK` when run with approved local network permissions.
- Dev server was stopped after the smoke check.
- `npm run check:constants` passed.
- `npm audit --audit-level=high` remains red: 61 vulnerabilities reported (10 low, 27 moderate, 23 high, 1 critical). Forced fixes would introduce breaking dependency/tooling changes and were not run in Phase 7.

### Remaining Risks

- This was a focused Phase 7 pass, not a full visual review of every CRM/detail workflow.
- JSX a11y linting was not added in this pass; adding it may require a separate lint config upgrade and warning triage.
- Some legacy inline styles and hardcoded colors remain; the new shared state styles provide a path for incremental migration.
- Browser smoke was limited to compile and HTTP response, not a full click-through across desktop/mobile widths.
- Dependency audit debt remains outside the Phase 7 scope.

---

## Phase 8 - Landing Page, Trust & Final Polish (2026-07-07)

### What

- Added a signed-out public REMS landing page while preserving the authenticated app shell for signed-in users.
- Added a public trust view at the signed-out surface using the existing `?public=trust` query-state pattern instead of introducing router changes.
- Embedded the existing login card in the public page without changing the authentication logic.
- Preserved invite-link behavior by surfacing invite context before sign-in and leaving authenticated invite acceptance in the existing app flow.
- Added accurate title, description, Open Graph, and Twitter metadata.
- Extended the CSP Report-Only allowlist for the public landing image and font endpoints needed by the current app surface.
- Kept CSP in Report-Only instead of enforcing it because production report soak and auth/media/document smoke tests are still pending.
- Attempted visual browser verification; local Playwright could not run because the browser binary is not installed in this workspace.

### Why

Phase 8 makes REMS understandable to outside evaluators before login without weakening authenticated workflows. The trust page describes controls already implemented in earlier phases rather than making aspirational compliance claims.

### Files Modified

- `src/components/PublicLandingPage.js`
- `src/components/LoginPage.js`
- `src/App.js`
- `src/App.css`
- `src/components/Loading.js`
- `public/index.html`
- `vercel.json`
- `docs/SAAS_READINESS_AUDIT.md`
- `docs/SAAS_UPGRADE_PLAN.md`
- `docs/SAAS_UPGRADE_CHANGELOG.md`

### Commands Run

- `sed -n ...` reads over the Phase 8 plan, app shell, login component, global CSS, public HTML metadata, Vercel headers, and SaaS docs.
- `npm run lint`
- `npm run test:ci`
- `npm run build`
- `npm run check:constants`
- `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('vercel.json OK')"`
- `npm run test:api`
- `npm run test:rules`
- `npm start`
- `curl -I http://localhost:3000`
- Node/Playwright launch attempt through the local Node REPL
- `npm audit --audit-level=high`
- `git status --short`
- `git diff --stat`

### Results

- `npm run lint` passed.
- CRA Jest passed: 3 suites, 29 tests.
- `npm run build` passed. CRA emitted the existing `fs.F_OK` deprecation warning, but compiled successfully.
- Build size changed by about +1.71 kB gzip for the main bundle and +1.09 kB gzip for CSS after the public landing surface.
- `npm run check:constants` passed.
- `vercel.json` parsed successfully.
- API tests passed: 1 file, 16 tests.
- Local dev server compiled successfully at `http://localhost:3000`.
- `curl -I http://localhost:3000` returned `HTTP/1.1 200 OK`.
- Playwright browser verification could not run because the Chromium binary was missing from the local Playwright cache; no browser install was performed.
- `npm run test:rules` remains blocked locally because `firebase-tools` requires Java 21+ and this machine has an older Java runtime. CI is configured to install Temurin Java 21 before running the rules suite.
- `npm audit --audit-level=high` remains red: 61 vulnerabilities reported (10 low, 27 moderate, 23 high, 1 critical). Forced fixes would introduce breaking dependency/tooling changes and were not run in Phase 8.

### Remaining Risks

- Full production smoke is still required across signed-out landing, login, invite links, admin, agent, buyer/seller shells, uploads, PDF/document previews, and Cloudinary media deletion.
- CSP remains Report-Only until production violation reports prove the allowlist is safe to enforce.
- Firestore rules changes from Phase 6 are not live until manually published in Firebase Console, followed by admin and non-admin smoke tests.
- Firestore composite indexes from Phase 5 must be created or verified READY in Firebase before non-admin query smoke is considered complete.
- Cloudinary delete requires Vercel runtime env vars and a production smoke after the user's credential rotation/configuration step.
- Sentry client/server capture requires configured DSNs and a production smoke event.
- Local rules tests still need Java 21+ or CI to verify the emulator suite.
- Dependency audit debt remains and should be handled in a dedicated dependency/security modernization phase.
