import fs from "node:fs";
import vm from "node:vm";
const files = process.argv.slice(2);
let bad = 0;
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  try {
    new vm.SourceTextModule(src, { identifier: f });
    console.log("OK   " + f);
  } catch (e) {
    bad++;
    console.log("FAIL " + f + "\n     " + e.message);
  }
}
process.exit(bad ? 1 : 0);
