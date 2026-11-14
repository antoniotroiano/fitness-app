# Lift Lab

Eigenständige Trainings-App (PWA, nur lokal, Deutsch) mit regelbasierter Progression. Eigenentwicklung: keine Übernahme von Code, Assets, Namen oder Texten anderer Apps. Ausführliche Planung und Feature-Beschreibung: `docs/PLAN.md`.

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
- `data/`: `muscles.ts` (15 Muskelgruppen, einzige Quelle), `exercises.ts` (Übungen als Tupel-Zeilen + Cardio)
- `engine/`: **reine Funktionen ohne UI/DB**, vollständig getestet
  - `progression.ts` (e1RM, Double Progression, Plateau), `periodization.ts` (Rep-Schemata, Deload)
  - `planGenerator.ts` (Wizard-Config → Programm), `swap.ts`, `weekCycle.ts` (Wochenreset), `weekProgress.ts`, `stats.ts`
- `db/db.ts`: Dexie-Schema, Hooks (`useSessions` …), Backup Export/Import, Gewichts-Import (Apple-Health-XML/CSV)
- `features/`: `wizard`, `workouts` (Wochenplan + Logger), `dashboard`, `stats`, `body` (Gewicht, Maße), `more`
- `components/ui.tsx`: gemeinsame UI-Bausteine; `utils/`: Datum und Einheiten

## Konventionen und Invarianten
- **Speicherung immer metrisch** (kg, cm, km). Umrechnung nur bei Anzeige/Eingabe über `utils/units.ts`.
- Datumsangaben sind lokale Strings `yyyy-mm-dd` (`utils/dates.ts`), keine UTC-ISO-Strings.
- Neue Logik gehört in `engine/` (rein, mit Test in `engine.test.ts`), nicht in Komponenten.
- Muskel-Sets/Volumen: primäre Muskeln voll, sekundäre mit `SECONDARY_WEIGHT` (0,5). Cardio zählt nie mit.
- Cardio wird nie vom Plan-Generator eingeplant, nur manuell hinzugefügt.
- Wochenzyklus: `Session.week` ist die Programmwoche. Sind alle 7 Slots erledigt, setzt `markSlot` zurück und zählt die Woche hoch.
- Neue Übungen: Zeile in `data/exercises.ts` ergänzen. Tests prüfen eindeutige IDs/Namen und Mindestabdeckung pro Muskel.
- Schemaänderungen an Dexie: neue `this.version(n)` ergänzen, alte nie ändern. Backup-Format (`exportAll`) mitpflegen.
- UI-Texte auf Deutsch, Design über CSS-Variablen in `index.css` (Hell/Dunkel).
- Keine Secrets, kein Backend, keine externen Netzwerkaufrufe. Alle Daten bleiben lokal.

## Bekannte Grenzen / Offen
- Kein direkter Apple-Health/Health-Connect-Zugriff (Web-App): nur Datei-Import. Automatik erst mit Capacitor-Wrapper.
- App-Icons sind Platzhalter (`public/favicon.svg`), Deployment/Hosting steht aus.
- Progressions-Konstanten (Inkremente, Volumen, Rep-Ranges) sind Heuristiken, anpassbar in `engine/`.
- Backup-Import und Übungstausch im Wizard wurden bisher nicht automatisiert getestet.
