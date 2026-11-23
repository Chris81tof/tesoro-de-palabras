// Prompt-Texte zum Kopieren für Claude. Deutsch, passend zu Spanisch als Lernsprache.

export function explainPrompt(c, text) {
  return "Du bist ein freundlicher, aber genauer Spanischlehrer. Eine Person (Muttersprache Deutsch) übt den Ausdruck unten und hat versucht, ihn zu erklären. " +
    "Prüfe die Erklärung auf Bedeutung, Register, Nuance und den Unterschied zu ähnlichen Ausdrücken. Antworte auf Deutsch, Beispiele auf Spanisch. Kein Markdown, nur einfacher Text.\n\n" +
    "Ausdruck: " + c.term + "\n" + (c.de ? "Bedeutung (Deutsch): " + c.de + "\n" : "") + (c.prompt ? "Spanische Erklärung: " + c.prompt + "\n" : "") +
    (c.note ? "Hinweise zur Karte: " + c.note + "\n" : "") +
    "\nErklärung der Person:\n" + (text.trim() || "(leer)") +
    "\n\nGib aus: 1. Urteil (richtig / teilweise / falsch), 2. was fehlt oder falsch ist, 3. eine bessere Erklärung in zwei Sätzen. Wenn du dir bei Register oder regionalem Gebrauch (Spanien oder Lateinamerika) nicht sicher bist, sag es. Erfinde nichts.";
}
