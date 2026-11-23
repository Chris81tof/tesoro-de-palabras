import { test } from "node:test";
import assert from "node:assert/strict";
import { key, tokens, formMatches, usesExpr, findExpr, marks, stripMarks, variantsOf, answerOk } from "../js/core/match.js";

const card = (term, extra = {}) => ({ id: "c1", term, answer: "x", ...extra });

test("key: ohne Artikel, alguien, algo, (se), Akzente", () => {
  assert.equal(key("tomar una decisión"), "tomar decision");
  assert.equal(key("el boletín de notas"), "boletin de notas");
  assert.equal(key("dar algo a alguien"), "dar a");
  assert.equal(key("(se) quejar de"), "quejar de");
  assert.equal(key("el año"), "año");
});
test("tokens: Akzente weg, ñ bleibt", () => assert.deepEqual(tokens("Tomó el año."), ["tomo", "el", "año"]));
test("regelmäßige Verben: Endungen, Futur, Partizip", () => {
  for (const t of ["tomo", "tomas", "toma", "tomamos", "toman", "tome", "tomaba", "tomo", "tomaron", "tomara", "tomando", "tomado", "tomare", "tomaria"]) assert.ok(formMatches("tomar", t), t);
  for (const t of ["asisto", "asistio", "asistieron", "asistira", "asistido", "asistiendo"]) assert.ok(formMatches("asistir", t), t);
  assert.ok(!formMatches("tomar", "tomate"));
  assert.ok(!formMatches("tomar", "toma" + "x"));
});
test("Stammwechsel und Schreibänderungen", () => {
  assert.ok(formMatches("llover", "llueva"));
  assert.ok(formMatches("pedir", "pido"));
  assert.ok(formMatches("pedir", "pidieron"));
  assert.ok(formMatches("soñar", "sueña"));
  assert.ok(formMatches("empezar", "empiece"));
  assert.ok(formMatches("buscar", "busque"));
  assert.ok(formMatches("coger", "coja"));
  assert.ok(formMatches("justificar", "justifique"));
});
test("unregelmäßige Verben", () => {
  assert.ok(formMatches("venir", "venga"));
  assert.ok(formMatches("tener", "tuvo"));
  assert.ok(formMatches("poner", "puesto"));
  assert.ok(formMatches("ser", "fue"));
  assert.ok(formMatches("ir", "vaya"));
  assert.ok(!formMatches("venir", "vengo" + "s"));
});
test("Nomen: Plural und Geschlecht, ñ bleibt Buchstabe", () => {
  assert.ok(formMatches("boletin", "boletines"));
  assert.ok(formMatches("nota", "notas"));
  assert.ok(formMatches("vez", "veces"));
  assert.ok(formMatches("alumno", "alumnas"));
  assert.ok(!formMatches("año", "ano"));
});
test("Wendung im Text finden, gebeugt und mit eingeschobenen Wörtern", () => {
  assert.ok(usesExpr("Ayer tomó una decisión muy difícil.", card("tomar una decisión")));
  assert.ok(usesExpr("Hay que tomar, por fin, la decisión.", card("tomar una decisión")));
  assert.ok(usesExpr("Le pido que venga mañana.", card("pedir que")));
  assert.ok(usesExpr("No pude asistir a la reunión.", card("asistir a")));
  assert.ok(usesExpr("Ya no es posible que sigan así.", card("es posible que")));
  assert.ok(usesExpr("Hoy se reparten los boletines de notas.", card("el boletín de notas")));
});
test("im Zweifel nicht erkennen", () => {
  assert.ok(!usesExpr("Compré tomates y una decisión.", card("tomar una decisión")), "Wörter zu weit auseinander oder falsche Form");
  assert.ok(!usesExpr("El tomate está maduro.", card("tomar")));
  assert.ok(!usesExpr("", card("tomar")));
  assert.ok(!usesExpr("Un año largo.", card("el ano")));
});
test("Fassungen: alt und Varianten anderer Regionen zählen, vulgäre nicht", () => {
  const c = card("coger el autobús", { alt: ["pillar el bus"], variants: [{ region: "mx", term: "tomar el camión" }, { region: "mx", term: "coger el camión", vulgar: true }] });
  assert.deepEqual(variantsOf(c), ["coger el autobús", "pillar el bus", "tomar el camión"]);
  assert.ok(usesExpr("Tomo el camión a las ocho.", c));
  assert.ok(usesExpr("Cogí el camión a las ocho.", card("coger el camión")), "die Hauptform wird erkannt, auch wenn dieselbe Form in einer Region vulgär ist");
});
test("ausdrückliche Markierung der Fundstelle hat Vorrang", () => {
  const c = card("tomar una decisión", { id: "x01" });
  assert.deepEqual(marks("Hoy [[x01:se decidió]] algo y [[x02:otra]] cosa."), [{ id: "x01", text: "se decidió" }, { id: "x02", text: "otra" }]);
  assert.equal(stripMarks("Hoy [[x01:se decidió]] algo."), "Hoy se decidió algo.");
  const marked = findExpr("Hoy [[x01:se decidió]] algo.", c);
  assert.deepEqual([marked.found, marked.via], [true, "mark"], "gilt, obwohl die automatische Suche nichts fände");
  assert.deepEqual(findExpr("Hoy tomó una decisión.", c), { found: true, via: "auto" });
  assert.equal(findExpr("Hoy [[x02:se decidió]] algo.", c).found, false, "Markierung einer anderen Karte zählt nicht");
  assert.equal(findExpr("[[x02:tomó una decisión]]", c).found, true, "der Text einer fremden Markierung wird trotzdem automatisch geprüft");
});
test("answerOk ohne Akzent-Nachsicht", () => {
  assert.ok(answerOk({ answer: "está|esta" }, "ESTÁ"));
  assert.ok(!answerOk({ answer: "está" }, "esta"));
});
