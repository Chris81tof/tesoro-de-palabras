// Stufe 3 · Lückentext: das fehlende Wort eintippen. Bei Subjuntivo ist es die konjugierte Form, der Infinitiv steht in Klammern.
import { gradeGap } from "../core/grade.js";
import { progressHtml, chip, cueParas, sentenceHtml, answerRow, bindAnswer, typedFeedback, refHtml, nextBtn } from "./common.js";

export function render(box, c, s) {
  let h = progressHtml(s) + '<div class="card">' + chip(c) + cueParas(c);
  if (!s.result) h += `<p class="sentence">${sentenceHtml(c.sentence)}</p>` + answerRow("Lösung", s);
  else h += `<p class="sentence">${sentenceHtml(c.sentence, s.result.ok ? (s.result.accentAnswer || s.result.given) : s.result.expected[0])}</p>` +
    typedFeedback(s.result) + refHtml(c, s.prefs, { sentence: false, warn: false }) + nextBtn();
  box.innerHTML = h + "</div>";
  bindAnswer(box, s, (given) => gradeGap(c, given, s.prefs));
}
