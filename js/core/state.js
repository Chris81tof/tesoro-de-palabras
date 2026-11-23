// Lernstand (Format 1): Fortschritt je Karten-ID, eigene Karten, Korrekturen, gelöschte IDs, importierte Texte,
// Entwürfe, Beispielkarten-Stand und Einstellungen. Die Karten aus data/ stehen nicht darin.
import { newProgress } from "./srs.js";
import { AREAS, LEVELS } from "./cards.js";

export const STORAGE_KEY = "tesoro-de-palabras-v1";
export const FORMAT = 1;
export const GESAMT = "gesamt";

export const DEFAULT_PREFS = {
  area: "allgemein", variant: "es", country: "", strictAccents: false, theme: "auto",
  speak: true, voice: "", rate: 0.92,
  budget: { allgemein: 40, schule: 20 },
  newPerDay: { allgemein: 10, schule: 5 }
};

const clonePrefs = () => ({ ...DEFAULT_PREFS, budget: { ...DEFAULT_PREFS.budget }, newPerDay: { ...DEFAULT_PREFS.newPerDay } });

export function createState() {
  return { progress: {}, custom: [], deleted: [], fixes: {}, texts: [], textLog: {}, drafts: {}, examples: { removed: false, progress: {} }, prefs: clonePrefs() };
}

const num = (v, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const normLevel = (l) => (LEVELS.includes(l) ? l : "");

export function cleanProgress(p) {
  const out = newProgress();
  if (!isObj(p)) return out;
  for (const k of ["box", "due", "seen", "right", "wrong", "hinted", "first", "last"]) out[k] = num(p[k]);
  if (isObj(p.ms)) {
    for (const [m, v] of Object.entries(p.ms)) {
      if (Array.isArray(v)) out.ms[m] = [num(v[0]), num(v[1])];
    }
  }
  return out;
}

// Korrektur einer Karte aus data/cards.json: nur die geänderten Felder. null, wenn nichts Gültiges darin steht.
const FIX_TEXT = ["cat", "term", "de", "prompt", "sentence", "answer", "plain", "note", "reg", "region", "hint", "trigger", "topic"];
export const FIX_FIELDS = [...FIX_TEXT, "alt", "wrong", "variants", "xref", "unsure", "level"];
export function cleanFix(f) {
  if (!isObj(f)) return null;
  const out = {};
  for (const k of FIX_TEXT) if (typeof f[k] === "string") out[k] = f[k];
  for (const k of ["alt", "wrong"]) if (Array.isArray(f[k])) out[k] = f[k].filter((a) => typeof a === "string" && a.trim());
  if (Array.isArray(f.variants)) out.variants = f.variants.filter((v) => isObj(v) && v.region && v.term);
  if (isObj(f.xref)) out.xref = f.xref;
  if (typeof f.unsure === "boolean") out.unsure = f.unsure;
  if (typeof f.level === "string") out.level = normLevel(f.level); // "" = keine Einschätzung
  return Object.keys(out).length ? out : null;
}

export function normalize(raw) {
  const s = createState();
  if (!isObj(raw)) return s;
  if (isObj(raw.progress)) for (const [id, p] of Object.entries(raw.progress)) s.progress[id] = cleanProgress(p);
  if (Array.isArray(raw.custom)) s.custom = raw.custom.filter((c) => isObj(c) && c.id && c.term && c.area in AREAS);
  if (isObj(raw.fixes)) {
    for (const [id, f] of Object.entries(raw.fixes)) {
      const fix = cleanFix(f);
      if (fix) s.fixes[id] = fix;
    }
  }
  if (Array.isArray(raw.deleted)) s.deleted = raw.deleted.filter((id) => typeof id === "string");
  if (Array.isArray(raw.texts)) s.texts = raw.texts.filter((t) => isObj(t) && t.id && t.text && Array.isArray(t.gaps));
  if (isObj(raw.textLog)) for (const [id, d] of Object.entries(raw.textLog)) if (typeof d === "number") s.textLog[id] = d;
  if (isObj(raw.drafts)) s.drafts = raw.drafts;
  if (isObj(raw.examples)) {
    s.examples.removed = raw.examples.removed === true;
    if (!s.examples.removed && isObj(raw.examples.progress)) {
      for (const [id, p] of Object.entries(raw.examples.progress)) s.examples.progress[id] = cleanProgress(p);
    }
  }
  if (isObj(raw.prefs)) {
    const p = raw.prefs;
    const d = s.prefs;
    d.area = p.area === GESAMT || p.area in AREAS ? p.area : d.area;
    d.variant = p.variant === "latam" ? "latam" : "es";
    d.country = d.variant === "latam" && typeof p.country === "string" ? p.country : "";
    d.strictAccents = p.strictAccents === true;
    d.theme = p.theme === "light" || p.theme === "dark" ? p.theme : "auto";
    d.speak = typeof p.speak === "boolean" ? p.speak : d.speak;
    d.voice = typeof p.voice === "string" ? p.voice : "";
    d.rate = num(p.rate, d.rate);
    for (const a of Object.keys(AREAS)) {
      if (isObj(p.budget)) d.budget[a] = num(p.budget[a], d.budget[a]);
      if (isObj(p.newPerDay)) d.newPerDay[a] = num(p.newPerDay[a], d.newPerDay[a]);
    }
  }
  return s;
}

export function load(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch { /* beschädigt oder gesperrt: mit leerem Stand starten */ }
  return createState();
}

export function save(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// Karte aus data/ mit ihrer Korrektur; „level“ gehört nicht zur Karte.
export function applyFix(card, fix) {
  if (!fix) return card;
  const out = { ...card };
  for (const [k, v] of Object.entries(fix)) {
    if (k === "level") continue;
    const empty = v === "" || v === undefined || (Array.isArray(v) && !v.length);
    if (["alt", "note", "reg", "region", "hint", "trigger", "plain", "variants", "xref", "prompt"].includes(k) && empty) delete out[k];
    else out[k] = v;
  }
  return out;
}

// Alle Karten, die gerade gelten: Startkarten mit Korrekturen, ohne gelöschte, dazu Beispielkarten (solange nicht entfernt)
// und eigene Karten. Korrekturen zu unbekannten IDs werden ignoriert.
export function allCards(base, examples, state) {
  const gone = new Set(state.deleted);
  const fixes = state.fixes || {};
  const ex = state.examples.removed ? [] : examples;
  return [...base.filter((c) => !gone.has(c.id)).map((c) => applyFix(c, fixes[c.id])), ...ex, ...state.custom.filter((c) => !gone.has(c.id))];
}

export const isExample = (c) => !!(c && (c.example === true || /^x\d+$/.test(c.id || "")));

// Fortschritt einer Karte; Beispielkarten haben einen eigenen Bereich im Lernstand.
export function progressOf(state, id) {
  const store = /^x\d+$/.test(id) ? state.examples.progress : state.progress;
  return store[id] || (store[id] = newProgress());
}

// Fortschrittsabfrage ohne Anlegen (für Plan und Statistik)
export function peekProgress(state, id) {
  return (/^x\d+$/.test(id) ? state.examples.progress : state.progress)[id];
}

// Karten eines Bereichs; „gesamt“ liefert alle
export const inArea = (cards, area) => (area === GESAMT ? cards : cards.filter((c) => c.area === area));
// Für Statistik und Gesamtansicht: ohne Beispielkarten
export const statCards = (cards, area = GESAMT) => inArea(cards, area).filter((c) => !isExample(c));

// Knopf „Beispielkarten entfernen“: Karten und ihr Fortschritt gehen weg.
export function removeExamples(state) {
  state.examples = { removed: true, progress: {} };
  return state;
}

// Nächste freie ID für eigene Karten (u01, u02 …). IDs werden nie wiederverwendet.
export function nextCustomId(base, state) {
  const used = new Set([...base, ...state.custom].map((c) => c.id));
  for (const id of state.deleted) used.add(id);
  let n = 1;
  while (used.has("u" + String(n).padStart(2, "0"))) n++;
  return "u" + String(n).padStart(2, "0");
}
