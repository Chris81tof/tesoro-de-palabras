// Formular „Karte bearbeiten“ und „Eigene Karte anlegen“: wird von den Übungen, dem Passiv-Durchlauf und der Sammlung benutzt.
import { esc, armed } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { CATS, REG, REGION, AREAS, TOPICS, MODES, LEVELS, XREF_LANGS, SUBJ_CAT } from "../core/cards.js";
import { formValues, saveEdit, createCard, restoreOriginal, isEdited, isCustom, isEditable } from "../core/edit.js";

// Stift-Knopf; bindEdit hängt die Funktion an alle Stifte in root. Beispielkarten bekommen keinen.
export const editBtn = (card, cls = "") => (isEditable(card)
  ? `<button type="button" class="iconbtn editbtn${cls ? " " + cls : ""}" data-edit="${esc(card.id)}" aria-label="Karte bearbeiten" title="Bearbeiten">${icon("edit")}</button>`
  : "");
export function bindEdit(root, fn) {
  root.querySelectorAll("button[data-edit]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); fn(b.dataset.edit); }));
}

const opts = (map, cur, first) =>
  (first !== undefined ? [`<option value=""${cur ? "" : " selected"}>${esc(first)}</option>`] : [])
    .concat(Object.entries(map).map(([k, v]) => `<option value="${esc(k)}"${k === cur ? " selected" : ""}>${esc(v)}</option>`)).join("");

const input = (name, label, v, extra = "") => `<label>${esc(label)} <input name="${name}" value="${esc(v)}" autocomplete="off" autocapitalize="none" spellcheck="false" lang="es"${extra}></label>`;
const area = (name, label, v, cls = "mid") => `<label>${esc(label)} <textarea name="${name}" class="${cls}" spellcheck="false" lang="es">${esc(v)}</textarea></label>`;

const variantRow = (v, i) =>
  `<fieldset class="vrow" data-vrow="${i}"><legend>Variante ${i + 1}</legend>` +
  `<label>Region <select name="v_region">${opts(REGION, v.region, "Bitte wählen")}</select></label>` +
  `<label>Wendung in dieser Region <input name="v_term" value="${esc(v.term)}" autocomplete="off" autocapitalize="none" spellcheck="false" lang="es"></label>` +
  `<label>Lösung für die Lücke (nur wenn sie sich unterscheidet, aus „Lösung“) <input name="v_answer" value="${esc(v.answer)}" autocomplete="off" autocapitalize="none" spellcheck="false" lang="es"></label>` +
  `<label>Beispielsatz <input name="v_example" value="${esc(v.example)}" autocomplete="off" lang="es"></label>` +
  `<label class="check"><input type="checkbox" name="v_unsure"${v.unsure ? " checked" : ""}> unsicher (?)</label>` +
  `<label class="check"><input type="checkbox" name="v_vulgar"${v.vulgar ? " checked" : ""}> in dieser Region vulgär (dann kein Beispiel nötig)</label>` +
  '<button type="button" class="small" data-vdel>Variante entfernen</button></fieldset>';

const group = (title, body, open) => `<details class="fgroup"${open ? " open" : ""}><summary>${esc(title)}</summary>${body}</details>`;

// Liest das Formular. variants und xref werden aus den Zeilen und Feldern gebaut.
export function collect(host) {
  const form = host.querySelector("#editForm");
  const f = Object.fromEntries([...new FormData(form)].filter(([k]) => !k.startsWith("v_") && !k.startsWith("x_") && !k.startsWith("w_")));
  f.unsure = !!form.querySelector("[name=unsure]")?.checked;
  f.wrong = [...form.querySelectorAll("[name=w_wrong]")].map((i) => i.value);
  f.xref = Object.fromEntries([...form.querySelectorAll("[name^=x_]")].map((i) => [i.name.slice(2), i.value]));
  f.variants = [...form.querySelectorAll(".vrow")].map((r) => ({
    region: r.querySelector("[name=v_region]").value, term: r.querySelector("[name=v_term]").value, answer: r.querySelector("[name=v_answer]").value,
    example: r.querySelector("[name=v_example]").value, unsure: r.querySelector("[name=v_unsure]").checked, vulgar: r.querySelector("[name=v_vulgar]").checked
  }));
  return f;
}

// Zeichnet das Formular in host. id: Karte bearbeiten; null: neue eigene Karte im Bereich startArea.
// done(saved, id) wird nach Speichern oder Wiederherstellen (true) oder Abbrechen (false) gerufen.
export function openEditor(host, app, id, done, startArea) {
  const isNew = id === null;
  const card = isNew ? { id: "", area: startArea in AREAS ? startArea : "allgemein" } : app.cards().find((c) => c.id === id);
  if (!card || (!isNew && !isEditable(card))) { done(false); return; }
  const v = formValues(app.levels, app.state, card);
  if (isNew && !v.cat) v.cat = "Sonstiges";
  const cats = CATS.includes(v.cat) ? CATS : [...CATS, v.cat];
  const canRestore = !isNew && !isCustom(id) && isEdited(app.state, id);
  const wrong = v.wrong.map((w, i) => `<input name="w_wrong" value="${esc(w)}" aria-label="Falsche Option ${i + 1}" autocomplete="off" autocapitalize="none" spellcheck="false" lang="es">`).join("");
  const showSubj = v.cat === SUBJ_CAT || v.trigger || v.mode;

  host.innerHTML = `<div class="sessionbar"><h1>${isNew ? "Eigene Karte anlegen" : "Karte bearbeiten"}</h1><span class="hint">${esc(id || "neu")}</span></div>` +
    '<form id="editForm" class="form" novalidate>' +
    group("Grunddaten",
      (isNew
        ? `<label>Bereich <select name="area">${opts(AREAS, v.area)}</select></label>`
        : `<p class="hint">Bereich: ${esc(AREAS[v.area])}</p><input type="hidden" name="area" value="${esc(v.area)}">`) +
      `<label>Kategorie <select name="cat">${cats.map((c) => `<option${c === v.cat ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></label>` +
      `<label id="topicRow"${v.area === "schule" ? "" : " hidden"}>Thema (nur Schulgespräche) <select name="topic">${opts(Object.fromEntries(TOPICS.map((t) => [t, t])), v.topic, "Bitte wählen")}</select></label>` +
      input("term", "Wendung (Nomen mit Artikel, z. B. el ordenador)", v.term) +
      area("alt", "Weitere richtige Schreibweisen der Wendung (eine pro Zeile)", v.alt) +
      input("de", "Bedeutung auf Deutsch", v.de) +
      area("prompt", "Erklärung auf Spanisch (optional)", v.prompt) +
      area("sentence", "Beispielsatz mit Lücke ____ (bei Subjuntivo: Infinitiv in Klammern danach, z. B. ____ (venir))", v.sentence) +
      input("answer", "Lösung für die Lücke (mehrere richtige mit | trennen)", v.answer) +
      area("note", "Notiz (auf Deutsch)", v.note), true) +
    group("Übungshilfen",
      `<fieldset class="wrongset"><legend>Drei falsche Optionen (alle drei oder keine; nie eine gültige Variante)</legend>${wrong}</fieldset>` +
      area("plain", "Schlichte Fassung des Satzes (für „Umformulieren“, ohne Wendung und Lösung)", v.plain) +
      area("hint", "Eigener Hinweis (ohne die Lösung und ohne den Modus)", v.hint), !!(v.plain || v.hint || v.wrong.some(Boolean))) +
    group("Subjuntivo",
      '<p class="hint">Nur für Auslöser: Der Auslöser steht in „Wendung“ oder hier, der Modus entscheidet, was als richtig zählt.</p>' +
      input("trigger", "Auslöser (z. B. es posible que)", v.trigger) +
      `<label>Modus <select name="mode">${opts(MODES, v.mode, "Keine Angabe")}</select></label>`, !!showSubj) +
    group("Register, Region, Varianten",
      `<label>Register <select name="reg">${opts(REG, v.reg, "Keine Angabe")}</select></label>` +
      `<label>Gebrauch der Hauptform <select name="region">${opts(REGION, v.region, "Überall")}</select></label>` +
      `<label class="check"><input type="checkbox" name="unsure"${v.unsure ? " checked" : ""}> Angabe zur Hauptform unsicher (?)</label>` +
      '<div id="vrows">' + v.variants.map(variantRow).join("") + "</div>" +
      '<button type="button" class="small" id="vadd">Variante hinzufügen</button>', !!(v.region || v.unsure || v.variants.length || v.reg)) +
    group("Querverweise und falsche Freunde",
      XREF_LANGS.map((l) => input("x_" + l, `${l} (z. B. Ähnliches oder falscher Freund)`, v.xref[l])).join(""), XREF_LANGS.some((l) => v.xref[l])) +
    group("Niveau", `<label>Niveau-Einschätzung (eigene, keine offizielle Einstufung) <select name="level">${opts(Object.fromEntries(LEVELS.map((l) => [l, l])), v.level, "Keine Angabe")}</select></label>`, !!v.level) +
    '<div id="editMsg" class="msg" role="alert"></div>' +
    '<div class="btnrow"><button type="submit" class="primary">Speichern</button><button type="button" id="editCancel">Abbrechen</button></div>' +
    (canRestore ? '<div class="btnrow"><button type="button" id="editRestore">Original wiederherstellen</button></div>' : "") +
    "</form>" +
    (isNew ? '<p class="hint">Neue Karten bekommen eine eigene ID (u01, u02 …) und starten ohne Lernstand.</p>'
      : isCustom(id) ? '<p class="hint">Eigene Karte: Änderungen gelten sofort und ersetzen die Karte. Lernstand und ID bleiben.</p>'
        : '<p class="hint">Deine Änderung gilt nur auf diesem Gerät. Die Karte in den Startdaten bleibt unverändert, Lernstand und ID auch.</p>');

  const form = host.querySelector("#editForm");
  const vrows = host.querySelector("#vrows");
  const renumber = () => vrows.querySelectorAll(".vrow").forEach((r, i) => { r.querySelector("legend").textContent = `Variante ${i + 1}`; });
  host.querySelector("#vadd").addEventListener("click", () => {
    vrows.insertAdjacentHTML("beforeend", variantRow({ region: "", term: "", answer: "", example: "", unsure: false, vulgar: false }, vrows.children.length));
    renumber();
    vrows.lastElementChild.querySelector("select").focus();
  });
  vrows.addEventListener("click", (e) => { if (e.target.closest("[data-vdel]")) { e.target.closest(".vrow").remove(); renumber(); } });
  form.querySelector("[name=area]")?.addEventListener("change", (e) => { host.querySelector("#topicRow").hidden = e.target.value !== "schule"; });
  form.querySelector("[name=cat]").addEventListener("change", (e) => { if (e.target.value === SUBJ_CAT) host.querySelector(".fgroup:nth-of-type(3)").open = true; });

  const msg = host.querySelector("#editMsg");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const values = collect(host);
    const r = isNew
      ? createCard(app.state, app.base, app.cards(), values)
      : saveEdit(app.state, app.base, app.levels, app.cards(), id, values);
    if (r.errors) {
      msg.className = "msg err";
      msg.innerHTML = "<strong>Nicht gespeichert:</strong><ul>" + r.errors.map((m) => `<li>${esc(m)}</li>`).join("") + "</ul>";
      msg.scrollIntoView({ block: "nearest" });
      return;
    }
    app.save();
    app.invalidatePlan();
    done(true, r.id);
  });
  host.querySelector("#editCancel").addEventListener("click", () => done(false));
  const rb = host.querySelector("#editRestore");
  if (rb) armed(rb, "Wirklich? Noch einmal tippen", () => {
    restoreOriginal(app.state, id);
    app.save();
    app.invalidatePlan();
    done(true, id);
  });
  host.querySelector("input[name=term]").focus({ preventScroll: true });
}

