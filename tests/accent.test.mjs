import { test } from "node:test";
import assert from "node:assert/strict";
import { stripAccents, clean, judge, sameWord } from "../js/core/accent.js";

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
  const r = judge(["está"], "esta");
  assert.deepEqual([r.ok, r.kind, r.hinted, r.answer], [true, "accent", true, "está"]);
});
test("streng: fehlender Akzent zählt nicht, die Art des Fehlers bleibt erkennbar", () => {
  const r = judge(["está"], "esta", true);
  assert.deepEqual([r.ok, r.kind], [false, "accent"]);
  assert.equal(judge(["está"], "está", true).ok, true);
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
