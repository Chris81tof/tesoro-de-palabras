import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cardErrors, AREAS } from "../js/core/cards.js";

const load = (f) => JSON.parse(readFileSync(new URL("../data/" + f, import.meta.url), "utf8"));
const cards = load("cards.json");
const examples = load("beispiel-karten.json");
const all = [...cards, ...examples];

test("alle Karten bestehen die Kartenprüfung", () => {
  const errors = all.flatMap((c) => cardErrors(c).map((m) => `${c.id}: ${m}`));
  assert.deepEqual(errors, []);
});
test("IDs sind eindeutig; Startkarten ohne x, Beispielkarten x01…", () => {
  assert.equal(new Set(all.map((c) => c.id)).size, all.length);
  assert.ok(cards.every((c) => /^[a-z]\d{2,}$/.test(c.id) && !c.id.startsWith("x") && !c.id.startsWith("u")));
  assert.ok(examples.every((c) => /^x\d{2}$/.test(c.id) && c.example === true));
});
test("Beispielkarten: 10 Stück, beide Bereiche, klar als Beispiel markiert", () => {
  assert.equal(examples.length, 10);
  for (const a of Object.keys(AREAS)) assert.equal(examples.filter((c) => c.area === a).length, 5);
  assert.ok(examples.every((c) => /BEISPIEL/.test(c.note)));
});
test("Beispielkarten decken die Besonderheiten ab", () => {
  assert.ok(examples.filter((c) => c.trigger).length >= 2, "Subjuntivo");
  assert.ok(examples.some((c) => String(c.answer).includes("|") && c.trigger), "Subjuntivo mit beiden Modi");
  assert.ok(examples.filter((c) => c.variants).length >= 2, "Varianten");
  assert.ok(examples.some((c) => (c.variants || []).some((v) => v.vulgar)), "vulgäre Form");
  assert.ok(examples.some((c) => c.unsure || (c.variants || []).some((v) => v.unsure)), "unsicher");
  assert.ok(examples.some((c) => c.cat === "Falscher Freund" && c.xref), "Falscher Freund mit xref");
});
