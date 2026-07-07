# Project Research Summary

**Project:** REMS — SaaS Professionalization Upgrade
**Domain:** Brownfield professionalization of a live React 19 (CRA) + Firebase + Vercel real-estate CRM
**Researched:** 2026-07-06
**Confidence:** MEDIUM-HIGH

## Executive Summary

This milestone is not a rebuild — it is a set of cross-cutting quality layers added at seams the codebase already has. Research across all four dimensions converges on the same conclusion: REMS's architecture (App.js shell, `api/_lib/` convention, design tokens in `App.css :root`, git-tracked `firestore.rules`) is sound enough that professionalization means (1) invisible hardening — error tracking, rules/API tests, input validation, CSP, composite indexes, config centralization — and (2) visible experience polish — empty/loading/error states, a copy standard, accessibility at the token level, and a public landing page with honest trust content. The additions require six small, well-verified dependencies (Sentry react/node, zod, vitest, rules-unit-testing, firebase-tools, jsx-a11y promotion), all confirmed compatible with the frozen CRA 5 / Jest 27 / firebase 12.8 constraints. Nothing recommended deepens CRA lock-in; a future Vite migration carries everything over.

The single most important structural fact is that **this app deploys through two independent channels**: code auto-deploys to production on every merge to `main`, while Firestore rules deploy only when a human pastes them into the Firebase Console. Nearly every critical pitfall is a variant of this race — rules changed before tests exist, indexes not READY before dependent code merges, CSP enforced before all SDK origins are known. The mitigation is ordering: land observability and characterization tests *before* anything that can break production, ship CSP as Report-Only before enforcing, and make "rules published / index READY" explicit acceptance criteria in every phase that touches them.

The key sequencing insight for the roadmap: foundational, invisible work (config centralization, tests, Sentry) has the highest blast radius if done late and zero user-visible risk if done early — do it first. User-visible work (UI polish, copy, landing page) comes last, atop the safety net, and in a specific internal order: copy standard before the copy sweep, hex→token migration before token-value changes, security hardening before any published trust claims, and UI polish before landing-page screenshots. Every phase merge is a production deploy, so every phase must leave `main` shippable and must be smoke-tested as a **non-admin** account — the admin account skips the indexed/scoped code paths where most regressions hide.

## Key Findings

### Recommended Stack

All additions verified against npm (2026-07-06) and against the installed react-scripts 5.0.1 source. The hard constraints: CRA bundles Jest 27 (no global `fetch`, jsdom default), Vercel functions are plain Node `(req,res)` handlers, and `vercel.json` already ships 5 of 6 security headers — only CSP (+ cache headers) is missing. Details in `STACK.md`.

**Core technologies:**
- `@sentry/react` 10.63 + `@sentry/node` 10.63: error tracking, one project/dashboard — peer deps explicitly allow React 19; serverless wrapper must `await Sentry.flush(2000)` before responding
- `zod` 4.4: input validation in `api/` functions — zero deps, `safeParse` gives non-throwing 400s, schemas document the trust boundary
- `vitest` 4.1 + `@firebase/rules-unit-testing` 5.0.1 + `firebase-tools` 15.22: rules and API tests outside CRA's Jest — rules-unit-testing v5 peer-matches installed firebase 12.8 exactly; run via `firebase emulators:exec`
- `eslint-plugin-jsx-a11y` 6.10: promote the existing transitive dep to `plugin:jsx-a11y/recommended` — works with CRA's ESLint 8
- Config-only wins: CSP in `vercel.json` (Report-Only first), `INLINE_RUNTIME_CHUNK=false` (avoids `'unsafe-inline'` script-src), `Cache-Control: immutable` for `/static/*` + `no-cache` for index.html, wire existing `web-vitals` into Sentry

**Do NOT use:** `@sentry/nextjs`/webpack plugins (require ejecting), standalone Jest 28+ (collides with CRA's Jest 27), `helmet` (no Express layer), rules-unit-testing v2–4 (peer-conflict with firebase 12), react-snap prerendering (abandoned, unverified on React 19).

### Expected Features

The evaluator personas are an investor skimming the landing page, a customer trialing the app, and a technical reviewer tabbing through with dev tools open. Details in `FEATURES.md`.

**Must have (table stakes — missing any reads as "side project"):**
- Landing page: outcome-focused hero, audience section, workflow-framed features (lead → deal → close), real screenshots, honest security section, footer
- Designed empty states on all ~10+ list/dashboard surfaces (first-use vs no-results variants) — these ARE the onboarding mechanism
- Skeleton loaders (>500ms loads), per-button pending states, SWR for Home KPIs, no layout shift
- Error-message map (Firebase code → human copy with recovery action); offline handling
- Copy standard doc (sentence case, verb+object buttons, one term per concept, no fluff) then full sweep
- Accessibility: #00ff88 focus ring, contrast audit at the token level, keyboard/modal behavior, semantic HTML, never color-only meaning
- Trust content describing *actual* controls — gated on hardening landing first

**Should have (differentiators):**
- Empty states that teach the domain; 3-item first-run checklist (not a tour)
- Optimistic UI on task/status toggles; skeletons that mirror final layout precisely
- "How REMS protects your data" page with concrete architecture facts — the showcase play

**Defer (v2+):** keyboard power layer / command palette, public changelog/status page, SOC 2 roadmap.

**Anti-features (explicitly do NOT build):** fake testimonials/logos/counts, compliance badges not held, multi-step product tours, third-party onboarding SaaS embeds, fluffy startup language, demo-data seeding into production Firestore, separate marketing repo/framework, cookie banners with no tracking to disclose.

### Architecture Approach

No re-architecture: cross-cutting layers at existing seams. The landing page is an unauthenticated default view inside App.js (no react-router — the app routes via tab state + query params), with static meta/OG in `public/index.html` covering the one URL that matters. Serverless middleware is function composition (`withSentry(withValidation(schema, handler))`) in `api/_lib/`. New tests live in `tests/` *outside* `src/` so CRA's Jest never sees them; `test:rules` and `test:api` become separate npm scripts and CI steps. Config centralization (`src/config.js` client, `api/_lib/config.js` server) is a pure refactor that everything later touches — do it first. Details in `ARCHITECTURE.md`.

**Major components (new/changed only):**
1. `LandingPage` — public marketing view, eager-loaded, reuses design tokens; CTA toggles to LoginPage
2. `src/config.js` + `api/_lib/config.js` — single source for ADMIN_EMAIL and constants (replaces 8+ hardcoded literals; rules copy stays inline and manually synced)
3. `api/_lib/withSentry.js` + `api/_lib/validate.js` — error capture + zod validation wrappers for all four endpoints
4. `tests/rules/` + `tests/api/` — characterization tests against *current* rules/handlers before any change
5. `vercel.json` CSP block — Report-Only → soak → enforce, in separate deploys

**Named anti-patterns:** react-router or a separate marketing repo for one page; react-snap; changing firestore.rules before rules tests exist; ad-hoc validation inside handler bodies; enforcing CSP in the same deploy that adds it; introducing a `src/services/` layer.

### Critical Pitfalls

Top 5 of 9 from `PITFALLS.md` (all phase-mapped there):

1. **Rules change locks out live users** — removing the admin email fallback before verifying `users/{adminUid}.role == 'admin'` in production locks the admin out of *everything*. Avoid: verify data first, additive-then-subtractive publishes, rules tests land BEFORE the rules-hardening phase, always publish from a committed state.
2. **CSP/COOP breaks sign-in, Firestore, or uploads** — `COOP: same-origin` breaks `signInWithPopup`; one missed origin (identitytoolkit, securetoken, firestore, firebasestorage, api/res.cloudinary, `rems-app-44205.firebaseapp.com` frame, Sentry ingest) breaks a live flow. Avoid: Report-Only first, allowlist from an integration checklist, 5-action smoke test (Google popup, email sign-in, live Firestore view, Cloudinary upload, PDF preview).
3. **Two-channel deploy race** — code merges auto-deploy; rules/indexes wait for a human. Avoid: publish permissive rules / create indexes and wait for READY *before* merging dependent code; encode as acceptance-criteria checkboxes.
4. **Missing composite indexes break non-admins silently** — non-admin `where('userId')+orderBy` queries need indexes the admin path doesn't; the AnalyticsDashboard fallback masks this. Avoid: audit all queries, create all indexes, wait for READY, make the fallback loud (Sentry event) before removing it; test every phase as a non-admin account.
5. **Repo hygiene done the destructive way** — deleting `api/health.js` (the only prod diagnostic for firebase-admin init, added days ago) or history-rewriting the source archive off `main`. Avoid: auth-gate health.js (or ask about external monitors), plain `git rm` for the archive, never `filter-repo`/force-push.

Also high-signal: partial admin-email migration (CI grep check: literal appears only in config files), token-value changes before hex→token migration (938 hardcoded hex vs 161 token uses), copy rewrites that change destructive-action semantics (verify ConfirmModal claims against handler code), and the landing page breaking invite deep links / signed-in users' muscle memory (role × auth-state × deep-link test matrix).

## Implications for Roadmap

The Active requirements call for an 8-phase upgrade plan (`docs/SAAS_UPGRADE_PLAN.md`). Research supports exactly that shape — invisible foundations first, visible polish last:

### Phase 1: Audit, Repo Hygiene & Config Centralization
**Rationale:** Audit-first is a stated constraint; config centralization is a zero-behavior-change refactor that every later phase touches (do it before rebasing churn); hygiene items are early wins with known safe procedures.
**Delivers:** `docs/SAAS_READINESS_AUDIT.md` + `docs/SAAS_UPGRADE_PLAN.md` + changelog scaffold; `src/config.js` + `api/_lib/config.js` (ADMIN_EMAIL centralized, grep-verified); source archive removed via plain `git rm`; `api/health.js` auth-gated (not deleted); `screenshot.js` relocated.
**Addresses:** Repo hygiene + audit deliverable requirements.
**Avoids:** Pitfall 5 (destructive hygiene), Pitfall 6 (partial email migration — checked-in constant, NOT an env var; CI grep acceptance check). Rules email-fallback is explicitly NOT touched here.

### Phase 2: Test Scaffolding (Rules + API Characterization Tests)
**Rationale:** Must precede any rules or handler change — converts the riskiest change category (manual Console rules publish) into a verified one. Tests target *current* behavior first.
**Delivers:** `tests/rules/` (userId scoping, admin override, assignedProperties/Deals, `canAccessDeal` portal inheritance, activity_log append-only) + `tests/api/` handler tests; `firebase.json` emulator config; `test:rules`/`test:api` scripts wired into CI (Java + emulator cache).
**Uses:** vitest, @firebase/rules-unit-testing 5.0.1, firebase-tools, node-mocks-http — all outside `src/` so `npm run test:ci` stays untouched.
**Avoids:** Pitfall 1 (rules tests before rules changes); anti-pattern "changing rules before tests exist."

### Phase 3: Observability (Sentry Client + Server)
**Rationale:** Before UI/copy churn and before header/rules phases, so every later regression is visible in production immediately. Depends on nothing; benefits everything after.
**Delivers:** `Sentry.init` in `src/index.js` gated on `REACT_APP_SENTRY_DSN`; ErrorBoundary→Sentry bridge; `api/_lib/withSentry.js` with `flush(2000)`; web-vitals wired to Sentry; verified by triggering a real production error. Source-map upload via `@sentry/cli` postbuild (optional in this phase).
**Implements:** Pattern 4 (observability at the shell) + serverless wrapper composition seam.

### Phase 4: Serverless Hardening (Validation + Auth Audit)
**Rationale:** Depends on Phase 1 (config), Phase 2 (handler tests prove no regression), Phase 3 (wrapper order established, violations observable).
**Delivers:** `api/_lib/validate.js` + zod schemas for send-email, accept-invite, lead-intake; auth-token verification audit; documented trust boundaries; Cloudinary delete implemented (signed Admin API call from `api/`) or explicitly deferred in the audit.
**Uses:** zod `safeParse` → uniform 400 `flatten()` shape.
**Avoids:** "Validation rejecting payloads the live client already sends" — log-then-enforce rollout.

### Phase 5: Data/API Reliability + Infrastructure Headers (Report-Only)
**Rationale:** Index work is a correctness/cost issue *today*; CSP Report-Only is zero-risk and needs a soak window before Phase 8 enforcement — starting it here maximizes soak time.
**Delivers:** Firestore query audit (`where('userId')+orderBy` enumeration); all composite indexes in `firestore.indexes.json`, deployed, verified READY; AnalyticsDashboard fallback made loud (Sentry event), not removed; `Content-Security-Policy-Report-Only` + Cache-Control (immutable statics, no-cache index.html) in `vercel.json`; `INLINE_RUNTIME_CHUNK=false`.
**Avoids:** Pitfall 4 (silent non-admin breakage — indexes READY before fallback changes), Pitfall 2 (CSP staged, never COOP `same-origin`), stale-chunk trap (index.html no-cache).

### Phase 6: Auth/Rules Hardening (Email-Fallback Removal)
**Rationale:** Last in the security chain — requires Phase 1 (email centralized elsewhere) and Phase 2 (rules tests green before/after). The one change CI cannot catch gets maximal protection.
**Delivers:** Verify `users/{adminUid}.role == 'admin'` in production; two-step (additive-then-subtractive) rules publish removing the email fallback; pbcopy + Console publish ritual; two-account (admin + non-admin) production smoke test after each publish.
**Avoids:** Pitfall 1 (admin lockout), Pitfall 3 (rules published before dependent code merges).

### Phase 7: UI/UX, Copy & Accessibility Polish
**Rationale:** Visible work atop the observability safety net; internal ordering is dependency-driven: copy standard → sweep; hex→token migration → token-value changes; token audit → contrast/focus fixes propagate everywhere.
**Delivers:** Copy standard doc + full sweep (sentence case, verb+object, error-message map with recovery actions, helper text); reusable EmptyState (first-use + no-results) across all surfaces incl. buyer/seller shell; skeletons on Home/Deals/CRM/Contacts/Properties/Tasks/Documents; SWR for Home KPIs; per-button pending states; token-level a11y pass (contrast, #00ff88 focus ring, keyboard/modal behavior, semantic HTML); jsx-a11y recommended ruleset; first-run welcome moment.
**Addresses:** Nearly all P1 features from FEATURES.md.
**Avoids:** Pitfall 7 (migrate hex→tokens BEFORE changing token values; full page checklist incl. client shell), Pitfall 8 (destructive-copy checklist: verify ConfirmModal claims against handler cascades before rewriting).

### Phase 8: Landing Page, Trust Content & Final Polish
**Rationale:** Last so screenshots capture the *polished* app and trust claims are true (hardening chain complete). CSP flips to enforcing here, after the landing page's final origin list is known.
**Delivers:** LandingPage as unauthenticated default in App.js (hero, audience, workflow features, real screenshots, honest security section, footer); static meta/OG in `public/index.html`; CSP enforced (separate deploy, after clean Report-Only soak + 5-action smoke test); final polish pass verifying acceptance criteria per brief.
**Avoids:** Pitfall 9 (role × auth-state × deep-link matrix: invite links stable, signed-in users land in app, hard-refresh on deep routes works), anti-pattern 5 (CSP enforce in its own deploy), "screenshots baking in pre-polish quality."

### Phase Ordering Rationale

- **Foundations before polish:** config/tests/telemetry have the highest blast radius if done late and zero user-visible risk done early; polish work then happens under observability.
- **Tests before rules, rules before trust claims:** the two-channel deploy model makes rules the only CI-invisible change; characterization tests (Phase 2) must exist before hardening (Phase 6), and published security claims (Phase 8) must be true before publication.
- **CSP spans phases by design:** Report-Only early (Phase 5) for maximum soak, enforce late (Phase 8) after all origins — including Sentry ingest and any landing-page assets — are final.
- **Every phase leaves `main` shippable** (per-phase merge deploys production) and includes non-admin-account smoke testing as a standing UAT step.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (CSP allowlist):** exact domain list is MEDIUM confidence by design — it must be validated empirically via Report-Only violations, not guessed; plan should include a violation-review step.
- **Phase 4 (Cloudinary delete):** implement-vs-defer is an open decision requiring signed Admin API research if implemented; small spike or explicit deferral in the audit.

Phases with standard patterns (skip research-phase):
- **Phases 1–3, 6:** config refactor, rules-unit-testing, and Sentry setup are all documented against official sources in STACK/ARCHITECTURE; patterns and exact versions already verified.
- **Phases 7–8:** UX-state, copy, a11y, and landing-page patterns are fully specified in FEATURES.md with WCAG anchoring; execution is breadth work, not research work.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | All versions/peer-deps npm-verified 2026-07-06; CRA constraints verified against installed source (HIGH); two heuristic SUS flags (Sentry, vitest) are documented false positives |
| Features | MEDIUM | Cross-checked practitioner sources; WCAG items anchored to W3C (authoritative); competitive benchmarks are inference |
| Architecture | HIGH (repo) / MEDIUM (ecosystem) | Integration points read directly from code (grep-verified hardcode sites, vercel.json headers); Sentry/Firebase/Vercel patterns verified against official docs |
| Pitfalls | MEDIUM-HIGH | Repo-specific facts verified in codebase (HIGH: rules line numbers, hex counts, ConfirmModal sites); Firebase/Vercel behaviors from official docs (MEDIUM) |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Admin doc role verification:** whether `users/{adminUid}` actually has `role: 'admin'` in production is unverified — Phase 6 must check before the fallback removal; this is the lockout gate.
- **Exact CSP domain list:** MEDIUM confidence; resolved empirically via Report-Only soak in Phase 5, not by research.
- **External consumers of `api/health.js`:** in-repo grep shows nothing, but uptime monitors/bookmarks are invisible to grep — ask the user before removal (auth-gating recommended instead).
- **Firestore backup posture:** recovery from a bad destructive action assumes backups exist; verify and record as an audit finding in Phase 1.
- **Cloudinary delete:** no-op TODO today; implement-vs-defer decision needed in Phase 4.
- **Landing-page screenshot timing:** landing page (Phase 8) intentionally follows polish (Phase 7); if sequencing changes, plan a screenshot refresh.

## Sources

### Primary (HIGH confidence)
- Repo ground truth: `vercel.json`, `package.json`, `src/App.js`, `firestore.rules`, `firestore.indexes.json`, `api/` directory, installed `node_modules/react-scripts@5.0.1` source; `.planning/codebase/` (ARCHITECTURE, STRUCTURE, CONCERNS)
- npm registry via `npm view` (2026-07-06) — versions and peer deps for all recommended packages
- W3C WCAG 2.2 (w3.org/TR/WCAG22) — accessibility criteria

### Secondary (MEDIUM confidence)
- Sentry official docs — React/CRA sourcemaps, serverless flush requirement
- Firebase official docs — rules unit tests, emulator, rules deploy propagation, index builds, custom claims
- Vercel official docs — Node runtimes, headers/CSP, Cache-Control patterns
- firebase-js-sdk issues #8541/#8295 — COOP vs `signInWithPopup`
- Cross-checked practitioner sources on landing pages, empty states, onboarding, skeletons, microcopy (full list in FEATURES.md)

### Tertiary (LOW confidence)
- Sentry-alternative survey (GlitchTip/Bugsink) — only relevant if self-hosting becomes a requirement
- react-snap/prerendering landscape — treated as caution against use, not a recommendation

---
*Research completed: 2026-07-06*
*Ready for roadmap: yes*
