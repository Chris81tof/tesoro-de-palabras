import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PAGE, matches, filterCards, categoriesOf, statusLabel, nextShown, restCount, toggleOne, toggleIn, regionOptions, levelOptions, levelOf,
  regionsOfCard, isUnsure, hasVulgar, isEdited
} from "../js/core/library.js";
import { createState, allCards, progressOf } from "../js/core/state.js";
import { record, newProgress } from "../js/core/srs.js";

const ex = JSON.parse(readFileSync(new URL("../data/beispiel-karten.json", import.meta.url), "utf8"));
const D = 20000;
const by = (id) => ex.find((c) => c.id === id);
const ctx = (state = createState(), levels = {}) => ({ state, day: D, levels });
const ids = (f, c = ctx()) => filterCards(ex, f, c).map((x) => x.id);

test("Suche: Wendung, Bedeutung, Satz, Varianten und Lösungen, ohne Rücksicht auf Akzente und Großschreibung", () => {
  assert.deepEqual(ids({ q: "decision" }), ["x01"]);
  assert.deepEqual(ids({ q: "DECISIÓN" }), ["x01"]);
  assert.ok(ids({ q: "camion" }).includes("x04"), "Variante");
  assert.ok(ids({ q: "boletas" }).includes("x10"), "Lösung");
  assert.ok(ids({ q: "Zeugnis" }).includes("x10"), "Deutsch");
  assert.deepEqual(ids({ q: "zzz" }), []);
  assert.equal(ids({ q: "" }).length, 10);
});
test("Bereich und Kategorie", () => {
  assert.equal(ids({ area: "schule" }).length, 5);
  assert.equal(ids({ area: "allgemein" }).length, 5);
  assert.equal(ids({ area: "gesamt" }).length, 10);
  assert.deepEqual(ids({ cat: "Falscher Freund" }), ["x07"]);
  assert.deepEqual(ids({ cat: "Subjuntivo-Auslöser", area: "allgemein" }), ["x02", "x03"]);
});
test("Region: einzelne Regionen, Varianten, unsicher, vulgär", () => {
  assert.deepEqual(regionsOfCard(by("x04")).sort(), ["ar", "cr", "es", "latam", "mx"]);
  assert.ok(ids({ region: "mx" }).includes("x04") && ids({ region: "mx" }).includes("x10"));
  assert.deepEqual(ids({ region: "cr" }), ["x04"]);
  assert.deepEqual(ids({ region: "variants" }).sort(), ["x04", "x05", "x06", "x10"]);
  assert.deepEqual(ids({ region: "unsure" }).sort(), ["x04", "x05", "x06", "x10"]);
  assert.deepEqual(ids({ region: "vulgar" }), ["x04"]);
  assert.deepEqual(ids({ region: "any" }).sort(), ["x04", "x05", "x06", "x10"], "Hauptform mit Region oder eine Variante nennt eine");
  assert.ok(isUnsure(by("x10")) && !isUnsure(by("x01")) && hasVulgar(by("x04")) && !hasVulgar(by("x05")));
});
test("Region-Auswahl: nur Regionen, die es gibt", () => {
  const o = regionOptions(ex).map(([v]) => v);
  assert.deepEqual(o.slice(0, 5), ["all", "any", "variants", "unsure", "vulgar"]);
  for (const r of ["es", "latam", "mx", "ar", "cr", "co"]) assert.ok(o.includes(r), r);
  assert.ok(!o.includes("cl"));
  assert.deepEqual(regionOptions([]).map(([v]) => v), ["all", "any", "variants", "unsure", "vulgar"]);
});
test("Niveau: Feld der Karte, levels.json, Korrektur; ohne Niveau", () => {
  const s = createState();
  assert.equal(levelOf(by("x01"), {}, s), "A2");
  assert.equal(levelOf({ id: "a01" }, { a01: "B1" }, s), "B1");
  s.fixes.x01 = { level: "C1" };
  assert.equal(levelOf(by("x01"), {}, s), "C1");
  s.fixes.x01 = { level: "" };
  assert.equal(levelOf(by("x01"), {}, s), "", "„“ heißt keine Einschätzung");
  assert.deepEqual(ids({ level: "A1" }), ["x05"]);
  assert.deepEqual(ids({ level: "nolevel" }), []);
  assert.deepEqual(ids({ level: "nolevel" }, ctx(s)), ["x01"]);
  assert.equal(levelOptions().length, 8);
});
test("Lernstand-Filter und Fortschritt der Beispielkarten aus dem eigenen Bereich", () => {
  const s = createState();
  assert.equal(ids({ stat: "new" }, ctx(s)).length, 10);
  for (let i = 0; i < 3; i++) record(progressOf(s, "x01"), false, "gap", D);
  record(progressOf(s, "x02"), true, "gap", D);
  assert.deepEqual(ids({ stat: "problem" }, ctx(s)), ["x01"]);
  assert.deepEqual(ids({ stat: "developing" }, ctx(s)), ["x02"]);
  assert.deepEqual(ids({ stat: "due" }, ctx(s)), ["x01"]);
  assert.equal(statusLabel(progressOf(s, "x02")), "Stufe 1");
  assert.equal(statusLabel(newProgress()), "Neu");
  assert.equal(statusLabel({ ...newProgress(), box: 5, seen: 6, right: 6 }), "Gemeistert");
  assert.equal(statusLabel(progressOf(s, "x01")), "Problematisch");
});
test("Bearbeitet, eigene Karten, Beispielkarten", () => {
  const s = createState();
  s.fixes.x03 = { de: "x" };
  s.custom.push({ id: "u01", area: "allgemein", cat: "Sonstiges", term: "mi carta", de: "x", sentence: "____", answer: "a" });
  const cards = allCards([], ex, s);
  assert.deepEqual(filterCards(cards, { stat: "edited" }, ctx(s)).map((c) => c.id), ["x03"]);
  assert.deepEqual(filterCards(cards, { stat: "own" }, ctx(s)).map((c) => c.id), ["u01"]);
  assert.equal(filterCards(cards, { stat: "example" }, ctx(s)).length, 10);
  assert.ok(isEdited(s, "x03") && !isEdited(s, "x01"));
});
test("mehrere Filter zusammen", () => {
  assert.deepEqual(ids({ area: "schule", region: "variants" }), ["x06", "x10"]);
  assert.deepEqual(ids({ area: "schule", region: "variants", q: "boleta" }), ["x10"]);
  assert.deepEqual(ids({ area: "allgemein", level: "B2" }), ["x03"]);
});
test("Kategorien in fester Reihenfolge, eigene am Ende", () => {
  assert.deepEqual(categoriesOf(ex), ["Kollokation", "Subjuntivo-Auslöser", "Feste Wendung", "Falscher Freund", "Sonstiges"]);
  assert.deepEqual(categoriesOf([{ cat: "Zett" }, { cat: "Idiom" }, { cat: "Alpha" }]), ["Idiom", "Alpha", "Zett"]);
});
test("Nachladen in Abschnitten zu 50", () => {
  assert.equal(PAGE, 50);
  assert.equal(nextShown(50, 120), 100);
  assert.equal(nextShown(100, 120), 120);
  assert.equal(restCount(50, 120), 50);
  assert.equal(restCount(100, 120), 20);
  assert.equal(restCount(120, 120), 0);
});
test("Nachladen und Filtern bei 600 Karten bleibt schnell", () => {
  const many = Array.from({ length: 600 }, (_, i) => ({ id: "m" + i, area: i % 2 ? "schule" : "allgemein", cat: "Sonstiges", term: "término " + i, de: "x" + i, answer: "a", sentence: "____" }));
  const t0 = performance.now();
  const r = filterCards(many, { q: "termino 5", area: "schule" }, ctx());
  assert.ok(performance.now() - t0 < 200);
  assert.ok(r.length > 0 && r.every((c) => c.area === "schule" && c.term.includes("5")));
});
test("Aufklappen: immer nur eines", () => {
  assert.equal(toggleOne("", "a"), "a");
  assert.equal(toggleOne("a", "b"), "b");
  assert.equal(toggleOne("a", "a"), "");
  const set = new Set();
  assert.ok(toggleIn(set, "a").has("a"));
  assert.ok(!toggleIn(set, "a").has("a"));
});
