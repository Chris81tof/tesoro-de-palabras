// Bausteine, die mehrere Übungen teilen.
// s ist die laufende Runde (views/practice.js): queue, right, wrong, result, ui, prefs, rerender(), next(), answer().
import { esc } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { REG, REGION } from "../core/cards.js";
import { viewOf, regionLabel } from "../core/variants.js";
import { revealMode, isSubjuntivo } from "../core/subjuntivo.js";
import { hintLine, MAX_HINT } from "../core/hints.js";

export function sentenceHtml(s, fill) {
  const out = esc(s);
  if (fill) return out.replace(/____/g, "<mark>" + esc(fill) + "</mark>");
  return out.replace(/____/g, '<span class="blank" role="img" aria-label="Lücke"></span>');
}

export function progressHtml(s) {
  return `<p class="progress">Noch ${s.queue.length} in dieser Runde · richtig ${s.right} · nochmal ${s.wrong}</p>`;
}

export function chip(c, extra) {
  const ex = c.example ? '<span class="example-badge">Beispiel</span>' : "";
  return `<span class="chip">${icon("tile")}<span>${esc(c.cat)}${extra ? " · " + esc(extra) : ""}</span>${ex}</span>`;
}

export function cueParas(c) {
  return (c.de ? `<p class="de">${esc(c.de)}</p>` : "") + (c.prompt ? `<p class="prompt">${esc(c.prompt)}</p>` : "");
}

export const unsureTag = () => '<span class="unsure" title="unsicher">? unsicher</span>';

// Was nach der Antwort zur Karte gehört: Wendung, Variante, Auslöser und Modus, Notiz, Register und Region
export function refHtml(c, prefs, { sentence = true, warn = true } = {}) {
  const v = viewOf(c, prefs);
  const reg = [REG[c.reg]].filter(Boolean).join(" · ");
  let h = `<p class="term small">${esc(c.term)}</p>`;
  if (v.shown.term !== c.term) h += `<p class="also">In deiner Variante: <b>${esc(v.shown.term)}</b>${v.shown.unsure ? " " + unsureTag() : ""}</p>`;
  if (sentence && c.sentence) h += `<p class="sentence">${sentenceHtml(c.sentence, v.shown.answers[0])}</p>`;
  if (isSubjuntivo(c)) h += `<p class="also">Auslöser: <b>${esc(c.trigger)}</b> · Modus: <b>${esc(revealMode(c))}</b></p>`;
  if (v.others.length) {
    h += '<p class="also">Auch: ' + v.others.map((o) =>
      `${esc(o.term)} <span class="tag">${esc(o.region ? regionLabel(o.region) : "überall")}</span>${o.unsure ? " " + unsureTag() : ""}`).join("; ") + "</p>";
  }
  if (v.foreign) h += `<p class="also">Hinweis: Diese Fassung gilt vor allem in ${esc(regionLabel(c.region))}.</p>`;
  if (warn) for (const w of v.warnings) h += `<p class="warnbox">${icon("warn")}<span>Achtung: „${esc(w.term)}“ gilt in ${esc(regionLabel(w.region))} als vulgär.</span></p>`;
  if (c.note) h += `<p class="note">${esc(c.note)}</p>`;
  const tags = [reg && `Register: ${reg}`, c.region && `Gebrauch: ${REGION[c.region] || c.region}`].filter(Boolean);
  if (tags.length || c.unsure) h += `<p><span class="tag">${esc(tags.join(" · ") || "Region")}</span>${c.unsure ? " " + unsureTag() : ""}</p>`;
  if (c.xref) h += '<p class="note">Querverweise: ' + Object.entries(c.xref).map(([k, t]) => `${esc(k)}: ${esc(t)}`).join(" · ") + "</p>";
  return h;
}

export function fb(ok, text) {
  return `<div class="feedback ${ok ? "good" : "bad"}" role="status">${ok ? "✓ Richtig. " : "✗ Nicht ganz. "}${esc(text || "")}</div>`;
}

export const nextBtn = () => '<button type="button" class="primary" id="next">Weiter</button>';

export function bindNext(box, s) {
  const nx = box.querySelector("#next");
  if (!nx) return;
  nx.addEventListener("click", () => s.next());
  nx.focus();
}

export function gradeBtns() {
  return '<div class="btnrow"><button type="button" id="gNo">Noch nicht</button><button type="button" class="primary" id="gOk">Passt</button></div>';
}

export function bindGrade(box, s) {
  box.querySelector("#gOk").addEventListener("click", () => s.answer(true));
  box.querySelector("#gNo").addEventListener("click", () => s.answer(false));
}

// Mehrfachauswahl (Bedeutung, Auswahl): s.ui.opts = [{ t, ok }]
export function optsHtml(s) {
  const { ui, result } = s;
  return '<div class="opts">' + ui.opts.map((o, i) => {
    let cls = "opt";
    let mark = "";
    if (result) {
      if (o.ok) { cls += " good"; mark = " ✓"; } else if (ui.picked === i) { cls += " bad"; mark = " ✗"; }
    }
    return `<button type="button" class="${cls}" data-i="${i}"${result ? " disabled" : ""}><span class="k">${i + 1}</span><span>${esc(o.t)}${mark}</span></button>`;
  }).join("") + "</div>";
}

export function bindOpts(box, s) {
  box.querySelectorAll("button.opt").forEach((b) => b.addEventListener("click", () => {
    const i = Number(b.dataset.i);
    const o = s.ui.opts[i];
    if (s.result || !o) return;
    s.ui.picked = i;
    s.result = { ok: o.ok, given: o.t };
    s.rerender();
  }));
}

// Eingabezeile für Tippaufgaben. Autokorrektur aus, damit iOS nichts „verbessert“.
export function answerRow(label, s) {
  return `<div class="answer"><label for="ans" class="chip">${esc(label)}</label>` +
    `<input type="text" id="ans" lang="es" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done" value="${esc((s && s.typed) || "")}">` +
    '<button type="button" class="primary" id="check">Prüfen</button></div>';
}

// check(given) liefert das Ergebnis { ok, … } oder null bei leerer Eingabe
export function bindAnswer(box, s, check) {
  if (s.result) { bindNext(box, s); return; }
  const inp = box.querySelector("#ans");
  if (!inp) return;
  const run = () => {
    if (!inp.value.trim()) { inp.focus(); return; }
    s.result = { ...check(inp.value), given: inp.value.trim() };
    s.rerender();
  };
  inp.focus();
  box.querySelector("#check").addEventListener("click", run);
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(); } });
}

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// Rückmeldung zu einer getippten Antwort (Ergebnis von gradeGap / gradeTerm, ggf. durch withHint ergänzt)
export function typedFeedback(r) {
  let head;
  if (r.ok && r.hinted && r.kind === "accent") head = `✓ Richtig, aber der Akzent fehlt: ${r.accentAnswer}. Die Karte bleibt auf ihrer Stufe und kommt morgen wieder.`;
  else if (r.ok && r.hinted) head = "✓ Richtig. Mit Hinweis gelöst: Die Karte bleibt auf ihrer Stufe und kommt morgen wieder." + (r.variantMsg ? " " + cap(r.variantMsg) + "." : "");
  else if (r.ok) head = "✓ " + (r.variantMsg ? cap(r.variantMsg) + "." : "Richtig.");
  else if (r.revealed) head = `✗ Lösung gezeigt, das zählt als nicht gewusst. Gesucht: ${r.expected.join(" / ")}`;
  else if (r.kind === "meaning") head = `✗ Der Akzent ändert hier die Bedeutung: richtig ist ${r.accentAnswer} (deine Antwort: ${r.given}).`;
  else if (r.kind === "accent") head = `✗ Der Akzent fehlt oder ist falsch: ${r.accentAnswer} (strenger Modus).`;
  else head = `✗ Nicht ganz. Gesucht: ${r.expected.join(" / ")} (deine Antwort: ${r.given})`;
  let h = `<div class="feedback ${r.ok ? "good" : "bad"}" role="status">${esc(head)}</div>`;
  if (r.warning) h += `<p class="warnbox">${icon("warn")}<span>${esc(r.warning)}</span></p>`;
  return h;
}

// Gestufte Hinweise (Stufe 1 bis 3, danach „Lösung zeigen“). Der Zustand h gehört zur Karte:
// { id, level, wrong: [Indizes falscher Optionen], opts: [Optionen] | null, right }.
export const newHint = () => ({ level: 0, wrong: [], opts: null, right: false });

export function hintState(s, c) {
  if (!s.hint || s.hint.id !== c.id) s.hint = { id: c.id, ...newHint() };
  return s.hint;
}

// spec: { c, target, options() } – options liefert bis zu 4 Optionen oder null (dann gibt es nur Stufe 1 und 2)
export const maxLevel = (spec) => (spec.hasOptions ? MAX_HINT : MAX_HINT - 1);

export function hintHtml(h, spec) {
  const max = maxLevel(spec);
  let out = '<div class="hintbox">';
  if (h.level >= 1) {
    out += `<p class="scaffold" aria-label="Hinweis">${esc(hintLine(spec.c, spec.target, h.level))}</p>` +
      (spec.c.hint ? `<p class="note">Eigener Hinweis: ${esc(spec.c.hint)}</p>` : "");
  }
  if (h.level >= MAX_HINT && h.opts) {
    out += '<div class="opts" role="group" aria-label="Welche Option passt?">' + h.opts.map((o, i) => {
      const bad = h.wrong.includes(i);
      return `<button type="button" class="opt${bad ? " bad" : ""}" data-hopt="${i}"${bad || h.right ? " disabled" : ""}><span class="k">${i + 1}</span><span>${esc(o)}${bad ? " ✗" : ""}</span></button>`;
    }).join("") + "</div>";
  }
  out += '<div class="btnrow">' + (h.level < max
    ? `<button type="button" class="small" id="hintBtn">${h.level ? `Nächster Hinweis (${h.level + 1} von ${max})` : "Hinweis"}</button>`
    : '<button type="button" class="small" id="revealBtn">Lösung zeigen</button>') + "</div></div>";
  return out;
}

// hooks: save() sichert Eingaben vor dem Neuzeichnen, redraw() zeichnet neu,
// onRight(text) wird bei der richtigen Option gerufen, onReveal() bei „Lösung zeigen“.
export function bindHint(box, h, spec, hooks) {
  box.querySelector("#hintBtn")?.addEventListener("click", () => {
    hooks.save?.();
    h.level++;
    if (h.level >= MAX_HINT && !h.opts) h.opts = spec.options();
    hooks.redraw();
  });
  box.querySelector("#revealBtn")?.addEventListener("click", () => { hooks.save?.(); hooks.onReveal(); });
  box.querySelectorAll("button[data-hopt]").forEach((b) => b.addEventListener("click", () => {
    const i = Number(b.dataset.hopt);
    hooks.save?.();
    if (h.opts[i] === spec.target.text) { h.right = true; hooks.onRight(h.opts[i]); } else { h.wrong.push(i); hooks.redraw(); }
  }));
}
