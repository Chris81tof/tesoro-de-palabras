import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { summarize, byArea } from "../js/core/stats.js";
import { newProgress } from "../js/core/srs.js";
import { createState, allCards, statCards, peekProgress, progressOf } from "../js/core/state.js";
import { record } from "../js/core/srs.js";

const D = 20000;
const cards = [
  { id: "a1", cat: "Idiom", area: "allgemein" }, { id: "a2", cat: "Idiom", area: "allgemein" },
  { id: "s3", cat: "Kollokation", area: "schule" }, { id: "s4", cat: "Kollokation", area: "schule" }
];
const progress = {
  a1: { ...newProgress(), box: 5, seen: 6, right: 6, due: D + 3, last: D, ms: { gap: [4, 0], cloze: [2, 0] } },
  a2: { ...newProgress(), box: 0, seen: 4, right: 1, wrong: 3, due: D, last: D - 1, ms: { gap: [1, 3] } },
  s3: { ...newProgress(), box: 2, seen: 2, right: 2, due: D + 9, last: D - 2, ms: { meaning: [2, 0] } }
};
const get = (id) => progress[id];

test("Überblick, Stufen und Kategorien", () => {
  const s = summarize(cards, get, D);
  assert.deepEqual(s.by, { new: 1, developing: 1, problem: 1, mastered: 1 });
  assert.deepEqual(s.boxes, [1, 0, 1, 0, 0, 1, 0]);
  assert.deepEqual(s.cats.Idiom, { n: 2, mastered: 1, problem: 1 });
  assert.equal(s.total, 4);
});
test("Fälligkeiten: heute inklusive neuer Karten, dann die nächsten 6 Tage", () => {
  const s = summarize(cards, get, D);
  assert.equal(s.due, 2);
  assert.equal(s.dueNew, 1);
  assert.equal(s.today, 1);
  assert.deepEqual(s.forecast, [2, 0, 0, 1, 0, 0, 0]);
});
test("Ergebnisse je Übung, problematische Karten, Hinweise", () => {
  const s = summarize(cards, (id) => (id === "a2" ? { ...progress.a2, hinted: 2 } : progress[id]), D);
  assert.deepEqual(s.modes.gap, [5, 3]);
  assert.deepEqual(s.modes.cloze, [2, 0]);
  assert.deepEqual(s.problems.map((x) => x.c.id), ["a2"]);
  assert.deepEqual([s.hinted, s.hintedCards], [2, 1]);
});
test("pro Bereich und gesamt: Bereiche getrennt, die Summe stimmt", () => {
  const per = (a) => summarize(cards.filter((c) => c.area === a), get, D);
  const all = summarize(cards, get, D);
  assert.equal(per("allgemein").total + per("schule").total, all.total);
  assert.deepEqual(per("allgemein").by, { new: 0, developing: 0, problem: 1, mastered: 1 });
  assert.deepEqual(per("schule").by, { new: 1, developing: 1, problem: 0, mastered: 0 });
  const a = byArea(cards, get, D, ["allgemein", "schule"]);
  assert.deepEqual(a.allgemein, { n: 2, new: 0, developing: 0, problem: 1, mastered: 1, due: 1 });
  assert.deepEqual(a.schule, { n: 2, new: 1, developing: 1, problem: 0, mastered: 0, due: 1 });
});
test("Beispielkarten zählen nicht in die Statistik, auch wenn sie geübt wurden", () => {
  const ex = JSON.parse(readFileSync(new URL("../data/beispiel-karten.json", import.meta.url), "utf8"));
  const s = createState();
  for (let i = 0; i < 3; i++) record(progressOf(s, "x01"), false, "gap", D);
  const mine = { id: "u01", area: "allgemein", cat: "Sonstiges", term: "a", de: "b", sentence: "____", answer: "a" };
  s.custom.push(mine);
  record(progressOf(s, "u01"), true, "gap", D);
  const cs = allCards([], ex, s);
  assert.equal(cs.length, 11);
  const stat = statCards(cs);
  assert.deepEqual(stat.map((c) => c.id), ["u01"]);
  const sum = summarize(stat, (id) => peekProgress(s, id), D);
  assert.equal(sum.total, 1);
  assert.equal(sum.by.problem, 0, "die falschen Antworten bei x01 zählen nicht");
  assert.equal(summarize(statCards(cs, "schule"), (id) => peekProgress(s, id), D).total, 0);
  assert.equal(s.examples.progress.x01.wrong, 3, "aber sie werden gespeichert");
});
