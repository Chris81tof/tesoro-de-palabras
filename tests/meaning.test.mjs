import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { meaningOptions, DIRECTIONS } from "../js/core/meaning.js";
import { createState, normalize } from "../js/core/state.js";
import { cue } from "../js/core/cards.js";
import { key, variantsOf } from "../js/core/match.js";

const ex = JSON.parse(readFileSync(new URL("../data/beispiel-karten.json", import.meta.url), "utf8"));
const by = (id) => ex.find((c) => c.id === id);
const P = (o = {}) => ({ variant: "es", country: "", meaningDir: "de-es", ...o });

test("Standard ist Deutsch → Spanisch, nur zwei Richtungen", () => {
  assert.equal(createState().prefs.meaningDir, "de-es");
  assert.equal(normalize({ prefs: { meaningDir: "quatsch" } }).prefs.meaningDir, "de-es");
  assert.equal(normalize({ prefs: { meaningDir: "es-de" } }).prefs.meaningDir, "es-de");
  assert.deepEqual(Object.keys(DIRECTIONS), ["de-es", "es-de"]);
});
test("Deutsch → Spanisch: richtig ist die Wendung der eigenen Variante", () => {
  assert.equal(meaningOptions(by("x06"), ex, P()).solution, "concertar una cita");
  assert.equal(meaningOptions(by("x06"), ex, P({ variant: "latam" })).solution, "agendar una cita");
  assert.equal(meaningOptions(by("x04"), ex, P({ variant: "latam", country: "mx" })).solution, "tomar el camión");
});
test("Deutsch → Spanisch: 4 verschiedene Optionen, genau eine richtig, keine Fassung derselben Wendung als Ablenker", () => {
  for (const c of ex) for (const prefs of [P(), P({ variant: "latam", country: "mx" })]) {
    const m = meaningOptions(c, ex, prefs, () => 0.4);
    assert.equal(m.options.length, 4, c.id);
    assert.equal(new Set(m.options.map((o) => key(o.t, true))).size, 4, c.id);
    assert.deepEqual(m.options.filter((o) => o.ok).map((o) => o.t), [m.solution]);
    const own = new Set([...variantsOf(c), ...(c.variants || []).map((v) => v.term)].map((t) => key(t, true)));
    assert.deepEqual(m.options.filter((o) => !o.ok && own.has(key(o.t, true))), [], c.id);
  }
});
test("Deutsch → Spanisch: auch fremde Karten erscheinen in der Fassung der eigenen Variante", () => {
  const m = meaningOptions(by("x01"), ex, P({ variant: "latam" }), () => 0.1);
  const texts = m.options.map((o) => o.t);
  assert.ok(!texts.includes("coger el autobús"), "Variante Lateinamerika zeigt nicht die Spanien-Fassung");
});
test("Spanisch → Deutsch: wie bisher, richtig ist die deutsche Bedeutung", () => {
  const m = meaningOptions(by("x01"), ex, P({ meaningDir: "es-de" }));
  assert.equal(m.solution, cue(by("x01")));
  assert.equal(m.options.length, 4);
  assert.ok(m.options.every((o) => cue(ex.find((c) => c.de === o.t))));
});
