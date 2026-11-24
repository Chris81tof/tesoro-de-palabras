import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  rankVoices, bestVoice, qualityOf, langRank, targetLocale, voiceLabel, spokenTerm, spokenSentence, speechPlan, savedVoice,
  say, canSpeak, initVoices, voices, onVoices, sampleFor, stopSpeaking, isSpanish
} from "../js/core/speech.js";
import { createState, normalize } from "../js/core/state.js";

const ex = JSON.parse(readFileSync(new URL("../data/beispiel-karten.json", import.meta.url), "utf8"));
const by = (id) => ex.find((c) => c.id === id);
const v = (name, lang, extra = {}) => ({ name, lang, voiceURI: "com.apple.voice." + name, localService: true, ...extra });
const P = (o = {}) => ({ variant: "es", country: "", voices: { es: "", latam: "" }, speak: true, rate: 0.92, meaningDir: "de-es", ...o });

// Stimmen wie auf einem iPhone mit deutscher Systemsprache
const IPHONE = [
  v("Anna", "de-DE"), v("Samantha", "en-US"),
  v("Mónica", "es-ES"), v("Jorge", "es-ES"), v("Paulina", "es-MX"), v("Juan", "es-MX"), v("Diego", "es-AR"), v("Francisca", "es-CL"),
  v("Marisol (Premium)", "es-ES", { voiceURI: "com.apple.voice.premium.es-ES.Marisol" }),
  v("Angélica (Erweitert)", "es-MX", { voiceURI: "com.apple.voice.enhanced.es-MX.Angelica" }),
  v("Eddy (Spanisch (Spanien))", "es-ES"), v("Grandma (Spanisch (Mexiko))", "es-MX"), v("Flo", "es-ES"), v("Rocko", "es-MX"),
  v("Majed", "ar-001"), v("Daniel", "en-GB")
];
const names = (list) => list.map((x) => x.name);

test("nur spanische Stimmen, Spaßstimmen zuletzt (auch mit deutschem Zusatz)", () => {
  const r = names(rankVoices(IPHONE, P()));
  assert.ok(!r.includes("Anna") && !r.includes("Samantha") && !r.includes("Majed") && !r.includes("Daniel"));
  assert.deepEqual(r.slice(-4).sort(), ["Eddy (Spanisch (Spanien))", "Flo", "Grandma (Spanisch (Mexiko))", "Rocko"]);
  assert.equal(isSpanish(v("x", "es_MX")) && isSpanish(v("y", "es")), true);
  assert.equal(isSpanish(v("z", "est-EE")), false);
});
test("Spanien: die Aussprache der Variante zuerst, darin hochwertige vor normalen", () => {
  const r = names(rankVoices(IPHONE, P()));
  assert.deepEqual(r.slice(0, 3), ["Marisol (Premium)", "Mónica", "Jorge"], "alle es-ES-Stimmen vor den lateinamerikanischen, auch vor einer erweiterten");
  assert.ok(r.indexOf("Angélica (Erweitert)") > r.indexOf("Jorge"));
  const plain = IPHONE.filter((x) => qualityOf(x) === 0);
  assert.deepEqual(names(rankVoices(plain, P())).slice(0, 3), ["Mónica", "Jorge", "Paulina"]);
  assert.equal(bestVoice(IPHONE, P()).name, "Marisol (Premium)");
  assert.equal(bestVoice(plain, P()).name, "Mónica");
});
test("Lateinamerika: es-MX zuerst, es-ES zuletzt", () => {
  const plain = IPHONE.filter((x) => qualityOf(x) === 0);
  const r = names(rankVoices(plain, P({ variant: "latam" })));
  assert.deepEqual(r.slice(0, 2), ["Paulina", "Juan"]);
  assert.ok(r.indexOf("Mónica") > r.indexOf("Diego") && r.indexOf("Jorge") > r.indexOf("Francisca"), "Spanien-Stimmen nach den lateinamerikanischen");
  assert.equal(bestVoice(IPHONE, P({ variant: "latam" })).name, "Angélica (Erweitert)", "lateinamerikanisch, darin hochwertig vor normal");
  assert.equal(names(rankVoices(IPHONE, P({ variant: "latam" })))[0], "Angélica (Erweitert)");
  assert.equal(bestVoice(plain, P({ variant: "latam" })).name, "Paulina");
});
test("Lateinamerika mit Land: die Stimme des Landes zuerst, sonst es-MX", () => {
  const plain = IPHONE.filter((x) => qualityOf(x) === 0);
  assert.equal(bestVoice(plain, P({ variant: "latam", country: "ar" })).name, "Diego");
  assert.equal(bestVoice(plain, P({ variant: "latam", country: "cl" })).name, "Francisca");
  assert.equal(bestVoice(plain, P({ variant: "latam", country: "cr" })).name, "Paulina", "kein es-CR vorhanden → es-MX");
  assert.equal(targetLocale(P()), "es-ES");
  assert.equal(targetLocale(P({ variant: "latam" })), "es-MX");
  assert.equal(targetLocale(P({ variant: "latam", country: "co" })), "es-CO");
  assert.equal(targetLocale(P({ variant: "latam", country: "xx" })), "es-MX");
  assert.equal(langRank(v("a", "es-419"), P({ variant: "latam" })), 3);
  assert.equal(langRank(v("a", "es-US"), P({ variant: "latam" })), 2);
  assert.equal(langRank(v("a", "es-ES"), P({ variant: "latam" })), 1);
  assert.equal(langRank(v("a", "en-US"), P()), 0);
});
test("eine erweiterte Stimme der falschen Aussprache schlägt keine normale der richtigen", () => {
  const list = [v("Angélica (Erweitert)", "es-MX"), v("Mónica", "es-ES")];
  assert.equal(bestVoice(list, P()).name, "Mónica", "Spanien: ceceo statt seseo");
  assert.equal(bestVoice(list, P({ variant: "latam" })).name, "Angélica (Erweitert)");
  const only = [v("Marisol (Premium)", "es-ES")];
  assert.equal(bestVoice(only, P({ variant: "latam" })).name, "Marisol (Premium)", "gibt es nichts Passendes, gilt die vorhandene");
});
test("Lateinamerika: es-MX schlägt eine erweiterte Stimme aus einem anderen Land", () => {
  const list = [v("Carlos (Erweitert)", "es-CO"), v("Paulina", "es-MX"), v("Mónica", "es-ES")];
  assert.equal(bestVoice(list, P({ variant: "latam" })).name, "Paulina");
  assert.equal(bestVoice(list, P({ variant: "latam", country: "co" })).name, "Carlos (Erweitert)", "mit Land Kolumbien gewinnt Kolumbien");
  assert.deepEqual(names(rankVoices(list, P({ variant: "latam" }))), ["Paulina", "Carlos (Erweitert)", "Mónica"]);
});
test("Qualität erkennt Premium, Erweitert, Mejorada und Natural", () => {
  assert.equal(qualityOf(v("Marisol (Premium)", "es-ES")), 2);
  assert.equal(qualityOf(v("Jorge (Mejorada)", "es-ES")), 1);
  assert.equal(qualityOf(v("Microsoft Elvira Online (Natural) - Spanish (Spain)", "es-ES")), 1);
  assert.equal(qualityOf(v("Mónica", "es-ES", { voiceURI: "com.apple.voice.premium.es-ES.Monica" })), 2, "auch aus der voiceURI");
  assert.equal(qualityOf(v("Mónica", "es-ES")), 0);
});
test("Chrome und Windows: Google- und Microsoft-Stimmen", () => {
  const list = [
    v("Google español", "es-ES", { localService: false }), v("Google español de Estados Unidos", "es-US", { localService: false }),
    v("Microsoft Elvira Online (Natural) - Spanish (Spain)", "es-ES"), v("Microsoft Dalia Online (Natural) - Spanish (Mexico)", "es-MX")
  ];
  assert.equal(rankVoices(list, P())[0].name, "Microsoft Elvira Online (Natural) - Spanish (Spain)");
  assert.equal(rankVoices(list, P({ variant: "latam" }))[0].name, "Microsoft Dalia Online (Natural) - Spanish (Mexico)");
  assert.equal(rankVoices(list.slice(0, 2), P({ variant: "latam" }))[0].name, "Google español de Estados Unidos");
});
test("gewählte Stimme gilt je Variante; unbekannt oder nicht Spanisch fällt auf die automatische Wahl zurück", () => {
  const plain = IPHONE.filter((x) => qualityOf(x) === 0);
  const prefs = P({ voices: { es: "Jorge", latam: "Diego" } });
  assert.equal(savedVoice(prefs), "Jorge");
  assert.equal(bestVoice(plain, prefs).name, "Jorge");
  assert.equal(bestVoice(plain, { ...prefs, variant: "latam" }).name, "Diego");
  assert.equal(bestVoice(plain, P({ voices: { es: "Gibt es nicht", latam: "" } })).name, "Mónica");
  assert.equal(bestVoice(plain, P({ voices: { es: "Samantha", latam: "" } })).name, "Mónica", "eine englische Stimme wird nicht genommen");
  assert.equal(bestVoice([v("Anna", "de-DE")], P()), null);
  assert.equal(bestVoice(IPHONE, { variant: "es" }).name, "Marisol (Premium)", "ohne voices-Feld");
});
test("Anzeige, Vorlesetexte und Probe", () => {
  assert.equal(voiceLabel(IPHONE[9]), "Angélica · es-MX · Erweitert");
  assert.equal(voiceLabel(IPHONE[8]), "Marisol · es-ES · Premium");
  assert.equal(spokenTerm({ term: "tomar (una) decisión" }), "tomar decisión");
  assert.equal(spokenTerm({ term: "a / hacia" }), "a o hacia");
  assert.equal(spokenSentence(by("x02")), "Es posible que mañana llueva en el norte.");
  assert.equal(spokenSentence(by("x04"), "tomar"), "Para ir al trabajo suelo tomar el autobús de las ocho.");
  assert.ok(sampleFor(P()).includes("norte") && sampleFor(P({ variant: "latam" })).includes("sur"));
});

// Fake-Sprachausgabe
function fakeSpeech(list) {
  const spoken = [];
  class U { constructor(text) { this.text = text; } }
  const synth = { spoken, cancelled: 0, getVoices: () => list, cancel() { this.cancelled++; }, speak(u) { spoken.push(u); }, addEventListener(n, fn) { this.handler = fn; } };
  globalThis.window = { speechSynthesis: synth, SpeechSynthesisUtterance: U };
  globalThis.SpeechSynthesisUtterance = U;
  return synth;
}
const cleanup = () => { delete globalThis.window; delete globalThis.SpeechSynthesisUtterance; };

test("say: wählt die Stimme der Variante, setzt Sprache und Tempo, ruft done nach dem Ende", () => {
  const synth = fakeSpeech(IPHONE);
  try {
    initVoices();
    assert.equal(canSpeak(), true);
    let done = 0;
    say("Hola", P({ rate: 1.1 }), () => done++);
    const u = synth.spoken[0];
    assert.equal(u.voice.name, "Marisol (Premium)");
    assert.equal(u.lang, "es-ES");
    assert.equal(u.rate, 1.1);
    assert.equal(synth.cancelled, 1, "laufende Ausgabe wird abgebrochen");
    u.onend(); u.onend();
    assert.equal(done, 1, "done genau einmal");
    say("Hola", P({ variant: "latam" }));
    assert.equal(synth.spoken[1].lang, "es-MX");
    assert.equal(synth.spoken[1].voice.name, "Angélica (Erweitert)");
  } finally { cleanup(); }
});
test("say: Vorlesen aus, Probe mit force, Stimme vorgegeben, leere Texte", () => {
  const synth = fakeSpeech(IPHONE);
  try {
    initVoices();
    let done = 0;
    say("Hola", P({ speak: false }), () => done++);
    assert.equal(synth.spoken.length, 0);
    assert.equal(done, 1, "done wird trotzdem gerufen");
    say("Hola", P({ speak: false }), () => {}, { force: true });
    assert.equal(synth.spoken.length, 1);
    say("Hola", P(), () => {}, { voice: IPHONE.find((x) => x.name === "Diego") });
    assert.equal(synth.spoken[1].voice.name, "Diego");
    assert.equal(synth.spoken[1].lang, "es-AR");
    say("", P(), () => done++);
    assert.equal(synth.spoken.length, 2);
  } finally { cleanup(); }
});
test("say: ohne Spanisch-Stimme bekommt die Äußerung nur die Sprache der Variante; Fehler lassen die App weiterlaufen", () => {
  const synth = fakeSpeech([v("Anna", "de-DE")]);
  try {
    initVoices();
    say("Hola", P({ variant: "latam", country: "ar" }));
    assert.equal(synth.spoken[0].voice, undefined);
    assert.equal(synth.spoken[0].lang, "es-AR");
    let done = 0;
    synth.speak = () => { throw new Error("kaputt"); };
    say("Hola", P(), () => done++);
    assert.equal(done, 1);
    stopSpeaking();
  } finally { cleanup(); }
});
test("ohne Sprachausgabe im Browser: nichts geht kaputt", () => {
  cleanup();
  assert.equal(canSpeak(), false);
  let done = 0;
  say("Hola", P(), () => done++);
  assert.equal(done, 1);
  stopSpeaking();
  initVoices();
});
test("Stimmen kommen verzögert (Safari): Anmeldung wird bei der neuen Liste gerufen, Abmeldung funktioniert", () => {
  const list = [];
  const synth = fakeSpeech(list);
  try {
    initVoices();
    const seen = [];
    const off = onVoices((vs) => seen.push(vs.length));
    list.push(v("Mónica", "es-ES"), v("Paulina", "es-MX"));
    synth.handler();
    assert.deepEqual(seen, [2]);
    assert.equal(voices().length, 2);
    synth.handler();
    assert.deepEqual(seen, [2], "gleiche Liste: kein zweiter Aufruf");
    off();
    list.push(v("Jorge", "es-ES"));
    synth.handler();
    assert.deepEqual(seen, [2], "abgemeldet");
  } finally { cleanup(); }
});

test("Einstellung: Stimmen je Variante überstehen Speichern; Ungültiges wird bereinigt", () => {
  assert.deepEqual(createState().prefs.voices, { es: "", latam: "" });
  const s = normalize({ prefs: { voices: { es: "Jorge", latam: 5, zz: "x" } } });
  assert.deepEqual(s.prefs.voices, { es: "Jorge", latam: "" });
  assert.deepEqual(normalize({ prefs: { voices: "Jorge" } }).prefs.voices, { es: "", latam: "" });
  assert.notEqual(createState().prefs.voices, createState().prefs.voices, "keine geteilten Objekte");
});

test("was vorgelesen wird: nur Spanisches, nie etwas, das die Aufgabe verrät", () => {
  const c = by("x04");
  const plan = (mode, s, prefs = P()) => speechPlan(mode, c, s, prefs);
  // Karteikarten
  assert.equal(plan("cards", { flipped: false }), null);
  assert.equal(plan("cards", { flipped: true }).t, "coger el autobús. Para ir al trabajo suelo coger el autobús de las ocho.");
  // Bedeutung
  assert.equal(plan("meaning", { result: null }), null, "Deutsch → Spanisch: vor der Antwort nichts");
  assert.match(plan("meaning", { result: { ok: true } }).t, /^coger el autobús\. Para ir/);
  assert.deepEqual(plan("meaning", { result: null }, P({ meaningDir: "es-de" })), { k: "q", t: "coger el autobús" });
  assert.equal(plan("meaning", { result: { ok: true } }, P({ meaningDir: "es-de" })).t, "Para ir al trabajo suelo coger el autobús de las ocho.");
  // Auswahl, Lücke, Fehlersuche: erst nach der Antwort
  for (const m of ["choice", "gap", "error"]) {
    assert.equal(plan(m, { result: null }), null, m);
    assert.equal(plan(m, { result: { ok: false } }).t, "Para ir al trabajo suelo coger el autobús de las ocho.", m);
  }
  assert.equal(plan("translate", { result: null }), null);
  assert.equal(plan("translate", { result: { ok: true } }).k, "r");
  // Umformulieren und Erklären
  assert.equal(plan("rewrite", { ui: { stage: "write" } }), null);
  assert.equal(plan("rewrite", { ui: { stage: "judge" } }).k, "j");
  assert.equal(plan("explain", { ui: { stage: "write" } }).t, "coger el autobús");
  assert.ok(plan("explain", { ui: { stage: "judge" } }).t.includes("Para ir"));
  assert.equal(plan("unbekannt", {}), null);
});
test("Variante bestimmt, was gesprochen wird (Wendung und Lösung der eigenen Fassung)", () => {
  const c = by("x04");
  const latam = P({ variant: "latam", country: "mx" });
  assert.equal(speechPlan("cards", c, { flipped: true }, latam).t, "tomar el camión. Para ir al trabajo suelo tomar el autobús de las ocho.");
  const sub = speechPlan("gap", by("x02"), { result: {} }, P());
  assert.equal(sub.t, "Es posible que mañana llueva en el norte.", "Infinitiv in Klammern wird nicht mitgesprochen");
});
