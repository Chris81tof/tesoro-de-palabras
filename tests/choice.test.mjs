import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { choiceOptions } from "../js/core/choice.js";
import { viewOf } from "../js/core/variants.js";
import { answersOf } from "../js/core/cards.js";

const ex = JSON.parse(readFileSync(new URL("../data/beispiel-karten.json", import.meta.url), "utf8"));
const by = (id) => ex.find((c) => c.id === id);
const P = {
  es: { variant: "es", country: "" }, latam: { variant: "latam", country: "" }, mx: { variant: "latam", country: "mx" },
  ar: { variant: "latam", country: "ar" }, cr: { variant: "latam", country: "cr" }, co: { variant: "latam", country: "co" }
};

test("x06: Spanien bekommt concertar, Lateinamerika agendar als richtige Option", () => {
  assert.equal(choiceOptions(by("x06"), P.es).solution, "concertar");
  assert.equal(choiceOptions(by("x06"), P.latam).solution, "agendar");
  assert.equal(choiceOptions(by("x06"), P.mx).solution, "agendar");
  assert.ok(choiceOptions(by("x06"), P.es).options.includes("concertar"));
  assert.ok(!choiceOptions(by("x06"), P.es).options.includes("agendar"));
});
test("die richtige Option ist immer die Form der eigenen Variante, in jeder Karte und Variante", () => {
  for (const c of ex) for (const [name, prefs] of Object.entries(P)) {
    const o = choiceOptions(c, prefs, () => 0.5);
    assert.equal(o.solution, viewOf(c, prefs).shown.answers[0], `${c.id} ${name}`);
    assert.equal(o.options.length, 4);
    assert.equal(new Set(o.options).size, 4);
    assert.ok(o.options.includes(o.solution));
  }
});
test("keine falsche Option ist eine gültige Lösung oder Variante", () => {
  for (const c of ex) for (const prefs of Object.values(P)) {
    const valid = new Set([...answersOf(c), ...(c.variants || []).flatMap((v) => String(v.answer || "").split("|"))].map((x) => x.toLowerCase()));
    const o = choiceOptions(c, prefs);
    assert.deepEqual(o.options.filter((x) => x !== o.solution && valid.has(x.toLowerCase())), [], c.id);
  }
});
test("ohne drei falsche Optionen gibt es keine Auswahl", () => {
  assert.equal(choiceOptions({ term: "x", answer: "a" }, P.es), null);
});
