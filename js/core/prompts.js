// Prompt-Texte zum Kopieren für Claude. Deutsch, passend zu Spanisch als Lernsprache.

export function explainPrompt(c, text) {
  return "Du bist ein freundlicher, aber genauer Spanischlehrer. Eine Person (Muttersprache Deutsch) übt den Ausdruck unten und hat versucht, ihn zu erklären. " +
    "Prüfe die Erklärung auf Bedeutung, Register, Nuance und den Unterschied zu ähnlichen Ausdrücken. Antworte auf Deutsch, Beispiele auf Spanisch. Kein Markdown, nur einfacher Text.\n\n" +
    "Ausdruck: " + c.term + "\n" + (c.de ? "Bedeutung (Deutsch): " + c.de + "\n" : "") + (c.prompt ? "Spanische Erklärung: " + c.prompt + "\n" : "") +
    (c.note ? "Hinweise zur Karte: " + c.note + "\n" : "") +
    "\nErklärung der Person:\n" + (text.trim() || "(leer)") +
    "\n\nGib aus: 1. Urteil (richtig / teilweise / falsch), 2. was fehlt oder falsch ist, 3. eine bessere Erklärung in zwei Sätzen. Wenn du dir bei Register oder regionalem Gebrauch (Spanien oder Lateinamerika) nicht sicher bist, sag es. Erfinde nichts.";
}

export const PRODUCE_LABELS = {
  allgemein: ["Definition auf Spanisch (eigene Worte)", "Beispielsatz 1 · Alltag", "Beispielsatz 2 · Beruf", "Beispielsatz 3 · abstrakte Diskussion"],
  schule: ["Definition auf Spanisch (eigene Worte)", "Beispielsatz 1 · Elterngespräch", "Beispielsatz 2 · Gespräch mit einem Schüler", "Beispielsatz 3 · Schreiben an die Eltern"]
};

// v: Definition und drei Beispielsätze
export function producePrompt(c, v, area, prefs) {
  const labels = PRODUCE_LABELS[area] || PRODUCE_LABELS.allgemein;
  const variant = prefs.variant === "latam" ? "Lateinamerika" : "Spanien";
  const lines = v.map((t, i) => (i + 1) + ". " + labels[i] + ": " + (t.trim() ? t : "(leer)")).join("\n");
  return "Du bist ein genauer, freundlicher Spanischlehrer. Eine Person (Muttersprache Deutsch, Ziel: C1/C2, Variante: " + variant + ") übt den Ausdruck unten. Sie hat eine Definition in eigenen Worten und drei Beispielsätze geschrieben. Prüfe jeden Eintrag. Antworte auf Deutsch, Beispiele und Verbesserungen auf Spanisch. Kein Markdown, nur einfacher Text." +
    (area === "schule" ? " Es geht um Schulgespräche; nenne in deinen Beispielen keine echten Namen." : "") + "\n\n" +
    "Ausdruck: " + c.term + "\nKategorie: " + (c.cat || "") + (c.de ? "\nBedeutung (Deutsch): " + c.de : "") + (c.prompt ? "\nSpanische Erklärung: " + c.prompt : "") + (c.note ? "\nHinweise zur Karte: " + c.note : "") +
    "\n\nEinträge der Person:\n" + lines +
    "\n\nGib für jeden nicht leeren Eintrag genau diese Zeilen aus:\n" +
    "Nr. und Urteil (richtig / teilweise / falsch)\n" +
    "Grammatik, Rechtschreibung und Akzente: konkrete Fehler mit Regel in einem Satz, oder 'keine Fehler'. Bei Subjuntivo: stimmt der Modus?\n" +
    "Inhalt: ist der Ausdruck richtig verwendet und passt die Bedeutung?\n" +
    "Natürlichkeit, Register und Region: klingt es idiomatisch, zu formell oder zu umgangssprachlich, und passt es zu " + variant + "?\n" +
    "Niveau (Schätzung nach GER, B1 bis C2)\n" +
    "Verbesserte Fassung: ein besserer Satz auf Spanisch, der den Ausdruck beibehält.\n" +
    "Bei der Definition zusätzlich: enthält sie den Ausdruck selbst (nicht erlaubt)?\n" +
    "Am Ende: Gesamteindruck in einem Satz (stark / solide / schwach) und die wichtigste Verbesserung für das nächste Mal. Wenn du dir bei Register oder Region nicht sicher bist, sag es. Erfinde keine Regeln oder Quellen.";
}

// Transfer: Geschichte, Sprechen, Schreiben. d ist der Entwurf (state.drafts[...]).
export const exprLine = (c) => "- " + c.term + (c.de ? " (" + c.de + ")" : "");

const variantOf = (prefs) => (prefs.variant === "latam" ? "Lateinamerika" : "Spanien");
const schoolNote = (area) => (area === "schule" ? " Es geht um Schulgespräche: Nenne in deinen Beispielen keine echten Namen und keine echten Fälle, nur Rollen." : "");

export function transferPrompt(sub, d, cards, area, prefs) {
  const list = cards.map(exprLine).join("\n");
  const v = variantOf(prefs);
  if (sub === "story") {
    return "Geschichte auf Spanisch (Variante: " + v + ")\n\nIch habe diese Ausdrücke in einer Geschichte verwendet:\n" + list + "\n\nMeine Geschichte:\n" + (d.text || "[leer]") +
      "\n\nBitte prüfe: 1) Ist jeder Ausdruck korrekt und natürlich verwendet (Form, Präposition, Modus bei Subjuntivo, Register)? 2) Welche klingen unnatürlich, und wie würde ein Muttersprachler es sagen? 3) Gib mir eine verbesserte Fassung. Antworte auf Deutsch, Beispiele auf Spanisch. Keine langen Vorreden." + schoolNote(area);
  }
  if (sub === "speak") {
    return "Sprechübung Spanisch (Niveau C1/C2, Variante: " + v + ")\n\nFrage: " + d.task + "\n\nAusdrücke, die ich einbauen wollte:\n" + list + "\n\nMeine Stichpunkte / mein Transkript:\n" + (d.notes || "[ich füge mein Transkript im Chat ein]") +
      "\n\nBitte stelle dich als Prüfer vor, stelle mir zuerst die Frage und danach 2 Nachfragen, und bewerte meine Antworten nach Wortschatz und Grammatik, Aufbau, Aussprache (soweit aus Text erkennbar) und Interaktion. Nenne, welche Ausdrücke natürlich verwendet wurden. Antworte auf Deutsch, Beispiele auf Spanisch." + schoolNote(area);
  }
  return "Schreibaufgabe Spanisch (" + d.type + ", Niveau C1/C2, Variante: " + v + ")\n\nAufgabe: " + d.task + "\n\nAusdrücke, die ich einbauen wollte:\n" + list + "\n\nMein Text:\n" + (d.text || "[leer]") +
    "\n\nBitte bewerte nach Inhalt, Angemessenheit von Register und Textsorte, Aufbau und Sprache (je 0–5), prüfe jeden eingebauten Ausdruck auf Korrektheit und Natürlichkeit (auch Akzente und Subjuntivo) und schlage 3 konkrete Verbesserungen vor. Antworte auf Deutsch, Beispiele auf Spanisch." + schoolNote(area);
}

// Aufträge für Claude
export const CLAUDE_KINDS = [
  ["nuance", "Bedeutung und Nuance erklären"],
  ["translate", "Deutsche Sätze ins Spanische übersetzen"],
  ["choice", "Auswahl: Was klingt natürlich? (neue Aufgaben)"],
  ["error", "Fehlersuche (neue Aufgaben)"],
  ["rewrite", "Umformulieren (neue Aufgaben)"],
  ["subjuntivo", "Subjuntivo oder Indikativ? (neue Aufgaben)"],
  ["review", "Mini-Review: Ich erkläre, du korrigierst"]
];

export function claudePrompt(kind, cards, area, prefs) {
  const list = cards.map(exprLine).join("\n");
  const v = variantOf(prefs);
  const base = " Variante: " + v + ". Antworte auf Deutsch, Sätze auf Spanisch." + schoolNote(area);
  switch (kind) {
    case "nuance": return "Erkläre mir diese Ausdrücke ausführlich auf C1/C2-Niveau:\n" + list + "\n\nFür jeden Ausdruck: Bedeutung und Konnotation, Register, typische Kollokationen, regionale Unterschiede (Spanien und Lateinamerika, mit Warnung bei vulgären Formen), 2 ähnliche Ausdrücke mit dem Unterschied, 2 Beispielsätze und ein häufiger Fehler deutscher Lernender (falsche Freunde, Präpositionen, Modus)." + base;
    case "translate": return "Schreibe für jeden dieser Ausdrücke einen anspruchsvollen deutschen Satz (Alltag, Beruf oder Diskussion gemischt), den ich ins Spanische übersetze und dabei den Ausdruck verwende:\n" + list + "\n\nGib mir erst nur die deutschen Sätze, nummeriert. Ich antworte mit meinen Übersetzungen, dann korrigierst du sie, nennst die beste Fassung und markierst Fehler bei Kollokationen, Präpositionen, Akzenten und Subjuntivo." + base;
    case "choice": return "Erstelle für diese Ausdrücke je eine Multiple-Choice-Aufgabe (4 Optionen), bei der nur eine Option wie ein Muttersprachler klingt; die anderen sind typische Lernerfehler, aber nie eine gültige Variante:\n" + list + "\n\nStelle die Aufgaben eine nach der anderen, warte auf meine Antwort und erkläre danach, warum die falschen Optionen unnatürlich sind." + base;
    case "error": return "Schreibe zu diesen Ausdrücken je einen Satz, der entweder korrekt ist oder einen Fehler bei dem Ausdruck enthält (falsche Präposition, falsches Verb, falsche Form, falscher Modus):\n" + list + "\n\nIch sage, ob der Satz korrekt ist, und repariere ihn. Danach bewertest du. Stelle die Sätze einzeln." + base;
    case "rewrite": return "Gib mir für jeden dieser Ausdrücke einen schlichten, steifen Satz, den ich mit dem Ausdruck idiomatisch umschreibe:\n" + list + "\n\nStelle sie einzeln, bewerte meine Fassung und zeige eine Musterlösung." + base;
    case "subjuntivo": return "Erstelle Aufgaben zu Subjuntivo und Indikativ, in denen diese Ausdrücke vorkommen (oder ihre Auslöser):\n" + list + "\n\nJede Aufgabe ist ein Satz mit Lücke und dem Infinitiv in Klammern. Ich konjugiere. Danach sagst du, welcher Modus richtig ist und warum, und ob beide Modi möglich sind. Stelle die Aufgaben einzeln." + base;
    default: return "Ich erkläre dir gleich diese Ausdrücke in meinen eigenen Worten:\n" + list + "\n\nKorrigiere meine Erklärungen, ergänze Konnotation und Register und nenne Verwechslungsgefahren." + base;
  }
}
