---
phase: 1
slug: audit-repo-hygiene-config-centralization
status: draft
nyquist_compliant: false
wave_0_complete: false
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
