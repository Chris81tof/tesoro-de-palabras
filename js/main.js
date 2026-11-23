// Start der App: Daten laden, Lernstand lesen, Bereich und Reiter verwalten.
import { $, esc } from "./core/dom.js";
import { load, save, allCards, inArea, GESAMT } from "./core/state.js";
import { AREAS } from "./core/cards.js";
import { icon } from "./core/icons.js";
import * as todayView from "./views/today.js";
import * as practiceView from "./views/practice.js";
import * as settingsView from "./views/settings.js";
import { later } from "./views/placeholder.js";

const TABS = [
  { id: "today", label: "Heute", view: todayView },
  { id: "practice", label: "Üben", view: practiceView },
  { id: "transfer", label: "Transfer", view: later("Transfer", 6) },
  { id: "stats", label: "Statistik", view: later("Statistik", 6) },
  { id: "library", label: "Sammlung", view: later("Sammlung", 6) }
];
const PAGES = [{ id: "settings", view: settingsView }];
const VIEWS = { ...AREAS, [GESAMT]: "Gesamt" };

async function boot() {
  const view = $("view");
  let base, examples;
  try {
    [base, examples] = await Promise.all(["data/cards.json", "data/beispiel-karten.json"].map((f) => fetch(f).then((r) => r.json())));
  } catch {
    view.innerHTML = '<p class="msg err">Die Karten konnten nicht geladen werden.</p>';
    return;
  }

  const app = {
    base, examples,
    state: load(localStorage),
    plan: null,
    cards: () => allCards(app.base, app.examples, app.state),
    areaCards: () => inArea(app.cards(), app.state.prefs.area),
    save: () => save(localStorage, app.state),
    invalidatePlan: () => { app.plan = null; },
    setArea: (a) => { app.state.prefs.area = a; app.save(); app.invalidatePlan(); drawTop(); show(); },
    go: (id) => {
      if (location.hash !== "#" + id) location.hash = id;
      else show();
    }
  };

  const top = $("top");
  function drawTop() {
    top.innerHTML = '<div class="areabar"><div class="seg" role="group" aria-label="Bereich">' +
      Object.entries(VIEWS).map(([k, v]) => `<button type="button" data-area="${k}" aria-pressed="${app.state.prefs.area === k}">${icon(k)}<span>${esc(v)}</span></button>`).join("") +
      `</div><a class="iconbtn" href="#settings" aria-label="Einstellungen">${icon("settings")}</a></div>`;
    top.querySelectorAll("button[data-area]").forEach((b) => b.addEventListener("click", () => app.setArea(b.dataset.area)));
  }

  const nav = $("tabs");
  nav.innerHTML = TABS.map((t) => `<a href="#${t.id}" data-tab="${t.id}">${icon(t.id)}<span>${esc(t.label)}</span></a>`).join("");

  let current = null;
  function show() {
    const id = location.hash.slice(1);
    const tab = [...TABS, ...PAGES].find((t) => t.id === id) || TABS[0];
    if (current && current !== tab) current.view?.leave?.();
    current = tab;
    nav.querySelectorAll("a").forEach((a) => {
      if (a.dataset.tab === tab.id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    tab.view.render(view, app);
    window.scrollTo(0, 0);
  }

  drawTop();
  window.addEventListener("hashchange", show);
  document.addEventListener("keydown", practiceView.onKey);
  show();
}

boot();
