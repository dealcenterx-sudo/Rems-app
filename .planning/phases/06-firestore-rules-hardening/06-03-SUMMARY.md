---
phase: 06-firestore-rules-hardening
plan: 03
subsystem: database/security
tags: [firestore-rules, security, audit-log, live-publish, console, SEC-04, SEC-05, AUDIT-03]

# Dependency graph
requires:
  - phase: 06
    provides: "Emulator-green firestore.rules artifact (catch-all removed, role-only isAdmin) from 06-01"
  - phase: 06
    provides: "Per-collection Firestore access matrix in docs/TRUST_BOUNDARIES.md from 06-02"
provides:
  - "Hardened Firestore rules PUBLISHED live to the production Console (role-only isAdmin, no email, no catch-all) — SEC-04 fully closed"
  - "activity_log confirmed append-only against the admin account in production (two-account smoke)"
  - "Phase 6 verification entry recorded in docs/SAAS_UPGRADE_CHANGELOG.md (AUDIT-03)"
affects: [audit-log-integrity, trust-boundaries-doc, phase-8-trust-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Staged Console rules publish: additive (role OR email) bridge, then subtractive (role-only) cutover to eliminate the admin-lockout window"
    - "Two-account production smoke (admin + non-admin) as the sole live verification of published Firestore rules"

key-files:
  created:
    - .planning/phases/06-firestore-rules-hardening/06-03-SUMMARY.md
  modified:
    - docs/SAAS_UPGRADE_CHANGELOG.md

key-decisions:
  - "Live Console rules were still EMAIL-based at Stage 0, so an additive-then-subtractive two-step bridge was used instead of a direct cutover — no lockout window"
  - "The additive role-OR-email bridge was a Console-only interim, never committed to git; only the final role-only firestore.rules artifact is in the repo"
  - "notifications block left unchanged — the admin-emitted notification wrote successfully in the live smoke, so no isAdmin() create branch was needed (RESEARCH Pitfall 3 resolved as no-op)"

patterns-established:
  - "Firebase rules deploy is a manual Console paste; git and Console can drift — only a live publish + two-account smoke closes the gap"
  - "Lockout gate (verify prod users/{adminUid}.role) MUST precede any role-only rules publish"

requirements-completed: [SEC-04, SEC-05]

coverage:
  - id: T1
    description: "Lockout gate — production users/{adminUid}.role == 'admin' verified for every admin account; live Console rules state recorded (email-based); GO decision"
    requirement: "SEC-04"
    verification:
      - kind: manual
        ref: "Operator confirmed in Firebase Console -> Firestore -> users that the admin doc carries role: 'admin'; live rules confirmed email-based at Stage 0 -> go-bridge"
        status: pass
    human_judgment: true
    rationale: "Only the operator with production Console access can read live role data and inspect the published rules"
  - id: T2
    description: "Staged Console publish (additive bridge, then subtractive role-only + catch-all-removed) + two-account production smoke after each publish — no regressions, admin denied activity_log edit/delete, admin-emitted notification still writes"
    requirement: "SEC-04"
    verification:
      - kind: manual
        ref: "Stage A additive bridge smoke PASSED; Stage B final role-only publish smoke PASSED — admin full access via role doc only, non-admin unaffected, activity_log tamper-proof, notification create works"
        status: pass
    human_judgment: true
    rationale: "Only a live signed-in admin + non-admin account against the published Console rules proves live authorization; not automatable"
  - id: T3
    description: "Phase 6 outcome recorded in docs/SAAS_UPGRADE_CHANGELOG.md (AUDIT-03) — local artifacts + live publish/smoke result, no admin email literal"
    requirement: "SEC-04"
    verification:
      - kind: unit
        ref: "grep -qi 'firestore rules hardening|SEC-04|SEC-05' && grep -q 'firestore.rules' && grep -qi 'catch-all|activity_log' -> CHANGELOG_UPDATED; npm run check:constants OK"
        status: pass
    human_judgment: false

# Metrics
duration: ~6min
completed: 2026-07-13
status: complete
---

# Phase 6 Plan 03: Firestore Rules Hardening — LIVE Half + Changelog (SEC-04) Summary

**The hardened Firestore rules are now ENFORCED in production: the lockout gate returned GO, a staged additive-then-subtractive Console publish landed the role-only rules without an admin lockout, and a two-account smoke passed — admin is authorized by the role document only and `activity_log` is append-only even against the admin. The Phase 6 outcome is recorded in the changelog (AUDIT-03).**

## Performance

- **Duration:** ~6 min (autonomous half; live half driven interactively by the orchestrator)
- **Tasks:** 3 (T1 lockout gate — live; T2 staged publish + smoke — live; T3 changelog — autonomous)
- **Files modified:** 1 (`docs/SAAS_UPGRADE_CHANGELOG.md`)

## Accomplishments

- **Task 1 — Lockout gate: GO.** Operator confirmed in the Firebase Console that the admin account's `users/{uid}` doc carries `role: 'admin'` (all admin accounts enumerated). The live Console rules were confirmed still EMAIL-based at Stage 0 → an additive-then-subtractive bridge was selected (go-bridge) to remove any lockout window.
- **Task 2 — Staged Console publish + two-account smoke: PASSED (both stages).**
  - **Stage A (additive bridge):** published interim rules where `isAdmin()` accepts role OR legacy email (catch-all already removed). Smoke PASSED — admin retained full access with the role path verified live while email was still a fallback; non-admin unaffected. The bridge was a Console-only edit, never committed to git.
  - **Stage B (subtractive final):** published the final hardened `firestore.rules` (role-only `isAdmin()`, no email, no `match /{document=**}` catch-all — the emulator-verified 15/15 git artifact via `cat firestore.rules | pbcopy`). Smoke PASSED — admin retains full access via the role doc ONLY, non-admin scoped access unaffected, an admin-emitted notification still writes (edge case is a no-op), and the app can no longer edit/delete `activity_log` (tamper-proof, incl. against admin).
- **Task 3 — Changelog (AUDIT-03):** appended a "Phase 6 - Firestore Rules Hardening Verification" entry recording the local artifacts (firestore.rules edit + flipped test, emulator 15/15 under JDK 21; TRUST_BOUNDARIES.md access matrix) and the live outcome (two-stage publish + two-account smoke passed; admin authorized by role doc only; activity_log tamper-proof). No admin email literal; `npm run check:constants` green.

## Task Commits

1. **Task 3: Record the Phase 6 verification outcome in the changelog** - `e3f254c` (docs)

_Tasks 1 and 2 are human-verify checkpoints performed live by the operator this session (no code artifact — their outcomes are the GO decision and the two-stage smoke PASS recorded above and in the changelog)._

## Files Created/Modified

- `docs/SAAS_UPGRADE_CHANGELOG.md` - Added the Phase 6 verification (AUDIT-03) entry: what/why/files/commands/results/risks, covering both SEC-04 (catch-all removed + live role-only publish) and SEC-05 (access matrix), with the live lockout-gate GO and two-stage smoke PASS. Identity referenced by NAME only — no admin email literal.

## Decisions Made

- Live rules were EMAIL-based at Stage 0, so an additive-then-subtractive bridge was used (not a direct cutover) — the interim `role OR email` union kept the admin in during the cutover and was published Console-only, never committed.
- `notifications` block left unchanged — the admin-emitted notification wrote successfully in the live smoke, so the flagged create edge case (RESEARCH Pitfall 3) resolved as a no-op; no `isAdmin()` create branch was added.
- This phase is legitimately marked complete/passed: unlike the Phase 3/4 external halves (deferred pending Vercel-only credentials), the Phase 6 live verification needed only Console access + real logins, which were available and actually exercised this session.

## Deviations from Plan

None - plan executed as written. The optional additive bridge (Stage A) was used because Task 1 returned go-bridge (live rules were still email-based), exactly as the plan specified for that branch.

## Issues Encountered

None. Both smoke stages passed with no access regressions; the notifications create edge case did not fire.

## User Setup Required

None outstanding. The live Console publish (the only deploy path for Firestore rules) was completed this session.

## Next Phase Readiness

- SEC-04 and SEC-05 are both fully closed — production enforces admin by role document only, and `activity_log` is append-only against every account including admin.
- The append-only + rules-enforced-isolation guarantees are now safe to cite on the Phase 8 trust page ("How REMS protects your data").
- No blockers. Phase 6 is complete.

---
*Phase: 06-firestore-rules-hardening*
*Completed: 2026-07-13*

## Self-Check: PASSED

- FOUND: docs/SAAS_UPGRADE_CHANGELOG.md (Phase 6 verification entry present)
- FOUND: .planning/phases/06-firestore-rules-hardening/06-03-SUMMARY.md
- FOUND commit: e3f254c (Task 3)
