// Farben: Textkontrast mindestens 4,5:1, Rahmen von Eingabefeldern mindestens 3:1, in Hell und Dunkel.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ratio, varsOf } from "../js/core/contrast.js";

const css = readFileSync(new URL("../css/tokens.css", import.meta.url), "utf8");
// Die drei Blöcke: hell (:root), dunkel nach System, dunkel fest
const light = varsOf(css.slice(css.indexOf(":root {"), css.indexOf("/* Dunkel")));
const mediaStart = css.indexOf("@media (prefers-color-scheme: dark)");
const dark = varsOf(css.slice(css.indexOf("{", css.indexOf(":root:not", mediaStart)), css.indexOf("\n  }", css.indexOf(":root:not", mediaStart))));
const darkFixed = varsOf(css.slice(css.indexOf(':root[data-theme="dark"]'), css.indexOf("}", css.indexOf(':root[data-theme="dark"]'))));

// [Vordergrund, Hintergrund, Mindestverhältnis, wofür]
const TEXT = [
  ["--ink", "--paper", 4.5, "Text auf Kalkweiß"],
  ["--ink", "--paper-2", 4.5, "Text auf Karten"],
  ["--ink-2", "--paper", 4.5, "zweiter Text auf Kalkweiß"],
  ["--ink-2", "--paper-2", 4.5, "zweiter Text auf Karten und im Tab"],
  ["--accent", "--paper", 4.5, "Terrakotta-Text auf Kalkweiß"],
  ["--accent", "--paper-2", 4.5, "aktiver Reiter, Terrakotta auf Karten"],
  ["--accent-ink", "--accent", 4.5, "Schrift auf Terrakotta-Knöpfen"],
  ["--cobalt", "--paper", 4.5, "Kobalt-Text (Überschriften, Links)"],
  ["--cobalt", "--paper-2", 4.5, "Kobalt-Text auf Karten"],
  ["--paper", "--cobalt", 4.5, "Schrift auf gewählten Knöpfen (Kobalt)"],
  ["--good", "--good-bg", 4.5, "Richtig-Meldung"],
  ["--bad", "--bad-bg", 4.5, "Fehler-Meldung"],
  ["--good", "--paper", 4.5, "grüner Text auf Kalkweiß"],
  ["--bad", "--paper", 4.5, "roter Text auf Kalkweiß"],
  ["--bad", "--paper-2", 4.5, "roter Text auf Karten (Problematisch)"],
  ["--ink", "--mark", 4.5, "markierte Lösung"],
  ["--ink", "--good-bg", 4.5, "Text in richtigen Optionen"],
  ["--ink", "--bad-bg", 4.5, "Text in falschen Optionen"]
];
const NONTEXT = [
  ["--field", "--paper", 3, "Rand der Eingabefelder"],
  ["--cobalt", "--paper", 3, "Rahmen der Kacheln"]
];

for (const [name, vars] of [["hell", light], ["dunkel (System)", dark], ["dunkel (fest)", darkFixed]]) {
  test(`Kontrast ${name}: Text mindestens 4,5:1`, () => {
    const bad = [];
    for (const [fg, bg, min, what] of TEXT) {
      assert.ok(vars[fg] && vars[bg], `${fg} oder ${bg} fehlt (${name})`);
      const r = ratio(vars[fg], vars[bg]);
      if (r < min) bad.push(`${what}: ${fg} ${vars[fg]} auf ${bg} ${vars[bg]} = ${r.toFixed(2)}`);
    }
    assert.deepEqual(bad, []);
  });
  test(`Kontrast ${name}: Ränder mindestens 3:1`, () => {
    const bad = [];
    for (const [fg, bg, min, what] of NONTEXT) {
      const r = ratio(vars[fg], vars[bg]);
      if (r < min) bad.push(`${what}: ${vars[fg]} auf ${vars[bg]} = ${r.toFixed(2)}`);
    }
    assert.deepEqual(bad, []);
  });
}
test("die beiden dunklen Blöcke sind gleich", () => {
  assert.deepEqual(dark, darkFixed);
  assert.ok(Object.keys(dark).length >= 15);
});
test("Rechenprobe: Schwarz auf Weiß ist 21:1, gleiche Farbe 1:1", () => {
  assert.equal(Math.round(ratio("#000000", "#ffffff")), 21);
  assert.equal(ratio("#123456", "#123456"), 1);
  assert.ok(Math.abs(ratio("#777777", "#ffffff") - 4.48) < 0.02, "bekannter Wert: #777 auf Weiß ≈ 4,48");
});
