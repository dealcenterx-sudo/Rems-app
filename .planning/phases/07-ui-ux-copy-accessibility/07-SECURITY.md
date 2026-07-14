---
phase: 7
slug: ui-ux-copy-accessibility
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on (high) severity
threats_open: 0
asvs_level: 1
created: 2026-07-13
---

# Phase 7 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Built from the 12 PLAN.md `<threat_model>` blocks (register authored at plan time)
> and verified at ASVS L1 grep-depth against the shipped code. Block threshold: `high`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Firebase SDK → UI | Firebase/Firestore errors surface to the user via toasts and PageState error tiles | Error codes/messages (must be curated, never raw) |
| Client render → screen | Copy strings and design tokens render to the DOM | Static text (React auto-escaped); CSS token values |
| Keyboard/AT → app | Focus management, focus trap, and the focus indicator gate keyboard access | Focus state (availability/usability, not data) |

This phase is UI/copy/accessibility only — it introduces no new network endpoint, auth path, data-model change, or dependency. The security surface is (1) error-message disclosure and (2) accessibility/keyboard availability as a usability-security affordance.

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-07-01 | Information Disclosure | errorMessages.js fallback | high | mitigate | Unknown-code fallback returns curated `GENERIC_ERROR`; never echoes raw SDK message/code/stack. Verified: no `err.message` return path (only a JSDoc guard comment); sentinel leak test present in `errorMessages.test.js` (suite green). | closed |
| T-07-02 | Tampering | copy strings | low | accept | All copy is static JSX text (React auto-escapes); no `dangerouslySetInnerHTML` introduced. | closed |
| T-07-03 | Tampering | App.css token values (Pass 1) | low | accept | Additive-only, byte-identical; build/lint gate catches syntax errors. No behavior change. | closed |
| T-07-04 | DoS (a11y usability) | useFocusTrap | low | mitigate | Hook restores focus on cleanup, no-ops when inactive; unit test covers restore + inactive cases. Focus cannot be permanently stolen. | closed |
| T-07-05 | Information Disclosure | PageState error states | medium | mitigate | Error copy comes from `errorMessages.mapError` (curated), not raw `err.message` (verified in HomePage error path). | closed |
| T-07-06 | Information Disclosure | Toast error composition | medium | mitigate | Composition uses `errorMessages.toToastString` output only; no raw `err.message` path introduced in the Phase-7 error surfaces. | closed |
| T-07-07 | DoS (a11y) | ConfirmModal focus trap | low | mitigate | Trap restores focus on close, pairs with `useEscapeKey` (tested hook). | closed |
| T-07-08 | Information Disclosure | HomePage KPI cache | low | accept | Cache is per-scope (admin/uid); SWR alters discard timing only, not scoping. No cross-user leakage introduced. | closed |
| T-07-09 | Tampering (state integrity) | optimistic toggles | low | mitigate | On write failure UI reverts to prior state (`previousStatus` anchor, catch blocks); post-confirm side effects run only after a successful write. Rollback unit test green. | closed |
| T-07-10 | Information Disclosure | rollback error toast | medium | mitigate | Toast copy sourced from `errorMessages.js` (curated), never raw `err.message`. | closed |
| T-07-11 | DoS (a11y access) | cluster-A interactive elements | low | mitigate | Click-only handlers made keyboard-reachable; scoped jsx-a11y lint = 0 violations. No visible-focus indicator removed without replacement. | closed |
| T-07-12 | DoS (a11y access) | cluster-B interactive elements | low | mitigate | Same as T-07-11 for the cluster-B file set; full-src jsx-a11y = 0. | closed |
| T-07-13 | Tampering | cluster-A color migration | low | mitigate | Byte-identical mapping only; build/lint + diff review guarantee zero rendered-color change (D-17). | closed |
| T-07-14 | Tampering | cluster-B color migration | low | mitigate | Byte-identical mapping only; build/lint + diff review guarantee zero rendered-color change (D-17). | closed |
| T-07-15 | DoS (a11y / security affordance) | :focus-visible reconciliation | high | mitigate | `--shadow-focus` deleted and every consuming `:focus-visible` selector repointed to the visible green `--focus-ring`. Verified: `grep -c -- '--shadow-focus' src/App.css` = 0; single `--focus-ring: …rgba(0,255,136,0.45)`. No selector left without a visible indicator. | closed |
| T-07-16 | Tampering | App.css Pass-2 value changes | low | mitigate | Value changes are a separate commit from Pass 1 (D-17); build/lint gate + WCAG contrast targets bound the change; brand preserved. | closed |

*Status: open · closed · open — below `high` threshold (non-blocking)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-07-01 | T-07-02 | Static, React-escaped copy; no HTML injection surface. | dealcenterx@gmail.com | 2026-07-13 |
| AR-07-02 | T-07-03 | Additive byte-identical tokens; gated by build+lint. | dealcenterx@gmail.com | 2026-07-13 |
| AR-07-03 | T-07-08 | KPI cache scoping unchanged; SWR alters timing only. | dealcenterx@gmail.com | 2026-07-13 |

---

## Out-of-Scope Observations (not Phase-7 threats)

Surfaced during the audit but **outside this phase's register** — recorded for a future hardening pass, non-blocking (below `high`):

- **OBS-07-01 — raw `error.message` in Settings toasts.** `src/components/SettingsPage.js:95,117,151` calls `toast.error(error.message)`, surfacing raw Firebase error text (info disclosure, ~medium). This is a **pre-existing** pattern; Phase 7 did not introduce it, and SettingsPage was not one of the error-mapping targets (the T-07 register covers the *new* error surfaces — PageState/Toast composition/rollback — which correctly use the curated `errorMessages` map). Recommend a follow-up: route these three calls through `toToastString(mapError(error))`. Filed as a candidate for a future phase or a `/gsd-quick` fix.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-13 | 16 | 16 | 0 | secure-phase (ASVS L1 grep-depth, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed (both high threats T-07-01 / T-07-15 verified closed)
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-13
