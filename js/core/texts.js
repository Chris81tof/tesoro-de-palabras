// Stufe 5 · Texte: Auswahl nach Lernstand, Prompt für neue Texte und Import der Antwort.
// Ein Text gehört zu einem Bereich (area) und hat optional eine Region (region). Alle Lücken zeigen auf Karten dieses Bereichs.
// Stufe 5 (Texte, Umformulieren, Satz schreiben) nutzt nur Karten, die in einem Text vorkommen.
import { ans0 } from "./modes.js";
import { cardWeight, weightedSample } from "./pick.js";
import { peekProgress } from "./state.js";
import { AREAS, REGION, properNames } from "./cards.js";
import { usesExpr, stripMarks } from "./match.js";
import { regionsOf, viewOf } from "./variants.js";

export { cardWeight };

export const RECENT_DAYS = 14;
export const SUGGEST = 6;
export const KINDS = {
  allgemein: ["Zeitungsartikel", "Essay", "Interview", "Blogbeitrag", "Brief", "Rezension", "Rede", "Bericht"],
  schule: ["Elternbrief", "E-Mail an Eltern", "Dialog im Elterngespräch", "Gesprächsnotiz", "Dialog mit einem Schüler", "Aktennotiz"]
};
const FOREIGN_PENALTY = 6;

// Texte eines Bereichs; Beispieltexte verschwinden mit den Beispielkarten
export function textsOf(texts, area, state) {
  return texts.filter((t) => t.area === area && !(t.example && state.examples.removed));
}

// Karten-IDs, die in mindestens einem Text vorkommen: nur sie gibt es in Stufe 5
export function stage5Ids(texts) {
  return new Set(texts.flatMap((t) => t.gaps.map((g) => g[0])));
}

// Passt die Region des Textes zur eigenen Variante? Ohne Region passt jeder Text.
export const regionFits = (t, prefs) => !t.region || regionsOf(prefs).includes(t.region) || (prefs.variant === "latam" && t.region === "latam");

// Punktzahl eines Textes: Summe der Gewichte seiner Lücken, abzüglich eines Abzugs, der vom Tag der Bearbeitung
// über 14 Tage auf null sinkt; ein Text für eine andere Region zählt weniger. Fehlende Karten zählen nicht.
export function textScore(t, state, day, known, prefs) {
  let s = 0;
  for (const [id] of t.gaps) if (!known || known.has(id)) s += cardWeight(peekProgress(state, id), day);
  const last = state.textLog[t.id];
  if (typeof last === "number" && day - last < RECENT_DAYS) s -= (10 * (RECENT_DAYS - (day - last))) / RECENT_DAYS;
  if (prefs && !regionFits(t, prefs)) s -= FOREIGN_PENALTY;
  return s;
}

export function suggestTexts(texts, state, day, known, prefs, n = SUGGEST) {
  return texts
    .map((t) => ({ t, score: textScore(t, state, day, known, prefs) }))
    .sort((a, b) => b.score - a.score || String(a.t.id).localeCompare(String(b.t.id)))
    .slice(0, n);
}

// Wie oft jede Karte in einem Text vorkommt
export function coverage(texts) {
  const m = new Map();
  for (const t of texts) for (const [id] of t.gaps) m.set(id, (m.get(id) || 0) + 1);
  return m;
}

// Karten für einen neuen Text: nach Gewicht gezogen; Karten ohne Text bekommen +3.
export function pickCards(cards, state, texts, day, n, rand = Math.random) {
  const cov = coverage(texts);
  return weightedSample(cards.filter((c) => c.term && c.answer && !c.example), (c) => cardWeight(peekProgress(state, c.id), day) + (cov.get(c.id) ? 0 : 3), n, rand);
}

// Text mit eingesetzten Lösungen (Marken bleiben für den Abgleich erhalten)
export function filled(t, pick = (i) => String(t.gaps[i][1]).split("|")[0]) {
  return t.text.replace(/\{(\d+)\}/g, (_, n) => pick(Number(n) - 1));
}

export function textPrompt(cards, { kind, words, area }, prefs) {
  const variant = prefs.variant === "latam" ? "Lateinamerika" + (prefs.country && REGION[prefs.country] ? ` (${REGION[prefs.country]})` : "") : "Spanien";
  const list = cards.map((c) => `- ${c.id} · ${c.term} · ${c.de || c.prompt || ""} · Beispiel-Lösung: ${viewOf(c, prefs).shown.answers[0] || ans0(c)}`).join("\n");
  return "Schreib mir einen Lückentext zum Üben für Spanisch als Fremdsprache (Muttersprache Deutsch, Niveau B2 bis C2). Der Text ist auf Spanisch, Variante: " + variant + ".\n\n" +
    `Bereich: ${AREAS[area]}\n` +
    (area === "schule"
      ? "Thema: Eltern- und Schülergespräche in der Schule (Elternsprechtag, Fehlzeiten, Ordnungsmaßnahmen). Erfinde KEINE echten Namen und keine echten Fälle: nur allgemeine Rollen wie la madre, el alumno, la tutora, la dirección.\n"
      : "") +
    `Textsorte: ${kind}\nLänge: etwa ${words} Wörter\nLücken: ${cards.length}, eine für jede Wendung unten\n\n` +
    "Wendungen (ID · Wendung · Bedeutung · Beispiel-Lösung aus einem Übungssatz):\n" + list + "\n\n" +
    "Regeln:\n" +
    "- Jede Wendung kommt genau einmal vor, die Reihenfolge ist frei.\n" +
    "- Eine Lücke ersetzt nur das Wort, das gelernt werden soll, meist das Verb in der passenden Form. Der Rest der Wendung bleibt im Text stehen.\n" +
    "- Bei Subjuntivo-Auslösern fällt die Lücke auf das konjugierte Verb, und der Infinitiv steht in Klammern hinter der Lücke, z. B. „Tal vez mi hermana {3} (venir) mañana.“\n" +
    "- Der Zusammenhang muss genau diese Wendung nahelegen, damit die Lösung eindeutig ist.\n" +
    "- Ein natürlicher, zusammenhängender Text, keine Aufzählung der Wendungen.\n" +
    "- Markiere die Lücken im Text als {1}, {2}, … in der Reihenfolge, in der sie vorkommen.\n" +
    "- In \"gaps\" steht für jede Lücke in derselben Reihenfolge [ID der Wendung, Lösung]. Mehrere richtige Lösungen (z. B. beide Modi oder Varianten) trennst du mit |.\n" +
    "- Steht die Wendung im Text nicht als zusammenhängende Wortfolge (eingeschobene Wörter), markiere die Fundstelle mit [[ID:Textstelle]], z. B. [[x01:{1} una decisión]]. Die Markierung gilt nur dem Abgleich, die Lücke {1} bleibt darin stehen.\n" +
    "- \"kind\" ist die Textsorte mit Thema auf Deutsch, z. B. \"Blog · Alltag\". \"title\" ist ein spanischer Titel. \"region\" ist optional: \"es\", \"latam\" oder ein Land, nur wenn der Text regionalen Wortschatz verwendet.\n\n" +
    "Antworte nur mit diesem JSON, ohne weiteren Text:\n" +
    '{"kind": "…", "title": "…", "text": "… {1} … {2} …", "region": "es", "gaps": [["ID", "Lösung"], ["ID", "Lösung"]]}';
}

// JSON aus einer eingefügten Antwort holen, auch mit Begleittext oder ```-Block
function extractJson(raw) {
  const s = String(raw);
  const start = s.search(/[[{]/);
  const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (start < 0 || end < start) throw new Error("Kein JSON gefunden.");
  return JSON.parse(s.slice(start, end + 1));
}

function nextTextId(taken) {
  let n = 1;
  while (taken.has("i" + n)) n++;
  taken.add("i" + n);
  return "i" + n;
}

// Prüft einen Text, ohne ihn zu verändern; liefert { errors, warnings }.
export function textProblems(t, cardById) {
  const errors = [];
  const warnings = [];
  if (!(t.area in AREAS)) errors.push("„area“ fehlt oder ist unbekannt.");
  if (typeof t.text !== "string" || !t.text.trim()) errors.push("„text“ fehlt.");
  if (typeof t.title !== "string" || !t.title.trim()) errors.push("„title“ fehlt.");
  if (t.region !== undefined && !(t.region in REGION)) errors.push("Unbekannte Region.");
  const gaps = Array.isArray(t.gaps) ? t.gaps : null;
  if (!gaps || !gaps.length) errors.push("„gaps“ fehlt oder ist leer.");
  if (errors.length) return { errors, warnings };
  const nums = [...stripMarks(t.text).matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1]));
  const want = gaps.map((_, k) => k + 1);
  if (nums.join() !== want.join()) errors.push(`Der Text braucht die Platzhalter {1} bis {${gaps.length}} je einmal und in Reihenfolge (gefunden: ${nums.map((x) => `{${x}}`).join(" ") || "keine"}).`);
  const seen = new Set();
  gaps.forEach((g, k) => {
    const card = g && cardById.get(g[0]);
    if (!card) errors.push(`Lücke ${k + 1}: Karte „${g && g[0]}“ gibt es nicht.`);
    else if (card.area !== t.area) errors.push(`Lücke ${k + 1}: Die Karte „${g[0]}“ gehört zum Bereich „${AREAS[card.area]}“, der Text zu „${AREAS[t.area]}“.`);
    if (seen.has(g && g[0])) warnings.push(`Lücke ${k + 1}: Die Karte „${g[0]}“ kommt mehrfach vor.`);
    seen.add(g && g[0]);
    if (!g || typeof g[1] !== "string" || !g[1].trim()) errors.push(`Lücke ${k + 1}: Lösung fehlt.`);
  });
  if (t.area === "schule") {
    const names = properNames(stripMarks(t.text));
    if (names.length) errors.push(`Mögliche Eigennamen (in Schulgesprächen nicht erlaubt): ${[...new Set(names)].join(", ")}.`);
  }
  if (!errors.length) {
    const full = filled(t);
    gaps.forEach(([id], k) => {
      if (!usesExpr(full, { ...cardById.get(id), id })) warnings.push(`Lücke ${k + 1}: Mit der Lösung wird die Wendung „${cardById.get(id).term}“ im Text nicht erkannt. Bitte prüfen oder die Fundstelle mit [[${id}:…]] markieren.`);
    });
  }
  return { errors, warnings };
}

// Prüft eingefügte Texte. Gültige Texte (mit neuer ID) bleiben importierbar, auch wenn andere Fehler haben.
// cards: alle vorhandenen Karten, area: Bereich der neuen Texte.
export function parseTexts(raw, cards, takenIds, area) {
  let data;
  try {
    data = extractJson(raw);
  } catch {
    return { texts: [], errors: ["Die Antwort enthält kein gültiges JSON. Kopiere die ganze Antwort von Claude."], warnings: [] };
  }
  const items = Array.isArray(data) ? data : Array.isArray(data.texts) ? data.texts : [data];
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const taken = new Set(takenIds);
  const texts = [];
  const errors = [];
  const warnings = [];
  items.forEach((t, i) => {
    const name = items.length > 1 ? `Text ${i + 1}: ` : "";
    if (!t || typeof t !== "object") { errors.push(name + "kein Textobjekt."); return; }
    const gaps = Array.isArray(t.gaps) ? t.gaps.map((g) => (Array.isArray(g) ? g : g && [g.id, g.answer])) : null;
    const cand = { area, kind: typeof t.kind === "string" && t.kind.trim() ? t.kind.trim() : "Text", title: t.title, text: t.text, gaps, ...(t.region ? { region: t.region } : {}) };
    const p = textProblems(cand, cardById);
    p.warnings.forEach((w) => warnings.push(name + w));
    if (p.errors.length) { errors.push(name + p.errors.join(" ")); return; }
    texts.push({ id: nextTextId(taken), area, kind: cand.kind, title: t.title.trim(), text: t.text.trim(), ...(t.region ? { region: t.region } : {}), gaps: gaps.map((g) => [g[0], String(g[1]).trim()]) });
  });
  return { texts, errors, warnings };
}

