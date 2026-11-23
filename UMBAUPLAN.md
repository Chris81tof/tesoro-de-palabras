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

0. **Projekt, Regeln, Plan, Git** (lokal). Test: keiner nötig; `node --test` läuft leer durch. ✔
1. ✔ **Daten und Kartenformat:** `cards.json` (leer), `beispiel-karten.json` (10 Karten, Beispiel markiert, `x01…`), Prüfer für Karten (`checkCard`). Tests: Pflichtfelder, genau eine Lücke, 3 verschiedene `wrong`, `wrong` nie eine gültige Variante oder Antwort, Subjuntivo-Karten haben `trigger` und Infinitiv in Klammern, `topic` nur bei `schule`, Nomen mit Artikel, keine Eigennamen in Schulkarten, eindeutige IDs.
2. ✔ **Kern:** `srs` (6 Stufen), `state` mit Bereichen und Prefs pro Bereich, `accent` (Vergleich mit/ohne Akzent, `ñ` fest), `variants` (eigene Variante zuerst, „richtig, in deiner Variante“, Vulgär-Warnung), `match` (Stammvergleich, unregelmäßige Verben, ausdrückliche Markierung zuerst), `subjuntivo` (beide Modi richtig, nur falsche Ablenker). Tests für jede Regel.
3. ✔ **Grundgerüst und Navigation:** 5 Reiter, Bereichsumschalter, Gesamtansicht, Tagesplan pro Bereich, Übungen Stufe 1 bis 4 (Bedeutung, Karteikarten, Erklären, Auswahl, Lückentext, Übersetzen, Fehlersuche). Tests: Plan pro Bereich, Beispielkarten außerhalb der Statistik.
   - Umgesetzt: Bereichsumschalter oben (Allgemein, Schulgespräche, Gesamt) mit Einstellungen, Reiter unten, Tagesplan pro Bereich, 7 Übungen, Einstellungen (Variante, Land, Darstellung automatisch/hell/dunkel, Akzente, Beispielkarten entfernen). Sammlung, Statistik und Transfer sind noch Platzhalter (Schritt 6). Geprüft im Browser bei 320, 375 und 844 × 390: kein seitliches Überlaufen, alle Tippflächen mindestens 44 px.
   - **iPhone-Test lokal im WLAN** (`node scripts/serve.mjs` auf allen Adressen): Bedienung, Tippflächen, Umschalter.
4. ✔ **Hinweisstufen:** (bei Subjuntivo-Karten Stufe 1 nur „Auslöser: …“ statt Kategorie, Modus nie) Gerüst, Anfangsbuchstaben, Auswahl aus 4; Auslöser bei Subjuntivo ohne Modus; Hinweis darf Lösung nicht verraten; Wertung (mit Hinweis = bleibt, morgen fällig). Tests wie im Englisch-Trainer plus Subjuntivo.
   - Umgesetzt in Lückentext und Übersetzen (Umformulieren und Texte folgen in Schritt 5). Stufe 3 bei Subjuntivo nutzt nur die falschen Formen der Karte. Beim Übersetzen eines Auslösers steht kein Auslöser im Hinweis (er ist die Lösung). Ein eigener `hint`, der Lösung, Variante oder Wendung verrät, wird von der Kartenprüfung abgelehnt.
5. **Stufe 5:** Umformulieren, Satz schreiben, Texte (nur Karten mit Text), Prompt zum Kopieren, Textimport. Tests: Auswahl, Import, Fundstellen-Markierung.
6. **Transfer, Passiv, Statistik, Sammlung:** Geschichte, Sprechen, Schreiben, Passiv-Durchlauf mit Vorlesen; Statistik pro Bereich und Gesamt; Sammlung mit Werkzeugen oben, Suche, Filter (Bereich, Kategorie, Region, Niveau). Tests: Filter, Nachladen, Statistik.
7. **Karten bearbeiten:** Stift auf jeder Karte, Korrekturen (`fixes`), eigene Karten in beiden Bereichen, Prüfungen beim Speichern (u. a. Variante, `trigger`, Lücke, Hinweis ohne Lösung), „Original wiederherstellen“. Tests.
8. **Kartenimport:** Formular, JSON-Import mit Fehlern **pro Karte** (gültige Karten des Pakets bleiben importierbar), Knopf „Prompt kopieren“ (Prompt beschreibt auch `mode` und `plain`-Regel; Prompt kennt Bereich, Variante, `variants`, `trigger`, `xref`, `unsure`, Regeln für Schulgespräche ohne echte Namen). Tests: Parser, Fehlermeldungen, Dubletten.
9. **Sicherung und Wiederherstellung:** Export/Import `format: 1`, Beispielkarten-Stand, Zwei-Tipp-Sicherheit. Tests: Hin- und Rückweg, beschädigte Dateien, neuere Version.
10. **Sprachausgabe:** `speech` für Spanisch, es-ES/es-MX nach Variante, Premium/Enhanced bevorzugt, Effektstimmen ausschließen, Stimmwahl mit Probe. Tests mit Fake-Stimmen.
11. **Design Azulejo:** Tokens, Kachelrahmen und Fugen, Piktogramme und Illustrationen als eigene SVGs, Dunkelmodus; Kontrastprüfung ≥ 4,5:1 (Test), keine Information nur über Farbe.
12. **Offline und Web-App:** Service Worker mit Präfix und Aufräumen nur eigener Caches, Manifest, Icons. Test: fremde Caches bleiben unberührt; `FILES` passt zu den Dateien.
13. **Inhalte und Abnahme:** Beispieltexte und Aufgaben (Struktur), Prüfung der Beispielkarten durch den Nutzer, Test auf dem iPhone (Homebildschirm, offline), Querformat, 320 px.
14. **Veröffentlichung:** GitHub-Repository, Actions mit Tests, Pages. **Nur nach Rückfrage.**

## Offene Punkte

- Der Nutzer lässt die Beispielkarten vor der Nutzung prüfen.
- Eigene Texte und Aufgaben füllt der Nutzer später per Prompt und Import.
