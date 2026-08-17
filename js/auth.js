import { replaceCollection } from './utils.js';
import { schools, interests, events, clubs, announcements, projects, state } from './state.js';
import { render, renderAtTop } from './ui.js';
import { applyDemoCampusData } from '../sample-data.js';
import { EMAIL_DOMAIN } from './constants.js';

export function isClubCore() {
  return Boolean(state._hasClubCore) || state.role === "club-core";
}

export function isSchoolRep() {
  return Boolean(state._hasSchoolRep) || state.role === "school-rep";
}

export function isSuperAdmin() {
  return state.role === "admin";
}

export function canHost() {
  return (isClubCore() || isSchoolRep()) && state.host.approved;
}

/** True when the signed-in user is an approved core member of this club (all core members are equal). */
export function canManageClub(club) {
  if (!club) return false;
  if (isSuperAdmin()) return true;
  if (!isClubCore() || !state.host.approved) return false;
  const clubId = club.id || club.slug;
  const accesses = state.host.clubAccesses || [];
  if (accesses.some((access) => (access.club?.id || access.club?.slug) === clubId)) return true;
  return state.host.clubSlug === clubId;
}

export function isFollowingClub(clubId) {
  if (!clubId) return false;
  return (state.followedClubs || []).some((c) => c.clubId === clubId || c.id === clubId);
}

export function isItemSaved(itemId, type = "item") {
  if (!itemId) return false;
  return (state.savedItems || []).some((s) =>
    (s.itemId === itemId || s.id === itemId) && (!type || !s.type || s.type === type || s.type === "item")
  );
}

export function canManageEvent(event) {
  if (!event) return false;
  if (isSuperAdmin()) return true;
  if (isClubCore() && state.host.approved) {
    const accesses = state.host.clubAccesses || [];
    if (accesses.some((a) => (a.club?.id || a.club?.slug) === event.clubId)) return true;
    if (event.clubId && event.clubId === state.host.clubSlug) return true;
  }
  if (isSchoolRep() && state.host.approved && event.hostType === "school") {
    return true;
  }
  return false;
}

export function canManageAnnouncement(item) {
  if (!item) return false;
  if (isSuperAdmin()) return true;
  if (isClubCore() && state.host.approved) {
    const accesses = state.host.clubAccesses || [];
    if (accesses.some((a) => (a.club?.id || a.club?.slug) === item.clubId)) return true;
    if (item.clubId && item.clubId === state.host.clubSlug) return true;
  }
  if (isSchoolRep() && state.host.approved && (item.sourceType === "school" || item.type === "School" || item.type === "Faculty")) {
    return true;
  }
  return false;
}

export function platformSettings() {
  const rows = state.siteSettings || [];
  const platform = rows.find((s) => s.id === "platform") || rows[0] || {};
  const fallbackInterests = interests;
  const fallbackAnnouncementTags = ["Hiring", "Registration", "Notice", "Update"];
  return {
    interestTags: Array.isArray(platform.interestTags) && platform.interestTags.length ? platform.interestTags : fallbackInterests,
    announcementTags: Array.isArray(platform.announcementTags) && platform.announcementTags.length ? platform.announcementTags : fallbackAnnouncementTags,
    eventCategories: Array.isArray(platform.eventCategories) ? platform.eventCategories : [],
  };
}

/** Quiet re-sync without flashing the landing/sign-in screen. Keeps the user in-app. */
export async function softRefreshCampusData({ showSkeleton = false } = {}) {
  if (!window.RVUFirebase || !state.authUser) return;
  try {
    await syncFirebaseData({ quiet: !showSkeleton });
  } finally {
    state.dataLoading = false;
  }
  render();
}

let _pendingAccessPoll = null;
let _expiryRefreshPoll = null;

/** True when the user is mid-interaction and a full re-render would destroy their work. */
function hasOpenUserInput() {
  if (state.createEventOpen || state.editEventOpen || state.createAnnouncementOpen
    || state.editAnnouncementOpen || state.createProjectOpen || state.editProfileOpen
    || state.editClubOpen || state.createOpen || state.searchOpen || state.loginOpen
    || state.onboardingStep || state._clubApplyModalOpen) {
    return true;
  }
  const active = document.activeElement;
  if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return true;
  return false;
}

export function startPendingAccessPolling() {
  stopPendingAccessPolling();
  if (!state.authUser) return;
  _pendingAccessPoll = window.setInterval(async () => {
    if (!state.authUser || state.isDemoMode) return;
    // Never re-render over a form in progress — the poll replaces the whole app's innerHTML.
    if (hasOpenUserInput()) return;

    const wasApproved = (isClubCore() || isSchoolRep()) && state.host.approved;
    const wasPending = (isClubCore() || isSchoolRep()) && !state.host.approved;
    const wasStudent = state.role === "student";
    const hadPendingApps = (state.clubApplications || []).some((a) => a.status === "pending")
      || (state.hostRequests || []).some((r) => r.status === "pending" && r.uid === state.authUser?.uid);
    try {
      await softRefreshCampusData({ showSkeleton: false });
      const nowHost = (isClubCore() || isSchoolRep()) && state.host.approved;
      // Only announce a genuine transition, or an already-approved user applying for a
      // second role gets a false "approved" toast and the poll stops before the real one.
      const becameApproved = !wasApproved && nowHost;
      if (becameApproved && (wasPending || wasStudent || hadPendingApps)) {
        window.dispatchEvent(new CustomEvent("rvu-toast", {
          detail: { message: "Your access was approved. Admin tools are ready.", type: "success" },
        }));
        renderAtTop();
      }
      // Keep polling while anything is still pending, so a second role approval is noticed too.
      const stillPending = (state.clubApplications || []).some((a) => a.status === "pending")
        || (state.hostRequests || []).some((r) => r.status === "pending" && r.uid === state.authUser?.uid)
        || ((isClubCore() || isSchoolRep()) && !state.host.approved);
      if (!stillPending && becameApproved) stopPendingAccessPolling();
    } catch (_) {
      /* keep polling */
    }
  }, 12000);
}

export function stopPendingAccessPolling() {
  if (_pendingAccessPoll) {
    clearInterval(_pendingAccessPoll);
    _pendingAccessPoll = null;
  }
}

/** Drop expired events/projects from local state on a timer so the UI matches wall-clock time without a full reload. */
export function startExpiryRefreshPolling() {
  stopExpiryRefreshPolling();
  _expiryRefreshPoll = window.setInterval(() => {
    if (!state.authed || state.isDemoMode) return;
    if (hasOpenUserInput()) return;
    let changed = false;
    const nextEvents = events.filter((event) => {
      const expired = Boolean(normalizeEvent(event).past);
      if (expired) changed = true;
      return !expired;
    });
    if (nextEvents.length !== events.length) {
      replaceCollection(events, nextEvents.map(normalizeEvent));
      changed = true;
    }
    const now = Date.now();
    const nextProjects = projects.filter((project) => {
      const expiry = String(project.expiry || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) return true;
      const expiryDate = new Date(`${expiry}T23:59:59`);
      if (!Number.isNaN(expiryDate.getTime()) && expiryDate.getTime() < now) {
        changed = true;
        return false;
      }
      return true;
    });
    if (nextProjects.length !== projects.length) {
      replaceCollection(projects, nextProjects);
      changed = true;
    }
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const nextAnnouncements = announcements.filter((item) => {
      const created = item.createdAt?.toDate ? item.createdAt.toDate() : (item.createdAt ? new Date(item.createdAt) : null);
      if (created && !Number.isNaN(created.getTime()) && (now - created.getTime()) > thirtyDaysMs) {
        changed = true;
        return false;
      }
      return true;
    });
    if (nextAnnouncements.length !== announcements.length) {
      replaceCollection(announcements, nextAnnouncements);
      changed = true;
    }
    if (changed) render();
  }, 60000);
}

export function stopExpiryRefreshPolling() {
  if (_expiryRefreshPoll) {
    clearInterval(_expiryRefreshPoll);
    _expiryRefreshPoll = null;
  }
}

export function roleLabel() {
  if (isSuperAdmin()) return "Super admin";
  if (isClubCore() && isSchoolRep()) {
    return state.host.approved ? "Club core + School rep" : "Host pending";
  }
  if (isClubCore()) return state.host.approved ? "Club core" : "Club pending";
  if (isSchoolRep()) return state.host.approved ? "School rep" : "School pending";
  return "Student";
}

export function activeClub() {
  return clubs.find((item) => item.slug === state.host.clubSlug || item.id === state.host.clubSlug) || clubs[0] || {
    id: "",
    slug: "",
    name: "No club selected",
    category: "Club",
    school: state.host.school,
    tagline: "Create or approve clubs in Firestore to enable club controls.",
    description: "No approved club records are available yet.",
    doing: "Waiting for club data.",
    highlights: [],
    registrationOpen: false,
    join: "",
  };
}

/**
 * Restricted to RV University accounts. Must agree with isRvuEmail() in js/services.js,
 * admin.js and firestore.rules — if they disagree, sign-in accepts then force-signs-out.
 */
export function isAllowedRvuEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase().endsWith(EMAIL_DOMAIN);
}

export async function syncFirebaseData({ quiet = false } = {}) {
  if (!window.RVUFirebase || !state.authUser) return;
  if (!quiet) {
    state.dataLoading = true;
    render();
  }
  const profile = await window.RVUFirebase.ensureUserProfile(state.authUser);

  const roleMap = {
    superAdmin: "admin",
    clubCore: "club-core",
    schoolRepresentative: "school-rep",
    schoolRep: "school-rep",
    student: "student",
  };
  state.role = roleMap[profile.role] || "student";
  state.user.name = profile.name || state.authUser.displayName || state.user.name;
  state.user.school = profile.school || state.user.school;
  state.user.year = profile.year || state.user.year;
  state.user.interests = profile.interests || state.user.interests;
  if (profile.clubId) state.host.clubSlug = profile.clubId;
  if (profile.schoolScope) state.host.school = profile.schoolScope;
  if (profile.roleTitle) state.host.roleTitle = profile.roleTitle;
  if (profile.hostName) state.host.name = profile.hostName;
  if (profile.hostApproved !== undefined) state.host.approved = profile.hostApproved;
  const data = await window.RVUFirebase.loadCampusData({ superAdmin: state.role === "admin", profile });
  state.loadErrors = data.loadErrors || [];
  replaceCollection(clubs, data.clubs);
  replaceCollection(events, data.events.map(normalizeEvent));
  replaceCollection(announcements, data.announcements);
  replaceCollection(projects, data.projects);
  state.hostRequests = data.hostRequests || [];
  state.moderationFlags = data.moderationFlags || [];
  state.allUsers = data.allUsers || [];
  state.allEvents = data.allEvents || [];
  state.allAnnouncements = data.allAnnouncements || [];
  state.allClubs = data.allClubs || [];
  state.allSchools = data.allSchools || [];
  state.savedItems = data.savedItems || [];
  state.followedClubs = data.followedClubs || [];
  state.rsvps = data.rsvps || [];
  state.myApplications = data.myApplications || [];
  state.siteSettings = data.siteSettings || [];
  state.clubApplications = data.clubApplications || [];
  state._hasClubCore = false;
  state._hasSchoolRep = false;
  if (profile.role !== "superAdmin" && data.clubAccess) {
    state._hasClubCore = true;
    state.role = "club-core";
    state.host.clubAccesses = data.clubAccesses || [data.clubAccess];
    state.host.clubSlug = data.clubAccess.club.id;
    state.host.school = data.clubAccess.club.school || state.host.school;
    state.host.roleTitle = data.clubAccess.member.role || "core";
    state.host.name = data.clubAccess.member.name || data.clubAccess.club.name;
    state.host.approved = true;
  } else {
    state.host.clubAccesses = data.clubAccesses || [];
  }
  if (profile.role !== "superAdmin" && data.schoolAccess) {
    state._hasSchoolRep = true;
    // Keep club-core as primary role when both; isSchoolRep() still true via flag.
    if (!state._hasClubCore) state.role = "school-rep";
    state.host.schoolAccesses = data.schoolAccesses || [data.schoolAccess];
    state.host.school = data.schoolAccess.schoolId || profile.schoolScope || state.host.school || state.user.school;
    if (!state._hasClubCore) {
      state.host.roleTitle = data.schoolAccess.representative.role || "representative";
      state.host.name = data.schoolAccess.representative.name || state.host.name;
    }
    state.host.approved = true;
  } else {
    state.host.schoolAccesses = data.schoolAccesses || [];
  }

  applyOnboardingState(profile, data);

  state.dataLoaded = true;
  state.dataLoading = false;
}

/**
 * Decide, once, whether this sign-in should show onboarding.
 *
 * Onboarding is for genuinely NEW accounts only. It must never be the default: `onboardingStep`
 * starts null and is only raised here, after the profile and campus data are known.
 *
 * `onboardingComplete` alone is not a sufficient test. Accounts created before that flag existed
 * do not carry it, so keying off it directly re-ran onboarding on every single login, forever.
 * Any other evidence of an established account counts too, and when we infer it we persist the
 * flag so the repair happens once rather than on every sign-in.
 */
function applyOnboardingState(profile, data) {
  const established =
    profile.onboardingComplete === true
    || profile.role === "superAdmin"
    || state.role !== "student"
    || state._hasClubCore
    || state._hasSchoolRep
    // Already picked a role and filled the profile in.
    || Boolean(profile.school)
    || Boolean(profile.year)
    || (Array.isArray(profile.interests) && profile.interests.length > 0)
    // Already asked for a role, even if still pending.
    || (data.hostRequests || []).length > 0
    || (data.clubApplications || []).length > 0
    // Already used the app.
    || (data.savedItems || []).length > 0
    || (data.followedClubs || []).length > 0;

  if (established) {
    state.onboardingStep = null;
    if (profile.onboardingComplete !== true) {
      // One-time repair so this account is never asked again.
      window.RVUFirebase.saveUserProfile(state.authUser.uid, { onboardingComplete: true })
        .catch((error) => console.warn("[RVU] Could not persist onboardingComplete", error));
    }
    return;
  }

  // Genuinely new: no profile data, no roles, no activity. Start onboarding, unless the user is
  // already partway through it in this session.
  if (!state.onboardingStep) state.onboardingStep = "role";
}

/** Local Date for an event's start, or null when the date is not a parseable YYYY-MM-DD. */
export function eventStartDate(event) {
  const dateStr = String(event?.date || event?.displayDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  let timeStr = String(event.time || "23:59").trim();
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) timeStr = `${timeStr}:00`;
  if (!/^\d{1,2}:\d{2}:\d{2}$/.test(timeStr)) timeStr = "23:59:00";
  const dt = new Date(`${dateStr}T${timeStr}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function normalizeEvent(event) {
  const eventDate = event.date || event.displayDate || "";
  const startsAt = eventStartDate(event);
  let past = Boolean(event.past);
  if (!past && startsAt) past = startsAt.getTime() < Date.now();

  return {
    colors: ["#233039", "#926d2f"],
    tags: [],
    ...event,
    date: eventDate,
    past,
    startsAtMs: startsAt ? startsAt.getTime() : null,
    // Real chronological key — must not be a constant, or "soonest first" sorts by nothing.
    sort: startsAt ? startsAt.getTime() : Number.MAX_SAFE_INTEGER,
  };
}

/** Chronological comparator for events — soonest first, undated last. */
export function bySoonest(a, b) {
  return (a?.sort ?? Number.MAX_SAFE_INTEGER) - (b?.sort ?? Number.MAX_SAFE_INTEGER);
}

export function hydrateCampusState(data) {
  replaceCollection(clubs, data.clubs.map((club) => ({ slug: club.slug || club.id, ...club })));
  replaceCollection(events, data.events.map(normalizeEvent));
  replaceCollection(announcements, data.announcements);
  replaceCollection(projects, data.projects);
  state.hostRequests = data.hostRequests || [];
  state.moderationFlags = data.moderationFlags || [];
  state.allUsers = data.allUsers || [];
  state.allEvents = data.allEvents || [];
  state.allAnnouncements = data.allAnnouncements || [];
  state.allClubs = data.allClubs || [];
  state.allSchools = data.allSchools || [];
  state.savedItems = data.savedItems || [];
  state.followedClubs = data.followedClubs || [];
  state.rsvps = data.rsvps || [];
  state.myApplications = data.myApplications || [];
  state.siteSettings = data.siteSettings || [];
  state.clubApplications = data.clubApplications || [];
}

export async function enterAuthenticatedApp(user) {
  if (!user) {
    window.alert("Authentication required. Please sign in with your RVU email.");
    return;
  }
  state.authed = true;
  state.authUser = user;
  // Or the demo banner and demo-only behaviour persist into a real signed-in session.
  state.isDemoMode = false;
  if (user.displayName) state.user.name = user.displayName;
  try {
    await syncFirebaseData();
    if (isSuperAdmin() && !window.location.pathname.endsWith("/admin.html")) {
      window.location.href = "./admin.html";
      return;
    }
  } catch (error) {
    state.dataLoading = false;
    window.alert(error.message || "Could not load Firebase data.");
  }
  if ((isClubCore() || isSchoolRep()) && !state.host.approved) {
    startPendingAccessPolling();
  } else if (state.role === "student" && (state.onboardingStep === "host-review" || (state.clubApplications || []).some((a) => a.status === "pending"))) {
    startPendingAccessPolling();
  } else {
    stopPendingAccessPolling();
  }
  startExpiryRefreshPolling();
  // renderCurrentRoute, not renderAtTop — the route-level data loaders only run there.
  const { renderCurrentRoute } = await import('./router.js');
  await renderCurrentRoute();
}

export function enterDemoApp() {
  const data = applyDemoCampusData({});
  hydrateCampusState(data);
  state.authed = true;
  state.isDemoMode = true;
  state.authUser = null;
  state.role = "student";
  state.user = {
    name: "Demo Student",
    school: schools[0],
    year: "2",
    interests: ["AI", "Design", "Product", "Web Development"],
  };
  state.onboardingStep = null;
  state.route = "home";
  state.dataLoaded = true;
  state.dataLoading = false;
  renderAtTop();
}

/**
 * Clear everything tied to the previous session. A partial reset lets the next sign-in in the
 * same tab render the previous user's role and data, including host-only controls.
 */
export function resetSessionState() {
  state.authed = false;
  state.authUser = null;
  state.role = null;
  state.isDemoMode = false;
  state.dataLoaded = false;
  state.dataLoading = false;
  // Not "role" — the next sign-in decides from that account's own profile. Re-arming it here
  // showed onboarding to the next user before their profile had even loaded.
  state.onboardingStep = null;
  state.route = "home";
  state.user = { name: "", school: schools[0], year: "1", interests: [] };

  state.host = {
    type: "Club Core",
    clubSlug: "",
    selectedClubIds: [],
    school: schools[0],
    roleTitle: "Core Member",
    name: "",
    category: "",
    description: "",
    email: "",
    joinLink: "",
    approver: "Current president",
    approvedBy: "Super Admin",
    approved: false,
    clubAccesses: [],
    schoolAccesses: [],
  };
  state._hasClubCore = false;
  state._hasSchoolRep = false;

  replaceCollection(events, []);
  replaceCollection(clubs, []);
  replaceCollection(announcements, []);
  replaceCollection(projects, []);

  state.hostRequests = [];
  state.moderationFlags = [];
  state.allUsers = [];
  state.allEvents = [];
  state.allAnnouncements = [];
  state.allClubs = [];
  state.allSchools = [];
  state.contentReviews = [];
  state.savedItems = [];
  state.followedClubs = [];
  state.rsvps = [];
  state.myApplications = [];
  state.clubApplications = [];
  state.clubApplicants = [];
  state.clubCoreMembers = [];
  state.siteSettings = [];
  state.loadErrors = [];

  // Memoisation flags — stale values leak the previous session's data.
  state._clubApplicantsLoaded = false;
  state._clubApplicantsLoading = false;
  state._loadedClubCoreFor = null;
  state._clubCoreMembersLoading = false;

  state.createEventOpen = false;
  state.editEventOpen = false;
  state.createAnnouncementOpen = false;
  state.editAnnouncementOpen = false;
  state.createProjectOpen = false;
  state.editProfileOpen = false;
  state.editClubOpen = false;
  state.createOpen = false;
  state.searchOpen = false;
  state.searchQuery = "";
  state.loginOpen = false;
  state._clubApplyModalOpen = false;
  state.selectedEventId = null;
  state.selectedProjectId = null;
  state.selectedAnnouncementId = null;
  state.selectedClubSlug = null;
}

export async function handleSignOut() {
  if (!window.RVUFirebase) return;
  try {
    await window.RVUFirebase.signOut();
    stopPendingAccessPolling();
    stopExpiryRefreshPolling();
    resetSessionState();
    renderAtTop();
  } catch (error) {
    window.alert(error.message || "Sign-out failed.");
  }
}

export async function startFirebaseLogin() {
  if (!window.RVUFirebase) {
    window.alert("Firebase is still loading. Please wait a moment and try again.");
    return;
  }

  try {
    const user = await window.RVUFirebase.signInWithGoogle();
    await enterAuthenticatedApp(user);
    state.loginOpen = false;
  } catch (error) {
    window.alert(error.message || "Firebase sign-in failed.");
  }
}
