---
phase: 02-test-scaffolding
plan: 03
subsystem: testing
tags: [ci, testing, docs, vitest, jest, firestore-emulator]
status: complete
requires:
  - "02-01: API characterization suite (tests/api, test:api)"
  - "02-02: Firestore rules suite (tests/rules, test:rules)"
provides:
  - "docs/TESTING.md: documented test lanes and local-run prerequisites"
  - "Verified TEST-03: CI wiring + CRA-Jest isolation contract"
affects:
  - "docs/ (new TESTING.md)"
tech-stack:
  added: []
  patterns:
    - "CRA-Jest isolation via roots=<rootDir>/src; Vitest owns tests/"
key-files:
  created:
    - docs/TESTING.md
  modified: []
decisions:
  - "Task 1 is verification-only: the shipped CI/isolation contract (commit dd6364a) was confirmed, not rewritten — no source changes to commit"
  - "docs/TESTING.md cross-references ci.yml and ENVIRONMENT.md rather than duplicating env-var content"
metrics:
  duration: ~6min
  completed: 2026-07-13
  tasks: 2
  files: 1
---

# Phase 2 Plan 3: CI Verification & Testing Docs Summary

Verified TEST-03 (CI runs the two new Vitest suites alongside the existing
check:constants → lint → test:ci → build pipeline without disturbing CRA's Jest)
and authored the new `docs/TESTING.md` documenting the three test lanes, the
CRA-Jest isolation invariant, and the Java 21 + clean-`npm ci` local-run
prerequisites.

## What Was Built

- **docs/TESTING.md** (new): documents the three test lanes (`test:ci` CRA Jest
  over `src/`; `test:api` Vitest over `tests/api`; `test:rules` emulator-backed
  Vitest over `tests/rules`), the CRA-Jest isolation invariant (roots locked to
  `src/`), the Java 21 prerequisite for the emulator suite (CI is the
  authoritative proof), and the clean-`npm ci` fix for the Vitest rolldown
  native-binding architecture artifact. Cross-references `ci.yml` as the source
  of truth for CI step order.

## Verification Results

### Task 1 — CI wiring & CRA-Jest isolation (verification-only, no commit)

| Check | Result |
|---|---|
| `CI=true npm run test:ci` | PASS — 29/29, 3 suites, all under `src/` (no `tests/` file swept) |
| CRA Jest resolved `roots` | `["<rootDir>/src"]` — `tests/` structurally out of scope |
| ci.yml runs `npm run test:api` | Present (line 46), after `test:ci` (line 41), before `build` (line 52) |
| ci.yml runs `npm run test:rules` | Present (line 49), after `test:ci`, before `build` |
| ci.yml Setup Java | `distribution: temurin`, `java-version: 21` (lines 25-29) |
| Build step `CI: false` parity comment | Intact — not modified |
| package.json `test:ci` frozen | Exactly `react-scripts test --watchAll=false` |
| package.json / ci.yml modified | No — verification-only |

No wiring gap found. The shipped contract (commit dd6364a) holds after the
plan-01 and plan-02 deepenings.

### Task 2 — docs/TESTING.md

| Check | Result |
|---|---|
| docs/TESTING.md exists, references all three scripts | PASS |
| Documents Java 21 prerequisite + CI as authoritative proof | PASS |
| Documents clean-`npm ci` fix for rolldown binding | PASS |
| Documents CRA-Jest isolation invariant | PASS |
| `npm run check:constants` | PASS (green — no disallowed admin-email literal) |

## Threat Model Compliance

- **T-02C-01** (CI wiring tampering): mitigated — both suite steps confirmed present and correctly ordered.
- **T-02C-02** (CRA-Jest isolation regression): mitigated — `test:ci` confirmed frozen, sweeps only `src/`; invariant recorded in docs/TESTING.md.
- **T-02C-03** (docs info disclosure): mitigated — no secrets/admin-email literal in the doc; `check:constants` green.
- **T-02C-SC** (supply chain): n/a — no packages installed.

## Deviations from Plan

None — plan executed exactly as written. Task 1 was verification-only by design
(reconcile-and-verify phase) and produced no committable source changes.

## Commits

- `37979fb` — docs(02-03): document test lanes, CRA-Jest isolation, and local-run prerequisites

## Self-Check: PASSED

- FOUND: docs/TESTING.md
- FOUND: commit 37979fb
