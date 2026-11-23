// Kartenformat und Prüfung. Regeln siehe CLAUDE.md, Abschnitt „Kartenformat“.
import { stripAccents } from "./accent.js";

export const AREAS = { allgemein: "Allgemein", schule: "Schulgespräche" };
export const CATS = ["Kollokation", "Verb + Präposition", "Subjuntivo-Auslöser", "Feste Wendung", "Wortbildung", "Idiom", "Konnektor", "Falscher Freund", "Sonstiges"];
export const SUBJ_CAT = "Subjuntivo-Auslöser";
// Register: f gilt auch für höflich und Amtssprache
export const REG = { i: "informal", f: "formal", n: "neutral", d: "veraltet", c: "umgangssprachlich", s: "Slang" };
// Themen der Schulgespräche (nur area „schule“)
export const TOPICS = ["Elternsprechtag", "Elterngespräch", "Schülergespräch", "Fehlzeiten", "Ordnungsmaßnahmen", "Sonstiges"];
// Regionen: es = Spanien, latam = ganz Lateinamerika, sonst ein Land
export const REGION = {
  es: "Spanien", latam: "Lateinamerika", mx: "Mexiko", ar: "Argentinien", cr: "Costa Rica", co: "Kolumbien", cl: "Chile", pe: "Peru",
  ve: "Venezuela", uy: "Uruguay", ec: "Ecuador", bo: "Bolivien", py: "Paraguay", cu: "Kuba", do: "Dominikanische Republik",
  gt: "Guatemala", hn: "Honduras", sv: "El Salvador", ni: "Nicaragua", pa: "Panama", pr: "Puerto Rico"
};
// Modus bei Subjuntivo-Auslösern: subj = Subjuntivo, ind = Indikativ, both = beide möglich (dann stehen beide Formen in „answer“)
export const MODES = { subj: "Subjuntivo", ind: "Indikativ", both: "Subjuntivo oder Indikativ" };
export const modeLabel = (c) => MODES[c && c.mode] || "";
// Wörter, die den Modus verraten; sie dürfen in Hinweisen vor der Lösung nicht vorkommen
export const MODE_WORDS = /subjuntivo|subjunctive|konjunktiv|indicativo|indikativ|modus|modo/i;
export const XREF_LANGS = ["IT", "FR", "PT", "DE", "EN"];
export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const str = (v) => (typeof v === "string" ? v.trim() : "");
export const norm = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim().replace(/[.!?¡¿,;:]+$/, "").trim();
export const answersOf = (card) => String(card.answer || "").split("|").map((a) => a.trim()).filter(Boolean);
export const gapCount = (s) => String(s).split("____").length - 1;
// Infinitiv in Klammern direkt hinter der Lücke: „____ (venir)“
export const HAS_INF = /____\s*\([a-záéíóúüñ]+\)/i;

// Großgeschriebene Wörter mitten im Satz (mögliche Eigennamen). Satzanfänge, Fragezeichen und Anführungszeichen zählen nicht.
const ALLOWED_CAPS = new Set(["Estado", "España", "Latinoamérica", "América", "Dios", "Gobierno", "Ministerio", "Consejería"]);
export function properNames(text) {
  const out = [];
  const re = /(^|[.!?¡¿:«»"“”]\s*|\s)(\p{Lu}[\p{L}]+)/gu;
  let m;
  while ((m = re.exec(String(text)))) {
    const startsSentence = m[1] === "" || /[.!?¡¿:«»"“”]/.test(m[1]);
    if (!startsSentence && !ALLOWED_CAPS.has(m[2])) out.push(m[2]);
  }
  return out;
}

// Ganzes Wort oder ganze Wortfolge im Text (ohne Rücksicht auf Groß-/Kleinschreibung)
export function hasPhrase(text, phrase) {
  const p = norm(phrase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return !!p && new RegExp(`(^|[^\\p{L}])${p}($|[^\\p{L}])`, "iu").test(String(text));
}

// Was die Bedeutungsübung und das Erklären als Frage zeigen: deutsche Bedeutung, sonst spanische Erklärung
export const cue = (c) => c.de || c.prompt || "";

// Verrät ein eigener Hinweis die Lösung? Lösungswörter ab 3 Buchstaben (auch Varianten) oder die ganze Wendung, als ganze Wörter.
export function hintLeaksSolution(c) {
  if (!c.hint) return false;
  const sols = [...answersOf(c), ...(c.variants || []).flatMap((v) => String(v.answer || "").split("|")), c.term, ...(c.variants || []).map((v) => v.term)]
    .map((x) => String(x || "").trim()).filter((x) => [...x].filter((ch) => /\p{L}/u.test(ch)).length >= 3);
  return sols.some((x) => hasPhrase(stripAccents(c.hint), stripAccents(x)));
}

// Prüft eine Karte und gibt Fehlermeldungen (deutsch) zurück. Verändert nichts.
export function cardErrors(c) {
  const e = [];
  const name = c && c.term ? `„${c.term}“` : "Karte";
  const add = (m) => e.push(`${name}: ${m}`);
  if (!c || typeof c !== "object") return ["Kein Kartenobjekt."];
  if (!(c.area in AREAS)) add("area muss „allgemein“ oder „schule“ sein.");
  if (!CATS.includes(c.cat)) add("Unbekannte Kategorie.");
  if (!str(c.term)) add("Die Wendung fehlt.");
  if (!str(c.de)) add("Die deutsche Bedeutung fehlt.");
  if (gapCount(c.sentence) !== 1) add("Der Satz braucht genau eine Lücke aus vier Unterstrichen (____).");
  const ans = answersOf(c);
  if (!ans.length) add("Die Lösung fehlt.");
  if (c.wrong !== undefined) {
    const w = Array.isArray(c.wrong) ? c.wrong.map(str).filter(Boolean) : [];
    const valid = new Set([...ans, ...(c.variants || []).flatMap((v) => (v.answer ? String(v.answer).split("|") : []))].map(norm));
    if (w.length !== 3 || new Set(w.map(norm)).size !== 3) add("„wrong“ braucht drei verschiedene falsche Optionen.");
    else if (w.some((x) => valid.has(norm(x)))) add("Eine falsche Option ist zugleich richtig (auch als Variante).");
  }
  if (c.reg !== undefined && !(c.reg in REG)) add("Unbekanntes Register.");
  if (c.region !== undefined && !(c.region in REGION)) add("Unbekannte Region.");
  if (c.level !== undefined && !LEVELS.includes(c.level)) add("Niveau nur A1 bis C2.");
  if (c.unsure !== undefined && typeof c.unsure !== "boolean") add("„unsure“ muss wahr oder falsch sein.");
  if (c.variants !== undefined) {
    if (!Array.isArray(c.variants)) add("„variants“ muss eine Liste sein.");
    else c.variants.forEach((v, i) => {
      const at = `Variante ${i + 1}`;
      if (!v || !(v.region in REGION)) add(`${at}: Region fehlt oder ist unbekannt.`);
      if (!str(v && v.term)) add(`${at}: Die Wendung fehlt.`);
      if (!v || (!v.vulgar && !str(v.example))) add(`${at}: Ein Beispiel fehlt.`);
      if (v && v.answer) {
        const mine = ans.map(norm);
        if (!String(v.answer).split("|").every((a) => mine.includes(norm(a)))) add(`${at}: Die Lösung der Variante steht nicht in „answer“.`);
      }
      if (v && v.vulgar !== undefined && typeof v.vulgar !== "boolean") add(`${at}: „vulgar“ muss wahr oder falsch sein.`);
    });
  }
  if (c.topic !== undefined) {
    if (c.area !== "schule") add("„topic“ gibt es nur bei Schulgesprächen.");
    else if (!TOPICS.includes(c.topic)) add("Unbekanntes Thema.");
  }
  if (c.area === "schule" && c.topic === undefined) add("Schulgespräche brauchen ein „topic“.");
  if (c.cat === SUBJ_CAT && !str(c.trigger)) add("Subjuntivo-Karten brauchen einen „trigger“.");
  if (c.cat === SUBJ_CAT && c.mode === undefined) add("Subjuntivo-Karten brauchen einen „mode“ (subj, ind oder both).");
  if (c.mode !== undefined && !(c.mode in MODES)) add("„mode“ muss subj, ind oder both sein.");
  if (c.mode === "both" && ans.length < 2) add("Bei „both“ müssen beide Formen in „answer“ stehen.");
  if ((c.cat === SUBJ_CAT || c.trigger) && c.hint && MODE_WORDS.test(c.hint)) add("Der eigene Hinweis darf den Modus nicht nennen.");
  if (c.trigger !== undefined && !HAS_INF.test(c.sentence || "")) add("Bei Subjuntivo steht der Infinitiv in Klammern hinter der Lücke, z. B. „____ (venir)“.");
  if (c.xref !== undefined) {
    if (!c.xref || typeof c.xref !== "object" || Array.isArray(c.xref) || !Object.keys(c.xref).length) add("„xref“ braucht Einträge je Sprache.");
    else if (Object.entries(c.xref).some(([k, v]) => !XREF_LANGS.includes(k) || !str(v))) add("„xref“ erlaubt nur IT, FR, PT, DE, EN mit Text.");
  }
  if (c.hint && hintLeaksSolution(c)) add("Der eigene Hinweis verrät die Lösung.");
  if (c.plain) {
    // Die schlichte Fassung (Umformulieren) darf Wendung und Auslöser nicht als Ganzes enthalten und kein Lösungswort ab 4 Buchstaben.
    // Kurze Lösungen (de, en, a …) bleiben außen vor, sonst fiele fast jede Verb + Präposition-Karte durch.
    const long = ans.filter((a) => [...a].filter((ch) => /\p{L}/u.test(ch)).length >= 4);
    const leaks = [c.term, c.trigger, ...long].filter(Boolean).filter((x) => hasPhrase(c.plain, x));
    if (leaks.length) add(`„plain“ enthält ${[...new Set(leaks)].map((x) => `„${x}“`).join(", ")}.`);
  }
  if (c.area === "schule") {
    const texts = [c.term, c.sentence, c.plain, c.prompt,...(c.variants || []).map((v) => v.example)].filter(Boolean);
    const found = texts.flatMap(properNames);
    if (found.length) add(`Mögliche Eigennamen (in Schulgesprächen nicht erlaubt): ${[...new Set(found)].join(", ")}.`);
  }
  return e;
}
