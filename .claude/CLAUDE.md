<!-- GSD:project-start source:PROJECT.md -->

## Project

**REMS — SaaS Professionalization Upgrade**

REMS (Real Estate Management System) is a live real estate CRM / operations platform for Deal Tech — a working product at https://rems-app.vercel.app/ serving admins, agents, buyers, and sellers. This milestone upgrades it from "functional app" to "professional-grade B2B SaaS": audited, polished, secure, documented, and confidently demoable to investors, customers, recruiters, or a technical reviewer.

**Core Value:** The product must feel and function like a serious production SaaS — every major flow polished, secured server-side, and explainable — without breaking any current production workflow.

### Constraints

- **Tech stack**: React 19 + CRA (react-scripts 5), Firebase, Cloudinary, Vercel — keep; no framework migration
- **Brand**: Dark UI, near-black background, #00ff88 accent, design tokens in src/App.css :root — preserve direction
- **Compatibility**: Backward-compatible changes only unless explicitly approved; do not break Google sign-in or email/password auth
- **Security**: No secrets in code or docs (variable names only); no destructive cloud/db changes without asking
- **Process**: Audit before implementation; build + lint + tests before shipping significant changes; small reviewable changes over rewrites
- **Deployment**: Per-phase merge to main deploys production — each phase must leave main shippable

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- JavaScript (ES2021+) — React 19 frontend (JSX/components), API serverless functions
- Firestore rules language — Database access control (`firestore.rules`)
- JSON — Configuration, package manifests, Firestore indexes

## Runtime

- Node.js 22.x (required; see `package.json` `engines.node`)
- Browser (React 19, modern Chrome/Firefox/Safari)
- npm 10.x (inferred from Node 22)
- Lockfile: `package-lock.json` (present)

## Frameworks

- React 19.2.3 — SPA frontend (Create React App with react-scripts 5.0.1)
- Firebase 12.8.0 — Web SDK (Auth, Firestore, Storage client)
- firebase-admin 13.10.0 — Server-side admin API (modular: `firebase-admin/app`, `/firestore`, `/auth`)
- Recharts 3.7.0 — Data visualization (charts, analytics dashboard)
- react-pdf 10.4.1 — PDF viewing (with pdfjs-dist 5.4.624 worker at `public/pdf.worker.min.mjs`)
- Jest (via react-scripts) — Unit tests, test runner
- @testing-library/react 16.3.1 — Component testing
- @testing-library/jest-dom 6.9.1 — Custom matchers
- @testing-library/user-event 13.5.0 — User interaction simulation
- Puppeteer 24.38.0 — Browser automation (for E2E/screenshot tests)
- react-scripts 5.0.1 — CRA build tooling, webpack, Babel, ESLint, Jest config
- Web Vitals 2.1.4 — Performance metrics reporting

## Key Dependencies

- cloudinary 2.9.0 — Image/file uploads (unsigned preset `rems_unsigned`, cloud name `dcirl3j3v`)
- Firebase SDKs (client + admin) — Serverless function integrations, real-time DB, auth, file storage
- react-dom 19.2.3 — React renderer
- pdfjs-dist 5.4.624 — PDF parsing (worker: `public/pdf.worker.min.mjs`)

## Configuration

- Runtime env vars (set in Vercel):
- No local `.env` file in repo; all config via Vercel secrets or hardcoded Firebase web config
- `react-scripts` handles Webpack, Babel, ESLint, Jest
- `.eslintConfig` in `package.json` extends `react-app` + `react-app/jest`
- Entry point: `src/index.js` → `src/App.js` (lazy-loaded page components)
- Output: `build/` (Create React App standard)
- ESLint (via react-scripts, config in `package.json`)
- No Prettier config detected — CRA default formatting

## Security Headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (no embedding)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains` (2 years, includes subdomains)
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` (all disabled)

## Platform Requirements

- Node 22.x
- npm 10.x
- Modern browser (Chrome/Firefox/Safari)
- Git (version control)
- Vercel hosting (auto-deploys from `main` branch)
- Firebase project (`rems-app-44205`) — Auth, Firestore, Storage provisioned
- Cloudinary account (image uploads)
- Resend API account (email service)
- Serverless functions runtime (Node.js on Vercel)

## Package Scripts

## CI/CD

- GitHub Actions (`.github/workflows/ci.yml`)
- Runs on push/PR to `main`: lint → test:ci → build
- Node 24 in CI (matches development)
- Auto-merge on pass (`auto-merge-to-main.yml`)

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- **Components:** PascalCase (e.g., `LoginPage.js`, `LoadingSpinner.js`, `CRMLeadDetailPage.js`)
- **Utilities:** camelCase (e.g., `permissions.js`, `notifications.js`, `helpers.js`)
- **Hooks:** camelCase with `use` prefix (e.g., `useUserDoc.js`, `useDebounce.js`, `useEscapeKey.js`)
- **Contexts:** PascalCase (e.g., `UserContext.js`)
- **Tests:** `*.test.js` suffix (e.g., `permissions.test.js`)
- **Config files:** camelCase or lowercase (e.g., `firebase.js`, `cloudinary.js`)
- Named exports: `export const functionName = ...`
- camelCase for all function names (utility, hooks, handlers)
- Verb-first naming for clear intent:
- camelCase for all local variables and state
- const by default; let only when reassignment is necessary
- Descriptive names over single letters (except loop indices)
- State variables follow `[state, setState]` pattern with React hooks
- UPPERCASE_WITH_UNDERSCORES for module-level constants
- Used for: config constants, lookup tables, enums, magic strings
- Design tokens (in `src/App.css`): lowercase with hyphens (e.g., `--text-primary`, `--surface-1`, `--accent`)
- Location: `src/App.css` in `:root` selector
- Naming: `--category-variant` pattern (e.g., `--text-primary`, `--surface-2`, `--accent-soft`)
- All components use `var(--token-name)` instead of hardcoded hex values

## Code Style

- ESLint with `react-app` and `react-app/jest` configs (from Create React App)
- Run with: `npm run lint`
- No explicit Prettier config; relies on ESLint defaults
- Indentation: 2 spaces (enforced by eslint via react-app)
- No semicolon requirement in eslint config; style is inconsistent in codebase (some files omit, some include)
- Max line length: not enforced
- `npm run lint` runs ESLint over `src/` with `.js` extension
- ESLint extends React App config which includes:
- Components use inline style objects, not CSS files (though some have `.css` companions)
- Always reference design tokens with `var(--token-name)` for colors, spacing, sizing
- Example:

## Import Organization

- Relative paths with `../` or `./` (no path aliases configured)
- Absolute imports from `src/` are not used
- Not used; components are imported individually
- Each component is its own entry point

## Error Handling

- **async/await with try/catch/finally:**
- **Firebase error translation:** Helper functions map Firebase error codes to user-friendly messages
- **Fire-and-forget for non-blocking operations:**
- **Graceful degradation:**
- **No error boundary pattern observed** in utility functions; `src/components/ErrorBoundary.js` exists but not extensively documented in codebase

## Logging

- `console.error()` for failures that interrupt user workflows
- `console.log()` not observed in production code (may be present in dead code)
- No structured logging or log levels above console
- Errors during auth state changes
- Failed Firestore writes (audit log, notifications)
- Failed fetch operations
- User-action side effects that fail silently (like notifications)

## Comments

- JSDoc for exported public functions (especially in utils/)
- Inline comments explaining non-obvious logic or workarounds
- Comments for Firebase security rule implications
- Comments for performance-sensitive operations (lazy loading, deduplication)
- Do NOT comment obvious code (e.g., `const x = 5; // set x to 5`)
- Used for exported utility functions, not component props
- Format: `/** ... */` over functions
- Include parameter types, return type, and usage example when helpful
- Example from `src/utils/permissions.js`:
- Component prop documentation: Not using PropTypes or TypeScript; props documented inline in JSDoc of component function if complex
- Example from `src/utils/notifications.js`:

## Function Design

- Utility functions range from 1-3 lines (simple checks) to 15-20 lines (complex transforms)
- No explicit max length enforced
- Preference for small, composable functions over monolithic ones
- Complex components split into sub-components or helpers
- Named parameters (destructuring) preferred over positional for 2+ params
- Default values in destructuring: `{ size = 40, color = '#0088ff' } = {}`
- Optional parameters use default values, not conditionals
- No rest parameters pattern observed
- Early returns for guard clauses:
- Implicit returns in arrow functions when body is single expression
- Boolean helpers return early for falsy conditions
- Arrow functions preferred for: utility functions, event handlers, callbacks, component exports
- Regular `function` keyword not used in modern code
- Exception: None observed; arrow functions consistently used

## Module Design

- Named exports (`export const`) preferred for utilities
- Default exports used for:
- Mix of default and named exports in same file is common
- Not used in this codebase
- Each module directly exported; no `index.js` re-exports in `components/` or `utils/`
- Firebase services (`db`, `auth`, `storage`) imported from `src/firebase.js`
- Centralized initialization and re-export
- Components import auth state via `useUser()` context, not directly from firebase
- Firestore queries written directly in components or utility functions

## State Management

- Components use `useState()` for transient UI state (form inputs, UI toggles)
- Firestore collections are read/written directly via `firebase/firestore` SDK
- `UserContext` manages signed-in user state and user document (from Firestore)
- No Redux, Zustand, or other state library
- URL state synchronization in `src/App.js` to restore page navigation across refreshes

## Data Flow

- One-off reads: `getDoc()` in event handlers or useEffect
- Real-time listeners: Not observed in main codebase; snapshot-based reads are used
- Queries: Direct use of `query()`, `where()`, `orderBy()`, `limit()` in components
- Async handlers with try/catch
- useEffect cleanup functions for unsubscribes
- `finally` block to reset loading state

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **App Shell** | Router, page loader, page state (activeTab, subTabs), role-based nav | `src/App.js` |
| **UserContext** | Auth listener, user doc loader, role/permissions/assignments storage | `src/contexts/UserContext.js` |
| **Layout (Sidebar/TopBar/BottomNav)** | Main navigation UI, notifications, profile menu | `src/components/Layout.js` |
| **Firebase Init** | Auth config, user doc creation on first signin, admin detection | `src/firebase.js` |
| **HomePage** | Dashboard KPIs, stat queries, recent tasks, cache layer | `src/components/HomePage.js` |
| **DealsPage** | Deal CRUD, deal portal, pipeline views (new/active/closed) | `src/components/DealsPage.js`, `NewDealPage.js`, `DealPortalPage.js` |
| **CRMPage** | Lead management, campaigns, messages, email, reports | `src/components/CRMPage.js` |
| **ContactsPage** | Contact CRUD, type filtering (buyer/seller/agent/lender) | `src/components/ContactsPage.js` |
| **PropertiesPage** | Property listings, status/pricing management, media gallery | `src/components/PropertiesPage.js` |
| **TasksPage** | Task board, priority filtering, completion tracking | `src/components/TasksPage.js` |
| **DocumentsPage** | Document upload/download, PDF viewer, deal document portal | `src/components/DocumentsPage.js` |
| **Toast System** | Notifications (success/error/info), auto-dismiss | `src/components/Toast.js` |
| **ErrorBoundary** | Render error recovery, fallback UI | `src/components/ErrorBoundary.js` |
| **Audit Log** | Activity trail (create/update/delete/role change) | `src/utils/auditLog.js` |
| **Permissions** | Role-based field access, resource ownership checks | `src/utils/permissions.js` |

## Pattern Overview

- **No Redux/global state manager** — React local state + Firebase as SSOT (single source of truth)
- **Component-level data fetching** — Each page/modal fetches its own data via Firestore queries
- **Lazy code-splitting** — Pages loaded on-demand via `lazyWithReload()` utility
- **Auth-first architecture** — Every user action verified at Firestore rules layer (UI checks are progressive enhancement)
- **Fire-and-forget audit** — `logActivity()` never blocks; errors logged silently

## Layers

- Purpose: Render UI, handle user input, show notifications
- Location: `src/components/`
- Contains: 43 React components (pages, modals, forms, layout)
- Depends on: UserContext (auth/perms), Toast (notifications), Firebase (CRUD), lazyWithReload (code split)
- Used by: App.js (router)
- Purpose: Route pages, manage auth state, permission rules, notification dispatch
- Location: `src/App.js`, `src/contexts/UserContext.js`, `src/components/Layout.js`
- Contains: App shell, UserContext provider, layout components
- Depends on: Firebase (auth, user doc), component imports
- Used by: All pages
- Purpose: Reusable helpers, custom hooks, audit logging, permission checks
- Location: `src/utils/`
- Contains: `permissions.js`, `auditLog.js`, `useUserDoc.js`, `helpers.js`, `cloudinary.js`, etc.
- Depends on: Firebase, console
- Used by: Components, pages, contexts
- Purpose: Authenticate users, initialize Firestore/Storage, first-signin user creation
- Location: `src/firebase.js`
- Contains: Firebase app initialization, Auth/Firestore/Storage setup, ensureUserExists()
- Depends on: Firebase SDK (web)
- Used by: UserContext, all components with Firestore queries
- Purpose: Backend operations (email, webhooks, user creation), admin-only tasks
- Location: `api/`
- Contains: Vercel serverless functions with Firebase Admin SDK
- Depends on: Firebase Admin SDK, external APIs (Resend, etc.)
- Used by: Components (via fetch), external webhooks

## Data Flow

### Primary Request Path (User creates a Deal)

- Component local state: `useState` for form data, modals, loading
- Context state: UserContext holds auth user + userDoc (roles, assignments)
- Firebase as SSOT: All writes land in Firestore immediately; reads pull fresh data on page load or subscribe via listeners
- No client-side caching except HomePage KPI cache (localStorage, 30s TTL)

### Secondary Flow: Admin Assigns Property to Agent

## Key Abstractions

- Purpose: Single source of auth state + permissions across app
- Examples: `src/contexts/UserContext.js`, `src/utils/useUserDoc.js`
- Pattern: Provider wraps App; custom hooks call `useContext(UserContext)` to read state
- Purpose: Code-split pages on demand; reload on version updates
- Examples: All 11 pages in App.js use `lazyWithReload(() => import(...))`
- Pattern: Higher-order function wrapping React.lazy; handles cache busting
- Purpose: Audit trail without blocking user action
- Examples: `src/utils/auditLog.js:10-26`
- Pattern: Async addDoc in try/catch; errors logged to console only
- Purpose: Progressive enhancement — UI checks what Firestore rules enforce
- Examples: `src/utils/permissions.js`
- Pattern: Export pure functions; called in render to decide edit button visibility
- Purpose: Non-blocking notifications (success, error, info)
- Examples: `src/components/Toast.js` (context + provider); `useToast()` in components
- Pattern: Context-based dispatch with auto-dismiss timer

## Entry Points

- Location: `src/index.js`
- Triggers: Browser loads `/`
- Responsibilities: Render React app, wrap with providers (UserProvider, ToastProvider, ErrorBoundary)
- Location: `src/App.js` (main switch statement, tabs 60–300+)
- Triggers: User clicks nav item; URL query param changes
- Responsibilities: Unmount old page, lazy-load new page, manage sub-nav state (crmSubTab, dealsSubTab, etc.)
- Location: `src/contexts/UserContext.js:onAuthStateChanged`
- Triggers: User signs in/out
- Responsibilities: Call ensureUserExists(), set userDoc, call refreshUserDoc on admin changes
- Location: `api/send-email.js`, `api/accept-invite.js`, etc.
- Triggers: POST from frontend or external webhook
- Responsibilities: Validate Firebase ID token, execute admin task, return JSON response

## Architectural Constraints

- **Threading:** Single-threaded event loop (JavaScript/React); Firestore client SDK handles async/await
- **Global state:** UserContext singleton per app instance; Toast context singleton
- **Circular imports:** Unlikely due to layered file structure (components → utils → firebase)
- **Admin detection:** `isAdminUser()` checks `auth.currentUser.email === 'dealcenterx@gmail.com'` — no role inference; rely on Firestore rules for enforcement
- **No third-party state library:** Explicit use of React local state + Firebase; simplifies testing and bundle size
- **Direct Firestore access:** No query builder abstraction; components call `getDocs(query(...))` directly — limits code reuse but enables fine-grained permission boundaries per collection

## Anti-Patterns

### Non-Existent: Pure data services

### Problematic: Mixing admin and user queries

## Error Handling

- **Client-side validation:** Check `canEditField()` before showing edit buttons; prevent invalid form submission with toast errors
- **Firestore rules:** True enforcement layer; client checks are UX-only
- **Firebase SDK errors:** Try/catch in components; toast.error() with generic message (never leak security details)
- **Unrecoverable errors:** ErrorBoundary catches render errors; shows fallback UI with "Try again" button
- **Audit failures:** logActivity() silently fails; never blocks user action (errors logged to console)

## Cross-Cutting Concerns

- Form validation in components (required fields, email format, phone format)
- Firestore rules validate data model constraints (userId scoping, role-based edits, immutability)
- Firebase Auth (Google + email/password)
- ensureUserExists() creates user doc on first signin
- UserContext listener checks auth state on app load
- Per-endpoint auth: send-email.js validates Firebase ID token before Resend call
- Role-based (admin, agent, buyer, seller)
- Firestore rules enforce with canAccessDeal(), canAccessProperty() helpers
- UI progressive enhancement via getEditableFields(), canUserManageProperty()

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
