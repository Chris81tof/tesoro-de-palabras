// Offline-Betrieb: alle ausgelieferten Dateien beim Installieren zwischenspeichern, danach aus dem Speicher liefern.
// Beide Apps (Englisch-Trainer und diese) können auf derselben Domain liegen und teilen sich den Cache-Speicher:
// Darum haben die Caches dieser App ein eigenes Präfix, und aufgeräumt werden nur Caches mit diesem Präfix.
// Nach jeder Änderung an ausgelieferten Dateien: node scripts/stamp-sw.mjs (erhöht VERSION und trägt den Fingerabdruck ein).
// tests/sw.test.mjs prüft, dass FILES genau zu den Dateien im Projekt passt und der Fingerabdruck stimmt.
const VERSION = "4";
const CONTENT = "05e89dec75ff";
const PREFIX = "tesoro-de-palabras-";
const CACHE = PREFIX + VERSION;

const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/base.css",
  "css/components.css",
  "css/tiles.css",
  "css/tokens.css",
  "js/core/accent.js",
  "js/core/art.js",
  "js/core/backup.js",
  "js/core/cards.js",
  "js/core/choice.js",
  "js/core/contrast.js",
  "js/core/dates.js",
  "js/core/dom.js",
  "js/core/edit.js",
  "js/core/grade.js",
  "js/core/hints.js",
  "js/core/icons.js",
  "js/core/import.js",
  "js/core/library.js",
  "js/core/match.js",
  "js/core/meaning.js",
  "js/core/modes.js",
  "js/core/pick.js",
  "js/core/plan.js",
  "js/core/prompts.js",
  "js/core/speech.js",
  "js/core/srs.js",
  "js/core/state.js",
  "js/core/stats.js",
  "js/core/subjuntivo.js",
  "js/core/texts.js",
  "js/core/theme.js",
  "js/core/variants.js",
  "js/exercises/cards.js",
  "js/exercises/choice.js",
  "js/exercises/common.js",
  "js/exercises/error.js",
  "js/exercises/explain.js",
  "js/exercises/gap.js",
  "js/exercises/meaning.js",
  "js/exercises/produce.js",
  "js/exercises/rewrite.js",
  "js/exercises/translate.js",
  "js/main.js",
  "js/views/cloze.js",
  "js/views/editor.js",
  "js/views/library.js",
  "js/views/passive.js",
  "js/views/practice.js",
  "js/views/settings.js",
  "js/views/stats.js",
  "js/views/today.js",
  "js/views/transfer.js",
  "data/beispiel-karten.json",
  "data/cards.json",
  "data/levels.json",
  "data/tasks.json",
  "data/texts.json",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png"
];

self.addEventListener("install", (e) => {
  // cache: "reload" umgeht den HTTP-Cache, damit wirklich die neue Fassung gespeichert wird.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) =>
      hit || fetch(req).catch(() => (req.mode === "navigate" ? caches.match("index.html") : Response.error()))
    )
  );
});
