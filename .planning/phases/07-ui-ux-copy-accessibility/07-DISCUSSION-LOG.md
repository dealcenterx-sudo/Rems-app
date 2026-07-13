# Phase 7: UI/UX, Copy & Accessibility - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-13
**Phase:** 7-ui-ux-copy-accessibility
**Areas discussed:** Empty-state & copy voice, Skeletons & perceived speed, Interaction feedback, Tokens & accessibility risk

---

## Empty-state & Copy Voice

### Empty-state voice
| Option | Description | Selected |
|--------|-------------|----------|
| Guiding & action-first | Warm, next-action framed, with CTA button | |
| Minimal & factual | Terse, neutral, optional muted subtext, no CTA | ✓ |
| Guiding, but no CTA buttons | Helpful sentence, action stays in page header/toolbar | |

**User's choice:** Minimal & factual
**Notes:** Reconciled with the "distinct states" choice below — copy stays terse/factual, but a no-results state still offers a quiet clear-filters affordance so it never reads like a brand-new account.

### First-use vs no-results
| Option | Description | Selected |
|--------|-------------|----------|
| Distinct where it matters | Distinction on ~6 primary list surfaces; generic elsewhere | ✓ |
| Always distinct | Both variants on every surface | |
| One state per surface | Single empty state regardless of cause | |

**User's choice:** Distinct where it matters

### Error-message mapping location
| Option | Description | Selected |
|--------|-------------|----------|
| Central util, one map | One src/utils/errorMessages.js code→{message,recovery} | ✓ |
| Central util + toast integration | Same map plus a toast helper | |
| Per-domain helpers | Separate mappers per area | |

**User's choice:** Central util, one map

### Copy sweep breadth
| Option | Description | Selected |
|--------|-------------|----------|
| High-traffic surfaces first | Primary surfaces a non-admin/demo hits | ✓ |
| Everything, exhaustively | Every string in every component | |
| Standard + empty states/errors only | Defer broad label rewrite | |

**User's choice:** High-traffic surfaces first

---

## Skeletons & Perceived Speed

### Skeleton style
| Option | Description | Selected |
|--------|-------------|----------|
| Reusable shimmer primitive | One <Skeleton> + composed shapes, shimmer sweep | ✓ |
| Reusable primitive, static pulse | Same shapes, opacity pulse | |
| Bespoke per-page skeletons | Hand-crafted per page, no shared primitive | |

**User's choice:** Reusable shimmer primitive

### Flash guard / threshold behavior
| Option | Description | Selected |
|--------|-------------|----------|
| Delay-then-show | Render skeleton only if load > ~300–500ms | ✓ |
| Show immediately | Skeleton the instant loading starts | |
| Min-display window | Show immediately + hold minimum ~400ms | |

**User's choice:** Delay-then-show

### SWR refresh visibility (Home KPIs)
| Option | Description | Selected |
|--------|-------------|----------|
| Silent refresh | Instant cached KPIs, background swap, no indicator | ✓ |
| Subtle refreshing hint | Instant + small indicator while refreshing | |
| Silent + stale guard | Silent, but skeleton if cache older than threshold | |

**User's choice:** Silent refresh

---

## Interaction Feedback

### Optimistic update scope
| Option | Description | Selected |
|--------|-------------|----------|
| Toggles only | Task complete/incomplete + task/deal status | ✓ |
| Toggles + quick inline edits | Plus small inline field edits | |
| Toggles + drag/reorder | Plus drag-to-reorder interactions | |

**User's choice:** Toggles only

### Rollback UX on failure
| Option | Description | Selected |
|--------|-------------|----------|
| Revert + error toast | Silently revert + error toast (Toast + central map) | ✓ |
| Revert + inline error | Revert + inline error near the control | |
| Revert + toast with Retry | Revert + toast with a Retry action | |

**User's choice:** Revert + error toast

### Pending button presentation
| Option | Description | Selected |
|--------|-------------|----------|
| Spinner + disable + verb label | LoadingButton pattern, verb label swap, fix hex | ✓ |
| Spinner + disable, keep label | Spinner + disabled, no text swap | |
| Disable + subtle overlay | Disable + dim/overlay the region | |

**User's choice:** Spinner + disable + verb label

---

## Tokens & Accessibility Risk

### Migration scope
| Option | Description | Selected |
|--------|-------------|----------|
| Semantic colors → tokens | Migrate semantic hex; leave one-off decorative documented | ✓ |
| All hex, exhaustively | Replace every hex, mint new tokens | |
| High-traffic surfaces first | Primary pages now, defer rare components | |

**User's choice:** Semantic colors → tokens

### Two-pass safety verification
| Option | Description | Selected |
|--------|-------------|----------|
| Exact-equivalent + build/lint gate | Byte-identical mapping; green build+lint+diff | ✓ |
| Add visual regression screenshots | Same + before/after screenshots | |
| Exact-equivalent, trust the mapping | Mapping discipline + code review only | |

**User's choice:** Exact-equivalent + build/lint gate

### Focus-trap approach
| Option | Description | Selected |
|--------|-------------|----------|
| Build a useFocusTrap hook | Reusable hook + useEscapeKey; major modals | ✓ |
| Hook + audit every modal | Same hook, exhaustive per-modal coverage | |
| Minimal: Escape + focus-on-open | Defer full Tab-cycle trapping | |

**User's choice:** Build a useFocusTrap hook

### jsx-a11y strictness
| Option | Description | Selected |
|--------|-------------|----------|
| Recommended as errors | Recommended ruleset at error, fix all now | ✓ |
| Recommended, phased | Warn first, flip to error at phase end | |
| Curated rule subset as errors | High-value subset at error | |

**User's choice:** Recommended as errors

---

## Claude's Discretion

- Shimmer timing/easing, per-page skeleton shape composition, exact delay within ~300–500ms.
- Full Pass-1 token list and Pass-2 contrast-corrected values (meet 4.5:1 / 3:1, preserve brand).
- Copy-standard wording specifics; internal structure of errorMessages.js and which codes to map.
- Mobile/responsive behavior of new states (desktop-first, must not break mobile).

## Deferred Ideas

- Exhaustive copy sweep of admin-only/rare components.
- Exhaustive focus-trap/keyboard audit of every modal/drawer/portal tab.
- Token migration of one-off decorative/chart colors.
- Visual-regression screenshot tooling (rejected for scope).
- Retry action in error toasts (rejected for simplicity).
- Landing page, trust page, CSP enforcement — Phase 8.
