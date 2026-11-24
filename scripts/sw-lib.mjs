// Gemeinsame Hilfen für scripts/stamp-sw.mjs und tests/sw.test.mjs: Dateiliste und Fingerabdruck der ausgelieferten Dateien.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

export const root = new URL("../", import.meta.url);
export const swSource = () => readFileSync(new URL("sw.js", root), "utf8");

// FILES aus sw.js
export function listedFiles(src = swSource()) {
  return JSON.parse("[" + src.match(/const FILES = \[([\s\S]*?)\];/)[1].replace(/,\s*$/, "") + "]");
}

// Fingerabdruck: Pfade und Inhalt aller gelisteten Dateien (sw.js selbst nicht), 12 Zeichen
export function contentHash(files = listedFiles()) {
  const h = createHash("sha256");
  for (const f of files.filter((x) => x !== "./").sort()) {
    h.update(f + "\0");
    h.update(readFileSync(new URL(f, root)));
    h.update("\0");
  }
  return h.digest("hex").slice(0, 12);
}
