// Reiter „Heute“: Tagesplan des gewählten Bereichs nach Zeitbudget und neuen Karten pro Tag, dazu der Lernstand.
import { esc } from "../core/dom.js";
import { MODES, LEVELS } from "../core/modes.js";
import { buildPlan, planKey } from "../core/plan.js";
import { categoryOf, STATUS } from "../core/srs.js";
import { peekProgress, statCards } from "../core/state.js";
import { AREAS } from "../core/cards.js";
import { today } from "../core/dates.js";
import { icon } from "../core/icons.js";
import { start } from "./practice.js";

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
  if (!app.plan || app.plan.day !== day || app.plan.key !== planKey(state.prefs, area)) app.plan = buildPlan(cards, state, day, area);
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
    h += '<p class="prompt">In diesem Bereich gibt es noch keine Karten. Unter „Sammlung“ kannst du später Karten hinzufügen (kommt in Schritt 6 bis 8).</p>';
  } else if (!plan.blocks.length) {
    h += `<p class="prompt">Für heute ist nichts mehr fällig${plan.skippedNew ? ", und das Limit für neue Karten ist erreicht" : ""}. Du kannst unter „Üben“ selbst etwas wählen.</p>`;
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

  // Lernstand ohne Beispielkarten
  const by = { new: 0, developing: 0, problem: 0, mastered: 0 };
  for (const c of statCards(cards)) by[categoryOf(prog(c.id))]++;
  h += '<h2>Lernstand</h2><div class="tiles">' + tile("○", by.new, STATUS.new) + tile("◐", by.developing, STATUS.developing) +
    tile("▲", by.problem, STATUS.problem) + tile("●", by.mastered, STATUS.mastered) + "</div>";
  if (cards.some((c) => c.example)) h += '<p class="hint">Beispielkarten stehen im Plan, zählen aber nicht in den Lernstand. Du entfernst sie unter Einstellungen.</p>';
  root.innerHTML = h;

  root.querySelectorAll("button[data-blk]").forEach((btn) => btn.addEventListener("click", () => {
    const b = plan.blocks[Number(btn.dataset.blk)];
    const open = b.ids.filter((id) => !prog(id) || prog(id).last !== day);
    start(app, b.mode, open.length ? open : b.ids);
  }));
  root.querySelector("#bdSel").addEventListener("change", (e) => { state.prefs.budget[area] = Number(e.target.value); app.save(); render(root, app); });
  root.querySelector("#npSel").addEventListener("change", (e) => { state.prefs.newPerDay[area] = Number(e.target.value); app.save(); render(root, app); });
  root.querySelector("#rePlan").addEventListener("click", () => { app.invalidatePlan(); render(root, app); });
}
