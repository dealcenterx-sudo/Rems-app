# Roadmap: REMS — SaaS Professionalization Upgrade

## Overview

Upgrade a live, auto-deploying real estate CRM from "functional app" to professional-grade B2B SaaS without breaking production. The journey runs invisible-foundations-first: audit + repo hygiene + config centralization, then characterization tests for the two riskiest change surfaces (Firestore rules, serverless handlers), then production observability. With the safety net in place, hardening lands in dependency order — serverless validation, composite indexes + infrastructure headers (CSP Report-Only soak begins), then the CI-invisible rules change (admin email fallback removal). Visible work comes last atop the net: full UI/copy/accessibility polish, then the public landing page with honest trust content, CSP enforcement, and a final intentionality pass. Every phase merges to `main` (a production deploy) and is smoke-tested as a non-admin account. The user's 8 named phases from the brief map onto this execution order via `docs/SAAS_UPGRADE_PLAN.md` (written in Phase 1).

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Audit, Repo Hygiene & Config Centralization** - Audit deliverables in docs/, archive/diagnostics cleanup, admin email + constants centralized with CI grep proof (completed 2026-07-07)
- [x] **Phase 2: Test Scaffolding** - Emulator-backed Firestore rules tests and API handler tests wired into CI, outside CRA's Jest (completed 2026-07-13)
- [x] **Phase 3: Observability** - Sentry client + serverless error capture and web-vitals — verified live in production: client error + web-vitals confirmed landing in Sentry on deploy dpl_PR1UNkDrWVdWn4ZmNeveopTqCgG1; serverless uncaught-throw path armed + unit-verified (verified-by-inference) (completed 2026-07-13)
- [x] **Phase 4: Serverless Hardening** - Zod validation, auth audit, documented trust boundaries, Cloudinary delete — fully verified: code-wiring via test:api 41 / test:ci 42, and real Cloudinary deletion + validation soak confirmed live in production. (Handled-500s Sentry gap routed to Phase 5 / DATA-02.) (completed 2026-07-13)
- [ ] **Phase 5: Data Reliability & Infrastructure Headers** - Composite indexes READY, loud fallbacks, cache headers, CSP Report-Only soak begins
- [x] **Phase 6: Firestore Rules Hardening** - Admin email fallback removed via additive-then-subtractive Console publishes with two-account smoke tests (completed 2026-07-13)
- [ ] **Phase 7: UI/UX, Copy & Accessibility** - Copy standard + sweep, empty states, skeletons, SWR KPIs, pending states, token-level a11y
- [ ] **Phase 8: Landing Page, Trust & Final Polish** - Public marketing page with real screenshots, trust page, CSP enforced, final intentionality pass

## Phase Details

### Phase 1: Audit, Repo Hygiene & Config Centralization

**Goal**: A reviewer can read a complete audit and 8-phase plan, and the repo has a clean, centralized foundation (no stray archives, no exposed diagnostics, one source of truth for admin email and constants) that every later phase builds on
**Depends on**: Nothing (first phase)
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, HYG-01, HYG-02, HYG-03, HYG-04, HYG-05
**Success Criteria** (what must be TRUE):

  1. Reviewer can read `docs/SAAS_READINESS_AUDIT.md` (exec summary, weaknesses by area, risk-ranked findings Critical→Low, roadmap, safe execution plan, Definition of Done) and `docs/SAAS_UPGRADE_PLAN.md` mapping the brief's 8 named phases onto this roadmap's execution order with goal/files/tasks/risks/acceptance criteria/verification commands per phase
  2. `docs/SAAS_UPGRADE_CHANGELOG.md` exists and records Phase 1's changes; every required environment variable is documented by name (never value) with its purpose and where it's consumed
  3. Repo no longer contains `rems-project-source-2026-04-09/` or its `.zip` (plain `git rm`, no history rewrite), and `screenshot.js` lives in `scripts/` with parameterized paths (or is removed as obsolete)
  4. An unauthenticated call to `api/health.js` learns nothing about env/infra — an admin auth token is required
  5. A CI grep check proves the admin email literal appears only in `src/config.js`, `api/_lib/config.js`, and `firestore.rules` (manually synced), and `api/send-email.js` reads its Firebase API key from an environment variable

**Plans**: 3/3 plans complete
**Wave 1**

- [x] 01-01-PLAN.md — Config centralization (admin email + roles single-sourced) + Firebase API-key env-var move + CI grep proof (HYG-04, HYG-05)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Repo hygiene (archive + screenshot.js removal, puppeteer uninstall) + api/health.js auth-gating with D-07 traffic-check (HYG-01, HYG-02, HYG-03)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Audit, upgrade plan, changelog, and environment docs recording finished Phase 1 state (AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04)

### Phase 2: Test Scaffolding

**Goal**: The two riskiest change surfaces — Firestore rules (deployed by manual Console paste, invisible to CI) and serverless handlers — are covered by characterization tests of current behavior before any phase changes them
**Depends on**: Phase 1
**Requirements**: TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):

  1. Developer can run `npm run test:rules` and see passing emulator-backed tests covering userId scoping, admin override, assignedProperties/assignedDeals access, deal-portal `canAccessDeal()` inheritance, and activity_log append-only behavior
  2. Developer can run `npm run test:api` and see passing handler tests covering auth validation, payload validation, and error paths for send-email, accept-invite, and lead-intake
  3. CI runs both new suites alongside the existing lint → test → build pipeline, and `npm run test:ci` (CRA's Jest) behaves exactly as before

**Plans**: 3/3 plans complete

**Wave 1** *(parallel — no shared files)*

- [x] 02-01-PLAN.md — Reconcile + verify the API handler suite; deepen with 200-success, missing-token/404, and method-guard characterizations (TEST-02)
- [x] 02-02-PLAN.md — Reconcile + verify the Firestore rules suite; add users-block role/assignment immutability (SEC-04 net) and all-six deal-portal coverage (TEST-01)

**Wave 2** *(blocked on Wave 1)*

- [x] 02-03-PLAN.md — Verify CI wiring + CRA-Jest isolation and document Java 21 / npm ci run prerequisites in docs/TESTING.md (TEST-03)

### Phase 3: Observability

**Goal**: Every production regression from later phases is visible immediately — client errors, serverless errors, and performance metrics all flow to Sentry
**Depends on**: Phase 1
**Requirements**: OBS-01, OBS-02, OBS-03
**Success Criteria** (what must be TRUE):

  1. A deliberately triggered production client error appears in Sentry, with init gated on `REACT_APP_SENTRY_DSN` and the existing ErrorBoundary bridged to Sentry
  2. A serverless function error appears in Sentry via the `withSentry` wrapper, which flushes before responding
  3. Web-vitals metrics from the production app are visible in Sentry via the existing `web-vitals` dependency

**Plans**: 3/3 plans complete

**Wave 1** *(parallel — no shared files)*

- [x] 03-01-PLAN.md — Client observability tests: DSN gating + captureError + captureWebVital (observability.test.js) and the ErrorBoundary→captureException bridge (ErrorBoundary.test.js) (OBS-01, OBS-03)
- [x] 03-02-PLAN.md — Serverless withSentry wrapper test: no-DSN pass-through + capture-then-flush-before-respond on an uncaught throw; log the handled-500s OBS-02 gap as a finding routed to Phase 5 (OBS-02)

**Wave 2** *(blocked on Wave 1)*

- [x] 03-03-PLAN.md — Event-landing human-verify checkpoints (client error, uncaught serverless throw, web-vitals appear in Sentry post-deploy with a live DSN) + Phase 3 changelog entry (OBS-01, OBS-02, OBS-03)

### Phase 4: Serverless Hardening

**Goal**: Every serverless endpoint validates its input server-side, the client/server trust boundary is documented, and user-deleted media is actually deleted — with live clients never breaking during rollout
**Depends on**: Phase 1, Phase 2, Phase 3
**Requirements**: SEC-01, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):

  1. Malformed payloads to send-email, accept-invite, and lead-intake receive uniform zod-derived 400 responses, while every payload the live client actually sends still succeeds (verified via log-then-enforce rollout with Sentry watching)
  2. A reviewer can read documented trust boundaries, and auth-token verification is audited and confirmed across all endpoints
  3. Deleting media in the app removes the asset from Cloudinary via an auth-verified `api/delete-media.js` (signed Admin API call) — or the audit documents an explicit, reasoned deferral

**Plans**: 3/3 plans complete

**Wave 1** *(parallel — no shared files)*

- [x] 04-01-PLAN.md — SEC-01 accept-path schema tests (live-client payloads pass) + SEC-03 delete-media not-found-200/provider-502 deltas (SEC-01, SEC-03)
- [x] 04-02-PLAN.md — SEC-02 csp-report.js row + rationale in TRUST_BOUNDARIES.md + auth-audit completeness test (SEC-02)

**Wave 2** *(blocked on Wave 1)*

- [x] 04-03-PLAN.md — Human-verify external halves (real Cloudinary delete; Sentry-watched validation soak deferred) + Phase 4 changelog (SEC-01, SEC-02, SEC-03)

### Phase 5: Data Reliability & Infrastructure Headers

**Goal**: Non-admin accounts complete every major flow without index errors or silent degradation, static assets cache correctly, and the CSP Report-Only soak begins as early as possible
**Depends on**: Phase 3
**Requirements**: DATA-01, DATA-02, DATA-03, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):

  1. Every non-admin `where('userId') + orderBy` query has a composite index created, verified READY in the Firebase Console, and documented in `firestore.indexes.json` — before any dependent code merges
  2. The AnalyticsDashboard missing-index fallback reports a Sentry event when triggered (loud, not silent)
  3. A non-admin test account completes Home, Deals, CRM, Properties, Tasks, and Analytics with no index errors and no silent fallbacks
  4. Static assets serve with `Cache-Control: immutable`, `index.html` serves `no-cache`, and `INLINE_RUNTIME_CHUNK=false` is set (closing the stale-chunk trap and the `'unsafe-inline'` script-src need)
  5. A `Content-Security-Policy-Report-Only` header is live in `vercel.json` with an integration-checklist allowlist, and violation reports are being collected (groundwork for INFRA-01, which completes with enforcement in Phase 8)

**Plans**: 2/4 plans executed

**Wave 1** *(parallel — disjoint files; reconcile-and-verify local halves)*

- [x] 05-01-PLAN.md — DATA local: net-new AnalyticsDashboard fallback→captureError test + DATA-01 index-coverage reconcile (DATA-01, DATA-02)
- [x] 05-02-PLAN.md — INFRA local: INLINE_RUNTIME_CHUNK=false via package.json build script + CSP Report-Only allowlist additions + INFRA-02 cache-header reconcile (INFRA-02, INFRA-03)

**Wave 2** *(blocked on Wave 1; autonomous:false — LIVE)*

- [ ] 05-03-PLAN.md — Live human-verify: indexes READY in Console + non-admin all-flow smoke + cache/no-inline-runtime/CSP-report-collection (DATA-01, DATA-02, DATA-03, INFRA-02, INFRA-03)

**Wave 3** *(blocked on Waves 1–2)*

- [ ] 05-04-PLAN.md — Phase 5 changelog entry recording automatable results + live-half statuses (AUDIT-03 standing task)

### Phase 6: Firestore Rules Hardening

**Goal**: Firestore rules enforce admin access by role document, not hardcoded email — removed safely on a live app via verified data, green rules tests, and staged Console publishes
**Depends on**: Phase 1, Phase 2
**Requirements**: SEC-04, SEC-05
**Success Criteria** (what must be TRUE):

  1. Production data is verified to show `users/{adminUid}.role == 'admin'` BEFORE any rules change (the lockout gate)
  2. The published `firestore.rules` no longer contain the admin email fallback, removed via additive-then-subtractive Console publishes (pbcopy offered), with rules tests green before and after each publish
  3. After each publish, both an admin and a non-admin account complete a production smoke test with no access regressions
  4. A reviewer can read documented Firestore access-model assumptions (who can read/write what, and why) that match the tested rules

**Plans**: 3/3 plans complete

**Wave 1** *(parallel — disjoint files)*

- [x] 06-01-PLAN.md — Remove the match /{document=**} admin write catch-all from firestore.rules + flip the activity_log characterization test to assert append-only against admin (emulator 15/15 green) (SEC-04)
- [x] 06-02-PLAN.md — Extend docs/TRUST_BOUNDARIES.md with a per-collection Firestore access matrix matching the tested rules (SEC-05)

**Wave 2** *(blocked on Wave 1; autonomous:false — LIVE)*

- [x] 06-03-PLAN.md — Lockout gate (verify prod users/{adminUid}.role) → staged Console publish (pbcopy, additive-then-subtractive) → two-account production smoke → Phase 6 changelog (SEC-04)

### Phase 7: UI/UX, Copy & Accessibility

**Goal**: Every surface of the app feels like enterprise SaaS — designed empty/loading/pending states, professional copy following a written standard, and WCAG 2.2 AA accessibility fixed at the design-token level — preserving the dark + #00ff88 brand
**Depends on**: Phase 3, Phase 5
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, COPY-01, COPY-02, COPY-03, A11Y-01, A11Y-02, A11Y-03
**Success Criteria** (what must be TRUE):

  1. A one-page copy standard exists BEFORE the sweep, and afterward all dashboard labels, form helper text, empty states, and confirmations follow it — destructive-action copy verified against actual handler behavior, and Firebase/API error codes mapped to human messages with recovery actions
  2. Every list/dashboard surface (~10+, including the buyer/seller client shell) shows a designed empty state with first-use and no-results variants that guide the next action
  3. Loads over ~500ms show skeleton loaders mirroring final layout with no layout shift; Home KPIs render instantly from cache and refresh in the background (SWR); every submit/destructive button shows a pending state; task/status toggles respond optimistically with rollback on failure
  4. Hardcoded hex values are migrated to `:root` design tokens BEFORE any token values change (two separate passes), then text contrast meets WCAG 2.2 AA (4.5:1) and the #00ff88 focus ring (3:1) is fixed at the token level so it propagates everywhere
  5. All modals trap focus and close on Escape, interactive elements are keyboard-reachable with semantic HTML on major pages, meaning is never conveyed by color alone, and `plugin:jsx-a11y/recommended` passes in lint

**Plans**: 6/12 plans executed
**UI hint**: yes

**Wave 1** *(parallel — disjoint files)*

- [x] 07-01-PLAN.md — Copy standard + central error map (leak-safe) (COPY-01, COPY-02)
- [x] 07-02-PLAN.md — Token Pass-1 scaffold: byte-identical :root token additions (UI-05)

**Wave 2** *(parallel — new files vs page files)*

- [x] 07-03-PLAN.md — Reusable primitives: Skeleton + useDelayedFlag + useFocusTrap (UI-02, A11Y-02)
- [x] 07-04-PLAN.md — Empty & error states across list/dashboard surfaces incl. client shell (UI-01, COPY-03)

**Wave 3** *(parallel — shared components vs page files)*

- [x] 07-05-PLAN.md — LoadingButton pending + ConfirmModal focus-trap + Toast error composition (UI-04, COPY-03, A11Y-02)
- [x] 07-06-PLAN.md — Delayed skeleton wiring + Home silent SWR (UI-02, UI-03)

**Wave 4**

- [ ] 07-07-PLAN.md — Optimistic toggles + rollback + pending-button adoption (UI-04, UI-06)

**Wave 5** *(parallel — disjoint a11y file clusters)*

- [ ] 07-08-PLAN.md — jsx-a11y fixes cluster A (heaviest files) + never-color-alone (A11Y-02)
- [ ] 07-09-PLAN.md — jsx-a11y fixes cluster B (deal portal + secondary pages + stragglers) (A11Y-02)

**Wave 6** *(parallel — disjoint hex file clusters)*

- [ ] 07-10-PLAN.md — Token Pass-1 component sweep cluster A (byte-identical) (UI-05)
- [ ] 07-11-PLAN.md — Token Pass-1 component sweep cluster B + straggler grep (UI-05)

**Wave 7**

- [ ] 07-12-PLAN.md — Token Pass-2 contrast + brand-green focus ring + atomic jsx-a11y flip + changelog (UI-05, A11Y-01, A11Y-03)

### Phase 8: Landing Page, Trust & Final Polish

**Goal**: An outside evaluator — investor, customer, recruiter, or technical reviewer — encounters a product that explains itself, proves its security claims, and holds up to scrutiny on every page
**Depends on**: Phase 5, Phase 6, Phase 7
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, INFRA-01, TEST-04, POLISH-01
**Success Criteria** (what must be TRUE):

  1. An unauthenticated visitor at the root sees a marketing page (outcome hero, audience, workflow-framed features lead→deal→close, real screenshots of the polished app, footer) with a sign-in CTA; signed-in users land directly in the app; `public/index.html` carries proper title/meta/OG tags for link sharing
  2. A "How REMS protects your data" trust page describes actual controls (Firebase auth, rules-enforced isolation, append-only audit log, encryption in transit/at rest) — published only now that the hardening chain (Phases 4–6) has landed
  3. Invite deep links, direct URLs, and hard refreshes keep working for every role × auth-state combination after the landing page ships
  4. The CSP flips from Report-Only to enforced in its own deploy, after a clean soak (Phase 5 onward) and a clean 5-action smoke test (Google popup sign-in, email sign-in, live Firestore view, Cloudinary upload, PDF preview)
  5. Every major page passes a final intentionality review against the brief's acceptance criteria with a non-admin account smoke test, and lint/test/build status is known, passing, and documented

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Audit, Repo Hygiene & Config Centralization | 3/3 | Complete    | 2026-07-07 |
| 2. Test Scaffolding | 3/3 | Complete    | 2026-07-13 |
| 3. Observability | 3/3 | Complete    | 2026-07-13 |
| 4. Serverless Hardening | 3/3 | Complete    | 2026-07-13 |
| 5. Data Reliability & Infrastructure Headers | 2/4 | In Progress|  |
| 6. Firestore Rules Hardening | 3/3 | Complete    | 2026-07-13 |
| 7. UI/UX, Copy & Accessibility | 6/12 | In Progress|  |
| 8. Landing Page, Trust & Final Polish | 0/TBD | Not started | - |

## Coverage

All 44 v1 requirements map to exactly one phase:

| Category | Requirements | Phase |
|----------|--------------|-------|
| Audit & Documentation | AUDIT-01..04 | 1 |
| Repo Hygiene | HYG-01..05 | 1 |
| Testing & QA | TEST-01..03 | 2 |
| Testing & QA (milestone-end) | TEST-04 | 8 |
| Observability | OBS-01..03 | 3 |
| Security & Auth | SEC-01..03 | 4 |
| Security & Auth (rules) | SEC-04, SEC-05 | 6 |
| Data & API Reliability | DATA-01..03 | 5 |
| Infrastructure | INFRA-02, INFRA-03 | 5 |
| Infrastructure (CSP enforce) | INFRA-01 | 8 |
| UI/UX Modernization | UI-01..06 | 7 |
| Content & Copy | COPY-01..03 | 7 |
| Accessibility & Performance | A11Y-01..03 | 7 |
| Landing Page & Trust | LAND-01..04 | 8 |
| Final Polish | POLISH-01 | 8 |

**Cross-phase notes:**

- INFRA-01 (CSP) spans phases by design: Report-Only ships in Phase 5 to maximize soak time; the requirement completes in Phase 8 when the policy is enforced after a clean smoke test.
- AUDIT-03 (changelog) is scaffolded in Phase 1 and maintained by every subsequent phase as a standing task.
- Every user-facing phase includes non-admin-account smoke testing — the admin account skips the indexed/scoped code paths where regressions hide.
