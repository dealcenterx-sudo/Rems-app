---
phase: 06-firestore-rules-hardening
plan: 02
subsystem: docs/security
tags: [firestore-rules, access-model, trust-boundaries, SEC-05]
requires:
  - firestore.rules (post-SEC-04 catch-all removal, delivered in 06-01)
provides:
  - documented per-collection Firestore access matrix (SEC-05)
affects:
  - docs/TRUST_BOUNDARIES.md
tech-stack:
  added: []
  patterns:
    - "Access model expressed twice: tested firestore.rules + prose matrix, kept in lockstep"
key-files:
  created: []
  modified:
    - docs/TRUST_BOUNDARIES.md
decisions:
  - "Extended the existing TRUST_BOUNDARIES.md Firestore Rules section rather than creating a standalone doc — preserves single source of truth and keeps the Phase-4 machine-checked coverage intact"
  - "Matrix rows grouped by identical rule shape (contacts/leads/documents/campaigns share one row; deal-* split into portal vs record collections)"
metrics:
  duration: ~2m
  completed: 2026-07-13
  tasks: 1
  files: 1
status: complete
---

# Phase 6 Plan 2: Firestore Access-Model Documentation (SEC-05) Summary

Extended the `## Firestore Rules` section of `docs/TRUST_BOUNDARIES.md` with a per-collection access matrix (`Collection | Read | Create | Update | Delete | Why`) derived from and matching the tested `firestore.rules`, making the append-only-against-admin guarantee (the SEC-04 fix) explicit in prose.

## What Was Built

- Kept the existing five intro bullets under `## Firestore Rules` and added a short lead-in paragraph explaining the model's foundations: admin authority via `role == 'admin'` on the caller's user doc (not an email literal), ownership via the `userId` field, limited non-owner access via `assignedProperties` / `assignedDeals`, portal inheritance via `canAccessDeal()`, and the absence of an admin catch-all.
- Added a 10-row markdown pipe table matching the serverless endpoint table idiom already in the doc. Rows: `users`; `contacts`/`leads`/`documents`/`campaigns`; `deals`; the four symmetric `deal-*` portal collections; the two record-style `deal-messages`/`deal-lender-pushes`; `properties`; `tasks`; `notifications`; `activity_log`; `companies`.
- The `activity_log` row states Read = admin, Create = signed-in as self, Update = nobody (incl. admin), Delete = nobody (incl. admin) — the tamper-evident guarantee established by SEC-04.

## Verification

- `grep` header/append-only/delete-media checks: all pass.
- No admin email literal in the doc (`grep -in dealcenterx` empty).
- `npm run test:api`: 41 passed (4 files) — the trust-boundaries-audit test only pins `api/*.js` rows and auth-posture lines, all untouched.
- `npm run check:constants`: OK — admin email only in allowed locations.

Each matrix row was cross-checked against the authoritative `firestore.rules` (users L35-56, business collections L60-176, deal portal L105-136, properties L138-153, tasks L161-169, notifications L182-186, activity_log L191-195, companies L198-204).

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- FOUND: docs/TRUST_BOUNDARIES.md (modified, matrix present)
- FOUND: commit 959ca79
