// Varianten: Spanien oder Lateinamerika (mit Land). Zeigt zuerst die eigene Fassung einer Karte.
import { REGION, answersOf } from "./cards.js";
import { sameWord } from "./accent.js";

// Regionen der eigenen Variante, die genaueste zuerst: Land, dann Lateinamerika
export function regionsOf(prefs) {
  if (prefs.variant === "latam") return prefs.country && prefs.country !== "latam" && prefs.country !== "es" ? [prefs.country, "latam"] : ["latam"];
  return ["es"];
}

export const regionLabel = (r) => REGION[r] || r;
const split = (a) => String(a || "").split("|").map((x) => x.trim()).filter(Boolean);

// Gilt eine Warnung für diesen Nutzer? Wer in Lateinamerika ohne Land lernt, bekommt Warnungen für jedes Land dort.
function warnApplies(region, prefs) {
  if (regionsOf(prefs).includes(region)) return true;
  return prefs.variant === "latam" && !prefs.country && region !== "es";
}

// Lösungen der Hauptform: alle, die keine (nicht vulgäre) Variante für sich beansprucht, ohne die für den Nutzer vulgären.
function mainAnswers(card, prefs) {
  const variants = card.variants || [];
  const claimed = new Set(variants.filter((v) => !v.vulgar).flatMap((v) => split(v.answer)).map((a) => a.toLowerCase()));
  const vulgarForMe = new Set(variants.filter((v) => v.vulgar && warnApplies(v.region, prefs)).flatMap((v) => split(v.answer)).map((a) => a.toLowerCase()));
  const all = answersOf(card);
  const own = all.filter((a) => !claimed.has(a.toLowerCase()) && !vulgarForMe.has(a.toLowerCase()));
  if (own.length) return own;
  const safe = all.filter((a) => !vulgarForMe.has(a.toLowerCase()));
  return [(safe.length ? safe : all)[0]];
}

// Was der Nutzer zuerst sieht:
//  shown    – { term, answers, region, unsure, example? } die Fassung seiner Variante
//  others   – übrige Fassungen (für „Auch:“), ohne vulgäre
//  warnings – vulgäre Formen, die für ihn gelten
//  foreign  – die Karte gilt nur in einer anderen Region und hat keine Fassung für ihn
export function viewOf(card, prefs) {
  const variants = card.variants || [];
  const fine = variants.filter((v) => !v.vulgar);
  const mine = regionsOf(prefs);
  let own = null;
  for (const r of mine) {
    own = fine.find((v) => v.region === r);
    if (own) break;
  }
  const main = { term: card.term, answers: mainAnswers(card, prefs), region: card.region || null, unsure: !!card.unsure, example: card.sentence };
  const asView = (v) => ({ term: v.term, answers: split(v.answer).length ? split(v.answer) : main.answers, region: v.region, unsure: !!v.unsure, example: v.example });
  const shown = own ? asView(own) : main;
  const others = [...(own ? [main] : []), ...fine.filter((v) => v !== own).map(asView)];
  const warnings = variants.filter((v) => v.vulgar && warnApplies(v.region, prefs)).map((v) => ({ region: v.region, term: v.term, answers: split(v.answer) }));
  const foreign = !own && !!card.region && !mine.includes(card.region);
  return { shown, others, warnings, foreign };
}

// Rückmeldung zu einer richtigen Eingabe (matched = die erkannte Lösung)
//  mine    – gehört zur eigenen Variante
//  message – „richtig, in deiner Variante: …“ oder null
//  warning – Warnung bei vulgärer Form oder null
export function feedback(card, matched, prefs) {
  const v = viewOf(card, prefs);
  const mine = v.shown.answers.some((a) => sameWord(a, matched));
  const bad = v.warnings.find((w) => w.answers.some((a) => sameWord(a, matched)));
  return {
    mine,
    message: mine ? null : `richtig, in deiner Variante: ${v.shown.term}`,
    warning: bad ? `„${matched}“ gilt in ${regionLabel(bad.region)} als vulgär.` : null,
    yours: v.shown.answers[0]
  };
}
