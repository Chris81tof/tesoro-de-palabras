// Gestaltung: eigene Zeichnungen, Muster nur als Rahmen, Fries und Fuge, keine Information nur über Farbe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ART } from "../js/core/art.js";
import { ICON_NAMES, icon } from "../js/core/icons.js";
import { typedFeedback, optsHtml, checkLine, refHtml, fb } from "../js/exercises/common.js";
import { statusLabel } from "../js/core/library.js";
import { newProgress } from "../js/core/srs.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const tiles = read("../css/tiles.css");
const all = ["../css/tokens.css", "../css/base.css", "../css/components.css", "../css/tiles.css"].map(read).join("\n");

test("Zeichnungen sind selbst gezeichnete SVGs: nichts von außen, nur eigene Farbklassen", () => {
  assert.deepEqual(Object.keys(ART).sort(), ["book", "star", "sun"]);
  for (const [name, svg] of Object.entries(ART)) {
    assert.match(svg, /^<svg class="art art-/, name);
    assert.match(svg, /aria-hidden="true"/, name + ": Schmuck, nicht für Bildschirmleser");
    assert.ok(!/(href|<image|<script|url\(|<style|onload|https?:\/\/(?!www\.w3\.org\/2000\/svg))/i.test(svg), name + ": keine Verweise nach außen");
    const classes = new Set([...svg.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)));
    for (const c of classes) assert.ok(["art", `art-${name}`, "c1", "c2", "c3", "p", "l", "la", "lp"].includes(c), `${name}: Klasse ${c}`);
    assert.ok(!/fill="#|stroke="#|style=/.test(svg), name + ": Farben kommen aus dem Stylesheet (Hell und Dunkel)");
    for (const m of svg.matchAll(/points="([^"]+)"/g)) for (const pair of m[1].trim().split(/\s+/)) {
      const [x, y] = pair.split(",").map(Number);
      assert.ok(x >= 0 && x <= 96 && y >= 0 && y <= 96, `${name}: Punkt ${pair} im Rahmen`);
    }
  }
});
test("die Farbklassen der Zeichnungen sind im Stylesheet vorhanden", () => {
  for (const c of [".art .c1", ".art .c2", ".art .c3", ".art .p", ".art .l", ".art .la", ".art .lp"]) assert.ok(tiles.includes(c), c);
});
test("Muster: keine Bilddateien, keine fremden Quellen, keine Schrift von außen", () => {
  assert.ok(!/url\(/i.test(all.replace(/url\("\.\.\/fonts\//g, "")), "kein url() in den Stylesheets");
  assert.ok(!/@import|@font-face|https?:\/\//.test(all), "nichts importieren oder von außen laden");
  assert.match(read("../css/tokens.css"), /--sans: -apple-system/, "Systemschrift");
});
test("Muster stehen nur als Rahmen, Fries und Fuge: Verlaufsmuster nur an dafür vorgesehenen Stellen, nie hinter Text", () => {
  const allowed = ["#top::after, #tabs::before", "h1::after", ".card"];
  const rules = [...tiles.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1].trim(), m[2]]);
  const withPattern = rules.filter(([, body]) => /(radial|linear|conic|repeating)-gradient|--fries-bild/.test(body) && !/^--fries-bild/.test(body.trim())).map(([sel]) => sel);
  assert.deepEqual(withPattern.filter((s) => !allowed.includes(s) && s !== ":root"), []);
  // die Zierpunkte der Kachel liegen im Innenabstand: der Abstand ist größer als der Abstand der Punkte vom Rand plus Radius
  const card = tiles.match(/\.card \{([^}]*)\}/)[1];
  const pad = Number(/padding:\s*(\d+)px/.exec(card)[1]);
  const dot = Number(/circle at (\d+)px (\d+)px/.exec(card)[1]);
  assert.ok(pad >= dot + 3 + 4, `Innenabstand ${pad}px muss die Punkte (Mitte ${dot}px, Radius 3px) frei lassen`);
  for (const sel of ["body", "main", "p", "textarea", "input", ".sentence", ".passage", ".feedback", ".opt"]) {
    const rule = new RegExp(`(^|\\n)${sel.replace(".", "\\.")}\\s*\\{[^}]*(gradient|--fries-bild)`);
    assert.ok(!rule.test(tiles), `${sel} hat kein Muster`);
  }
});
test("Reiter und Knöpfe: Auswahl ist nicht nur eine andere Farbe (Balken, Zierpunkt, Fettdruck, Rahmen)", () => {
  assert.match(tiles, /#tabs a\[aria-current="page"\] \{ box-shadow: inset 0 4px 0/);
  assert.match(tiles, /#tabs a\[aria-current="page"\] span::before \{ content: "◆ "/);
  assert.match(read("../css/components.css"), /#tabs a\[aria-current="page"\] \{[^}]*font-weight: 700/);
  assert.match(read("../css/components.css"), /\.mode\.on \{[^}]*box-shadow: inset 0 0 0 2px/);
});

test("Meldungen tragen ein Zeichen und Worte: ✓ und ✗, nicht nur Grün und Rot", () => {
  const ok = typedFeedback({ ok: true, hinted: false, kind: "exact", expected: ["a"], given: "a" });
  assert.match(ok, /✓ Richtig\./);
  const bad = typedFeedback({ ok: false, hinted: false, kind: "wrong", expected: ["tomar"], given: "x" });
  assert.match(bad, /✗ Nicht ganz\. Gesucht: tomar/);
  assert.match(typedFeedback({ ok: false, kind: "meaning", accentAnswer: "sí", given: "si", expected: ["sí"] }), /✗ Der Akzent ändert/);
  assert.match(typedFeedback({ ok: false, revealed: true, expected: ["x"] }), /✗ Lösung gezeigt/);
  assert.match(typedFeedback({ ok: true, hinted: true, kind: "exact", expected: ["x"], given: "x" }), /✓ Richtig\. Mit Hinweis/);
  assert.match(fb(true, ""), /✓/);
  assert.match(fb(false, "x"), /✗/);
  assert.match(typedFeedback({ ok: true, hinted: false, kind: "exact", expected: ["a"], given: "a", warning: "„coger“ gilt in Mexiko als vulgär." }), /warnbox[\s\S]*vulgär/, "Warnung mit Zeichen und Text");
  assert.match(typedFeedback({ ok: true, hinted: false, kind: "exact", expected: ["a"], given: "a", warning: "w" }), /<svg/, "Warnung mit Symbol");
});
test("Auswahl nach der Antwort: richtige Option mit ✓, gewählte falsche mit ✗", () => {
  const s = { ui: { opts: [{ t: "a", ok: false }, { t: "b", ok: true }, { t: "c", ok: false }], picked: 0 }, result: { ok: false } };
  const h = optsHtml(s);
  assert.match(h, /<span>a ✗<\/span>/);
  assert.match(h, /<span>b ✓<\/span>/);
  assert.match(h, /<span>c<\/span>/, "nicht gewählte falsche Option ohne Zeichen");
  assert.ok(!/✓|✗/.test(optsHtml({ ...s, result: null })), "vor der Antwort kein Hinweis");
  assert.match(checkLine(true, "Wendung erkannt."), /✓/);
  assert.match(checkLine(false, "nicht erkannt"), /✗/);
});
test("Lernstand steht als Wort da, Unsicheres als Wort („unsicher“) und mit Rahmen", () => {
  const p = { ...newProgress(), seen: 3, wrong: 3, right: 0, box: 0 };
  assert.equal(statusLabel(p), "Problematisch");
  assert.equal(statusLabel({ ...newProgress(), seen: 5, right: 5, box: 4 }), "Gemeistert");
  assert.equal(statusLabel(newProgress()), "Neu");
  const html = refHtml({ id: "x", cat: "Sonstiges", term: "a", unsure: true, sentence: "____", answer: "a" }, { variant: "es", country: "" });
  assert.match(html, /\? unsicher/);
  assert.match(read("../css/components.css"), /\.unsure \{[^}]*border: 1px dashed/);
});
test("Textfelder im Lückentext zeigen nach der Prüfung ✓ oder ✗ hinter dem Feld, nicht nur eine Farbe", () => {
  const src = read("../js/views/cloze.js");
  assert.match(src, /class="mk \$\{[^}]*\}" aria-hidden="true">\$\{[^}]*"✓" : "✗"/);
  assert.match(src, /\$\{r\.ok \? "✓" : "✗"\}/, "und in der Ergebnisliste");
  assert.match(tiles, /\.mk\.good[\s\S]*\.mk\.bad/);
});
test("Piktogramme sind weiter eigene SVGs ohne Verweise nach außen", () => {
  for (const n of ICON_NAMES) assert.ok(!/(href|<image|url\()/.test(icon(n)), n);
});
