---
phase: 2
slug: test-scaffolding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | CRA Jest (`src/` unit tests) + Node test runner/Vitest for `tests/api/*.mjs` + `@firebase/rules-unit-testing` for `tests/rules/*` (emulator) |
| **Config file** | package.json (CRA Jest `roots` locked to `<rootDir>/src`); firebase.json (emulator) |
| **Quick run command** | `npm run test:api` |
| **Full suite command** | `npm run check:constants && npm run lint && npm run test:ci && npm run test:api && npm run build` |
| **Estimated runtime** | ~30s (api) / ~120s (full without rules) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:api`
- **After every plan wave:** Run `npm run lint && npm run test:ci && npm run test:api`
- **Before `/gsd-verify-work`:** Full suite green; `test:rules` green in an environment with Java 21 (CI, or local JDK 21)
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

*To be filled by the planner — one row per task, mapping TEST-01..03 to automated commands.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — the test suites, firebase.json, and CI wiring already exist (shipped in dd6364a). This phase reconciles and verifies them; no new framework install is required beyond a correct `npm ci` (fixes the rolldown native-binding arch artifact noted in research).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npm run test:rules` passes emulator-backed rules tests | TEST-01 | Firestore emulator requires Java 21; this dev host has Java 8 | Run in an environment with JDK 21 (CI provisions it), or install JDK 21 locally, then `npm run test:rules` → all `it` blocks pass |
| CI runs both new suites alongside lint→test→build | TEST-03 | Requires observing an actual CI run | Confirm a green GitHub Actions run executes `test:api` and `test:rules` in addition to lint/test:ci/build |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
