# Codebase Structure

**Analysis Date:** 2026-07-06

## Directory Layout

```
rems-app/
├── src/                          # React app source code
│   ├── App.js                    # Main app shell + page router
│   ├── App.css                   # Global styles + design tokens
│   ├── index.js                  # Entry point
│   ├── firebase.js               # Firebase config + auth init
│   ├── setupTests.js             # Jest config
│   ├── reportWebVitals.js        # Web vitals reporting
│   ├── components/               # React components (43 files)
│   │   ├── HomePage.js           # Dashboard/KPI view
│   │   ├── DealsPage.js          # Deal pipeline router
│   │   ├── NewDealPage.js        # Create deal form
│   │   ├── DealPortalPage.js     # Deal collaboration hub
│   │   ├── ActiveDealsPage.js    # Active deals list
│   │   ├── ClosedDealsPage.js    # Closed deals list
│   │   ├── DealsDashboard.js     # Deal metrics view
│   │   ├── CRMPage.js            # CRM router
│   │   ├── CRMDashboard.js       # CRM metrics
│   │   ├── CRMLeadsPage.js       # Lead list + search
│   │   ├── CRMLeadDetailPage.js  # Lead profile + edit
│   │   ├── CRMCampaignsPage.js   # Campaign management
│   │   ├── CRMMessagesPage.js    # Message threads
│   │   ├── CRMEmailInboxPage.js  # Email inbox
│   │   ├── CRMReportsPage.js     # Reporting
│   │   ├── ContactsPage.js       # Contact management
│   │   ├── PropertiesPage.js     # Property listings
│   │   ├── TasksPage.js          # Task board
│   │   ├── DocumentsPage.js      # Document management
│   │   ├── SettingsPage.js       # User/admin settings
│   │   ├── AnalyticsDashboard.js # Analytics + reports
│   │   ├── MyDealsPage.js        # Client view (buyer/seller)
│   │   ├── DealPartiesTab.js     # Deal party editor
│   │   ├── DealChatTab.js        # Deal chat/messages
│   │   ├── DealDocumentsTab.js   # Deal document portal
│   │   ├── DealFinancialsTab.js  # Deal financials/commission
│   │   ├── DealProgressTab.js    # Deal contingencies/checklist
│   │   ├── DealEditModal.js      # Modal deal editor
│   │   ├── ActivityLogView.js    # Audit trail viewer
│   │   ├── LeadPdfViewer.js      # PDF document viewer
│   │   ├── ImageUpload.js        # Image uploader component
│   │   ├── InviteAcceptor.js     # Invite link handler
│   │   ├── LoginPage.js          # Auth UI (Google + email)
│   │   ├── Layout.js             # Sidebar + TopBar + BottomNav
│   │   ├── Icons.js              # SVG icon library + getNavItemsForRole()
│   │   ├── Toast.js              # Toast notification system
│   │   ├── ErrorBoundary.js      # Error recovery component
│   │   ├── ConfirmModal.js       # Confirmation dialog
│   │   ├── Loading.js            # Loading spinner
│   │   └── roleNav.test.js       # Role-based nav test
│   ├── contexts/                 # React context providers
│   │   └── UserContext.js        # Auth state + user doc listener
│   └── utils/                    # Utility functions + hooks
│       ├── permissions.js        # Role-based access helpers
│       ├── permissions.test.js   # Permission tests
│       ├── auditLog.js           # Activity logger
│       ├── useUserDoc.js         # Auth state hook (thin wrapper)
│       ├── useEscapeKey.js       # Keyboard handler
│       ├── useDebounce.js        # Debounce hook
│       ├── lazyWithReload.js     # Page lazy-load + cache-bust
│       ├── helpers.js            # Address normalization, admin detect, etc.
│       ├── cloudinary.js         # Cloudinary config (single source)
│       ├── emailService.js       # Email API client
│       ├── notifications.js      # Notification listener setup
│       ├── notifications.test.js # Notification tests
│       └── ...                   # Other utilities
├── api/                          # Vercel serverless functions
│   ├── _lib/                     # Shared modules
│   │   └── firebaseAdmin.js      # Firebase Admin SDK init
│   ├── health.js                 # Diagnostics endpoint
│   ├── send-email.js             # Email sending (Resend)
│   ├── accept-invite.js          # Invite token handler
│   └── lead-intake.js            # Webhook for lead form
├── public/                       # Static assets
│   ├── index.html                # HTML template
│   ├── dealcenter-logo.png       # Brand logo
│   ├── pdf.worker.min.mjs        # PDF.js worker
│   └── ...                       # Favicons, robots.txt
├── docs/                         # Project documentation
│   └── DATABASE_SCHEMA.md        # Firestore collections schema
├── .github/                      # CI/CD workflows
│   └── workflows/
│       ├── ci.yml                # Lint + test + build
│       └── auto-merge-to-main.yml # Auto-merge claude/** branches
├── .planning/                    # GSD planning directory
│   └── codebase/                 # Codebase analysis docs
│       ├── ARCHITECTURE.md       # System design
│       └── STRUCTURE.md          # This file
├── .claude/                      # Claude Code settings
│   └── settings.json
├── package.json                  # Dependencies + scripts
├── package-lock.json             # Dependency lock
├── firestore.rules               # Firestore security rules (source)
├── firestore.indexes.json        # Composite indexes config
├── vercel.json                   # Vercel deployment config
├── CLAUDE.md                     # Project instructions
└── README.md                     # Project overview
```

## Directory Purposes

**src/:**
- Purpose: React application source code
- Contains: Components, contexts, utilities, entry point
- Key files: `App.js` (shell), `firebase.js` (config), `App.css` (design tokens)

**src/components/:**
- Purpose: All React components — pages, modals, layout, utilities
- Contains: 43 .js files organized by feature area (Deals, CRM, Contacts, etc.)
- Key files: `Layout.js` (nav), `Toast.js` (notifications), `LoginPage.js` (auth)

**src/contexts/:**
- Purpose: React context providers for app-wide state
- Contains: UserContext (auth + userDoc listener)
- Pattern: Single context per logical concern; used via custom hooks

**src/utils/:**
- Purpose: Reusable business logic, hooks, helpers
- Contains: Permission checks, audit logging, debounce/escape hooks, helpers
- Key files: `permissions.js` (access control), `auditLog.js` (audit trail), `cloudinary.js` (media config)

**api/:**
- Purpose: Vercel serverless backend — admin tasks, webhooks, external integrations
- Contains: 4 functions + Firebase Admin init
- Key files: `send-email.js` (Resend), `firebaseAdmin.js` (Admin SDK setup)

**public/:**
- Purpose: Static assets served at `/`
- Contains: HTML template, logo, PDF.js worker, favicon
- Key files: `index.html` (root template), `pdf.worker.min.mjs` (required for react-pdf)

**docs/:**
- Purpose: Project documentation
- Contains: DATABASE_SCHEMA.md (Firestore schema reference)

**.planning/codebase/:**
- Purpose: GSD codebase analysis documents
- Contains: ARCHITECTURE.md, STRUCTURE.md, and future docs (STACK.md, TESTING.md, etc.)

## Key File Locations

**Entry Points:**
- `src/index.js`: React app bootstrap; wraps App with providers (UserProvider, ToastProvider, ErrorBoundary)
- `src/App.js`: Main router; lazy-loads 11 pages; manages global tab state and sub-nav state

**Configuration:**
- `src/firebase.js`: Firebase project config (web API key, project ID), Auth/Firestore/Storage initialization, ensureUserExists() on first signin
- `src/App.css`: Design tokens (CSS variables: --text-primary, --accent, --surface-*, --font-*, --space-*, etc.)
- `src/utils/cloudinary.js`: Cloudinary cloud name + unsigned upload preset (single source of truth)
- `vercel.json`: Vercel security headers (CSP, X-Frame-Options, HSTS)

**Core Logic:**
- `src/contexts/UserContext.js`: Auth state + userDoc (roles, assignments) listener; called by all auth-dependent components
- `src/utils/permissions.js`: Role-based access helpers (canUserAccess, canUserManageProperty, getEditableFields, canEditField)
- `src/utils/auditLog.js`: logActivity() fire-and-forget audit trail to activity_log collection
- `src/components/Layout.js`: Navigation shell (Sidebar + TopBar + BottomNav), role-based nav items, notification bell

**Testing:**
- `src/utils/permissions.test.js`: Unit tests for permission helpers
- `src/utils/notifications.test.js`: Notification system tests
- `src/components/roleNav.test.js`: Role-based navigation tests
- `setupTests.js`: Jest configuration

**Firebase:**
- `firestore.rules`: Firestore security rules (source of truth for access control; NOT auto-synced; must paste into Console)
- `firestore.indexes.json`: Documents required composite indexes (userId + status + createdAt, etc.)
- `api/_lib/firebaseAdmin.js`: Firebase Admin SDK init (modular v14 API; requires FIREBASE_SERVICE_ACCOUNT env var)

## Naming Conventions

**Files:**
- Pages: `XxxPage.js` (e.g., `HomePage.js`, `DealsPage.js`)
- Features (sub-pages): `XxxTab.js` for detail views within a page (e.g., `DealPartiesTab.js`)
- Modals: `XxxModal.js` (e.g., `DealEditModal.js`)
- Utilities: lowercase `xxx.js` or `useXxx.js` for hooks (e.g., `useUserDoc.js`, `permissions.js`)
- Tests: `xxx.test.js` (e.g., `permissions.test.js`)

**Directories:**
- Component folders: `src/components/` (flat; no nesting)
- Context folders: `src/contexts/` (one context per file)
- Utility folders: `src/utils/` (flat; all utility files together)
- API folders: `api/` (flat; serverless functions in root; shared code in `_lib/`)

**Functions & Variables:**
- React components: PascalCase (e.g., `HomePage`, `useUserDoc`)
- Helper functions: camelCase (e.g., `logActivity`, `canUserAccess`)
- Constants: UPPER_SNAKE_CASE (e.g., `ADMIN_EMAIL`, `HOME_KPI_CACHE_TTL_MS`)
- Role/permission strings: lowercase kebab-case (e.g., `'admin'`, `'agent'`, `'deal-documents'`)

## Where to Add New Code

**New Page (e.g., Invoices page):**
1. Create `src/components/InvoicesPage.js` — main router with sub-nav and lazy-loaded sub-pages
2. Create `src/components/InvoiceListPage.js`, `InvoiceDetailPage.js` — feature pages
3. Add to `App.js`: lazy-load it, add to nav items, handle activeTab routing
4. Add to `getNavItemsForRole()` in `src/components/Icons.js` if role-restricted
5. Create `src/components/InvoicesPage.test.js` for integration tests

**New Modal/Dialog (e.g., bulk assign property modal):**
1. Create `src/components/BulkAssignModal.js` (functional component)
2. Use `useEscapeKey()` to handle Escape key
3. Import in parent page component that needs it
4. Use `ConfirmModal` for destructive actions; `Toast` for feedback

**New Utility/Hook (e.g., useCache):**
1. Create `src/utils/useCache.js` — export default and named exports
2. If it's a permission-like business rule, add to `src/utils/permissions.js` instead
3. Add tests to `src/utils/useCache.test.js`
4. Document usage in this file

**New Audit Action (e.g., property status changed):**
1. Call `logActivity('status_changed', 'property', propertyId, description, changes)` at the point of state change
2. It appends to `activity_log` collection with current user context
3. No need to modify Firestore rules; activity_log rules already allow create-as-self

**New Serverless Function (e.g., PDF generation):**
1. Create `api/generate-pdf.js` — export default handler function `(req, res) => { ... }`
2. Use `getDb()` and `getAuthAdmin()` from `api/_lib/firebaseAdmin.js` for admin access
3. Validate Firebase ID token (copy pattern from `send-email.js`) or use secret header
4. Return JSON response with 200/4xx/5xx status code
5. Deploy via `git push` to `main`; Vercel auto-deploys

**New Database Collection (e.g., invoices):**
1. Add to `docs/DATABASE_SCHEMA.md` with schema example
2. Update `firestore.rules` with access control (likely userId-scoped like deals)
3. Add composite index config to `firestore.indexes.json` if querying with orderBy
4. Manually create indexes in Firebase Console (rules are not auto-synced)
5. Create page components to manage it (e.g., InvoicesPage.js)

## Special Directories

**build/:**
- Purpose: Production build output
- Generated: Yes (by `npm run build`)
- Committed: No (in .gitignore)

**node_modules/:**
- Purpose: npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (in .gitignore)

**rems-project-source-2026-04-09.zip:**
- Purpose: Old source snapshot (deprecated)
- Skip in exploration: Yes (exclude from analysis)

**.env files:**
- Purpose: Environment variables (secrets, API keys)
- Generated: No (manual setup)
- Committed: No (in .gitignore)
- Note: Contains FIREBASE_SERVICE_ACCOUNT (JSON), RESEND_API_KEY, etc. — never read in mapping

---

*Structure analysis: 2026-07-06*
