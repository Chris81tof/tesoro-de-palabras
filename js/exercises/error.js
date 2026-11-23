// Stufe 4 · Fehlersuche: Ist das markierte Wort richtig? Wenn nicht, die Korrektur tippen.
import { gradeGap } from "../core/grade.js";
import { viewOf } from "../core/variants.js";
import { progressHtml, chip, cueParas, sentenceHtml, answerRow, bindAnswer, fb, typedFeedback, refHtml, nextBtn, bindNext } from "./common.js";

export function render(box, c, s) {
  if (!s.ui || s.ui.id !== c.id) {
    const sol = viewOf(c, s.prefs).shown.answers[0];
    const wrong = Math.random() < 0.6;
    s.ui = { id: c.id, wrong, solution: sol, word: wrong ? c.wrong[Math.floor(Math.random() * c.wrong.length)] : sol, stage: "judge" };
  }
  const ui = s.ui;
  let h = progressHtml(s) + '<div class="card">' + chip(c, "Fehlersuche") + cueParas(c) +
    `<p class="sentence">${sentenceHtml(c.sentence, ui.word)}</p>`;
  if (s.result && s.result.msg) h += fb(s.result.ok, s.result.msg) + refHtml(c, s.prefs, { sentence: false, warn: false }) + nextBtn();
  else if (s.result) h += typedFeedback(s.result) + refHtml(c, s.prefs, { sentence: false, warn: false }) + nextBtn();
  else if (ui.stage === "judge") {
    h += '<p class="prompt">Ist das markierte Wort in diesem Satz richtig?</p>' +
      '<div class="btnrow"><button type="button" id="eOk">Ja, der Satz ist korrekt</button><button type="button" class="primary" id="eErr">Nein, hier steckt ein Fehler</button></div>';
  } else h += '<p class="prompt">Welches Wort gehört an die markierte Stelle?</p>' + answerRow("Korrektur", s);
  box.innerHTML = h + "</div>";

  if (s.result) { bindNext(box, s); return; }
  if (ui.stage === "fix") {
    bindAnswer(box, s, (given) => {
      const r = gradeGap(c, given, s.prefs);
      return r.ok ? r : { ...r, expected: [ui.solution], given };
    });
    return;
  }
  box.querySelector("#eOk").addEventListener("click", () => {
    s.result = ui.wrong
      ? { ok: false, msg: `Das markierte Wort „${ui.word}“ ist falsch. Richtig ist: ${ui.solution}.` }
      : { ok: true, msg: "Der Satz war korrekt." };
    s.rerender();
  });
  box.querySelector("#eErr").addEventListener("click", () => {
    if (!ui.wrong) s.result = { ok: false, msg: `Der Satz war korrekt, das Wort „${ui.word}“ passt hier.` };
    else ui.stage = "fix";
    s.rerender();
  });
}
