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
  const out = { ok: j.ok, hinted: j.ok && j.hinted, kind: j.kind, accentAnswer: j.kind === "accent" ? j.answer : null, expected: view.shown.answers, variantMsg: null, warning: null };
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
  if (!j.ok && j.kind !== "accent") {
    for (const t of terms) {
      if (kg.startsWith(t + " ")) { j = judge([t], kg.slice(0, t.length), prefs.strictAccents); if (j.ok || j.kind === "accent") break; }
    }
  }
  out.kind = j.kind;
  out.ok = j.ok;
  out.hinted = j.ok && j.hinted;
  if (j.kind === "accent") out.accentAnswer = j.answer;
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
