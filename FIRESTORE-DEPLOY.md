# Deploying to Firestore

Project: **`rvuconnect-26c39`** (from `.firebaserc`)

---

## Super admin account

The Super Admin is **`kushalsbtech24@rvu.edu.in`**.

That resolves the domain question: the new rules restrict all access to `@rvu.edu.in`, and
`isSuperAdmin()` calls `isRvuEmail()` first, so an admin on any other domain would have been
locked out of the console the moment the rules landed. An RVU address is on the right side of that
rule, so the deploy is safe to run.

**Bootstrap it once, before deploying** (only needed if this account is not already an admin):

1. Sign in to the app once with `kushalsbtech24@rvu.edu.in` so Firebase Auth creates the account
   and `ensureUserProfile` writes its `users/{uid}` document.
2. Copy the UID from Firebase Console → Authentication → Users.
3. Create `superAdmins/{uid}` with `{ uid, email: "kushalsbtech24@rvu.edu.in" }`, and set
   `users/{uid}.role = "superAdmin"`.

Either of those two is enough on its own — `hasSuperAdminGrant()` checks the `superAdmins`
document first and falls back to `users/{uid}.role`. Writing both keeps the client and the rules
in agreement.

**Retire any other admin account.** If a non-RVU address is still present in `superAdmins` or has
`users/{uid}.role == "superAdmin"`, delete that `superAdmins` document and set its role back to
`student`. Leaving it costs nothing functionally once the rules are deployed — the domain check
already denies it — but it is a stale grant, and stale grants are what the audit kept finding.

## The CLI needs re-authentication

The credentials stored on this machine are expired, so I could not deploy for you:

```
Error: HTTP Error: 401, Request had invalid authentication credentials.
```

They also belonged to a different Google account. Clear it and sign in as the RVU account — this
is an interactive browser flow, so it has to be you:

```bash
npx firebase logout
```

```bash
npx firebase login
```

Pick `kushalsbtech24@rvu.edu.in` in the browser prompt, then confirm:

```bash
npx firebase login:list
```

The account you deploy with needs Editor or Owner on the `rvuconnect-26c39` project. Deploying
rules is a project-admin action and is unrelated to the in-app Super Admin role — but if this RVU
account is not yet a project member, add it in Firebase Console → Project settings → Users and
permissions.

---

## Deploy

Validate locally first — this compiles the rules in the emulator and asserts their behaviour:

```bash
npm test
```

Then deploy rules and indexes together — **always with `--only`**:

```bash
npx firebase deploy --only firestore:rules,firestore:indexes --project rvuconnect-26c39
```

**Never run a bare `firebase deploy`.** `firebase.json` declares a functions codebase pointing at
a `functions/` directory that does not exist in this repo. The CLI validates that during the
prepare step, before releasing anything, so a bare deploy aborts the whole thing — rules included.

Confirm afterwards:

```bash
npx firebase firestore:indexes --project rvuconnect-26c39
```

Index builds are asynchronous. The new one is small, but watch Firestore → Indexes until it
reads **Enabled**; queries against a still-building index fail with `failed-precondition`.

---

## What actually changes in Firestore

### Rules — behavioural diff

| Rule | Before | After |
|---|---|---|
| `isRvuEmail()` | any authenticated account with an email | must end `@rvu.edu.in` |
| `users/{uid}` create | only `role` and `email` constrained | also rejects `schoolRepApproved`, `clubCoreApproved`, `hostApproved` — the three privilege-bearing keys only |
| `clubs/{id}/coreMembers` read | own membership or fellow cores only | any RVU account (the roster is shown on every club page) |
| `events/{id}/rsvps/{uid}` | owner + super admin | unchanged — owner + super admin |

Everything else is untouched. The `hostRequests` self-approval block, the field-level `users`
update guards and the closing default-deny are all as they were.

### Indexes — one addition, and a deploy prompt to say NO to

```json
{ "collectionGroup": "clubApplications",
  "fields": ["clubId", "email", "status"] }
```

**Correction to an earlier claim in this file:** I previously called this a *missing* index. It is
not strictly required. Firestore only needs a composite index when a query combines an equality
filter with an `orderBy` (or range) on a **different** field. This query is equality-only
(`clubId ==`, `email ==`, `status ==`), and Firestore serves those by merging its automatic
single-field indexes. The definition is still correct and deploys for free, so it is staying — but
it was never the difference between working and broken.

Auditing every query in the codebase against that rule, exactly **two** composite indexes are
genuinely required, and both already existed before this branch:

| Index | Needed by |
|---|---|
| `events` — status Asc, createdAt Desc | the published events feed and its Load More |
| `announcements` — status Asc, createdAt Desc | the published announcements feed and its Load More |

If the feed renders in production today, those two are already Enabled and nothing new breaks.

> ### ⚠️ Answer NO if the deploy offers to delete indexes
>
> `firebase-tools` 12.9.1 compares the project against `firestore.indexes.json` and **prompts to
> delete anything present in the project but absent from the file** — including any composite index
> someone created earlier by clicking a "create index" link in a Firestore error message.
>
> The repo file also has `"fieldOverrides": []`, so **any existing single-field index exemption or
> TTL policy will be listed for deletion too.**
>
> Answer **no** to both prompts, and never pass `--force`. If something gets listed, add it to
> `firestore.indexes.json` afterwards so the repo matches reality.

Two pre-existing indexes are now unused, because the admin queues page by document id instead of
ordering server-side: `hostRequests (status, createdAt)` and `users (role, createdAt)`. Harmless.
Leave them — deleting an index is itself a destructive change.

## Firebase Console checklist

These are console changes, not deploys. Nothing in the repo can substitute for them.

### Required

| Check | Why | Where |
|---|---|---|
| **Authorized domains** include the production origin (`rvu-connect.vercel.app`, plus any preview URL you test on) | The Auth SDK rejects an unlisted serving origin client-side with `auth/unauthorized-domain`. Google sign-in fails for **everyone**, and there is no Firebase Hosting block in `firebase.json`, so the app is served from elsewhere. | Authentication → Settings → Authorized domains |
| **Google is the only enabled sign-in provider** | The client only implements `signInWithPopup` + `GoogleAuthProvider` (`js/services.js:19-24`). Email/Password being enabled would let accounts exist that the app cannot sign in, and the rules assume an `email` claim is always present. | Authentication → Sign-in method |
| **Decide the App Check enforcement state** | `js/firebase-init.js` initialises App Check unconditionally. With Firestore enforcement **on**, an unregistered or misconfigured reCAPTCHA v3 key blocks every request from both the app and the admin console. | App Check → APIs → Cloud Firestore |

### Recommended

- **reCAPTCHA v3 site key** — confirm `6Lec…H1pDo` (`js/config.js:15`) is the key registered for
  this web app, and that its allowed-domains list covers the production origin.
- **API key referrer restrictions** — if the browser key is restricted, the production origin must
  be allowed (Google Cloud console, not Firebase).
- **OAuth consent screen** — check its publishing status before a campus-wide rollout.
- **App Check debug tokens** — `CONFIG.appCheck.debugToken` is the boolean `true`, which makes the
  SDK mint and print a *random per-browser* UUID rather than use a fixed token. Any token you
  register is a permanent bypass for whoever holds it, so register sparingly and delete stale ones.

## Data migration: none required

No document needs rewriting. Specifically:

- **Existing `users` docs** are unaffected — the new whitelist applies only to *create*, and a
  legitimately admin-granted `schoolRepApproved: true` keeps working.
- **`clubApplications`** gain two new status values (`withdrawn`, `revoked`) from the revocation
  fix. Existing `pending` / `approved` / `rejected` documents behave exactly as before.
- **Documents missing `createdAt`** stay visible. This needed a code change rather than a
  migration: a Firestore `orderBy` silently *excludes* documents lacking the ordered field, so
  ordering the admin queues server-side would have hidden any legacy record. The queues now page
  by document id and sort by date in the client. The one place that still orders server-side is
  the public events/announcements feed (`where status == published` + `orderBy createdAt`), and
  `createEvent` / `createAnnouncement` have always written `createdAt`.

### Data checks worth running once

None of these block the deploy. Each is a "check, and only if X then do Y" — I have no access to
your database, so these are framed as queries for you to run.

| Check | If you find it | Why it matters |
|---|---|---|
| `users` where `schoolRepApproved == true` | Cross-check each against an **approved** `hostRequests/schoolRepresentative_{uid}`. Any user with the flag but no approved request granted it to themselves — clear the flag. | The escalation was open until this branch. `isApprovedSchoolRep()` trusts that flag, so a self-granted one is live campus-wide publishing access. |
| `clubApplications` where `status == "approved"` | Confirm each has a matching `clubs/{clubId}/coreMembers/{email}` document. | The self-heal paths **recreate** membership from an approved application. Anyone removed from a roster before this branch comes back the first time someone opens that club page. Demote the application to `revoked` instead. |
| `clubs/{clubId}/coreMembers` docs with no `status` field | Set `status: "approved"`. | The client treats a missing status as approved and shows core tools, but `isApprovedClubCore()` in the rules requires `status == 'approved'` — so every write is denied. Broken-looking host account. |
| `coreMembers` doc ids that are not the lowercased email | Recreate the document under the lowercased email id. | `removeClubCoreRole` deletes by lowercased email, so a differently-cased id cannot be removed. |
| `clubs` docs whose `status` is not exactly `"approved"` | Set it. | The rules gate club reads on that exact value, so the club is invisible campus-wide. |
| `siteSettings/platform` → `bannedWords` | Must be an **array**, not a comma-separated string. `reviewRequired` must be a boolean. | Both are now genuinely enforced (`assertNoBannedWords`, `resolvePublishStatus`). A string would be iterated character-by-character. If the document is missing entirely the code defaults safely to no banned words and no review. |
| Auth users outside `@rvu.edu.in` | Expect them to lose all access. | Their documents are untouched and access returns if you widen the rule later. Note subdomains (`x@cs.rvu.edu.in`) do **not** match. |
| `superAdmins` entries for non-RVU accounts | Delete them and set the role back to `student`. | Dead once the domain gate lands, but a stale grant. |

## Not deployed from here

- **Hosting** — `firebase.json` has no `hosting` block; the app is served elsewhere (App Check
  config lists `rvu-connect.vercel.app`). Deploying the front-end is a separate step.
- **Cloud Functions** — `firebase.json` points at a `functions/` directory that does not exist in
  this repo. Do not pass `--only functions`; it will fail.
- **App Check** — the localhost 403s during testing are the unregistered debug token and are
  expected. If you want a clean local console, register the token printed by the browser under
  App Check → Apps → Manage debug tokens.
