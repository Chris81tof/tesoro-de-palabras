// Abnahmelauf im Browser: geht durch alle Ansichten und Übungen und meldet, was bei dieser Fenstergröße und Darstellung nicht stimmt:
// seitliches Überlaufen, Tippflächen unter 44 px, Eingabefelder ohne Beschriftung, Knöpfe ohne Namen, doppelte IDs,
// Zeichnungen ohne aria-hidden und zu geringen Kontrast der tatsächlich gezeichneten Farben.
// Benutzung: Seite im Browser öffnen (node scripts/serve.mjs), dann in der Konsole:
//   const { crawl } = await import("/scripts/audit.js"); await crawl();
// Es braucht einen Gerätestand mit Karten (zum Beispiel die Beispielkarten) und verändert den Lernstand im Browser.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(",").map((s) => parseFloat(s)); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const rgbStr = (c) => `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
const bgOf = (el) => {
  for (let e = el; e; e = e.parentElement) {
    const c = parse(getComputedStyle(e).backgroundColor);
    if (c && c.a > 0.01) {
      if (c.a >= 0.99) return c;
      return blend(c, e.parentElement ? bgOf(e.parentElement) : { r: 255, g: 255, b: 255, a: 1 });
    }
  }
  return parse(getComputedStyle(document.body).backgroundColor);
};
const visible = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest("[hidden]") && getComputedStyle(e).visibility !== "hidden" && !e.classList.contains("sr"); };
const label = (e) => (e.id ? "#" + e.id : "") + (e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : "") + " " + (e.textContent || e.value || "").trim().slice(0, 18);

export function check(where) {
  const f = [];
  const add = (k, d) => f.push(`${where} | ${k} | ${d}`);
  if (document.documentElement.scrollWidth > document.documentElement.clientWidth) add("Überlauf", document.documentElement.scrollWidth + ">" + document.documentElement.clientWidth);
  for (const e of document.querySelectorAll("button, a[href], select, summary, input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not(.sr), textarea, label.filebtn")) {
    if (!visible(e) || e.disabled) continue;
    const r = e.getBoundingClientRect();
    if (r.height < 43.5 || r.width < 43.5) add("Tippfläche", label(e) + " " + Math.round(r.width) + "x" + Math.round(r.height));
  }
  for (const e of document.querySelectorAll("input:not([type=hidden]), select, textarea")) {
    if (!visible(e) && !e.classList.contains("sr")) continue;
    if (!(e.labels && e.labels.length) && !e.getAttribute("aria-label") && !e.getAttribute("aria-labelledby")) add("ohne Beschriftung", label(e) + " " + e.tagName);
  }
  for (const e of document.querySelectorAll("button, a[href]")) {
    if (visible(e) && !e.textContent.trim() && !e.getAttribute("aria-label")) add("Knopf ohne Name", label(e));
  }
  const ids = {};
  for (const e of document.querySelectorAll("[id]")) ids[e.id] = (ids[e.id] || 0) + 1;
  for (const [k, n] of Object.entries(ids)) if (n > 1) add("doppelte ID", k);
  for (const s of document.querySelectorAll("svg")) if (!s.getAttribute("aria-hidden") && !s.getAttribute("role") && !s.getAttribute("aria-label")) add("SVG ohne aria-hidden", s.getAttribute("class"));
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const e = n.parentElement;
    if (!e || !visible(e) || e.closest("script, style, option") || e.closest("[disabled]")) continue;
    const cs = getComputedStyle(e);
    let fg = parse(cs.color);
    if (!fg) continue;
    const bg = bgOf(e);
    if (fg.a < 1) fg = blend(fg, bg);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    const r = ratio(fg, bg);
    if (r < need && parseFloat(cs.opacity) >= 1) {
      const key = cs.color + "/" + cs.backgroundColor + e.className;
      if (!seen.has(key)) { seen.add(key); add("Kontrast", `${r.toFixed(2)} < ${need} bei „${n.textContent.trim().slice(0, 20)}“ in ${label(e)} (${cs.color} auf ${rgbStr(bg)})`); }
    }
  }
  return f;
}

export async function crawl() {
  const all = [];
  const rec = (w) => { for (const x of check(w)) if (!all.includes(x)) all.push(x); };
  const click = async (sel, ms = 60) => { const e = typeof sel === "string" ? document.querySelector(sel) : sel; if (!e) return false; e.click(); await sleep(ms); return true; };
  const setSel = async (sel, v) => { const e = document.querySelector(sel); e.value = v; e.dispatchEvent(new Event("change")); await sleep(40); };
  const go = async (h) => { location.hash = h; await sleep(220); window.scrollTo(0, 0); };
  const area = async (a) => { await click(`#top button[data-area="${a}"]`, 120); };

  async function modeRound(mode) {
    await go("practice");
    if (document.querySelector("#stop")) await click("#stop");
    await click(`button.mode[data-mode="${mode}"]`);
    await setSel("#scopeSel", "all");
    await setSel("#sizeSel", "50");
    if (document.querySelector("#go").disabled) { all.push(`Üben/${mode} | keine Karten | übersprungen`); return; }
    rec(`Üben/${mode} Auswahl`);
    await click("#go", 80);
    rec(`Üben/${mode} Frage`);
    if (document.querySelector("button.opt")) await click("button.opt");
    else if (document.querySelector("#flip")) await click("#flip");
    else if (document.querySelector("#ans")) { document.querySelector("#ans").value = "x"; await click("#check"); }
    else if (document.querySelector("#txt")) { document.querySelector("#txt").value = "Una frase de prueba."; await click("#doCheck"); }
    else if (document.querySelector("#pf0")) { document.querySelectorAll("textarea").forEach((t) => (t.value = "texto de prueba largo")); await click("#doCheck"); }
    else if (document.querySelector("#eErr")) await click("#eErr");
    rec(`Üben/${mode} Antwort`);
    if (document.querySelector("#hintBtn")) { await click("#hintBtn"); await click("#hintBtn"); await click("#hintBtn"); rec(`Üben/${mode} Hinweis 3`); }
    await click("#stop");
  }

  for (const a of ["allgemein", "schule"]) {
    await area(a);
    await go("today"); rec(`Heute/${a}`);
    for (const m of ["meaning", "cards", "explain", "choice", "gap", "translate", "error", "rewrite", "produce"]) {
      try { await modeRound(m); } catch (e) { all.push(`${a}/${m} | Fehler | ${e.message}`); }
    }
    await go("practice");
    await click('button.mode[data-mode="cloze"]'); rec(`Texte/${a} Liste`);
    if (await click("[data-open]", 100)) { rec(`Texte/${a} offen`); await click("#hintBtn"); await click("#clBank"); rec(`Texte/${a} Wortbank`); await click("#clCheck", 100); rec(`Texte/${a} geprüft`); await click("#clBack"); }
    await click('button.mode[data-mode="passive"]'); rec(`Passiv/${a} Einstellung`);
    if (await click("#pGo", 80)) { rec(`Passiv/${a} Karte`); await click("#pcard"); rec(`Passiv/${a} aufgedeckt`); await click("#pEnd"); }
    await go("transfer");
    for (const sub of ["story", "speak", "write", "claude"]) {
      await click(`button[data-sub="${sub}"]`);
      if (sub === "claude") await click("#ckBuild"); else await click("#trNew", 80);
      rec(`Transfer/${a}/${sub}`);
    }
    await go("stats"); rec(`Statistik/${a}`);
    await go("library"); rec(`Sammlung/${a}`);
    for (const t of ["add", "claude", "backup", "reset"]) { await click(`#th-${t}`); rec(`Sammlung/${a}/${t}`); await click(`#th-${t}`); }
    await click("#lsel"); rec(`Sammlung/${a} Auswahl`); await click("#lsel");
    await click(".lhead"); rec(`Sammlung/${a} Details`);
    await click("#th-add"); await click("#addBtn", 100); document.querySelectorAll(".fgroup").forEach((d) => (d.open = true)); await click("#vadd"); rec(`Editor/${a} neu`);
    await click("#editCancel", 100);
    const edit = document.querySelector("[data-edit]"); if (edit) { edit.click(); await sleep(100); document.querySelectorAll(".fgroup").forEach((d) => (d.open = true)); rec(`Editor/${a} bearbeiten`); await click("#editCancel", 100); }
  }
  await area("gesamt");
  for (const h of ["today", "practice", "transfer", "stats", "library"]) { await go(h); rec(`Gesamt/${h}`); }
  await go("settings"); rec("Einstellungen");
  await area("allgemein");
  return all;
}
