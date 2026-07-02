# REMS Project Instructions

You are working in the REMS repository for Deal Tech.

## Project Identity

- Project name: `REMS` (Real Estate Management System)
- Repo root: this directory (a real git clone; `origin` is GitHub)
- Live production URL: `https://rems-app.vercel.app/`
- GitHub repo: `https://github.com/dealcenterx-sudo/Rems-app`
- Deployment model: push directly to `main`; Vercel auto-deploys production from `main`
- Business purpose:
  - real estate CRM / operations platform
  - showcase product for Deal Tech engineering capability

## Product Direction

Preserve the current visual language and product direction:

- Professional dark UI (near-black background, `#00ff88` accent green)
- High-polish SaaS feel
- Fast, action-oriented workflows
- Minimal friction for agents/operators
- Desktop-first, but mobile behavior must not break
- Backward-compatible changes unless explicitly approved

The user prefers decisive execution. Ship working changes, validate them, and keep momentum high.

## Core Stack

- React 19 (Create React App / `react-scripts` 5)
- Firebase: Auth, Firestore, Storage
- Cloudinary for uploads — single config in `src/utils/cloudinary.js`
  (cloud `dcirl3j3v`, unsigned preset `rems_unsigned`); do NOT hardcode
  cloud names in components
- Recharts, `react-pdf` + `pdfjs-dist` (worker at `public/pdf.worker.min.mjs`)

## Commands

```bash
npm start        # dev server
npm run build    # production build — run before shipping significant changes
npm run lint     # eslint over src
npm run test:ci  # jest, non-interactive
```

CI (`.github/workflows/ci.yml`) runs lint → test → build on every push/PR to
`main`. The `auto-merge-to-main.yml` workflow merges `claude/**` branches into
`main` only after the same checks pass. CI uses Node 24 to match development.

## Auth, Roles, and Permissions

- Admin email is `dealcenterx@gmail.com` (role `admin` on their user doc)
- Roles: `admin`, `agent`, `buyer`, `seller`; chosen at signup (never admin)
- `ensureUserExists()` in `src/firebase.js` creates `users/{uid}` on first
  sign-in (keyed by auth UID)
- `src/contexts/UserContext.js` owns the auth listener; components use the
  `useUserDoc` hook (`src/utils/useUserDoc.js`)
- Permission helpers in `src/utils/permissions.js` (unit-tested); UI checks
  are progressive enhancement — Firestore rules are the enforcement layer
- Buyers/sellers get a client shell only: Home, Deals (MyDealsPage),
  Properties, Settings (see `getNavItemsForRole` in `src/components/Icons.js`)

## Firestore Rules and Indexes

- `firestore.rules` in the repo is the source of truth, but Firebase does not
  read it from git — after changing it, the user must paste it into
  Firebase Console → Firestore → Rules → Publish (offer pbcopy)
- `firestore.indexes.json` documents required composite indexes
- Access model: business collections are `userId`-scoped with admin override;
  properties additionally honor `users/{uid}.assignedProperties`; deals honor
  `users/{uid}.assignedDeals` (read-only for assignees); the six `deal-*`
  portal collections follow the parent deal via `canAccessDeal()`;
  `activity_log` is append-only (create-as-self, admin read, no edits/deletes)
- Gotcha: non-admin queries combining `where('userId'…)` with `orderBy` need
  composite indexes; admin queries don't — "works for admin, breaks for a
  test account" usually means a missing index, not a rules problem

## Core Collections

`users`, `contacts`, `leads`, `deals`, `properties`, `documents`, `tasks`,
`activity_log`, and the deal-portal set: `deal-parties`, `deal-channels`,
`deal-messages`, `deal-documents`, `deal-progress`, `deal-lender-pushes`.
Reference schema: `docs/DATABASE_SCHEMA.md`.

## Architecture Notes

- App shell: `src/App.js` (pages lazy-loaded); global styles in `src/App.css`
  with design tokens in `:root` — use `var(--…)` tokens, not raw hex;
  `--text-faint` is the minimum text contrast tier; 11px is the type floor
- State: local React state + Firebase as source of truth; no Redux
- Firestore access happens directly in components
- Destructive actions go through `ConfirmModal`; consequential status changes
  (e.g. closing a deal) confirm first and toast on success
- Audit trail: call `logActivity()` (`src/utils/auditLog.js`) on deletes,
  status changes, and role/assignment changes — fire-and-forget

## Critical Rules

- Preserve admin vs regular-user data isolation; query scope matters as much
  as UI visibility
- Do not break Google sign-in or email/password auth flows
- Do not silently change data model meaning
- Do not remove current production workflows without approval
- Build (and run lint + tests) before shipping significant changes
- Avoid destructive git actions
