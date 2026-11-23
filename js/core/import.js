// Neue Karten von Claude: Prompt zum Kopieren und Import der Antwort (JSON).
// Jede Karte läuft durch dieselbe Prüfung wie beim Anlegen im Formular (edit.checkEdit → cardErrors).
// Fehler werden pro Karte gemeldet; gültige Karten desselben Pakets werden trotzdem übernommen.
import { AREAS, CATS, REG, REGION, TOPICS, MODES, LEVELS, XREF_LANGS, SUBJ_CAT } from "./cards.js";
import { checkEdit, formValues } from "./edit.js";
import { key } from "./match.js";

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const TEXT = ["cat", "topic", "term", "de", "prompt", "sentence", "answer", "plain", "reg", "region", "trigger", "mode", "note", "hint", "level"];
const KNOWN = new Set([...TEXT, "area", "alt", "wrong", "variants", "xref", "unsure"]);
// Felder, die Claude nicht setzen soll; sie werden ignoriert (die App vergibt die ID)
const IGNORED = new Set(["id", "example"]);

// JSON aus einer eingefügten Antwort holen, auch mit Begleittext oder ```-Block
function extractJson(raw) {
  const s = String(raw);
  const start = s.search(/[[{]/);
  const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (start < 0 || end < start) throw new Error("kein JSON");
  return JSON.parse(s.slice(start, end + 1));
}

// Prüft Typen der Felder; liefert { card, problems } mit bereinigter Roh-Karte
function sanitize(raw) {
  const problems = [];
  const warnings = [];
  const card = {};
  for (const k of TEXT) {
    if (raw[k] === undefined || raw[k] === null) continue;
    if (typeof raw[k] !== "string") problems.push(`Das Feld „${k}“ muss ein Text sein.`);
    else card[k] = raw[k];
  }
  if (raw.area !== undefined) {
    if (typeof raw.area !== "string") problems.push("Das Feld „area“ muss ein Text sein.");
    else card.area = raw.area;
  }
  for (const k of ["alt", "wrong"]) {
    if (raw[k] === undefined || raw[k] === null) continue;
    if (!Array.isArray(raw[k]) || raw[k].some((x) => typeof x !== "string")) problems.push(`Das Feld „${k}“ muss eine Liste von Texten sein.`);
    else card[k] = raw[k];
  }
  if (raw.variants !== undefined && raw.variants !== null) {
    if (!Array.isArray(raw.variants) || raw.variants.some((v) => !isObj(v))) problems.push("Das Feld „variants“ muss eine Liste von Objekten sein.");
    else {
      card.variants = raw.variants.map((v) => ({
        region: typeof v.region === "string" ? v.region : "", term: typeof v.term === "string" ? v.term : "",
        answer: typeof v.answer === "string" ? v.answer : "", example: typeof v.example === "string" ? v.example : "",
        unsure: v.unsure === true, vulgar: v.vulgar === true
      }));
    }
  }
  if (raw.xref !== undefined && raw.xref !== null) {
    if (!isObj(raw.xref) || Object.values(raw.xref).some((v) => typeof v !== "string")) problems.push("Das Feld „xref“ muss ein Objekt mit Texten sein (IT, FR, PT, DE, EN).");
    else {
      const bad = Object.keys(raw.xref).filter((k) => !XREF_LANGS.includes(k));
      if (bad.length) problems.push(`Das Feld „xref“ kennt nur ${XREF_LANGS.join(", ")} (gefunden: ${bad.join(", ")}).`);
      else card.xref = raw.xref;
    }
  }
  if (raw.unsure !== undefined && raw.unsure !== null) {
    if (typeof raw.unsure !== "boolean") problems.push("Das Feld „unsure“ muss wahr oder falsch sein.");
    else card.unsure = raw.unsure;
  }
  const ignored = Object.keys(raw).filter((k) => IGNORED.has(k));
  if (ignored.length) warnings.push(`Ignoriert: ${ignored.map((k) => `„${k}“`).join(", ")} (die App vergibt die ID selbst).`);
  const unknown = Object.keys(raw).filter((k) => !KNOWN.has(k) && !IGNORED.has(k));
  if (unknown.length) warnings.push(`Unbekannte Felder ignoriert: ${unknown.map((k) => `„${k}“`).join(", ")}.`);
  return { card, problems, warnings };
}

// Liest eingefügte Karten.
//  existing: alle vorhandenen Karten (für Dubletten und die Prüfung), takenIds: vergebene IDs (auch gelöschte),
//  area: Bereich, in den importiert wird. Ergebnis:
//  { cards, errors: [{ index, name, messages, raw }], skipped: [Wendungen], warnings: [Text], fatal }
export function parseCards(raw, existing, takenIds, area) {
  let data;
  try {
    data = extractJson(raw);
  } catch {
    return { cards: [], errors: [], skipped: [], warnings: [], fatal: "Die Antwort enthält kein gültiges JSON. Kopiere die ganze Antwort von Claude, auch die Klammern am Anfang und am Ende." };
  }
  const items = Array.isArray(data) ? data : Array.isArray(data.cards) ? data.cards : [data];
  if (!items.length) return { cards: [], errors: [], skipped: [], warnings: [], fatal: "Die Antwort enthält keine Karten." };
  const taken = new Set(takenIds);
  const pool = [...existing];
  const cards = [];
  const errors = [];
  const skipped = [];
  const warnings = [];
  const newId = () => {
    let n = 1;
    while (taken.has("u" + String(n).padStart(2, "0"))) n++;
    const id = "u" + String(n).padStart(2, "0");
    taken.add(id);
    return id;
  };
  items.forEach((item, i) => {
    const index = i + 1;
    if (!isObj(item)) { errors.push({ index, name: `Karte ${index}`, messages: ["Das ist kein Kartenobjekt."], raw: item }); return; }
    const name = typeof item.term === "string" && item.term.trim() ? `Karte ${index} „${item.term.trim()}“` : `Karte ${index}`;
    const s = sanitize(item);
    s.warnings.forEach((w) => warnings.push(`${name}: ${w}`));
    const target = s.card.area || area;
    const messages = [...s.problems];
    if (!(target in AREAS)) messages.push("Der Bereich fehlt oder ist unbekannt.");
    else if (s.card.area && area && s.card.area !== area) messages.push(`Die Karte gehört zum Bereich „${AREAS[s.card.area]}“, importiert wird aber in „${AREAS[area]}“.`);
    if (!messages.length) {
      const base = { id: "", area: target };
      const form = formValues({}, { fixes: {} }, { ...s.card, area: target });
      const r = checkEdit(base, form, pool);
      messages.push(...r.errors.filter((m) => !/gibt es in diesem Bereich schon/.test(m)));
      const dup = pool.find((o) => o.area === target && key(o.term, true) === key(r.card.term || "", true));
      if (!messages.length && dup) { skipped.push(r.card.term); return; }
      if (!messages.length) {
        const card = { ...r.card, id: newId() };
        cards.push(card);
        pool.push(card);
        return;
      }
    }
    errors.push({ index, name, messages, raw: item });
  });
  return { cards, errors, skipped, warnings, fatal: "" };
}

// Zusammenfassung für die Anzeige: Zeilen mit Text
export function summarizeImport(r) {
  const lines = [];
  if (r.fatal) return [r.fatal];
  if (r.cards.length) lines.push(`${r.cards.length} ${r.cards.length === 1 ? "Karte" : "Karten"} importiert: ${r.cards.map((c) => c.term).join(", ")}.`);
  if (r.skipped.length) lines.push(`Schon vorhanden, übersprungen: ${r.skipped.join(", ")}.`);
  if (r.errors.length) lines.push(`${r.errors.length} ${r.errors.length === 1 ? "Karte" : "Karten"} nicht übernommen:`);
  for (const e of r.errors) lines.push(`${e.name}: ${e.messages.join(" ")}`);
  for (const w of r.warnings) lines.push(w);
  if (!r.cards.length && !r.errors.length && !r.skipped.length) lines.push("Es wurde nichts importiert.");
  return lines;
}

const example = (area, variant) => JSON.stringify(area === "schule"
  ? { cat: "Subjuntivo-Auslöser", topic: "Fehlzeiten", term: "pedir que", de: "bitten, dass", prompt: "rogar a alguien que haga algo", sentence: "Le pido que ____ (justificar) las ausencias por escrito.", answer: "justifique", wrong: ["justifica", "justificar", "justificó"], plain: "Necesito un justificante escrito de las ausencias.", reg: "f", trigger: "pedir que", mode: "subj", note: "Bitten und Auffordern löst den Subjuntivo aus.", level: "B2" }
  : { cat: "Feste Wendung", term: "coger el autobús", de: "den Bus nehmen", prompt: "usar el autobús como medio de transporte", sentence: "Para ir al trabajo suelo ____ el autobús de las ocho.", answer: "coger|tomar", wrong: ["llevar", "poner", "subir"], plain: "Voy al trabajo en el transporte público de las ocho.", reg: "n", region: "es", variants: [{ region: "mx", term: "tomar el camión", answer: "tomar", example: "Tomo el camión de las ocho." }, { region: "mx", term: "coger el autobús", answer: "coger", vulgar: true }], note: "„coger“ ist in Mexiko vulgär.", level: "A2" });

// Der Prompt für neue Karten. opts: { area, terms (eigene Wendungen), cat, topic, count }, existing: vorhandene Karten, prefs: Einstellungen.
export function cardPrompt({ area, terms = [], cat = "", topic = "", count = 10 }, existing, prefs) {
  const own = terms.map((t) => t.trim()).filter(Boolean);
  const variant = prefs.variant === "latam" ? "Lateinamerika" + (prefs.country && REGION[prefs.country] ? ` (${REGION[prefs.country]})` : "") : "Spanien";
  const have = existing.filter((c) => c.area === area && !c.example).map((c) => c.term);
  const focus = [cat && `Kategorie „${cat}“`, topic && `Thema „${topic}“`].filter(Boolean).join(", ");
  const what = own.length
    ? "Erstelle Lernkarten für diese Wendungen:\n" + own.map((t) => "- " + t).join("\n")
    : `Schlage ${count} Wendungen vor${focus ? " (" + focus + ")" : ""}, die für Lernende von B2 bis C2 wichtig sind, und erstelle Lernkarten dafür.` +
      (have.length ? " Diese Wendungen habe ich schon, bitte keine davon:\n" + have.join("; ") : "");
  return "Ich lerne Spanisch (Muttersprache Deutsch, Niveau B2 bis C2) mit einer Karteikarten-App. Meine Variante: " + variant + ".\n" +
    `Bereich: ${AREAS[area]}` + (area === "schule"
      ? " (Eltern- und Schülergespräche, Elternsprechtag, Fehlzeiten, Ordnungsmaßnahmen). Erfinde KEINE echten Namen und keine echten Fälle: nur allgemeine Rollen wie la madre, el alumno, la tutora, la dirección."
      : " (allgemeiner Wortschatz: Kollokationen, Verb + Präposition, Subjuntivo-Auslöser, feste Wendungen, Wortbildung, Idiome, Konnektoren, falsche Freunde).") + "\n\n" +
    what + "\n\n" +
    "Felder je Karte (alle Texte in Anführungszeichen, ohne weitere Felder, ohne „id“):\n" +
    `- cat: eine von ${CATS.map((c) => `"${c}"`).join(", ")}\n` +
    (area === "schule" ? `- topic: Pflicht bei Schulgesprächen, eines von ${TOPICS.map((t) => `"${t}"`).join(", ")}\n` : "") +
    "- term: die Wendung in Grundform. Nomen mit Artikel, z. B. \"el ordenador\".\n" +
    "- de: deutsche Bedeutung, knapp\n" +
    "- prompt: kurze Erklärung auf Spanisch (optional)\n" +
    "- sentence: ein natürlicher Beispielsatz mit genau einer Lücke ____ an der Stelle des Wortes, das gelernt werden soll (meist das Verb in der passenden Form); der Rest der Wendung bleibt stehen. Bei Subjuntivo-Karten fällt die Lücke auf das konjugierte Verb, und der Infinitiv steht in Klammern direkt dahinter, z. B. \"Es posible que ____ (venir) mañana.\"\n" +
    "- answer: das Wort für die Lücke; mehrere richtige Lösungen mit | trennen (auch Varianten und beide Modi)\n" +
    "- wrong: genau drei falsche, aber plausible Optionen für die Lücke (typische Lernerfehler). Nie eine gültige Lösung oder Variante! Bei Subjuntivo nur wirklich falsche Formen.\n" +
    "- plain: derselbe Satz schlicht formuliert, OHNE die Wendung, ohne den Auslöser und ohne die Lösung\n" +
    `- reg: Register, ${Object.entries(REG).map(([k, v]) => `"${k}" (${v})`).join(", ")}. „f“ gilt auch für höflich und Amtssprache.\n` +
    `- region: nur wenn die Wendung regional ist: "es" (Spanien), "latam" (Lateinamerika) oder ein Land: ${Object.keys(REGION).filter((r) => r !== "es" && r !== "latam").map((r) => `"${r}"`).join(", ")}. Fehlt das Feld, gilt sie überall.\n` +
    "- variants: optional, Fassungen in anderen Ländern: [{\"region\": \"mx\", \"term\": \"…\", \"answer\": \"Lösung für die Lücke\", \"example\": \"Beispielsatz\", \"unsure\": true, \"vulgar\": true}]. „unsure\": true, wenn du dir nicht sicher bist. „vulgar\": true, wenn diese Form dort vulgär ist (dann ohne Beispiel). Die Lösung einer Variante muss auch in \"answer\" stehen.\n" +
    `- trigger und mode: Pflicht bei Kategorie "${SUBJ_CAT}". trigger ist der Auslöser (z. B. "es posible que"), mode ist ${Object.entries(MODES).map(([k, v]) => `"${k}" (${v})`).join(", ")}. Bei "both" stehen beide Formen in answer.\n` +
    "- xref: optional, Querverweise und falsche Freunde als Objekt mit den Schlüsseln IT, FR, PT, DE, EN (jeweils ein kurzer Text)\n" +
    "- unsure: true, wenn du dir bei der Region der Hauptform nicht sicher bist\n" +
    "- note: optional, ein Hinweis auf Deutsch (Gebrauch, Verwechslungsgefahr)\n" +
    "- hint: optional, ein Hinweis auf Deutsch für die Übung, der weder die Lösung noch die Wendung noch den Modus (Subjuntivo/Indikativ) verrät\n" +
    "- alt: optional, Liste weiterer Schreibweisen der Wendung\n" +
    `- level: optional, deine Einschätzung ${LEVELS.map((l) => `"${l}"`).join(", ")}\n\n` +
    "Antworte nur mit einer JSON-Liste, ohne weiteren Text. Beispiel für eine Karte:\n[" + example(area) + "]";
}

// Prompt, mit dem Claude die fehlerhaften Karten eines Imports korrigiert
export function fixPrompt(errors, area, prefs) {
  const items = errors.map((e) => `Karte ${e.index}: ${e.messages.join(" ")}\n${JSON.stringify(e.raw)}`).join("\n\n");
  return `Diese Lernkarten (Spanisch, Bereich ${AREAS[area]}, Variante ${prefs.variant === "latam" ? "Lateinamerika" : "Spanien"}) wurden von meiner App abgelehnt. Bitte korrigiere nur diese Karten anhand der Fehlermeldungen und halte dich an dasselbe Format.\n\n${items}\n\nAntworte nur mit einer JSON-Liste der korrigierten Karten, ohne weiteren Text.`;
}

