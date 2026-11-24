// Reiter „Sammlung“: Werkzeuge oben (zugeklappt, immer nur eines offen), angepinnte Suche mit Filtern,
// schlanke Kartenliste, die in Abschnitten nachlädt. Bearbeiten, Import und Sicherung folgen in Schritt 7 bis 9.
import { esc, armed, copyText } from "../core/dom.js";
import { cue } from "../core/modes.js";
import { categoryOf, STATUS, MAX_BOX } from "../core/srs.js";
import { peekProgress, isExample, GESAMT } from "../core/state.js";
import { today } from "../core/dates.js";
import { icon } from "../core/icons.js";
import { REG, REGION, AREAS, CATS, TOPICS, modeLabel } from "../core/cards.js";
import { exportData, backupName, parseBackup, markBackup, daysSinceBackup, describeState, snapshotBefore, readSnapshot, clearSnapshot } from "../core/backup.js";
import { cardPrompt, parseCards, summarizeImport, fixPrompt } from "../core/import.js";
import { viewOf, regionLabel } from "../core/variants.js";
import { openEditor } from "./editor.js";
import { isEditable } from "../core/edit.js";
import { PAGE, STAT_OPTS, filterCards, categoriesOf, statusLabel, nextShown, restCount, toggleOne, toggleIn, regionOptions, levelOptions, levelOf, isEdited } from "../core/library.js";

// tool: das offene Werkzeug, expanded: die aufgeklappte Karte, shown: wie viele Karten gezeichnet werden
// Sicherung: eingelesene Datei wartet auf die Bestätigung
const bk = { pending: null, warnings: [], text: "", error: "" };
const imp = { area: "", cat: "", topic: "", count: 10, terms: "", paste: "", errors: [], lines: [], kind: "" };
const ui = { editing: undefined, scrollY: 0, q: "", cat: "all", stat: "all", region: "all", level: "all", shown: PAGE, tool: "", expanded: "", selecting: false, picked: new Set(), areaFilter: "all" };
let flash = {};
let io = null;

// Vom Tagesplan aus: die Sammlung mit geöffnetem Werkzeug zeigen
export function openTool(id) { ui.tool = id; }

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
    (isExample(c) ? '<p class="hint">Beispielkarten kannst du nicht bearbeiten und entfernst sie in den Einstellungen. Lege dafür eine eigene Karte an.</p>'
      : `<div class="acts"><button type="button" data-edit="${esc(c.id)}">${icon("edit")} Bearbeiten</button><button type="button" data-del="${esc(c.id)}" aria-label="${esc(c.term)} entfernen">Entfernen</button></div>`);
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

const dateDe = (ms) => new Date(ms).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });

// Werkzeug „Sichern und Wiederherstellen“
function backupBody(app) {
  const d = daysSinceBackup(app.state);
  const last = d === null ? "noch nie" : d === 0 ? "heute" : d === 1 ? "gestern" : `vor ${d} Tagen`;
  const snap = readSnapshot(localStorage);
  const canShare = typeof navigator !== "undefined" && typeof navigator.canShare === "function";
  return '<p class="hint">Die Sicherung ist eine Datei mit deinem ganzen Stand: Lernstand, eigene Karten, Korrekturen, Texte und Einstellungen. Mach sie regelmäßig und vor jedem Gerätewechsel. Die Karten aus den Startdaten gehören nicht dazu.</p>' +
    `<p>Zuletzt gesichert: <strong>${esc(last)}</strong></p>` +
    '<div class="btnrow"><button type="button" class="primary" id="bkDown">Sicherung herunterladen</button>' +
    (canShare ? '<button type="button" id="bkShare">Teilen oder in Dateien sichern</button>' : "") +
    '<button type="button" id="bkCopy">Als Text kopieren</button></div>' + msg("bkMsg") +
    '<h3>Wiederherstellen</h3><p class="hint">Der aktuelle Stand auf diesem Gerät wird dabei ersetzt. Vorher legt die App ihn zur Seite, du kannst den Schritt rückgängig machen.</p>' +
    '<label class="filebtn" for="bkFile">Sicherungsdatei wählen</label><input type="file" id="bkFile" accept=".json,application/json" class="sr">' +
    `<label class="field" for="bkPaste">oder den Text der Sicherung einfügen</label><textarea id="bkPaste" class="mid" spellcheck="false">${esc(bk.text)}</textarea>` +
    '<div class="btnrow"><button type="button" id="bkCheck">Sicherung prüfen</button></div>' +
    (bk.error ? `<p class="msg err" role="alert">${esc(bk.error)}</p>` : "") +
    (bk.pending
      ? '<div class="card"><p><strong>Diese Sicherung ist gültig.</strong></p>' +
        `<p>In der Sicherung: ${esc(describeState(bk.pending))}.</p><p>Jetzt auf diesem Gerät: ${esc(describeState(app.state))}.</p>` +
        bk.warnings.map((w) => `<p class="msg err">${esc(w)}</p>`).join("") +
        '<div class="btnrow"><button type="button" class="primary" id="bkGo">Wiederherstellen</button><button type="button" id="bkCancel">Abbrechen</button></div></div>'
      : "") +
    (snap ? `<div class="card"><p>Stand vor der letzten Wiederherstellung (${esc(dateDe(Date.parse(snap.at)))}): ${esc(describeState(snap.state))}.</p><button type="button" id="bkUndo">Rückgängig machen</button></div>` : "") +
    msg("bkMsg2");
}

// Werkzeug „Neue Karten von Claude“: Prompt kopieren, Antwort einfügen, importieren
function importBody(app, gesamt) {
  const cur = app.state.prefs.area;
  const ar = imp.area in AREAS ? imp.area : (gesamt ? "allgemein" : cur);
  const opt = (v, t, sel) => `<option value="${esc(v)}"${v === sel ? " selected" : ""}>${esc(t)}</option>`;
  return '<p class="hint">Claude schreibt die Karten, du fügst die Antwort hier ein. Jede Karte wird geprüft wie im Formular. Fehlerhafte Karten werden einzeln gemeldet, die gültigen übernimmt die App trotzdem.</p>' +
    '<div class="controls">' +
    `<label>Bereich <select id="imArea">${Object.entries(AREAS).map(([k, v]) => opt(k, v, ar)).join("")}</select></label>` +
    `<label>Kategorie (für Vorschläge) <select id="imCat">${opt("", "Beliebig", imp.cat)}${CATS.map((c) => opt(c, c, imp.cat)).join("")}</select></label>` +
    (ar === "schule" ? `<label>Thema <select id="imTopic">${opt("", "Beliebig", imp.topic)}${TOPICS.map((t) => opt(t, t, imp.topic)).join("")}</select></label>` : "") +
    `<label>Anzahl <select id="imCount">${[5, 10, 15, 20].map((n) => opt(String(n), String(n), String(imp.count))).join("")}</select></label>` +
    "</div>" +
    `<label class="field" for="imTerms">Eigene Wendungen (eine pro Zeile, optional; sonst macht Claude Vorschläge)</label><textarea id="imTerms" class="mid" lang="es" spellcheck="false">${esc(imp.terms)}</textarea>` +
    '<div class="btnrow"><button type="button" id="imCopy">Prompt kopieren</button></div><p class="msg" id="imCopyMsg" role="status"></p>' +
    `<label class="field" for="imPaste">Antwort von Claude hier einfügen</label><textarea id="imPaste" class="tall" spellcheck="false" placeholder="[{&quot;cat&quot;: …, &quot;term&quot;: …}]">${esc(imp.paste)}</textarea>` +
    '<div class="btnrow"><button type="button" class="primary" id="imGo">Importieren</button></div>' +
    `<div class="msg${imp.kind ? " " + imp.kind : ""}" id="imMsg" role="status">${imp.lines.length ? "<ul>" + imp.lines.map((l) => `<li>${esc(l)}</li>`).join("") + "</ul>" : ""}</div>` +
    (imp.errors.length ? '<div class="btnrow"><button type="button" id="imFix">Fehlerliste für Claude kopieren</button></div><p class="msg" id="imFixMsg" role="status"></p>' : "");
}

export function render(root, app) {
  leave();
  const rerender = () => render(root, app);
  const { state } = app;
  // Bearbeiten und Anlegen ersetzen die Seite, danach geht es zurück zur Liste
  if (ui.editing !== undefined) {
    const target = ui.editing;
    openEditor(root, app, target, (saved, id) => {
      if (saved) { flash.addMsg = [target === null ? "Karte angelegt." : "Karte gespeichert.", "ok"]; if (id) { ui.expanded = id; ui.q = ""; } }
      ui.editing = undefined;
      rerender();
      window.scrollTo(0, ui.scrollY || 0);
    }, state.prefs.area === GESAMT ? "allgemein" : state.prefs.area);
    window.scrollTo(0, 0);
    return;
  }
  root.classList.add("libpage");
  const gesamt = state.prefs.area === GESAMT;
  const inScope = gesamt ? app.cards() : app.areaCards();
  const area = areaOf(app);
  if (ui.cat !== "all" && !inScope.some((c) => c.cat === ui.cat)) ui.cat = "all";

  const hasExamples = !state.examples.removed;
  let h = `<div class="sessionbar"><h1 class="withicon">${icon("library")}Sammlung · ${esc(gesamt ? "Gesamt" : AREAS[area])}</h1><a class="small btnlink iconbtn" href="#settings" aria-label="Einstellungen">${icon("settings")}</a></div>`;
  h += '<div class="tools">' +
    tool("add", "Eigene Karte anlegen", '<p class="hint">Eine eigene Wendung mit Satz, Lösung und Hilfen anlegen, in „Allgemein“ oder „Schulgespräche“. Das Formular prüft alles wie der Import.</p><button type="button" class="primary" id="addBtn">Neue Karte anlegen</button>' + msg("addMsg")) +
    tool("claude", "Neue Karten von Claude", importBody(app, gesamt)) +
    tool("backup", "Sichern und Wiederherstellen", backupBody(app)) +
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
  // Sicherung
  const done = (text) => { markBackup(state); app.save(); flash.bkMsg = [text, "ok"]; rerender(); };
  const dump = () => JSON.stringify(exportData(state), null, 1);
  root.querySelector("#bkDown").addEventListener("click", () => {
    const text = dump();
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = backupName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    done("Sicherung heruntergeladen. Prüfe, dass die Datei „" + backupName() + "“ in deinen Downloads oder in Dateien liegt.");
  });
  root.querySelector("#bkShare")?.addEventListener("click", async () => {
    const file = new File([dump()], backupName(), { type: "application/json" });
    try {
      if (!navigator.canShare({ files: [file] })) throw new Error("nicht möglich");
      await navigator.share({ files: [file], title: "Tesoro de Palabras · Sicherung" });
      done("Sicherung geteilt.");
    } catch (e) {
      if (e && e.name === "AbortError") return;
      flash.bkMsg = ["Teilen ist hier nicht möglich. Nimm „Sicherung herunterladen“ oder „Als Text kopieren“.", "err"];
      rerender();
    }
  });
  root.querySelector("#bkCopy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(dump()); done("Sicherung als Text kopiert. Füge sie jetzt in eine Notiz oder Datei ein, die du aufhebst."); }
    catch { flash.bkMsg = ["Kopieren wurde blockiert. Nimm „Sicherung herunterladen“.", "err"]; rerender(); }
  });
  const check = (text) => {
    bk.text = text;
    bk.pending = null;
    bk.error = "";
    bk.warnings = [];
    try {
      const r = parseBackup(text);
      bk.pending = r.state;
      bk.warnings = r.warnings;
    } catch (e) { bk.error = e.message; }
    ui.tool = "backup";
    rerender();
  };
  root.querySelector("#bkFile").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) check(await f.text());
  });
  root.querySelector("#bkCheck").addEventListener("click", () => {
    const t = root.querySelector("#bkPaste").value;
    if (!t.trim()) { bk.error = "Wähle eine Sicherungsdatei oder füge den Text der Sicherung ein."; bk.pending = null; ui.tool = "backup"; rerender(); return; }
    check(t);
  });
  root.querySelector("#bkCancel")?.addEventListener("click", () => { bk.pending = null; bk.text = ""; bk.warnings = []; ui.tool = "backup"; rerender(); });
  const go = root.querySelector("#bkGo");
  if (go) armed(go, "Sicher? Der Stand auf diesem Gerät wird ersetzt", () => {
    snapshotBefore(localStorage, app.state);
    const next = bk.pending;
    bk.pending = null; bk.text = ""; bk.warnings = [];
    ui.tool = "backup";
    flash.bkMsg2 = ["Wiederhergestellt. Der alte Stand liegt zur Seite und lässt sich rückgängig machen.", "ok"];
    app.replaceState(next);
  });
  const undo = root.querySelector("#bkUndo");
  if (undo) armed(undo, "Sicher? Der jetzige Stand wird ersetzt", () => {
    const snap = readSnapshot(localStorage);
    if (!snap) return;
    clearSnapshot(localStorage);
    ui.tool = "backup";
    flash.bkMsg2 = ["Der frühere Stand ist zurück.", "ok"];
    app.replaceState(snap.state);
  });
  // Import
  const impArea = () => (root.querySelector("#imArea")?.value in AREAS ? root.querySelector("#imArea").value : "allgemein");
  const keepImp = () => {
    imp.area = impArea();
    imp.cat = root.querySelector("#imCat").value;
    imp.topic = root.querySelector("#imTopic")?.value || "";
    imp.count = Number(root.querySelector("#imCount").value);
    imp.terms = root.querySelector("#imTerms").value;
    imp.paste = root.querySelector("#imPaste").value;
  };
  root.querySelector("#imArea").addEventListener("change", () => { keepImp(); ui.tool = "claude"; rerender(); });
  ["imCat", "imTopic", "imCount"].forEach((id) => root.querySelector("#" + id)?.addEventListener("change", keepImp));
  ["imTerms", "imPaste"].forEach((id) => root.querySelector("#" + id).addEventListener("input", keepImp));
  root.querySelector("#imCopy").addEventListener("click", () => {
    keepImp();
    copyText(cardPrompt({ area: imp.area, terms: imp.terms.split("\n"), cat: imp.cat, topic: imp.topic, count: imp.count }, app.cards().filter((c) => !c.example), state.prefs), root.querySelector("#imCopyMsg"));
  });
  root.querySelector("#imGo").addEventListener("click", () => {
    keepImp();
    if (!imp.paste.trim()) { imp.lines = ["Erst die Antwort von Claude einfügen."]; imp.kind = "err"; imp.errors = []; ui.tool = "claude"; rerender(); return; }
    const taken = [...app.base, ...state.custom].map((c) => c.id).concat(state.deleted);
    const r = parseCards(imp.paste, app.cards().filter((c) => !c.example), taken, imp.area);
    if (r.cards.length) {
      state.custom.push(...r.cards);
      app.save();
      app.invalidatePlan();
    }
    imp.lines = summarizeImport(r);
    imp.errors = r.errors;
    imp.kind = r.fatal || r.errors.length ? "err" : "ok";
    // Übernommene und bereits vorhandene Karten sind erledigt; fehlerhafte bleiben im Feld zum Korrigieren
    if (!r.fatal && !r.errors.length) imp.paste = "";
    ui.tool = "claude";
    rerender();
  });
  root.querySelector("#imFix")?.addEventListener("click", () => copyText(fixPrompt(imp.errors, imp.area || "allgemein", state.prefs), root.querySelector("#imFixMsg")));
  root.querySelector("#addBtn").addEventListener("click", () => { ui.scrollY = window.scrollY; ui.editing = null; rerender(); });
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
    const edit = e.target.closest("[data-edit]");
    if (edit) { ui.scrollY = window.scrollY; ui.editing = edit.dataset.edit; rerender(); return; }
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

