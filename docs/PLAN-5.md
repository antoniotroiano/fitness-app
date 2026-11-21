# PLAN-5: Gerätegewichte, Bearbeiten-Button, Dashboard-Rekorde, Wizard-Überarbeitung

Stand: 2026-11-21. Ergänzt PLAN-1 bis PLAN-4. Alles läuft lokal. Status: Gerätegewichte, B1 (Bearbeiten) und B2 (Rekorde-Umschalter) umgesetzt; B3 (Wizard) umgesetzt.

## 1. Ausgangslage
Die Progression schlägt Gewichte nur anhand fester Schritte pro Equipment vor (`INCREMENT` in `engine/progression.ts`). Reale Geräte haben andere Stufen (Kabelzug 5 kg, Kurzhanteln nur 2/4/6/12,5 …), ein Vorschlag wie 20,5 kg ist nicht einstellbar. Ziel: pro Übung die verfügbaren Gewichte hinterlegen, die Engine rundet darauf.

Zusätzlich gewünscht: Button „Bearbeiten“, schlankere Rekorde-Umschalter im Dashboard, überarbeiteter Plan-Wizard (Teil B).

Ergebnis: **docs/PLAN-5.md** (dieser Inhalt, Stil wie PLAN-4) + Verweis in CLAUDE.md (PLAN-5, Override-Felder). 

## Entscheidungen
_Status: ✅ umgesetzt (Datenmodell, Engine, Integration, UI, Tests)._

- **Datenmodell** `ExerciseOverride.weightScale?` (`types.ts`, in `kv['exerciseOverrides']`, Backup automatisch abgedeckt, kein Dexie-Upgrade; Werte immer kg):
  - `{ kind: 'range', min, max, step }` für Kabel/Maschine/Smith/Langhantel (Standard-Vorschlag im Editor: 0 / 250 / 5 kg; Langhantel 2,5).
  - `{ kind: 'list', weights: number[] }` für Kurzhantel/Kettlebell (Standard 2, 4, 6 … passend zu bisherigem Inkrement; Hinweis: bei Kurzhantel gilt je Seite).
  - Ohne Override = „Standard“ → Verhalten unverändert (Equipment-`INCREMENT`).
- **Engine** (neu `engine/weightScale.ts`, rein, Tests in `engine.test.ts`): `snapToScale(w, scale)` (nächstes verfügbares), `stepUp/stepDown(w, scale)` (nächste Stufe, auch in Liste mit ungleichen Abständen), `effectiveStep(scale)` für Zeitlogik/Warm-up. Gewicht wird auf [min,max] bzw. Listenrand geklemmt.
- **Integration**: `suggestNext` und `adaptNextWeight` (`progression.ts`) bekommen optionalen Parameter `scale`; `inc`-Rundungen (`roundTo`, Floor/Cap, ±1-Rep-Pfad, Assisted: Unterstützung senken) laufen über die Helfer. `plannedDay.ts:54` und `Logger.tsx:188` geben `overrides[id]?.weightScale` durch. `warmup.ts` `stepsToSets` rundet Aufwärmsätze auf dieselbe Skala (Floor `MIN_LOAD` bleibt). Plan-Generator/Swap unverändert.
- **lb-Anzeige**: Editor zeigt/erfasst in der Anzeigeeinheit (`kgToDisplay`/`displayToKg`, `utils/units.ts`), gespeichert wird kg.

## UI
_Status: ✅ umgesetzt (Zeile, `WeightScaleSheet`, `WeightListSheet`, Icon `scale`, Strings in `de.exercise`)._

- `ExerciseDetail.tsx` (Gruppe „Übungsspezifisch“, nach Pausentimer): `ListRow icon="scale"` (neues Icon in `components/icons.tsx`, Waage/Gewichtsscheibe als SVG-Pfad), Label „Gerätegewichte“, `value` = „Standard“ bzw. Zusammenfassung („0–250 kg · 5 kg“ / „2, 4, 6 … kg“), `action={de.common.change}`. Muster: Pausentimer-Zeile (`ExerciseDetail.tsx:82`), State + `saveExerciseOverride(id, { weightScale })`.
- Neue Sheets in `features/workouts/sheets.tsx` auf Basis `BottomSheet` (`components/ui.tsx:95`), Vorbild `RestOverrideSheet`:
  - `WeightScaleSheet` (Bereich): drei Felder Bereichsanfang / Bereichsende / Schrittweite (−/+ Stepper wie bisher, ggf. Zifferneingabe), Validierung (min < max, step > 0), Speichern, „Zurück zum Standard“ (`onSave(undefined)`).
  - `WeightListSheet` (Kurzhanteln etc.): Liste der Gewichte mit Löschen je Eintrag, **„+“ oben** zum Hinzufügen (z. B. 12,5), sortiert, keine Duplikate; „Zurück zum Standard“.
  - Auswahl je `ex.equipment` (dumbbell/kettlebell → Liste, sonst Bereich).
- Strings in `i18n/de.ts` unter `exercise` (+ Hint-Funktion).

## Tests (`engine.test.ts`, neuer `describe('Gerätegewichte')`)
_Status: ✅ umgesetzt (alle Punkte unten abgedeckt, 158 Tests grün)._

- Range: Vorschlag liegt immer auf Raster (5-kg-Skala), Klemmen an min/max.
- Liste mit Lücken (…10, 12,5, 15): stepUp/Down, Rundung, kein Wert außerhalb der Liste.
- Assisted, Zeit-Übungen, Warm-ups unverändert bzw. auf Skala.
- Ohne Override identisch zum bisherigen Verhalten (Regression).

## Teil B: UI-Anpassungen (PLAN-5 Abschnitt 2–4)

### B1. „Ändern“ → „Bearbeiten“ ✅ umgesetzt
`de.common.change` in `i18n/de.ts:8` auf „Bearbeiten“ ändern (wirkt auf `WarmupSettings.tsx:27`, `ExerciseDetail.tsx:79,82` und die neue Zeile). Text „Zum Ändern auf Scheme wechseln“ (`WarmupSheet.tsx:40`) bleibt.

### B2. Dashboard „Letzte Rekorde“ ✅ umgesetzt
`Dashboard.tsx:167-173`: Segmented-Umschalter (Volumen / Wdh. / 1RM) nicht mehr volle Breite: Container `inline-flex`, `mx-auto`/linksbündig, Buttons `px-3 py-1 text-[11px]` statt `flex-1 py-1.5 text-xs`.

### B3. Plan-Wizard (`features/wizard/Wizard.tsx`, `pictos.tsx`) ✅ umgesetzt (Equipment als Kartenraster)
- **Frage über jeder Seite**: unter dem Header eine Frage als Überschrift (z. B. „Was ist dein Ziel?“, „An wie vielen Tagen willst du trainieren?“, „Wie viel Zeit hast du pro Training?“, „Welche Muskeln sollen Priorität haben?“ …), Texte in `i18n/de.ts` (`wizard.q.<step>`); `TITLES` bleiben als Header-Titel.
- **Icons**: `Option` (Wizard.tsx:31) bekommt `icon`-Prop (runder Icon-Badge links, Stil wie `ProgramBadge`). Neue Icons in `components/icons.tsx` (Einzeiler-SVG-Pfade): Ziele (Hantel/Muskel, Blitz, Kombi), Modus, Rep-Schema, Deload, Erfahrung, Zeit (Uhr in Abstufungen/Sanduhr), Daumen hoch/runter, Plus/Minus.
- **Ziel**: „Muskelaufbau“ → „Muskelhypertrophie“.
- **Trainingstage**: statt 5 Quadrate eine zentrierte große Zahl, links/rechts runde −/+ Buttons, darunter „Mal pro Woche“. Min 2, Max 6, Button am Limit `disabled` + ausgegraut (`opacity-40`).
- **Split**: statt Icons passende Piktogramme (Mini-SVGs: Ganzkörper-Figur, Oberkörper/Unterkörper-Figur, Push/Pull/Legs) – Basis `MuscleThumb`/eigene Silhouetten, kein Fremd-Asset. Option „Keine Präferenz“ → „Automatisch“, Untertext „Wir wählen eine empfohlene Option für dich aus“ (Wert `none` bleibt intern).
- **Zeit**: je Option ein Uhr-/Sanduhr-Icon im App-Stil (Füllgrad wächst von „bis 20“ bis „über 120“).
- **Muskelfokus**: je Muskel Piktogramm (`MuscleThumb primary={[id]}`, 40 px) und statt Text-Chips zwei runde Buttons mit Daumen runter / Daumen hoch (aktiv = Akzent), Limit 5 wie bisher (`setFocus`).
- **Equipment** (Entscheidung offen, Vorschlag): komplette Neugestaltung als 2-spaltiges Raster großer Karten mit Icon (Langhantel, Kurzhantel, Kabel, Maschine, Smith, Kettlebell, Band, Körpergewicht), Mehrfachauswahl mit Häkchen, „Alles auswählen“-Schalter, mind. 1 aktiv.
- **Plan-Vorschau** (`Preview`, Wizard.tsx:210-284): pro Übung `ExercisePhoto` (wie `WorkoutPreview.tsx:80`, 56 px) links; darunter horizontal scrollbare Blöcke (`overflow-x-auto snap-x`), je Woche einer: Überschrift „Woche n“, darunter Sätze, Wdh.-Bereich, RIR. Berechnung wie `plannedDay.ts:34-58`: `weekPlan(config, w)` + `shiftRange`/`effectiveSets`/`effectiveRir` (`periodization.ts`) für alle Wochen des Blocks (4 + ggf. Deload; Zeitübungen fester Bereich). Neue reine Hilfsfunktion `weeklyOverview(pe, config, ex)` in `engine/periodization.ts` mit Test.

## Verifikation
_Status: Typecheck, Tests und Build ✅; Sheet im Dev-Server geöffnet. Nicht manuell geprüft: Speichern, Vorschläge im Workout, Bereichs-Sheet, Backup Export/Import._

`npm run typecheck && npm test && npm run build`; im Dev-Server (Port 5173): Übung öffnen → Übungsspezifisch → Gerätegewichte → Ändern, Werte speichern, Workout starten und prüfen, dass vorgeschlagene Gewichte auf der Skala liegen; Backup Export/Import behält Einstellung.
