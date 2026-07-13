---
status: passed
phase: 02-test-scaffolding
source: [02-VERIFICATION.md]
started: 2026-07-12
updated: 2026-07-12
---

## Current Test

number: 1
name: Firestore rules emulator green pass (TEST-01)
expected: |
  `npm run test:rules` boots the Firestore emulator on 127.0.0.1:8080 and all 15
  collected cases pass.
awaiting: none — resolved

## Tests

### 1. Firestore rules emulator green pass (TEST-01)
expected: `npm run test:rules` passes all 15 cases in a JDK-21 environment, OR the "Firestore rules tests" step is green on CI (which provisions temurin 21).
result: [passed]
note: |
  Resolved 2026-07-12: installed openjdk@21 (brew, keg-only) and ran `npm run test:rules`
  with JAVA_HOME set. First run 14/15 — the activity_log append-only test failed because the
  `match /{document=**}` admin catch-all (firestore.rules:207-209) overrides the collection's
  `allow update, delete: if false`, so admin can edit/delete audit entries. Per user decision,
  the test was updated to characterize this ACTUAL behavior (assertSucceeds + SEC-04 pointer)
  and the append-only gap logged as a HIGH finding for Phase 6 / SEC-04. Suite is now 15/15 green.

## Summary

total: 1
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None blocking Phase 2. One deferred finding recorded: activity_log append-only is not enforced
against admin (catch-all override) — routed to Phase 6 / SEC-04 (see docs/SAAS_READINESS_AUDIT.md).
