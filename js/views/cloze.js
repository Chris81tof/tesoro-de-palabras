// Stufe 5 · Texte: Lückentexte nach Lernstand vorschlagen, bearbeiten, neue per Prompt holen und importieren.
import { esc, shuffle, copyText, setMsg, armed } from "../core/dom.js";
import { cue } from "../core/modes.js";
import { judge } from "../core/accent.js";
import { stripMarks } from "../core/match.js";
import { record } from "../core/srs.js";
import { progressOf } from "../core/state.js";
import { today } from "../core/dates.js";
import { icon } from "../core/icons.js";
import { AREAS } from "../core/cards.js";
import { suggestTexts, pickCards, textPrompt, parseTexts, KINDS, textsOf, stage5Ids } from "../core/texts.js";
import { gapTarget, textGapHintOptions } from "../core/hints.js";
import { newHint, hintHtml, bindHint } from "../exercises/common.js";

const WORDS = [120, 180, 250];
const GAPS = [4, 6, 8];

// Geöffneter Text: { t, vals, res, checked, bank, order, hints (je Lücke), revealed (je Lücke), focus }
let open = null;
// Meldung nach dem Import, die das Neuzeichnen überlebt: { text, kind }
let notice = null;

export const isOpen = (area) => !!open && (!area || open.t.area === area);
export const close = () => { open = null; };

export function openText(app, id) {
  const t = app.texts().find((x) => x.id === id);
  open = t ? { t, vals: [], res: [], hints: t.gaps.map(newHint), revealed: [], focus: 0, checked: false, bank: false, order: shuffle(t.gaps.map((g) => g[1].split("|")[0])) } : null;
}

function lastDone(app, t, day) {
  const d = app.state.textLog[t.id];
  if (typeof d !== "number") return "noch nicht bearbeitet";
  return day - d === 0 ? "heute bearbeitet" : day - d === 1 ? "gestern bearbeitet" : `vor ${day - d} Tagen bearbeitet`;
}

function textItem(app, t, day, extra = "") {
  return `<li><div class="meta"><strong>${esc(t.title)}</strong><span>${esc(t.kind)} · ${t.gaps.length} Lücken · ${lastDone(app, t, day)}</span></div>` +
    `<div class="acts">${extra}<button type="button" class="small primary" data-open="${esc(t.id)}">Öffnen</button></div></li>`;
}

// Liste unter der Übungsauswahl: Vorschläge, alle Texte, neuer Text per Prompt
export function renderList(area, app, rerender) {
  const day = today();
  const { state } = app;
  const ar = state.prefs.area;
  const cards = app.cards().filter((c) => c.area === ar);
  const known = new Set(app.cards().map((c) => c.id));
  const texts = textsOf(app.texts(), ar, state);
  const imported = new Set(state.texts.map((t) => t.id));
  const draft = { kind: KINDS[ar][0], words: 180, n: 6, ids: [], ...(state.drafts["text-" + ar] || {}) };

  let h = '<h2>Vorschläge für dich</h2>';
  if (!texts.length) h += `<p class="prompt">In diesem Bereich gibt es noch keinen Text. Hol dir unten einen neuen von Claude.</p>`;
  else h += '<p class="hint">Texte mit problematischen, fälligen und neuen Karten stehen oben. Kürzlich bearbeitete rutschen für zwei Wochen nach unten. Texte für eine andere Region stehen weiter unten.</p>' +
    '<ul class="list">' + suggestTexts(texts, state, day, known, state.prefs).map(({ t }) => textItem(app, t, day)).join("") + "</ul>";

  h += `<details class="all"><summary>Alle Texte (${texts.length})</summary><ul class="list">` +
    texts.map((t) => textItem(app, t, day, imported.has(t.id) ? `<button type="button" class="small" data-del="${esc(t.id)}">Entfernen</button>` : "")).join("") +
    "</ul></details>";

  h += `<h2>Neuer Text von Claude · ${esc(AREAS[ar])}</h2><p class="hint">Die App wählt Karten nach deinem Lernstand, bevorzugt solche, die noch in keinem Text vorkommen. Kopiere den Prompt in Claude und füge die Antwort unten ein. Erst durch einen Text kommt eine Karte in Stufe 5.</p>` +
    '<div class="controls">' +
    `<label>Textsorte <select id="tKind">${KINDS[ar].map((k) => `<option${k === draft.kind ? " selected" : ""}>${esc(k)}</option>`).join("")}</select></label>` +
    `<label>Länge <select id="tWords">${WORDS.map((w) => `<option value="${w}"${w === draft.words ? " selected" : ""}>${w} Wörter</option>`).join("")}</select></label>` +
    `<label>Lücken <select id="tN">${GAPS.map((n) => `<option value="${n}"${n === draft.n ? " selected" : ""}>${n}</option>`).join("")}</select></label>` +
    "</div>";
  const picked = draft.ids.map((id) => cards.find((c) => c.id === id)).filter(Boolean);
  if (picked.length) h += '<ul class="ex">' + picked.map((c) => `<li><span class="term-s">${esc(c.term)}</span><span class="de2">${esc(cue(c))}</span></li>`).join("") + "</ul>";
  h += '<div class="btnrow">' +
    `<button type="button" id="tPick"${cards.some((c) => !c.example) ? "" : " disabled"}>${picked.length ? "Andere Karten" : "Karten vorschlagen"}</button>` +
    `<button type="button" class="primary" id="tCopy"${picked.length ? "" : " disabled"}>Prompt kopieren</button></div><p class="msg" id="tMsg"></p>` +
    (cards.some((c) => !c.example) ? "" : '<p class="hint">Dafür brauchst du eigene Karten in diesem Bereich (Beispielkarten zählen hier nicht).</p>') +
    '<label class="field" for="tPaste">Antwort von Claude hier einfügen</label>' +
    '<textarea id="tPaste" spellcheck="false" placeholder="{&quot;kind&quot;: …, &quot;title&quot;: …, &quot;text&quot;: …, &quot;gaps&quot;: […]}"></textarea>' +
    '<div class="btnrow"><button type="button" id="tImport">Importieren</button></div>' +
    `<div class="msg${notice ? " " + notice.kind : ""}" id="iMsg" role="status">${notice ? esc(notice.text) : ""}</div>`;
  area.innerHTML = h;
  notice = null;

  area.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => { openText(app, b.dataset.open); rerender(); }));
  area.querySelectorAll("[data-del]").forEach((b) => armed(b, "Sicher?", () => {
    state.texts = state.texts.filter((t) => t.id !== b.dataset.del);
    delete state.textLog[b.dataset.del];
    app.save();
    app.invalidatePlan();
    rerender();
  }));

  const keep = () => {
    state.drafts["text-" + ar] = {
      kind: area.querySelector("#tKind").value,
      words: Number(area.querySelector("#tWords").value),
      n: Number(area.querySelector("#tN").value),
      ids: draft.ids
    };
    app.save();
    return state.drafts["text-" + ar];
  };
  for (const id of ["tKind", "tWords"]) area.querySelector("#" + id).addEventListener("change", keep);
  area.querySelector("#tN").addEventListener("change", () => { keep().ids = []; app.save(); rerender(); });
  area.querySelector("#tPick").addEventListener("click", () => {
    const d = keep();
    d.ids = pickCards(cards, state, app.texts(), day, d.n).map((c) => c.id);
    app.save();
    rerender();
  });
  area.querySelector("#tCopy").addEventListener("click", () => {
    const d = keep();
    copyText(textPrompt(picked, { ...d, area: ar }, state.prefs), area.querySelector("#tMsg"));
  });
  area.querySelector("#tImport").addEventListener("click", () => {
    const msg = area.querySelector("#iMsg");
    const raw = area.querySelector("#tPaste").value;
    if (!raw.trim()) { setMsg(msg, "Erst die Antwort von Claude einfügen.", "err"); return; }
    const { texts: fresh, errors, warnings } = parseTexts(raw, app.cards(), app.texts().map((t) => t.id), ar);
    if (fresh.length) {
      state.texts.push(...fresh);
      if (state.drafts["text-" + ar]) state.drafts["text-" + ar].ids = [];
      app.save();
      app.invalidatePlan();
    }
    const parts = [];
    if (fresh.length) parts.push(`Importiert: ${fresh.map((t) => "„" + t.title + "“").join(", ")}. Du findest ${fresh.length > 1 ? "sie" : "ihn"} unter „Alle Texte“.`);
    if (errors.length) parts.push("Nicht übernommen: " + errors.join(" "));
    if (warnings.length) parts.push("Zur Prüfung: " + warnings.join(" "));
    if (fresh.length) { notice = { text: parts.join(" "), kind: errors.length || warnings.length ? "err" : "ok" }; rerender(); } else setMsg(msg, parts.join(" "), "err");
  });
}

// Geöffneter Text mit Eingabefeldern in den Lücken
export function renderText(root, app, rerender) {
  const { t } = open;
  const prefs = app.state.prefs;
  const byId = new Map(app.cards().map((c) => [c.id, c]));
  const parts = stripMarks(t.text).split(/\{(\d+)\}/);
  let body = "";
  parts.forEach((p, k) => {
    if (k % 2 === 0) { body += esc(p); return; }
    const n = Number(p);
    const cls = "gi" + (open.checked ? (open.res[n - 1]?.ok ? " good" : " bad") : "");
    body += `<span class="num">${n}</span><input type="text" class="${cls}" id="gi${n}" lang="es" aria-label="Lücke ${n}" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="next" value="${esc(open.vals[n - 1] || "")}"${open.checked ? " readonly" : ""}>`;
  });

  let h = `<div class="sessionbar"><h1 class="withicon">${icon("cloze")}Texte</h1><button type="button" class="small" id="clBack">Anderer Text</button></div>` +
    `<p class="progress">${esc(t.kind)}${t.example ? ' <span class="example-badge">Beispiel</span>' : ""}</p><h2 class="ttl">${esc(t.title)}</h2><div class="passage">${body}</div>`;
  if (!open.checked) {
    if (open.bank) h += '<div class="bank" aria-label="Wortbank">' + open.order.map((w) => `<span>${esc(w)}</span>`).join("") + "</div>";
    h += '<div id="clHint" class="hintpanel"></div><div class="btnrow"><button type="button" class="primary" id="clCheck">Prüfen</button>' +
      `<button type="button" id="clBank">${open.bank ? "Wortbank ausblenden" : "Wortbank einblenden (leichter)"}</button></div>` +
      '<p class="hint">Gesucht sind die Wendungen in der richtigen Form. Bei Subjuntivo steht der Infinitiv in Klammern. Ohne Wortbank ist es Stufe 5, mit Wortbank leichter.</p>';
  } else {
    const right = open.res.filter((r) => r.ok).length;
    h += `<div class="feedback ${right === t.gaps.length ? "good" : "bad"}" role="status">${right} von ${t.gaps.length} richtig.</div><ul class="ex">` +
      t.gaps.map(([id, ans], i) => {
        const c = byId.get(id);
        const r = open.res[i];
        const note = r.ok && r.hinted ? " (mit Hinweis oder Akzent: Karte kommt morgen wieder)" : r.kind === "meaning" ? " (der Akzent ändert die Bedeutung)" : "";
        return `<li><span class="st">${r.ok ? "✓" : "✗"}</span><span>${i + 1}. ${esc(ans.split("|").join(" / "))}${esc(note)}</span>` +
          `<span class="de2">${c ? esc(c.term) + (cue(c) ? " · " + esc(cue(c)) : "") : ""}</span></li>`;
      }).join("") + "</ul>" +
      '<div class="btnrow"><button type="button" class="primary" id="clAgain">Nochmal</button></div>';
  }
  root.innerHTML = h;

  const snap = () => { open.vals = t.gaps.map((_, i) => root.querySelector("#gi" + (i + 1))?.value || ""); };
  root.querySelector("#clBack").addEventListener("click", () => { open = null; rerender(); });
  if (open.checked) {
    root.querySelector("#clAgain").addEventListener("click", () => {
      Object.assign(open, { checked: false, vals: [], res: [], hints: t.gaps.map(newHint), revealed: [], order: shuffle(open.order) });
      rerender();
    });
    return;
  }
  const check = () => {
    snap();
    if (!open.vals.some((v) => v.trim())) { root.querySelector("#gi1").focus(); return; }
    const day = today();
    open.res = t.gaps.map(([id, ans], i) => {
      // „Lösung zeigen“ zählt als falsch, richtig mit Hinweis (auch fehlender Akzent) hält die Karte auf ihrer Stufe.
      const j = judge(ans.split("|"), open.vals[i], prefs.strictAccents);
      const ok = !open.revealed[i] && j.ok;
      const hinted = ok && (j.hinted || open.hints[i].level > 0);
      // Lücken zu entfernten Karten werden geprüft, aber nicht verbucht.
      if (byId.has(id)) record(progressOf(app.state, id), ok, "cloze", day, hinted);
      return { ok, hinted, kind: j.kind };
    });
    open.checked = true;
    app.state.textLog[t.id] = day;
    app.save();
    app.invalidatePlan();
    rerender();
  };
  root.querySelector("#clCheck").addEventListener("click", check);
  root.querySelector("#clBank").addEventListener("click", () => { snap(); open.bank = !open.bank; rerender(); });
  // Hinweise gelten für die Lücke, in der du zuletzt warst
  const panel = root.querySelector("#clHint");
  const drawPanel = () => {
    const i = open.focus;
    const [id, ans] = t.gaps[i];
    const c = byId.get(id);
    const h = open.hints[i];
    const card = { id, cat: c ? c.cat : "", hint: c ? c.hint : "", trigger: c ? c.trigger : undefined };
    const others = t.gaps.filter((_, k) => k !== i).map((g) => g[1].split("|")[0]);
    const options = () => textGapHintOptions(c, app.cards(), ans, others, prefs);
    const spec = { c: card, target: gapTarget(ans), options, hasOptions: !!options() };
    const input = root.querySelector("#gi" + (i + 1));
    panel.innerHTML = `<p class="progress">Hinweis zu Lücke ${i + 1}</p>` + (open.revealed[i]
      ? `<div class="feedback bad" role="status">Lösung: ${esc(ans.split("|").join(" / "))}. Das zählt als nicht gewusst.</div>`
      : hintHtml(h, spec));
    bindHint(panel, h, spec, {
      redraw: drawPanel,
      onRight: (text) => { input.value = text; drawPanel(); },
      onReveal: () => { open.revealed[i] = true; drawPanel(); }
    });
  };
  drawPanel();
  t.gaps.forEach((_, i) => {
    const el = root.querySelector("#gi" + (i + 1));
    el.addEventListener("focus", () => { if (open.focus !== i) { open.focus = i; drawPanel(); } });
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const nx = root.querySelector("#gi" + (i + 2));
      if (nx) nx.focus(); else check();
    });
  });
  root.querySelector("#gi" + (open.focus + 1))?.focus();
}

export { stage5Ids };
