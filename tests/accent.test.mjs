import { test } from "node:test";
import assert from "node:assert/strict";
import { stripAccents, clean, judge, sameWord, accentChangesMeaning } from "../js/core/accent.js";

test("Akzente fallen weg, ñ bleibt", () => {
  assert.equal(stripAccents("está"), "esta");
  assert.equal(stripAccents("pingüino"), "pinguino");
  assert.equal(stripAccents("año"), "año");
  assert.equal(stripAccents("Ñandú"), "Ñandu");
  assert.notEqual(stripAccents("año"), stripAccents("ano"));
});
test("clean: ¿¡, Satzzeichen am Ende, Großschreibung, Leerzeichen", () => {
  assert.equal(clean("  ¿Cómo  estás?  "), "cómo estás");
});
test("genau richtig", () => {
  const r = judge(["está"], "Está");
  assert.deepEqual([r.ok, r.kind, r.hinted], [true, "exact", false]);
});
test("ohne Akzent: richtig mit Hinweis", () => {
  const r = judge(["decisión"], "decision");
  assert.deepEqual([r.ok, r.kind, r.hinted, r.answer], [true, "accent", true, "decisión"]);
});
test("streng: fehlender Akzent zählt nicht, die Art des Fehlers bleibt erkennbar", () => {
  const r = judge(["decisión"], "decision", true);
  assert.deepEqual([r.ok, r.kind], [false, "accent"]);
  assert.equal(judge(["decisión"], "decisión", true).ok, true);
});
test("ñ darf nie fehlen (año ≠ ano)", () => {
  assert.equal(judge(["año"], "ano").ok, false);
  assert.equal(judge(["año"], "ano", false).kind, "wrong");
  assert.equal(judge(["año"], "año").ok, true);
});
test("mehrere Lösungen, falsche und leere Eingabe", () => {
  assert.equal(judge(["venga", "viene"], "viene").ok, true);
  assert.equal(judge(["venga"], "vengo").kind, "wrong");
  assert.equal(judge(["venga"], "  ").ok, false);
});
test("sameWord ignoriert Akzente", () => assert.ok(sameWord("Camión", "camion")));

test("Paare mit Bedeutungsunterschied zählen auch im lockeren Modus falsch", () => {
  const pairs = [["sí", "si"], ["está", "esta"], ["él", "el"], ["más", "mas"], ["té", "te"], ["sé", "se"], ["tú", "tu"], ["qué", "que"], ["cómo", "como"], ["aún", "aun"]];
  for (const [right, typed] of pairs) {
    for (const strict of [false, true]) {
      const r = judge([right], typed, strict);
      assert.deepEqual([r.ok, r.kind, r.hinted], [false, "meaning", false], `${typed} statt ${right}`);
    }
    // auch umgekehrt: Akzent gesetzt, wo keiner hingehört
    assert.equal(judge([typed], right).ok, false, `${right} statt ${typed}`);
  }
});
test("Verben im Perfekt: habló ≠ hablo, tomé ist keine Liste, aber -ó zählt", () => {
  assert.equal(judge(["habló"], "hablo").kind, "meaning");
  assert.equal(judge(["hablo"], "habló").kind, "meaning");
  assert.equal(judge(["tomó"], "tomo").ok, false);
});
test("alle anderen fehlenden Akzente bleiben locker", () => {
  for (const [right, typed] of [["decisión", "decision"], ["camión", "camion"], ["llovió", "llovio"], ["vendrá", "vendra"], ["lección", "leccion"]]) {
    const r = judge([right], typed);
    assert.deepEqual([r.ok, r.kind, r.hinted], [true, "accent", true], typed);
  }
  assert.equal(judge(["decisión"], "decision", true).ok, false, "streng bleibt streng");
  assert.equal(judge(["está bien"], "esta bien").kind, "meaning", "ein Paarwort mitten im Satz zählt auch");
});
test("accentChangesMeaning nur bei gleicher Wortzahl und gleichen Buchstaben", () => {
  assert.equal(accentChangesMeaning("está", "esta"), true);
  assert.equal(accentChangesMeaning("decisión", "decision"), false);
  assert.equal(accentChangesMeaning("está", "estar"), false);
  assert.equal(accentChangesMeaning("dónde está", "donde"), false);
});
