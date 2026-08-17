# Deploying to Firestore

Project: **`rvuconnect-26c39`** (from `.firebaserc`)

---

## ⛔ Read this before you deploy

**The new rules restrict all access to `@rvu.edu.in` accounts. If your Super Admin signs in with
a non-RVU address, deploying will lock them out of the admin console immediately.**

`isSuperAdmin()` calls `isRvuEmail()` first, so a `@gmail.com` super admin fails every rule —
including reading their own `users` document. The console will render its "access denied" screen
and no admin action will work.

This is worth 30 seconds of checking because the signals point at it:

- The Firebase CLI on this machine is logged in as `kushalsathyanarayan@gmail.com`.
- Commit `0f9b0dd` deliberately removed the domain restriction ("allow all email domains"),
  which is what a team using non-RVU accounts for development would do.

**Check first** — Firebase Console → Authentication → Users, and Firestore → `superAdmins`.
Confirm every super admin's email ends in `@rvu.edu.in`.

If one does not, pick one:

| Option | What to do |
|---|---|
| Give admins RVU accounts *(cleanest)* | Sign in once with the `@rvu.edu.in` account, then add its UID to `superAdmins/{uid}` and set `users/{uid}.role = "superAdmin"`. Deploy after that. |
| Allow specific exceptions | Change `isRvuEmail()` in `firestore.rules` to also accept an allowlist, e.g. `\|\| request.auth.token.email.lower() in ['you@gmail.com']`. Update `js/services.js`, `js/auth.js` and `admin.js` to match. |
| Keep all domains open | Revert `isRvuEmail()` to `request.auth.token.email is string`. **This re-opens the hole where any Google account can read the entire campus dataset** — the audit's finding stands. |

Rules deploys are reversible (redeploy the previous file), but a mid-day lockout is disruptive.

---

## The CLI needs re-authentication

The stored credentials on this machine are expired, so I could not deploy for you:

```
Error: HTTP Error: 401, Request had invalid authentication credentials.
```

Re-auth is an interactive browser flow, so it has to be you:

```bash
npx firebase login --reauth
```

---

## Deploy

Validate locally first — this compiles the rules in the emulator and asserts their behaviour:

```bash
npm test
```

Then deploy rules and indexes together:

```bash
npx firebase deploy --only firestore:rules,firestore:indexes --project rvuconnect-26c39
```

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
| `users/{uid}` create | only `role` and `email` constrained | also rejects `schoolRepApproved`, `clubCoreApproved`, `hostApproved`, `schoolScope`, `clubId`, `roleTitle` |
| `clubs/{id}/coreMembers` read | own membership or fellow cores only | any RVU account (the roster is shown on every club page) |
| `events/{id}/rsvps/{uid}` | owner + super admin | unchanged — owner + super admin |

Everything else is untouched. The `hostRequests` self-approval block, the field-level `users`
update guards and the closing default-deny are all as they were.

### Indexes — one addition

```json
{ "collectionGroup": "clubApplications",
  "fields": ["clubId", "email", "status"] }
```

Needed by the `removeClubCoreRole` fallback, which looks up an approved application by email when
the roster document has no `uid`. Every other query the code issues is already covered — audited
query-by-query against `firestore.indexes.json`.

Two pre-existing indexes (`hostRequests: status,createdAt` and `users: role,createdAt`) are no
longer used, because the admin queues now page by document id. Harmless; left in place, since
deleting an index is itself a destructive change.

---

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

### Two audits worth running once

Neither is required for the deploy to succeed — both are about data that may already be wrong.

**1. Non-RVU accounts that will lose access.** Firebase Console → Authentication → Users, sort by
email. Anyone outside `@rvu.edu.in` stops being able to read anything the moment the rules land.
Their documents are untouched, so access returns if you widen the rule later.

**2. Unearned school-rep grants.** The escalation the audit found was open until now, so it is
worth confirming nobody used it. In Firestore, query `users` where `schoolRepApproved == true` and
check each one has a matching approved `hostRequests/schoolRepresentative_{uid}`. Any user with
the flag but no approved request granted it to themselves — clear the flag.

---

## Not deployed from here

- **Hosting** — `firebase.json` has no `hosting` block; the app is served elsewhere (App Check
  config lists `rvu-connect.vercel.app`). Deploying the front-end is a separate step.
- **Cloud Functions** — `firebase.json` points at a `functions/` directory that does not exist in
  this repo. Do not pass `--only functions`; it will fail.
- **App Check** — the localhost 403s during testing are the unregistered debug token and are
  expected. If you want a clean local console, register the token printed by the browser under
  App Check → Apps → Manage debug tokens.
