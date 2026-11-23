// Eingaben bewerten: Akzent-Nachsicht, Variante der Karte, Warnung bei vulgären Formen.
import { judge } from "./accent.js";
import { answersOf } from "./cards.js";
import { key, variantsOf } from "./match.js";
import { feedback, viewOf, regionLabel } from "./variants.js";

// Lückenwort. Ergebnis:
//  ok, hinted (nur Akzent falsch: richtig mit Hinweis), kind: exact | accent | wrong,
//  accentAnswer (so wird es richtig geschrieben), expected (Lösungen der eigenen Variante),
//  variantMsg („richtig, in deiner Variante: …“), warning (vulgär)
export function gradeGap(card, given, prefs) {
  const j = judge(answersOf(card), given, prefs.strictAccents);
  const view = viewOf(card, prefs);
  const out = { ok: j.ok, hinted: j.ok && j.hinted, kind: j.kind, accentAnswer: j.kind === "accent" || j.kind === "meaning" ? j.answer : null, expected: view.shown.answers, variantMsg: null, warning: null };
  if (j.ok) {
    const f = feedback(card, j.answer, prefs);
    out.variantMsg = f.message;
    out.warning = f.warning;
  }
  return out;
}

// Wendung auf Spanisch: ohne Artikel erlaubt, ein Zusatz nach der Wendung ist erlaubt.
export function gradeTerm(card, given, prefs) {
  const terms = variantsOf(card).map((t) => key(t, true)).filter(Boolean);
  const kg = key(given, true);
  const view = viewOf(card, prefs);
  const out = { ok: false, hinted: false, kind: "wrong", accentAnswer: null, expected: [view.shown.term], variantMsg: null, warning: null };
  if (!kg) return out;
  let j = judge(terms, kg, prefs.strictAccents);
  if (!j.ok && j.kind !== "accent" && j.kind !== "meaning") {
    for (const t of terms) {
      if (kg.startsWith(t + " ")) { j = judge([t], kg.slice(0, t.length), prefs.strictAccents); if (j.ok || j.kind === "accent" || j.kind === "meaning") break; }
    }
  }
  out.kind = j.kind;
  out.ok = j.ok;
  out.hinted = j.ok && j.hinted;
  if (j.kind === "accent" || j.kind === "meaning") out.accentAnswer = j.answer;
  if (j.ok) {
    const match = key(j.answer, true);
    const mine = key(view.shown.term, true);
    const other = view.others.find((o) => key(o.term, true) === match);
    if (match !== mine && other) out.variantMsg = `richtig, in deiner Variante: ${view.shown.term}`;
  }
  // Vulgäre Fassung getippt?
  const bad = view.warnings.find((w) => key(w.term, true) === key(given, true) || kg.startsWith(key(w.term, true) + " "));
  if (bad) out.warning = `„${bad.term}“ gilt in ${regionLabel(bad.region)} als vulgär.`;
  return out;
}

// Ergebnis nach Hinweisen: richtig mit Hinweis bleibt auf der Stufe und ist morgen wieder fällig (srs.record, hinted).
export function withHint(result, hintLevel) {
  const used = hintLevel > 0;
  return { ...result, hintUsed: used, hinted: result.ok && (result.hinted || used) };
}

// „Lösung zeigen“ zählt als falsch
export function revealResult(expected) {
  return { ok: false, hinted: false, hintUsed: true, revealed: true, kind: "wrong", given: "", expected: Array.isArray(expected) ? expected : [expected], accentAnswer: null, variantMsg: null, warning: null };
}

// Auswahl einer Hinweisoption, die richtig ist
export function pickedResult(text) {
  return { ok: true, hinted: true, hintUsed: true, kind: "exact", given: text, expected: [text], accentAnswer: null, variantMsg: null, warning: null };
}
