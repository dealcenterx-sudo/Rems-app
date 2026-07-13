# REMS - Testing

## Overview

REMS runs three independent test lanes across two runners. This file documents
how to run each lane, the CRA-Jest isolation invariant that keeps them from
colliding, and the two local-run prerequisites (Java 21 for the emulator suite,
and a clean `npm ci` for the correct Vitest native binding). `.github/workflows/ci.yml`
is the source of truth for the CI step order; this doc explains how to reproduce
those lanes locally.

---

## Test Lanes

| Lane | Command | Runner | Scope | Notes |
|---|---|---|---|---|
| Unit / component | `npm run test:ci` | CRA Jest (`react-scripts`) | `src/` only | Frozen; the existing pipeline. Sweeps only `src/`. |
| API handlers | `npm run test:api` | Vitest | `tests/api` | In-process serverless-handler characterization tests. No Java, no emulator. |
| Firestore rules | `npm run test:rules` | Vitest under `firebase emulators:exec` | `tests/rules` | Emulator-backed rules tests. Requires JDK 21+ (see below). |

- `npm run test:ci` runs `react-scripts test --watchAll=false` — the standard
  Create React App unit/component suite.
- `npm run test:api` runs `vitest run tests/api` — fast, no external services.
- `npm run test:rules` runs `firebase emulators:exec --only firestore ... "vitest run tests/rules"` —
  boots the Firestore emulator, runs the rules suite against it, then tears the
  emulator down.

---

## CRA-Jest Isolation Invariant

`test:ci` (CRA Jest) is frozen: its resolved Jest `roots` is `<rootDir>/src`, so
it can only ever see tests under `src/`. The Vitest suites live under `tests/`
(structurally outside that root), so `npm run test:ci` never picks them up — the
two runners stay isolated.

Rules to preserve this invariant:

- Do **not** rename or repoint `test:ci`; keep it as `react-scripts test --watchAll=false`.
- New non-CRA tests (Vitest, emulator, integration) go under `tests/`, **never**
  under `src/`. Placing a Vitest file in `src/` would break the isolation by
  making CRA Jest attempt to run it.

---

## Local-Run Prerequisites

### Prerequisite 1 — Java 21 (for `test:rules`)

`npm run test:rules` boots the Firestore emulator via firebase-tools 15.x, which
requires JDK 21 or newer. On an older JDK the run aborts with an error stating
that firebase-tools no longer supports Java versions before 21.

- Install a JDK 21+ locally (for example, Temurin 21) and ensure it is the active
  `java` on your `PATH`. Check with `java -version`.
- CI provisions Temurin 21 automatically via `actions/setup-java`, so the
  emulator suite always runs there.
- When a local JDK 21 is unavailable, a green CI run is the authoritative proof
  for the emulator-backed rules suite.

### Prerequisite 2 — clean `npm ci` (for the Vitest native binding)

Vitest 4.x depends on a platform-specific rolldown native binding (a
`@rolldown/binding-*` optional dependency resolved by the package manager at
install time). A `node_modules` tree populated for a different CPU architecture
aborts Vitest with a `@rolldown/binding-*` module-not-found error.

- Fix with a clean install on the actual host: `npm ci`
  (or `rm -rf node_modules && npm install`). This lets npm resolve the correct
  binding for the host architecture.
- This is an environment artifact, not a repo defect — `package.json` and the
  lockfile already list every platform binding, and CI's fresh `npm ci` resolves
  the right one automatically.

---

## Notes

- `.github/workflows/ci.yml` is the source of truth for CI: it runs
  `check:constants` → `lint` → `test:ci` → `test:api` → `test:rules` → `build`,
  with Java 21 provisioned before the emulator suite.
- CI is the authoritative environment for the emulator-backed `test:rules` suite;
  local runs are for convenience and require the prerequisites above.
