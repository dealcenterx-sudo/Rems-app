---
phase: 6
slug: firestore-rules-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-13
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> HIGHEST-RISK phase: changes LIVE Firestore authorization. Every rules change is
> gated by emulator-green tests AND a production two-account smoke.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `@firebase/rules-unit-testing` emulator suite (`tests/rules/firestore.rules.test.js`) via `npm run test:rules` |
| **Config file** | firebase.json (emulator on 127.0.0.1:8080) |
| **Prerequisite** | JDK 21 — installed this session at `/usr/local/opt/openjdk@21`; run with `JAVA_HOME=/usr/local/opt/openjdk@21 npm run test:rules` |
| **Quick run command** | `JAVA_HOME=/usr/local/opt/openjdk@21 npm run test:rules` |
| **Full suite command** | `npm run check:constants && npm run lint && npm run test:ci && npm run test:api && JAVA_HOME=/usr/local/opt/openjdk@21 npm run test:rules && npm run build` |
| **Estimated runtime** | ~15s (rules emulator) |

---

## Sampling Rate

- **After every rules edit:** `JAVA_HOME=/usr/local/opt/openjdk@21 npm run test:rules` — MUST be green before any Console publish
- **Before AND after each Console publish:** rules tests green (emulator) + production two-account smoke (admin + non-admin)
- **Before `/gsd-verify-work`:** emulator green; SEC-05 access-model doc exists and matches tested rules
- **Max feedback latency:** 30 seconds (emulator)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-T1 | 06-01 | 1 | SEC-04 | T-06-01, T-06-04 | Admin write catch-all removed; activity_log `if false` is the only matching write rule | emulator rules / grep | `! grep -q 'document=**' firestore.rules` | ✅ firestore.rules | ⬜ pending |
| 06-01-T2 | 06-01 | 1 | SEC-04 | T-06-01, T-06-02 | Append-only enforced against admin (updateDoc/deleteDoc → assertFails) | emulator rules | `JAVA_HOME=/usr/local/opt/openjdk@21 npm run test:rules` (15/15) | ✅ tests/rules/firestore.rules.test.js | ⬜ pending |
| 06-02-T1 | 06-02 | 1 | SEC-05 | T-06D-01, T-06D-02 | Access matrix documents who reads/writes each collection, matching tested rules; secret-free | doc grep / audit test | `grep -q '| Collection | Read | Create | Update | Delete | Why |' docs/TRUST_BOUNDARIES.md && npm run test:api` | ✅ docs/TRUST_BOUNDARIES.md | ⬜ pending |
| 06-03-T1 | 06-03 | 2 | SEC-04 | T-06L-01, T-06L-04 | Prod `users/{adminUid}.role == 'admin'` verified before any publish (lockout gate) | manual-only (Console) | HUMAN — Console query, cannot be automated | ❌ HUMAN | ⬜ pending |
| 06-03-T2 | 06-03 | 2 | SEC-04 | T-06L-01, T-06L-02, T-06L-03 | Staged publish (emulator-green before each) + two-account smoke: admin CRUD ok, admin denied activity_log edit/delete, admin notification writes, non-admin scoped access intact | manual-only (Console + live login) | HUMAN — production smoke, cannot be automated | ❌ HUMAN | ⬜ pending |
| 06-03-T3 | 06-03 | 2 | SEC-04 | T-06L-05 | Phase 6 outcome recorded secret-free (AUDIT-03) | doc grep | `grep -qi 'SEC-04\|catch-all' docs/SAAS_UPGRADE_CHANGELOG.md` | ✅ docs/SAAS_UPGRADE_CHANGELOG.md | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Flip the `activity_log` characterization test's two admin assertions from `assertSucceeds` back to `assertFails` (the append-only-against-admin guarantee, once the catch-all is removed) — `tests/rules/firestore.rules.test.js`
- [ ] Confirm the emulator suite is green under JDK 21 at baseline before editing

*Research empirically verified: removing the `match /{document=**}` catch-all + flipping those assertions → 15/15 green, zero blast radius on the 16 app collections.*

---

## Manual-Only Verifications (LIVE — highest risk)

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| **Lockout gate** — prod admin has `role: 'admin'` | SEC-04 | Only the operator can read production Firestore | Firebase Console → Firestore → `users/{adminUid}` → confirm `role == 'admin'` EXISTS before publishing role-only rules |
| **Inspect LIVE Console rules** | SEC-04 | Console state ≠ git; only operator can see it | Firebase Console → Firestore → Rules → note whether the live rules still grant admin by email (decides if an additive bridge publish is needed) |
| **Staged Console publish** (additive-then-subtractive) | SEC-04 | Rules are NOT deployed from git; manual paste + Publish | Paste the staged rules (pbcopy offered) into Console → Rules → Publish, in the planned order |
| **Two-account production smoke** after each publish | SEC-04 | Requires real admin + non-admin logins on prod | After each publish: admin account performs admin actions; non-admin account confirms its normal access + is denied admin-only paths. No regressions. Include the `notifications` create edge case. |

---

## Validation Sign-Off

- [ ] Every rules edit gated by emulator-green tests before any publish
- [ ] No Console publish without the lockout gate confirmed first
- [ ] Two-account smoke after each publish
- [ ] SEC-05 access-model doc matches the tested rules
- [ ] No watch-mode flags
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
