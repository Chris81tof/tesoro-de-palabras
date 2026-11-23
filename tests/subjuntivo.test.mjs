import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isSubjuntivo, gapInfinitive, bothModes, triggerHint, gapOptions, MODE_WORDS, revealMode } from "../js/core/subjuntivo.js";
import { judge } from "../js/core/accent.js";
import { answersOf } from "../js/core/cards.js";

const ex = JSON.parse(readFileSync(new URL("../data/beispiel-karten.json", import.meta.url), "utf8"));
const subj = ex.filter(isSubjuntivo);

test("Infinitiv in Klammern hinter der Lücke", () => {
  assert.equal(gapInfinitive("Es posible que mañana ____ (llover) en el norte."), "llover");
  assert.equal(gapInfinitive("Sin Klammer ____ hier."), "");
});
test("Hinweis nennt nur den Auslöser, nie den Modus", () => {
  assert.ok(subj.length >= 3);
  for (const c of subj) {
    const h = triggerHint(c);
    assert.ok(h.includes(c.trigger));
    assert.ok(!MODE_WORDS.test(h), h);
  }
  assert.equal(triggerHint({ term: "x" }), "");
});
test("Auslöser mit beiden Modi: beide Formen sind richtig", () => {
  const tal = ex.find((c) => c.id === "x03");
  assert.ok(bothModes(tal));
  for (const f of ["venga", "viene", "vendrá"]) assert.ok(judge(answersOf(tal), f).ok, f);
  assert.ok(!bothModes(ex.find((c) => c.id === "x02")));
});
test("Modus der Beispielkarten und Anzeige beim Aufdecken", () => {
  const by = (id) => ex.find((c) => c.id === id);
  assert.deepEqual(["x02", "x03", "x08"].map((id) => by(id).mode), ["subj", "both", "subj"]);
  assert.equal(revealMode(by("x02")), "Subjuntivo");
  assert.equal(revealMode(by("x03")), "Subjuntivo oder Indikativ");
  assert.equal(revealMode(by("x01")), "", "nur bei Subjuntivo-Karten");
  assert.ok(subj.every((c) => MODE_WORDS.test(revealMode(c))), "beim Aufdecken wird der Modus genannt");
});
test("Ablenker: nur die falschen Formen der Karte, nie eine richtige", () => {
  for (const c of subj) {
    const o = gapOptions(c, () => 0.3);
    assert.equal(o.length, 4);
    assert.equal(new Set(o).size, 4);
    assert.ok(o.includes(answersOf(c)[0]));
    const right = new Set(answersOf(c));
    assert.deepEqual(o.filter((x) => right.has(x)), [answersOf(c)[0]]);
    assert.ok(o.filter((x) => !right.has(x)).every((x) => c.wrong.includes(x)));
  }
  assert.equal(gapOptions({ answer: "a" }), null);
});
