# REMS - Product Copy Standard

## Voice

REMS copy should sound operational, direct, and calm. The product helps real estate operators move work forward, so copy should name the action, the object, and the next step without marketing language inside the app.

## Principles

- Lead with the user's task, not the system's internals.
- Prefer concrete nouns: deal, property, document, lead, task, invite.
- Use sentence case for headings, buttons, empty states, and helper text.
- Keep button labels action-first: `Add lead`, `Upload document`, `Send invite`, `Mark complete`.
- Keep error text short, then offer a recovery path.
- Do not expose provider names, API names, stack traces, or environment details in user-facing errors.
- Avoid blame. Say what happened and what the user can do next.

## Empty States

Empty states should answer three questions:

1. What is missing?
2. Why does it matter?
3. What can the user do next?

Pattern:

```text
No documents yet
Upload contracts, disclosures, and supporting files for this deal.
[Upload document]
```

## Loading And Pending States

Use specific loading text when the wait is tied to data:

- `Loading deals`
- `Saving assignment`
- `Uploading document`
- `Sending invite`

Use `Loading` only for generic shell-level waits.

## Errors

Use this shape:

```text
Could not load this deal
Refresh the page or go back to the deals list.
[Back to deals]
```

For destructive failures:

```text
Could not delete the document
The file was not removed. Try again or contact the admin if it keeps failing.
```

## Success Toasts

Success messages should confirm the completed action:

- `Document uploaded`
- `Invite sent`
- `Deal marked closed`
- `Assignment updated`

Avoid vague copy such as `Done`, `Success`, or `Updated successfully` when the object is known.

## Accessibility Copy

- Visible labels should be concise; use `aria-label` only when a visible label is unavailable.
- Icon-only buttons must include an accessible label.
- Status text must include the status word, not just color.
- Links and buttons should make sense out of context.
