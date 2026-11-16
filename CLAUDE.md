# Lift Lab

Eigenständige Trainings-App (PWA, nur lokal, Deutsch) mit regelbasierter Progression. Eigenentwicklung: keine Übernahme von Code, Assets, Namen oder Texten anderer Apps. **Ausnahme (bewusste Entscheidung):** Übungsbilder und ausgewählte Texte aus `free-exercise-db-with-videos` (MIT), siehe `THIRD_PARTY.md`, `docs/PLAN-3.md`. Ausführliche Planung: `docs/PLAN-1.md` (Grundplan) und `docs/PLAN-2.md` (Erweiterung: Warm-ups, Timer, Logger, Dashboard).

## Befehle
```bash
npm run dev        # Dev-Server (Port 5173, siehe .claude/launch.json)
npm test           # Vitest, alle Engine-/Daten-Tests
npm run typecheck  # tsc -b
npm run build      # tsc -b + Vite-Build + PWA
```
Vor jedem Abschluss: `npm run typecheck && npm test && npm run build`.

## Stack
Vite 8, React 19, TypeScript (strict, `erasableSyntaxOnly`: keine Enums/Parameter-Properties), Tailwind CSS v4, Dexie (IndexedDB), react-router-dom (HashRouter), Recharts, vite-plugin-pwa, Vitest.

## Struktur (`src/`)
- `types.ts`: alle Domänentypen (Program, Session, ProgramConfig, Settings …)
- `data/`: `muscles.ts` (22 Muskelgruppen, einzige Quelle; Migration alter IDs in `muscleMigration.ts`), `exercises.ts` (Übungen als Tupel-Zeilen + Cardio)
- `engine/`: **reine Funktionen ohne UI/DB**, vollständig getestet
  - `progression.ts` (e1RM, Double Progression, Plateau), `periodization.ts` (Rep-Schemata, Deload)
  - `planGenerator.ts` (Wizard-Config → Programm), `swap.ts`, `weekCycle.ts` (Wochenreset), `weekProgress.ts`, `stats.ts`
  - `warmup.ts` (Aufwärmrampe), `rest.ts` (Pausen-Kategorien/Defaults), `plannedDay.ts` (geteilte Tagesberechnung für Vorschau + Logger), `workoutClock.ts` (Timer mit Pausen)
- `db/db.ts`: Dexie-Schema, Hooks (`useSessions` …), Backup Export/Import, Gewichts-Import (Apple-Health-XML/CSV)
- `features/`: `wizard`, `workouts` (Wochenplan, Vorschau, Logger mit Timer/Satztabelle/Numpad/Info-Sheet), `dashboard`, `stats`, `body` (Gewicht, Maße), `more`
- `data/media/`: `map.json` (App-ID → Repo-Slug), `manifest.json` (vorhandene Poster, erzeugt von `scripts/build-media.mjs`), `index.ts` (`posterUrl`). Bilder in `public/exercise-media/poster/`. Videos: nur Idee, `docs/IDEAS-VIDEOS.md`.
- `data/instructions.ts` (+ `data/instr/*`): eigene Anleitungen pro Übungs-ID. `components/MuscleFigure.tsx`: eigene SVG-Muskelfigur (kein Fremd-Asset).
- `components/ui.tsx`: gemeinsame UI-Bausteine; `utils/`: Datum und Einheiten

## Konventionen und Invarianten
- **Speicherung immer metrisch** (kg, cm, km). Umrechnung nur bei Anzeige/Eingabe über `utils/units.ts`.
- Datumsangaben sind lokale Strings `yyyy-mm-dd` (`utils/dates.ts`), keine UTC-ISO-Strings.
- Neue Logik gehört in `engine/` (rein, mit Test in `engine.test.ts`), nicht in Komponenten.
- Muskel-Sets/Volumen: primäre Muskeln voll, sekundäre mit `SECONDARY_WEIGHT` (0,5). Cardio zählt nie mit.
- **Aufwärmsätze** (`LoggedSet.warmup`) zählen nie in Volumen, Sets, e1RM, Progression oder Wochenfortschritt (Filter in `stats.ts` `work()`, `suggestNext`, `sessionE1rm`, `weekProgress`). Sie werden zur Laufzeit aus dem Arbeitsgewicht berechnet, nicht im Plan gespeichert.
- Das laufende Workout liegt in `kv['activeWorkout']` (Reload-fest, nicht im Backup). Timer ist zeitstempelbasiert (`workoutClock.ts`).
- Pausen-Defaults und Warm-up-/RIR-Regeln sind Heuristiken (Quellen im Code-Kommentar), Pausen in Einstellungen änderbar.
- Cardio wird nie vom Plan-Generator eingeplant, nur manuell hinzugefügt.
- Wochenzyklus: `Session.week` ist die Programmwoche. Sind alle 7 Slots erledigt, setzt `markSlot` zurück und zählt die Woche hoch.
- Muskel-IDs (22): chest, upperBack, lats, biceps, triceps, frontDelts, sideDelts, lowerBack, abs, traps, rearDelts, forearms, obliques, neck, serratus, quads, glutes, hamstrings, calves, abductors, adductors, tibialis. Frühere IDs `shoulders`/`core` werden beim DB-Upgrade (Dexie v2) und Backup-Import migriert. Nur auf Wunsch (Fokus "Höher") plant der Generator: forearms, neck, serratus, tibialis, obliques, lowerBack.
- Neue Übungen: Zeile in `data/exercises.ts` ergänzen, Anleitung in `data/instr/*` (Test prüft Vollständigkeit). Tests prüfen eindeutige IDs/Namen und Mindestabdeckung pro Muskel.
- Schemaänderungen an Dexie: neue `this.version(n)` ergänzen, alte nie ändern. Backup-Format (`exportAll`) mitpflegen.
- UI-Texte auf Deutsch, Design über CSS-Variablen in `index.css` (Hell/Dunkel).
- Keine Secrets, kein Backend, keine externen Netzwerkaufrufe. Alle Daten bleiben lokal.

## Bekannte Grenzen / Offen
- Kein direkter Apple-Health/Health-Connect-Zugriff (Web-App): nur Datei-Import. Automatik erst mit Capacitor-Wrapper.
- App-Icons sind Platzhalter (`public/favicon.svg`), Deployment/Hosting steht aus.
- Progressions-Konstanten (Inkremente, Volumen, Rep-Ranges) sind Heuristiken, anpassbar in `engine/`.
- Backup-Import und Übungstausch im Wizard wurden bisher nicht automatisiert getestet.
