import { state } from './state.js';
import { renderAtTop } from './ui.js';
import { isClubCore, isSuperAdmin } from './auth.js';

/** Drop the cached load marker so the next render re-reads. No argument invalidates all tabs. */
export function invalidateAdminTab(tab) {
  if (!state._adminTabsLoaded) return;
  if (tab) delete state._adminTabsLoaded[tab];
  else state._adminTabsLoaded = {};
}

export function parseRoute() {
  const params = new URLSearchParams(window.location.search);
  const route = params.get("route") || "home";
  
  state.route = route;
  
  if (route === "events" && params.get("eventId")) {
    state.selectedEventId = params.get("eventId");
  }
  if (route === "projects" && params.get("projectId")) {
    state.selectedProjectId = params.get("projectId");
  }
  if (route === "announcements" && params.get("announcementId")) {
    state.selectedAnnouncementId = params.get("announcementId");
  }
  if (route === "clubs" && params.get("clubSlug")) {
    state.selectedClubSlug = params.get("clubSlug");
  }
}

export function navigate(route, params = {}) {
  state.route = route;
  
  // Clear specifics if navigating to main route
  if (route !== "events") state.selectedEventId = null;
  if (route !== "projects") state.selectedProjectId = null;
  if (route !== "announcements") state.selectedAnnouncementId = null;
  if (route !== "clubs") state.selectedClubSlug = null;
  
  // Apply params
  if (params.eventId) state.selectedEventId = params.eventId;
  if (params.projectId) state.selectedProjectId = params.projectId;
  if (params.announcementId) state.selectedAnnouncementId = params.announcementId;
  if (params.clubSlug) state.selectedClubSlug = params.clubSlug;
  
  state.createOpen = false;
  
  const searchParams = new URLSearchParams();
  searchParams.set("route", route);
  if (params.eventId) searchParams.set("eventId", params.eventId);
  if (params.projectId) searchParams.set("projectId", params.projectId);
  if (params.announcementId) searchParams.set("announcementId", params.announcementId);
  if (params.clubSlug) searchParams.set("clubSlug", params.clubSlug);
  
  const newUrl = `?${searchParams.toString()}`;
  
  if (window.location.search !== newUrl) {
    window.history.pushState({ route, ...params }, "", newUrl);
  }
  
  renderCurrentRoute();
}

export async function renderCurrentRoute() {
  if (state.route === "clubs" && state.selectedClubSlug && window.RVUFirebase) {
    const clubId = state.selectedClubSlug;
    if (state._loadedClubCoreFor !== clubId) {
      state._loadedClubCoreFor = clubId;
      state._clubCoreMembersLoading = true;
      try {
        // listClubCoreMembers also repairs approved apps missing a coreMembers doc
        state.clubCoreMembers = await window.RVUFirebase.listClubCoreMembers(clubId) || [];
      } catch (_) {
        state.clubCoreMembers = [];
      } finally {
        state._clubCoreMembersLoading = false;
      }
    }
  }

  if (state.route === "admin" && window.RVUFirebase) {
    const tab = state.adminTab || "requests";
    // Track which tabs were fetched. Keying off "array is empty" re-fetches an empty queue
    // on every render and never refreshes a stale one. Cleared by invalidateAdminTab().
    if (!state._adminTabsLoaded) state._adminTabsLoaded = {};
    const needsLoad = ["requests", "flags", "users", "events", "announcements", "contentReviews"].includes(tab)
      && !state._adminTabsLoaded[tab];

    if (needsLoad) {
      state._adminTabsLoaded[tab] = true;
      state.dataLoading = true;
      renderAtTop();
      if (tab === "requests") {
        state.hostRequests = (await window.RVUFirebase.loadAdminTab(tab)).docs || [];
        if (isSuperAdmin()) {
          try {
            state.clubApplicants = await window.RVUFirebase.loadAllPendingClubApplications();
            state._clubApplicantsLoaded = true;
          } catch (_) { /* optional */ }
        }
      }
      else if (tab === "flags") state.moderationFlags = (await window.RVUFirebase.loadAdminTab("moderation")).docs || [];
      else if (tab === "users") state.allUsers = (await window.RVUFirebase.loadAdminTab(tab)).docs || [];
      else if (tab === "events") state.allEvents = (await window.RVUFirebase.loadAdminTab(tab)).docs || [];
      else if (tab === "announcements") state.allAnnouncements = (await window.RVUFirebase.loadAdminTab(tab)).docs || [];
      else if (tab === "contentReviews") state.contentReviews = (await window.RVUFirebase.loadAdminTab(tab)).docs || [];
      state.dataLoading = false;
    }

    // Club core dashboard: auto-load membership applicants for all managed clubs.
    if (isClubCore() && state.host.approved && !isSuperAdmin() && !state._clubApplicantsLoaded && !state._clubApplicantsLoading) {
      const clubIds = (state.host.clubAccesses || [])
        .map((access) => access.club?.id || access.club?.slug)
        .filter(Boolean);
      if (clubIds.length) {
        state._clubApplicantsLoading = true;
        renderAtTop();
        try {
          const nested = await Promise.all(clubIds.map((clubId) => window.RVUFirebase.loadClubPendingApplications(clubId)));
          const seen = new Set();
          state.clubApplicants = nested.flat().filter((app) => {
            if (!app?.id || seen.has(app.id)) return false;
            seen.add(app.id);
            return true;
          });
          state._clubApplicantsLoaded = true;
        } catch (error) {
          console.warn("[RVU] Failed to auto-load club applicants", error);
        } finally {
          state._clubApplicantsLoading = false;
        }
      }
    }
  }
  renderAtTop();
}

/** Overlay flags, outermost-last. Back closes the topmost one before changing route. */
const OVERLAY_FLAGS = [
  "searchOpen",
  "_clubApplyModalOpen",
  "createEventOpen",
  "editEventOpen",
  "createAnnouncementOpen",
  "editAnnouncementOpen",
  "createProjectOpen",
  "editProfileOpen",
  "editClubOpen",
  "loginOpen",
  "createOpen",
];

function closeTopOverlay() {
  const open = OVERLAY_FLAGS.find((flag) => state[flag]);
  if (!open) return false;
  state[open] = false;
  return true;
}

export function anyOverlayOpen() {
  return OVERLAY_FLAGS.some((flag) => state[flag]);
}

export function initRouter() {
  window.addEventListener("popstate", (e) => {
    // Dismiss an overlay rather than mutating the page behind it, which leaves a modal
    // floating over a different screen with no way out.
    if (closeTopOverlay()) {
      // Keep the URL where it was — we consumed this Back for the overlay.
      window.history.pushState(
        { route: state.route, eventId: state.selectedEventId, projectId: state.selectedProjectId,
          announcementId: state.selectedAnnouncementId, clubSlug: state.selectedClubSlug },
        "",
        window.location.search
      );
      renderAtTop();
      return;
    }

    if (e.state) {
      state.route = e.state.route || "home";
      state.selectedEventId = e.state.eventId || null;
      state.selectedProjectId = e.state.projectId || null;
      state.selectedAnnouncementId = e.state.announcementId || null;
      state.selectedClubSlug = e.state.clubSlug || null;
    } else {
      parseRoute();
    }
    // popstate never pushes new history
    renderCurrentRoute();
  });

  // Escape closes the topmost overlay everywhere in the app.
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (closeTopOverlay()) {
      e.preventDefault();
      renderAtTop();
    }
  });

  parseRoute();
}
