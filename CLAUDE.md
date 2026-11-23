# Tesoro de Palabras – Projektregeln

Spanisch-Wortschatztrainer für Deutschsprachige, allgemeiner Wortschatz nach oben offen bis C2 (Kollokationen, Verb + Präposition, Subjuntivo-Auslöser, feste Wendungen, Wortbildung, Idiome, Konnektoren, falsche Freunde) und ein eigener Bereich „Schulgespräche“. Läuft als Web-App, vor allem auf dem iPhone (Home-Bildschirm, offline).

Vorbild ist der Englisch-Trainer in `~/Projekte/word-bank-trainer`. Er dient nur als Quelle und wird **nie verändert**. Code wird von dort übernommen und angepasst, nicht verlinkt.

Der Umbauplan steht in `UMBAUPLAN.md`.

## Zusammenarbeit

- Antworten und Erklärungen auf Deutsch. Der Nutzer lernt Claude Code: Jeden Schritt kurz erklären (was und warum), ohne lange Vorträge.
- In kleinen Schritten arbeiten, ein Commit pro Schritt, deutsche Commit-Nachricht („Schritt 3: Übungen Stufe 1 bis 4“). Tests laufen vor jedem Commit.
- Vor dem ersten Push, dem Anlegen des GitHub-Repositorys und jeder Veröffentlichung ausdrücklich nachfragen. Git bleibt bis dahin lokal.
- Rückfragen gebündelt stellen, mit Vorschlag.

## Technik

- Kein Build-Schritt, keine Laufzeit-Abhängigkeiten: reines HTML, CSS und JavaScript als ES-Module. Node nur für `node --test`.
- **Keine KI im Code:** kein API-Schlüssel, kein `window.claude`. Wo Claude helfen soll, erzeugt die App einen Prompt zum Kopieren; die Antwort fügt der Nutzer wieder ein.
- **Keine fremden Ressourcen:** kein Bild, keine Schrift, kein Symbol aus fremder Quelle. Systemschrift. Piktogramme und Kachelmuster sind eigene SVGs. Nichts wird von außen geladen.
- Daten getrennt vom Code in `data/`: Karten, Texte, Aufgaben, Niveaus, Beispielkarten.
- Karten-IDs ändern sich nie und werden nie wiederverwendet, denn der Lernstand hängt daran.
- Lernstand im `localStorage` unter `tesoro-de-palabras-v1`; Sicherung `app: "tesoro-de-palabras"`, `format: 1`. Kein Import aus dem Englisch-Trainer.
- **Service Worker:** Cache-Präfix `tesoro-de-palabras-`. Beide Apps liegen auf derselben Domain; der Aufräumcode löscht **nur** Caches mit diesem Präfix (Test dafür). Bei jeder Änderung an ausgelieferten Dateien `VERSION` erhöhen, neue Dateien in `FILES` eintragen (ein Test prüft das). Auf `localhost` wird der Service Worker nur mit `?sw` registriert.
- Ansichten nur zeichnen lassen: testbare Logik gehört in `js/core/`. Tippflächen mindestens 44 px (`--tap`); neue Bereiche bei 320, 390 und 844 × 390 prüfen.
- Gestaltung: Azulejo-Look (Terrakotta, Ocker, Kobaltblau, Kalkweiß). Muster nur als Rahmen und Fugen, nie hinter Text. Textkontrast mindestens 4,5:1 in Hell und Dunkel. **Keine Information nur über Farbe** (immer auch Symbol oder Text).

## Bereiche

- Zwei getrennte Bereiche: `allgemein` und `schule` (Schulgespräche). Jede Karte hat `area`.
- Tagesplan, Wiederholung, Statistik, Zeitbudget und neue Karten pro Tag gelten **pro Bereich**. Die Gesamtansicht zeigt nur Statistik und Sammlung, keinen Tagesplan.
- In beiden Bereichen lassen sich Karten selbst hinzufügen und bearbeiten.
- **Schulgespräche enthalten nie echte Namen oder Fälle.** Nur erfundene, allgemeine Situationen („la madre“, „el alumno“). Ein Datentest prüft, soweit möglich, auf Eigennamen.

## Kartenformat

Pflicht: `id`, `area`, `cat`, `term`, `de`, `sentence` mit genau einer Lücke `____`, `answer`; `trigger` und `mode` bei Subjuntivo; `topic` bei Schulgesprächen.
Optional: `prompt` (spanische Erklärung), `wrong` (genau 3), `plain`, `reg`, `region`, `variants`, `xref`, `unsure`, `note`, `hint`, `alt`.
- `plain` (schlichte Fassung für „Umformulieren“) darf `term` und `trigger` nicht als Ganzes enthalten und kein Lösungswort ab 4 Buchstaben. Kürzere Lösungen (de, en, a …) zählen nicht, sonst fiele fast jede Verb + Präposition-Karte durch.

- `cat`: Kollokation, Verb + Präposition, Subjuntivo-Auslöser, Feste Wendung, Wortbildung, Idiom, Konnektor, Falscher Freund, Sonstiges.
- `term`: Grundform; **Nomen mit Artikel** („el ordenador“).
- `answer`: mehrere richtige Antworten mit `|`.
- `reg`: `i` informal, `f` formal (gilt auch für höflich/Amtssprache), `n` neutral, `d` veraltet, `c` umgangssprachlich, `s` Slang. Kein weiteres Kürzel.
- `region`: `es`, `latam` oder ein Land (`mx`, `ar`, `cr` …). Fehlt es, gilt die Wendung überall.
- `variants`: Liste `{ region, term, example, unsure? }`; Fassungen für andere Länder mit Beispiel. Die App zeigt zuerst die Fassung der gewählten Variante.
- Eine Variante kann `vulgar: true` tragen: Diese Form ist in der Region vulgär. Dann ist kein Beispiel nötig. Die App warnt, wenn sie eingegeben wird, und zeigt sie nicht unter „Auch:“.
- `unsure`: Kartenebene, bezieht sich auf die Region der Hauptform. Auf einer Variante steht `unsure` an der Variante. Unsicheres zeigt die App mit „?“ **und** dem Wort „unsicher“.
- `trigger`: Auslöser bei Subjuntivo-Karten, z. B. „es posible que“.
- `mode`: `subj`, `ind` oder `both`; **Pflicht bei Kategorie „Subjuntivo-Auslöser“**. Bei `both` stehen beide Formen in `answer`. Hinweisstufen nennen den Modus nie (auch ein eigener `hint` nicht, ein Test prüft das), beim Aufdecken der Lösung wird er angezeigt. Bei Subjuntivo-Karten zeigt Hinweisstufe 1 statt der Kategorie nur „Auslöser: …“, denn die Kategorie „Subjuntivo-Auslöser“ würde den Modus verraten.
- `topic`: nur Schulgespräche (z. B. Elternsprechtag, Fehlzeiten, Ordnungsmaßnahmen).
- `xref`: optional, Querverweise und falsche Freunde zu IT/FR/PT/DE/EN.
- Eigene Karten: IDs `u01 …`; Beispielkarten: `x01 …`.

## Spanisch-Regeln

- **Variante** (Einstellung im Menü): Spanien (es-ES) oder Lateinamerika (es-MX), mit Feinwahl des Landes. Karten mit Unterschieden zeigen zuerst die eigene Variante.
- Andere Fassungen gelten als richtig; die App meldet „richtig, in deiner Variante: …“. Ist eine Form in einer Region vulgär, steht eine Warnung. **Ablenker in `wrong` sind nie eine gültige Variante** (Test).
- **Akzente:** Eingabe ohne Akzent (`esta` statt `está`) zählt als richtig *mit Hinweis* (Stufe bleibt, morgen wieder fällig, siehe Hinweislogik). Umschalter „streng“ in den Einstellungen. `ñ` ist ein eigener Buchstabe und wird nie weggelassen (`año` ≠ `ano`). Umgekehrt/Interpunktion (¿ ¡) ist egal.
- **Subjuntivo:** Die Lücke darf auf das konjugierte Verb fallen; der Infinitiv steht in Klammern hinter der Lücke („____ (venir)“). Hinweisstufe 1 nennt nur den Auslöser, **nicht den Modus**; der Modus erscheint erst mit der Lösung. Bei `mode: both` sind beide Formen richtig. Ablenker sind nur wirklich falsche Formen.
- **Erkennen von Wendungen im Text:** Stammvergleich mit kleinem Regelsatz und Liste unregelmäßiger Verben. Bei Unsicherheit nicht erkennen statt falsch erkennen. Eine ausdrückliche Markierung der Fundstelle im Text hat Vorrang: `[[kartenId:Text]]`.
- Sprachausgabe: automatisch die beste spanische Stimme passend zur Variante (es-ES / es-MX), dann übrige spanische Stimmen, freie Stimmwahl.

## Lernlogik (nicht ohne Rückfrage ändern)

- 6 Stufen: `INTERVALS = [0, 1, 3, 7, 14, 30, 60]` Tage. Ab Stufe 4 „Mastered“.
- Obergrenzen: Bedeutung und Auswahl höchstens Stufe 1; Karteikarten und Erklären höchstens Stufe 2; alle anderen bis Stufe 6.
- Richtig an der Grenze der Übung: wieder fällig nach dem Abstand der aktuellen Stufe.
- Fehler: zurück auf Stufe 0, heute wieder fällig; bei Bedeutung und Auswahl nur eine Stufe zurück.
- Nur aktive Übungen verändern den Lernstand, der Passiv-Durchlauf nicht.
- Gestufte Hinweise: Stufe 1 Kategorie, Gerüst und (bei Subjuntivo) Auslöser; Stufe 2 Anfangsbuchstaben; Stufe 3 Auswahl aus 4; dann „Lösung zeigen“ (gilt als falsch). Richtig mit Hinweis (auch fehlender Akzent): Stufe bleibt, morgen wieder fällig, Zähler `hinted`.
- **Import:** Fehler werden pro Karte angezeigt; gültige Karten eines Pakets bleiben importierbar, auch wenn andere Karten Fehler haben.
- **Akzent-Paare mit Bedeutungsunterschied** (si/sí, el/él, esta/está, habló/hablo …) zählen immer als falsch, auch im lockeren Modus. Die Liste steht in `js/core/accent.js` (`PAIRS`); neue Paare dort eintragen und testen.
- Beispielkarten (`x…`) liegen in `data/beispiel-karten.json`, sind klar als „Beispiel“ markiert, haben einen eigenen Fortschrittsbereich, zählen nicht in Lernstand, Tagesplan-Statistik und Gesamtansicht und lassen sich mit einem Knopf samt ihrem Fortschritt entfernen.

## Tests

- `node --test` startet alle Tests in `tests/`, ohne Pakete.
- Lokal ansehen: `node scripts/serve.mjs` (Port 8123; für den iPhone-Test im WLAN auf alle Adressen lauschen).
- Datentests prüfen die Kartenregeln dieser Datei, auch für Beispielkarten. Der Test „jede Karte steht in einem Text“ gilt hier **nicht**; Stufe 5 nutzt nur Karten, die in einem Text vorkommen.
- GitHub Actions führt die Tests erst nach dem Anlegen des Repositorys aus (Schritt am Ende, nach Rückfrage).
