// Reiter „Transfer“: Geschichte, Sprechen mit Timer, Schreiben und Aufträge für Claude. Gilt für den gewählten Bereich.
// Ausdrücke werden nach Lernstand gewählt; die Selbstbewertung verbucht Ergebnisse.
import { esc, setMsg, copyText } from "../core/dom.js";
import { cue } from "../core/modes.js";
import { usesExpr } from "../core/match.js";
import { record } from "../core/srs.js";
import { progressOf } from "../core/state.js";
import { today } from "../core/dates.js";
import { icon } from "../core/icons.js";
import { AREAS } from "../core/cards.js";
import { POOLS, pickExprs } from "../core/pick.js";
import { viewOf } from "../core/variants.js";
import { transferPrompt, claudePrompt, CLAUDE_KINDS } from "../core/prompts.js";
import { needArea } from "./today.js";

export const TRANSFER = { story: "Geschichte", speak: "Sprechen", write: "Schreiben" };
const SUBS = [["story", "Geschichte"], ["speak", "Sprechen"], ["write", "Schreiben"], ["claude", "Aufträge für Claude"]];
const EVAL = [["u", "nicht benutzt"], ["ok", "passend verwendet"], ["unsure", "unsicher"], ["bad", "falsch verwendet"]];
const COUNTS = { story: [3, 5, 8, 10], speak: [3, 4, 5], write: [3, 5, 6, 8], claude: [3, 5, 8, 10] };
const INTRO = {
  story: "Du bekommst Ausdrücke aus deinem Bereich und schreibst daraus eine zusammenhängende Geschichte auf Spanisch. Die App erkennt live, welche Ausdrücke du benutzt hast.",
  speak: "Du bekommst eine Frage und einige Ausdrücke. Sprich 2 Minuten laut und bewerte dich danach selbst.",
  write: "Du bekommst eine Schreibaufgabe mit Ausdrücken, die du einbauen sollst. Die App erkennt live, welche du benutzt hast."
};
const SECS = 120;

// Bleibt erhalten, solange die App offen ist
const ui = { sub: "story", pool: "rec", n: 5, ck: "nuance", promptText: "", timer: null, left: 0, notice: "" };
let tasks = null;

async function loadTasks() {
  if (!tasks) tasks = await fetch("data/tasks.json").then((r) => r.json());
  return tasks;
}

const words = (t) => String(t).trim().split(/\s+/).filter(Boolean).length;
const fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
const stopTimer = () => { if (ui.timer) { clearInterval(ui.timer); ui.timer = null; } };
export const leave = stopTimer;

const evalOf = (d, c) => d.sel[c.id] || (ui.sub !== "speak" && usesExpr(d.text || "", c) ? "ok" : "u");
const draftKey = (app) => `${app.state.prefs.area}-${ui.sub}`;

function draftOf(app) {
  const d = app.state.drafts[draftKey(app)];
  return d && Array.isArray(d.ids) && d.ids.length ? d : null;
}

function newDraft(app) {
  const area = app.state.prefs.area;
  const pick = (n) => pickExprs(app.areaCards(), app.state, today(), n, ui.pool).map((c) => c.id);
  const any = (list) => list[Math.floor(Math.random() * list.length)];
  let d;
  if (ui.sub === "story") d = { ids: pick(ui.n), text: "" };
  else if (ui.sub === "speak") { const t = any(tasks[area].speak); d = { ids: pick(Math.min(ui.n, 5)), task: t.q, theme: t.topic, notes: "" }; }
  else { const t = any(tasks[area].write); d = { ids: pick(Math.max(3, Math.min(ui.n, 8))), task: t.task, type: t.type, text: "" }; }
  d.sel = {};
  d.settled = false;
  app.state.drafts[draftKey(app)] = d;
  app.save();
}

const selectHtml = (id, label, opts, cur) =>
  `<label>${esc(label)} <select id="${id}">${opts.map(([v, t]) => `<option value="${v}"${String(v) === String(cur) ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;

function controls(btn) {
  const counts = COUNTS[ui.sub];
  if (!counts.includes(ui.n)) ui.n = counts[Math.min(1, counts.length - 1)];
  return '<div class="controls">' + selectHtml("poolSel", "Auswahl", POOLS, ui.pool) +
    selectHtml("nSel", "Anzahl", counts.map((v) => [v, v + " Ausdrücke"]), ui.n) + btn + "</div>";
}

export async function render(root, app) {
  if (app.state.prefs.area === "gesamt") { needArea(root, app, "Transfer"); return; }
  await loadTasks();
  let h = `<h1 class="withicon">${icon("transfer")}Transfer · ${esc(AREAS[app.state.prefs.area])}</h1><div class="modes">` +
    SUBS.map(([id, label]) => `<button type="button" class="mode${id === ui.sub ? " on" : ""}" data-sub="${id}" aria-pressed="${id === ui.sub}">${icon(id === "claude" ? "explain" : id === "story" ? "rewrite" : id === "speak" ? "meaning" : "produce")}<span>${esc(label)}</span></button>`).join("") +
    "</div>";
  h += ui.sub === "claude" ? claudeHtml() : taskHtml(app);
  root.innerHTML = h;
  if (ui.notice) { setMsg(root.querySelector("#trMsg"), ui.notice, "ok"); ui.notice = ""; }
  root.querySelectorAll("[data-sub]").forEach((b) => b.addEventListener("click", () => {
    stopTimer();
    ui.left = 0;
    ui.sub = b.dataset.sub;
    render(root, app);
  }));
  root.querySelector("#poolSel").addEventListener("change", (e) => { ui.pool = e.target.value; });
  root.querySelector("#nSel").addEventListener("change", (e) => { ui.n = Number(e.target.value); });
  if (ui.sub === "claude") bindClaude(root, app);
  else bindTask(root, app);
}

function taskHtml(app) {
  const d = draftOf(app);
  let h = controls(`<button type="button" class="small" id="trNew"${app.areaCards().length ? "" : " disabled"}>${d ? "Neue Aufgabe" : "Aufgabe erzeugen"}</button>`);
  if (!d) return h + `<p class="prompt">${esc(INTRO[ui.sub])}</p>` + (app.areaCards().length ? "" : '<p class="hint">In diesem Bereich gibt es noch keine Karten.</p>');
  const byId = new Map(app.cards().map((c) => [c.id, c]));
  const cards = d.ids.map((id) => byId.get(id)).filter(Boolean);
  const detect = ui.sub !== "speak";

  h += '<div class="card">' + `<span class="chip">${icon("tile")}<span>` +
    (ui.sub === "story" ? "Geschichte" : ui.sub === "speak" ? "Sprechen · " + esc(d.theme) : "Schreiben · " + esc(d.type)) + "</span></span>";
  h += ui.sub === "story"
    ? "<p>Schreibe auf Spanisch eine Geschichte (mindestens 100 Wörter), die diese Ausdrücke natürlich enthält. Die Ausdrücke dürfen gebeugt werden.</p>"
    : `<p class="sentence">${esc(d.task)}</p>`;
  if (app.state.prefs.area === "schule") h += '<p class="note">Keine echten Namen und keine echten Fälle: Nenne nur Rollen (la madre, el alumno).</p>';

  h += '<ul class="ex">' + cards.map((c) => {
    const found = detect && usesExpr(d.text || "", c);
    const sel = evalOf(d, c);
    const shown = viewOf(c, app.state.prefs).shown;
    const ev = d.settled
      ? `<span class="de2">${esc((EVAL.find((e) => e[0] === sel) || EVAL[0])[1])}</span>`
      : `<select data-ev="${esc(c.id)}" aria-label="Bewertung ${esc(shown.term)}">${EVAL.map(([v, t]) => `<option value="${v}"${sel === v ? " selected" : ""}>${t}</option>`).join("")}</select>`;
    return `<li><span class="st" data-det="${esc(c.id)}">${detect ? (found ? "✓" : "○") : "•"}</span><span class="term-s">${esc(shown.term)}</span><span class="de2">${esc(cue(c))}</span>${ev}</li>`;
  }).join("") + "</ul>";

  if (ui.sub === "speak") {
    h += '<p class="prompt">Sprich zwei Minuten und baue so viele Ausdrücke wie möglich natürlich ein. Bewerte danach in der Liste oben, welche du verwendet hast.</p>' +
      `<div class="timer" id="tm">${fmt(ui.left || SECS)}</div>` +
      `<div class="btnrow"><button type="button" id="tmStart">${ui.timer ? "Stopp" : "Start"}</button><button type="button" id="tmReset">Zurücksetzen</button></div>` +
      `<label class="field" for="spNotes">Stichpunkte (optional)</label><textarea class="mid" id="spNotes" lang="es">${esc(d.notes || "")}</textarea>`;
  } else {
    h += `<label class="field" for="trText">Dein Text</label><textarea class="tall" id="trText" lang="es" spellcheck="false">${esc(d.text || "")}</textarea>` +
      `<p class="hint" id="trWc">${words(d.text || "")} Wörter</p>`;
  }
  h += "</div>";
  h += d.settled
    ? '<div class="feedback good" role="status">Verbucht.</div><div class="btnrow"><button type="button" id="trCopy">Prompt für Claude kopieren</button><button type="button" class="primary" id="trNew2">Neue Aufgabe</button></div>'
    : '<div class="btnrow"><button type="button" class="primary" id="trSettle">Bewertung verbuchen</button><button type="button" id="trCopy">Prompt für Claude kopieren</button></div>' +
      '<p class="hint">Verbucht werden nur Ausdrücke mit „passend verwendet“ (richtig) oder „falsch verwendet“ (falsch). „Unsicher“ und „nicht benutzt“ ändern nichts. Beispielkarten werden getrennt verbucht und zählen nicht in die Statistik.</p>';
  return h + '<p class="msg" id="trMsg" role="status"></p>';
}

function bindTask(root, app) {
  const rerender = () => render(root, app);
  root.querySelector("#trNew").addEventListener("click", () => { stopTimer(); ui.left = 0; newDraft(app); rerender(); });
  const d = draftOf(app);
  if (!d) return;
  const byId = new Map(app.cards().map((c) => [c.id, c]));
  const cards = d.ids.map((id) => byId.get(id)).filter(Boolean);

  if (ui.sub !== "speak") {
    const ta = root.querySelector("#trText");
    ta.addEventListener("input", () => {
      d.text = ta.value;
      app.save();
      root.querySelector("#trWc").textContent = words(ta.value) + " Wörter";
      for (const c of cards) {
        const found = usesExpr(ta.value, c);
        const st = root.querySelector(`[data-det="${c.id}"]`);
        if (st) st.textContent = found ? "✓" : "○";
        const sel = root.querySelector(`select[data-ev="${c.id}"]`);
        if (sel && !d.sel[c.id]) sel.value = found ? "ok" : "u";
      }
    });
  } else {
    root.querySelector("#spNotes").addEventListener("input", (e) => { d.notes = e.target.value; app.save(); });
    const btn = root.querySelector("#tmStart");
    btn.addEventListener("click", () => {
      if (ui.timer) { stopTimer(); btn.textContent = "Start"; return; }
      if (!ui.left) ui.left = SECS;
      btn.textContent = "Stopp";
      ui.timer = setInterval(() => {
        ui.left--;
        const el = document.getElementById("tm");
        if (!el) { stopTimer(); return; }
        el.textContent = fmt(Math.max(0, ui.left));
        if (ui.left <= 0) {
          stopTimer();
          ui.left = 0;
          el.textContent = "Zeit um";
          const b = document.getElementById("tmStart");
          if (b) b.textContent = "Start";
        }
      }, 1000);
    });
    root.querySelector("#tmReset").addEventListener("click", () => {
      stopTimer();
      ui.left = 0;
      root.querySelector("#tm").textContent = fmt(SECS);
      btn.textContent = "Start";
    });
  }

  root.querySelectorAll("select[data-ev]").forEach((s) => s.addEventListener("change", () => { d.sel[s.dataset.ev] = s.value; app.save(); }));
  root.querySelector("#trCopy").addEventListener("click", () => copyText(transferPrompt(ui.sub, d, cards, app.state.prefs.area, app.state.prefs), root.querySelector("#trMsg")));
  root.querySelector("#trNew2")?.addEventListener("click", () => { newDraft(app); rerender(); });
  root.querySelector("#trSettle")?.addEventListener("click", () => {
    const day = today();
    let ok = 0;
    let bad = 0;
    for (const c of cards) {
      const v = evalOf(d, c);
      if (v === "ok") { record(progressOf(app.state, c.id), true, ui.sub, day); ok++; }
      else if (v === "bad") { record(progressOf(app.state, c.id), false, ui.sub, day); bad++; }
    }
    d.settled = true;
    stopTimer();
    app.save();
    app.invalidatePlan();
    ui.notice = `${ok} Ausdrücke als richtig, ${bad} als falsch verbucht.`;
    rerender();
  });
}

function claudeHtml() {
  let h = controls("") +
    '<p class="prompt">Hier entstehen fertige Aufträge, die du mit einem Tipp kopierst und im Chat mit Claude einfügst. Claude bewertet frei formulierte Antworten, was die App nicht kann.</p>' +
    '<div class="controls">' + selectHtml("ckKind", "Übung", CLAUDE_KINDS, ui.ck) +
    '<button type="button" class="small primary" id="ckBuild">Auftrag erzeugen</button></div>';
  if (ui.promptText) h += `<pre class="pre">${esc(ui.promptText)}</pre><div class="btnrow"><button type="button" class="primary" id="ckCopy">Kopieren</button></div>`;
  return h + '<p class="msg" id="trMsg" role="status"></p>';
}

function bindClaude(root, app) {
  root.querySelector("#ckKind").addEventListener("change", (e) => { ui.ck = e.target.value; });
  root.querySelector("#ckBuild").addEventListener("click", () => {
    ui.promptText = claudePrompt(ui.ck, pickExprs(app.areaCards(), app.state, today(), ui.n, ui.pool), app.state.prefs.area, app.state.prefs);
    render(root, app);
  });
  root.querySelector("#ckCopy")?.addEventListener("click", () => copyText(ui.promptText, root.querySelector("#trMsg")));
}
