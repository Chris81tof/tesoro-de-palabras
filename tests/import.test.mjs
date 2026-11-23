import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCards, summarizeImport, cardPrompt, fixPrompt } from "../js/core/import.js";
import { cardErrors, CATS, TOPICS, REG, MODES, LEVELS, REGION } from "../js/core/cards.js";
import { createState, allCards, normalize, nextCustomId } from "../js/core/state.js";
import { buildPlan } from "../js/core/plan.js";

const ex = JSON.parse(readFileSync(new URL("../data/beispiel-karten.json", import.meta.url), "utf8"));
const prefs = (o = {}) => ({ variant: "es", country: "", ...o });
const good = (extra = {}) => ({
  cat: "Kollokation", term: "llevar a cabo", de: "durchführen", prompt: "realizar algo", sentence: "Vamos a ____ a cabo el plan.", answer: "llevar",
  wrong: ["traer", "hacer", "poner"], plain: "Vamos a realizar el plan.", reg: "f", ...extra
});
const subj = (extra = {}) => ({
  cat: "Subjuntivo-Auslöser", term: "es probable que", de: "es ist wahrscheinlich, dass", sentence: "Es probable que ____ (llegar) tarde.", answer: "llegue",
  wrong: ["llega", "llegar", "llegó"], plain: "Seguramente tarde.", trigger: "es probable que", mode: "subj", ...extra
});
const school = (extra = {}) => ({
  cat: "Kollokation", topic: "Fehlzeiten", term: "justificar una falta", de: "ein Fehlen entschuldigen", sentence: "Debe ____ una falta por escrito.", answer: "justificar",
  wrong: ["probar", "decir", "hacer"], plain: "Debe entregar un escrito.", reg: "f", ...extra
});
const parse = (items, area = "allgemein", existing = [], taken = []) => parseCards(JSON.stringify(items), existing, taken, area);

test("gültiges Paket: alle Karten bekommen neue IDs ab u01 und bestehen die Kartenprüfung", () => {
  const r = parse([good(), subj(), good({ term: "poner en marcha", de: "in Gang setzen", sentence: "Vamos a ____ en marcha el plan.", answer: "poner", wrong: ["llevar", "dar", "tomar"], plain: "Vamos a iniciar el plan." })]);
  assert.equal(r.fatal, "");
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.cards.map((c) => c.id), ["u01", "u02", "u03"]);
  assert.ok(r.cards.every((c) => c.area === "allgemein"));
  for (const c of r.cards) assert.deepEqual(cardErrors(c), [], c.term);
  assert.equal(r.cards[1].mode, "subj");
});
test("IDs: nach vorhandenen, gelöschten und eigenen Karten, nie wiederverwendet", () => {
  const r = parse([good()], "allgemein", [{ id: "u01", area: "allgemein", term: "otro" }], ["u01", "u02"]);
  assert.deepEqual(r.cards.map((c) => c.id), ["u03"]);
});
test("Import mit Fehlern pro Karte: gültige Karten werden trotzdem übernommen", () => {
  const bad2 = good({ term: "kaputt eins", sentence: "Keine Lücke hier." });
  const bad4 = good({ term: "kaputt zwei", wrong: ["a", "b"] });
  const r = parse([good(), bad2, subj(), bad4]);
  assert.equal(r.cards.length, 2, "Karte 1 und 3 sind gültig");
  assert.deepEqual(r.cards.map((c) => c.term), ["llevar a cabo", "es probable que"]);
  assert.deepEqual(r.errors.map((e) => e.index), [2, 4]);
  assert.match(r.errors[0].name, /Karte 2 „kaputt eins“/);
  assert.match(r.errors[0].messages.join(" "), /genau eine Lücke/);
  assert.match(r.errors[1].messages.join(" "), /drei verschiedene/);
  assert.deepEqual(r.errors[1].raw, bad4, "die Rohkarte steht für die Korrektur bereit");
  const lines = summarizeImport(r);
  assert.match(lines[0], /^2 Karten importiert: llevar a cabo, es probable que\.$/);
  assert.ok(lines.some((l) => /^2 Karten nicht übernommen/.test(l)));
  assert.ok(lines.some((l) => /^Karte 4 „kaputt zwei“: /.test(l)));
});
test("jede Karte meldet alle ihre Fehler auf einmal", () => {
  const r = parse([{ cat: "Quatsch", term: "x" }]);
  const m = r.errors[0].messages.join(" ");
  assert.match(m, /Kategorie/);
  assert.match(m, /Bedeutung/);
  assert.match(m, /Lücke/);
  assert.match(m, /Lösung/);
  assert.equal(r.cards.length, 0);
});
test("dieselben Regeln wie im Formular: Subjuntivo, Hinweis, plain, Varianten, falsche Optionen", () => {
  const err = (extra, base = good, area = "allgemein") => parse([base(extra)], area).errors[0]?.messages.join(" ") || "";
  assert.match(err({ mode: undefined, trigger: undefined }, subj), /trigger|mode/);
  assert.match(err({ mode: undefined }, subj), /mode/);
  assert.match(err({ mode: "both" }, subj), /beide Formen/);
  assert.match(err({ sentence: "Es probable que ____ tarde." }, subj), /Infinitiv in Klammern/);
  assert.match(err({ hint: "Das ist ein Subjuntivo." }, subj), /Modus/);
  assert.match(err({ hint: "Das Verb ist llevar." }), /Hinweis verrät/);
  assert.match(err({ plain: "Vamos a llevar a cabo el plan." }), /plain/);
  assert.match(err({ wrong: ["traer", "llevar", "poner"] }), /zugleich richtig/);
  assert.match(err({ variants: [{ region: "mx", term: "x", answer: "otra", example: "e" }], wrong: ["traer", "hacer", "poner"] }), /nicht in „answer“/);
  assert.match(err({ region: "xx" }), /Region/);
  assert.match(err({ reg: "h" }), /Register/);
  assert.match(err({ level: "Z" }), /Niveau/);
  assert.match(err({ xref: { XX: "a" } }), /xref/);
  assert.match(err({}, school.bind(null), "schule") + err({ topic: undefined }, school, "schule"), /topic/);
  assert.match(err({ sentence: "Debe ____ una falta, dijo Marta Pérez." }, school, "schule"), /Eigennamen/);
  assert.equal(err({}, school, "schule"), "");
  assert.equal(err({ variants: [{ region: "mx", term: "x", answer: "", example: "", vulgar: true }] }), "", "vulgär braucht kein Beispiel");
});
test("falsche Typen werden benannt, nicht als Absturz", () => {
  const m = (extra) => parse([good(extra)]).errors[0]?.messages.join(" ") || "";
  assert.match(m({ wrong: "traer, hacer, poner" }), /wrong.*Liste/);
  assert.match(m({ de: 5 }), /de.*Text/);
  assert.match(m({ variants: "mx" }), /variants/);
  assert.match(m({ xref: ["EN"] }), /xref/);
  assert.match(m({ unsure: "ja" }), /unsure/);
  assert.match(m({ alt: [1] }), /alt/);
  assert.equal(parse(["text", 5, null]).errors.length, 3);
});
test("id und Fremdfelder werden ignoriert, mit Hinweis", () => {
  const r = parse([good({ id: "zz9", example: true, foo: 1 })]);
  assert.equal(r.cards.length, 1);
  assert.equal(r.cards[0].id, "u01");
  assert.ok(!("foo" in r.cards[0]) && !("example" in r.cards[0]));
  assert.ok(r.warnings.some((w) => /„id“, „example“/.test(w)));
  assert.ok(r.warnings.some((w) => /„foo“/.test(w)));
});
test("Bereich: ohne Angabe der gewählte, bei Widerspruch ein Fehler", () => {
  assert.equal(parse([good()], "schule").errors.length, 1, "Schule braucht ein Thema");
  assert.equal(parse([school()], "schule").cards[0].area, "schule");
  const r = parse([school({ area: "allgemein" })], "schule");
  assert.match(r.errors[0].messages.join(" "), /gehört zum Bereich „Allgemein“, importiert wird aber in „Schulgespräche“/);
  assert.equal(parse([good({ area: "schule", topic: "Fehlzeiten" })], "allgemein").errors.length, 1);
  assert.match(parse([good()], "nada").errors[0].messages.join(" "), /Bereich/);
});
test("Dubletten werden übersprungen, nicht als Fehler gemeldet; Artikel und Akzente zählen nicht", () => {
  const existing = [{ id: "u01", area: "allgemein", term: "llevar a cabo" }];
  const r = parse([good(), good({ term: "poner en marcha", de: "in Gang setzen", sentence: "Vamos a ____ en marcha el plan.", answer: "poner", wrong: ["llevar", "dar", "tomar"], plain: "Vamos a iniciar el plan." }), good({ term: "Poner en marcha", sentence: "Hay que ____ en marcha el plan.", answer: "poner", wrong: ["llevar", "dar", "tomar"], plain: "Hay que iniciar el plan." })], "allgemein", existing, ["u01"]);
  assert.deepEqual(r.skipped, ["llevar a cabo", "Poner en marcha"]);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.cards.map((c) => c.term), ["poner en marcha"]);
  assert.match(summarizeImport(r).join(" "), /Schon vorhanden, übersprungen: llevar a cabo, Poner en marcha/);
  const other = parse([school({ term: "llevar a cabo" })], "schule", existing, ["u01"]);
  assert.equal(other.cards.length, 1, "im anderen Bereich ist derselbe Ausdruck erlaubt");
  assert.equal(parse([ex[0] && { ...good(), term: "tomar una decisión", de: "x", sentence: "____ una decisión.", answer: "Tomar", wrong: ["a", "b", "c"], plain: "Decide." }], "allgemein", ex, []).skipped.length, 1);
});
test("Antwortformen: Text mit Codeblock, Objekt mit cards, einzelnes Objekt, kein JSON", () => {
  const list = JSON.stringify([good()]);
  assert.equal(parseCards("Hier sind deine Karten:\n```json\n" + list + "\n```\nViel Erfolg!", [], [], "allgemein").cards.length, 1);
  assert.equal(parseCards(JSON.stringify({ cards: [good(), subj()] }), [], [], "allgemein").cards.length, 2);
  assert.equal(parseCards(JSON.stringify(good()), [], [], "allgemein").cards.length, 1);
  assert.match(parseCards("keine Ahnung", [], [], "allgemein").fatal, /kein gültiges JSON/);
  assert.match(parseCards("[{\"cat\": ", [], [], "allgemein").fatal, /kein gültiges JSON/);
  assert.match(parseCards("[]", [], [], "allgemein").fatal, /keine Karten/);
  assert.deepEqual(summarizeImport(parseCards("[]", [], [], "allgemein")), ["Die Antwort enthält keine Karten."]);
});
test("importierte Karten sind normale eigene Karten: sie überstehen Speichern und Laden und kommen in den Plan", () => {
  const s = createState();
  const r = parse([good(), subj()], "allgemein", allCards([], [], s), [...s.custom.map((c) => c.id)]);
  s.custom.push(...r.cards);
  const back = normalize(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.custom, s.custom);
  assert.equal(nextCustomId([], back), "u03");
  const plan = buildPlan(allCards([], [], back), back, 20000, "allgemein", {});
  assert.equal(plan.blocks.flatMap((b) => b.ids).length, 2);
});

test("Prompt: alle Felder und Regeln sind beschrieben", () => {
  const p = cardPrompt({ area: "allgemein", count: 8, cat: "Kollokation" }, [], prefs());
  for (const c of CATS) assert.ok(p.includes(`"${c}"`), c);
  for (const k of Object.keys(REG)) assert.ok(p.includes(`"${k}"`), "reg " + k);
  for (const k of Object.keys(MODES)) assert.ok(p.includes(`"${k}"`), "mode " + k);
  for (const l of LEVELS) assert.ok(p.includes(`"${l}"`), l);
  for (const r of ["es", "latam", "mx", "ar", "cr"]) assert.ok(p.includes(`"${r}"`), r);
  for (const f of ["cat", "term", "de", "prompt", "sentence", "answer", "wrong", "plain", "reg", "region", "variants", "trigger", "mode", "xref", "unsure", "note", "hint", "alt", "level"]) assert.ok(p.includes(`- ${f}`) || p.includes(`- ${f} `) || p.includes(`- ${f}:`) || p.includes(`${f} und`) || p.includes(`und ${f}:`), f);
  assert.match(p, /Nomen mit Artikel/);
  assert.match(p, /Infinitiv steht in Klammern/);
  assert.match(p, /Nie eine gültige Lösung oder Variante/);
  assert.match(p, /OHNE die Wendung/);
  assert.match(p, /weder die Lösung noch die Wendung noch den Modus/);
  assert.match(p, /ohne „id“/);
  assert.match(p, /Schlage 8 Wendungen vor \(Kategorie „Kollokation“\)/);
  assert.match(p, /Meine Variante: Spanien/);
  assert.ok(!p.includes("KEINE echten Namen") && !p.includes('"topic"'.concat(": Pflicht")));
  assert.ok(cardPrompt({ area: "allgemein" }, [], prefs({ variant: "latam", country: "mx" })).includes("Lateinamerika (Mexiko)"));
});
test("Prompt für Schulgespräche: Thema Pflicht, keine echten Namen", () => {
  const p = cardPrompt({ area: "schule", topic: "Fehlzeiten", count: 5 }, [], prefs());
  assert.match(p, /Bereich: Schulgespräche/);
  assert.match(p, /KEINE echten Namen und keine echten Fälle/);
  for (const t of TOPICS) assert.ok(p.includes(`"${t}"`), t);
  assert.match(p, /topic: Pflicht bei Schulgesprächen/);
  assert.match(p, /Thema „Fehlzeiten“/);
});
test("Prompt nennt vorhandene Wendungen des Bereichs (ohne Beispielkarten), oder die eigenen Wendungen", () => {
  const existing = [{ id: "u01", area: "allgemein", term: "llevar a cabo" }, { id: "u02", area: "schule", term: "pedir cita" }, { ...ex[0] }];
  const p = cardPrompt({ area: "allgemein" }, existing, prefs());
  assert.match(p, /bitte keine davon:\nllevar a cabo(?!;)/);
  assert.ok(!p.includes("pedir cita") && !p.includes("tomar una decisión"));
  const own = cardPrompt({ area: "allgemein", terms: [" dar por sentado ", "", "echar de menos"] }, existing, prefs());
  assert.match(own, /Erstelle Lernkarten für diese Wendungen:\n- dar por sentado\n- echar de menos/);
  assert.ok(!own.includes("bitte keine davon"));
});
test("das Beispiel im Prompt ist selbst eine gültige Karte (beide Bereiche)", () => {
  for (const area of ["allgemein", "schule"]) {
    const p = cardPrompt({ area }, [], prefs());
    const r = parseCards(p.slice(p.indexOf("Beispiel für eine Karte:") + 24), [], [], area);
    assert.deepEqual(r.errors, [], area);
    assert.equal(r.cards.length, 1, area);
    assert.deepEqual(r.warnings, []);
  }
});
test("Korrektur-Prompt enthält Fehlermeldungen und die abgelehnten Karten", () => {
  const r = parse([good(), good({ term: "kaputt", sentence: "Keine Lücke." })]);
  const p = fixPrompt(r.errors, "allgemein", prefs());
  assert.match(p, /Karte 2: .*genau eine Lücke/);
  assert.ok(p.includes('"term":"kaputt"'));
  assert.match(p, /nur diese Karten/);
  assert.match(p, /JSON-Liste/);
});
