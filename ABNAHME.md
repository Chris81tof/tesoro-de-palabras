# Abnahme: Tesoro de Palabras

Stand: 24.11.2026. Diese Datei hat drei Teile: was verlangt war und wo es steht, was du auf dem iPhone prüfst, und was bekannt offen ist.

## 1. Was verlangt war und wo es steht

### Was gleich bleibt (wie im Englisch-Trainer)

| Anforderung | Wo | Beleg |
|---|---|---|
| Alle Übungsformen und Stufen | `js/exercises/`, `js/views/cloze.js`, `js/core/modes.js` | Bedeutung, Karteikarten, Erklären, Auswahl, Lückentext, Übersetzen, Fehlersuche, Umformulieren, Satz schreiben, Texte; `tests/plan.test.mjs`, `tests/texts.test.mjs`, Abnahmelauf |
| Wiederholung, 6 Stufen bis 60 Tage | `js/core/srs.js` | `tests/srs.test.mjs` (Abstände 1, 3, 7, 14, 30, 60; Mastered ab Stufe 4; Obergrenzen je Übung) |
| Passiv-Modus | `js/views/passive.js` | liest vor, verändert den Lernstand nicht |
| Transfer | `js/views/transfer.js`, `data/tasks.json` | Geschichte, Sprechen mit Timer, Schreiben, Aufträge für Claude; `tests/tasks.test.mjs` |
| Statistik | `js/views/stats.js`, `js/core/stats.js` | pro Bereich und gesamt; `tests/stats.test.mjs` |
| Sammlung mit Werkzeugen oben | `js/views/library.js`, `js/core/library.js` | Suche, Filter, Auswahlmodus, Nachladen; `tests/library.test.mjs` |
| Karten bearbeiten | `js/views/editor.js`, `js/core/edit.js` | `tests/edit.test.mjs` (Rundreise Formular ↔ Karte für jede Beispielkarte) |
| Gestufte Hinweise | `js/core/hints.js` | `tests/hints.test.mjs` (Gerüst, Anfangsbuchstaben, Auswahl; Hinweis verrät nie die Lösung) |
| Sprachausgabe mit Stimmwahl | `js/core/speech.js` | `tests/speech.test.mjs` |
| Sicherung und Wiederherstellung | `js/core/backup.js` | `tests/backup.test.mjs` |
| Import neuer Karten per Formular und per JSON | `js/core/import.js`, Formular in der Sammlung | `tests/import.test.mjs` |
| Offline nutzbar | `sw.js` | `tests/sw.test.mjs` (Service Worker wird in einer Testumgebung ausgeführt) |
| Web-App auf dem Homebildschirm | `manifest.webmanifest`, `icons/` | `tests/icons-files.test.mjs`, `tests/sw.test.mjs` |
| Tests vor jedem Commit | `node --test` | 256 Tests; jeder Schritt ist mit grünen Tests committet |

### Was anders ist (die acht Punkte aus dem Auftrag)

| Nr. | Anforderung | Wo | Beleg |
|---|---|---|---|
| 1 | Spanisch, Oberfläche und Erklärungen auf Deutsch | alle Ansichten | Abnahmelauf |
| 2 | Inhalt bis C2 (Kollokationen, Verb + Präposition, Subjuntivo-Auslöser, feste Wendungen, Wortbildung, Idiome, Konnektoren, falsche Freunde) | `CATS` in `js/core/cards.js`, Niveau A1 bis C2 | `tests/cards.test.mjs` |
| 3 | Zwei getrennte Bereiche, Statistik und Wiederholung pro Bereich, Gesamtansicht | Bereichsumschalter oben, `prefs.area`, Plan und Budget pro Bereich | `tests/plan.test.mjs`, `tests/stats.test.mjs`, `tests/state.test.mjs` |
| 4 | Variante Spanien oder Lateinamerika, Regionskennzeichen, Varianten mit Beispielen, eigene Variante zuerst, Unsicheres mit ? | `js/core/variants.js` | `tests/variants.test.mjs`, `tests/grade.test.mjs`, `tests/meaning.test.mjs` |
| 5 | Subjuntivo: Lücke auf dem konjugierten Verb, Hinweis nennt den Auslöser | `js/core/subjuntivo.js`, `js/core/hints.js` | `tests/subjuntivo.test.mjs`, `tests/hints.test.mjs` |
| 6 | Eigener Stil (Azulejo), keine fremden Bilder oder Schriften, Piktogramme als eigene SVGs | `css/tiles.css`, `js/core/art.js`, `js/core/icons.js`, `scripts/make-icons.mjs` | `tests/design.test.mjs`, `tests/contrast.test.mjs` |
| 7 | Beste spanische Stimme passend zur Variante (es-ES / es-MX), Stimmwahl | `js/core/speech.js` | `tests/speech.test.mjs` |
| 8 | Kartenformat mit `region`, `variants`, `trigger` (dazu `area`, `mode`, `topic`, `xref`, `unsure`) | `js/core/cards.js`, `CLAUDE.md` | `tests/cards.test.mjs`, `tests/data.test.mjs` |

### Deine späteren Festlegungen

| Festlegung | Wo | Beleg |
|---|---|---|
| Kein Register `h`; `f` gilt auch für höflich und Amtssprache | `REG` | `tests/cards.test.mjs` |
| `plain` darf Wendung und Auslöser nicht enthalten, Lösungswörter erst ab 4 Buchstaben | `cardErrors` | `tests/cards.test.mjs` |
| `mode` Pflicht bei Subjuntivo, Hinweise nennen den Modus nie | `cards.js`, `hints.js` | `tests/cards.test.mjs`, `tests/hints.test.mjs` |
| Stufe 5 nur für Karten in einem Text | `js/core/modes.js`, `js/core/texts.js` | `tests/texts.test.mjs` |
| Fundstelle im Text mit `[[id:Text]]` hat Vorrang | `js/core/match.js` | `tests/match.test.mjs`, `tests/texts.test.mjs` |
| Andere Fassungen richtig mit „in deiner Variante“, Warnung bei vulgären Formen, Ablenker nie eine gültige Variante | `variants.js`, `grade.js`, `cards.js` | `tests/variants.test.mjs`, `tests/choice.test.mjs` |
| Akzent fehlt: richtig mit Hinweis, Schalter „streng“, Paare mit Bedeutungsunterschied immer falsch, `ñ` nie weglassen | `js/core/accent.js` | `tests/accent.test.mjs` |
| Bedeutung Deutsch → Spanisch (Lücke nur dort), umschaltbar | `js/core/meaning.js` | `tests/meaning.test.mjs`, `tests/meaning-view.test.mjs` |
| Eigenes Cache-Präfix, Aufräumen nur eigener Caches | `sw.js` | `tests/sw.test.mjs` |
| Schulgespräche ohne echte Namen oder Fälle | `properNames` in `cards.js`, Prompts | `tests/cards.test.mjs`, `tests/import.test.mjs`, `tests/tasks.test.mjs` |
| Import: Fehler pro Karte, gültige Karten werden übernommen | `js/core/import.js` | `tests/import.test.mjs` |
| Beispielkarten klar markiert, ohne Einfluss auf Statistik, mit Knopf entfernbar | `data/beispiel-karten.json`, Einstellungen | `tests/state.test.mjs`, `tests/stats.test.mjs`, `tests/backup.test.mjs` |
| Darstellung hell, dunkel oder automatisch | Einstellungen | `tests/theme.test.mjs` |

### Abnahmelauf im Browser

`scripts/audit.js` geht durch alle Ansichten, alle neun Übungen, Texte, Passiv, Transfer, Statistik, Sammlung (Werkzeuge, Auswahl, Details, Editor) und die Gesamtansicht und meldet:
seitliches Überlaufen, Tippflächen unter 44 px, Eingabefelder ohne Beschriftung, Knöpfe ohne Namen, doppelte IDs, Zeichnungen ohne `aria-hidden` und zu geringen Kontrast der tatsächlich gezeichneten Farben (4,5:1, bei großer Schrift 3:1).

Letzter Lauf: **keine Befunde** bei 320 × 640 (hell und dunkel), 390 × 844 (hell) und 844 × 390 (dunkel). Beim ersten Lauf fiel auf, dass die Kopfzeile der Übungen bei 320 px zu breit war; das ist behoben.

## 2. Das prüfst du auf dem iPhone

Die veröffentlichte App: https://chris81tof.github.io/tesoro-de-palabras/ (hier geht Offline). Der Entwicklungsserver (`node scripts/serve.mjs`, nur im selben WLAN, ohne Offline) zeigt Änderungen, bevor sie veröffentlicht sind.

1. **Beispielkarten gegenlesen:** `Beispiele-zum-Pruefen.md` (Spanisch, Regionsangaben, vulgäre Formen, Ablenker). Fehler direkt in `data/beispiel-karten.json` oder `data/texts.json` melden oder ändern.
2. **Homebildschirm:** Safari › Teilen › „Zum Home-Bildschirm“. Das Symbol zeigt die Kachel mit dem Stern, die App öffnet ohne Safari-Leiste.
3. **Bedienung:** Bereichsumschalter oben, fünf Reiter unten. Alles mit dem Daumen erreichbar? Tippflächen groß genug?
4. **Eine Runde je Übungsart** im Bereich Allgemein und im Bereich Schulgespräche. Sieht die Lücke bei Subjuntivo richtig aus (Infinitiv in Klammern)? Kommt „richtig, in deiner Variante“ an der richtigen Stelle?
5. **Variante wechseln** (Einstellungen): Spanien ↔ Lateinamerika mit Land Mexiko. Wechseln Wendungen, Auswahl und Warnung (coger)?
6. **Akzente:** Eine Lückenantwort ohne Akzent tippen (decision statt decisión): richtig mit Hinweis? Dann „streng“ einschalten.
7. **Sprachausgabe:** Einstellungen › Sprachausgabe. Klingt die automatische Stimme gut? Probe je Variante. Bessere Stimmen laden (Hinweis in der App), App neu öffnen.
8. **Eigene Karte anlegen** und **Stift** in einer Übung. Fehlermeldungen im Formular lesbar?
9. **Import:** Prompt kopieren, in Claude einfügen, Antwort zurückkopieren. Werden Fehler pro Karte gezeigt, und die gültigen Karten übernommen?
10. **Sicherung:** „Teilen oder in Dateien sichern“ nutzen, Datei in „Dateien“ ansehen, danach „Wiederherstellen“ mit dieser Datei und „Rückgängig“.
11. **Querformat** und kleine Anzeige (iPhone SE): nichts abgeschnitten, nichts läuft seitlich über?
12. **Offline:** Die App unter https://chris81tof.github.io/tesoro-de-palabras/ in Safari öffnen, einmal kurz warten, dann „Zum Home-Bildschirm“. Flugmodus an, App vom Homebildschirm öffnen, eine Übung machen. Danach Flugmodus aus.

## 3. Bekannte Grenzen und offene Punkte

- **Veröffentlicht** unter https://chris81tof.github.io/tesoro-de-palabras/. Im Browser unter https geprüft: Der Service Worker registriert sich, 65 Dateien liegen im Cache, beim zweiten Besuch kommen 55 Ressourcen vom Service Worker. **Offline im Flugmodus auf dem iPhone ist noch nicht ausprobiert** (Punkt 12 der Checkliste), ebenso die Aktualisierung nach einer neuen Version.
- **Nicht im Browser geprüft:** Herunterladen und Teilen einer Sicherung, das tatsächliche Anhören der Stimmen, das Homebildschirm-Symbol.
- **Es gibt noch keine echten Karten.** `data/cards.json` ist leer, es gibt nur die zehn Beispielkarten. Echte Karten kommen über Formular oder Import in deinen Gerätespeicher. Auf Wunsch übernimmt Claude Code sie später fest in `data/cards.json` (nur auf Anweisung).
- **Stufe 5 braucht Texte:** Umformulieren, Satz schreiben und Texte gibt es nur für Karten, die in einem Text vorkommen. Neue Texte holst du per Prompt bei Claude (Üben › Texte).
- **Wendungserkennung ist ein Stammvergleich** mit Regeln und 17 unregelmäßigen Verben, kein Wörterbuch. Im Zweifel erkennt sie nichts; mit `[[id:Text]]` lässt sich die Fundstelle festlegen. „Se dio cuenta“ ohne „de“ findet „darse cuenta de“ bewusst nicht.
- **Ablenker bei Karten ohne `wrong`** kommen aus anderen Karten derselben Kategorie und könnten im Einzelfall gültig sein. Bei Karten mit `wrong` passiert das nicht; die Kartenprüfung verlangt dort drei falsche Optionen, die keine gültige Lösung oder Variante sind.
- **Hinweise** gibt es in Lückentext, Übersetzen, Umformulieren und in den Texten, nicht in der Fehlersuche (wie im Englisch-Trainer).
- **Akzent-Paare:** Die feste Liste (`PAIRS` in `js/core/accent.js`) deckt häufige Fälle ab. Wörter auf -ó zählen ebenfalls; Nomen auf -ó ohne Bedeutungspaar werden dadurch im lockeren Modus streng gewertet.
- **Beispielinhalte stammen von mir** (Claude). Zwei Fehler habe ich beim Gegenlesen selbst gefunden und behoben (im Beispieltext Schulgespräche stand „justifique“ statt „justifiquen“, im Beispieltext Allgemein ein zweites Verb im Subjuntivo, das zu „viene“ und „vendrá“ nicht passte). Es können weitere stecken, darum die Liste zum Gegenlesen.
- **Wortbildung, Idiome, Konnektoren** haben noch keine Beispielkarte; das Format trägt sie, die Kategorien sind da.
