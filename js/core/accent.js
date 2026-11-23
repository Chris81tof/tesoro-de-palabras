// Eingaben prüfen: Akzente (á é í ó ú ü) dürfen fehlen, ñ nie (año ≠ ano). ¿ ¡ und Satzzeichen am Ende sind egal.

const NT = "\u0001"; // Platzhalter für ñ und Ñ, damit die Tilde nicht mit entfernt wird
const NT_UP = "\u0002";

export function stripAccents(s) {
  return String(s).normalize("NFD")
    .replace(/n\u0303/g, NT).replace(/N\u0303/g, NT_UP)
    .replace(/[\u0300-\u036f]/g, "")
    .replace(new RegExp(NT, "g"), "\u00f1").replace(new RegExp(NT_UP, "g"), "\u00d1")
    .normalize("NFC");
}

export function clean(s) {
  return String(s).normalize("NFC").toLowerCase().replace(/[’‘]/g, "'").replace(/[¿¡]/g, "").trim()
    .replace(/[.!?,;:]+$/, "").replace(/\s+/g, " ").trim();
}

// answers: Liste richtiger Lösungen. Ergebnis:
//  kind "exact"  – genau richtig
//  kind "accent" – nur Akzent fehlt oder falsch: ok, aber mit Hinweis (hinted); im strengen Modus nicht ok
//  kind "wrong"
export function judge(answers, given, strict = false) {
  const g = clean(given);
  if (!g) return { ok: false, kind: "wrong", hinted: false };
  for (const a of answers) if (clean(a) === g) return { ok: true, kind: "exact", answer: a, hinted: false };
  const gs = stripAccents(g);
  for (const a of answers) {
    if (stripAccents(clean(a)) === gs) return strict ? { ok: false, kind: "accent", answer: a, hinted: false } : { ok: true, kind: "accent", answer: a, hinted: true };
  }
  return { ok: false, kind: "wrong", hinted: false };
}

// gleiche Wörter, wenn man Akzente ignoriert
export const sameWord = (a, b) => stripAccents(clean(a)) === stripAccents(clean(b));
