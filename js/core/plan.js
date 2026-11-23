// Tagesplan pro Bereich: fällige und neue Karten auf Übungsarten verteilen, bis das Zeitbudget erreicht ist.
import { MODES, ORDER } from "./modes.js";
import { categoryOf, MASTERED } from "./srs.js";
import { peekProgress } from "./state.js";

const usable = (m, c, cards, ctx) => !!MODES[m] && MODES[m].need(c, cards, ctx);

// Passende Übungsart für eine Karte nach ihrem Lernstand
export function recMode(c, p, cards, ctx) {
  let m;
  if (!p || !p.seen) m = "meaning";
  else if (categoryOf(p) === "problem") m = p.ms.meaning && p.ms.meaning[0] > 0 ? "choice" : "meaning";
  else if (p.box <= 0) m = "choice";
  else if (p.box === 1) m = "gap";
  else if (p.box === 2) m = p.seen % 2 === 0 ? "translate" : "error";
  else m = p.seen % 2 === 0 ? "error" : "gap";
  return [m, "gap", "translate", "cards"].find((x) => usable(x, c, cards, ctx)) || "cards";
}

// Gemeisterte Karten werden angewendet (Stufe 5), wenn sie in einem Text vorkommen.
export function planMode(c, p, cards, ctx) {
  if (p && p.seen && p.box >= MASTERED) {
    const m = p.seen % 2 === 0 ? "rewrite" : "produce";
    if (usable(m, c, cards, ctx)) return m;
  }
  return recMode(c, p, cards, ctx);
}

export const planKey = (prefs, area) => `${area}|${prefs.budget[area]}|${prefs.newPerDay[area]}`;

// cards: die Karten dieses Bereichs. Neue Karten pro Tag und Zeitbudget gelten für diesen Bereich.
export function buildPlan(cards, state, day, area, ctx) {
  const budget = state.prefs.budget[area];
  const prog = (c) => peekProgress(state, c.id);
  const newDone = cards.filter((c) => prog(c) && prog(c).seen && prog(c).first === day).length;
  let newLeft = Math.max(0, state.prefs.newPerDay[area] - newDone);
  const cand = [];
  for (const c of cards) {
    const p = prog(c);
    if (!p || !p.seen) cand.push({ c, p, rank: 2, due: 0 });
    else if (p.due <= day) cand.push({ c, p, rank: categoryOf(p) === "problem" ? 0 : 1, due: p.due });
  }
  cand.sort((a, b) => a.rank - b.rank || a.due - b.due);
  let used = 0;
  let skippedNew = 0;
  const groups = {};
  for (const { c, p } of cand) {
    const isNew = !p || !p.seen;
    if (isNew && newLeft <= 0) { skippedNew++; continue; }
    const m = planMode(c, p, cards, ctx);
    const mins = MODES[m].est;
    if (used + mins > budget) continue;
    used += mins;
    if (isNew) newLeft--;
    (groups[m] || (groups[m] = [])).push(c.id);
  }
  const blocks = ORDER.filter((m) => groups[m]).map((m) => ({
    mode: m, ids: groups[m], mins: Math.max(1, Math.round(groups[m].length * MODES[m].est))
  }));
  return { day, area, key: planKey(state.prefs, area), blocks, used: Math.round(used), pool: cand.length, skippedNew };
}
