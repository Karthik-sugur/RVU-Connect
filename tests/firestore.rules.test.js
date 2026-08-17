/**
 * Firestore security rules tests.
 *
 * Run with the emulator:
 *   npm test
 *
 * These cover the escalation and access holes found in the pre-launch QA audit
 * (see QA-REPORT.md): the users/{uid} create whitelist, the @rvu.edu.in domain
 * gate, core-member roster reads, and the RSVP write paths.
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } = require("firebase/firestore");

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

  await it("allows a normal student profile create", () =>
    assertSucceeds(setDoc(doc(asRvu, "users", RVU.sub), {
      email: RVU.email, role: "student", name: "Student One",
      interests: [], clubIds: [], onboardingComplete: false,
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

  console.log("\nRSVP write paths (QA finding: RSVP had no writer)");

  await it("lets a student write their own event RSVP", () =>
    assertSucceeds(setDoc(doc(asRvu, "events", "evt-club", "rsvps", RVU.sub), {
      uid: RVU.sub, email: RVU.email, status: "going",
    })));

  await it("lets a student mirror the RSVP under their own profile", () =>
    assertSucceeds(setDoc(doc(asRvu, "users", RVU.sub, "rsvps", "evt-club"), {
      eventId: "evt-club", title: "Build Night", status: "going",
    })));

  await it("blocks writing an RSVP as another user", () =>
    assertFails(setDoc(doc(asRvu2, "events", "evt-club", "rsvps", RVU.sub), {
      uid: RVU.sub, status: "going",
    })));

  await it("lets a student delete their own RSVP", () =>
    assertSucceeds(deleteDoc(doc(asRvu, "events", "evt-club", "rsvps", RVU.sub))));

  await it("lets the hosting club core read the event's RSVP list", () =>
    assertSucceeds(getDocs(collection(asCore, "events", "evt-club", "rsvps"))));

  await it("lets a super admin read the event's RSVP list", () =>
    assertSucceeds(getDocs(collection(asAdmin, "events", "evt-club", "rsvps"))));

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
