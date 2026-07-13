---
status: testing
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
  collected cases pass — covering userId scoping, admin override, admin-email-without-role
  denial, assignedProperties/assignedDeals, all six deal-portal collections via
  canAccessDeal(), users-block role/assignment immutability, and activity_log append-only.
awaiting: user response

## Tests

### 1. Firestore rules emulator green pass (TEST-01)
expected: `npm run test:rules` passes all 15 cases in a JDK-21 environment, OR the "Firestore rules tests" step is green on CI (which provisions temurin 21).
result: [pending]
note: |
  This host runs Java 8; firebase-tools 15.x requires Java 21, so the emulator cannot
  run locally. The suite parses and collects all 15 cases (`npx vitest list tests/rules`),
  and every assertion was hand-traced against on-disk firestore.rules and matches. Only the
  runtime green pass is unobserved. Documented Manual-Only constraint (02-VALIDATION.md,
  docs/TESTING.md) — not a code gap.

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
