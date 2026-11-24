// Reiter „Heute“: Tagesplan des gewählten Bereichs nach Zeitbudget und neuen Karten pro Tag, dazu der Lernstand.
import { esc } from "../core/dom.js";
import { MODES, LEVELS } from "../core/modes.js";
import { buildPlan, planKey } from "../core/plan.js";
import { categoryOf, STATUS } from "../core/srs.js";
import { peekProgress, statCards } from "../core/state.js";
import { AREAS } from "../core/cards.js";
import { today } from "../core/dates.js";
import { icon } from "../core/icons.js";
import { start, startText } from "./practice.js";
import { suggestTexts, textsOf } from "../core/texts.js";
import { needsBackup, daysSinceBackup } from "../core/backup.js";
import { openTool } from "./library.js";
import { ART } from "../core/art.js";

const BUDGETS = [10, 20, 30, 40, 60, 90];
const NEW_PER_DAY = [3, 5, 10, 15, 20, 30];

// Gesamtansicht: Tagesplan und Üben gibt es nur pro Bereich
export function needArea(root, app, what) {
  root.innerHTML = `<h1>${esc(what)}</h1><p class="prompt">„${esc(what)}“ gibt es pro Bereich, denn Zeitbudget und neue Karten gelten dort. Die Gesamtansicht zeigt nur Statistik und Sammlung. Wähle einen Bereich:</p>` +
    '<div class="btnrow">' + Object.entries(AREAS).map(([k, v]) => `<button type="button" class="primary" data-area="${k}">${icon(k)} ${esc(v)}</button>`).join(" ") + "</div>";
  root.querySelectorAll("button[data-area]").forEach((b) => b.addEventListener("click", () => app.setArea(b.dataset.area)));
}

function tile(sym, n, label) {
  return `<div class="tile"><span class="sym" aria-hidden="true">${sym}</span><strong>${n}</strong><span>${esc(label)}</span></div>`;
}

const options = (vals, cur, unit = "") =>
  [...new Set([...vals, cur])].sort((a, b) => a - b).map((v) => `<option value="${v}"${v === cur ? " selected" : ""}>${v}${unit}</option>`).join("");

export function render(root, app) {
  const { state } = app;
  const area = state.prefs.area;
  if (area === "gesamt") { needArea(root, app, "Heute"); return; }
  const day = today();
  const cards = app.areaCards();
  if (!app.plan || app.plan.day !== day || app.plan.key !== planKey(state.prefs, area)) app.plan = buildPlan(cards, state, day, area, app.ctx());
  const plan = app.plan;
  const prog = (id) => peekProgress(state, id);
  const doneToday = cards.filter((c) => prog(c.id) && prog(c.id).last === day).length;

  let h = `<h1>Heute · ${esc(AREAS[area])}</h1><h2>Tagesplan</h2>` +
    `<p class="prompt">Geplant sind Aufgaben für etwa <strong>${plan.used} Minuten</strong> aus ${plan.pool} Kandidaten (fällige und neue Karten). Heute schon geübt: <strong>${doneToday}</strong> Karten.</p>` +
    '<div class="controls">' +
    `<label>Zeit <select id="bdSel">${options(BUDGETS, state.prefs.budget[area], " Minuten")}</select></label>` +
    `<label>Neue Karten pro Tag <select id="npSel">${options(NEW_PER_DAY, state.prefs.newPerDay[area])}</select></label>` +
    '<button type="button" class="small" id="rePlan">Neu planen</button></div>';

  if (!cards.length) {
    h += `<div class="empty">${ART.book}<p class="prompt">In diesem Bereich gibt es noch keine Karten. Unter „Sammlung“ legst du eigene an oder importierst sie von Claude.</p></div>`;
  } else if (!plan.blocks.length) {
    h += `<div class="empty">${ART.sun}<p class="prompt">Für heute ist nichts mehr fällig${plan.skippedNew ? ", und das Limit für neue Karten ist erreicht" : ""}. Du kannst unter „Üben“ selbst etwas wählen.</p></div>`;
  } else {
    plan.blocks.forEach((b, i) => {
      const done = b.ids.filter((id) => prog(id) && prog(id).last === day).length;
      const M = MODES[b.mode];
      const all = done >= b.ids.length;
      h += `<div class="block">${icon(b.mode)}<div class="meta"><strong>${esc(M.label)}</strong><span>${b.ids.length} Karten · ca. ${b.mins} Min. · ${esc(LEVELS[M.lv])}${done ? " · " + done + " erledigt" : ""}</span></div>` +
        `<button type="button" class="small${all ? "" : " primary"}" data-blk="${i}">${all ? "Nochmal" : done ? "Fortsetzen" : "Start"}</button></div>`;
    });
    h += '<p class="hint">Die Reihenfolge geht von leicht zu schwer. Welche Übungsart eine Karte bekommt, hängt von ihrer Stufe ab.</p>';
  }

  // Stufe 5: die drei Texte, die am besten zum Lernstand passen
  const texts = textsOf(app.texts(), area, state);
  h += '<h2>Texte</h2>';
  if (!texts.length) h += '<p class="prompt">Noch kein Text in diesem Bereich. Unter „Üben“ → „Texte“ holst du dir einen von Claude. Erst durch einen Text kommen Karten in Stufe 5.</p>';
  else {
    h += '<p class="prompt">Ein Lückentext übt mehrere Wendungen im Zusammenhang (ca. 6 Minuten).</p>';
    const known = new Set(app.cards().map((c) => c.id));
    for (const { t } of suggestTexts(texts, state, day, known, state.prefs, 3)) {
      h += `<div class="block">${icon("cloze")}<div class="meta"><strong>${esc(t.title)}</strong><span>${esc(t.kind)} · ${t.gaps.length} Lücken</span></div>` +
        `<button type="button" class="small" data-text="${esc(t.id)}">Öffnen</button></div>`;
    }
  }

  // Lernstand ohne Beispielkarten
  const by = { new: 0, developing: 0, problem: 0, mastered: 0 };
  for (const c of statCards(cards)) by[categoryOf(prog(c.id))]++;
  h += '<h2>Lernstand</h2><div class="tiles">' + tile("○", by.new, STATUS.new) + tile("◐", by.developing, STATUS.developing) +
    tile("▲", by.problem, STATUS.problem) + tile("●", by.mastered, STATUS.mastered) + "</div>";
  if (cards.some((c) => c.example)) h += '<p class="hint">Beispielkarten stehen im Plan, zählen aber nicht in den Lernstand. Du entfernst sie unter Einstellungen.</p>';
  if (needsBackup(state)) {
    const d = daysSinceBackup(state);
    h += `<h2>Sicherung</h2><p class="prompt">${d === null ? "Du hast noch nie gesichert." : `Deine letzte Sicherung ist ${d} Tage alt.`} Ohne Sicherung gehen Lernstand und eigene Karten verloren, wenn der Browser seine Daten löscht.</p>` +
      '<div class="btnrow"><button type="button" id="goBackup">Jetzt sichern</button></div>';
  }
  root.innerHTML = h;
  root.querySelector("#goBackup")?.addEventListener("click", () => { openTool("backup"); app.go("library"); });

  root.querySelectorAll("button[data-blk]").forEach((btn) => btn.addEventListener("click", () => {
    const b = plan.blocks[Number(btn.dataset.blk)];
    const open = b.ids.filter((id) => !prog(id) || prog(id).last !== day);
    start(app, b.mode, open.length ? open : b.ids);
  }));
  root.querySelectorAll("button[data-text]").forEach((btn) => btn.addEventListener("click", () => startText(app, btn.dataset.text)));
  root.querySelector("#bdSel").addEventListener("change", (e) => { state.prefs.budget[area] = Number(e.target.value); app.save(); render(root, app); });
  root.querySelector("#npSel").addEventListener("change", (e) => { state.prefs.newPerDay[area] = Number(e.target.value); app.save(); render(root, app); });
  root.querySelector("#rePlan").addEventListener("click", () => { app.invalidatePlan(); render(root, app); });
}
