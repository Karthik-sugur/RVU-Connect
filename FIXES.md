# Fixes for the pre-launch QA findings

Companion to [QA-REPORT.md](QA-REPORT.md). Every confirmed finding is addressed. Nothing was
deferred; where a finding needed a product decision, the decision taken is stated.

**Verification:** `npm test` → 19 ES modules parse + 26 Firestore rules tests pass against the
emulator. The XSS, routing, filtering and mobile fixes were additionally reproduced live in a
browser.

---

## Two product decisions taken

| Question | Decision | Consequence |
|---|---|---|
| Email domain — the code contradicted itself three ways | **RVU-only everywhere** | `firestore.rules` now enforces `@rvu.edu.in`, closing the hole where any Google account could read the entire campus dataset. `js/auth.js` `isAllowedRvuEmail` now agrees with `services.js` and `admin.js`. |
| RSVP and in-app project applications were advertised but had no writer | **Dropped both; attendance and applications are off-platform** | Events use the **Join** button, which opens the external registration link entered at creation time — the behaviour that predated the audit. RSVP was briefly implemented and then removed at your request, along with its displays and the always-empty Export RSVPs. Projects keep the external `applicationLink` model; the dead accept/reject and Export Applicants controls are gone. |

---

## Blockers

### B1 · Stored XSS — `escapeHtml` did not escape quotes
`js/utils.js` · `admin.js`

Rewrote both copies to escape `& < > " '` by string substitution. The old
`textContent → innerHTML` round-trip left quotes intact, so all 59 `attr="${escapeHtml(…)}"`
sinks were attribute-breakout vectors.

Also added `safeUrl()` (http/https allow-list) and applied it to the 6 `href`/`src` sinks, and
guarded the `open-external-link` handler — `window.open()` would happily run a `javascript:` URL.

> **Both copies are deliberately self-contained** (no module-level lookup table). These modules
> sit in an import cycle and `escapeHtml` can be called before the module body finishes
> evaluating; a `const` table there throws `Cannot access '…' before initialization` and takes
> the whole render down. The same trap bit `focusOpenDialog`, which is why `FOCUSABLE` and
> `_trapHandler` in `js/ui.js` are `var`.

**Proven:** an event titled `Hack" onmouseover="…` rendered through the real `renderEventCard`
now produces no handler attribute and executes nothing.

### B2 · Reading data permanently deleted it
`js/services.js`

Deleted both `deleteDoc` calls from `loadCampusData`. Expiry is now filter-only via
`isEventExpired` / the new `isProjectExpired`. A super admin signing in no longer destroys every
past event and expired project campus-wide.

### B3 · Any student could self-grant School Representative
`firestore.rules`

The `users/{uid}` create rule now rejects any payload containing `schoolRepApproved`,
`clubCoreApproved`, `hostApproved`, `schoolScope`, `clubId` or `roleTitle`. Covered by 8 rules
tests, including that escalation via update is still blocked.

### B4 · Club-core access could never be revoked
`js/services.js`

`leaveClubCore` and `removeClubCoreRole` now demote the approved `clubApplications` document —
the standing grant the self-heal paths read from — via the new `demoteClubApplication()`.
Separately, `resolveOwnClubAccesses` no longer grants access off `club.founderEmail` alone; it
backfills a real roster document instead, so a founder's membership is revocable.

### B5 · Admin console showed demo fixtures as production records
`admin.js`

Removed `applyDemoCampusData` (and its import). The console reads live data only. Its
`preferLive()` helper substituted fixtures whenever a collection was empty — i.e. on rollout day.

### B6 · Content moderation reached nobody
`js/services.js` · `admin.js` · `js/router.js`

Three compounding faults fixed: `loadCampusData` now actually queries `moderationFlags` (it was
hard-coded to `[]`); `loadAdminTab`'s map gained the `moderation` key the consoles use; and the
admin tab loader mapping was corrected. Student reports now surface.

### B7 · Club-core onboarding was an inescapable loop
`js/auth.js` · `js/main.js` · `js/ui.js`

`onboardingComplete` is now written when a host request is submitted, and a user with any
submitted request/application is treated as onboarded. Added **Back** controls to the role,
student-info and host-info steps. "You already have a pending application" is now treated as
success rather than an error that traps the user.

---

## High severity

| Fix | Where |
|---|---|
| **Join** restored as the primary event action, gated on a valid `http(s)` link via `safeUrl()` so a `javascript:` link renders no button; added to announcement cards too | `js/ui.js` |
| School-rep approval is revocable — `revokeHostGrants()` clears the sticky flags and canonical request on rejection; `updateUserRole('student')` clears them too | `js/services.js` |
| Dual-role users no longer corrupt club announcements — the school picker is gated on the *item*, not the editor's roles, and the write is guarded | `js/ui.js`, `js/main.js` |
| `grantPlatformRole` no longer creates permanently-broken users — scoped roles are refused with an explanation instead of writing a bare `users.role` | `js/services.js` |
| Role Manager is usable — the user directory shows each Auth UID with a "Manage role" button that prefills the form | `admin.js` |
| Core team roster visible to ordinary students | `firestore.rules` |
| Club profile editor no longer wipes logo/banner/socials/highlights or force-closes registration — only filled fields are written | `admin.js` |
| Announcements can be re-published; unpublish is no longer one-way | `admin.js` |
| Admin lists page deterministically by document id and sort newest-first in the client, and report `hasMore` | `js/services.js` |
| Past-dated events rejected at creation | `js/main.js` |
| Real chronological event sorting — `sort` was hard-coded to 999 | `js/auth.js` |
| The 12-second poller no longer destroys open forms or fires false "approved" toasts | `js/auth.js` |
| Detail views are deep-linkable and Back returns to the list | `js/main.js` |
| Deleted/unknown club no longer renders a different club as authoritative; proper not-found states for event/project/announcement/club | `js/ui.js` |
| Demo mode cleared on real sign-in | `js/auth.js` |
| Sign-out fully resets session state via `resetSessionState()` | `js/auth.js` |
| New-club approval no longer overwrites an existing same-named club | `js/services.js` |

---

## Medium & low

| Fix | Where |
|---|---|
| Announcement timestamps computed at render (`formatRelativeTime`) instead of a stored `"Just now"` | `js/utils.js`, `js/main.js`, `js/ui.js` |
| Announcement Tag filter works and keeps its selection (`state.filters.announcementTag` was undeclared, so the change handler silently skipped it) | `js/state.js`, `js/ui.js` |
| Event dates render as `Mon, 20 Aug 2026` / `Aug 20` instead of raw ISO strings | `js/utils.js`, `js/ui.js` |
| Project card Apply button renders — was compared against `"Open"` while `"open"` is stored | `js/ui.js` |
| "More from this host" scoped by `clubId`/`schoolId`, not by an undefined field matching itself | `js/ui.js` |
| Saved-items "View →" resolves to a real action, or is hidden | `js/ui.js` |
| Apply-to-club modal excludes clubs you already belong to | `js/ui.js` |
| Club-core badge counts pending applications, not unreadable host requests | `js/ui.js` |
| Save + Report on announcement cards and detail | `js/ui.js` |
| "Apply as School Rep" hidden once held or pending — resubmitting used to revoke the grant | `js/ui.js` |
| Pending-approval screen shows real per-request status, including deleted clubs | `js/render-admin.js` |
| Escape and Back dismiss the topmost overlay | `js/router.js` |
| All 18 overlays have `role="dialog"`/`aria-modal`, with focus move and a Tab trap | `js/ui.js` |
| Admin tab caching keyed on a loaded-flag, not "array is empty" | `js/router.js` |
| Read failures collected into `data.loadErrors` instead of silent empty arrays | `js/services.js` |
| `loadMore` distinguishes exhausted / filtered-out / failed | `js/services.js`, `js/main.js` |
| Edit Profile keeps typed input when a Year button is clicked | `js/main.js` |
| `bannedWords` and `reviewRequired` site settings actually enforced; hosts told when content goes to review | `js/services.js`, `js/main.js` |
| Review-queue and moderation Load More read the cursor key they were stored under | `admin.js` |
| Admin console back link visible on light cards (was cream-on-cream) | `admin.css` |
| `state.myApplications` and other missing state defaults added; duplicate `editClubId` key removed | `js/state.js` |
| Double-escaped activity text | `js/ui.js` |
| `window.alert` replacement got Escape, a focus trap and dialog roles | `js/utils.js` |
| Touch targets raised to ≥36–44px (18 call sites); text contrast fixed — `#a09080` 2.91:1 → `#6a5a4a` 6.23:1, `#8a7a6a` 3.90:1 → `#756552` 5.03:1 | `js/ui.js`, `js/render-admin.js`, `js/utils.js` |
| Demo banner no longer overlaps the header — driven off a shared `--topbar-h`; its Sign In button works (the auth modal is now in the app shell) | `styles.css`, `js/ui.js` |
| Modals use `dvh` so the submit button survives the on-screen keyboard | `styles.css` |
| Bottom nav uses flex, so it cannot overflow a 320px viewport | `styles.css` |
| Dead project accept/reject and Export Applicants removed (called functions that never existed) | `admin.js` |
| Admin dispatch passes the full `dataset` | `admin.js` |

---

## Not code defects

- **Demo fixtures** use `date: "May 22"` with no year, so expiry and sorting behave differently
  there than in production. Left as-is, but the README now warns that a passing demo is not a
  passing test.
- **App Check 403s on localhost** are expected (the debug token is not registered) and were out
  of scope per the original brief.

---

## Follow-up: RSVP reverted to Join

Requested after the first pass. RSVP is gone from the product again and attendance is handled by
whatever the event's external Join link points to.

| Change | Where |
|---|---|
| Removed the Going/Interested controls, `rsvpFor()` and `renderRsvpControls()` | `js/ui.js` |
| Removed the `rsvp-event` / `cancel-rsvp` handler | `js/main.js` |
| Removed `setEventRsvp` / `removeEventRsvp` and their exports | `js/services.js` |
| Removed the RSVP displays (profile list, Home "My Campus" tiles, recent activity) — a display for data nothing can create is the same defect the audit flagged | `js/ui.js` |
| Removed the always-empty "Export RSVPs" and the now-dead `getEventRSVPs` reader | `admin.js`, `js/services.js` |
| **Join** is the primary gold action on the event detail and cards, and now also on announcement cards | `js/ui.js` |
| Join only renders for a valid `http(s)` link (`safeUrl`), so a stored `javascript:` URL produces no button | `js/ui.js` |
| Reverted the `events/{id}/rsvps` host-read rule branch — owner-only again, since nothing writes them | `firestore.rules` |
| Rules tests updated: rsvps assertions now cover owner-only access; added four club-scoping tests. **26/26 pass** | `tests/firestore.rules.test.js` |
| Gave the demo fixtures a `link` on every event and announcement, so Join is demonstrable in demo mode (previously no fixture had a link, so the button never appeared) | `sample-data.js` |
| README reverted to describe Join, not RSVP | `README.md` |

### Two data-visibility bugs found while auditing the deploy

Both came out of checking the queries against the index definitions, and both would have hidden
real records in production:

1. **`orderBy("createdAt")` silently excludes documents that lack the field.** The admin queues
   ordered server-side, so any record written before `createdAt` existed would have been
   permanently invisible — the same "queue looks empty but isn't" failure the audit flagged, just
   relocated. A `try/catch` cannot catch it, because a missing field is not an error. The queues
   now page by document id and sort by date client-side via `sortByCreatedAtDesc()`. Same fix for
   the moderation-flag load.
2. **An index definition worth adding** (though not, on closer inspection, a true gap).
   `removeClubCoreRole`'s fallback queries `clubApplications` by `clubId + email + status`, which
   had no matching definition. I first called this a missing index; it is not strictly required,
   because Firestore only needs a composite index when a query combines equality with an `orderBy`
   or range on a different field, and this query is equality-only. Added anyway — it is the correct
   definition and costs nothing. Only two composite indexes are genuinely required
   (`events` and `announcements` on `status + createdAt`), and both predate this branch.

See [FIRESTORE-DEPLOY.md](FIRESTORE-DEPLOY.md) for the deploy steps and the lockout warning.

---

## Follow-up: a blocker I introduced, caught by the deploy audit

Before deploying I ran a second multi-agent audit over the Firebase surfaces. It found a **release
blocker in my own fix**, and it is the same class of mistake the original audit kept flagging.

**The `users/{uid}` create rule denied every new sign-up.** My whitelist blocked `roleTitle`, but
`ensureUserProfile` (`js/services.js:335`) writes `roleTitle: ""` on every first-time profile
create. So the rule denied the create, `enterAuthenticatedApp` alerted "Missing or insufficient
permissions", and no new account could ever get into the app. Existing accounts were unaffected —
which is exactly why it would have survived testing with the current accounts and only broken for
real students on rollout day.

**Why the tests missed it:** `tests/firestore.rules.test.js` created a profile with a *hand-written*
payload that happened to omit `roleTitle`. The fixture did not match what the app actually sends.
The original audit's lesson — a passing demo is not a passing test — applied to my own test.

Fixed by narrowing the denylist to the three genuinely privilege-bearing keys
(`schoolRepApproved`, `clubCoreApproved`, `hostApproved`) and adding a test that asserts the
**exact** `ensureUserProfile` payload, so the fixture can no longer drift from the code. 27/27 pass.

Also corrected in [FIRESTORE-DEPLOY.md](FIRESTORE-DEPLOY.md): a deploy-time hazard worth knowing
about — `firebase deploy` prompts to **delete** any composite index or single-field exemption that
exists in the project but not in `firestore.indexes.json`. Answer no, and never pass `--force`.
