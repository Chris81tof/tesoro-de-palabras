// Trägt in sw.js den Fingerabdruck der ausgelieferten Dateien ein und erhöht VERSION, wenn er sich geändert hat.
// Ohne neue VERSION bekommt das iPhone die neue Fassung nicht. Start: node scripts/stamp-sw.mjs
import { writeFileSync } from "node:fs";
import { swSource, contentHash, root } from "./sw-lib.mjs";

const src = swSource();
const now = contentHash();
const old = src.match(/const CONTENT = "([0-9a-f]+)";/)[1];
if (old === now) {
  console.log("sw.js ist aktuell (Fingerabdruck " + now + ").");
} else {
  const v = Number(src.match(/const VERSION = "(\d+)";/)[1]) + 1;
  writeFileSync(new URL("sw.js", root), src.replace(/const VERSION = "\d+";/, `const VERSION = "${v}";`).replace(/const CONTENT = "[0-9a-f]+";/, `const CONTENT = "${now}";`));
  console.log(`sw.js: VERSION ${v}, Fingerabdruck ${now}.`);
}
