// Sprachausgabe: spanische Stimme automatisch passend zur Variante wählen (es-ES für Spanien, es-MX für Lateinamerika)
// oder aus den Einstellungen nehmen, vorlesen. Die Auswahl der Stimme gilt je Variante.
import { viewOf } from "./variants.js";

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

export const SAMPLES = {
  es: "Es posible que mañana llueva en el norte, pero seguro que sabremos tomar una decisión.",
  latam: "Es posible que mañana llueva en el sur, pero seguro que sabremos tomar una decisión."
};
export const sampleFor = (prefs) => SAMPLES[prefs.variant === "latam" ? "latam" : "es"];

// Sprache pro Land (iOS und Chrome kennen nicht alle Länder, dann gilt es-MX)
const LOCALE = { mx: "es-MX", ar: "es-AR", co: "es-CO", cl: "es-CL", pe: "es-PE", ve: "es-VE", uy: "es-UY", ec: "es-EC", bo: "es-BO", py: "es-PY", cu: "es-CU", do: "es-DO", gt: "es-GT", hn: "es-HN", sv: "es-SV", ni: "es-NI", pa: "es-PA", pr: "es-PR", cr: "es-CR" };

// Die Sprache, die zur Variante gehört: es-ES, ein Land oder es-MX
export function targetLocale(prefs) {
  if (prefs.variant !== "latam") return "es-ES";
  return (prefs.country && LOCALE[prefs.country]) || "es-MX";
}

// Bekannte gute Stimmen (Apple, Google, Microsoft), nach Sprache gemischt; die Reihenfolge entscheidet bei gleicher Sprache
const KNOWN = ["mónica", "monica", "marisol", "jorge", "paulina", "juan", "diego", "angélica", "angelica", "francisca", "jimena", "soledad", "carlos", "isabela", "luciana", "elvira", "álvaro", "alvaro", "dalia", "google español"];
// Spaß- und Effektstimmen von Apple (auch die deutschen Namen): nie automatisch wählen
const NOVELTY = new RegExp("^(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|" +
  "junior|ralph|fred|kathy|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley|monster|" +
  "flüstern|glocken|gute neuigkeiten|schlechte neuigkeiten|seifenblasen|spaßvogel|orgel|katrin|oma|opa)(\\s|\\(|$)", "i");

export const isSpanish = (v) => /^es([-_]|$)/i.test(v.lang || "");
const normLang = (v) => (v.lang || "").replace("_", "-").toLowerCase();

// Qualität: 2 = Premium, 1 = Enhanced/Erweitert/Mejorada/Natural, 0 = normal (Safari schreibt sie in Name oder voiceURI)
export function qualityOf(v) {
  const s = `${v.name} ${v.voiceURI || ""}`;
  if (/premium/i.test(s)) return 2;
  if (/enhanced|erweitert|mejorada|neural|natural/i.test(s)) return 1;
  return 0;
}

// Wie gut passt die Sprache der Stimme zur Variante? Höher ist besser.
//  Spanien: es-ES 4, sonst Spanisch 1.
//  Lateinamerika: Land 5, es-MX 4, es-419 3, es-US 2 und andere lateinamerikanische 2, es-ES 1.
export function langRank(v, prefs) {
  const l = normLang(v);
  if (!isSpanish(v)) return 0;
  if (prefs.variant !== "latam") return l === "es-es" ? 4 : 1;
  const target = targetLocale(prefs).toLowerCase();
  if (l === target) return 5;
  if (l === "es-mx") return 4;
  if (l === "es-419") return 3;
  if (l === "es-es") return 1;
  return 2;
}

const knownRank = (v) => {
  const n = v.name.toLowerCase();
  const i = KNOWN.findIndex((k) => n.startsWith(k));
  return i < 0 ? KNOWN.length : i;
};

// Gehört die Stimme zur Aussprache der Variante? Das Spanien-Spanisch (es-ES) und das Spanisch Lateinamerikas klingen verschieden
// (Spanien: ceceo, „z“ wie th; Lateinamerika: seseo). Darum zählt das vor der Qualität.
const group = (v, prefs) => ((normLang(v) === "es-es") === (prefs.variant !== "latam") ? 0 : 1);

// Spanische Stimmen, beste zuerst: Spaßstimmen zuletzt, dann die Aussprache der Variante, darin die genaue Sprache, dann hochwertige vor normalen
export function rankVoices(voices, prefs) {
  return voices.filter(isSpanish).slice().sort((a, b) => {
    const na = NOVELTY.test(a.name), nb = NOVELTY.test(b.name);
    if (na !== nb) return na ? 1 : -1;
    const ga = group(a, prefs), gb = group(b, prefs);
    if (ga !== gb) return ga - gb;
    // innerhalb der Gruppe: die genaue Sprache (es-MX oder das gewählte Land) vor anderen, dann hochwertige vor normalen
    return langRank(b, prefs) - langRank(a, prefs) || qualityOf(b) - qualityOf(a) || knownRank(a) - knownRank(b) || (b.localService ? 1 : 0) - (a.localService ? 1 : 0) || a.name.localeCompare(b.name);
  });
}

// Gewählte Stimme der Variante (falls es sie noch gibt und sie Spanisch spricht), sonst die beste
export const savedVoice = (prefs) => (prefs.voices && prefs.voices[prefs.variant === "latam" ? "latam" : "es"]) || "";

export function bestVoice(voices, prefs) {
  const name = savedVoice(prefs);
  const chosen = name && voices.find((v) => v.name === name && isSpanish(v));
  return chosen || rankVoices(voices, prefs)[0] || null;
}

export function voiceLabel(v) {
  const q = qualityOf(v);
  return `${v.name.replace(/\s*\((premium|enhanced|erweitert|mejorada)\)/i, "")} · ${(v.lang || "").replace("_", "-")}${q === 2 ? " · Premium" : q === 1 ? " · Erweitert" : ""}`;
}

// Safari meldet die Stimmen verzögert: auf voiceschanged warten und zur Sicherheit nachfragen.
let cache = [];
const listeners = new Set();

function refresh() {
  try {
    const v = window.speechSynthesis.getVoices();
    if (v.length && v.length !== cache.length) {
      cache = v;
      // Über eine Kopie laufen: Wer sich im Aufruf neu anmeldet, darf die Schleife nicht verlängern.
      [...listeners].forEach((fn) => fn(cache));
    }
  } catch { /* keine Sprachausgabe */ }
}

export function initVoices() {
  if (!canSpeak()) return;
  refresh();
  window.speechSynthesis.addEventListener?.("voiceschanged", refresh);
  let tries = 0;
  const poll = setInterval(() => { refresh(); if (++tries >= 20) clearInterval(poll); }, 250);
}

export const voices = () => cache;

// Wird bei jeder neuen Stimmenliste aufgerufen; gibt eine Abmeldefunktion zurück.
export function onVoices(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function stopSpeaking() {
  try { if (canSpeak()) window.speechSynthesis.cancel(); } catch { /* nichts zu tun */ }
}

// Spricht text und ruft danach done() auf, auch wenn die Ausgabe hängt (höchstens 14 Sekunden).
// force: auch sprechen, wenn Vorlesen ausgeschaltet ist (Probe in den Einstellungen).
export function say(text, prefs, done = () => {}, { force = false, voice } = {}) {
  if (!text || (!prefs.speak && !force) || !canSpeak()) { done(); return; }
  let finished = false;
  const fin = () => { if (!finished) { finished = true; clearTimeout(t); done(); } };
  const t = setTimeout(fin, 14000);
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = voice || bestVoice(cache.length ? cache : window.speechSynthesis.getVoices(), prefs);
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = targetLocale(prefs);
    u.rate = prefs.rate || 0.92;
    u.onend = fin;
    u.onerror = fin;
    window.speechSynthesis.speak(u);
  } catch {
    fin();
  }
}

// Wendung zum Vorlesen: Klammern weg, / als „o“, Mehrfachleerzeichen weg
export function spokenTerm(c) {
  return c.term.replace(/\([^)]*\)/g, " ").replace(/\//g, " o ").replace(/\s+/g, " ").trim();
}

// Beispielsatz mit eingesetzter Lösung; der Infinitiv in Klammern (Subjuntivo) wird nicht mitgesprochen
export function spokenSentence(c, answer) {
  if (!c.sentence) return "";
  const a = answer || String(c.answer).split("|")[0];
  return c.sentence.replace(/____(\s*\([^)]*\))?/, a).replace(/\s+/g, " ").trim();
}

// Was in welcher Phase einer Übung vorgelesen wird. k unterscheidet die Phasen, damit beim Neuzeichnen nichts doppelt gesprochen wird.
// Es wird nur Spanisches gesprochen, und nie etwas, das die Aufgabe verrät. s: die laufende Runde (result, flipped, ui, prefs).
export function speechPlan(mode, c, s, prefs) {
  const shown = viewOf(c, prefs).shown;
  const t = spokenTerm({ term: shown.term });
  const sn = spokenSentence(c, shown.answers[0]);
  const both = sn ? t + ". " + sn : t;
  const judged = s.ui && s.ui.stage === "judge";
  switch (mode) {
    case "cards": return s.flipped ? { k: "b", t: both } : null;
    case "meaning":
      if (prefs.meaningDir === "es-de") return s.result ? { k: "r", t: sn } : { k: "q", t };
      return s.result ? { k: "r", t: both } : null; // Deutsch → Spanisch: erst nach der Antwort
    case "choice": case "gap": case "error": return s.result ? { k: "r", t: sn } : null;
    case "translate": return s.result ? { k: "r", t: both } : null;
    case "rewrite": case "produce": return judged || s.result ? { k: "j", t: sn } : null;
    case "explain": return judged ? { k: "j", t: both } : { k: "w", t };
  }
  return null;
}

