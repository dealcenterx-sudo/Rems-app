# REMS Handoff README

This file is the working handoff for continuing REMS in Claude Code or any other coding agent.

Project path: `/Users/jolberrodriguez/rems-app`

Live app: `https://rems-app.vercel.app/`

Primary repo: `https://github.com/dealcenterx-sudo/Rems-app`

Current deployment model:
- Work is committed directly to `main`
- `main` is connected to Vercel
- `git push origin main` triggers production deployment automatically

## What REMS Is

REMS is a dark-theme real estate CRM / operations system for Deal Tech. It is currently a React + Firebase + Cloudinary app deployed on Vercel. The app is positioned as both:

- A real business tool for real estate operators
- A showcase product for Deal Tech development capability

Core stack:
- React 19
- Firebase Auth + Firestore
- Cloudinary uploads
- Recharts
- `react-pdf` + `pdfjs-dist` for embedded PDF viewing
- Create React App build pipeline

## Current Product Areas

Implemented major areas in production:
- Authentication
- Homepage live dashboard
- CRM dashboard
- CRM leads table and lead detail workspace
- CRM messages workspace
- CRM email inbox and composer
- Contacts management
- Deals workflows
- Properties management with image uploads
- Lead document library and PDF document viewer
- Lead files hub with drag/drop uploads and embedded PDF viewing
- Analytics dashboard
- Documents manager
- Settings page

## Important File Map

Main application:
- `/Users/jolberrodriguez/rems-app/src/App.js`
- `/Users/jolberrodriguez/rems-app/src/App.css`

Settings:
- `/Users/jolberrodriguez/rems-app/src/components/SettingsPage.js`

Other major components:
- `/Users/jolberrodriguez/rems-app/src/components/PropertiesPage.js`
- `/Users/jolberrodriguez/rems-app/src/components/DocumentsPage.js`
- `/Users/jolberrodriguez/rems-app/src/components/AnalyticsDashboard.js`
- `/Users/jolberrodriguez/rems-app/src/components/CRMDashboard.js`
- `/Users/jolberrodriguez/rems-app/src/components/ActiveDealsPage.js`
- `/Users/jolberrodriguez/rems-app/src/components/Toast.js`

PDF worker asset:
- `/Users/jolberrodriguez/rems-app/public/pdf.worker.min.mjs`

Firebase config:
- `/Users/jolberrodriguez/rems-app/src/firebase.js`

## Current Architecture Reality

The codebase is still centered around a large `App.js` file. Many CRM workflows are defined inline there. This is intentional based on the project’s current velocity-first style, but it is the main maintainability constraint.

Patterns in use:
- Functional React components
- Local `useState` / `useEffect`
- Firestore read/write directly from UI components
- Inline styles in some older sections
- Shared dark theme driven mostly by `App.css`
- Admin logic based on `dealcenterx@gmail.com`

Data sources:
- Firestore collections: `leads`, `contacts`, `deals`, `properties`, `documents`, `tasks`
- Cloudinary for uploaded media/files

## Work Completed In This Collaboration

This section is the useful handoff summary of the major work shipped, not just the original app baseline.

### CRM Lead Detail Workspace

Built and polished a lead detail page with:
- New-tab style lead opening from CRM leads
- Lead workspace layout with left, center, and right panels
- Editable contact information
- Editable property information
- Editable lead details with `Save Notes`
- Lead pipeline bar
- Deal creation guard so `Active Deal` cannot be used without an actual deal
- User-created activities with edit and delete behavior
- Permanent locking for email/workflow activity rows

Important behavior:
- Sample lead (`sample-lead-1`) now persists edits in `localStorage` so note saves and lead detail edits do not reset

### CRM Documents Page

Reworked the lead documents area into a document library:
- Search
- Multi-select document rows
- State filter changed to jurisdiction state filter
- Open selected docs into a PDF-view-style new tab
- Sample real estate document entries for UI testing

Important change:
- The `State` column now represents document jurisdiction origin like `New Jersey`, not workflow status

### Files Hub

Implemented:
- Drag and drop uploads
- Editable file names
- Save names action
- PDF double-click preview
- Download action next to file size
- Embedded in-app PDF viewer using `react-pdf`
- Fallback open-new-tab action inside the PDF modal

### CRM Email

Built a real email workspace UI:
- Gmail-style inbox layout
- Folders
- Search
- Compose modal
- Send flow
- History loading from lead `emailHistory`

Current send behavior:
- Uses `REACT_APP_CRM_EMAIL_WEBHOOK_URL` if configured
- Falls back to `mailto:` if webhook is not configured

### CRM Messages

Replaced placeholder with an iOS-style chat workspace:
- Conversation list on the left
- Thread/chat view on the right
- Active thread selection
- Composer
- Seeded fallback conversations if no real message history exists yet

### Settings

Moved `Connector` out of CRM and into Settings:
- New Settings tab for Connector
- Connector now belongs under account/system settings instead of CRM navigation

### Other Shipped UX / Workflow Work

- Lead tabs moved below lead info pills
- Removed `Check-In` and `Start Desk` from lead detail top actions
- Activity creation now requires context via popup before saving
- Notes save button added inline under notes field
- PDF preview reliability improved from iframe to embedded renderer
- CRM email, messages, and lead detail sections visually aligned with the current dark design system

## Recent Commit History

Recent shipped commits on `main`:

```text
cbaed3f Move connector from CRM to settings
af033a2 Build iOS-style CRM messages workspace
49d894c Add activity entry composer for lead detail
7d62b03 Use document jurisdiction states in lead library
2db11a6 Persist sample lead notes and detail saves
2385e2b Add embedded PDF viewer for files hub
99ea580 Add PDF preview and download actions in files hub
be96420 Rework lead document library selection and PDF viewer
b39318f Model lead documents library with search and state filter
123db15 Remove check-in and start desk actions from lead detail
7c2f592 Move lead detail tabs below lead info pills
8c6330e Add lead detail top tabs with documents and files views
cc55e7f Move lead files panel under activity section
9dc1aee Allow deleting user activities while locking email/workflow logs
c5126d9 Enforce deal creation before Active Deal stage
7f44130 Build CRM email inbox subtab UI
de1f6d5 Add inline Save Notes button in lead details panel
3bd7ed3 Add CRM email composer modal for Send Email action
ee63702 Enable double-click editing for lead activity log entries
8aee577 Add lead detail dropdowns for service and pipeline stage
1826619 Add drag-drop lead file uploads with editable document list
d41d38a Add floating popups for lead workspace section tabs
47e4eb1 Wire deal quick actions to append timeline notes
ec053f7 Polish detail workspace layouts and add editable lead save flow
82a6c7d Add CRM lead detail page with new-tab open flow
```

## Terminal Workflow Used

This is the real workflow that has been used in the terminal.

Common repo commands:

```bash
cd /Users/jolberrodriguez/rems-app
npm start
npm run build
git status --short
git add .
git commit -m "Describe change"
git push origin main
```

Typical safe validation flow used before deploy:

```bash
cd /Users/jolberrodriguez/rems-app
npm run build
git status --short
git add src/App.js src/App.css
git commit -m "Your change summary"
git push origin main
```

Useful search commands:

```bash
rg "CRMLeadDetailPage" src/App.js
rg "renderFilesPanel" src/App.js
rg "documentsViewTab" src/App.js
rg "crm-email" src/App.css
rg "crm-messages" src/App.css
```

### Git / Deployment Rules Used

Working convention used in this repo:
- Edit directly in the working tree
- Validate with `npm run build`
- Commit directly to `main`
- Push directly to `origin main`

No PR workflow has been used in this phase.

## Vercel Deployment Details

Current behavior:
- Vercel is connected to GitHub
- Branch `main` auto-deploys to production
- Production build command is `npm run build`

Effective deployment command:

```bash
git push origin main
```

After push:
- GitHub receives the new commit
- Vercel detects the update
- Vercel runs the production build
- New production deployment replaces the current live app if build passes

Important:
- If `npm run build` fails locally, Vercel will also fail
- ESLint/build errors have previously blocked deploys
- The safest workflow is always `npm run build` before push

## Dependencies That Matter Right Now

Current notable dependencies from `package.json`:
- `firebase`
- `cloudinary`
- `recharts`
- `react-pdf`
- `pdfjs-dist`

Why `react-pdf` and `pdfjs-dist` were added:
- Embedded PDF preview in Files Hub
- More polished in-app document reading experience

## Environment / Integration Notes

Known important values:
- Cloudinary upload preset: `rems_unsigned`
- Cloudinary cloud name: `djaq0av66`
- CRM email webhook env var: `REACT_APP_CRM_EMAIL_WEBHOOK_URL`

Auth:
- Firebase auth is active
- Google sign-in is supported
- Admin email: `dealcenterx@gmail.com`

## Known Constraints

Current constraints that Claude Code should know immediately:

- `src/App.js` is large and central
- There are no automated tests
- Build validation currently relies on `npm run build`
- Some CRM areas still use sample/fallback seeded data when no live data exists
- SMS/messages are still UI-first and not yet backed by a fully wired inbound/outbound messaging provider
- Settings is partially real and partially placeholder
- There is an untracked local file named `/Users/jolberrodriguez/rems-app/Files` that has not been pushed

## Recommended Next Steps For Claude Code

If continuing in Claude Code, these are the highest-value next tasks:

1. Extract large CRM areas from `src/App.js` into dedicated components without breaking styling or behavior
2. Wire CRM messages to a real persisted Firestore structure or external SMS provider
3. Build the admin-managed compliant document library instead of sample document seeds
4. Expand Settings into a real system control center, especially Connector
5. Add automated smoke coverage for the highest-risk flows:
   - lead detail save
   - file upload
   - PDF preview
   - document selection
   - CRM email UI

## Handoff Guidance For Claude Code

Useful prompt starter:

```text
Read /Users/jolberrodriguez/rems-app/README.md first, then inspect /Users/jolberrodriguez/rems-app/src/App.js and /Users/jolberrodriguez/rems-app/src/components/SettingsPage.js before making changes. This project deploys by pushing directly to main, and npm run build must pass before push.
```

Another useful prompt starter:

```text
Continue REMS from the current production state. Preserve the dark design system, validate with npm run build, and push directly to origin/main after changes unless I say not to.
```

## Final Notes

If this repo is handed to another coding agent, the most important operational facts are:
- production deploys are Git push driven
- build success is the deployment gate
- `App.js` still contains most CRM logic
- recent work has heavily focused on CRM lead detail, documents, files, email, messages, and settings relocation

This README should replace the default CRA README for all future work on REMS.
