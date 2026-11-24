// Veröffentlichung: Die App liegt auf GitHub Pages unter einem Unterpfad (…/tesoro-de-palabras/), daneben liegt der Englisch-Trainer.
// Darum dürfen die ausgelieferten Dateien keine absoluten Pfade benutzen, und der Workflow muss genau die ausgelieferten Dateien kopieren.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { listedFiles, root } from "../scripts/sw-lib.mjs";

const read = (p) => readFileSync(new URL(p, root), "utf8");
const listed = listedFiles();
const shippedText = listed.filter((f) => f !== "./" && /\.(html|js|css|json|webmanifest)$/.test(f));

test("keine absoluten Pfade in den ausgelieferten Dateien (sonst bricht die App unter einem Unterpfad)", () => {
  const bad = [];
  const patterns = [
    /(?:href|src|action)="\/(?!\/)/, /fetch\(\s*["'`]\/(?!\/)/, /import\(\s*["'`]\/(?!\/)/, /register\(\s*["'`]\/(?!\/)/,
    /url\(\s*["']?\/(?!\/)/, /"(?:start_url|scope|src)":\s*"\//, /location\.(?:href|assign)\s*=\s*["'`]\//
  ];
  for (const f of shippedText) {
    const src = read(f);
    for (const re of patterns) if (re.test(src)) bad.push(`${f}: ${re}`);
  }
  assert.deepEqual(bad, []);
});
test("keine Adressen nach außen in den ausgelieferten Dateien (außer dem SVG-Namensraum)", () => {
  const bad = [];
  for (const f of shippedText) {
    for (const m of read(f).matchAll(/https?:\/\/[^\s"'`)<>]+/g)) if (!/^http:\/\/www\.w3\.org\/2000\/svg/.test(m[0])) bad.push(`${f}: ${m[0]}`);
  }
  assert.deepEqual(bad, [], "die App lädt nichts von außen");
});
test("fetch() in der App nutzt relative Pfade zu vorhandenen Dateien", () => {
  for (const f of shippedText.filter((x) => x.endsWith(".js"))) {
    for (const m of read(f).matchAll(/fetch\(\s*["']([^"']+)["']/g)) assert.ok(listed.includes(m[1]), `${f}: fetch("${m[1]}") ist nicht ausgeliefert`);
    for (const m of read(f).matchAll(/fetch\(\s*\)/g)) assert.fail(f);
  }
  const main = read("js/main.js");
  for (const m of main.matchAll(/"(data\/[a-z-]+\.json)"/g)) assert.ok(listed.includes(m[1]), m[1]);
});
test("der Workflow kopiert genau die ausgelieferten Dateien und nichts anderes", () => {
  const yml = read(".github/workflows/pages.yml");
  const cp = yml.match(/cp -r ([^\n]+) site\//)[1].split(/\s+/).sort();
  const tops = [...new Set([...listed.filter((f) => f !== "./").map((f) => f.split("/")[0]), "sw.js"])].sort();
  assert.deepEqual(cp, tops, "Workflow und sw.js FILES müssen übereinstimmen");
  for (const t of cp) assert.ok(existsSync(new URL(t, root)), t);
  for (const never of ["tests", "scripts", ".claude", "CLAUDE.md", "UMBAUPLAN.md", "ABNAHME.md", "Beispiele-zum-Pruefen.md", ".git"]) assert.ok(!cp.includes(never), never);
});
test("der Workflow testet vor dem Veröffentlichen und läuft nur auf main", () => {
  const yml = read(".github/workflows/pages.yml");
  assert.match(yml, /push:\s*\n\s*branches: \[main\]/);
  assert.match(yml, /run: node --test/);
  assert.match(yml, /deploy:\s*\n\s*needs: test/);
  assert.match(yml, /permissions:\s*\n\s*contents: read\s*\n\s*pages: write\s*\n\s*id-token: write\s*\n\s*actions: read/);
  assert.ok(!/(?:contents|pages|actions|id-token): write\b[\s\S]*(?:issues|pull-requests|packages|deployments): write/.test(yml), "keine weiteren Schreibrechte");
  assert.ok(!/secrets\./.test(yml), "keine Geheimnisse nötig");
  for (const m of yml.matchAll(/uses: ([^\s@]+)@(\S+)/g)) assert.match(m[2], /^v\d+$/, `${m[1]} soll auf eine Hauptversion festgelegt sein`);
  assert.match(yml, /node-version: 22/);
});
test("der Workflow wartet vor deploy-pages, bis das Paket in der Artefaktliste steht (GitHub zeigt es manchmal verspätet)", () => {
  const yml = read(".github/workflows/pages.yml");
  const wait = yml.indexOf("Warten, bis das Paket");
  assert.ok(yml.indexOf("actions/upload-pages-artifact") < wait && wait < yml.indexOf("actions/deploy-pages"), "Reihenfolge: hochladen, warten, veröffentlichen");
  assert.match(yml, /GH_TOKEN: \$\{\{ github\.token \}\}/, "das eingebaute Token, kein eigenes Geheimnis");
  assert.match(yml, /select\(\.name=="github-pages"\)/);
  assert.match(yml, /seq 1 12/);
  assert.match(yml, /sleep 5/);
  assert.match(yml, /deploy-pages versucht es trotzdem/, "nach einer Minute wird trotzdem versucht, nicht abgebrochen");
});
test("README und Projektdateien für das Repository sind da, .gitignore schützt lokale Dateien", () => {
  assert.match(read("README.md"), /node --test/);
  const ignore = read(".gitignore");
  assert.match(ignore, /\.claude\//);
  assert.match(ignore, /node_modules\//);
  assert.ok(readdirSync(new URL(".", root)).includes("CLAUDE.md"));
});
test("Pages-Pfad: Manifest und Service Worker gelten für den Ordner der App, nicht für die ganze Domain", () => {
  const m = JSON.parse(read("manifest.webmanifest"));
  assert.equal(m.start_url, "./");
  assert.equal(m.scope, "./");
  assert.match(read("js/main.js"), /register\("sw\.js"\)/);
  assert.match(read("sw.js"), /const PREFIX = "tesoro-de-palabras-";/);
  assert.match(read("js/core/state.js"), /STORAGE_KEY = "tesoro-de-palabras-v1"/, "eigener Speicherschlüssel: die Herkunft chris81tof.github.io teilt sich der Englisch-Trainer");
});
