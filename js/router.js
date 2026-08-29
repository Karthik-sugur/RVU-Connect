import { state } from './state.js';
import { renderAtTop } from './ui.js';
import { isClubCore, isSuperAdmin } from './auth.js';

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
  
  if (route !== "events") state.selectedEventId = null;
  if (route !== "projects") state.selectedProjectId = null;
  if (route !== "announcements") state.selectedAnnouncementId = null;
  if (route !== "clubs") state.selectedClubSlug = null;
  
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
    let needsLoad = false;
    if (tab === "requests" && state.hostRequests.length === 0) needsLoad = true;
    else if ((tab === "flags" || tab === "moderation") && state.moderationFlags.length === 0) needsLoad = true;
    else if (tab === "users" && state.allUsers.length === 0) needsLoad = true;
    else if (tab === "clubs" && state.allClubs.length === 0) needsLoad = true;
    else if (tab === "schools" && state.allSchools.length === 0) needsLoad = true;
    else if (tab === "events" && state.allEvents.length === 0) needsLoad = true;
    else if (tab === "announcements" && state.allAnnouncements.length === 0) needsLoad = true;
    else if (tab === "contentReviews" && state.contentReviews.length === 0) needsLoad = true;
    
    if (needsLoad) {
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
      else if (tab === "flags" || tab === "moderation") state.moderationFlags = (await window.RVUFirebase.loadAdminTab(tab)).docs || [];
      else if (tab === "users") state.allUsers = (await window.RVUFirebase.loadAdminTab(tab)).docs || [];
      else if (tab === "clubs") state.allClubs = (await window.RVUFirebase.loadAdminTab(tab)).docs || [];
      else if (tab === "schools") state.allSchools = (await window.RVUFirebase.loadAdminTab(tab)).docs || [];
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

    // Current core roster for every managed club, so the panel can list and remove members.
    if (isClubCore() && state.host.approved && !isSuperAdmin() && !state._managedClubMembersLoaded && !state._managedClubMembersLoading) {
      const clubIds = (state.host.clubAccesses || [])
        .map((access) => access.club?.id || access.club?.slug)
        .filter(Boolean);
      if (clubIds.length) {
        state._managedClubMembersLoading = true;
        try {
          const rosters = await Promise.all(clubIds.map((clubId) =>
            window.RVUFirebase.listClubCoreMembers(clubId).catch(() => [])));
          const byClub = {};
          clubIds.forEach((clubId, index) => { byClub[clubId] = rosters[index] || []; });
          state.managedClubMembers = byClub;
          state._managedClubMembersLoaded = true;
        } catch (error) {
          console.warn("[RVU] Failed to auto-load club core rosters", error);
        } finally {
          state._managedClubMembersLoading = false;
        }
      }
    }
  }
  renderAtTop();
}

export function initRouter() {
  window.addEventListener("popstate", (e) => {
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
  
  parseRoute();
}
