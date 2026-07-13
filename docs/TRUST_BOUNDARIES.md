# REMS - Trust Boundaries

## Overview

REMS uses the browser app for user workflows, Vercel serverless functions for privileged integrations, Firebase Authentication for identity, and Firestore rules for data enforcement. Client-side checks improve UX, but they are not the security boundary.

## Browser Client

The React app may:

- Read public client configuration such as Firebase web config and Cloudinary unsigned upload config.
- Request Firebase ID tokens from the signed-in user.
- Hide or disable UI based on role and assignment helpers.
- Call serverless endpoints with a Firebase ID token or documented integration key.

The React app must not:

- Receive Cloudinary Admin API secrets, Resend API keys, Firebase service account JSON, or Sentry server DSNs.
- Decide final data authorization without Firestore rules.
- Treat hidden navigation or disabled controls as enforcement.

## Serverless API Functions

Serverless handlers under `api/` are the boundary for privileged third-party operations.

| Endpoint | Caller Proof | Privileged Operation | Failure Behavior |
|---|---|---|---|
| `api/send-email.js` | Firebase ID token verified through Identity Toolkit. | Sends email through Resend. | Missing/invalid auth returns 401; malformed payload returns 400; missing provider config returns 503; provider failure returns 502. |
| `api/accept-invite.js` | Firebase ID token verified through Firebase Admin. | Links invited users to deal-party access and user assignment fields. | Missing/invalid auth returns 401; malformed payload returns 400; setup failure returns 503; mismatched invite email returns 403. |
| `api/lead-intake.js` | `x-api-key` matching `LEAD_INTAKE_KEY`. | Creates leads and admin notifications through Firebase Admin. | Missing config returns 503; invalid key returns 401; malformed payload returns 400. |
| `api/delete-media.js` | Firebase ID token verified through Identity Toolkit. | Deletes Cloudinary media with Admin API credentials. | Missing/invalid auth returns 401; malformed payload returns 400; missing Cloudinary secrets returns 503; provider rejection returns 502. |
| `api/health.js` | None for public status; admin Firebase token for details. | Reports integration diagnostics only to admin. | Public/non-admin callers receive only `{ "status": "ok" }`. |
| `api/csp-report.js` | None by design — browsers post CSP Report-Only violations credential-less. | Logs/forwards the violation report (no business-data mutation). | Non-POST returns 405; all valid reports return 204. |

`api/csp-report.js` is intentionally unauthenticated: browsers send CSP violation beacons without credentials, and the endpoint only records the report (never writes business data), so requiring a token would silently drop all reports. This mirrors the CSP spec and is a deliberate, low-risk open beacon. `api/lead-intake.js` (shared secret) and `api/csp-report.js` (open beacon) are the only two endpoints that do not verify a Firebase ID token; both auth postures are documented above.

## Firestore Rules

Firestore rules remain the enforcement layer for business data. UI role checks and serverless validation do not replace rules.

- Business collections are user-scoped with admin override.
- Property and deal assignment arrays grant limited non-owner access.
- Deal portal collections inherit access from their parent deal.
- `activity_log` is append-only.
- Rules changes are not deployed from git automatically; they must be published in Firebase Console.

## Cloudinary Media

Uploads remain unsigned browser uploads through the existing Cloudinary preset. Deletes are server-side only because they require Admin API credentials.

The browser calls `deleteFromCloudinary(publicId, resourceType)`, which obtains the current Firebase ID token and posts to `api/delete-media.js`. If the server cannot authenticate the user, validate the payload, or reach/configure Cloudinary, the delete flow fails before the Firestore record is removed. This prevents the app from silently orphaning newly deleted media during the hardened path.

Existing records without `publicId` cannot be deleted from Cloudinary by the app because Cloudinary requires a public ID. Those records still delete from Firestore as before.

## Observability

Sentry is optional and environment-gated. When configured, uncaught serverless exceptions and React render errors are reported. Expected validation, authorization, and provider errors still return typed responses and are not automatically reported as exceptions.
