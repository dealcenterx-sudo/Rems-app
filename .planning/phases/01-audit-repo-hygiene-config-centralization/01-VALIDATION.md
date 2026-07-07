---
phase: 1
slug: audit-repo-hygiene-config-centralization
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-06
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest (via react-scripts 5) |
| **Config file** | package.json (`eslintConfig` + CRA defaults) |
| **Quick run command** | `npm run test:ci` |
| **Full suite command** | `npm run lint && npm run test:ci && npm run build` |
| **Estimated runtime** | ~120 seconds (full); ~30 seconds (quick) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:ci`
- **After every plan wave:** Run `npm run lint && npm run test:ci && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

*To be filled by the planner — one row per task, mapping AUDIT-01..04 and HYG-01..05 to automated commands (grep constants check, jest, build) or manual verification.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01 | 1 | HYG-04, HYG-05 | T-01-C1 | Single source of truth for constants | unit | `node -e "require('./api/_lib/config')"` + grep exports in src/config.js | ✅ | ⬜ |
| 01-01-T2 | 01 | 1 | HYG-04 | T-01-C1 | Behavior-preserving literal swap; test tracks real constant | unit | `npm run test:ci` | ✅ | ⬜ |
| 01-01-T3 | 01 | 1 | HYG-04, HYG-05 | T-01-C1, T-01-C2 | CI grep gate bites on planted literal; key from env | unit (script) | `npm run check:constants` + sabotage test + `grep -c AIzaSy api/send-email.js`→0 | ✅ (deliverable) | ⬜ |
| 01-02-T1 | 02 | 2 | HYG-01, HYG-02 | T-01-SC | Stale artifacts removed, no history rewrite | smoke | `test ! -e rems-project-source-* && git ls-files screenshot.js` → 0 | n/a (deletion) | ⬜ |
| 01-02-CP | 02 | 2 | HYG-03 | T-01-H5 | Traffic-check before deploy | manual (Vercel) | User checks Vercel logs for /api/health traffic (D-07) | human-verify | ⬜ |
| 01-02-T2 | 02 | 2 | HYG-03 | T-01-H1, T-01-H2, T-01-H3 | Split response; identitytoolkit auth; no 401/403 leak | unit + manual | `node -e "require('./api/health.js')"` + grep identitytoolkit + no 401/403; post-deploy `curl .../api/health`→`{"status":"ok"}` | ✅ | ⬜ |
| 01-03-CP | 03 | 3 | AUDIT-02 | — | Confirm brief's 8 phase names | manual (user input) | User confirms/corrects reconstructed phase names | human-verify | ⬜ |
| 01-03-T1 | 03 | 3 | AUDIT-01, AUDIT-04 | T-01-D1, T-01-D2 | Candid audit; env vars by name only | smoke | `grep -q "Definition of Done" docs/SAAS_READINESS_AUDIT.md` + all 7 vars in ENVIRONMENT.md | ✅ | ⬜ |
| 01-03-T2 | 03 | 3 | AUDIT-02, AUDIT-03 | — | 8-phase mapping; Phase 1 changelog entry | smoke | `grep -qi "Phase 1" docs/SAAS_UPGRADE_CHANGELOG.md` + plan doc exists | ✅ | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — jest + CRA test runner already in place; the constants grep check is added by this phase itself.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Unauthenticated `/api/health` returns 401 in production | HYG-04 | Deployed Vercel endpoint | `curl -s -o /dev/null -w "%{http_code}" https://rems-app.vercel.app/api/health` → expect 401 |
| Vercel log check for `/api/health` traffic before gating (D-07) | HYG-04 | Requires Vercel dashboard access | User checks Vercel logs for external health-check consumers before the gating change ships |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
