# Phase 6: Firestore Rules Hardening - Research

**Researched:** 2026-07-13
**Domain:** Firestore Security Rules (authorization) on a LIVE production app — highest-risk phase of the milestone; launch gate
**Confidence:** HIGH (rules mechanics empirically verified on the JDK-21 emulator this session)

## Summary

This phase hardens the Firestore authorization layer on a live app. Two requirements land here: **SEC-04** (rules enforce admin by role document, not email; and the `activity_log` audit trail becomes truly append-only) and **SEC-05** (documented access-model assumptions that match the tested rules). The dominant risk is **admin lockout** — Firestore rules are NOT deployed from git; they only take effect when manually pasted into the Firebase Console and published, so the git `firestore.rules` and the LIVE Console rules can differ, and the LIVE rules are what governs production.

Two findings materially change the scope from what the roadmap headline implies:

1. **The SEC-04 email-fallback CODE change is already done in git.** `isAdmin()` (firestore.rules:13-17) checks `users/{uid}.role == 'admin'` ONLY — there is no admin-email literal or fallback anywhere in the git rules [VERIFIED: read of firestore.rules + grep]. The real SEC-04 work is therefore (a) the **lockout gate** — verify production data shows `users/{adminUid}.role == 'admin'` BEFORE role-only rules go live, (b) the **safe staged Console publish** of the hardened rules (production may still be running OLD email-based rules), and (c) **two-account production smoke tests**.

2. **The `activity_log` tamper hole is the real NEW code change this phase makes.** The `match /{document=**}` admin catch-all (firestore.rules:207-209, `allow read, write: if isAdmin()`) is OR'd with — and effectively overrides — `activity_log`'s `allow update, delete: if false` (firestore.rules:194). In Firestore, **a deny in one match cannot override an allow in another match — access is the OR/union of all matching rules** [CITED: firebase.google.com/docs/rules/rules-behavior]. So an admin can currently edit/delete audit entries. The fix is to **remove the catch-all** (verified safe below), which makes activity_log's `if false` the only matching write rule, then flip the Phase 2 characterization test's two admin assertions back to `assertFails`.

**Primary recommendation:** Remove the `match /{document=**}` catch-all entirely (empirically verified safe — all 16 app collections already have explicit admin rules), flip the two `activity_log` characterization assertions to `assertFails`, keep `isAdmin()` role-only, then land it on production via a lockout-gated, additive-then-subtractive staged Console publish (pbcopy offered), with `npm run test:rules` green before and after each publish and admin + non-admin production smoke after each publish. Separate the locally-verifiable half (emulator-green rules tests + SEC-05 doc) from the LIVE/HUMAN half (prod data check, Console publish, two-account smoke), per the Phase 2/3/4 precedent.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-04 | Firestore rules no longer contain the admin email fallback — removed only after production data verification (`users/{adminUid}.role == 'admin'`) and green rules tests, via additive-then-subtractive Console publishes with two-account smoke tests | Email fallback already absent in git rules (code half done); real work is the lockout gate + staged Console publish + smoke. The `activity_log` catch-all override (Phase 2 HIGH finding) is routed here and is the actual NEW rules change — verified fix below. |
| SEC-05 | A reviewer can read documented Firestore access-model assumptions (who can read/write what, and why) matching the tested rules | Per-collection access matrix derived directly from the tested rules; recommended home is an expanded `docs/TRUST_BOUNDARIES.md` Firestore section (or a new `docs/FIRESTORE_ACCESS_MODEL.md`). Full matrix drafted below in Architecture Patterns. |
</phase_requirements>

> **Note:** No `06-CONTEXT.md` exists in the phase directory (phase not yet discussed). This research is written against REQUIREMENTS.md, the roadmap success criteria, and the codebase. If `/gsd-discuss-phase` runs later, treat any locked decisions there as overriding the recommendations here.

## Project Constraints (from CLAUDE.md)

- **firestore.rules is NOT read from git by Firebase.** After changing it, the user must paste it into Firebase Console → Firestore → Rules → Publish. **Offer `pbcopy`** (`cat firestore.rules | pbcopy`) so the exact file can be pasted. [CITED: CLAUDE.md "Firestore Rules and Indexes"]
- **Admin identity:** admin email is `dealcenterx@gmail.com`; the admin's user doc carries `role: 'admin'`. Roles: `admin`, `agent`, `buyer`, `seller`. [CITED: CLAUDE.md]
- **Access model (source of truth = firestore.rules):** business collections are `userId`-scoped with admin override; properties additionally honor `users/{uid}.assignedProperties`; deals honor `assignedDeals` (read-only for assignees); the six `deal-*` portal collections follow the parent deal via `canAccessDeal()`; `activity_log` is append-only (create-as-self, admin read, no edits/deletes). [CITED: CLAUDE.md]
- **Isolation is enforced at the rules layer** — UI checks are progressive enhancement; query scope matters as much as UI visibility. Preserve admin vs regular-user data isolation. [CITED: CLAUDE.md "Critical Rules"]
- **Do not break Google sign-in or email/password auth.** Backward-compatible changes only. Each phase must leave `main` shippable (per-phase merge deploys production). [CITED: .claude/CLAUDE.md]
- **No destructive cloud/db changes without approval.** A rules publish that locks out the admin is exactly the class of change this constraint guards against — hence the lockout gate. [CITED: .claude/CLAUDE.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Data authorization (who reads/writes what) | Database / Storage (Firestore rules) | — | Firestore rules are THE enforcement layer; UI/serverless checks never replace them [CITED: TRUST_BOUNDARIES.md] |
| Admin identity resolution | Database / Storage (rules `isAdmin()` reads `users/{uid}.role`) | — | Role lives in the user doc; rules `get()` it at eval time |
| Audit-trail immutability | Database / Storage (rules) | — | Append-only must be enforced in rules; app-layer discipline is not tamper-proof |
| Rules deployment | Human (Firebase Console publish) | — | Rules are NOT deployed from git; Console paste is the only deploy path |
| Rules correctness verification | Local tooling (emulator + vitest) | CI (Java-21 runner) | `npm run test:rules` characterizes/verifies rules against the on-disk file |
| Production access verification | Human (Console query + two-account smoke) | — | Only a live signed-in account proves the live rules behave |

## Standard Stack

This phase uses **only tooling already present** — no new dependencies.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `firebase-tools` | ^15.22.4 (devDep) | `firebase emulators:exec` runs the Firestore emulator for rules tests | Official Firebase CLI; already wired in `test:rules` [VERIFIED: package.json] |
| `@firebase/rules-unit-testing` | ^5.0.1 (devDep) | `initializeTestEnvironment`, `assertSucceeds`, `assertFails` against the emulator | Official Firebase rules-testing lib; already used by the Phase 2 suite [VERIFIED: package.json + test file] |
| `vitest` | 4.1.10 (devDep) | Test runner for `tests/rules/` (separate from CRA Jest) | Already the runner for the rules suite [VERIFIED: emulator run this session] |
| OpenJDK | 21.0.11 | JVM the Firestore emulator requires (JDK 21) | Installed at `/usr/local/opt/openjdk@21`; the default host JDK is 1.8 which the emulator rejects [VERIFIED: `java -version`] |

**Installation:** None. `npm ci` already provides the JS tooling; JDK 21 is installed at `/usr/local/opt/openjdk@21`.

**Run command (this session, locally):**
```bash
export JAVA_HOME=/usr/local/opt/openjdk@21
export PATH="$JAVA_HOME/bin:$PATH"
npm run test:rules   # => firebase emulators:exec --only firestore ... "vitest run tests/rules"
```
[VERIFIED: executed twice this session — baseline 15/15 green, and with the candidate SEC-04 fix 15/15 green]

## Package Legitimacy Audit

**No external packages are installed in this phase.** All tooling (`firebase-tools`, `@firebase/rules-unit-testing`, `vitest`) already exists in `devDependencies` and was exercised green this session. Legitimacy gate is a no-op.

| Package | Registry | Disposition |
|---------|----------|-------------|
| (none — no installs this phase) | — | N/A |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### Current rules map (firestore.rules, 211 lines)

**Helper functions (lines 8-31, 75-79, 91-103, 141-145):**

| Helper | Definition | Lines |
|--------|-----------|-------|
| `isSignedIn()` | `request.auth != null` | 8-10 |
| `isAdmin()` | signed in AND `get(users/{uid}).data.role == 'admin'` — **role only, no email** | 13-17 |
| `ownsResource()` | signed in AND `resource.data.userId == request.auth.uid` | 20-22 |
| `createsAsSelf()` | signed in AND `request.resource.data.userId == request.auth.uid` | 24-26 |
| `keepsOwner()` | `request.resource.data.userId == resource.data.userId` (no owner reassignment on update) | 29-31 |
| `isAssignedToDeal()` (nested in deals) | `docId in get(users/{uid}).data.assignedDeals` | 75-79 |
| `canAccessDeal(dealId)` | `isAdmin()` OR deal owner OR `dealId in assignedDeals` | 91-103 |
| `isAssignedToProperty()` (nested in properties) | `docId in get(users/{uid}).data.assignedProperties` | 141-145 |

**Collection blocks and their admin path (this is the blast-radius table for removing the catch-all):**

| Collection | Lines | Admin write path WITHOUT catch-all | Relies on catch-all? |
|------------|-------|-----------------------------------|----------------------|
| `users` | 35-56 | explicit `isAdmin()` on create/update/delete | No |
| `contacts` | 60-64 | explicit `isAdmin()` on create/update/delete | No |
| `leads` | 66-70 | explicit `isAdmin()` | No |
| `deals` | 72-85 | explicit `isAdmin()` | No |
| `deal-parties` | 105-108 | `canAccessDeal()` (includes `isAdmin()`) | No |
| `deal-channels` | 110-113 | `canAccessDeal()` | No |
| `deal-messages` | 115-120 | create `canAccessDeal()`; update/delete `isAdmin()` | No |
| `deal-documents` | 122-125 | `canAccessDeal()` | No |
| `deal-progress` | 127-130 | `canAccessDeal()` | No |
| `deal-lender-pushes` | 132-136 | create `canAccessDeal()`; update/delete `isAdmin()` | No |
| `properties` | 138-153 | explicit `isAdmin()` | No |
| `documents` | 155-159 | explicit `isAdmin()` | No |
| `tasks` | 161-169 | explicit `isAdmin()` | No |
| `campaigns` | 172-176 | explicit `isAdmin()` | No |
| `notifications` | 182-186 | create = any signed-in with `actorId==self`; read/update/delete `isAdmin()` | **Edge case** — see pitfall 3 |
| `activity_log` | 191-195 | create = signed-in as self; read `isAdmin()`; update/delete `if false` | **Intended target** — catch-all currently DEFEATS the `if false` |
| `companies` | 198-204 | create = any signed-in; update/delete `isAdmin()` OR owner | No |
| `match /{document=**}` catch-all | 207-209 | `allow read, write: if isAdmin()` | This IS the catch-all |

**Collections the app actually uses** [VERIFIED: grep of `collection(...)`/`doc(...)` across `src/` + `api/`]: `users, contacts, leads, deals, deal-parties, deal-channels, deal-messages, deal-documents, deal-progress, deal-lender-pushes, properties, documents, tasks, campaigns, notifications, activity_log` — **all 16 have explicit rule blocks**. (`companies` has a rule block but is not referenced by app code; no subcollections are used.) **Therefore removing the catch-all does not remove admin access to any collection the app touches** — empirically confirmed: with the catch-all deleted, 15/15 rules tests still pass [VERIFIED: emulator run this session].

### Pattern 1: Fix `activity_log` immutability by removing the catch-all (RECOMMENDED)

**What:** Delete the `match /{document=**} { allow read, write: if isAdmin(); }` block (lines 206-209).
**Why it works:** Firestore evaluates ALL matching rules and grants access if ANY `allow` is true; a `deny`/`if false` in a different match cannot override an allow elsewhere [CITED: firebase.google.com/docs/rules/rules-behavior]. Once the catch-all no longer matches `activity_log`, the only matching write rule is `allow update, delete: if false` → admin update/delete is correctly denied.
**Verified:** With the block removed and the two characterization assertions flipped to `assertFails`, the full suite is 15/15 green [VERIFIED: emulator run this session].

```
// BEFORE (firestore.rules:206-209) — remove this entire block:
// ---------- everything else ----------
match /{document=**} {
  allow read, write: if isAdmin();
}
// AFTER: (no catch-all block) — every app collection already has explicit admin rules.
```

### Pattern 2 (ALTERNATIVE, more conservative): Narrow the catch-all to read-only

**What:** Replace `allow read, write: if isAdmin();` with `allow read: if isAdmin();`.
**Tradeoff:** Removes the write override (fixes activity_log) but keeps a generic admin-READ safety net for any collection added later without its own rule. Slightly larger standing read surface than full removal; still correct for the audit gap. Choose this only if the team wants a defensive admin-read fallback. Full removal (Pattern 1) is cleaner and is what the audit's remediation ("scope the catch-all so it cannot grant write to activity_log") calls for. Verify whichever is chosen on the emulator before publishing.

### SEC-05 access-model matrix (draft — derive final from the tested rules)

This is the "who can read/write what and why" deliverable. Recommended home: **expand the Firestore Rules section of `docs/TRUST_BOUNDARIES.md`** (it is already the access-model doc and, per a Phase 4 decision, trust-boundary coverage is machine-checked by a completeness audit test). A standalone `docs/FIRESTORE_ACCESS_MODEL.md` cross-linked from TRUST_BOUNDARIES.md is an acceptable alternative if a single-topic doc is preferred.

| Collection | Read | Create | Update | Delete | Why |
|------------|------|--------|--------|--------|-----|
| `users` | self or admin | self (never role=admin) or admin | self (not role/assignments) or admin | admin | Identity docs keyed by UID; only admin manages role/assignments |
| `contacts`/`leads`/`documents`/`campaigns` | owner or admin | self-owned or admin | owner (keeps owner) or admin | owner or admin | userId-scoped business records |
| `deals` | owner, admin, or assigned (read-only) | self-owned or admin | owner or admin | owner or admin | Assignees get read; portal shared, never writable by assignee |
| `deal-*` (6 portal collections) | `canAccessDeal` | `canAccessDeal` | portal: `canAccessDeal`; messages/lender-pushes: admin only | same | Access inherits from parent deal; messages & lender-pushes are records |
| `properties` | owner, admin, or assigned | self-owned or admin | owner/assigned (keeps owner) or admin | owner or admin | assignedProperties grants read+update, not delete |
| `tasks` | owner, assignee, or admin | self-owned or admin | owner/assignee (keeps owner) or admin | owner or admin | Assignee can act on assigned tasks |
| `notifications` | recipient or admin | any signed-in stamped as actor | recipient or admin | recipient or admin | Anyone may notify; only recipient/admin reads/clears |
| `activity_log` | admin | signed-in as self | **nobody (incl. admin)** | **nobody (incl. admin)** | Append-only audit trail; tamper-evident — the SEC-04 fix makes this true |
| `companies` | member or admin | any signed-in | owner or admin | owner or admin | Membership-scoped |

### Anti-Patterns to Avoid
- **Trying to "deny" with a rule while an allow still matches.** You cannot add `allow update, delete: if false` and expect it to beat a broader `allow write: if isAdmin()` in another match — Firestore OR's allows; the deny is ignored. The ONLY way to deny is to ensure NO matching rule allows the operation. [CITED: firebase.google.com/docs/rules/rules-behavior]
- **Publishing role-only rules before verifying prod role data.** If `users/{adminUid}.role != 'admin'` in production, role-only `isAdmin()` returns false → admin is locked out of everything. Always gate on the data first.
- **Editing rules in the Console only (not git) or in git only (not Console).** Drift between the two is the core hazard of this phase. The rules test reads the on-disk file (`readFileSync('firestore.rules')`) — so git is the tested artifact — but Console is what's live. Keep them in lockstep.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verifying rules behavior | Manual reasoning about OR semantics | `@firebase/rules-unit-testing` on the emulator | Static hand-tracing missed the catch-all override in Phase 2; the emulator caught it |
| Deploying rules | A script that pushes rules via CLI on merge | Manual Console paste + `pbcopy` | CLAUDE.md mandates manual publish; auto-deploy of rules is out of scope and risky on a live app |
| Carving `activity_log` out of a recursive wildcard | Path-string comparisons inside `match /{document=**}` | Just remove/narrow the catch-all | Recursive-wildcard path matching is fragile; removal is simpler and verified safe |

**Key insight:** In Firestore, authorization is the union of all matching `allow` rules. Security is achieved by NOT matching, not by out-voting a broad allow with a narrow deny.

## Runtime State Inventory

This phase changes LIVE authorization state; the git-vs-Console gap IS runtime state. Explicit inventory:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `users/{adminUid}.role` in **production** Firestore — the lockout gate depends on this being `'admin'`. Any secondary admin accounts must also carry `role: 'admin'`. | HUMAN: query prod users collection via Console before any publish; if missing, set the role FIRST (data migration) |
| Live service config | **The LIVE Firebase Console Firestore rules** — NOT stored in git and possibly still the OLD email-based `isAdmin()`. The git `firestore.rules` (role-only, catch-all present) may differ from what production is enforcing right now. | HUMAN: inspect current Console rules; publish the hardened rules via Console paste (pbcopy). This is the load-bearing runtime change. |
| OS-registered state | None — no OS-level registrations involved. | None |
| Secrets/env vars | None — no secret or env-var name references the admin email in rules (rules use role, not email). | None (SEC-04 code half already removed the literal) |
| Build artifacts | None — rules are not compiled/bundled; `firestore.rules` is pasted verbatim. | None |

**The canonical question — after every file in the repo is updated, what runtime systems still have the old behavior?** Production Firestore continues enforcing whatever rules were last **published in the Console**, regardless of git. Until the hardened rules are pasted+published, the email fallback and the activity_log hole may still be live in production.

## Common Pitfalls

### Pitfall 1: Admin lockout from role-only rules
**What goes wrong:** Publishing role-only `isAdmin()` when production `users/{adminUid}.role` is absent/misspelled → `isAdmin()` is false → admin loses all access, including the ability to fix user docs through the app.
**Why it happens:** git rules already dropped the email fallback; only role remains. If live data isn't ready, the safety net is gone.
**How to avoid:** Lockout gate FIRST — confirm `users/{adminUid}.role == 'admin'` in prod via Console. Consider an additive bridge publish (`isAdmin` = role OR email) before the final role-only publish, so continuity never depends on a single signal.
**Warning signs:** Admin account suddenly gets permission-denied on Home/Deals/CRM right after a publish.

### Pitfall 2: A deny that never fires (OR semantics)
**What goes wrong:** Adding `allow update, delete: if false` to `activity_log` while the catch-all's `allow write: if isAdmin()` still matches → admin write is still allowed; the "fix" does nothing.
**Why it happens:** Firestore grants access if ANY matching rule allows it; denies in other matches are ignored [CITED: firebase.google.com/docs/rules/rules-behavior].
**How to avoid:** Remove/narrow the catch-all so no matching rule allows the write. Verify on the emulator (assertion flips to `assertFails` and passes).
**Warning signs:** Rules test still shows admin `updateDoc`/`deleteDoc` on `activity_log` succeeding after the "fix."

### Pitfall 3: Removing the catch-all changes admin CREATE constraints on `notifications`
**What goes wrong:** `notifications` create is `isSignedIn() && request.resource.data.actorId == request.auth.uid` — there is NO `isAdmin()` branch. Today the catch-all lets an admin create a notification with `actorId != self`. After removal, an admin-side create with a non-self `actorId` would be denied.
**Why it happens:** The catch-all silently backstopped every write path; removing it exposes each collection's explicit create contract.
**How to avoid:** Confirm app code stamps `actorId` = the acting (admin) user when the admin creates notifications (it almost certainly does). Cover this in the two-account smoke: as admin, trigger an action that writes a notification. If admin must create notifications on behalf of others, add an explicit `isAdmin()` branch to `notifications` create in the same publish.
**Warning signs:** Admin actions that emit notifications start failing after the subtractive publish.

### Pitfall 4: git/Console drift
**What goes wrong:** Editing git rules but forgetting the Console publish (or vice-versa) leaves tests green while production is unchanged (or changed differently).
**How to avoid:** Every rules change is (1) emulator-green on the on-disk file, then (2) pasted into Console and published, then (3) smoke-tested live. Offer `cat firestore.rules | pbcopy`. Treat "tests green" as necessary but NOT sufficient for done.

## Code Examples

### Run rules tests locally (JDK 21 required)
```bash
# Source: package.json test:rules + firebase.json (VERIFIED this session)
export JAVA_HOME=/usr/local/opt/openjdk@21
export PATH="$JAVA_HOME/bin:$PATH"
npm run test:rules      # emulator boots on 127.0.0.1:8080, vitest runs tests/rules -> 15/15
```

### Offer the rules for manual Console publish
```bash
# Source: CLAUDE.md rules-publish workflow
cat firestore.rules | pbcopy   # then: Firebase Console -> Firestore -> Rules -> paste -> Publish
```

### The two characterization assertions to flip (tests/rules/firestore.rules.test.js:329-332)
```javascript
// BEFORE (Phase 2 characterization of the BUG):
await assertSucceeds(updateDoc(doc(adminDb, 'activity_log/log-1'), { action: 'edited' }));
await assertSucceeds(deleteDoc(doc(adminDb, 'activity_log/log-1')));
// AFTER (SEC-04 fix — verified 15/15 green this session):
await assertFails(updateDoc(doc(adminDb, 'activity_log/log-1'), { action: 'edited' }));
await assertFails(deleteDoc(doc(adminDb, 'activity_log/log-1')));
```
Also update the `it(...)` title and the CHARACTERIZATION comment block (lines 316, 322-328) so the test now asserts the guarantee rather than the gap.

### Staged Console-publish sequence (additive-then-subtractive, lockout-gated)

```
Stage 0 — LOCKOUT GATE (HUMAN, Console)
  Query production users collection; confirm users/{adminUid}.role == 'admin'
  (and every other admin account). If missing -> set role in prod FIRST. GO/NO-GO.

Stage 1 — LOCAL PREP (AUTOMATABLE, this session)
  a. Baseline: npm run test:rules -> 15/15 green on current git rules.
  b. Apply SEC-04 fix: remove the catch-all (lines 206-209).
  c. Flip the two activity_log admin assertions to assertFails; update test title/comment.
  d. npm run test:rules -> 15/15 green (VERIFIED this session).

Stage 2 — ADDITIVE PUBLISH (HUMAN, Console + pbcopy)  [conservative bridge]
  If live Console rules are email-based, first publish an interim isAdmin =
  (role == 'admin' OR email == admin) so the union keeps admin in regardless of signal.
  Smoke: admin + non-admin. (Skip this stage only if Stage 0 confirms role data with
  high confidence and the team accepts a direct cutover.)

Stage 3 — SUBTRACTIVE PUBLISH (HUMAN, Console + pbcopy)
  Publish the final git rules (role-only isAdmin + catch-all removed). pbcopy offered.
  Smoke: (a) admin CRUD across collections; (b) non-admin scoped access unaffected;
  (c) CONFIRM admin can no longer edit/delete activity_log (the fix is live);
  (d) an action that emits a notification still works as admin (pitfall 3).

Invariant: rules tests green BEFORE and AFTER each publish; admin + non-admin smoke AFTER each publish.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Admin by email match in rules | Admin by `users/{uid}.role == 'admin'` | git commit dd6364a (code shipped, publish pending) | Removes the email footgun; requires role data present in prod |
| Broad `match /{document=**} { allow write: if isAdmin() }` catch-all | Explicit per-collection admin rules; no write catch-all | This phase (SEC-04) | Closes the activity_log tamper hole; tightens standing admin write surface |

**Deprecated/outdated:**
- The admin-email literal in `isAdmin()` — already removed from git rules; the milestone end-state (v2-04) is Firebase custom claims, explicitly deferred to a future milestone (out of scope here).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Production Console rules may still be the OLD email-based version | Runtime State / Summary | If prod is already role-only, the additive bridge (Stage 2) is unnecessary — no harm, just an extra publish. HUMAN must inspect live Console rules to confirm. |
| A2 | App code stamps `notifications.actorId` = acting user, so admin creates satisfy the explicit create rule after catch-all removal | Pitfall 3 | If admin creates notifications with a non-self actorId, catch-all removal breaks it — mitigated by adding an `isAdmin()` create branch. Verify in smoke. |
| A3 | Only one admin account exists in production (`dealcenterx@gmail.com`) | Lockout gate | If secondary admins exist without `role: 'admin'`, they'd be locked out. HUMAN must enumerate all admin accounts during the gate. |
| A4 | No app subcollections rely on the recursive catch-all | Blast radius | Grep found only top-level collections; if a subcollection is added later it would need its own rule (default-deny otherwise). Low risk. |

## Open Questions

1. **What are the exact rules currently LIVE in the Firebase Console?**
   - What we know: git rules are role-only with the catch-all present.
   - What's unclear: whether prod is running email-based, role-based, or email-OR-role rules right now.
   - Recommendation: HUMAN inspects Console rules at Stage 0; this decides whether the additive bridge (Stage 2) is needed.

2. **Home for the SEC-05 access-model doc: expand `docs/TRUST_BOUNDARIES.md` or new `docs/FIRESTORE_ACCESS_MODEL.md`?**
   - What we know: TRUST_BOUNDARIES.md already has a (thin) Firestore Rules section and is machine-checked for coverage.
   - Recommendation: expand TRUST_BOUNDARIES.md with the per-collection matrix (single source of truth); a cross-linked standalone doc is acceptable. Confirm during discuss/plan.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| OpenJDK 21 | Firestore emulator (rules tests) | ✓ | 21.0.11 at `/usr/local/opt/openjdk@21` | CI runs it under Temurin 21 if local JDK unset |
| Firestore emulator (firebase-tools) | `npm run test:rules` | ✓ | firebase-tools ^15.22.4 | — |
| Firebase Console access (production) | Lockout gate + rules publish + smoke | HUMAN | — | none — cannot be automated |
| Production admin + non-admin login | Two-account smoke | HUMAN | — | none — cannot be automated |

**Missing dependencies with no fallback:** Firebase Console access and live login are HUMAN-only — the LIVE half of this phase cannot be automated.
**Note:** Default host JDK is 1.8, which the emulator rejects; always export `JAVA_HOME=/usr/local/opt/openjdk@21` before `npm run test:rules`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.10 (rules suite) via `firebase emulators:exec` |
| Config file | `firebase.json` (emulator on 127.0.0.1:8080); suite at `tests/rules/firestore.rules.test.js` |
| Quick run command | `JAVA_HOME=/usr/local/opt/openjdk@21 npm run test:rules` |
| Full suite command | `npm run test:rules` (rules) + `npm run test:api` + `npm run test:ci` (existing) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-04 | activity_log append-only enforced even against admin | emulator rules | `npm run test:rules` (flipped assertions -> assertFails) | ✅ (assertions must be flipped) |
| SEC-04 | admin access derives from role, not email; email-without-role denied | emulator rules | `npm run test:rules` (existing "does not grant admin from email" test, line 164) | ✅ already green |
| SEC-04 | removing catch-all does not break admin access to any collection | emulator rules | `npm run test:rules` (existing admin/portal/scoped tests still pass) | ✅ VERIFIED 15/15 this session |
| SEC-04 | production role data present (lockout gate) | manual-only | Console query — cannot be automated | ❌ HUMAN |
| SEC-04 | live rules published; two-account smoke shows no regression | manual-only | production smoke — cannot be automated | ❌ HUMAN |
| SEC-05 | access-model doc matches tested rules | doc review | grep/read of TRUST_BOUNDARIES.md (or new doc) vs rules | ❌ Wave 0 (doc authored this phase) |

### Sampling Rate
- **Per task commit:** `JAVA_HOME=/usr/local/opt/openjdk@21 npm run test:rules` (rules changes) + `npm run lint`
- **Per wave merge:** rules + `npm run test:api` + `CI=true npm run test:ci` + `npm run build`
- **Phase gate:** all suites green locally; then the LIVE/HUMAN half (gate → publish → smoke) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] Flip the two admin assertions in `tests/rules/firestore.rules.test.js` (lines 329-332) to `assertFails` and update the `it(...)` title/comment (lines 316, 322-328) — covers SEC-04 immutability.
- [ ] Author the SEC-05 access-model doc (expand `docs/TRUST_BOUNDARIES.md` Firestore section with the per-collection matrix, or new `docs/FIRESTORE_ACCESS_MODEL.md`).
- [ ] (No framework install needed — emulator + vitest already present and green.)

## Security Domain

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (unchanged) | Firebase Auth (Google + email/password) — do not touch |
| V3 Session Management | no | Firebase-managed ID tokens |
| V4 Access Control | **yes (core of this phase)** | Firestore rules: role-based admin, userId scoping, assignment arrays, `canAccessDeal()`; least-privilege via removing the broad catch-all |
| V5 Input Validation | partial | Rules validate `keepsOwner()`, `createsAsSelf()`, role/assignment immutability on users |
| V6 Cryptography | no | Firestore encryption in transit/at rest is Google-managed |
| V7 Error Handling & Logging | **yes** | `activity_log` becomes a true append-only, tamper-evident audit trail (the SEC-04 fix) |

### Known Threat Patterns for Firestore rules

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Broad `allow write: if isAdmin()` catch-all defeats a per-collection `if false` | Tampering / Repudiation | Remove/narrow the catch-all so no matching rule allows the write (OR-semantics) |
| Admin-by-email spoofing | Spoofing / Elevation of Privilege | Admin derives from `users/{uid}.role`, not an email literal (already in git rules) |
| Privilege escalation via self-update of `role`/assignments | Elevation of Privilege | users-block pins role/assignments to prior values for non-admins (tested, lines 47-53, 193-203) |
| Owner reassignment on update | Tampering | `keepsOwner()` on update paths (tested) |
| Lockout during rules change (availability) | Denial of Service | Lockout gate on prod role data + additive-then-subtractive staged publish + two-account smoke |

## Sources

### Primary (HIGH confidence)
- `firestore.rules` (full read, 211 lines) — every collection block, helpers, and the catch-all
- `tests/rules/firestore.rules.test.js` (full read) — 15-case suite; the two activity_log assertions to flip
- Emulator run this session (JDK 21): baseline 15/15 green; candidate fix (catch-all removed + assertions flipped) 15/15 green — VERIFIES the SEC-04 fix and its zero blast radius on tested collections
- Codebase grep of `collection(...)`/`doc(...)` across `src/` + `api/` — enumerates the 16 app collections
- `.planning/phases/02-test-scaffolding/02-VERIFICATION.md` — the activity_log HIGH finding + JDK-21 emulator provenance
- `docs/SAAS_READINESS_AUDIT.md` (lines 50, 88, 92-93, 120) — SEC-04 findings and remediation
- CLAUDE.md + .claude/CLAUDE.md — rules-publish workflow, access model, admin identity
- `docs/TRUST_BOUNDARIES.md` — existing access-model doc (SEC-05 candidate home)
- `.planning/REQUIREMENTS.md` (SEC-04 line 41, SEC-05 line 42) — exact requirement scope

### Secondary (MEDIUM confidence)
- [Firebase — How Security Rules work](https://firebase.google.com/docs/rules/rules-behavior) — OR semantics: "if a broader rule grants access, Security Rules grant access and ignore any more granular rules that might limit access"
- [Firebase — Structuring Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-structure) — recursive wildcard `{document=**}` behavior in rules v2

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tooling present and exercised green this session
- Rules mechanics / SEC-04 fix: HIGH — OR-semantics cited to Firebase docs AND the fix empirically verified on the emulator (15/15)
- Blast radius of catch-all removal: HIGH — all 16 app collections enumerated by grep and confirmed to have explicit admin rules; tests pass with catch-all removed
- LIVE/HUMAN half (prod data, Console publish, smoke): MEDIUM — depends on production state that only a human with Console access can confirm (Assumptions A1, A3)

**Research date:** 2026-07-13
**Valid until:** 2026-08-12 (stable domain; re-verify only if firestore.rules or the collection set changes)
