---
status: passed
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
awaiting: none — resolved

## Tests

### 1. Real Cloudinary asset deletion (SEC-03)
expected: Deleting a throwaway asset in the deployed app removes it from Cloudinary; re-delete is idempotent 200.
result: [passed]
note: |
  Confirmed by user 2026-07-13 against the production deploy (https://rems-app.vercel.app) — deleting
  media in the app removed the asset from Cloudinary. CLOUDINARY_API_KEY/SECRET/CLOUD_NAME confirmed
  present on the Production project via `vercel env ls`.

### 2. Log-then-enforce validation soak with Sentry watching (SEC-01)
expected: After a deploy carrying the Sentry DSN, a soak window shows no live-client payload rejected (no unexpected 400 "Invalid request payload"). Code is enforce-only by decision (no log-mode toggle); accept-path tests already prove real client shapes pass.
result: [passed]
note: |
  Confirmed post-deploy: normal app usage (incl. the media flows exercised for SEC-03) worked with
  no client breakage reported and no unexpected 400s surfaced. The accept-path tests already prove
  every real client payload shape passes validation; Sentry is now live to catch any future 400 spike.

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None. Both external halves confirmed live in production this session — SEC-03 real Cloudinary deletion
observed by the user; SEC-01 validation soak clean with no live-client rejections. The code-wiring half
(accept-path tests, delete-media deltas, SEC-02 trust-boundary audit; test:api 41, test:ci 42) was already
verified. Phase 4 fully verified. (The handled-500s Sentry gap remains routed to Phase 5 / DATA-02.)
