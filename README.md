# Tesoro de Palabras

Spanisch-Wortschatztrainer für Deutschsprachige, vor allem für das iPhone (als Web-App auf dem Homebildschirm, offline nutzbar).

- Allgemeiner Wortschatz bis C2 und ein eigener Bereich „Schulgespräche“ (Eltern- und Schülergespräche).
- Wiederholung in sechs Stufen bis 60 Tage, neun Übungsarten, Lückentexte, Transfer-Aufgaben, Statistik.
- Variante Spanien oder Lateinamerika (mit Land), Subjuntivo-Karten, Hinweise, Sprachausgabe mit Stimmwahl.
- Eigene Karten anlegen, Karten per Prompt von Claude importieren, Lernstand sichern und wiederherstellen.
- Gestaltung im Azulejo-Stil, alles selbst gezeichnet: keine fremden Bilder, keine fremden Schriften.
- Keine KI im Code und kein API-Schlüssel: Wo Claude helfen soll, erzeugt die App einen Prompt zum Kopieren.

Reines HTML, CSS und JavaScript ohne Build-Schritt und ohne Pakete. Deine Daten bleiben im Gerätespeicher.

## Entwickeln

```bash
node --test              # alle Tests
node scripts/serve.mjs   # lokal ansehen, http://localhost:8123 (im WLAN auch die zweite Adresse, die beim Start steht)
node scripts/stamp-sw.mjs  # nach jeder Änderung an ausgelieferten Dateien: Version im Service Worker erhöhen
```

Die Projektregeln stehen in `CLAUDE.md`, der Bauplan in `UMBAUPLAN.md`, die Abnahme in `ABNAHME.md`.

## Veröffentlichung

Ein Push auf `main` startet die Tests (`.github/workflows/pages.yml`). Nur wenn alle bestehen, wird auf GitHub Pages veröffentlicht.
