import { state } from "./state.js";
import { activeClub } from "./auth.js";
import { escapeHtml, selectField, inputField } from "./utils.js";
import { sectionLabel, renderEmptyState } from "./ui.js";

export function renderAdminConsole() {
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

export function renderSuperAdminDashboard() {
  return `
    <section class="page-head admin-head">
      ${sectionLabel("06", "Platform authority")}
      <h1>Super Admin Dashboard</h1>
      <p>Super admin access is granted by the Firestore user role or a locked superAdmins credential document. From here you review representative requests, moderate content, and maintain platform registries.</p>
    </section>
    ${renderSuperAdmin()}
  `;
}

export function renderCreateClubPage() {
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

export function renderRestrictedAdmin() {
  return `
    <section class="page-head admin-head">
      ${sectionLabel("06", "Restricted")}
      <h1>Admin access</h1>
      <p>Admin screens are only available when your Firestore profile or approved representative record grants access. Students cannot switch themselves into admin roles from the client.</p>
    </section>
  `;
}

export function renderPendingAdminAccess() {
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

export function renderSchoolAdmin() {
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
          ${announcements.filter((item) => item.sourceType === "school" || item.type === "Faculty").slice(0, 3).map((item) => adminRow(item.title, `${escapeHtml(item.source || "School")} · ${escapeHtml(item.tag || "Update")}`, ["Edit", "Archive"])).join("") || renderEmptyState("No school announcements", "Published school announcements will appear here.")}
        </article>
        <article class="admin-card">
          <span class="section-num">Events</span>
          <h2>Event controls</h2>
          ${schoolEvents.slice(0, 3).map((event) => adminRow(event.title, `${event.host || "School"} · ${event.date || ""} · ${escapeHtml(event.location || "")}`, ["Edit", "Archive"])).join("") || renderEmptyState("No school events", "Create a school event to see it here.")}
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

export function renderClubAdmin() {
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
          <h2>${escapeHtml(club.name)}</h2>
          <p>Only approved core members can host events, publish announcements, and control the links shown for ${escapeHtml(club.name)}.</p>
          <div class="project-actions">
            <button class="btn gold" data-action="create-event">Create club event</button>
            <button class="btn secondary" data-action="create-announcement">Create update</button>
            <button class="btn gold" data-action="toggle-registration" data-club="${club.slug}">${club.registrationOpen ? "Close registration" : "Open registration"}</button>
            <button class="btn secondary" data-action="toast" data-message="Link visibility controls are ready for ${escapeHtml(club.name)}.">Manage links</button>
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
          ${[...clubEvents.map((event) => ({ title: event.title, meta: `Event · ${event.date || ""}` })), ...clubAnnouncements.map((item) => ({ title: item.title, meta: `Announcement · ${escapeHtml(item.tag || "Update")}` }))].slice(0, 4).map((item) => adminRow(item.title, item.meta, ["Edit", "Archive"])).join("") || renderEmptyState("No club posts", "Create an event or announcement to manage it here.")}
        </article>
        <article class="admin-card">
          <span class="section-num">Core</span>
          <h2>Core approval</h2>
          ${canManageCore ? `<div class="project-actions" style="margin-bottom:18px">
            <button class="btn gold" data-action="club-update-leadership" data-docid="${club.id || club.slug}">Update leadership</button>
            <button class="btn gold" data-action="club-assign-core" data-docid="${club.id || club.slug}">Assign core role</button>
            <button class="btn secondary" data-action="club-remove-core" data-docid="${club.id || club.slug}">Remove core role</button>
          </div>` : ""}
          ${state.hostRequests.filter((item) => item.type === "clubCore" && item.clubId === (club.id || club.slug)).map((item) => adminRow(item.name || item.email, `${item.roleTitle || "Core"} · ${escapeHtml(item.status)}`, item.status === "pending" ? ["Approve", "Reject"] : [], "host", item.id)).join("") || renderEmptyState("No core requests", "Club core requests will appear here after students apply.")}
        </article>
        <article class="admin-card">
          <span class="section-num">Limits</span>
          <h2>Permission boundary</h2>
          <div class="admin-checklist">
            <span>Can host only for ${escapeHtml(club.name)}</span>
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

export function renderSuperAdmin() {
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
          `<div class="admin-row"><div><strong>${item.name || item.email}</strong><span>${item.type} · ${escapeHtml(item.status)}</span></div></div>`
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
              <strong>${escapeHtml(c.name)}</strong>
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
              <strong>${escapeHtml(school.name)}</strong>
              <span>${school.shortName || "RVU"} · ${escapeHtml(school.description || "School workspace")} · Status: ${escapeHtml(school.status || "active")}</span>
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
              <strong>${escapeHtml(e.title)}</strong>
              <span>${e.host || e.club || "RVU"} · ${e.date || "No date"} · Status: ${escapeHtml(e.status || "unknown")}</span>
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
              <strong>${escapeHtml(a.title)}</strong>
              <span>${escapeHtml(a.source || "RVU")} · ${escapeHtml(a.tag || "Update")} · Status: ${escapeHtml(a.status || "unknown")}</span>
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
              <strong>${escapeHtml(p.title)}</strong>
              <span>${(p.tags || []).join(", ") || "No tags"} · Status: ${escapeHtml(p.status || "open")} · Owner: ${p.ownerId || "Super admin"}</span>
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
          `<div class="admin-row"><div><strong>${item.title || item.reason || "Flag"}</strong><span>${escapeHtml(item.collection || "Content")} · ${escapeHtml(item.status || "Open")}</span></div></div>`
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

export function adminRow(title, meta, actions, mode = "generic", id = "") {
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

export function renderEventCard(event) {
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

export function renderPersonalCard(item) {
  if (item.time) return renderEventCard(item);
  return renderProjectCard(item);
}

export function renderUpdate(item) {
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

export function quickCard(route, title, copy, iconName) {
  return `<button class="quick-card" data-route="${route}">${icon(iconName)}<span><strong>${title}</strong><br>${copy}</span></button>`;
}

export function renderClubCard(club) {
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

export function renderProjectCard(project) {
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
            data-status="${escapeHtml(project.status)}">
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

export function renderAnnouncement(item) {
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

export function renderOnboarding() {
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
    const clubOptions = clubs.length ? clubs.map((club) => ({ id: club.id || club.slug, name: club.name })) : [];
    return `
      <div class="modal-layer">
        <section class="modal">
          <p class="eyebrow">${isClubRequest ? "Club core request" : "School representative request"}</p>
          <h2>${isClubRequest ? "Which club are you core in?" : "Which school do you represent?"}</h2>
          
          ${isClubRequest ? `
            <div style="margin-bottom:16px;">
              ${clubOptions.length ? multiSelectField("hostClubs", "Select Clubs", clubOptions, state.host.selectedClubIds) : "<p style='font-size:14px;color:#8a7a6a;margin-bottom:16px;'>No approved clubs available.</p>"}
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                <div style="flex:1;height:1.5px;background:#e8e0d4;"></div>
                <span style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;">OR</span>
                <div style="flex:1;height:1.5px;background:#e8e0d4;"></div>
              </div>
              <!-- <button class="btn secondary" style="width:100%;margin-bottom:16px;" data-action="create-new-club-onboarding">Create a New Club Instead</button> -->
              <p style="font-size:12px;color:#8a7a6a;text-align:center;font-family:inherit;">Note: New club creation is temporarily disabled. Select an existing club.</p>
            </div>
            <div class="form-grid two">
              ${inputField("hostRoleTitle", "Role (for selected clubs)", state.host.roleTitle)}
              ${inputField("hostName", "Core display name", state.host.name)}
            </div>
          ` : `
            <div class="form-grid two">
              ${selectField("hostSchool", "School", schools, state.host.school)}
              ${inputField("hostRoleTitle", "Role", state.host.roleTitle)}
            </div>
            <div class="form-grid">
              ${inputField("hostName", "Office / representative name", state.host.name)}
            </div>
          `}
          
          <div class="form-grid">
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
            
            ${isClubRequest ? "" : `
              ${inputField("hostEmail", "Contact Email", state.host.email)}
              ${selectField("hostApprover", "Approval route", ["Super Admin"], "Super Admin")}
              <div class="field"><label>Description</label><textarea data-input="hostDescription">${state.host.description}</textarea></div>
              ${inputField("hostJoin", "Join Link optional", state.host.joinLink)}
            `}
          </div>
          <button class="btn gold" data-action="submit-host">${isClubRequest ? "Submit request" : "Submit for review"}</button>
        </section>
      </div>
    `;
  }
  
  if (state.onboardingStep === "create-club") {
    return `
      <div class="modal-layer">
        <section class="modal">
          <p class="eyebrow">New Club Creation</p>
          <h2>Create a new club</h2>
          <div class="form-grid two">
            ${clubInputField("name", "Club Name", state.clubDraft.name, "e.g. Code Club")}
            ${clubInputField("category", "Category", state.clubDraft.category, "e.g. Technical")}
          </div>
          <div class="form-grid">
            <div class="field" style="margin-bottom:16px;">
              <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">School Affiliation</label>
              <select data-club-input="school" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;">
                ${schools.map((school) => `<option value="${school}" ${state.clubDraft.school === school ? "selected" : ""}>${school}</option>`).join("")}
              </select>
            </div>
            ${clubInputField("tagline", "Tagline", state.clubDraft.tagline, "Short, catchy description")}
            <div class="field" style="margin-bottom:16px;">
              <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Description</label>
              <textarea data-club-input="description" placeholder="What is this club about?" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;resize:vertical;min-height:80px;">${escapeHtml(state.clubDraft.description || "")}</textarea>
            </div>
            ${clubInputField("founderRole", "Your Role", state.clubDraft.founderRole || "President", "e.g. President, Founder")}
          </div>
          <div style="display:flex;gap:12px;margin-top:16px;">
            <button class="btn gold" style="flex:1;" data-action="submit-new-club">Submit for Approval</button>
            <button class="btn secondary" data-action="back-to-host-info">Back</button>
          </div>
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

