import fs from "node:fs";
import path from "node:path";

const PAGES = ["index.html", "admin.html"];
const MODULE_DIR = "js";

function readMap(html, file) {
  const match = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`${file}: no <script type="importmap"> block`);
  let parsed;
  try {
    parsed = JSON.parse(match[1]);
  } catch (e) {
    throw new Error(`${file}: import map is not valid JSON - ${e.message}`);
  }
  return parsed.imports || {};
}

const modules = fs.readdirSync(MODULE_DIR)
  .filter((f) => f.endsWith(".js"))
  .map((f) => `./${MODULE_DIR}/${f}`)
  .concat(["./sample-data.js"]);

let bad = 0;
const versions = new Set();

for (const page of PAGES) {
  const html = fs.readFileSync(page, "utf8");
  let imports;
  try {
    imports = readMap(html, page);
  } catch (e) {
    console.log(`FAIL ${e.message}`);
    bad++;
    continue;
  }

  const missing = modules.filter((m) => !(m in imports));
  if (missing.length) {
    console.log(`FAIL ${page}: modules missing from the import map:\n     ${missing.join("\n     ")}`);
    bad++;
  }

  const stale = Object.keys(imports).filter((k) => !modules.includes(k));
  if (stale.length) {
    console.log(`FAIL ${page}: import map points at files that no longer exist:\n     ${stale.join("\n     ")}`);
    bad++;
  }

  for (const [key, target] of Object.entries(imports)) {
    const m = target.match(/^(.*)\?v=(.+)$/);
    if (!m) {
      console.log(`FAIL ${page}: "${key}" has no ?v= version token`);
      bad++;
      continue;
    }
    if (m[1] !== key) {
      console.log(`FAIL ${page}: "${key}" maps to a different path "${m[1]}"`);
      bad++;
    }
    versions.add(m[2]);
  }

  for (const src of [...html.matchAll(/<script type="module" src="([^"]+)"/g)].map((x) => x[1])) {
    const m = src.match(/\?v=(.+)$/);
    if (!m) {
      console.log(`FAIL ${page}: entry script ${src} has no ?v= version token`);
      bad++;
    } else {
      versions.add(m[1]);
    }
  }

  for (const href of [...html.matchAll(/<link rel="stylesheet" href="(\.[^"]+)"/g)].map((x) => x[1])) {
    const m = href.match(/\?v=(.+)$/);
    if (!m) {
      console.log(`FAIL ${page}: stylesheet ${href} has no ?v= version token`);
      bad++;
    } else {
      versions.add(m[1]);
    }
  }

  if (!bad) console.log(`OK   ${page} (${Object.keys(imports).length} mappings)`);
}

if (versions.size > 1) {
  console.log(`FAIL version tokens disagree across pages: ${[...versions].join(", ")}`);
  bad++;
}

for (const page of PAGES) {
  const html = fs.readFileSync(page, "utf8");
  const mapAt = html.indexOf('<script type="importmap">');
  const firstModuleAt = html.indexOf('<script type="module"');
  if (mapAt > firstModuleAt) {
    console.log(`FAIL ${page}: the import map must appear before the first module script`);
    bad++;
  }
}

if (!bad) console.log(`OK   every module versioned at ${[...versions][0]}`);
process.exit(bad ? 1 : 0);
