import { test } from "node:test";
import assert from "node:assert/strict";
import { cardErrors, properNames, HAS_INF, answersOf } from "../js/core/cards.js";

const base = {
  id: "x99", area: "allgemein", cat: "Kollokation", term: "tomar una decisión", de: "eine Entscheidung treffen",
  sentence: "Hay que ____ una decisión.", answer: "tomar", wrong: ["hacer", "poner", "dar"]
};
const errs = (patch) => cardErrors({ ...base, ...patch });

test("gültige Karte hat keine Fehler", () => assert.deepEqual(errs({}), []));
test("genau eine Lücke", () => {
  assert.ok(errs({ sentence: "Hay que tomar una decisión." }).length);
  assert.ok(errs({ sentence: "Hay ____ que ____ una decisión." }).length);
});
test("wrong: drei verschiedene, keine richtige Lösung", () => {
  assert.ok(errs({ wrong: ["hacer", "poner"] }).length);
  assert.ok(errs({ wrong: ["hacer", "hacer", "dar"] }).length);
  assert.ok(errs({ wrong: ["hacer", "tomar", "dar"] }).length);
});
test("wrong ist nie eine gültige Variante", () => {
  const v = [{ region: "mx", term: "agarrar una decisión", answer: "tomar", example: "…" }];
  assert.ok(errs({ answer: "tomar|coger", variants: [{ region: "mx", term: "x", answer: "coger", example: "y" }], wrong: ["hacer", "coger", "dar"] }).length);
  assert.deepEqual(errs({ variants: v }), []);
});
test("Variante: Lösung muss in answer stehen, Beispiel Pflicht außer bei vulgar", () => {
  assert.ok(errs({ variants: [{ region: "mx", term: "x", answer: "otra", example: "y" }] }).length);
  assert.ok(errs({ variants: [{ region: "mx", term: "x" }] }).length);
  assert.deepEqual(errs({ variants: [{ region: "mx", term: "tomar", vulgar: true }] }), []);
  assert.ok(errs({ variants: [{ region: "xx", term: "x", example: "y" }] }).length);
});
test("topic nur bei Schulgesprächen, dort Pflicht", () => {
  assert.ok(errs({ topic: "Fehlzeiten" }).length);
  assert.ok(errs({ area: "schule" }).length);
  assert.deepEqual(errs({ area: "schule", topic: "Fehlzeiten" }), []);
  assert.ok(errs({ area: "schule", topic: "Unsinn" }).length);
});
test("Subjuntivo: trigger Pflicht, Infinitiv in Klammern hinter der Lücke", () => {
  const s = { cat: "Subjuntivo-Auslöser", sentence: "Es posible que ____ (venir) hoy.", answer: "venga" };
  assert.ok(errs({ ...s, wrong: undefined }).length, "ohne trigger");
  assert.deepEqual(errs({ ...s, trigger: "es posible que", wrong: undefined }), []);
  assert.ok(errs({ ...s, trigger: "x", sentence: "Es posible que ____ hoy.", wrong: undefined }).length, "ohne Infinitiv");
  assert.ok(HAS_INF.test("que ____ (venir) hoy") && !HAS_INF.test("que ____ hoy"));
});
test("xref: nur bekannte Sprachen", () => {
  assert.deepEqual(errs({ xref: { EN: "to attend" } }), []);
  assert.ok(errs({ xref: { XX: "a" } }).length);
  assert.ok(errs({ xref: {} }).length);
});
test("Eigennamen: Satzanfang ok, Name mitten im Satz nicht", () => {
  assert.deepEqual(properNames("Hoy llamó la madre. ¿Quién es? Es el tutor."), []);
  assert.deepEqual(properNames("Ayer hablé con Marta López."), ["Marta", "López"]);
  assert.ok(errs({ area: "schule", topic: "Fehlzeiten", sentence: "Hablé con Marta sobre ____." }).length);
});
test("answersOf trennt mit |", () => assert.deepEqual(answersOf({ answer: "a | b|c" }), ["a", "b", "c"]));
