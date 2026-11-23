// Karten bearbeiten und eigene Karten anlegen: Formular ↔ Karte, Prüfung, Speichern.
// Karten aus data/cards.json bleiben unverändert; ihre Korrektur steht pro ID in state.fixes (nur geänderte Felder).
// Eigene Karten (u01 …) werden direkt geändert. ID und Lernstand bleiben immer erhalten.
// Beispielkarten (x01 …) lassen sich nicht bearbeiten.
import { cardErrors, AREAS, XREF_LANGS } from "./cards.js";
import { cleanFix, nextCustomId, isExample } from "./state.js";
import { key } from "./match.js";
import { levelOf, isEdited } from "./library.js";

export { isEdited };

const str = (v) => (typeof v === "string" ? v.trim() : "");
const lines = (v) => (Array.isArray(v) ? v : String(v || "").split("\n")).map(str).filter(Boolean);

export const isCustom = (id) => /^u\d+$/.test(id);
export const isEditable = (card) => !isExample(card);

// Werte fürs Formular. Listen als Text (eine Zeile je Eintrag), Varianten als Zeilen.
export function formValues(levels, state, card) {
  const wrong = [...(card.wrong || [])];
  while (wrong.length < 3) wrong.push("");
  return {
    area: card.area || "allgemein", cat: card.cat || "", topic: card.topic || "",
    term: card.term || "", alt: (card.alt || []).join("\n"), de: card.de || "", prompt: card.prompt || "",
    sentence: card.sentence || "", answer: card.answer || "", wrong, plain: card.plain || "",
    trigger: card.trigger || "", mode: card.mode || "",
    reg: card.reg || "", region: card.region || "", unsure: !!card.unsure,
    variants: (card.variants || []).map((v) => ({ region: v.region || "", term: v.term || "", answer: v.answer || "", example: v.example || "", unsure: !!v.unsure, vulgar: !!v.vulgar })),
    xref: Object.fromEntries(XREF_LANGS.map((l) => [l, (card.xref && card.xref[l]) || ""])),
    note: card.note || "", hint: card.hint || "", level: levelOf(card, levels, state)
  };
}

// Aus dem Formular eine Karte bauen: leere Angaben entfallen, Texte werden bereinigt.
// Gibt { card, problems } zurück; problems sind Meldungen, die schon beim Bauen auffallen.
export function buildCard(base, form) {
  const problems = [];
  const area = form.area || base.area;
  const c = { id: base.id, area, cat: str(form.cat), term: str(form.term), de: str(form.de), sentence: str(form.sentence) };
  const parts = String(form.answer || "").split("|").map(str);
  if (parts.some((p) => !p) && String(form.answer || "").trim()) problems.push("Eine der Lösungen ist leer. Mehrere Lösungen trennst du mit einem einzelnen |.");
  c.answer = parts.filter(Boolean).join("|");
  const opt = (k, v) => { if (v) c[k] = v; };
  if (area === "schule") opt("topic", str(form.topic));
  opt("prompt", str(form.prompt));
  opt("plain", str(form.plain));
  opt("note", str(form.note));
  opt("hint", str(form.hint));
  opt("reg", str(form.reg));
  opt("region", str(form.region));
  opt("trigger", str(form.trigger));
  opt("mode", str(form.mode));
  opt("level", str(form.level));
  if (form.unsure) c.unsure = true;
  const alt = lines(form.alt);
  if (alt.length) c.alt = alt;
  const wrong = (Array.isArray(form.wrong) ? form.wrong : lines(form.wrong)).map(str).filter(Boolean);
  if (wrong.length) c.wrong = wrong;
  const variants = (form.variants || []).map((v) => {
    const out = { region: str(v.region), term: str(v.term) };
    const ans = String(v.answer || "").split("|").map(str).filter(Boolean).join("|");
    if (ans) out.answer = ans;
    if (str(v.example)) out.example = str(v.example);
    if (v.unsure) out.unsure = true;
    if (v.vulgar) out.vulgar = true;
    return out;
  }).filter((v) => v.region || v.term || v.answer || v.example);
  if (variants.length) c.variants = variants;
  const xref = Object.fromEntries(Object.entries(form.xref || {}).map(([k, v]) => [k, str(v)]).filter(([, v]) => v));
  if (Object.keys(xref).length) c.xref = xref;
  return { card: c, problems };
}

// Prüft das Formular. card: die Karte vor der Änderung (bei neuen Karten nur { id, area }), others: alle Karten.
// Gibt { card, errors } zurück; errors sind deutsche Meldungen, jede Karte wird mit cardErrors geprüft (wie beim Import).
export function checkEdit(card, form, others = []) {
  const { card: next, problems } = buildCard(card, form);
  const errors = [...problems];
  const name = (m) => m.replace(/^„[^“]*“: /, "").replace(/^Karte: /, "");
  errors.push(...cardErrors(next).map(name));
  if (next.term && others.some((o) => o.id !== card.id && o.area === next.area && key(o.term, true) === key(next.term, true))) errors.push(`„${next.term}“ gibt es in diesem Bereich schon als andere Karte.`);
  return { card: next, errors: [...new Set(errors)] };
}

const same = (a, b) => JSON.stringify(a, (k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => (x < y ? -1 : 1))) : v)) ===
  JSON.stringify(b, (k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => (x < y ? -1 : 1))) : v));

// Welche Felder weichen von der Originalkarte ab? Gibt eine Korrektur oder null zurück.
export function diffFix(orig, origLevel, next) {
  const fix = {};
  for (const k of ["cat", "term", "de", "prompt", "sentence", "answer", "plain", "note", "reg", "region", "hint", "trigger", "mode", "topic"]) {
    if ((next[k] || "") !== (orig[k] || "")) fix[k] = next[k] || "";
  }
  for (const k of ["alt", "wrong", "variants"]) if (!same(next[k] || [], orig[k] || [])) fix[k] = next[k] || [];
  if (!same(next.xref || {}, orig.xref || {})) fix.xref = next.xref || {};
  if (!!next.unsure !== !!orig.unsure) fix.unsure = !!next.unsure;
  if ((next.level || "") !== (origLevel || "")) fix.level = next.level || "";
  return cleanFix(fix);
}

// Speichert die Änderung an einer vorhandenen Karte. Der Lernstand (progress) wird nicht berührt.
// base: Karten aus data/, levels: data/levels.json, cardsNow: alle Karten, die gerade gelten.
export function saveEdit(state, base, levels, cardsNow, id, form) {
  const card = cardsNow.find((c) => c.id === id);
  if (!card) return { errors: ["Diese Karte gibt es nicht mehr."] };
  if (!isEditable(card)) return { errors: ["Beispielkarten lassen sich nicht bearbeiten. Lege eine eigene Karte an."] };
  const { card: next, errors } = checkEdit(card, { ...form, area: card.area }, cardsNow);
  if (errors.length) return { errors };
  if (isCustom(id)) {
    const i = state.custom.findIndex((c) => c.id === id);
    if (i < 0) return { errors: ["Diese Karte gibt es nicht mehr."] };
    state.custom[i] = next;
    return { ok: true, id };
  }
  const orig = base.find((c) => c.id === id);
  if (!orig) return { errors: ["Diese Karte gibt es nicht mehr."] };
  const fix = diffFix(orig, (levels && levels[id]) || orig.level || "", next);
  if (!state.fixes) state.fixes = {};
  if (fix) state.fixes[id] = fix; else delete state.fixes[id];
  return { ok: true, id };
}

// Legt eine eigene Karte an (ID u01, u02 …, nie wiederverwendet).
export function createCard(state, base, cardsNow, form) {
  if (!(form.area in AREAS)) return { errors: ["Bitte einen Bereich wählen."] };
  const id = nextCustomId(base, state);
  const { card, errors } = checkEdit({ id, area: form.area }, form, cardsNow);
  if (errors.length) return { errors };
  state.custom.push(card);
  return { ok: true, id };
}

// Verwirft die Korrektur einer Startkarte.
export function restoreOriginal(state, id) {
  if (!state.fixes || !state.fixes[id]) return false;
  delete state.fixes[id];
  return true;
}

