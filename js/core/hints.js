// Gestufte Hinweise für Übungen mit freier Eingabe (Lückentext, Übersetzen).
// Stufe 1: Kategorie (bei Subjuntivo nur der Auslöser) und Gerüst, Stufe 2: Anfangsbuchstaben, Stufe 3: Auswahl aus 4 Optionen.
// Vor Stufe 3 verrät nichts die Lösung vollständig. Der Modus (Subjuntivo/Indikativ) wird nie genannt.
import { clean, stripAccents } from "./accent.js";
import { answersOf } from "./cards.js";
import { key } from "./match.js";
import { viewOf } from "./variants.js";
import { isSubjuntivo, gapOptions as subjOptions } from "./subjuntivo.js";
import { meaningOptions } from "./meaning.js";

export const MAX_HINT = 3;
const isLetter = (ch) => /[\p{L}\p{N}]/u.test(ch);

// Ziel eines Hinweises: bei Lücken die erste Lösung der eigenen Variante, bei Wendungen deren Vergleichsform (ohne Artikel).
export const gapTarget = (answer) => ({ text: String(answer).split("|")[0].trim(), isTerm: false });
export const termTarget = (term) => ({ text: String(term).trim(), isTerm: true });

export function wordsOf(target) {
  const t = target.isTerm ? key(target.text, true) : clean(target.text);
  const w = t.split(" ").filter(Boolean);
  return w.length ? w : String(target.text).split(/\s+/).filter(Boolean);
}

// "_ _ _ _  _ _ _ _"; mit first erscheint der erste Buchstabe jedes Wortes mit mindestens zwei Buchstaben.
export function scaffold(words, first = false) {
  return words.map((w) => {
    const n = [...w].filter(isLetter).length;
    return [...w].map((ch, i) => (isLetter(ch) && !(first && n >= 2 && i === 0) ? "_" : ch)).join(" ");
  }).join("  ");
}

// Text für Stufe 1 und 2, z. B. "Kollokation, 2 Wörter: _ _ _ _ _ _  _ _ _ _".
// Bei Subjuntivo-Karten steht der Auslöser statt der Kategorie, denn die Kategorie nennt den Modus.
// Gesucht ist der Auslöser selbst (Übersetzen): dann steht dort gar nichts, sonst wäre er verraten.
export function hintLine(card, target, level) {
  const w = wordsOf(target);
  const head = isSubjuntivo(card) ? (target.isTerm ? "" : `Auslöser: „${card.trigger}“`) : card.cat;
  return `${head}${head ? ", " : ""}${w.length} ${w.length === 1 ? "Wort" : "Wörter"}: ${scaffold(w, level >= 2)}`;
}

function shuffled(a, rand = Math.random) {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// bis zu 4 gemischte Optionen: die Lösung plus Ablenker aus tiers (die erste Liste hat Vorrang).
// exclude: Schreibweisen, die ebenfalls richtig sind und nie als Ablenker erscheinen dürfen.
export function buildOptions(solution, tiers, exclude = [], rand = Math.random) {
  const seen = new Set([solution, ...exclude].map((x) => stripAccents(clean(x))));
  const pick = [];
  for (const tier of tiers) {
    for (const cand of shuffled(tier, rand)) {
      const k = stripAccents(clean(cand));
      if (!k || seen.has(k)) continue;
      seen.add(k);
      pick.push(cand);
      if (pick.length === 3) return shuffled([solution, ...pick], rand);
    }
  }
  return shuffled([solution, ...pick], rand);
}

const validAnswers = (card) => [...answersOf(card), ...(card.variants || []).flatMap((v) => String(v.answer || "").split("|"))].map((a) => a.trim()).filter(Boolean);

// Optionen für ein Lückenwort in der Form der eigenen Variante, oder null, wenn keine sinnvolle Auswahl möglich ist.
//  - Subjuntivo: nur die falschen Formen der Karte (nie erfundene, sie könnten gültig sein)
//  - sonst: die falschen Optionen der Karte; fehlen sie, Lösungen anderer Karten derselben Kategorie, zuletzt anderer Karten
export function gapHintOptions(card, cards, prefs, rand = Math.random) {
  const sol = viewOf(card, prefs).shown.answers[0];
  const hasWrong = Array.isArray(card.wrong) && card.wrong.length >= 3;
  if (isSubjuntivo(card)) return hasWrong ? shuffled([sol, ...card.wrong.slice(0, 3)], rand) : null;
  const other = (o) => viewOf(o, prefs).shown.answers[0];
  const same = cards.filter((o) => o.id !== card.id && o.cat === card.cat && o.answer).map(other);
  const rest = cards.filter((o) => o.id !== card.id && o.cat !== card.cat && o.answer).map(other);
  const opts = buildOptions(sol, [hasWrong ? card.wrong : [], same, rest], validAnswers(card), rand);
  return opts.length >= 2 ? opts : null;
}

// Optionen für eine Lücke in einem Text. answer: Lösung der Lücke (ggf. mit |), others: Lösungen der anderen Lücken desselben Textes.
// card kann fehlen (entfernte Karte). Bei Subjuntivo nur die falschen Formen der Karte.
export function textGapHintOptions(card, cards, answer, others, prefs, rand = Math.random) {
  const own = String(answer).split("|").map((a) => a.trim());
  const sol = own[0];
  const hasWrong = card && Array.isArray(card.wrong) && card.wrong.length >= 3 && own.some((a) => answersOf(card).some((b) => clean(b) === clean(a)));
  if (card && isSubjuntivo(card)) return hasWrong ? shuffled([sol, ...card.wrong.slice(0, 3)], rand) : null;
  const c = card || { id: "", cat: "" };
  const first = (o) => viewOf(o, prefs).shown.answers[0];
  const same = cards.filter((o) => o.id !== c.id && o.cat === c.cat && o.answer).map(first);
  const rest = cards.filter((o) => o.id !== c.id && o.cat !== c.cat && o.answer).map(first);
  const opts = buildOptions(sol, [hasWrong ? card.wrong : [], others, same, rest], [...own, ...(card ? validAnswers(card) : [])], rand);
  return opts.length >= 2 ? opts : null;
}

// Optionen für eine Wendung (Übersetzen): Wendungen anderer Karten in der Fassung der eigenen Variante
export function termHintOptions(card, cards, prefs, rand = Math.random) {
  return meaningOptions(card, cards, { ...prefs, meaningDir: "de-es" }, rand).options.map((o) => o.t);
}

export { hintLeaksSolution as hintLeaks } from "./cards.js";
