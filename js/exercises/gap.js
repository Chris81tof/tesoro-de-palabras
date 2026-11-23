// Stufe 3 · Lückentext: das fehlende Wort eintippen. Bei Subjuntivo ist es die konjugierte Form, der Infinitiv steht in Klammern.
// Gestufte Hinweise: Gerüst (bei Subjuntivo der Auslöser), Anfangsbuchstaben, Auswahl, dann „Lösung zeigen“.
import { gradeGap, withHint, revealResult, pickedResult } from "../core/grade.js";
import { gapTarget, gapHintOptions } from "../core/hints.js";
import { viewOf } from "../core/variants.js";
import { progressHtml, chip, cueParas, sentenceHtml, answerRow, bindAnswer, typedFeedback, refHtml, nextBtn, hintState, hintHtml, bindHint } from "./common.js";

export function render(box, c, s) {
  const shown = viewOf(c, s.prefs).shown;
  const h0 = hintState(s, c);
  const options = () => gapHintOptions(c, s.cards, s.prefs);
  const spec = { c, target: gapTarget(shown.answers[0]), options, hasOptions: !!options() };
  let h = progressHtml(s) + '<div class="card">' + chip(c) + cueParas(c);
  if (!s.result) h += `<p class="sentence">${sentenceHtml(c.sentence)}</p>` + hintHtml(h0, spec) + answerRow("Lösung", s);
  else h += `<p class="sentence">${sentenceHtml(c.sentence, s.result.ok ? (s.result.accentAnswer || s.result.given) : s.result.expected[0])}</p>` +
    typedFeedback(s.result) + refHtml(c, s.prefs, { sentence: false, warn: false }) + nextBtn();
  box.innerHTML = h + "</div>";
  bindAnswer(box, s, (given) => withHint(gradeGap(c, given, s.prefs), h0.level));
  if (!s.result) {
    bindHint(box, h0, spec, {
      save: () => { s.typed = box.querySelector("#ans").value; },
      redraw: s.rerender,
      onRight: (t) => { s.result = pickedResult(t); s.rerender(); },
      onReveal: () => { s.result = revealResult(shown.answers); s.rerender(); }
    });
  }
}
