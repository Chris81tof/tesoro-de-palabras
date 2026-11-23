// Stufe 2 · Auswahl: welche Option passt in den Satz? Richtig ist die Form der eigenen Variante.
import { choiceOptions } from "../core/choice.js";
import { progressHtml, chip, cueParas, sentenceHtml, optsHtml, bindOpts, fb, refHtml, nextBtn, bindNext } from "./common.js";

export function render(box, c, s) {
  if (!s.ui || s.ui.id !== c.id) {
    const o = choiceOptions(c, s.prefs);
    s.ui = { id: c.id, solution: o.solution, opts: o.options.map((t) => ({ t, ok: t === o.solution })), picked: null };
  }
  let h = progressHtml(s) + '<div class="card">' + chip(c, "Welche Option passt?") + cueParas(c) +
    `<p class="sentence">${sentenceHtml(c.sentence, s.result ? s.ui.solution : "")}</p>` + optsHtml(s);
  if (s.result) h += fb(s.result.ok, s.result.ok ? "" : "Gesucht: " + s.ui.solution) + refHtml(c, s.prefs, { sentence: false }) + nextBtn();
  box.innerHTML = h + "</div>";
  bindOpts(box, s);
  bindNext(box, s);
}
