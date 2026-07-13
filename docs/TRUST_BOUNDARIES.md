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

The per-collection access matrix below is the access model expressed as prose; it is derived from — and kept in lockstep with — the tested `firestore.rules`. Admin authority comes from `role == 'admin'` on the caller's `users/{uid}` doc (not from an email literal), record ownership from the `userId` field, and limited non-owner access from the `assignedProperties` / `assignedDeals` arrays on the caller's user doc. Deal portal collections resolve access through `canAccessDeal()`, which follows the parent deal. There is no admin catch-all rule: each collection grants admin access through its own `isAdmin()` clauses, so `activity_log` stays append-only even for admin.

| Collection | Read | Create | Update | Delete | Why |
|---|---|---|---|---|---|
| `users` | self or admin | self (never `role == 'admin'`) or admin | self, but not `role`/assignment fields; or admin | admin | Identity docs keyed by auth UID; only admin manages role and assignment arrays. |
| `contacts` / `leads` / `documents` / `campaigns` | owner or admin | self-owned or admin | owner (must keep owner) or admin | owner or admin | `userId`-scoped business records with admin override. |
| `deals` | owner, admin, or assigned (read-only) | self-owned or admin | owner (must keep owner) or admin | owner or admin | Assignees listed in `assignedDeals` get read-only portal access; the deal is never writable by an assignee. |
| `deal-parties` / `deal-channels` / `deal-documents` / `deal-progress` | `canAccessDeal(dealId)` | `canAccessDeal(dealId)` | `canAccessDeal(dealId)` | `canAccessDeal(dealId)` | Portal records inherit access from their parent deal (owner, admin, or assigned participant). |
| `deal-messages` / `deal-lender-pushes` | `canAccessDeal(dealId)` | `canAccessDeal(dealId)` | admin only | admin only | Message/push records are append-only for participants; only admin can edit or remove history. |
| `properties` | owner, admin, or assigned | self-owned or admin | owner or assigned (must keep owner); or admin | owner or admin | `assignedProperties` grants an agent read and update, but never delete. |
| `tasks` | owner, assignee, or admin | self-owned or admin | owner or assignee (must keep owner); or admin | owner or admin | The `assignedTo` user may act on a task assigned to them. |
| `notifications` | recipient or admin | any signed-in user, stamped as the actor | recipient or admin | recipient or admin | Anyone may notify a recipient; only the recipient (or admin) reads, marks read, or clears. |
| `activity_log` | admin | signed-in as self | nobody (incl. admin) | nobody (incl. admin) | Append-only audit trail; tamper-evident after SEC-04 removed the admin catch-all — history is immutable for everyone. |
| `companies` | member or admin | any signed-in user | owner or admin | owner or admin | Membership-scoped: readers must appear in `userIds`; writes require ownership or admin. |

## Cloudinary Media

Uploads remain unsigned browser uploads through the existing Cloudinary preset. Deletes are server-side only because they require Admin API credentials.

The browser calls `deleteFromCloudinary(publicId, resourceType)`, which obtains the current Firebase ID token and posts to `api/delete-media.js`. If the server cannot authenticate the user, validate the payload, or reach/configure Cloudinary, the delete flow fails before the Firestore record is removed. This prevents the app from silently orphaning newly deleted media during the hardened path.

Existing records without `publicId` cannot be deleted from Cloudinary by the app because Cloudinary requires a public ID. Those records still delete from Firestore as before.

## Observability

Sentry is optional and environment-gated. When configured, uncaught serverless exceptions and React render errors are reported. Expected validation, authorization, and provider errors still return typed responses and are not automatically reported as exceptions.
