# Stack Research

**Domain:** Professionalization tooling for an existing React 19 (CRA) + Firebase + Vercel real-estate CRM
**Researched:** 2026-07-06
**Confidence:** MEDIUM-HIGH overall (all versions verified against the npm registry on 2026-07-06; ecosystem/compatibility claims verified against official docs and the locally installed react-scripts 5.0.1 source)

**Scope note:** This researches only what is being ADDED this milestone (error tracking, rules testing, input validation, security headers, a11y linting, serverless-function testing). The existing stack (React 19.2.3, react-scripts 5.0.1, firebase 12.8.0, firebase-admin 13.10.0, Cloudinary, Vercel) is documented in `.planning/codebase/STACK.md` and is not re-researched. Framework migration (CRA → Vite/Next) is out of scope — see "Future Recommendation" at the end.

## Hard Constraints (verified, drive every choice below)

| Constraint | Verified How | Impact |
|------------|--------------|--------|
| `react-scripts 5.0.1` bundles **Jest 27.5.1** (`jest ^27.4.3`) and **ESLint 8** | `npm view react-scripts@5.0.1` + installed `node_modules/jest` = 27.5.1 | `react-scripts test` cannot run tooling that needs Jest 28+ features or Node-18 `fetch` in its sandboxed env; keep it for `src/` only |
| CRA 5 **removed** the preflight `verifyPackageTree` check | grepped installed react-scripts 5.0.1 — no `SKIP_PREFLIGHT_CHECK` / `verifyPackageTree` | A second test runner CAN coexist without preflight errors (older CRA-4-era warnings about this no longer apply) |
| Node 22.x pinned (`engines.node`), Node 24 in CI; Vercel offers 20/22/24 (24 default, `engines` overrides) | package.json + Vercel docs (fetched 2026-07-06) | Everything added must support Node 22; all recommendations below do |
| Vercel functions are plain `api/*.js` CommonJS handlers (not Next.js) | repo `api/` dir | Rules out `@sentry/nextjs` and Next-style middleware; validation/error tracking must be plain-Node |
| `vercel.json` already ships 5 security headers (nosniff, X-Frame-Options DENY, Referrer-Policy, HSTS, Permissions-Policy) | read `vercel.json` | The remaining gap is **Content-Security-Policy** (+ static asset caching) — don't re-add what exists |

## Recommended Stack

### Core Additions

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@sentry/react` | 10.63.0 | Frontend error tracking + ErrorBoundary + performance traces | Ecosystem default; peer deps explicitly allow React 19.x (`^16.14 \|\| 17.x \|\| 18.x \|\| 19.x`); works in CRA without ejecting (init in an `instrument` module imported first in `src/index.js`; `Sentry.ErrorBoundary` wraps the app shell). Node >=18 engine — fine. Generous free tier fits a showcase product. **Confidence: MEDIUM** (versions/peers verified on npm + docs; the GSD legitimacy heuristic flagged it SUS, which is a false positive — this is Sentry's official SDK) |
| `@sentry/node` | 10.63.0 | Error tracking in `api/*` Vercel functions | Same project/DSN family as the frontend → one dashboard. Init once in `api/_lib/sentry.js`; wrap handlers; **must `await Sentry.flush(2000)` before responding** (serverless freezes the process, unflushed events are lost). **Confidence: MEDIUM** |
| `zod` | 4.4.3 | Input validation in `api/` functions (send-email, accept-invite, lead-intake) | De-facto standard for schema validation; zero deps; no engine restriction — runs on Vercel Node 22 as-is; `schema.safeParse(req.body)` gives a non-throwing discriminated result ideal for returning 400s; schemas double as documentation of the trust boundary (a PROJECT.md requirement). Server-side only, so bundle size is irrelevant. **Confidence: HIGH** (npm-verified version; no compat surface to worry about) |
| `@firebase/rules-unit-testing` | 5.0.1 | Firestore rules tests | The official (and only real) tool. v5.0.1 (published 2026-06) peer-depends on `firebase ^12.0.0` — **exact match for the project's firebase 12.8.0**. Engine `node >=20` — fine locally (22) and in CI (24). Runner-agnostic: `initializeTestEnvironment`, `assertSucceeds`/`assertFails`, `withSecurityRulesDisabled`. **Confidence: MEDIUM** (npm + Firebase docs verified) |
| `vitest` | 4.1.10 | Test runner for `api/` function tests AND rules tests | Runs in Node env with native `fetch`/ESM — required because rules-unit-testing v5 targets Node 20+ and Jest 27's sandboxed node env predates global `fetch`. Keeps `react-scripts test` untouched for `src/`. Engines `^20 \|\| ^22 \|\| >=24` — matches. Zero package-name collision with CRA's bundled jest (no ambiguous `jest` binary at top level). **Confidence: MEDIUM** (heuristic flagged SUS — false positive; official Vite-team runner, npm-verified) |
| `eslint-plugin-jsx-a11y` | 6.10.2 | Accessibility linting | Already a transitive dep of `eslint-config-react-app` (which enables only a ~10-rule subset). Add as explicit devDependency and extend `plugin:jsx-a11y/recommended` in `package.json#eslintConfig` to enforce the full recommended set. Supports ESLint 8 legacy config that CRA uses. **Confidence: HIGH** (already in the tree at ^6.5.1; verified config mechanism) |
| `firebase-tools` | 15.22.4 | Firestore emulator for rules tests | Required by rules-unit-testing. Install as devDependency (version-pinned, reproducible CI) rather than relying on a global. Firestore emulator needs Java JDK 11+ — present on GitHub `ubuntu-latest` runners. **Confidence: MEDIUM** |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@sentry/cli` | 3.6.0 | Source map upload for readable production stack traces | CRA can't add the Sentry webpack plugin without ejecting. Instead run `sentry-cli sourcemaps inject build/ && sentry-cli sourcemaps upload build/` as a `postbuild` step (or via `npx @sentry/wizard -i sourcemaps` one-time setup). Only needed once error tracking ships; skippable in phase 1 (Sentry still groups errors, just with minified frames) |
| `node-mocks-http` | 1.17.2 | Mock `(req, res)` pairs for Vercel handler unit tests | Vercel functions are plain Node `(req, res)` handlers; this creates realistic mocks (status, json, headers) without spinning up a server. Lighter than `vercel dev` + supertest integration tests |
| `supertest` | 7.2.2 | HTTP-level integration tests | Only if you later want to test through `vercel dev` or a local HTTP wrapper; NOT needed for the unit-test approach above. Defer |

### Development / Config Additions (no new packages)

| Tool | Purpose | Notes |
|------|---------|-------|
| `vercel.json` headers | Add **Content-Security-Policy** (the one missing header) | Roll out as `Content-Security-Policy-Report-Only` first, watch a week, then enforce. Required directives for this app: `connect-src` → `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `firestore.googleapis.com`, `firebasestorage.googleapis.com`, `api.cloudinary.com`, `*.ingest.sentry.io` (once Sentry lands); `img-src` → `res.cloudinary.com` + `data:`; `frame-src` → `rems-app-44205.firebaseapp.com`, `accounts.google.com` (Google sign-in popup). Confidence on the exact domain list: MEDIUM — validate with Report-Only, not by guessing |
| `INLINE_RUNTIME_CHUNK=false` | Removes CRA's inline runtime `<script>` so `script-src` needs no `'unsafe-inline'` | Verified supported in installed react-scripts 5.0.1 (`webpack.config.js` line 59). Set in `.env`. `style-src 'unsafe-inline'` will still be needed (React inline styles) — acceptable |
| `vercel.json` cache headers | `Cache-Control: public, max-age=31536000, immutable` for `/static/(.*)` | CRA output is content-hashed; explicit immutable caching is a cheap perf win and shows up in Lighthouse |
| `firebase.json` + `firestore.indexes.json` wiring | `firebase emulators:exec --only firestore "vitest run --dir tests/rules"` in CI | `firebase.json` must point at `firestore.rules`; keeps rules tests hermetic. Repo already treats `firestore.rules` as source of truth |
| Web Vitals → analytics hook | Perf observability using the already-installed `web-vitals` | `web-vitals` 2.1.4 is already a dependency and unused beyond `reportWebVitals`. Wire it to Sentry (`Sentry.captureMessage` or performance) instead of adding a new tool. Optionally bump to web-vitals 4.x later; not required |

## Installation

```bash
# Error tracking (frontend + serverless)
npm install @sentry/react@^10.63.0 @sentry/node@^10.63.0

# Serverless input validation
npm install zod@^4.4.3

# Testing (rules + api functions) — dev only
npm install -D vitest@^4.1.10 @firebase/rules-unit-testing@^5.0.1 firebase-tools@^15.22.4 node-mocks-http@^1.17.2

# Accessibility linting — dev only (promotes existing transitive dep)
npm install -D eslint-plugin-jsx-a11y@^6.10.2

# Optional, when shipping source maps
npm install -D @sentry/cli@^3.6.0
```

Then in `package.json`:

```json
"eslintConfig": {
  "extends": ["react-app", "react-app/jest", "plugin:jsx-a11y/recommended"]
},
"scripts": {
  "test:api": "vitest run --dir api",
  "test:rules": "firebase emulators:exec --only firestore \"vitest run --dir tests/rules\""
}
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Sentry (hosted, free tier) | GlitchTip / Bugsink (Sentry-SDK-compatible, self-hosted) | Only if self-hosting becomes a requirement — same SDKs, swap the DSN. Not worth the ops burden for a showcase SaaS. (LOW confidence — web survey) |
| Sentry | Rollbar 7 / Bugsnag | Rollbar if you want simpler error-only tracking; Bugsnag if mobile SDKs mattered (they don't here). Neither beats Sentry's React 19 + serverless story or free tier |
| Sentry | LogRocket / PostHog session replay | If session replay becomes the priority over error tracking; heavier SDKs, different product goal |
| zod | valibot 1.4.2 | Only if validating in the **browser bundle** where its smaller size matters; here validation is server-side, so zod's ubiquity and ergonomics win |
| zod | yup 1.7.1 | Legacy form-validation ecosystems (Formik). No reason for new server-side code |
| zod | ajv + JSON Schema | If you need standards-based JSON Schema output for external consumers; overkill here |
| vitest for api/rules tests | Standalone Jest 30 alongside CRA | Now *possible* (CRA 5 dropped the preflight check — verified locally) but creates two Jest versions in one repo, an ambiguous `jest` binary, and Jest-27-era docs confusion. Vitest avoids all of it |
| vitest | `node:test` (built-in) | Zero-dependency option if adding vitest is unwanted; works with rules-unit-testing too, but weaker watch mode/DX and unfamiliar assertion style |
| node-mocks-http unit tests | `vercel dev` + supertest integration tests | When testing routing/middleware behavior end-to-end; slower, needs Vercel auth in CI — defer |
| eslint-plugin-jsx-a11y (static) | `@axe-core/react` or jest-axe (runtime) | Add `jest-axe` later for runtime a11y assertions in component tests; static linting is the right first step and CI-free |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@sentry/nextjs`, `@sentry/vite-plugin`, `@sentry/webpack-plugin` | Wrong framework / requires ejecting CRA | `@sentry/react` + `@sentry/node` + `@sentry/cli` postbuild upload |
| Standalone Jest 28/29/30 for api tests | Coexists but collides conceptually with CRA's bundled Jest 27 (two configs, two versions, ambiguous binary) | vitest |
| Running rules tests under `react-scripts test` | Jest 27's sandboxed node env predates global `fetch`; rules-unit-testing v5 targets Node 20+; jsdom default env is wrong for it | vitest in node env, launched via `firebase emulators:exec` |
| `helmet` | Express middleware — CRA static hosting + Vercel functions have no Express layer; headers belong in `vercel.json` | `vercel.json` headers array (already the established pattern in this repo) |
| `express-validator`, `joi` | Express-coupled / heavier, older ecosystems for this use case | zod |
| `@firebase/rules-unit-testing@2.x/3.x/4.x` | Peer-dep on firebase 9/10/11 — conflicts with installed firebase 12.8.0 | v5.0.1 (peer `firebase ^12.0.0`) |
| CSP with `'unsafe-inline'` in `script-src` | Defeats the point of CSP | `INLINE_RUNTIME_CHUNK=false` + hash-free external scripts |
| Web-vitals SaaS add-ons (SpeedCurve, Calibre) | New vendor for something Sentry + the existing `web-vitals` package already cover | Wire existing `reportWebVitals` into Sentry |

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@sentry/react@10.63.0` | `react@19.2.3` | Peer range explicitly includes 19.x (npm-verified) |
| `@sentry/react`/`@sentry/node@10` | Node >= 18 | Project Node 22 / CI Node 24 / Vercel 22 — all fine |
| `@firebase/rules-unit-testing@5.0.1` | `firebase@^12.0.0` | Exact match with installed 12.8.0; do NOT bump firebase to a hypothetical v13 without checking a new rules-unit-testing major |
| `@firebase/rules-unit-testing@5.0.1` | Node >= 20 | OK locally/CI; requires Firestore emulator (Java 11+ for emulator) |
| `vitest@4.1.10` | Node ^20 \|\| ^22 \|\| >=24 | OK; keep it out of `src/` — CRA's Jest 27 continues to own `src/` tests |
| `eslint-plugin-jsx-a11y@6.10.2` | ESLint 8 (CRA's) | Supports legacy `.eslintrc`-style config CRA uses; also flat-config-ready for a future migration |
| `zod@4.4.3` | Vercel Node 22 runtime | No engines field; pure JS; CJS + ESM entrypoints both published |
| `react-scripts@5.0.1` | second test runner in repo | Preflight `verifyPackageTree` check REMOVED in CRA 5 (verified in installed source) — coexistence is safe |

## Stack Patterns by Variant

**If Sentry free-tier quota becomes a concern (unlikely at showcase traffic):**
- Set `tracesSampleRate` low (0.1) and keep `sampleRate` at 1.0 for errors
- Because errors matter more than performance traces for this milestone

**If CI time for rules tests balloons:**
- Run rules tests as a separate GitHub Actions job with the emulator cached (`~/.cache/firebase/emulators`)
- Because emulator download is the slow part, not the tests

**If the team wants zero new test infra:**
- Use `node:test` + `node:assert` instead of vitest for api/rules tests
- Because it ships with Node 22 and rules-unit-testing is runner-agnostic — but accept weaker DX

## Future Recommendation (out of scope this milestone)

CRA/react-scripts 5 is unmaintained (last release 2022; Jest 27, ESLint 8, webpack 5 frozen). The React team formally sunset CRA. A future milestone should migrate to **Vite** (smallest delta for a Firebase SPA: env-var prefix change `REACT_APP_` → `VITE_`, index.html move, vitest then also replaces Jest for `src/`). Every tool chosen above (Sentry, zod, vitest, jsx-a11y, rules-unit-testing) carries over unchanged — nothing in this milestone deepens CRA lock-in.

## Sources

- npm registry via `npm view` (2026-07-06) — authoritative versions for all packages listed; peer deps for @sentry/react, @firebase/rules-unit-testing; react-scripts 5.0.1 dependency pins (jest ^27.4.3, eslint ^8.3.0) — HIGH factual reliability (seam-classified MEDIUM/LOW; heuristic SUS verdicts on @sentry/react and vitest are false positives, both are official packages)
- Installed `node_modules/react-scripts@5.0.1` source (local) — confirmed Jest 27.5.1 installed, `INLINE_RUNTIME_CHUNK` supported, preflight check removed — HIGH
- https://docs.sentry.io/platforms/javascript/guides/react/ — React 19 init pattern, sourcemaps via wizard/CLI — MEDIUM
- https://firebase.google.com/docs/rules/unit-tests — rules-unit-testing APIs, emulator requirement — MEDIUM
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions (updated 2026-02) — Node 20/22/24 available, 24 default, `engines` override — MEDIUM
- Web survey of Sentry alternatives (SigNoz, PostHog, Rollbar comparisons, 2026) — GlitchTip/Bugsink as SDK-compatible drop-ins — LOW
- Repo files: `vercel.json` (existing headers), `package.json`, `api/` directory — HIGH (ground truth)

---
*Stack research for: REMS SaaS professionalization (brownfield additions)*
*Researched: 2026-07-06*
