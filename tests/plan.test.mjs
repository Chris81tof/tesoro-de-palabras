import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPlan, recMode, planKey } from "../js/core/plan.js";
import { createState, progressOf, inArea, allCards } from "../js/core/state.js";
import { record } from "../js/core/srs.js";

const ex = JSON.parse(readFileSync(new URL("../data/beispiel-karten.json", import.meta.url), "utf8"));
const D = 20000;
const cardsOf = (s, area) => inArea(allCards([], ex, s), area);

test("neue Karten starten mit Bedeutung", () => {
  const s = createState();
  const plan = buildPlan(cardsOf(s, "allgemein"), s, D, "allgemein");
  assert.equal(plan.blocks[0].mode, "meaning");
  assert.equal(plan.pool, 5);
});
test("neue Karten pro Tag und Zeitbudget gelten pro Bereich", () => {
  const s = createState();
  s.prefs.newPerDay.schule = 2;
  s.prefs.newPerDay.allgemein = 4;
  assert.equal(buildPlan(cardsOf(s, "schule"), s, D, "schule").blocks.flatMap((b) => b.ids).length, 2);
  assert.equal(buildPlan(cardsOf(s, "allgemein"), s, D, "allgemein").blocks.flatMap((b) => b.ids).length, 4);
  s.prefs.budget.schule = 0;
  assert.equal(buildPlan(cardsOf(s, "schule"), s, D, "schule").blocks.length, 0);
});
test("heute begonnene Karten zählen gegen das Limit für neue Karten", () => {
  const s = createState();
  s.prefs.newPerDay.allgemein = 2;
  record(progressOf(s, "x01"), true, "meaning", D);
  const ids = buildPlan(cardsOf(s, "allgemein"), s, D, "allgemein").blocks.flatMap((b) => b.ids);
  assert.ok(!ids.includes("x01"));
  assert.equal(ids.length, 1, "eine neue Karte ist noch erlaubt, x01 ist nicht fällig");
});
test("Fortschritt der Beispielkarten wird aus ihrem eigenen Bereich gelesen", () => {
  const s = createState();
  for (let i = 0; i < 3; i++) record(progressOf(s, "x01"), false, "gap", D);
  const plan = buildPlan(cardsOf(s, "allgemein"), s, D, "allgemein");
  const blk = plan.blocks.find((b) => b.ids.includes("x01"));
  assert.ok(blk, "fällige problematische Karte steht im Plan");
  assert.equal(blk.mode, "meaning");
  assert.equal(s.progress.x01, undefined);
});
test("Übungsart nach Stufe", () => {
  const cards = ex;
  const c = ex[0];
  assert.equal(recMode(c, { seen: 1, box: 0, wrong: 0, right: 1, ms: {} }, cards), "choice");
  assert.equal(recMode(c, { seen: 2, box: 1, wrong: 0, right: 2, ms: {} }, cards), "gap");
  assert.equal(recMode(c, { seen: 4, box: 2, wrong: 0, right: 4, ms: {} }, cards), "translate");
});
test("Schlüssel ändert sich mit Bereich und Einstellung", () => {
  const s = createState();
  const a = planKey(s.prefs, "allgemein");
  s.prefs.budget.allgemein = 60;
  assert.notEqual(a, planKey(s.prefs, "allgemein"));
  assert.notEqual(planKey(s.prefs, "schule"), planKey(s.prefs, "allgemein"));
});
