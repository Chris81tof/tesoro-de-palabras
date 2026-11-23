// Einstellungen: Variante, Land, Akzente, Beispielkarten.
import { esc, armed } from "../core/dom.js";
import { REGION } from "../core/cards.js";
import { removeExamples } from "../core/state.js";
import { DIRECTIONS } from "../core/meaning.js";
import { THEMES, applyTheme } from "../core/theme.js";

const COUNTRIES = Object.entries(REGION).filter(([k]) => k !== "es" && k !== "latam");

export function render(root, app) {
  const p = app.state.prefs;
  const hasExamples = !app.state.examples.removed;
  root.innerHTML = '<h1>Einstellungen</h1>' +
    '<h2>Variante</h2><p class="hint">Karten mit Unterschieden zeigen zuerst deine Variante. Andere Fassungen zählen als richtig, die App meldet „richtig, in deiner Variante: …“.</p>' +
    `<div class="seg2" role="group" aria-label="Variante"><button type="button" data-v="es" aria-pressed="${p.variant === "es"}">Spanien</button>` +
    `<button type="button" data-v="latam" aria-pressed="${p.variant === "latam"}">Lateinamerika</button></div>` +
    (p.variant === "latam"
      ? `<div class="settingsrow"><label for="country">Land (für Fassungen und Warnungen)</label><select id="country"><option value="">Ganz Lateinamerika</option>` +
        COUNTRIES.map(([k, v]) => `<option value="${k}"${p.country === k ? " selected" : ""}>${esc(v)}</option>`).join("") + "</select></div>"
      : "") +
    '<h2>Darstellung</h2><p class="hint">Automatisch folgt der Einstellung deines Geräts.</p>' +
    `<div class="seg2" role="group" aria-label="Darstellung">` + Object.entries(THEMES).map(([k, v]) => `<button type="button" data-t="${k}" aria-pressed="${p.theme === k}">${v}</button>`).join("") + "</div>" +
    '<h2>Übung „Bedeutung“</h2><p class="hint">Welche Richtung soll die Auswahl in Stufe 1 haben? Aktiv üben (Deutsch → Spanisch) trainiert, die Wendung selbst zu finden.</p>' +
    `<div class="seg2" role="group" aria-label="Richtung">` + Object.entries(DIRECTIONS).map(([k, v]) => `<button type="button" data-d="${k}" aria-pressed="${p.meaningDir === k}">${v}</button>`).join("") + "</div>" +
    '<h2>Akzente</h2><p class="hint">Locker: Ein fehlender Akzent (esta statt está) zählt als richtig mit Hinweis, die Karte kommt morgen wieder. Streng: Er zählt als falsch. Das ñ darf nie fehlen.</p>' +
    `<div class="seg2" role="group" aria-label="Akzente"><button type="button" data-s="0" aria-pressed="${!p.strictAccents}">Locker</button><button type="button" data-s="1" aria-pressed="${p.strictAccents}">Streng</button></div>` +
    '<h2>Beispielkarten</h2>' +
    (hasExamples
      ? '<p class="hint">10 Karten zum Ausprobieren, im Plan und in den Übungen als „Beispiel“ markiert. Sie zählen nicht in Statistik und Gesamtansicht.</p><button type="button" id="rmEx">Beispielkarten entfernen</button>'
      : '<p class="hint">Die Beispielkarten sind entfernt.</p>');
  root.querySelectorAll("button[data-v]").forEach((b) => b.addEventListener("click", () => {
    p.variant = b.dataset.v;
    if (p.variant === "es") p.country = "";
    app.save(); app.invalidatePlan(); render(root, app);
  }));
  root.querySelectorAll("button[data-t]").forEach((b) => b.addEventListener("click", () => { p.theme = b.dataset.t; applyTheme(p.theme); app.save(); render(root, app); }));
  root.querySelectorAll("button[data-d]").forEach((b) => b.addEventListener("click", () => { p.meaningDir = b.dataset.d; app.save(); render(root, app); }));
  root.querySelector("#country")?.addEventListener("change", (e) => { p.country = e.target.value; app.save(); });
  root.querySelectorAll("button[data-s]").forEach((b) => b.addEventListener("click", () => { p.strictAccents = b.dataset.s === "1"; app.save(); render(root, app); }));
  const rm = root.querySelector("#rmEx");
  if (rm) armed(rm, "Sicher? Karten und ihr Fortschritt gehen weg", () => { removeExamples(app.state); app.save(); app.invalidatePlan(); render(root, app); });
}
