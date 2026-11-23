import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkEdit, saveEdit, createCard, restoreOriginal, isEdited, formValues, buildCard, diffFix, isCustom, isEditable } from "../js/core/edit.js";
import { createState, allCards, progressOf, normalize } from "../js/core/state.js";
import { levelOf } from "../js/core/library.js";
import { record } from "../js/core/srs.js";
import { cardErrors } from "../js/core/cards.js";

const ex = JSON.parse(readFileSync(new URL("../data/beispiel-karten.json", import.meta.url), "utf8"));
const D = 20000;
// Startkarten für die Tests (echte stehen noch nicht in data/cards.json)
const base = [
  {
    id: "a01", area: "allgemein", cat: "Kollokation", term: "tomar una decisión", de: "eine Entscheidung treffen", prompt: "elegir una opción",
    sentence: "Tenemos que ____ una decisión.", answer: "tomar|adoptar", wrong: ["hacer", "poner", "dar"], plain: "Tenemos que decidir.", reg: "n", note: "Nicht hacer."
  },
  {
    id: "s01", area: "schule", topic: "Fehlzeiten", cat: "Subjuntivo-Auslöser", term: "pedir que", de: "bitten, dass", trigger: "pedir que", mode: "subj",
    sentence: "Le pido que ____ (justificar) la ausencia.", answer: "justifique", wrong: ["justifica", "justificar", "justificó"], plain: "Necesito un justificante.", reg: "f"
  }
];
const levels = { a01: "B1" };
const a01 = base[0];
const form = (extra = {}, card = a01, state = createState()) => ({ ...formValues(levels, state, card), ...extra });
const edit = (s, extra, id = "a01", b = base, lv = levels) => saveEdit(s, b, lv, allCards(b, [], s), id, form(extra, b.find((c) => c.id === id), s));

test("Formular → Karte → Formular: jede Karte kommt unverändert zurück (alle Felder)", () => {
  for (const c of [...ex, ...base]) {
    const { card, problems } = buildCard({ id: c.id, area: c.area }, formValues({}, createState(), c));
    assert.deepEqual(problems, []);
    const { example, ...orig } = c;
    assert.deepEqual(card, orig, c.id);
    assert.deepEqual(cardErrors({ ...card }), [], c.id);
  }
});

test("Bearbeiten: Korrektur gilt, Datei und Lernstand bleiben unverändert", () => {
  const s = createState();
  record(progressOf(s, "a01"), true, "gap", D);
  const before = JSON.stringify(s.progress);
  const r = edit(s, { de: "neue Bedeutung", note: "Merke dir das." });
  assert.ok(r.ok);
  const c = allCards(base, [], s).find((x) => x.id === "a01");
  assert.equal(c.de, "neue Bedeutung");
  assert.equal(c.term, a01.term, "unveränderte Felder kommen aus der Datei");
  assert.deepEqual(s.fixes.a01, { de: "neue Bedeutung", note: "Merke dir das." }, "nur geänderte Felder");
  assert.equal(JSON.stringify(s.progress), before);
  assert.equal(base[0].de, "eine Entscheidung treffen");
  assert.ok(isEdited(s, "a01"));
});
test("Bearbeiten ohne Änderung legt keine Korrektur an", () => {
  const s = createState();
  assert.ok(edit(s, {}).ok);
  assert.deepEqual(s.fixes, {});
});
test("Bearbeiten: Varianten, Querverweise, falsche Optionen, Region, unsicher, Niveau, alt", () => {
  const s = createState();
  const r = edit(s, {
    alt: "adoptar una decisión\n\n", region: "es", unsure: true, level: "C1", wrong: ["hacer", "dar", "llevar"],
    variants: [{ region: "mx", term: "tomar la decisión", answer: "tomar", example: "Tomó la decisión.", unsure: true, vulgar: false }],
    xref: { EN: "make a decision", IT: "", FR: "", PT: "", DE: "" }
  });
  assert.deepEqual(r.errors, undefined);
  const c = allCards(base, [], s).find((x) => x.id === "a01");
  assert.deepEqual(c.alt, ["adoptar una decisión"]);
  assert.equal(c.region, "es");
  assert.equal(c.unsure, true);
  assert.deepEqual(c.wrong, ["hacer", "dar", "llevar"]);
  assert.deepEqual(c.variants, [{ region: "mx", term: "tomar la decisión", answer: "tomar", example: "Tomó la decisión.", unsure: true }]);
  assert.deepEqual(c.xref, { EN: "make a decision" });
  assert.equal(levelOf(c, levels, s), "C1");
  // und wieder entfernen: alles zurück wie in der Datei
  assert.ok(edit(s, { alt: "", region: "", unsure: false, level: "B1", wrong: a01.wrong, variants: [], xref: { IT: "", FR: "", PT: "", DE: "", EN: "" } }).ok);
  assert.deepEqual(s.fixes, {}, "keine Abweichung, keine Korrektur");
  assert.deepEqual(allCards(base, [], s)[0], a01);
});
test("Korrektur entfernt Felder der Datei (leere Angabe)", () => {
  const s = createState();
  assert.ok(edit(s, { note: "", plain: "", reg: "", wrong: ["", "", ""], prompt: "" }).ok);
  const c = allCards(base, [], s).find((x) => x.id === "a01");
  for (const k of ["note", "plain", "reg", "wrong", "prompt"]) assert.ok(!(k in c), k);
  assert.equal(restoreOriginal(s, "a01"), true);
  assert.deepEqual(allCards(base, [], s)[0], a01);
  assert.equal(restoreOriginal(s, "a01"), false);
});
test("Korrekturen überstehen Speichern und Laden", () => {
  const s = createState();
  edit(s, { de: "x", variants: [{ region: "mx", term: "t", answer: "", example: "e", unsure: false, vulgar: false }], xref: { EN: "e" } });
  const r = normalize(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(r.fixes, s.fixes);
  assert.deepEqual(allCards(base, [], r)[0], allCards(base, [], s)[0]);
});

test("Prüfungen beim Speichern: Lücke, Lösung, falsche Optionen", () => {
  const s = createState();
  const err = (extra, id = "a01") => (edit(s, extra, id).errors || []).join(" ");
  assert.match(err({ term: "  " }), /Wendung fehlt/);
  assert.match(err({ sentence: "Keine Lücke hier." }), /genau eine Lücke/);
  assert.match(err({ sentence: "Zwei ____ Lücken ____." }), /genau eine Lücke/);
  assert.match(err({ sentence: "" }), /genau eine Lücke/);
  assert.match(err({ answer: "" }), /Lösung fehlt/);
  assert.match(err({ answer: "tomar||adoptar" }), /Lösungen ist leer/);
  assert.match(err({ wrong: ["hacer", "poner", ""] }), /drei verschiedene/);
  assert.match(err({ wrong: ["hacer", "hacer", "dar"] }), /drei verschiedene/);
  assert.match(err({ wrong: ["hacer", "tomar", "dar"] }), /zugleich richtig/);
  assert.match(err({ de: "" }), /Bedeutung/);
  assert.match(err({ cat: "Quatsch" }), /Kategorie/);
  assert.match(err({ reg: "h" }), /Register/);
  assert.match(err({ region: "xx" }), /Region/);
  assert.match(err({ level: "D9" }), /Niveau/);
  assert.deepEqual(s.fixes, {}, "bei Fehlern wird nichts gespeichert");
});
test("Prüfungen: Varianten und falsche Optionen, die zugleich gültige Varianten sind", () => {
  const s = createState();
  const err = (extra) => (edit(s, extra).errors || []).join(" ");
  assert.match(err({ variants: [{ region: "", term: "x", answer: "", example: "e" }] }), /Region/);
  assert.match(err({ variants: [{ region: "mx", term: "", answer: "", example: "e" }] }), /Wendung fehlt/);
  assert.match(err({ variants: [{ region: "mx", term: "x", answer: "", example: "" }] }), /Beispiel/);
  assert.match(err({ variants: [{ region: "mx", term: "x", answer: "otra", example: "e" }] }), /nicht in „answer“/);
  assert.match(err({ variants: [{ region: "mx", term: "x", answer: "adoptar", example: "e" }], wrong: ["hacer", "adoptar", "dar"] }), /zugleich richtig/);
  assert.equal(err({ variants: [{ region: "mx", term: "x", answer: "", example: "", vulgar: true }] }), "", "vulgär braucht kein Beispiel");
});
test("Prüfungen: Subjuntivo braucht Auslöser, Modus und Infinitiv; Hinweis verrät den Modus nicht", () => {
  const s = createState();
  const err = (extra) => (edit(s, extra, "s01").errors || []).join(" ");
  assert.match(err({ trigger: "" }), /trigger/);
  assert.match(err({ mode: "" }), /mode/);
  assert.match(err({ mode: "both" }), /beide Formen/);
  assert.match(err({ sentence: "Le pido que ____ la ausencia." }), /Infinitiv in Klammern/);
  assert.match(err({ hint: "Es ist ein Subjuntivo." }), /Modus/);
  assert.equal(err({ mode: "both", answer: "justifique|justifica", wrong: ["justificar", "justificó", "justificamos"] }), "");
});
test("Prüfungen: Hinweis darf die Lösung nicht verraten, plain nicht die Wendung", () => {
  const s = createState();
  const err = (extra) => (edit(s, extra).errors || []).join(" ");
  assert.match(err({ hint: "Das Verb ist tomar." }), /Hinweis verrät/);
  assert.match(err({ hint: "Auch adoptar geht." }), /Hinweis verrät/);
  assert.equal(err({ hint: "Das gängige Verb für Entscheidungen." }), "");
  assert.match(err({ plain: "Hay que tomar una decisión pronto." }), /plain/);
});
test("Prüfungen: Schulgespräche brauchen ein Thema und keine Eigennamen", () => {
  const s = createState();
  const err = (extra) => (edit(s, extra, "s01").errors || []).join(" ");
  assert.match(err({ topic: "" }), /topic/);
  assert.match(err({ topic: "Unsinn" }), /Thema/);
  assert.match(err({ sentence: "Hablé con Marta y le pido que ____ (justificar) la ausencia." }), /Eigennamen.*Marta/);
  assert.match(err({ xref: { EN: "x", IT: "", FR: "", PT: "", DE: "" }, variants: [{ region: "mx", term: "x", answer: "", example: "Ayer vi a Pedro.", unsure: false, vulgar: false }] }), /Eigennamen.*Pedro/);
  assert.equal(err({}), "");
});
test("doppelter Ausdruck im selben Bereich wird abgelehnt, im anderen Bereich nicht", () => {
  const s = createState();
  const more = [...base, { ...a01, id: "a02", term: "Tomar decisión" }];
  const { errors } = checkEdit(a01, form({}), more.map((c) => ({ ...c })));
  assert.match(errors.join(" "), /gibt es in diesem Bereich schon/);
  const other = checkEdit(a01, form({}), [{ ...a01, id: "s09", area: "schule" }]);
  assert.deepEqual(other.errors, []);
  assert.deepEqual(checkEdit(a01, form({}), [a01]).errors, [], "die Karte selbst zählt nicht");
});

test("eigene Karten anlegen: beide Bereiche, IDs u01, u02 …, nie wiederverwendet", () => {
  const s = createState();
  const blank = (area, extra) => ({ ...formValues({}, createState(), { area }), cat: "Idiom", term: "estar en las nubes", de: "geistesabwesend sein", sentence: "Hoy estás ____ las nubes.", answer: "en", wrong: ["", "", ""], ...extra });
  const r1 = createCard(s, base, allCards(base, [], s), blank("allgemein"));
  assert.deepEqual([r1.ok, r1.id], [true, "u01"]);
  const r2 = createCard(s, base, allCards(base, [], s), blank("schule", { term: "dar la palabra", topic: "Elternsprechtag", sentence: "La tutora va a ____ la palabra a la madre.", answer: "dar", de: "das Wort erteilen" }));
  assert.deepEqual([r2.ok, r2.id], [true, "u02"]);
  assert.deepEqual(s.custom.map((c) => [c.id, c.area]), [["u01", "allgemein"], ["u02", "schule"]]);
  assert.equal(s.custom[1].topic, "Elternsprechtag");
  s.deleted.push("u02");
  const r3 = createCard(s, base, allCards(base, [], s), blank("allgemein", { term: "otra" }));
  assert.equal(r3.id, "u03", "gelöschte IDs werden nicht wiederverwendet");
  for (const c of s.custom) assert.deepEqual(cardErrors(c), []);
  assert.deepEqual(normalize(JSON.parse(JSON.stringify(s))).custom.map((c) => c.id), ["u01", "u02", "u03"]);
});
test("eigene Karten anlegen: Fehler werden genannt, nichts wird gespeichert", () => {
  const s = createState();
  const r = createCard(s, base, allCards(base, [], s), { ...formValues({}, createState(), { area: "schule" }), term: "x" });
  assert.ok(r.errors.length >= 4);
  assert.deepEqual(s.custom, []);
  assert.match(createCard(s, base, [], { ...formValues({}, createState(), {}), area: "nada" }).errors[0], /Bereich/);
  assert.match(r.errors.join(" "), /Thema|topic/);
});
test("eigene Karten ändern: direkt in der Karte, ID und Lernstand bleiben", () => {
  const s = createState();
  const blank = { ...formValues({}, createState(), { area: "allgemein" }), cat: "Idiom", term: "a", de: "b", sentence: "Es ____ b.", answer: "a", wrong: ["", "", ""] };
  const { id } = createCard(s, base, allCards(base, [], s), blank);
  record(progressOf(s, id), true, "gap", D);
  const r = saveEdit(s, base, levels, allCards(base, [], s), id, { ...blank, de: "neu", level: "C1", area: "schule" });
  assert.ok(r.ok);
  assert.equal(s.custom[0].de, "neu");
  assert.equal(s.custom[0].level, "C1");
  assert.equal(s.custom[0].area, "allgemein", "der Bereich bleibt");
  assert.equal(s.progress[id].seen, 1);
  assert.deepEqual(s.fixes, {}, "keine Korrektur für eigene Karten");
  assert.ok(isCustom(id));
});
test("Beispielkarten lassen sich nicht bearbeiten", () => {
  const s = createState();
  const cards = allCards(base, ex, s);
  assert.equal(isEditable(ex[0]), false);
  assert.equal(isEditable(a01), true);
  const r = saveEdit(s, base, levels, cards, "x01", formValues({}, s, ex[0]));
  assert.match(r.errors[0], /Beispielkarten/);
  assert.deepEqual(s.fixes, {});
});
test("diffFix: nur geänderte Felder, Niveau gegen levels.json", () => {
  const next = { ...a01, de: "x", level: "B1" };
  assert.deepEqual(diffFix(a01, "B1", next), { de: "x" });
  assert.deepEqual(diffFix(a01, "B1", { ...a01, level: "C2" }), { level: "C2" });
  assert.deepEqual(diffFix(a01, "B1", { ...a01, level: "" }), { level: "" });
  assert.equal(diffFix(a01, "B1", { ...a01, level: "B1" }), null);
  assert.deepEqual(diffFix(a01, "", { ...a01, unsure: true }), { unsure: true });
});
