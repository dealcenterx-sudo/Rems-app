---
status: testing
phase: 04-serverless-hardening
source: [04-VERIFICATION.md]
started: 2026-07-13
updated: 2026-07-13
---

## Current Test

number: 1
name: Real Cloudinary asset deletion (SEC-03)
expected: |
  With CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET set in Vercel runtime and a deploy, deleting
  a throwaway asset via a client flow (DocumentsPage / PropertiesPage / DealDocumentsTab)
  returns 200 {result:'ok'} AND the asset is gone from the Cloudinary dashboard; a second
  delete returns 200 {result:'not found'} (idempotent).
awaiting: user response (deferred — no credentials provisioned yet)

## Tests

### 1. Real Cloudinary asset deletion (SEC-03)
expected: Deleting a throwaway asset in the deployed app removes it from Cloudinary; re-delete is idempotent 200.
result: [deferred]

### 2. Log-then-enforce validation soak with Sentry watching (SEC-01)
expected: After a deploy carrying the Sentry DSN, a soak window shows no live-client payload rejected (no unexpected 400 "Invalid request payload"). Code is enforce-only by decision (no log-mode toggle); accept-path tests already prove real client shapes pass.
result: [deferred]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

None from the code-wiring half — all automatable must_haves verified (test:api 41, test:ci 42;
SEC-02 fully closed). The two items above are external-resource-gated (Cloudinary creds; Sentry
DSN from the Phase 3 deferral) and DEFERRED by user decision. Closure: `/gsd-verify-work 4`
after a production deploy with creds + DSN. Roadmap criterion 3 explicitly permits this deferral.
