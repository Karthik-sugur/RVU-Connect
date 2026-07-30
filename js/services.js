import { app, auth, db, analytics } from "./firebase-init.js";
import { getDoc, getDocs, setDoc, updateDoc, deleteDoc, deleteField, doc, collection, collectionGroup, query, where, orderBy, limit, startAfter, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { handleFirebaseError } from "./errors.js";
import { EMAIL_DOMAIN } from "./constants.js";


function isRvuEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase().endsWith(EMAIL_DOMAIN);
}

async function requireRvuUser(user) {
  if (!user?.email || !isRvuEmail(user.email)) {
    await signOut(auth);
    throw new Error("Only @rvu.edu.in accounts can use RVU Connect.");
  }
  return user;
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

function pickFields(data, allowedFields) {
  return Object.fromEntries(
    Object.entries(data || {}).filter(([key]) => allowedFields.includes(key))
  );
}

function requireOneOf(value, allowedValues, label) {
  if (!allowedValues.includes(value)) {
    throw new Error(`${label} must be one of: ${allowedValues.join(", ")}.`);
  }
  return value;
}

function authDebugContext() {
  return {
    uid: auth.currentUser?.uid || null,
    email: auth.currentUser?.email || null,
  };
}

let firstFirestorePermissionFailure = null;

function ruleTraceFor(path, operation, payload = {}) {
  const checks = [];
  let rule = "No matching write rule found";
  let category = "incorrect document path or rule logic";
  const pathSegments = path.split("/");

  if (path.startsWith("users/") && pathSegments.length === 2) {
    rule = "match /users/{uid}";
    if (operation === "create") {
      checks.push("auth email must end with @rvu.edu.in");
      checks.push("document id must equal auth.uid");
      checks.push("payload.role must equal 'student'");
      checks.push("payload.email must equal request.auth.token.email");
      category = "missing users/{uid} document, ownership mismatch, or incorrect payload";
    } else if (operation === "update") {
      checks.push("super admin may update any user");
      checks.push("non-admin users may only update their own doc");
      checks.push("non-admin changed fields must stay within name/school/year/interests/onboardingComplete/clubIds/updatedAt");
      category = "ownership mismatch, role mismatch, or extra fields";
    }
  } else if (path.startsWith("users/") && (
    path.includes("/savedItems/")
    || path.includes("/followedClubs/")
    || path.includes("/rsvps/")
    || path.includes("/applications/")
  )) {
    rule = "match /users/{uid}/{savedItems|followedClubs|rsvps|applications}/{docId}";
    checks.push("parent users/{uid} must equal auth.uid unless the rule has a super-admin exception");
    category = "ownership mismatch";
  } else if (path.startsWith("superAdmins/")) {
    rule = "match /superAdmins/{adminId}";
    checks.push("write requires isSuperAdmin()");
    category = "role mismatch";
  } else if (path.startsWith("siteSettings/")) {
    rule = "match /siteSettings/{settingId}";
    checks.push("write requires isSuperAdmin()");
    category = "role mismatch";
  } else if (path.startsWith("schools/")) {
    rule = "match /schools/{schoolId}";
    checks.push("create/update/delete require isSuperAdmin()");
    category = "role mismatch";
  } else if (path.startsWith("clubs/") && path.includes("/coreMembers/")) {
    rule = "match /clubs/{clubId}/coreMembers/{memberEmail}";
    checks.push("all writes require isSuperAdmin()");
    checks.push("read allowed for super admin, the member themselves, or any approved core member");
    category = "role mismatch";
  } else if (path.startsWith("clubs/")) {
    rule = "match /clubs/{clubId}";
    checks.push("create/delete require isSuperAdmin()");
    checks.push("non-admin update requires isApprovedClubCore(clubId) and unchanged createdAt/createdBy");
    category = "role mismatch";
  } else if (path.startsWith("events/") && path.includes("/rsvps/")) {
    rule = "match /events/{eventId}/rsvps/{uid}";
    checks.push("write uid path segment must equal auth.uid");
    checks.push("auth email must end with @rvu.edu.in");
    category = "ownership mismatch";
  } else if (path.startsWith("events/")) {
    rule = "match /events/{eventId}";
    checks.push("create requires payload.createdBy == auth.uid");
    checks.push("hostType club requires approved core doc at clubs/{clubId}/coreMembers/{auth.email}");
    checks.push("hostType school requires approved hostRequests/schoolRepresentative_{uid} with status == 'approved'");
    checks.push("super admin can create/update/delete");
    checks.push("non-admin update must not change createdBy or createdAt");
    category = "ownership mismatch, role mismatch, incorrect document path, or incorrect payload";
  } else if (path.startsWith("announcements/")) {
    rule = "match /announcements/{announcementId}";
    checks.push("create requires payload.createdBy == auth.uid");
    checks.push("sourceType club requires approved core doc at clubs/{clubId}/coreMembers/{auth.email}");
    checks.push("sourceType school requires approved hostRequests/schoolRepresentative_{uid} with status == 'approved'");
    checks.push("super admin can create/update/delete");
    checks.push("non-admin update must not change createdBy or createdAt");
    category = "ownership mismatch, role mismatch, incorrect document path, or incorrect payload";
  } else if (path.startsWith("projects/") && path.includes("/applications/")) {
    rule = "match /projects/{projectId}/applications/{uid}";
    checks.push("create uid path segment must equal auth.uid");
    checks.push("create payload.userId must equal auth.uid");
    checks.push("create payload.status must equal 'pending'");
    checks.push("update requires super admin or project owner");
    category = "ownership mismatch, incorrect payload, or role mismatch";
  } else if (path.startsWith("projects/")) {
    rule = "match /projects/{projectId}";
    checks.push("create requires payload.ownerId == auth.uid");
    checks.push("create payload.status must be 'open' or 'closed'");
    checks.push("owner update must not change ownerId, createdBy, or createdAt");
    category = "ownership mismatch or incorrect payload";
  } else if (path.startsWith("hostRequests/")) {
    rule = "match /hostRequests/{requestId}";
    checks.push("create requires payload.uid == auth.uid");
    checks.push("create payload.status must equal 'pending'");
    checks.push("create payload.type must be clubCore/schoolRepresentative/newClub");
    checks.push("update/delete require isSuperAdmin()");
    category = "ownership mismatch, incorrect payload, or role mismatch";
  } else if (path.startsWith("moderationFlags/")) {
    rule = "match /moderationFlags/{flagId}";
    checks.push("create requires RVU email");
    checks.push("read/update/delete require isSuperAdmin()");
    category = "role mismatch";
  }

  return { rule, checks, suspectedCause: category, operation, path, payload };
}

function logFirestoreWriteStart({ operation, path, payload, options, batchLabel }) {
  console.debug("[RVU Firestore write]", {
    operation,
    path,
    payload,
    options,
    batchLabel,
    auth: authDebugContext(),
    ruleTrace: ruleTraceFor(path, operation, payload),
  });
}

function logFirestoreWriteFailure({ operation, path, payload, options, batchLabel }, error) {
  const trace = {
    operation,
    path,
    payload,
    options,
    batchLabel,
    auth: authDebugContext(),
    errorCode: error?.code || null,
    errorMessage: error?.message || String(error),
    ruleTrace: ruleTraceFor(path, operation, payload),
  };
  if (!firstFirestorePermissionFailure && error?.code === "permission-denied") {
    firstFirestorePermissionFailure = trace;
    window.__RVU_FIRST_FIRESTORE_PERMISSION_FAILURE__ = trace;
    console.error("[RVU Firestore FIRST permission failure]", trace);
  }
  console.error("[RVU Firestore permission trace]", trace);
}

async function tracedSetDoc(ref, payload, options, operation = "set") {
  const context = { operation, path: ref.path, payload, options };
  logFirestoreWriteStart(context);
  try {
    if (options !== undefined) {
      await setDoc(ref, payload, options);
    } else {
      await setDoc(ref, payload);
    }
  } catch (error) {
    logFirestoreWriteFailure(context, error);
    throw error;
  }
}

async function tracedAddDoc(collectionRef, payload) {
  const ref = doc(collectionRef);
  await tracedSetDoc(ref, payload, undefined, "create");
  return ref;
}

async function tracedUpdateDoc(ref, payload) {
  const context = { operation: "update", path: ref.path, payload };
  logFirestoreWriteStart(context);
  try {
    await updateDoc(ref, payload);
  } catch (error) {
    logFirestoreWriteFailure(context, error);
    throw error;
  }
}

async function tracedDeleteDoc(ref) {
  const context = { operation: "delete", path: ref.path, payload: null };
  logFirestoreWriteStart(context);
  try {
    await deleteDoc(ref);
  } catch (error) {
    logFirestoreWriteFailure(context, error);
    throw error;
  }
}

function tracedWriteBatch(batchLabel) {
  const batch = writeBatch(db);
  const operations = [];
  return {
    set(ref, payload, options) {
      operations.push({ operation: "batch.set", path: ref.path, payload, options, batchLabel });
      if (options !== undefined) batch.set(ref, payload, options);
      else batch.set(ref, payload);
      return this;
    },
    update(ref, payload) {
      operations.push({ operation: "batch.update", path: ref.path, payload, batchLabel });
      batch.update(ref, payload);
      return this;
    },
    delete(ref) {
      operations.push({ operation: "batch.delete", path: ref.path, payload: null, batchLabel });
      batch.delete(ref);
      return this;
    },
    async commit() {
      operations.forEach(logFirestoreWriteStart);
      try {
        await batch.commit();
      } catch (error) {
        operations.forEach((operation) => logFirestoreWriteFailure(operation, error));
        throw error;
      }
    },
  };
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
  if (!user?.uid) return false;
  if (_cachedSuperAdminResult !== null) return _cachedSuperAdminResult;
  try {
    const uidGrant = await getDoc(doc(db, "superAdmins", user.uid));
    if (uidGrant?.exists()) {
      _cachedSuperAdminResult = true;
      return _cachedSuperAdminResult;
    }
    const userSnap = await getDoc(doc(db, "users", user.uid));
    _cachedSuperAdminResult = userSnap.exists() && userSnap.data().role === "superAdmin";
  } catch (err) {
    console.warn("Failed to check superAdmin uid:", err);
    _cachedSuperAdminResult = false;
  }
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
  await tracedSetDoc(ref, profile, undefined, "create");
  
  const resultProfile = { id: user.uid, ...profile };
  return superAdmin ? { ...resultProfile, role: "superAdmin" } : resultProfile;
}

async function saveUserProfile(uid, data) {
  const allowedProfileUpdate = pickFields(data, ["name", "school", "year", "interests", "onboardingComplete", "clubIds"]);
  await tracedUpdateDoc(doc(db, "users", uid), {
    ...allowedProfileUpdate,
    updatedAt: serverTimestamp(),
  });
}

let lastDocs = { events: null, announcements: null, projects: null };

async function loadCampusData({ superAdmin = false, profile = {} } = {}) {
  const [eventsSnap, announcementsSnap, projectsSnap] = await Promise.all([
    getDocs(query(collection(db, "events"), where("status", "==", "published"), orderBy("createdAt", "desc"), limit(20))).catch(() => ({ docs: [] })),
    getDocs(query(collection(db, "announcements"), where("status", "==", "published"), orderBy("createdAt", "desc"), limit(20))).catch(() => ({ docs: [] })),
    getDocs(query(collection(db, "projects"), orderBy("createdAt", "desc"), limit(20))).catch(() => ({ docs: [] })),
  ]);

  lastDocs.events = eventsSnap.docs[eventsSnap.docs.length - 1] || null;
  lastDocs.announcements = announcementsSnap.docs[announcementsSnap.docs.length - 1] || null;
  lastDocs.projects = projectsSnap.docs[projectsSnap.docs.length - 1] || null;

  const [clubsRows, settingsRows] = await Promise.all([
    rowsOrEmpty("approved clubs", getDocs(query(collection(db, "clubs"), where("status", "==", "approved"), limit(100)))),
    rowsOrEmpty("site settings", getDocs(collection(db, "siteSettings"))),
  ]);

  const announcementRows = rows(announcementsSnap).filter((item) => !isAnnouncementExpired(item));

  // Mark / purge events past their date+time (registration/event window set at create).
  const liveEventRows = [];
  for (const event of rows(eventsSnap)) {
    if (!isEventExpired(event)) {
      liveEventRows.push({ ...event, past: false });
      continue;
    }
    const canPurge = Boolean(
      auth.currentUser
      && (superAdmin || event.createdBy === auth.currentUser.uid)
    );
    if (canPurge) {
      // Silent purge — avoid permission-trace noise when rules reject a delete.
      await deleteDoc(doc(db, "events", event.id)).catch(() => {});
    }
  }

  // Hide projects whose expiry date has passed (end of that calendar day).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const liveProjectRows = [];
  for (const project of rows(projectsSnap)) {
    const expiry = String(project.expiry || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
      const expiryDate = new Date(`${expiry}T23:59:59`);
      if (!Number.isNaN(expiryDate.getTime()) && expiryDate.getTime() < Date.now()) {
        if (auth.currentUser && (superAdmin || project.createdBy === auth.currentUser.uid || project.ownerId === auth.currentUser.uid)) {
          await deleteDoc(doc(db, "projects", project.id)).catch(() => {});
        }
        continue;
      }
    }
    liveProjectRows.push(project);
  }

  const data = {
    clubs: clubsRows,
    events: liveEventRows,
    announcements: announcementRows,
    projects: liveProjectRows,
    hostRequests: [],
    moderationFlags: [],
    allUsers: [],
    allEvents: [],
    allAnnouncements: [],
    allClubs: [],
    allSchools: [],
    contentReviews: [],
    savedItems: [],
    followedClubs: [],
    rsvps: [],
    siteSettings: settingsRows,
    clubAccess: null,
    clubAccesses: [],
    schoolAccess: null,
    schoolAccesses: [],
  };

  if (auth.currentUser?.email) {
    const email = auth.currentUser.email.trim().toLowerCase();
    const uid = auth.currentUser.uid;
    const [savedRows, followRows, rsvpRows, clubAppRows] = await Promise.all([
      rowsOrEmpty("saved items", getDocs(query(collection(db, "users", uid, "savedItems"), limit(50)))),
      rowsOrEmpty("followed clubs", getDocs(query(collection(db, "users", uid, "followedClubs"), limit(50)))),
      rowsOrEmpty("event RSVPs", getDocs(query(collection(db, "users", uid, "rsvps"), limit(50)))),
      rowsOrEmpty("club applications", getDocs(query(collection(db, "clubApplications"), where("uid", "==", uid), limit(20)))),
    ]);
    const ownHostRequests = await rowsOrEmpty("host requests", getDocs(query(collection(db, "hostRequests"), where("uid", "==", uid), limit(50))));
    // Single collection group query replacing N+1 lookups
    const memberDocs = [];
    const memberSnaps = await Promise.all([
      getDocs(query(collectionGroup(db, "coreMembers"), where("uid", "==", uid))).catch(() => ({ docs: [] })),
      getDocs(query(collectionGroup(db, "coreMembers"), where("email", "==", email))).catch(() => ({ docs: [] })),
    ]);
    const seenMemberRefs = new Set();
    for (const docSnap of memberSnaps.flatMap((snap) => snap.docs)) {
      if (seenMemberRefs.has(docSnap.ref.path)) continue;
      seenMemberRefs.add(docSnap.ref.path);
      const member = { id: docSnap.id, ...docSnap.data() };
      if (member.status !== "approved") continue;
      const clubId = docSnap.ref.parent.parent?.id;
      const club = data.clubs.find(c => c.id === clubId || c.slug === clubId);
      if (club) {
        memberDocs.push({ club, member });
      }
    }

    // Founder email on the club doc also grants club-core access (approve applicants / manage club).
    for (const club of data.clubs) {
      const founder = String(club.founderEmail || "").trim().toLowerCase();
      if (!founder || founder !== email) continue;
      if (memberDocs.some((access) => access.club.id === club.id || access.club.slug === club.id)) continue;
      memberDocs.push({
        club,
        member: {
          email,
          name: club.founderName || profile.name || email,
          role: "founder",
          status: "approved",
          uid,
        },
      });
    }

    const schoolAccesses = [];

    for (const request of ownHostRequests.filter((item) => item.status === "approved")) {
      // Synthesize club access from approved host requests when coreMembers is missing.
      // (Firestore writes still require the Approve action — manual status edits alone do not create the club.)
      if (request.type === "clubCore" && request.clubId && !memberDocs.some((access) => access.club.id === request.clubId || access.club.slug === request.clubId)) {
        const club = data.clubs.find((item) => item.id === request.clubId || item.slug === request.clubId);
        if (club) {
          memberDocs.push({
            club,
            member: {
              email,
              name: request.name || profile.name || email,
              role: "core",
              status: "approved",
              uid,
            },
          });
        }
      }

      if (request.type === "newClub") {
        const clubId = request.clubId || slugifyClubName(request.clubName);
        const club = data.clubs.find((item) => item.id === clubId || item.slug === clubId);
        if (club && !memberDocs.some((access) => access.club.id === club.id || access.club.slug === club.slug)) {
          memberDocs.push({
            club,
            member: {
              email,
              name: request.name || request.founderName || profile.name || email,
              role: "core",
              status: "approved",
              uid,
            },
          });
        }
      }

      // School reps are campus-wide (pick school per post). Approval unlocks hosting.
      // Manual Firestore status → approved also works here (no extra side effects required).
      if (request.type === "schoolRepresentative" && !schoolAccesses.length) {
        schoolAccesses.push({
          schoolId: request.schoolId || profile.school || "",
          representative: {
            email,
            name: request.name || profile.name || email,
            role: request.roleTitle || "representative",
            type: request.type,
            status: "approved",
            uid,
          },
        });
      }
    }

    // Sticky flag / role also unlocks school-rep UI (survives clubCore role overwrites).
    if (!schoolAccesses.length && (profile.schoolRepApproved === true || profile.role === "schoolRepresentative" || profile.role === "schoolRep")) {
      schoolAccesses.push({
        schoolId: profile.schoolScope || profile.school || "",
        representative: {
          email,
          name: profile.name || email,
          role: "representative",
          type: "schoolRepresentative",
          status: "approved",
          uid,
        },
      });
    }

    // Keep both grants in sync after separate approvals (no manual Repair on every login).
    await syncDualRoleGrants({
      uid,
      profile,
      ownHostRequests,
      hasClubAccess: memberDocs.length > 0,
      hasSchoolAccess: schoolAccesses.length > 0,
    });

    data.clubAccesses = memberDocs;
    data.clubAccess = memberDocs[0] || null;
    data.schoolAccesses = schoolAccesses;
    data.schoolAccess = schoolAccesses[0] || null;
    data.hostRequests = ownHostRequests;
    data.savedItems = savedRows;
    data.followedClubs = followRows;
    data.rsvps = rsvpRows;
    data.clubApplications = clubAppRows;
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

function sanitizeDocIdPart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "unknown";
}

function slugifyClubName(name) {
  return sanitizeDocIdPart(name);
}

/**
 * After school-rep and club-core are approved separately, keep both grants sticky.
 * - Canonical hostRequests/schoolRepresentative_{uid} stays approved
 * - users.schoolRepApproved stays true (rules use this even if role is clubCore)
 * Safe to run on every login; no super-admin Repair needed for the normal path.
 */
async function syncDualRoleGrants({ uid, profile, ownHostRequests, hasClubAccess, hasSchoolAccess }) {
  if (!uid || !auth.currentUser) return;
  const approvedSchoolRep = (ownHostRequests || []).find(
    (r) => r.type === "schoolRepresentative" && r.status === "approved"
  );
  if (!approvedSchoolRep && !profile.schoolRepApproved && !hasSchoolAccess) return;

  const canonicalId = `schoolRepresentative_${uid}`;
  const canonicalRef = doc(db, "hostRequests", canonicalId);

  // Prefer an already-approved request body (canonical or legacy id).
  if (approvedSchoolRep) {
    try {
      if (approvedSchoolRep.id !== canonicalId) {
        // Best-effort: copy legacy approved doc onto the canonical id (super-admin Approve also does this).
        // Regular users may not have permission; ignore failures.
        await setDoc(canonicalRef, {
          type: "schoolRepresentative",
          uid,
          email: approvedSchoolRep.email || auth.currentUser.email || "",
          name: approvedSchoolRep.name || profile.name || "",
          schoolId: approvedSchoolRep.schoolId || profile.schoolScope || profile.school || "",
          roleTitle: approvedSchoolRep.roleTitle || "Student Representative",
          description: approvedSchoolRep.description || "",
          status: "approved",
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (_) {
      /* ignore — repair button / re-Approve covers legacy ids */
    }
  }

  // Sticky flag: survives role overwrites to clubCore. Rules allow this when canonical request is approved.
  if (profile.schoolRepApproved !== true && (approvedSchoolRep || hasSchoolAccess)) {
    try {
      const canonSnap = await getDoc(canonicalRef);
      if (canonSnap.exists() && canonSnap.data()?.status === "approved") {
        const patch = {
          schoolRepApproved: true,
          updatedAt: serverTimestamp(),
        };
        const scope = approvedSchoolRep?.schoolId || profile.schoolScope || profile.school || "";
        if (scope && profile.schoolScope !== scope) patch.schoolScope = scope;
        await updateDoc(doc(db, "users", uid), patch);
        profile.schoolRepApproved = true;
        if (patch.schoolScope) profile.schoolScope = patch.schoolScope;
      }
    } catch (_) {
      /* ignore — Super Admin "Migrate old school-rep grants" covers legacy doc ids once */
    }
  }

  // Ensure club-core approval bit stays set when coreMembers access exists (display/sync only).
  if (hasClubAccess && profile.clubCoreApproved !== true) {
    try {
      // Super-admin or prior approve writes this; users cannot set clubCoreApproved themselves.
      // No-op for students — club posting uses coreMembers, not this flag.
      void hasClubAccess;
    } catch (_) {
      /* ignore */
    }
  }
}

function isEventExpired(event) {
  if (!event?.date) return false;
  const dateStr = String(event.date).trim();
  // Support YYYY-MM-DD from the create form, and loose display dates
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return Boolean(event.past);
  let timeStr = String(event.time || "23:59").trim();
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) timeStr = `${timeStr}:00`;
  if (!/^\d{1,2}:\d{2}:\d{2}$/.test(timeStr)) timeStr = "23:59:00";
  const dt = new Date(`${dateStr}T${timeStr}`);
  return !Number.isNaN(dt.getTime()) && dt.getTime() < Date.now();
}

function isAnnouncementExpired(item) {
  const created = item?.createdAt?.toDate ? item.createdAt.toDate() : (item?.createdAt ? new Date(item.createdAt) : null);
  if (!created || Number.isNaN(created.getTime())) return false;
  return (Date.now() - created.getTime()) > (30 * 24 * 60 * 60 * 1000);
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

  if (payload.type === "schoolRepresentative") {
    const docId = `schoolRepresentative_${user.uid}`;
    await tracedSetDoc(doc(db, "hostRequests", docId), request, { merge: true });
    return docId;
  }

  if (payload.type === "clubCore" && payload.clubId) {
    const docId = `clubCore_${user.uid}_${sanitizeDocIdPart(payload.clubId)}`;
    await tracedSetDoc(doc(db, "hostRequests", docId), request, { merge: true });
    return docId;
  }

  if (payload.type === "newClub") {
    const clubKey = sanitizeDocIdPart(payload.clubName || payload.name || Date.now());
    const docId = `newClub_${user.uid}_${clubKey}`;
    await tracedSetDoc(doc(db, "hostRequests", docId), { ...request, clubId: clubKey }, { merge: true });
    return docId;
  }

  const ref = await tracedAddDoc(collection(db, "hostRequests"), request);
  return ref.id;
}

// Submit core-member applications for one or more existing approved clubs.
// Goes to the club's current core team via clubApplications (not super-admin hostRequests).
async function submitMultiClubCoreRequest(clubIds, { name, roleTitle }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before submitting a host request.");
  if (!clubIds || clubIds.length === 0) throw new Error("Select at least one club.");

  const email = user.email.trim().toLowerCase();
  const uid = user.uid;
  const approvedSnaps = await Promise.all([
    getDocs(query(collectionGroup(db, "coreMembers"), where("uid", "==", uid))).catch(() => ({ docs: [] })),
    getDocs(query(collectionGroup(db, "coreMembers"), where("email", "==", email))).catch(() => ({ docs: [] })),
  ]);
  const approvedClubIds = new Set();
  for (const snap of approvedSnaps) {
    for (const memberDoc of snap.docs) {
      if (memberDoc.data()?.status !== "approved") continue;
      const clubId = memberDoc.ref.parent.parent?.id;
      if (clubId) approvedClubIds.add(clubId);
    }
  }
  const newClubIds = [...new Set(clubIds.filter((id) => !approvedClubIds.has(id)))];
  if (approvedClubIds.size + newClubIds.length > 5) {
    throw new Error("You can be club core for at most 5 clubs.");
  }

  const results = [];
  for (const clubId of newClubIds) {
    const app = await submitClubApplication(clubId);
    results.push(app.id);
  }
  return results;
}

// Submit a request to create a brand-new club. Goes to super admin for approval.
async function submitNewClubCreationRequest(clubDraft) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before submitting a club creation request.");
  const clubName = clubDraft.name || "";
  const clubKey = slugifyClubName(clubName) || `club-${Date.now()}`;
  const docId = `newClub_${user.uid}_${clubKey}`;
  await tracedSetDoc(doc(db, "hostRequests", docId), {
    type: "newClub",
    uid: user.uid,
    email: user.email,
    name: user.displayName || user.email.split("@")[0],
    roleTitle: clubDraft.founderRole || "core",
    clubId: clubKey,
    clubName,
    clubCategory: clubDraft.category || "",
    clubSchool: clubDraft.school || "",
    clubDescription: clubDraft.description || "",
    clubTagline: clubDraft.tagline || "",
    founderName: user.displayName || user.email.split("@")[0],
    founderEmail: user.email,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return docId;
}

async function applyNewClubApproval(requestData) {
  const memberEmail = requestData.email || requestData.founderEmail;
  const normalizedEmail = memberEmail?.trim().toLowerCase();
  const clubId = requestData.clubId
    || (requestData.clubName ? slugifyClubName(requestData.clubName) : null);
  if (!clubId) throw new Error("New club request is missing a club name/id.");

  await tracedSetDoc(doc(db, "clubs", clubId), {
    name: requestData.clubName || clubId,
    category: requestData.clubCategory || "General",
    school: requestData.clubSchool || "RVU",
    description: requestData.clubDescription || "",
    tagline: requestData.clubTagline || "",
    status: "approved",
    founderName: requestData.founderName || requestData.name || "",
    founderEmail: normalizedEmail || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  if (normalizedEmail) {
    await tracedSetDoc(doc(db, "clubs", clubId, "coreMembers", normalizedEmail), {
      uid: requestData.uid || "",
      email: normalizedEmail,
      name: requestData.name || requestData.founderName || normalizedEmail.split("@")[0],
      role: "core",
      status: "approved",
      permanent: true,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  if (requestData.uid) {
    await tracedSetDoc(doc(db, "users", requestData.uid), {
      role: "clubCore",
      clubCoreApproved: true,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  return clubId;
}

async function updateClubRegistration(clubId, registrationOpen) {
  await tracedUpdateDoc(doc(db, "clubs", clubId), {
    registrationOpen,
    updatedAt: serverTimestamp(),
  });
}

async function updateHostRequestStatus(requestId, status) {
  requireOneOf(status, ["approved", "rejected"], "Host request status");
  const requestRef = doc(db, "hostRequests", requestId);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) throw new Error("Host request not found.");
  const requestData = requestSnap.data() || {};

  await tracedSetDoc(requestRef, {
    status,
    updatedAt: serverTimestamp()
  }, { merge: true });

  if (status !== "approved") return;

  const memberEmail = requestData.email || requestData.founderEmail;
  const normalizedEmail = memberEmail?.trim().toLowerCase();

  // 1. Club core request approval
  if (requestData.type === "clubCore" && requestData.clubId && normalizedEmail) {
    await tracedSetDoc(doc(db, "clubs", requestData.clubId, "coreMembers", normalizedEmail), {
      uid: requestData.uid || "",
      email: normalizedEmail,
      name: requestData.name || normalizedEmail.split("@")[0],
      role: "core",
      status: "approved",
      updatedAt: serverTimestamp(),
    }, { merge: true });

    if (requestData.uid) {
      // merge: true keeps schoolRepApproved if they were already approved as school-rep
      await tracedSetDoc(doc(db, "users", requestData.uid), {
        role: "clubCore",
        clubCoreApproved: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  }

  // 2. School representative — sticky grant so later club-core role writes cannot remove posting rights.
  if (requestData.type === "schoolRepresentative" && requestData.uid) {
    const canonicalId = `schoolRepresentative_${requestData.uid}`;
    if (requestId !== canonicalId) {
      await tracedSetDoc(doc(db, "hostRequests", canonicalId), {
        ...requestData,
        type: "schoolRepresentative",
        uid: requestData.uid,
        status: "approved",
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
    const userSnap = await getDoc(doc(db, "users", requestData.uid));
    const existing = userSnap.exists() ? (userSnap.data() || {}) : {};
    const keepClubCore = existing.role === "clubCore" || existing.clubCoreApproved === true;
    await tracedSetDoc(doc(db, "users", requestData.uid), {
      schoolRepApproved: true,
      schoolScope: requestData.schoolId || existing.schoolScope || "",
      role: keepClubCore ? "clubCore" : "schoolRepresentative",
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  // 3. New club creation request approval — creates club + founder as approved core
  if (requestData.type === "newClub") {
    const clubId = await applyNewClubApproval(requestData);
    await tracedSetDoc(requestRef, { clubId, updatedAt: serverTimestamp() }, { merge: true });
  }
}

async function createEvent(payload) {
  if (payload?.hostType === "school") {
    await assertCanCreateSchoolContent();
  }
  const ref = await tracedAddDoc(collection(db, "events"), {
    ...payload,
    status: payload.status || "published",
    createdBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ...payload, createdAt: new Date().toISOString() };
}

async function createAnnouncement(payload) {
  if (payload?.sourceType === "school") {
    await assertCanCreateSchoolContent();
  }
  const ref = await tracedAddDoc(collection(db, "announcements"), {
    ...payload,
    status: payload.status || "published",
    createdBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ...payload, createdAt: new Date().toISOString() };
}

async function createProject(payload) {
  const status = requireOneOf(payload.status || "open", ["open", "closed"], "Project status");
  const ref = await tracedAddDoc(collection(db, "projects"), {
    ...payload,
    status,
    ownerId: auth.currentUser?.uid,
    createdBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ...payload, createdAt: new Date().toISOString() };
}

/* ── Admin CRUD operations ── */

async function updateUserRole(uid, role) {
  requireOneOf(role, ["student", "clubCore", "schoolRepresentative", "superAdmin"], "User role");
  await tracedUpdateDoc(doc(db, "users", uid), {
    role,
    updatedAt: serverTimestamp(),
  });
}

async function createClub(payload) {
  const founderEmail = payload.founderEmail?.trim().toLowerCase();
  const facultyAdvisorEmail = payload.facultyAdvisorEmail?.trim().toLowerCase();
  const currentPresidentEmail = payload.currentPresidentEmail?.trim().toLowerCase();
  const ref = await tracedAddDoc(collection(db, "clubs"), {
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

  await Promise.all(foundingMembers.map((member) => tracedSetDoc(doc(db, "clubs", ref.id, "coreMembers", member.email), {
    ...member,
    status: "approved",
    assignedBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })));

  return ref.id;
}

async function createSchool(payload) {
  const ref = await tracedAddDoc(collection(db, "schools"), {
    ...payload,
    status: payload.status || "active",
    createdBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}


async function grantPlatformRole({ email, uid, role }) {
  const normalizedEmail = email?.trim();
  if (!uid) throw new Error("A Firebase Auth UID is required for user role updates.");
  requireOneOf(role || "student", ["student", "clubCore", "schoolRepresentative", "superAdmin"], "User role");
  
  if (role === "superAdmin") {
    await tracedSetDoc(doc(db, "superAdmins", uid), {
      email: normalizedEmail,
      uid,
      grantedAt: serverTimestamp(),
      grantedBy: auth.currentUser?.uid
    });
    await updateUserRole(uid, "superAdmin");
    return;
  }
  
  if (role === "student") {
    await tracedDeleteDoc(doc(db, "superAdmins", uid));
    await updateUserRole(uid, "student");
    return;
  }
  
  await updateUserRole(uid, role || "student");
}

async function assignClubCoreRole(clubId, { email, name, role }) {
  const normalizedEmail = email.trim().toLowerCase();
  await tracedSetDoc(doc(db, "clubs", clubId, "coreMembers", normalizedEmail), {
    email: normalizedEmail,
    name: name || normalizedEmail.split("@")[0],
    role: role || "core",
    status: "approved",
    assignedBy: auth.currentUser?.uid,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function listClubCoreMembers(clubId) {
  if (!clubId) return [];
  const snap = await getDocs(collection(db, "clubs", clubId, "coreMembers"));
  return rows(snap).filter((m) => (m.status || "approved") === "approved");
}

async function removeClubCoreRole(clubId, email) {
  const normalizedEmail = email.trim().toLowerCase();
  await tracedDeleteDoc(doc(db, "clubs", clubId, "coreMembers", normalizedEmail));
}

async function updateClubLeadership(clubId, data) {
  const updates = {};
  if (data.currentPresidentName !== undefined) updates.currentPresidentName = data.currentPresidentName;
  if (data.currentPresidentEmail !== undefined) updates.currentPresidentEmail = data.currentPresidentEmail.trim().toLowerCase();
  if (data.facultyAdvisorName !== undefined) updates.facultyAdvisorName = data.facultyAdvisorName;
  if (data.facultyAdvisorEmail !== undefined) updates.facultyAdvisorEmail = data.facultyAdvisorEmail.trim().toLowerCase();
  await tracedUpdateDoc(doc(db, "clubs", clubId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

async function updateClub(clubId, data) {
  await tracedUpdateDoc(doc(db, "clubs", clubId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

async function updateClubProfile(clubId, data) {
  await tracedUpdateDoc(doc(db, "clubs", clubId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

async function deleteDocument(collectionName, docId) {
  requireOneOf(collectionName, ["schools", "clubs", "events", "announcements", "projects"], "Deleted collection");
  await tracedDeleteDoc(doc(db, collectionName, docId));
}

async function updateDocument(collectionName, docId, data) {
  requireOneOf(collectionName, ["events", "announcements", "projects"], "Updated collection");
  await tracedUpdateDoc(doc(db, collectionName, docId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

async function updateEventStatus(eventId, status) {
  requireOneOf(status, ["published", "draft", "cancelled"], "Event status");
  await tracedUpdateDoc(doc(db, "events", eventId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

async function updateAnnouncementStatus(announcementId, status) {
  requireOneOf(status, ["published", "draft", "archived"], "Announcement status");
  await tracedUpdateDoc(doc(db, "announcements", announcementId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

async function updateSiteSetting(settingId, data) {
  await tracedSetDoc(doc(db, "siteSettings", settingId), {
    ...data,
    updatedBy: auth.currentUser?.uid,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

async function createContentReview(payload) {
  const ref = await tracedAddDoc(collection(db, "contentReviews"), {
    ...payload,
    status: payload.status || "pending",
    createdBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

async function updateContentReviewStatus(reviewId, status) {
  await tracedUpdateDoc(doc(db, "contentReviews", reviewId), {
    status,
    reviewedBy: auth.currentUser?.uid,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

async function saveItem({ itemId, type, title }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  await tracedSetDoc(doc(db, "users", user.uid, "savedItems", `${type}_${itemId}`), {
    itemId,
    type,
    title: title || "",
    createdAt: serverTimestamp(),
  });
}

async function unsaveItem({ itemId, type }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  await tracedDeleteDoc(doc(db, "users", user.uid, "savedItems", `${type}_${itemId}`));
}

async function followClub(clubId, clubName) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  await tracedSetDoc(doc(db, "users", user.uid, "followedClubs", clubId), {
    clubId,
    clubName: clubName || "",
    createdAt: serverTimestamp(),
  });
}

async function unfollowClub(clubId) {
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, "users", user.uid, "followedClubs", clubId);
  await tracedDeleteDoc(ref);
}

async function leaveClubCore(clubId) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error("Sign in first.");
  if (!clubId) throw new Error("Club id required.");
  const email = user.email.trim().toLowerCase();
  await tracedDeleteDoc(doc(db, "clubs", clubId, "coreMembers", email));
}

async function flagContent(payload) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  const ref = await tracedAddDoc(collection(db, "moderationFlags"), {
    ...payload,
    status: "open",
    userId: user.uid,
    email: user.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

async function getEventRSVPs(eventId) {
  const snap = await getDocs(collection(db, "events", eventId, "rsvps"));
  return rows(snap);
}

async function getProjectApplicants(projectId) {
  const snap = await getDocs(collection(db, "projects", projectId, "applications"));
  return rows(snap);
}

// ── Club Application functions ──

async function submitClubApplication(clubId) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");

  const email = user.email.trim().toLowerCase();
  const uid = user.uid;

  // Check for duplicate active (pending) application to the same club
  const dupSnap = await getDocs(query(
    collection(db, "clubApplications"),
    where("uid", "==", uid),
    where("clubId", "==", clubId),
    where("status", "==", "pending"),
    limit(1)
  ));
  if (!dupSnap.empty) {
    throw new Error("You already have a pending application for this club.");
  }

  // Enforce max 5 clubs: approved memberships + pending applications
  const approvedSnaps = await Promise.all([
    getDocs(query(collectionGroup(db, "coreMembers"), where("uid", "==", uid))).catch(() => ({ docs: [] })),
    getDocs(query(collectionGroup(db, "coreMembers"), where("email", "==", email))).catch(() => ({ docs: [] })),
  ]);
  const approvedClubIds = new Set();
  for (const snap of approvedSnaps) {
    for (const memberDoc of snap.docs) {
      if (memberDoc.data()?.status !== "approved") continue;
      const clubIdApproved = memberDoc.ref.parent.parent?.id;
      if (clubIdApproved) approvedClubIds.add(clubIdApproved);
    }
  }
  if (approvedClubIds.has(clubId)) {
    throw new Error("You are already club core for this club.");
  }
  const activeSnap = await getDocs(query(
    collection(db, "clubApplications"),
    where("uid", "==", uid),
    where("status", "==", "pending"),
    limit(10)
  ));
  if (approvedClubIds.size + activeSnap.size >= 5) {
    throw new Error("You can be club core for at most 5 clubs (including pending applications).");
  }

  const userSnap = await getDoc(doc(db, "users", uid));
  const name = userSnap.exists() ? (userSnap.data().name || user.displayName || email.split("@")[0]) : (user.displayName || email.split("@")[0]);

  const ref = await tracedAddDoc(collection(db, "clubApplications"), {
    uid,
    email,
    name,
    clubId,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, uid, email, name, clubId, status: "pending" };
}

async function withdrawClubApplication(applicationId) {
  await tracedUpdateDoc(doc(db, "clubApplications", applicationId), {
    status: "withdrawn",
    updatedAt: serverTimestamp(),
  });
}

async function loadClubPendingApplications(clubId) {
  const snap = await getDocs(query(
    collection(db, "clubApplications"),
    where("clubId", "==", clubId),
    where("status", "==", "pending"),
    limit(50)
  ));
  return rows(snap);
}

async function approveClubApplication(applicationId, applicationData) {
  const { uid, email, name, clubId } = applicationData;
  if (!clubId || !email) throw new Error("Missing clubId or email in application data.");
  const normalizedEmail = email.trim().toLowerCase();

  const batch = tracedWriteBatch("approveClubApplication");
  batch.update(doc(db, "clubApplications", applicationId), {
    status: "approved",
    updatedAt: serverTimestamp(),
  });
  // Every approved club core member has equal permissions (role title is informational only).
  // Hosting authority comes from coreMembers — do not write users.role here (only super admins may change another user's role).
  batch.set(doc(db, "clubs", clubId, "coreMembers", normalizedEmail), {
    uid: uid || "",
    email: normalizedEmail,
    name: name || normalizedEmail.split("@")[0],
    role: "core",
    status: "approved",
    approvedBy: auth.currentUser?.uid || "",
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await batch.commit();
}

async function rejectClubApplication(applicationId) {
  await tracedUpdateDoc(doc(db, "clubApplications", applicationId), {
    status: "rejected",
    updatedAt: serverTimestamp(),
  });
}


async function loadAllPendingClubApplications() {
  const snap = await getDocs(query(
    collection(db, "clubApplications"),
    where("status", "==", "pending"),
    limit(100)
  ));
  return rows(snap);
}

async function repairSchoolRepGrants() {
  if (!(await hasSuperAdminGrant(auth.currentUser))) {
    throw new Error("Only super admins can repair school-rep grants.");
  }
  const snap = await getDocs(query(
    collection(db, "hostRequests"),
    where("type", "==", "schoolRepresentative"),
    where("status", "==", "approved"),
    limit(200)
  ));
  let fixed = 0;
  for (const row of snap.docs) {
    const data = row.data() || {};
    if (!data.uid) continue;
    const canonicalId = `schoolRepresentative_${data.uid}`;
    await tracedSetDoc(doc(db, "hostRequests", canonicalId), {
      ...data,
      type: "schoolRepresentative",
      uid: data.uid,
      status: "approved",
      updatedAt: serverTimestamp(),
    }, { merge: true });
    const userSnap = await getDoc(doc(db, "users", data.uid));
    const existing = userSnap.exists() ? (userSnap.data() || {}) : {};
    const keepClubCore = existing.role === "clubCore" || existing.clubCoreApproved === true;
    await tracedSetDoc(doc(db, "users", data.uid), {
      schoolRepApproved: true,
      schoolScope: data.schoolId || existing.schoolScope || "",
      role: keepClubCore ? "clubCore" : "schoolRepresentative",
      updatedAt: serverTimestamp(),
    }, { merge: true });
    fixed += 1;
  }
  return fixed;
}

async function assertCanCreateSchoolContent() {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  const canonicalId = `schoolRepresentative_${user.uid}`;
  const userRef = doc(db, "users", user.uid);

  const check = async () => {
    const [reqSnap, userSnap] = await Promise.all([
      getDoc(doc(db, "hostRequests", canonicalId)),
      getDoc(userRef),
    ]);
    const reqOk = reqSnap.exists() && reqSnap.data()?.status === "approved";
    const profile = userSnap.exists() ? (userSnap.data() || {}) : {};
    const flagOk = profile.schoolRepApproved === true;
    const roleOk = profile.role === "schoolRepresentative";
    return { reqOk, flagOk, roleOk, profile, reqSnap };
  };

  let state = await check();
  if (state.reqOk || state.flagOk || state.roleOk) return true;

  // Self-heal: canonical approved request exists but sticky flag was never written (e.g. status toggled in console).
  if (state.reqSnap.exists() && state.reqSnap.data()?.status === "approved" && state.profile.schoolRepApproved !== true) {
    try {
      await updateDoc(userRef, {
        schoolRepApproved: true,
        updatedAt: serverTimestamp(),
      });
      state = await check();
      if (state.reqOk || state.flagOk || state.roleOk) return true;
    } catch (_) {
      /* fall through */
    }
  }

  throw new Error(
    "School-rep posting is not granted yet. A Super Admin must Approve your school-rep request once. For older accounts only, use Admin → Requests → Migrate old school-rep grants once."
  );
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
  let result = rows(snap);
  if (collectionName === "announcements") {
    result = result.filter((item) => !isAnnouncementExpired(item));
  }
  if (collectionName === "events") {
    result = result.filter((item) => !isEventExpired(item)).map((item) => ({ ...item, past: false }));
  }
  return result;
}

async function loadAdminTab(tabName, lastDocId = null) {
  if (!(await hasSuperAdminGrant(auth.currentUser))) return { docs: [], lastDocId: null };
  
  const map = {
    requests: "hostRequests",
    flags: "moderationFlags",
    users: "users",
    events: "events",
    announcements: "announcements",
    contentReviews: "contentReviews",
    review: "contentReviews"
  };
  
  const colName = map[tabName];
  if (!colName) return { docs: [], lastDocId: null };

  let q = query(collection(db, colName), limit(50));
  if (lastDocId) {
    const docSnap = await getDoc(doc(db, colName, lastDocId));
    if (docSnap.exists()) {
      q = query(collection(db, colName), startAfter(docSnap), limit(50));
    }
  }
  
  const snap = await getDocs(q).catch(() => ({ docs: [] }));
  return { 
    docs: rows(snap), 
    lastDocId: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1].id : null 
  };
}

window.RVUFirebase = {
  app,
  auth,
  db,
  analytics,
  assignClubCoreRole,
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

  saveUserProfile,
  updateUserProfile: saveUserProfile,
  saveItem,
  unsaveItem,
  leaveClubCore,
  signInWithGoogle,
  submitHostRequest,
  submitMultiClubCoreRequest,
  submitNewClubCreationRequest,
  submitClubApplication,
  withdrawClubApplication,
  loadClubPendingApplications,
  loadAllPendingClubApplications,
  listClubCoreMembers,
  repairSchoolRepGrants,
  assertCanCreateSchoolContent,
  approveClubApplication,
  rejectClubApplication,
  isEventExpired,
  isAnnouncementExpired,
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
  updateSiteSetting,
  updateUserRole,
  removeClubCoreRole,
  getEventRSVPs,
  getProjectApplicants,
  signOut: () => {
    _cachedSuperAdminResult = null;
    return signOut(auth);
  },
};

