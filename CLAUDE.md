# REMS Project Instructions

You are working in the REMS source bundle for Deal Tech.

## Project Identity

- Project name: `REMS` (Real Estate Management System)
- Source bundle root: `/Downloads/rems-project-source-2026-04-09`
- Important path rule:
  - every file path in this document stems from `/Downloads/rems-project-source-2026-04-09`
  - if you reference a file in this exported bundle, assume that root unless told otherwise
- Live production URL: `https://rems-app.vercel.app/`
- GitHub repo: `https://github.com/dealcenterx-sudo/Rems-app`
- Deployment model in the original repo: push directly to `main`; Vercel auto-deploys production from `main`
- Business purpose:
  - real estate CRM / operations platform
  - showcase product for Deal Tech engineering capability

## Snapshot Context

This package is an exported source snapshot.

- It is intended to be opened from `/Downloads/rems-project-source-2026-04-09`
- The zip snapshot does not include `.git`
- File browsing and code edits should work normally
- Git commands only work if the project is reattached to a real git clone

## Product Direction

Preserve the current visual language and product direction:

- Professional dark UI
- High-polish SaaS feel
- Fast, action-oriented workflows
- Minimal friction for agents/operators
- Desktop-first, but mobile behavior should not break
- Backward-compatible changes unless explicitly approved

The user prefers decisive execution. Ship working changes, validate them, and keep momentum high.

## Core Stack

- React `19.2.3`
- React DOM `19.2.3`
- Create React App / `react-scripts` `5.0.1`
- Firebase `12.8.0`
- Firestore
- Firebase Auth
- Firebase Storage
- Cloudinary `2.9.0`
- Recharts `3.7.0`
- `react-pdf` `10.4.1`
- `pdfjs-dist` `5.4.624`
- `web-vitals`
- Puppeteer `24.38.0` in devDependencies

## External Resources In Use

### Firebase

- Config file: `/Downloads/rems-project-source-2026-04-09/src/firebase.js`
- Services used:
  - Authentication
  - Firestore
  - Storage
- Google OAuth is enabled in the UI
- Firebase project identifiers currently hardcoded in repo:
  - `projectId`: `rems-app-44205`
  - `authDomain`: `rems-app-44205.firebaseapp.com`
  - `storageBucket`: `rems-app-44205.firebasestorage.app`

### Cloudinary

Cloudinary is used for image/file uploads, but configuration is not fully normalized across the codebase.

- Shared util file: `/Downloads/rems-project-source-2026-04-09/src/utils/cloudinary.js`
  - `CLOUDINARY_CLOUD_NAME = 'dcirl3j3v'`
  - `CLOUDINARY_UPLOAD_PRESET = 'rems_unsigned'`
- Some feature-level code historically used direct constants such as `djaq0av66`
- Before making Cloudinary-wide changes, check component-level hardcoded values and normalize carefully

### Vercel

- Production host: Vercel
- Deploy trigger in the original repo: `git push origin main`
- Build command: `npm run build`

### GitHub

- Primary repo remote is GitHub
- There is a GitHub Actions workflow at `/Downloads/rems-project-source-2026-04-09/.github/workflows/auto-merge-to-main.yml`
- That workflow auto-merges `claude/**` branches into `main`
- Current working convention for this project has been direct pushes to `main`

### PDF Rendering

- In-app PDF rendering uses `react-pdf` and `pdfjs-dist`
- PDF worker asset: `/Downloads/rems-project-source-2026-04-09/public/pdf.worker.min.mjs`
- Main lead PDF viewer: `/Downloads/rems-project-source-2026-04-09/src/components/LeadPdfViewer.js`

### Brand Assets

- Main logo asset: `/Downloads/rems-project-source-2026-04-09/public/dealcenter-logo.png`

## Current Architecture

- Main shell is driven from `/Downloads/rems-project-source-2026-04-09/src/App.js`
- Global styling is concentrated in `/Downloads/rems-project-source-2026-04-09/src/App.css`
- Many business workflows are split into component files under `/Downloads/rems-project-source-2026-04-09/src/components`
- State management is local React state plus Firebase as source of truth
- There is no Redux or large centralized app-state layer
- There is no dedicated server/API layer in this repo
- Firestore access is performed directly from UI components

## Critical Project Rules

- Preserve admin vs regular-user data isolation
- Admin email is `dealcenterx@gmail.com`
- Most regular-user data access is scoped by `userId`
- Do not break Google sign-in or email/password auth flows
- Do not silently change data model meaning
- Do not remove current production workflows without approval
- Build with `npm run build` before shipping significant changes
- Avoid destructive git actions

## Core Collections In Use

Primary active collections in the app:

- `users`
- `contacts`
- `leads`
- `deals`
- `properties`
- `documents`
- `tasks`

Reference schema doc:

- `/Downloads/rems-project-source-2026-04-09/docs/DATABASE_SCHEMA.md`

Important practical notes:

- `contacts` drives buyer/seller/agent/lender/investor workflows
- `deals` drives active/closed deal flows and portal experiences
- `properties` drives inventory/listing management
- `leads` drives CRM leads table and lead detail workspace
- `documents` and lead-level generated docs/files are both present in the product
- `tasks` is implemented but still lighter than some other modules

## Current Product Areas

Implemented or partially implemented areas include:

- Authentication
- Homepage dashboard and KPIs
- Contacts with contact subtabs
- Deals dashboard, new deal flow, active deals, closed deals, deal portal
- Properties management with media
- CRM dashboard
- CRM leads table with filters
- CRM lead detail workspace
- CRM messages
- CRM email inbox/composer
- CRM campaigns and reports placeholders / partials
- Documents manager
- Analytics dashboard
- Settings page
- Websites placeholder page

## Important Files

### App Shell

- `/Downloads/rems-project-source-2026-04-09/src/App.js`
- `/Downloads/rems-project-source-2026-04-09/src/App.css`
- `/Downloads/rems-project-source-2026-04-09/src/index.js`
- `/Downloads/rems-project-source-2026-04-09/src/index.css`

### Layout / Shared UI

- `/Downloads/rems-project-source-2026-04-09/src/components/Layout.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/Toast.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/ConfirmModal.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/ErrorBoundary.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/Icons.js`

### Home / Contacts / Deals / Properties

- `/Downloads/rems-project-source-2026-04-09/src/components/HomePage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/ContactsPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/DealsPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/NewDealPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/DealsDashboard.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/ActiveDealsPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/ClosedDealsPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/DealPortalPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/PropertiesPage.js`

### CRM

- `/Downloads/rems-project-source-2026-04-09/src/components/CRMPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/CRMDashboard.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/CRMLeadsPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/CRMLeadDetailPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/CRMEmailInboxPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/CRMMessagesPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/CRMCampaignsPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/CRMReportsPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/LeadDrawer.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/LeadPdfViewer.js`

### Documents / Tasks / Analytics / Settings

- `/Downloads/rems-project-source-2026-04-09/src/components/DocumentsPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/TasksPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/AnalyticsDashboard.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/SettingsPage.js`

### Utilities

- `/Downloads/rems-project-source-2026-04-09/src/utils/helpers.js`
- `/Downloads/rems-project-source-2026-04-09/src/utils/cloudinary.js`
- `/Downloads/rems-project-source-2026-04-09/src/utils/useDebounce.js`

## UX and Visual Standards

- Main background is near-black / black
- Accent green is central to the brand
- UI should feel premium, not generic
- Smooth transitions are good, but heavy animation should not slow workflows
- Preserve current sidebar/topbar behavior unless intentionally improving it
- Avoid introducing a visually inconsistent component library feel

## Workflow Expectations For Claude

- Inspect before refactoring
- Prefer incremental, production-safe changes
- Keep existing behavior unless the task explicitly changes it
- If touching heavy pages, prefer lazy loading and isolated chunks
- If touching data-heavy views, prefer pagination, cursor-based loading, and index-friendly queries
- If touching upload/PDF flows, preserve browser fallback behavior
- Validate with build before suggesting deploy

## Commands

Primary local commands inside the extracted source bundle:

```bash
cd /Downloads/rems-project-source-2026-04-09
npm install
npm start
npm run build
```

Useful search commands:

```bash
cd /Downloads/rems-project-source-2026-04-09
rg "CRMLeadDetailPage" src
rg "documentsViewTab" src
rg "crm-email" src/App.css
rg "crm-messages" src/App.css
rg "CLOUDINARY_CLOUD_NAME" src
```

Git and deployment commands only apply if this snapshot is reattached to a git clone:

```bash
git status --short
git add .
git commit -m "Describe change"
git push origin main
```

## Known Risks / Technical Notes

- `App.js` is still a major coordination point, even with lazy loading added
- Cloudinary configuration is inconsistent across files and should be normalized carefully
- Firebase config is committed directly in `src/firebase.js`
- Firestore rules are not present in this snapshot, so avoid assuming backend rule coverage from source alone
- There is no `npm run lint` script currently
- There are no comprehensive automated tests in place
- Some pages use local sample/fallback data for UX shaping

## Original Local Repo State At Export Time

When this snapshot was created, there were uncommitted local edits in:

- `/Downloads/rems-project-source-2026-04-09/src/components/AnalyticsDashboard.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/HomePage.js`

Do not overwrite those casually. Review them before making adjacent changes.

## Recent History Context

Recent main-branch work included:

- bundle optimization and lazy loading
- PDF rendering cleanup
- CRM email/messages UI
- lead detail workspace expansion
- documents/files hub improvements
- dashboard pagination and caching work

Recent commits visible in the original repo included:

- `82cffec` Performance: paginate dashboards and cache modal reference data
- `ab8b0bd` Optimize bundle and PDF render path in CRM/Deals
- `e4d728d` Polish global UI visuals for professional-grade rendering
- `38c907d` Production-ready optimization pass: bundle, rendering, config hygiene
- `8d36021` Reduce bundle size by lazy-loading all page components

## If You Are Continuing Work

Start by reading:

- `/Downloads/rems-project-source-2026-04-09/README.md`
- `/Downloads/rems-project-source-2026-04-09/docs/DATABASE_SCHEMA.md`
- `/Downloads/rems-project-source-2026-04-09/src/App.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/CRMLeadDetailPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/DealsPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/PropertiesPage.js`
- `/Downloads/rems-project-source-2026-04-09/src/components/DocumentsPage.js`

Then inspect any files directly related to the requested feature before changing shared behaviors.
