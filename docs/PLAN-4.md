# PLAN-4: Logger-Überarbeitung, Warm-up-System, mehrere Programme

Stand dieser Session. Ergänzt `PLAN-1.md` bis `PLAN-3.md`. Alles läuft lokal, keine Netzwerkaufrufe.

## 1. Kleine Fixes

| Thema | Umsetzung |
|---|---|
| Dashboard-Scroll | `App.tsx` (`Shell`): Scrollposition pro Pfad merken, bei Navigation `POP` (Zurückwischen) wiederherstellen, sonst nach oben. Nachziehen bis zu 60 Frames, weil Inhalt async aus Dexie lädt. |
| Notch-Blur | Dashboard-Kopf mit `env(safe-area-inset-top) + 10px` Abstand. Auf dem Gerät noch zu prüfen. |
| Wochenkalender | Nur Tage mit geloggten Sessions (`sessionDates`), Markierung als 2-px-Ring statt Füllung. Rest-Day abhaken ändert den Kalender nicht (`markSlot(..., null)`). |

## 2. Kurzhantel-Volumen

- `engine/stats.ts`: `isPerSide(ex)` (Equipment `dumbbell`, Ausnahme `db-pullover`) und `volumeFactor(ex)` (2 bzw. 1).
- Gewicht und Wdh. werden je Seite gespeichert. Volumen (`totalVolume`, `bestSetVolume`, Muskel-Volumen, Recent Records) zählt ×2. 1RM und Heaviest bleiben je Hantel.
- Satztabelle: Kopf `kg/side` und `reps/side` bei diesen Übungen.

## 3. Plan-Generator

- Mindestens 3 Sätze für Verbundübungen, 2 für Isolation. Ab 5 Sätzen zwei Übungen.
- Wiederholungs-Rollen (`engine/periodization.ts`, `baseRepRange(goal, compound, role)`), bis zu 2 Hauptübungen pro Tag:

| Ziel | Haupt | weitere Verbund | Isolation |
|---|---|---|---|
| Kraft | 3–6 | 5–8 | 8–12 |
| Beides | 4–6 | 6–10 | 10–15 |
| Hypertrophie | 6–10 | 8–12 | 10–15 |

- Ohne Historie wird die Untergrenze des Bereichs vorbelegt. Danach passt die regelbasierte Double Progression Gewicht und Wdh. an (kein Machine Learning).
- Alte Programme behalten ihre gespeicherten Bereiche.

## 4. Warm-up-System (`engine/warmup.ts`)

**Studienlage:** Ein spezifisches Aufwärmen hilft teils leicht, teils gar nicht, am ehesten bei Lasten nahe am Maximum (Systematic Review Ribeiro et al., Motricidade 2021). Zu Satzzahl und Prozenten gibt es keinen Konsens und keine Formel. Alle Regeln sind Praxis-Heuristiken.

**Modi** (App-weit `Settings.warmupMode`: `smart` | `scheme` | `off`, pro Übung überschreibbar: Default, Smart, Scheme, None):
- **Smart:** maximal 3 Sätze. Verbund: 3 bei Intensität ≥ 0,78 (aus Ziel-Wdh. und RIR), sonst 2. Isolation: 2. Muskel schon belastet (`freshnessFor`): teilweise = −1, voll = −2 (Isolation 0). Stange (20 kg) bzw. Smith (15 kg) als Untergrenze, keine Doppelten. Core, Bodyweight, Band: keine.
- **Scheme:** Standard je Kategorie (`Settings.warmupSchemes`), alle fünf Default-Gruppen 40 % × 5, 60 % × 5, 80 % × 3. Editierbar, Reset Scheme.
- Smart ist per Default an und gilt für alle Programme. Ein Update pro Programm ist nicht nötig.

**Speicherung:** `kv['exerciseOverrides']` (`warmupMode`, `warmupScheme`, `note`, `restSeconds`), Teil des Backups. `getSettings` migriert alte `warmupsEnabled: false` auf `warmupMode: 'off'`.

## 5. Logger

- Flache Satztabelle ohne Box, Ziel-Header entfernt, kleiner Timer, Menü-Icon.
- Aktionsleiste: Info (Buch-Icon), Warm-up, Note.
- **Set Calculator** (Warm-up-Sheet): Smart (nur lesbar) / Scheme (editierbar, Änderung gilt für die Übung). Berechnet nicht abgehakte Aufwärmzeilen neu.
- **Notizen** (300 Zeichen, Zähler): Session (`Session.notes`), Exercise (`ExerciseOverride.note`), Programm (`kv['programNotes']`, Schlüssel `programId:exerciseId`). Vorhandene als Boxen unter der Tabelle.
- **Menü:** Pause/Resume, Minimize, Finish, Discard. Finish fragt „Log only Completed Sets“ oder „Log All Sets“.
- **Complete-Sheet** mit Muskelfigur, Dauer, Sätzen, Volumen und Konfetti, sobald alle Übungen fertig sind.
- **Keep Alive** (Einstellungen › Workouts › Display): echter Screen Wake Lock, solange ein Workout läuft und nicht pausiert ist. Default aus.
- **RIR-Anpassung** (`adaptWeight`, `engine/progression.ts`): Beim Abhaken eines Arbeitssatzes bekommen offene, nicht von Hand geänderte Folgesätze ein neues Gewicht aus dem 1RM-Schätzwert (tatsächlicher RIR, Wdh., Gewicht), begrenzt auf ±10 %. Gilt auch bei geändertem Gewicht oder geänderten Wdh. Erst beim Abhaken, nicht beim Tippen. `Row.manual` schützt eigene Eingaben.
- Rest-Timer nutzt die Übungs-Überschreibung (`restSecondsFor(..., override)`).

## 6. Mehrere Programme (Workouts-Seite)

- Oben „Active Program“ mit Week-Button, darunter „Workouts Library“ mit Expand/Collapse.
- Ein neu erstelltes Programm überschreibt das alte nicht mehr, das alte erscheint in der Library.
- Aufgeklappt sieht ein Library-Programm aus wie das aktive (mit Rest Days, ohne Checkboxen). Ein Tipp öffnet die Vorschau, von dort lässt sich ein einzelnes Workout starten.
- Route-Parameter: `s<i>` (Slot), `d<i>` (Zusatz-Workout), mit Präfix `p<id>-` für ein bestimmtes Programm (`useProgramByParam`). Library-Programme nutzen die höchste erreichte Woche, den Wochenstand ändern sie nicht.
- `activateProgram` rekonstruiert den Wochenstand aus den Sessions. `deleteProgram` setzt bei Bedarf das letzte Programm aktiv.

## 7. Übungsseite und Einstellungen

**Bibliothek › Übung** (`features/more/ExerciseDetail.tsx`):
- General: Info (öffnet Instructions/Details/History), Exercise Note.
- Exercise Overrides, jeweils mit Sub Header „Default“ bzw. dem überschriebenen Wert:
  - Warm-Up Scheme (Unterseite, Override-Button, Zurück zum Default)
  - Warm-Up Automation (nur über Edit; Default, Smart, Scheme, None mit Icons)
  - Rest Timer (nur über Edit; Wert überschreiben)

**Einstellungen › Workouts:** General (Pause, Aufwärmen), Display (Keep Alive).
**Einstellungen › Aufwärmen:** Warm-Up Automation (Edit) und Warm-Up Scheme, das eine Seite „Scheme“ hereinschiebt: fünf Gruppen in einer Box mit eingerückten Trennlinien, je ein Edit-Button, darunter Reset Scheme (roter Text auf grauem Grund).

**Neue Icons** (`components/icons.tsx`): `guide`, `note`, `menu`, `pause`, `play`, `minimize`, `flag`, `trash`, `check`, `chevron`, `blocks` (Scheme), `automation`, `sparkles` (Smart), `sliders` (Default), `ban` (None), `phone`.

## 8. Neue und geänderte Dateien

- Neu: `features/workouts/sheets.tsx`, `WarmupSheet.tsx`, `LoggerSheets.tsx`, `features/more/WarmupSettings.tsx`, `ExerciseDetail.tsx`.
- Umgebaut: `Logger.tsx`, `SetTable.tsx`, `WorkoutHeader.tsx`, `Workouts.tsx`, `WorkoutPreview.tsx`, `engine/warmup.ts`, `engine/plannedDay.ts`, `engine/planGenerator.ts`, `engine/periodization.ts`, `engine/stats.ts`, `db/db.ts`, `types.ts`.
- Tests: 99 in `engine/engine.test.ts` (Warm-up Smart/Scheme/Frische, Kurzhantel-Faktor, Rep-Rollen, Generator, `adaptWeight`).

## 9. Offen / zu prüfen

- Scroll-Wiederherstellung und Notch-Blur auf dem iPhone testen.
- Zurückwischen auf der Übungsseite schließt auch die Unterseite „Warm-Up Scheme“ komplett (der ‹-Button geht nur eine Ebene zurück).
- Keep Alive: Wake Lock braucht einen Browser mit Unterstützung (iOS ab 16.4).
- Vorlagenwerte für Smart-Prozente können auf Wunsch angepasst werden.
