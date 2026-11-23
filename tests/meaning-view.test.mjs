// Was die Übung „Bedeutung“ in beiden Richtungen anzeigt: Die Lücke gehört nur in Deutsch → Spanisch.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { render } from "../js/exercises/meaning.js";
import { viewOf } from "../js/core/variants.js";
import { cue } from "../js/core/cards.js";

const ex = JSON.parse(readFileSync(new URL("../data/beispiel-karten.json", import.meta.url), "utf8"));
const PREFS = [
  { variant: "es", country: "" },
  { variant: "latam", country: "" },
  { variant: "latam", country: "mx" }
];

const decode = (h) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
const box = () => ({ innerHTML: "", querySelector: () => null, querySelectorAll: () => [] });

// Zeichnet die Übung für eine Karte; result: null (Frage) oder die gewählte Option (Antwort)
function draw(card, dir, prefs, answered) {
  const p = { ...prefs, meaningDir: dir };
  const s = { prefs: p, cards: ex, result: null, ui: null, queue: [card.id], right: 0, wrong: 0, rerender() {}, next() {}, answer() {} };
  const b = box();
  render(b, card, s);
  if (answered) { s.result = { ok: true, given: s.ui.solution }; render(b, card, s); }
  return { html: b.innerHTML, s };
}
const opts = (html) => [...html.matchAll(/<button type="button" class="opt[^"]*"[^>]*><span class="k">\d<\/span><span>(.*?)<\/span><\/button>/g)].map((m) => decode(m[1]).replace(/ [✓✗]$/, ""));
const sentenceText = (html) => decode((html.match(/<p class="sentence">(.*?)<\/p>/) || [, ""])[1]);

test("Spanisch → Deutsch: Wendung im vollständigen Satz ohne Lücke, vier deutsche Bedeutungen", () => {
  for (const c of ex) for (const prefs of PREFS) for (const answered of [false, true]) {
    const { html, s } = draw(c, "es-de", prefs, answered);
    const shown = viewOf(c, prefs).shown;
    const label = `${c.id} ${prefs.variant}/${prefs.country} ${answered ? "nach" : "vor"} der Antwort`;
    assert.ok(!html.includes('class="blank"'), `${label}: keine Lücke`);
    assert.ok(!html.includes("____"), `${label}: kein Lückenstrich`);
    assert.equal(sentenceText(html), c.sentence.replace("____", shown.answers[0]), `${label}: vollständiger Satz in deiner Variante`);
    assert.ok(decode(html).includes(shown.term), `${label}: die Wendung steht da`);
    const o = opts(html);
    assert.equal(o.length, 4, `${label}: vier Optionen`);
    assert.equal(new Set(o).size, 4, `${label}: verschieden`);
    assert.ok(o.every((t) => ex.some((x) => cue(x) === t)), `${label}: alle Optionen sind deutsche Bedeutungen`);
    assert.ok(o.includes(cue(c)), `${label}: die richtige Bedeutung ist dabei`);
    assert.equal(s.ui.solution, cue(c));
  }
});

test("Deutsch → Spanisch: Satz mit Lücke, vier spanische Wendungen", () => {
  for (const c of ex) for (const prefs of PREFS) {
    const shown = viewOf(c, prefs).shown;
    const label = `${c.id} ${prefs.variant}/${prefs.country}`;
    const q = draw(c, "de-es", prefs, false);
    assert.equal((q.html.match(/class="blank"/g) || []).length, 1, `${label}: genau eine Lücke vor der Antwort`);
    assert.ok(decode(q.html).includes(cue(c)), `${label}: die deutsche Bedeutung steht da`);
    assert.ok(!decode(q.html).includes(c.sentence.replace("____", shown.answers[0])), `${label}: die Lösung steht noch nicht im Satz`);
    const o = opts(q.html);
    assert.equal(o.length, 4, `${label}: vier Optionen`);
    assert.equal(new Set(o).size, 4);
    assert.ok(o.includes(shown.term), `${label}: richtig ist die Wendung deiner Variante`);
    assert.ok(!o.some((t) => cue(ex.find((x) => x.id !== c.id && cue(x) === t) || {}) && ex.some((x) => cue(x) === t)), `${label}: keine deutschen Bedeutungen unter den Optionen`);
    const a = draw(c, "de-es", prefs, true);
    assert.ok(!a.html.includes('class="blank"'), `${label}: nach der Antwort ist die Lücke gefüllt`);
    assert.equal(sentenceText(a.html), c.sentence.replace("____", shown.answers[0]), `${label}: gefüllter Satz`);
  }
});

test("die Lücke erscheint nur in Deutsch → Spanisch", () => {
  const withGap = (dir, answered) => ex.filter((c) => draw(c, dir, PREFS[0], answered).html.includes('class="blank"')).length;
  assert.equal(withGap("es-de", false), 0);
  assert.equal(withGap("es-de", true), 0);
  assert.equal(withGap("de-es", false), ex.length);
  assert.equal(withGap("de-es", true), 0);
});
