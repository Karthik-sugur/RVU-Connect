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
