// Stufe 5 · Umformulieren: den schlichten Satz mit der Wendung anspruchsvoller umschreiben
import { esc } from "../core/dom.js";
import { cue } from "../core/modes.js";
import { norm } from "../core/cards.js";
import { usesExpr } from "../core/match.js";
import { termTarget, termHintOptions } from "../core/hints.js";
import { viewOf } from "../core/variants.js";
import { progressHtml, chip, sentenceHtml, gradeBtns, bindGrade, bindNext, nextBtn, checkLine, hintState, hintHtml, bindHint } from "./common.js";

export function render(box, c, s) {
  if (!s.ui || s.ui.id !== c.id) s.ui = { id: c.id, stage: "write", text: "" };
  const shown = viewOf(c, s.prefs).shown;
  let h = progressHtml(s) + '<div class="card">' + chip(c, "Umformulieren") +
    `<p class="prompt">Schlichte Fassung:</p><p class="sentence">${esc(c.plain)}</p>` +
    `<p class="prompt">Formuliere den Satz anspruchsvoller um und baue <strong>${esc(shown.term)}</strong> ein. Bedeutung: ${esc(cue(c))}</p>`;
  const options = () => termHintOptions(c, s.cards, s.prefs);
  const spec = { c, target: termTarget(shown.term), options, hasOptions: options().length >= 2 };
  const h0 = hintState(s, c);
  if (s.ui.stage === "write") {
    h += hintHtml(h0, spec) + `<textarea class="mid" id="txt" lang="es" aria-label="Dein Satz" spellcheck="false">${esc(s.ui.text)}</textarea>` +
      '<div class="btnrow"><button type="button" class="primary" id="doCheck">Prüfen</button></div>';
  } else {
    const found = usesExpr(s.ui.text, c);
    h += `<p class="sentence own">${esc(s.ui.text)}</p>` +
      checkLine(found, "Wendung " + (found ? "erkannt." : "nicht erkannt. Prüfe Form und Wortlaut, auch eine andere passende Wendung kann in Ordnung sein.")) +
      (norm(s.ui.text) === norm(c.plain) ? checkLine(false, "Der Satz ist unverändert.") : "") +
      `<p class="prompt">Mustersatz:</p><p class="sentence">${sentenceHtml(c.sentence, shown.answers[0])}</p>` +
      (c.note ? `<p class="note">${esc(c.note)}</p>` : "") +
      (s.result
        ? `<div class="feedback bad" role="status">✗ Lösung gezeigt, das zählt als nicht gewusst. Gesucht: ${esc(shown.term)}</div>` + nextBtn()
        : '<p class="prompt">Wie war dein Satz im Vergleich?</p>' + gradeBtns());
  }
  box.innerHTML = h + "</div>";
  if (s.ui.stage === "write") {
    const ta = box.querySelector("#txt");
    ta.focus();
    bindHint(box, h0, spec, {
      save: () => { s.ui.text = ta.value; },
      redraw: s.rerender,
      onRight: () => s.rerender(),
      onReveal: () => { s.ui.stage = "judge"; s.result = { ok: false, revealed: true }; s.rerender(); }
    });
    box.querySelector("#doCheck").addEventListener("click", () => {
      if (!ta.value.trim()) { ta.focus(); return; }
      s.ui.text = ta.value;
      s.ui.stage = "judge";
      s.rerender();
    });
  } else if (s.result) bindNext(box, s);
  else bindGrade(box, s);
}
