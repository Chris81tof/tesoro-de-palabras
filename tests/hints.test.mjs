import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAX_HINT, scaffold, wordsOf, hintLine, gapTarget, termTarget, buildOptions, gapHintOptions, termHintOptions, hintLeaks } from "../js/core/hints.js";
import { withHint, revealResult, pickedResult, gradeGap } from "../js/core/grade.js";
import { cardErrors, MODE_WORDS, answersOf } from "../js/core/cards.js";
import { viewOf } from "../js/core/variants.js";
import { stripAccents, clean } from "../js/core/accent.js";
import { record, newProgress, INTERVALS } from "../js/core/srs.js";

const ex = JSON.parse(readFileSync(new URL("../data/beispiel-karten.json", import.meta.url), "utf8"));
const by = (id) => ex.find((c) => c.id === id);
const PREFS = [{ variant: "es", country: "" }, { variant: "latam", country: "" }, { variant: "latam", country: "mx" }, { variant: "latam", country: "ar" }];
const flat = (s) => stripAccents(clean(s));

test("Gerüst und Anfangsbuchstaben", () => {
  assert.equal(scaffold(["tomar", "nota"]), "_ _ _ _ _  _ _ _ _");
  assert.equal(scaffold(["tomar", "nota"], true), "t _ _ _ _  n _ _ _");
  assert.equal(scaffold(["a"], true), "_", "einzelne Buchstaben bleiben verdeckt");
  assert.equal(scaffold(["decisión"], true), "d _ _ _ _ _ _ _", "Akzentbuchstaben zählen als Buchstaben");
  assert.deepEqual(wordsOf(termTarget("tomar una decisión")), ["tomar", "decisión"], "Artikel zählen nicht");
  assert.deepEqual(wordsOf(gapTarget("venga|viene")), ["venga"]);
});
test("Stufe 1 bei normalen Karten: Kategorie und Gerüst", () => {
  assert.equal(hintLine(by("x01"), gapTarget("tomar"), 1), "Kollokation, 1 Wort: _ _ _ _ _");
  assert.equal(hintLine(by("x06"), termTarget("concertar una cita"), 2), "Kollokation, 2 Wörter: c _ _ _ _ _ _ _ _  c _ _ _");
});
test("Subjuntivo: Hinweis nennt nur den Auslöser, nie den Modus, auch nicht über die Kategorie", () => {
  for (const id of ["x02", "x03", "x08"]) {
    for (const level of [1, 2]) {
      const line = hintLine(by(id), gapTarget(answersOf(by(id))[0]), level);
      assert.ok(line.startsWith(`Auslöser: „${by(id).trigger}“`), line);
      assert.ok(!MODE_WORDS.test(line), line);
      assert.ok(!line.includes(by(id).cat), "die Kategorie würde den Modus verraten");
    }
  }
});
test("Übersetzen bei Subjuntivo-Karten: der Auslöser ist die Lösung und steht nicht im Hinweis", () => {
  const line = hintLine(by("x02"), termTarget("es posible que"), 1);
  assert.equal(line, "3 Wörter: _ _  _ _ _ _ _ _ _  _ _ _");
  assert.ok(!line.includes("posible"));
  assert.ok(hintLine(by("x02"), gapTarget("llueva"), 1).includes("es posible que"), "beim Lückenwort steht der Auslöser als Hilfe da");
});
test("vor Stufe 3 verrät nichts die Lösung vollständig (alle Karten, alle Varianten, beide Ziele)", () => {
  for (const c of ex) for (const prefs of PREFS) {
    const v = viewOf(c, prefs).shown;
    for (const level of [1, 2]) {
      for (const [target, solution] of [[gapTarget(v.answers[0]), v.answers[0]], [termTarget(v.term), v.term]]) {
        const line = hintLine(c, target, level);
        const body = line.slice(line.indexOf(": ", line.lastIndexOf("Wort")) + 2);
        const letters = body.replace(/[\s_]/g, "");
        const full = stripAccents(clean(solution)).replace(/[^\p{L}]/gu, "");
        assert.ok(letters.length < full.length, `${c.id} Stufe ${level}: ${line}`);
        assert.ok(!flat(line).includes(flat(solution)), `${c.id}: ${line}`);
      }
    }
  }
});
test("Stufe 3: vier verschiedene Optionen mit der Lösung der eigenen Variante, nie eine gültige Variante als Ablenker", () => {
  for (const c of ex) for (const prefs of PREFS) {
    const sol = viewOf(c, prefs).shown.answers[0];
    const o = gapHintOptions(c, ex, prefs, () => 0.3);
    assert.equal(o.length, 4, c.id);
    assert.equal(new Set(o.map(flat)).size, 4, c.id);
    assert.ok(o.includes(sol), `${c.id}: Lösung dabei`);
    const valid = new Set([...answersOf(c), ...(c.variants || []).flatMap((v) => String(v.answer || "").split("|"))].map(flat));
    assert.deepEqual(o.filter((x) => x !== sol && valid.has(flat(x))), [], `${c.id}: keine gültige Antwort als Ablenker`);
  }
});
test("Subjuntivo: Auswahl nur aus den falschen Formen der Karte", () => {
  for (const id of ["x02", "x03", "x08"]) {
    const c = by(id);
    const o = gapHintOptions(c, ex, PREFS[0]);
    assert.deepEqual(o.filter((x) => x !== answersOf(c)[0]).sort(), [...c.wrong].sort());
  }
  assert.equal(gapHintOptions({ ...by("x02"), wrong: undefined }, ex, PREFS[0]), null, "ohne falsche Formen keine erfundenen");
});
test("ohne wrong: Lösungen anderer Karten, ohne die eigenen Lösungen", () => {
  const c = { ...by("x01"), wrong: undefined };
  const o = gapHintOptions(c, ex, PREFS[0]);
  assert.ok(o.length >= 2 && o.includes("tomar"));
  assert.ok(!o.includes("adoptar"));
});
test("Wendungen: Optionen in der Variante, ohne Fassungen derselben Wendung", () => {
  const o = termHintOptions(by("x06"), ex, PREFS[0], () => 0.2);
  assert.equal(o.length, 4);
  assert.ok(o.includes("concertar una cita") && !o.includes("agendar una cita"));
  assert.ok(termHintOptions(by("x06"), ex, PREFS[1]).includes("agendar una cita"));
});
test("buildOptions ignoriert Akzent und Groß-/Kleinschreibung bei Doppelten", () => {
  const o = buildOptions("está", [["ESTA", "este", "ese", "aquel"]], [], () => 0.5);
  assert.ok(!o.includes("ESTA"));
  assert.equal(o.length, 4);
});
test("Wertung: richtig ohne Hinweis steigt auf, richtig mit Hinweis bleibt und ist morgen wieder fällig, Lösung zeigen ist falsch", () => {
  const D = 20000;
  const ok = gradeGap(by("x01"), "tomar", PREFS[0]);
  const noHint = withHint(ok, 0);
  const p1 = Object.assign(newProgress(), { box: 2, seen: 2, right: 2 });
  record(p1, noHint.ok, "gap", D, noHint.hinted);
  assert.equal(p1.box, 3);
  const hinted = withHint(ok, 1);
  assert.deepEqual([hinted.ok, hinted.hinted, hinted.hintUsed], [true, true, true]);
  const p2 = Object.assign(newProgress(), { box: 2, seen: 2, right: 2 });
  record(p2, hinted.ok, "gap", D, hinted.hinted);
  assert.deepEqual([p2.box, p2.due, p2.hinted], [2, D + INTERVALS[1], 1]);
  const rev = revealResult(["tomar"]);
  assert.deepEqual([rev.ok, rev.hinted, rev.revealed], [false, false, true]);
  const p3 = Object.assign(newProgress(), { box: 4, seen: 4, right: 4 });
  record(p3, rev.ok, "gap", D, rev.hinted);
  assert.deepEqual([p3.box, p3.due], [0, D]);
  const pick = pickedResult("tomar");
  assert.deepEqual([pick.ok, pick.hinted], [true, true]);
  assert.equal(withHint(gradeGap(by("x01"), "hacer", PREFS[0]), 2).hinted, false, "falsch bleibt falsch");
});
test("eigener Hinweis darf die Lösung nicht verraten", () => {
  const c = by("x01");
  assert.equal(hintLeaks({ ...c, hint: "Denk an das Verb tomar." }), true);
  assert.equal(hintLeaks({ ...c, hint: "Man nimmt eine Entscheidung nicht." }), false);
  assert.equal(hintLeaks({ ...c, hint: "Es heißt adoptar" }), true, "auch weitere Lösungen");
  assert.equal(hintLeaks({ ...by("x06"), hint: "Auch agendar ist möglich." }), true, "auch Varianten");
  assert.equal(hintLeaks({ ...c, hint: "Es heißt tomar una decision" }), true, "ganze Wendung, ohne Rücksicht auf Akzente");
  assert.equal(hintLeaks({ ...by("x07"), hint: "Man geht zu einer Sitzung." }), false);
  assert.ok(cardErrors({ ...c, hint: "Denk an tomar." }).some((m) => /Hinweis verrät/.test(m)));
  assert.deepEqual(cardErrors({ ...c, hint: "Das häufigste Verb für Entscheidungen." }), []);
  assert.equal(MAX_HINT, 3);
});
