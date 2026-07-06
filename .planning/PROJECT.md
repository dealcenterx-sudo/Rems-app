# REMS — SaaS Professionalization Upgrade

## What This Is

REMS (Real Estate Management System) is a live real estate CRM / operations platform for Deal Tech — a working product at https://rems-app.vercel.app/ serving admins, agents, buyers, and sellers. This milestone upgrades it from "functional app" to "professional-grade B2B SaaS": audited, polished, secure, documented, and confidently demoable to investors, customers, recruiters, or a technical reviewer.

## Core Value

The product must feel and function like a serious production SaaS — every major flow polished, secured server-side, and explainable — without breaking any current production workflow.

## Business Context

- **Customer**: Real estate agents/operators (internal users) + Deal Tech itself (REMS is a showcase of engineering capability)
- **Revenue model**: Showcase product / platform for Deal Tech's real estate operations
- **Success metric**: Can be confidently shown to investors, customers, recruiters, or a technical reviewer
- **Strategy notes**: Audit-first, controlled phases, no random redesigns; preserve dark UI + #00ff88 brand direction

## Requirements

### Validated

<!-- Inferred from existing codebase (see .planning/codebase/) — shipped and in production. -->

- ✓ Email/password + Google auth with role-based access (admin/agent/buyer/seller) — existing
- ✓ CRM core: contacts, leads, deals, properties, tasks, documents — existing
- ✓ Deal portal: parties, channels, messages, documents, progress, lender pushes — existing
- ✓ Analytics dashboard (Recharts) and home KPI dashboard — existing
- ✓ Firestore security rules with userId scoping, admin override, assignment-based access — existing
- ✓ Serverless API on Vercel (send-email via Resend, accept-invite, lead-intake, health) — existing
- ✓ Cloudinary media uploads (unsigned preset), react-pdf document preview — existing
- ✓ Audit trail via activity_log (append-only) — existing
- ✓ CI: lint → test → build on push/PR to main; auto-merge for claude/** branches — existing

### Active

<!-- This milestone. All are hypotheses until shipped and validated. -->

- [ ] SaaS Readiness Audit written to docs/SAAS_READINESS_AUDIT.md (exec summary, weaknesses by area, risk-ranked findings, roadmap, safe execution plan, Definition of Done)
- [ ] Upgrade plan written to docs/SAAS_UPGRADE_PLAN.md (8 phases, each with goal/files/tasks/risks/acceptance criteria/verification commands)
- [ ] Running changelog maintained at docs/SAAS_UPGRADE_CHANGELOG.md
- [ ] Repo hygiene: stray source archive removed, dev scripts relocated, temporary diagnostics endpoint removed or auth-gated
- [ ] UI/UX modernized to enterprise SaaS standard: consistent spacing/typography/hierarchy, empty/loading/error states, button consistency, responsive behavior — preserving dark + #00ff88 brand
- [ ] Public marketing landing page at the root explaining what REMS does, who it's for, and why it matters, with sign-in CTA (app moves behind it)
- [ ] Professional product copy throughout: dashboard labels, form helper text, error messages, empty states, onboarding text — no fluffy startup language
- [ ] Auth/authorization hardening: hardcoded admin email centralized, rules email-fallback removed when safe, server-side validation in api/ functions, documented trust boundaries
- [ ] Data/API reliability: required composite indexes created and documented, input validation in serverless functions, Cloudinary delete implemented or documented as deferred
- [ ] Infrastructure readiness: security headers, caching config, required env vars documented (names only), error tracking/observability recommendation implemented or documented
- [ ] Testing/QA: Firestore rules tests, API function tests, lint/test/build status known and documented
- [ ] Accessibility/performance: semantic HTML, focus states, contrast, keyboard nav, dashboard load behavior (SWR pattern for KPIs)
- [ ] Final polish pass: every major page feels intentional; acceptance criteria from the brief verified

### Out of Scope

- Framework migration (CRA → Vite/Next.js) — too disruptive for this milestone; document as future recommendation only
- Redux or other global state libraries — current local-state + Firebase pattern works; avoid unnecessary dependencies
- Rewriting the data model / renaming collections — backward compatibility required; no silent data-meaning changes
- Destructive cloud/DNS/database/production config changes — require explicit user approval per the brief
- New product features (new CRM capabilities) — this milestone professionalizes what exists
- Deleting working functionality — only with clearly documented reason and approval

## Context

- Live production app; Vercel auto-deploys from main. This milestone works on branch `saas-professionalization-upgrade` and merges to main after each verified phase.
- Codebase map at `.planning/codebase/` (STACK, INTEGRATIONS, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, CONCERNS).
- Known concerns from mapping: temporary env diagnostics endpoint (`api/health.js`) exposed; admin email hardcoded in 8+ files + firestore.rules; `rems-project-source-2026-04-09/` + `.zip` committed despite .gitignore; `screenshot.js` at root; 2,678-line CRMLeadDetailPage; no tests for Firestore rules or api/ functions; no error tracking; missing composite indexes trigger silent client-side filtering fallback; Cloudinary delete is a no-op TODO.
- Firestore rules are the enforcement layer; client permission checks are progressive enhancement. Rules changes require the user to paste into Firebase Console manually (offer pbcopy).
- Admin: dealcenterx@gmail.com. Buyers/sellers get a client shell (Home, Deals, Properties, Settings).

## Constraints

- **Tech stack**: React 19 + CRA (react-scripts 5), Firebase, Cloudinary, Vercel — keep; no framework migration
- **Brand**: Dark UI, near-black background, #00ff88 accent, design tokens in src/App.css :root — preserve direction
- **Compatibility**: Backward-compatible changes only unless explicitly approved; do not break Google sign-in or email/password auth
- **Security**: No secrets in code or docs (variable names only); no destructive cloud/db changes without asking
- **Process**: Audit before implementation; build + lint + tests before shipping significant changes; small reviewable changes over rewrites
- **Deployment**: Per-phase merge to main deploys production — each phase must leave main shippable

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Work on `saas-professionalization-upgrade` branch, merge to main per verified phase | Balances safe iteration with continuous production delivery | — Pending |
| Add public marketing landing page; app moves behind it | Product must explain itself to outside evaluators; login-first hides the value | — Pending |
| Showcase quality is the driving priority | Lead with stabilization + UI/UX + content; harden security in parallel phases | — Pending |
| Audit deliverables live in docs/ (SAAS_READINESS_AUDIT, SAAS_UPGRADE_PLAN, SAAS_UPGRADE_CHANGELOG); GSD planning in .planning/ | User-specified deliverables are product artifacts; GSD artifacts drive execution | — Pending |
| Keep CRA; document migration as future recommendation | Migration risk outweighs benefit for this milestone | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-06 after initialization*
