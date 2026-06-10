import { promptUser, validateClubDraft } from './utils.js';
import { schools, interests, events, clubs, announcements, projects, state, defaultClubDraft, app } from './state.js';
import { isClubCore, isSchoolRep, isSuperAdmin, canHost, activeClub, isAllowedRvuEmail, syncFirebaseData, enterAuthenticatedApp, enterDemoApp, handleSignOut, startFirebaseLogin } from './auth.js';
import { render, renderAtTop, renderSearchResultsHtml } from './ui.js';

export function bindEvents() {
  if (!window.rvuAuthListenersBound) {
    window.rvuAuthListenersBound = true;
    window.addEventListener("rvu-auth-user", (event) => {
      if (event.detail && !state.authed) {
        enterAuthenticatedApp(event.detail).catch((error) => {
          window.alert(error.message || "Could not complete sign-in.");
        });
      }
    });
    window.addEventListener("rvu-auth-error", (event) => {
      if (event.detail) window.alert(event.detail);
    });
    if (window.RVUFirebase?.auth?.currentUser && !state.authed) {
      enterAuthenticatedApp(window.RVUFirebase.auth.currentUser).catch((error) => {
        window.alert(error.message || "Could not restore session.");
      });
    }
  }

  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      state.route = button.dataset.route;
      if (state.route !== "clubs") state.selectedClubSlug = null;
      state.createOpen = false;
      renderAtTop();
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
          window.alert(error.message || "Action failed.");
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
                window.alert(error.message || "Action failed.");
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
      if (key === "authEmail") state.authEmail = field.value;
      if (key === "authPassword") state.authPassword = field.value;
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
        state.host.name = `${state.host.school} Office`;
        state.host.category = "School";
        state.host.approver = "Super Admin";
        state.host.approved = false;
        state.adminScope = "school";
        state.onboardingStep = "host-info";
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
  if (!isAllowedRvuEmail(currentPresidentEmail)) return window.alert("Current president email must end with @rvu.edu.in.");
  const facultyAdvisorName = await promptUser("Faculty advisor name", club.facultyAdvisorName || "");
  if (facultyAdvisorName == null) return;
  const facultyAdvisorEmail = await promptUser("Faculty advisor RVU email (@rvu.edu.in)", club.facultyAdvisorEmail || "");
  if (!isAllowedRvuEmail(facultyAdvisorEmail)) return window.alert("Faculty advisor email must end with @rvu.edu.in.");

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
  await syncFirebaseData();
}

export async function handleAction(action, dataset) {
  if (action === "open-login") {
    state.loginOpen = true;
  }
  if (action === "close-login") {
    state.loginOpen = false;
    state.authPassword = "";
  }
  if (action === "auth-mode") {
    state.authMode = dataset.mode;
  }
  if (action === "login-google") {
    startFirebaseLogin("google");
    return;
  }
  if (action === "login-password") {
    startFirebaseLogin("password");
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
    }
    state.onboardingStep = null;
    state.route = "home";
  }
  if (action === "create-new-club-onboarding") {
    state.onboardingStep = "create-club";
  }
  if (action === "back-to-host-info") {
    state.onboardingStep = "host-info";
  }
  if (action === "submit-new-club") {
    if (!state.clubDraft.name || !state.clubDraft.category) {
      window.alert("Club name and category are required.");
      return;
    }
    if (window.RVUFirebase) {
      await window.RVUFirebase.submitNewClubCreationRequest(state.clubDraft);
    }
    state.host.approved = false;
    state.host.name = state.clubDraft.name;
    state.host.type = "New Club Creation";
    state.onboardingStep = "host-review";
    state.route = "home";
  }
  if (action === "submit-host") {
    const isClubIntent = state._onboardingIntent === "club-core";
    const isSchoolIntent = state._onboardingIntent === "school-rep";
    
    if (isClubIntent && state.host.selectedClubIds.length === 0) {
      window.alert("Please select at least one club or create a new one.");
      return;
    }
    
    let designation = "";
    let department = "";
    if (isSchoolIntent) {
      designation = document.getElementById("srep-designation")?.value || "";
      department = document.getElementById("srep-department")?.value?.trim() || "";
      state.host.facultyDesignation = designation;
      state.host.facultyDepartment = department;
      state.host.isFaculty = designation !== "Student Rep";
    }

    if (window.RVUFirebase) {
      if (isClubIntent) {
        await window.RVUFirebase.submitMultiClubCoreRequest(state.host.selectedClubIds, {
          name: state.host.name,
          roleTitle: state.host.roleTitle,
        });
      } else {
        await window.RVUFirebase.submitHostRequest({
          type: "schoolRepresentative",
          schoolId: state.host.school,
          name: state.host.name,
          roleTitle: state.host.roleTitle,
          description: state.host.description,
          joinLink: state.host.joinLink,
          approver: state.host.approver,
          facultyDesignation: designation,
          facultyDepartment: department,
        });
      }
    }
    state.host.approved = false;
    state.onboardingStep = "host-review";
    state.route = "home";
  }
  if (action === "host-review") {
    state.onboardingStep = "host-review";
  }
  if (action === "close-onboarding") {
    state.onboardingStep = null;
    if (isClubCore() || isSchoolRep()) state.route = "admin";
  }
  if (action === "toggle-create") {
    state.createOpen = !state.createOpen;
  }
  if (action === "create-event") {
    if (!canHost() && !isSuperAdmin()) {
      window.alert("You need an approved club core or school representative role to create events.");
      return;
    }
    state.createEventOpen = true;
    state.createOpen = false;
    render();
    return;
  }
  if (action === "create-announcement") {
    if (!canHost() && !isSuperAdmin()) {
      window.alert("You need an approved club core or school representative role to create announcements.");
      return;
    }
    state.createAnnouncementOpen = true;
    state.createOpen = false;
    render();
    return;
  }
  if (action === "open-club") {
    state.route = "clubs";
    state.selectedClubSlug = dataset.club;
  }
  if (action === "back-to-clubs") {
    state.selectedClubSlug = null;
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
      await syncFirebaseData();
    }
  }
  if (action === "reject-host") {
    if (window.RVUFirebase && dataset.request) {
      await window.RVUFirebase.updateHostRequestStatus(dataset.request, "rejected");
      await syncFirebaseData();
    }
  }
  if (action === "sign-out") {
    await handleSignOut();
    return;
  }
  if (action === "admin-tab") {
    state.adminTab = dataset.tab || "requests";
  }
  if (action === "admin-create-club") {
    if (!isSuperAdmin()) return;
    state.clubDraft = defaultClubDraft();
    state.route = "admin-create-club";
    renderAtTop();
    return;
  }
  if (action === "admin-back-to-clubs") {
    state.route = "admin";
    state.adminTab = "clubs";
    renderAtTop();
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
    if (error) return window.alert(error);
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
    state.route = "admin";
    state.adminTab = "clubs";
    await syncFirebaseData();
    renderAtTop();
    return;
  }
  if (action === "admin-create-school") {
    if (!window.RVUFirebase || !isSuperAdmin()) return;
    const name = await promptUser("School name");
    if (!name) return;
    const shortName = await promptUser("Short name (optional)") || "";
    const description = await promptUser("Description") || "";
    const leadEmail = await promptUser("Lead/admin RVU email optional (@rvu.edu.in)") || "";
    if (leadEmail && !isAllowedRvuEmail(leadEmail)) return window.alert("Lead email must end with @rvu.edu.in.");
    await window.RVUFirebase.createSchool({
      name,
      shortName,
      description,
      leadEmail,
    });
    await syncFirebaseData();
  }
  if (action === "admin-delete-school") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    if (!window.confirm("Delete this school record?")) return;
    await window.RVUFirebase.deleteDocument("schools", dataset.docid);
    await syncFirebaseData();
  }
  if (action === "admin-assign-core") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    const email = await promptUser("Core member RVU email (@rvu.edu.in)");
    if (!isAllowedRvuEmail(email)) return window.alert("Core email must end with @rvu.edu.in.");
    const name = await promptUser("Core member name") || email;
    const role = await promptUser("Core role (e.g. designLead, eventsLead, treasurer)") || "core";
    await window.RVUFirebase.assignClubCoreRole(dataset.docid, { email, name, role });
    await syncFirebaseData();
  }
  if (action === "admin-update-club-leadership") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    const club = state.allClubs.find((item) => item.id === dataset.docid) || {};
    await updateClubLeadershipFromPrompt(dataset.docid, club);
  }
  if (action === "club-update-leadership") {
    if (!window.RVUFirebase || !dataset.docid) return;
    const club = activeClub();
    await updateClubLeadershipFromPrompt(dataset.docid, club);
  }
  if (action === "club-assign-core") {
    if (!window.RVUFirebase || !dataset.docid) return;
    const email = await promptUser("Core member RVU email (@rvu.edu.in)");
    if (!isAllowedRvuEmail(email)) return window.alert("Core email must end with @rvu.edu.in.");
    const name = await promptUser("Core member name") || email;
    const role = await promptUser("Core role (e.g. eventsLead, designLead, treasurer)") || "core";
    await window.RVUFirebase.assignClubCoreRole(dataset.docid, { email, name, role });
    await syncFirebaseData();
  }
  if (action === "admin-remove-core") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    const email = await promptUser("Core member email to remove");
    if (!email) return;
    if (!window.confirm(`Remove ${email} from this club core?`)) return;
    await window.RVUFirebase.removeClubCoreRole(dataset.docid, email);
    await syncFirebaseData();
  }
  if (action === "club-remove-core") {
    if (!window.RVUFirebase || !dataset.docid) return;
    const email = await promptUser("Core member email to remove");
    if (!email) return;
    if (!window.confirm(`Remove ${email} from this club core?`)) return;
    await window.RVUFirebase.removeClubCoreRole(dataset.docid, email);
    await syncFirebaseData();
  }
  if (action === "admin-delete-club") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    if (!window.confirm("Delete this club? This cannot be undone.")) return;
    await window.RVUFirebase.deleteDocument("clubs", dataset.docid);
    await syncFirebaseData();
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
    await window.RVUFirebase.createEvent({
      title,
      description,
      date,
      time,
      location,
      host,
      type: await promptUser("Type: Club Event, Faculty Event, School Event") || "School Event",
      hostType: "admin",
      tags: [],
      status: "published",
    });
    await syncFirebaseData();
  }
  if (action === "admin-create-announcement") {
    if (!window.RVUFirebase || !isSuperAdmin()) return;
    const title = await promptUser("Announcement title");
    if (!title) return;
    await window.RVUFirebase.createAnnouncement({
      title,
      description: await promptUser("Description") || "",
      source: await promptUser("Source") || "RVU",
      tag: await promptUser("Tag") || "Notice",
      type: "Faculty",
      sourceType: "admin",
      time: "Just now",
      status: "published",
    });
    await syncFirebaseData();
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
      window.alert("Title and description are required.");
      return;
    }
    const skills = (document.getElementById("cp-skills")?.value || "").split(",").map(s => s.trim()).filter(Boolean);
    const tags = (document.getElementById("cp-tags")?.value || "").split(",").map(t => t.trim()).filter(Boolean);
    const expiry = document.getElementById("cp-expiry")?.value || "";
    const phone = document.getElementById("cp-phone")?.value?.trim() || "";
    await window.RVUFirebase.createProject({
      title,
      description,
      skills,
      tags,
      expiry,
      contactPhone: phone,
      postedBy: state.authUser?.email || state.user.name || "Student",
      postedByName: state.user.name || "",
      status: "open",
      score: 0,
    });
    state.createProjectOpen = false;
    await syncFirebaseData();
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
    if (!title || !description || !date || !time || !location) {
      window.alert("Title, description, date, time and location are required.");
      return;
    }
    const link = document.getElementById("ce-link")?.value?.trim() || "";
    const posterUrl = document.getElementById("ce-poster")?.value?.trim() || "";
    const collab = document.getElementById("ce-collab")?.value || "";
    let club = activeClub();
    const hostClubId = document.getElementById("ce-host-club")?.value;
    if (hostClubId && state.host.clubAccesses) {
      const access = state.host.clubAccesses.find(a => a.club.id === hostClubId || a.club.slug === hostClubId);
      if (access) club = access.club;
    }
    const payload = isClubCore() ? {
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
    } : {
      title, description, date, time, location,
      hostType: "school",
      schoolId: state.host.school,
      host: state.host.school,
      type: "School Event",
      tags: [],
      link: link || null,
      posterUrl: posterUrl || null,
      facultyDesignation: state.host.facultyDesignation || "",
      hostName: state.host.name || "",
      schoolName: state.host.school || "",
    };
    await window.RVUFirebase.createEvent(payload);
    state.createEventOpen = false;
    await syncFirebaseData();
    renderAtTop();
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

    if (!title || !description) {
      window.alert("Title and description are required.");
      return;
    }

    const payload = {
      title,
      description,
      tag,
      time: "Just now",
      status: "published",
    };

    if (imageUrl) {
      payload.imageUrl = imageUrl;
    }

    if (isClubCore()) {
      const club = activeClub();
      payload.source = club.name;
      payload.type = "Club";
      payload.clubId = club.id || club.slug;
    } else if (isSchoolRep()) {
      payload.source = state.host.school;
      payload.sourceType = "school";
      payload.type = "Faculty";
      payload.schoolId = state.host.school;
      payload.facultyDesignation = state.host.facultyDesignation || "";
      payload.hostName = state.host.name || "";
      payload.schoolName = state.host.school || "";
    } else if (isSuperAdmin()) {
      payload.source = "RVU";
      payload.sourceType = "admin";
      payload.type = "Faculty";
    }

    await window.RVUFirebase.createAnnouncement(payload);
    state.createAnnouncementOpen = false;
    await syncFirebaseData();
    renderAtTop();
    return;
  }
  if (action === "admin-unpublish-event") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    await window.RVUFirebase.updateEventStatus(dataset.docid, "draft");
    await syncFirebaseData();
  }
  if (action === "admin-publish-event") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    await window.RVUFirebase.updateEventStatus(dataset.docid, "published");
    await syncFirebaseData();
  }
  if (action === "admin-unpublish-announcement") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    await window.RVUFirebase.updateAnnouncementStatus(dataset.docid, "draft");
    await syncFirebaseData();
  }
  if (action === "admin-delete-event") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    if (!window.confirm("Delete this event permanently?")) return;
    await window.RVUFirebase.deleteDocument("events", dataset.docid);
    await syncFirebaseData();
  }
  if (action === "admin-delete-announcement") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    if (!window.confirm("Delete this announcement permanently?")) return;
    await window.RVUFirebase.deleteDocument("announcements", dataset.docid);
    await syncFirebaseData();
  }
  if (action === "admin-delete-project") {
    if (!window.RVUFirebase || !isSuperAdmin() || !dataset.docid) return;
    if (!window.confirm("Delete this project permanently?")) return;
    await window.RVUFirebase.deleteDocument("projects", dataset.docid);
    await syncFirebaseData();
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
    state.selectedEventId = dataset.docid;
    state.selectedProjectId = null;
    state.selectedAnnouncementId = null;
    state.route = "events";
    renderAtTop();
    return;
  }
  if (action === "search-open-club") {
    state.searchOpen = false;
    state.selectedClubSlug = dataset.slug;
    state.selectedEventId = null;
    state.selectedProjectId = null;
    state.selectedAnnouncementId = null;
    state.route = "clubs";
    renderAtTop();
    return;
  }
  if (action === "search-open-project") {
    state.searchOpen = false;
    state.selectedProjectId = dataset.docid;
    state.selectedEventId = null;
    state.selectedAnnouncementId = null;
    state.route = "projects";
    renderAtTop();
    return;
  }
  if (action === "search-open-announcement") {
    state.searchOpen = false;
    state.selectedAnnouncementId = dataset.docid;
    state.selectedEventId = null;
    state.selectedProjectId = null;
    state.route = "announcements";
    renderAtTop();
    return;
  }
  if (action === "toggle-project-status") {
    if (!window.RVUFirebase || !dataset.docid) return;
    const newStatus = dataset.status === "open" ? "closed" : "open";
    await window.RVUFirebase.updateDocument("projects", dataset.docid, { status: newStatus });
    await syncFirebaseData();
    renderAtTop();
    return;
  }
  if (action === "delete-own-project") {
    if (!window.RVUFirebase || !dataset.docid) return;
    if (!window.confirm(`Delete "${dataset.title}"? This cannot be undone.`)) return;
    await window.RVUFirebase.deleteDocument("projects", dataset.docid);
    state.selectedProjectId = null;
    await syncFirebaseData();
    renderAtTop();
    return;
  }
  if (action === "open-project-detail") {
    state.selectedProjectId = dataset.docid;
    renderAtTop();
    return;
  }
  if (action === "close-project-detail") {
    state.selectedProjectId = null;
    renderAtTop();
    return;
  }
  if (action === "close-event-detail") {
    state.selectedEventId = null;
    renderAtTop();
    return;
  }
  if (action === "open-event-detail") {
    state.selectedEventId = dataset.docid;
    renderAtTop();
    return;
  }
  if (action === "open-announcement-detail") {
    state.selectedAnnouncementId = dataset.docid;
    renderAtTop();
    return;
  }
  if (action === "close-announcement-detail") {
    state.selectedAnnouncementId = null;
    renderAtTop();
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
    if (!title || !description) {
      window.alert("Title and description required.");
      return;
    }
    await window.RVUFirebase.updateDocument("announcements", state.editAnnouncementId, {
      title,
      description,
      imageUrl: imageUrl || null,
    });
    state.editAnnouncementOpen = false;
    state.editAnnouncementId = null;
    await syncFirebaseData();
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
    await syncFirebaseData();
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
    if (!title || !description) {
      window.alert("Title and description required.");
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
    });
    state.editEventOpen = false;
    state.editEventId = null;
    await syncFirebaseData();
    renderAtTop();
    return;
  }
  if (action === "save-item") {
    if (!window.RVUFirebase || !dataset.docid) return;
    const itemData = { itemId: dataset.docid, type: dataset.kind || "item", title: dataset.title || "", id: dataset.docid };
    state.savedItems = [...(state.savedItems || []), itemData];
    render();
    await window.RVUFirebase.saveItem(itemData);
    window.alert("Saved to your campus dashboard.");
    return;
  }
  if (action === "follow-club") {
    if (!window.RVUFirebase || !dataset.docid) return;
    state.followedClubs = [...(state.followedClubs || []), { clubId: dataset.docid, title: dataset.title || "", id: dataset.docid }];
    render();
    await window.RVUFirebase.followClub(dataset.docid, dataset.title || "");
    window.alert("Club followed.");
    return;
  }
  if (action === "unfollow-club") {
    if (!window.RVUFirebase || !dataset.docid) return;
    state.followedClubs = (state.followedClubs || []).filter(c => c.clubId !== dataset.docid && c.id !== dataset.docid);
    render();
    await window.RVUFirebase.unfollowClub(dataset.docid);
    return;
  }
  if (action === "rsvp-event") {
    if (!window.RVUFirebase || !dataset.docid) return;
    state.rsvps = [...(state.rsvps || []), { eventId: dataset.docid, title: dataset.title || "", status: "going", id: dataset.docid }];
    render();
    await window.RVUFirebase.rsvpEvent(dataset.docid, { title: dataset.title || "", status: "going" });
    window.alert("RSVP saved.");
    return;
  }
  if (action === "apply-project") {
    if (!window.RVUFirebase || !dataset.docid) return;
    const note = await promptUser("Short application note optional") || "";
    state.myApplications = [...(state.myApplications || []), { projectId: dataset.docid, title: dataset.title || "", status: "pending", id: dataset.docid }];
    render();
    await window.RVUFirebase.applyToProject(dataset.docid, {
      title: dataset.title || "",
      name: state.user.name || state.authUser?.displayName || "",
      note,
    });
    window.alert("Application submitted.");
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
    window.alert("Report sent to Super Admin.");
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
    window.alert(dataset.message || "Done");
  }
  if (action === "go-profile") {
    state.route = "profile";
    state.selectedClubSlug = null;
    state.createOpen = false;
    renderAtTop();
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
    state.user.year = dataset.year;
    renderAtTop();
    return;
  }
  if (action === "submit-edit-profile") {
    const name = document.getElementById("ep-name")?.value?.trim();
    const school = document.getElementById("ep-school")?.value;
    if (!name) {
      window.alert("Name cannot be empty.");
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
  if (event.detail) window.alert(event.detail);
});

if (window.RVUFirebase?.auth?.currentUser) {
  enterAuthenticatedApp(window.RVUFirebase.auth.currentUser);
} else {
  state.dataLoading = false;
  render();
}

window.addEventListener("popstate", (event) => {
  if (event.state && event.state.route) {
    state.route = event.state.route;
  } else {
    state.route = new URLSearchParams(window.location.search).get("route") || "home";
  }
  renderAtTop();
});
