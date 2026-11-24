import { test } from "node:test";
import assert from "node:assert/strict";
import {
  APP, BEFORE_KEY, exportData, backupName, parseBackup, markBackup, daysSinceBackup, needsBackup, summarizeState, describeState,
  snapshotBefore, readSnapshot, clearSnapshot
} from "../js/core/backup.js";
import { createState, normalize, progressOf, FORMAT, allCards, save, load, STORAGE_KEY } from "../js/core/state.js";
import { record } from "../js/core/srs.js";

const D = 20000;
const mem = () => { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; }, m }; };

const own = (id, area, extra = {}) => ({
  id, area, cat: "Kollokation", term: "llevar a cabo " + id, de: "durchführen", sentence: "Vamos a ____ a cabo el plan.", answer: "llevar",
  wrong: ["traer", "hacer", "poner"], plain: "Vamos a realizar el plan.", reg: "f", ...(area === "schule" ? { topic: "Fehlzeiten" } : {}), ...extra
});

// Ein Gerätestand mit Inhalt in allen Bereichen
function full() {
  const s = createState();
  record(progressOf(s, "a01"), true, "gap", D, false);
  record(progressOf(s, "a01"), true, "gap", D + 1, true);
  record(progressOf(s, "a02"), false, "translate", D);
  record(progressOf(s, "x01"), true, "meaning", D);
  s.custom.push(own("u01", "allgemein", { variants: [{ region: "mx", term: "llevar a término", answer: "llevar", example: "Lo llevó a término." }], xref: { EN: "carry out" }, unsure: true, level: "C1" }), own("u02", "schule"));
  s.deleted = ["a09", "u03"];
  s.fixes = { a01: { de: "neu", wrong: ["x", "y", "z"], variants: [{ region: "ar", term: "t", example: "e" }], xref: { FR: "f" }, unsure: true, level: "B2" } };
  s.texts = [{ id: "i1", area: "allgemein", kind: "Blog", title: "T", text: "{1} mucho", gaps: [["u01", "llevar"]], region: "es" }];
  s.textLog = { i1: D, xt1: D - 3 };
  s.drafts = { "allgemein-story": { ids: ["a01"], text: "hola", sel: { a01: "ok" }, settled: false } };
  s.examples = { removed: false, progress: { x01: s.examples.progress.x01 } };
  s.prefs = { ...s.prefs, area: "schule", variant: "latam", country: "mx", strictAccents: true, meaningDir: "es-de", theme: "dark", speak: false, voice: "Paulina", rate: 1.1, budget: { allgemein: 25, schule: 15 }, newPerDay: { allgemein: 7, schule: 3 } };
  markBackup(s, 1700000000000);
  return s;
}

test("Name und Inhalt der Sicherung", () => {
  assert.equal(backupName(new Date(2026, 10, 24)), "tesoro-de-palabras-lernstand-2026-11-24.json");
  const o = exportData(full(), new Date("2026-11-24T10:00:00Z"));
  assert.equal(o.app, APP);
  assert.equal(o.format, FORMAT);
  assert.equal(o.exported, "2026-11-24T10:00:00.000Z");
  assert.equal(o.cards, 3, "Karten mit Fortschritt, Beispielkarten eingeschlossen");
  assert.equal(o.backup.last, Date.parse("2026-11-24T10:00:00Z"), "der Zeitpunkt der Sicherung steht in der Datei");
  assert.equal(daysSinceBackup(parseBackup(JSON.stringify(o)).state, Date.parse("2026-11-26T10:00:00Z")), 2);
  for (const k of ["progress", "custom", "deleted", "fixes", "texts", "textLog", "drafts", "examples", "backup", "prefs"]) assert.ok(k in o, k);
});
test("Hin und zurück: alles bleibt erhalten (Fortschritt, eigene Karten, Korrekturen, Texte, Beispielkarten, Einstellungen)", () => {
  const s = full();
  const text = JSON.stringify(exportData(s));
  const { state, warnings } = parseBackup(text);
  assert.deepEqual(warnings, []);
  assert.deepEqual({ ...state, backup: 0 }, { ...normalize(JSON.parse(JSON.stringify(s))), backup: 0 }, "alles außer dem Sicherungszeitpunkt");
  assert.deepEqual(state.progress, s.progress);
  assert.deepEqual(state.examples, s.examples);
  assert.deepEqual(state.custom, s.custom);
  assert.deepEqual(state.fixes, s.fixes);
  assert.deepEqual(state.texts, s.texts);
  assert.deepEqual(state.prefs, s.prefs);
  assert.equal(state.progress.a01.hinted, 1);
  assert.deepEqual(state.progress.a01.ms.gap, [2, 0]);
  assert.deepEqual(state.drafts, s.drafts);
  assert.deepEqual(state.deleted, ["a09", "u03"]);
});
test("Beispielkarten: entfernt-Stand und Fortschritt werden gesichert und zurückgeholt", () => {
  const s = full();
  assert.equal(parseBackup(JSON.stringify(exportData(s))).state.examples.progress.x01.seen, 1);
  s.examples = { removed: true, progress: {} };
  const back = parseBackup(JSON.stringify(exportData(s))).state;
  assert.deepEqual(back.examples, { removed: true, progress: {} });
  assert.equal(allCards([], [{ id: "x01", area: "allgemein" }], back).filter((c) => c.id === "x01").length, 0, "die Beispielkarten bleiben entfernt");
});
test("eine Sicherung enthält keine Karten aus data/, nur Eigenes", () => {
  const o = exportData(full());
  assert.ok(!("base" in o) && !("cards_data" in o));
  assert.ok(o.custom.every((c) => /^u\d+$/.test(c.id)));
});
test("Wiederherstellen ersetzt den ganzen Stand: Neues, das nicht in der Sicherung steht, ist weg", () => {
  const old = JSON.stringify(exportData(full()));
  const now = createState();
  now.custom.push(own("u09", "allgemein"));
  progressOf(now, "zz").seen = 4;
  const { state } = parseBackup(old);
  assert.ok(!state.custom.some((c) => c.id === "u09"));
  assert.equal(state.progress.zz, undefined);
});

test("Fehlermeldungen für kaputte und fremde Dateien", () => {
  const err = (raw) => { try { parseBackup(raw); return ""; } catch (e) { return e.message; } };
  assert.match(err("{kaputt"), /kein lesbares JSON/);
  assert.match(err("[1,2]"), /keine gültige Sicherung/);
  assert.match(err("5"), /keine gültige Sicherung/);
  assert.match(err("null"), /keine gültige Sicherung/);
  assert.match(err(JSON.stringify({ app: "word-bank-trainer", format: 2, progress: {} })), /Englisch-Trainer/);
  assert.match(err(JSON.stringify({ progress: {} })), /keine Sicherung von Tesoro/);
  assert.match(err(JSON.stringify({ app: "anderes", format: 1 })), /keine Sicherung von Tesoro/);
  assert.match(err(JSON.stringify({ app: APP, format: FORMAT + 1 })), /neueren Version/);
  assert.match(err(JSON.stringify({ app: APP, format: "1" })), /Format.*nicht unterstützt/);
  assert.match(err(JSON.stringify({ app: APP })), /Format.*nicht unterstützt/);
  assert.equal(err(JSON.stringify({ app: APP, format: FORMAT })), "", "leere Sicherung ist erlaubt");
});
test("beschädigte Teile werden bereinigt statt abzustürzen", () => {
  const { state } = parseBackup(JSON.stringify({
    app: APP, format: FORMAT,
    progress: { a01: { box: "x", seen: 3, right: 2, wrong: null, ms: { gap: [1, "a"], bad: 5 } }, a02: "text", "__proto__": { seen: 9 } },
    custom: [own("u01", "allgemein"), { id: "u02" }, "x", { id: "u03", term: "t", area: "nada" }],
    fixes: { a01: { de: 5, level: "Z9" }, a02: "x", constructor: { de: "x" } },
    texts: [{ id: "i1" }, { id: "i2", text: "{1}", gaps: [] }],
    textLog: { i2: "gestern", i3: 5, prototype: 1 },
    deleted: ["u09", 7, null], drafts: "text", examples: { removed: "ja", progress: [] },
    prefs: { area: "xyz", variant: "x", budget: { allgemein: "viel" }, rate: "schnell" }
  }));
  assert.equal(state.progress.a01.box, 0);
  assert.equal(state.progress.a01.seen, 3);
  assert.deepEqual(state.progress.a01.ms, { gap: [1, 0] });
  assert.equal(Object.keys(state.progress).filter((k) => k === "__proto__").length, 0);
  assert.equal(Object.getPrototypeOf(state.progress), Object.prototype, "keine Verschmutzung");
  assert.equal(state.progress.seen, undefined);
  assert.deepEqual(state.custom.map((c) => c.id), ["u01"]);
  assert.deepEqual(state.fixes, { a01: { level: "" } });
  assert.deepEqual(state.texts.map((t) => t.id), ["i2"]);
  assert.deepEqual(state.textLog, { i3: 5 });
  assert.deepEqual(state.deleted, ["u09"]);
  assert.deepEqual(state.examples, { removed: false, progress: {} });
  assert.equal(state.prefs.area, createState().prefs.area);
  assert.equal(state.prefs.rate, createState().prefs.rate);
});
test("ungültige eigene Karten werden nicht übernommen, mit Meldung", () => {
  const bad = own("u02", "allgemein", { sentence: "Ohne Lücke" });
  const { state, warnings } = parseBackup(JSON.stringify({ app: APP, format: FORMAT, custom: [own("u01", "allgemein"), bad] }));
  assert.deepEqual(state.custom.map((c) => c.id), ["u01"]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /1 eigene Karte war ungültig und wurde nicht übernommen: llevar a cabo u02/);
});

test("Zusammenfassung vor dem Wiederherstellen", () => {
  const s = summarizeState(full());
  assert.deepEqual(s, { seen: 2, custom: 2, customAllgemein: 1, customSchule: 1, fixes: 1, texts: 1, deleted: 2, examplesRemoved: false, examplesSeen: 1 });
  assert.equal(describeState(full()), "2 Karten mit Lernstand, 2 eigene Karten (1 Allgemein, 1 Schulgespräche), 1 Korrektur, 1 eigener Text, 2 entfernte Karten");
  assert.equal(describeState(createState()), "0 Karten mit Lernstand, 0 eigene Karten (0 Allgemein, 0 Schulgespräche), 0 Korrekturen, 0 eigene Texte");
  const one = createState();
  progressOf(one, "a01").seen = 1;
  one.custom.push(own("u01", "allgemein"));
  assert.equal(describeState(one), "1 Karte mit Lernstand, 1 eigene Karte (1 Allgemein, 0 Schulgespräche), 0 Korrekturen, 0 eigene Texte");
});
test("Erinnerung: nur wenn es etwas zu sichern gibt und die letzte Sicherung alt ist", () => {
  const now = 1700000000000 + 10 * 86400000;
  const s = createState();
  assert.equal(needsBackup(s, now), false, "nichts zu sichern");
  assert.equal(daysSinceBackup(s, now), null);
  record(progressOf(s, "a01"), true, "gap", D);
  assert.equal(needsBackup(s, now), true, "noch nie gesichert");
  markBackup(s, now - 3 * 86400000);
  assert.equal(daysSinceBackup(s, now), 3);
  assert.equal(needsBackup(s, now), false);
  markBackup(s, now - 8 * 86400000);
  assert.equal(needsBackup(s, now), true);
  const c = createState();
  c.custom.push(own("u01", "allgemein"));
  assert.equal(needsBackup(c, now), true, "auch eigene Karten sind etwas wert");
  const e = createState();
  progressOf(e, "x01").seen = 5;
  assert.equal(needsBackup(e, now), false, "Beispielkarten sind nichts wert");
});
test("Rückgängig: Stand vor dem Wiederherstellen wird gesichert und lässt sich zurückholen", () => {
  const st = mem();
  const before = full();
  assert.equal(readSnapshot(st), null);
  assert.ok(snapshotBefore(st, before, new Date("2026-11-24T12:00:00Z")));
  assert.ok(st.m[BEFORE_KEY]);
  const snap = readSnapshot(st);
  assert.equal(snap.at, "2026-11-24T12:00:00.000Z");
  assert.deepEqual(snap.state, normalize(JSON.parse(JSON.stringify(before))));
  clearSnapshot(st);
  assert.equal(readSnapshot(st), null);
  assert.notEqual(BEFORE_KEY, STORAGE_KEY, "eigener Schlüssel, der Stand wird nicht überschrieben");
  st.setItem(BEFORE_KEY, "{kaputt");
  assert.equal(readSnapshot(st), null, "beschädigt = keine Sicherung");
  const full2 = { getItem: () => null, setItem() { throw new Error("voll"); } };
  assert.equal(snapshotBefore(full2, before), false, "voller Speicher: kein Absturz, Rückgabe false");
});
test("gesicherter Stand lässt sich im Gerätespeicher speichern und laden", () => {
  const st = mem();
  const { state } = parseBackup(JSON.stringify(exportData(full())));
  assert.ok(save(st, state));
  assert.deepEqual(load(st), state);
});
