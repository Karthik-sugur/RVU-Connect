import { ROLES, STATUSES, ROUTES } from "./constants.js";
import { logger } from "./logger.js";
import { validateEvent, validateAnnouncement, validateProject } from "./validation.js";

import { promptUser, validateClubDraft, replaceCollection } from './utils.js';
import { schools, interests, events, clubs, announcements, projects, state, defaultClubDraft, app } from './state.js';
import { isClubCore, isSchoolRep, isSuperAdmin, canHost, canManageClub, canManageEvent, activeClub, isAllowedRvuEmail, syncFirebaseData, softRefreshCampusData, startPendingAccessPolling, enterAuthenticatedApp, enterDemoApp, handleSignOut, startFirebaseLogin } from './auth.js';
import { render, renderAtTop, renderSearchResultsHtml, isSchoolAnnouncement } from './ui.js';
import { navigate, initRouter } from './router.js';

/** True when a YYYY-MM-DD date plus HH:MM time is still ahead of now. */
function isFutureDateTime(date, time) {
  const dateStr = String(date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return true; // let the field validator complain
  let timeStr = String(time || "23:59").trim();
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) timeStr = `${timeStr}:00`;
  if (!/^\d{1,2}:\d{2}:\d{2}$/.test(timeStr)) timeStr = "23:59:00";
  const dt = new Date(`${dateStr}T${timeStr}`);
  if (Number.isNaN(dt.getTime())) return true;
  return dt.getTime() > Date.now();
}

export function bindEvents() {
  if (!window.rvuAuthListenersBound) {
    window.rvuAuthListenersBound = true;
    window.addEventListener("rvu-auth-user", (event) => {
      if (event.detail && !state.authed) {
        enterAuthenticatedApp(event.detail).catch((error) => {
          window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: error.message || "Could not complete sign-in.", type: "info" } }));
        });
      }
    });
    window.addEventListener("rvu-auth-error", (event) => {
      if (event.detail) window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: event.detail, type: "info" } }));
    });
    if (window.RVUFirebase?.auth?.currentUser && !state.authed) {
      enterAuthenticatedApp(window.RVUFirebase.auth.currentUser).catch((error) => {
        window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: error.message || "Could not restore session.", type: "info" } }));
      });
    }
  }

  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      navigate(button.dataset.route);
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (button.dataset.action === "search-input") return;
      event.stopPropagation();
      const origPointer = button.style.pointerEvents;
      const origOpacity = button.style.opacity;
      button.style.pointerEvents = "none";
      button.style.opacity = "0.5";
      handleAction(button.dataset.action, button.dataset)
        .catch((error) => {
          window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: error.message || "Action failed.", type: "info" } }));
        })
        .finally(() => {
          button.style.pointerEvents = origPointer;
          button.style.opacity = origOpacity;
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
                window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: error.message || "Action failed.", type: "info" } }));
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
      if (key === "authEmail" || key === "authPassword") return;
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

  document.querySelectorAll("[data-multi-select]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const name = checkbox.dataset.multiSelect;
      if (name === "hostClubs") {
        if (checkbox.checked) {
          if (!state.host.selectedClubIds.includes(checkbox.value)) state.host.selectedClubIds.push(checkbox.value);
        } else {
          state.host.selectedClubIds = state.host.selectedClubIds.filter(id => id !== checkbox.value);
        }
      }
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
        state.host.name = "Student Representative";
        state.host.category = "School";
        state.host.approver = "Super Admin";
        state.host.approved = false;
        state.adminScope = "school";
        state.onboardingStep = "student-info";
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

export async function updateClubLeadershipFromPrompt(clubId, club = {}) {
  const currentPresidentName = await promptUser("Current president name", club.currentPresidentName || "");
  if (currentPresidentName == null) return;
  const currentPresidentEmail = await promptUser("Current president RVU email (@rvu.edu.in)", club.currentPresidentEmail || "");
  if (!isAllowedRvuEmail(currentPresidentEmail)) return window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Current president email must end with @rvu.edu.in.", type: "info" } }));
  const facultyAdvisorName = await promptUser("Faculty advisor name", club.facultyAdvisorName || "");
  if (facultyAdvisorName == null) return;
  const facultyAdvisorEmail = await promptUser("Faculty advisor RVU email (@rvu.edu.in)", club.facultyAdvisorEmail || "");
  if (!isAllowedRvuEmail(facultyAdvisorEmail)) return window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Faculty advisor email must end with @rvu.edu.in.", type: "info" } }));

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
  /* removed syncFirebaseData */
}

export async function handleAction(action, dataset) {
  if (action === "open-login") {
    state.loginOpen = true;
  }
  if (action === "close-login") {
    state.loginOpen = false;
  }
  if (action === "login-google") {
    startFirebaseLogin();
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

      if (state._onboardingIntent === "school-rep") {
        state.onboardingStep = "school-rep-details";
        renderAtTop();
        return;
      }
    }
    state.onboardingStep = null;
    navigate("home");
  }
  if (action === "submit-school-rep-onboarding") {
    const reason = document.getElementById("sr-onboard-reason")?.value?.trim() || "";
    const dean = document.querySelector('input[name="sr-onboard-dean"]:checked')?.value;
    if (!reason || !dean) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Please provide a reason and confirm dean discussion.", type: "error" } }));
      return;
    }
    if (window.RVUFirebase) {
      try {
        await window.RVUFirebase.submitHostRequest({
          type: "schoolRepresentative",
          schoolId: state.user.school,
          name: state.user.name,
          roleTitle: "Student Representative",
          description: reason,
          deanDiscussed: dean === "Yes",
          approver: "Super Admin",
        });
      } catch (error) {
        window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: error.message || "Could not submit application.", type: "error" } }));
        return;
      }
    }
    state.host.approved = false;
    state.onboardingStep = "host-review";
    startPendingAccessPolling();
    navigate("home");
    return;
  }
  if (action === "create-new-club-onboarding") {
    state._createClubReturnRoute = state.onboardingStep === "host-info" ? "__host-info__" : (state.route || "profile");
    state.onboardingStep = "create-club";
    renderAtTop();
  }
  if (action === "cancel-create-club") {
    const back = state._createClubReturnRoute || "profile";
    state._createClubReturnRoute = null;
    if (back === "__host-info__") {
      state.onboardingStep = "host-info";
      renderAtTop();
      return;
    }
    state.onboardingStep = null;
    navigate(back);
    return;
  }
  if (action === "back-to-host-info") {
    state.onboardingStep = "host-info";
    renderAtTop();
    return;
  }
  // Onboarding steps previously had no way back, so picking "Club core" trapped the user
  // in the host-info modal with no exit and no way to finish.
  if (action === "back-to-role") {
    state.onboardingStep = "role";
    renderAtTop();
    return;
  }
  if (action === "back-to-student-info") {
    state.onboardingStep = "student-info";
    renderAtTop();
    return;
  }
  if (action === "submit-new-club") {
    if (!state.clubDraft.name || !state.clubDraft.category) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Club name and category are required.", type: "info" } }));
      return;
    }
    if (window.RVUFirebase) {
      await window.RVUFirebase.submitNewClubCreationRequest(state.clubDraft);
    }
    state.host.approved = false;
    state.host.name = state.clubDraft.name;
    state.host.type = "New Club Creation";
    state.onboardingStep = "host-review";
    startPendingAccessPolling();
    navigate("home");
  }
  if (action === "submit-host") {
    const isClubIntent = state._onboardingIntent === "club-core";
    
    if (isClubIntent && state.host.selectedClubIds.length === 0) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Please select at least one club or create a new one.", type: "info" } }));
      return;
    }

    if (window.RVUFirebase && isClubIntent) {
      try {
        await window.RVUFirebase.submitMultiClubCoreRequest(state.host.selectedClubIds, {
          name: state.host.name,
          roleTitle: state.host.roleTitle,
        });
      } catch (error) {
        // "You already have a pending application" is not a failure the user can act on —
        // it means the request is already in. Treat it as success and let them out of
        // onboarding instead of trapping them in a modal that can never be satisfied.
        const message = error.message || "";
        const alreadySubmitted = /already have a pending application|already approved|already club core/i.test(message);
        if (!alreadySubmitted) {
          window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: message || "Could not submit application.", type: "error" } }));
          return;
        }
        window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Your application is already in review.", type: "info" } }));
      }
    }
    // Record that onboarding is finished so the blocking role modal does not reopen.
    if (window.RVUFirebase && state.authUser) {
      window.RVUFirebase.saveUserProfile(state.authUser.uid, { onboardingComplete: true })
        .catch((error) => console.warn("[RVU] Could not persist onboardingComplete", error));
    }
    state.host.approved = false;
    state.onboardingStep = "host-review";
    startPendingAccessPolling();
    navigate("home");
    return;
  }
  if (action === "host-review") {
    state.onboardingStep = "host-review";
  }
  if (action === "close-onboarding") {
    state.onboardingStep = null;
    if (isClubCore() || isSchoolRep()) navigate("admin");
  }
  if (action === "toggle-create") {
    state.createOpen = !state.createOpen;
  }
  if (action === "create-event") {
    if (!canHost() && !isSuperAdmin()) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "You need an approved club core or school representative role to create events.", type: "info" } }));
      return;
    }
    if (isSchoolRep() && !isClubCore()) state._createHostMode = "school";
    else if (isClubCore() && !isSchoolRep()) state._createHostMode = "club";
    else if (dataset.mode === "school" || dataset.mode === "club") state._createHostMode = dataset.mode;
    else if (isSchoolRep() && isClubCore() && !state._createHostMode) state._createHostMode = "club";
    state.createEventOpen = true;
    state.createOpen = false;
    render();
    return;
  }
  if (action === "create-announcement") {
    if (!canHost() && !isSuperAdmin()) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "You need an approved club core or school representative role to create announcements.", type: "info" } }));
      return;
    }
    if (isSchoolRep() && !isClubCore()) state._createHostMode = "school";
    else if (isClubCore() && !isSchoolRep()) state._createHostMode = "club";
    else if (dataset.mode === "school" || dataset.mode === "club") state._createHostMode = dataset.mode;
    else if (isSchoolRep() && isClubCore() && !state._createHostMode) state._createHostMode = "club";
    state.createAnnouncementOpen = true;
    state.createOpen = false;
    render();
    return;
  }
  if (action === "open-club") {
    // navigate() -> renderCurrentRoute() already loads this club's core team (and does it
    // for deep links and reloads too). Fetching here as well ran the query twice per click.
    navigate("clubs", { clubSlug: dataset.club });
    return;
  }
  if (action === "back-to-clubs") {
    state.clubCoreMembers = [];
    state._loadedClubCoreFor = null;
    navigate("clubs");
    return;
  }
  if (action === "toggle-registration") {
    const club = clubs.find((item) => item.slug === dataset.club);
    if (club) {
      const originalValue = club.registrationOpen;
      const nextValue = !originalValue;
      club.registrationOpen = nextValue;
      render();
      try {
        if (window.RVUFirebase) await window.RVUFirebase.updateClubRegistration(club.id || club.slug, nextValue);
      } catch (error) {
        club.registrationOpen = originalValue;
        render();
        throw error;
      }
    }
    return;
  }
  if (action === "approve-host") {
    if (window.RVUFirebase && dataset.request) {
      await window.RVUFirebase.updateHostRequestStatus(dataset.request, "approved");
      const item = state.hostRequests.find((r) => r.id === dataset.request);
      if (item) item.status = "approved";
      render();
    }
  }
  if (action === "reject-host") {
    if (window.RVUFirebase && dataset.request) {
      await window.RVUFirebase.updateHostRequestStatus(dataset.request, "rejected");
      const item = state.hostRequests.find((r) => r.id === dataset.request);
      if (item) item.status = "rejected";
      render();
    }
  }
  if (action === "sign-out") {
    await handleSignOut();
    return;
  }
  if (action === "admin-tab") {
    const tab = dataset.tab || "requests";
    state.adminTab = tab;
    if (window.RVUFirebase && isSuperAdmin()) {
      state.dataLoading = true;
      render();
      if (tab === "requests") state.hostRequests = (await window.RVUFirebase.loadAdminTab(tab)).docs;
      else if (tab === "flags") state.moderationFlags = (await window.RVUFirebase.loadAdminTab(tab)).docs;
      else if (tab === "users") state.allUsers = (await window.RVUFirebase.loadAdminTab(tab)).docs;
      else if (tab === "events") state.allEvents = (await window.RVUFirebase.loadAdminTab(tab)).docs;
      else if (tab === "announcements") state.allAnnouncements = (await window.RVUFirebase.loadAdminTab(tab)).docs;
      else if (tab === "contentReviews") state.contentReviews = (await window.RVUFirebase.loadAdminTab(tab)).docs;
      state.dataLoading = false;
      render();
    }
  }

  if (action === "admin-create-club") {
    if (!isSuperAdmin()) return;
    state.clubDraft = defaultClubDraft();
    navigate("admin-create-club");
    return;
  }
  if (action === "admin-back-to-clubs") {
    state.adminTab = "clubs";
    navigate("admin");
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
    if (error) return window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: error, type: "info" } }));
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
    state.adminTab = "clubs";
    /* removed syncFirebaseData */
    navigate("admin");
    return;
  }
  if (action === "admin-create-school") {
    if (!window.RVUFirebase || !isSuperAdmin()) return;
    const name = await promptUser("School name");
    if (!name) return;
    const shortName = await promptUser("Short name (optional)") || "";
    const description = await promptUser("Description") || "";
    const leadEmail = await promptUser("Lead/admin RVU email optional (@rvu.edu.in)") || "";
    if (leadEmail && !isAllowedRvuEmail(leadEmail)) return window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Lead email must end with @rvu.edu.in.", type: "info" } }));
    await window.RVUFirebase.createSchool({
      name,
      shortName,
      description,
      leadEmail,
    });
    /* removed syncFirebaseData */
  }
  if (action === "admin-delete-school") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    if (!window.confirm("Delete this school record?")) return;
    await window.RVUFirebase.deleteDocument("schools", dataset.docid);
    state.allSchools = state.allSchools.filter(s => s.id !== dataset.docid);
  }
  if (action === "admin-assign-core") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    const email = await promptUser("Core member RVU email (@rvu.edu.in)");
    if (!isAllowedRvuEmail(email)) return window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Core email must end with @rvu.edu.in.", type: "info" } }));
    const name = await promptUser("Core member name") || email;
    const role = await promptUser("Core role (e.g. designLead, eventsLead, treasurer)") || "core";
    await window.RVUFirebase.assignClubCoreRole(dataset.docid, { email, name, role });
    /* removed syncFirebaseData */
  }
  if (action === "admin-update-club-leadership") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    const club = state.allClubs.find((item) => item.id === dataset.docid) || {};
    await updateClubLeadershipFromPrompt(dataset.docid, club);
  }
  if (action === "club-update-leadership") {
    if (!window.RVUFirebase || (!isSuperAdmin() && !isClubCore()) || !dataset.docid) return;
    const club = activeClub();
    await updateClubLeadershipFromPrompt(dataset.docid, club);
  }
  if (action === "club-assign-core") {
    if (!window.RVUFirebase || (!isSuperAdmin() && !isClubCore()) || !dataset.docid) return;
    const email = await promptUser("Core member RVU email (@rvu.edu.in)");
    if (!isAllowedRvuEmail(email)) return window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Core email must end with @rvu.edu.in.", type: "info" } }));
    const name = await promptUser("Core member name") || email;
    const role = await promptUser("Core role (e.g. eventsLead, designLead, treasurer)") || "core";
    await window.RVUFirebase.assignClubCoreRole(dataset.docid, { email, name, role });
    /* removed syncFirebaseData */
  }
  if (action === "admin-remove-core") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    const email = await promptUser("Core member email to remove");
    if (!email) return;
    if (!window.confirm(`Remove ${email} from this club core?`)) return;
    await window.RVUFirebase.removeClubCoreRole(dataset.docid, email);
    /* removed syncFirebaseData */
  }
  if (action === "club-remove-core" || action === "remove-club-core-member") {
    if (!window.RVUFirebase || !dataset.docid && !dataset.club) return;
    const clubId = dataset.club || dataset.docid;
    const club = clubs.find((item) => item.id === clubId || item.slug === clubId);
    if (!isSuperAdmin() && !canManageClub(club)) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Only club core of this club can remove members.", type: "error" } }));
      return;
    }
    const email = dataset.email || await promptUser("Core member email to remove");
    if (!email) return;
    const myEmail = (state.authUser?.email || "").trim().toLowerCase();
    if (email.trim().toLowerCase() === myEmail) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Use Leave club core to remove yourself.", type: "info" } }));
      return;
    }
    if (!window.confirm(`Remove ${dataset.name || email} from this club core?`)) return;
    try {
      await window.RVUFirebase.removeClubCoreRole(clubId, email);
      state.clubCoreMembers = (state.clubCoreMembers || []).filter((m) => (m.email || m.id || "").toLowerCase() !== email.trim().toLowerCase());
      renderAtTop();
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Core member removed.", type: "info" } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: e.message || "Could not remove member.", type: "error" } }));
    }
    return;
  }
  if (action === "admin-delete-club") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    if (!window.confirm("Delete this club? This cannot be undone.")) return;
    await window.RVUFirebase.deleteDocument("clubs", dataset.docid);
    state.allClubs = state.allClubs.filter(c => c.id !== dataset.docid);
    replaceCollection(clubs, clubs.filter(c => c.id !== dataset.docid));
  }
  if (action === "admin-create-event") {
    if (!window.RVUFirebase || !isSuperAdmin()) return;
    const title = await promptUser("Event title");
    if (!title) return;
    const description = await promptUser("Description") || "";
    const date = await promptUser("Display date") || "";
    const time = await promptUser("Time") || "";
    const location = await promptUser("Location") || "";
    const host = await promptUser("Host/source") || "RVU";
    const newEv = await window.RVUFirebase.createEvent({
      title,
      description,
      date,
      time,
      location,
      host,
      type: await promptUser("Type: Club Event, School Event") || "School Event",
      hostType: "admin",
      tags: [],
      status: "published",
    });
    events.unshift(newEv);
    if (state.allEvents) state.allEvents.unshift(newEv);
  }
  if (action === "admin-create-announcement") {
    if (!window.RVUFirebase || !isSuperAdmin()) return;
    const title = await promptUser("Announcement title");
    if (!title) return;
    const newAnn = await window.RVUFirebase.createAnnouncement({
      title,
      description: await promptUser("Description") || "",
      source: await promptUser("Source") || "RVU",
      tag: await promptUser("Tag") || "Notice",
      type: "School",
      sourceType: "admin",
      status: "published",
    });
    announcements.unshift(newAnn);
    if (state.allAnnouncements) state.allAnnouncements.unshift(newAnn);
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
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Title and description are required.", type: "info" } }));
      return;
    }
    const skills = (document.getElementById("cp-skills")?.value || "").split(",").map(s => s.trim()).filter(Boolean);
    const tags = (document.getElementById("cp-tags")?.value || "").split(",").map(t => t.trim()).filter(Boolean);
    const expiry = document.getElementById("cp-expiry")?.value || "";
    const phone = document.getElementById("cp-phone")?.value?.trim() || "";
    const applicationLink = document.getElementById("cp-applink")?.value?.trim() || "";
    if (applicationLink && !/^https?:\/\//.test(applicationLink)) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "External application link must start with http:// or https://", type: "info" } }));
      return;
    }
    const newProj = await window.RVUFirebase.createProject({
      title,
      description,
      skills,
      tags,
      expiry,
      contactPhone: phone,
      applicationLink: applicationLink || null,
      postedBy: state.authUser?.email || state.user.name || "Student",
      postedByName: state.user.name || "",
      status: "open",
      score: 0,
    });
    projects.unshift(newProj);
    state.createProjectOpen = false;
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
    const link = document.getElementById("ce-link")?.value?.trim() || "";
    if (!title || !description || !date || !time || !location || !link) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Title, description, date, time, location and external link are required.", type: "info" } }));
      return;
    }

    const posterUrl = document.getElementById("ce-poster")?.value?.trim() || "";
    if (link && !/^https?:\/\//.test(link)) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Link must start with http:// or https://", type: "info" } }));
      return;
    }
    if (posterUrl && !/^https?:\/\//.test(posterUrl)) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Poster URL must start with http:// or https://", type: "info" } }));
      return;
    }
    // An event whose date+time has already passed is filtered out of every listing, so it
    // would look published to its host while being invisible to every student. Reject it up
    // front instead of creating a record nobody can see.
    if (!isFutureDateTime(date, time)) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Event date and time must be in the future.", type: "info" } }));
      return;
    }
    const collab = document.getElementById("ce-collab")?.value || "";
    const registrationDeadlineRaw = document.getElementById("ce-reg-deadline")?.value || "";
    const registrationDeadline = registrationDeadlineRaw
      ? registrationDeadlineRaw.replace("T", " ")
      : "";
    let club = activeClub();
    const hostClubId = document.getElementById("ce-host-club")?.value;
    if (hostClubId && state.host.clubAccesses) {
      const access = state.host.clubAccesses.find(a => a.club.id === hostClubId || a.club.slug === hostClubId);
      if (access) club = access.club;
    }
    const both = isClubCore() && isSchoolRep();
    const hostMode = both ? (state._createHostMode || "club") : (isClubCore() ? "club" : "school");
    const payload = hostMode === "club" ? {
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
      registrationDeadline: registrationDeadline || null,
    } : {
      title, description, date, time, location,
      hostType: "school",
      schoolId: document.getElementById("ce-host-school")?.value || state.host.school || state.user.school,
      host: document.getElementById("ce-host-school")?.value || state.host.school || state.user.school,
      type: "School Event",
      tags: [],
      link: link || null,
      posterUrl: posterUrl || null,
      hostName: state.host.name || "",
      schoolName: document.getElementById("ce-host-school")?.value || state.host.school || state.user.school || "",
      registrationDeadline: registrationDeadline || null,
    };
    try {
      const newEvent = await window.RVUFirebase.createEvent(payload);
      events.unshift(newEvent);
      if (state.allEvents) state.allEvents.unshift(newEvent);
      state.createEventOpen = false;
      renderAtTop();
      window.dispatchEvent(new CustomEvent("rvu-toast", {
        detail: newEvent.status === "draft"
          ? { message: "Event submitted for admin review before it goes live.", type: "info" }
          : { message: "Event published.", type: "success" },
      }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: e.message || "Could not create event.", type: "error" } }));
    }
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
    const link = document.getElementById("ca-link")?.value?.trim() || "";

    if (!title || !description) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Title and description are required.", type: "info" } }));
      return;
    }
    if (link && !/^https?:\/\//.test(link)) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Link must start with http:// or https://", type: "info" } }));
      return;
    }
    if (imageUrl && !/^https?:\/\//.test(imageUrl)) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Image URL must start with http:// or https://", type: "info" } }));
      return;
    }

    const payload = {
      title,
      description,
      tag,
      status: "published",
    };
    
    if (link) {
      payload.link = link;
    }

    if (imageUrl) {
      payload.imageUrl = imageUrl;
    }

    const both = isClubCore() && isSchoolRep();
    const hostMode = both ? (state._createHostMode || "club") : (isClubCore() ? "club" : "school");
    if (hostMode === "club") {
      let club = activeClub();
      const hostClubId = document.getElementById("ca-host-club")?.value;
      if (hostClubId && state.host.clubAccesses) {
        const access = state.host.clubAccesses.find(a => a.club.id === hostClubId || a.club.slug === hostClubId);
        if (access) club = access.club;
      }
      payload.source = club.name;
      payload.sourceType = "club";
      payload.type = "Club";
      payload.clubId = club.id || club.slug;
    } else if (hostMode === "school" || isSchoolRep()) {
      const selectedSchool = document.getElementById("ca-host-school")?.value || state.host.school || state.user.school;
      payload.source = selectedSchool;
      payload.sourceType = "school";
      payload.type = "School";
      payload.schoolId = selectedSchool;
      payload.hostName = state.host.name || "";
      payload.schoolName = selectedSchool || "";
    } else if (isSuperAdmin()) {
      payload.source = "RVU";
      payload.sourceType = "admin";
      payload.type = "School";
    }

    try {
      const newAnn = await window.RVUFirebase.createAnnouncement(payload);
      announcements.unshift(newAnn);
      if (state.allAnnouncements) state.allAnnouncements.unshift(newAnn);
      state.createAnnouncementOpen = false;
      renderAtTop();
      window.dispatchEvent(new CustomEvent("rvu-toast", {
        detail: newAnn.status === "draft"
          ? { message: "Announcement submitted for admin review before it goes live.", type: "info" }
          : { message: "Announcement published.", type: "success" },
      }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: e.message || "Could not create announcement.", type: "error" } }));
    }
    return;
  }
  if (action === "admin-unpublish-event") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    await window.RVUFirebase.updateEventStatus(dataset.docid, "draft");
    replaceCollection(events, events.filter(e => e.id !== dataset.docid));
    if(state.allEvents) { const e = state.allEvents.find(x => x.id === dataset.docid); if(e) e.status = "draft"; }
  }
  if (action === "admin-publish-event") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    await window.RVUFirebase.updateEventStatus(dataset.docid, "published");
    if(state.allEvents) { const e = state.allEvents.find(x => x.id === dataset.docid); if(e) { e.status = "published"; events.unshift(e); } }
  }
  if (action === "admin-unpublish-announcement") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    await window.RVUFirebase.updateAnnouncementStatus(dataset.docid, "draft");
    replaceCollection(announcements, announcements.filter(a => a.id !== dataset.docid));
    if(state.allAnnouncements) { const a = state.allAnnouncements.find(x => x.id === dataset.docid); if(a) a.status = "draft"; }
  }
  if (action === "admin-delete-event") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    if (!window.confirm("Delete this event permanently?")) return;
    await window.RVUFirebase.deleteDocument("events", dataset.docid);
    replaceCollection(events, events.filter(e => e.id !== dataset.docid));
    if(state.allEvents) state.allEvents = state.allEvents.filter(e => e.id !== dataset.docid);
  }
  if (action === "admin-delete-announcement") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    if (!window.confirm("Delete this announcement permanently?")) return;
    await window.RVUFirebase.deleteDocument("announcements", dataset.docid);
    replaceCollection(announcements, announcements.filter(a => a.id !== dataset.docid));
    if(state.allAnnouncements) state.allAnnouncements = state.allAnnouncements.filter(a => a.id !== dataset.docid);
  }
  if (action === "admin-delete-project") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    if (!window.confirm("Delete this project permanently?")) return;
    await window.RVUFirebase.deleteDocument("projects", dataset.docid);
    replaceCollection(projects, projects.filter(p => p.id !== dataset.docid));
  }
  if (action === "delete-school-event") {
    if (!window.RVUFirebase || (!isSuperAdmin() && !isSchoolRep()) || !dataset.docid) return;
    if (!window.confirm("Delete this school event permanently?")) return;
    await window.RVUFirebase.deleteDocument("events", dataset.docid);
    replaceCollection(events, events.filter(e => e.id !== dataset.docid));
    if (state.allEvents) state.allEvents = state.allEvents.filter(e => e.id !== dataset.docid);
    renderAtTop();
  }
  if (action === "delete-school-announcement") {
    if (!window.RVUFirebase || (!isSuperAdmin() && !isSchoolRep()) || !dataset.docid) return;
    if (!window.confirm("Delete this school announcement permanently?")) return;
    await window.RVUFirebase.deleteDocument("announcements", dataset.docid);
    replaceCollection(announcements, announcements.filter(a => a.id !== dataset.docid));
    if (state.allAnnouncements) state.allAnnouncements = state.allAnnouncements.filter(a => a.id !== dataset.docid);
    renderAtTop();
  }
  if (action === "delete-club-event") {
    if (!window.RVUFirebase || (!isSuperAdmin() && !isClubCore()) || !dataset.docid) return;
    if (!window.confirm("Delete this club event permanently?")) return;
    await window.RVUFirebase.deleteDocument("events", dataset.docid);
    replaceCollection(events, events.filter(e => e.id !== dataset.docid));
    if (state.allEvents) state.allEvents = state.allEvents.filter(e => e.id !== dataset.docid);
    renderAtTop();
  }
  if (action === "delete-club-announcement") {
    if (!window.RVUFirebase || (!isSuperAdmin() && !isClubCore()) || !dataset.docid) return;
    if (!window.confirm("Delete this club announcement permanently?")) return;
    await window.RVUFirebase.deleteDocument("announcements", dataset.docid);
    replaceCollection(announcements, announcements.filter(a => a.id !== dataset.docid));
    if (state.allAnnouncements) state.allAnnouncements = state.allAnnouncements.filter(a => a.id !== dataset.docid);
    renderAtTop();
  }


  if (action === "load-more") {
    if (!window.RVUFirebase) return;
    const collectionName = dataset.collection;
    const result = await window.RVUFirebase.loadMore(collectionName);
    // loadMore reports three distinct outcomes so the message matches reality: it used to
    // say "No more items to load" both when the query failed and when a fetched page was
    // entirely filtered out as expired, hiding live records further down the collection.
    if (result.error) return; // handleFirebaseError already surfaced a toast
    const newItems = result.items || [];
    if (!newItems.length) {
      window.dispatchEvent(new CustomEvent("rvu-toast", {
        detail: {
          message: result.exhausted
            ? "No more items to load."
            : "Nothing new to show — the next items have expired. Tap again to keep looking.",
          type: "info",
        },
      }));
      return;
    }
    if (collectionName === "events") replaceCollection(events, [...events, ...newItems]);
    else if (collectionName === "announcements") replaceCollection(announcements, [...announcements, ...newItems]);
    else if (collectionName === "projects") replaceCollection(projects, [...projects, ...newItems]);
    renderAtTop();
    return;
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
    navigate("events", { eventId: dataset.docid });
    return;
  }
  if (action === "search-open-club") {
    state.searchOpen = false;
    navigate("clubs", { clubSlug: dataset.slug });
    return;
  }
  if (action === "search-open-project") {
    state.searchOpen = false;
    navigate("projects", { projectId: dataset.docid });
    return;
  }
  if (action === "search-open-announcement") {
    state.searchOpen = false;
    navigate("announcements", { announcementId: dataset.docid });
    return;
  }
  if (action === "toggle-project-status") {
    if (!window.RVUFirebase || !dataset.docid) return;
    const newStatus = dataset.status === "open" ? "closed" : "open";
    await window.RVUFirebase.updateDocument("projects", dataset.docid, { status: newStatus });
    const proj = projects.find(p => p.id === dataset.docid);
    if (proj) proj.status = newStatus;
    if (state.myApplications) {
      state.myApplications.forEach(a => { if (a.projectId === dataset.docid) a.projectStatus = newStatus; });
    }
    renderAtTop();
    return;
  }
  if (action === "delete-own-project") {
    if (!window.RVUFirebase || !dataset.docid) return;
    if (!window.confirm(`Delete "${dataset.title}"? This cannot be undone.`)) return;
    await window.RVUFirebase.deleteDocument("projects", dataset.docid);
    state.selectedProjectId = null;
    replaceCollection(projects, projects.filter(p => p.id !== dataset.docid));
    renderAtTop();
    return;
  }
  if (action === "rsvp-event" || action === "cancel-rsvp") {
    if (state.isDemoMode) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Sign in to RSVP — demo mode does not save.", type: "info" } }));
      return;
    }
    if (!window.RVUFirebase || !state.authUser) {
      state.loginOpen = true;
      renderAtTop();
      return;
    }
    const eventId = dataset.docid;
    if (!eventId) return;
    const event = events.find((e) => e.id === eventId) || { id: eventId, title: dataset.title || "" };
    const previous = state.rsvps.slice();
    try {
      if (action === "cancel-rsvp") {
        state.rsvps = state.rsvps.filter((r) => (r.eventId || r.id) !== eventId);
        renderAtTop();
        await window.RVUFirebase.removeEventRsvp(eventId);
        window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "RSVP withdrawn.", type: "info" } }));
      } else {
        const status = dataset.status === "interested" ? "interested" : "going";
        const saved = { id: eventId, eventId, title: event.title || "", status };
        state.rsvps = [saved, ...state.rsvps.filter((r) => (r.eventId || r.id) !== eventId)];
        renderAtTop();
        await window.RVUFirebase.setEventRsvp(event, status);
        window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: status === "going" ? "You're going." : "Marked as interested.", type: "success" } }));
      }
    } catch (e) {
      state.rsvps = previous; // roll the optimistic update back
      renderAtTop();
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: e.message || "Could not update your RSVP.", type: "error" } }));
    }
    return;
  }

  // Detail views go through navigate() so they get a URL and a history entry. Setting the
  // selected id and re-rendering directly meant detail pages were not shareable, and Back
  // skipped the list entirely — it went to whatever route was visited before it.
  if (action === "open-project-detail") {
    navigate("projects", { projectId: dataset.docid });
    return;
  }
  if (action === "close-project-detail") {
    navigate("projects");
    return;
  }
  if (action === "open-event-detail") {
    navigate("events", { eventId: dataset.docid });
    return;
  }
  if (action === "close-event-detail") {
    navigate("events");
    return;
  }
  if (action === "open-announcement-detail") {
    navigate("announcements", { announcementId: dataset.docid });
    return;
  }
  if (action === "close-announcement-detail") {
    navigate("announcements");
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
    const tag = document.querySelector('input[name="ea-tag"]:checked')?.value || "";
    const school = document.getElementById("ea-host-school")?.value || "";
    if (!title || !description) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Title and description required.", type: "info" } }));
      return;
    }
    if (imageUrl && !/^https?:\/\//.test(imageUrl)) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Image URL must start with http:// or https://", type: "info" } }));
      return;
    }
    const patch = {
      title,
      description,
      imageUrl: imageUrl || null,
    };
    if (tag) patch.tag = tag;
    // Only rewrite the school fields on an announcement that actually belongs to a school.
    // The picker is now hidden for club announcements, but guard the write too so a stale
    // DOM node can never reassign a club announcement to a school.
    const existing = announcements.find((a) => a.id === state.editAnnouncementId);
    if (school && isSchoolAnnouncement(existing)) {
      patch.schoolId = school;
      patch.schoolName = school;
      patch.source = school;
    }
    await window.RVUFirebase.updateDocument("announcements", state.editAnnouncementId, patch);
    const ann = announcements.find(a => a.id === state.editAnnouncementId);
    if (ann) {
      Object.assign(ann, patch);
    }
    if (state.allAnnouncements) {
      const annAll = state.allAnnouncements.find(a => a.id === state.editAnnouncementId);
      if (annAll) Object.assign(annAll, patch);
    }
    state.editAnnouncementOpen = false;
    state.editAnnouncementId = null;
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
    const ev = events.find(e => e.id === dataset.docid);
    if (ev) {
      ev.status = "cancelled";
      ev.cancelled = true;
    }
    if (state.allEvents) {
      const evAll = state.allEvents.find(e => e.id === dataset.docid);
      if (evAll) {
        evAll.status = "cancelled";
        evAll.cancelled = true;
      }
    }
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
    const registrationDeadlineRaw = document.getElementById("ee-reg-deadline")?.value || "";
    const registrationDeadline = registrationDeadlineRaw
      ? registrationDeadlineRaw.replace("T", " ")
      : "";
    if (!title || !description) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Title and description required.", type: "info" } }));
      return;
    }
    if (link && !/^https?:\/\//.test(link)) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Link must start with http:// or https://", type: "info" } }));
      return;
    }
    if (posterUrl && !/^https?:\/\//.test(posterUrl)) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Poster URL must start with http:// or https://", type: "info" } }));
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
      registrationDeadline: registrationDeadline || null,
    });
    const ev = events.find(e => e.id === state.editEventId);
    if (ev) {
      ev.title = title;
      ev.description = description;
      ev.date = date;
      ev.time = time;
      ev.location = location;
      ev.link = link || null;
      ev.posterUrl = posterUrl || null;
      ev.registrationDeadline = registrationDeadline || null;
    }
    if (state.allEvents) {
      const evAll = state.allEvents.find(e => e.id === state.editEventId);
      if (evAll) {
        evAll.title = title;
        evAll.description = description;
        evAll.date = date;
        evAll.time = time;
        evAll.location = location;
        evAll.link = link || null;
        evAll.posterUrl = posterUrl || null;
        evAll.registrationDeadline = registrationDeadline || null;
      }
    }
    state.editEventOpen = false;
    state.editEventId = null;
    renderAtTop();
    return;
  }
  if (action === "save-item") {
    if (!window.RVUFirebase || !dataset.docid) return;
    const itemData = { itemId: dataset.docid, type: dataset.kind || "item", title: dataset.title || "", id: dataset.docid };
    if ((state.savedItems || []).some((s) => (s.itemId === itemData.itemId || s.id === itemData.itemId) && (s.type === itemData.type || !s.type))) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Already saved.", type: "info" } }));
      return;
    }
    state.savedItems = [...(state.savedItems || []), itemData];
    render();
    await window.RVUFirebase.saveItem(itemData);
    window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Saved to your campus dashboard.", type: "info" } }));
    return;
  }
  if (action === "unsave-item") {
    if (!window.RVUFirebase || !dataset.docid) return;
    const type = dataset.kind || "item";
    state.savedItems = (state.savedItems || []).filter((s) => !((s.itemId === dataset.docid || s.id === dataset.docid) && (!s.type || s.type === type || type === "item")));
    render();
    await window.RVUFirebase.unsaveItem({ itemId: dataset.docid, type });
    window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Removed from saved items.", type: "info" } }));
    return;
  }
  if (action === "follow-club") {
    if (!window.RVUFirebase || !dataset.docid) return;
    if ((state.followedClubs || []).some((c) => c.clubId === dataset.docid || c.id === dataset.docid)) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Already following.", type: "info" } }));
      return;
    }
    state.followedClubs = [...(state.followedClubs || []), { clubId: dataset.docid, clubName: dataset.title || "", title: dataset.title || "", id: dataset.docid }];
    render();
    await window.RVUFirebase.followClub(dataset.docid, dataset.title || "");
    window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Club followed.", type: "info" } }));
    return;
  }
  if (action === "unfollow-club") {
    if (!window.RVUFirebase || !dataset.docid) return;
    state.followedClubs = (state.followedClubs || []).filter(c => c.clubId !== dataset.docid && c.id !== dataset.docid);
    render();
    await window.RVUFirebase.unfollowClub(dataset.docid);
    window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Unfollowed.", type: "info" } }));
    return;
  }
  if (action === "leave-club-core") {
    if (!window.RVUFirebase || !dataset.docid) return;
    if (!window.confirm(`Leave club core for ${dataset.title || "this club"}? You will lose hosting rights for this club.`)) return;
    try {
      await window.RVUFirebase.leaveClubCore(dataset.docid);
      state.host.clubAccesses = (state.host.clubAccesses || []).filter((a) => (a.club?.id || a.club?.slug) !== dataset.docid);
      if (state.host.clubSlug === dataset.docid) {
        const next = state.host.clubAccesses[0];
        state.host.clubSlug = next ? (next.club.id || next.club.slug) : "";
      }
      state._hasClubCore = (state.host.clubAccesses || []).length > 0;
      if (state._hasClubCore) {
        state.role = "club-core";
        state.host.approved = true;
      } else if (state._hasSchoolRep || isSchoolRep()) {
        state._hasClubCore = false;
        state.role = "school-rep";
        state.host.approved = true;
      } else {
        state.role = "student";
        state.host.approved = false;
      }
      await softRefreshCampusData({ showSkeleton: false });
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "You left club core for this club.", type: "info" } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: e.message || "Could not leave club.", type: "error" } }));
    }
    return;
  }
  if (action === "set-create-host-mode") {
    state._createHostMode = dataset.mode === "school" ? "school" : "club";
    render();
    return;
  }
  if (action === "load-all-club-applicants") {
    if (!window.RVUFirebase || !isSuperAdmin()) return;
    try {
      state._clubApplicantsLoading = true;
      renderAtTop();
      state.clubApplicants = await window.RVUFirebase.loadAllPendingClubApplications();
      state._clubApplicantsLoaded = true;
    } catch (e) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: e.message || "Could not load club applications.", type: "error" } }));
    } finally {
      state._clubApplicantsLoading = false;
      renderAtTop();
    }
    return;
  }
  if (action === "repair-school-rep-grants") {
    if (!window.RVUFirebase || !isSuperAdmin()) return;
    try {
      const fixed = await window.RVUFirebase.repairSchoolRepGrants();
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: `Migrated ${fixed} school-rep grant${fixed === 1 ? "" : "s"}. Dual club-core + school-rep users can post both after a refresh. You do not need to run this again.`, type: "success" } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: e.message || "Migration failed.", type: "error" } }));
    }
    return;
  }
  if (action === "soft-refresh") {
    await softRefreshCampusData({ showSkeleton: false });
    window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Campus data refreshed.", type: "info" } }));
    return;
  }

  if (action === "flag-content") {
    if (!window.RVUFirebase || !dataset.docid) return;
    const reason = await promptUser("Why are you reporting this?");
    if (!reason) return;
    await window.RVUFirebase.flagContent({
      collection: dataset.kind || "content",
      targetId: dataset.docid,
      title: dataset.title || "",
      reason,
    });
    window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Report sent to Super Admin.", type: "info" } }));
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
    window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: dataset.message || "Done", type: "info" } }));
  }
  if (action === "go-profile") {
    state.selectedClubSlug = null;
    state.createOpen = false;
    navigate("profile");
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
    // Preserve whatever the user has already typed. This re-renders the whole app, so
    // without capturing the open fields first, picking a year silently discarded the
    // Display Name and School the user had just entered.
    const typedName = document.getElementById("ep-name")?.value;
    const typedSchool = document.getElementById("ep-school")?.value;
    if (typedName !== undefined && typedName !== null) state.user.name = typedName;
    if (typedSchool) state.user.school = typedSchool;
    state.user.year = dataset.year;
    renderAtTop();
    return;
  }
  if (action === "submit-edit-profile") {
    const name = document.getElementById("ep-name")?.value?.trim();
    const school = document.getElementById("ep-school")?.value;
    if (!name) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Name cannot be empty.", type: "info" } }));
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
  if (action === "open-club-apply-modal") {
    state._clubApplyModalOpen = true;
    renderAtTop();
    return;
  }
  if (action === "close-club-apply-modal") {
    state._clubApplyModalOpen = false;
    renderAtTop();
    return;
  }
  if (action === "submit-club-application") {
    if (!window.RVUFirebase) return;
    const select = document.getElementById("club-apply-select");
    const clubId = select?.value;
    if (!clubId) return;
    
    try {
      const app = await window.RVUFirebase.submitClubApplication(clubId);
      state.clubApplications = [app, ...(state.clubApplications || [])];
      state._clubApplyModalOpen = false;
      renderAtTop();
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Club application submitted.", type: "info" } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: e.message || "Error submitting application.", type: "error" } }));
    }
    return;
  }
  if (action === "withdraw-club-application") {
    if (!window.RVUFirebase || !dataset.docid) return;
    if (!window.confirm("Are you sure you want to withdraw this application?")) return;
    
    try {
      await window.RVUFirebase.withdrawClubApplication(dataset.docid);
      const app = state.clubApplications.find(a => a.id === dataset.docid);
      if (app) app.status = "withdrawn";
      renderAtTop();
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Application withdrawn.", type: "info" } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: e.message || "Error withdrawing.", type: "error" } }));
    }
    return;
  }
  
  if (action === "start-school-rep-apply") {
    if (window.RVUFirebase) {
      if (!state.user.school) {
        window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Please select your school in your profile first.", type: "error" } }));
        return;
      }
      state._schoolRepApplyModalOpen = true;
      renderAtTop();
    }
    return;
  }
  
  if (action === "close-school-rep-apply-modal") {
    state._schoolRepApplyModalOpen = false;
    renderAtTop();
    return;
  }
  
  if (action === "submit-school-rep-apply") {
    if (window.RVUFirebase) {
      const reason = document.getElementById("sr-reason")?.value?.trim() || "";
      const dean = document.querySelector('input[name="sr-dean"]:checked')?.value;
      if (!reason || !dean) {
        window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Please provide a reason and confirm dean discussion.", type: "error" } }));
        return;
      }
      
      try {
        await window.RVUFirebase.submitHostRequest({
          type: "schoolRepresentative",
          schoolId: state.user.school,
          name: state.user.name,
          roleTitle: "Student Representative",
          description: reason,
          deanDiscussed: dean === "Yes",
          approver: "Super Admin",
        });
        state._schoolRepApplyModalOpen = false;
        startPendingAccessPolling();
        renderAtTop();
        window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "School rep application submitted for Super Admin review.", type: "success" } }));
      } catch (e) {
        window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Failed to apply.", type: "error" } }));
      }
    }
    return;
  }


  if (action === "load-club-applicants") {
    if (!window.RVUFirebase) return;
    let clubIds = dataset.club
      ? [dataset.club]
      : (state.host.clubAccesses || []).map((access) => access.club?.id || access.club?.slug).filter(Boolean);
    if (!clubIds.length) {
      const fallback = activeClub();
      if (fallback?.id || fallback?.slug) clubIds = [fallback.id || fallback.slug];
    }
    if (!clubIds.length) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "No club is linked to your core membership yet.", type: "error" } }));
      return;
    }
    try {
      state._clubApplicantsLoading = true;
      renderAtTop();
      const nested = await Promise.all(clubIds.map((clubId) => window.RVUFirebase.loadClubPendingApplications(clubId)));
      const seen = new Set();
      state.clubApplicants = nested.flat().filter((app) => {
        if (!app?.id || seen.has(app.id)) return false;
        seen.add(app.id);
        return true;
      });
      state._clubApplicantsLoaded = true;
      state._clubApplicantsLoading = false;
      renderAtTop();
    } catch (e) {
      state._clubApplicantsLoading = false;
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: e.message || "Failed to load applications.", type: "error" } }));
      renderAtTop();
    }
    return;
  }
  if (action === "approve-club-application") {
    if (!window.RVUFirebase || !dataset.docid) return;
    try {
      await window.RVUFirebase.approveClubApplication(dataset.docid, {
        uid: dataset.uid,
        email: dataset.email,
        name: dataset.name,
        clubId: dataset.club,
      });
      state.clubApplicants = state.clubApplicants.filter(a => a.id !== dataset.docid);
      renderAtTop();
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Approved. Ask them to refresh once — Admin unlocks from their core membership.", type: "success" } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: e.message || "Error approving.", type: "error" } }));
    }
    return;
  }
  if (action === "reject-club-application") {
    if (!window.RVUFirebase || !dataset.docid) return;
    if (!window.confirm("Reject this application?")) return;
    try {
      await window.RVUFirebase.rejectClubApplication(dataset.docid);
      state.clubApplicants = state.clubApplicants.filter(a => a.id !== dataset.docid);
      renderAtTop();
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Application rejected.", type: "info" } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: e.message || "Error rejecting.", type: "error" } }));
    }
    return;
  }
  if (action === "open-external-link") {
    // Only http(s). A club joinLink or event link is user-supplied, and window.open()
    // will happily execute a javascript: URL in the current document.
    const url = String(dataset.url || "").trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "That link is not a valid web address.", type: "error" } }));
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  if (action === "open-edit-club") {
    const club = clubs.find((item) => item.id === dataset.docid || item.slug === dataset.docid);
    if (!canManageClub(club)) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Only club core members of this club can edit it.", type: "error" } }));
      return;
    }
    state.editClubOpen = true;
    state.editClubId = dataset.docid;
    renderAtTop();
    return;
  }
  if (action === "close-edit-club") {
    state.editClubOpen = false;
    state.editClubId = null;
    renderAtTop();
    return;
  }
  if (action === "submit-edit-club") {
    if (!window.RVUFirebase || !dataset.docid) return;
    const club = clubs.find((item) => item.id === dataset.docid || item.slug === dataset.docid);
    if (!canManageClub(club)) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Only club core members of this club can edit it.", type: "error" } }));
      return;
    }
    const tagline = document.getElementById("ec-tagline")?.value?.trim() || "";
    const description = document.getElementById("ec-description")?.value?.trim() || "";
    const doing = document.getElementById("ec-doing")?.value?.trim() || "";
    const joinLink = document.getElementById("ec-join")?.value?.trim() || "";
    const highlightsRaw = document.getElementById("ec-highlights")?.value || "";
    const highlights = highlightsRaw.split("\n").map((s) => s.trim()).filter(Boolean);
    if (joinLink && !/^https?:\/\//.test(joinLink)) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Join link must start with http:// or https://", type: "info" } }));
      return;
    }
    try {
      await window.RVUFirebase.updateClubProfile(dataset.docid, {
        tagline,
        description,
        doing,
        join: joinLink,
        joinLink,
        highlights,
      });
      Object.assign(club, { tagline, description, doing, join: joinLink, joinLink, highlights });
      state.editClubOpen = false;
      state.editClubId = null;
      renderAtTop();
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: "Club profile updated.", type: "info" } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: e.message || "Could not update club.", type: "error" } }));
    }
    return;
  }

  renderAtTop();
}

window.addEventListener("rvu-auth-user", (event) => {
  if (event.detail) {
    enterAuthenticatedApp(event.detail);
  } else {
    state.authed = false;
    state.authUser = null;
    state.role = "student";
    state.dataLoading = false;
    render();
  }
});

window.addEventListener("rvu-auth-error", (event) => {
  if (event.detail) window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message: event.detail, type: "info" } }));
});

if (window.RVUFirebase?.auth?.currentUser) {
  enterAuthenticatedApp(window.RVUFirebase.auth.currentUser);
} else {
  state.dataLoading = false;
  render();
}

initRouter();
