# Architecture Research

**Domain:** Brownfield professionalization of a CRA + Firebase + Vercel SPA (real-estate CRM → production-grade B2B SaaS)
**Researched:** 2026-07-06
**Confidence:** HIGH for integration points grounded in this repo's code; MEDIUM for ecosystem patterns (verified against official Sentry/Firebase/Vercel docs via web search)

## Standard Architecture

Professionalization of an existing SPA is not a re-architecture — it is a set of **cross-cutting layers added at existing seams**. The seams in this codebase are already well-defined, which is why no rewrite is needed:

### System Overview (target state; new pieces marked ●)

```
┌───────────────────────────────────────────────────────────────────────┐
│  Public Surface                                                        │
│  ● LandingPage (unauthenticated default view in App.js)               │
│  ● Static meta/OG tags in public/index.html                           │
│  LoginPage (existing, reached via CTA)   InviteAcceptor (existing)    │
├───────────────────────────────────────────────────────────────────────┤
│  App Shell (src/App.js — tab-state router, NO react-router)           │
│  UserContext │ ToastProvider │ ErrorBoundary                          │
│  ● Sentry.init + ErrorBoundary→Sentry bridge (src/index.js)           │
├───────────────────────────────────────────────────────────────────────┤
│  Pages (11 lazy-loaded) — direct Firestore access (unchanged)         │
│  ● import ADMIN_EMAIL / config from src/config.js (replaces 8+       │
│    hardcoded literals)                                                 │
├───────────────────────────────────────────────────────────────────────┤
│  Utility Layer  src/utils/                                             │
│  permissions.js │ auditLog.js │ cloudinary.js │ ● config.js (NEW)     │
├───────────────────────────────────────────────────────────────────────┤
│  Serverless Layer  api/                                                │
│  ● _lib/withSentry.js (handler wrapper)                                │
│  ● _lib/validate.js + per-endpoint zod schemas                         │
│  ● _lib/config.js (ADMIN_EMAIL from env, allowed origins)              │
│  send-email │ accept-invite │ lead-intake │ health (gated/removed)     │
├───────────────────────────────────────────────────────────────────────┤
│  Edge / Platform  vercel.json                                          │
│  existing: nosniff, X-Frame-Options, Referrer-Policy, HSTS,           │
│  Permissions-Policy   ● add: CSP (Report-Only→enforce), Cache-Control │
├───────────────────────────────────────────────────────────────────────┤
│  Enforcement + Verification                                            │
│  firestore.rules (manual publish — unchanged deployment model)        │
│  ● tests/rules/ (@firebase/rules-unit-testing + emulator)             │
│  ● tests/api/ (handler unit tests, separate runner from CRA Jest)     │
└───────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities (new/changed components only)

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `LandingPage` | Public marketing view: what REMS is, who it's for, sign-in CTA | Eager-loaded component rendered by App.js when `!user`; reuses App.css design tokens |
| `src/config.js` | Single source for client-side constants: `ADMIN_EMAIL`, app name, support links | Plain module of named exports; imported by `firebase.js`, `helpers.js`, and the 4 components that currently hardcode the email |
| `api/_lib/config.js` | Server-side constants from env (`ADMIN_EMAIL`, allowed webhook origins) | Reads `process.env` with explicit throw-on-missing for required vars |
| `api/_lib/withSentry.js` | Error capture wrapper for every serverless handler | HOF: init once, try/catch handler, `captureException`, `await Sentry.flush(2000)` before responding |
| `api/_lib/validate.js` | Request validation seam | zod `safeParse(req.body)` → 400 with `error.flatten()` on failure; handler receives typed `result.data` |
| `tests/rules/` | Firestore rules regression suite | `@firebase/rules-unit-testing` (`initializeTestEnvironment`), run via `firebase emulators:exec --only firestore` |
| `tests/api/` | Handler unit tests | Import handler as plain `(req,res)` function; mock req/res + firebase-admin; separate runner (standalone Jest with `-c`, or vitest to avoid CRA's Jest 27 preflight conflict) |
| `vercel.json` CSP block | Browser-enforced allowlist of script/connect/img sources | Ship as `Content-Security-Policy-Report-Only` first; flip to enforcing after a clean soak |

## Recommended Project Structure (delta only — do not reorganize existing code)

```
rems-app/
├── src/
│   ├── config.js                # ● client constants (ADMIN_EMAIL, brand strings)
│   └── components/
│       └── LandingPage.js       # ● public marketing page (eager, like LoginPage)
├── api/
│   └── _lib/
│       ├── firebaseAdmin.js     # existing
│       ├── config.js            # ● env-backed server constants
│       ├── withSentry.js        # ● error-capture handler wrapper
│       └── validate.js          # ● zod safeParse helper + shared schemas
├── tests/                       # ● OUTSIDE src/ — CRA's Jest only scans src/
│   ├── rules/                   # ● firestore.rules tests (emulator)
│   │   ├── jest.config.js       #   node env, raised timeout
│   │   └── *.test.js
│   └── api/                     # ● serverless handler tests
├── firebase.json                # ● emulator config (firestore port) — new file
├── vercel.json                  # extended: CSP + Cache-Control headers
└── docs/                        # audit/plan/changelog deliverables
```

### Structure Rationale

- **`tests/` outside `src/`:** `react-scripts test` (bundled Jest 27, jsdom) only discovers tests under `src/` — keeping rules/API tests outside means the existing `npm run test:ci` is untouched and stays green; new suites get their own npm scripts (`test:rules`, `test:api`) and CI steps. Installing a different top-level Jest can trip CRA's preflight check; a config-file-scoped standalone runner (or vitest) sidesteps it. (MEDIUM)
- **`api/_lib/` for all serverless cross-cutting code:** Vercel treats every top-level file in `api/` as an endpoint; `_lib/` (underscore prefix) is already the established non-endpoint convention here (`firebaseAdmin.js`).
- **`src/config.js` as plain module, not context:** the values are static constants, not reactive state — no provider needed; import cost is zero.
- **No `src/services/` layer:** confirmed anti-pattern for this codebase (`.planning/codebase/ARCHITECTURE.md`) — direct Firestore access keeps permission scope at the render boundary; professionalization must not introduce it.

## Architectural Patterns

### Pattern 1: Landing page as unauthenticated default view (in-app, not a separate site)

**What:** App.js currently renders `LoginPage` when `!user`. Insert `LandingPage` as the unauthenticated default instead, with the sign-in CTA switching to the login view (local state or `?login=1` query param, matching the existing query-param routing convention). LoginPage and InviteAcceptor stay eager-loaded; LandingPage should be eager too (it is the first paint for anonymous visitors).
**When to use:** Login-first CRA SPA with no react-router (this app routes via `activeTab` state + query params — adding react-router for one public page is unnecessary churn).
**Trade-offs:**
- Pro: one codebase, one design-token system, zero build/deploy changes, invite/auth flows untouched.
- Con: content is client-rendered. **SEO reality check (CSR limits):** Google renders JS and will index it, but social/link previews (OG tags) never execute JS. Mitigation: since the landing page is the *root* route, static `<title>`, `<meta name="description">`, and OG tags in `public/index.html` fully cover the one URL that matters. This is sufficient for the "demoable to investors/recruiters" success metric (they arrive via direct link, not organic search).
- **Do not reach for react-snap:** it is effectively unmaintained (last release ~2020, Puppeteer-based) and unverified against React 19's `hydrateRoot`; prerendering at Vercel build time is a known flakiness source. If organic SEO becomes a real requirement later, that is the documented CRA→Next.js migration trigger, not a bolt-on. (MEDIUM)

**Example:**
```jsx
// App.js — unauthenticated branch
if (!user) {
  if (isInvitePath) return <InviteAcceptor />;
  return wantsLogin ? <LoginPage /> : <LandingPage onSignIn={() => setWantsLogin(true)} />;
}
```

### Pattern 2: Config centralization before behavior changes

**What:** Extract `ADMIN_EMAIL` into `src/config.js` (client) and `api/_lib/config.js` (server, env-backed). Grep-verified current hardcode sites: `src/firebase.js`, `src/utils/helpers.js`, `src/utils/permissions.test.js`, `src/components/DealsDashboard.js`, `CRMMessagesPage.js`, `NewDealPage.js`, `CRMEmailInboxPage.js`, `api/lead-intake.js`, plus `firestore.rules`. (HIGH — read from code)
**When to use:** Always, and **first** — it is a pure refactor with zero behavior change, and every later phase (rules changes, validation, copy) touches these files.
**Trade-offs:** `firestore.rules` cannot import anything — the email/role check stays inline there. The longer-term fix is the role-doc check (`get(/databases/.../users/$(request.auth.uid)).data.role == 'admin'`) which the rules already support, with the email fallback removed once the admin's user doc is confirmed to carry `role: 'admin'` (PROJECT.md: "removed when safe"). Firebase custom claims are the ecosystem's recommended end-state (in-token, no doc read, `request.auth.token.admin == true`) but require an Admin SDK script to set and a token refresh — a good documented follow-up, not required this milestone. (MEDIUM)

### Pattern 3: Validation + error capture as handler wrappers (serverless middleware without a framework)

**What:** Vercel functions are bare `(req, res)` exports with no middleware chain. The standard pattern is composition of higher-order wrappers in `_lib`:
```js
// api/send-email.js
module.exports = withSentry(withValidation(schema, async (req, res, input) => { ... }));
```
- `withValidation`: method check → `schema.safeParse(req.body)` → 400 + `flatten()` on failure; handler receives parsed `input`, never raw `req.body`.
- `withSentry`: init-once `@sentry/node`, catch, `captureException`, **`await Sentry.flush(2000)`** before responding — Vercel freezes the function after the response, so unflushed events are silently lost. (MEDIUM — verified against Sentry docs/discussions)
**When to use:** All four existing endpoints; every future endpoint by convention (update the "New Serverless Function" recipe in STRUCTURE.md).
**Trade-offs:** Slight indirection per handler; in exchange, auth-token verification, validation, and error capture become copy-proof defaults instead of per-file discipline.

### Pattern 4: Frontend observability at the shell, not in pages

**What:** `Sentry.init` in `src/index.js` (before render); wire the existing `ErrorBoundary` to `Sentry.captureException` in `componentDidCatch` (or swap fallback rendering to `Sentry.ErrorBoundary` while keeping the current fallback UI). Source maps: CRA emits them in `npm run build`; upload with `sentry-cli` as a `postbuild` step (webpack plugin would require ejecting — off the table). Gate init on an env var (`REACT_APP_SENTRY_DSN`) so local dev stays silent. (MEDIUM — Sentry has an official CRA sourcemaps guide)
**When to use:** Before the UI-polish phases — so that any regression introduced by polish work is observable in production immediately.
**Trade-offs:** DSN is public by design (fine); source-map upload adds a CI secret (`SENTRY_AUTH_TOKEN`, names-only in docs per constraints).

### Pattern 5: Rules tests as an emulator-scoped sibling suite

**What:** `@firebase/rules-unit-testing` + Firestore emulator; `initializeTestEnvironment({ firestore: { rules: readFileSync('firestore.rules') } })`, per-role contexts via `testEnv.authenticatedContext(uid, claims)` and `unauthenticatedContext()`. npm script: `firebase emulators:exec --only firestore "npx jest -c tests/rules/jest.config.js"` — emulator lifecycle fully managed, works in GitHub Actions (needs Java on the runner). (MEDIUM — verified against Firebase docs)
**When to use:** Land the suite **against the current rules first** (characterization tests: userId scoping, admin override, assignedProperties/assignedDeals, deal-portal inheritance via `canAccessDeal`, activity_log append-only). Only then change the rules (email-fallback removal) — the tests convert a risky manual-publish change into a verified one.
**Trade-offs:** The manual Console-publish deployment model stays; tests verify the file in git, and the existing "paste into Console" step remains the release act. Drift between git and Console is now detectable but not prevented — note it in the audit.

## Data Flow

### New/changed flows only (existing flows unchanged by design)

**Anonymous visitor:**
```
GET / → Vercel edge (headers incl. CSP) → index.html (static meta/OG)
  → React boots → UserContext: no auth → App.js renders LandingPage
  → CTA → LoginPage → auth success → existing app shell (no reload)
```

**Serverless request (target):**
```
fetch(api/x) → withSentry → method/auth check (Firebase ID token, existing)
  → withValidation (zod safeParse) ─ fail → 400 flatten()
  → handler(input) → firebase-admin → Firestore
  → error? captureException → flush(2s) → 500 generic
```

**Error telemetry:**
```
render error → ErrorBoundary → Sentry (client DSN) ┐
handler error → withSentry → flush → Sentry (server DSN or same project) ┘→ one Sentry project, environment-tagged
```

**Config:**
```
src/config.js ──imported by──> firebase.js, helpers.js, 4 components (client, build-time constant)
api/_lib/config.js ──reads──> process.env (server)
firestore.rules ──inline──> role check (email fallback until verified safe to remove)
```

### State Management

Unchanged: React local state + Firestore as SSOT, UserContext for auth. Professionalization adds **no** state library (explicitly out of scope). The only state addition is the trivial `wantsLogin` toggle in the unauthenticated branch.

## Suggested Build Order (dependencies between components)

Each step leaves `main` shippable (per-phase merge deploys production):

1. **Repo hygiene + config centralization** — zero-behavior-change refactors (`src/config.js`, `api/_lib/config.js`, remove source archive, gate/remove `api/health.js`). No dependencies; everything later touches these files, so do it first to avoid rebasing churn.
2. **Test scaffolding: `tests/rules/` + `tests/api/`** — characterization tests against *current* rules and handlers. Must precede any rules or handler change; also precedes CI additions.
3. **Observability: Sentry client + `withSentry` server wrapper** — before UI/copy churn so regressions from later phases are visible. Depends on nothing; benefits everything after.
4. **Serverless hardening: `withValidation` + zod schemas + auth-check audit** — depends on (1) (config for ADMIN_EMAIL/origins), (2) (handler tests prove no regression), (3) (wrapper composition order established).
5. **Headers: CSP Report-Only in vercel.json** — can start early (Report-Only is zero-risk) but **enforce** only after the landing page and any new external resources (Sentry ingest) are final, since each new origin must be allowlisted. Existing headers (nosniff, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy) already present — only CSP + Cache-Control are missing. (HIGH — read from vercel.json)
6. **Landing page** — depends on (5)'s CSP awareness and design tokens; independent of serverless work. Static meta/OG in `public/index.html` ships with it.
7. **Rules change: email-fallback removal + composite indexes** — depends on (1) (email centralized elsewhere), (2) (rules tests green before/after). Manual Console publish; offer pbcopy.
8. **UI/UX + copy polish, accessibility** — last, atop observability; token-level changes (spacing/typography) before per-page polish.

Rationale for the ordering skeleton: invisible/foundational work (config, tests, telemetry) has the highest blast radius if done late and zero user-visible risk if done early; user-visible work (landing, polish) benefits from the safety net.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (internal team + demo traffic) | Everything above is sufficient; no infra changes |
| 1k-10k users | First bottleneck: Firestore read patterns (per-page full-collection reads, HomePage KPI queries) — extend the existing localStorage SWR cache pattern; composite indexes become mandatory, not fallback |
| 100k+ / multi-tenant SaaS | CRA CSR + client-side Firestore joins become the limit; that is the Next.js/SSR + backend-aggregation conversation — explicitly out of scope, document as recommendation only |

### Scaling Priorities

1. **First bottleneck:** missing composite indexes silently falling back to client-side filtering (known concern) — fix in step 7, it is a correctness/cost issue today, not a future one.
2. **Second bottleneck:** 2,678-line `CRMLeadDetailPage` — a maintainability bottleneck, not runtime; split only if a polish phase must touch it heavily.

## Anti-Patterns

### Anti-Pattern 1: Introducing react-router (or a separate marketing repo) for one public page

**What people do:** Add react-router + route guards, or split marketing into a second deployment, to get a "proper" public/private boundary.
**Why it's wrong:** This app's router is tab state + query params; react-router would touch every page's navigation for zero user value. A second repo/deployment forks the design system and doubles deploy surface for a single page.
**Do this instead:** Unauthenticated default view inside App.js (Pattern 1); static meta in `public/index.html`.

### Anti-Pattern 2: Prerendering bolt-ons (react-snap) on React 19 CRA

**What people do:** Add react-snap/Puppeteer to "fix SEO" of the CSR landing page.
**Why it's wrong:** Abandoned tooling, unverified React 19 hydration, flaky headless-Chrome build steps on Vercel — a new production failure mode to solve a problem the milestone doesn't have (direct-link audiences).
**Do this instead:** Static meta/OG for the root; log "Next.js migration if organic SEO matters" as the future recommendation PROJECT.md already anticipates.

### Anti-Pattern 3: Changing firestore.rules before rules tests exist

**What people do:** Remove the admin email fallback as part of the config-centralization commit, since "it's the same cleanup."
**Why it's wrong:** Rules deploy manually via Console paste; a bad rules change is the one category of change CI cannot catch today, and it breaks non-admin users first (the accounts nobody is logged in as).
**Do this instead:** Characterization tests in `tests/rules/` first (step 2), rules change last (step 7), verified green before and after; keep the pbcopy-and-publish ritual as the release act.

### Anti-Pattern 4: Validation logic inside each handler body

**What people do:** Ad-hoc `if (!req.body.email) return res.status(400)...` sprinkled per handler.
**Why it's wrong:** Drifts per endpoint, silently skipped on new endpoints, unparseable error shapes for the client.
**Do this instead:** `withValidation(schema, handler)` wrapper — one seam, uniform 400 shape (`flatten()`), handlers only ever see parsed data.

### Anti-Pattern 5: Enforcing CSP in the same deploy that adds it

**What people do:** Ship `Content-Security-Policy` enforcing on first attempt.
**Why it's wrong:** Firebase Auth (identitytoolkit/securetoken), Firestore, Cloudinary upload + delivery, Google sign-in frames, and Sentry ingest each need allowlisting; one missed origin breaks login or uploads in production.
**Do this instead:** `Content-Security-Policy-Report-Only` first, soak across all major flows (login, upload, PDF viewer, deal portal), then flip to enforcing in a separate deploy.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Sentry (client) | `@sentry/react` init in `src/index.js`; `sentry-cli` postbuild sourcemap upload | No webpack plugin without ejecting; gate on `REACT_APP_SENTRY_DSN`; DSN is public by design |
| Sentry (server) | `@sentry/node` inside `api/_lib/withSentry.js` | Must `await Sentry.flush()` pre-response — Vercel freezes function after response; `@sentry/serverless` is deprecated, don't use it |
| Firebase emulator | `firebase emulators:exec --only firestore "<jest cmd>"` | New `firebase.json` needed for emulator config; CI runner needs Java + firebase-tools |
| Vercel edge | `vercel.json` `headers` array | CSP `connect-src`: firestore.googleapis.com, identitytoolkit.googleapis.com, securetoken.googleapis.com, www.googleapis.com, api.cloudinary.com, Sentry ingest; `img-src`/`media-src`: res.cloudinary.com; `frame-src` for Google sign-in popup flow. Add Cache-Control: immutable for `/static/*`, no-cache for index.html |
| Cloudinary | unchanged (`src/utils/cloudinary.js`) | Delete remains a no-op — server-side delete would need a signed Admin API call from `api/`; implement or explicitly defer in audit |
| Firebase Console (rules) | manual paste-and-publish | Unchanged; tests verify the git copy, human publishes it |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| App.js ↔ LandingPage/LoginPage | conditional render on `useUser()` + local `wantsLogin` | No router change; InviteAcceptor branch precedence preserved |
| Components ↔ `src/config.js` | direct import of constants | Pure refactor; `firestore.rules` cannot import — role check stays inline there |
| Handlers ↔ `_lib` wrappers | function composition `withSentry(withValidation(schema, h))` | Order matters: Sentry outermost so validation bugs are also captured |
| CRA Jest ↔ `tests/` suites | fully separate runners + npm scripts | `react-scripts test` never sees `tests/`; CI runs `test:ci`, `test:rules`, `test:api` as distinct steps |
| Client Sentry ↔ Server Sentry | same project, `environment`/tag separation | One pane of glass for demo-readiness triage |

## Sources

- Repo code (HIGH): `vercel.json`, `src/App.js`, `package.json`, grep of admin-email hardcodes; `.planning/codebase/ARCHITECTURE.md`, `STRUCTURE.md`
- Sentry docs — CRA sourcemaps guide, `@sentry/node` on Vercel discussions (MEDIUM, official-doc verified): docs.sentry.io/platforms/javascript/guides/react/sourcemaps/uploading/create-react-app/; github.com/getsentry/sentry-javascript/discussions/18591
- Firebase docs — rules unit tests + emulator (MEDIUM, official): firebase.google.com/docs/rules/unit-tests; firebase.google.com/docs/firestore/security/test-rules-emulator
- Firebase docs — custom claims RBAC (MEDIUM, official): firebase.google.com/docs/auth/admin/custom-claims
- Vercel docs — headers/CSP behavior (MEDIUM, official): vercel.com/docs/headers; vercel.com/docs/edge-network/security-headers
- zod safeParse serverless validation pattern (MEDIUM, cross-checked community + docs)
- react-snap / CRA prerendering landscape (LOW→MEDIUM; community sources — treated as caution, not recommendation): blog.logrocket.com/pre-rendering-react-app-react-snap/

---
*Architecture research for: REMS SaaS professionalization (brownfield CRA + Firebase + Vercel)*
*Researched: 2026-07-06*
