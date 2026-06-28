import { state } from './state.js';
import { renderAtTop } from './ui.js';

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
  if (state.route === "admin" && window.RVUFirebase) {
    const tab = state.adminTab || "requests";
    // Check if we need to load this tab data
    let needsLoad = false;
    if (tab === "requests" && state.hostRequests.length === 0) needsLoad = true;
    else if (tab === "flags" && state.moderationFlags.length === 0) needsLoad = true;
    else if (tab === "users" && state.allUsers.length === 0) needsLoad = true;
    else if (tab === "events" && state.allEvents.length === 0) needsLoad = true;
    else if (tab === "announcements" && state.allAnnouncements.length === 0) needsLoad = true;
    else if (tab === "contentReviews" && state.contentReviews.length === 0) needsLoad = true;
    
    if (needsLoad) {
      state.dataLoading = true;
      renderAtTop();
      if (tab === "requests") state.hostRequests = await window.RVUFirebase.loadAdminTab(tab);
      else if (tab === "flags") state.moderationFlags = await window.RVUFirebase.loadAdminTab(tab);
      else if (tab === "users") state.allUsers = await window.RVUFirebase.loadAdminTab(tab);
      else if (tab === "events") state.allEvents = await window.RVUFirebase.loadAdminTab(tab);
      else if (tab === "announcements") state.allAnnouncements = await window.RVUFirebase.loadAdminTab(tab);
      else if (tab === "contentReviews") state.contentReviews = await window.RVUFirebase.loadAdminTab(tab);
      state.dataLoading = false;
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
