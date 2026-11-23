import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createState, normalize, load, save, STORAGE_KEY, allCards, progressOf, peekProgress, statCards, inArea, removeExamples,
  isExample, applyFix, nextCustomId, GESAMT
} from "../js/core/state.js";

const examples = JSON.parse(readFileSync(new URL("../data/beispiel-karten.json", import.meta.url), "utf8"));
const base = [{ id: "a01", area: "allgemein", cat: "Kollokation", term: "tomar nota", de: "notieren", sentence: "____ nota.", answer: "tomar" }];
const mem = () => { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, m }; };

test("Schlüssel und Standardwerte pro Bereich", () => {
  assert.equal(STORAGE_KEY, "tesoro-de-palabras-v1");
  const s = createState();
  assert.deepEqual([s.prefs.area, s.prefs.variant, s.prefs.strictAccents], ["allgemein", "es", false]);
  assert.ok(s.prefs.budget.allgemein > 0 && s.prefs.budget.schule > 0);
  assert.notEqual(createState().prefs.budget, s.prefs.budget, "keine geteilten Objekte");
});
test("Speichern und Laden; beschädigte Daten ergeben einen leeren Stand", () => {
  const st = mem();
  const s = createState();
  s.prefs.variant = "latam"; s.prefs.country = "mx"; s.prefs.budget.schule = 15;
  assert.ok(save(st, s));
  const r = load(st);
  assert.deepEqual([r.prefs.variant, r.prefs.country, r.prefs.budget.schule], ["latam", "mx", 15]);
  st.setItem(STORAGE_KEY, "{kaputt");
  assert.deepEqual(load(st), createState());
});
test("normalize: Ungültiges wird ersetzt, Land nur bei Lateinamerika", () => {
  const s = normalize({ prefs: { area: "xyz", variant: "es", country: "mx", strictAccents: "ja", budget: { schule: "x" } }, progress: { a01: { box: "4" } } });
  assert.equal(s.prefs.area, "allgemein");
  assert.equal(s.prefs.country, "");
  assert.equal(s.prefs.strictAccents, false);
  assert.equal(s.prefs.budget.schule, createState().prefs.budget.schule);
  assert.equal(s.progress.a01.box, 0);
  assert.equal(normalize({ prefs: { area: "gesamt" } }).prefs.area, GESAMT);
});
test("Beispielkarten haben einen eigenen Fortschritt und zählen nicht in die Statistik", () => {
  const s = createState();
  const cards = allCards(base, examples, s);
  assert.equal(cards.length, 11);
  progressOf(s, "x01").seen = 3;
  progressOf(s, "a01").seen = 1;
  assert.equal(s.progress.x01, undefined);
  assert.equal(s.examples.progress.x01.seen, 3);
  assert.equal(peekProgress(s, "x01").seen, 3);
  assert.equal(peekProgress(s, "a01").seen, 1);
  assert.deepEqual(statCards(cards).map((c) => c.id), ["a01"]);
  assert.deepEqual(statCards(cards, "schule"), []);
  assert.ok(examples.every(isExample));
});
test("Knopf „Beispielkarten entfernen“: Karten und Fortschritt weg, bleibt nach dem Neuladen so", () => {
  const st = mem();
  const s = createState();
  progressOf(s, "x02").seen = 2;
  removeExamples(s);
  save(st, s);
  const r = load(st);
  assert.equal(allCards(base, examples, r).length, 1);
  assert.deepEqual(r.examples, { removed: true, progress: {} });
});
test("Bereiche: einzeln und gesamt", () => {
  const cards = allCards(base, examples, createState());
  assert.equal(inArea(cards, "schule").length, 5);
  assert.equal(inArea(cards, "allgemein").length, 6);
  assert.equal(inArea(cards, GESAMT).length, 11);
});
test("Korrekturen gelten für Startkarten, ID und Fortschritt bleiben; leere Felder entfernen sie", () => {
  const s = createState();
  s.fixes.a01 = { de: "mitschreiben", note: "x" };
  assert.equal(allCards(base, [], s)[0].de, "mitschreiben");
  assert.equal(applyFix({ ...base[0], note: "alt" }, { note: "" }).note, undefined);
  assert.equal(normalize({ fixes: { a01: { de: "x", level: "Z9" } } }).fixes.a01.level, "");
});
test("eigene Karten: IDs u01, u02 … werden nie wiederverwendet", () => {
  const s = createState();
  s.custom.push({ id: "u01", area: "schule", term: "a" });
  s.deleted.push("u02");
  assert.equal(nextCustomId(base, s), "u03");
  assert.equal(normalize({ custom: [{ id: "u01", term: "a", area: "nada" }] }).custom.length, 0, "ohne gültigen Bereich verworfen");
});
