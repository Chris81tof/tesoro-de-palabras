import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { transferPrompt, claudePrompt, CLAUDE_KINDS, exprLine } from "../js/core/prompts.js";
import { pickExprs, POOLS, weightedSample } from "../js/core/pick.js";
import { properNames, AREAS } from "../js/core/cards.js";
import { createState, progressOf } from "../js/core/state.js";
import { record } from "../js/core/srs.js";
import { spokenTerm, spokenSentence } from "../js/core/speech.js";

const load = (f) => JSON.parse(readFileSync(new URL("../data/" + f, import.meta.url), "utf8"));
const tasks = load("tasks.json");
const ex = load("beispiel-karten.json");
const D = 20000;
const prefs = (o = {}) => ({ variant: "es", country: "", ...o });

test("Aufgaben: beide Bereiche, je 3 Sprech- und 3 Schreibaufgaben, vollständig", () => {
  assert.deepEqual(Object.keys(tasks).sort(), Object.keys(AREAS).sort());
  for (const area of Object.keys(AREAS)) {
    assert.equal(tasks[area].speak.length, 3);
    assert.equal(tasks[area].write.length, 3);
    for (const t of tasks[area].speak) assert.ok(t.topic && t.q.length > 30, t.q);
    for (const t of tasks[area].write) assert.ok(t.type && t.task.length > 30, t.task);
  }
});
test("Aufgaben für Schulgespräche enthalten keine Eigennamen", () => {
  for (const t of [...tasks.schule.speak.map((x) => x.q), ...tasks.schule.write.map((x) => x.task)]) assert.deepEqual(properNames(t), [], t);
});
test("Prompts: Variante, Bereich, Ausdrücke; keine Namen in Schulgesprächen", () => {
  const cards = [ex[0], ex[5]];
  for (const sub of ["story", "speak", "write"]) {
    const d = { text: "mi texto", task: "Aufgabe", type: "Carta", notes: "n" };
    const es = transferPrompt(sub, d, cards, "allgemein", prefs());
    assert.ok(es.includes("Variante: Spanien") && es.includes("- tomar una decisión (eine Entscheidung treffen)"), sub);
    assert.ok(!es.includes("keine echten Namen"), sub);
    const la = transferPrompt(sub, d, cards, "schule", prefs({ variant: "latam" }));
    assert.ok(la.includes("Variante: Lateinamerika") && la.includes("keine echten Namen"), sub);
  }
  assert.ok(transferPrompt("write", { type: "Carta", task: "T", text: "x" }, [], "allgemein", prefs()).includes("Carta"));
});
test("Aufträge für Claude: jede Art erzeugt einen Prompt mit den Ausdrücken", () => {
  assert.equal(CLAUDE_KINDS.length, 7);
  for (const [kind] of CLAUDE_KINDS) {
    const p = claudePrompt(kind, ex.slice(0, 3), "schule", prefs());
    assert.ok(p.includes(exprLine(ex[0])), kind);
    assert.ok(p.includes("Variante: Spanien"), kind);
    assert.ok(p.includes("keine echten Namen"), kind);
  }
  assert.match(claudePrompt("subjuntivo", ex, "allgemein", prefs()), /Infinitiv in Klammern/);
});
test("Ausdrücke für Transfer: nach Lernstand, ohne Doppelte, Pools", () => {
  const s = createState();
  let i = 0;
  const rand = () => ((i = (i * 9301 + 49297) % 233280) / 233280);
  const five = pickExprs(ex, s, D, 5, "rec", rand);
  assert.equal(five.length, 5);
  assert.equal(new Set(five.map((c) => c.id)).size, 5);
  assert.deepEqual(pickExprs(ex, s, D, 5, "dev", rand), [], "noch nichts In Arbeit");
  for (let k = 0; k < 3; k++) record(progressOf(s, "x02"), false, "gap", D);
  assert.deepEqual(pickExprs(ex, s, D, 5, "dev", rand).map((c) => c.id), ["x02"]);
  assert.deepEqual(pickExprs(ex, s, D, 5, "seen", rand).map((c) => c.id), ["x02"]);
  assert.equal(POOLS.length, 5);
  assert.equal(weightedSample([1, 2, 3], () => 1, 5).length, 3);
});
test("Vorlesetexte: Klammern, Schrägstrich, Infinitiv in Klammern bei Subjuntivo", () => {
  assert.equal(spokenTerm({ term: "tomar (una) decisión" }), "tomar decisión");
  assert.equal(spokenTerm({ term: "a / hacia" }), "a o hacia");
  assert.equal(spokenSentence(ex[1]), "Es posible que mañana llueva en el norte.");
  assert.equal(spokenSentence(ex[3], "tomar"), "Para ir al trabajo suelo tomar el autobús de las ocho.");
  assert.equal(spokenSentence({ term: "x" }), "");
});
