# RVU Connect — Production Readiness QA Report

**Branch:** `qa/e2e-production-testing` · **Fork:** `kushal-script/RVU-Connect` · **Commit under test:** `a0a8129`
**Target rollout:** Friday · **Scope:** application code and functionality (Firebase project/OAuth/hosting config explicitly out of scope)

---

## Verdict

**Do not ship Friday as-is.** Seven defects are release blockers. Two of them cause
**irreversible data loss** and **arbitrary code execution in other users' browsers**; one lets any
student **grant themselves campus-wide publishing rights**.

None of these are hypothetical — each was confirmed by reading the code path end to end, and the
XSS and navigation defects were reproduced live in a browser against the real render functions.

| Severity | Confirmed | Meaning |
|---|---|---|
| 🔴 Blocker | 7 | Data loss, privilege escalation, or a core workflow that cannot complete |
| 🟠 High | 25 | Feature broken for a whole role, silent failure, or wrong data written/shown |
| 🟡 Medium | 48 | Workflow completes but is wrong or confusing in a realistic case |
| ⚪ Low | 23 | Cosmetic or rare edge case |

**Method:** 14 parallel workflow auditors (one per feature workflow), each finding then re-checked by
an independent skeptical verifier instructed to refute it. **110 raised → 103 confirmed, 7 refuted**;
every finding received a verdict. The blockers below were then verified a third time by hand, and the
XSS, navigation and silent-submit defects were reproduced live in a browser.

Counts are per dimension, so several defects appear more than once — the XSS was found independently
by three auditors and the revocation bug by two. That overlap is a confidence signal, not padding.
Deduplicated, the seven blocker rows collapse to **four distinct defects** (B1–B4); **B5, B6 and B7
are issues the auditors rated blocker-or-high that I judged rollout-blocking** given a Friday date
and a fresh production database.

---

## 🔴 Blockers — must fix before rollout

### B1. Stored XSS: `escapeHtml` does not escape quotes → arbitrary JS in every user's browser
`js/utils.js:205` · `admin.js:172` · **59 vulnerable sinks**

`escapeHtml` is implemented as `div.textContent = str; return div.innerHTML`. That escapes `<`, `>`
and `&` — but **not `"` or `'`**. It is then used *inside double-quoted HTML attributes* throughout
`ui.js`, `admin.js` and `render-admin.js`:

```js
data-title="${escapeHtml(event.title)}"     // ui.js:1618, 1622, 748 …
value="${escapeHtml(value || "")}"          // admin.js:834
data-name="${escapeHtml(app.name)}"         // render-admin.js:208
```

Any user-writable string containing `"` breaks out of the attribute and injects new attributes.

**Reproduced live** against the real `renderEventCard`. A club-core member creates an event titled:

```
Hack Night" onmouseover="<attacker JS>
```

Result — arbitrary JS executed:
```
injectedHandler: "window.__hits.push(...)"
executed:        ["JS-EXECUTED"]
verdict:         ARBITRARY JS EXECUTED FROM EVENT TITLE
```

**Blast radius by sink count:** `value` (22), `data-title` (18), `href` (4), `data-name` (3),
`data-email` (3), `src` (2), `data-url` (2), `data-status` (2), `placeholder` (2), `alt` (1).

**Why it is a blocker, not a high:** it crosses privilege boundaries in both directions.
A club-core member's event title executes in **every student's** browser. A *student's* own profile
name is rendered into `data-name="…"` in the club-core applicant list and the admin console (which
shares the same broken `escapeHtml`), so **a student can execute code inside a super admin's
session** — and the super admin's session can grant roles, delete records, and change site settings.
Tag breakout is blocked (`<`/`>` are escaped), so this is limited to event-handler attribute
injection — which is fully sufficient for account takeover.

**Fix:** escape quotes in both copies of `escapeHtml`:
```js
export function escapeHtml(str) {
  if (typeof str !== "string") return str == null ? "" : String(str);
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
```
Separately, `href`/`src` sinks need a scheme allow-list (`http:`/`https:` only) — `validation.js`
checks the create forms but not the admin edit paths or `updateDocument`.

---

### B2. Reading data permanently deletes it — a super admin opening the console wipes campus history
`js/services.js:498-520`

`loadCampusData` — a **read** path — issues `deleteDoc` as a side effect:

```js
// events past their date+time
if (canPurge) {                                     // superAdmin || event.createdBy === me
  await deleteDoc(doc(db, "events", event.id)).catch(() => {});
}
// projects past their expiry
if (auth.currentUser && (superAdmin || project.createdBy === uid || project.ownerId === uid)) {
  await deleteDoc(doc(db, "projects", project.id)).catch(() => {});
}
```

Consequences:

1. **A super admin merely signing in, or opening/refreshing the admin console, permanently
   destroys every past event and every expired project across the entire university.** No
   confirmation, no soft-delete, no undo, no audit record.
2. `events/{id}/rsvps` subcollections are **orphaned** — Firestore does not cascade deletes, so the
   data becomes unreachable garbage that still counts against quota.
3. A student who sets a project deadline in the past loses the project on the next page load.
4. `.catch(() => {})` swallows every failure, so nothing is ever surfaced.
5. This runs inside `softRefreshCampusData`, which the **12-second poller** calls — so it is not a
   one-time event, it is a recurring sweep.

This directly contradicts the README's "centralized record of campus activity" and its Audit Logs
goal. On rollout day, the first admin login silently erases the pre-launch seed history.

**Fix:** delete the two `deleteDoc` calls. Expiry is already handled correctly for display by
`isEventExpired` / `normalizeEvent` filtering. If purging is genuinely wanted, it belongs in an
explicit admin action or a scheduled Cloud Function — never in a read.

---

### B3. Privilege escalation: any student can self-grant School Representative
`firestore.rules:89`

The `users/{uid}` **create** rule constrains only `role` and `email`:

```
allow create: if isRvuEmail()
  && createsOwnDoc(uid)
  && request.resource.data.role == 'student'
  && request.resource.data.email is string
  && request.resource.data.email.lower() == authEmailKey();
```

`schoolRepApproved` is **not constrained** — and `isApprovedSchoolRep()` (`firestore.rules:50`)
trusts it:

```
|| ( exists(users/$(uid)) && get(users/$(uid)).data.schoolRepApproved == true )
```

So on first sign-in, before the app creates their profile, a user writes their own doc:

```js
setDoc(doc(db,'users',myUid), { role:'student', email:'me@rvu.edu.in', schoolRepApproved:true })
```

They are now an approved School Representative and can publish school-wide events and announcements
to the whole university. Firebase client keys are public by design, so this needs nothing but the
attacker's own browser console — the rules are the only server-side control.

The `update` rule correctly uses `unchanged('schoolRepApproved')`, so escalation is blocked *after*
the doc exists. **Create is the hole**, and every account gets exactly one create.

**Fix:**
```
allow create: if … && !request.resource.data.keys().hasAny(['schoolRepApproved','clubCoreApproved','hostApproved']);
```

---

### B4. Club-core access can never be revoked — removal is silently undone
`js/services.js:1295` (`leaveClubCore`), `1173` (`removeClubCoreRole`), `440` (`ensureCoreMembersFromApprovedApps`), `1161` (`listClubCoreMembers`)

Both revocation paths delete only the roster document:

```js
async function removeClubCoreRole(clubId, email) {
  await tracedDeleteDoc(doc(db, "clubs", clubId, "coreMembers", normalizedEmail));
}
```

But the approved `clubApplications/{clubId}_{uid}` document is never demoted. And
`listClubCoreMembers` — which the router calls **every time anyone opens any club detail page**
(`js/router.js:66`) — runs the "self-healing" repair:

```js
await ensureCoreMembersFromApprovedApps(clubId);   // re-creates the doc with status:'approved'
```

So: a club core member removes an abusive member, or a member leaves. The next time *any* user
opens that club's page, the roster document is recreated with `status: "approved"` and the removed
person has full club-core powers again. **Permission revocation does not work, and the UI reports
success.**

**Fix:** in both `leaveClubCore` and `removeClubCoreRole`, also set the corresponding
`clubApplications` doc's status to `revoked` (and have `ensureCoreMembersFromApprovedApps` skip
anything not `approved`).

---

### B5. The super-admin console displays fabricated demo data as production records
`admin.js:223-240` · `sample-data.js:888`

`loadAdminData()` pipes live data through the demo fixture loader:

```js
const data = applyDemoCampusData({ ...campusData, hostRequests: … });
```

and `preferLive` substitutes fixtures whenever a live collection is **empty**:

```js
function preferLive(liveItems, demoItems) {
  return liveItems && liveItems.length ? liveItems : clone(demoItems);
}
```

On rollout day most collections *are* empty. The super admin therefore sees demo users, clubs,
events, announcements, schools, moderation flags and content reviews **presented as real records** —
and every admin action (delete, approve, grant role, publish) is issued against invented IDs like
`demo-club-ai-forge`. Worse, each re-render re-injects them, so the fake rows never clear.

An admin cannot distinguish real campus data from fixtures. That makes the console unusable for
governance on day one.

**Fix:** remove `applyDemoCampusData` from `admin.js`. Demo fixtures belong only behind
`state.isDemoMode` in the student app.

---

### B6. Content moderation is entirely non-functional — student reports reach nobody
`js/services.js:531` · `js/services.js:1584` · `admin.js:436` · `js/render-admin.js:419`

Three independent faults compound:

1. `loadCampusData` **hard-codes** `moderationFlags: []` (line 531) — the collection is never queried.
2. `loadAdminTab`'s tab map has key `flags`, but both admin surfaces use the tab id `"moderation"`
   → `map["moderation"]` is `undefined` → the function returns `{docs: [], lastDocId: null}`.
3. The one path that *does* map correctly (`js/router.js:98`, the in-SPA admin route) is unreachable
   for super admins, because `js/auth.js:348` force-redirects them to `admin.html`.

Students *can* file reports — `flagContent` writes to `moderationFlags` successfully. **No one can
ever read them.** And because of B5, the empty result is then backfilled with demo flags, so the
moderation queue looks populated and healthy while real reports pile up unseen.

For a student platform shipping to a university, a moderation queue that silently drops every report
is a compliance and safeguarding problem, not just a bug.

**Fix:** query `moderationFlags` in `loadCampusData` for super admins, and add
`moderation: "moderationFlags"` to the `loadAdminTab` map.

---

### B7. Club-core onboarding is an inescapable loop
`js/main.js:149` · `js/auth.js:243` · `js/services.js:850`

The club-core onboarding path never writes `onboardingComplete`. Since `syncFirebaseData` sets
`state.onboardingStep = "role"` whenever `!profile.onboardingComplete` (`js/auth.js:241-245`), the
blocking role-picker modal **re-opens on every page load, forever**. The host-info step also has no
back or cancel control, and re-submitting fails because the request document already exists.

A student who picks "Club core" during onboarding is locked out of the app permanently — they cannot
finish, cannot exit, and cannot reach the campus feed.

**Fix:** write `onboardingComplete: true` when the host request is submitted, and add a
back/cancel action to the host-info step.

---

## 🟠 High severity

**Features advertised as complete that have no working user path**

- **RSVP is unimplemented.** No UI control, no service function, and no write path anywhere.
  `events/{id}/rsvps` and `users/{uid}/rsvps` appear only inside `collection()` **read** queries.
  `CONFIG.features.rsvpEnabled` is never read by any code. Meanwhile three surfaces *display* RSVP
  data, `firestore.rules` has rules for both paths, and the admin console offers "Export RSVPs"
  (which always yields an empty CSV). Demo mode ships fake RSVPs, so it looks implemented in a demo.
  README marks Event System & RSVP ✅ Complete.
- **In-app project applications are unimplemented.** "Apply" is an external `applicationLink` only.
  Nothing ever writes to `projects/{id}/applications`; `getProjectApplicants` reads a collection with
  no writer and **no Firestore rule at all** (so admin "Export Applicants" is denied outright).
  `state.myApplications` is never populated in production — `data.myApplications` is never assigned
  in `services.js`. The admin "Application status" button calls
  `window.RVUFirebase.updateProjectApplicationStatus`, **which does not exist** → `TypeError`.
  README claims a full submit → review → accept/reject → status-tracking workflow.

If these were deliberately descoped, the README, the admin export buttons, the accept/reject control
and the dead feature flags all need to go — otherwise staff will believe the data exists.

**Role and permission correctness**

- **School-rep approval cannot be revoked** (`js/services.js:965`) — rejecting an approved request or
  demoting the user to student leaves the sticky `schoolRepApproved` flag set, so they keep publishing.
- **Dual-role users corrupt club content** (`js/ui.js:945`) — a user who is both clubCore and schoolRep
  editing a club announcement silently overwrites its source with a school name.
- **A school-rep grant is destroyed by an unrelated club-core sync** (`js/services.js:642`).
- **`grant platform role → clubCore` produces a permanently broken user** (`js/services.js:1145`) —
  writes `users.role` only, with no `coreMembers` doc, so they are stuck on "Waiting for approval".
- **Role Manager is unusable** (`admin.js:1016`) — it requires a Firebase Auth UID that the console
  never displays anywhere, so no role can actually be granted through the UI.
- **`clubs/{clubId}/coreMembers` read rule has no branch for non-members** (`firestore.rules:166`) —
  the "Club core team" roster is empty for ordinary students on every club page.
- **Any Google account can read the entire campus dataset** (`firestore.rules:9`) — `isRvuEmail()`
  only checks that an email string exists. See the Domain Enforcement note below.

**Admin console**

- **Club profile editor wipes existing data** (`admin.js:934`) — saving blanks logo, banner, socials
  and highlights, and force-closes registration, because the form posts a partial object.
- **Unpublishing an announcement is irreversible** (`admin.js:675`) — there is no publish action.
- **Every admin list is the first 50 documents, unordered** (`js/services.js:1597`) — `limit(50)` with
  no `orderBy`. Queues appear empty or complete when they are neither; requests are silently invisible.

**Data integrity and UX**

- **Events created with a past date** look published to the host, are invisible to students, and are
  then permanently deleted by B2 (`js/main.js:686`).
- **"Soonest first" event ordering is a no-op on real data** (`js/auth.js:311`) — Home's "Next up"
  spotlight shows the most recently *created* event, not the next one.
- **The 12-second poller does a full `innerHTML` re-render** (`js/auth.js:103`), wiping any
  half-typed modal form — a student writing a project description loses it mid-sentence.
- **Detail views are not deep-linkable and break the Back button.** *Reproduced live:* opening an
  event detail changes the view but not the URL and pushes no history entry, so Back skips the list
  and lands on whatever was viewed before it. Confirmed sequence:
  `?route=events` → open detail (URL unchanged) → Back → `?route=clubs&clubSlug=demo-club-ai-forge`.
  `parseRoute()` and `navigate()` both already support `eventId`/`projectId`/`announcementId` — the
  card handlers just never pass them. Clubs do this correctly; events, projects and announcements
  do not. On mobile, where Back is the primary gesture, this is the most-hit defect in the app.
- **`state.isDemoMode` is never cleared** (`js/auth.js:371`) — a real signed-in session keeps showing
  the "no data is being saved" banner.
- **Profile → Saved Items "View →" is a dead click** (`js/ui.js:1345`) and poisons the next nav click.
- **A `clubSlug` that no longer exists renders the first club in the directory** as if it were the
  requested one — a shared link to a deleted club shows the wrong club's page as authoritative.

---

## 🟡 Medium · ⚪ Low

39 medium and 10 low findings were confirmed. The recurring themes:

- **Silent no-ops with no user feedback.** e.g. *reproduced live:* opening Apply for Club Core and
  pressing Submit without picking a club does absolutely nothing — `js/main.js:1351` is
  `if (!clubId) return;` with no message. This is the entry point to the whole club-core role flow.
- **Dead UI.** The project card's "Apply ↗" gates on `status === "Open"` while `createProject`
  writes lowercase `"open"` (`requireOneOf` enforces it), so that button has never rendered for any
  project, demo or production (`js/ui.js:1719`). Also: `cancel-event` handler with no button, Review
  Queue "Load More" keyed on the wrong cursor name, the demo banner's "Sign In" button.
- **Fields collected then discarded.** Club-core onboarding's "Role" and "Core display name"
  (`js/services.js:828`); Site Settings' review-required and banned-words (`admin.js:796`).
- **Stale/wrong display.** Announcements permanently show the hard-coded string `"Just now"`
  (`js/main.js:780`); the announcements Tag filter is inert and resets itself; real events render raw
  ISO dates (`2026-08-20`) because the formatter only handles the demo's `"May 22"` strings.
- **State not reset.** `handleSignOut` leaves host/role state dirty, so the next sign-in in the same
  tab renders the previous user's role UI. `state.myApplications` has no default in `state.js`.
- **No audit logging exists at all**, despite the README's Audit Logs module and an `auditLogs`
  collection in the documented schema.
- **Escape does not close any modal or the search overlay** (*reproduced live*).

Full structured data for all 110 findings, including the 7 refuted ones and per-finding verifier
reasoning, is in the workflow journal referenced at the end.

---

## Domain enforcement — needs a product decision, not just a fix

Commit `0f9b0dd` ("allow all email domains … instead of restricting to rvu.edu.in") loosened
`firestore.rules`, `js/auth.js`, `js/ui.js`, `js/utils.js` and `js/render-admin.js` — but **did not
touch `js/services.js`**, which still hard-blocks and force-signs-out:

```js
// js/services.js:8-22
function isRvuEmail(email) { return …endsWith(EMAIL_DOMAIN); }        // "@rvu.edu.in"
async function requireRvuUser(user) {
  if (!user?.email || !isRvuEmail(user.email)) {
    await signOut(auth);
    throw new Error("Only @rvu.edu.in accounts can use RVU Connect.");
  }
}
provider.setCustomParameters({ hd: "rvu.edu.in", … });
```

`admin.js:179` also still hard-codes the domain. So the codebase now contradicts itself in three
places at once:

| Layer | Behaviour |
|---|---|
| `js/services.js`, `admin.js` | RVU-only, signs everyone else out |
| `js/auth.js` `isAllowedRvuEmail` | accepts any string containing `@` |
| `firestore.rules` `isRvuEmail()` | accepts **any** authenticated Google account |

Two different bugs depending on intent:

- **If RVU-only is intended:** the Firestore rules are wide open — any Google account can read the
  entire campus dataset. Restore the domain check in the rules.
- **If all domains are intended:** login is broken for everyone else (immediate sign-out), and the
  error messages across `main.js` and `admin.js` still claim `@rvu.edu.in` is required.

Either way it must be resolved before rollout. I did not guess which you want.

---

## What I verified as working

Not everything is broken — these held up under testing:

- **Landing page, demo mode, and all six routes render cleanly** at desktop and 375px mobile, with
  **no horizontal overflow** and no console errors (the only errors are App Check/reCAPTCHA 403s on
  localhost, which are out of scope).
- **Search works well** — 13 results across events, clubs, projects and announcements for one query,
  correctly typed and routed.
- **`users/{uid}` read rules are tight** — own document or super admin only. No PII exposure.
- **`hostRequests` rules correctly prevent self-approval** — a user may only ever write `status:
  'pending'` to their own request.
- **`firestore.rules` ends in a default-deny catch-all** (`match /{document=**} { allow read, write: if false; }`).
- **`admin.js`'s form helpers (`input`/`textarea`/`select`) all escape correctly** — the XSS in B1
  comes from `escapeHtml` itself, not from missing calls in these helpers.
- **Super admin bootstrap works** — `ensureUserProfile` overrides the role from a `superAdmins/{uid}`
  grant, so an admin seeded directly in the Firebase console is not locked out.
- **Club detail pages deep-link correctly** (`?route=clubs&clubSlug=…`) — the model the other detail
  views should copy.
- **Mobile modals are usable** — Edit Profile's submit button stays within the 812px viewport.
- **Follow/unfollow, save/unsave, and club application submit/withdraw** are all fully wired
  (UI → handler → service → Firestore) with rules that permit them.

---

## Recommendation

**Slip the date, or cut scope hard.**

Minimum to ship safely — B1, B2, B3 are non-negotiable:

1. **B1** — fix `escapeHtml` in both copies. One-line-per-character change, ~15 minutes, removes 59
   injection points at once.
2. **B2** — delete the two `deleteDoc` calls in `loadCampusData`. ~5 minutes, stops irreversible loss.
3. **B3** — add the `hasAny` guard to the `users` create rule. ~5 minutes, closes the escalation.
4. **B4, B7** — revocation and the onboarding loop; both are small, localised fixes.
5. **B5, B6** — remove demo fixtures from `admin.js`; add the `moderation` tab key.
6. Resolve the **domain-enforcement** contradiction.
7. Either implement **RSVP** and **project applications**, or remove them from the README, the admin
   export buttons and the dead feature flags so nobody relies on data that is never collected.

Items 1–3 are roughly half an hour of work and eliminate the catastrophic-outcome risks. The
remaining blockers are workflow-completeness issues that a pilot with one or two clubs would surface
immediately — which is worth doing before opening it to the whole student body.

**Suggested pre-launch smoke test** (none of this is currently covered by automated tests — the repo
has no test runner; `package.json`'s `test` script exits 1, and `test.js` is a single ad-hoc rules
probe):

1. Sign in as a brand-new student → complete onboarding → confirm the modal does not return on reload.
2. Create an event titled `Test" onmouseover="alert(1)` → confirm it renders inert.
3. As a super admin, note the event count → refresh the console → confirm the count is unchanged.
4. Approve a club-core application → remove that member → open the club page → confirm they stay removed.
5. File a content report as a student → confirm it appears in the admin moderation queue.

---

## Coverage and limitations

**Covered:** all four roles (student, club core, school rep, super admin) including dual-role users;
auth and onboarding; events; announcements; projects; clubs and membership; host requests and role
elevation; the admin console; `firestore.rules` versus every client write; XSS/output encoding;
state, caching and races; routing and deep links; the data layer, pagination and index agreement;
mobile and accessibility. Files read in full include `js/services.js`, `js/ui.js`, `js/main.js`,
`js/auth.js`, `js/router.js`, `admin.js`, `js/render-admin.js`, `firestore.rules`, `js/utils.js`.

**Limitations — worth knowing before you rely on this:**

- **No authenticated runtime testing.** Live click-through used demo mode, which bypasses Firebase
  entirely. Everything role-gated was verified by reading the code, not by executing it as a signed-in
  club core member or super admin. Per your instruction, Firebase was treated as out of scope.
- **Demo mode is not representative.** Its fixtures use `date: "May 22"` (no year), so the
  `/^\d{4}-\d{2}-\d{2}$/` expiry checks never match and every event shows as "Upcoming" — which is
  how B2's deletion behaviour and the date-formatting defects stay invisible in a demo. A demo
  passing is not evidence a workflow works.
- **Severities are the verifiers' corrected values**, which were often lower than the original
  auditor's claim. 7 findings were refuted outright and are excluded.
- **Counts are per dimension and contain cross-dimension duplicates** (see Method). Treat the
  severity tallies as volume indicators; the deduplicated blocker set is B1–B7.
- Firestore **index deployment status** was not checked (out of scope); only whether the repo defines
  an index for each composite query it issues.

**Artifacts:** workflow run `wf_2d2dd564-91f`; structured findings at
`scratchpad/audit.json`; local QA server at `.claude/static-server.js` + `.claude/launch.json`
(`node .claude/static-server.js`, then open `http://localhost:8765`).
