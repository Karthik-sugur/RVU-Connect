import { icon, multiSelectField, selectField, inputField, clubInputField, clubSelectField, clubTextArea, unique, escapeHtml } from './utils.js';
import { schools, interests, events, clubs, announcements, projects, state, app } from './state.js';
import { isClubCore, isSchoolRep, isSuperAdmin, canHost, roleLabel, activeClub } from './auth.js';
import { bindEvents } from './main.js';
import { renderAdminConsole } from './render-admin.js';

export function render() {
  try {
    app.innerHTML = state.authed ? renderAppShell() : renderLanding();
    bindEvents();
  } catch (err) {
    console.error("Render Error:", err);
    app.innerHTML = `<div style="padding:40px; text-align:center;">
      <h2 style="color:#d93025; font-family:inherit;">Something went wrong</h2>
      <p style="color:#666; font-family:inherit;">${err.message}</p>
      <button onclick="window.location.reload()" style="padding:10px 20px; background:#d4af37; border:none; border-radius:4px; margin-top:20px; cursor:pointer; color:#1d1a16; font-weight:600;">Reload App</button>
    </div>`;
  }
}

export function renderAtTop() {
  render();
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

export function renderCreateEventModal() {
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

          ${isClubCore() && state.host.clubAccesses && state.host.clubAccesses.length > 1 ? `
          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Hosting Club *</label>
            <select id="ce-host-club" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;">
              ${state.host.clubAccesses.map(access => `<option value="${access.club.id || access.club.slug}">${escapeHtml(access.club.name)}</option>`).join("")}
            </select>
          </div>` : (myClub ? `
          <div style="background:#e8e0d4;padding:10px 14px;margin-bottom:20px;border-left:3px solid #D7AC54;">
            <p style="font-size:12px;font-weight:600;color:#5a4a3a;margin:0;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;">Posting as ${escapeHtml(myClub.name)}</p>
          </div>` : "")}

          ${isSchoolRep() ? `
          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">School *</label>
            <select id="ce-host-school" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;">
              ${schools.map(s => `<option value="${escapeHtml(s)}" ${state.host.school === s ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}
            </select>
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
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Registration / External Link </label>
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

export function renderEditEventModal() {
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
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">External Link</label>
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

export function renderCreateAnnouncementModal() {
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

          ${isSchoolRep() ? `
          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">School *</label>
            <select id="ca-host-school" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;">
              ${schools.map(s => `<option value="${escapeHtml(s)}" ${state.host.school === s ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}
            </select>
          </div>` : ""}

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

export function renderLanding() {
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
          <button class="btn gold" data-action="login-google">Continue with Google</button>
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

export function renderAuthModal() {
  return `
    <div class="modal-layer">
      <section class="modal auth-modal">
        <p class="eyebrow">RVU account</p>
        <h2>Sign in</h2>
        <p>Use your RVU email to continue. Role selection happens after authentication.</p>
        <div class="auth-actions" style="margin-top:24px;">
          <button class="btn gold" style="width:100%;" data-action="login-google">Continue with Google</button>
          <button class="btn ghost" style="width:100%;" data-action="close-login">Cancel</button>
        </div>
      </section>
    </div>
  `;
}

export function renderAppShell() {
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

export function renderFooter() {
  return `
    <footer class="site-footer">
      ${renderIteriumFooterContent()}
    </footer>
  `;
}

export function renderIteriumFooterContent() {
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

export function renderSearchResultsHtml() {
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

export function renderSearchOverlay() {
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

export function renderTicker() {
  const items = ["THIS WEEK AT RVU", "AI BUILD NIGHT", "CLUB RECRUITMENT", "PROJECT COLLABORATION", "IMPORTANT UPDATES"];
  const ticker = [...items, ...items].map((item) => `<span>${item}</span>`).join("");
  return `<div class="ticker" aria-hidden="true"><div>${ticker}</div></div>`;
}

export function brandLockup() {
  const sizeClass = arguments[0] === "large" ? " large" : "";
  return `
    <div class="brand-lockup${sizeClass}">
      <img class="brand-logo" src="./assets/rv-university-logo-gold.png" alt="RV University" />
    </div>
  `;
}

export function navButtons(withIcons) {
  const items = [
    ["home", "Home", "home"],
    ["events", "Events", "calendar"],
    ["clubs", "Clubs", "clubs"],
    ["projects", "Projects", "projects"],
    ["announcements", withIcons ? "Updates" : "Announcements", "announce"],
  ];
  let pendingCount = 0;
  if (isSuperAdmin()) {
    pendingCount = state.hostRequests.filter(r => r.status === "pending").length;
  } else if (isClubCore() && state.host.approved) {
    const activeClubIds = (state.host.clubAccesses || []).map(a => a.club.id || a.club.slug);
    pendingCount = state.hostRequests.filter(r => r.type === "clubCore" && r.status === "pending" && activeClubIds.includes(r.clubId)).length;
  }
  const badge = pendingCount > 0 ? `<span style="background:#e44;color:#fff;border-radius:50%;padding:2px 6px;font-size:10px;margin-left:6px;font-weight:bold;">${pendingCount}</span>` : "";

  if (isClubCore() || isSchoolRep()) {
    items.push(["admin", `Admin${badge}`, "admin"]);
  }
  items.push(["profile", "Profile", "user"]);
  return items.map(([route, label, iconName]) => `
    <button class="${withIcons ? "nav-item" : ""} ${state.route === route ? "active" : ""}" data-route="${route}">
      ${withIcons ? icon(iconName) : ""}<span>${label}</span>
    </button>
  `).join("");
}

export function createButton() {
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

export function renderRoute() {
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

export function renderLoadingState() {
  return `
    <section class="page-head">
      ${sectionLabel("00", "Loading")}
      <div style="height:32px; width:250px; background:#e8e0d4; border-radius:4px; margin: 16px 0; animation: pulse 1.5s infinite;"></div>
      <div style="height:20px; width:80%; background:#e8e0d4; border-radius:4px; animation: pulse 1.5s infinite;"></div>
    </section>
    <div style="display: flex; flex-direction: column; gap: 20px; padding: 20px;">
      <div style="height:150px; width:100%; background:#e8e0d4; border-radius:8px; animation: pulse 1.5s infinite;"></div>
      <div style="height:150px; width:100%; background:#e8e0d4; border-radius:8px; animation: pulse 1.5s infinite;"></div>
      <div style="height:150px; width:100%; background:#e8e0d4; border-radius:8px; animation: pulse 1.5s infinite;"></div>
    </div>
    <style>
      @keyframes pulse {
        0% { opacity: 0.6; }
        50% { opacity: 0.3; }
        100% { opacity: 0.6; }
      }
    </style>
  `;
}

export function renderEmptyState(title, copy, action = "") {
  return `
    <article class="card announcement empty-state">
      <h3>${title}</h3>
      <p>${copy}</p>
      ${action}
    </article>
  `;
}

export function renderHome() {
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
            <h2>${escapeHtml(nextEvent.title)}</h2>
            <p>${escapeHtml(nextEvent.description)}</p>
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

export function renderEvents() {
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
      ${selectField("eventType", "Type", ["All", "Club Event", "School Event"], state.filters.eventType)}
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
      <div style="text-align:center; margin-top: 30px;"><button class="btn secondary" data-action="load-more" data-collection="events">Load More</button></div>
    </section>
  `;
}

export function renderEventDetail() {
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

export function renderClubs() {
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

export function renderClubDetail() {
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
        <h1>${escapeHtml(club.name)}</h1>
        <p>${escapeHtml(club.tagline)}</p>
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
        <p>${escapeHtml(club.description)}</p>
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

export function renderEditAnnouncementModal() {
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

export function renderCreateProjectModal() {
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
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Project Deadline</label>
            <input id="cp-expiry" type="date" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
          </div>

          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">External Application Link <span style="font-weight:400;text-transform:none;">(optional)</span></label>
            <input id="cp-applink" type="url" placeholder="https://forms.google.com/ · Typeform · Notion · Airtable · Any URL" style="width:100%;border:1.5px solid #c8b89a;background:transparent;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;" />
            <p style="font-size:10px;color:#8a7a6a;margin:6px 0 0;font-family:inherit;">When provided, a prominent "Apply / Join Project" button appears on your listing.</p>
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

export function renderProjects() {
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
    <div style="text-align:center; margin-top: 30px;"><button class="btn secondary" data-action="load-more" data-collection="projects">Load More</button></div>
    ${state.createProjectOpen ? renderCreateProjectModal() : ""}
  `;
}

export function renderProjectDetail() {
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
            ${project.applicationLink ? `
              <a href="${escapeHtml(project.applicationLink)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#D7AC54;color:#1a1a1a;padding:12px 28px;font-size:12px;font-weight:800;font-family:inherit;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;">Apply / Join Project ↗</a>
            ` : `
              <div style="background:#f0ece4;border-left:3px solid #D7AC54;padding:12px 16px;flex:1;">
                <p style="font-size:13px;color:#5a4a3a;margin:0;font-family:inherit;font-weight:600;">Contact the owner directly to collaborate.</p>
              </div>
            `}
            <button style="background:none;border:1.5px solid #c8b89a;color:#5a4a3a;padding:12px 18px;font-size:12px;font-weight:700;font-family:inherit;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;" data-action="save-item" data-docid="${project.id}" data-kind="project" data-title="${escapeHtml(project.title)}">Save</button>
          </div>` : `
          <div style="background:#f0ece4;padding:12px 16px;margin-bottom:16px;border-left:3px solid #c8b89a;">
            <p style="font-size:13px;color:#8a7a6a;margin:0;font-family:inherit;font-weight:600;">This project is no longer accepting collaborators.</p>
          </div>`}

        ${isMyProject ? `
          <div style="display:flex;gap:8px;padding-top:16px;border-top:1px solid #e8e0d4;">
            <button style="background:none;border:1.5px solid #c8b89a;padding:8px 16px;font-size:11px;font-weight:700;color:#5a4a3a;cursor:pointer;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;" data-action="toggle-project-status" data-docid="${project.id}" data-status="${escapeHtml(project.status)}">${isOpen ? "Close Project" : "Reopen"}</button>
            <button style="background:none;border:1.5px solid #c8b89a;padding:8px 16px;font-size:11px;font-weight:700;color:#a09080;cursor:pointer;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;" data-action="delete-own-project" data-docid="${project.id}" data-title="${escapeHtml(project.title)}">Delete</button>
          </div>` : ""}

      </div>
    </div>
  `;
}

export function renderAnnouncements() {
  if (state.selectedAnnouncementId) return renderAnnouncementDetail();
  const filtered = announcements.filter((item) => state.filters.announcementType === "All" || item.type === state.filters.announcementType);
  return `
    <section class="page-head">
      ${sectionLabel("05", "Structured updates")}
      <h1>Announcements</h1>
      <p>Posts for recruitment, notices, registration updates, and internal information. No comments, upvotes, or social clutter.</p>
    </section>
    <div class="filters">
      ${selectField("announcementType", "Source Type", ["All", "Club", "School"], state.filters.announcementType)}
      ${selectField("announcementTag", "Tag", ["All", "Recruitment", "Notice", "Update"], "All")}
    </div>
    ${filtered.length ? `<div class="updates">${filtered.map(renderAnnouncement).join("")}</div>` : renderEmptyState("No announcements yet", "Approved clubs and school representatives can publish structured updates.")}
    <div style="text-align:center; margin-top: 30px;"><button class="btn secondary" data-action="load-more" data-collection="announcements">Load More</button></div>
  `;
}

export function renderAnnouncementDetail() {
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

export function renderProfile() {
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
          <button style="background:none;border:1.5px solid #c8b89a;padding:4px 12px;font-size:12px;color:#5a4a3a;cursor:pointer;font-family:inherit;" data-action="open-club" data-club="${c.clubId || ""}">View →</button>
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


  const clubAppsContent = state.clubApplications.length
    ? state.clubApplications.map(a => {
      const club = clubs.find(c => c.id === a.clubId) || { name: "Unknown Club" };
      const b = badge(a.status || "pending", a.status === "approved" ? "#2a7a4a" : a.status === "rejected" ? "#dc2626" : "#8a7a6a");
      const withdrawBtn = a.status === "pending"
        ? `<button style="background:none;border:none;color:#dc2626;font-size:11px;font-weight:700;text-transform:uppercase;cursor:pointer;margin-left:12px;font-family:inherit;" data-action="withdraw-club-application" data-docid="${a.id}">Withdraw</button>`
        : "";
      return listRow(
        `<p style="font-size:14px;font-weight:600;color:#1a1a1a;margin:0;font-family:inherit;">${escapeHtml(club.name)}</p>`,
        `<div style="display:flex;align-items:center;">${b}${withdrawBtn}</div>`
      );
    }).join("")
    : `<p style="font-size:13px;color:#8a7a6a;margin:0;padding:8px 0;">No club applications yet.</p>`;

  const savedContent = state.savedItems.length
    ? state.savedItems.map(s => {
      const typeColor = s.type === "event" ? "#D7AC54" : s.type === "project" ? "#6a5acd" : "#3a8a9a";
      return listRow(
        `<div style="display:flex;align-items:center;gap:10px;">
            ${badge(s.type || "item", typeColor)}
            <p style="font-size:14px;font-weight:500;color:#1a1a1a;margin:0;font-family:inherit;">${escapeHtml(s.title || "Saved")}</p>
          </div>`,
        `<button style="background:none;border:1.5px solid #c8b89a;border-radius:0;padding:3px 12px;font-size:12px;color:#5a4a3a;cursor:pointer;font-family:inherit;" data-action="open-${s.type}-detail" data-docid="${s.itemId || ""}">View →</button>`
      );
    }).join("")
    : `<p style="font-size:13px;color:#8a7a6a;margin:0;padding:8px 0;">Nothing saved yet.</p>`;

  const recentActivity = [
    ...state.rsvps.slice(0, 2).map(r => ({
      type: "rsvp",
      text: `You RSVPed to ${escapeHtml(r.title || "an event")}`,
      status: r.status || "going",
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
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
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
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${(state.clubApplications.filter(a => a.status === 'pending').length < 5) ? `
            <button style="background:none;border:1.5px solid #D7AC54;color:#8a6a2a;padding:6px 16px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;" data-action="open-club-apply-modal">Apply for Club Core</button>
          ` : ""}
          <button style="background:none;border:1.5px solid #D7AC54;color:#8a6a2a;padding:6px 16px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;" data-action="start-school-rep-apply">Apply as School Rep</button>

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
      ${section("My Club Applications", clubAppsContent)}
      ${section("Saved Items", savedContent)}

    </div>
    ${state.editProfileOpen ? renderEditProfileModal() : ""}
    ${state._profileInterestsOpen ? renderProfileInterestsModal() : ""}
    ${state._clubApplyModalOpen ? renderClubApplyModal() : ""}

  `;
}

export function renderProfileInterestsModal() {
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

export function renderClubApplyModal() {
  const eligible = clubs.filter(c =>
    c.status === "approved" &&
    !state.clubApplications.some(a => a.clubId === (c.id || c.slug) && a.status === "pending")
  );
  return `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;">
      <div style="background:#f5f2ec;width:100%;max-width:480px;box-shadow:0 8px 40px rgba(0,0,0,0.18);">
        <div style="padding:24px 24px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #d8cfc4;">
          <h2 style="font-size:16px;font-weight:800;color:#1a1a1a;margin:0;font-family:inherit;text-transform:uppercase;letter-spacing:0.05em;">Apply for Club Core</h2>
          <button style="background:none;border:none;font-size:22px;color:#8a7a6a;cursor:pointer;font-family:inherit;line-height:1;" data-action="close-club-apply-modal">×</button>
        </div>
        <div style="padding:24px;">
          <p style="font-size:13px;color:#5a4a3a;margin:0 0 20px;font-family:inherit;line-height:1.6;">Select the club you'd like to join as a core member. Your application will be reviewed by the club's current core team.</p>
          ${eligible.length ? `
            <div style="margin-bottom:20px;">
              <label style="display:block;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a;margin-bottom:8px;font-family:inherit;">Select Club *</label>
              <select id="club-apply-select" style="width:100%;border:1.5px solid #c8b89a;background:#fff;padding:10px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;">
                <option value="">-- Choose a club --</option>
                ${eligible.map(c => `<option value="${escapeHtml(c.id || c.slug)}">${escapeHtml(c.name)}</option>`).join("")}
              </select>
            </div>
            <div style="display:flex;gap:10px;">
              <button style="flex:1;background:#D7AC54;color:#1a1a1a;border:none;padding:12px;font-size:12px;font-weight:800;font-family:inherit;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;" data-action="submit-club-application">Submit Application</button>
              <button style="background:none;border:1.5px solid #c8b89a;color:#5a4a3a;padding:12px 20px;font-size:12px;font-weight:700;font-family:inherit;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;" data-action="close-club-apply-modal">Cancel</button>
            </div>
          ` : `
            <p style="font-size:13px;color:#8a7a6a;margin:0 0 20px;font-family:inherit;">You have already applied to all available clubs, or have pending applications for each.</p>
            <button style="background:#1a1a1a;color:#f5f2ec;border:none;padding:10px 24px;font-size:12px;font-weight:700;font-family:inherit;text-transform:uppercase;cursor:pointer;" data-action="close-club-apply-modal">Close</button>
          `}
        </div>
      </div>
    </div>
  `;
}

export function renderEditProfileModal() {
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
              ${["1", "2", "3", "4"].map(y => `
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

export function sectionLabel(number, label) {
  return `
    <div class="section-label">
      <span class="section-num">${number}</span>
      <span class="eyebrow">${label}</span>
    </div>
  `;
}


export * from "./render-admin.js";

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
    hostDisplay = schoolName;
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
    hostDisplay = schoolName;
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
          ${status === "Open" && project.applicationLink ? `<a href="${escapeHtml(project.applicationLink)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;background:#D7AC54;color:#1a1a1a;padding:6px 16px;font-size:12px;font-weight:700;font-family:inherit;letter-spacing:0.05em;text-transform:uppercase;text-decoration:none;">Apply ↗</a>` : ""}
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
    hostDisplay = schoolName;
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
            <button class="choice" data-onboard-role="school-rep"><strong>School representative</strong>Post school events and official school links after approval.</button>
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
    const clubOptions = clubs.length ? clubs.map((club) => ({ id: club.id || club.slug, name: club.name })) : [];
    return `
      <div class="modal-layer">
        <section class="modal">
          <p class="eyebrow">Club core request</p>
          <h2>Which club are you core in?</h2>
          
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
          
          <button class="btn gold" data-action="submit-host">Submit request</button>
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


