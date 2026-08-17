/**
 * Onboarding gating tests.
 *
 * Drives the real syncFirebaseData() against stubbed Firestore responses and asserts which
 * accounts are shown the onboarding modal. Onboarding is for genuinely NEW accounts only.
 *
 * The bug this guards against: keying the decision off `profile.onboardingComplete` alone meant
 * any account created before that field existed had it undefined, so onboarding reappeared on
 * every single login, forever. Five of the cases below failed before the fix.
 *
 * Run with: npm run test:onboarding
 *
 * The app modules are ES modules but package.json is commonjs, so they are mirrored into a
 * temporary directory carrying {"type":"module"} before import.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");

/* ── Minimal DOM: enough for the modules to import, no jsdom dependency ── */
const el = () => ({
  innerHTML: "", style: {}, children: [], attributes: [], tagName: "DIV",
  setAttribute() {}, removeAttribute() {}, appendChild() {}, removeChild() {},
  append() {}, remove() {}, focus() {}, click() {},
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({}),
  classList: { add() {}, remove() {}, contains: () => false },
});
global.document = {
  body: el(), documentElement: el(), activeElement: null,
  createElement: el, querySelector: () => el(), querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {},
};
global.window = {
  location: { search: "", pathname: "/", hostname: "localhost", href: "http://localhost/" },
  history: { pushState() {}, back() {} },
  addEventListener() {}, removeEventListener() {},
  dispatchEvent() { return true; },
  setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {},
  scrollTo() {}, alert() {}, confirm: () => true, open() {},
};
global.CustomEvent = class { constructor(t, o) { this.type = t; Object.assign(this, o); } };

/* ── Mirror the app modules somewhere Node will treat as ESM ── */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rvu-onboarding-"));
fs.mkdirSync(path.join(tmp, "js"));
for (const f of fs.readdirSync(path.join(REPO, "js"))) {
  fs.copyFileSync(path.join(REPO, "js", f), path.join(tmp, "js", f));
}
fs.copyFileSync(path.join(REPO, "sample-data.js"), path.join(tmp, "sample-data.js"));
fs.writeFileSync(path.join(tmp, "package.json"), '{"type":"module"}\n');
// These two reach the network SDK at import time; the tests stub window.RVUFirebase instead.
fs.writeFileSync(path.join(tmp, "js", "firebase-init.js"),
  "export const app={};export const auth={currentUser:null};export const db={};" +
  "export const analytics=null;export const appCheck=null;\n");
fs.writeFileSync(path.join(tmp, "js", "services.js"), "export {};\n");

const { state } = await import(pathToFileURL(path.join(tmp, "js", "state.js")).href);
const auth = await import(pathToFileURL(path.join(tmp, "js", "auth.js")).href);

const savedPatches = [];
function stubFirebase(profile, data) {
  global.window.RVUFirebase = {
    ensureUserProfile: async () => ({ id: "u1", ...profile }),
    loadCampusData: async () => ({
      clubs: [], events: [], announcements: [], projects: [], hostRequests: [],
      moderationFlags: [], allUsers: [], allEvents: [], allAnnouncements: [], allClubs: [],
      allSchools: [], savedItems: [], followedClubs: [], rsvps: [], myApplications: [],
      siteSettings: [], clubApplications: [], clubAccess: null, clubAccesses: [],
      schoolAccess: null, schoolAccesses: [], loadErrors: [], ...data,
    }),
    saveUserProfile: async (_uid, patch) => { savedPatches.push(patch); },
  };
}

const CLUB_ACCESS = {
  clubAccess: { club: { id: "c1", name: "AI Forge", school: "S" }, member: { role: "core", name: "A" } },
};

const cases = [
  // label, profile, campus data, expected onboardingStep
  ["brand-new account — nothing at all", { role: "student", name: "new", onboardingComplete: false }, {}, "role"],
  ["brand-new account — no flag, no data", { role: "student", name: "new" }, {}, "role"],
  ["returning user, onboardingComplete true", { role: "student", name: "A", onboardingComplete: true }, {}, null],
  ["legacy user — no flag, has school", { role: "student", name: "A", school: "School of Law" }, {}, null],
  ["legacy user — no flag, has year", { role: "student", name: "A", year: "3" }, {}, null],
  ["legacy user — no flag, has interests", { role: "student", name: "A", interests: ["AI"] }, {}, null],
  ["has a pending club application", { role: "student", name: "A" }, { clubApplications: [{ id: "x", status: "pending" }] }, null],
  ["has a pending host request", { role: "student", name: "A" }, { hostRequests: [{ id: "x", status: "pending" }] }, null],
  ["has saved an item", { role: "student", name: "A" }, { savedItems: [{ id: "s" }] }, null],
  ["follows a club", { role: "student", name: "A" }, { followedClubs: [{ clubId: "c" }] }, null],
  ["super admin", { role: "superAdmin", name: "A" }, {}, null],
  ["approved club core", { role: "student", name: "A" }, CLUB_ACCESS, null],
];

let failed = 0;
console.log("\nonboarding gating — only brand-new accounts should see it\n");
for (const [label, profile, data, expected] of cases) {
  auth.resetSessionState();              // a fresh page load / post-sign-out session
  state.authed = true;
  state.authUser = { uid: "u1", email: "x@rvu.edu.in", displayName: "X" };
  stubFirebase(profile, data);
  await auth.syncFirebaseData({ quiet: true });
  const got = state.onboardingStep;
  const ok = got === expected;
  if (!ok) failed += 1;
  console.log(`  ${ok ? "✓" : "✗ FAIL"}  ${label.padEnd(42)} → ${String(got)}${ok ? "" : ` (expected ${String(expected)})`}`);
}

// Established accounts missing the flag should get a one-time repair write.
const repairs = savedPatches.filter((p) => p.onboardingComplete === true).length;
console.log(`\n  one-time onboardingComplete repair writes: ${repairs}`);
if (repairs < 8) { console.log("  ✗ FAIL  expected the legacy accounts to be repaired"); failed += 1; }

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} FAILED\n` : `\n${cases.length}/${cases.length} passed\n`);
process.exit(failed ? 1 : 0);
