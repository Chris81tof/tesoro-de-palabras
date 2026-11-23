import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  cardWeight, textScore, suggestTexts, pickCards, coverage, textPrompt, parseTexts, textProblems, stage5Ids, textsOf, filled, regionFits, KINDS
} from "../js/core/texts.js";
import { createState, allCards } from "../js/core/state.js";
import { newProgress } from "../js/core/srs.js";
import { MODES } from "../js/core/modes.js";
import { buildPlan } from "../js/core/plan.js";
import { inArea } from "../js/core/state.js";
import { usesExpr, findExpr } from "../js/core/match.js";

const load = (f) => JSON.parse(readFileSync(new URL("../data/" + f, import.meta.url), "utf8"));
const examples = load("beispiel-karten.json");
const texts = load("texts.json");
const cards = examples;
const byId = new Map(cards.map((c) => [c.id, c]));
const D = 20000;
const prefs = (o = {}) => ({ variant: "es", country: "", ...o });
const prog = (box, extra = {}) => ({ ...newProgress(), box, seen: 3, right: 3, first: D - 20, last: D - 2, due: D + 5, ...extra });

test("Gewichte: problematisch 5, in Arbeit 3, neu 1,5, gemeistert 1, fällig +2", () => {
  assert.equal(cardWeight(undefined, D), 1.5);
  assert.equal(cardWeight(prog(2), D), 3);
  assert.equal(cardWeight(prog(5), D), 1);
  assert.equal(cardWeight(prog(1, { right: 1, wrong: 3 }), D), 5);
  assert.equal(cardWeight(prog(2, { due: D }), D), 5);
});
test("Abzug für kürzlich bearbeitete Texte sinkt über 14 Tage", () => {
  const t = texts[0];
  const s = createState();
  const base = textScore(t, s, D);
  assert.equal(base, t.gaps.length * 1.5);
  s.textLog[t.id] = D;
  assert.equal(textScore(t, s, D), base - 10);
  s.textLog[t.id] = D - 7;
  assert.equal(textScore(t, s, D), base - 5);
  s.textLog[t.id] = D - 14;
  assert.equal(textScore(t, s, D), base);
});
test("Vorschläge: Texte mit problematischen Karten zuerst; Fortschritt der Beispielkarten kommt aus dem eigenen Bereich", () => {
  const s = createState();
  for (const [id] of texts[1].gaps) s.examples.progress[id] = prog(1, { right: 0, wrong: 3, due: D });
  const list = suggestTexts(texts, s, D, new Set(cards.map((c) => c.id)), prefs());
  assert.equal(list[0].t.id, "xt2");
});
test("ein Text für eine andere Region zählt weniger", () => {
  const s = createState();
  const t = { id: "r1", area: "allgemein", region: "es", gaps: texts[0].gaps, text: "", title: "" };
  assert.equal(regionFits(t, prefs()), true);
  assert.equal(regionFits(t, prefs({ variant: "latam" })), false);
  assert.equal(regionFits({ ...t, region: "latam" }, prefs({ variant: "latam", country: "mx" })), true);
  assert.equal(regionFits({ ...t, region: "mx" }, prefs({ variant: "latam", country: "ar" })), false);
  assert.equal(regionFits({ ...t, region: undefined }, prefs({ variant: "latam" })), true);
  assert.ok(textScore(t, s, D, null, prefs({ variant: "latam" })) < textScore(t, s, D, null, prefs()));
});
test("Texte eines Bereichs; Beispieltexte verschwinden mit den Beispielkarten", () => {
  const s = createState();
  assert.deepEqual(textsOf(texts, "schule", s).map((t) => t.id), ["xt2"]);
  s.examples.removed = true;
  assert.deepEqual(textsOf(texts, "schule", s), []);
  assert.deepEqual(textsOf([...texts, { id: "i1", area: "schule", gaps: [], text: "x" }], "schule", s).map((t) => t.id), ["i1"]);
});
test("Kartenauswahl für neue Texte: keine doppelt, keine Beispielkarten, bevorzugt Karten ohne Text", () => {
  const s = createState();
  const own = Array.from({ length: 12 }, (_, i) => ({ id: "u" + (i + 1), area: "allgemein", cat: "Sonstiges", term: "t" + i, answer: "a" }));
  let i = 0;
  const rand = () => ((i = (i * 9301 + 49297) % 233280) / 233280);
  const picked = pickCards([...examples, ...own], s, texts, D, 8, rand);
  assert.equal(picked.length, 8);
  assert.equal(new Set(picked.map((c) => c.id)).size, 8);
  assert.ok(picked.every((c) => !c.example));
});

test("Prompt: Karten, Textsorte, Länge, Variante, Regeln und JSON-Format", () => {
  const p = textPrompt([byId.get("x01"), byId.get("x06")], { kind: "Essay", words: 180, area: "allgemein" }, prefs());
  assert.ok(p.includes("x01 · tomar una decisión"));
  assert.ok(p.includes("Textsorte: Essay") && p.includes("etwa 180 Wörter") && p.includes("Lücken: 2"));
  assert.ok(p.includes("Variante: Spanien") && p.includes("Beispiel-Lösung: concertar"));
  assert.ok(p.includes("Infinitiv steht in Klammern"));
  assert.ok(p.includes("[[ID:Textstelle]]"));
  assert.ok(p.includes('"gaps"') && p.includes('"region"'));
  assert.ok(!p.includes("echten Namen"));
  const l = textPrompt([byId.get("x06")], { kind: "Elternbrief", words: 120, area: "schule" }, prefs({ variant: "latam", country: "mx" }));
  assert.ok(l.includes("Lateinamerika (Mexiko)") && l.includes("Beispiel-Lösung: agendar"));
  assert.ok(l.includes("KEINE echten Namen") && l.includes("Schulgespräche"));
  assert.ok(KINDS.schule.includes("Elternbrief") && KINDS.allgemein.includes("Essay"));
});

const good = { kind: "Blog", title: "Una semana", text: "Tengo que {1} una decisión y mi {2} no arranca.", gaps: [["x01", "tomar"], ["x05", "ordenador|computadora"]] };
test("Import: gültiger Text mit Begleittext und Codeblock bekommt neue ID und Bereich", () => {
  const raw = "Hier ist dein Text:\n```json\n" + JSON.stringify(good) + "\n```\nViel Erfolg!";
  const r = parseTexts(raw, cards, ["xt1", "i1"], "allgemein");
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.texts[0].id, "i2");
  assert.equal(r.texts[0].area, "allgemein");
});
test("Import: gültige Texte eines Pakets bleiben importierbar, Fehler stehen pro Text", () => {
  const bad = { ...good, gaps: [["zz9", "x"], ["x05", "ordenador"]] };
  const r = parseTexts(JSON.stringify([good, bad, good]), cards, [], "allgemein");
  assert.equal(r.texts.length, 2);
  assert.deepEqual(r.texts.map((t) => t.id), ["i1", "i2"]);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /^Text 2: .*zz9/);
});
test("Import: Fehler werden genau benannt", () => {
  const e = (o, area = "allgemein") => parseTexts(JSON.stringify({ ...good, ...o }), cards, [], area).errors.join(" ");
  assert.equal(parseTexts("keine Ahnung", cards, [], "allgemein").errors.length, 1);
  assert.match(e({ text: "Tengo que {1} una decisión." }), /Platzhalter/);
  assert.match(e({ text: "{2} y {1}" }), /Platzhalter/);
  assert.match(e({ gaps: [["x01", ""], ["x05", "ordenador"]] }), /Lösung fehlt/);
  assert.match(e({ title: "" }), /title/);
  assert.match(e({ region: "xx" }), /Region/);
  assert.match(e({}, "schule"), /gehört zum Bereich „Allgemein“, der Text zu „Schulgespräche“/);
});
test("Import: Schulgespräche ohne Eigennamen", () => {
  const school = { kind: "Elternbrief", title: "Aviso", text: "Les propongo {1} una cita. Habló con Marta López ayer.", gaps: [["x06", "concertar"]] };
  const r = parseTexts(JSON.stringify(school), cards, [], "schule");
  assert.equal(r.texts.length, 0);
  assert.match(r.errors[0], /Eigennamen.*Marta/);
  const ok = parseTexts(JSON.stringify({ ...school, text: "Les propongo {1} una cita." }), cards, [], "schule");
  assert.equal(ok.texts.length, 1);
});
test("Import: Wendung nicht erkannt ist eine Warnung, die Fundstelle mit [[ID:…]] hebt sie auf", () => {
  const weird = { kind: "Blog", title: "T", text: "Es hora de {1} esa gran decisión.", gaps: [["x01", "tomar"]] };
  const w = parseTexts(JSON.stringify(weird), cards, [], "allgemein");
  assert.equal(w.texts.length, 1, "bleibt importierbar");
  assert.deepEqual(w.warnings, [], "tomar … decisión wird erkannt");
  const hidden = { kind: "Blog", title: "T", text: "Hay que {1} cuanto antes, sea como sea, una resolución.", gaps: [["x01", "tomar"]] };
  const r1 = parseTexts(JSON.stringify(hidden), cards, [], "allgemein");
  assert.equal(r1.texts.length, 1);
  assert.match(r1.warnings[0], /nicht erkannt/);
  const marked = { ...hidden, text: "Hay que [[x01:{1} cuanto antes, sea como sea, una resolución]]." };
  const r2 = parseTexts(JSON.stringify(marked), cards, [], "allgemein");
  assert.deepEqual(r2.warnings, []);
  assert.equal(r2.texts[0].text, marked.text, "die Markierung bleibt im Text erhalten");
});

test("Fundstellen-Markierung im Text hat Vorrang vor dem automatischen Erkennen", () => {
  const t = { text: "Hay que [[x01:{1} cuanto antes, sea como sea, una resolución]].", gaps: [["x01", "tomar"]] };
  const full = filled(t);
  assert.deepEqual(findExpr(full, byId.get("x01")), { found: true, via: "mark" });
  assert.equal(usesExpr(filled({ ...t, text: t.text.replace(/\[\[x01:|\]\]/g, "") }), byId.get("x01")), false, "ohne Markierung nicht erkannt");
  assert.equal(findExpr(full, byId.get("x05")).found, false, "Markierung einer anderen Karte zählt nicht");
});

test("Stufe 5 nutzt nur Karten, die in einem Text vorkommen", () => {
  const ids = stage5Ids(texts);
  assert.deepEqual([...ids].sort(), ["x01", "x03", "x05", "x06", "x07", "x08", "x09", "x10"]);
  assert.ok(!ids.has("x02") && !ids.has("x04"));
  const ctx = { stage5: ids };
  for (const m of ["rewrite", "produce"]) {
    assert.equal(MODES[m].need(byId.get("x01"), cards, ctx), true, m + " mit Text");
    assert.equal(MODES[m].need(byId.get("x04"), cards, ctx), false, m + " ohne Text");
    assert.equal(MODES[m].need(byId.get("x01"), cards), false, m + " ohne Angabe");
  }
  assert.equal(MODES.rewrite.need({ ...byId.get("x01"), plain: undefined }, cards, ctx), false, "Umformulieren braucht plain");
});
test("Tagesplan: gemeisterte Karten kommen in Stufe 5, aber nur mit Text", () => {
  const s = createState();
  const inText = byId.get("x01"), noText = byId.get("x04");
  for (const c of [inText, noText]) s.examples.progress[c.id] = prog(5, { seen: 4, due: D });
  const ctx = { stage5: stage5Ids(texts) };
  const plan = buildPlan(inArea(allCards([], examples, s), "allgemein"), s, D, "allgemein", ctx);
  const modeOf = (id) => plan.blocks.find((b) => b.ids.includes(id))?.mode;
  assert.equal(modeOf("x01"), "rewrite");
  assert.notEqual(modeOf("x04"), "rewrite");
  assert.notEqual(modeOf("x04"), "produce");
  const without = buildPlan(inArea(allCards([], examples, s), "allgemein"), s, D, "allgemein", { stage5: new Set() });
  assert.ok(!without.blocks.some((b) => b.mode === "rewrite" || b.mode === "produce"));
});

test("texts.json: Beispieltexte sind gültig, ohne Fehler und Warnungen, und gehören zu ihrem Bereich", () => {
  assert.equal(new Set(texts.map((t) => t.id)).size, texts.length);
  for (const t of texts) {
    assert.equal(t.example, true);
    const p = textProblems(t, byId);
    assert.deepEqual(p, { errors: [], warnings: [] }, t.id);
    for (const [id] of t.gaps) assert.equal(byId.get(id).area, t.area, `${t.id}: ${id}`);
  }
  assert.deepEqual(texts.map((t) => t.area).sort(), ["allgemein", "schule"]);
});
test("texts.json: jede Lösung ergibt im Text die Wendung ihrer Karte, auch mit Subjuntivo-Klammer", () => {
  for (const t of texts) {
    const full = filled(t);
    for (const [id] of t.gaps) assert.equal(usesExpr(full, byId.get(id)), true, `${t.id} ${id}`);
    for (const k of t.text.matchAll(/\{\d+\}\s*\(([a-záéíóúñ]+)\)/g)) assert.ok(k[1].length > 2);
  }
});
test("Karten ohne Text sind erlaubt (es gibt keine Vollabdeckung)", () => {
  const cov = coverage(texts);
  assert.ok(cards.some((c) => !cov.get(c.id)));
});
