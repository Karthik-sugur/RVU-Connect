/**
 * Firestore security rules tests.
 *
 * Run with the emulator:
 *   npm test
 *
 * These cover the escalation and access holes found in the pre-launch QA audit
 * (see QA-REPORT.md): the users/{uid} create whitelist, the @rvu.edu.in domain
 * gate, core-member roster reads, and the rsvps subcollection ownership rules.
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, limit } = require("firebase/firestore");

const RULES = fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8");
const PROJECT_ID = "rvu-connect-rules-test";

const RVU = { sub: "student1", email: "student1@rvu.edu.in", email_verified: true };
const RVU2 = { sub: "student2", email: "student2@rvu.edu.in", email_verified: true };
const CORE = { sub: "core1", email: "core1@rvu.edu.in", email_verified: true };
const ADMIN = { sub: "admin1", email: "admin1@rvu.edu.in", email_verified: true };
const OUTSIDER = { sub: "rando", email: "rando@gmail.com", email_verified: true };

let testEnv;
const results = [];

function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "  ✓" : "  ✗ FAIL"}  ${name}${detail && !passed ? ` — ${detail}` : ""}`);
}

async function it(name, fn) {
  try {
    await fn();
    check(name, true);
  } catch (err) {
    check(name, false, err.message);
  }
}

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "superAdmins", ADMIN.sub), { uid: ADMIN.sub, email: ADMIN.email });
    await setDoc(doc(db, "users", ADMIN.sub), { email: ADMIN.email, role: "superAdmin" });
    await setDoc(doc(db, "users", RVU2.sub), { email: RVU2.email, role: "student" });
    await setDoc(doc(db, "clubs", "club-a"), {
      name: "AI Forge", status: "approved", founderEmail: "founder@rvu.edu.in",
    });
    await setDoc(doc(db, "clubs", "club-a", "coreMembers", CORE.email), {
      email: CORE.email, uid: CORE.sub, status: "approved", role: "core",
    });
    await setDoc(doc(db, "events", "evt-club"), {
      title: "Build Night", hostType: "club", clubId: "club-a", status: "published",
    });
  });
}

async function main() {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES, host: "127.0.0.1", port: 8080 },
  });
  await testEnv.clearFirestore();
  await seed();

  const asRvu = testEnv.authenticatedContext(RVU.sub, RVU).firestore();
  const asRvu2 = testEnv.authenticatedContext(RVU2.sub, RVU2).firestore();
  const asCore = testEnv.authenticatedContext(CORE.sub, CORE).firestore();
  const asAdmin = testEnv.authenticatedContext(ADMIN.sub, ADMIN).firestore();
  const asOutsider = testEnv.authenticatedContext(OUTSIDER.sub, OUTSIDER).firestore();
  const anon = testEnv.unauthenticatedContext().firestore();

  console.log("\nusers/{uid} create — privilege escalation (QA finding B3)");

  await it("rejects self-granted schoolRepApproved on create", () =>
    assertFails(setDoc(doc(asRvu, "users", RVU.sub), {
      email: RVU.email, role: "student", schoolRepApproved: true,
    })));

  await it("rejects self-granted clubCoreApproved on create", () =>
    assertFails(setDoc(doc(asRvu, "users", RVU.sub), {
      email: RVU.email, role: "student", clubCoreApproved: true,
    })));

  await it("rejects self-granted hostApproved on create", () =>
    assertFails(setDoc(doc(asRvu, "users", RVU.sub), {
      email: RVU.email, role: "student", hostApproved: true,
    })));

  await it("rejects creating a profile with role superAdmin", () =>
    assertFails(setDoc(doc(asRvu, "users", RVU.sub), {
      email: RVU.email, role: "superAdmin",
    })));

  // The EXACT payload ensureUserProfile() writes (js/services.js). Keep these in sync — an
  // over-broad create denylist here denies every new sign-up, and a fixture that omits a field
  // the app really sends will not catch it.
  await it("allows the real ensureUserProfile create payload", () =>
    assertSucceeds(setDoc(doc(asRvu, "users", RVU.sub), {
      email: RVU.email,
      name: "Student One",
      role: "student",
      clubIds: [],
      roleTitle: "",
      interests: [],
      onboardingComplete: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })));

  await it("allows a minimal student profile create", () =>
    assertSucceeds(setDoc(doc(asRvu2, "users", RVU2.sub), {
      email: RVU2.email, role: "student", name: "Student Two",
    })));

  await it("still rejects escalating schoolRepApproved via update", () =>
    assertFails(updateDoc(doc(asRvu, "users", RVU.sub), { schoolRepApproved: true })));

  await it("still rejects changing own role via update", () =>
    assertFails(updateDoc(doc(asRvu, "users", RVU.sub), { role: "superAdmin" })));

  await it("allows updating own harmless profile fields", () =>
    assertSucceeds(updateDoc(doc(asRvu, "users", RVU.sub), { name: "Renamed" })));

  console.log("\n@rvu.edu.in domain gate (QA finding: rules accepted any Google account)");

  await it("blocks a non-RVU account from reading clubs", () =>
    assertFails(getDoc(doc(asOutsider, "clubs", "club-a"))));

  await it("blocks a non-RVU account from reading events", () =>
    assertFails(getDocs(collection(asOutsider, "events"))));

  await it("blocks a non-RVU account from creating its own profile", () =>
    assertFails(setDoc(doc(asOutsider, "users", OUTSIDER.sub), {
      email: OUTSIDER.email, role: "student",
    })));

  await it("blocks unauthenticated reads", () =>
    assertFails(getDoc(doc(anon, "clubs", "club-a"))));

  await it("allows an RVU account to read an approved club", () =>
    assertSucceeds(getDoc(doc(asRvu, "clubs", "club-a"))));

  console.log("\ncoreMembers roster read (QA finding: empty for ordinary students)");

  await it("lets an ordinary student read a club's core roster", () =>
    assertSucceeds(getDocs(collection(asRvu, "clubs", "club-a", "coreMembers"))));

  await it("still blocks a non-RVU account from the roster", () =>
    assertFails(getDocs(collection(asOutsider, "clubs", "club-a", "coreMembers"))));

  // Attendance is off-platform (events carry an external Join link), so the app neither reads
  // nor writes these. The owner-only rules are still asserted so pre-existing data stays
  // reachable by its owner and by nobody else.
  console.log("\nrsvps subcollections — owner-only, unused by the app");

  await it("lets a student write their own event RSVP doc", () =>
    assertSucceeds(setDoc(doc(asRvu, "events", "evt-club", "rsvps", RVU.sub), {
      uid: RVU.sub, email: RVU.email, status: "going",
    })));

  await it("blocks writing an RSVP doc as another user", () =>
    assertFails(setDoc(doc(asRvu2, "events", "evt-club", "rsvps", RVU.sub), {
      uid: RVU.sub, status: "going",
    })));

  await it("blocks a non-host, non-owner from reading someone else's RSVP doc", () =>
    assertFails(getDoc(doc(asRvu2, "events", "evt-club", "rsvps", RVU.sub))));

  await it("lets a student delete their own RSVP doc", () =>
    assertSucceeds(deleteDoc(doc(asRvu, "events", "evt-club", "rsvps", RVU.sub))));

  console.log("\nclub-core scoping — a core of one club cannot edit another");

  await it("lets an approved club core edit its own club", () =>
    assertSucceeds(updateDoc(doc(asCore, "clubs", "club-a"), { tagline: "Build things" })));

  await it("blocks an ordinary student from editing a club", () =>
    assertFails(updateDoc(doc(asRvu, "clubs", "club-a"), { tagline: "hacked" })));

  await it("blocks an ordinary student from creating a club", () =>
    assertFails(setDoc(doc(asRvu, "clubs", "club-new"), { name: "Mine", status: "approved" })));

  await it("blocks a club core from approving their own membership application", () =>
    assertFails(setDoc(doc(asRvu, "clubApplications", `club-a_${RVU.sub}`), {
      uid: RVU.sub, email: RVU.email, clubId: "club-a", status: "approved",
    })));

  console.log("\nhostRequests — self-approval must stay blocked");

  await it("allows creating own pending request", () =>
    assertSucceeds(setDoc(doc(asRvu, "hostRequests", `schoolRepresentative_${RVU.sub}`), {
      uid: RVU.sub, status: "pending", type: "schoolRepresentative",
    })));

  await it("blocks self-approving own request", () =>
    assertFails(updateDoc(doc(asRvu, "hostRequests", `schoolRepresentative_${RVU.sub}`), {
      status: "approved",
    })));

  await it("blocks creating an already-approved request", () =>
    assertFails(setDoc(doc(asRvu2, "hostRequests", `clubCore_${RVU2.sub}`), {
      uid: RVU2.sub, status: "approved", type: "clubCore",
    })));

  console.log("\nclubApplications — the three permission failures from the QA screenshots");

  await it("lets a first-time applicant read the not-yet-created application doc", () =>
    assertSucceeds(getDoc(doc(asRvu2, "clubApplications", `club-a_${RVU2.sub}`))));

  await it("still hides another student's application from a non-core student", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "clubApplications", `club-a_${RVU.sub}`), {
        uid: RVU.sub, email: RVU.email, clubId: "club-a", status: "pending",
      });
    });
    await assertFails(getDoc(doc(asRvu2, "clubApplications", `club-a_${RVU.sub}`)));
  });

  await it("lets a core member whose roster doc has no status field list applicants", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "clubs", "club-b"), { name: "Legacy Club", status: "approved" });
      await setDoc(doc(db, "clubs", "club-b", "coreMembers", CORE.email), {
        email: CORE.email, uid: CORE.sub, role: "core",
      });
      await setDoc(doc(db, "clubApplications", `club-b_${RVU.sub}`), {
        uid: RVU.sub, email: RVU.email, clubId: "club-b", status: "pending",
      });
    });
    await assertSucceeds(getDocs(query(
      collection(asCore, "clubApplications"),
      where("clubId", "==", "club-b"),
      where("status", "==", "pending"),
      limit(50),
    )));
  });

  await it("still blocks an unrelated student from listing a club's applicants", () =>
    assertFails(getDocs(query(
      collection(asRvu2, "clubApplications"),
      where("clubId", "==", "club-b"),
      where("status", "==", "pending"),
      limit(50),
    ))));

  await it("lets a member withdraw their own approved application when leaving a club", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "clubApplications", `club-a_${RVU2.sub}`), {
        uid: RVU2.sub, email: RVU2.email, clubId: "club-a", status: "approved",
      });
    });
    await assertSucceeds(updateDoc(doc(asRvu2, "clubApplications", `club-a_${RVU2.sub}`), {
      uid: RVU2.sub, email: RVU2.email, clubId: "club-a", status: "withdrawn",
    }));
  });

  await it("still blocks a student from self-approving their own application", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "clubApplications", `club-a_${RVU2.sub}`), {
        uid: RVU2.sub, email: RVU2.email, clubId: "club-a", status: "pending",
      });
    });
    await assertFails(updateDoc(doc(asRvu2, "clubApplications", `club-a_${RVU2.sub}`), {
      uid: RVU2.sub, email: RVU2.email, clubId: "club-a", status: "approved",
    }));
  });

  await testEnv.cleanup();

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.error(`\n${failed.length} FAILED:`);
    failed.forEach((f) => console.error(`  - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
  console.log("All rules tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
