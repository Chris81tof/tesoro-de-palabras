// Schreibt die Beispielinhalte (Karten, Texte, Aufgaben) als lesbare Liste zum Gegenlesen: Beispiele-zum-Pruefen.md
// Start: node scripts/export-review.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { AREAS, REG, REGION, MODES } from "../js/core/cards.js";
import { filled } from "../js/core/texts.js";

const read = (f) => JSON.parse(readFileSync(new URL("../data/" + f, import.meta.url), "utf8"));
const cards = read("beispiel-karten.json");
const texts = read("texts.json");
const tasks = read("tasks.json");
const byId = new Map(cards.map((c) => [c.id, c]));
const first = (a) => String(a).split("|")[0];
const fill = (c, a) => c.sentence.replace("____", a);
const flag = (b, t) => (b ? ` **(${t})**` : "");

let md = "# Beispielinhalte zum Gegenlesen\n\n" +
  "Diese Liste entsteht aus `data/beispiel-karten.json`, `data/texts.json` und `data/tasks.json` (`node scripts/export-review.mjs`). Ändere die Inhalte in den JSON-Dateien, nicht hier.\n\n" +
  "Bitte besonders prüfen: Spanisch (Grammatik, Akzente, Natürlichkeit), die Regionsangaben und Warnungen, die deutschen Bedeutungen und ob ein falscher Ablenker (`wrong`) nicht doch richtig sein könnte.\n";

for (const area of Object.keys(AREAS)) {
  md += `\n## ${AREAS[area]}\n`;
  for (const c of cards.filter((x) => x.area === area)) {
    md += `\n### ${c.id} · ${c.term}${flag(c.unsure, "Region unsicher")}\n\n` +
      `- Kategorie: ${c.cat}${c.topic ? ` · Thema: ${c.topic}` : ""} · Register: ${REG[c.reg] || "–"} · Niveau: ${c.level || "–"}${c.region ? ` · Region: ${REGION[c.region]}` : ""}\n` +
      `- Deutsch: ${c.de}\n- Spanisch erklärt: ${c.prompt || "–"}\n` +
      `- Satz: ${fill(c, `**${first(c.answer)}**`)}\n- Alle richtigen Lösungen: ${c.answer.split("|").join(", ")}\n` +
      (c.wrong ? `- Falsche Optionen: ${c.wrong.join(", ")}\n` : "") +
      (c.plain ? `- Schlichte Fassung: ${c.plain}\n` : "") +
      (c.trigger ? `- Auslöser: ${c.trigger} · Modus: ${MODES[c.mode]}\n` : "");
    for (const v of c.variants || []) {
      md += `- Variante ${REGION[v.region] || v.region}: **${v.term}**${v.answer ? ` (Lösung: ${v.answer})` : ""}${flag(v.unsure, "unsicher")}${flag(v.vulgar, "vulgär")}${v.example ? ` · „${v.example}“` : ""}\n`;
    }
    for (const [k, t] of Object.entries(c.xref || {})) md += `- Querverweis ${k}: ${t}\n`;
    if (c.note) md += `- Notiz: ${c.note}\n`;
  }
}

md += "\n## Beispieltexte (Lücken mit der ersten Lösung gefüllt)\n";
for (const t of texts) {
  md += `\n### ${t.id} · ${t.title} (${AREAS[t.area]}, ${t.kind})\n\n${filled(t)}\n\nLücken: ${t.gaps.map(([id, a], i) => `${i + 1} = ${byId.get(id)?.term} → ${a.split("|").join(" / ")}`).join("; ")}\n`;
}

md += "\n## Sprech- und Schreibaufgaben\n";
for (const area of Object.keys(AREAS)) {
  md += `\n### ${AREAS[area]}\n\n`;
  for (const t of tasks[area].speak) md += `- Sprechen (${t.topic}): ${t.q}\n`;
  for (const t of tasks[area].write) md += `- Schreiben (${t.type}): ${t.task}\n`;
}
writeFileSync(new URL("../Beispiele-zum-Pruefen.md", import.meta.url), md);
console.log("geschrieben: Beispiele-zum-Pruefen.md (" + md.split("\n").length + " Zeilen)");
