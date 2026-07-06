# Codebase Concerns

**Analysis Date:** 2026-07-06

## Tech Debt

**Stray Source Archive and Directory:**
- Issue: `rems-project-source-2026-04-09/` directory and `rems-project-source-2026-04-09.zip` (773 KB) are committed to the repository despite `.gitignore` rules (`/rems-project-source-*` and `/rems-project-source-*.zip`)
- Files: Root directory contains both directory and ZIP file
- Impact: Bloats repo size, indicates incomplete cleanup, creates confusion about the actual source of truth
- Fix approach: Remove both from git history (`git rm -r rems-project-source-2026-04-09*`), then verify `.gitignore` works for future exports

**Temporary Diagnostics Endpoint Still in Production:**
- Issue: `api/health.js` was introduced as "Temporary diagnostics" (commit b8555a8) but remains active and exposed
- Files: `api/health.js` (lines 1-2 note it's temporary)
- Impact: Reveals infrastructure configuration to any caller (env var names for RESEND, FIREBASE, LEAD_INTAKE) via `matchingKeyNames` array; while no values are leaked, the schema disclosure is unnecessary exposure
- Fix approach: Either remove the endpoint entirely or gated it behind admin auth verification, and document the business need if it stays

**Hardcoded Admin Email Across Codebase:**
- Issue: `dealcenterx@gmail.com` hardcoded in 8+ locations instead of read from environment or Firestore config
- Files: `src/firebase.js:25`, `src/utils/helpers.js:4`, `src/utils/helpers.js:164`, `src/components/NewDealPage.js:35`, `src/components/CRMMessagesPage.js:143`, `src/components/DealsDashboard.js:61`, `src/components/CRMEmailInboxPage.js:73, 86, 264`, `api/lead-intake.js:7`
- Impact: If admin account ever changes, requires code refactor and redeploy across all functions; firestore.rules also hardcodes the email (line 16)
- Fix approach: Centralize in `src/config.js` or read from Firestore `_metadata/config` doc, then import everywhere. Update rules to read from a central location

**Hardcoded Firebase API Key in send-email.js:**
- Issue: Public Firebase API key hardcoded in `api/send-email.js:5` (`AIzaSyCI2EX7aR0ZphG36_IlUQqt0nFozedj5pI`)
- Files: `api/send-email.js` (line 5)
- Impact: Firebase API keys are meant to be public but hardcoding violates secrets management best practice; if the project ever needs to rotate keys, this requires manual code change
- Fix approach: Move to environment variable `FIREBASE_API_KEY` in Vercel env, import from `process.env` instead

**Cloudinary Delete Not Implemented:**
- Issue: `src/utils/cloudinary.js:48` has TODO: "Implement server-side delete endpoint"
- Files: `src/utils/cloudinary.js` (lines 46-50)
- Impact: `deleteFromCloudinary()` always returns true without actually deleting; removed images from DB don't get cleaned up on Cloudinary, wasting storage
- Fix approach: Create `api/delete-media.js` that validates auth, accepts public_id, calls Cloudinary API with secret, updates DB to mark deletion

**screenshot.js at Repository Root:**
- Issue: Puppeteer screenshot automation script (`screenshot.js`) is at repo root instead of in `scripts/` directory
- Files: `/screenshot.js` (66 lines, uses hardcoded paths `/root/.cache/ms-playwright/...` and `/tmp/shot-*.png`)
- Impact: Indicates development/test tooling committed to main repo; hardcoded paths won't work in other environments
- Fix approach: Move to `scripts/screenshot.js`, update paths to be relative/parameterized, add to `.gitignore` if it's generated

## Known Bugs

**Fallback to In-Memory Filtering on Missing Indexes:**
- Symptoms: `AnalyticsDashboard.js` detects missing Firestore composite indexes and silently falls back to loading all records and filtering client-side
- Files: `src/components/AnalyticsDashboard.js` (lines 62-75)
- Trigger: Run analytics with a date range; if composite index for `userId` + `createdAt` + `orderBy` doesn't exist, hits error code `failed-precondition`
- Workaround: Displays toast `"Fallback mode active for ${collectionName}: using in-memory date filtering."` but continues; no clear indication to user that results may be incomplete for large datasets
- Root cause: `firestore.indexes.json` documents only 3 indexes, but ad-hoc combinations may not be pre-created in Firebase Console

**Stale Deployment Recovery Workaround:**
- Symptoms: `lazyWithReload` helper reloads the page once if a chunk load fails (e.g., stale JS after deploy)
- Files: `src/utils/lazyWithReload.js` (lines 22-23 set sessionStorage flag to prevent infinite reloads)
- Workaround: Works for most cases but doesn't handle scenarios where the stale chunk is cached in service worker or CDN edge cache
- Impact: Users on older app versions may be stuck if chunk load persists across reload

## Security Considerations

**Admin Bypass via Email Fallback:**
- Risk: `firestore.rules:16` checks if `request.auth.token.email == 'dealcenterx@gmail.com'` as a fallback before checking the `users/{uid}.role` field; if an attacker can spoof the email claim (unlikely with Firebase but a layering issue), they get admin access
- Files: `firestore.rules:16` (admin email hardcoded), `src/firebase.js:72` (assigns role based on email at signup)
- Current mitigation: Firebase enforces email verification and token signing prevents spoofing; only the admin email itself can trigger the bypass
- Recommendations: Remove email fallback from rules once we're certain all admin docs have `role: 'admin'` set; add alerting if non-admin account tries to assume admin role

**Client-Side Permission UI Checks Are Not Enforcement:**
- Risk: `src/utils/permissions.js` implements `canUserAccess`, `canEditField`, etc. for UI visibility, but these don't prevent direct Firestore writes if rules are weak
- Files: `src/utils/permissions.js` (all checks are defensive UX only)
- Current mitigation: `firestore.rules` enforces all access; client checks are progressive enhancement
- Recommendations: Add tests to `src/utils/permissions.test.js` that verify all Firestore rules have corresponding client checks, and vice versa

**No Error Tracking or Incident Visibility:**
- Risk: `src/components/ErrorBoundary.js:18` has `console.error` with a comment "In production you'd ship this to Sentry / Datadog etc." — no actual error tracking is configured
- Files: `src/components/ErrorBoundary.js` (line 18), many API functions have `console.error` but no centralized logging
- Impact: Production errors silently fail; no visibility into user-facing issues or API failures until user complains
- Recommendations: Integrate Sentry (free tier works for this scale) or similar; add error tracking to all API endpoints

**Incomplete Input Validation in Serverless Functions:**
- Risk: `api/send-email.js:46-49` validates presence of fields but doesn't sanitize `to`, `subject`, `html` — potential for HTML injection via email body if Resend doesn't filter
- Files: `api/send-email.js` (lines 46-59)
- Current mitigation: Resend is a trusted provider and likely sanitizes; fields come from authenticated requests
- Recommendations: Add basic HTML escaping for plaintext fields; validate email addresses with a proper regex or library

## Performance Bottlenecks

**CRMLeadDetailPage Component Is 2678 Lines (Monolithic):**
- Problem: Largest component in codebase; manages 30+ pieces of state (lead data, form state, activity editing, PDF preview, email composer, etc.)
- Files: `src/components/CRMLeadDetailPage.js`
- Cause: Feature creep — component handles lead record, linked deals, activity log, document generation, email composition, all in one file
- Improvement path: Split into smaller components (`<LeadHeader>`, `<LeadForm>`, `<ActivityLog>`, `<DocumentPanel>`, `<EmailComposer>`) with local state lifting; each component becomes testable and maintainable
- Impact on change velocity: Any modification risks side effects; testing new features requires full page reload; debugging state mutations is expensive

**HomePage Caches KPIs in localStorage with 30-Second TTL:**
- Problem: Queries 11 different counts on every page load if cache misses or is stale; uses `Promise.all` to parallelize but still hits Firestore hard
- Files: `src/components/HomePage.js` (lines 86-100 with 11 parallel queries)
- Cause: Dashboard loads many count queries at once; no background refresh while showing stale data
- Improvement path: Implement SWR (stale-while-revalidate) pattern — serve cache immediately, refresh in background, update when fresh
- Impact: Users waiting for dashboard on slow connection see blank state for 2+ seconds while queries resolve

**AnalyticsDashboard Fetches All Records Then Filters Client-Side:**
- Problem: When composite index is missing, loads all deals/properties into memory (100s of docs), then filters and sorts client-side
- Files: `src/components/AnalyticsDashboard.js` (lines 45-77)
- Cause: No server-side filtering available without composite index
- Improvement path: Pre-create all required composite indexes in Firebase Console so server-side filtering always works; or paginate and fetch only needed date range
- Impact: Dashboard slow for admins with 500+ records; memory usage spikes

## Fragile Areas

**Permission Model Requires Manual Synchronization:**
- Files: `src/utils/permissions.js`, `firestore.rules`, `src/firebase.js:72` (role assignment), plus 8 scattered email checks
- Why fragile: Three separate sources of truth for who can do what (client permissions, Firestore rules, email hardcodes); if one changes, others must change in sync
- Safe modification: Always update all three (client check, rule, email) together; add tests that verify rules match client checks
- Test coverage: `src/utils/permissions.test.js` exists but only tests the utility functions, not the rules themselves

**UserContext and useUserDoc Pattern Can Race on Auth State Change:**
- Files: `src/contexts/UserContext.js` (manages auth and user doc), `src/utils/useUserDoc.js` (hook to read it)
- Why fragile: If user signs out and signs in quickly, the `ensureUserExists()` call in `onAuthStateChanged` may create a new doc if the previous user's rules didn't trigger a fetch yet
- Safe modification: Only mutate user role/assignments via admin API, never in the client; ensure `refreshUserDoc()` is called after any admin updates
- Test coverage: No tests for race conditions (user logs in, admin updates role, user sees old role until refresh)

**Firestore.rules Depends on Document Existence in Multiple Places:**
- Files: `firestore.rules` (lines 17-18, 80-81, 101-102, 145-147) — many rules check `exists(...)` which is expensive
- Why fragile: If a user doc is ever deleted or not created, all their access denials; if a deal is deleted, all deal-portal access breaks
- Safe modification: Add unit tests for rules with sample data; test deletion scenarios
- Test coverage: Rules are not tested — they're copy-pasted patterns that could have subtle bugs

## Scaling Limits

**Composite Indexes in Firestore Only Cover Happy Path:**
- Current capacity: Three indexes documented in `firestore.indexes.json` (deals, properties, tasks with `userId` + `createdAt`/`dueDate`)
- Limit: Any query combining `userId` with `orderBy` on other fields (e.g., `orderBy('status')`, `orderBy('priority')`) requires an additional composite index
- Scaling path: When new reporting features are added, manually create indexes in Firebase Console; audit Firestore usage logs regularly to catch missing indexes proactively

**Activity Log Is Append-Only and Unindexed:**
- Current capacity: `activity_log` grows without deletion; queries are allowed only for admin and only with `orderBy('createdAt', 'desc'), limit(100)`
- Limit: If activity log exceeds 10K+ docs, the unindexed full-collection read for admins becomes slow
- Scaling path: Partition by month (`activity_log_2026_07`) or implement time-based archival (move old entries to cold storage)

**Cloudinary Unsigned Upload with Fixed Folder:**
- Current capacity: Using single unsigned preset `rems_unsigned` for all uploads to folder-based organization; no per-user isolation
- Limit: If a malicious actor gets the preset name, they can upload to REMS Cloudinary account (though Vercel env keeps it secret)
- Scaling path: Implement signed uploads or per-user/per-deal upload signatures to prevent abuse

## Test Coverage Gaps

**No Tests for Firestore Rules:**
- What's not tested: Access control rules are never verified; no tests for `canAccessDeal()`, `isAdmin()`, role-based field visibility
- Files: `firestore.rules` (entire file untested)
- Risk: Rules bug could silently allow unauthorized access or lock users out; discovered only when users complain
- Priority: High — rules are the enforcement layer; should have comprehensive tests before any rule change

**No Tests for Serverless API Functions:**
- What's not tested: `api/send-email.js`, `api/accept-invite.js`, `api/lead-intake.js` have no unit tests; auth token validation, email payload construction, error handling all untested
- Files: All files in `api/` directory
- Risk: API bugs discovered in production; auth bypasses possible
- Priority: High — these handle auth and external integrations

**Monolithic CRMLeadDetailPage Has No Component Tests:**
- What's not tested: Form state mutations, save/cancel flows, activity log filtering, PDF preview, email composer interactions all rely on manual testing
- Files: `src/components/CRMLeadDetailPage.js`
- Risk: Refactoring this component is dangerous; regressions only caught by full app e2e test
- Priority: Medium — large component should be decomposed and tested in parts

**No Integration Tests for Firestore Queries with Missing Indexes:**
- What's not tested: Behavior of queries when composite index is missing; fallback-to-client-side filtering is untested
- Files: `src/components/AnalyticsDashboard.js` (lines 62-75)
- Risk: Index creation was delayed and fallback code is relied upon; no verification that fallback filtering is correct
- Priority: Medium — could produce incorrect analytics

---

*Concerns audit: 2026-07-06*
