# Lift Lab

Trainings-App als PWA (Deutsch und Englisch, nur lokal) mit regelbasierter Progression. Du bekommst einen Trainingsplan, loggst deine Sätze, und die App schlägt dir beim nächsten Mal Gewicht und Wiederholungen vor, mit Begründung. Alle Daten bleiben auf deinem Gerät, es gibt kein Backend und keine Konten.

<p align="center"><img src="public/icon-512.png" alt="Lift Lab Icon" width="120"></p>

**App:** https://antoniotroiano.github.io/fitness-app/

## Funktionen

- **Planerstellung:** Wizard (Ziel, Split, Tage, Erfahrung, Fokus-Muskeln, Blocklänge, Deload) erzeugt ein Programm. Alternativ selbst bauen, Workouts oder ganze Programme importieren und exportieren, mehrere Programme verwalten.
- **Wochenplan:** Workouts und Ruhetage als Wochenzyklus, frei ordnen, Workouts überspringen. Sind alle Tage erledigt, startet eine neue Woche mit neu berechneten Zielen.
- **Workout-Vorschau:** Übungen, Sätze, Rep-Bereiche und Ziel-RIR, Wochenziele, Übungen tauschen und verschieben, Supersätze.
- **Logger:** Timer, Satztabelle mit Numpad, Aufwärmsätze, Satztypen (Versagen, Drop, Myo, Teilwiederholungen), Links/Rechts getrennt, Pausentimer mit Ton, Scheibenrechner. Das laufende Workout übersteht einen Reload, Einheiten lassen sich nachtragen und im Verlauf bearbeiten.
- **Progression:** Double Progression mit Zielwert und Weight Match, geschätztes 1RM, Körpergewichtsanteil, Plateau-Erkennung, Deload, Rep-Schemata, Gerätestufen, Anpassung der Folgesätze, Trainingspause.
- **Übungsbibliothek:** rund 300 Übungen mit 22 Muskelgruppen, Anleitungen und Tipps (DE/EN), Übungsbilder, eigene Übungen.
- **Dashboard und Statistik:** Wochenringe, Gewohnheiten, Körperkarte mit Wochenvolumen, Rekorde, Verlaufsdiagramme. Dashboard und Plus-Menü lassen sich anpassen.
- **Körperdaten:** Gewicht mit Trend, Maße mit Vergleich, optional Periode, Import aus Apple Health (XML) oder CSV.
- **Daten und Hilfe:** Backup, Trainings-CSV-Import und -Export, Einheiten (kg/lb, km/mi), Hell/Dunkel, Wissensdatenbank in der App.

## Als App auf dem Handy nutzen

Die URL oben im Browser öffnen und „Zum Home-Bildschirm“ wählen (iPhone: Safari, Teilen-Menü). Danach läuft sie im Vollbild und funktioniert offline. Das App-Icon wird beim Hinzufügen festgelegt und lässt sich bei Web-Apps nachträglich nicht umstellen. Zum Wechseln die App vom Home-Bildschirm entfernen und neu hinzufügen.

## Hinweise und Grenzen

- Die Vorschläge sind allgemeine Trainingsheuristiken und ersetzen keine Beratung durch Trainer:innen oder Ärzt:innen.
- Kein direkter Apple-Health- oder Health-Connect-Zugriff (Web-App), nur Datei-Import.
- Die Daten liegen nur im Browser (IndexedDB). Löschen der Website-Daten löscht auch deine Einträge, daher regelmäßig ein Backup exportieren.
- Videos zu den Übungen sind bewusst noch nicht eingebaut.

## Quellen

Eigenentwicklung, Muskelfiguren und Anleitungen sind selbst erstellt. Ausnahme: Übungsbilder und übersetzte Texte aus [free-exercise-db-with-videos](https://github.com/harshvishu/free-exercise-db-with-videos) (MIT, © 2026 Arham Wani), siehe `THIRD_PARTY.md`.
