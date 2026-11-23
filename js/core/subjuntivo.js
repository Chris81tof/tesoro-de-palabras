// Subjuntivo-Karten: Die Lücke fällt auf das konjugierte Verb, der Infinitiv steht in Klammern dahinter.
import { answersOf } from "./cards.js";

export const isSubjuntivo = (c) => !!(c && c.trigger);

// „____ (venir)“ → "venir"
export function gapInfinitive(sentence) {
  const m = /____\s*\(([^)]+)\)/.exec(String(sentence));
  return m ? m[1].trim() : "";
}

// Mehrere richtige Formen = beide Modi möglich
export const bothModes = (c) => answersOf(c).length > 1;

// Hinweisstufe 1 nennt nur den Auslöser, nie den Modus (der erscheint erst bei der Lösung).
export function triggerHint(c) {
  return isSubjuntivo(c) ? `Auslöser: „${c.trigger}“` : "";
}

export const MODE_WORDS = /subjuntivo|subjunctive|konjunktiv|indicativo|indikativ|modus|modo/i;

function shuffled(a, rand) {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Auswahl für Subjuntivo-Lücken: die erste Lösung plus die drei falschen Formen der Karte.
// Es werden keine Formen erfunden oder von anderen Karten geborgt, denn jede könnte hier gültig sein.
export function gapOptions(c, rand = Math.random) {
  if (!Array.isArray(c.wrong) || c.wrong.length < 3) return null;
  return shuffled([answersOf(c)[0], ...c.wrong.slice(0, 3)], rand);
}
