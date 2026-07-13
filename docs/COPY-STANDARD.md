# REMS Copy Standard (COPY-01)

The one-page reference for all user-facing text in REMS. Every copy task in Phase 7 (and
after) cites this document. When in doubt, prefer the fewest words that stay factual.

## Voice (D-01)

Minimal, factual, enterprise-austere. This is a professional B2B operations tool, not a
consumer app. No marketing warmth, no personality, no exclamation points, no emoji.
State what is true and what to do next — nothing more.

- Write plainly. If a sentence can be shorter, shorten it.
- Never sell, congratulate, or apologize. Report the fact.
- Address the operator directly ("you"), present tense.

## Capitalization

**Sentence case everywhere** — headings, buttons, labels, menu items, empty states,
toasts, dialogs. Capitalize only the first word and proper nouns.

- Yes: `New deal`, `No deals yet`, `Save changes`
- No: `New Deal`, `No Deals Yet`, `Save Changes`

## Buttons and actions

Buttons are **verb + object**, sentence case. Name the object the action affects.

- `New deal`, `Add contact`, `Save changes`, `Delete property`, `Clear filters`
- A button in flight switches to its present-tense pending label (via `LoadingButton`):
  `Saving…`, `Deleting…`, `Signing in…` (D-14).
- Avoid vague labels: no bare `Submit`, `OK`, `Go`, `Click here`.

## One term per concept

Use exactly one canonical noun for each domain concept. Do not mix synonyms.

| Concept | Canonical term | Do not use |
|---------|----------------|------------|
| A transaction record | **deal** | transaction, opportunity |
| A prospective client | **lead** | prospect, enquiry |
| A person record | **contact** | client, customer, person |
| A listing | **property** | listing, home, unit |
| A to-do item | **task** | to-do, action item |
| An uploaded file | **document** | file, attachment, doc |

## Error copy (via `src/utils/errorMessages.js`, D-05)

Every user-facing error is `{plain problem sentence}` + `{one imperative recovery step}`,
sourced from the central error map. Two fields per error: `message` and `recovery`.

- **message** = one plain sentence naming the problem. No error codes, no stack traces,
  no SDK detail, no security specifics.
- **recovery** = one imperative next step the user can take.
- Example: `{ message: "That email is already in use.", recovery: "Sign in instead, or use a different email." }`
- Unknown/unmapped errors fall back to a **curated safe generic** — never echo the raw
  SDK message. Surfaced via the existing `Toast` (error tone); optimistic-write failures
  show message + recovery with no Retry action (D-13).

## Empty states (built on `PageState`, D-02/D-03/D-04)

Three variants. The first-use and no-results states must never read identically.

| Variant | Heading | Body | Action |
|---------|---------|------|--------|
| First-use (no data yet) | Terse noun, e.g. `No deals yet` | One factual line: what appears here + how to add the first item | One quiet primary action, e.g. `New deal` (single, understated — D-03) |
| No-results (filtered to zero) | `No matches` | One factual line: nothing matches the current filters | Quiet `Clear filters` affordance (D-03) |
| Error (load failed) | `Couldn't load {noun}` | `message` + `recovery` from the central map (D-05) | `Try again` where a retry handler exists |

## Destructive confirmations (COPY-03, via `ConfirmModal`, D-07)

- **Verify against actual handler behavior before writing the copy.** Never describe an
  outcome the handler does not perform — do not say "permanently deleted" if the code
  soft-archives.
- Pattern: `{Delete X}?` heading + one line stating the object and the real irreversible
  consequence. Confirm button is verb + object present tense, switching to its pending
  label in flight.

## Banned patterns (no fluff)

- No marketing adjectives: `amazing`, `powerful`, `seamless`, `effortless`, `blazing`.
- No filler: `Please note`, `Simply`, `Just`, `Oops`, `Whoops`, `Uh-oh`.
- No exclamation points, emoji, or ALL CAPS for emphasis.
- No vague CTAs (`Submit`, `OK`, `Click here`) and no title-casing.
- No leaking raw error codes, stack traces, or SDK detail into copy.
