# REMS — Launch & Production-Verification Checklist

## Purpose

Everything in the SaaS professionalization milestone is implemented and deployed. Several
verifications are **deferred** because they can only be confirmed against a live deployment
carrying real secrets — they cannot be observed in a local/dev environment. This checklist
is the operator runbook for configuring those secrets, deploying, and confirming the deferred
behaviors so the product is genuinely production-ready (not just code-complete).

It documents variable **names only** — never paste secret values into this file or any tracked file.

Related docs: [`ENVIRONMENT.md`](./ENVIRONMENT.md) (full variable reference),
[`SAAS_READINESS_AUDIT.md`](./SAAS_READINESS_AUDIT.md) (findings + status),
[`TRUST_BOUNDARIES.md`](./TRUST_BOUNDARIES.md) (endpoint auth posture).

---

## Step 1 — Configure Vercel environment variables (Production scope)

Set these in Vercel → Project → Settings → Environment Variables.

### Runtime / server (serverless functions; effective on next deploy)

| Variable | Purpose | Where to get it | Required |
|---|---|---|---|
| `SENTRY_DSN` | Serverless error capture (OBS-02) | Sentry project DSN | For serverless observability |
| `CLOUDINARY_API_KEY` | Authenticated server-side media delete (SEC-03) | Cloudinary dashboard → API Keys | For media delete endpoint |
| `CLOUDINARY_API_SECRET` | Signs the Admin destroy call; **must never reach the browser** | Cloudinary dashboard → API Keys | For media delete endpoint |
| `CLOUDINARY_CLOUD_NAME` | Cloud name for deletes | Cloudinary dashboard | Optional — public fallback `dcirl3j3v` exists; set explicitly anyway |
| `SENTRY_ENVIRONMENT` | Server Sentry environment label (e.g. `production`) | — | Optional |
| `SENTRY_TRACES_SAMPLE_RATE` | Server trace sample rate `0`–`1` | — | Optional; default `0` |

### Build-time / client (inlined into the bundle at BUILD)

| Variable | Purpose | Where to get it | Required |
|---|---|---|---|
| `REACT_APP_SENTRY_DSN` | Client error + web-vitals capture (OBS-01, OBS-03) | Sentry DSN (same project is fine) | For client observability |
| `REACT_APP_SENTRY_ENVIRONMENT` | Client Sentry environment label | — | Optional |
| `REACT_APP_SENTRY_TRACES_SAMPLE_RATE` | Client trace sample rate `0`–`1` | — | Optional; default `0` |

### Security confirmation (not a new var — a check)

- [ ] `REACT_APP_DEV_BYPASS` is **unset or `false`** in Production. It is a build-time flag that
  bypasses the client auth gate (Firestore rules still enforce data access, but the shell would
  render unauthenticated). Phase 1 audit finding.

---

## Step 2 — Deploy with a fresh build (critical)

`REACT_APP_*` variables are **baked in at build time**, not read at runtime. Setting
`REACT_APP_SENTRY_DSN` has no effect until a **new build** runs.

- [ ] Do **not** use "Redeploy" with the existing build cache — it reuses the old bundle without the DSN.
- [ ] Deploy a fresh build via **either**:
  - push a commit to `main` (auto-deploys with a fresh build), or
  - Vercel → Deployments → Redeploy with **"Use existing Build Cache" unchecked**.
- [ ] Confirm the deployment reaches `READY` and the production alias points to the new build.

CSP is Report-Only and already whitelists `*.ingest.sentry.io`, so Sentry ingest is not blocked.

---

## Step 3 — Production smoke checks (the deferred verifications)

### Phase 3 — Observability

- [ ] **OBS-01 (client error → Sentry):** Trigger a deliberate client error on the live site
  (force a render error in a component under `ErrorBoundary`). Confirm a new Issue appears in
  Sentry within ~1 min, carrying a `componentStack`.
- [ ] **OBS-02 (uncaught serverless throw → Sentry):** Place a temporary UNCAUGHT throw *outside*
  a wrapped handler's own try/catch, deploy, hit the endpoint. Confirm the Issue appears with the
  `api_route` tag and `method` extra. **Remove the temporary throw afterward.** (A normal handled
  500 will NOT appear — known gap routed to Phase 5 / DATA-02.)
- [ ] **OBS-03 (web-vitals → Sentry):** Load and interact with the production app. Confirm
  info-level `Web Vital: <name>` events (CLS/FID/FCP/LCP/TTFB) appear in Sentry.

### Phase 4 — Serverless Hardening

- [ ] **SEC-03 (real Cloudinary deletion):** Upload a **throwaway** asset via a media flow
  (DocumentsPage / PropertiesPage / DealDocumentsTab), then delete it in-app. Confirm the network
  response is 200 `{result:'ok'}` AND the asset is gone from the Cloudinary Media Library. Delete
  the same record a second time and confirm 200 `{result:'not found'}` (idempotent, intended).
- [ ] **SEC-01 (validation soak):** After deploy, watch serverless logs / Sentry for any
  `Invalid request payload` 400s on real client traffic during a soak window. None expected —
  accept-path tests already prove real client payload shapes pass. This is confirmation only.

---

## Step 4 — Close the GSD verification

After the smoke checks pass, close the deferred phases:

- [ ] `/gsd-verify-work 3` — record the OBS-01/02/03 results, flips Phase 3 to passed.
- [ ] `/gsd-verify-work 4` — record the SEC-01/SEC-03 results, flips Phase 4 to passed.

---

## Later-phase deploy-gated items (heads-up, not yet due)

These will land in their own phases but also require live deploys / manual Console steps —
worth batching with a deploy window:

- **Phase 5:** composite indexes from `firestore.indexes.json` must be created and confirmed
  `READY` in the Firebase console.
- **Phase 6 (highest launch risk):** the hardened `firestore.rules` must be **manually published**
  in the Firebase Console (rules are NOT deployed from git), including removal of the admin-email
  fallback AND the fix for the `activity_log` admin-tamper gap (SEC-04). Two-account smoke test after.
- **Phase 8:** flip CSP from Report-Only to enforced once the production soak shows a clean allowlist.

---

*Values are secrets — configure them in Vercel, never in tracked files. `npm run check:constants`
guards the admin-email literal but does not scan `docs/`, so secret discipline here is manual.*
