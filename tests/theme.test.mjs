import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyTheme, THEME_COLORS } from "../js/core/theme.js";
import { normalize, createState } from "../js/core/state.js";

function fakeDoc() {
  const metas = [{ a: {}, setAttribute(k, v) { this.a[k] = v; } }, { a: {}, setAttribute(k, v) { this.a[k] = v; } }];
  return { metas, documentElement: { dataset: {} }, querySelectorAll: () => metas };
}

test("Standard ist automatisch; ungültige Werte werden zu automatisch", () => {
  assert.equal(createState().prefs.theme, "auto");
  assert.equal(normalize({ prefs: { theme: "blau" } }).prefs.theme, "auto");
  assert.equal(normalize({ prefs: { theme: "light" } }).prefs.theme, "light");
  assert.equal(normalize({ prefs: { theme: "dark" } }).prefs.theme, "dark");
});
test("hell und dunkel setzen data-theme und die Statusleistenfarbe, automatisch entfernt es", () => {
  const d = fakeDoc();
  assert.equal(applyTheme("light", d, () => true), "light");
  assert.equal(d.documentElement.dataset.theme, "light");
  assert.equal(d.metas[0].a.content, THEME_COLORS.light);
  assert.equal(applyTheme("dark", d, () => false), "dark");
  assert.equal(d.documentElement.dataset.theme, "dark");
  assert.equal(applyTheme("auto", d, () => true), "dark");
  assert.equal(d.documentElement.dataset.theme, undefined);
  assert.equal(d.metas[1].a.content, THEME_COLORS.dark);
});
test("CSS: dunkle Farben gelten bei automatisch nur, wenn nicht ausdrücklich hell gewählt ist", () => {
  const css = readFileSync(new URL("../css/tokens.css", import.meta.url), "utf8");
  assert.match(css, /prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  const blocks = [...css.matchAll(/--paper: (#[0-9a-f]+)/g)].map((m) => m[1]);
  assert.equal(blocks.length, 3, "hell, dunkel nach System, dunkel fest");
  assert.equal(blocks[1], blocks[2]);
});
