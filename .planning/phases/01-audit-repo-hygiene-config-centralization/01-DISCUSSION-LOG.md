# Phase 1: Audit, Repo Hygiene & Config Centralization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-06
**Phase:** 1-Audit, Repo Hygiene & Config Centralization
**Areas discussed:** Audit doc depth & candor, health.js disposition, Config centralization scope, screenshot.js & archive

---

## Audit doc depth & candor

**Q1: Primary reader and tone of SAAS_READINESS_AUDIT.md?**

| Option | Description | Selected |
|--------|-------------|----------|
| Showcase artifact (Recommended) | Written for outside evaluators; professional, structured, demonstrates engineering judgment — the audit itself is part of the showcase | ✓ |
| Internal working doc | Blunt engineering notes optimized for driving the work | |
| Hybrid | Polished exec summary up top, raw dense findings below | |

**Q2: How candid about unfixed security weaknesses in a public repo?**

| Option | Description | Selected |
|--------|-------------|----------|
| Full candor + status (Recommended) | Name every finding with file references, severity, live remediation status column | ✓ |
| Classes, not exploits | Weakness categories without file paths | |
| Publish after fixes | Summarize risk findings until phases land, expand retroactively | |

**Q3: Audit depth?**

| Option | Description | Selected |
|--------|-------------|----------|
| Concise + evidence (Recommended) | Tight exec summary, ~1 paragraph per area, findings table with severity/file:line/impact/fix; ~8–12 pages | ✓ |
| Exhaustive deep-dive | Long-form analysis with code excerpts and diagrams | |
| Minimal checklist | Findings table plus short roadmap only | |

**Q4: How does the audit stay truthful as phases fix findings?**

| Option | Description | Selected |
|--------|-------------|----------|
| Living status column (Recommended) | Each finding: Open / In progress / Fixed in Phase N; updated per phase as a standing task | ✓ |
| Dated snapshot | Frozen as of Phase 1; changelog tracks remediation | |
| You decide | Claude picks | |

---

## health.js disposition

**Q1: Is anything external hitting api/health.js today?**

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing external uses it | Only manual diagnostics calls | |
| Yes, something polls it | Uptime monitor or external service | |
| Not sure | Check Vercel logs for recent GET traffic before gating | ✓ |

**Q2: Endpoint shape after Phase 1?**

| Option | Description | Selected |
|--------|-------------|----------|
| Split: public ok + admin detail (Recommended) | Unauthenticated GET → bare `{ status: 'ok' }`; admin Firebase ID token → config-presence diagnostics | ✓ |
| Admin-only, 401 otherwise | No unauthenticated response beyond 401 | |
| Remove entirely | Delete the endpoint | |

**Q3: Who checks for existing health.js traffic before shipping?**

| Option | Description | Selected |
|--------|-------------|----------|
| You check Vercel dashboard (Recommended) | Execution pauses; user checks Vercel → Logs for /api/health; result recorded as audit finding | ✓ |
| Claude tries Vercel CLI | Pull logs via authenticated CLI, fall back to asking | |
| Skip the check | Ship on the assumption the public-ok response is backward-safe | |

**Q4: What does the admin-authenticated detail response include?**

| Option | Description | Selected |
|--------|-------------|----------|
| Same flags as today (Recommended) | Boolean presence flags for RESEND/FIREBASE/LEAD_INTAKE + admin-SDK init status, just gated | ✓ |
| Expanded diagnostics | Add commit SHA, deploy time, reachability checks | |
| You decide | Minimal unless expansion is trivial | |

---

## Config centralization scope

**Q1: What moves into src/config.js and api/_lib/config.js in Phase 1?**

| Option | Description | Selected |
|--------|-------------|----------|
| Admin email + obvious siblings (Recommended) | Admin email, roles list, send-email.js Firebase API key (env-var read); Cloudinary stays in src/utils/cloudinary.js | ✓ |
| Broad constants sweep | Also cache TTLs, collection names, magic strings | |
| Admin email only | Strictest minimal reading of HYG-04 | |

**Q2: Where does env-var documentation live?**

| Option | Description | Selected |
|--------|-------------|----------|
| docs/ENVIRONMENT.md (Recommended) | Dedicated reference file; later phases append; audit and changelog link to it | ✓ |
| Section in the audit | Inside SAAS_READINESS_AUDIT.md | |
| In the changelog | Part of Phase 1's changelog entry | |

**Q3: How to sequence the Firebase API key move without breaking production?**

| Option | Description | Selected |
|--------|-------------|----------|
| Env var with fallback (Recommended) | `process.env.FIREBASE_API_KEY` falls back to current literal in api/_lib/config.js; zero deploy risk | ✓ |
| Hard cutover | Env var only; pause until Vercel variable confirmed set | |
| You decide | Claude picks the sequencing that keeps main shippable | |

**Q4: How is the CI grep check wired?**

| Option | Description | Selected |
|--------|-------------|----------|
| npm script + CI step (Recommended) | `npm run check:constants` (scripts/check-constants.js) run locally and in CI | ✓ |
| CI-only grep step | Grep line directly in ci.yml | |
| You decide | Cleanest fit for existing ci.yml | |

---

## screenshot.js & archive

**Q1: screenshot.js — still used?**

| Option | Description | Selected |
|--------|-------------|----------|
| Delete it (Recommended) | Hardcoded /root/... paths can't run locally; Phase 8 takes fresh screenshots; recoverable from git history | ✓ |
| Move to scripts/, parameterize | Keep as working tooling with CLI args | |
| Not sure — keep safe | Move to scripts/ untouched, decide in Phase 8 | |

**Q2: Anything needed from rems-project-source-2026-04-09/ before git rm?**

| Option | Description | Selected |
|--------|-------------|----------|
| Purely stale — remove (Recommended) | Plain git rm, no history rewrite; recoverable from git history | ✓ |
| Check before removing | Diff archive against current source first | |
| Keep a local copy | Copy outside the repo before git rm | |

*(Area closed after two questions — the remaining hygiene items are fully specified by HYG-01/HYG-02.)*

---

## Claude's Discretion

- Exact structure/section ordering of the three docs (within the required sections)
- Admin-verification implementation in api/health.js (reuse send-email.js pattern vs firebase-admin verifyIdToken)
- Config module shape (constant names, export style) — follow existing conventions
- Implementation details of scripts/check-constants.js

## Deferred Ideas

- Expanded health diagnostics (commit SHA, deploy time, reachability) — revisit with Phase 3 observability
- Broad constants sweep (cache TTLs, collection names, magic strings) — Phase 7 covers the styling-token side
