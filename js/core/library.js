// Logik der Sammlung ohne Oberfläche: Filter, Suche, Nachladen in Abschnitten, Aufklappen.
import { norm, answersOf, CATS, LEVELS, REGION, AREAS } from "./cards.js";
import { stripAccents } from "./accent.js";
import { categoryOf } from "./srs.js";
import { GESAMT, peekProgress, isExample } from "./state.js";

// So viele Karten werden auf einmal gezeichnet; der Rest lädt beim Scrollen nach.
export const PAGE = 50;

export const STAT_OPTS = [
  ["Lernstand", [["all", "Alle Lernstände"], ["new", "Neu"], ["developing", "In Arbeit"], ["problem", "Problematisch"], ["mastered", "Gemeistert"], ["due", "Heute fällig"]]],
  ["Karten", [["edited", "Bearbeitet"], ["own", "Eigene Karten"], ["example", "Beispielkarten"]]]
];
const STATS = STAT_OPTS.flatMap(([, items]) => items.map(([v]) => v));

// Spezielle Regionsfilter; dazu kommt jede Region, die auf einer Karte vorkommt
export const REGION_SPECIAL = [["all", "Alle Regionen"], ["any", "Mit Regionskennzeichen"], ["variants", "Mit Varianten"], ["unsure", "Unsicher (?)"], ["vulgar", "Mit vulgärer Form"]];

// Niveau einer Karte: Korrektur im Gerätespeicher („“ = keine), sonst das Feld der Karte, sonst levels.json
export function levelOf(card, levels, state) {
  const fix = state && state.fixes && state.fixes[card.id];
  if (fix && typeof fix.level === "string") return fix.level;
  return card.level || (levels && levels[card.id]) || "";
}

export const isEdited = (state, id) => !!(state.fixes && state.fixes[id]);

// Alle Regionen, die eine Karte nennt (Hauptform und Varianten)
export function regionsOfCard(card) {
  return [...new Set([card.region, ...(card.variants || []).map((v) => v.region)].filter(Boolean))];
}

export const isUnsure = (card) => !!card.unsure || (card.variants || []).some((v) => v.unsure);
export const hasVulgar = (card) => (card.variants || []).some((v) => v.vulgar);

// f: { q, area, cat, stat, region, level }.
// ctx: { state, day, levels }. state.progress und state.examples.progress liefern den Fortschritt.
export function matches(card, f, ctx) {
  const q = stripAccents(norm(f.q || ""));
  if (q) {
    const hay = [card.term, card.de, card.prompt, card.sentence, card.note, ...(card.variants || []).map((v) => v.term), ...answersOf(card)].filter(Boolean).join(" ");
    if (!stripAccents(norm(hay)).includes(q)) return false;
  }
  if (f.area && f.area !== GESAMT && card.area !== f.area) return false;
  if (f.cat && f.cat !== "all" && card.cat !== f.cat) return false;
  const r = f.region || "all";
  if (r === "any") { if (!regionsOfCard(card).length) return false; }
  else if (r === "variants") { if (!(card.variants || []).length) return false; }
  else if (r === "unsure") { if (!isUnsure(card)) return false; }
  else if (r === "vulgar") { if (!hasVulgar(card)) return false; }
  else if (r !== "all" && !regionsOfCard(card).includes(r)) return false;
  const lv = f.level || "all";
  if (lv === "nolevel") { if (levelOf(card, ctx.levels, ctx.state)) return false; }
  else if (lv !== "all" && levelOf(card, ctx.levels, ctx.state) !== lv) return false;
  const s = STATS.includes(f.stat) ? f.stat : "all";
  if (s === "all") return true;
  if (s === "edited") return isEdited(ctx.state, card.id);
  if (s === "own") return /^u\d+$/.test(card.id);
  if (s === "example") return isExample(card);
  const p = peekProgress(ctx.state, card.id);
  if (s === "due") return !!(p && p.seen && p.due <= ctx.day);
  return categoryOf(p) === s;
}

export const filterCards = (cards, f, ctx) => cards.filter((c) => matches(c, f, ctx));

// Kategorien, die es gibt: erst die bekannten in fester Reihenfolge, dann eigene.
export function categoriesOf(cards) {
  const have = new Set(cards.map((c) => c.cat));
  return [...CATS.filter((c) => have.has(c)), ...[...have].filter((c) => !CATS.includes(c)).sort()];
}

// Regionen für die Auswahl: spezielle Filter, dann die vorhandenen Regionen (Spanien, Lateinamerika, Länder)
export function regionOptions(cards) {
  const have = new Set(cards.flatMap(regionsOfCard));
  const order = Object.keys(REGION).filter((r) => have.has(r));
  return [...REGION_SPECIAL, ...order.map((r) => [r, REGION[r]])];
}

export const levelOptions = () => [["all", "Alle Niveaus"], ...LEVELS.map((l) => [l, `Niveau ${l}`]), ["nolevel", "Ohne Niveau"]];

// Kurzer Lernstand für die Zeile: „Neu“, „Stufe 2“, „Problematisch“, „Gemeistert“
export function statusLabel(p) {
  const k = categoryOf(p);
  if (k === "new") return "Neu";
  if (k === "mastered") return "Gemeistert";
  if (k === "problem") return "Problematisch";
  return `Stufe ${p.box}`;
}

// Wie viele Karten nach dem nächsten Nachladen sichtbar sind
export const nextShown = (shown, total) => Math.min(total, shown + PAGE);
// Wie viele Karten das Nachladen als Nächstes bringt
export const restCount = (shown, total) => Math.max(0, Math.min(PAGE, total - shown));

// Aufklappen mit höchstens einem offenen Eintrag (Werkzeuge, Karten): erneut antippen schließt.
export const toggleOne = (current, id) => (current === id ? "" : id);

export function toggleIn(set, id) {
  if (set.has(id)) set.delete(id);
  else set.add(id);
  return set;
}

export { AREAS };
