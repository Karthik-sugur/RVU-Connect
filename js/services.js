import { app, auth, db, functions, analytics } from "./firebase-init.js";
import { getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, doc, collection, query, where, orderBy, limit, startAfter, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";
import { handleFirebaseError } from "./errors.js";


function isRvuEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase().endsWith(RVU_EMAIL_DOMAIN);
}

async function requireRvuUser(user) {
  if (!user?.email || !isRvuEmail(user.email)) {
    await signOut(auth);
    throw new Error("Only @rvu.edu.in accounts can use RVU Connect.");
  }
  return user;
}

async function signInWithEmailPassword(email, password) {
  if (!isRvuEmail(email)) throw new Error("Use your @rvu.edu.in email address.");
  const result = await signInWithEmailAndPassword(auth, email, password);
  return requireRvuUser(result.user);
}

async function createEmailPasswordAccount(email, password) {
  if (!isRvuEmail(email)) throw new Error("Use your @rvu.edu.in email address.");
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return requireRvuUser(result.user);
}

async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ hd: "rvu.edu.in", prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  return requireRvuUser(result.user);
}

onAuthStateChanged(auth, (user) => {
  window.dispatchEvent(new CustomEvent("rvu-auth-user", { detail: user }));
});

function rows(snapshot) {
  return snapshot.docs.map((item) => ({ id: item.id, slug: item.id, ...item.data() }));
}

async function rowsOrEmpty(label, promise) {
  try {
    return rows(await promise);
  } catch (error) {
    if (error?.code !== "permission-denied") {
      console.warn(`RVU Connect could not load ${label}:`, error);
    }
    return [];
  }
}

let _cachedSuperAdminResult = null;

async function hasSuperAdminGrant(user) {
  if (!user?.uid || !user?.email) return false;
  if (_cachedSuperAdminResult !== null) return _cachedSuperAdminResult;
  const email = user.email.trim();
  const [uidGrant, emailGrant] = await Promise.all([
    getDoc(doc(db, "superAdmins", user.uid)).catch((err) => {
      console.warn("Failed to check superAdmin uid:", err);
      return null;
    }),
    getDoc(doc(db, "superAdmins", email)).catch((err) => {
      console.warn("Failed to check superAdmin email:", err);
      return null;
    }),
  ]);
  _cachedSuperAdminResult = Boolean(uidGrant?.exists() || emailGrant?.exists());
  return _cachedSuperAdminResult;
}

async function ensureUserProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const superAdmin = await hasSuperAdminGrant(user);
  if (snap.exists()) {
    const profile = { id: snap.id, ...snap.data() };
    return superAdmin ? { ...profile, role: "superAdmin" } : profile;
  }

  // Temporary: Always create new profiles as student.
  // The architecture for role assignment (clubCore, superAdmin) will be moved to Cloud Functions.
  const profile = {
    email: user.email,
    name: user.displayName || user.email.split("@")[0],
    role: "student",
    clubIds: [],
    roleTitle: "",
    interests: [],
    onboardingComplete: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  
  const resultProfile = { id: user.uid, ...profile };
  return superAdmin ? { ...resultProfile, role: "superAdmin" } : resultProfile;
}

async function saveUserProfile(uid, data) {
  await updateDoc(doc(db, "users", uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

let lastDocs = { events: null, announcements: null, projects: null };

async function loadCampusData({ superAdmin = false, profile = {} } = {}) {
  const eventsSnap = await getDocs(query(collection(db, "events"), where("status", "==", "published"), orderBy("createdAt", "desc"), limit(20))).catch(() => ({ docs: [] }));
  const announcementsSnap = await getDocs(query(collection(db, "announcements"), where("status", "==", "published"), orderBy("createdAt", "desc"), limit(20))).catch(() => ({ docs: [] }));
  const projectsSnap = await getDocs(query(collection(db, "projects"), orderBy("createdAt", "desc"), limit(20))).catch(() => ({ docs: [] }));

  lastDocs.events = eventsSnap.docs[eventsSnap.docs.length - 1] || null;
  lastDocs.announcements = announcementsSnap.docs[announcementsSnap.docs.length - 1] || null;
  lastDocs.projects = projectsSnap.docs[projectsSnap.docs.length - 1] || null;

  const [clubsRows, settingsRows] = await Promise.all([
    rowsOrEmpty("approved clubs", getDocs(query(collection(db, "clubs"), where("status", "==", "approved"), limit(100)))),
    rowsOrEmpty("site settings", getDocs(collection(db, "siteSettings"))),
  ]);

  const eventRows = rows(eventsSnap);
  const announcementRows = rows(announcementsSnap);
  const projectRows = rows(projectsSnap);

  const data = {
    clubs: clubsRows,
    events: eventRows,
    announcements: announcementRows,
    projects: projectRows,
    hostRequests: [],
    moderationFlags: [],
    allUsers: [],
    allEvents: [],
    allAnnouncements: [],
    allClubs: [],
    allSchools: [],
    auditLogs: [],
    contentReviews: [],
    savedItems: [],
    followedClubs: [],
    rsvps: [],
    myApplications: [],
    siteSettings: settingsRows,
    clubAccess: null,
  };

  if (auth.currentUser?.email) {
    const email = auth.currentUser.email;
    const uid = auth.currentUser.uid;
    const [savedRows, followRows, rsvpRows, applicationRows] = await Promise.all([
      rowsOrEmpty("saved items", getDocs(collection(db, "users", uid, "savedItems"))),
      rowsOrEmpty("followed clubs", getDocs(collection(db, "users", uid, "followedClubs"))),
      rowsOrEmpty("event RSVPs", getDocs(collection(db, "users", uid, "rsvps"))),
      rowsOrEmpty("project applications", getDocs(collection(db, "users", uid, "applications"))),
    ]);
    let memberDocs = [];
    const userClubIds = profile.clubIds || (profile.clubId ? [profile.clubId] : []);
    for (const cId of userClubIds) {
      const club = data.clubs.find(c => c.id === cId || c.slug === cId);
      if (club) {
        const memberSnap = await getDoc(doc(db, "clubs", club.id, "coreMembers", email));
        if (memberSnap.exists() && memberSnap.data().status === "approved") {
          memberDocs.push({ club, member: { id: memberSnap.id, ...memberSnap.data() } });
        }
      }
    }
    data.clubAccesses = memberDocs;
    data.clubAccess = memberDocs.find((entry) => entry?.member?.status === "approved") || null;
    data.savedItems = savedRows;
    data.followedClubs = followRows;
    data.rsvps = rsvpRows;
    data.myApplications = applicationRows;
  }

  if (superAdmin) {
    // Only load basic admin context initially, not everything.
    const [allClubRows, allSchoolRows] = await Promise.all([
      rowsOrEmpty("all clubs", getDocs(query(collection(db, "clubs"), limit(100)))),
      rowsOrEmpty("all schools", getDocs(query(collection(db, "schools"), limit(100)))),
    ]);
    data.allClubs = allClubRows;
    data.allSchools = allSchoolRows;
  }

  return data;
}

async function submitHostRequest(payload) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before submitting a host request.");
  const request = {
    ...payload,
    uid: user.uid,
    email: user.email,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "hostRequests"), request);

  if (payload.type == "clubCore" && payload.clubId) {
    await setDoc(doc(db, "clubs", payload.clubId, "coreMembers", user.email), {
      uid: user.uid,
      email: user.email,
      name: payload.name,
      role: payload.roleTitle || "core",
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  if (payload.type == "schoolRepresentative" && payload.schoolId) {
    await setDoc(doc(db, "schools", payload.schoolId, "representatives", user.uid), {
      email: user.email,
      name: payload.name,
      role: payload.roleTitle || "representative",
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return ref.id;
}

// Submit core-member requests for one or more existing approved clubs.
// Creates one hostRequest doc per club, and a pending coreMembers entry per club.
async function submitMultiClubCoreRequest(clubIds, { name, roleTitle }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before submitting a host request.");
  if (!clubIds || clubIds.length === 0) throw new Error("Select at least one club.");

  const results = [];
  for (const clubId of clubIds) {
    const memberName = name || user.displayName || user.email.split("@")[0];
    const memberRole = roleTitle || "Core Member";
    const request = {
      type: "clubCore",
      clubId,
      uid: user.uid,
      email: user.email,
      name: memberName,
      roleTitle: memberRole,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, "hostRequests"), request);
    await setDoc(doc(db, "clubs", clubId, "coreMembers", user.email.toLowerCase()), {
      uid: user.uid,
      email: user.email,
      name: memberName,
      role: memberRole,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    results.push(ref.id);
  }
  return results;
}

// Submit a request to create a brand-new club. Goes to super admin for approval.
async function submitNewClubCreationRequest(clubDraft) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before submitting a club creation request.");
  const ref = await addDoc(collection(db, "hostRequests"), {
    type: "newClub",
    uid: user.uid,
    email: user.email,
    name: user.displayName || user.email.split("@")[0],
    roleTitle: clubDraft.founderRole || "President",
    clubName: clubDraft.name || "",
    clubCategory: clubDraft.category || "",
    clubSchool: clubDraft.school || "",
    clubDescription: clubDraft.description || "",
    clubTagline: clubDraft.tagline || "",
    founderName: user.displayName || user.email.split("@")[0],
    founderEmail: user.email,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

async function updateClubRegistration(clubId, registrationOpen) {
  await updateDoc(doc(db, "clubs", clubId), {
    registrationOpen,
    updatedAt: serverTimestamp(),
  });
}

async function updateHostRequestStatus(requestId, status) {
  const func = httpsCallable(functions, 'updateHostRequestStatus');
  await func({ requestId, status });
}

async function createEvent(payload) {
  const ref = await addDoc(collection(db, "events"), {
    ...payload,
    status: payload.status || "published",
    createdBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ...payload, createdAt: new Date().toISOString() };
  await logAudit("create-event", "events", ref.id, payload.title);
  return ref.id;
}

async function createAnnouncement(payload) {
  const ref = await addDoc(collection(db, "announcements"), {
    ...payload,
    status: payload.status || "published",
    createdBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ...payload, createdAt: new Date().toISOString() };
  await logAudit("create-announcement", "announcements", ref.id, payload.title);
  return ref.id;
}

async function createProject(payload) {
  const ref = await addDoc(collection(db, "projects"), {
    ...payload,
    status: payload.status || "open",
    ownerId: auth.currentUser?.uid,
    createdBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ...payload, createdAt: new Date().toISOString() };
  await logAudit("create-project", "projects", ref.id, payload.title);
  return ref.id;
}

/* ── Admin CRUD operations ── */

async function updateUserRole(uid, role) {
  await updateDoc(doc(db, "users", uid), {
    role,
    updatedAt: serverTimestamp(),
  });
}

async function createClub(payload) {
  const founderEmail = payload.founderEmail?.trim().toLowerCase();
  const facultyAdvisorEmail = payload.facultyAdvisorEmail?.trim().toLowerCase();
  const currentPresidentEmail = payload.currentPresidentEmail?.trim().toLowerCase();
  const ref = await addDoc(collection(db, "clubs"), {
    ...payload,
    founderEmail,
    facultyAdvisorEmail,
    currentPresidentEmail,
    status: payload.status || "approved",
    registrationOpen: payload.registrationOpen || false,
    highlights: payload.highlights || [],
    createdBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const foundingMembers = [
    { email: currentPresidentEmail, name: payload.currentPresidentName || "Current President", role: "president", permanent: false },
    { email: founderEmail, name: payload.founderName || "Founder", role: "founder", permanent: true },
    { email: facultyAdvisorEmail, name: payload.facultyAdvisorName || "Faculty Advisor", role: "facultyAdvisor", permanent: false },
  ].filter((member, index, list) =>
    member.email && list.findIndex((candidate) => candidate.email === member.email) === index
  );

  await Promise.all(foundingMembers.map((member) => setDoc(doc(db, "clubs", ref.id, "coreMembers", member.email), {
    ...member,
    status: "approved",
    assignedBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })));

  await logAudit("create-club", "clubs", ref.id, payload.name);
  return ref.id;
}

async function createSchool(payload) {
  const ref = await addDoc(collection(db, "schools"), {
    ...payload,
    status: payload.status || "active",
    createdBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await logAudit("create-school", "schools", ref.id, payload.name);
  return ref.id;
}

async function logAudit(action, collectionName, targetId, title = "") {
  if (!auth.currentUser) return;
  await addDoc(collection(db, "auditLogs"), {
    action,
    collection: collectionName,
    targetId,
    title,
    adminEmail: auth.currentUser.email,
    adminId: auth.currentUser.uid,
    createdAt: serverTimestamp(),
  }).catch((err) => {
    console.warn("Failed to log audit action:", err);
  });
}

async function grantPlatformRole({ email, uid, role }) {
  const normalizedEmail = email?.trim();
  if (role === "superAdmin") {
    const func = httpsCallable(functions, 'grantSuperAdmin');
    await func({ email: normalizedEmail });
    return;
  }
  if (role === "student") {
    const func = httpsCallable(functions, 'revokeSuperAdmin');
    await func({ email: normalizedEmail });
    return;
  }
  if (!uid) throw new Error("A Firebase Auth UID is required for user role updates.");
  await updateUserRole(uid, role || "student");
}

async function assignClubCoreRole(clubId, { email, name, role }) {
  const func = httpsCallable(functions, 'updateClubMemberStatus');
  await func({ clubId, targetEmail: email, action: 'approve' });
}

async function removeClubCoreRole(clubId, email) {
  const func = httpsCallable(functions, 'updateClubMemberStatus');
  await func({ clubId, targetEmail: email, action: 'remove' });
}

async function updateClubLeadership(clubId, data) {
  const updates = {};
  if (data.currentPresidentName !== undefined) updates.currentPresidentName = data.currentPresidentName;
  if (data.currentPresidentEmail !== undefined) updates.currentPresidentEmail = data.currentPresidentEmail.trim().toLowerCase();
  if (data.facultyAdvisorName !== undefined) updates.facultyAdvisorName = data.facultyAdvisorName;
  if (data.facultyAdvisorEmail !== undefined) updates.facultyAdvisorEmail = data.facultyAdvisorEmail.trim().toLowerCase();
  await updateDoc(doc(db, "clubs", clubId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

async function updateClub(clubId, data) {
  await updateDoc(doc(db, "clubs", clubId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

async function updateClubProfile(clubId, data) {
  await updateDoc(doc(db, "clubs", clubId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
  await logAudit("update-club-profile", "clubs", clubId, data.name || "");
}

async function deleteDocument(collectionName, docId) {
  await firestoreDeleteDoc(doc(db, collectionName, docId));
  await logAudit("delete-document", collectionName, docId);
}

async function updateDocument(collectionName, docId, data) {
  await updateDoc(doc(db, collectionName, docId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

async function updateEventStatus(eventId, status) {
  await updateDoc(doc(db, "events", eventId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

async function updateAnnouncementStatus(announcementId, status) {
  await updateDoc(doc(db, "announcements", announcementId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

async function updateSiteSetting(settingId, data) {
  await setDoc(doc(db, "siteSettings", settingId), {
    ...data,
    updatedBy: auth.currentUser?.uid,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await logAudit("update-site-setting", "siteSettings", settingId);
}

async function createContentReview(payload) {
  const ref = await addDoc(collection(db, "contentReviews"), {
    ...payload,
    status: payload.status || "pending",
    createdBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await logAudit("create-content-review", "contentReviews", ref.id, payload.title);
  return ref.id;
}

async function updateContentReviewStatus(reviewId, status) {
  await updateDoc(doc(db, "contentReviews", reviewId), {
    status,
    reviewedBy: auth.currentUser?.uid,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await logAudit("review-content", "contentReviews", reviewId, status);
}

async function saveItem({ itemId, type, title }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  await setDoc(doc(db, "users", user.uid, "savedItems", `${type}_${itemId}`), {
    itemId,
    type,
    title: title || "",
    createdAt: serverTimestamp(),
  });
}

async function followClub(clubId, clubName) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  await setDoc(doc(db, "users", user.uid, "followedClubs", clubId), {
    clubId,
    clubName: clubName || "",
    createdAt: serverTimestamp(),
  });
}

async function unfollowClub(clubId) {
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, "users", user.uid, "followedClubs", clubId);
  await firestoreDeleteDoc(ref);
}

async function rsvpEvent(eventId, payload = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  const batch = writeBatch(db);
  batch.set(doc(db, "events", eventId, "rsvps", user.uid), {
    userId: user.uid,
    email: user.email,
    status: payload.status || "going",
    checkedIn: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  batch.set(doc(db, "users", user.uid, "rsvps", eventId), {
    eventId,
    title: payload.title || "",
    status: payload.status || "going",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await batch.commit();
}

async function applyToProject(projectId, payload = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  const application = {
    userId: user.uid,
    email: user.email,
    name: payload.name || user.displayName || user.email,
    note: payload.note || "",
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const batch = writeBatch(db);
  batch.set(doc(db, "projects", projectId, "applications", user.uid), application);
  batch.set(doc(db, "users", user.uid, "applications", projectId), {
    projectId,
    title: payload.title || "",
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

async function updateProjectApplicationStatus(projectId, userId, status) {
  const batch = writeBatch(db);
  batch.update(doc(db, "projects", projectId, "applications", userId), {
    status,
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, "users", userId, "applications", projectId), {
    status,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  await logAudit("project-application-status", "projects", projectId, status);
}

async function flagContent(payload) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  const ref = await addDoc(collection(db, "moderationFlags"), {
    ...payload,
    status: "open",
    userId: user.uid,
    email: user.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

async function toggleUserSuspension(uid, suspended) {
  const func = httpsCallable(functions, 'suspendUser');
  await func({ uid, suspend: suspended });
}

async function getEventRSVPs(eventId) {
  const snap = await getDocs(collection(db, "events", eventId, "rsvps"));
  return rows(snap);
}

async function getProjectApplicants(projectId) {
  const snap = await getDocs(collection(db, "projects", projectId, "applications"));
  return rows(snap);
}

async function loadAuditLogs(lastDocId = null) {
  let q = query(
    collection(db, "auditLogs"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  if (lastDocId) {
    const docSnap = await getDoc(doc(db, "auditLogs", lastDocId));
    if (docSnap.exists()) {
      q = query(
        collection(db, "auditLogs"),
        orderBy("createdAt", "desc"),
        startAfter(docSnap),
        limit(50)
      );
    }
  }
  const snap = await getDocs(q);
  return { 
    docs: rows(snap), 
    lastDocId: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1].id : null 
  };
}

async function loadMore(collectionName) {
  let q;
  if (collectionName === "events" && lastDocs.events) {
    q = query(collection(db, "events"), where("status", "==", "published"), orderBy("createdAt", "desc"), startAfter(lastDocs.events), limit(20));
  } else if (collectionName === "announcements" && lastDocs.announcements) {
    q = query(collection(db, "announcements"), where("status", "==", "published"), orderBy("createdAt", "desc"), startAfter(lastDocs.announcements), limit(20));
  } else if (collectionName === "projects" && lastDocs.projects) {
    q = query(collection(db, "projects"), orderBy("createdAt", "desc"), startAfter(lastDocs.projects), limit(20));
  } else {
    return [];
  }

  const snap = await getDocs(q).catch(() => ({ docs: [] }));
  if (snap.docs.length > 0) {
    lastDocs[collectionName] = snap.docs[snap.docs.length - 1];
  }
  return rows(snap);
}

async function loadAdminTab(tabName) {
  if (!(await hasSuperAdminGrant(auth.currentUser))) return [];
  switch (tabName) {
    case "requests": return await rowsOrEmpty("host requests", getDocs(query(collection(db, "hostRequests"), limit(100))));
    case "flags": return await rowsOrEmpty("moderation flags", getDocs(query(collection(db, "moderationFlags"), limit(100))));
    case "users": return await rowsOrEmpty("users", getDocs(query(collection(db, "users"), limit(100))));
    case "events": return await rowsOrEmpty("all events", getDocs(query(collection(db, "events"), limit(100))));
    case "announcements": return await rowsOrEmpty("all announcements", getDocs(query(collection(db, "announcements"), limit(100))));
    case "contentReviews": return await rowsOrEmpty("content reviews", getDocs(query(collection(db, "contentReviews"), limit(100))));
    default: return [];
  }
}

window.RVUFirebase = {
  app,
  auth,
  db,
  analytics,
  assignClubCoreRole,
  applyToProject,
  createEmailPasswordAccount,
  createAnnouncement,
  createClub,
  createContentReview,
  createEvent,
  createProject,
  createSchool,
  deleteDocument,
  ensureUserProfile,
  flagContent,
  followClub,
  grantPlatformRole,
  isRvuEmail,
  loadCampusData,
  loadMore,
  loadAdminTab,
  rsvpEvent,
  saveUserProfile,
  updateUserProfile: saveUserProfile,
  saveItem,
  signInWithEmailPassword,
  submitHostRequest,
  submitMultiClubCoreRequest,
  submitNewClubCreationRequest,
  unfollowClub,
  updateAnnouncementStatus,
  updateClub,
  updateClubLeadership,
  updateClubProfile,
  updateContentReviewStatus,
  updateClubRegistration,
  updateDocument,
  updateEventStatus,
  updateHostRequestStatus,
  updateProjectApplicationStatus,
  updateSiteSetting,
  updateUserRole,
  removeClubCoreRole,
  toggleUserSuspension,
  getEventRSVPs,
  getProjectApplicants,
  loadAuditLogs,
  signInWithGoogle,
  signOut: () => {
    _cachedSuperAdminResult = null;
    return signOut(auth);
  },
};
