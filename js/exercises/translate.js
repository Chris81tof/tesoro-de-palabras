// Stufe 3 · Übersetzen: aus der deutschen Bedeutung die spanische Wendung tippen (Artikel darf fehlen).
// Gestufte Hinweise wie im Lückentext.
import { esc } from "../core/dom.js";
import { cue } from "../core/modes.js";
import { gradeTerm, withHint, revealResult, pickedResult } from "../core/grade.js";
import { termTarget, termHintOptions } from "../core/hints.js";
import { viewOf } from "../core/variants.js";
import { progressHtml, chip, answerRow, bindAnswer, typedFeedback, refHtml, nextBtn, hintState, hintHtml, bindHint } from "./common.js";

export function render(box, c, s) {
  const shown = viewOf(c, s.prefs).shown;
  const h0 = hintState(s, c);
  const options = () => termHintOptions(c, s.cards, s.prefs);
  const spec = { c, target: termTarget(shown.term), options, hasOptions: options().length >= 2 };
  let h = progressHtml(s) + '<div class="card">' + chip(c, "Deutsch zu Spanisch") + `<p class="de">${esc(cue(c))}</p>`;
  if (!s.result) h += '<p class="prompt">Wie heißt die Wendung auf Spanisch? Der Artikel darf fehlen.</p>' + hintHtml(h0, spec) + answerRow("Spanisch", s);
  else h += typedFeedback(s.result) + refHtml(c, s.prefs, { warn: false }) + nextBtn();
  box.innerHTML = h + "</div>";
  bindAnswer(box, s, (given) => withHint(gradeTerm(c, given, s.prefs), h0.level));
  if (!s.result) {
    bindHint(box, h0, spec, {
      save: () => { s.typed = box.querySelector("#ans").value; },
      redraw: s.rerender,
      onRight: (t) => { s.result = pickedResult(t); s.rerender(); },
      onReveal: () => { s.result = revealResult([shown.term]); s.rerender(); }
    });
  }
}
