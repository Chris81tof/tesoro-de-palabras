// Übungsarten: Name, Übungsstufe, geschätzte Minuten je Karte und welche Daten eine Karte dafür braucht.
// Wie weit eine Übung den Lernstand hebt, steht in srs.js (CAP). Stufe 5 kommt in Schritt 5.
import { cue as cueOf } from "./cards.js";

export const cue = cueOf;
export const ans0 = (c) => (c.answer || "").split("|")[0];
export const hasGap = (c) => !!(c.sentence && c.answer);
export const hasWrong = (c) => Array.isArray(c.wrong) && c.wrong.length >= 3;

export const LEVELS = { 1: "Stufe 1 · Verstehen", 2: "Stufe 2 · Erkennen", 3: "Stufe 3 · Abrufen", 4: "Stufe 4 · Prüfen" };

export const MODES = {
  meaning: {
    label: "Bedeutung", lv: 1, est: 0.5,
    need: (c, cards) => !!cue(c) && cards.filter((x) => cue(x)).length >= 4,
    desc: "Wähle die richtige Bedeutung. Gut für den ersten Kontakt. Zählt bis Stufe 1."
  },
  cards: {
    label: "Karteikarten", lv: 1, est: 0.5,
    need: (c) => !!c.term,
    desc: "Erst überlegen, dann umdrehen und dich selbst bewerten. Zählt bis Stufe 2."
  },
  explain: {
    label: "Erklären", lv: 1, est: 2,
    need: (c) => !!(c.de || c.prompt),
    desc: "Erkläre Bedeutung, Register und Unterschiede selbst, dann vergleiche. Selbstbewertung. Zählt bis Stufe 2."
  },
  choice: {
    label: "Auswahl", lv: 2, est: 0.6,
    need: (c) => hasGap(c) && hasWrong(c),
    desc: "Welche Option passt in den Satz? Zählt bis Stufe 1."
  },
  gap: {
    label: "Lückentext", lv: 3, est: 1,
    need: hasGap,
    desc: "Das fehlende Wort selbst eintippen. Bei Subjuntivo steht der Infinitiv in Klammern, und die Form musst du konjugieren."
  },
  translate: {
    label: "Übersetzen", lv: 3, est: 1,
    need: (c) => !!cue(c),
    desc: "Wie heißt die Wendung auf Spanisch? Bedeutung auf Deutsch, du tippst den Ausdruck."
  },
  error: {
    label: "Fehlersuche", lv: 4, est: 0.8,
    need: (c) => hasGap(c) && hasWrong(c),
    desc: "Ist der Satz korrekt? Wenn nicht, tippst du die Korrektur ein."
  }
};

// Reihenfolge im Tagesplan: von leicht zu schwer
export const ORDER = ["meaning", "choice", "gap", "translate", "error", "cards", "explain"];
