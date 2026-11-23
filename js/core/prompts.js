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
