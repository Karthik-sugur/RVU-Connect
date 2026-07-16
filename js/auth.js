import { replaceCollection } from './utils.js';
import { schools, interests, events, clubs, announcements, projects, state } from './state.js';
import { render, renderAtTop } from './ui.js';
import { applyDemoCampusData } from '../sample-data.js';

export function isClubCore() {
  return state.role === "club-core";
}

export function isSchoolRep() {
  return state.role === "school-rep";
}


export function isSuperAdmin() {
  return state.role === "admin";
}

export function canHost() {
  return (isClubCore() || isSchoolRep()) && state.host.approved;
}

export function roleLabel() {
  if (isSuperAdmin()) return "Super admin";
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

export function isAllowedRvuEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase().endsWith("@rvu.edu.in");
}

export async function syncFirebaseData() {
  if (!window.RVUFirebase || !state.authUser) return;
  state.dataLoading = true;
  render();
  const profile = await window.RVUFirebase.ensureUserProfile(state.authUser);

  const roleMap = {
    superAdmin: "admin",
    clubCore: "club-core",
    schoolRepresentative: "school-rep",
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
  if (profile.role === "superAdmin" || profile.onboardingComplete) {
    state.onboardingStep = null;
  } else if (!state.onboardingStep) {
    state.onboardingStep = "role";
  }
  const data = await window.RVUFirebase.loadCampusData({ superAdmin: state.role === "admin", profile });
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
  if (profile.role !== "superAdmin" && data.clubAccess) {
    state.role = "club-core";
    state.host.clubAccesses = data.clubAccesses || [data.clubAccess];
    state.host.clubSlug = data.clubAccess.club.id;
    state.host.school = data.clubAccess.club.school || state.host.school;
    state.host.roleTitle = data.clubAccess.member.role || "core";
    state.host.name = data.clubAccess.member.name || data.clubAccess.club.name;
    state.host.approved = true;
    state.onboardingStep = null;
  }
  if (profile.role !== "superAdmin" && data.schoolAccess) {
    state.role = "school-rep";
    state.host.schoolAccesses = data.schoolAccesses || [data.schoolAccess];
    state.host.school = data.schoolAccess.schoolId || profile.schoolScope || state.host.school;
    state.host.roleTitle = data.schoolAccess.representative.role || "representative";
    state.host.name = data.schoolAccess.representative.name || state.host.name;
    state.host.approved = true;
    state.onboardingStep = null;
  }
  state.dataLoaded = true;
  state.dataLoading = false;
}

export function normalizeEvent(event) {
  const eventDate = event.date || event.displayDate || "";
  return {
    colors: ["#233039", "#926d2f"],
    tags: [],
    sort: 999,
    ...event,
    date: eventDate,
    past: event.past || false,
  };
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
  renderAtTop();
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

export async function handleSignOut() {
  if (!window.RVUFirebase) return;
  try {
    await window.RVUFirebase.signOut();
    state.authed = false;
    state.authUser = null;
    state.role = null;
    state.dataLoaded = false;
    state.onboardingStep = "role";
    state.route = "home";
    state.user = { name: "", school: schools[0], year: "1", interests: [] };
    state.allUsers = [];
    state.allEvents = [];
    state.allAnnouncements = [];
    state.allClubs = [];
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
