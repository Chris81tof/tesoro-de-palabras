// Reiter „Sammlung“: Werkzeuge oben (zugeklappt, immer nur eines offen), angepinnte Suche mit Filtern,
// schlanke Kartenliste, die in Abschnitten nachlädt. Bearbeiten, Import und Sicherung folgen in Schritt 7 bis 9.
import { esc, armed } from "../core/dom.js";
import { cue } from "../core/modes.js";
import { categoryOf, STATUS, MAX_BOX } from "../core/srs.js";
import { peekProgress, isExample, GESAMT } from "../core/state.js";
import { today } from "../core/dates.js";
import { icon } from "../core/icons.js";
import { REG, REGION, AREAS, modeLabel } from "../core/cards.js";
import { viewOf, regionLabel } from "../core/variants.js";
import { PAGE, STAT_OPTS, filterCards, categoriesOf, statusLabel, nextShown, restCount, toggleOne, toggleIn, regionOptions, levelOptions, levelOf, isEdited } from "../core/library.js";

// tool: das offene Werkzeug, expanded: die aufgeklappte Karte, shown: wie viele Karten gezeichnet werden
const ui = { q: "", cat: "all", stat: "all", region: "all", level: "all", shown: PAGE, tool: "", expanded: "", selecting: false, picked: new Set(), areaFilter: "all" };
let flash = {};
let io = null;

export function leave() {
  if (io) { io.disconnect(); io = null; }
  document.getElementById("view")?.classList.remove("libpage");
}

const areaOf = (app) => (app.state.prefs.area === GESAMT ? ui.areaFilter : app.state.prefs.area);

function matched(app) {
  const area = areaOf(app);
  return filterCards(app.cards(), { ...ui, area: area === "all" ? GESAMT : area }, { state: app.state, day: today(), levels: app.levels });
}

function removeCards(app, ids) {
  const { state } = app;
  const gone = new Set(ids);
  state.custom = state.custom.filter((c) => !gone.has(c.id));
  for (const id of ids) if (!state.deleted.includes(id)) state.deleted.push(id);
  for (const id of ids) ui.picked.delete(id);
  if (gone.has(ui.expanded)) ui.expanded = "";
  app.save();
  app.invalidatePlan();
}

const sel = (id, label, opts, cur) =>
  `<label class="fl"><span class="sr">${esc(label)}</span><select id="${id}" aria-label="${esc(label)}">${opts.map(([v, t]) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;

// Eine Zeile: Symbol, Ausdruck, Lernstand. Die Details entstehen erst beim Aufklappen.
function rowHtml(app, c, day) {
  const p = peekProgress(app.state, c.id);
  const open = !ui.selecting && ui.expanded === c.id;
  const picked = ui.picked.has(c.id);
  const head = ui.selecting ? `role="checkbox" aria-checked="${picked}"` : `aria-expanded="${open}"`;
  const ex = isExample(c);
  return `<li class="lrow" data-id="${esc(c.id)}"><button type="button" class="lhead" ${head}>` +
    (ui.selecting ? `<span class="box${picked ? " on" : ""}" aria-hidden="true"></span>` : "") +
    `${icon(c.area === "schule" ? "schule" : "allgemein")}<span class="sr">${esc(AREAS[c.area])}, ${esc(c.cat)}: </span><span class="t">${esc(c.term)}${ex ? ' <span class="example-badge">Beispiel</span>' : ""}</span>` +
    `<span class="st${categoryOf(p) === "problem" ? " p" : ""}">${esc(statusLabel(p))}</span></button>` +
    `<div class="ld"${open ? "" : " hidden"}>${open ? detailHtml(app, c, day) : ""}</div></li>`;
}

const unsure = '<span class="unsure">? unsicher</span>';

function detailHtml(app, c, day) {
  const p = peekProgress(app.state, c.id);
  const l = levelOf(c, app.levels, app.state);
  const v = viewOf(c, app.state.prefs);
  const status = STATUS[categoryOf(p)] + (p && p.seen ? ` · Stufe ${p.box} von ${MAX_BOX}` : "");
  return `<p>${esc(AREAS[c.area])} · ${esc(c.cat)}${c.topic ? " · " + esc(c.topic) : ""}${/^u\d+$/.test(c.id) ? " · eigene Karte" : ""} · ${esc(status)}${isEdited(app.state, c.id) ? ' · <span class="edited">bearbeitet</span>' : ""}</p>` +
    (cue(c) ? `<p>${esc(cue(c))}</p>` : "") +
    (v.shown.term !== c.term ? `<p>In deiner Variante: <b>${esc(v.shown.term)}</b>${v.shown.unsure ? " " + unsure : ""}</p>` : "") +
    (c.sentence ? `<p>${esc(c.sentence.replace(/____/g, v.shown.answers[0]))}</p>` : "") +
    (c.trigger ? `<p>Auslöser: ${esc(c.trigger)}${c.mode ? " · Modus: " + esc(modeLabel(c)) : ""}</p>` : "") +
    (v.others.length ? "<p>Auch: " + v.others.map((o) => `${esc(o.term)} (${esc(o.region ? regionLabel(o.region) : "überall")})${o.unsure ? " " + unsure : ""}`).join("; ") + "</p>" : "") +
    v.warnings.map((w) => `<p class="warnbox">${icon("warn")}<span>„${esc(w.term)}“ gilt in ${esc(regionLabel(w.region))} als vulgär.</span></p>`).join("") +
    (c.note ? `<p>${esc(c.note)}</p>` : "") +
    (c.xref ? "<p>Querverweise: " + Object.entries(c.xref).map(([k, t]) => `${esc(k)}: ${esc(t)}`).join(" · ") + "</p>" : "") +
    (REG[c.reg] ? `<p>Register: ${esc(REG[c.reg])}</p>` : "") +
    (c.region ? `<p>Gebrauch: ${esc(REGION[c.region] || c.region)}${c.unsure ? " " + unsure : ""}</p>` : c.unsure ? `<p>${unsure}</p>` : "") +
    (l ? `<p>Niveau: ${esc(l)} (eigene Einschätzung)</p>` : "") +
    (p && p.hinted ? `<p>Mit Hinweis gelöst: ${p.hinted} Mal</p>` : "") +
    (c.hint ? `<p>Eigener Hinweis: ${esc(c.hint)}</p>` : "") +
    (p && p.seen ? `<p>Nächste Wiederholung: ${p.due <= day ? "heute fällig" : "in " + (p.due - day) + " Tagen"}</p>` : "") +
    `<p class="hint">ID ${esc(c.id)}</p>` +
    (isExample(c) ? '<p class="hint">Beispielkarten entfernst du in den Einstellungen.</p>' : `<div class="acts"><button type="button" data-del="${esc(c.id)}" aria-label="${esc(c.term)} entfernen">Entfernen</button></div>`);
}

const tool = (id, title, body) => {
  const open = ui.tool === id;
  return `<section class="tool" data-tool="${id}"><button type="button" class="toolhead" id="th-${id}" aria-expanded="${open}" aria-controls="tb-${id}">${esc(title)}</button>` +
    `<div class="toolbody" id="tb-${id}" role="region" aria-labelledby="th-${id}"${open ? "" : " hidden"}>${body}</div></section>`;
};

const msg = (id) => {
  const f = flash[id];
  return `<p class="msg${f ? " " + f[1] : ""}" id="${id}" role="status">${f ? esc(f[0]) : ""}</p>`;
};

export function render(root, app) {
  leave();
  const rerender = () => render(root, app);
  const { state } = app;
  root.classList.add("libpage");
  const gesamt = state.prefs.area === GESAMT;
  const inScope = gesamt ? app.cards() : app.areaCards();
  const area = areaOf(app);
  if (ui.cat !== "all" && !inScope.some((c) => c.cat === ui.cat)) ui.cat = "all";

  const hasExamples = !state.examples.removed;
  let h = `<div class="sessionbar"><h1 class="withicon">${icon("library")}Sammlung · ${esc(gesamt ? "Gesamt" : AREAS[area])}</h1><a class="small btnlink iconbtn" href="#settings" aria-label="Einstellungen">${icon("settings")}</a></div>`;
  h += '<div class="tools">' +
    tool("add", "Eigene Karte anlegen", '<p class="hint">Das Formular kommt mit Schritt 7 (Karten bearbeiten und anlegen).</p>') +
    tool("claude", "Neue Karten von Claude", '<p class="hint">Prompt zum Kopieren und Import per JSON kommen mit Schritt 8.</p>') +
    tool("backup", "Sichern und Wiederherstellen", '<p class="hint">Sicherung und Wiederherstellung kommen mit Schritt 9.</p>') +
    tool("reset", "Zurücksetzen", '<p class="hint">Setzt den Lernstand aller Karten (auch der Beispielkarten) zurück. Karten, eigene Karten und Einstellungen bleiben.</p>' +
      '<button type="button" id="rsBtn">Lernstand zurücksetzen</button>' + msg("rsMsg") +
      (hasExamples ? '<p class="hint">Die Beispielkarten entfernst du in den Einstellungen.</p>' : "")) +
    "</div>";

  const list = matched(app);
  const day = today();
  const shown = Math.min(ui.shown, list.length);
  h += '<div class="lbar" id="lbar">' +
    `<div class="lsearch"><input type="search" id="lq" lang="es" placeholder="Suchen (Wendung, Bedeutung, Satz)" aria-label="Suchen" autocomplete="off" autocapitalize="none" spellcheck="false" value="${esc(ui.q)}">` +
    `<button type="button" class="small${ui.selecting ? " primary" : ""}" id="lsel" aria-pressed="${ui.selecting}">Auswählen</button></div>` +
    '<div class="lfilters">' +
    (gesamt ? sel("fArea", "Bereich", [["all", "Beide Bereiche"], ...Object.entries(AREAS)], ui.areaFilter) : "") +
    sel("fCat", "Kategorie", [["all", "Alle Kategorien"], ...categoriesOf(inScope).map((c) => [c, c])], ui.cat) +
    sel("fStat", "Lernstand", STAT_OPTS.flatMap(([, items]) => items), ui.stat) +
    sel("fRegion", "Region", regionOptions(inScope), ui.region) +
    sel("fLevel", "Niveau", levelOptions(), ui.level) +
    "</div>" +
    `<p class="lcount" id="lcount">${list.length} ${list.length === 1 ? "Karte" : "Karten"}${list.length > shown ? ` · ${shown} angezeigt` : ""}</p>`;
  if (ui.selecting) {
    h += `<div class="lsel"><button type="button" class="small" id="sAll">Alle</button><button type="button" class="small" id="sNone">Keine</button>` +
      `<button type="button" class="small" id="sDel"${ui.picked.size ? "" : " disabled"}>${ui.picked.size} entfernen</button></div>`;
  }
  h += "</div>";

  h += list.length
    ? '<ul class="llist" id="llist">' + list.slice(0, shown).map((c) => rowHtml(app, c, day)).join("") + "</ul>" +
      (list.length > shown ? `<div id="lmore" class="lmore"><button type="button" id="lmoreBtn">${restCount(shown, list.length)} weitere Karten laden</button></div>` : "")
    : `<p class="prompt">${inScope.length ? "Keine Karte passt zu dieser Auswahl." : "In diesem Bereich gibt es noch keine Karten."}</p>`;
  root.innerHTML = h;

  // Werkzeuge: immer nur eines offen
  root.querySelectorAll(".toolhead").forEach((b) => b.addEventListener("click", () => {
    ui.tool = toggleOne(ui.tool, b.closest(".tool").dataset.tool);
    root.querySelectorAll(".tool").forEach((t) => {
      const open = t.dataset.tool === ui.tool;
      t.querySelector(".toolhead").setAttribute("aria-expanded", String(open));
      t.querySelector(".toolbody").hidden = !open;
    });
  }));
  const rs = root.querySelector("#rsBtn");
  armed(rs, "Sicher? Der Lernstand geht verloren", () => {
    state.progress = {};
    state.examples.progress = {};
    state.textLog = {};
    flash.rsMsg = ["Lernstand zurückgesetzt.", "ok"];
    app.save();
    app.invalidatePlan();
    rerender();
  });

  const reset = () => { ui.shown = PAGE; ui.expanded = ""; };
  const q = root.querySelector("#lq");
  let timer = null;
  q.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      ui.q = q.value;
      reset();
      rerender();
      const nq = root.querySelector("#lq");
      nq.focus();
      nq.setSelectionRange(nq.value.length, nq.value.length);
    }, 200);
  });
  const bindSel = (id, key) => root.querySelector("#" + id)?.addEventListener("change", (e) => { ui[key] = e.target.value; reset(); rerender(); });
  bindSel("fArea", "areaFilter");
  bindSel("fCat", "cat");
  bindSel("fStat", "stat");
  bindSel("fRegion", "region");
  bindSel("fLevel", "level");
  root.querySelector("#lsel").addEventListener("click", () => { ui.selecting = !ui.selecting; ui.picked.clear(); ui.expanded = ""; rerender(); });
  root.querySelector("#sAll")?.addEventListener("click", () => { list.filter((c) => !isExample(c)).forEach((c) => ui.picked.add(c.id)); rerender(); });
  root.querySelector("#sNone")?.addEventListener("click", () => { ui.picked.clear(); rerender(); });
  const sd = root.querySelector("#sDel");
  if (sd) armed(sd, `Sicher? ${ui.picked.size} Karten endgültig entfernen`, () => { removeCards(app, [...ui.picked]); ui.selecting = false; rerender(); });

  const byId = new Map(list.map((c) => [c.id, c]));
  root.querySelector("#llist")?.addEventListener("click", (e) => {
    const row = e.target.closest(".lrow");
    if (!row) return;
    const id = row.dataset.id;
    const del = e.target.closest("[data-del]");
    if (del) {
      if (del.dataset.armed !== "1") {
        del.dataset.armed = "1";
        del.textContent = "Sicher? Endgültig entfernen";
        setTimeout(() => { if (del.isConnected) { del.dataset.armed = ""; del.textContent = "Entfernen"; } }, 4000);
        return;
      }
      removeCards(app, [id]);
      rerender();
      return;
    }
    if (!e.target.closest(".lhead")) return;
    if (ui.selecting) {
      if (isExample(byId.get(id))) return;
      toggleIn(ui.picked, id);
      rerender();
      return;
    }
    ui.expanded = toggleOne(ui.expanded, id);
    root.querySelectorAll(".lrow").forEach((r) => {
      const open = r.dataset.id === ui.expanded;
      r.querySelector(".lhead").setAttribute("aria-expanded", String(open));
      const d = r.querySelector(".ld");
      d.hidden = !open;
      d.innerHTML = open ? detailHtml(app, byId.get(r.dataset.id), today()) : "";
    });
  });

  // Nachladen: beim Scrollen und per Knopf
  const more = () => { ui.shown = nextShown(shown, list.length); const y = window.scrollY; rerender(); window.scrollTo(0, y); };
  root.querySelector("#lmoreBtn")?.addEventListener("click", more);
  const sentinel = root.querySelector("#lmore");
  if (sentinel && "IntersectionObserver" in window) {
    io = new IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting)) { io.disconnect(); io = null; more(); } }, { rootMargin: "200px" });
    io.observe(sentinel);
  }
  flash = {};
}

