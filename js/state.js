export const icons = {
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

export const schools = [
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

export const interests = ["AI", "Web Development", "Design", "Business", "Finance", "Marketing", "Product", "Film", "Law", "Healthcare"];

export const events = [];
export const clubs = [];
export const announcements = [];
export const projects = [];

export const state = {
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
  route: new URLSearchParams(window.location.search).get("route") || "home",
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
  siteSettings: [],
  // Club Core applications (student's own)
  clubApplications: [],
  // Pending applicants for the active club (club-core view)
  clubApplicants: [],
  _clubApplicantsLoaded: false,
  // Modal flags
  _clubApplyModalOpen: false,
};

export const app = document.querySelector("#app");

export function defaultClubDraft() {
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

