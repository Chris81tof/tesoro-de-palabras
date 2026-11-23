// Reiter, die später gebaut werden (Umbauplan Schritt 5 und 6).
import { esc } from "../core/dom.js";

export const later = (title, step) => ({
  render(root) {
    root.innerHTML = `<h1>${esc(title)}</h1><p class="prompt">Kommt in Schritt ${step} des Umbauplans.</p>`;
  }
});
