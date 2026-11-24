# Umbauplan: Tesoro de Palabras

Stand: 23.11.2026. Vorbild: Englisch-Trainer `~/Projekte/word-bank-trainer` (nur lesen). Regeln: `CLAUDE.md`.

## Entscheidungen

| Thema | Entscheidung |
|---|---|
| Sprache | Spanisch lernen, Oberfläche, Erklärungen und Notizen auf Deutsch |
| Inhalt | Allgemeiner Wortschatz bis C2, dazu Falsche Freunde; eigener Bereich Schulgespräche |
| Bereiche | `allgemein` und `schule`, Umschalter oben, dritte Ansicht „Gesamt“ (nur Statistik und Sammlung) |
| Pro Bereich | Tagesplan, Wiederholung, Statistik, Zeitbudget, neue Karten pro Tag |
| Variante | Menü: Spanien oder Lateinamerika, Feinwahl Land bleibt. Eigene Variante zuerst, andere Fassungen als „Auch:“ |
| Subjuntivo | Lücke auf dem konjugierten Verb, Infinitiv in Klammern, Hinweis 1 nur der Auslöser |
| Bedeutung | Auswahl in beide Richtungen, Standard Deutsch → Spanisch (aktiv zuerst), umschaltbar in den Einstellungen. Tagesplan und Lernlogik unverändert |
| Akzente | Ohne Akzent = richtig mit Hinweis; Umschalter „streng“; `ñ` nie weglassen |
| Texte (Stufe 5) | Nur Karten, die in einem Text vorkommen; keine Vollabdeckung nötig |
| Design | Azulejo: Terrakotta, Ocker, Kobaltblau, Kalkweiß; Muster nur als Rahmen/Fugen; Systemschrift; eigene SVGs |
| Sprachausgabe | Beste spanische Stimme passend zur Variante (es-ES/es-MX), Stimmwahl |
| Cache | Präfix `tesoro-de-palabras-`; Aufräumen nur eigener Caches |
| GitHub | Erst am Ende, nur nach Rückfrage |

### Offene Auslegungen (bitte bei der Durchsicht bestätigen)

- **Beispielkarten:** voll übbar, aber mit eigenem Fortschritt, nicht in Statistik/Gesamtansicht, Knopf „Beispielkarten entfernen“ löscht Karten und deren Fortschritt.
- **`unsure` auf Kartenebene** gilt für die Region der Hauptform; bei `variants` hat jede Variante ein eigenes `unsure`.
- **Akzent-Paare** (si/sí, el/él, esta/está, habló/hablo …): umgesetzt. Eine feste Liste in `js/core/accent.js` (`PAIRS`) und die Endung -ó zählen immer als falsch, auch im lockeren Modus. Alle anderen fehlenden Akzente bleiben „richtig mit Hinweis“.
- **`ñ`** gilt als eigener Buchstabe (nicht weglassbar), weil `año`/`ano` verschiedene Wörter sind.

## Dateistruktur

```
index.html, manifest.webmanifest, sw.js
icons/                   eigene Icons (SVG → PNG)
css/                     tokens.css, base.css, components.css, tiles.css (Kachelmuster)
data/                    cards.json, texts.json, tasks.json, levels.json, beispiel-karten.json
js/main.js
js/core/                 dom, dates, state, srs, backup, match, accent, variants, subjuntivo,
                         plan, texts, hints, edit, cards, library, stats, speech, prompts, icons, art
js/views/                today, practice, passive, transfer, stats, library, editor, settings
js/exercises/            meaning, cards, explain, choice, gap, translate, error, rewrite, produce, cloze
tests/                   je Kernmodul, dazu data, sw (Cache-Präfix)
scripts/                 serve.mjs
```

## Datenformat Lernstand (v1)

```json
{
  "app": "tesoro-de-palabras", "format": 1, "exported": "…",
  "progress": { "a001": { "box": 0, "due": 0, "seen": 0, "right": 0, "wrong": 0, "hinted": 0, "first": 0, "last": 0, "ms": {} } },
  "custom": [], "deleted": [], "fixes": {}, "texts": [], "textLog": {}, "drafts": {},
  "examples": { "removed": false, "progress": {} },
  "prefs": { "area": "allgemein", "variant": "es", "country": "", "strictAccents": false,
             "speak": true, "voice": "", "rate": 0.92,
             "budget": { "allgemein": 40, "schule": 20 }, "newPerDay": { "allgemein": 10, "schule": 5 } }
}
```

## Schritte (je ein Commit, je mit Tests)

**Reihenfolge ist verbindlich:** Eigene Karten und Bearbeiten (7), Import mit Prompt-Knopf (8) und Sicherung (9) kommen **vor** Sprachausgabe (10) und Design (11). Ohne sie lassen sich keine echten Karten einspielen und der Lernstand nicht sichern.

0. **Projekt, Regeln, Plan, Git** (lokal). Test: keiner nötig; `node --test` läuft leer durch. ✔
1. ✔ **Daten und Kartenformat:** `cards.json` (leer), `beispiel-karten.json` (10 Karten, Beispiel markiert, `x01…`), Prüfer für Karten (`checkCard`). Tests: Pflichtfelder, genau eine Lücke, 3 verschiedene `wrong`, `wrong` nie eine gültige Variante oder Antwort, Subjuntivo-Karten haben `trigger` und Infinitiv in Klammern, `topic` nur bei `schule`, Nomen mit Artikel, keine Eigennamen in Schulkarten, eindeutige IDs.
2. ✔ **Kern:** `srs` (6 Stufen), `state` mit Bereichen und Prefs pro Bereich, `accent` (Vergleich mit/ohne Akzent, `ñ` fest), `variants` (eigene Variante zuerst, „richtig, in deiner Variante“, Vulgär-Warnung), `match` (Stammvergleich, unregelmäßige Verben, ausdrückliche Markierung zuerst), `subjuntivo` (beide Modi richtig, nur falsche Ablenker). Tests für jede Regel.
3. ✔ **Grundgerüst und Navigation:** 5 Reiter, Bereichsumschalter, Gesamtansicht, Tagesplan pro Bereich, Übungen Stufe 1 bis 4 (Bedeutung, Karteikarten, Erklären, Auswahl, Lückentext, Übersetzen, Fehlersuche). Tests: Plan pro Bereich, Beispielkarten außerhalb der Statistik.
   - Umgesetzt: Bereichsumschalter oben (Allgemein, Schulgespräche, Gesamt) mit Einstellungen, Reiter unten, Tagesplan pro Bereich, 7 Übungen, Einstellungen (Variante, Land, Darstellung automatisch/hell/dunkel, Akzente, Beispielkarten entfernen). Sammlung, Statistik und Transfer sind noch Platzhalter (Schritt 6). Geprüft im Browser bei 320, 375 und 844 × 390: kein seitliches Überlaufen, alle Tippflächen mindestens 44 px.
   - **iPhone-Test lokal im WLAN** (`node scripts/serve.mjs` auf allen Adressen): Bedienung, Tippflächen, Umschalter.
4. ✔ **Hinweisstufen:** (bei Subjuntivo-Karten Stufe 1 nur „Auslöser: …“ statt Kategorie, Modus nie) Gerüst, Anfangsbuchstaben, Auswahl aus 4; Auslöser bei Subjuntivo ohne Modus; Hinweis darf Lösung nicht verraten; Wertung (mit Hinweis = bleibt, morgen fällig). Tests wie im Englisch-Trainer plus Subjuntivo.
   - Umgesetzt in Lückentext und Übersetzen (Umformulieren und Texte folgen in Schritt 5). Stufe 3 bei Subjuntivo nutzt nur die falschen Formen der Karte. Beim Übersetzen eines Auslösers steht kein Auslöser im Hinweis (er ist die Lösung). Ein eigener `hint`, der Lösung, Variante oder Wendung verrät, wird von der Kartenprüfung abgelehnt.
5. ✔ **Stufe 5:** Umformulieren, Satz schreiben, Texte (nur Karten mit Text), Prompt zum Kopieren, Textimport. Tests: Auswahl, Import, Fundstellen-Markierung.
   - Umgesetzt: Umformulieren (mit Hinweisen), Satz schreiben (Prompt zum Kopieren, Bereichs-Beispiele), Texte (Vorschläge nach Lernstand und Region, Wortbank, Hinweise je Lücke, Import mit Fehlern pro Text). Texte tragen `area` und optional `region`; zwei Beispieltexte (`xt1`, `xt2`) gehören zu den Beispielkarten und verschwinden mit ihnen. Stufe 5 gibt es nur für Karten, die in einem Text vorkommen.
6. ✔ **Transfer, Passiv, Statistik, Sammlung:** Geschichte, Sprechen, Schreiben, Passiv-Durchlauf mit Vorlesen; Statistik pro Bereich und Gesamt; Sammlung mit Werkzeugen oben, Suche, Filter (Bereich, Kategorie, Region, Niveau). Tests: Filter, Nachladen, Statistik.
   - Umgesetzt: Transfer (Geschichte, Sprechen mit Timer, Schreiben, Aufträge für Claude; 3 + 3 Aufgaben je Bereich in `data/tasks.json`), Passiv-Durchlauf ohne Wertung (Vorlesen folgt in Schritt 10, die Vorlesetexte stehen schon in `speech.js`), Statistik pro Bereich und gesamt mit Bereichsvergleich, Sammlung mit Werkzeugen oben, angepinnter Suche, Filtern (Bereich, Kategorie, Lernstand, Region mit Varianten/unsicher/vulgär, Niveau), Auswahlmodus und Nachladen. Beispielkarten zählen nicht in die Statistik. Die Werkzeuge „Eigene Karte“, „Neue Karten von Claude“ und „Sichern“ sind Platzhalter für Schritt 7 bis 9; „Zurücksetzen“ funktioniert.
7. ✔ **Karten bearbeiten:** Stift auf jeder Karte, Korrekturen (`fixes`), eigene Karten in beiden Bereichen, Prüfungen beim Speichern (u. a. Variante, `trigger`, Lücke, Hinweis ohne Lösung), „Original wiederherstellen“. Tests.
   - Umgesetzt: Formular für alle Felder (Bereich, Kategorie, Thema, Wendung, alt, Bedeutung, Erklärung, Satz, Lösung, 3 falsche Optionen, schlichte Fassung, Auslöser und Modus, Register, Region, unsicher, Varianten als Zeilen, Querverweise, Hinweis, Niveau). Jede Speicherung läuft durch dieselbe `cardErrors`-Prüfung wie später der Import, Fehler stehen als Liste da und nichts wird gespeichert. Stift auf jeder Karte in allen Übungen und im Passiv-Durchlauf (nichts wird verbucht, die Karte kommt korrigiert wieder), „Bearbeiten“ und „Neue Karte anlegen“ in der Sammlung. Startkarten: Korrektur pro ID in `fixes`, die Datei bleibt; eigene Karten (`u01 …`): direkt. Beispielkarten sind nicht bearbeitbar. Beim Test bei 320 px gefundene Überläufe in Bereichsleiste (kurzer Name „Schule“) und Einstellungen behoben.
8. ✔ **Kartenimport:** Formular, JSON-Import mit Fehlern **pro Karte** (gültige Karten des Pakets bleiben importierbar), Knopf „Prompt kopieren“ (Prompt beschreibt auch `mode` und `plain`-Regel; Prompt kennt Bereich, Variante, `variants`, `trigger`, `xref`, `unsure`, Regeln für Schulgespräche ohne echte Namen). Tests: Parser, Fehlermeldungen, Dubletten.
   - Umgesetzt (`js/core/import.js`, Werkzeug „Neue Karten von Claude“ in der Sammlung): Prompt-Knopf mit Bereich, Kategorie, Thema, Anzahl oder eigenen Wendungen; der Prompt beschreibt alle Felder (auch `mode`, `plain`-Regel, Varianten mit `vulgar`, Hinweis ohne Modus) und enthält ein Beispiel, das selbst als gültige Karte getestet wird. Import: jede Karte durch dieselbe Prüfung wie im Formular, Fehler **pro Karte** mit allen Meldungen, gültige Karten werden übernommen, Dubletten (gleiche Wendung im selben Bereich) übersprungen, `id` von Claude ignoriert, Bereichs-Widerspruch als Fehler. Knopf „Fehlerliste für Claude kopieren“ erzeugt einen Prompt, der nur die abgelehnten Karten korrigieren lässt. Beispielkarten zählen bei der Dublettenprüfung nicht.
9. ✔ **Sicherung und Wiederherstellung:** Export/Import `format: 1`, Beispielkarten-Stand, Zwei-Tipp-Sicherheit. Tests: Hin- und Rückweg, beschädigte Dateien, neuere Version.
   - Umgesetzt (`js/core/backup.js`, Werkzeug „Sichern und Wiederherstellen“ in der Sammlung): Sicherung als Datei herunterladen, über das Teilen-Menü in Dateien sichern oder als Text kopieren; Zeitpunkt steht in der Datei, Erinnerung auf „Heute“ nach 7 Tagen (nur wenn es etwas zu sichern gibt). Wiederherstellen aus Datei oder eingefügtem Text: erst prüfen und beide Stände nebeneinander zeigen, dann Zwei-Tipp-Bestätigung; der alte Stand wird vorher unter `tesoro-de-palabras-v1-vorher` zur Seite gelegt und lässt sich rückgängig machen. Meldungen für kaputte Dateien, den Englisch-Trainer und neuere Versionen; beschädigte Teile werden bereinigt, ungültige eigene Karten gemeldet und nicht übernommen. Der Beispielkarten-Stand (entfernt oder mit Fortschritt) gehört zur Sicherung. IDs wie `__proto__` werden abgewiesen.
10. ✔ **Sprachausgabe:** `speech` für Spanisch, es-ES/es-MX nach Variante, Premium/Enhanced bevorzugt, Effektstimmen ausschließen, Stimmwahl mit Probe. Tests mit Fake-Stimmen.
   - Umgesetzt (`js/core/speech.js`): Spanien → es-ES, Lateinamerika → es-MX, mit Land das Land (Fallback es-MX). Reihenfolge: Spaßstimmen zuletzt, dann die Aussprache der Variante (ceceo gegen seseo, vor der Qualität), darin die genaue Sprache, dann Premium/Erweitert/Mejorada vor normal, dann bekannte gute Stimmen. Stimmenwahl je Variante (`prefs.voices.es`/`.latam`) mit Probe, Tempo, Hinweis zum Laden besserer Stimmen auf dem iPhone. Vorlesen in den Übungen nur nach der Antwort, wenn sonst die Lösung verraten würde (`speechPlan`), mit Lautsprecher-Schalter und „Anhören“; im Passiv-Durchlauf. Der Infinitiv in Klammern bei Subjuntivo wird nicht mitgesprochen. Geprüft mit den echten macOS-Stimmen im Browser.
11. ✔ **Design Azulejo:** Tokens, Kachelrahmen und Fugen, Piktogramme und Illustrationen als eigene SVGs, Dunkelmodus; Kontrastprüfung ≥ 4,5:1 (Test), keine Information nur über Farbe.
   - Umgesetzt: `css/tiles.css` (Fries aus Rautengitter mit Ocker-Punkt unter der Kopfzeile, über den Reitern und unter Überschriften; Karten als Kachel mit Kobaltrahmen, Ocker-Zierstreifen und Terrakotta-Eckpunkten; Fugen; glasierte Knöpfe), alles aus CSS-Verläufen mit den Farben aus `tokens.css`, also ohne Bilddateien und in Hell und Dunkel gleich. Eigene Zeichnungen in `js/core/art.js` (Stern, Sonne, Buch). Kontrast ≥ 4,5:1 für Text und ≥ 3:1 für Ränder, in Hell und beiden Dunkel-Blöcken (`tests/contrast.test.mjs`, rechnet nach WCAG). Tests stellen sicher, dass Muster nur an den vorgesehenen Stellen stehen und der Innenabstand die Eckpunkte frei lässt, dass nichts von außen geladen wird und dass Richtig/Falsch, Auswahl, Lernstand und Unsicheres immer auch durch Zeichen oder Wort angezeigt werden. Geprüft bei 320, 390 und 844 × 390, hell und dunkel.
12. ✔ **Offline und Web-App:** Service Worker mit Präfix und Aufräumen nur eigener Caches, Manifest, Icons. Test: fremde Caches bleiben unberührt; `FILES` passt zu den Dateien.
   - Umgesetzt: `sw.js` mit Präfix `tesoro-de-palabras-`, Fingerabdruck der Dateien und `scripts/stamp-sw.mjs` (erhöht VERSION automatisch; Test schlägt sonst fehl), Manifest „Tesoro de Palabras“, Icons aus eigener Rastergrafik (`scripts/make-icons.mjs`, Kachel mit achtzackigem Stern, maskierbare Fassung), Anmeldung des Service Workers mit Hinweis „Neue Version geladen“. Der Service Worker wird in einer Testumgebung ausgeführt: Installieren, Aufräumen (fremde Caches und die des Englisch-Trainers bleiben), Abrufen aus dem Cache, Offline-Rückfall auf die Startseite. Im eingebauten Browser lässt sich ein Service Worker nicht registrieren; der echte Offline-Test braucht https oder `localhost` im Safari/Chrome.
13. **Inhalte und Abnahme:** Beispieltexte und Aufgaben (Struktur), Prüfung der Beispielkarten durch den Nutzer, Test auf dem iPhone (Homebildschirm, offline), Querformat, 320 px.
14. **Veröffentlichung:** GitHub-Repository, Actions mit Tests, Pages. **Nur nach Rückfrage.**

## Offene Punkte

- Der Nutzer lässt die Beispielkarten vor der Nutzung prüfen.
- Eigene Texte und Aufgaben füllt der Nutzer später per Prompt und Import.
