// Reiter „Üben“: Übungsart wählen, Runde starten, Karten der Reihe nach abfragen. Gilt für den gewählten Bereich.
import { esc, shuffle } from "../core/dom.js";
import { MODES, LEVELS } from "../core/modes.js";
import { record, categoryOf, isDue, MASTERED } from "../core/srs.js";
import { progressOf, peekProgress } from "../core/state.js";
import { today } from "../core/dates.js";
import { icon } from "../core/icons.js";
import { AREAS } from "../core/cards.js";
import * as meaning from "../exercises/meaning.js";
import * as cards from "../exercises/cards.js";
import * as explain from "../exercises/explain.js";
import * as choice from "../exercises/choice.js";
import * as gap from "../exercises/gap.js";
import * as translate from "../exercises/translate.js";
import * as error from "../exercises/error.js";
import { needArea } from "./today.js";

const EX = { meaning, cards, explain, choice, gap, translate, error };
const SCOPES = { due: "Heute fällig", open: "Alle nicht gemeisterten", problem: "Nur problematische", all: "Alle Karten" };
const SIZES = [10, 20, 50, 0];

// Auswahl bleibt erhalten, solange die App offen ist
const pick = { mode: "meaning", cat: "all", scope: "due", size: 20 };
let session = null;

// Vom Tagesplan aus: diese Karten mit dieser Übung
export function start(app, mode, ids) {
  pick.mode = mode;
  const byId = new Map(app.cards().map((c) => [c.id, c]));
  begin(app, ids.filter((id) => byId.has(id)), ids.length);
  app.go("practice");
}

export function leave() { /* Vorlesen kommt in Schritt 10 */ }

function eligible(app) {
  const all = app.cards();
  const M = MODES[pick.mode];
  const day = today();
  return app.areaCards().filter((c) => {
    if (pick.cat !== "all" && c.cat !== pick.cat) return false;
    if (!M.need(c, all)) return false;
    const p = peekProgress(app.state, c.id);
    if (pick.scope === "due") return isDue(p, day);
    if (pick.scope === "problem") return categoryOf(p) === "problem";
    if (pick.scope === "open") return !p || p.box < MASTERED;
    return true;
  });
}

function queueFromPick(app) {
  const p = (c) => peekProgress(app.state, c.id);
  const rank = (c) => (categoryOf(p(c)) === "problem" ? 0 : p(c) && p(c).seen ? 1 : 2);
  const list = shuffle(eligible(app)).sort((a, b) => rank(a) - rank(b) || (p(a)?.due || 0) - (p(b)?.due || 0));
  begin(app, (pick.size ? list.slice(0, pick.size) : list).map((c) => c.id), list.length);
}

function begin(app, ids, avail) {
  session = {
    mode: pick.mode, queue: ids, total: ids.length, avail, right: 0, wrong: 0,
    result: null, ui: null, flipped: false, cards: app.cards(), prefs: app.state.prefs, rerender: null
  };
}

export function render(root, app) {
  if (app.state.prefs.area === "gesamt") { needArea(root, app, "Üben"); return; }
  if (session) renderSession(root, app);
  else renderPicker(root, app);
}

const modeBtn = (m, label) =>
  `<button type="button" class="mode${m === pick.mode ? " on" : ""}" data-mode="${m}" aria-pressed="${m === pick.mode}">${icon(m)}<span>${esc(label)}</span></button>`;

function renderPicker(root, app) {
  const cats = [...new Set(app.areaCards().map((c) => c.cat))];
  const n = eligible(app).length;
  let h = `<h1>Üben · ${esc(AREAS[app.state.prefs.area])}</h1>`;
  for (const lv of [1, 2, 3, 4]) {
    const ms = Object.entries(MODES).filter(([, M]) => M.lv === lv);
    h += `<h2 class="lvl">${esc(LEVELS[lv])}</h2><div class="modes">` + ms.map(([m, M]) => modeBtn(m, M.label)).join("") + "</div>";
  }
  h += `<p class="hint">${esc(MODES[pick.mode].desc)}</p>` +
    '<div class="controls">' +
    '<label>Kategorie <select id="catSel"><option value="all">Alle</option>' +
    cats.map((c) => `<option value="${esc(c)}"${c === pick.cat ? " selected" : ""}>${esc(c)}</option>`).join("") + "</select></label>" +
    '<label>Karten <select id="scopeSel">' +
    Object.entries(SCOPES).map(([k, v]) => `<option value="${k}"${k === pick.scope ? " selected" : ""}>${v}</option>`).join("") + "</select></label>" +
    '<label>Rundengröße <select id="sizeSel">' +
    SIZES.map((v) => `<option value="${v}"${v === pick.size ? " selected" : ""}>${v || "Alle"}</option>`).join("") + "</select></label></div>" +
    `<div class="btnrow"><button type="button" class="primary" id="go"${n ? "" : " disabled"}>Runde starten</button></div>` +
    `<p class="hint">${n} passende Karten.</p>`;
  root.innerHTML = h;
  root.querySelectorAll("button.mode").forEach((b) => b.addEventListener("click", () => { pick.mode = b.dataset.mode; render(root, app); }));
  root.querySelector("#catSel").addEventListener("change", (e) => { pick.cat = e.target.value; render(root, app); });
  root.querySelector("#scopeSel").addEventListener("change", (e) => { pick.scope = e.target.value; render(root, app); });
  root.querySelector("#sizeSel").addEventListener("change", (e) => { pick.size = Number(e.target.value); render(root, app); });
  root.querySelector("#go").addEventListener("click", () => { queueFromPick(app); render(root, app); });
}

function renderSession(root, app) {
  const s = session;
  const M = MODES[s.mode];
  root.innerHTML = `<div class="sessionbar"><h1 class="withicon">${icon(s.mode)}${esc(M.label)}</h1>` +
    '<div class="acts"><button type="button" class="small" id="stop">Beenden</button></div></div><div id="study" aria-live="polite"></div>';
  root.querySelector("#stop").addEventListener("click", () => { session = null; render(root, app); });
  const box = root.querySelector("#study");
  const byId = new Map(app.cards().map((c) => [c.id, c]));

  const reset = () => { s.result = null; s.ui = null; s.flipped = false; s.typed = ""; s.hint = null; };
  s.rerender = () => renderSession(root, app);
  // Ergebnis verbuchen; falsch beantwortete Karten kommen zwei Plätze später noch einmal.
  // hinted: richtig, aber mit Hinweis (z. B. fehlender Akzent): bleibt auf der Stufe, morgen wieder fällig.
  s.answer = (ok, hinted = false) => {
    const id = s.queue.shift();
    record(progressOf(app.state, id), ok, s.mode, today(), ok && hinted);
    if (ok) s.right++;
    else { s.wrong++; s.queue.splice(Math.min(2, s.queue.length), 0, id); }
    app.save();
    app.invalidatePlan();
    reset();
    s.rerender();
  };
  s.next = () => { if (s.result) s.answer(s.result.ok, !!s.result.hinted); };

  while (s.queue.length && !byId.has(s.queue[0])) s.queue.shift();
  const c = byId.get(s.queue[0]);
  if (!c) { renderSummary(box, root, app); return; }
  EX[s.mode].render(box, c, s);
}

function renderSummary(box, root, app) {
  const s = session;
  const msg = s.total === 0
    ? (pick.scope === "due"
      ? "Für diese Auswahl ist heute nichts mehr fällig. Wähle „Alle nicht gemeisterten“ oder komm morgen wieder."
      : "Für diese Auswahl gibt es keine passenden Karten.")
    : `Runde geschafft: ${s.right} richtig, ${s.wrong} zum Wiederholen.` +
      (s.avail > s.total ? ` In dieser Auswahl warten noch ${s.avail - s.total} weitere Karten.` : "");
  box.innerHTML = `<div class="summary"><p>${esc(msg)}</p><div class="btnrow"><button type="button" class="primary" id="again">Neue Runde</button><button type="button" id="toPlan">Zum Tagesplan</button></div></div>`;
  box.querySelector("#again").addEventListener("click", () => { session = null; render(root, app); });
  box.querySelector("#toPlan").addEventListener("click", () => { session = null; app.go("today"); });
  box.querySelector("#again").focus();
}

// Tastatur: 1–4 wählt eine Option, Pfeile bewerten Karteikarten
export function onKey(e) {
  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
  if (e.ctrlKey || e.metaKey || e.altKey || !session) return;
  const study = document.getElementById("study");
  if (!study) return;
  const click = (sel) => { const b = study.querySelector(sel); if (b && !b.disabled) { e.preventDefault(); b.click(); } };
  if (/^[1-4]$/.test(e.key)) click(`button.opt[data-i="${Number(e.key) - 1}"]`);
  else if (e.key === "ArrowLeft") click("#again1");
  else if (e.key === "ArrowRight") click("#known");
}
