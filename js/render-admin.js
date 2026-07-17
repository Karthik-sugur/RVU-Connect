import { state } from "./state.js";
import { activeClub, isClubCore, isSchoolRep, isSuperAdmin } from "./auth.js";
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
            <span>Can be approved by super admin</span>
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
  const canManageCore = isSuperAdmin();
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
          <span class="section-num">Apply</span>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <h2 style="margin:0;">Membership Applications</h2>
            <button style="background:none;border:1.5px solid #c8b89a;padding:4px 10px;font-size:11px;font-weight:700;color:#5a4a3a;cursor:pointer;text-transform:uppercase;" data-action="load-club-applicants" data-club="${club.id}">Refresh</button>
          </div>
          ${!state._clubApplicantsLoaded ? `
            <div style="text-align:center;padding:20px;color:#8a7a6a;font-size:13px;">Click refresh to load pending applications.</div>
          ` : state.clubApplicants.length === 0 ? `
            ${renderEmptyState("No pending applications", "Student applications for club core will appear here.")}
          ` : state.clubApplicants.map(app => `
            <div class="admin-row">
              <div>
                <strong>${escapeHtml(app.name || app.email)}</strong>
                <span>${escapeHtml(app.email)} · Applied: ${new Date(app.createdAt?.toDate ? app.createdAt.toDate() : app.createdAt).toLocaleDateString()}</span>
              </div>
              <div class="admin-row-actions">
                <button data-action="approve-club-application" data-docid="${app.id}" data-uid="${app.uid}" data-email="${app.email}" data-name="${escapeHtml(app.name || "")}" data-club="${app.clubId}">Approve</button>
                <button data-action="reject-club-application" data-docid="${app.id}">Reject</button>
              </div>
            </div>
          `).join("")}
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
        ${pending.length ? pending.map((item) => {
          const typeLabel = item.type === "schoolRepresentative" ? "School Rep" : item.type;
          return adminRow(item.name || item.email, `${typeLabel} · ${item.roleTitle || "Representative"} · ${item.email}`, ["Approve", "Reject"], "host", item.id);
        }).join("") : renderEmptyState("No pending requests", "School representative and other requests will appear here.")}
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
