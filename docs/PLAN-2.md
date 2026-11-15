# Plan 2: Warm-ups, Workout-Timer, neuer Logger, Vorschau, Pausen, Übungs-Info

> Plan 1 (Grundplan der App): `docs/PLAN-1.md`. Dieser Plan erweitert ihn. Umgesetzt in Runde 1 (Etappen 1-4) und Runde 2 (Nachträge unten).

## Context
Der erste Entwurf loggt nur Arbeitssätze in einer einfachen Liste (`Logger.tsx`), kennt keine Warm-ups, keinen Workout-Timer, keine Übungsbilder/Infos und nutzt für Pausen nur `compound ? 150 : 90`. Ziel: Logger und Workout-Vorschau nach deiner Beschreibung (MacroFactor-ähnlich), Warm-ups und Pausen wissenschaftlich begründet und einstellbar.
Entschieden: **eigene SVG-Muskelfigur** (keine fremden Assets), **eigene deutsche Anleitungstexte für alle 191 Übungen**, **Umsetzung in 4 Etappen mit Commits**.
Klargestellt: Sätze lassen sich per Swipe nach links löschen ("keine Sätze entfernen" war ein Schreibfehler).

## Wissenschaftliche Grundlage (als Heuristik gekennzeichnet, Quellen im Code-Kommentar)
**Warm-up** (spezifisches Aufwärmen mit leichteren Sätzen derselben Übung verbessert Leistung/Wdh. leicht bis nicht negativ; Meta-Analysen u. a. Ribeiro 2020, Silva 2018; zur *Satzzahl* gibt es keine harten Studien, daher Praxis-Rampe):
- Rampe relativ zum Arbeitsgewicht: ca. 50 % × 8, 70 % × 5, 85 % × 3 (je schwerer, desto weniger Wdh., nie bis Ermüdung).
- Schwere Verbundübung, **erste** Übung für diese Muskelgruppe am Tag: 3 Sätze. Bei Arbeitsgewicht < 1,5 × Stange o. Ä. nicht relevant, Rampe wird auf Equipment-Inkremente gerundet, doppelte Gewichte entfallen.
- Weitere Verbundübung, die bereits trainierte Muskeln nutzt: 1 Satz (ca. 70 % × 5), ggf. 0.
- Isolation: 1 Satz (ca. 60 % × 8) nur wenn erste Übung der Muskelgruppe, sonst 0 (erklärt "keine Warm-ups am Programmende").
- Core/Bodyweight/Band/Kettlebell-Kleinlast: 0. Arbeitsgewicht unbekannt (erste Einheit): keine Gewichtsvorschläge, nur W-Zeilen ohne Wert.

**Pausen** (Schoenfeld 2016: 3 vs. 1 min bringt bei Trainierten mehr Kraft und Hypertrophie; Refalo 2023, Singer 2024: Hypertrophie ab ca. 60-90 s ähnlich, längere Pausen halten Wdh./Volumen bei Verbund; ACSM: 2-3 min Hauptübungen, 1-2 min Assistenz). Defaults in Sekunden, alle änderbar:
| Kategorie | Default |
|---|---|
| Verbund Oberkörper | 150 |
| Verbund Unterkörper | 180 |
| Isolation Oberkörper | 90 |
| Isolation Unterkörper | 90 |
| Core | 60 |
| nach Warm-up-Satz (Verbund / sonst) | 90 / 45 |

**RIR pro Satz** (Robinson 2024 u. a.: Hypertrophie nahe am Muskelversagen, aber mit Reserve bei Verbund): Basis = vorhandener `effectiveRir`. Verbund: erster Satz Basis+1, übrige Basis. Isolation: letzter Satz Basis−1 (min 0), übrige Basis. Rein heuristisch, Konstanten in `engine/` anpassbar.

## Etappe 1: Engine, Daten, Tests (keine UI)
- `src/types.ts`: `LoggedSet.warmup?: boolean`; `Session.startedAt?: number`, `durationSec?: number` (aktive Zeit ohne Pause); `RestCategory` (`compoundUpper|compoundLower|isoUpper|isoLower|core`); `Settings.restSeconds: Record<RestCategory,number>`, `warmupRestCompound`, `warmupRestOther`, `warmupsEnabled: boolean`; `Exercise` bleibt unverändert.
- Neu `src/engine/rest.ts`: `restCategory(ex)` (core-Pattern → core; `compound` → Verbund, sonst Isolation; Ober/Unter über `MUSCLES[primary[0]].region`), `DEFAULT_REST`, `restSecondsFor(ex, settings, afterWarmup)`.
- Neu `src/engine/warmup.ts`: `warmupSets({workWeight, equipment, compound, pattern, firstForMuscle})` → `{weight|null, reps}[]`, gerundet via `INCREMENT`/`roundTo` aus `progression.ts`; `isFirstForMuscle(dayExercises, index, lookup)`. Warm-ups werden **zur Laufzeit berechnet**, nicht im Plan gespeichert (Plan-Generator und Zeitbudget bleiben unberührt, `engine.test.ts:105` bleibt gültig).
- Neu in `periodization.ts` oder `progression.ts`: `setRir(base, i, n, compound)`; `previousSets(sessions, exerciseId)` → `{warmups[], work[]}` der letzten Session (Sortierung nach `date` dann `finishedAt`).
- Warm-ups aus allen Auswertungen filtern: `work()` in `stats.ts:25` (`!s.warmup`), `suggestNext`-Eingabe und `sessionE1rm` (`progression.ts`), Logger-`isStalled`-Eingabe, `weekProgress.ts:29` (nur Arbeitssätze zählen).
- `db.ts`: `DEFAULT_SETTINGS` erweitern, `getSettings` tief mergen für `restSeconds`. Kein Dexie-Upgrade nötig (nur optionale Felder). Neuer kv-Key `activeWorkout` (siehe Etappe 2) von `exportAll` ausnehmen. Backup `version` auf 2.
- Neu `src/data/instructions.ts`: `INSTRUCTIONS: Record<id, string[]>` (3-5 Schritte, eigene Formulierung) für alle 191 `EXERCISES`; Cardio/Custom: Fallback-Text. Datei in 3-4 Blöcken schreiben.
- Tests (`engine.test.ts`, `exercises.test.ts`): `restCategory` für Stichproben, `warmupSets` (Rampe, Rundung, Dedup, 0 bei Isolation nicht-erste, null-Gewicht), `setRir`, `previousSets`, `work()` ignoriert Warm-ups, `suggestNext` unverändert mit Warm-ups, jede `EXERCISES`-ID hat Anleitung.

## Etappe 2: Logger neu (`src/features/workouts/`)
Aufteilung von `Logger.tsx` (148 Zeilen) in: `Logger.tsx` (Orchestrierung), `useWorkoutClock.ts`, `SetTable.tsx`, `SwipeRow.tsx`, `NumpadSheet.tsx`, `SetTypeSheet.tsx`, `ExerciseStrip.tsx`, `RestPill.tsx`.
- **Timer**: `startedAt` + `pausedAccumMs` + `pausedAt`, Anzeige `HH:MM:SS` per `setInterval` aus Zeitstempeln (driftfrei, hintergrundfest). Persistenz des laufenden Workouts in `kv['activeWorkout']` (rows, Zeiten, slot), damit Reload/PWA-Wechsel nichts verliert; Wiederaufnahme beim Öffnen derselben Route.
- **Kopfzeile**: Timer groß oben; Menü mit Pause/Fortsetzen, Abbrechen (Bestätigung, verwirft alles), Abschließen (Bestätigung wenn offene Zeilen; speichert nur abgehakte Sätze inkl. `warmup`, `startedAt`, `durationSec`; Übungen ohne Einträge entfallen, Slot wird markiert wie bisher).
- **Übungs-Leiste**: horizontal scrollbare Reihe der Übungsbilder (`MuscleFigure`, Etappe 4; bis dahin Platzhalter mit Anfangsbuchstabe), aktive Übung markiert, erledigt-Badge. Darunter Übungsname und kleiner "Info"-Button (Etappe 4).
- **Tabelle (5 Spalten)**: Set | Previous | kg | Reps | ✓. Set-Zelle zeigt `W` oder Nummerierung der Arbeitssätze (W-Zeilen zählen nicht mit); Tippen öffnet `SetTypeSheet` (Warm-up / Standard; Datenmodell erlaubt später Drop/Failure/Myo). Previous: gleiche Position der letzten Session als "20 kg × 9" in Anzeigeeinheit. `+` unter der Set-Spalte fügt Arbeitssatz hinzu (kopiert letzte Zeile). Swipe links zeigt rotes "−" zum Löschen (Pointer-Events, keine neue Dependency).
- **Vorbelegung** beim Start: Warm-up-Zeilen aus `warmupSets` (wenn `warmupsEnabled`), Arbeitssätze aus `suggestNext`, Ziel-RIR aus `setRir`.
- **RIR-Anzeige**: kleine Zahl unten rechts in der Reps-Zelle; Farben als CSS-Variablen in `index.css` (hell/dunkel): 0-1 rot, 2-3 gelb, 4-5 grün, 6+ blau.
- **Numpad-Sheet** (nicht-modal, am unteren Rand angedockt, Tabelle bekommt Bottom-Padding): oben RIR-Leiste (0-5, 6+), Ziffernblock 1-9, 0, Komma/Backspace, Haken unten rechts bestätigt und springt zum nächsten Feld. Wird für Reps (mit RIR) und kg genutzt; nutzt kein natives Keyboard (`inputMode="none"`/readonly-Felder).
- **Rest-Timer**: Start beim Abhaken mit `restSecondsFor(...)` (nach Warm-up anderer Wert), timestamp-basiert; Pille bleibt, plus "+15 s/−15 s", kurze Vibration am Ende (`navigator.vibrate`, falls verfügbar).
- Cardio-Übungen behalten Minuten/km-Eingabe (kein Warm-up, keine RIR).

## Etappe 3: Workout-Vorschau
- Neue Route `/workout-preview/:slot` in `App.tsx`; Tab-Leiste dort ausblenden (Pfadprüfung bei Zeile ~40 erweitern). `Workouts.tsx`: Klick auf Workout-Karte → Vorschau; Button "Starten" nur dort ("Workout starten" fix am unteren Rand → `/workout/:slot`).
- Inhalt: oben Anzahl Übungen; je Übung eine Karte: links Bild (über mehrere Zeilen), rechts Name, dann pro Satz eine Zeile (Reps-Bereich, z. B. "3 × 8-12"), zuletzt Hauptmuskel (Label aus `muscleLabel`); ganz rechts Ziel-RIR pro Satz (`setRir`). Gemeinsame Berechnung (`weekPlan`, `effectiveSets`, `effectiveRir`) in eine Engine-Funktion `plannedDay(...)` auslagern, die Vorschau und Logger teilen.

## Etappe 4: Bilder, Info-Sheet, Einstellungen
- Neu `src/components/MuscleFigure.tsx`: eigene SVG, Vorder- und Rückansicht, Regionen pro `MuscleId` (15), Primär = Akzentfarbe, Sekundär = abgeschwächt, Rest neutral; Varianten `thumb` (kleines Quadrat, wählt Ansicht nach Primärmuskel: Rücken/Gesäß/Hamstrings/Trizeps/Waden/Trapez hinten, sonst vorn) und `detail` (beide Ansichten + Legende). Inline-SVG, daher kein PWA-Caching/Lizenz-Thema.
- Neu `ExerciseInfoSheet.tsx` (BottomSheet mit 3 Tabs): **Instructions** (`INSTRUCTIONS`), **Details** (`MuscleFigure detail`, Liste Primär/Sekundär), **History** (nach Datum gruppiert, Aufklapper mit Warm-up-/Arbeitssätzen "20 kg × 9", Daten via `useSessions()`). Auch aus Bibliothek (`More.tsx` LibraryPage) erreichbar.
- Einstellungen (`More.tsx` SettingsPage): Abschnitt "Pausen" (5 Kategorien + Warm-up-Pausen, Stepper in 15-s-Schritten, "Standard wiederherstellen") und Schalter "Warm-up-Sätze vorschlagen". Texte deutsch.
- `docs/PLAN.md` und `CLAUDE.md` aktualisieren (neue Module, Invarianten: Warm-ups zählen nie in Volumen/e1RM/Progression; Pausen-Defaults).

## Verifikation
- Pro Etappe: `npm run typecheck && npm test && npm run build`.
- Etappe 2-4 im Preview (`npm run dev`, Port 5173, mobiler Viewport): Workout starten, Timer läuft/pausiert/Reload hält Zustand, Warm-up-Zeilen erscheinen nur bei erster Übung/Verbund, Numpad + RIR-Farben, Swipe-Delete, Abhaken startet passenden Rest-Timer, Abschließen speichert nur abgehakte Sätze (History/Previous prüfen), Abbrechen speichert nichts, Dashboard-Volumen ohne Warm-ups, Hell/Dunkel, Settings-Änderung wirkt auf Rest-Timer.
- Nicht automatisiert testbar (Vitest nur `node`): Komponenten; daher bleibt Logik in `engine/`.

## Risiken
- SVG-Muskelfigur ist der größte manuelle Aufwand (Pfade per Hand); erste Version stilisiert, später verfeinerbar.
- Warm-up-Satzzahlen und RIR-Muster sind begründete Heuristiken, keine harten Studienergebnisse; so in der UI/Doku kenntlich machen.


## Nachträge (Runde 2)
**Bugs und Verhalten**
- Swipe-Löschen: Nach dem Loslassen schloss der folgende Klick (Pointer-Capture) die Zeile wieder, das rote Minus war nicht klickbar. Der Klick direkt nach einer Wischgeste wird jetzt ignoriert.
- Übungs-Leiste: Eine Übung gilt erst als erledigt, wenn alle ihre Zeilen abgehakt sind. Danach springt der Logger automatisch zur ersten Übung der Reihenfolge, die noch offen ist (übersprungene Übungen kommen so wieder dran).
- Info-Fenster: feste Höhe (ca. 92 % des Bildschirms, oben bleibt der abgedunkelte Hintergrund sichtbar), Inhalt scrollt, Tabs bleiben oben.
- History in der Info: pro Einheit Datum, darunter der Programmname, vorn Symbol und Farbe des Programms.

**Dashboard (neu aufgebaut)**
1. Diese Woche: drei Ringe, nur die Linie füllt sich. Groß in der Mitte Sets (innen erledigt fett, darunter "übrig", unter dem Ring das Ziel), links klein Muskeln, rechts klein Übungen; je eine eigene Farbe.
2. Gewohnheiten: zwei Boxen nebeneinander.
   - Gewicht: Untertitel "Letzte 30 Tage", 30 Punkte (grün = eingetragen, hellgrau = nicht), dünne Trennlinie, "6/7 diese Woche".
   - Workouts: gleicher Aufbau, orange.
   - Tippen öffnet von rechts eine Seite: Titel, "Heute -- kg" (bzw. Workout-Status) und Streak, darunter Monatskalender mit Kreisen (Farbe = erfasst, dünner grauer Rand = nicht), Wischen links/rechts wechselt den Monat, unten Legende (erfasst / nicht erfasst).
   - Streak Gewicht: aufeinanderfolgende Tage. Streak Workouts: aufeinanderfolgende Wochen mit mindestens einem Workout (Tage am Stück wären bei Ruhetagen immer 1).
3. Muskelgruppen und Übungen: je Titel mit "Alle anzeigen" rechts und zwei Boxen nebeneinander (die zwei mit den meisten Sätzen der letzten 7 Tage). Box: Name, "Letzte 7 Tage", kleines Balkendiagramm, Trennlinie, Anzahl Sätze der letzten 7 Tage (Cardio: Minuten). "Alle anzeigen" schiebt von rechts eine Seite herein (Muskeln getrennt nach Oberkörper/Unterkörper).
- Bezeichnungen bleiben vorerst deutsch. Sprachumschalter Deutsch/Englisch später unter More.

**Reine Logik (engine/habits.ts, getestet):** Punkte der letzten 30 Tage, Wochenzähler, Streaks, Monatsraster, 7-Tage-Reihen.

## Nachträge (Runde 3): Diagramme
- **Dashboard, Übungsboxen:** Statt Balken zeigen sie das Liniendiagramm wie auf der Übungsseite (1RM der letzten 7 Tage, Tage ohne Training werden übersprungen). Unten steht weiter die Satzzahl der letzten 7 Tage. Cardio bleibt ein Balkendiagramm (Dauer), wie auf der Cardio-Seite. Muskelboxen bleiben Balken (Sätze).
- **Voreinstellung 1W:** Übungs-, Cardio- und Muskelseiten starten mit 1W. Gewicht und Körpermaße starten mit 3M.
- **Eigenes Diagramm (SVG) statt recharts:** `features/stats/TimeSeries.tsx`, Logik in `engine/chartWindow.ts` (getestet). Alle Verlaufsdiagramme der App nutzen es (Übung, Cardio, Muskel, Gewicht, Maße).
- **Datumsbereich über dem Diagramm:** 1W "9. - 15. Nov. 2026", 1M "17. Okt. - 15. Nov. 2026", über den Jahreswechsel mit beiden Jahren.
- **Untere Achse:**
  - 1W: jeder Tag mit Mo, Di, Mi, Do, Fr, Sa, So, auch ohne Training.
  - 1M: 6 Beschriftungen im Abstand von 5 Tagen, rechts das Enddatum (z. B. 15. Nov.).
  - 3M, 6M, 1Y, All: ebenfalls 6 Beschriftungen von rechts nach links im gleichen Abstand (Fensterlänge / 6 Tage). Ab ca. 4 Wochen Abstand nur Monatsnamen (6M, 1Y), sonst Tag und Monat (3M).
  - Fenster: 1W = 7, 1M = 30, 3M = 91, 6M = 182, 1Y = 365 Tage. All = vom ersten Eintrag bis heute (mindestens 7 Tage).
- **Wischen durch die Zeit:** Der Graph folgt dem Finger tageweise (nach rechts = zurück in die Vergangenheit), zurück bis zum ersten Eintrag, nie in die Zukunft. Beim Wischen verliert die Zeitraum-Markierung (z. B. 1W) die Hervorhebung, ein Tipp auf 1W oder einen anderen Zeitraum springt zur aktuellen Ansicht. Bei All gibt es nichts zu verschieben.
- **Mittelung:** Ein kleiner Knopf (Buchstabe D, W oder M) in derselben Zeile wie 1W bis All öffnet von unten das Fenster "Chart Averaging" mit ✕ links und den Auswahlmöglichkeiten D Daily, W Weekly, M Monthly. Wochen- und Monatswerte werden auf das Fenster beschnitten.
- **Antippen** eines Datenpunkts zeigt Datum und Wert.

## Nachträge (Runde 4): Dashboard-Linien, Übungsübersicht
- **Dashboard-Übungsboxen:** Die zusätzliche Grundlinie im Liniendiagramm ist entfernt, es bleibt wie bei den Muskelboxen nur die Trennlinie unter dem Diagramm (gilt auch für "Alle anzeigen").
- **Zurück aus der Übungsübersicht:** Wer sie über More → "Alle Übungen" öffnet, sieht oben links einen Zurück-Pfeil nach More. Über den Tab "Übungen" unten gibt es keinen Pfeil.
- **Filter:** Oben Piktogramme (Figur mit markierter Muskelgruppe) statt Namen, kein "Alle"-Knopf. Erneutes Antippen der gewählten Gruppe hebt den Filter auf. Cardio steht zuletzt.
- **Gruppierung** (`engine/library.ts`, getestet): Free Weights (Langhantel, Kurzhantel, Kettlebell), Machines (Maschine, Kabel, Smith), Bodyweight & Personal (Körpergewicht, Band, eigene Übungen), Cardio. Je Gruppe 5 Übungen, rechts "See N More" klappt die Gruppe darunter auf, dann "See Less". Übungen alphabetisch.
- **Suchfeld** unten über der Tab-Leiste: beim Runterscrollen verschwindet es, beim leichten Hochscrollen kommt es wieder.
- **22 Muskelgruppen (überall umgestellt):** Brust, Oberer Rücken, Lats, Bizeps, Trizeps, Vordere Schulter, Seitliche Schulter, Unterer Rücken, Bauch, Trapez (Upper Traps), Hintere Schulter, Unterarme, Seitliche Bauchmuskeln (Obliques), Nacken, Serratus, Quadrizeps, Gesäß, Hamstrings, Waden, Abduktoren, Adduktoren, Schienbein (Tibialis). Reihenfolge wie in deiner Liste; Cardio kommt in den Filtern zuletzt.
  - **Daten:** `shoulders` ist aufgeteilt (Drücken = vordere + seitliche Schulter, Seitheben = seitliche, Reverse Fly und Face Pulls = hintere), `core` heißt jetzt `abs`, Seitbauch-Übungen laufen über `obliques`. Rückenstrecker, Good Morning und Co. sind jetzt unterer Rücken, Kreuzheben-Varianten haben ihn als sekundären Muskel.
  - **18 neue Übungen** (Anleitungen inklusive), damit jede Gruppe mindestens 3 Übungen hat: Nacken (4), Serratus (5), Schienbein (4), unterer Rücken (2), Seitbauch (3).
  - **Muskelfigur** hat Regionen für alle 22 Gruppen (Vorder- und Rückseite).
  - **Planer:** Vordere Schulter, hintere Schulter, Trapez, Bauch und Ab-/Adduktoren bekommen anteilig weniger Volumen, weil Verbundübungen sie schon treffen. Unterarme, Nacken, Serratus, Schienbein, Seitbauch und unterer Rücken werden nur bei Fokus "Höher" eingeplant.
  - **Migration:** Dexie Version 2 stellt gespeicherte eigene Übungen und den Programm-Fokus um ("Schultern" gilt dann für alle drei Schulterteile). Auch beim Backup-Import (alte Backups bleiben gültig).
