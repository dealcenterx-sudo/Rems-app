---
status: testing
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
awaiting: user response (deferred — no DSN provisioned yet)

## Tests

### 1. Production client error lands in Sentry (OBS-01)
expected: Deliberate client error on the deployed app appears as a Sentry Issue.
result: [deferred]

### 2. Uncaught serverless throw lands in Sentry (OBS-02)
expected: An UNCAUGHT throw in a withSentry-wrapped handler appears as a Sentry Issue with api_route tag + method extra. (Handled 500s are NOT reported — known gap routed to Phase 5 / DATA-02.)
result: [deferred]

### 3. Web-vitals messages land in Sentry (OBS-03)
expected: Loading the deployed app produces info-level "Web Vital: <name>" events in Sentry.
result: [deferred]

### 4. Vercel env vars configured
expected: REACT_APP_SENTRY_DSN set BUILD-TIME (CRA inlines at build) and SENTRY_DSN set RUNTIME in Vercel; values never recorded here.
result: [deferred]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

None from the code-wiring half — all automatable must_haves verified (test:ci 42, test:api 27).
The four items above are the event-landing half, DEFERRED by user decision pending a
production deploy carrying the Sentry DSNs. Closure path: `/gsd-verify-work 3` after that
deploy + a Sentry smoke.
