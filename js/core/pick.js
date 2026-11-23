// Karten nach Lernstand gewichtet auswählen (Texte, Transfer, Aufträge für Claude).
import { categoryOf } from "./srs.js";

// Gewicht einer Karte: problematisch 5, in Arbeit 3, neu 1,5, gemeistert 1, fällig +2
export function cardWeight(p, day) {
  const k = categoryOf(p);
  let w = k === "problem" ? 5 : k === "developing" ? 3 : k === "new" ? 1.5 : 1;
  if (p && p.seen && p.due <= day) w += 2;
  return w;
}

// Zieht n Elemente ohne Zurücklegen; weight(x) bestimmt die Chance.
export function weightedSample(items, weight, n, rand = Math.random) {
  const pool = items.map((x) => ({ x, w: weight(x) }));
  const out = [];
  while (out.length < n && pool.length) {
    let r = rand() * pool.reduce((s, e) => s + e.w, 0);
    let i = 0;
    while (i < pool.length - 1 && (r -= pool[i].w) > 0) i++;
    out.push(pool.splice(i, 1)[0].x);
  }
  return out;
}
