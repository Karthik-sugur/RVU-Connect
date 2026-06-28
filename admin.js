
async function promptUser(message, defaultValue = "") {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
      backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: "10000"
    });

    const modal = document.createElement("div");
    Object.assign(modal.style, {
      backgroundColor: "#fff", padding: "24px", borderRadius: "8px", width: "300px",
      maxWidth: "90%", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", fontFamily: "inherit"
    });

    const label = document.createElement("p");
    label.innerText = message;
    Object.assign(label.style, {
      marginTop: "0", marginBottom: "16px", fontWeight: "600", color: "#1d1a16", fontSize: "14px"
    });

    const input = document.createElement("input");
    input.type = "text";
    input.value = defaultValue;
    Object.assign(input.style, {
      width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px",
      boxSizing: "border-box", marginBottom: "24px", fontSize: "14px"
    });

    const btnContainer = document.createElement("div");
    Object.assign(btnContainer.style, {
      display: "flex", justifyContent: "flex-end", gap: "12px"
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.innerText = "Cancel";
    Object.assign(cancelBtn.style, {
      padding: "8px 16px", border: "1px solid #ccc", backgroundColor: "transparent",
      borderRadius: "4px", cursor: "pointer", fontSize: "13px"
    });

    const okBtn = document.createElement("button");
    okBtn.innerText = "OK";
    Object.assign(okBtn.style, {
      padding: "8px 16px", border: "none", backgroundColor: "#d4af37",
      color: "#1d1a16", borderRadius: "4px", fontWeight: "600", cursor: "pointer", fontSize: "13px"
    });

    btnContainer.append(cancelBtn, okBtn);
    modal.append(label, input, btnContainer);
    overlay.append(modal);
    document.body.append(overlay);
    input.focus();

    const cleanup = () => document.body.removeChild(overlay);
    cancelBtn.onclick = () => { cleanup(); resolve(null); };
    okBtn.onclick = () => { cleanup(); resolve(input.value); };
    input.onkeydown = (e) => {
      if (e.key === "Enter") okBtn.onclick();
      if (e.key === "Escape") cancelBtn.onclick();
    };
  });
}

import { applyDemoCampusData } from "./sample-data.js";

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

const state = {
  user: null,
  profile: null,
  loading: true,
  tab: "overview",
  authMode: "signin",
  authEmail: "",
  authPassword: "",
  data: {
    hostRequests: [],
    moderationFlags: [],
    allUsers: [],
    allEvents: [],
    allAnnouncements: [],
    allClubs: [],
    allSchools: [],
    auditLogs: [],
    contentReviews: [],
    siteSettings: [],
    projects: [],
  },
  forms: {
    club: defaultClub(),
    clubProfile: defaultClubProfile(),
    school: defaultSchool(),
    event: defaultEvent(),
    announcement: defaultAnnouncement(),
    project: defaultProject(),
    role: defaultRoleGrant(),
    settings: defaultSettings(),
    review: defaultReview(),
  },
  toast: "",
  auditLastDocId: null,
  auditSearch: "",
};

const app = document.querySelector("#admin-app");

function defaultClub() {
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

function defaultClubProfile() {
  return { clubId: "", logoUrl: "", bannerUrl: "", socials: "", registrationForm: "", doing: "", highlights: "" };
}

function defaultSchool() {
  return { name: "", shortName: "", description: "", leadEmail: "" };
}

function defaultEvent() {
  return { title: "", description: "", date: "", time: "", location: "", host: "RVU", type: "School Event" };
}

function defaultAnnouncement() {
  return { title: "", description: "", source: "RVU", tag: "Notice", type: "Faculty" };
}

function defaultProject() {
  return { title: "", description: "", tags: "", skills: "", expiry: "" };
}

function defaultRoleGrant() {
  return { email: "", uid: "", role: "student" };
}

function defaultSettings() {
  return {
    eventCategories: "Club Event, Faculty Event, School Event",
    interestTags: "AI, Web Development, Design, Business, Finance, Marketing, Product, Film, Law, Healthcare",
    announcementTags: "Recruitment, Notice, Update",
    reviewRequired: false,
    bannedWords: "",
  };
}

function defaultReview() {
  return { title: "", collection: "events", targetId: "", note: "" };
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

function isRvuEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase().endsWith("@rvu.edu.in");
}

function isSuperAdmin() {
  return state.profile?.role === "superAdmin";
}

function showToast(message) {
  state.toast = message;
  render();
  window.setTimeout(() => {
    if (state.toast === message) {
      state.toast = "";
      render();
    }
  }, 2800);
}

function downloadCSV(filename, rows) {
  if (!rows || !rows.length) return window.alert("No data to export.");
  const keys = Object.keys(rows[0]).filter(k => typeof rows[0][k] !== 'object');
  const csvContent = [
    keys.join(","),
    ...rows.map(row => keys.map(k => {
      let val = row[k] === null || row[k] === undefined ? "" : String(row[k]);
      val = val.replace(/"/g, '""');
      return `"${val}"`;
    }).join(","))
  ].join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function loadAdminData() {
  const data = applyDemoCampusData(await window.RVUFirebase.loadCampusData({ superAdmin: true }));
  const auditRes = await window.RVUFirebase.loadAuditLogs();
  state.auditLastDocId = auditRes.lastDocId;
  state.data = {
    hostRequests: data.hostRequests || [],
    moderationFlags: data.moderationFlags || [],
    allUsers: data.allUsers || [],
    allEvents: data.allEvents || [],
    allAnnouncements: data.allAnnouncements || [],
    allClubs: data.allClubs || [],
    allSchools: data.allSchools || [],
    auditLogs: auditRes.docs || [],
    contentReviews: data.contentReviews || [],
    siteSettings: data.siteSettings || [],
    projects: data.projects || [],
  };
  const platform = state.data.siteSettings.find((item) => item.id === "platform");
  if (platform) {
    state.forms.settings = {
      eventCategories: (platform.eventCategories || []).join(", "),
      interestTags: (platform.interestTags || []).join(", "),
      announcementTags: (platform.announcementTags || []).join(", "),
      reviewRequired: Boolean(platform.reviewRequired),
      bannedWords: (platform.bannedWords || []).join(", "),
    };
  }
}

async function enter(user) {
  state.loading = true;
  state.user = user;
  render();
  try {
    state.profile = await window.RVUFirebase.ensureUserProfile(user);
    if (isSuperAdmin()) await loadAdminData();
  } catch (error) {
    window.alert(error.message || "Could not load admin data.");
  }
  state.loading = false;
  render();
}

function render() {
  try {
    if (state.loading) {
      app.innerHTML = `<main class="login"><div class="login-card"><p class="eyebrow">RVU Connect</p><h1>Loading admin</h1></div></main>`;
      return;
    }

    if (!state.user) {
      app.innerHTML = renderLogin();
      bindEvents();
      return;
    }

    if (!isSuperAdmin()) {
      app.innerHTML = renderDenied();
      bindEvents();
      return;
    }

    app.innerHTML = `
      <div class="admin-site">
        ${renderRail()}
        <main class="main">
          <section class="hero">
            <p class="eyebrow">Separate Super Admin Website</p>
            <h2>${tabTitle()}</h2>
            <p>Full platform control for RVU Connect, separated from the student and host campus app but running on the same Firebase project.</p>
          </section>
          ${renderSummary()}
          <section class="content">${renderTab()}</section>
        </main>
      </div>
      ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ""}
    `;
    bindEvents();
  } catch (err) {
    console.error("Render Error:", err);
    app.innerHTML = `<div style="padding:40px; text-align:center;">
      <h2 style="color:#d93025; font-family:inherit;">Admin Panel Error</h2>
      <p style="color:#666; font-family:inherit;">${err.message}</p>
      <button onclick="window.location.reload()" style="padding:10px 20px; background:#d4af37; border:none; border-radius:4px; margin-top:20px; cursor:pointer; color:#1d1a16; font-weight:600;">Reload App</button>
    </div>`;
  }
}

function renderLogin() {
  return `
    <main class="login">
      <section class="login-card">
        <p class="eyebrow">RVU Connect</p>
        <h1>Super Admin</h1>
        <p>Use an approved RVU super admin account. This is a separate console from the campus app.</p>
        <div class="form">
          <div class="actions" style="margin-top:24px;">
            <button class="btn gold" style="width:100%;" data-action="login-google">Google sign in</button>
          </div>
          <a class="link-button" href="./index.html">Back to campus app</a>
        </div>
      </section>
    </main>
  `;
}

function renderDenied() {
  return `
    <main class="login">
      <section class="login-card">
        <p class="eyebrow">Access denied</p>
        <h1>Not super admin</h1>
        <p>Your account is signed in, but Firestore has not granted it super admin access.</p>
        <div class="actions">
          <button class="btn" data-action="sign-out">Sign out</button>
          <a class="link-button" href="./index.html">Open campus app</a>
        </div>
      </section>
    </main>
  `;
}

function renderRail() {
  const tabs = [
    ["overview", "Overview"],
    ["requests", "Requests"],
    ["clubs", "Clubs"],
    ["schools", "Schools"],
    ["events", "Events"],
    ["announcements", "Notices"],
    ["projects", "Projects"],
    ["review", "Review"],
    ["roles", "Roles"],
    ["settings", "Settings"],
    ["analytics", "Analytics"],
    ["audit", "Audit"],
    ["users", "Users"],
    ["moderation", "Moderation"],
  ];
  return `
    <aside class="rail">
      <img src="./assets/rv-university-logo-gold.png" alt="RV University" />
      <h1>Super Admin</h1>
      <small>${escapeHtml(state.user.email || "")}</small>
      <nav class="tabs">
        ${tabs.map(([key, label]) => `<button class="${state.tab === key ? "active" : ""}" data-tab="${key}">${label}</button>`).join("")}
      </nav>
      <div class="rail-actions">
        <a class="link-button" href="./index.html">Campus app</a>
        <button class="link-button" data-action="refresh">Refresh data</button>
        <button class="link-button" data-action="sign-out">Sign out</button>
      </div>
    </aside>
  `;
}

function tabTitle() {
  const labels = {
    overview: "Command Center",
    requests: "Host Requests",
    clubs: "Club Registry",
    schools: "School Registry",
    events: "Event Control",
    announcements: "Notice Control",
    projects: "Project Control",
    review: "Review Queue",
    roles: "Role Manager",
    settings: "Site Settings",
    analytics: "Analytics",
    audit: "Audit Log",
    users: "User Directory",
    moderation: "Moderation",
  };
  return labels[state.tab] || "Command Center";
}

function renderSummary() {
  const pending = state.data.hostRequests.filter((item) => item.status === "pending").length;
  return `
    <section class="summary">
      ${metric("Pending", pending)}
      ${metric("Users", state.data.allUsers.length)}
      ${metric("Clubs", state.data.allClubs.length)}
      ${metric("Events", state.data.allEvents.length)}
      ${metric("Reviews", state.data.contentReviews.filter((item) => item.status === "pending").length)}
    </section>
  `;
}

function metric(label, value) {
  return `<div class="metric"><span class="eyebrow">${label}</span><strong>${value}</strong></div>`;
}

function renderTab() {
  if (state.tab === "requests") return renderRequests();
  if (state.tab === "clubs") return renderClubs();
  if (state.tab === "schools") return renderSchools();
  if (state.tab === "events") return renderEvents();
  if (state.tab === "announcements") return renderAnnouncements();
  if (state.tab === "projects") return renderProjects();
  if (state.tab === "review") return renderReview();
  if (state.tab === "roles") return renderRoles();
  if (state.tab === "settings") return renderSettings();
  if (state.tab === "analytics") return renderAnalytics();
  if (state.tab === "audit") return renderAudit();
  if (state.tab === "users") return renderUsers();
  if (state.tab === "moderation") return renderModeration();
  return renderOverview();
}

function renderOverview() {
  return `
    <div class="grid">
      <article class="panel">
        <p class="eyebrow">Fast actions</p>
        <h3>Create anything</h3>
        <div class="actions">
          <button class="btn gold" data-tab="clubs">Create club</button>
          <button class="btn secondary" data-tab="schools">Create school</button>
          <button class="btn secondary" data-tab="events">Create event</button>
          <button class="btn secondary" data-tab="announcements">Create notice</button>
          <button class="btn secondary" data-tab="projects">Create project</button>
          <button class="btn secondary" data-tab="roles">Grant role</button>
          <button class="btn secondary" data-tab="settings">Site settings</button>
        </div>
      </article>
      <article class="panel">
        <p class="eyebrow">Boundary</p>
        <h3>Separated admin</h3>
        <p class="empty">This console is a separate page under the same GitHub Pages base URL and Firebase project.</p>
      </article>
      <article class="panel wide">
        <p class="eyebrow">Recent requests</p>
        <h3>Approval queue</h3>
        ${listRows(state.data.hostRequests.slice(0, 6), requestRow, "No host requests yet.")}
      </article>
    </div>
  `;
}

function renderRequests() {
  const pending = state.data.hostRequests.filter((item) => item.status === "pending");
  const resolved = state.data.hostRequests.filter((item) => item.status !== "pending");
  return `
    <div class="grid">
      <article class="panel wide">
        <p class="eyebrow">Pending</p>
        <h3>Approve host access</h3>
        ${listRows(pending, requestRow, "No pending requests.")}
      </article>
      <article class="panel wide">
        <p class="eyebrow">History</p>
        <h3>Resolved requests</h3>
        ${listRows(resolved, (item) => simpleRow(item.name || item.email, `${item.type || "Request"} · ${item.status || "unknown"}`), "No resolved requests.")}
      </article>
    </div>
  `;
}

function requestRow(item) {
  return row(item.name || item.email, `${item.type || "Request"} · ${item.roleTitle || "Representative"} · ${item.email || ""}`, `
    <button class="mini-btn" data-action="approve-request" data-id="${item.id}">Approve</button>
    <button class="mini-btn danger" data-action="reject-request" data-id="${item.id}">Reject</button>
  `);
}

function renderClubs() {
  return `
    <div class="grid">
      <article class="panel wide">
        <p class="eyebrow">Create</p>
        <h3>New club</h3>
        ${renderClubForm()}
      </article>
      <article class="panel wide">
        <p class="eyebrow">Profile editor</p>
        <h3>Club profile assets and links</h3>
        ${renderClubProfileForm()}
      </article>
      <article class="panel wide">
        <p class="eyebrow">Registry</p>
        <h3>All clubs</h3>
        ${listRows(state.data.allClubs, clubRow, "No clubs created yet.")}
      </article>
    </div>
  `;
}

function renderClubProfileForm() {
  const profile = state.forms.clubProfile;
  return `
    <div class="form">
      <div class="form-grid">
        ${select("clubProfile.clubId", "Club", state.data.allClubs.map((club) => club.id), profile.clubId)}
        ${input("clubProfile.logoUrl", "Logo URL", profile.logoUrl)}
        ${input("clubProfile.bannerUrl", "Banner URL", profile.bannerUrl)}
        ${input("clubProfile.registrationForm", "Registration form link", profile.registrationForm)}
        ${input("clubProfile.socials", "Social links comma separated", profile.socials)}
      </div>
      ${textarea("clubProfile.doing", "What they are doing now", profile.doing)}
      ${textarea("clubProfile.highlights", "Past highlights comma separated", profile.highlights)}
      <button class="btn gold" data-action="update-club-profile">Save club profile</button>
    </div>
  `;
}

function renderClubForm() {
  const club = state.forms.club;
  return `
    <div class="form">
      <div class="form-grid">
        ${input("club.name", "Club name", club.name)}
        ${input("club.category", "Category", club.category, "text", "Tech, AI, Cultural")}
        ${select("club.school", "School", schools, club.school)}
        ${input("club.tagline", "Tagline", club.tagline)}
      </div>
      ${textarea("club.description", "Description", club.description)}
      <div class="form-grid">
        ${input("club.founderName", "Founder name", club.founderName)}
        ${input("club.founderEmail", "Founder email", club.founderEmail, "email", "name@rvu.edu.in")}
        ${input("club.facultyAdvisorName", "Faculty advisor name", club.facultyAdvisorName)}
        ${input("club.facultyAdvisorEmail", "Faculty advisor email", club.facultyAdvisorEmail, "email", "name@rvu.edu.in")}
        ${input("club.currentPresidentName", "Current president name", club.currentPresidentName)}
        ${input("club.currentPresidentEmail", "Current president email", club.currentPresidentEmail, "email", "name@rvu.edu.in")}
        ${input("club.joinLink", "Join link", club.joinLink)}
      </div>
      <label class="check"><input type="checkbox" data-check="club.registrationOpen" ${club.registrationOpen ? "checked" : ""} /> Open registrations immediately</label>
      <div class="actions">
        <button class="btn gold" data-action="create-club">Create club</button>
        <button class="btn secondary" data-action="reset-club">Clear</button>
      </div>
    </div>
  `;
}

function clubRow(club) {
  return row(club.name, `${club.category || "General"} · ${club.school || "RVU"} · President: ${club.currentPresidentEmail || "Not set"}`, `
    <button class="mini-btn" data-action="club-leadership" data-id="${club.id}">Leadership</button>
    <button class="mini-btn" data-action="club-core" data-id="${club.id}">Assign core</button>
    <button class="mini-btn secondary" data-action="remove-core" data-id="${club.id}">Remove core</button>
    <button class="mini-btn danger" data-action="delete-club" data-id="${club.id}">Delete</button>
  `);
}

function renderSchools() {
  const allSchools = state.data.allSchools.length
    ? state.data.allSchools
    : schools.map((name) => ({ id: name, name, status: "seeded", description: "Default school option" }));
  return `
    <div class="grid">
      <article class="panel">
        <p class="eyebrow">Create</p>
        <h3>New school</h3>
        <div class="form">
          ${input("school.name", "School name", state.forms.school.name)}
          ${input("school.shortName", "Short name", state.forms.school.shortName)}
          ${textarea("school.description", "Description", state.forms.school.description)}
          ${input("school.leadEmail", "Lead email optional", state.forms.school.leadEmail, "email", "name@rvu.edu.in")}
          <button class="btn gold" data-action="create-school">Create school</button>
        </div>
      </article>
      <article class="panel">
        <p class="eyebrow">Registry</p>
        <h3>Schools</h3>
        ${listRows(allSchools, schoolRow, "No schools.")}
      </article>
    </div>
  `;
}

function schoolRow(school) {
  return row(school.name, `${school.shortName || "RVU"} · ${school.description || "School workspace"}`, school.status === "seeded" ? "" : `
    <button class="mini-btn danger" data-action="delete-school" data-id="${school.id}">Delete</button>
  `);
}

function renderEvents() {
  return `
    <div class="grid">
      <article class="panel">
        <p class="eyebrow">Create</p>
        <h3>New event</h3>
        <div class="form">
          ${input("event.title", "Title", state.forms.event.title)}
          ${textarea("event.description", "Description", state.forms.event.description)}
          <div class="form-grid">
            ${input("event.date", "Display date", state.forms.event.date)}
            ${input("event.time", "Time", state.forms.event.time)}
            ${input("event.location", "Location", state.forms.event.location)}
            ${input("event.host", "Host/source", state.forms.event.host)}
            ${select("event.type", "Type", ["Club Event", "Faculty Event", "School Event"], state.forms.event.type)}
          </div>
          <button class="btn gold" data-action="create-event">Create event</button>
        </div>
      </article>
      <article class="panel">
        <p class="eyebrow">Manage</p>
        <h3>Events</h3>
        ${listRows(state.data.allEvents, eventRow, "No events yet.")}
      </article>
    </div>
  `;
}

function eventRow(event) {
  const action = event.status === "published" ? "unpublish-event" : "publish-event";
  const label = event.status === "published" ? "Unpublish" : "Publish";
  return row(event.title, `${event.host || event.club || "RVU"} · ${event.date || "No date"} · ${event.status || "unknown"}`, `
    <button class="mini-btn" data-action="${action}" data-id="${event.id}">${label}</button>
    <button class="mini-btn" data-action="export-rsvps" data-id="${event.id}">Export RSVPs</button>
    <button class="mini-btn danger" data-action="delete-event" data-id="${event.id}">Delete</button>
  `);
}

function renderAnnouncements() {
  return `
    <div class="grid">
      <article class="panel">
        <p class="eyebrow">Create</p>
        <h3>New notice</h3>
        <div class="form">
          ${input("announcement.title", "Title", state.forms.announcement.title)}
          ${textarea("announcement.description", "Description", state.forms.announcement.description)}
          <div class="form-grid">
            ${input("announcement.source", "Source", state.forms.announcement.source)}
            ${input("announcement.tag", "Tag", state.forms.announcement.tag)}
            ${select("announcement.type", "Type", ["Club", "Faculty"], state.forms.announcement.type)}
          </div>
          <button class="btn gold" data-action="create-announcement">Create notice</button>
        </div>
      </article>
      <article class="panel">
        <p class="eyebrow">Manage</p>
        <h3>Notices</h3>
        ${listRows(state.data.allAnnouncements, announcementRow, "No announcements yet.")}
      </article>
    </div>
  `;
}

function announcementRow(item) {
  return row(item.title, `${item.source || "RVU"} · ${item.tag || "Update"} · ${item.status || "unknown"}`, `
    ${item.status === "published" ? `<button class="mini-btn" data-action="unpublish-announcement" data-id="${item.id}">Unpublish</button>` : ""}
    <button class="mini-btn danger" data-action="delete-announcement" data-id="${item.id}">Delete</button>
  `);
}

function renderProjects() {
  return `
    <div class="grid">
      <article class="panel">
        <p class="eyebrow">Create</p>
        <h3>New project</h3>
        <div class="form">
          ${input("project.title", "Title", state.forms.project.title)}
          ${textarea("project.description", "Description", state.forms.project.description)}
          <div class="form-grid">
            ${input("project.tags", "Tags comma separated", state.forms.project.tags)}
            ${input("project.skills", "Skills comma separated", state.forms.project.skills)}
            ${input("project.expiry", "Expiry", state.forms.project.expiry)}
          </div>
          <button class="btn gold" data-action="create-project">Create project</button>
        </div>
      </article>
      <article class="panel">
        <p class="eyebrow">Manage</p>
        <h3>Projects</h3>
        ${listRows(state.data.projects, projectRow, "No projects yet.")}
      </article>
    </div>
  `;
}

function projectRow(project) {
  return row(project.title, `${(project.tags || []).join(", ") || "No tags"} · ${project.status || "open"}`, `
    <button class="mini-btn" data-action="project-application-status" data-id="${project.id}">Application status</button>
    <button class="mini-btn" data-action="export-project-applicants" data-id="${project.id}">Export Applicants</button>
    <button class="mini-btn danger" data-action="delete-project" data-id="${project.id}">Delete</button>
  `);
}

function renderUsers() {
  return `
    <article class="panel wide">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <div><p class="eyebrow">Directory</p><h3>Users</h3></div>
        <button class="btn gold" data-action="export-users">Download CSV</button>
      </div>
      ${listRows(state.data.allUsers, userRow, "No users yet.")}
    </article>
  `;
}

function userRow(user) {
  const suspendedTxt = user.suspended ? " · [SUSPENDED]" : "";
  const toggleLabel = user.suspended ? "Unsuspend" : "Suspend";
  return row(user.name || user.email || user.id, `${user.email || "No email"} · ${user.role || "student"} · ${user.school || "No school"}${suspendedTxt}`, `
    <button class="mini-btn ${user.suspended ? "" : "danger"}" data-action="toggle-suspend-user" data-id="${user.id}" data-suspended="${user.suspended ? 'true' : 'false'}">${toggleLabel}</button>
  `);
}

function renderReview() {
  return `
    <div class="grid">
      <article class="panel">
        <p class="eyebrow">Manual review</p>
        <h3>Add review item</h3>
        <div class="form">
          ${input("review.title", "Title", state.forms.review.title)}
          ${select("review.collection", "Collection", ["events", "announcements", "projects", "clubs"], state.forms.review.collection)}
          ${input("review.targetId", "Target document ID", state.forms.review.targetId)}
          ${textarea("review.note", "Review note", state.forms.review.note)}
          <button class="btn gold" data-action="create-review">Add to queue</button>
        </div>
      </article>
      <article class="panel">
        <p class="eyebrow">Queue</p>
        <h3>Pending reviews</h3>
        ${listRows(state.data.contentReviews, reviewRow, "No content reviews yet.")}
      </article>
    </div>
  `;
}

function reviewRow(item) {
  return row(item.title || item.targetId, `${item.collection || "content"} · ${item.status || "pending"} · ${item.note || ""}`, `
    <button class="mini-btn" data-action="approve-review" data-id="${item.id}">Approve</button>
    <button class="mini-btn danger" data-action="reject-review" data-id="${item.id}">Reject</button>
  `);
}

function renderRoles() {
  const grant = state.forms.role;
  return `
    <div class="grid">
      <article class="panel">
        <p class="eyebrow">Role manager</p>
        <h3>Grant platform role</h3>
        <div class="form">
          ${input("role.email", "RVU email", grant.email, "email", "name@rvu.edu.in")}
          ${input("role.uid", "Firebase Auth UID", grant.uid)}
          ${select("role.role", "Role", ["student", "clubCore", "schoolRepresentative", "superAdmin"], grant.role)}
          <button class="btn gold" data-action="grant-role">Apply role</button>
        </div>
      </article>
      <article class="panel">
        <p class="eyebrow">Current users</p>
        <h3>Directory</h3>
        ${listRows(state.data.allUsers.slice(0, 12), (user) => simpleRow(user.name || user.email || user.id, `${user.email || "No email"} · ${user.role || "student"}`), "No users yet.")}
      </article>
    </div>
  `;
}

function renderSettings() {
  const settings = state.forms.settings;
  return `
    <article class="panel wide">
      <p class="eyebrow">Site settings</p>
      <h3>Taxonomy and review controls</h3>
      <div class="form">
        ${textarea("settings.eventCategories", "Event categories", settings.eventCategories)}
        ${textarea("settings.interestTags", "Interest tags", settings.interestTags)}
        ${textarea("settings.announcementTags", "Announcement tags", settings.announcementTags)}
        ${textarea("settings.bannedWords", "Banned words", settings.bannedWords)}
        <label class="check"><input type="checkbox" data-check="settings.reviewRequired" ${settings.reviewRequired ? "checked" : ""} /> Require content review before publishing</label>
        <button class="btn gold" data-action="save-settings">Save settings</button>
      </div>
    </article>
  `;
}

function renderAnalytics() {
  const openProjects = state.data.projects.filter((item) => item.status !== "closed").length;
  const publishedEvents = state.data.allEvents.filter((item) => item.status === "published").length;
  const publishedNotices = state.data.allAnnouncements.filter((item) => item.status === "published").length;
  const openFlags = state.data.moderationFlags.filter((item) => item.status !== "closed").length;
  return `
    <div class="grid">
      ${analyticsCard("Published events", publishedEvents, "Live campus programming")}
      ${analyticsCard("Published notices", publishedNotices, "Visible structured updates")}
      ${analyticsCard("Open projects", openProjects, "Collaboration posts")}
      ${analyticsCard("Open flags", openFlags, "Moderation workload")}
    </div>
  `;
}

function analyticsCard(title, value, copy) {
  return `<article class="panel"><p class="eyebrow">${title}</p><h3>${value}</h3><p class="empty">${copy}</p></article>`;
}

function renderAudit() {
  const filteredLogs = state.data.auditLogs.filter(item => {
    if (!state.auditSearch) return true;
    const s = state.auditSearch.toLowerCase();
    return (item.action || "").toLowerCase().includes(s) || (item.adminEmail || item.actorEmail || "").toLowerCase().includes(s);
  });
  return `
    <article class="panel wide">
      <p class="eyebrow">Immutable activity</p>
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px;">
        <h3>Audit log</h3>
        <div style="display: flex; gap: 8px;">
          <input type="text" data-field="auditSearch" value="${escapeHtml(state.auditSearch || "")}" placeholder="Search action or email..." style="padding: 6px; border: 1px solid #ccc; border-radius: 4px;" />
          <button class="btn secondary" data-action="search-audit">Search</button>
        </div>
      </div>
      ${listRows(filteredLogs, (item) => simpleRow(item.action || "Action", `${item.collection || "collection"} · ${item.title || item.targetId || ""} · ${item.adminEmail || item.actorEmail || ""}`), "No audit entries match.")}
      ${state.auditLastDocId ? `<div style="margin-top: 16px; text-align: center;"><button class="btn secondary" data-action="load-more-audit">Load More</button></div>` : ""}
    </article>
  `;
}

function renderModeration() {
  return `
    <article class="panel wide">
      <p class="eyebrow">Quality</p>
      <h3>Moderation flags</h3>
      ${listRows(state.data.moderationFlags, (item) => simpleRow(item.title || item.reason || "Flag", `${item.collection || "Content"} · ${item.status || "Open"}`), "No moderation flags.")}
    </article>
  `;
}

function input(path, label, value, type = "text", placeholder = "") {
  return `<div class="field"><label>${label}</label><input data-field="${path}" type="${type}" value="${escapeHtml(value || "")}" placeholder="${escapeHtml(placeholder)}" /></div>`;
}

function textarea(path, label, value) {
  return `<div class="field"><label>${label}</label><textarea data-field="${path}">${escapeHtml(value || "")}</textarea></div>`;
}

function select(path, label, options, value) {
  return `<div class="field"><label>${label}</label><select data-field="${path}">${options.map((option) => `<option ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></div>`;
}

function listRows(items, renderer, emptyText) {
  return items.length ? items.map(renderer).join("") : `<div class="empty">${emptyText}</div>`;
}

function simpleRow(title, meta) {
  return row(title, meta, "");
}

function row(title, meta, actions) {
  return `
    <div class="row">
      <div><strong>${escapeHtml(title || "Untitled")}</strong><span>${escapeHtml(meta || "")}</span></div>
      <div class="row-actions">${actions || ""}</div>
    </div>
  `;
}

function setByPath(path, value) {
  const [group, key] = path.split(".");
  if (group && key && state.forms[group]) state.forms[group][key] = value;
  if (path === "authEmail") state.authEmail = value;
  if (path === "authPassword") state.authPassword = value;
  if (path === "auditSearch") state.auditSearch = value;
}

function getClubValidationError() {
  const required = ["name", "category", "school", "description", "founderName", "founderEmail", "facultyAdvisorName", "facultyAdvisorEmail", "currentPresidentName", "currentPresidentEmail"];
  const missing = required.find((key) => !String(state.forms.club[key] || "").trim());
  if (missing) return "Fill every required club and leadership field.";
  const emails = ["founderEmail", "facultyAdvisorEmail", "currentPresidentEmail"];
  if (emails.some((key) => !isRvuEmail(state.forms.club[key]))) return "Founder, advisor, and president emails must end with @rvu.edu.in.";
  return "";
}

async function refresh() {
  state.loading = true;
  render();
  await loadAdminData();
  state.loading = false;
  render();
}

async function handleAction(action, id) {
  if (action === "login-google") {
    const user = await window.RVUFirebase.signInWithGoogle();
    await enter(user);
    return;
  }
  if (action === "sign-out") {
    await window.RVUFirebase.signOut();
    state.user = null;
    state.profile = null;
    render();
    return;
  }
  if (action === "refresh") {
    await refresh();
    return;
  }
  if (action === "approve-request" || action === "reject-request") {
    await window.RVUFirebase.updateHostRequestStatus(id, action === "approve-request" ? "approved" : "rejected");
    await refresh();
    showToast("Request updated.");
    return;
  }
  if (action === "create-club") {
    const error = getClubValidationError();
    if (error) return window.alert(error);
    const club = state.forms.club;
    await window.RVUFirebase.createClub({
      ...club,
      name: club.name.trim(),
      category: club.category.trim(),
      tagline: club.tagline.trim(),
      description: club.description.trim(),
      join: club.joinLink.trim(),
      joinLink: club.joinLink.trim(),
    });
    state.forms.club = defaultClub();
    await refresh();
    showToast("Club created.");
    return;
  }
  if (action === "update-club-profile") {
    const profile = state.forms.clubProfile;
    if (!profile.clubId) return window.alert("Choose a club first.");
    await window.RVUFirebase.updateClubProfile(profile.clubId, {
      logoUrl: profile.logoUrl.trim(),
      bannerUrl: profile.bannerUrl.trim(),
      registrationForm: profile.registrationForm.trim(),
      socials: profile.socials.split(",").map((item) => item.trim()).filter(Boolean),
      doing: profile.doing.trim(),
      highlights: profile.highlights.split(",").map((item) => item.trim()).filter(Boolean),
      joinLink: profile.registrationForm.trim(),
      registrationOpen: Boolean(profile.registrationForm.trim()),
    });
    state.forms.clubProfile = defaultClubProfile();
    await refresh();
    showToast("Club profile updated.");
    return;
  }
  if (action === "reset-club") {
    state.forms.club = defaultClub();
    render();
    return;
  }
  if (action === "club-leadership") {
    const club = state.data.allClubs.find((item) => item.id === id) || {};
    const currentPresidentName = await promptUser("Current president name", club.currentPresidentName || "");
    if (currentPresidentName == null) return;
    const currentPresidentEmail = await promptUser("Current president RVU email", club.currentPresidentEmail || "");
    if (!isRvuEmail(currentPresidentEmail)) return window.alert("President email must end with @rvu.edu.in.");
    const facultyAdvisorName = await promptUser("Faculty advisor name", club.facultyAdvisorName || "");
    if (facultyAdvisorName == null) return;
    const facultyAdvisorEmail = await promptUser("Faculty advisor RVU email", club.facultyAdvisorEmail || "");
    if (!isRvuEmail(facultyAdvisorEmail)) return window.alert("Advisor email must end with @rvu.edu.in.");
    await window.RVUFirebase.updateClubLeadership(id, { currentPresidentName, currentPresidentEmail, facultyAdvisorName, facultyAdvisorEmail });
    await window.RVUFirebase.assignClubCoreRole(id, { email: currentPresidentEmail, name: currentPresidentName, role: "president" });
    await window.RVUFirebase.assignClubCoreRole(id, { email: facultyAdvisorEmail, name: facultyAdvisorName, role: "facultyAdvisor" });
    await refresh();
    showToast("Club leadership updated.");
    return;
  }
  if (action === "club-core") {
    const email = await promptUser("Core member RVU email");
    if (!isRvuEmail(email)) return window.alert("Core email must end with @rvu.edu.in.");
    const name = await promptUser("Core member name") || email;
    const role = await promptUser("Core role") || "core";
    await window.RVUFirebase.assignClubCoreRole(id, { email, name, role });
    await refresh();
    showToast("Core role assigned.");
    return;
  }
  if (action === "remove-core") {
    const email = await promptUser("Core member RVU email to remove");
    if (!email) return;
    if (!window.confirm(`Remove ${email} from this club core?`)) return;
    await window.RVUFirebase.removeClubCoreRole(id, email);
    await refresh();
    showToast("Core role removed.");
    return;
  }
  if (action === "delete-club" || action === "delete-school" || action === "delete-event" || action === "delete-announcement" || action === "delete-project") {
    const collectionMap = {
      "delete-club": "clubs",
      "delete-school": "schools",
      "delete-event": "events",
      "delete-announcement": "announcements",
      "delete-project": "projects",
    };
    if (!window.confirm("Delete this permanently?")) return;
    await window.RVUFirebase.deleteDocument(collectionMap[action], id);
    await refresh();
    showToast("Deleted.");
    return;
  }
  if (action === "create-school") {
    const school = state.forms.school;
    if (!school.name.trim()) return window.alert("School name is required.");
    if (school.leadEmail && !isRvuEmail(school.leadEmail)) return window.alert("Lead email must end with @rvu.edu.in.");
    await window.RVUFirebase.createSchool(school);
    state.forms.school = defaultSchool();
    await refresh();
    showToast("School created.");
    return;
  }
  if (action === "grant-role") {
    const grant = state.forms.role;
    if (!grant.email && !grant.uid) return window.alert("Email or UID is required.");
    if (grant.email && !isRvuEmail(grant.email)) return window.alert("Email must end with @rvu.edu.in.");
    await window.RVUFirebase.grantPlatformRole(grant);
    state.forms.role = defaultRoleGrant();
    await refresh();
    showToast("Role updated.");
    return;
  }
  if (action === "save-settings") {
    const settings = state.forms.settings;
    await window.RVUFirebase.updateSiteSetting("platform", {
      eventCategories: settings.eventCategories.split(",").map((item) => item.trim()).filter(Boolean),
      interestTags: settings.interestTags.split(",").map((item) => item.trim()).filter(Boolean),
      announcementTags: settings.announcementTags.split(",").map((item) => item.trim()).filter(Boolean),
      bannedWords: settings.bannedWords.split(",").map((item) => item.trim()).filter(Boolean),
      reviewRequired: Boolean(settings.reviewRequired),
    });
    await refresh();
    showToast("Settings saved.");
    return;
  }
  if (action === "create-review") {
    const review = state.forms.review;
    if (!review.title.trim()) return window.alert("Review title is required.");
    await window.RVUFirebase.createContentReview(review);
    state.forms.review = defaultReview();
    await refresh();
    showToast("Review item added.");
    return;
  }
  if (action === "approve-review" || action === "reject-review") {
    await window.RVUFirebase.updateContentReviewStatus(id, action === "approve-review" ? "approved" : "rejected");
    await refresh();
    showToast("Review updated.");
    return;
  }
  if (action === "create-event") {
    const event = state.forms.event;
    if (!event.title.trim()) return window.alert("Event title is required.");
    await window.RVUFirebase.createEvent({ ...event, hostType: "admin", status: "published", tags: [] });
    state.forms.event = defaultEvent();
    await refresh();
    showToast("Event created.");
    return;
  }
  if (action === "publish-event" || action === "unpublish-event") {
    await window.RVUFirebase.updateEventStatus(id, action === "publish-event" ? "published" : "draft");
    await refresh();
    return;
  }
  if (action === "create-announcement") {
    const notice = state.forms.announcement;
    if (!notice.title.trim()) return window.alert("Announcement title is required.");
    await window.RVUFirebase.createAnnouncement({ ...notice, sourceType: "admin", time: "Just now", status: "published" });
    state.forms.announcement = defaultAnnouncement();
    await refresh();
    showToast("Notice created.");
    return;
  }
  if (action === "unpublish-announcement") {
    await window.RVUFirebase.updateAnnouncementStatus(id, "draft");
    await refresh();
    return;
  }
  if (action === "create-project") {
    const project = state.forms.project;
    if (!project.title.trim()) return window.alert("Project title is required.");
    await window.RVUFirebase.createProject({
      title: project.title,
      description: project.description,
      tags: project.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      skills: project.skills.split(",").map((skill) => skill.trim()).filter(Boolean),
      expiry: project.expiry,
      status: "open",
      score: 0,
    });
    state.forms.project = defaultProject();
    await refresh();
    showToast("Project created.");
    return;
  }
  if (action === "project-application-status") {
    const userId = await promptUser("Applicant Firebase UID");
    if (!userId) return;
    const status = await promptUser("Status: pending, accepted, rejected", "accepted") || "accepted";
    await window.RVUFirebase.updateProjectApplicationStatus(id, userId, status);
    await refresh();
    showToast("Project application updated.");
  }
  if (action === "export-users") {
    downloadCSV("rvuconnect_users.csv", state.data.allUsers);
    return;
  }
  if (action === "toggle-suspend-user") {
    const user = state.data.allUsers.find(u => u.id === id);
    if (!user) return;
    const newStatus = !user.suspended;
    if (!window.confirm(`${newStatus ? 'Suspend' : 'Unsuspend'} ${user.email || user.name}?`)) return;
    await window.RVUFirebase.toggleUserSuspension(id, newStatus);
    await refresh();
    showToast(`User ${newStatus ? 'suspended' : 'unsuspended'}.`);
    return;
  }
  if (action === "export-rsvps") {
    const rsvps = await window.RVUFirebase.getEventRSVPs(id);
    downloadCSV(`event_${id}_rsvps.csv`, rsvps);
    return;
  }
  if (action === "export-project-applicants") {
    const apps = await window.RVUFirebase.getProjectApplicants(id);
    downloadCSV(`project_${id}_applicants.csv`, apps);
    return;
  }
  if (action === "load-more-audit") {
    const res = await window.RVUFirebase.loadAuditLogs(state.auditLastDocId);
    state.data.auditLogs.push(...res.docs);
    state.auditLastDocId = res.lastDocId;
    render();
    return;
  }
  if (action === "search-audit") {
    const searchEl = document.querySelector('[data-field="auditSearch"]');
    state.auditSearch = searchEl ? searchEl.value.trim() : "";
    render();
    return;
  }
}

function bindEvents() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tab = button.dataset.tab;
      render();
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
  });
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const origPointer = button.style.pointerEvents;
      const origOpacity = button.style.opacity;
      button.style.pointerEvents = "none";
      button.style.opacity = "0.5";
      handleAction(button.dataset.action, button.dataset.id)
        .catch((error) => {
          window.alert(error.message || "Action failed.");
        })
        .finally(() => {
          button.style.pointerEvents = origPointer;
          button.style.opacity = origOpacity;
        });
    });
  });
  document.querySelectorAll("[data-field]").forEach((field) => {
    field.addEventListener("input", () => setByPath(field.dataset.field, field.value));
    field.addEventListener("change", () => setByPath(field.dataset.field, field.value));
  });
  document.querySelectorAll("[data-check]").forEach((field) => {
    field.addEventListener("change", () => {
      const [group, key] = field.dataset.check.split(".");
      state.forms[group][key] = field.checked;
    });
  });
}

window.addEventListener("rvu-auth-user", (event) => {
  if (event.detail) {
    enter(event.detail);
  } else {
    state.user = null;
    state.profile = null;
    state.loading = false;
    render();
  }
});

window.addEventListener("rvu-auth-error", (event) => {
  if (event.detail) window.alert(event.detail);
});

if (window.RVUFirebase?.auth?.currentUser) {
  enter(window.RVUFirebase.auth.currentUser);
} else {
  state.loading = false;
  render();
}
