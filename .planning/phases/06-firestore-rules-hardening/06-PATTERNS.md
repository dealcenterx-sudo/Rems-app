# Phase 6: Firestore Rules Hardening - Pattern Map

**Mapped:** 2026-07-13
**Files analyzed:** 3 (2 code edits + 1 doc extension) + LIVE human checkpoints (no code analog)
**Analogs found:** 3 / 3 (each file is its own analog — this is a surgical edit phase, not a new-file phase)

> This phase edits existing files rather than creating new ones. The "closest analog" for each touched file IS the file itself (and its sibling blocks). Excerpts below are the exact current content with precise line anchors so the executor edits in place, not from a template.

## File Classification

| Touched File | Change Type | Role | Data Flow | Closest Analog | Match Quality |
|--------------|-------------|------|-----------|----------------|---------------|
| `firestore.rules` | edit (delete block) | config / access-control rules | request-response (authz eval) | self — `activity_log` block (L191-195) + `isAdmin()` (L13-17) | exact (self) |
| `tests/rules/firestore.rules.test.js` | edit (flip 2 assertions + title/comment) | test | request-response (emulator authz) | self — the Phase-2 characterization `it(...)` (L316-333) | exact (self) |
| `docs/TRUST_BOUNDARIES.md` | extend (SEC-05 access matrix) | doc | n/a | self — existing "Firestore Rules" section (L37-45) + serverless table style (L26-33) | exact (self) |

## Pattern Assignments

### `firestore.rules` (config, authz rules) — DELETE the catch-all

**Analog:** self. The exact block to remove and its surrounding structure.

**Block to DELETE (lines 205-209, plus the preceding comment on 206):**
```
    // ---------- everything else ----------
    match /{document=**} {
      allow read, write: if isAdmin();
    }
```
Delete lines **206-209** (the `// ---------- everything else ----------` comment through the closing `}` of the wildcard match). Leave the file's outer closes intact:
```
  }        // <- closes `match /databases/{database}/documents` (was line 210)
}          // <- closes `service cloud.firestore` (was line 211)
```
After deletion the file ends with the `companies` block (L198-204) followed by the two outer braces. No other line changes.

**Context block 1 — `activity_log` (lines 191-195), the intended beneficiary. DO NOT edit; this is why the deletion works:**
```
    match /activity_log/{docId} {
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow read: if isAdmin();
      allow update, delete: if false;
    }
```
Once the catch-all no longer matches `activity_log/*`, the only matching write rule is `allow update, delete: if false` → admin update/delete is denied (OR-semantics: security by not-matching, not by out-voting).

**Context block 2 — `isAdmin()` (lines 13-17), role-only, KEEP AS-IS. No email literal to remove (SEC-04 code half already done):**
```
    function isAdmin() {
      return isSignedIn() &&
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
```

**Pitfall anchor — `notifications` create (lines 182-186)** has NO `isAdmin()` branch on create:
```
    match /notifications/{docId} {
      allow create: if isSignedIn() && request.resource.data.actorId == request.auth.uid;
      allow read, update, delete: if isAdmin() ||
        (isSignedIn() && resource.data.recipientId == request.auth.uid);
    }
```
After catch-all removal, an admin creating a notification with `actorId != self` would be denied (RESEARCH Pitfall 3 / A2). Do NOT change this block preemptively; verify in live smoke that admin-emitted notifications stamp `actorId = admin uid`. Only add an `isAdmin()` create branch here if smoke proves admin creates on-behalf-of others.

---

### `tests/rules/firestore.rules.test.js` (test, emulator authz) — FLIP two assertions

**Analog:** self. The Phase-2 characterization test is the copy-from anchor.

**Imports already present (lines 1-16)** — `assertFails` and `assertSucceeds` are both imported, `updateDoc`/`deleteDoc`/`doc`/`getDoc` all in scope. No import changes needed.

**Exact `it(...)` block to edit (lines 316-333):**
```javascript
  it('allows admin reads; append-only is NOT enforced against admin today (catch-all override — SEC-04)', async () => {
    const adminDb = authedDb('admin-uid', { email: 'admin@example.com' });
    const agentDb = authedDb('agent-a', { email: 'agent@example.com' });

    await assertSucceeds(getDoc(doc(adminDb, 'activity_log/log-1')));
    await assertFails(getDoc(doc(agentDb, 'activity_log/log-1')));
    // CHARACTERIZATION OF CURRENT BEHAVIOR (Phase 2): the `match /{document=**}`
    // admin-override (firestore.rules ~L207-209, `allow read, write: if isAdmin()`)
    // is OR'd with the activity_log rule's `allow update, delete: if false`, so the
    // override wins and an admin CAN edit/delete audit entries. The documented
    // append-only guarantee (CLAUDE.md) does NOT hold against the admin account.
    // Known HIGH audit-integrity gap — Phase 6 / SEC-04 must scope the catch-all (or
    // add an explicit activity_log deny) and flip these two back to assertFails.
    await assertSucceeds(updateDoc(doc(adminDb, 'activity_log/log-1'), {
      action: 'edited'
    }));
    await assertSucceeds(deleteDoc(doc(adminDb, 'activity_log/log-1')));
  });
```

**Three edits inside this block:**

1. **Title (line 316)** — change from characterizing the bug to asserting the guarantee, e.g.:
   ```javascript
   it('allows admin reads but enforces append-only against admin (catch-all removed — SEC-04)', async () => {
   ```
2. **Comment (lines 322-328)** — replace the "CHARACTERIZATION OF CURRENT BEHAVIOR (Phase 2)" block with a comment stating the guarantee now holds: the `match /{document=**}` catch-all was removed in Phase 6, so `activity_log`'s `allow update, delete: if false` is the only matching write rule and admin update/delete is denied.
3. **Assertions (lines 329-332)** — flip `assertSucceeds` → `assertFails` (both calls, arguments unchanged):
   ```javascript
   await assertFails(updateDoc(doc(adminDb, 'activity_log/log-1'), {
     action: 'edited'
   }));
   await assertFails(deleteDoc(doc(adminDb, 'activity_log/log-1')));
   ```

The `getDoc` assertions on lines 320-321 stay unchanged (admin still reads; agent still denied). The sibling test above it (lines 303-314, "allows users to append their own activity and denies forged entries") is unaffected.

**Verify:** `JAVA_HOME=/usr/local/opt/openjdk@21 npm run test:rules` → expect 15/15 green (RESEARCH verified this exact combination this session).

---

### `docs/TRUST_BOUNDARIES.md` (doc) — EXTEND the Firestore Rules section (SEC-05)

**Analog:** self. Match the existing doc's two established styles.

**Current "Firestore Rules" section to expand (lines 37-45)** — today it's a thin 5-bullet summary:
```markdown
## Firestore Rules

Firestore rules remain the enforcement layer for business data. UI role checks and serverless validation do not replace rules.

- Business collections are user-scoped with admin override.
- Property and deal assignment arrays grant limited non-owner access.
- Deal portal collections inherit access from their parent deal.
- `activity_log` is append-only.
- Rules changes are not deployed from git automatically; they must be published in Firebase Console.
```

**Style to copy — the serverless endpoint table (lines 26-33)** uses a pipe table with a short lead-in sentence and per-row rationale. Match this exact table idiom for the per-collection access matrix. Recommended: keep the 5 bullets as the intro, then add a `Read | Create | Update | Delete | Why` matrix (draft in RESEARCH.md L149-159), and add one line making the append-only guarantee explicit against admin (post-SEC-04):
```markdown
| `activity_log` | admin | signed-in as self | nobody (incl. admin) | nobody (incl. admin) | Append-only audit trail; tamper-evident after SEC-04 removed the admin catch-all. |
```
Keep prose declarative and secret-free (variable/collection names only), consistent with the rest of the doc.

**Audit-test awareness (IMPORTANT — will NOT break):** `tests/api/trust-boundaries-audit.test.mjs` reads this doc but ONLY asserts that every `api/*.js` handler name and the two special auth postures appear (`toContain`/`toMatch` on api rows, lines 32-44). It does **not** parse or constrain the Firestore Rules section. Extending the Firestore section is additive and cannot fail this audit. Do not remove or rename any existing `api/<name>.js` reference (lines 26-35) — those rows are what the audit pins.

---

## Shared Patterns

### OR-semantics of Firestore rules (the load-bearing mental model)
**Source:** `firestore.rules` structure + RESEARCH L162, L174.
**Apply to:** the rules edit and the test flip.
Authorization is the UNION of all matching `allow` rules; a `deny`/`if false` in one match block cannot override an `allow` in another. Security is achieved by ensuring NO matching rule allows the op — hence deleting the catch-all rather than adding a narrower deny.

### pbcopy rules-publish workflow (git ≠ live)
**Source:** CLAUDE.md "Firestore Rules and Indexes"; RESEARCH L224-228.
**Apply to:** every rules change reaching production.
```bash
cat firestore.rules | pbcopy   # then Firebase Console -> Firestore -> Rules -> paste -> Publish
```
Firebase does NOT read `firestore.rules` from git. "Tests green" is necessary but not sufficient for done — the Console publish + live smoke are separate, human-only steps.

### Local rules-test invocation (JDK 21 required)
**Source:** RESEARCH L216-222; package.json `test:rules`.
**Apply to:** before and after each rules change / publish.
```bash
export JAVA_HOME=/usr/local/opt/openjdk@21
export PATH="$JAVA_HOME/bin:$PATH"
npm run test:rules      # emulator on 127.0.0.1:8080, vitest tests/rules -> expect 15/15
```
Default host JDK is 1.8, which the emulator rejects — the export is mandatory.

## No Analog Found

Not applicable to code files (all three touched files are their own analog). However, the LIVE/HUMAN checkpoints below have **no code analog** — the planner must render them as human-verify gates, not automatable tasks:

| Checkpoint | Type | Why no code analog |
|------------|------|--------------------|
| Stage 0 — lockout gate (query prod `users/{adminUid}.role == 'admin'`, enumerate all admin accounts) | HUMAN / Console | Production data inspection; cannot be scripted from this repo |
| Stage 2 — additive bridge publish (interim `role OR email` isAdmin, if live rules are still email-based) | HUMAN / Console + pbcopy | Rules deploy is manual Console paste; live-rules state is unknown until inspected |
| Stage 3 — subtractive publish (final role-only + catch-all-removed rules) + two-account smoke (admin CRUD, non-admin scoped access, admin CANNOT edit/delete activity_log, admin-emitted notification still works) | HUMAN / Console + live login | Only a live signed-in account proves live rules; not automatable |

Per Phase 2/3/4 precedent, separate the **locally-verifiable half** (rules edit + test flip + SEC-05 doc, all emulator-green) from the **LIVE/HUMAN half** (gate → publish → smoke), which is a `human_needed` verification checkpoint.

## Metadata

**Analog search scope:** `firestore.rules` (full, 211 lines), `tests/rules/firestore.rules.test.js` (imports L1-16 + target block L300-334), `docs/TRUST_BOUNDARIES.md` (full, 58 lines), `tests/api/trust-boundaries-audit.test.mjs` (full, 45 lines).
**Files scanned:** 4
**Pattern extraction date:** 2026-07-13
