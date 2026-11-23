// Auswahl (Stufe 2): die richtige Option ist die Form der eigenen Variante,
// die falschen sind die „wrong“-Optionen der Karte (nie eine gültige Variante, das prüft cardErrors).
import { viewOf } from "./variants.js";

function shuffled(a, rand) {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// { solution, options } oder null, wenn die Karte keine 3 falschen Optionen hat
export function choiceOptions(card, prefs, rand = Math.random) {
  if (!Array.isArray(card.wrong) || card.wrong.length < 3) return null;
  const solution = viewOf(card, prefs).shown.answers[0];
  return { solution, options: shuffled([solution, ...card.wrong.slice(0, 3)], rand) };
}
