// Stufe 1 · Erklären: Bedeutung, Register und Nuance selbst beschreiben, dann vergleichen
import { esc } from "../core/dom.js";
import { explainPrompt } from "../core/prompts.js";
import { progressHtml, chip, cueParas, refHtml, gradeBtns, bindGrade } from "./common.js";

export function render(box, c, s) {
  if (!s.ui || s.ui.id !== c.id) s.ui = { id: c.id, stage: "write", text: "" };
  let h = progressHtml(s) + '<div class="card">' + chip(c, "Erklären") + `<p class="term">${esc(c.term)}</p>`;
  if (s.ui.stage === "write") {
    h += '<p class="prompt">Erkläre in 2–4 Sätzen (Deutsch oder Spanisch): Was bedeutet der Ausdruck, welches Register hat er, wann benutzt man ihn, und wodurch unterscheidet er sich von ähnlichen Ausdrücken?</p>' +
      `<textarea id="txt" aria-label="Deine Erklärung" spellcheck="false">${esc(s.ui.text)}</textarea>` +
      '<div class="btnrow"><button type="button" class="primary" id="doCheck">Aufdecken</button></div>';
  } else {
    h += `<p class="prompt">Deine Erklärung:</p><p class="own">${esc(s.ui.text)}</p><p class="prompt">Referenz:</p>` + cueParas(c) + refHtml(c, s.prefs) +
      '<div class="btnrow"><button type="button" id="copyEx">Prompt für Claude kopieren</button></div><p class="msg" id="exMsg"></p>' +
      '<p class="prompt">Hast du Bedeutung, Register und Nuance getroffen?</p>' + gradeBtns();
  }
  box.innerHTML = h + "</div>";
  if (s.ui.stage === "write") {
    const ta = box.querySelector("#txt");
    ta.focus();
    box.querySelector("#doCheck").addEventListener("click", () => {
      if (!ta.value.trim()) { ta.focus(); return; }
      s.ui.text = ta.value;
      s.ui.stage = "judge";
      s.rerender();
    });
  } else {
    bindGrade(box, s);
    const msg = box.querySelector("#exMsg");
    box.querySelector("#copyEx").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(explainPrompt(c, s.ui.text)); msg.textContent = "Kopiert. Jetzt in Claude einfügen."; msg.className = "msg ok"; }
      catch { msg.textContent = "Kopieren wurde blockiert."; msg.className = "msg err"; }
    });
  }
}
