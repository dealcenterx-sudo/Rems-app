# REMS - Firestore Indexes

## Overview

`firestore.indexes.json` documents the composite indexes required by current REMS queries. Firebase does not automatically create these from git for production; create or verify them in Firebase Console before considering Phase 5 production-ready.

## Required Composite Indexes

| Collection | Fields | Query Surface |
|---|---|---|
| `deals` | `userId ASC`, `createdAt DESC` | Non-admin deals dashboard, active deals, analytics |
| `deals` | `userId ASC`, `status ASC`, `createdAt DESC` | Non-admin active/closed deal filters |
| `deals` | `status ASC`, `createdAt DESC` | Admin active/closed deal filters |
| `properties` | `userId ASC`, `createdAt DESC` | Non-admin properties and analytics |
| `properties` | `userId ASC`, `createdAt ASC` | Non-admin properties oldest-first sort |
| `contacts` | `userId ASC`, `createdAt DESC` | Non-admin contact list |
| `contacts` | `userId ASC`, `contactType ASC`, `createdAt DESC` | Non-admin contact type tabs |
| `contacts` | `contactType ASC`, `createdAt DESC` | Admin contact type tabs |
| `leads` | `userId ASC`, `submittedAt DESC` | Non-admin CRM dashboard and lead list date filters |
| `documents` | `userId ASC`, `createdAt DESC` | Non-admin document list |
| `documents` | `userId ASC`, `category ASC`, `createdAt DESC` | Non-admin document category filter |
| `documents` | `category ASC`, `createdAt DESC` | Admin document category filter |
| `tasks` | `userId ASC`, `dueDate ASC` | Non-admin task list |
| `deal-documents` | `dealId ASC`, `createdAt DESC` | Deal document tab |
| `deal-messages` | `dealId ASC`, `channelId ASC`, `createdAt ASC` | Deal chat messages |

## Operational Notes

- Admin-only queries can still need indexes when they combine a filter with `orderBy`; admin bypasses ownership rules, not Firestore query planning.
- Analytics has an in-memory fallback for missing indexes. Phase 5 reports that fallback to Sentry when `REACT_APP_SENTRY_DSN` is configured.
- Non-admin smoke testing should include deals, leads, contacts, documents, tasks, properties, deal documents, and deal chat after indexes are READY.
- If Firebase returns a console link for a missing index, compare it with this file before creating duplicates.
