# REMS — Real Estate Management System

[![CI](https://github.com/dealcenterx-sudo/Rems-app/actions/workflows/ci.yml/badge.svg)](https://github.com/dealcenterx-sudo/Rems-app/actions/workflows/ci.yml)

A dark-theme real estate CRM and deal operations platform by **Deal Tech**.
REMS takes a transaction from first lead contact through closing — leads,
contacts, properties, deals, documents, and a collaborative deal portal —
in a single fast, keyboard-friendly workspace.

**Live:** https://rems-app.vercel.app/

## What It Does

**For agents and operators**
- CRM with a leads table, pipeline stages, and a full lead detail workspace
  (contact info, property info, notes, activity log, files hub with drag-and-drop
  uploads and embedded PDF viewing)
- Deal workflows: creation, dashboard, active/closed pipelines, and status
  tracking with confirmation on consequential changes
- Property inventory with photo galleries, filtering, and pagination
- Contacts segmented by buyer/seller/agent/lender/investor
- Documents manager and analytics dashboard
- Email inbox/composer and messages workspace

**For buyers and sellers**
- Self-service registration with role selection
- A client shell showing only what's theirs: assigned properties and shared deals
- The collaborative deal portal: parties, chat, documents, and progress —
  scoped by Firestore security rules, not just UI

**For administrators**
- User management: roles, property assignments, deal-portal access
- An append-only audit trail of deletions, status changes, and permission
  changes — entries can never be edited or removed
- Firestore security rules enforcing per-user data isolation server-side

## Stack

React 19 (CRA) · Firebase Auth / Firestore / Storage · Cloudinary ·
Recharts · react-pdf · Vercel

## Architecture Highlights

- **Security-first data model** — every business collection is scoped by
  `userId` with rules-level enforcement (`firestore.rules`); role/permission
  logic lives in `src/utils/permissions.js` with unit tests
- **Single auth source** — `UserContext` owns the Firebase auth listener and
  the user's Firestore profile; components consume one hook
- **Design tokens** — color, type scale, and spacing tokens in `App.css`
  keep the dark UI consistent and WCAG-conscious
- **Deliberate UX guarantees** — every destructive action confirms, every
  action gives feedback, unsaved edits warn before tab close
- **CI-gated main** — lint, tests, and build run on every push; automated
  branch merges only land after checks pass

## Development

```bash
npm install
npm start        # dev server
npm run build    # production build
npm run lint     # eslint
npm run test:ci  # unit tests
```

Deployment: pushes to `main` auto-deploy to production via Vercel.

Firestore security rules live in `firestore.rules` (publish via the Firebase
console); required composite indexes are documented in `firestore.indexes.json`.

Agent/contributor working notes live in [CLAUDE.md](CLAUDE.md).

---

Built by Deal Tech — a working business tool and an engineering showcase.
