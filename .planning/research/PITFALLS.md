# Pitfalls Research

**Domain:** Professionalizing/hardening a live Firebase + CRA + Vercel B2B SaaS (REMS)
**Researched:** 2026-07-06
**Confidence:** MEDIUM overall (web findings cross-checked against official Firebase/Vercel docs = MEDIUM; repo-specific facts verified directly in codebase = HIGH)

Context that shapes every pitfall below: **this app has two deployment channels that move independently.** Code auto-deploys to production on every merge to `main` (Vercel). Firestore rules deploy only when the user manually pastes them into Firebase Console. Any change that spans both channels has an ordering problem, and every phase merge is a production deploy.

## Critical Pitfalls

### Pitfall 1: Rules Change Locks Out Live Users (the email-fallback removal trap)

**What goes wrong:**
Removing the `request.auth.token.email == 'dealcenterx@gmail.com'` fallback from `isAdmin()` (firestore.rules:16) before verifying the admin's `users/{uid}` doc actually has `role: 'admin'` locks the admin out of the entire system — and because `isAdmin()` is the override for every collection, admin loses read access to everything at once. The rules comment itself says the fallback exists "so the admin is never locked out before their doc has role: 'admin'." More broadly: any rules edit that tightens `get()`/`exists()` dependencies breaks users whose docs don't match the assumed shape.

**Why it happens:**
Rules are pasted into the console out-of-band — no CI gate, no tests, no git-tracked deploy. Rules apply globally to all clients within ~1 minute (up to 10 minutes for active listeners), so a bad publish hits every user at once. There is no automatic rollback; recovery is "paste the old rules back," which only works if you kept them.

**How to avoid:**
1. **Verify data before tightening rules:** before removing the email fallback, confirm in Firebase Console (or via an admin script) that the admin user doc has `role: 'admin'`. Same for any rule that starts requiring a field.
2. **Additive-then-subtractive sequencing:** first publish rules that accept BOTH the old and new condition, verify production, then remove the old path in a later publish.
3. **Write rules tests first (Phase: testing) and land them BEFORE the rules-hardening phase**, so every subsequent rules change runs against the emulator before console paste.
4. **Keep the previous rules text** in git (it already is — `firestore.rules` is source of truth); always publish from a committed state so rollback = paste previous commit.
5. After every publish, smoke-test as admin AND as a non-admin test account (the access model differs; see Pitfall 4).

**Warning signs:**
- A rules diff that removes a condition rather than adding one.
- Any rule newly requiring `exists()`/`get()` on a doc that older accounts may not have.
- "Works in console simulator" (simulator doesn't exercise your real user docs).

**Phase to address:**
Firestore rules tests phase MUST precede the auth/rules hardening phase. Rules hardening phase includes the data-verification step and two-step fallback removal.

---

### Pitfall 2: CSP / COOP Headers Break Google Sign-in, Firestore Streaming, or Cloudinary Uploads

**What goes wrong:**
Adding `Content-Security-Policy` or `Cross-Origin-Opener-Policy` to `vercel.json` breaks live functionality:
- `Cross-Origin-Opener-Policy: same-origin` breaks `signInWithPopup` (used at `src/components/LoginPage.js:80`) — the SDK polls `window.closed` on the popup, which COOP blocks (firebase-js-sdk #8541/#8295). Google sign-in silently hangs or never resolves.
- A `connect-src` that omits any of `firestore.googleapis.com`, `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `firebasestorage.googleapis.com`, or `api.cloudinary.com` breaks Firestore reads, auth token refresh, or uploads — often only for the specific action, so it looks like a random bug.
- A `frame-src` that omits `https://rems-app-44205.firebaseapp.com` (the `__/auth/handler` iframe on the authDomain) breaks the auth flow.
- `img-src` missing `res.cloudinary.com` breaks every uploaded image; `worker-src`/`script-src` issues can break the pdf.js worker (`public/pdf.worker.min.mjs`).

Headers deploy instantly to all users on merge — this is a production-wide breakage vector on a per-phase-merge model.

**Why it happens:**
CSP allowlists get written from what's visible in code, not from what the SDKs actually call at runtime. Firebase uses long-polling/WebSocket channels and an auth iframe that aren't obvious from imports. COOP breakage is especially sneaky because there's a *residual, harmless* console warning from accounts.google.com's report-only COOP even when everything works — teams either ignore the real error or "fix" the harmless warning with a breaking header.

**How to avoid:**
1. **Ship CSP in Report-Only first** (`Content-Security-Policy-Report-Only`) for at least one deploy cycle; watch violations; then enforce.
2. If setting COOP at all, use `same-origin-allow-popups` — never `same-origin` while `signInWithPopup` is in use. (Consider whether COOP is needed at all for this milestone.)
3. Build the allowlist from a checklist of actual integrations: Firebase Auth (identitytoolkit, securetoken, `*.firebaseapp.com` frame), Firestore (firestore.googleapis.com incl. WebSocket), Storage, Cloudinary (api + res), Resend is server-side (no CSP impact), pdf.js worker (self + blob: worker-src possibly).
4. **Manual smoke test after the header deploy:** Google sign-in via popup, email/password sign-in, a Firestore live view, a Cloudinary upload, a PDF preview.
5. Note `X-Frame-Options: DENY` is already shipped in `vercel.json` and hasn't broken auth (the auth iframe is framed *by* your page, not the reverse) — don't "fix" it while adding CSP.

**Warning signs:**
- Sign-in popup opens then nothing happens; console shows COOP or frame-src violations.
- Blank images / spinner-forever states after the headers deploy.
- CSP violations in console on pages you didn't test.

**Phase to address:**
Infrastructure/security-headers phase. Must include Report-Only rollout + the five-action smoke test as acceptance criteria. Should come AFTER error tracking is live (so violations/regressions are visible).

---

### Pitfall 3: The Two-Channel Deploy Race (code on Vercel vs rules in console)

**What goes wrong:**
A phase changes client queries/fields AND the rules that authorize them. Code auto-deploys on merge; rules wait for a human to paste into the console. In the gap (minutes to days), production runs new code against old rules → permission-denied errors for real users; or old cached clients run against new rules → same failure inverted. The same race applies to composite indexes: new query code deploys before the index is READY.

**Why it happens:**
Git merge feels like "the deploy," but for this app it deploys only half the change. Nothing in CI enforces that rules/indexes were published.

**How to avoid:**
1. **Order every cross-channel change: publish permissive/additive rules and create indexes FIRST, verify, then merge code, then (optionally) tighten rules in a follow-up publish.**
2. Make "rules published? indexes READY?" explicit acceptance-criteria checkboxes in any phase plan touching firestore.rules or query shapes.
3. Never merge a code change that depends on unpublished rules right before stepping away.
4. Remember `lazyWithReload` only fixes stale chunks, not stale-code-vs-new-rules mismatches — old sessions can run old code for a while.

**Warning signs:**
- A single phase plan that edits both `firestore.rules` and component query code with no explicit publish-ordering step.
- "Missing or insufficient permissions" toasts appearing after a merge but before the console paste.

**Phase to address:**
Every phase that touches rules, indexes, or query shapes — encode the ordering in the phase plan template. Especially the auth hardening and indexes/reliability phases.

---

### Pitfall 4: Missing Composite Indexes Break Non-Admin Users Silently

**What goes wrong:**
Non-admin queries combine `where('userId'==…)` with `orderBy(...)` and need composite indexes; admin queries (no `userId` filter) don't. So a new/changed query works perfectly for the admin (the account everyone tests with) and throws `failed-precondition` for agents/buyers/sellers. `AnalyticsDashboard.js` currently masks this by silently falling back to loading ALL records and filtering client-side — wrong results at scale and a rules-scoped full-collection read. Second-order trap: **removing that fallback (a "hardening" cleanup) before pre-creating every needed index converts silent degradation into hard breakage for non-admins.** Third trap: indexes build asynchronously — minutes at minimum, longer on large collections — so "created" ≠ "READY."

**Why it happens:**
The admin account is the default test account, and it takes the codepath that needs no index. `firestore.indexes.json` documents only 3 indexes; ad-hoc query combinations (status, priority, date-range orderings) each need their own.

**How to avoid:**
1. **Audit every Firestore query in `src/` for the `where('userId')` + `orderBy` pattern; enumerate required indexes; create them ALL and wait for READY before touching the fallback code.**
2. Deploy indexes from `firestore.indexes.json` (`firebase deploy --only firestore:indexes`) rather than clicking console links, so the file stays the source of truth; if console links are used, export back to the file.
3. Keep the fallback but make it loud (error tracking event) instead of removing it in the same phase.
4. **Test every dashboard/list page as a non-admin test account** — make this a standing UAT step for the whole milestone.

**Warning signs:**
- Toast "Fallback mode active for {collection}" in any environment.
- A feature verified only while signed in as dealcenterx@gmail.com.
- `failed-precondition` in (future) error tracking.

**Phase to address:**
Data/API reliability phase: index audit + creation first, fallback changes last. Non-admin UAT applies to every phase.

---

### Pitfall 5: Removing the "Temporary" Endpoint or Repo Cruft the Wrong Way

**What goes wrong:**
Two flavors:
- **`api/health.js` removal:** grep shows nothing in-repo references it, but "unreferenced in code" ≠ unused — health endpoints get wired into uptime monitors, Vercel checks, bookmarks, or the user's own debugging habit (it was added specifically to debug env/Firebase-admin init, per recent commits). Deleting it removes the only production diagnostic for Firebase-admin init failures.
- **`rems-project-source-2026-04-09/` + `.zip` removal:** reaching for `git filter-repo`/BFG to purge the 773KB archive from history rewrites every SHA → force push to `main`, invalidated PRs, broken clone history, risk of re-contamination from stale clones, and an auto-deploy pipeline pointed at a force-pushed branch. All of that risk for a file that contains no secrets.

**Why it happens:**
"Repo hygiene" tasks look mechanical, so they get executed without asking what depends on the artifact or whether history purity is actually required.

**How to avoid:**
1. For `health.js`: **auth-gate it rather than delete it** (verify a Firebase ID token for the admin, or require a shared secret header) — it stays useful for diagnosing Vercel env issues, which this repo has demonstrably had. If deleting, ask the user first whether any external monitor hits it.
2. For the archive: **plain `git rm -r` + commit. Do NOT rewrite history.** The archive contains no secrets (verify with a quick scan before deciding); repo size is a cosmetic concern. Document that history still contains it and why that's acceptable.
3. General rule for this milestone: before deleting anything "temporary," check recent commit messages for why it was added (b8555a8/2752d63 tell the health.js story).

**Warning signs:**
- A plan step containing `filter-repo`, `BFG`, or `push --force` to main.
- Deleting an endpoint the same week it was being used to debug production.

**Phase to address:**
Repo hygiene phase (early). Explicitly scope it to working-tree removal + .gitignore verification; history rewrite is out of scope unless a secret is found.

---

### Pitfall 6: Centralizing the Admin Email Partially (or Behind a Missing Env Var)

**What goes wrong:**
The admin email lives in 8+ client files, `api/lead-intake.js`, AND `firestore.rules`. Two failure modes when centralizing:
- **Partial migration:** 7 of 9 call sites use the new `src/config.js` constant, 2 keep the literal — now there are two sources of truth and a future email change half-works (the exact bug this task exists to prevent).
- **Env-var indirection that fails silent:** moving it to `REACT_APP_ADMIN_EMAIL` means CRA inlines it *at build time*; if the Vercel env var is unset/typo'd, every admin check becomes `email === undefined` → admin loses admin UI everywhere, and the serverless functions (`process.env` at runtime) fail differently from the client. Rules can't read env vars at all, so the rules copy stays manual regardless.

**Why it happens:**
Search-and-replace misses computed strings and the non-`src/` locations (api/, rules); env-var approaches assume runtime lookup semantics CRA doesn't have.

**How to avoid:**
1. Prefer a **checked-in constant** (`src/config.js` + a mirrored constant in `api/_lib/`) over an env var — the email is not a secret, and a constant can't be unset in a deploy. Document the rules copy as the third, manually-synced location.
2. After migration, CI-grep for the literal: `grep -rn "dealcenterx@gmail.com" src api` should return exactly the config file(s). Add this as an acceptance check.
3. Do NOT couple this refactor to the rules email-fallback removal (Pitfall 1) — separate steps, rules last.

**Warning signs:**
- Grep for the literal email returns any component/page file after the refactor.
- Admin UI features disappearing on a preview deploy (env var not set for that environment).

**Phase to address:**
Auth/authorization hardening phase, as its own small reviewable commit with the grep check.

---

### Pitfall 7: Design-Token / UI Polish Pass Regresses Pages Nobody Rechecked

**What goes wrong:**
`src/App.css` tokens are referenced 161 times, but components contain **938 hardcoded hex values** — the token system is only half-adopted. A polish pass that changes token values (spacing, contrast tiers, `--text-faint`) shifts every page that uses tokens while pages/elements on hardcoded hex stay frozen → inconsistent UI, broken contrast pairings (dark-on-dark), and regressions on pages outside the phase's focus. Renaming tokens breaks silently: `var(--typo)` resolves to nothing and the property falls back to inherited/initial values with no build error.

**Why it happens:**
CSS has no compiler. Token changes fan out globally, review diffs look tiny, and CRA/Jest gives zero visual coverage. With lazy-loaded pages, the person making the change literally never renders most affected surfaces.

**How to avoid:**
1. **Sequence: first migrate hardcoded hex → existing tokens (no visual change intended), THEN change token values.** Never rename a token and change its value in the same pass.
2. Grep-audit before/after: count of raw hex in `src/components` should go down monotonically; new code must use `var(--…)` (already a CLAUDE.md rule).
3. Maintain a page checklist (all lazy routes, including buyer/seller shell pages: Home, MyDeals, Properties, Settings) and spot-check each after any token-value change — in both empty-state and populated-state.
4. Respect the existing floors: `--text-faint` minimum contrast tier, 11px type floor.

**Warning signs:**
- A diff touching `:root` token values bundled with per-component style edits.
- `var(--` names in the diff that don't exist in App.css (typo/rename mismatch).
- Screenshots only of the pages the phase focused on.

**Phase to address:**
UI/UX modernization phase — token migration sub-step precedes token-value changes; final polish pass re-verifies the full page checklist.

---

### Pitfall 8: Copy Rewrite Changes the Semantics of Destructive Actions

**What goes wrong:**
A "professional product copy" pass rewrites button labels, ConfirmModal text (used in 9 components), and toasts. Risks: a confirm dialog rewritten for tone stops saying what will actually happen ("Remove this deal?" → does it delete the deal? the assignment? the portal data?); softened error messages hide actionable causes ("Something went wrong" replacing "Missing permissions — contact your admin"); swapped confirm/cancel emphasis or relabeled buttons ("OK" → "Continue") makes users confirm deletes they meant to cancel; and label changes break any tests or e2e selectors keyed on text.

**Why it happens:**
Copywriting is treated as cosmetic and reviewed for tone, not truth. The writer doesn't trace what the handler actually deletes (e.g., whether deleting a deal cascades to the six `deal-*` portal collections).

**How to avoid:**
1. **Rule for destructive copy: the confirm dialog must name the object and the irreversible consequence** ("Delete this deal and its portal messages/documents? This cannot be undone."). Verify the claim against the handler code before rewriting it.
2. Keep destructive verbs destructive: Delete stays "Delete," never "Remove"/"Clear" unless that's literally true.
3. Inventory all ConfirmModal call sites and toast messages first; rewrite from the inventory so nothing is missed and nothing is accidentally weakened.
4. Error messages keep their diagnostic content (what failed + what the user can do), just in better prose. Never delete the actionable part.
5. Run tests after copy changes — text-based assertions will catch label drift; where they don't exist, that's a signal, not permission.

**Warning signs:**
- Copy diff touching a ConfirmModal message with no corresponding read of the handler.
- Generic replacements ("An error occurred") in the diff.
- Tone-only review comments on destructive-flow copy.

**Phase to address:**
Product copy phase — with an explicit destructive-actions sub-checklist; final polish phase re-verifies delete/close-deal flows end-to-end.

---

### Pitfall 9: The Landing Page Restructure Breaks Existing Entry Points

**What goes wrong:**
Moving the app behind a public landing page at `/` changes the routing contract of a live app: logged-in users' bookmarks and muscle memory hit a marketing page; deep links (deal portal invite links from `api/accept-invite.js` emails, lead-intake flows) can break if route prefixes change; auth-redirect logic that assumed `/` = app home now loops or strands users. Buyers/sellers with the minimal client shell are most likely to be forgotten in testing.

**Why it happens:**
The landing page is designed as a new page, not as a change to the root route of an app with live sessions and emailed links pointing at existing routes.

**How to avoid:**
1. Enumerate every externally-distributed URL first (invite emails, any shared links) and keep those routes stable.
2. Authenticated users hitting `/` should be redirected into the app (or see the app) — decide and test both states: signed-in and signed-out, for all four roles.
3. Keep the SPA rewrite behavior on Vercel intact for client-side routes (CRA needs all app routes to serve index.html); verify a hard refresh on a deep app route still works after any vercel.json change.
4. Smoke test: signed-out → landing → sign-in CTA → Google popup → lands in app; signed-in refresh on a deal page → still on the deal page.

**Warning signs:**
- 404 on hard-refresh of an app route after the change (rewrite regression).
- Invite-link flow untested in the phase plan.

**Phase to address:**
Landing page phase — acceptance criteria include the four-role, signed-in/out, deep-link matrix.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Pasting rules to console without emulator tests | Fast iteration | Untested global access-control changes on live data | Never once rules tests exist; until then, only with additive changes + manual two-account verification |
| Keeping the in-memory index fallback | No user-visible breakage | Wrong analytics at scale; masks missing indexes forever | Acceptable until index audit completes — then make it loud, not gone |
| Hardcoding admin email "one more time" | Unblocks a feature | 9th copy of the constant; migration never completes | Never after the config module lands (enforce with grep check) |
| Copy edits without reading handlers | Fast polish | Confirm dialogs that lie about consequences | Never for destructive flows; fine for labels/empty states |
| Adding headers without Report-Only staging | One-step deploy | Production-wide auth/upload breakage discovered by users | Only for inert headers (X-Content-Type-Options etc. — already shipped); never for CSP/COOP |
| `--forceExit` on rules tests | Tests exit cleanly | Can hide hanging handles/broken teardown | Acceptable — known @firebase/rules-unit-testing issue, document it |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Firebase Auth (popup) | Setting `Cross-Origin-Opener-Policy: same-origin` | `same-origin-allow-popups` or omit COOP; the residual accounts.google.com console warning is benign — don't "fix" it |
| Firebase Auth (roles) | Expecting role changes to apply instantly | ID tokens refresh ~hourly; role-doc changes need `refreshUserDoc()`; rules that read the user doc apply immediately but token claims don't |
| Firestore rules | Treating console simulator as a test | Emulator tests via @firebase/rules-unit-testing with seeded docs (`withSecurityRulesDisabled`), incl. deleted-doc scenarios (rules use `exists()` in 4+ places) |
| Firestore indexes | Clicking the error-message index link and moving on | Add to `firestore.indexes.json` and deploy from the file; wait for READY before shipping dependent code |
| Cloudinary | Forgetting `api.cloudinary.com` (connect-src) and `res.cloudinary.com` (img-src) in CSP | Include both; test an actual upload + render after header changes |
| Vercel | Adding `Cache-Control` for `/static/**` without setting index.html to `no-cache` | Hashed assets: `public, max-age=31536000, immutable`; index.html: `no-cache` — otherwise stale HTML references deleted chunks (ChunkLoadError; `lazyWithReload` only partially recovers) |
| Vercel | Introducing a legacy `routes` key next to `headers` in vercel.json | `routes` cannot coexist with `headers`/`rewrites`; use `rewrites` |
| Resend (send-email) | Assuming provider sanitizes HTML | Validate/escape `to`, `subject`, plaintext fields server-side; validate email format |
| Sentry (or similar) | Adding the SDK without CSP allowances | If CSP ships too, allow the ingest domain in `connect-src`; add error tracking BEFORE header/rules phases so breakage is visible |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Index-fallback full-collection reads | "Fallback mode active" toast; slow analytics | Pre-create all composite indexes; alert on fallback | 500+ docs per collection (already flagged in CONCERNS) |
| 11 parallel KPI count queries on Home | 2s+ blank dashboard on cache miss | SWR: serve cached KPIs instantly, refresh in background | Slow connections today; worse as collections grow |
| `exists()`/`get()` calls in rules | Higher rule-eval latency + billed reads on every op | Don't add more lookups per rule than needed; test rules cost | Gradual — more collections routing through `canAccessDeal()` |
| Unbounded `activity_log` | Slow admin log view | Keep `limit(100)`; plan time-partitioning later (out of milestone scope) | ~10K+ docs |
| CSP Report-Only left on forever with no collector | Nothing — that's the trap (no signal) | Set a report endpoint or timebox Report-Only phase | Never "breaks," just never hardens |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Removing rules email-fallback before verifying admin doc role | Total admin lockout across all collections | Verify `users/{adminUid}.role == 'admin'` in production first; two-step removal |
| Auth-gating `api/health.js` with a guessable header instead of token verification | Env schema disclosure remains | Verify Firebase ID token + admin check, or delete after confirming no external monitor uses it |
| Treating client `permissions.js` fixes as security fixes | Direct Firestore writes bypass UI | Every permission change lands in rules first, client second; rules tests enforce parity |
| Copy rewrite renaming roles/actions in UI while rules keep old semantics | Users misunderstand what access they're granting | Copy for role/assignment flows reviewed against rules behavior |
| Adding input validation to api/ functions that rejects payloads the live client already sends | Breaking invite/lead-intake flows in production | Log-then-enforce: validate + log violations for a cycle, then reject; version tolerance for in-flight clients |
| Purging repo history for a non-secret file | Force-push chaos on an auto-deploying main | Plain `git rm`; history rewrite only for actual secrets |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Confirm dialogs that don't state the real consequence | Users delete deal-portal data unknowingly | Name object + cascade + irreversibility in every destructive confirm |
| Genericized error copy | Users can't self-serve; support burden | Keep cause + next step in every error message |
| Landing page hijacking `/` for signed-in users | Daily users hit marketing page every morning | Redirect authenticated sessions into the app |
| Polish applied only to admin-visible pages | Buyers/sellers see the old UI (they're the demo audience for "client experience") | Include the 4-page client shell in every polish checklist |
| Contrast "improvements" below the established floor | Illegible faint text on dark UI | Respect `--text-faint` as minimum tier and the 11px type floor |

## "Looks Done But Isn't" Checklist

- [ ] **Rules hardening:** Often missing non-admin verification — sign in as a test agent AND a buyer after every rules publish; admin-only testing proves nothing (admin skips the indexed/scoped paths).
- [ ] **Rules published:** Code merged ≠ rules live — confirm the console paste happened (offer pbcopy) and note the publish time in the changelog.
- [ ] **Composite indexes:** "Created" ≠ READY — check index state in console before shipping dependent queries or removing fallbacks.
- [ ] **Security headers:** Deployed ≠ compatible — run the smoke test: Google popup sign-in, email sign-in, live Firestore view, Cloudinary upload, PDF preview.
- [ ] **Admin email centralization:** Refactor "done" but `grep -rn "dealcenterx@gmail.com" src api` still returns non-config files — the refactor isn't done. Rules copy is documented as intentionally separate.
- [ ] **Token migration:** Hex count in `src/components` (938 at audit time) must go down; any new `var(--x)` must exist in App.css `:root`.
- [ ] **Copy rewrite:** Destructive confirms re-verified against handler behavior; tests still pass (text assertions).
- [ ] **Landing page:** Hard refresh on a deep app route still serves the app (SPA rewrite intact); invite-email links still land correctly; all four roles tested signed-in and signed-out.
- [ ] **Error tracking:** SDK installed ≠ working — trigger a test error in production and see it in the dashboard; API functions report too, not just ErrorBoundary.
- [ ] **Rules tests:** Passing locally ≠ wired to CI — emulator must run in the workflow; CRA Jest defaults to jsdom, rules tests need a node-env config (separate script, `--detectOpenHandles --forceExit`).

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Bad rules publish (lockout/exposure) | LOW if prepared | Paste previous committed `firestore.rules` from git; allow up to 10 min propagation; verify with two accounts |
| CSP/COOP breaks sign-in or uploads | LOW | Revert the vercel.json commit → auto-redeploy; or hotfix header value; verify with smoke test |
| Missing index hits non-admins | MEDIUM | Create index (console link or indexes file deploy); users broken until READY (minutes+); fallback code softens if still present |
| Stale chunk / caching misconfig | LOW-MEDIUM | Fix header values, redeploy; `lazyWithReload` recovers most sessions; worst case users hard-refresh |
| Partial admin-email migration discovered later | LOW | Grep for literal, finish migration, add CI grep check |
| History rewrite gone wrong | HIGH | Restore from GitHub's reflog/backup clone; re-point Vercel; coordinate all clones — this is why we don't do it |
| Copy change that misleads on a destructive action | LOW to fix, HIGH if data lost | Fix copy immediately; if data deleted under false pretense, restore from Firestore backup (verify backups exist — if none, that's a finding for the audit) |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Rules lockout (email-fallback removal) | Rules tests phase BEFORE auth hardening phase | Emulator tests pass incl. admin-without-role-doc scenario; production two-account smoke test after publish |
| CSP/COOP breakage | Infra/headers phase (after error tracking) | Report-Only cycle clean; 5-action smoke test passes post-enforcement |
| Two-channel deploy race | All phases touching rules/indexes/queries | Phase plans contain explicit "publish rules / index READY before merge" steps |
| Missing composite indexes | Data/API reliability phase | Query audit doc; all indexes READY; non-admin account exercises every list/dashboard |
| health.js / archive removal | Repo hygiene phase (early) | health.js auth-gated or removal approved by user; archive removed via plain `git rm`, no force push anywhere |
| Admin email partial migration | Auth hardening phase | `grep -rn "dealcenterx@gmail.com" src api` returns only config file(s) |
| Token refactor regressions | UI/UX phase (migrate-then-change sequencing) | Hex count decreases; full page checklist incl. buyer/seller shell spot-checked |
| Destructive-copy semantics | Copy phase + final polish | ConfirmModal inventory reviewed against handlers; delete/close-deal flows re-tested |
| Landing page entry-point breakage | Landing page phase | Role × auth-state × deep-link matrix passes; hard-refresh on app routes works |

## Sources

- [Firebase: Manage and deploy Security Rules](https://firebase.google.com/docs/rules/manage-deploy) — propagation timing (≤1 min new queries, ≤10 min active listeners) — MEDIUM (official docs via search)
- [Firebase: Fix insecure rules](https://firebase.google.com/docs/firestore/security/insecure-rules) / [Get started with rules](https://firebase.google.com/docs/firestore/security/get-started) — lockout/exposure failure modes — MEDIUM
- [firebase-js-sdk #8541](https://github.com/firebase/firebase-js-sdk/issues/8541), [#8295](https://github.com/firebase/firebase-js-sdk/issues/8295) — COOP vs signInWithPopup — MEDIUM
- [Firebase: Control access with custom claims](https://firebase.google.com/docs/auth/admin/custom-claims), [Doug Stevenson: supercharged custom claims](https://medium.com/firebase-developers/patterns-for-security-with-firebase-supercharged-custom-claims-with-firestore-and-cloud-functions-bb8f46b24e11) — token refresh delay, safe role migration — MEDIUM
- [Firebase: Manage indexes](https://firebase.google.com/docs/firestore/query-data/indexing) — async index builds, failed-precondition — MEDIUM
- [Firebase: Test rules with emulator](https://firebase.google.com/docs/firestore/security/test-rules-emulator), [rules-unit-testing reference](https://firebase.google.com/docs/reference/emulator-suite/rules-unit-testing/rules-unit-testing), [Fireship rules-testing tutorial](https://fireship.io/lessons/testing-firestore-security-rules-with-the-emulator/) — seeding, auth mocking, Jest flags — MEDIUM
- [GitHub Docs: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository), [git-filter-repo](https://github.com/newren/git-filter-repo) — history-rewrite consequences — MEDIUM
- [Vercel: Cache-Control headers](https://vercel.com/docs/caching/cache-control-headers), [vercel/vercel discussion #11735](https://github.com/vercel/vercel/discussions/11735) — CRA caching patterns, stale-chunk risk — MEDIUM
- Codebase verification (HIGH): `firestore.rules:14-20` (email fallback + lockout comment), `src/components/LoginPage.js:80` (signInWithPopup), `vercel.json` (existing headers, no CSP/COOP/cache rules yet), `firestore.indexes.json` (3 indexes), `api/health.js` (unreferenced in-repo), 938 hardcoded hex in `src/components`, 161 `var(--…)` uses in `src/App.css`, ConfirmModal used in 9 components
- `.planning/codebase/CONCERNS.md` — known-issue baseline this document builds on

---
*Pitfalls research for: live Firebase + CRA + Vercel SaaS professionalization (REMS)*
*Researched: 2026-07-06*
