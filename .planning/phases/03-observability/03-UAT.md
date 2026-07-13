---
status: passed
phase: 03-observability
source: [03-VERIFICATION.md]
started: 2026-07-13
updated: 2026-07-13
---

## Current Test

number: 1
name: Production client error lands in Sentry (OBS-01)
expected: |
  With REACT_APP_SENTRY_DSN built into a production deploy, a deliberately triggered
  client error appears as a new Issue in the Sentry project (ErrorBoundary path carries
  a componentStack).
awaiting: none — resolved

## Tests

### 1. Production client error lands in Sentry (OBS-01)
expected: Deliberate client error on the deployed app appears as a Sentry Issue.
result: [passed]
note: |
  Confirmed by user 2026-07-13 against the fresh production deploy (dpl_PR1UNkDrWVdWn4ZmNeveopTqCgG1,
  https://rems-app.vercel.app). A deliberately triggered client error appeared as a Sentry Issue.
  Orchestrator independently confirmed REACT_APP_SENTRY_DSN was inlined into the shipped bundle
  (main.7cc3ba73.js references ingest.us.sentry.io) — client Sentry is armed in prod.

### 2. Uncaught serverless throw lands in Sentry (OBS-02)
expected: An UNCAUGHT throw in a withSentry-wrapped handler appears as a Sentry Issue with api_route tag + method extra. (Handled 500s are NOT reported — known gap routed to Phase 5 / DATA-02.)
result: [verified-by-inference]
note: |
  A live uncaught serverless throw was NOT deliberately triggered (would require a temporary
  code throw + redeploy). Basis for closure: (a) SENTRY_DSN is set on the production project
  (runtime), so the wrapper is armed; (b) the withSentry unit test proves capture→flush(2000)→
  respond ordering on an uncaught throw; (c) Sentry ingest for this project is proven working
  end-to-end via the confirmed client event (test 1) and web-vitals (test 3). Residual risk is
  low. Optional belt-and-suspenders: trigger a real uncaught throw later and confirm the Issue.

### 3. Web-vitals messages land in Sentry (OBS-03)
expected: Loading the deployed app produces info-level "Web Vital: <name>" events in Sentry.
result: [passed]
note: Confirmed by user 2026-07-13 — web-vitals events appeared in Sentry after loading the production app.

### 4. Vercel env vars configured
expected: REACT_APP_SENTRY_DSN set BUILD-TIME (CRA inlines at build) and SENTRY_DSN set RUNTIME in Vercel; values never recorded here.
result: [passed]
note: |
  Confirmed via `vercel env ls production`: REACT_APP_SENTRY_DSN and SENTRY_DSN present (Production).
  A fresh forced build (vercel --prod --force) inlined the client DSN — confirmed in the shipped bundle.

## Summary

total: 4
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0
verified_by_inference: 1

## Gaps

None blocking. OBS-01, OBS-03, and env-var configuration confirmed live in production this session
(user observed the events in Sentry). OBS-02's serverless uncaught-throw path is armed + unit-verified
+ inferred-good (Sentry ingest proven end-to-end via the client path) but a live serverless throw was
not deliberately triggered — recorded honestly as verified-by-inference, optionally re-confirmable later.
