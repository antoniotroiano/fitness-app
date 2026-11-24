# TRAINRATE: WORKOUT

Eigenständige Trainings-App (PWA, nur lokal, Deutsch) mit regelbasierter Progression. Eigenentwicklung: keine Übernahme von Code, Assets, Namen oder Texten anderer Apps. **Ausnahme (bewusste Entscheidung):** Übungsbilder und ausgewählte Texte aus `free-exercise-db-with-videos` (MIT), siehe `THIRD_PARTY.md`, `docs/plan/PLAN-3.md`. Ausführliche Planung (lokal, nicht im Repo: `docs/plan/` und `docs/notes/` stehen in `.gitignore`, ein frischer Clone oder Worktree enthält sie nicht): `docs/plan/PLAN-1.md` (Grundplan) und `docs/plan/PLAN-2.md` (Erweiterung: Warm-ups, Timer, Logger, Dashboard), `docs/plan/PLAN-5.md` (geplant: Gerätegewichte, Wizard-Überarbeitung), `docs/plan/PLAN-6.md` (Abgleich mit einer Referenz-App, **Checkliste mit Status: vor jeder Aufgabe lesen, Aufgabe abhaken**).

## Befehle
```bash
npm run dev        # Dev-Server (Port 5173, siehe .claude/launch.json)
npm test           # Vitest, alle Engine-/Daten-Tests
npm run typecheck  # tsc -b
npm run build      # tsc -b + Vite-Build + PWA
```
Vor jedem Abschluss: `npm run typecheck && npm test && npm run build`.

## Stack
Vite 8, React 19, TypeScript (strict, `erasableSyntaxOnly`: keine Enums/Parameter-Properties), Tailwind CSS v4, Dexie (IndexedDB), react-router-dom (HashRouter), eigene SVG-Diagramme (kein Chart-Paket), vite-plugin-pwa, Vitest.

## Struktur (`src/`)
- `types.ts`: alle Domänentypen (Program, Session, ProgramConfig, Settings …)
- `data/`: `muscles.ts` (22 Muskelgruppen, einzige Quelle; Migration alter IDs in `muscleMigration.ts`), `exercises.ts` (Übungen als Tupel-Zeilen + Cardio)
- `engine/`: **reine Funktionen ohne UI/DB**, vollständig getestet
  - `progression.ts` (e1RM, Double Progression, Plateau), `periodization.ts` (Rep-Schemata, Deload)
  - `planGenerator.ts` (Wizard-Config → Programm), `swap.ts`, `weekCycle.ts` (Wochenreset), `weekProgress.ts`, `stats.ts`
  - `bodyweight.ts` (Körpergewichtsanteil), `setTypes.ts` (Drop/Myo-Segmente), `superset.ts` (Supersätze)
  - `warmup.ts` (Aufwärmrampe), `rest.ts` (Pausen-Kategorien/Defaults), `plannedDay.ts` (geteilte Tagesberechnung für Vorschau + Logger), `workoutClock.ts` (Timer mit Pausen)
- `db/db.ts`: Dexie-Schema, Hooks (`useSessions` …), Backup Export/Import, Gewichts-Import (Apple-Health-XML/CSV)
- `features/`: `wizard`, `workouts` (Wochenplan, Vorschau, Logger mit Timer/Satztabelle/Numpad/Info-Sheet), `dashboard`, `stats`, `body` (Gewicht, Maße), `more`
- `data/media/`: `map.json` (App-ID → Repo-Slug), `manifest.json` (vorhandene Poster, erzeugt von `scripts/build-media.mjs`), `index.ts` (`posterUrl`). Bilder in `public/exercise-media/poster/`. Videos: nur Idee, `docs/notes/IDEAS-VIDEOS.md`.
- `data/instructions.ts` (+ `data/instr/*`): eigene Anleitungen pro Übungs-ID (Info-Sheet lädt sie per dynamischem Import; Seiten in `App.tsx` per `React.lazy`). `components/MuscleFigure.tsx`: eigene SVG-Muskelfigur (kein Fremd-Asset).
- `components/ui.tsx`: gemeinsame UI-Bausteine; `utils/`: Datum und Einheiten

## Konventionen und Invarianten
- **Name:** Marke TRAINRATE, Produkt TRAINRATE: WORKOUT (immer Großbuchstaben). Interne Kennungen (`liftlab` als DB-Name, Backup-`app`-Feld, Sprach-Storage-Key) bleiben bewusst unverändert, sonst brechen bestehende Daten und Backups.
- **Speicherung immer metrisch** (kg, cm, km). Umrechnung nur bei Anzeige/Eingabe über `utils/units.ts`.
- Datumsangaben sind lokale Strings `yyyy-mm-dd` (`utils/dates.ts`), keine UTC-ISO-Strings.
- Neue Logik gehört in `engine/` (rein, mit Test in `engine.test.ts`), nicht in Komponenten.
- Muskel-Sets/Volumen: primäre Muskeln voll, sekundäre mit `SECONDARY_WEIGHT` (0,5). Cardio zählt nie mit.
- Schemaänderungen an Dexie: neue `this.version(n)` ergänzen, alte nie ändern. Backup-Format (`exportAll`) mitpflegen.
- UI-Texte auf Deutsch, Design über CSS-Variablen in `index.css` (Hell/Dunkel).
- Keine Secrets, kein Backend, keine externen Netzwerkaufrufe. Alle Daten bleiben lokal.

## Details nach Thema (`docs/dev/`)
Vor Arbeiten an einem Bereich die passende Datei lesen. Neue Invarianten gehören in die Datei des Themas, nicht hierher.
- `docs/dev/progression.md`: Progression, e1RM, Zielwert/Weight Match, Plateau, Equipment-Grenzen, Gerätestufen-Editor, Trainingspause, Rep-Schemata, Körpergewichtsanteil, Begründung der Vorschläge.
- `docs/dev/logger.md`: Logger, Warm-up, Satztypen, Folgesätze, Links/Rechts, Supersätze, Timer und Töne, Übung tauschen, Scheibenrechner, History-Ebenen.
- `docs/dev/programs.md`: Plan-Generator, Programm verwalten, Wochenzyklus, Wochenziele, Blocklänge, Überspringen, Workout-Verlauf bearbeiten.
- `docs/dev/dashboard-body.md`: Dashboard-Ringe, Körperkarte, Layout anpassen, Datenfarben, Gewichts-Trend, Maße-Vergleich, Periode, Wochenvolumen, Profil-Kopf.
- `docs/dev/exercises.md`: Je Seite, Zeit-/Distanzübungen, eigene Übungen, Muskel-IDs, „Nie empfehlen“, neue Übungen, Cardio.
- `docs/dev/data-i18n.md`: Trainingsimport, Exporte, Sprache (DE/EN), Wissensdatenbank.

## Bekannte Grenzen / Offen
- Englisch: Oberfläche, Übungs- und Muskelnamen sowie Anleitungen/Tipps der Standardübungen übersetzt (eigene Übungsbeschreibungen bleiben, wie eingegeben). Gespeicherte Texte (Programm-/Workout-Namen, Notizen) behalten die Sprache vom Anlegen.
- Pausen-Ton: als PWA nur hörbar, wenn die App im Vordergrund läuft; über Musik wird nichts leiser oder unterbrochen (Audio-Session-Versuch wirkt auf dem Gerät nicht), im Hintergrund/Sperrbildschirm kein Ton. Richtiges Ducking und Hintergrund-Signal erst mit Capacitor-Wrapper.
- Kein direkter Apple-Health/Health-Connect-Zugriff (Web-App): nur Datei-Import. Automatik erst mit Capacitor-Wrapper.
- Deployment läuft nur bei Release-Tags `v*` (siehe docs/dev/data-i18n.md).
- Progressions-Konstanten (Inkremente, Volumen, Rep-Ranges) sind Heuristiken, anpassbar in `engine/`.
- Backup-Import und Übungstausch im Wizard sind nicht automatisiert getestet, aber vom Nutzer auf dem iPhone von Hand geprüft (2026-11-23, alles ok).
