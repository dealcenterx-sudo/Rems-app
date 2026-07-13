---
phase: 06-firestore-rules-hardening
plan: 01
subsystem: database
tags: [firestore, firestore-rules, security, audit-log, emulator, vitest]

# Dependency graph
requires:
  - phase: 02
    provides: "Phase-2 characterization test documenting the admin catch-all audit-log tamper gap"
provides:
  - "firestore.rules with the match /{document=**} admin write catch-all removed (SEC-04 local half)"
  - "activity_log append-only guarantee now holds against the admin account (allow update, delete: if false is the only matching write rule)"
  - "Emulator rules suite (15/15) that ASSERTS append-only-against-admin via assertFails"
  - "Emulator-green firestore.rules artifact ready for the LIVE Console publish in 06-03"
affects: [06-03-live-console-publish, trust-boundaries-doc, audit-log-integrity]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OR-semantics: security by NOT matching (remove broad allow) rather than adding a narrower deny"
    - "Local rules verification via Firestore emulator under JDK 21 (JAVA_HOME=/usr/local/opt/openjdk@21)"

key-files:
  created: []
  modified:
    - firestore.rules
    - tests/rules/firestore.rules.test.js

key-decisions:
  - "Removed the catch-all rather than adding an explicit activity_log deny — in Firestore a deny cannot override an allow in another match, so deletion is the only correct fix"
  - "Left notifications block (L182-186) byte-for-byte unchanged; its admin create edge case is deferred to the live smoke in 06-03 per RESEARCH Pitfall 3"
  - "No Console publish attempted here — that is plan 06-03; this plan only produces the emulator-green artifact"

patterns-established:
  - "OR-semantics of Firestore rules: authorization is the union of matching allows; achieve deny by ensuring no rule matches"
  - "Rules edits are verified locally on the emulator (JDK 21) before any manual Console publish"

requirements-completed: [SEC-04]

coverage:
  - id: D1
    description: "The match /{document=**} admin write catch-all is removed from firestore.rules; file still parses (balanced braces) and every app collection retains its explicit isAdmin() rule"
    requirement: "SEC-04"
    verification:
      - kind: unit
        ref: "grep -q 'document=**' firestore.rules (returns nothing) + node brace-balance check (47/47) + 34 'if isAdmin' rules retained"
        status: pass
    human_judgment: false
  - id: D2
    description: "The activity_log append-only guarantee holds against admin: emulator suite is 15/15 green and the activity_log test asserts admin update/delete are DENIED (assertFails)"
    requirement: "SEC-04"
    verification:
      - kind: integration
        ref: "tests/rules/firestore.rules.test.js#allows admin reads but enforces append-only against admin (catch-all removed — SEC-04) — via JAVA_HOME=/usr/local/opt/openjdk@21 npm run test:rules"
        status: pass
    human_judgment: false
  - id: D3
    description: "LIVE Console publish of the hardened rules + two-account smoke (admin CANNOT edit/delete activity_log against live rules)"
    verification: []
    human_judgment: true
    rationale: "Only a live signed-in account against published Console rules proves the guarantee in production; not automatable and explicitly deferred to plan 06-03"

# Metrics
duration: 2min
completed: 2026-07-13
status: complete
---

# Phase 6 Plan 01: Firestore Rules Hardening (SEC-04 local half) Summary

**Removed the `match /{document=**}` admin write catch-all from firestore.rules so the audit trail is now tamper-evident against admin, and flipped the Phase-2 characterization test to assert append-only-against-admin — emulator suite 15/15 green.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-07-13T08:11:37Z
- **Completed:** 2026-07-13T08:12:54Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Deleted the recursive-wildcard admin write catch-all (`match /{document=**} { allow read, write: if isAdmin(); }`), closing the HIGH audit-integrity tamper vector found in Phase 2 — `activity_log`'s `allow update, delete: if false` is now the only matching write rule, so an admin can no longer edit or delete audit entries.
- Flipped the Phase-2 characterization test from asserting the bug (`assertSucceeds` on admin update/delete) to asserting the guarantee (`assertFails`), and rewrote its title and comment to state that append-only now HOLDS against admin.
- Confirmed the Firestore emulator rules suite is 15/15 green (baseline AND after the change) under JDK 21 — the exact combination RESEARCH verified this session, reproduced with zero blast radius.

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove the match /{document=**} admin write catch-all from firestore.rules** - `946cc2d` (fix)
2. **Task 2: Flip the activity_log characterization test to assert append-only against admin** - `476c313` (test)

_Note: Task 2 was a rules-verification test flip; the intermediate RED (test still expecting admin writes to succeed after Task 1's edit) was resolved to GREEN by the flip, verified on the emulator._

## Files Created/Modified
- `firestore.rules` - Removed the 4-line `// ---------- everything else ----------` / `match /{document=**}` catch-all block; outer braces and all 16 per-collection admin rules intact; `isAdmin()` (role-only), `activity_log`, and `notifications` blocks unchanged.
- `tests/rules/firestore.rules.test.js` - In the `activity_log append-only` test: updated title, replaced the CHARACTERIZATION comment with the guarantee, and flipped both admin `updateDoc`/`deleteDoc` assertions from `assertSucceeds` to `assertFails`. Read assertions and the sibling append/forge test unchanged.

## Decisions Made
- Removed the catch-all rather than adding a narrower deny — Firestore ORs allows across match blocks, so a deny cannot override an allow; security is achieved by NOT matching.
- Left the `notifications` block untouched (RESEARCH Pitfall 3) — the admin-create-on-behalf edge case is deferred to the live smoke in 06-03.
- Did NOT attempt any Firebase Console publish; the live publish + two-account smoke are plan 06-03 and gated on this plan being emulator-green.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Baseline emulator run was 15/15 green under JDK 21; post-change run was 15/15 green with the flipped assertions.

## User Setup Required
None - no external service configuration required in this plan. The hardened `firestore.rules` must still be published to the Firebase Console (via pbcopy → Console → Rules → Publish) — that is a separate human-only step in plan 06-03.

## Next Phase Readiness
- The emulator-green `firestore.rules` is the exact artifact plan 06-03 will paste into the Firebase Console.
- Live publish + two-account smoke (admin CANNOT edit/delete `activity_log`; admin-emitted notification still works) remain as the LIVE/HUMAN half of SEC-04 in 06-03.
- No blockers.

---
*Phase: 06-firestore-rules-hardening*
*Completed: 2026-07-13*

## Self-Check: PASSED
- FOUND: firestore.rules
- FOUND: tests/rules/firestore.rules.test.js
- FOUND: .planning/phases/06-firestore-rules-hardening/06-01-SUMMARY.md
- FOUND commit: 946cc2d (Task 1)
- FOUND commit: 476c313 (Task 2)
