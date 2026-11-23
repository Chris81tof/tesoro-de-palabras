import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { regionsOf, viewOf, feedback } from "../js/core/variants.js";

const ex = JSON.parse(readFileSync(new URL("../data/beispiel-karten.json", import.meta.url), "utf8"));
const bus = ex.find((c) => c.id === "x04");
const pc = ex.find((c) => c.id === "x05");
const es = { variant: "es", country: "" };
const mx = { variant: "latam", country: "mx" };
const cr = { variant: "latam", country: "cr" };
const latam = { variant: "latam", country: "" };

test("Regionen der eigenen Variante, genaueste zuerst", () => {
  assert.deepEqual(regionsOf(es), ["es"]);
  assert.deepEqual(regionsOf(mx), ["mx", "latam"]);
  assert.deepEqual(regionsOf(latam), ["latam"]);
});
test("Spanien sieht zuerst die Hauptform, die anderen stehen unter „Auch“", () => {
  const v = viewOf(bus, es);
  assert.equal(v.shown.term, "coger el autobús");
  assert.deepEqual(v.shown.answers, ["coger"]);
  assert.ok(v.others.some((o) => o.term === "tomar el camión"));
  assert.ok(!v.others.some((o) => o.term.includes("coger")), "vulgäre Formen stehen nicht unter „Auch“");
  assert.deepEqual(v.warnings, []);
  assert.equal(v.foreign, false);
});
test("Mexiko sieht seine Fassung zuerst, Spanien steht unter „Auch“", () => {
  const v = viewOf(bus, mx);
  assert.equal(v.shown.term, "tomar el camión");
  assert.ok(v.others.some((o) => o.term === "coger el autobús" && o.region === "es"));
});
test("das Land hat Vorrang vor ganz Lateinamerika; Unsicherheit der Variante wird mitgeführt", () => {
  const v = viewOf(bus, cr);
  assert.equal(v.shown.term, "tomar el bus");
  assert.equal(v.shown.unsure, true);
  assert.equal(viewOf(bus, latam).shown.term, "tomar el autobús");
});
test("vulgäre Formen warnen: Mexiko ja, Spanien nein, Lateinamerika ohne Land für jedes Land", () => {
  assert.ok(viewOf(bus, mx).warnings.some((w) => w.region === "mx"));
  assert.equal(viewOf(bus, es).warnings.length, 0);
  assert.equal(viewOf(bus, latam).warnings.length, 2);
  assert.equal(viewOf(bus, cr).warnings.length, 0, "wer Costa Rica gewählt hat, bekommt nur Warnungen für Costa Rica");
});
test("Rückmeldung „richtig, in deiner Variante“", () => {
  const f = feedback(pc, "computadora", es);
  assert.equal(f.mine, false);
  assert.equal(f.message, "richtig, in deiner Variante: el ordenador");
  assert.equal(feedback(pc, "ordenador", es).message, null);
  assert.equal(feedback(pc, "Ordenador", es).mine, true);
  assert.equal(feedback(pc, "ordenador", { variant: "latam", country: "" }).message, "richtig, in deiner Variante: la computadora");
});
test("Warnung, wenn eine vulgäre Form eingegeben wird", () => {
  const f = feedback(bus, "coger", mx);
  assert.equal(f.mine, false);
  assert.match(f.warning, /Mexiko.*vulgär/);
  assert.equal(feedback(bus, "coger", es).warning, null);
  assert.equal(feedback(bus, "tomar", mx).warning, null);
});
test("Karte nur für eine andere Region: foreign", () => {
  const card = { term: "x", answer: "a", region: "es" };
  assert.equal(viewOf(card, mx).foreign, true);
  assert.equal(viewOf(card, es).foreign, false);
  assert.equal(viewOf({ term: "x", answer: "a" }, mx).foreign, false);
});
test("Hauptform ohne Fassung für den Nutzer fällt nicht auf eine vulgäre Lösung", () => {
  const card = { term: "coger", region: "es", answer: "coger|tomar", variants: [{ region: "mx", term: "coger", answer: "coger", vulgar: true }] };
  assert.deepEqual(viewOf(card, mx).shown.answers, ["tomar"]);
  assert.deepEqual(viewOf(card, es).shown.answers, ["coger", "tomar"]);
});
