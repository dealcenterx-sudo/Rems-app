---
phase: 02-test-scaffolding
plan: 02
subsystem: testing
tags: [firestore-rules, security, characterization, emulator]
requires:
  - tests/rules/firestore.rules.test.js (shipped in dd6364a)
  - firestore.rules (on-disk, read-only)
provides:
  - Firestore-rules characterization covering all five TEST-01 categories
  - users-block role/assignment immutability net (G-R2, SEC-04 safety net)
  - deal-portal canAccessDeal() coverage across all six collections (G-R1)
affects:
  - Phase 6 / SEC-04 (admin-email fallback removal — regression net now in place)
tech-stack:
  added: []
  patterns:
    - "@firebase/rules-unit-testing assertSucceeds/assertFails allow-deny assertions"
    - "readFileSync('firestore.rules','utf8') emulator-truth pattern"
    - "fixed-fixture seeding via withSecurityRulesDisabled"
key-files:
  created: []
  modified:
    - tests/rules/firestore.rules.test.js
decisions:
  - "Emulator-backed test:rules pass delegated to CI (Java 21) — dev host has Java 8; documented as Manual-Only in 02-VALIDATION.md"
  - "New assertions reuse existing seeded fixtures (admin-uid, agent-a, other-user); added one seed doc per untested portal collection"
metrics:
  duration: ~3m
  completed: 2026-07-13
  tasks: 3
  files: 1
  commits: 2
status: complete
---

# Phase 02 Plan 02: Firestore-Rules Reconcile-and-Verify Summary

Reconciled the shipped Firestore-rules characterization suite against the on-disk `firestore.rules` and added the two RESEARCH-prioritized coverage deepenings (G-R2 users-block immutability, G-R1 full deal-portal coverage), growing the suite from 7 to 15 collected test cases without touching `firestore.rules`.

## What Was Done

### Task 1 — Reconcile and verify the shipped suite (TEST-01) — no commit (verification only)

Confirmed the shipped 7-`it` suite satisfies the TEST-01 contract against the on-disk rules. Each `it` block maps to a success-criterion category:

| TEST-01 category | Covering `it` block(s) |
|------------------|------------------------|
| userId scoping | "allows owners to read and create their own contacts but denies other users records" (owner read own / denied other / create-as-self / forged create denied) |
| admin override | "allows admin role documents to read and delete any scoped record" |
| admin-email-without-role denied (SEC-04 bonus) | "does not grant admin access from the admin email without an admin role document" |
| assignedProperties access | "allows assigned users to read and update assigned properties without deleting them" |
| assignedDeals + deal-portal canAccessDeal() | "allows assigned deal reads and deal-portal access but keeps assigned users read-only on deals" (via deal-messages) |
| activity_log append-only | "allows users to append their own activity and denies forged entries" + "allows admin reads but denies edits and deletes for everyone" |

Verified `initializeTestEnvironment` reads `readFileSync('firestore.rules','utf8')` (emulator-truth pattern) and the port matches firebase.json (`127.0.0.1:8080`). `firestore.rules` unmodified.

### Task 2 — users-block role/assignment immutability (G-R2) — commit d6adefc

Added `describe('users self-service rules', ...)` (3 `it` blocks) characterizing `firestore.rules` lines 35-56:
- Self-registration with `role:'admin'` → `assertFails`; non-admin role → `assertSucceeds`.
- Self-update changing `role`, `assignedProperties`, or `assignedDeals` → `assertFails`.
- Benign self-update (email only, role/assignments unchanged) → `assertSucceeds`; admin update of another user's role/assignments → `assertSucceeds`.

This is the explicit regression net for the Phase 6 / SEC-04 admin-email fallback removal (threat T-02R-01, Elevation of Privilege).

### Task 3 — deal-portal coverage for all six collections (G-R1) — commit 9acead5

Extended `seed()` with one doc per previously untested portal collection (`deal-parties/party-assigned`, `deal-channels/channel-assigned`, `deal-documents/document-assigned`, `deal-progress/progress-assigned`, `deal-lender-pushes/lender-push-assigned`), each tied to `deal-assigned`.

Added `describe('deal-portal collections', ...)`:
- **Write-open collections** (deal-parties/channels/documents/progress): read-allowed + create-allowed for `deal-assigned` + create-denied for `deal-other` + non-admin update/delete succeed (via `canAccessDeal`).
- **deal-lender-pushes** (admin-only mutate): read/create as assigned agent, create-denied for `deal-other`, non-admin update/delete `assertFails`, admin update `assertSucceeds`.

Covers threat T-02R-02 (Information Disclosure) breadth-wise, not just via deal-messages.

## Verification

Host-runnable gate (no Java required):
- `npx vitest list tests/rules` exits 0 and enumerates **15** collected test cases (7 original + 3 users + 5 deal-portal, the 5th being the dynamic forEach expansion of 4 write-open collections + 1 lender-pushes case).
- `grep -c "  it(" tests/rules/firestore.rules.test.js` literal count increased from 7 to 12 (the forEach yields 4 additional dynamic cases beyond the literal count; total collected = 15).
- `firestore.rules` confirmed unmodified (`git diff --stat firestore.rules` empty) across all tasks.

Every new assertion was traced by hand against the on-disk `firestore.rules` (users match block lines 35-56; `canAccessDeal()` + the six portal match blocks lines 91-136) to confirm it will pass on the emulator.

## Environment Constraint (expected, not a failure)

- **Host Java version observed:** `openjdk 1.8.0_402` (Temurin). The Firestore emulator invoked by `npm run test:rules` requires **Java 21** (firebase-tools 15.x). Per 02-RESEARCH.md Pitfall 1 and 02-PATTERNS.md environmental notes, the emulator suite **cannot** run to green on this host. No Java install was attempted (out of scope).
- **Authoritative TEST-01 pass is delegated to CI** (`.github/workflows/ci.yml` provisions temurin 21 via `actions/setup-java@v4`) or a local JDK 21. This is the Manual-Only verification already recorded in 02-VALIDATION.md's "Manual-Only Verifications" table. Per the plan's explicit instruction, the plan is NOT marked failed for the local emulator gap — it is the documented, expected constraint.

## Deviations from Plan

None — plan executed exactly as written. `firestore.rules` was read-only throughout; no packages installed; no new files created.

## Known Stubs

None.

## Threat Flags

None — no new security surface introduced. All changes are test-only assertions against the existing on-disk rules.

## Self-Check: PASSED

- FOUND: tests/rules/firestore.rules.test.js (modified, parses, 15 cases collected)
- FOUND: commit d6adefc (Task 2)
- FOUND: commit 9acead5 (Task 3)
- CONFIRMED: firestore.rules unmodified
