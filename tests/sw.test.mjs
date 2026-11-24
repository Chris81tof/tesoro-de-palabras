// Offline-Betrieb: Dateiliste, Fingerabdruck, Cache-Präfix und das Verhalten des Service Workers (in einer Testumgebung ausgeführt).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import vm from "node:vm";
import { listedFiles, contentHash, swSource, root } from "../scripts/sw-lib.mjs";

const sw = swSource();
const listed = listedFiles(sw);
const VERSION = sw.match(/const VERSION = "(\d+)";/)[1];

function walk(dir, keep) {
  return readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(dir + e.name + "/", keep) : keep(e.name) ? [dir + e.name] : []);
}

test("sw.js hat eine Versionsnummer und einen Fingerabdruck", () => {
  assert.match(sw, /const VERSION = "\d+";/);
  assert.match(sw, /const CONTENT = "[0-9a-f]{12}";/);
});
test("jede gelistete Datei existiert, nichts ist doppelt", () => {
  for (const f of listed) if (f !== "./") assert.ok(existsSync(new URL(f, root)), f);
  assert.equal(new Set(listed).size, listed.length, "doppelte Einträge");
  assert.ok(listed.includes("./") && listed.includes("index.html"));
});
test("jede ausgelieferte Datei ist gelistet (und sonst nichts)", () => {
  const shipped = [
    "index.html", "manifest.webmanifest",
    ...walk("css/", (n) => n.endsWith(".css")),
    ...walk("js/", (n) => n.endsWith(".js")),
    ...walk("data/", (n) => n.endsWith(".json")),
    ...walk("icons/", (n) => n.endsWith(".png"))
  ];
  assert.deepEqual(shipped.filter((f) => !listed.includes(f)), [], "in sw.js nachtragen (node scripts/stamp-sw.mjs erhöht danach die Version)");
  assert.deepEqual(listed.filter((f) => f !== "./" && !shipped.includes(f)), [], "gelistet, aber nicht ausgeliefert");
});
test("der Fingerabdruck passt zu den Dateien: nach jeder Änderung node scripts/stamp-sw.mjs ausführen", () => {
  const stamp = sw.match(/const CONTENT = "([0-9a-f]+)";/)[1];
  assert.equal(contentHash(listed), stamp, "Dateien haben sich geändert: node scripts/stamp-sw.mjs erhöht VERSION in sw.js, sonst bekommt das iPhone die neue Fassung nicht");
});
test("Manifest und index.html verweisen auf gelistete Dateien", () => {
  const manifest = JSON.parse(readFileSync(new URL("manifest.webmanifest", root), "utf8"));
  assert.equal(manifest.name, "Tesoro de Palabras");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.lang, "de");
  assert.ok(manifest.icons.some((i) => i.purpose === "maskable"));
  for (const i of manifest.icons) assert.ok(listed.includes(i.src), i.src);
  const html = readFileSync(new URL("index.html", root), "utf8");
  for (const [, href] of html.matchAll(/(?:href|src)="([^"#]+)"/g)) assert.ok(listed.includes(href), href);
  assert.match(html, /rel="manifest"/);
  assert.match(html, /rel="apple-touch-icon"/);
  assert.match(html, /apple-mobile-web-app-capable/);
});

// Testumgebung für sw.js: self, caches, fetch, Request, Response
function run({ cacheNames = [], cached = {}, network = () => Promise.resolve({ fromNetwork: true }), origin = "https://beispiel.de" } = {}) {
  const handlers = {};
  const log = { opened: [], added: [], deleted: [], skipWaiting: 0, claimed: 0, matches: [] };
  const caches = {
    open: (name) => { log.opened.push(name); return Promise.resolve({ addAll: (reqs) => { log.added.push(...reqs); return Promise.resolve(); } }); },
    keys: () => Promise.resolve(cacheNames),
    delete: (name) => { log.deleted.push(name); return Promise.resolve(true); },
    match: (req, opts) => { log.matches.push([req.url || req, opts]); const key = req.url ? new URL(req.url).pathname + "" : "/" + req; return Promise.resolve(cached[key] || cached[req.url]); }
  };
  class Request { constructor(url, init) { this.url = url; this.init = init; } }
  const Response = { error: () => ({ error: true }) };
  const self = { location: { origin }, addEventListener: (n, fn) => { handlers[n] = fn; }, skipWaiting: () => { log.skipWaiting++; return Promise.resolve(); }, clients: { claim: () => { log.claimed++; return Promise.resolve(); } } };
  vm.runInNewContext(sw, { self, caches, fetch: network, Request, Response, URL });
  const fire = async (name, extra = {}) => {
    let p;
    const e = { waitUntil: (x) => { p = x; }, respondWith: (x) => { e.responded = Promise.resolve(x); }, ...extra };
    handlers[name](e);
    if (p) await p;
    return e;
  };
  return { fire, log };
}

test("Installieren: legt den Cache mit dem eigenen Präfix an und speichert alle Dateien neu vom Server", async () => {
  const { fire, log } = run();
  await fire("install");
  assert.deepEqual(log.opened, ["tesoro-de-palabras-" + VERSION]);
  assert.equal(log.added.length, listed.length);
  assert.deepEqual(log.added.map((r) => r.url), listed);
  assert.ok(log.added.every((r) => r.init.cache === "reload"));
  assert.equal(log.skipWaiting, 1);
});
test("Aufräumen löscht nur alte Caches mit dem eigenen Präfix, fremde bleiben unberührt (zwei Apps auf einer Domain)", async () => {
  const names = ["tesoro-de-palabras-0", "tesoro-de-palabras-1", "tesoro-de-palabras-" + VERSION, "word-bank-trainer-5", "word-bank-trainer-1", "irgendeine-andere-app", "tesoro-de-palabras", "workbox-precache"];
  const { fire, log } = run({ cacheNames: names });
  await fire("activate");
  assert.deepEqual(log.deleted.sort(), ["tesoro-de-palabras-0", "tesoro-de-palabras-1"]);
  assert.ok(!log.deleted.some((n) => n.startsWith("word-bank-trainer")), "der Englisch-Trainer behält seine Caches");
  assert.ok(!log.deleted.includes("tesoro-de-palabras-" + VERSION), "der aktuelle Cache bleibt");
  assert.equal(log.claimed, 1);
});
test("kein Verweis auf den Englisch-Trainer in sw.js", () => {
  assert.ok(!/word-bank/.test(sw));
  assert.match(sw, /const PREFIX = "tesoro-de-palabras-";/);
});
test("Abrufen: Dateien kommen aus dem Cache, auch mit Suchteil (?neu), sonst aus dem Netz", async () => {
  const hit = { fromCache: true };
  const { fire, log } = run({ cached: { "/js/main.js": hit } });
  const e = await fire("fetch", { request: { method: "GET", url: "https://beispiel.de/js/main.js?neu", mode: "no-cors" } });
  assert.equal(await e.responded, hit);
  assert.equal(JSON.stringify(log.matches[0][1]), '{"ignoreSearch":true}');
  const miss = await fire("fetch", { request: { method: "GET", url: "https://beispiel.de/anderes.json", mode: "cors" } });
  assert.deepEqual(await miss.responded, { fromNetwork: true });
});
test("Offline: Seitenaufruf fällt auf index.html zurück, andere Dateien liefern einen Fehler", async () => {
  const idx = { index: true };
  const { fire } = run({ cached: { "/index.html": idx }, network: () => Promise.reject(new Error("offline")) });
  const nav = await fire("fetch", { request: { method: "GET", url: "https://beispiel.de/", mode: "navigate" } });
  assert.equal(await nav.responded, idx, "die zwischengespeicherte Startseite");
  const other = await fire("fetch", { request: { method: "GET", url: "https://beispiel.de/nichts.png", mode: "no-cors" } });
  assert.deepEqual(await other.responded, { error: true });
});
test("Anfragen, die nicht zur App gehören, bleiben unberührt: POST und andere Herkunft", async () => {
  const { fire } = run();
  const post = await fire("fetch", { request: { method: "POST", url: "https://beispiel.de/x", mode: "cors" } });
  assert.equal(post.responded, undefined);
  const fremd = await fire("fetch", { request: { method: "GET", url: "https://fremd.example/x.js", mode: "cors" } });
  assert.equal(fremd.responded, undefined);
});
