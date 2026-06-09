import { applyDemoCampusData } from "./sample-data.js";

const icons = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 10.5 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/></svg>',
  clubs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  projects: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  announce: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 11 18-5v12L3 14v-3Z"/><path d="M11.6 16.8A3 3 0 0 1 6 15"/></svg>',
  admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path d="M9 12l2 2 4-5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21 12 17 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  lightbulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.6-1.4 4.9-3.5 6.2-.5.3-.5.8-.5 1.3V17H9v-.5c0-.5 0-1-.5-1.3A7 7 0 0 1 5 9a7 7 0 0 1 7-7Z"/></svg>',
};

const schools = [
  "School of Computer Science and Engineering",
  "School of Law",
  "School of Liberal Arts and Sciences",
  "School of Economics and Public Policy",
  "School of Continuing Education",
  "School of Allied Healthcare",
  "School of Film Media and Creative Arts",
  "School of Design and Innovation",
  "School of Business",
];

const interests = ["AI", "Web Development", "Design", "Business", "Finance", "Marketing", "Product", "Film", "Law", "Healthcare"];

const events = [];
const clubs = [];
const announcements = [];
const projects = [];

const state = {
  createProjectOpen: false,
  createEventOpen: false,
  editEventId: null,
  editEventOpen: false,
  createAnnouncementOpen: false,
  editAnnouncementOpen: false,
  editAnnouncementId: null,
  editProfileOpen: false,
  selectedEventId: null,
  selectedAnnouncementId: null,
  selectedProjectId: null,
  searchOpen: false,
  searchQuery: "",
  route: "home",
  authed: false,
  isDemoMode: false,
  dataLoaded: false,
  dataLoading: false,
  authUser: null,
  loginOpen: false,
  authMode: "signin",
  authEmail: "",
  authPassword: "",
  hostRequests: [],
  moderationFlags: [],
  onboardingStep: "role",
  role: null,
  createOpen: false,
  selectedClubSlug: null,
  adminScope: "school",
  adminTab: "requests",
  clubDraft: {
    name: "",
    category: "",
    school: schools[0],
    tagline: "",
    description: "",
    founderName: "",
    founderEmail: "",
    facultyAdvisorName: "",
    facultyAdvisorEmail: "",
    currentPresidentName: "",
    currentPresidentEmail: "",
    joinLink: "",
    registrationOpen: false,
  },
  user: {
    name: "",
    school: schools[0],
    year: "1",
    interests: [],
  },
  host: {
    type: "Club Core",
    clubSlug: "",
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
    facultyDesignation: "",
    facultyDepartment: "",
    isFaculty: true,
  },
  filters: {
    eventType: "All",
    clubCategory: "All",
    clubSchool: "All",
    announcementType: "All",
    projectTag: "All",
  },
  allUsers: [],
  allEvents: [],
  allAnnouncements: [],
  allClubs: [],
  allSchools: [],
  savedItems: [],
  followedClubs: [],
  rsvps: [],
  myApplications: [],
  siteSettings: [],
};

const app = document.querySelector("#app");

function defaultClubDraft() {
  return {
    name: "",
    category: "",
    school: schools[0],
    tagline: "",
    description: "",
    founderName: "",
    founderEmail: "",
    facultyAdvisorName: "",
    facultyAdvisorEmail: "",
    currentPresidentName: "",
    currentPresidentEmail: "",
    joinLink: "",
    registrationOpen: false,
  };
}

function replaceCollection(target, values) {
  target.splice(0, target.length, ...values);
}

function icon(name) {
  return icons[name] || "";
}

function isClubCore() {
  return state.role === "club-core";
}

function isSchoolRep() {
  return state.role === "school-rep";
}

function isSuperAdmin() {
  return state.role === "admin";
}

function canHost() {
  return (isClubCore() || isSchoolRep()) && state.host.approved;
}

function roleLabel() {
  if (isSuperAdmin()) return "Super admin";
  if (isClubCore()) return state.host.approved ? "Club core" : "Club pending";
  if (isSchoolRep()) return state.host.approved ? "School rep" : "School pending";
  return "Student";
}

function activeClub() {
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

function isAllowedRvuEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase().endsWith("@rvu.edu.in");
}

function render() {
  app.innerHTML = state.authed ? renderAppShell() : renderLanding();
  bindEvents();
}

function renderAtTop() {
  render();
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

async function syncFirebaseData() {
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
  if (profile.facultyDesignation) state.host.facultyDesignation = profile.facultyDesignation;
  if (profile.facultyDepartment) state.host.facultyDepartment = profile.facultyDepartment;
  if (profile.isFaculty !== undefined) state.host.isFaculty = profile.isFaculty;
  if (profile.role === "superAdmin" || profile.onboardingComplete) {
    state.onboardingStep = null;
  } else if (!state.onboardingStep) {
    state.onboardingStep = "role";
  }
  const data = applyDemoCampusData(await window.RVUFirebase.loadCampusData({ superAdmin: state.role === "admin" }));
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
  if (profile.role !== "superAdmin" && data.clubAccess) {
    state.role = "club-core";
    state.host.clubSlug = data.clubAccess.club.id;
    state.host.school = data.clubAccess.club.school || state.host.school;
    state.host.roleTitle = data.clubAccess.member.role || "core";
    state.host.name = data.clubAccess.member.name || data.clubAccess.club.name;
    state.host.approved = true;
    state.onboardingStep = null;
  }
  state.dataLoaded = true;
  state.dataLoading = false;
}

function normalizeEvent(event) {
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

function hydrateCampusState(data) {
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
}

async function enterAuthenticatedApp(user) {
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

function enterDemoApp() {
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

async function handleSignOut() {
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

async function startFirebaseLogin(mode = "google") {
  if (!window.RVUFirebase) {
    window.alert("Firebase is still loading. Please wait a moment and try again.");
    return;
  }

  try {
    if (mode === "password") {
      const email = state.authEmail.trim();
      const password = state.authPassword;
      if (!email || !password) throw new Error("Enter your RVU email and password.");
      const user = state.authMode === "signup"
        ? await window.RVUFirebase.createEmailPasswordAccount(email, password)
        : await window.RVUFirebase.signInWithEmailPassword(email, password);
      await enterAuthenticatedApp(user);
      state.loginOpen = false;
      state.authPassword = "";
      return;
    }
    const user = await window.RVUFirebase.signInWithGoogle();
    await enterAuthenticatedApp(user);
    state.loginOpen = false;
  } catch (error) {
    window.alert(error.message || "Firebase sign-in failed.");
  }
}

function renderCreateEventModal() {
  const myClub = isClubCore() ? activeClub() : null;
  const otherClubs = clubs.filter(c => c.id !== (myClub?.id || ""));

  return `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:20px 0 80px;">
      <div style="background:#f5f2ec;width:100%;max-width:600px;margin:0 16px;">

        <div style="padding:24px 24px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #d8cfc4;">
          <h2 style="font-size:18px;font-weight:800;color:#1a1a1a;margin:0;font-family:inherit;text-transform:uppercase;letter-spacing:0.03em;">New Event</h2>
          <button style="background:none;border:none;font-size:20px;color:#8a7a6a;cursor:pointer;" data-action="close-create-event">×</button>
        </div>

        <div style="padding:24px;">

          ${myClub ? `
          <div style="background:#e8e0d4;padding:10px 14px;margin-bottom:20px;border-left:3px solid #D7AC54;">
            <p style="font-size:12px;font-weight:600;color:#5a4a3a;margin:0;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;">Posting as ${escapeHtml(myClub.name)}</p>
          </div>` : ""}

          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Event Title *</label>
            <input id="ce-title" type="text" placeholder="What's the event called?" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
          </div>

          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Description *</label>
            <textarea id="ce-description" placeholder="What will happen at this event?" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;resize:vertical;min-height:80px;"></textarea>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
            <div>
              <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Date *</label>
              <input id="ce-date" type="date" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
            </div>
            <div>
              <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Time *</label>
              <input id="ce-time" type="time" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
            </div>
          </div>

          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Location *</label>
            <input id="ce-location" type="text" placeholder="Block A Seminar Hall, Auditorium, Online..." style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
          </div>

          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Registration / External Link (optional)</label>
            <input id="ce-link" type="url" placeholder="https://forms.google.com/..." style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
          </div>

          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Event Poster Image URL (optional)</label>
            <input id="ce-poster" type="url" placeholder="Paste a hosted image URL" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
            <p style="font-size:10px;color:#8a7a6a;margin:6px 0 0;font-family:inherit;">Upload your image to imgur.com or any image host and paste the link here.</p>
          </div>

          ${isClubCore() && otherClubs.length ? `
          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Collaborating Clubs (optional)</label>
            <select id="ce-collab" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;">
              <option value="">None</option>
              ${otherClubs.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("")}
            </select>
          </div>` : ""}

          <div style="display:flex;gap:10px;">
            <button style="flex:1;background:#D7AC54;color:#1a1a1a;border:none;padding:12px;font-size:12px;font-weight:800;font-family:inherit;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;" data-action="submit-create-event">Post Event</button>
            <button style="background:none;border:1.5px solid #c8b89a;color:#5a4a3a;padding:12px 20px;font-size:12px;font-weight:700;font-family:inherit;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;" data-action="close-create-event">Cancel</button>
          </div>

        </div>
      </div>
    </div>
  `;
}

function renderEditEventModal() {
  const event = events.find(e => e.id === state.editEventId) || {};
  return `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:20px 0 80px;">
      <div style="background:#f5f2ec;width:100%;max-width:600px;margin:0 16px;">
        <div style="padding:24px 24px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #d8cfc4;">
          <h2 style="font-size:16px;font-weight:800;color:#1a1a1a;margin:0;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;">Edit Event</h2>
          <button style="background:none;border:none;font-size:20px;color:#8a7a6a;cursor:pointer;" data-action="close-edit-event">×</button>
        </div>
        <div style="padding:24px;">
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Title</label>
            <input id="ee-title" type="text" value="${escapeHtml(event.title || "")}" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
          </div>
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Description</label>
            <textarea id="ee-description" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;resize:vertical;min-height:80px;">${escapeHtml(event.description || "")}</textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
            <div>
              <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Date</label>
              <input id="ee-date" type="date" value="${escapeHtml(event.date || "")}" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
            </div>
            <div>
              <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Time</label>
              <input id="ee-time" type="time" value="${escapeHtml(event.time || "")}" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
            </div>
          </div>
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Location</label>
            <input id="ee-location" type="text" value="${escapeHtml(event.location || "")}" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
          </div>
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">External Link (optional)</label>
            <input id="ee-link" type="url" value="${escapeHtml(event.link || "")}" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
          </div>
          <div style="margin-bottom:24px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Poster Image URL (optional)</label>
            <input id="ee-poster" type="url" value="${escapeHtml(event.posterUrl || "")}" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
          </div>
          <div style="display:flex;gap:10px;">
            <button style="flex:1;background:#D7AC54;color:#1a1a1a;border:none;padding:12px;font-size:12px;font-weight:800;font-family:inherit;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;" data-action="submit-edit-event">Save Changes</button>
            <button style="background:none;border:1.5px solid #c8b89a;color:#5a4a3a;padding:12px 20px;font-size:12px;font-weight:700;font-family:inherit;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;" data-action="close-edit-event">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCreateAnnouncementModal() {
  return `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:20px 0 80px;">
      <div style="background:#f5f2ec;width:100%;max-width:600px;margin:0 16px;">

        <div style="padding:24px 24px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #d8cfc4;">
          <h2 style="font-size:18px;font-weight:800;color:#1a1a1a;margin:0;font-family:inherit;text-transform:uppercase;letter-spacing:0.03em;">New Announcement</h2>
          <button style="background:none;border:none;font-size:20px;color:#8a7a6a;cursor:pointer;" data-action="close-create-announcement">×</button>
        </div>

        <div style="padding:24px;">

          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Type *</label>
            <div style="display:flex;gap:8px;">
              ${["Hiring", "Registration", "Notice", "Update"].map(t => `
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-family:inherit;color:#1a1a1a;">
                  <input type="radio" name="ca-tag" value="${t}" ${t === "Notice" ? "checked" : ""} style="accent-color:#D7AC54;" />
                  ${t}
                </label>`).join("")}
            </div>
          </div>

          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Title *</label>
            <input id="ca-title" type="text" placeholder="What's the announcement?" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
          </div>

          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Description *</label>
            <textarea id="ca-description" placeholder="Full details of the announcement..." style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;resize:vertical;min-height:100px;"></textarea>
          </div>

          <div style="margin-bottom:24px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Image URL (optional)</label>
            <input id="ca-image" type="url" placeholder="Paste a hosted image URL (imgur, etc.)" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
            <p style="font-size:10px;color:#8a7a6a;margin:6px 0 0;font-family:inherit;">// TODO: replace with Firebase Storage upload when configured</p>
          </div>

          <div style="display:flex;gap:10px;">
            <button style="flex:1;background:#D7AC54;color:#1a1a1a;border:none;padding:12px;font-size:12px;font-weight:800;font-family:inherit;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;" data-action="submit-create-announcement">Post Announcement</button>
            <button style="background:none;border:1.5px solid #c8b89a;color:#5a4a3a;padding:12px 20px;font-size:12px;font-weight:700;font-family:inherit;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;" data-action="close-create-announcement">Cancel</button>
          </div>

        </div>
      </div>
    </div>
  `;
}

function renderLanding() {
  return `
    <main class="hero">
      <div class="hero-grid-bg" aria-hidden="true"></div>
      <div class="hero-nav">
        ${brandLockup("large")}
        <span class="hero-badge">For RV University</span>
      </div>
      <section class="hero-content">
        <p class="eyebrow">Campus operating system</p>
        <h1>Everything happening at RVU. In one place.</h1>
        <p>Events, clubs, announcements, and student projects presented with the clarity of a modern campus command center.</p>
        <div class="hero-actions">
          <button class="btn gold" data-action="open-login">Continue with RVU Email</button>
          <button class="btn ghost" data-action="login-google">Continue with Google</button>
          <button class="btn ghost" data-action="preview">Explore demo</button>
        </div>
      </section>
      <section class="hero-peek" aria-label="Campus highlights">
        <div class="peek-tile"><strong>This week</strong>Live events from Firestore</div>
        <div class="peek-tile"><strong>Important</strong>Published notices only</div>
        <div class="peek-tile"><strong>Projects</strong>Verified student posts</div>
        <div class="peek-tile"><strong>Hosts</strong>Approved clubs and schools</div>
      </section>

      ${state.loginOpen ? renderAuthModal() : ""}
    </main>
  `;
}

function renderAuthModal() {
  return `
    <div class="modal-layer">
      <section class="modal auth-modal">
        <p class="eyebrow">RVU account</p>
        <h2>${state.authMode === "signup" ? "Create account" : "Sign in"}</h2>
        <p>Use your RVU email and password. Role selection happens after authentication.</p>
        <div class="auth-switch">
          <button class="${state.authMode === "signin" ? "active" : ""}" data-action="auth-mode" data-mode="signin">Sign in</button>
          <button class="${state.authMode === "signup" ? "active" : ""}" data-action="auth-mode" data-mode="signup">Create</button>
        </div>
        <div class="form-grid">
          ${inputField("authEmail", "RVU Email", state.authEmail, "email")}
          ${inputField("authPassword", "Password", state.authPassword, "password")}
        </div>
        <div class="auth-actions">
          <button class="btn gold" data-action="login-password">${state.authMode === "signup" ? "Create account" : "Sign in"}</button>
          <button class="btn secondary" data-action="login-google">Use Google</button>
          <button class="btn ghost" data-action="close-login">Cancel</button>
        </div>
      </section>
    </div>
  `;
}

function renderAppShell() {
  return `
    <div class="shell">
      <header class="topbar">
        ${brandLockup()}
        <nav class="desktop-nav" aria-label="Primary navigation">
          ${navButtons(false)}
        </nav>
        <button style="
          background:rgba(215,172,84,0.08);
          border:1.5px solid #c8b89a;
          width:clamp(150px,16vw,240px);
          padding:7px 12px;font-size:12px;font-weight:700;
          color:#5a4a3a;cursor:pointer;font-family:inherit;
          text-transform:uppercase;letter-spacing:0.05em;
          display:flex;align-items:center;gap:8px;justify-content:flex-start;
          box-shadow:inset 0 0 0 1px rgba(215,172,84,0.08);
          flex-shrink:1;
        " data-action="toggle-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D7AC54" stroke-width="2.5" style="flex-shrink:0;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span style="white-space:nowrap;">Search</span>
        </button>
        <div class="top-actions">
          ${canHost() || isSuperAdmin() ? createButton() : ""}
          <button style="
            background:rgba(215,172,84,0.06);
            border:1.5px solid #c8b89a;
            color:#5a4a3a;
            padding:7px 12px;
            font-size:12px;
            font-weight:700;
            font-family:inherit;
            letter-spacing:0.05em;
            text-transform:uppercase;
            cursor:pointer;
            display:flex;align-items:center;justify-content:center;
            box-shadow:inset 0 0 0 1px rgba(215,172,84,0.08);
          " data-action="sign-out">Sign Out</button>
        </div>
      </header>
      ${renderTicker()}
      ${state.isDemoMode ? `
        <div style="background:#1a1a1a;border-bottom:1.5px solid #D7AC54;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:56px;z-index:90;">
          <p style="font-size:12px;font-weight:600;color:#D7AC54;margin:0;font-family:inherit;text-transform:uppercase;letter-spacing:0.08em;">
            ⚠ Demo Mode — No data is being saved. Sign in with your RVU email to access your account.
          </p>
          <button style="background:#D7AC54;color:#1a1a1a;border:none;padding:4px 14px;font-size:11px;font-weight:800;font-family:inherit;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;" data-action="open-login">Sign In</button>
        </div>` : ""}
      <main class="main">
        ${renderRoute()}
      </main>
      ${renderFooter()}
      <nav class="bottom-nav" aria-label="Primary navigation">
        ${navButtons(true)}
      </nav>
      ${state.onboardingStep ? renderOnboarding() : ""}
      ${state.createEventOpen ? renderCreateEventModal() : ""}
      ${state.editEventOpen ? renderEditEventModal() : ""}
      ${state.createAnnouncementOpen ? renderCreateAnnouncementModal() : ""}
      ${state.editAnnouncementOpen ? renderEditAnnouncementModal() : ""}
      ${state.searchOpen ? renderSearchOverlay() : ""}
    </div>
  `;
}

function renderFooter() {
  return `
    <footer class="site-footer">
      ${renderIteriumFooterContent()}
    </footer>
  `;
}

function renderIteriumFooterContent() {
  return `
    <div class="iterium-footer-inner">
      <h2>Powered by Iterium</h2>
      <p>Designed to unify campus life through events, clubs, collaboration, and announcements.</p>
      <div class="iterium-socials" aria-label="Iterium links">
        <a href="https://www.instagram.com/iterium.ai/" target="_blank" rel="noopener" aria-label="Iterium Instagram" title="Instagram">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
        </a>
        <a href="https://in.linkedin.com/company/iterium-ai" target="_blank" rel="noopener" aria-label="Iterium LinkedIn" title="LinkedIn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
        </a>
        <a href="mailto:iterium.club@gmail.com" aria-label="Email Iterium" title="Email">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        </a>
        <a href="https://v0-iterium.vercel.app/?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQMMjU2MjgxMDQwNTU4AAGnrNkb2V9Kf-6Vm0w42Z7Kj5ZrHxYE7h13eOKlF94ZdmQK-k3zIXB_68zUDQU_aem_OmBp3xSuJO2HwQxzrSIjVg" target="_blank" rel="noopener" aria-label="Iterium Website" title="Website">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </a>
      </div>
    </div>
  `;
}

function renderSearchResultsHtml() {
  const q = state.searchQuery.toLowerCase().trim();
  const hasQuery = q.length > 1;

  const matchedEvents = hasQuery
    ? events.filter(e => e.title?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q) || e.host?.toLowerCase().includes(q)).slice(0, 5)
    : [];

  const matchedClubs = hasQuery
    ? clubs.filter(c => c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q)).slice(0, 4)
    : [];

  const matchedProjects = hasQuery
    ? projects.filter(p => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || (p.tags || []).join(" ").toLowerCase().includes(q)).slice(0, 4)
    : [];

  const matchedAnnouncements = hasQuery
    ? announcements.filter(a => a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q) || a.source?.toLowerCase().includes(q)).slice(0, 3)
    : [];

  const total = matchedEvents.length + matchedClubs.length + matchedProjects.length + matchedAnnouncements.length;

  const resultGroup = (label, items, renderFn) => items.length ? `
    <div style="margin-bottom:24px;">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin:0 0 10px;font-family:inherit;">${label}</p>
      ${items.map(renderFn).join("")}
    </div>` : "";

  const eventResult = e => `
    <div style="padding:12px 0;border-bottom:1px solid #e8e0d4;cursor:pointer;" data-action="search-open-event" data-docid="${e.id}">
      <p style="font-size:14px;font-weight:700;color:#1a1a1a;margin:0 0 2px;font-family:inherit;">${escapeHtml(e.title)}</p>
      <p style="font-size:12px;color:#8a7a6a;margin:0;font-family:inherit;">${escapeHtml(e.date || "")} · ${escapeHtml(e.host || e.club || "")}</p>
    </div>`;

  const clubResult = c => `
    <div style="padding:12px 0;border-bottom:1px solid #e8e0d4;cursor:pointer;" data-action="search-open-club" data-slug="${c.slug || c.id}">
      <p style="font-size:14px;font-weight:700;color:#1a1a1a;margin:0 0 2px;font-family:inherit;">${escapeHtml(c.name)}</p>
      <p style="font-size:12px;color:#8a7a6a;margin:0;font-family:inherit;">${escapeHtml(c.category || "")} · ${escapeHtml(c.school || "")}</p>
    </div>`;

  const projectResult = p => `
    <div style="padding:12px 0;border-bottom:1px solid #e8e0d4;cursor:pointer;" data-action="search-open-project" data-docid="${p.id}">
      <p style="font-size:14px;font-weight:700;color:#1a1a1a;margin:0 0 2px;font-family:inherit;">${escapeHtml(p.title)}</p>
      <p style="font-size:12px;color:#8a7a6a;margin:0;font-family:inherit;">${escapeHtml((p.tags || []).join(", "))} · ${p.status === "open" ? "Open" : "Closed"}</p>
    </div>`;

  const announcementResult = a => `
    <div style="padding:12px 0;border-bottom:1px solid #e8e0d4;cursor:pointer;" data-action="search-open-announcement" data-docid="${a.id}">
      <p style="font-size:14px;font-weight:700;color:#1a1a1a;margin:0 0 2px;font-family:inherit;">${escapeHtml(a.title)}</p>
      <p style="font-size:12px;color:#8a7a6a;margin:0;font-family:inherit;">${escapeHtml(a.source || "")} · ${escapeHtml(a.tag || "")}</p>
    </div>`;

  return !hasQuery ? `
    <p style="font-size:13px;color:#8a7a6a;font-family:inherit;text-align:center;margin-top:40px;">Start typing to search across RVU Connect</p>
  ` : total === 0 ? `
    <p style="font-size:13px;color:#8a7a6a;font-family:inherit;text-align:center;margin-top:40px;">No results for "${escapeHtml(state.searchQuery)}"</p>
  ` : `
    ${resultGroup("Events", matchedEvents, eventResult)}
    ${resultGroup("Clubs", matchedClubs, clubResult)}
    ${resultGroup("Projects", matchedProjects, projectResult)}
    ${resultGroup("Announcements", matchedAnnouncements, announcementResult)}
  `;
}

function renderSearchOverlay() {
  return `
    <div style="position:fixed;inset:0;background:#f5f2ec;z-index:200;display:flex;flex-direction:column;">

      <div style="padding:16px 20px;border-bottom:1.5px solid #d8cfc4;display:flex;align-items:center;gap:12px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a7a6a" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          id="search-input"
          type="text"
          placeholder="Search events, clubs, projects, announcements..."
          value="${escapeHtml(state.searchQuery)}"
          style="flex:1;background:none;border:none;outline:none;font-size:16px;font-family:inherit;color:#1a1a1a;"
          data-action="search-input"
          autofocus
        />
        <button style="background:none;border:none;font-size:13px;font-weight:700;color:#8a7a6a;cursor:pointer;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;" data-action="close-search">Close</button>
      </div>

      <div id="search-results-container" style="flex:1;overflow-y:auto;padding:20px;">
        ${renderSearchResultsHtml()}
      </div>

    </div>
  `;
}

function renderTicker() {
  const items = ["THIS WEEK AT RVU", "AI BUILD NIGHT", "CLUB RECRUITMENT", "PROJECT COLLABORATION", "IMPORTANT UPDATES"];
  const ticker = [...items, ...items].map((item) => `<span>${item}</span>`).join("");
  return `<div class="ticker" aria-hidden="true"><div>${ticker}</div></div>`;
}

function brandLockup() {
  const sizeClass = arguments[0] === "large" ? " large" : "";
  return `
    <div class="brand-lockup${sizeClass}">
      <img class="brand-logo" src="./assets/rv-university-logo-gold.png" alt="RV University" />
    </div>
  `;
}

function navButtons(withIcons) {
  const items = [
    ["home", "Home", "home"],
    ["events", "Events", "calendar"],
    ["clubs", "Clubs", "clubs"],
    ["projects", "Projects", "projects"],
    ["announcements", withIcons ? "Updates" : "Announcements", "announce"],
  ];
  if (isClubCore() || isSchoolRep() || isSuperAdmin()) {
    items.push(["admin", "Admin", "admin"]);
  }
  items.push(["profile", "Profile", "user"]);
  return items.map(([route, label, iconName]) => `
    <button class="${withIcons ? "nav-item" : ""} ${state.route === route ? "active" : ""}" data-route="${route}">
      ${withIcons ? icon(iconName) : ""}<span>${label}</span>
    </button>
  `).join("");
}

function createButton() {
  return `
    <div class="create-wrap">
      <button class="btn" data-action="toggle-create">${icon("plus")} Create</button>
      ${state.createOpen ? `
        <div class="create-menu">
          <button data-action="create-event">Create Event</button>
          <button data-action="create-announcement">Create Announcement</button>
        </div>
      ` : ""}
    </div>
  `;
}

function renderRoute() {
  if (state.dataLoading) return renderLoadingState();
  if (state.route === "admin-create-club") return renderCreateClubPage();
  if (state.route === "events") return renderEvents();
  if (state.route === "clubs") return renderClubs();
  if (state.route === "projects") return renderProjects();
  if (state.route === "announcements") return renderAnnouncements();
  if (state.route === "admin") return renderAdminConsole();
  if (state.route === "profile") return renderProfile();
  return renderHome();
}

function renderLoadingState() {
  return `
    <section class="page-head">
      ${sectionLabel("00", "Firebase")}
      <h1>Loading campus data</h1>
      <p>RVU Connect is syncing your profile, events, clubs, announcements, and project data from Firestore.</p>
    </section>
  `;
}

function renderEmptyState(title, copy, action = "") {
  return `
    <article class="card announcement empty-state">
      <h3>${title}</h3>
      <p>${copy}</p>
      ${action}
    </article>
  `;
}

function renderHome() {
  if (state.selectedEventId) return renderEventDetail();
  if (state.selectedProjectId) return renderProjectDetail();
  const upcoming = events.filter((event) => !event.past).sort((a, b) => a.sort - b.sort).slice(0, 5);
  const personalized = [...events, ...projects].filter((item) => (item.tags || []).some((tag) => state.user.interests.includes(tag) || state.user.interests.includes(tag.replace("Web", "Web Development")))).slice(0, 4);
  const nextEvent = upcoming[0];
  return `
    <section class="page-head dashboard-head">
      <div>
        ${sectionLabel("01", "Curated dashboard")}
        <h1>Welcome to RVU Connect</h1>
        <p>Upcoming events, project opportunities, and priority updates arranged for action, not endless scrolling.</p>
      </div>
      <div class="campus-metrics" aria-label="Campus activity summary">
        <span><strong>${events.filter((event) => !event.past).length}</strong> live events</span>
        <span><strong>${clubs.length}</strong> approved clubs</span>
        <span><strong>${announcements.length}</strong> updates</span>
      </div>
    </section>
    <div class="home-layout">
      <div>
        ${nextEvent ? `<section class="spotlight">
          <div>
            <span class="tag gold">Next up</span>
            <h2>${nextEvent.title}</h2>
            <p>${nextEvent.description}</p>
          </div>
          <div class="spotlight-date">
            <strong>${nextEvent.date}</strong>
            <span>${nextEvent.time || ""}</span>
          </div>
        </section>` : `<section class="section">${renderEmptyState("No live events yet", "Published events from Firestore will appear here once approved club core or school representatives create them.")}</section>`}
        <section class="section">
          <div class="section-title"><h2>This Week at RVU</h2><span>Soonest first</span></div>
          ${upcoming.length ? `<div class="grid event-grid">${upcoming.map(renderEventCard).join("")}</div>` : renderEmptyState("No upcoming events", "Events with status published will appear here.")}
        </section>
        <section class="section">
          <div class="section-title"><h2>Personalized For You</h2><span>${state.user.interests.join(", ")}</span></div>
          ${personalized.length ? `<div class="grid event-grid">${personalized.map(renderPersonalCard).join("")}</div>` : renderEmptyState("Nothing personalized yet", "Add interests and publish matching events or projects in Firestore.")}
        </section>
      </div>
      <aside>
        <section class="section">
          <div class="section-title"><h2>Important Updates</h2><span>High priority</span></div>
          ${announcements.length ? `<div class="updates">${announcements.slice(0, 3).map(renderUpdate).join("")}</div>` : renderEmptyState("No announcements yet", "Published announcements from clubs and schools will appear here.")}
        </section>
        <section class="section">
          <div class="section-title"><h2>Quick Access</h2></div>
          <div class="grid quick-grid">
            ${quickCard("events", "Events", "Browse campus programming", "calendar")}
            ${quickCard("clubs", "Clubs", "Find approved hosts", "clubs")}
            ${quickCard("projects", "Projects", "Join student teams", "projects")}
            ${quickCard("announcements", "Announcements", "Read structured updates", "announce")}
          </div>
        </section>
        <section class="section">
          <div class="section-title"><h2>My Campus</h2><span>Saved and applied</span></div>
          <div class="updates">
            ${state.followedClubs.slice(0, 2).map((item) => `<article class="update-item"><h3>${escapeHtml(item.clubName || "Followed club")}</h3><p>Club followed for personalized updates.</p></article>`).join("")}
            ${state.rsvps.slice(0, 2).map((item) => `<article class="update-item"><h3>${escapeHtml(item.title || "RSVP")}</h3><p>${escapeHtml(item.status || "going")} RSVP stored.</p></article>`).join("")}
            ${state.myApplications.slice(0, 2).map((item) => `<article class="update-item"><h3>${escapeHtml(item.title || "Project application")}</h3><p>Status: ${escapeHtml(item.status || "pending")}</p></article>`).join("")}
            ${!state.followedClubs.length && !state.rsvps.length && !state.myApplications.length ? renderEmptyState("No personal activity yet", "Follow clubs, RSVP to events, save content, or apply to projects.") : ""}
          </div>
        </section>
      </aside>
    </div>
  `;
}

function renderEvents() {
  if (state.selectedEventId) return renderEventDetail();
  const filtered = events.filter((event) => state.filters.eventType === "All" || event.type === state.filters.eventType);
  const upcoming = filtered.filter((event) => !event.past).sort((a, b) => a.sort - b.sort);
  const past = filtered.filter((event) => event.past);
  return `
    <section class="page-head">
      ${sectionLabel("02", "Events system")}
      <h1>Events</h1>
      <p>Centralized discovery for club, faculty, and school events. Past events stay archived instead of disappearing.</p>
    </section>
    <div class="filters">
      ${selectField("eventType", "Type", ["All", "Club Event", "Faculty Event", "School Event"], state.filters.eventType)}
      ${selectField("club", "Club", ["All", ...clubs.map((club) => club.name)], "All")}
      ${selectField("date", "Date", ["All upcoming", "This week", "This month"], "All upcoming")}
    </div>
    <section class="section">
      <div class="section-title"><h2>Upcoming</h2><span>${upcoming.length} events</span></div>
      ${upcoming.length ? `<div class="grid event-grid">${upcoming.map(renderEventCard).join("")}</div>` : renderEmptyState("No upcoming events", "When approved hosts create published events in Firestore, they will appear here.")}
    </section>
    <section class="section">
      <div class="section-title"><h2>Past Events</h2><span>Archived</span></div>
      ${past.length ? `<div class="grid event-grid">${past.map(renderEventCard).join("")}</div>` : renderEmptyState("No archived events", "Past events will stay visible after their date has passed.")}
    </section>
  `;
}

function renderEventDetail() {
  const event = events.find(e => e.id === state.selectedEventId);
  if (!event) {
    state.selectedEventId = null;
    return renderEvents();
  }

  const isPast = event.past === true;
  const isCancelled = event.cancelled === true;

  return `
    <div style="max-width:680px;margin:0 auto;padding:0 0 100px;">

      <button style="
        display:inline-flex;align-items:center;gap:6px;
        background:none;border:none;
        font-size:12px;font-weight:700;color:#8a7a6a;
        font-family:inherit;text-transform:uppercase;letter-spacing:0.08em;
        cursor:pointer;padding:20px 20px 16px;
      " data-action="close-event-detail">← All Events</button>

      ${event.posterUrl ? `
        <div style="width:100%;height:260px;overflow:hidden;margin-bottom:0;">
          <img src="${escapeHtml(event.posterUrl)}" style="width:100%;height:100%;object-fit:cover;" alt="${escapeHtml(event.title)}" />
        </div>` : ""}

      <div style="padding:24px 20px;">

        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          <span style="font-size:10px;font-weight:700;color:#8a7a6a;font-family:inherit;text-transform:uppercase;letter-spacing:0.1em;border:1.5px solid #c8b89a;padding:3px 10px;">${escapeHtml(event.type || "Event")}</span>
          ${isCancelled ? `<span style="font-size:10px;font-weight:700;color:#dc2626;font-family:inherit;text-transform:uppercase;letter-spacing:0.1em;background:#fee2e2;padding:3px 10px;">CANCELLED</span>` : ""}
          ${isPast ? `<span style="font-size:10px;font-weight:700;color:#8a7a6a;font-family:inherit;text-transform:uppercase;letter-spacing:0.1em;padding:3px 10px;">PAST</span>` : ""}
        </div>

        <h1 style="font-size:28px;font-weight:900;color:#1a1a1a;margin:0 0 8px;font-family:inherit;line-height:1.1;">${escapeHtml(event.title || "")}</h1>

        <p style="font-size:13px;font-weight:700;color:#D7AC54;margin:0 0 20px;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(event.host || event.club || "")}</p>

        ${(event.collaboratingClubs || []).length ? `
          <p style="font-size:12px;color:#8a7a6a;margin:-14px 0 20px;font-family:inherit;">with ${event.collaboratingClubs.map(c => escapeHtml(c)).join(", ")}</p>` : ""}

        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:24px;padding:16px;background:#f0ece4;border-left:3px solid #D7AC54;">
          <div style="display:flex;align-items:center;gap:10px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a7a6a" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>
            <span style="font-size:13px;color:#1a1a1a;font-family:inherit;font-weight:600;">${escapeHtml(event.date || "")} ${escapeHtml(event.time || "")}</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a7a6a" stroke-width="2"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span style="font-size:13px;color:#1a1a1a;font-family:inherit;">${escapeHtml(event.location || "")}</span>
          </div>
        </div>

        <div style="height:1px;background:#d8cfc4;margin-bottom:20px;"></div>

        <p style="font-size:15px;color:#3a3a3a;line-height:1.8;font-family:inherit;margin-bottom:28px;">${escapeHtml(event.description || "")}</p>

        ${!isPast && !isCancelled ? `
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px;">
            ${event.link
              ? `<a href="${escapeHtml(event.link)}" target="_blank" rel="noopener" style="background:#D7AC54;color:#1a1a1a;border:none;padding:12px 24px;font-size:12px;font-weight:800;font-family:inherit;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">Register / Join →</a>`
              : `<button style="background:#D7AC54;color:#1a1a1a;border:none;padding:12px 24px;font-size:12px;font-weight:800;font-family:inherit;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;" data-action="rsvp-event" data-docid="${event.id}" data-title="${escapeHtml(event.title)}">RSVP</button>`
            }
            <button style="background:none;border:1.5px solid #c8b89a;color:#5a4a3a;padding:12px 18px;font-size:12px;font-weight:700;font-family:inherit;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;" data-action="calendar-event" data-docid="${event.id}">+ Calendar</button>
            <button style="background:none;border:1.5px solid #c8b89a;color:#5a4a3a;padding:12px 18px;font-size:12px;font-weight:700;font-family:inherit;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;" data-action="save-item" data-docid="${event.id}" data-kind="event" data-title="${escapeHtml(event.title)}">Save</button>
          </div>` : ""}

        <div style="height:1px;background:#d8cfc4;margin-bottom:20px;"></div>

        <div>
          <p style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin:0 0 14px;font-family:inherit;">More from ${escapeHtml(event.host || event.club || "this host")}</p>
          ${events
            .filter(e => (e.host === event.host || e.club === event.club) && e.id !== event.id && !e.past)
            .slice(0, 2)
            .map(e => `
              <div style="padding:12px 0;border-bottom:1px solid #e8e0d4;cursor:pointer;" data-action="open-event-detail" data-docid="${e.id}">
                <p style="font-size:13px;font-weight:700;color:#1a1a1a;margin:0 0 3px;font-family:inherit;">${escapeHtml(e.title)}</p>
                <p style="font-size:12px;color:#8a7a6a;margin:0;font-family:inherit;">${escapeHtml(e.date || "")} · ${escapeHtml(e.location || "")}</p>
              </div>`).join("") || `<p style="font-size:13px;color:#8a7a6a;font-family:inherit;">No other events from this host.</p>`}
        </div>

      </div>
    </div>
  `;
}

function renderClubs() {
  if (state.selectedEventId) return renderEventDetail();
  if (state.selectedClubSlug) return renderClubDetail();
  const filtered = clubs.filter((club) =>
    (state.filters.clubCategory === "All" || club.category === state.filters.clubCategory) &&
    (state.filters.clubSchool === "All" || club.school === state.filters.clubSchool)
  );
  return `
    <section class="page-head">
      ${sectionLabel("03", "Approved hosts only")}
      <h1>Clubs</h1>
      <p>Here are the approved clubs that exist on RVU Connect. Tap into a club to see what they do, what they have hosted, and whether registrations are open.</p>
    </section>
    <div class="filters">
      ${selectField("clubCategory", "Category", ["All", ...unique(clubs.map((club) => club.category))], state.filters.clubCategory)}
      ${selectField("clubSchool", "School", ["All", ...unique(clubs.map((club) => club.school))], state.filters.clubSchool)}
    </div>
    ${filtered.length ? `<div class="grid club-grid">${filtered.map(renderClubCard).join("")}</div>` : renderEmptyState("No approved clubs yet", "Create approved club documents in Firestore or approve club host requests to populate this directory.")}
  `;
}

function renderClubDetail() {
  const club = clubs.find((item) => item.slug === state.selectedClubSlug) || clubs[0];
  if (!club) return renderClubs();
  const clubEvents = events.filter((event) => event.club === club.name || event.host === club.name);
  const upcoming = clubEvents.filter((event) => !event.past);
  const past = clubEvents.filter((event) => event.past);
  return `
    <section class="club-detail-hero">
      <button class="back-link" data-action="back-to-clubs">Back to all clubs</button>
      <div class="club-detail-mark">${club.name.split(" ").map((word) => word[0]).slice(0, 2).join("")}</div>
      <div>
        ${sectionLabel("03", club.category)}
        <h1>${club.name}</h1>
        <p>${club.tagline}</p>
      </div>
      <div class="club-detail-meta">
        <span>${club.school}</span>
        <span>${clubEvents.length} campus ${clubEvents.length === 1 ? "event" : "events"}</span>
        <span>${club.registrationOpen ? "Registration open" : "Registration closed"}</span>
      </div>
    </section>
    <section class="club-detail-layout">
      <article class="club-panel club-about">
        <span class="section-num">About</span>
        <h2>What they do</h2>
        <p>${club.description}</p>
      </article>
      <article class="club-panel club-now">
        <span class="section-num">Now</span>
        <h2>Currently active on</h2>
        <p>${club.doing}</p>
      </article>
      <article class="club-panel">
        <span class="section-num">Record</span>
        <h2>What they have done</h2>
        <div class="club-highlights">
          ${(club.highlights || []).length ? club.highlights.map((item) => `<span>${item}</span>`).join("") : `<span>No highlights published yet</span>`}
        </div>
      </article>
      <article class="club-panel club-join-panel">
        <span class="section-num">Join</span>
        <h2>${club.registrationOpen ? "Registrations are open" : "Registrations are closed"}</h2>
        <p>${club.registrationOpen ? "This club is currently accepting new members through its registration form." : "This club is visible on RVU Connect, but it is not accepting new registrations right now."}</p>
        ${club.registrationOpen ? `<button class="btn gold" data-action="toast" data-message="Join link: ${club.join}">Open join link</button>` : `<span class="tag">No active join link</span>`}
      </article>
    </section>
    <section class="section">
      <div class="section-title"><h2>Club events</h2><span>${clubEvents.length ? "Hosted by club" : "No events yet"}</span></div>
      ${clubEvents.length ? `<div class="grid event-grid">${clubEvents.map(renderEventCard).join("")}</div>` : renderEmptyState("No events listed yet", "When this club posts published events, they will appear here.")}
    </section>
  `;
}

function renderEditAnnouncementModal() {
  const item = announcements.find(a => a.id === state.editAnnouncementId) || {};
  return `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:20px 0 80px;">
      <div style="background:#f5f2ec;width:100%;max-width:600px;margin:0 16px;">
        <div style="padding:24px 24px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #d8cfc4;">
          <h2 style="font-size:16px;font-weight:800;color:#1a1a1a;margin:0;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;">Edit Announcement</h2>
          <button style="background:none;border:none;font-size:20px;color:#8a7a6a;cursor:pointer;" data-action="close-edit-announcement">×</button>
        </div>
        <div style="padding:24px;">
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Title</label>
            <input id="ea-title" type="text" value="${escapeHtml(item.title || "")}" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
          </div>
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Description</label>
            <textarea id="ea-description" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;resize:vertical;min-height:100px;">${escapeHtml(item.description || "")}</textarea>
          </div>
          <div style="margin-bottom:24px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Image URL (optional)</label>
            <input id="ea-image" type="url" value="${escapeHtml(item.imageUrl || "")}" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
          </div>
          <div style="display:flex;gap:10px;">
            <button style="flex:1;background:#D7AC54;color:#1a1a1a;border:none;padding:12px;font-size:12px;font-weight:800;font-family:inherit;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;" data-action="submit-edit-announcement">Save</button>
            <button style="background:none;border:1.5px solid #c8b89a;color:#5a4a3a;padding:12px 20px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;text-transform:uppercase;" data-action="close-edit-announcement">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCreateProjectModal() {
  return `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:20px 0 80px;">
      <div style="background:#f5f2ec;width:100%;max-width:600px;margin:0 16px;">

        <div style="padding:24px 24px 0;display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #d8cfc4;padding-bottom:16px;">
          <h2 style="font-size:18px;font-weight:800;color:#1a1a1a;margin:0;font-family:inherit;text-transform:uppercase;letter-spacing:0.03em;">New Project</h2>
          <button style="background:none;border:none;font-size:20px;color:#8a7a6a;cursor:pointer;font-family:inherit;" data-action="close-create-project">×</button>
        </div>

        <div style="padding:24px;">

          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Project Title *</label>
            <input id="cp-title" type="text" placeholder="What are you building?" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
          </div>

          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Description *</label>
            <textarea id="cp-description" placeholder="Describe what you're building, what problem it solves, and what kind of collaborators you need." style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;resize:vertical;min-height:100px;"></textarea>
          </div>

          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Skills Required</label>
            <input id="cp-skills" type="text" placeholder="React, Python, UI Design, Video Editing... (comma separated)" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
          </div>

          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Tags</label>
            <input id="cp-tags" type="text" placeholder="AI, Web Dev, Design, Film... (comma separated)" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
          </div>

          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Application Deadline</label>
            <input id="cp-expiry" type="date" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
          </div>

          <div style="margin-bottom:24px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Contact Phone (optional)</label>
            <input id="cp-phone" type="tel" placeholder="Visible to logged-in users only" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
          </div>

          <div style="display:flex;gap:10px;">
            <button style="flex:1;background:#D7AC54;color:#1a1a1a;border:none;padding:12px;font-size:12px;font-weight:800;font-family:inherit;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;" data-action="submit-create-project">Post Project</button>
            <button style="background:none;border:1.5px solid #c8b89a;color:#5a4a3a;padding:12px 20px;font-size:12px;font-weight:700;font-family:inherit;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;" data-action="close-create-project">Cancel</button>
          </div>

        </div>
      </div>
    </div>
  `;
}

function renderProjects() {
  if (state.selectedProjectId) return renderProjectDetail();
  const tags = unique(projects.flatMap((project) => project.tags || []));
  const filtered = projects.filter((project) => state.filters.projectTag === "All" || (project.tags || []).includes(state.filters.projectTag));
  return `
    <section class="page-head" style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">
      <div>
        ${sectionLabel("04", "Student collaboration")}
        <h1>Projects</h1>
        <p>Reddit-inspired structure without heavy discussion threads: clear skill needs, status, expiry, and application flow.</p>
      </div>
      ${state.authed ? `<button style="background:#D7AC54;color:#1a1a1a;border:none;padding:10px 16px;font-size:12px;font-weight:700;font-family:'Inter',sans-serif;letter-spacing:0.05em;cursor:pointer;text-transform:uppercase;flex-shrink:0;margin-top:10px;border-radius:0;" data-action="open-create-project">New Project</button>` : ""}
    </section>
    <div class="filters">
      ${selectField("projectTag", "Tag", ["All", ...tags], state.filters.projectTag)}
      ${selectField("status", "Status", ["All", "Open", "Closed"], "All")}
    </div>
    ${filtered.length ? `<div class="grid project-grid">${filtered.map(renderProjectCard).join("")}</div>` : renderEmptyState("No projects yet", "Verified users can create project posts in Firestore.")}
    ${state.createProjectOpen ? renderCreateProjectModal() : ""}
  `;
}

function renderProjectDetail() {
  const project = projects.find(p => p.id === state.selectedProjectId);
  if (!project) {
    state.selectedProjectId = null;
    return renderProjects();
  }

  const isOpen = project.status === "open";
  const isMyProject = project.postedBy === state.authUser?.email || isSuperAdmin();
  const isLoggedIn = !!state.authUser;

  return `
    <div style="max-width:680px;margin:0 auto;padding:0 0 100px;">

      <button style="
        background:none;border:none;
        font-size:12px;font-weight:700;color:#8a7a6a;
        font-family:inherit;text-transform:uppercase;letter-spacing:0.08em;
        cursor:pointer;padding:20px 20px 16px;display:inline-flex;align-items:center;gap:6px;
      " data-action="close-project-detail">← All Projects</button>

      <div style="padding:0 20px 24px;">

        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          <span style="
            font-size:10px;font-weight:800;
            color:${isOpen ? "#2a7a4a" : "#8a7a6a"};
            background:${isOpen ? "#2a7a4a18" : "#8a7a6a18"};
            padding:3px 12px;font-family:inherit;text-transform:uppercase;letter-spacing:0.1em;
          ">${isOpen ? "OPEN" : "CLOSED"}</span>
          ${project.expiry ? `<span style="font-size:12px;color:#8a7a6a;font-family:inherit;">Due ${escapeHtml(project.expiry)}</span>` : ""}
        </div>

        <h1 style="font-size:26px;font-weight:900;color:#1a1a1a;margin:0 0 20px;font-family:inherit;line-height:1.15;">${escapeHtml(project.title || "")}</h1>

        <div style="height:1px;background:#d8cfc4;margin-bottom:20px;"></div>

        <p style="font-size:15px;color:#3a3a3a;line-height:1.85;font-family:inherit;margin-bottom:24px;white-space:pre-line;">${escapeHtml(project.description || "")}</p>

        ${(project.skills || []).length ? `
          <div style="margin-bottom:16px;">
            <p style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin:0 0 10px;font-family:inherit;">Skills Needed</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              ${project.skills.map(s => `<span style="border:1.5px solid #c8b89a;padding:4px 12px;font-size:12px;font-weight:600;color:#1a1a1a;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(s)}</span>`).join("")}
            </div>
          </div>` : ""}

        ${(project.tags || []).length ? `
          <div style="margin-bottom:24px;">
            <p style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin:0 0 10px;font-family:inherit;">Tags</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              ${project.tags.map(t => `<span style="background:#D7AC5418;color:#8a6a2a;padding:4px 12px;font-size:12px;font-weight:600;font-family:inherit;">${escapeHtml(t)}</span>`).join("")}
            </div>
          </div>` : ""}

        <div style="background:#f0ece4;border-left:3px solid #D7AC54;padding:16px;margin-bottom:24px;">
          <p style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin:0 0 10px;font-family:inherit;">Posted By</p>
          <p style="font-size:14px;font-weight:700;color:#1a1a1a;margin:0 0 4px;font-family:inherit;">${escapeHtml(project.postedByName || project.postedBy || "Student")}</p>
          ${isLoggedIn ? `
            <p style="font-size:13px;color:#5a4a3a;margin:0 0 4px;font-family:inherit;">${escapeHtml(project.postedBy || "")}</p>
            ${project.contactPhone ? `<p style="font-size:13px;color:#5a4a3a;margin:0;font-family:inherit;">${escapeHtml(project.contactPhone)}</p>` : ""}
          ` : `<p style="font-size:12px;color:#8a7a6a;margin:0;font-family:inherit;">Sign in to see contact details.</p>`}
        </div>

        ${isOpen ? `
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
            <button style="background:#D7AC54;color:#1a1a1a;border:none;padding:12px 28px;font-size:12px;font-weight:800;font-family:inherit;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;" data-action="apply-project" data-docid="${project.id}" data-title="${escapeHtml(project.title)}">Apply</button>
            <button style="background:none;border:1.5px solid #c8b89a;color:#5a4a3a;padding:12px 18px;font-size:12px;font-weight:700;font-family:inherit;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;" data-action="save-item" data-docid="${project.id}" data-kind="project" data-title="${escapeHtml(project.title)}">Save</button>
          </div>` : `
          <div style="background:#f0ece4;padding:12px 16px;margin-bottom:16px;border-left:3px solid #c8b89a;">
            <p style="font-size:13px;color:#8a7a6a;margin:0;font-family:inherit;font-weight:600;">Applications are closed for this project.</p>
          </div>`}

        ${isMyProject ? `
          <div style="display:flex;gap:8px;padding-top:16px;border-top:1px solid #e8e0d4;">
            <button style="background:none;border:1.5px solid #c8b89a;padding:8px 16px;font-size:11px;font-weight:700;color:#5a4a3a;cursor:pointer;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;" data-action="toggle-project-status" data-docid="${project.id}" data-status="${project.status}">${isOpen ? "Close Applications" : "Reopen"}</button>
            <button style="background:none;border:1.5px solid #c8b89a;padding:8px 16px;font-size:11px;font-weight:700;color:#a09080;cursor:pointer;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;" data-action="delete-own-project" data-docid="${project.id}" data-title="${escapeHtml(project.title)}">Delete</button>
          </div>` : ""}

      </div>
    </div>
  `;
}

function renderAnnouncements() {
  if (state.selectedAnnouncementId) return renderAnnouncementDetail();
  const filtered = announcements.filter((item) => state.filters.announcementType === "All" || item.type === state.filters.announcementType);
  return `
    <section class="page-head">
      ${sectionLabel("05", "Structured updates")}
      <h1>Announcements</h1>
      <p>Posts for recruitment, notices, registration updates, and internal information. No comments, upvotes, or social clutter.</p>
    </section>
    <div class="filters">
      ${selectField("announcementType", "Source Type", ["All", "Club", "Faculty"], state.filters.announcementType)}
      ${selectField("announcementTag", "Tag", ["All", "Recruitment", "Notice", "Update"], "All")}
    </div>
    ${filtered.length ? `<div class="updates">${filtered.map(renderAnnouncement).join("")}</div>` : renderEmptyState("No announcements yet", "Approved clubs and school representatives can publish structured updates.")}
  `;
}

function renderAnnouncementDetail() {
  const item = announcements.find(a => a.id === state.selectedAnnouncementId);
  if (!item) {
    state.selectedAnnouncementId = null;
    return renderAnnouncements();
  }

  const tagColors = {
    Hiring: "#2a7a4a",
    Registration: "#D7AC54",
    Notice: "#5a4a9a",
    Update: "#1a5a8a",
    Recruitment: "#2a7a4a",
  };
  const tagColor = tagColors[item.tag] || "#8a7a6a";

  const canEdit = (isClubCore() && item.clubId === state.host.clubSlug) ||
                  (isSchoolRep() && item.sourceType === "school") ||
                  isSuperAdmin();

  return `
    <div style="max-width:680px;margin:0 auto;padding:0 0 100px;">

      <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 20px 0;">
        <button style="
          background:none;border:none;
          font-size:12px;font-weight:700;color:#8a7a6a;
          font-family:inherit;text-transform:uppercase;letter-spacing:0.08em;
          cursor:pointer;display:inline-flex;align-items:center;gap:6px;
        " data-action="close-announcement-detail">← Announcements</button>
        ${canEdit ? `
          <button style="
            background:none;border:1.5px solid #c8b89a;
            color:#5a4a3a;padding:5px 14px;
            font-size:11px;font-weight:700;font-family:inherit;
            letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;
          " data-action="edit-announcement" data-docid="${item.id}">Edit</button>` : ""}
      </div>

      <div style="padding:24px 20px;">

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <span style="
            font-size:10px;font-weight:800;
            color:${tagColor};
            background:${tagColor}18;
            padding:3px 12px;
            font-family:inherit;text-transform:uppercase;letter-spacing:0.1em;
          ">${escapeHtml(item.tag || "Notice")}</span>
          <span style="font-size:12px;color:#8a7a6a;font-family:inherit;">${escapeHtml(item.source || "")} · ${escapeHtml(item.time || "")}</span>
        </div>

        <h1 style="font-size:26px;font-weight:900;color:#1a1a1a;margin:0 0 24px;font-family:inherit;line-height:1.15;">${escapeHtml(item.title || "")}</h1>

        <div style="height:1px;background:#d8cfc4;margin-bottom:24px;"></div>

        ${item.imageUrl ? `
          <div style="margin-bottom:24px;">
            <img src="${escapeHtml(item.imageUrl)}" style="width:100%;max-height:400px;object-fit:cover;" alt="Announcement image" />
          </div>` : ""}

        <p style="font-size:15px;color:#3a3a3a;line-height:1.85;font-family:inherit;margin-bottom:28px;white-space:pre-line;">${escapeHtml(item.description || "")}</p>

        <div style="height:1px;background:#d8cfc4;margin-bottom:16px;"></div>

        <div style="display:flex;align-items:center;justify-content:space-between;">
          <p style="font-size:12px;color:#8a7a6a;margin:0;font-family:inherit;">Posted by ${escapeHtml(item.source || "")} · ${escapeHtml(item.time || "")}</p>
          <button style="background:none;border:none;color:#a09080;font-size:11px;font-family:inherit;cursor:pointer;text-transform:uppercase;letter-spacing:0.05em;" data-action="flag-content" data-docid="${item.id}" data-kind="announcement" data-title="${escapeHtml(item.title)}">Report</button>
        </div>

      </div>
    </div>
  `;
}

function renderProfile() {
  const initials = (state.user.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const roleClass = state.role === "club-core" ? "club-core" : state.role === "school-rep" ? "school-rep" : "student";
  const roleText = roleLabel();

  const roleBadge = `<span style="
    display:inline-flex;align-items:center;
    padding:2px 10px;border-radius:999px;
    font-size:11px;font-weight:600;letter-spacing:0.05em;
    text-transform:uppercase;
    background:var(--gold,#D7AC54);
    color:#1a1a1a;
    font-family:inherit;
  ">${roleText}</span>`;

  const chip = text => `<span style="
    display:inline-flex;align-items:center;
    background:transparent;
    border:1.5px solid var(--gold,#D7AC54);
    color:var(--navy,#233039);
    border-radius:2px;
    padding:4px 14px;
    font-size:12px;font-weight:500;
    font-family:inherit;
  ">${text}</span>`;

  const section = (title, content) => `
    <div style="margin-bottom:0;">
      <div style="padding:20px 0 6px;">
        <p style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a7a6a;margin:0 0 14px;font-family:inherit;">${title}</p>
        ${content}
      </div>
      <div style="height:1px;background:#d8cfc4;"></div>
    </div>`;

  const listRow = (left, right) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e8e0d4;">
      <div>${left}</div>
      <div>${right}</div>
    </div>`;

  const badge = (text, color) => `<span style="
    display:inline-flex;align-items:center;
    padding:2px 10px;border-radius:2px;
    font-size:11px;font-weight:500;
    background:${color}18;color:${color};
    font-family:inherit;
  ">${text}</span>`;

  const interestContent = (state.user.interests || []).length
    ? `<div style="display:flex;flex-wrap:wrap;gap:8px;">${state.user.interests.map(chip).join("")}</div>`
    : `<p style="font-size:13px;color:#8a7a6a;margin:0;">No interests selected yet.</p>`;

  const followContent = state.followedClubs.length
    ? state.followedClubs.map(c => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e8e0d4;">
        <span style="font-size:14px;font-weight:600;color:#1a1a1a;font-family:inherit;">${escapeHtml(c.clubName || "Club")}</span>
        <div style="display:flex;gap:8px;">
          <button style="background:none;border:1.5px solid #c8b89a;padding:4px 12px;font-size:12px;color:#5a4a3a;cursor:pointer;font-family:inherit;" data-action="nav-club" data-slug="${c.clubId || ""}">View →</button>
          <button style="background:none;border:1.5px solid #c8b89a;padding:4px 12px;font-size:12px;color:#a09080;cursor:pointer;font-family:inherit;" data-action="unfollow-club" data-docid="${c.clubId || ""}" data-title="${escapeHtml(c.clubName || "")}">Unfollow</button>
        </div>
      </div>`).join("")
    : `<p style="font-size:13px;color:#8a7a6a;margin:0;padding:8px 0;">No clubs followed yet.</p>`;

  const rsvpContent = state.rsvps.length
    ? state.rsvps.map(r => listRow(
        `<div>
          <p style="font-size:14px;font-weight:600;color:#1a1a1a;margin:0 0 3px;font-family:inherit;">${escapeHtml(r.title || "Event")}</p>
        </div>`,
        badge(r.status || "going", r.status === "interested" ? "#D7AC54" : "#2a7a4a")
      )).join("")
    : `<p style="font-size:13px;color:#8a7a6a;margin:0;padding:8px 0;">No RSVPs yet.</p>`;

  const appliedContent = state.myApplications.length
    ? state.myApplications.map(a => listRow(
        `<p style="font-size:14px;font-weight:600;color:#1a1a1a;margin:0;font-family:inherit;">${escapeHtml(a.title || "Project")}</p>`,
        badge(a.status || "pending", a.status === "accepted" ? "#2a7a4a" : "#8a7a6a")
      )).join("")
    : `<p style="font-size:13px;color:#8a7a6a;margin:0;padding:8px 0;">No applications yet.</p>`;

  const savedContent = state.savedItems.length
    ? state.savedItems.map(s => {
        const typeColor = s.type === "event" ? "#D7AC54" : s.type === "project" ? "#6a5acd" : "#3a8a9a";
        return listRow(
          `<div style="display:flex;align-items:center;gap:10px;">
            ${badge(s.type || "item", typeColor)}
            <p style="font-size:14px;font-weight:500;color:#1a1a1a;margin:0;font-family:inherit;">${escapeHtml(s.title || "Saved")}</p>
          </div>`,
          `<button style="background:none;border:1.5px solid #c8b89a;border-radius:0;padding:3px 12px;font-size:12px;color:#5a4a3a;cursor:pointer;font-family:inherit;">View →</button>`
        );
      }).join("")
    : `<p style="font-size:13px;color:#8a7a6a;margin:0;padding:8px 0;">Nothing saved yet.</p>`;

  const recentActivity = [
    ...state.rsvps.slice(0, 2).map(r => ({
      type: "rsvp",
      text: `You RSVPed to ${r.title || "an event"}`,
      status: r.status || "going",
    })),
    ...state.myApplications.slice(0, 2).map(a => ({
      type: "application",
      text: `Your application to ${a.title || "a project"} is ${a.status || "pending"}`,
      status: a.status || "pending",
    })),
    ...state.followedClubs.slice(0, 1).map(c => ({
      type: "follow",
      text: `You follow ${c.clubName || "a club"}`,
      status: "following",
    })),
  ].slice(0, 4);

  const activityColors = {
    going: "#2a7a4a",
    interested: "#D7AC54",
    pending: "#8a7a6a",
    accepted: "#2a7a4a",
    rejected: "#dc2626",
    following: "#5a4a9a",
  };

  return `
    <div style="max-width:640px;margin:0 auto;padding:32px 20px 100px;">

      <div style="display:flex;align-items:center;gap:16px;margin-bottom:32px;">
        <div style="
          width:60px;height:60px;border-radius:4px;
          background:#1a1a1a;
          color:var(--gold,#D7AC54);
          font-size:20px;font-weight:700;
          display:flex;align-items:center;justify-content:center;
          flex-shrink:0;font-family:inherit;
        ">${initials}</div>
        <div>
          <h1 style="font-size:22px;font-weight:800;color:#1a1a1a;margin:0 0 6px;font-family:inherit;">${escapeHtml(state.user.name || "Student")}</h1>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            ${roleBadge}
          </div>
        </div>
      </div>

      <div style="margin-bottom:6px;">
        <p style="font-size:13px;color:#5a4a3a;margin:0 0 2px;font-family:inherit;">${escapeHtml(state.user.school || "")}</p>
        <p style="font-size:13px;color:#8a7a6a;margin:0 0 16px;font-family:inherit;">Year ${escapeHtml(state.user.year || "1")}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button style="
            background:none;border:1.5px solid #c8b89a;
            border-radius:0;padding:6px 16px;
            font-size:12px;font-weight:500;color:#5a4a3a;
            cursor:pointer;font-family:inherit;
          " data-action="edit-profile">Edit Profile</button>
          <button style="
            background:none;border:1.5px solid #c8b89a;
            border-radius:0;padding:6px 16px;
            font-size:12px;font-weight:500;color:#5a4a3a;
            cursor:pointer;font-family:inherit;
          " data-action="edit-interests">Edit Interests</button>
        </div>
      </div>

      <div style="height:1px;background:#d8cfc4;margin:24px 0;"></div>

      ${recentActivity.length ? `
        ${section("Recent Activity",
          recentActivity.map(item => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e8e0d4;">
              <p style="font-size:13px;color:#1a1a1a;margin:0;font-family:inherit;">${escapeHtml(item.text)}</p>
              <span style="
                padding:2px 10px;font-size:10px;font-weight:700;
                color:${activityColors[item.status] || "#8a7a6a"};
                background:${activityColors[item.status] || "#8a7a6a"}18;
                font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;
              ">${escapeHtml(item.status)}</span>
            </div>`).join("")
        )}` : ""}
      ${section("My Interests", interestContent)}
      ${section("Clubs I Follow", followContent)}
      ${section("My RSVPs", rsvpContent)}
      ${section("Projects Applied To", appliedContent)}
      ${section("Saved Items", savedContent)}

    </div>
    ${state.editProfileOpen ? renderEditProfileModal() : ""}
  `;
}

function renderProfileInterestsModal() {
  return `
    <div class="modal-layer">
      <section class="modal">
        <p class="eyebrow">Edit Profile</p>
        <h2>Your Interests</h2>
        <p>Select topics that match your campus goals.</p>
        <div class="chip-grid">${interests.map((interest) => `<button class="chip ${state.user.interests.includes(interest) ? "active" : ""}" data-interest="${interest}">${interest}</button>`).join("")}</div>
        <div style="display:flex;gap:10px;margin-top:18px">
          <button class="btn gold" data-action="close-profile-interests">Save Interests</button>
          <button class="btn secondary" data-action="close-profile-interests">Cancel</button>
        </div>
      </section>
    </div>
  `;
}

function renderEditProfileModal() {
  return `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;">
      <div style="background:#f5f2ec;width:100%;max-width:480px;">

        <div style="padding:24px 24px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #d8cfc4;">
          <h2 style="font-size:16px;font-weight:800;color:#1a1a1a;margin:0;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;">Edit Profile</h2>
          <button style="background:none;border:none;font-size:20px;color:#8a7a6a;cursor:pointer;font-family:inherit;" data-action="close-edit-profile">×</button>
        </div>

        <div style="padding:24px;">

          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Display Name</label>
            <input id="ep-name" type="text" value="${escapeHtml(state.user.name || "")}" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
          </div>

          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">School</label>
            <select id="ep-school" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;">
              ${schools.map(s => `<option value="${escapeHtml(s)}" ${state.user.school === s ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}
            </select>
          </div>

          <div style="margin-bottom:24px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Year</label>
            <div style="display:flex;gap:8px;">
              ${["1","2","3","4"].map(y => `
                <button style="
                  flex:1;padding:10px;
                  border:1.5px solid ${state.user.year === y ? "#1a1a1a" : "#c8b89a"};
                  background:${state.user.year === y ? "#1a1a1a" : "transparent"};
                  color:${state.user.year === y ? "#f5f2ec" : "#1a1a1a"};
                  font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;
                " data-action="ep-year" data-year="${y}">${y}</button>`).join("")}
            </div>
          </div>

          <div style="display:flex;gap:10px;">
            <button style="flex:1;background:#D7AC54;color:#1a1a1a;border:none;padding:12px;font-size:12px;font-weight:800;font-family:inherit;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;" data-action="submit-edit-profile">Save Changes</button>
            <button style="background:none;border:1.5px solid #c8b89a;color:#5a4a3a;padding:12px 20px;font-size:12px;font-weight:700;font-family:inherit;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;" data-action="close-edit-profile">Cancel</button>
          </div>

        </div>
      </div>
    </div>
  `;
}

function sectionLabel(number, label) {
  return `
    <div class="section-label">
      <span class="section-num">${number}</span>
      <span class="eyebrow">${label}</span>
    </div>
  `;
}

function renderAdminConsole() {
  if (!isClubCore() && !isSchoolRep() && !isSuperAdmin()) return renderRestrictedAdmin();
  if ((isClubCore() || isSchoolRep()) && !state.host.approved) return renderPendingAdminAccess();
  if (isSuperAdmin()) return renderSuperAdminDashboard();
  const dashboard = isClubCore() ? renderClubAdmin() : renderSchoolAdmin();
  return `
    <section class="page-head admin-head">
      ${sectionLabel("06", "Control rooms")}
      <h1>${isClubCore() ? "Club Core Dashboard" : "School Representative Dashboard"}</h1>
      <p>Your controls are scoped to the organization your approved representative record grants. This dashboard cannot change your role.</p>
    </section>
    ${dashboard}
  `;
}

function renderSuperAdminDashboard() {
  return `
    <section class="page-head admin-head">
      ${sectionLabel("06", "Platform authority")}
      <h1>Super Admin Dashboard</h1>
      <p>Super admin access is granted by the Firestore user role or a locked superAdmins credential document. From here you review representative requests, moderate content, and maintain platform registries.</p>
    </section>
    ${renderSuperAdmin()}
  `;
}

function renderCreateClubPage() {
  if (!isSuperAdmin()) return renderRestrictedAdmin();
  const draft = state.clubDraft;
  return `
    <section class="page-head admin-head">
      ${sectionLabel("06A", "Club creation")}
      <h1>Create a club</h1>
      <p>Create the public club profile, founding record, faculty advisor, and first president in one place. The founder is preserved as a permanent core member.</p>
      <div class="project-actions">
        <button class="btn secondary" data-action="admin-back-to-clubs">Back to clubs</button>
      </div>
    </section>
    <section class="admin-workspace">
      <article class="admin-card wide">
        <span class="section-num">Profile</span>
        <h2>Club identity</h2>
        <div class="form-grid two">
          ${clubInputField("name", "Club name", draft.name)}
          ${clubInputField("category", "Category", draft.category, "Tech, AI, Cultural...")}
          ${clubSelectField("school", "School", schools, draft.school)}
          ${clubInputField("tagline", "Small tagline", draft.tagline)}
        </div>
        <div class="form-grid">
          ${clubTextArea("description", "Description", draft.description)}
          ${clubInputField("joinLink", "Join / registration link", draft.joinLink)}
        </div>
      </article>
      <article class="admin-card wide">
        <span class="section-num">People</span>
        <h2>Founding roles</h2>
        <div class="form-grid two">
          ${clubInputField("founderName", "Founder name", draft.founderName)}
          ${clubInputField("founderEmail", "Founder RVU email", draft.founderEmail, "name@rvu.edu.in", "email")}
          ${clubInputField("facultyAdvisorName", "Faculty advisor name", draft.facultyAdvisorName)}
          ${clubInputField("facultyAdvisorEmail", "Faculty advisor RVU email", draft.facultyAdvisorEmail, "name@rvu.edu.in", "email")}
          ${clubInputField("currentPresidentName", "Current president name", draft.currentPresidentName)}
          ${clubInputField("currentPresidentEmail", "Current president RVU email", draft.currentPresidentEmail, "name@rvu.edu.in", "email")}
        </div>
        <label class="check-row">
          <input type="checkbox" data-club-check="registrationOpen" ${draft.registrationOpen ? "checked" : ""} />
          <span>Open registrations immediately</span>
        </label>
        <div class="project-actions">
          <button class="btn gold" data-action="admin-submit-club">Create club</button>
          <button class="btn secondary" data-action="admin-reset-club-form">Clear form</button>
        </div>
      </article>
    </section>
  `;
}

function renderRestrictedAdmin() {
  return `
    <section class="page-head admin-head">
      ${sectionLabel("06", "Restricted")}
      <h1>Admin access</h1>
      <p>Admin screens are only available when your Firestore profile or approved representative record grants access. Students cannot switch themselves into admin roles from the client.</p>
    </section>
  `;
}

function renderPendingAdminAccess() {
  return `
    <section class="page-head admin-head">
      ${sectionLabel("06", "Pending verification")}
      <h1>${isClubCore() ? "Club core request" : "School representative request"}</h1>
      <p>${isClubCore() ? `${activeClub().name} core access must be approved by the current president or a super admin before event hosting is enabled.` : `${state.host.school} representative access must be approved by a super admin before school controls are enabled.`}</p>
    </section>
    <section class="admin-workspace">
      <div class="admin-summary">
        <span><strong>Pending</strong> access state</span>
        <span><strong>${isClubCore() ? activeClub().name : "School"}</strong> scope</span>
        <span><strong>${state.host.approver}</strong> approver route</span>
      </div>
      <div class="admin-board">
        <article class="admin-card wide">
          <span class="section-num">Request</span>
          <h2>${state.host.roleTitle}</h2>
          <p>${state.host.description}</p>
          <div class="admin-checklist">
            <span>Cannot create events until approved</span>
            <span>Cannot post announcements until approved</span>
            <span>Can be approved by ${isClubCore() ? "the club president or super admin" : "super admin"}</span>
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderSchoolAdmin() {
  const schoolName = isSuperAdmin() ? "All schools" : state.host.school;
  const schoolEvents = events.filter((event) => event.type === "School Event" || event.type === "Faculty Event");
  return `
    <section class="admin-workspace">
      <div class="admin-summary">
        <span><strong>${isSuperAdmin() ? schools.length : "1"}</strong> ${isSuperAdmin() ? "schools" : "school scope"}</span>
        <span><strong>${schoolEvents.length}</strong> school/faculty events</span>
        <span><strong>${state.host.approved || isSuperAdmin() ? "Enabled" : "Locked"}</strong> school posting</span>
      </div>
      <div class="admin-board">
        <article class="admin-card wide">
          <span class="section-num">Scope</span>
          <h2>${schoolName}</h2>
          <p>School representatives can post school events, faculty announcements, registration links, and notices only for the school they are verified under.</p>
          <div class="project-actions">
            <button class="btn gold" data-action="create-event">Create school event</button>
            <button class="btn secondary" data-action="create-announcement">Create school notice</button>
          </div>
        </article>
        <article class="admin-card">
          <span class="section-num">Links</span>
          <h2>Official links</h2>
          <div class="admin-checklist">
            <span>Primary link: ${state.host.joinLink || "No link configured"}</span>
            <span>Visible on school notices and school events</span>
            <span>Editable only by approved school representatives</span>
          </div>
        </article>
        <article class="admin-card">
          <span class="section-num">Notice</span>
          <h2>School announcements</h2>
          ${announcements.filter((item) => item.sourceType === "school" || item.type === "Faculty").slice(0, 3).map((item) => adminRow(item.title, `${item.source || "School"} · ${item.tag || "Update"}`, ["Edit", "Archive"])).join("") || renderEmptyState("No school announcements", "Published school announcements will appear here.")}
        </article>
        <article class="admin-card">
          <span class="section-num">Events</span>
          <h2>Event controls</h2>
          ${schoolEvents.slice(0, 3).map((event) => adminRow(event.title, `${event.host || "School"} · ${event.date || ""} · ${event.location || ""}`, ["Edit", "Archive"])).join("") || renderEmptyState("No school events", "Create a school event to see it here.")}
        </article>
        <article class="admin-card">
          <span class="section-num">Rules</span>
          <h2>Representative limits</h2>
          <div class="admin-checklist">
            <span>Post only for the verified school</span>
            <span>Show or hide official registration and resource links</span>
            <span>Primary link: ${state.host.joinLink || "No link configured"}</span>
            <span>Cannot approve club core members</span>
            <span>Escalate moderation issues to Super Admin</span>
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderClubAdmin() {
  const club = isSuperAdmin() ? activeClub() : activeClub();
  const clubEvents = events.filter((event) => event.club === club.name || event.host === club.name);
  const clubAnnouncements = announcements.filter((item) => item.clubId === club.id || item.clubId === club.slug || item.source === club.name);
  const canManageCore = isSuperAdmin() || ["president", "owner"].includes((state.host.roleTitle || "").toLowerCase());
  return `
    <section class="admin-workspace">
      <div class="admin-summary">
        <span><strong>${clubEvents.length}</strong> club events</span>
        <span><strong>${club.registrationOpen ? "Open" : "Closed"}</strong> registration</span>
        <span><strong>${state.host.roleTitle}</strong> your role</span>
      </div>
      <div class="admin-board">
        <article class="admin-card wide">
          <span class="section-num">Club</span>
          <h2>${club.name}</h2>
          <p>Only approved core members can host events, publish announcements, and control the links shown for ${club.name}.</p>
          <div class="project-actions">
            <button class="btn gold" data-action="create-event">Create club event</button>
            <button class="btn secondary" data-action="create-announcement">Create update</button>
            <button class="btn gold" data-action="toggle-registration" data-club="${club.slug}">${club.registrationOpen ? "Close registration" : "Open registration"}</button>
            <button class="btn secondary" data-action="toast" data-message="Link visibility controls are ready for ${club.name}.">Manage links</button>
          </div>
        </article>
        <article class="admin-card">
          <span class="section-num">Links</span>
          <h2>Visible links</h2>
          <div class="admin-checklist">
            <span>Join link: ${state.host.joinLink || club.join || "No link configured"}</span>
            <span>Registration state: ${club.registrationOpen ? "Open" : "Closed"}</span>
            <span>Shown only on this club's public profile</span>
          </div>
        </article>
        <article class="admin-card">
          <span class="section-num">Host</span>
          <h2>Club posting</h2>
          ${[...clubEvents.map((event) => ({ title: event.title, meta: `Event · ${event.date || ""}` })), ...clubAnnouncements.map((item) => ({ title: item.title, meta: `Announcement · ${item.tag || "Update"}` }))].slice(0, 4).map((item) => adminRow(item.title, item.meta, ["Edit", "Archive"])).join("") || renderEmptyState("No club posts", "Create an event or announcement to manage it here.")}
        </article>
        <article class="admin-card">
          <span class="section-num">Core</span>
          <h2>Core approval</h2>
          ${canManageCore ? `<div class="project-actions" style="margin-bottom:18px">
            <button class="btn gold" data-action="club-update-leadership" data-docid="${club.id || club.slug}">Update leadership</button>
            <button class="btn gold" data-action="club-assign-core" data-docid="${club.id || club.slug}">Assign core role</button>
            <button class="btn secondary" data-action="club-remove-core" data-docid="${club.id || club.slug}">Remove core role</button>
          </div>` : ""}
          ${state.hostRequests.filter((item) => item.type === "clubCore" && item.clubId === (club.id || club.slug)).map((item) => adminRow(item.name || item.email, `${item.roleTitle || "Core"} · ${item.status}`, ["Accept", "Waitlist"])).join("") || renderEmptyState("No core requests", "Club core requests will appear here after students apply.")}
        </article>
        <article class="admin-card">
          <span class="section-num">Limits</span>
          <h2>Permission boundary</h2>
          <div class="admin-checklist">
            <span>Can host only for ${club.name}</span>
            <span>Can edit this club profile and visible links</span>
            <span>Primary join link: ${state.host.joinLink || club.join}</span>
            <span>Can approve core only if president-level access is granted</span>
            <span>Cannot post for another club or school</span>
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderSuperAdmin() {
  const tabs = [
    ["requests", "Requests", state.hostRequests.length],
    ["users", "Users", state.allUsers.length],
    ["schools", "Schools", state.allSchools.length || schools.length],
    ["clubs", "Clubs", state.allClubs.length],
    ["events", "Events", state.allEvents.length],
    ["announcements", "Notices", state.allAnnouncements.length],
    ["projects", "Projects", projects.length],
    ["moderation", "Flags", state.moderationFlags.length],
  ];

  const tabBar = `
    <div class="admin-tabs">
      ${tabs.map(([key, label, count]) => `
        <button class="${state.adminTab === key ? "active" : ""}" data-action="admin-tab" data-tab="${key}">
          ${label} <small>(${count})</small>
        </button>
      `).join("")}
    </div>
  `;

  let content = "";

  if (state.adminTab === "requests") {
    const pending = state.hostRequests.filter((r) => r.status === "pending");
    const resolved = state.hostRequests.filter((r) => r.status !== "pending");
    content = `
      <article class="admin-card wide">
        <span class="section-num">Pending</span>
        <h2>Pending Requests</h2>
        ${pending.length ? pending.map((item) =>
          adminRow(item.name || item.email, `${item.type} · ${item.roleTitle || "Representative"} · ${item.email}`, ["Approve", "Reject"], "host", item.id)
        ).join("") : renderEmptyState("No pending requests", "Club core and school representative requests will appear here.")}
      </article>
      <article class="admin-card">
        <span class="section-num">History</span>
        <h2>Resolved</h2>
        ${resolved.length ? resolved.map((item) =>
          `<div class="admin-row"><div><strong>${item.name || item.email}</strong><span>${item.type} · ${item.status}</span></div></div>`
        ).join("") : renderEmptyState("No history", "Resolved requests will appear here.")}
      </article>
    `;
  }

  if (state.adminTab === "users") {
    const roleLabels = { superAdmin: "Super Admin", clubCore: "Club Core", schoolRepresentative: "School Rep", student: "Student" };
    content = `
      <article class="admin-card wide">
        <span class="section-num">Directory</span>
        <h2>All Users</h2>
        <p>User roles are managed in Firestore. Super admin role can only be set directly in the database.</p>
        ${state.allUsers.length ? state.allUsers.map((u) => `
          <div class="admin-row">
            <div>
              <strong>${u.name || u.email || u.id}</strong>
              <span>${u.email || "No email"} · ${roleLabels[u.role] || u.role || "student"} · ${u.school || "No school"}</span>
            </div>
            <div class="admin-row-actions">
              <button class="role-indicator">${roleLabels[u.role] || u.role || "student"}</button>
            </div>
          </div>
        `).join("") : renderEmptyState("No users yet", "Users will appear here after they sign in.")}
      </article>
    `;
  }

  if (state.adminTab === "clubs") {
    content = `
      <article class="admin-card wide">
        <span class="section-num">Registry</span>
        <h2>All Clubs</h2>
        <div class="project-actions" style="margin-bottom:18px">
          <button class="btn gold" data-action="admin-create-club">Create new club</button>
        </div>
        ${state.allClubs.length ? state.allClubs.map((c) => `
          <div class="admin-row">
            <div>
              <strong>${c.name}</strong>
              <span>${c.category || "General"} · ${c.school || "RVU"} · President: ${c.currentPresidentEmail || "Not set"} · Advisor: ${c.facultyAdvisorName || c.facultyAdvisorEmail || "Not set"} · Founder: ${c.founderEmail || "Not set"}</span>
            </div>
            <div class="admin-row-actions">
              <button data-action="admin-update-club-leadership" data-docid="${c.id}">Leadership</button>
              <button data-action="admin-assign-core" data-docid="${c.id}">Assign core</button>
              <button data-action="admin-remove-core" data-docid="${c.id}">Remove core</button>
              <button data-action="admin-delete-club" data-docid="${c.id}">Delete</button>
            </div>
          </div>
        `).join("") : renderEmptyState("No clubs", "Create a club to get started.")}
      </article>
    `;
  }

  if (state.adminTab === "schools") {
    const schoolRows = state.allSchools.length
      ? state.allSchools
      : schools.map((name) => ({ id: name, name, status: "seeded", description: "Default RVU school option" }));
    content = `
      <article class="admin-card wide">
        <span class="section-num">Registry</span>
        <h2>School Management</h2>
        <div class="project-actions" style="margin-bottom:18px">
          <button class="btn gold" data-action="admin-create-school">Create school</button>
        </div>
        ${schoolRows.map((school) => `
          <div class="admin-row">
            <div>
              <strong>${school.name}</strong>
              <span>${school.shortName || "RVU"} · ${school.description || "School workspace"} · Status: ${school.status || "active"}</span>
            </div>
            <div class="admin-row-actions">
              ${school.status === "seeded" ? "" : `<button data-action="admin-delete-school" data-docid="${school.id}">Delete</button>`}
            </div>
          </div>
        `).join("")}
      </article>
    `;
  }

  if (state.adminTab === "events") {
    content = `
      <article class="admin-card wide">
        <span class="section-num">All</span>
        <h2>Event Management</h2>
        <div class="project-actions" style="margin-bottom:18px">
          <button class="btn gold" data-action="admin-create-event">Create event</button>
        </div>
        ${state.allEvents.length ? state.allEvents.map((e) => `
          <div class="admin-row">
            <div>
              <strong>${e.title}</strong>
              <span>${e.host || e.club || "RVU"} · ${e.date || "No date"} · Status: ${e.status || "unknown"}</span>
            </div>
            <div class="admin-row-actions">
              ${e.status === "published"
                ? `<button data-action="admin-unpublish-event" data-docid="${e.id}">Unpublish</button>`
                : `<button data-action="admin-publish-event" data-docid="${e.id}">Publish</button>`}
              <button data-action="admin-delete-event" data-docid="${e.id}">Delete</button>
            </div>
          </div>
        `).join("") : renderEmptyState("No events", "Events will appear here when created.")}
      </article>
    `;
  }

  if (state.adminTab === "announcements") {
    content = `
      <article class="admin-card wide">
        <span class="section-num">All</span>
        <h2>Announcement Management</h2>
        <div class="project-actions" style="margin-bottom:18px">
          <button class="btn gold" data-action="admin-create-announcement">Create notice</button>
        </div>
        ${state.allAnnouncements.length ? state.allAnnouncements.map((a) => `
          <div class="admin-row">
            <div>
              <strong>${a.title}</strong>
              <span>${a.source || "RVU"} · ${a.tag || "Update"} · Status: ${a.status || "unknown"}</span>
            </div>
            <div class="admin-row-actions">
              ${a.status === "published"
                ? `<button data-action="admin-unpublish-announcement" data-docid="${a.id}">Unpublish</button>`
                : ""}
              <button data-action="admin-delete-announcement" data-docid="${a.id}">Delete</button>
            </div>
          </div>
        `).join("") : renderEmptyState("No announcements", "Announcements will appear here when created.")}
      </article>
    `;
  }

  if (state.adminTab === "projects") {
    content = `
      <article class="admin-card wide">
        <span class="section-num">All</span>
        <h2>Project Management</h2>
        <div class="project-actions" style="margin-bottom:18px"></div>
        ${projects.length ? projects.map((p) => `
          <div class="admin-row">
            <div>
              <strong>${p.title}</strong>
              <span>${(p.tags || []).join(", ") || "No tags"} · Status: ${p.status || "open"} · Owner: ${p.ownerId || "Super admin"}</span>
            </div>
            <div class="admin-row-actions">
              <button data-action="admin-delete-project" data-docid="${p.id}">Delete</button>
            </div>
          </div>
        `).join("") : renderEmptyState("No projects", "Create a project or wait for verified users to post.")}
      </article>
    `;
  }

  if (state.adminTab === "moderation") {
    content = `
      <article class="admin-card wide">
        <span class="section-num">Quality</span>
        <h2>Moderation Flags</h2>
        ${state.moderationFlags.length ? state.moderationFlags.map((item) =>
          `<div class="admin-row"><div><strong>${item.title || item.reason || "Flag"}</strong><span>${item.collection || "Content"} · ${item.status || "Open"}</span></div></div>`
        ).join("") : renderEmptyState("No moderation flags", "User-created moderation flags will appear here.")}
      </article>
    `;
  }

  return `
    <section class="admin-workspace">
      <div class="admin-summary">
        <span><strong>${state.hostRequests.filter((r) => r.status === "pending").length}</strong> pending requests</span>
        <span><strong>${state.allUsers.length}</strong> registered users</span>
        <span><strong>${state.allClubs.length}</strong> total clubs</span>
      </div>
      ${tabBar}
      <div class="admin-board">
        ${content}
      </div>
    </section>
  `;
}

function adminRow(title, meta, actions, mode = "generic", id = "") {
  return `
    <div class="admin-row">
      <div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(meta)}</span></div>
      <div class="admin-row-actions">
        ${actions.map((action) => {
          const dataAction = mode === "host" && action === "Approve" ? "approve-host" : mode === "host" && action === "Reject" ? "reject-host" : "toast";
          return `<button data-action="${dataAction}" data-request="${id}" data-message="${action}: ${escapeHtml(title)}">${action}</button>`;
        }).join("")}
      </div>
    </div>
  `;
}

function renderEventCard(event) {
  const colors = event.colors || ["#233039", "#926d2f"];
  const date = escapeHtml(event.date || "TBA");
  const dateParts = date.split(" ");
  const tags = event.tags || [];
  const isPast = event.past === true;
  const isMyEvent = (isClubCore() && event.clubId === state.host.clubSlug) || isSuperAdmin();

  let hostDisplay = event.host || "RVU";
  if (event.hostType === "school") {
    const profile = event;
    const source = event.host || "School";
    const schoolName = event.schoolName || event.schoolId || source;
    if (profile.facultyDesignation) {
      hostDisplay = `${profile.facultyDesignation} ${profile.hostName || source} · ${schoolName}`;
    } else {
      hostDisplay = schoolName;
    }
  }

  const actionButtons = isPast
    ? `<div style="margin-top:10px;">
      <button style="background:none;border:none;color:#a09080;padding:0;font-size:11px;font-family:inherit;cursor:pointer;text-transform:uppercase;letter-spacing:0.05em;" data-action="flag-content" data-docid="${event.id}" data-kind="event" data-title="${escapeHtml(event.title)}">Report</button>
    </div>`
    : `<div style="display:flex;align-items:center;gap:8px;margin-top:12px;flex-wrap:wrap;">
      <button style="background:#D7AC54;color:#1a1a1a;border:none;padding:6px 16px;font-size:12px;font-weight:700;font-family:inherit;letter-spacing:0.05em;cursor:pointer;text-transform:uppercase;" data-action="rsvp-event" data-docid="${event.id}" data-title="${escapeHtml(event.title)}">RSVP</button>
      <button style="background:none;border:1.5px solid #c8b89a;color:#5a4a3a;padding:6px 14px;font-size:12px;font-weight:600;font-family:inherit;letter-spacing:0.05em;cursor:pointer;text-transform:uppercase;" data-action="save-item" data-docid="${event.id}" data-kind="event" data-title="${escapeHtml(event.title)}">Save</button>
      <button style="background:none;border:1.5px solid #c8b89a;color:#5a4a3a;padding:6px 14px;font-size:12px;font-weight:600;font-family:inherit;letter-spacing:0.05em;cursor:pointer;text-transform:uppercase;" data-action="calendar-event" data-docid="${event.id}">Calendar</button>
      <button style="background:none;border:none;color:#a09080;padding:6px 10px;font-size:11px;font-family:inherit;cursor:pointer;text-transform:uppercase;letter-spacing:0.05em;" data-action="flag-content" data-docid="${event.id}" data-kind="event" data-title="${escapeHtml(event.title)}">Report</button>
    </div>`;

  return `
    <article class="card event-card" style="opacity:${isPast ? "0.55" : "1"};cursor:pointer;" data-action="open-event-detail" data-docid="${event.id}">
      <div class="poster" style="--poster-a:${colors[0]};--poster-b:${colors[1]}">
        <strong>${dateParts[0]}<br>${dateParts[1] || ""}</strong>
        <span>${escapeHtml(event.type || "Event")}</span>
      </div>
      <div class="card-body">
        ${isPast ? `<span style="font-size:10px;font-weight:700;color:#8a7a6a;font-family:inherit;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:6px;">PAST EVENT</span>` : ""}
        ${event.cancelled ? `<span style="background:#fee2e2;color:#dc2626;padding:2px 10px;font-size:10px;font-weight:700;font-family:inherit;letter-spacing:0.08em;text-transform:uppercase;">CANCELLED</span>` : ""}
        <div class="meta"><span>${date} · ${escapeHtml(event.time || "Time TBA")}</span><span>${escapeHtml(event.location || "Location TBA")}</span></div>
        <h3>${escapeHtml(event.title)}</h3>
        <p>${escapeHtml(event.description || "")}</p>
        <div class="chip-grid">${tags.map((tag) => `<span class="tag gold">${escapeHtml(tag)}</span>`).join("")}<span class="tag">${escapeHtml(hostDisplay)}</span></div>
        ${(event.collaboratingClubs || []).length ? `
          <p style="font-size:12px;color:#8a7a6a;margin:3px 0 0;font-family:inherit;">
            with ${event.collaboratingClubs.map(c => escapeHtml(c)).join(", ")}
          </p>` : ""}
        ${actionButtons}
        ${isMyEvent ? `<div style="display:flex;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid #e8e0d4;">
          <button style="background:none;border:1.5px solid #c8b89a;padding:4px 12px;font-size:11px;font-weight:600;color:#5a4a3a;cursor:pointer;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;" data-action="open-edit-event" data-docid="${event.id}">Edit</button>
          <button style="background:none;border:1.5px solid #c8b89a;padding:4px 12px;font-size:11px;font-weight:600;color:#a09080;cursor:pointer;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;" data-action="cancel-event" data-docid="${event.id}" data-title="${escapeHtml(event.title)}">Cancel Event</button>
        </div>` : ""}
      </div>
    </article>
  `;
}

function renderPersonalCard(item) {
  if (item.time) return renderEventCard(item);
  return renderProjectCard(item);
}

function renderUpdate(item) {
  let hostDisplay = item.source || "RVU";
  if (item.sourceType === "school") {
    const profile = item;
    const source = item.source || "School";
    const schoolName = item.schoolName || item.schoolId || source;
    if (profile.facultyDesignation) {
      hostDisplay = `${profile.facultyDesignation} ${profile.hostName || source} · ${schoolName}`;
    } else {
      hostDisplay = schoolName;
    }
  }

  return `
    <article class="update-item">
      <div class="meta"><span class="tag gold">${escapeHtml(item.tag || "Update")}</span><span>${escapeHtml(hostDisplay)}</span><span>${escapeHtml(item.time || "")}</span></div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description || "")}</p>
      <div class="project-actions">
        <button class="btn secondary" data-action="save-item" data-kind="announcement" data-docid="${item.id}" data-title="${escapeHtml(item.title)}">Save</button>
        <button class="btn secondary" data-action="flag-content" data-kind="announcements" data-docid="${item.id}" data-title="${escapeHtml(item.title)}">Report</button>
      </div>
    </article>
  `;
}

function quickCard(route, title, copy, iconName) {
  return `<button class="quick-card" data-route="${route}">${icon(iconName)}<span><strong>${title}</strong><br>${copy}</span></button>`;
}

function renderClubCard(club) {
  const clubEvents = events.filter((event) => event.club === club.name || event.host === club.name).length;
  return `
    <article class="card club-card" data-club-card="${club.slug || club.id}">
      <div class="club-top">
        <div class="avatar">${escapeHtml(club.name.split(" ").map((word) => word[0]).slice(0, 2).join(""))}</div>
        <div><h3>${escapeHtml(club.name)}</h3><span class="tag gold">${escapeHtml(club.category || "Club")}</span></div>
      </div>
      <p>${escapeHtml(club.tagline || club.description || "")}</p>
      <div class="meta"><span>${escapeHtml(club.school || "RVU")}</span><span>${clubEvents} events</span><span>${club.registrationOpen ? "Open" : "Closed"}</span></div>
      <div class="project-actions">
        <button class="btn secondary" data-action="open-club" data-club="${club.slug || club.id}">View club</button>
        <button class="btn gold" data-action="follow-club" data-docid="${club.id || club.slug}" data-title="${escapeHtml(club.name)}">Follow</button>
      </div>
    </article>
  `;
}

function renderProjectCard(project) {
  const status = project.status || "Open";
  const skills = project.skills || [];
  const isMyProject = project.postedBy === state.authUser?.email || isSuperAdmin();
  return `
    <article class="card project-card" style="cursor:pointer;" data-action="open-project-detail" data-docid="${project.id}">
      <div class="project-rail"><button data-action="save-item" data-kind="project" data-docid="${project.id}" data-title="${escapeHtml(project.title)}">${icon("bookmark")}</button><span>${project.score || 0}</span></div>
      <div class="card-body">
        <div class="meta"><span class="status ${status.toLowerCase()}">${escapeHtml(status)}</span><span>Expires ${escapeHtml(project.expiry || "TBA")}</span></div>
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.description || "")}</p>
        <div class="chip-grid">${skills.map((skill) => `<span class="tag">${escapeHtml(skill)}</span>`).join("")}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:12px;flex-wrap:wrap;">
          <button style="background:#D7AC54;color:#1a1a1a;border:none;padding:6px 16px;font-size:12px;font-weight:700;font-family:inherit;letter-spacing:0.05em;cursor:pointer;text-transform:uppercase;" data-action="apply-project" data-docid="${project.id}" data-title="${escapeHtml(project.title)}">Apply</button>
          <button style="background:none;border:1.5px solid #c8b89a;color:#5a4a3a;padding:6px 14px;font-size:12px;font-weight:600;font-family:inherit;letter-spacing:0.05em;cursor:pointer;text-transform:uppercase;" data-action="save-item" data-docid="${project.id}" data-kind="project" data-title="${escapeHtml(project.title)}">Save</button>
          <button style="background:none;border:none;color:#a09080;padding:6px 10px;font-size:11px;font-family:inherit;cursor:pointer;text-transform:uppercase;letter-spacing:0.05em;" data-action="flag-content" data-docid="${project.id}" data-kind="project" data-title="${escapeHtml(project.title)}">Report</button>
        </div>
        ${isMyProject ? `<div style="display:flex;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid #e8e0d4;">
          <button style="background:none;border:1.5px solid #c8b89a;padding:4px 12px;font-size:11px;font-weight:600;color:#5a4a3a;cursor:pointer;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;" 
            data-action="toggle-project-status" 
            data-docid="${project.id}" 
            data-status="${project.status}">
            ${project.status === "open" ? "Close Applications" : "Reopen"}
          </button>
          <button style="background:none;border:1.5px solid #c8b89a;padding:4px 12px;font-size:11px;font-weight:600;color:#a09080;cursor:pointer;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;" 
            data-action="delete-own-project" 
            data-docid="${project.id}" 
            data-title="${escapeHtml(project.title)}">Delete</button>
        </div>` : ""}
      </div>
    </article>
  `;
}

function renderAnnouncement(item) {
  let hostDisplay = item.source || "RVU";
  if (item.sourceType === "school") {
    const profile = item;
    const source = item.source || "School";
    const schoolName = item.schoolName || item.schoolId || source;
    if (profile.facultyDesignation) {
      hostDisplay = `${profile.facultyDesignation} ${profile.hostName || source} · ${schoolName}`;
    } else {
      hostDisplay = schoolName;
    }
  }

  return `
    <article class="card announcement" style="cursor:pointer;" data-action="open-announcement-detail" data-docid="${item.id}">
      <div class="meta"><span class="tag gold">${escapeHtml(item.tag || "Update")}</span><span>${escapeHtml(hostDisplay)}</span><span>${escapeHtml(item.time || "")}</span></div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description || "")}</p>
    </article>
  `;
}

/* renderAdminPanel removed — superseded by renderSuperAdmin */

function renderOnboarding() {
  if (state.onboardingStep === "role") {
    return `
      <div class="modal-layer">
        <section class="modal">
          <p class="eyebrow">Onboarding</p>
          <h2>How will you use RVU Connect?</h2>
          <p>Choose the mode that matches your campus role.</p>
          <div class="choice-grid">
            <button class="choice" data-onboard-role="student"><strong>Student</strong>Discover events, explore clubs, and join projects.</button>
            <button class="choice" data-onboard-role="club-core"><strong>Club core</strong>Represent a club, manage links, and host club events after approval.</button>
            <button class="choice" data-onboard-role="school-rep"><strong>School representative</strong>Post school events, faculty notices, and official school links after approval.</button>
          </div>
        </section>
      </div>
    `;
  }
  if (state.onboardingStep === "student-info") {
    return `
      <div class="modal-layer">
        <section class="modal">
          <p class="eyebrow">Student profile</p>
          <h2>Basic information</h2>
          <div class="form-grid two">
            ${inputField("studentName", "Name", state.user.name)}
            ${selectField("studentYear", "Year", ["1", "2", "3", "4"], state.user.year)}
          </div>
          ${selectField("studentSchool", "School", schools, state.user.school)}
          <button class="btn gold" data-action="next-interests">Continue</button>
        </section>
      </div>
    `;
  }
  if (state.onboardingStep === "student-interests") {
    return `
      <div class="modal-layer">
        <section class="modal">
          <p class="eyebrow">Personalization</p>
          <h2>Select your interests</h2>
          <div class="chip-grid">${interests.map((interest) => `<button class="chip ${state.user.interests.includes(interest) ? "active" : ""}" data-interest="${interest}">${interest}</button>`).join("")}</div>
          <button class="btn gold" data-action="finish-student">Explore your campus</button>
        </section>
      </div>
    `;
  }
  if (state.onboardingStep === "host-info") {
    const isClubRequest = state._onboardingIntent === "club-core";
    const clubOptions = clubs.length ? clubs.map((club) => club.name) : ["No approved clubs available"];
    return `
      <div class="modal-layer">
        <section class="modal">
          <p class="eyebrow">${isClubRequest ? "Club core request" : "School representative request"}</p>
          <h2>${isClubRequest ? "Which club are you core in?" : "Which school do you represent?"}</h2>
          <div class="form-grid two">
            ${isClubRequest ? selectField("hostClub", "Club", clubOptions, activeClub().name) : selectField("hostSchool", "School", schools, state.host.school)}
            ${inputField("hostRoleTitle", "Role", state.host.roleTitle)}
          </div>
          <div class="form-grid">
            ${inputField("hostName", isClubRequest ? "Core display name" : "Office / representative name", state.host.name)}
            ${!isClubRequest ? `
            <div style="margin-bottom:16px;">
              <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Designation</label>
              <select id="srep-designation" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;">
                <option value="Prof.">Prof.</option>
                <option value="Dr.">Dr.</option>
                <option value="HOD">HOD</option>
                <option value="Student Rep">Student Representative</option>
                <option value="">Other</option>
              </select>
            </div>
            <div style="margin-bottom:16px;">
              <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Department (optional)</label>
              <input id="srep-department" type="text" placeholder="e.g. Department of Computer Science" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
            </div>` : ""}
            ${inputField("hostEmail", "Contact Email", state.host.email)}
            ${isClubRequest ? selectField("hostApprover", "Approval route", ["Current president", "Super Admin"], state.host.approver) : selectField("hostApprover", "Approval route", ["Super Admin"], "Super Admin")}
            <div class="field"><label>Description</label><textarea data-input="hostDescription">${state.host.description}</textarea></div>
            ${inputField("hostJoin", "Join Link optional", state.host.joinLink)}
          </div>
          <button class="btn gold" data-action="submit-host">Submit for review</button>
        </section>
      </div>
    `;
  }
  if (state.onboardingStep === "host-review") {
    const isClubRequest = state._onboardingIntent === "club-core";
    return `
      <div class="modal-layer">
        <section class="modal">
          <p class="eyebrow">Approval state</p>
          <h2>Your request is under review.</h2>
          <p>Until approved, this account cannot post events or announcements. ${isClubRequest ? "Club core can be approved by the current president or a super admin." : "School representatives are approved by a super admin."}</p>
          <div class="approval"><strong>${state.host.name}</strong><br>${state.host.type} · ${isClubRequest ? activeClub().name : state.host.school}</div>
          <button class="btn gold" data-action="close-onboarding">Continue to campus</button>
        </section>
      </div>
    `;
  }
  return "";
}

function selectField(name, label, options, value) {
  return `
    <div class="field">
      <label>${label}</label>
      <select data-filter="${name}">
        ${options.map((option) => `<option ${option === value ? "selected" : ""}>${option}</option>`).join("")}
      </select>
    </div>
  `;
}

function inputField(name, label, value, type = "text") {
  return `
    <div class="field">
      <label>${label}</label>
      <input data-input="${name}" type="${type}" value="${value}" />
    </div>
  `;
}

function clubInputField(name, label, value, placeholder = "", type = "text") {
  return `
    <div class="field">
      <label>${label}</label>
      <input data-club-input="${name}" type="${type}" value="${escapeHtml(value || "")}" placeholder="${escapeHtml(placeholder)}" />
    </div>
  `;
}

function clubSelectField(name, label, options, value) {
  return `
    <div class="field">
      <label>${label}</label>
      <select data-club-input="${name}">
        ${options.map((option) => `<option ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </div>
  `;
}

function clubTextArea(name, label, value) {
  return `
    <div class="field">
      <label>${label}</label>
      <textarea data-club-input="${name}">${escapeHtml(value || "")}</textarea>
    </div>
  `;
}

function unique(values) {
  return [...new Set(values)];
}

function escapeHtml(str) {
  if (typeof str !== "string") return str == null ? "" : String(str);
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function validateClubDraft() {
  const required = [
    ["name", "Club name"],
    ["category", "Category"],
    ["school", "School"],
    ["description", "Description"],
    ["founderName", "Founder name"],
    ["founderEmail", "Founder RVU email"],
    ["facultyAdvisorName", "Faculty advisor name"],
    ["facultyAdvisorEmail", "Faculty advisor RVU email"],
    ["currentPresidentName", "Current president name"],
    ["currentPresidentEmail", "Current president RVU email"],
  ];
  const missing = required.find(([key]) => !String(state.clubDraft[key] || "").trim());
  if (missing) return `${missing[1]} is required.`;
  const emails = [
    ["founderEmail", "Founder email"],
    ["facultyAdvisorEmail", "Faculty advisor email"],
    ["currentPresidentEmail", "Current president email"],
  ];
  const invalid = emails.find(([key]) => !isAllowedRvuEmail(state.clubDraft[key]));
  if (invalid) return `${invalid[1]} must end with @rvu.edu.in.`;
  return "";
}

function bindEvents() {
  if (!window.rvuAuthListenersBound) {
    window.rvuAuthListenersBound = true;
    window.addEventListener("rvu-auth-user", (event) => {
      if (event.detail && !state.authed) {
        enterAuthenticatedApp(event.detail).catch((error) => {
          window.alert(error.message || "Could not complete sign-in.");
        });
      }
    });
    window.addEventListener("rvu-auth-error", (event) => {
      if (event.detail) window.alert(event.detail);
    });
    if (window.RVUFirebase?.auth?.currentUser && !state.authed) {
      enterAuthenticatedApp(window.RVUFirebase.auth.currentUser).catch((error) => {
        window.alert(error.message || "Could not restore session.");
      });
    }
  }

  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      state.route = button.dataset.route;
      if (state.route !== "clubs") state.selectedClubSlug = null;
      state.createOpen = false;
      renderAtTop();
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (button.dataset.action === "search-input") return;
      event.stopPropagation();
      handleAction(button.dataset.action, button.dataset).catch((error) => {
        window.alert(error.message || "Action failed.");
      });
    });
  });

  if (!window.rvuSearchInputBound) {
    window.rvuSearchInputBound = true;
    app.addEventListener("input", (event) => {
      const action = event.target.dataset?.action;
      if (action === "search-input") {
        state.searchQuery = event.target.value;
        const container = document.getElementById("search-results-container");
        if (container) {
          container.innerHTML = renderSearchResultsHtml();
          container.querySelectorAll("[data-action]").forEach((button) => {
            button.addEventListener("click", (e) => {
              e.stopPropagation();
              handleAction(button.dataset.action, button.dataset).catch((error) => {
                window.alert(error.message || "Action failed.");
              });
            });
          });
        } else {
          render();
        }
      }
    });
  }

  document.querySelectorAll("[data-filter]").forEach((field) => {
    field.addEventListener("change", () => {
      if (state.filters[field.dataset.filter] !== undefined) {
        state.filters[field.dataset.filter] = field.value;
      }
      if (field.dataset.filter === "studentSchool") state.user.school = field.value;
      if (field.dataset.filter === "studentYear") state.user.year = field.value;
      if (field.dataset.filter === "hostClub") {
        const club = clubs.find((item) => item.name === field.value);
        if (club) {
          state.host.clubSlug = club.slug;
          state.host.name = club.name;
          state.host.category = club.category;
          state.host.school = club.school;
        }
      }
      if (field.dataset.filter === "hostSchool") state.host.school = field.value;
      if (field.dataset.filter === "hostApprover") state.host.approver = field.value;
      render();
    });
  });

  document.querySelectorAll("[data-input]").forEach((field) => {
    field.addEventListener("input", () => {
      const key = field.dataset.input;
      if (key === "authEmail") state.authEmail = field.value;
      if (key === "authPassword") state.authPassword = field.value;
      if (key === "studentName") state.user.name = field.value;
      if (key === "hostName") state.host.name = field.value;
      if (key === "hostEmail") state.host.email = field.value;
      if (key === "hostRoleTitle") state.host.roleTitle = field.value;
      if (key === "hostDescription") state.host.description = field.value;
      if (key === "hostJoin") state.host.joinLink = field.value;
    });
  });

  document.querySelectorAll("[data-club-input]").forEach((field) => {
    field.addEventListener("input", () => {
      state.clubDraft[field.dataset.clubInput] = field.value;
    });
    field.addEventListener("change", () => {
      state.clubDraft[field.dataset.clubInput] = field.value;
    });
  });

  document.querySelectorAll("[data-club-check]").forEach((field) => {
    field.addEventListener("change", () => {
      state.clubDraft[field.dataset.clubCheck] = field.checked;
    });
  });

  document.querySelectorAll("[data-onboard-role]").forEach((button) => {
    button.addEventListener("click", () => {
      const intent = button.dataset.onboardRole;
      if (intent === "student") {
        state.onboardingStep = "student-info";
      }
      if (intent === "club-core") {
        const club = activeClub();
        state.host.type = "Club Core";
        state.host.name = club.name;
        state.host.category = club.category;
        state.host.school = club.school;
        state.host.approver = "Current president";
        state.host.approved = false;
        state.adminScope = "club";
        state.onboardingStep = "host-info";
        state._onboardingIntent = "club-core";
      }
      if (intent === "school-rep") {
        state.host.type = "School Representative";
        state.host.name = `${state.host.school} Office`;
        state.host.category = "School";
        state.host.approver = "Super Admin";
        state.host.approved = false;
        state.adminScope = "school";
        state.onboardingStep = "host-info";
        state._onboardingIntent = "school-rep";
      }
      render();
    });
  });

  document.querySelectorAll("[data-interest]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.interest;
      state.user.interests = state.user.interests.includes(value)
        ? state.user.interests.filter((interest) => interest !== value)
        : [...state.user.interests, value];
      render();
    });
  });
}

async function updateClubLeadershipFromPrompt(clubId, club = {}) {
  const currentPresidentName = window.prompt("Current president name", club.currentPresidentName || "");
  if (currentPresidentName == null) return;
  const currentPresidentEmail = window.prompt("Current president RVU email (@rvu.edu.in)", club.currentPresidentEmail || "");
  if (!isAllowedRvuEmail(currentPresidentEmail)) return window.alert("Current president email must end with @rvu.edu.in.");
  const facultyAdvisorName = window.prompt("Faculty advisor name", club.facultyAdvisorName || "");
  if (facultyAdvisorName == null) return;
  const facultyAdvisorEmail = window.prompt("Faculty advisor RVU email (@rvu.edu.in)", club.facultyAdvisorEmail || "");
  if (!isAllowedRvuEmail(facultyAdvisorEmail)) return window.alert("Faculty advisor email must end with @rvu.edu.in.");

  await window.RVUFirebase.updateClubLeadership(clubId, {
    currentPresidentName,
    currentPresidentEmail,
    facultyAdvisorName,
    facultyAdvisorEmail,
  });
  await window.RVUFirebase.assignClubCoreRole(clubId, {
    email: currentPresidentEmail,
    name: currentPresidentName || currentPresidentEmail,
    role: "president",
  });
  await window.RVUFirebase.assignClubCoreRole(clubId, {
    email: facultyAdvisorEmail,
    name: facultyAdvisorName || facultyAdvisorEmail,
    role: "facultyAdvisor",
  });
  await syncFirebaseData();
}

async function handleAction(action, dataset) {
  if (action === "open-login") {
    state.loginOpen = true;
  }
  if (action === "close-login") {
    state.loginOpen = false;
    state.authPassword = "";
  }
  if (action === "auth-mode") {
    state.authMode = dataset.mode;
  }
  if (action === "login-google") {
    startFirebaseLogin("google");
    return;
  }
  if (action === "login-password") {
    startFirebaseLogin("password");
    return;
  }
  if (action === "preview") {
    enterDemoApp();
    return;
  }
  if (action === "next-interests") {
    state.onboardingStep = "student-interests";
  }
  if (action === "finish-student") {
    if (window.RVUFirebase && state.authUser) {
      await window.RVUFirebase.saveUserProfile(state.authUser.uid, {
        name: state.user.name,
        school: state.user.school,
        year: state.user.year,
        interests: state.user.interests,
        onboardingComplete: true,
      });
    }
    state.onboardingStep = null;
    state.route = "home";
  }
  if (action === "submit-host") {
    const isClubIntent = state._onboardingIntent === "club-core";
    const isSchoolIntent = state._onboardingIntent === "school-rep";
    if (isClubIntent && !activeClub().id && !activeClub().slug) {
      window.alert("No approved club exists in Firestore yet. Ask a super admin to create the club first.");
      return;
    }
    
    let designation = "";
    let department = "";
    if (isSchoolIntent) {
      designation = document.getElementById("srep-designation")?.value || "";
      department = document.getElementById("srep-department")?.value?.trim() || "";
      state.host.facultyDesignation = designation;
      state.host.facultyDepartment = department;
      state.host.isFaculty = designation !== "Student Rep";
    }

    if (window.RVUFirebase) {
      await window.RVUFirebase.submitHostRequest({
        type: isClubIntent ? "clubCore" : "schoolRepresentative",
        clubId: isClubIntent ? state.host.clubSlug : null,
        schoolId: isSchoolIntent ? state.host.school : null,
        name: state.host.name,
        roleTitle: state.host.roleTitle,
        description: state.host.description,
        joinLink: state.host.joinLink,
        approver: state.host.approver,
        facultyDesignation: designation,
        facultyDepartment: department,
      });
    }
    state.host.approved = false;
    state.onboardingStep = "host-review";
    state.route = "home";
  }
  if (action === "host-review") {
    state.onboardingStep = "host-review";
  }
  if (action === "close-onboarding") {
    state.onboardingStep = null;
    if (isClubCore() || isSchoolRep()) state.route = "admin";
  }
  if (action === "toggle-create") {
    state.createOpen = !state.createOpen;
  }
  if (action === "create-event") {
    if (!canHost() && !isSuperAdmin()) {
      window.alert("You need an approved club core or school representative role to create events.");
      return;
    }
    state.createEventOpen = true;
    state.createOpen = false;
    render();
    return;
  }
  if (action === "create-announcement") {
    if (!canHost() && !isSuperAdmin()) {
      window.alert("You need an approved club core or school representative role to create announcements.");
      return;
    }
    state.createAnnouncementOpen = true;
    state.createOpen = false;
    render();
    return;
  }
  if (action === "open-club") {
    state.route = "clubs";
    state.selectedClubSlug = dataset.club;
  }
  if (action === "back-to-clubs") {
    state.selectedClubSlug = null;
  }
  if (action === "toggle-registration") {
    const club = clubs.find((item) => item.slug === dataset.club);
    if (club) {
      const nextValue = !club.registrationOpen;
      if (window.RVUFirebase) await window.RVUFirebase.updateClubRegistration(club.id || club.slug, nextValue);
      club.registrationOpen = nextValue;
    }
  }
  if (action === "approve-host") {
    if (window.RVUFirebase && dataset.request) {
      await window.RVUFirebase.updateHostRequestStatus(dataset.request, "approved");
      await syncFirebaseData();
    }
  }
  if (action === "reject-host") {
    if (window.RVUFirebase && dataset.request) {
      await window.RVUFirebase.updateHostRequestStatus(dataset.request, "rejected");
      await syncFirebaseData();
    }
  }
  if (action === "sign-out") {
    await handleSignOut();
    return;
  }
  if (action === "admin-tab") {
    state.adminTab = dataset.tab || "requests";
  }
  if (action === "admin-create-club") {
    if (!isSuperAdmin()) return;
    state.clubDraft = defaultClubDraft();
    state.route = "admin-create-club";
    renderAtTop();
    return;
  }
  if (action === "admin-back-to-clubs") {
    state.route = "admin";
    state.adminTab = "clubs";
    renderAtTop();
    return;
  }
  if (action === "admin-reset-club-form") {
    state.clubDraft = defaultClubDraft();
    render();
    return;
  }
  if (action === "admin-submit-club") {
    if (!window.RVUFirebase || !isSuperAdmin()) return;
    const error = validateClubDraft();
    if (error) return window.alert(error);
    const draft = { ...state.clubDraft };
    await window.RVUFirebase.createClub({
      ...draft,
      name: draft.name.trim(),
      category: draft.category.trim(),
      tagline: draft.tagline.trim(),
      description: draft.description.trim(),
      founderName: draft.founderName.trim(),
      founderEmail: draft.founderEmail.trim(),
      facultyAdvisorName: draft.facultyAdvisorName.trim(),
      facultyAdvisorEmail: draft.facultyAdvisorEmail.trim(),
      currentPresidentName: draft.currentPresidentName.trim(),
      currentPresidentEmail: draft.currentPresidentEmail.trim(),
      join: draft.joinLink.trim(),
      joinLink: draft.joinLink.trim(),
    });
    state.clubDraft = defaultClubDraft();
    state.route = "admin";
    state.adminTab = "clubs";
    await syncFirebaseData();
    renderAtTop();
    return;
  }
  if (action === "admin-create-school") {
    if (!window.RVUFirebase || !isSuperAdmin()) return;
    const name = window.prompt("School name");
    if (!name) return;
    const shortName = window.prompt("Short name (optional)") || "";
    const description = window.prompt("Description") || "";
    const leadEmail = window.prompt("Lead/admin RVU email optional (@rvu.edu.in)") || "";
    if (leadEmail && !isAllowedRvuEmail(leadEmail)) return window.alert("Lead email must end with @rvu.edu.in.");
    await window.RVUFirebase.createSchool({
      name,
      shortName,
      description,
      leadEmail,
    });
    await syncFirebaseData();
  }
  if (action === "admin-delete-school") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    if (!window.confirm("Delete this school record?")) return;
    await window.RVUFirebase.deleteDocument("schools", dataset.docid);
    await syncFirebaseData();
  }
  if (action === "admin-assign-core") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    const email = window.prompt("Core member RVU email (@rvu.edu.in)");
    if (!isAllowedRvuEmail(email)) return window.alert("Core email must end with @rvu.edu.in.");
    const name = window.prompt("Core member name") || email;
    const role = window.prompt("Core role (e.g. designLead, eventsLead, treasurer)") || "core";
    await window.RVUFirebase.assignClubCoreRole(dataset.docid, { email, name, role });
    await syncFirebaseData();
  }
  if (action === "admin-update-club-leadership") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    const club = state.allClubs.find((item) => item.id === dataset.docid) || {};
    await updateClubLeadershipFromPrompt(dataset.docid, club);
  }
  if (action === "club-update-leadership") {
    if (!window.RVUFirebase || !dataset.docid) return;
    const club = activeClub();
    await updateClubLeadershipFromPrompt(dataset.docid, club);
  }
  if (action === "club-assign-core") {
    if (!window.RVUFirebase || !dataset.docid) return;
    const email = window.prompt("Core member RVU email (@rvu.edu.in)");
    if (!isAllowedRvuEmail(email)) return window.alert("Core email must end with @rvu.edu.in.");
    const name = window.prompt("Core member name") || email;
    const role = window.prompt("Core role (e.g. eventsLead, designLead, treasurer)") || "core";
    await window.RVUFirebase.assignClubCoreRole(dataset.docid, { email, name, role });
    await syncFirebaseData();
  }
  if (action === "admin-remove-core") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    const email = window.prompt("Core member email to remove");
    if (!email) return;
    if (!window.confirm(`Remove ${email} from this club core?`)) return;
    await window.RVUFirebase.removeClubCoreRole(dataset.docid, email);
    await syncFirebaseData();
  }
  if (action === "club-remove-core") {
    if (!window.RVUFirebase || !dataset.docid) return;
    const email = window.prompt("Core member email to remove");
    if (!email) return;
    if (!window.confirm(`Remove ${email} from this club core?`)) return;
    await window.RVUFirebase.removeClubCoreRole(dataset.docid, email);
    await syncFirebaseData();
  }
  if (action === "admin-delete-club") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    if (!window.confirm("Delete this club? This cannot be undone.")) return;
    await window.RVUFirebase.deleteDocument("clubs", dataset.docid);
    await syncFirebaseData();
  }
  if (action === "admin-create-event") {
    if (!window.RVUFirebase || !isSuperAdmin()) return;
    const title = window.prompt("Event title");
    if (!title) return;
    const description = window.prompt("Description") || "";
    const date = window.prompt("Display date") || "";
    const time = window.prompt("Time") || "";
    const location = window.prompt("Location") || "";
    const host = window.prompt("Host/source") || "RVU";
    await window.RVUFirebase.createEvent({
      title,
      description,
      date,
      time,
      location,
      host,
      type: window.prompt("Type: Club Event, Faculty Event, School Event") || "School Event",
      hostType: "admin",
      tags: [],
      status: "published",
    });
    await syncFirebaseData();
  }
  if (action === "admin-create-announcement") {
    if (!window.RVUFirebase || !isSuperAdmin()) return;
    const title = window.prompt("Announcement title");
    if (!title) return;
    await window.RVUFirebase.createAnnouncement({
      title,
      description: window.prompt("Description") || "",
      source: window.prompt("Source") || "RVU",
      tag: window.prompt("Tag") || "Notice",
      type: "Faculty",
      sourceType: "admin",
      time: "Just now",
      status: "published",
    });
    await syncFirebaseData();
  }
  if (action === "open-create-project") {
    state.createProjectOpen = true;
    render();
    return;
  }
  if (action === "close-create-project") {
    state.createProjectOpen = false;
    renderAtTop();
    return;
  }
  if (action === "submit-create-project") {
    if (!window.RVUFirebase) return;
    const title = document.getElementById("cp-title")?.value?.trim();
    const description = document.getElementById("cp-description")?.value?.trim();
    if (!title || !description) {
      window.alert("Title and description are required.");
      return;
    }
    const skills = (document.getElementById("cp-skills")?.value || "").split(",").map(s => s.trim()).filter(Boolean);
    const tags = (document.getElementById("cp-tags")?.value || "").split(",").map(t => t.trim()).filter(Boolean);
    const expiry = document.getElementById("cp-expiry")?.value || "";
    const phone = document.getElementById("cp-phone")?.value?.trim() || "";
    await window.RVUFirebase.createProject({
      title,
      description,
      skills,
      tags,
      expiry,
      contactPhone: phone,
      postedBy: state.authUser?.email || state.user.name || "Student",
      postedByName: state.user.name || "",
      status: "open",
      score: 0,
    });
    state.createProjectOpen = false;
    await syncFirebaseData();
    renderAtTop();
    return;
  }
  if (action === "close-create-event") {
    state.createEventOpen = false;
    renderAtTop();
    return;
  }
  if (action === "submit-create-event") {
    if (!window.RVUFirebase) return;
    const title = document.getElementById("ce-title")?.value?.trim();
    const description = document.getElementById("ce-description")?.value?.trim();
    const date = document.getElementById("ce-date")?.value || "";
    const time = document.getElementById("ce-time")?.value || "";
    const location = document.getElementById("ce-location")?.value?.trim() || "";
    if (!title || !description || !date || !time || !location) {
      window.alert("Title, description, date, time and location are required.");
      return;
    }
    const link = document.getElementById("ce-link")?.value?.trim() || "";
    const posterUrl = document.getElementById("ce-poster")?.value?.trim() || "";
    const collab = document.getElementById("ce-collab")?.value || "";
    const club = activeClub();
    const payload = isClubCore() ? {
      title, description, date, time, location,
      hostType: "club",
      clubId: club.id || club.slug,
      club: club.name,
      host: club.name,
      type: "Club Event",
      tags: [club.category].filter(Boolean),
      link: link || null,
      linkType: link ? "external" : null,
      posterUrl: posterUrl || null,
      collaboratingClubs: collab ? [collab] : [],
    } : {
      title, description, date, time, location,
      hostType: "school",
      schoolId: state.host.school,
      host: state.host.school,
      type: "School Event",
      tags: [],
      link: link || null,
      posterUrl: posterUrl || null,
      facultyDesignation: state.host.facultyDesignation || "",
      hostName: state.host.name || "",
      schoolName: state.host.school || "",
    };
    await window.RVUFirebase.createEvent(payload);
    state.createEventOpen = false;
    await syncFirebaseData();
    renderAtTop();
    return;
  }
  if (action === "close-create-announcement") {
    state.createAnnouncementOpen = false;
    renderAtTop();
    return;
  }
  if (action === "submit-create-announcement") {
    if (!window.RVUFirebase) return;
    const title = document.getElementById("ca-title")?.value?.trim();
    const description = document.getElementById("ca-description")?.value?.trim();
    const tag = document.querySelector('input[name="ca-tag"]:checked')?.value || "Notice";
    const imageUrl = document.getElementById("ca-image")?.value?.trim() || "";

    if (!title || !description) {
      window.alert("Title and description are required.");
      return;
    }

    const payload = {
      title,
      description,
      tag,
      time: "Just now",
      status: "published",
    };

    if (imageUrl) {
      payload.imageUrl = imageUrl;
    }

    if (isClubCore()) {
      const club = activeClub();
      payload.source = club.name;
      payload.type = "Club";
      payload.clubId = club.id || club.slug;
    } else if (isSchoolRep()) {
      payload.source = state.host.school;
      payload.sourceType = "school";
      payload.type = "Faculty";
      payload.schoolId = state.host.school;
      payload.facultyDesignation = state.host.facultyDesignation || "";
      payload.hostName = state.host.name || "";
      payload.schoolName = state.host.school || "";
    } else if (isSuperAdmin()) {
      payload.source = "RVU";
      payload.sourceType = "admin";
      payload.type = "Faculty";
    }

    await window.RVUFirebase.createAnnouncement(payload);
    state.createAnnouncementOpen = false;
    await syncFirebaseData();
    renderAtTop();
    return;
  }
  if (action === "admin-unpublish-event") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    await window.RVUFirebase.updateEventStatus(dataset.docid, "draft");
    await syncFirebaseData();
  }
  if (action === "admin-publish-event") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    await window.RVUFirebase.updateEventStatus(dataset.docid, "published");
    await syncFirebaseData();
  }
  if (action === "admin-unpublish-announcement") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    await window.RVUFirebase.updateAnnouncementStatus(dataset.docid, "draft");
    await syncFirebaseData();
  }
  if (action === "admin-delete-event") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    if (!window.confirm("Delete this event permanently?")) return;
    await window.RVUFirebase.deleteDocument("events", dataset.docid);
    await syncFirebaseData();
  }
  if (action === "admin-delete-announcement") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    if (!window.confirm("Delete this announcement permanently?")) return;
    await window.RVUFirebase.deleteDocument("announcements", dataset.docid);
    await syncFirebaseData();
  }
  if (action === "admin-delete-project") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    if (!window.confirm("Delete this project permanently?")) return;
    await window.RVUFirebase.deleteDocument("projects", dataset.docid);
    await syncFirebaseData();
  }
  if (action === "toggle-search") {
    state.searchOpen = !state.searchOpen;
    state.searchQuery = "";
    renderAtTop();
    return;
  }
  if (action === "close-search") {
    state.searchOpen = false;
    state.searchQuery = "";
    renderAtTop();
    return;
  }
  if (action === "search-input") {
    return;
  }
  if (action === "search-open-event") {
    state.searchOpen = false;
    state.selectedEventId = dataset.docid;
    state.selectedProjectId = null;
    state.selectedAnnouncementId = null;
    state.route = "events";
    renderAtTop();
    return;
  }
  if (action === "search-open-club") {
    state.searchOpen = false;
    state.selectedClubSlug = dataset.slug;
    state.selectedEventId = null;
    state.selectedProjectId = null;
    state.selectedAnnouncementId = null;
    state.route = "clubs";
    renderAtTop();
    return;
  }
  if (action === "search-open-project") {
    state.searchOpen = false;
    state.selectedProjectId = dataset.docid;
    state.selectedEventId = null;
    state.selectedAnnouncementId = null;
    state.route = "projects";
    renderAtTop();
    return;
  }
  if (action === "search-open-announcement") {
    state.searchOpen = false;
    state.selectedAnnouncementId = dataset.docid;
    state.selectedEventId = null;
    state.selectedProjectId = null;
    state.route = "announcements";
    renderAtTop();
    return;
  }
  if (action === "toggle-project-status") {
    if (!window.RVUFirebase || !dataset.docid) return;
    const newStatus = dataset.status === "open" ? "closed" : "open";
    await window.RVUFirebase.updateDocument("projects", dataset.docid, { status: newStatus });
    await syncFirebaseData();
    renderAtTop();
    return;
  }
  if (action === "delete-own-project") {
    if (!window.RVUFirebase || !dataset.docid) return;
    if (!window.confirm(`Delete "${dataset.title}"? This cannot be undone.`)) return;
    await window.RVUFirebase.deleteDocument("projects", dataset.docid);
    state.selectedProjectId = null;
    await syncFirebaseData();
    renderAtTop();
    return;
  }
  if (action === "open-project-detail") {
    state.selectedProjectId = dataset.docid;
    renderAtTop();
    return;
  }
  if (action === "close-project-detail") {
    state.selectedProjectId = null;
    renderAtTop();
    return;
  }
  if (action === "close-event-detail") {
    state.selectedEventId = null;
    renderAtTop();
    return;
  }
  if (action === "open-event-detail") {
    state.selectedEventId = dataset.docid;
    renderAtTop();
    return;
  }
  if (action === "open-announcement-detail") {
    state.selectedAnnouncementId = dataset.docid;
    renderAtTop();
    return;
  }
  if (action === "close-announcement-detail") {
    state.selectedAnnouncementId = null;
    renderAtTop();
    return;
  }
  if (action === "edit-announcement") {
    state.editAnnouncementId = dataset.docid;
    state.editAnnouncementOpen = true;
    renderAtTop();
    return;
  }
  if (action === "close-edit-announcement") {
    state.editAnnouncementOpen = false;
    state.editAnnouncementId = null;
    renderAtTop();
    return;
  }
  if (action === "submit-edit-announcement") {
    if (!window.RVUFirebase || !state.editAnnouncementId) return;
    const title = document.getElementById("ea-title")?.value?.trim();
    const description = document.getElementById("ea-description")?.value?.trim();
    const imageUrl = document.getElementById("ea-image")?.value?.trim() || "";
    if (!title || !description) {
      window.alert("Title and description required.");
      return;
    }
    await window.RVUFirebase.updateDocument("announcements", state.editAnnouncementId, {
      title,
      description,
      imageUrl: imageUrl || null,
    });
    state.editAnnouncementOpen = false;
    state.editAnnouncementId = null;
    await syncFirebaseData();
    renderAtTop();
    return;
  }
  if (action === "cancel-event") {
    if (!window.RVUFirebase || !dataset.docid) return;
    if (!window.confirm(`Mark "${dataset.title}" as cancelled? It will stay visible with a Cancelled badge.`)) return;
    await window.RVUFirebase.updateDocument("events", dataset.docid, {
      status: "cancelled",
      cancelled: true,
    });
    await syncFirebaseData();
    renderAtTop();
    return;
  }
  if (action === "open-edit-event") {
    state.editEventId = dataset.docid;
    state.editEventOpen = true;
    renderAtTop();
    return;
  }
  if (action === "close-edit-event") {
    state.editEventId = null;
    state.editEventOpen = false;
    renderAtTop();
    return;
  }
  if (action === "submit-edit-event") {
    if (!window.RVUFirebase || !state.editEventId) return;
    const title = document.getElementById("ee-title")?.value?.trim();
    const description = document.getElementById("ee-description")?.value?.trim();
    const date = document.getElementById("ee-date")?.value || "";
    const time = document.getElementById("ee-time")?.value || "";
    const location = document.getElementById("ee-location")?.value?.trim() || "";
    const link = document.getElementById("ee-link")?.value?.trim() || "";
    const posterUrl = document.getElementById("ee-poster")?.value?.trim() || "";
    if (!title || !description) {
      window.alert("Title and description required.");
      return;
    }
    await window.RVUFirebase.updateDocument("events", state.editEventId, {
      title,
      description,
      date,
      time,
      location,
      link: link || null,
      posterUrl: posterUrl || null,
    });
    state.editEventOpen = false;
    state.editEventId = null;
    await syncFirebaseData();
    renderAtTop();
    return;
  }
  if (action === "save-item") {
    if (!window.RVUFirebase || !dataset.docid) return;
    await window.RVUFirebase.saveItem({
      itemId: dataset.docid,
      type: dataset.kind || "item",
      title: dataset.title || "",
    });
    await syncFirebaseData();
    window.alert("Saved to your campus dashboard.");
  }
  if (action === "follow-club") {
    if (!window.RVUFirebase || !dataset.docid) return;
    await window.RVUFirebase.followClub(dataset.docid, dataset.title || "");
    await syncFirebaseData();
    window.alert("Club followed.");
  }
  if (action === "unfollow-club") {
    if (!window.RVUFirebase || !dataset.docid) return;
    await window.RVUFirebase.unfollowClub(dataset.docid);
    await syncFirebaseData();
    renderAtTop();
    return;
  }
  if (action === "rsvp-event") {
    if (!window.RVUFirebase || !dataset.docid) return;
    await window.RVUFirebase.rsvpEvent(dataset.docid, { title: dataset.title || "", status: "going" });
    await syncFirebaseData();
    window.alert("RSVP saved.");
  }
  if (action === "apply-project") {
    if (!window.RVUFirebase || !dataset.docid) return;
    const note = window.prompt("Short application note optional") || "";
    await window.RVUFirebase.applyToProject(dataset.docid, {
      title: dataset.title || "",
      name: state.user.name || state.authUser?.displayName || "",
      note,
    });
    await syncFirebaseData();
    window.alert("Application submitted.");
  }
  if (action === "flag-content") {
    if (!window.RVUFirebase || !dataset.docid) return;
    const reason = window.prompt("Why are you reporting this?");
    if (!reason) return;
    await window.RVUFirebase.flagContent({
      collection: dataset.kind || "content",
      targetId: dataset.docid,
      title: dataset.title || "",
      reason,
    });
    window.alert("Report sent to Super Admin.");
  }
  if (action === "calendar-event") {
    const event = events.find((item) => item.id === dataset.docid);
    if (!event) return;
    const details = encodeURIComponent(event.description || "");
    const text = encodeURIComponent(event.title || "RVU Event");
    const location = encodeURIComponent(event.location || "RV University");
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}`, "_blank", "noopener");
  }
  if (action === "toast") {
    window.alert(dataset.message || "Done");
  }
  if (action === "go-profile") {
    state.route = "profile";
    state.selectedClubSlug = null;
    state.createOpen = false;
    renderAtTop();
    return;
  }
  if (action === "edit-profile") {
    state.editProfileOpen = true;
    renderAtTop();
    return;
  }
  if (action === "close-edit-profile") {
    state.editProfileOpen = false;
    renderAtTop();
    return;
  }
  if (action === "ep-year") {
    state.user.year = dataset.year;
    renderAtTop();
    return;
  }
  if (action === "submit-edit-profile") {
    const name = document.getElementById("ep-name")?.value?.trim();
    const school = document.getElementById("ep-school")?.value;
    if (!name) {
      window.alert("Name cannot be empty.");
      return;
    }
    state.user.name = name;
    state.user.school = school;
    if (window.RVUFirebase && state.authUser) {
      await window.RVUFirebase.updateUserProfile(state.authUser.uid, {
        name,
        school,
        year: state.user.year,
      });
    }
    state.editProfileOpen = false;
    renderAtTop();
    return;
  }
  if (action === "open-profile-interests" || action === "edit-interests") {
    state._profileInterestsOpen = true;
    render();
    return;
  }
  if (action === "close-profile-interests") {
    state._profileInterestsOpen = false;
    if (window.RVUFirebase && state.authUser) {
      window.RVUFirebase.saveUserProfile(state.authUser.uid, {
        interests: state.user.interests,
      }).catch(() => {});
    }
    render();
    return;
  }
  renderAtTop();
}

render();
