// Stufe 1 · Bedeutung: Richtung nach Einstellung (Standard Deutsch → Spanisch), Auswahl aus vier
import { esc } from "../core/dom.js";
import { cue } from "../core/modes.js";
import { meaningOptions } from "../core/meaning.js";
import { viewOf } from "../core/variants.js";
import { progressHtml, chip, sentenceHtml, optsHtml, bindOpts, fb, refHtml, nextBtn, bindNext } from "./common.js";

export function render(box, c, s) {
  const es = s.prefs.meaningDir !== "es-de";
  if (!s.ui || s.ui.id !== c.id) {
    const m = meaningOptions(c, s.cards, s.prefs);
    s.ui = { id: c.id, solution: m.solution, opts: m.options, picked: null };
  }
  const shown = viewOf(c, s.prefs).shown;
  let h = progressHtml(s) + '<div class="card">' + chip(c, "Bedeutung");
  // Deutsch → Spanisch: der Satz hat die Lücke (nach der Antwort gefüllt). Spanisch → Deutsch: vollständiger Satz ohne Lücke.
  if (es) h += `<p class="de">${esc(cue(c))}</p>` +
    (c.sentence ? `<p class="sentence">${sentenceHtml(c.sentence, s.result ? shown.answers[0] : "")}</p>` : "") +
    '<p class="prompt">Wie heißt die Wendung auf Spanisch?</p>';
  else h += `<p class="term">${esc(shown.term)}</p>` +
    (c.sentence ? `<p class="sentence">${sentenceHtml(c.sentence, shown.answers[0])}</p>` : "") +
    '<p class="prompt">Was bedeutet die Wendung hier?</p>';
  h += optsHtml(s);
  if (s.result) h += fb(s.result.ok, s.result.ok ? "" : "Gesucht: " + s.ui.solution) + refHtml(c, s.prefs, { sentence: false }) + nextBtn();
  box.innerHTML = h + "</div>";
  bindOpts(box, s);
  bindNext(box, s);
}
