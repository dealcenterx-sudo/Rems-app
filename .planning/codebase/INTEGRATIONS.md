# External Integrations

**Analysis Date:** 2026-07-06

## APIs & External Services

**Email:**
- Resend — Transactional email sending
  - SDK/Client: Native `fetch` POST to `https://api.resend.com/emails`
  - Auth: `RESEND_API_KEY` env var (Vercel secret)
  - Implementation: `api/send-email.js` (authenticated endpoint; requires Firebase ID token)
  - Configuration: `EMAIL_FROM` env var (defaults to `'REMS <onboarding@resend.dev>'`)

**Identity & Authentication:**
- Google Identity Toolkit API — Firebase token validation
  - Endpoint: `https://identitytoolkit.googleapis.com/v1/accounts:lookup`
  - Key: Hardcoded Firebase web API key (`AIzaSyCI2EX7aR0ZphG36_IlUQqt0nFozedj5pI`) in `api/send-email.js`
  - Purpose: Verify caller's Firebase ID token and extract email before sending via Resend

**File Storage & Uploads:**
- Cloudinary — Image/file management (unsigned uploads)
  - Cloud name: `dcirl3j3v` (hardcoded in `src/utils/cloudinary.js`)
  - Unsigned preset: `rems_unsigned` (no server-side signature required)
  - Endpoint: `https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload`
  - Implementation: `src/utils/cloudinary.js` (client-side; `uploadToCloudinary()`, `uploadMultipleToCloudinary()`)
  - Folders: Organized by upload context (`properties`, etc.)
  - Note: Delete requires API secret (not implemented; TODO in code)

## Data Storage

**Databases:**
- Firebase Firestore (Cloud-hosted NoSQL document database)
  - Project: `rems-app-44205`
  - Client library: `firebase` 12.8.0 (via `src/firebase.js`)
  - Admin library: `firebase-admin` 13.10.0 (modular API; see `api/_lib/firebaseAdmin.js`)
  - Access: Real-time listeners, direct reads/writes, batch operations
  - Collections: users, contacts, leads, deals, properties, tasks, documents, activity_log, deal-* portal (6 subcollections)
  - Indexes: 3 composite indexes defined in `firestore.indexes.json` (userId+createdAt, userId+dueDate)
  - Security: Firestore Security Rules (`firestore.rules`) enforce per-user isolation + admin override

**File Storage:**
- Firebase Storage — Document uploads, property photos
  - Project: `rems-app-44205` (storageBucket in `src/firebase.js`)
  - Usage: Document PDFs, property images
  - No direct access control visible in codebase (relies on Firestore references)

- Cloudinary — Image uploads only (see File Storage & Uploads above)

**Caching:**
- None detected (no Redis, Memcached, or service worker caching logic)
- Client-side: React state + Firestore realtime listeners (automatic local cache via SDK)

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication
  - Web SDK: `firebase` 12.8.0
  - Supported methods:
    - Email/password (custom credentials)
    - Google OAuth (via `GoogleAuthProvider` in `src/firebase.js`)
  - User creation: Auto-created on first sign-in via `ensureUserExists()` in `src/firebase.js`
  - User doc keyed by Firebase Auth UID (`users/{uid}`)
  - Roles: admin, agent, buyer, seller (set on signup, admin unreachable via UI)
  - Admin email: `dealcenterx@gmail.com` (hardcoded in `src/firebase.js`, `api/lead-intake.js`)

**Session Management:**
- Firebase session tokens (ID tokens)
- sessionStorage used for signup role staging (`rems-pending-signup-role` key)
- No custom JWT or refresh token logic

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Datadog, or Rollbar integration)

**Logs:**
- Console logging only (`console.log`, `console.error` in API functions, React components)
- No centralized logging service
- Activity audit trail: `activity_log` collection in Firestore (append-only, written by `src/utils/auditLog.js`)

**Performance Metrics:**
- Web Vitals 2.1.4 — CRA performance measurement hook (optional reporting in `src/reportWebVitals.js`)
- Not actively sent anywhere (placeholder implementation)

## CI/CD & Deployment

**Hosting:**
- Vercel — Main platform (auto-deploys on push to `main`)
- Deployment: SPA frontend + serverless functions in `/api`
- Environment: Managed in Vercel dashboard (secrets, env vars)

**CI Pipeline:**
- GitHub Actions (`.github/workflows/ci.yml`, `auto-merge-to-main.yml`)
- Steps: Lint → Test:CI → Build
- Trigger: Pushes/PRs to `main`
- Auto-merge: Merges `claude/**` branches after CI passes

## Environment Configuration

**Required env vars:**
- `FIREBASE_SERVICE_ACCOUNT` — Service account JSON (for firebase-admin in API functions)
  - Format: JSON string; newlines may be escaped (code handles both)
  - Scope: API functions only
- `RESEND_API_KEY` — Resend API authentication
  - Scope: `api/send-email.js`
  - Optional `EMAIL_FROM` — Sender address (defaults to `'REMS <onboarding@resend.dev>'`)
- `LEAD_INTAKE_KEY` — Shared secret for external lead intake (`api/lead-intake.js`)
  - Checked via `x-api-key` header

**Firebase Web Config:**
- Hardcoded in `src/firebase.js` (public config, safe to expose):
  - apiKey: `AIzaSyCI2EX7aR0ZphG36_IlUQqt0nFozedj5pI`
  - authDomain: `rems-app-44205.firebaseapp.com`
  - projectId: `rems-app-44205`
  - storageBucket: `rems-app-44205.firebasestorage.app`
  - messagingSenderId: `177600513477`
  - appId: `1:177600513477:web:aed2a0572ed9a688f7b7ac`
  - measurementId: `G-C1X97KV5Q4`

**Secrets location:**
- All secrets managed in Vercel dashboard (project settings → Environment Variables)
- Pulled at build/deploy time
- Never committed to git (enforced by `.gitignore`)

## Webhooks & Callbacks

**Incoming:**
- `api/lead-intake.js` — Public endpoint for external lead submissions
  - Method: POST
  - Auth: `x-api-key` header (value: `LEAD_INTAKE_KEY`)
  - Payload: name, email, phone, serviceType, source, street, city, state, zipCode, propertyType, notes
  - Effect: Creates lead, notifies admin
- `api/accept-invite.js` — Private endpoint for deal-party invite acceptance
  - Method: POST
  - Auth: Firebase ID token (`Authorization: Bearer {idToken}`)
  - Payload: inviteToken
  - Effect: Consumes invite token, links user to deal-party, grants portal access

**Outgoing:**
- None detected (no webhooks pushed to external services)
- Firestore integrations (leads, deals, notifications) are pull-based (client listeners, admin API reads)

## Integration Health Endpoint

- `api/health.js` — Diagnostic endpoint (GET/POST)
  - Returns: boolean flags for Resend, Firebase, Lead Intake config + initialization status
  - Purpose: Operational monitoring (keys present, admin initialization working)

---

*Integration audit: 2026-07-06*
