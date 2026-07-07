# Requirements — REMS SaaS Professionalization Upgrade

**Defined:** 2026-07-06
**Core value:** The product must feel and function like a serious production SaaS — every major flow polished, secured server-side, and explainable — without breaking any current production workflow.

## v1 Requirements

### Audit & Documentation

- [ ] **AUDIT-01**: Reviewer can read a complete SaaS Readiness Audit at `docs/SAAS_READINESS_AUDIT.md` (exec summary, stack, product purpose, user flows, weaknesses by area, risk-ranked findings Critical→Low, roadmap, safe execution plan, Definition of Done)
- [ ] **AUDIT-02**: Reviewer can read an 8-phase upgrade plan at `docs/SAAS_UPGRADE_PLAN.md` with goal, files affected, tasks, risks, acceptance criteria, and verification commands per phase
- [ ] **AUDIT-03**: Reviewer can trace every shipped change in a running changelog at `docs/SAAS_UPGRADE_CHANGELOG.md` (what/why/files/commands/results/risks per phase)
- [ ] **AUDIT-04**: Operator can find all required environment variables documented by name (never value) with purpose and where they're consumed

### Repo Hygiene

- [ ] **HYG-01**: Repo no longer contains `rems-project-source-2026-04-09/` or its `.zip` (plain `git rm`, no history rewrite)
- [ ] **HYG-02**: `screenshot.js` is relocated to `scripts/` with paths parameterized (or removed if obsolete)
- [ ] **HYG-03**: `api/health.js` requires an admin auth token — unauthenticated callers learn nothing about env/infra
- [ ] **HYG-04**: Admin email and shared constants live in one place (`src/config.js` client, `api/_lib/config.js` server); a CI grep proves the literal appears only in config files (+ firestore.rules, manually synced)
- [ ] **HYG-05**: Hardcoded Firebase API key in `api/send-email.js` reads from an environment variable instead

### Testing & QA

- [ ] **TEST-01**: Developer can run `npm run test:rules` — emulator-backed characterization tests cover userId scoping, admin override, assignedProperties/assignedDeals, deal-portal `canAccessDeal()` inheritance, and activity_log append-only behavior
- [ ] **TEST-02**: Developer can run `npm run test:api` — handler tests cover auth validation, payload validation, and error paths for send-email, accept-invite, and lead-intake
- [ ] **TEST-03**: CI runs rules + API suites alongside existing lint → test → build, without disturbing CRA's Jest setup
- [ ] **TEST-04**: Lint, test, and build status is known, passing, and documented at milestone end

### Observability

- [ ] **OBS-01**: Production client errors are captured in Sentry (init gated on `REACT_APP_SENTRY_DSN`; ErrorBoundary bridged), verified with a real production error
- [ ] **OBS-02**: Serverless function errors are captured via a `withSentry` wrapper that flushes before responding
- [ ] **OBS-03**: Web-vitals metrics flow to Sentry from the existing `web-vitals` dependency

### Security & Auth Hardening

- [ ] **SEC-01**: Every serverless endpoint validates input with zod schemas and returns uniform 400s for bad payloads (log-then-enforce rollout so live clients never break)
- [ ] **SEC-02**: Auth-token verification is audited across all endpoints and the client/server trust boundary is documented
- [ ] **SEC-03**: User-deleted media is actually deleted from Cloudinary via a new auth-verified `api/delete-media.js` (signed Admin API call)
- [ ] **SEC-04**: Firestore rules no longer contain the admin email fallback — removed only after production data verification (`users/{adminUid}.role == 'admin'`) and green rules tests, via additive-then-subtractive Console publishes with two-account smoke tests
- [ ] **SEC-05**: A reviewer can read documented Firestore access-model assumptions (who can read/write what, and why) matching the tested rules

### Data & API Reliability

- [ ] **DATA-01**: All non-admin `where('userId') + orderBy` queries have composite indexes created, READY, and documented in `firestore.indexes.json`
- [ ] **DATA-02**: The AnalyticsDashboard missing-index fallback reports to Sentry (loud, not silent) so degradation is visible
- [ ] **DATA-03**: Non-admin accounts complete every major flow (Home, Deals, CRM, Properties, Tasks, Analytics) without index errors or silent fallbacks

### Infrastructure & Deployment

- [ ] **INFRA-01**: `vercel.json` ships a Content-Security-Policy — Report-Only first with a soak period, enforced only after a clean 5-action smoke test (Google popup sign-in, email sign-in, live Firestore view, Cloudinary upload, PDF preview)
- [ ] **INFRA-02**: Static assets serve with `Cache-Control: immutable`; `index.html` serves `no-cache` (closes the stale-chunk trap)
- [ ] **INFRA-03**: `INLINE_RUNTIME_CHUNK=false` so the CSP needs no `'unsafe-inline'` script-src

### UI/UX Modernization

- [ ] **UI-01**: Every list/dashboard surface (~10+, including the buyer/seller client shell) shows a designed empty state with first-use and no-results variants that guide the next action
- [ ] **UI-02**: Loads over ~500ms show skeleton loaders that mirror final layout (Home, Deals, CRM, Contacts, Properties, Tasks, Documents); no layout shift
- [ ] **UI-03**: Home KPIs render instantly from cache and refresh in the background (SWR pattern)
- [ ] **UI-04**: Every submit/destructive button shows a pending state while its action is in flight
- [ ] **UI-05**: Hardcoded hex values in components are migrated to `:root` design tokens BEFORE any token values change (two separate passes)
- [ ] **UI-06**: Task/status toggles respond optimistically with rollback on Firestore failure

### Content & Copy

- [ ] **COPY-01**: A one-page copy standard exists (sentence case, verb+object buttons, one term per concept, error format, no fluff) before any sweep begins
- [ ] **COPY-02**: Firebase/API error codes map to human messages with recovery actions
- [ ] **COPY-03**: All dashboard labels, form helper text, empty states, and confirmations follow the standard — destructive-action copy verified against actual handler behavior before rewriting

### Accessibility & Performance

- [ ] **A11Y-01**: Text contrast meets WCAG 2.2 AA (4.5:1) and focus indicators (#00ff88 ring, 3:1) are fixed at the token level so they propagate
- [ ] **A11Y-02**: All modals trap focus and close on Escape; interactive elements are keyboard-reachable; semantic HTML on major pages; meaning never conveyed by color alone
- [ ] **A11Y-03**: `eslint-plugin-jsx-a11y` recommended ruleset is enabled and passing in lint

### Landing Page & Trust

- [ ] **LAND-01**: An unauthenticated visitor at the root sees a marketing page (outcome hero, audience, workflow-framed features lead→deal→close, real screenshots of the polished app, footer) with a sign-in CTA; signed-in users land in the app
- [ ] **LAND-02**: `public/index.html` carries proper title/meta/OG tags for link sharing
- [ ] **LAND-03**: A "How REMS protects your data" trust page describes actual controls (Firebase auth, rules-enforced isolation, append-only audit log, encryption in transit/at rest) — published only after the hardening chain lands
- [ ] **LAND-04**: Invite deep links, direct URLs, and hard refreshes keep working for every role × auth-state combination after the landing page ships

### Final Polish

- [ ] **POLISH-01**: Every major page passes a final intentionality review (no placeholder-feel), verified against the brief's acceptance criteria with a non-admin account smoke test

## v2 Requirements

Deferred to future milestone:

- **v2-01**: First-run 3-item onboarding checklist (user chose to defer)
- **v2-02**: Keyboard power layer / command palette
- **v2-03**: Public changelog / status page
- **v2-04**: Firebase custom claims as the authorization end-state (Admin SDK script + token refresh)
- **v2-05**: Sentry source-map upload via `@sentry/cli` postbuild (nice-to-have; SDK init is v1)
- **v2-06**: Activity-log partitioning/archival (scaling limit, not current pain)

## Out of Scope

| Item | Reason |
|------|--------|
| Framework migration (CRA → Vite/Next.js) | Too disruptive for this milestone; documented as future recommendation only |
| Redux / global state libraries | Local state + Firebase works; no unnecessary dependencies |
| Data model changes / collection renames | Backward compatibility required; no silent data-meaning changes |
| New CRM product features | This milestone professionalizes what exists |
| Git history rewrite (filter-repo/BFG) | Archive contains no secrets; all downside on an auto-deploying main |
| Fake testimonials, logos, compliance badges | Anti-features for an investor audience; honesty is the trust play |
| Multi-step product tours / onboarding SaaS embeds | Research: guided empty states outperform; avoids dependency |
| Destructive cloud/DNS/database config changes | Require explicit user approval per brief |
| SOC 2 / formal compliance program | Beyond milestone scope; trust page describes actual controls instead |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUDIT-01 | Phase 1 | Pending |
| AUDIT-02 | Phase 1 | Pending |
| AUDIT-03 | Phase 1 | Pending |
| AUDIT-04 | Phase 1 | Pending |
| HYG-01 | Phase 1 | Pending |
| HYG-02 | Phase 1 | Pending |
| HYG-03 | Phase 1 | Pending |
| HYG-04 | Phase 1 | Pending |
| HYG-05 | Phase 1 | Pending |
| TEST-01 | Phase 2 | Pending |
| TEST-02 | Phase 2 | Pending |
| TEST-03 | Phase 2 | Pending |
| TEST-04 | Phase 8 | Pending |
| OBS-01 | Phase 3 | Pending |
| OBS-02 | Phase 3 | Pending |
| OBS-03 | Phase 3 | Pending |
| SEC-01 | Phase 4 | Pending |
| SEC-02 | Phase 4 | Pending |
| SEC-03 | Phase 4 | Pending |
| SEC-04 | Phase 6 | Pending |
| SEC-05 | Phase 6 | Pending |
| DATA-01 | Phase 5 | Pending |
| DATA-02 | Phase 5 | Pending |
| DATA-03 | Phase 5 | Pending |
| INFRA-01 | Phase 8 | Pending |
| INFRA-02 | Phase 5 | Pending |
| INFRA-03 | Phase 5 | Pending |
| UI-01 | Phase 7 | Pending |
| UI-02 | Phase 7 | Pending |
| UI-03 | Phase 7 | Pending |
| UI-04 | Phase 7 | Pending |
| UI-05 | Phase 7 | Pending |
| UI-06 | Phase 7 | Pending |
| COPY-01 | Phase 7 | Pending |
| COPY-02 | Phase 7 | Pending |
| COPY-03 | Phase 7 | Pending |
| A11Y-01 | Phase 7 | Pending |
| A11Y-02 | Phase 7 | Pending |
| A11Y-03 | Phase 7 | Pending |
| LAND-01 | Phase 8 | Pending |
| LAND-02 | Phase 8 | Pending |
| LAND-03 | Phase 8 | Pending |
| LAND-04 | Phase 8 | Pending |
| POLISH-01 | Phase 8 | Pending |

**Coverage:** 44/44 v1 requirements mapped. Cross-phase note: INFRA-01 groundwork (CSP Report-Only) ships in Phase 5; the requirement completes with enforcement in Phase 8. AUDIT-03 (changelog) is scaffolded in Phase 1 and maintained every phase.

---
*Requirements defined: 2026-07-06 — from user brief + codebase map + domain research*
