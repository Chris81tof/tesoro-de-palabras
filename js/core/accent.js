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

// Wörter, bei denen der Akzent die Bedeutung ändert (si/sí, esta/está …). Ein Fehler hier ist nie „nur ein Akzent“.
// Die Liste enthält beide Schreibweisen; sie lässt sich erweitern.
const PAIRS = [
  "si sí", "el él", "mas más", "te té", "se sé", "tu tú", "de dé", "mi mí", "aun aún", "esta está", "este esté", "ese ése",
  "que qué", "quien quién", "quienes quiénes", "cual cuál", "cuales cuáles", "cuando cuándo", "como cómo", "donde dónde", "adonde adónde",
  "cuanto cuánto", "cuantos cuántos", "cuanta cuánta", "papa papá", "mama mamá", "sabana sábana", "animo ánimo", "ultimo último", "publico público",
  "practico práctico", "critico crítico", "numero número", "termino término", "titulo título", "limite límite", "medico médico", "capitulo capítulo"
].flatMap((g) => g.split(" "));
const PAIR_FORMS = new Set(PAIRS);
// Wörter auf -ó (außer -ió) sind Verben im Perfekt (habló ≠ hablo, creó ≠ creo), also ebenfalls nicht verhandelbar.
// llovió/llovio bleibt locker, weil „llovio“ kein Wort ist.
const meaningWord = (w) => PAIR_FORMS.has(w) || /^[a-zñ]{2,}[^i]ó$/.test(w);

// Ändert der Akzentunterschied zwischen richtiger und getippter Antwort die Bedeutung eines Wortes?
export function accentChangesMeaning(right, given) {
  const a = clean(right).split(" "), g = clean(given).split(" ");
  if (a.length !== g.length) return false;
  return a.some((w, i) => w !== g[i] && stripAccents(w) === stripAccents(g[i]) && (meaningWord(w) || meaningWord(g[i])));
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
    if (stripAccents(clean(a)) === gs && accentChangesMeaning(a, g)) return { ok: false, kind: "meaning", answer: a, hinted: false };
    if (stripAccents(clean(a)) === gs) return strict ? { ok: false, kind: "accent", answer: a, hinted: false } : { ok: true, kind: "accent", answer: a, hinted: true };
  }
  return { ok: false, kind: "wrong", hinted: false };
}

// gleiche Wörter, wenn man Akzente ignoriert
export const sameWord = (a, b) => stripAccents(clean(a)) === stripAccents(clean(b));
