// Einstellungen: Variante, Land, Akzente, Beispielkarten.
import { esc, armed } from "../core/dom.js";
import { REGION } from "../core/cards.js";
import { removeExamples } from "../core/state.js";
import { DIRECTIONS } from "../core/meaning.js";
import { THEMES, applyTheme } from "../core/theme.js";
import { canSpeak, voices, onVoices, rankVoices, bestVoice, voiceLabel, qualityOf, say, stopSpeaking, sampleFor, savedVoice, targetLocale } from "../core/speech.js";

let unsubscribe = null;

export function leave() {
  stopSpeaking();
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}

const COUNTRIES = Object.entries(REGION).filter(([k]) => k !== "es" && k !== "latam");

// Sprachausgabe: Vorlesen, Tempo, Stimme je Variante mit Probe
function speechBody(p) {
  let h = "<h2>Sprachausgabe</h2>";
  if (!canSpeak()) return h + '<p class="prompt">Dieser Browser kann nicht vorlesen.</p>';
  const list = rankVoices(voices(), p);
  const auto = bestVoice(voices(), { ...p, voices: { es: "", latam: "" } });
  const current = bestVoice(voices(), p);
  const saved = savedVoice(p);
  const missing = saved && !list.some((v) => v.name === saved);
  const locale = targetLocale(p);
  h += `<label class="check"><input type="checkbox" id="sSpeak"${p.speak ? " checked" : ""}> Spanisch vorlesen (Übungen und Passiv-Durchlauf)</label>` +
    `<label class="field" for="sRate">Tempo: <strong id="sRateV">${Math.round(p.rate * 100)} %</strong></label>` +
    `<input type="range" id="sRate" min="0.6" max="1.2" step="0.02" value="${p.rate}">` +
    `<p class="prompt">Zu deiner Variante (${esc(locale)}) gehört: <strong>${current ? esc(voiceLabel(current)) : "keine spanische Stimme gefunden"}</strong></p>` +
    (missing ? `<p class="msg err">Die gewählte Stimme „${esc(saved)}“ gibt es auf diesem Gerät nicht. Es gilt die automatische Wahl.</p>` : "");
  h += '<ul class="list voices" role="radiogroup" aria-label="Stimme">' +
    `<li><label class="pick"><input type="radio" name="voice" value=""${saved ? "" : " checked"}><span class="meta"><strong>Automatisch</strong><span>${auto ? esc(voiceLabel(auto)) : "–"}</span></span></label>` +
    '<button type="button" class="small" data-try="">Probe</button></li>' +
    list.map((v, i) => `<li><label class="pick"><input type="radio" name="voice" value="${esc(v.name)}"${saved === v.name ? " checked" : ""}>` +
      `<span class="meta"><strong>${esc(v.name.replace(/\s*\((premium|enhanced|erweitert|mejorada)\)/i, ""))}</strong><span>${esc((v.lang || "").replace("_", "-"))}${qualityOf(v) === 2 ? " · Premium" : qualityOf(v) === 1 ? " · Erweitert" : ""}${i === 0 ? " · beste Wahl" : ""}</span></span></label>` +
      `<button type="button" class="small" data-try="${esc(v.name)}">Probe</button></li>`).join("") + "</ul>";
  if (!list.length) h += '<p class="hint">Noch keine spanischen Stimmen geladen. Falls die Liste leer bleibt, siehe unten.</p>';
  h += '<p class="hint">Die Stimme gilt je Variante: Spanien und Lateinamerika merken sich ihre eigene Wahl.</p>' +
    '<h3>Bessere Stimmen auf dem iPhone</h3>' +
    '<p class="prompt">Stimmen in Premium- oder erweiterter Qualität klingen deutlich natürlicher. iOS lädt sie nicht von selbst:</p>' +
    '<ol class="steps"><li>Einstellungen › Bedienungshilfen › Gesprochene Inhalte › Stimmen › Spanisch</li>' +
    "<li>Für Spanien zum Beispiel Mónica, Marisol oder Jorge wählen, für Lateinamerika Paulina, Angélica oder Juan (Mexiko), und die Fassung „Premium“ oder „Erweitert“ laden.</li>" +
    "<li>Die App danach ganz schließen und neu öffnen. Die automatische Wahl nimmt die neue Stimme dann von selbst.</li></ol>";
  return h;
}

export function render(root, app) {
  // Safari liefert die Stimmen manchmal erst nach dem ersten Zeichnen. Einmal pro Besuch anmelden.
  if (!unsubscribe) unsubscribe = onVoices(() => render(root, app));
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
    speechBody(p) +
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
  root.querySelector("#sSpeak")?.addEventListener("change", (e) => { p.speak = e.target.checked; if (!p.speak) stopSpeaking(); app.save(); });
  const rate = root.querySelector("#sRate");
  if (rate) {
    rate.addEventListener("input", () => { root.querySelector("#sRateV").textContent = Math.round(rate.value * 100) + " %"; });
    rate.addEventListener("change", () => { p.rate = Number(rate.value); app.save(); say(sampleFor(p), p, undefined, { force: true }); });
  }
  root.querySelectorAll('input[name="voice"]').forEach((r) => r.addEventListener("change", () => {
    p.voices[p.variant === "latam" ? "latam" : "es"] = r.value;
    app.save();
    say(sampleFor(p), p, undefined, { force: true });
    render(root, app);
  }));
  root.querySelectorAll("[data-try]").forEach((b) => b.addEventListener("click", () => {
    const v = b.dataset.try ? voices().find((x) => x.name === b.dataset.try) : bestVoice(voices(), { ...p, voices: { es: "", latam: "" } });
    say(sampleFor(p), p, undefined, { force: true, voice: v || undefined });
  }));
  root.querySelector("#country")?.addEventListener("change", (e) => { p.country = e.target.value; app.save(); });
  root.querySelectorAll("button[data-s]").forEach((b) => b.addEventListener("click", () => { p.strictAccents = b.dataset.s === "1"; app.save(); render(root, app); }));
  const rm = root.querySelector("#rmEx");
  if (rm) armed(rm, "Sicher? Karten und ihr Fortschritt gehen weg", () => { removeExamples(app.state); app.save(); app.invalidatePlan(); render(root, app); });
}
