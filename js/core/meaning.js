// Stufe 1 · Bedeutung: Auswahl in beide Richtungen.
//  de-es: Deutsch steht da, gewählt wird die spanische Wendung (in der Fassung der eigenen Variante)
//  es-de: die Wendung steht da, gewählt wird die deutsche Bedeutung
import { cue } from "./cards.js";
import { key, variantsOf } from "./match.js";
import { viewOf } from "./variants.js";

export const DIRECTIONS = { "de-es": "Deutsch → Spanisch", "es-de": "Spanisch → Deutsch" };

function shuffled(a, rand) {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// { solution, options: [{ t, ok }] } mit bis zu 4 verschiedenen Optionen; Karten der gleichen Kategorie zuerst
export function meaningOptions(card, cards, prefs, rand = Math.random) {
  const es = prefs.meaningDir !== "es-de";
  const text = (c) => (es ? viewOf(c, prefs).shown.term : cue(c));
  const solution = text(card);
  // Keine Option darf eine andere Schreibweise oder Variante derselben Wendung sein
  const bad = new Set(es ? [card, ...[]].flatMap((c) => [...variantsOf(c), ...(c.variants || []).map((v) => v.term)]).map((t) => key(t, true)) : [solution]);
  const norm = (t) => (es ? key(t, true) : t);
  const pool = cards.filter((o) => o.id !== card.id && text(o));
  const picks = [...shuffled(pool.filter((o) => o.cat === card.cat), rand), ...shuffled(pool.filter((o) => o.cat !== card.cat), rand)];
  const seen = new Set([...bad].concat(norm(solution)));
  const options = [{ t: solution, ok: true }];
  for (const o of picks) {
    if (options.length >= 4) break;
    const t = text(o);
    const k = norm(t);
    if (!seen.has(k)) { seen.add(k); options.push({ t, ok: false }); }
  }
  return { solution, options: shuffled(options, rand) };
}
