import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gradeGap, gradeTerm } from "../js/core/grade.js";

const ex = JSON.parse(readFileSync(new URL("../data/beispiel-karten.json", import.meta.url), "utf8"));
const by = (id) => ex.find((c) => c.id === id);
const prefs = (o = {}) => ({ variant: "es", country: "", strictAccents: false, ...o });

test("Lücke: richtig, falsch, Akzent", () => {
  assert.deepEqual([gradeGap(by("x01"), "tomar", prefs()).ok, gradeGap(by("x01"), "hacer", prefs()).ok], [true, false]);
  const c = { ...by("x02"), answer: "llueva|llovió" };
  const r = gradeGap({ ...c, mode: "subj" }, "llovio", prefs());
  assert.deepEqual([r.ok, r.hinted, r.kind, r.accentAnswer], [true, true, "accent", "llovió"]);
  const s = gradeGap({ ...c, mode: "subj" }, "llovio", prefs({ strictAccents: true }));
  assert.deepEqual([s.ok, s.kind], [false, "accent"]);
});
test("Lücke: Subjuntivo und Indikativ bei „tal vez“", () => {
  for (const f of ["venga", "viene", "vendrá", "vendra"]) assert.equal(gradeGap(by("x03"), f, prefs()).ok, true, f);
  assert.equal(gradeGap(by("x03"), "vienen", prefs()).ok, false);
});
test("Lücke: andere Fassung richtig, aber „in deiner Variante“", () => {
  const r = gradeGap(by("x06"), "agendar", prefs());
  assert.equal(r.ok, true);
  assert.equal(r.variantMsg, "richtig, in deiner Variante: concertar una cita");
  assert.equal(gradeGap(by("x06"), "concertar", prefs()).variantMsg, null);
  assert.equal(gradeGap(by("x06"), "agendar", prefs({ variant: "latam" })).variantMsg, null);
  assert.deepEqual(gradeGap(by("x06"), "zzz", prefs()).expected.slice(0, 1), ["concertar"]);
});
test("Lücke: vulgäre Form richtig, aber mit Warnung", () => {
  const r = gradeGap(by("x04"), "coger", prefs({ variant: "latam", country: "mx" }));
  assert.equal(r.ok, true);
  assert.match(r.warning, /vulgär/);
  assert.equal(gradeGap(by("x04"), "coger", prefs()).warning, null);
});
test("Übersetzen: Artikel optional, Akzent, Zusatz, Variante", () => {
  assert.equal(gradeTerm(by("x01"), "tomar una decisión", prefs()).ok, true);
  assert.equal(gradeTerm(by("x01"), "Tomar decisión", prefs()).ok, true);
  assert.equal(gradeTerm(by("x01"), "tomar una decision", prefs()).hinted, true);
  assert.equal(gradeTerm(by("x01"), "tomar una decision", prefs({ strictAccents: true })).ok, false);
  assert.equal(gradeTerm(by("x01"), "tomar una decisión importante", prefs()).ok, true);
  assert.equal(gradeTerm(by("x01"), "hacer una decisión", prefs()).ok, false);
  const v = gradeTerm(by("x05"), "la computadora", prefs());
  assert.equal(v.ok, true);
  assert.equal(v.variantMsg, "richtig, in deiner Variante: el ordenador");
  assert.equal(gradeTerm(by("x05"), "el ordenador", prefs()).variantMsg, null);
  assert.match(gradeTerm(by("x04"), "coger el autobús", prefs({ variant: "latam", country: "mx" })).warning || "", /vulgär/);
});
