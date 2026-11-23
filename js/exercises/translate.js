// Stufe 3 · Übersetzen: aus der deutschen Bedeutung die spanische Wendung tippen
import { esc } from "../core/dom.js";
import { cue } from "../core/modes.js";
import { gradeTerm } from "../core/grade.js";
import { progressHtml, chip, answerRow, bindAnswer, typedFeedback, refHtml, nextBtn } from "./common.js";

export function render(box, c, s) {
  let h = progressHtml(s) + '<div class="card">' + chip(c, "Deutsch zu Spanisch") + `<p class="de">${esc(cue(c))}</p>`;
  if (!s.result) h += '<p class="prompt">Wie heißt die Wendung auf Spanisch? Der Artikel darf fehlen.</p>' + answerRow("Spanisch", s);
  else h += typedFeedback(s.result) + refHtml(c, s.prefs, { warn: false }) + nextBtn();
  box.innerHTML = h + "</div>";
  bindAnswer(box, s, (given) => gradeTerm(c, given, s.prefs));
}
