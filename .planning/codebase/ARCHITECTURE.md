<!-- refreshed: 2026-07-06 -->
# Architecture

**Analysis Date:** 2026-07-06

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      Presentation Layer (UI)                         │
│  App Shell `src/App.js` with 11 lazy-loaded pages                   │
│  ┌─────────────┐ ┌────────────┐ ┌─────────┐ ┌──────────┐ etc.       │
│  │  HomePage   │ │ DealsPage  │ │ CRMPage │ │TasksPage │            │
│  │ `src/comp/` │ │ `src/comp/ │ │`src/com/│ │`src/com/ │            │
│  └─────────────┘ └────────────┘ └─────────┘ └──────────┘            │
└────────────────┬────────────────────────────────────────────────────┘
                 │ uses
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Navigation & State Management                     │
│  UserContext (Auth listener) — src/contexts/UserContext.js          │
│  Toast system — src/components/Toast.js                             │
│  Permission helpers — src/utils/permissions.js                      │
│  Layout (Sidebar, TopBar, BottomNav) — src/components/Layout.js     │
└────────────────┬────────────────────────────────────────────────────┘
                 │ reads/writes
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Firebase Client Layer                             │
│  Auth (Firebase Auth) — src/firebase.js                             │
│  Firestore (direct component queries) — src/firebase.js             │
│  Storage (Cloudinary + Firebase) — src/firebase.js                  │
└────────────────┬────────────────────────────────────────────────────┘
                 │ authenticated to
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Backend Services & APIs                           │
│  Vercel Serverless Functions (api/)                                 │
│  - send-email.js (Resend email API)                                 │
│  - accept-invite.js (user invitations)                              │
│  - lead-intake.js (webhook ingestion)                               │
│  - health.js (diagnostics)                                          │
└────────────────┬────────────────────────────────────────────────────┘
                 │ admin access to
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│            Firestore (Source of Truth) + External Services           │
│  Collections: users, contacts, leads, deals, properties, tasks,     │
│  documents, deal-*, activity_log, etc.                              │
│  External: Cloudinary (image/video), Resend (email)                 │
└─────────────────────────────────────────────────────────────────────┘
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

**Overall:** MVC-adjacent React + Firebase pattern with lazy-loaded pages and direct Firestore access.

**Key Characteristics:**
- **No Redux/global state manager** — React local state + Firebase as SSOT (single source of truth)
- **Component-level data fetching** — Each page/modal fetches its own data via Firestore queries
- **Lazy code-splitting** — Pages loaded on-demand via `lazyWithReload()` utility
- **Auth-first architecture** — Every user action verified at Firestore rules layer (UI checks are progressive enhancement)
- **Fire-and-forget audit** — `logActivity()` never blocks; errors logged silently

## Layers

**Presentation Layer:**
- Purpose: Render UI, handle user input, show notifications
- Location: `src/components/`
- Contains: 43 React components (pages, modals, forms, layout)
- Depends on: UserContext (auth/perms), Toast (notifications), Firebase (CRUD), lazyWithReload (code split)
- Used by: App.js (router)

**Navigation & Context Layer:**
- Purpose: Route pages, manage auth state, permission rules, notification dispatch
- Location: `src/App.js`, `src/contexts/UserContext.js`, `src/components/Layout.js`
- Contains: App shell, UserContext provider, layout components
- Depends on: Firebase (auth, user doc), component imports
- Used by: All pages

**Utility Layer:**
- Purpose: Reusable helpers, custom hooks, audit logging, permission checks
- Location: `src/utils/`
- Contains: `permissions.js`, `auditLog.js`, `useUserDoc.js`, `helpers.js`, `cloudinary.js`, etc.
- Depends on: Firebase, console
- Used by: Components, pages, contexts

**Firebase Client Layer:**
- Purpose: Authenticate users, initialize Firestore/Storage, first-signin user creation
- Location: `src/firebase.js`
- Contains: Firebase app initialization, Auth/Firestore/Storage setup, ensureUserExists()
- Depends on: Firebase SDK (web)
- Used by: UserContext, all components with Firestore queries

**API (Serverless) Layer:**
- Purpose: Backend operations (email, webhooks, user creation), admin-only tasks
- Location: `api/`
- Contains: Vercel serverless functions with Firebase Admin SDK
- Depends on: Firebase Admin SDK, external APIs (Resend, etc.)
- Used by: Components (via fetch), external webhooks

## Data Flow

### Primary Request Path (User creates a Deal)

1. **User navigates to Deals → New Deal** (`src/App.js:89-92`)
   - App.js changes `activeTab` and `dealsSubTab` to 'new'
   
2. **NewDealPage renders** (`src/components/NewDealPage.js:32-72`)
   - Load contacts (owner's userId + admin scope) via `getDocs(query(collection(db, 'contacts'), where('userId', '==', uid)))`
   - Load properties (same scope)
   - Populate modals for buyer/seller/property selection

3. **User selects buyer, seller, property and clicks Save** (`src/components/NewDealPage.js:74-87`)
   - Call `addDoc(collection(db, 'deals'), dealData)` with user context
   - Toast success/error
   - Call `logActivity('created', 'deal', dealId, description)` — fire-and-forget

4. **Firestore Rules evaluate** (`firestore.rules`)
   - userId field must match request.auth.uid OR request.auth.uid is admin
   - Deal-portal collections (`deal-parties`, `deal-messages`, etc.) inherit parent deal permissions

5. **Activity log written** (if logActivity succeeded)
   - Entry appended to `activity_log` collection with userId, action, entity, entityId

**State Management:**
- Component local state: `useState` for form data, modals, loading
- Context state: UserContext holds auth user + userDoc (roles, assignments)
- Firebase as SSOT: All writes land in Firestore immediately; reads pull fresh data on page load or subscribe via listeners
- No client-side caching except HomePage KPI cache (localStorage, 30s TTL)

### Secondary Flow: Admin Assigns Property to Agent

1. **Admin opens SettingsPage → Users tab**
2. Admin selects a user and adds propertyId to `assignedProperties` array
3. Firestore rule: `allow update: if request.auth.uid == resource.data.userId or isAdmin()`
4. Agent's browser polls `useUserDoc()` → refreshUserDoc callback triggers
5. Agent's role-scoped queries now include assigned properties
6. Agent sees property in PropertiesPage with canUserManageProperty() check

## Key Abstractions

**UserContext + useUserDoc Hook:**
- Purpose: Single source of auth state + permissions across app
- Examples: `src/contexts/UserContext.js`, `src/utils/useUserDoc.js`
- Pattern: Provider wraps App; custom hooks call `useContext(UserContext)` to read state

**lazyWithReload Utility:**
- Purpose: Code-split pages on demand; reload on version updates
- Examples: All 11 pages in App.js use `lazyWithReload(() => import(...))`
- Pattern: Higher-order function wrapping React.lazy; handles cache busting

**logActivity Fire-and-Forget:**
- Purpose: Audit trail without blocking user action
- Examples: `src/utils/auditLog.js:10-26`
- Pattern: Async addDoc in try/catch; errors logged to console only

**canUserManageProperty / canUserAccess / canEditField:**
- Purpose: Progressive enhancement — UI checks what Firestore rules enforce
- Examples: `src/utils/permissions.js`
- Pattern: Export pure functions; called in render to decide edit button visibility

**Toast System:**
- Purpose: Non-blocking notifications (success, error, info)
- Examples: `src/components/Toast.js` (context + provider); `useToast()` in components
- Pattern: Context-based dispatch with auto-dismiss timer

## Entry Points

**App Bootstrap:**
- Location: `src/index.js`
- Triggers: Browser loads `/`
- Responsibilities: Render React app, wrap with providers (UserProvider, ToastProvider, ErrorBoundary)

**Page Navigation:**
- Location: `src/App.js` (main switch statement, tabs 60–300+)
- Triggers: User clicks nav item; URL query param changes
- Responsibilities: Unmount old page, lazy-load new page, manage sub-nav state (crmSubTab, dealsSubTab, etc.)

**Auth State Change:**
- Location: `src/contexts/UserContext.js:onAuthStateChanged`
- Triggers: User signs in/out
- Responsibilities: Call ensureUserExists(), set userDoc, call refreshUserDoc on admin changes

**Serverless Function Entry:**
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

**What would happen:** A `/src/services/dealService.ts` with `fetchDeals()`, `createDeal()` etc. that all components import.
**Why it's wrong (here):** Firestore rules enforce access; a service layer would duplicate that logic or bypass it. Direct component queries keep permission checks close to the render boundary.
**Do this instead:** Call Firestore directly in components; use `canUserAccess(userDoc, resource)` helpers for pre-flight UI checks.

### Problematic: Mixing admin and user queries

**What happens:** A component queries `collection(db, 'deals')` without `where('userId', '==', uid)` because "admin will see everything anyway."
**Why it's wrong:** Non-admin users hit a composite index error at runtime; breaks for test accounts.
**Do this instead:** Always include `where('userId', '==', uid)` for non-admin; conditionally drop it only if `isAdminUser()`.

## Error Handling

**Strategy:** Progressive enhancement + Firestore rules enforcement.

**Patterns:**
- **Client-side validation:** Check `canEditField()` before showing edit buttons; prevent invalid form submission with toast errors
- **Firestore rules:** True enforcement layer; client checks are UX-only
- **Firebase SDK errors:** Try/catch in components; toast.error() with generic message (never leak security details)
- **Unrecoverable errors:** ErrorBoundary catches render errors; shows fallback UI with "Try again" button
- **Audit failures:** logActivity() silently fails; never blocks user action (errors logged to console)

## Cross-Cutting Concerns

**Logging:** Console.error() for development; audit trail via logActivity() for business events; no external logging service (Sentry, Datadog) integrated.

**Validation:** 
- Form validation in components (required fields, email format, phone format)
- Firestore rules validate data model constraints (userId scoping, role-based edits, immutability)

**Authentication:**
- Firebase Auth (Google + email/password)
- ensureUserExists() creates user doc on first signin
- UserContext listener checks auth state on app load
- Per-endpoint auth: send-email.js validates Firebase ID token before Resend call

**Authorization:**
- Role-based (admin, agent, buyer, seller)
- Firestore rules enforce with canAccessDeal(), canAccessProperty() helpers
- UI progressive enhancement via getEditableFields(), canUserManageProperty()

---

*Architecture analysis: 2026-07-06*
