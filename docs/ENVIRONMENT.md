# REMS - Environment Variables

## Overview

This file documents environment variable names, purposes, consumers, scope, and requiredness. It intentionally does not document values.

---

| Variable | Purpose | Consumed By | Scope | Required? |
|---|---|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK service account JSON for serverless functions. | `api/_lib/firebaseAdmin.js`; indirectly by Admin SDK API handlers | Runtime server | Required for Admin SDK functions |
| `RESEND_API_KEY` | Authenticates requests to Resend for transactional email delivery. | `api/send-email.js` | Runtime server | Required for email sending |
| `EMAIL_FROM` | Sender identity for outbound email. | `api/send-email.js` | Runtime server | Optional; code has a fallback |
| `LEAD_INTAKE_KEY` | Shared secret for external lead intake requests. | `api/lead-intake.js`; `api/health.js` diagnostics | Runtime server | Required for lead intake |
| `FIREBASE_API_KEY` | Firebase web API key used by serverless code for Identity Toolkit token lookup. | `api/_lib/config.js`; `api/send-email.js`; `api/health.js` | Runtime server | Optional during rollout because config keeps a checked-in public fallback |
| `REACT_APP_DEV_BYPASS` | Build-time flag that bypasses the client auth gate when set to `true`. Firestore rules still enforce data access. | `src/App.js` | Build-time client | Must be unset or false in production |
| `REACT_APP_CRM_EMAIL_WEBHOOK_URL` | Optional CRM email webhook target used by CRM email surfaces. | `src/components/CRMEmailInboxPage.js`; `src/components/CRMLeadDetailPage.js` | Build-time client | Optional, depending on webhook integration |
| `REACT_APP_SENTRY_DSN` | Enables client-side Sentry error and web-vitals capture when configured. | `src/utils/observability.js`; `src/index.js`; `src/components/ErrorBoundary.js` | Build-time client | Optional; observability is disabled when unset |
| `REACT_APP_SENTRY_ENVIRONMENT` | Optional client-side Sentry environment label. | `src/utils/observability.js` | Build-time client | Optional |
| `REACT_APP_SENTRY_TRACES_SAMPLE_RATE` | Optional client-side Sentry trace sample rate from `0` to `1`. | `src/utils/observability.js` | Build-time client | Optional; defaults to `0` |
| `SENTRY_DSN` | Enables serverless Sentry capture for API handlers when configured. | `api/_lib/withSentry.js`; wrapped `api/*` handlers | Runtime server | Optional; serverless observability is disabled when unset |
| `SENTRY_ENVIRONMENT` | Optional server-side Sentry environment label. | `api/_lib/withSentry.js` | Runtime server | Optional |
| `SENTRY_TRACES_SAMPLE_RATE` | Optional server-side Sentry trace sample rate from `0` to `1`. | `api/_lib/withSentry.js` | Runtime server | Optional; defaults to `0` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for server-side media deletes. | `api/_lib/config.js`; `api/delete-media.js` | Runtime server | Optional during rollout because server config has the current public fallback |
| `CLOUDINARY_API_KEY` | Cloudinary Admin API key for authenticated server-side media deletes. | `api/delete-media.js` | Runtime server | Required for media delete endpoint |
| `CLOUDINARY_API_SECRET` | Cloudinary Admin API secret for authenticated server-side media deletes. | `api/delete-media.js` | Runtime server | Required for media delete endpoint; never expose to the browser |

---

## Operator Notes

- Firebase web config in `src/firebase.js` is public client configuration, not a secret.
- Cloudinary public upload configuration remains centralized in `src/utils/cloudinary.js`. Server-side delete configuration lives in `api/_lib/config.js` plus Vercel runtime secrets because the browser must never receive the Cloudinary Admin API secret.
- Firestore rules are not deployed from git automatically. If a future phase changes `firestore.rules`, the user must publish the rules manually in Firebase Console.
- New variables added in later phases, such as observability or Cloudinary Admin API secrets, should be appended here before the phase is considered complete.
