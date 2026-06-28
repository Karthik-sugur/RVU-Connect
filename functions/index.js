const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

function isRvuEmail(email) {
  return typeof email === "string" && email.endsWith("@rvu.edu.in");
}

async function isSuperAdmin(email) {
  if (!email || !isRvuEmail(email)) return false;
  
  // Check users collection
  const userSnapshot = await db.collection("users").where("email", "==", email).where("role", "==", "superAdmin").get();
  if (!userSnapshot.empty) return true;
  
  // Check superAdmins collection
  const superAdminSnapshot = await db.collection("superAdmins").doc(email).get();
  if (superAdminSnapshot.exists) return true;
  
  return false;
}

exports.updateHostRequestStatus = onCall(async (request) => {
  if (!request.auth || !isRvuEmail(request.auth.token.email)) {
    throw new HttpsError("unauthenticated", "Must be logged in with an RVU email.");
  }
  
  const superAdmin = await isSuperAdmin(request.auth.token.email);
  if (!superAdmin) {
    throw new HttpsError("permission-denied", "Only super admins can update host requests.");
  }

  const { requestId, status } = request.data;
  if (!requestId || !status) {
    throw new HttpsError("invalid-argument", "Missing requestId or status.");
  }

  const requestRef = db.collection("hostRequests").doc(requestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) {
    throw new HttpsError("not-found", "Host request not found.");
  }

  const hostRequest = requestSnap.data();
  const { type, uid, email, schoolId, clubName, roleTitle } = hostRequest;

  const batch = db.batch();
  batch.update(requestRef, { status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

  if (status === "approved" && type === "schoolRepresentative") {
    const schoolRef = db.collection("schools").doc(schoolId || "default");
    batch.set(schoolRef.collection("representatives").doc(uid), {
      email,
      status: "approved",
      assignedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    const userRef = db.collection("users").doc(uid);
    batch.update(userRef, {
      role: "school-rep",
      onboardingComplete: true
    });
  } else if (status === "approved" && type === "clubCore") {
    const clubId = (clubName || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const clubRef = db.collection("clubs").doc(clubId);
    batch.set(clubRef.collection("coreMembers").doc(email), {
      uid,
      email,
      status: "approved",
      role: roleTitle || "Core",
      assignedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    const userRef = db.collection("users").doc(uid);
    // Note: this simple logic overwrites role if already superAdmin, but we'll accept for now or refine.
    batch.update(userRef, {
      role: "clubCore",
      onboardingComplete: true
    });
  } else if (status === "approved" && type === "newClub") {
    const clubId = (clubName || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const clubRef = db.collection("clubs").doc(clubId);
    batch.set(clubRef, {
      name: clubName,
      slug: clubId,
      category: hostRequest.clubCategory || "",
      school: hostRequest.clubSchool || "",
      description: hostRequest.clubDescription || "",
      tagline: hostRequest.clubTagline || "",
      founderName: hostRequest.founderName || "",
      founderEmail: hostRequest.founderEmail || "",
      status: "approved",
      registrationOpen: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.set(clubRef.collection("coreMembers").doc(email), {
      uid,
      email,
      name: hostRequest.founderName || "",
      role: hostRequest.roleTitle || "President",
      status: "approved",
      assignedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    const userRef = db.collection("users").doc(uid);
    batch.update(userRef, {
      role: "clubCore",
      onboardingComplete: true
    });
  }

  await batch.commit();
  return { success: true };
});

exports.updateClubStatus = onCall(async (request) => {
  if (!request.auth || !isRvuEmail(request.auth.token.email)) {
    throw new HttpsError("unauthenticated", "Must be logged in with an RVU email.");
  }
  
  const superAdmin = await isSuperAdmin(request.auth.token.email);
  if (!superAdmin) {
    throw new HttpsError("permission-denied", "Only super admins can update club status.");
  }

  const { clubId, status } = request.data;
  if (!clubId || !status) {
    throw new HttpsError("invalid-argument", "Missing clubId or status.");
  }

  await db.collection("clubs").doc(clubId).update({
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true };
});

exports.grantSuperAdmin = onCall(async (request) => {
  if (!request.auth || !isRvuEmail(request.auth.token.email)) {
    throw new HttpsError("unauthenticated", "Must be logged in with an RVU email.");
  }
  
  const superAdmin = await isSuperAdmin(request.auth.token.email);
  if (!superAdmin) {
    throw new HttpsError("permission-denied", "Only super admins can grant admin access.");
  }

  const { email } = request.data;
  if (!email || !isRvuEmail(email)) {
    throw new HttpsError("invalid-argument", "Valid RVU email required.");
  }

  await db.collection("superAdmins").doc(email).set({
    email,
    grantedBy: request.auth.token.email,
    grantedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Also update user profile if it exists
  const userSnapshot = await db.collection("users").where("email", "==", email).get();
  if (!userSnapshot.empty) {
    const userDoc = userSnapshot.docs[0];
    await userDoc.ref.update({ role: "superAdmin" });
  }

  return { success: true };
});

exports.revokeSuperAdmin = onCall(async (request) => {
  if (!request.auth || !isRvuEmail(request.auth.token.email)) {
    throw new HttpsError("unauthenticated", "Must be logged in with an RVU email.");
  }
  
  const superAdmin = await isSuperAdmin(request.auth.token.email);
  if (!superAdmin) {
    throw new HttpsError("permission-denied", "Only super admins can revoke admin access.");
  }

  const { email } = request.data;
  if (!email) {
    throw new HttpsError("invalid-argument", "Email required.");
  }

  await db.collection("superAdmins").doc(email).delete();

  // Also update user profile if it exists
  const userSnapshot = await db.collection("users").where("email", "==", email).get();
  if (!userSnapshot.empty) {
    const userDoc = userSnapshot.docs[0];
    await userDoc.ref.update({ role: "student" });
  }

  return { success: true };
});

exports.updateClubMemberStatus = onCall(async (request) => {
  if (!request.auth || !isRvuEmail(request.auth.token.email)) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }
  
  const { clubId, targetEmail, action } = request.data; 
  if (!clubId || !targetEmail || !action) {
    throw new HttpsError("invalid-argument", "Missing fields.");
  }

  const superAdmin = await isSuperAdmin(request.auth.token.email);
  
  let isPresident = false;
  if (!superAdmin) {
    const callerMemberDoc = await db.collection("clubs").doc(clubId).collection("coreMembers").doc(request.auth.token.email).get();
    if (callerMemberDoc.exists && callerMemberDoc.data().status === "approved" && ["president", "owner"].includes(callerMemberDoc.data().role)) {
      isPresident = true;
    }
  }

  if (!superAdmin && !isPresident) {
    throw new HttpsError("permission-denied", "Only club presidents or super admins can modify member status.");
  }

  const memberRef = db.collection("clubs").doc(clubId).collection("coreMembers").doc(targetEmail);
  
  if (action === "approve") {
    await memberRef.update({
      status: "approved",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } else if (action === "reject" || action === "remove") {
    await memberRef.delete();
  }

  return { success: true };
});

exports.suspendUser = onCall(async (request) => {
  if (!request.auth || !isRvuEmail(request.auth.token.email)) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }
  
  const superAdmin = await isSuperAdmin(request.auth.token.email);
  if (!superAdmin) {
    throw new HttpsError("permission-denied", "Only super admins can suspend users.");
  }

  const { uid, suspend } = request.data;
  if (!uid) {
    throw new HttpsError("invalid-argument", "User ID required.");
  }

  await db.collection("users").doc(uid).update({
    suspended: suspend === true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true };
});
