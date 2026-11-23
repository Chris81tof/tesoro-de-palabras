// Sprachausgabe. Die Stimmenwahl kommt in Schritt 10; hier stehen nur die Texte, die vorgelesen werden.
// say() ruft done() sofort auf, solange es keine Sprachausgabe gibt.

export const canSpeak = () => false;
export function say(text, prefs, done = () => {}) { done(); }
export function stopSpeaking() { /* nichts zu tun */ }

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
