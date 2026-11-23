import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { ICON_NAMES, icon } from "../js/core/icons.js";
import { MODES } from "../js/core/modes.js";
import { AREAS } from "../js/core/cards.js";

const root = new URL("../js/", import.meta.url);
const files = ["main.js", ...["core", "views", "exercises"].flatMap((d) => readdirSync(new URL(d + "/", root)).map((f) => d + "/" + f))].filter((f) => f.endsWith(".js"));

test("jedes im Code benannte Piktogramm gibt es", () => {
  const used = new Set();
  for (const f of files) for (const m of readFileSync(new URL(f, root), "utf8").matchAll(/\bicon\("([a-z]+)"\)/g)) used.add(m[1]);
  assert.ok(used.size >= 3);
  assert.deepEqual([...used].filter((n) => !ICON_NAMES.includes(n)), []);
});
test("jede Übungsart und jeder Bereich hat ein Piktogramm", () => {
  for (const m of Object.keys(MODES)) assert.ok(ICON_NAMES.includes(m), m);
  for (const a of [...Object.keys(AREAS), "gesamt"]) assert.ok(ICON_NAMES.includes(a), a);
});
test("Piktogramme sind eigene SVGs ohne Verweise nach außen und ohne Bildschirmleser-Lärm", () => {
  const svg = icon("today");
  assert.match(svg, /^<svg /);
  assert.match(svg, /aria-hidden="true"/);
  assert.ok(!/href|xlink|<image|url\(/.test(svg));
});
