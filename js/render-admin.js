import { state, events, announcements, schools, clubs, projects } from "./state.js";
import { activeClub, isClubCore, isSchoolRep, isSuperAdmin } from "./auth.js";
import { escapeHtml, selectField, inputField, clubInputField, clubSelectField, clubTextArea } from "./utils.js";
import { sectionLabel, renderEmptyState } from "./ui.js";

export function renderAdminConsole() {
  if (!isClubCore() && !isSchoolRep() && !isSuperAdmin()) return renderRestrictedAdmin();
  if ((isClubCore() || isSchoolRep()) && !state.host.approved) return renderPendingAdminAccess();
  if (isSuperAdmin()) return renderSuperAdminDashboard();

  const both = isClubCore() && isSchoolRep();
  const title = both
    ? "Host Dashboard"
    : isClubCore()
      ? "Club Core Dashboard"
      : "School Representative Dashboard";
  const copy = both
    ? "You have both club-core and school-rep access. Review club membership applications below, and post school events/notices from Create (pick a school in the form)."
    : isClubCore()
      ? "Review and accept students applying for club core on the clubs you manage. Create events and announcements from the Create button in the top bar; edit your club profile from the Clubs page."
      : "Post school events and notices from the Create button in the top bar. Pick the school for each post from the dropdown. School-rep applications are approved by Super Admin only.";

  return `
    <section class="page-head admin-head">
      ${sectionLabel("06", "Control rooms")}
      <h1>${title}</h1>
      <p>${copy}</p>
    </section>
    ${isClubCore() ? renderClubAdmin() : ""}
    ${isSchoolRep() ? renderSchoolAdmin() : ""}
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
          ${clubInputField("founderEmail", "Founder email", draft.founderEmail, "name@example.com", "email")}
          ${clubInputField("facultyAdvisorName", "Faculty advisor name", draft.facultyAdvisorName)}
          ${clubInputField("facultyAdvisorEmail", "Faculty advisor email", draft.facultyAdvisorEmail, "name@example.com", "email")}
          ${clubInputField("currentPresidentName", "Current president name", draft.currentPresidentName)}
          ${clubInputField("currentPresidentEmail", "Current president email", draft.currentPresidentEmail, "name@example.com", "email")}
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
      <h1>Admin access required</h1>
      <p>This area is for approved club core members, school representatives, and super admins.</p>
    </section>
  `;
}

export function renderPendingAdminAccess() {
  return `
    <section class="page-head admin-head">
      ${sectionLabel("06", "Pending approval")}
      <h1>Waiting for approval</h1>
      <p>Your host request is still pending. You can explore campus content, but posting stays locked until a super admin (or club core for membership apps) approves you.</p>
    </section>
    <section class="admin-workspace">
      <div class="admin-summary">
        <span><strong>${escapeHtml(state.host.type || "Host")}</strong> request</span>
        <span><strong>${escapeHtml(state.host.approver || "Super Admin")}</strong> approver route</span>
      </div>
    </section>
  `;
}

export function renderSchoolAdmin() {
  const schoolEvents = events.filter((e) => e.hostType === "school").slice(0, 5);
  const schoolNotices = announcements.filter((a) => a.sourceType === "school" || a.type === "School").slice(0, 5);
  return `
    <section class="admin-workspace">
      <div class="admin-summary">
        <span><strong>School rep</strong> — pick school per post</span>
        <span><strong>${schoolEvents.length}</strong> recent school events</span>
        <span><strong>${schoolNotices.length}</strong> recent school notices</span>
      </div>
      <div class="admin-board">
        <article class="admin-card wide">
          <span class="section-num">Post</span>
          <h2>School representative tools</h2>
          <p style="font-size:13px;color:#8a7a6a;margin:0 0 16px;">You can post events and announcements for any school using the school dropdown in Create. New school-rep applications are approved only by Super Admin (or by setting the request status to approved in Firestore).</p>
          <div class="project-actions" style="margin-bottom:18px;display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn gold" data-action="create-event" data-mode="school">Create school event</button>
            <button class="btn secondary" data-action="create-announcement" data-mode="school">Create school notice</button>
          </div>
          <h3 style="font-size:14px;margin:16px 0 8px;">Your recent school events</h3>
          ${schoolEvents.length
            ? schoolEvents.map((e) => `
              <div class="admin-row">
                <div><strong>${escapeHtml(e.title)}</strong><span>${escapeHtml(e.schoolName || e.schoolId || e.host || "")} · ${escapeHtml(e.date || "")}</span></div>
                <div class="admin-row-actions">
                  <button data-action="open-edit-event" data-docid="${e.id}">Edit</button>
                  <button data-action="delete-school-event" data-docid="${e.id}">Delete</button>
                </div>
              </div>`).join("")
            : renderEmptyState("No school events yet", "Create one from the button above.")}
          <h3 style="font-size:14px;margin:24px 0 8px;">Your recent school notices</h3>
          ${schoolNotices.length
            ? schoolNotices.map((a) => `
              <div class="admin-row">
                <div><strong>${escapeHtml(a.title)}</strong><span>${escapeHtml(a.schoolName || a.source || "")}</span></div>
                <div class="admin-row-actions">
                  <button data-action="edit-announcement" data-docid="${a.id}">Edit</button>
                  <button data-action="delete-school-announcement" data-docid="${a.id}">Delete</button>
                </div>
              </div>`).join("")
            : renderEmptyState("No school notices yet", "Create one from the button above.")}
        </article>
      </div>
    </section>
  `;
}

export function renderClubAdmin() {
  const accesses = (state.host.clubAccesses && state.host.clubAccesses.length)
    ? state.host.clubAccesses
    : [{ club: activeClub() }];
  const clubNames = accesses.map((access) => access.club?.name).filter(Boolean).join(", ");
  const applicants = state.clubApplicants || [];

  return `
    <section class="admin-workspace">
      <div class="admin-summary">
        <span><strong>${accesses.length}</strong> club${accesses.length === 1 ? "" : "s"} you manage</span>
        <span><strong>${applicants.length}</strong> pending applicant${applicants.length === 1 ? "" : "s"}</span>
      </div>
      <div class="admin-board">
        <article class="admin-card wide">
          <span class="section-num">Apply</span>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:12px;flex-wrap:wrap;">
            <div>
              <h2 style="margin:0;">Membership Applications</h2>
              <p style="margin:8px 0 0;font-size:13px;color:#8a7a6a;">Review students applying for club core on ${escapeHtml(clubNames || "your club")}. Club founders and every approved core member can accept or reject applicants.</p>
            </div>
            <button style="background:none;border:1.5px solid #c8b89a;padding:4px 10px;font-size:11px;font-weight:700;color:#5a4a3a;cursor:pointer;text-transform:uppercase;" data-action="load-club-applicants">Refresh</button>
          </div>
          ${state._clubApplicantsLoading ? `
            <div style="text-align:center;padding:20px;color:#8a7a6a;font-size:13px;">Loading applications…</div>
          ` : !state._clubApplicantsLoaded ? `
            <div style="text-align:center;padding:20px;color:#8a7a6a;font-size:13px;">Loading applications…</div>
          ` : applicants.length === 0 ? `
            ${renderEmptyState("No pending applications", "When students apply to your club, they will appear here for you to approve or reject.")}
          ` : applicants.map(app => {
            const clubLabel = accesses.find((access) => (access.club?.id || access.club?.slug) === app.clubId)?.club?.name || app.clubId;
            const appliedAt = app.createdAt?.toDate ? app.createdAt.toDate() : (app.createdAt ? new Date(app.createdAt) : null);
            return `
            <div class="admin-row">
              <div>
                <strong>${escapeHtml(app.name || app.email)}</strong>
                <span>${escapeHtml(app.email)} · ${escapeHtml(clubLabel || "Club")}${appliedAt && !Number.isNaN(appliedAt.getTime()) ? ` · Applied: ${appliedAt.toLocaleDateString()}` : ""}</span>
              </div>
              <div class="admin-row-actions">
                <button data-action="approve-club-application" data-docid="${app.id}" data-uid="${app.uid || ""}" data-email="${escapeHtml(app.email || "")}" data-name="${escapeHtml(app.name || "")}" data-club="${app.clubId}">Approve</button>
                <button data-action="reject-club-application" data-docid="${app.id}">Reject</button>
              </div>
            </div>`;
          }).join("")}
        </article>
        ${renderManagedClubRosters(accesses)}
      </div>
    </section>
  `;
}

function renderManagedClubRosters(accesses) {
  const myEmail = (state.authUser?.email || "").trim().toLowerCase();
  const rosters = state.managedClubMembers || {};

  return `
    <article class="admin-card wide">
      <span class="section-num">Team</span>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:12px;flex-wrap:wrap;">
        <div>
          <h2 style="margin:0;">Club core team</h2>
          <p style="margin:8px 0 0;font-size:13px;color:#8a7a6a;">Current approved core members. Any approved core member of a club can remove another member of that same club.</p>
        </div>
        <button style="background:none;border:1.5px solid #c8b89a;padding:4px 10px;font-size:11px;font-weight:700;color:#5a4a3a;cursor:pointer;text-transform:uppercase;" data-action="load-club-rosters">Refresh</button>
      </div>
      ${state._managedClubMembersLoading
        ? `<div style="text-align:center;padding:20px;color:#8a7a6a;font-size:13px;">Loading core team…</div>`
        : accesses.map((access) => {
          const club = access.club || {};
          const clubId = club.id || club.slug || "";
          const members = rosters[clubId] || [];
          return `
            <h3 style="font-size:13px;margin:18px 0 8px;text-transform:uppercase;letter-spacing:0.08em;color:#5a4a3a;">${escapeHtml(club.name || "Club")} <small style="color:#8a7a6a;font-weight:600;">(${members.length})</small></h3>
            ${members.length ? members.map((member) => {
              const email = (member.email || member.id || "").trim().toLowerCase();
              const isSelf = email && email === myEmail;
              const canRemove = email && !isSelf && !member.permanent;
              return `
                <div class="admin-row">
                  <div>
                    <strong>${escapeHtml(member.name || email || "Core member")}</strong>
                    <span>${escapeHtml(email)}${member.role ? ` · ${escapeHtml(member.role)}` : ""}${member.permanent ? " · Founder" : ""}</span>
                  </div>
                  ${canRemove
                    ? `<div class="admin-row-actions"><button data-action="remove-club-core-member" data-club="${escapeHtml(clubId)}" data-email="${escapeHtml(email)}" data-name="${escapeHtml(member.name || email)}">Remove</button></div>`
                    : (isSelf ? `<span class="tag">You</span>` : "")}
                </div>`;
            }).join("") : `<p style="font-size:13px;color:#8a7a6a;margin:0 0 8px;">No approved core members listed for this club yet.</p>`}
          `;
        }).join("")}
    </article>
  `;
}

export function renderSuperAdmin() {
  const clubApps = state.clubApplicants || [];
  const tabs = [
    ["requests", "Requests", state.hostRequests.filter((r) => r.status === "pending").length + clubApps.length],
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
        <h2>Host &amp; club requests</h2>
        <p style="font-size:13px;color:#8a7a6a;margin:0 0 16px;">School-rep and new-club requests must be approved here (or set <code>status</code> to <code>approved</code> in Firestore for school-rep only). New clubs still need the Approve button so the club document is created. Club membership apps for clubs with no core team also appear below.</p>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          <button style="background:none;border:1.5px solid #c8b89a;padding:4px 10px;font-size:11px;font-weight:700;color:#5a4a3a;cursor:pointer;text-transform:uppercase;" data-action="repair-school-rep-grants" title="One-time migrate old school-rep accounts. Not needed for new approvals.">Migrate old school-rep grants</button>
          <button style="background:none;border:1.5px solid #c8b89a;padding:4px 10px;font-size:11px;font-weight:700;color:#5a4a3a;cursor:pointer;text-transform:uppercase;" data-action="load-all-club-applicants">Refresh club apps</button>
        </div>
        ${pending.length ? pending.map((item) => {
          const typeLabel = item.type === "schoolRepresentative" ? "School Rep" : item.type === "newClub" ? "New Club" : item.type;
          const extra = item.type === "schoolRepresentative"
            ? `${item.description ? ` · ${escapeHtml(item.description)}` : ""}${item.deanDiscussed != null ? ` · Dean discussed: ${item.deanDiscussed ? "Yes" : "No"}` : ""}`
            : item.type === "newClub"
              ? ` · ${escapeHtml(item.clubName || "")}`
              : "";
          return adminRow(item.name || item.email, `${typeLabel} · ${item.roleTitle || "Representative"} · ${item.email || ""}${extra}`, ["Approve", "Reject"], "host", item.id);
        }).join("") : renderEmptyState("No pending host requests", "School representative and new club requests will appear here.")}
        <h3 style="font-size:14px;margin:24px 0 8px;">Pending club membership applications</h3>
        ${clubApps.length ? clubApps.map((app) => {
          const clubLabel = (state.allClubs || clubs).find((c) => c.id === app.clubId || c.slug === app.clubId)?.name || app.clubId;
          return `
            <div class="admin-row">
              <div>
                <strong>${escapeHtml(app.name || app.email)}</strong>
                <span>${escapeHtml(app.email || "")} · Club: ${escapeHtml(clubLabel || "")}</span>
              </div>
              <div class="admin-row-actions">
                <button data-action="approve-club-application" data-docid="${app.id}" data-uid="${app.uid || ""}" data-email="${escapeHtml(app.email || "")}" data-name="${escapeHtml(app.name || "")}" data-club="${app.clubId}">Approve</button>
                <button data-action="reject-club-application" data-docid="${app.id}">Reject</button>
              </div>
            </div>`;
        }).join("") : renderEmptyState("No pending club applications", "Membership applications appear here for super-admin review when needed.")}
      </article>
      <article class="admin-card">
        <span class="section-num">History</span>
        <h2>Resolved host requests</h2>
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
        <span class="section-num">Schools</span>
        <h2>School registry</h2>
        <div class="project-actions" style="margin-bottom:18px">
          <button class="btn gold" data-action="admin-create-school">Add school</button>
        </div>
        ${schoolRows.map((school) => `
          <div class="admin-row">
            <div>
              <strong>${escapeHtml(school.name || school.id)}</strong>
              <span>${escapeHtml(school.description || school.status || "")}</span>
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
        <span class="section-num">Events</span>
        <h2>All events</h2>
        ${(state.allEvents || []).length ? state.allEvents.map((e) => `
          <div class="admin-row">
            <div><strong>${escapeHtml(e.title)}</strong><span>${escapeHtml(e.status || "")} · ${escapeHtml(e.host || e.club || "")}</span></div>
            <div class="admin-row-actions">
              <button data-action="admin-publish-event" data-docid="${e.id}">Publish</button>
              <button data-action="admin-unpublish-event" data-docid="${e.id}">Unpublish</button>
              <button data-action="admin-delete-event" data-docid="${e.id}">Delete</button>
            </div>
          </div>
        `).join("") : renderEmptyState("No events", "Events will appear here.")}
      </article>
    `;
  }

  if (state.adminTab === "announcements") {
    content = `
      <article class="admin-card wide">
        <span class="section-num">Notices</span>
        <h2>All announcements</h2>
        ${(state.allAnnouncements || []).length ? state.allAnnouncements.map((a) => `
          <div class="admin-row">
            <div><strong>${escapeHtml(a.title)}</strong><span>${escapeHtml(a.status || "")} · ${escapeHtml(a.source || "")}</span></div>
            <div class="admin-row-actions">
              <button data-action="admin-unpublish-announcement" data-docid="${a.id}">Unpublish</button>
              <button data-action="admin-delete-announcement" data-docid="${a.id}">Delete</button>
            </div>
          </div>
        `).join("") : renderEmptyState("No announcements", "Announcements will appear here.")}
      </article>
    `;
  }

  if (state.adminTab === "projects") {
    content = `
      <article class="admin-card wide">
        <span class="section-num">Projects</span>
        <h2>All projects</h2>
        ${projects.length ? projects.map((p) => `
          <div class="admin-row">
            <div><strong>${escapeHtml(p.title)}</strong><span>${escapeHtml(p.status || "")} · ${escapeHtml(p.postedBy || "")}</span></div>
            <div class="admin-row-actions">
              <button data-action="admin-delete-project" data-docid="${p.id}">Delete</button>
            </div>
          </div>
        `).join("") : renderEmptyState("No projects", "Student projects will appear here.")}
      </article>
    `;
  }

  if (state.adminTab === "moderation") {
    content = `
      <article class="admin-card wide">
        <span class="section-num">Flags</span>
        <h2>Moderation flags</h2>
        ${state.moderationFlags.length ? state.moderationFlags.map((item) =>
          `<div class="admin-row"><div><strong>${item.title || item.reason || "Flag"}</strong><span>${escapeHtml(item.collection || "Content")} · ${escapeHtml(item.status || "Open")}</span></div></div>`
        ).join("") : renderEmptyState("No flags", "Reported content will appear here.")}
      </article>
    `;
  }

  return `
    <section class="admin-workspace">
      <div class="admin-summary">
        <span><strong>${state.hostRequests.filter((r) => r.status === "pending").length}</strong> pending host requests</span>
        <span><strong>${clubApps.length}</strong> pending club apps</span>
      </div>
      ${tabBar}
      <div class="admin-board">${content}</div>
    </section>
  `;
}

function adminRow(title, meta, actions, mode, id) {
  return `
    <div class="admin-row">
      <div>
        <strong>${escapeHtml(title || "")}</strong>
        <span>${meta || ""}</span>
      </div>
      <div class="admin-row-actions">
        ${actions.map((action) => {
          const dataAction = mode === "host" && action === "Approve" ? "approve-host" : mode === "host" && action === "Reject" ? "reject-host" : "toast";
          return `<button data-action="${dataAction}" data-request="${id || ""}">${action}</button>`;
        }).join("")}
      </div>
    </div>
  `;
}
