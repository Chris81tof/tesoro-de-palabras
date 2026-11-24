// Sicherung exportieren und einlesen (Format 1). Die Sicherung enthält den ganzen Gerätestand:
// Fortschritt, eigene Karten, Korrekturen, gelöschte IDs, Texte, Entwürfe, Beispielkarten-Stand und Einstellungen.
// Die Karten aus data/ stehen nicht darin, nur das, was du dazugetan oder geändert hast.
import { FORMAT, normalize } from "./state.js";
import { cardErrors } from "./cards.js";
import { isoDate } from "./dates.js";

export const APP = "tesoro-de-palabras";
export const BEFORE_KEY = "tesoro-de-palabras-v1-vorher";
const ENGLISH_APP = "word-bank-trainer";

// Der Zeitpunkt der Sicherung steht schon in der Datei (backup.last), damit ein Wiederherstellen nicht „noch nie gesichert“ zeigt.
export function exportData(state, now = new Date()) {
  return { app: APP, format: FORMAT, exported: now.toISOString(), cards: Object.keys(state.progress).length + Object.keys(state.examples.progress).length, ...state, backup: { last: now.getTime() } };
}

export function backupName(now = new Date()) {
  return `${APP}-lernstand-${isoDate(now)}.json`;
}

// Merkt sich, wann zuletzt gesichert wurde (für den Hinweis auf „Heute“)
export function markBackup(state, now = Date.now()) {
  state.backup = { last: now };
  return state;
}

// Tage seit der letzten Sicherung; null, wenn es noch keine gab
export function daysSinceBackup(state, now = Date.now()) {
  return state.backup && state.backup.last ? Math.floor((now - state.backup.last) / 86400000) : null;
}

// Ist ein Erinnerungshinweis sinnvoll? Nur wenn es etwas zu sichern gibt.
export function needsBackup(state, now = Date.now(), days = 7) {
  const worth = Object.values(state.progress).some((p) => p.seen > 0) || state.custom.length > 0 || Object.keys(state.fixes).length > 0 || state.texts.length > 0;
  if (!worth) return false;
  const d = daysSinceBackup(state, now);
  return d === null || d >= days;
}

// Liest eine Sicherung (Text). Wirft einen Fehler mit deutscher Meldung, wenn die Datei nicht passt.
// Ergebnis: { state, warnings }. Ungültige eigene Karten werden nicht übernommen und gemeldet.
export function parseBackup(raw) {
  let o;
  try {
    o = JSON.parse(raw);
  } catch {
    throw new Error("Das ist keine gültige Sicherung von Tesoro de Palabras (die Datei enthält kein lesbares JSON).");
  }
  if (!o || typeof o !== "object" || Array.isArray(o)) throw new Error("Das ist keine gültige Sicherung von Tesoro de Palabras.");
  if (o.app === ENGLISH_APP) throw new Error("Das ist eine Sicherung des Englisch-Trainers (Word Bank Trainer). Sie lässt sich hier nicht einspielen.");
  if (o.app !== APP) throw new Error("Das ist keine Sicherung von Tesoro de Palabras.");
  if (typeof o.format === "number" && o.format > FORMAT) throw new Error("Diese Sicherung stammt aus einer neueren Version der App. Bitte die App aktualisieren.");
  if (o.format !== FORMAT) throw new Error("Das Format dieser Sicherung wird nicht unterstützt.");
  const state = normalize(o);
  const warnings = [];
  const bad = state.custom.filter((c) => cardErrors(c).length);
  if (bad.length) {
    state.custom = state.custom.filter((c) => !cardErrors(c).length);
    warnings.push(`${bad.length} eigene ${bad.length === 1 ? "Karte war" : "Karten waren"} ungültig und ${bad.length === 1 ? "wurde" : "wurden"} nicht übernommen: ${bad.map((c) => c.term || c.id).join(", ")}.`);
  }
  return { state, warnings };
}

// Was steckt in einem Gerätestand? Für die Rückfrage vor dem Wiederherstellen.
export function summarizeState(state) {
  const seen = Object.values(state.progress).filter((p) => p.seen > 0).length;
  const byArea = (a) => state.custom.filter((c) => c.area === a).length;
  return {
    seen, custom: state.custom.length, customAllgemein: byArea("allgemein"), customSchule: byArea("schule"),
    fixes: Object.keys(state.fixes).length, texts: state.texts.length, deleted: state.deleted.length,
    examplesRemoved: state.examples.removed, examplesSeen: Object.values(state.examples.progress).filter((p) => p.seen > 0).length
  };
}

const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function describeState(state) {
  const s = summarizeState(state);
  const parts = [
    `${pl(s.seen, "Karte", "Karten")} mit Lernstand`,
    `${pl(s.custom, "eigene Karte", "eigene Karten")} (${s.customAllgemein} Allgemein, ${s.customSchule} Schulgespräche)`,
    pl(s.fixes, "Korrektur", "Korrekturen"),
    pl(s.texts, "eigener Text", "eigene Texte")
  ];
  if (s.deleted) parts.push(pl(s.deleted, "entfernte Karte", "entfernte Karten"));
  return parts.join(", ");
}

// Vor dem Wiederherstellen den aktuellen Stand zur Seite legen, damit sich der Schritt rückgängig machen lässt.
export function snapshotBefore(storage, state, now = new Date()) {
  try {
    storage.setItem(BEFORE_KEY, JSON.stringify({ at: now.toISOString(), state }));
    return true;
  } catch {
    return false;
  }
}

export function readSnapshot(storage) {
  try {
    const raw = storage.getItem(BEFORE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    return o && o.state ? { at: o.at, state: normalize(o.state) } : null;
  } catch {
    return null;
  }
}

export function clearSnapshot(storage) {
  try { storage.removeItem(BEFORE_KEY); } catch { /* nichts zu tun */ }
}

