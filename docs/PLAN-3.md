# Plan 3: Logger-Feinschliff, iOS-Safe-Area, Schwarz/Weiß-Design, Übungs-Medien

> Plan 1: `docs/PLAN-1.md`, Plan 2: `docs/PLAN-2.md`. Videos: `docs/IDEAS-VIDEOS.md`. Keine Commits ohne Auftrag (Nutzer committet selbst).

## Context
Handy-Test (iPhone, PWA auf Home-Screen) ergab: Übungsleiste im Logger folgt nicht, Workouts-Liste ist umständlich, Notch/Safe-Area und Sheets sind kaputt, Akzentfarbe Blau unerwünscht, Tab-Icons passen nicht zu More. Zusätzlich sollen Videos/Bilder/Texte aus `free-exercise-db-with-videos` in die App.

## Machbarkeit Medien-Repo (Ergebnis der Prüfung)
Gelesen: `/Users/antoniotroiano/IntellijProjects/private/free-exercise-db-with-videos`
- 317 Übungen (`data/exercises.json`, Einzeldateien in `data/exercises/`), **Englisch**. Pro Übung: `steps`, `formCues`, `commonMistakes`, `breathing`, `videos.{male,female}`, `thumbnails.{male,female}`.
- **Nur männlich (Entscheidung):** 290 Übungen mit Video, **191 MB** Full-HD-MP4 (Ø 0,7 MB) + 23 MB JPG-Poster = ~214 MB Original. Die 600 MB waren beide Geschlechter. Davon sind 57 Dehnübungen und 13 Cardio, ~220 echte Kraft-/Körpergewichtsübungen. Dateiname = Slug (z. B. `barbell-bench-press.mp4`).
- **Verkleinern: ja, und auf dem Handy sieht man keinen Unterschied.** Video auf 360p (Breite ~480 px), H.264, ohne Ton → ca. 80–150 KB je Video, **alle 290 ≈ 25–45 MB**, nur Mapping-Treffer entsprechend weniger. Poster 320 px WebP ≈ 10 KB → ~3 MB.
- **Problematisch?** Technisch nicht. Die Risiken sind: (1) Aufbereitung nötig (ffmpeg), (2) iOS braucht Range-Requests im Service Worker, (3) Lizenz/Herkunft: Repo ist MIT, die Videoherkunft aber nicht belegt; bei privater Nutzung ok, bei öffentlicher GitHub-Pages-Seite selbst abwägen, (4) Mapping-/Übersetzungsaufwand.
- Lizenz MIT (Repo), Nennung im About nötig. Herkunft der Videos ist aus dem Repo nicht belegbar, GitHub Pages ist öffentlich: für private Nutzung unkritisch, bei öffentlicher Verbreitung selbst abwägen.
- **Ja, machbar, aber nur mit Aufbereitung:** 600 MB Originale sind für eine PWA unbrauchbar. `ffmpeg` ist **nicht installiert** (`brew install ffmpeg` nötig, braucht dein OK). 
- **Mapping ist der Aufwand:** Unsere IDs (`bb-bench`) ≠ Repo-Slugs, Sprache verschieden. Es braucht eine kuratierte Tabelle. Gut abgedeckt: Lang-/Kurzhantel, Kabel, Maschinen, Klimmzüge, Dips, Curls, Trizeps. Kaum/gar nicht: Band, Kettlebell, Nacken, Serratus, Tibialis, viele Smith-Varianten → dort bleibt das eigene Piktogramm als Fallback. Grob geschätzt etwa die Hälfte der ~250 Übungen; genaue Zahl liefert das Mapping-Skript.
- Videos sind vorerst ausgeklammert (Ideen-Datei, Etappe 6); jetzt nur Poster-JPGs.
- Hinweis: CLAUDE.md verbietet bisher fremde Assets/Texte. Das ist hier bewusste Entscheidung des Nutzers → CLAUDE.md anpassen (Ausnahme "Übungsmedien aus free-exercise-db-with-videos, MIT").

## Etappe 1: Workouts, Logger, Vorschau (kleine UI-Änderungen)
1. **Übungsleiste folgt** (`features/workouts/ExerciseStrip.tsx`): Refs pro Button, bei Wechsel von `current` `scrollIntoView({ inline: 'center', behavior: 'smooth' })`. Inaktive: `opacity-40 grayscale`, aktive voll + Rahmen. Erledigt: dunkler Schleier (`bg-black/50`, gerundet) mit weißem ✓ mittig über dem Bild (statt kleinem Badge).
2. **Header-Checkbox** (`SetTable.tsx` + `Logger.tsx`): letzte Header-Spalte wird Checkbox (an = alle Sätze erledigt, Zwischenzustand bei teilweise). Klick setzt alle Zeilen auf done bzw. wieder zurück. Neuer Handler `toggleAll` neben `toggleDone` (Logger.tsx:119): gleiche Auto-Weiterschaltung zur nächsten Übung bei Komplettierung, **kein** Pausen-Timer beim Sammelabhaken.
3. **Workouts-Liste** (`Workouts.tsx`): "Öffnen"-Button entfällt. Ganze Karte klickbar → `/workout-preview/s{i}` (auch bei "Zusätzliche Workouts"). Rechts Radio-Kreis wie beim Rest Day (leer / gefüllt mit ✓ wenn geloggt); Klick darauf geht ebenfalls in die Vorschau. Ruhetag-Kreis bleibt Toggle.
4. **Target Muscles in der Vorschau** (`WorkoutPreview.tsx`): neue reine Funktion `targetMuscles(views)` in `engine/` (+ Test in `engine.test.ts`): pro primärem Muskel Anzahl Übungen und Summe `v.sets` (Cardio nie). Oberhalb der Übungsliste horizontal scrollende rechteckige Boxen: `MuscleThumb`-Piktogramm, Muskelname, "2 Übungen", "5 Sätze". Antippen markiert den Muskel: Übungskarten ohne diesen Muskel `opacity-40 grayscale`, erneutes Antippen hebt auf. Beschriftung zunächst "Target Muscles" (passt zu den englischen Tab-Labels der App), leicht auf Deutsch umstellbar.

## Etappe 2: iOS Notch, Safe-Area, Sheets
Ursachen (aus Code): `black-translucent` Statusleiste + `viewport-fit=cover`; `Page`-Header ist `bg-bg/90 backdrop-blur` → Inhalt scheint verschwommen durch den Notch-Bereich; `BottomSheet` hat **keine Schließgeste** (nur Backdrop-Tap, und der Backdrop-Streifen oben liegt im Notch) und ist `h-[92%]` über die Safe-Area hinaus.
1. Zuerst im **iOS-Simulator** reproduzieren (`mcp__Claude_Code_iOS_Simulator__control`, Safari/Home-Screen) und Screenshots vorher/nachher.
2. `index.css`/`index.html`: Statusleiste deterministisch machen (Empfehlung `apple-mobile-web-app-status-bar-style: black`, Inhalt beginnt unter der Leiste; falls Simulator Nachteile zeigt, bei `black-translucent` bleiben und feste, **deckende** Top-Fläche mit `env(safe-area-inset-top)` ergänzen). `theme-color`/Manifest-Farbe vereinheitlichen. Höhe via `100dvh` statt `100%`.
3. `ui.tsx` `Page`: Header **deckend** (`bg-bg`), Safe-Area-Padding innerhalb des deckenden Bereichs.
4. `BottomSheet`/`SlideOver`: Höhe `calc(100% - env(safe-area-inset-top) - 12px)`, sichtbarer ✕-Button, **Swipe-down-zum-Schließen** (Pointer-Events auf Griff + Titelzeile, Schwelle ~100 px, Rückfedern), Backdrop bleibt klickbar. Gilt damit auch für Übungs-Info aus "Übungen".
5. Untere Leiste: Abstand prüfen (Nav-Hintergrund vs. Body-Hintergrund im Safe-Bottom-Bereich, ggf. `bottom-0` + Padding statt Lücke), Suchfeld in `LibraryPage` nutzt `5.75rem + safe-area` → mitprüfen.

## Etappe 3: Schwarz/Weiß-Akzent, Icons, Dashboard-Ring
1. `index.css`: Akzent hell `#111827`-nahes Schwarz, dunkel fast Weiß; neue Variable `--accent-fg` (+ `--color-accent-fg` im `@theme`). Alle hartcodierten `text-slate-900` auf `bg-accent` (ui.tsx, Workouts, SetTable, ExerciseStrip, App …) per Suche auf `text-accent-fg` umstellen. Diagramme: neue Variablen `--chart-line` (Türkis, z. B. `#14b8a6` / dunkel `#2dd4bf`) und `--chart-bar` (Blaugrau, z. B. `#64748b`-Familie, dunkel heller) in `TimeSeries.tsx` und `widgets.tsx` (`MiniLine`, `MiniBars`). Kalenderfarben (`--habit-*`) und RIR-Farben bleiben. `--ring-sets` (aktuell Blau) auf Türkis, damit kein Blau übrig bleibt.
2. **Dark Mode**: Das dunkle Marineblau kann bleiben. Weißer Akzent, Türkis und Blaugrau harmonieren darauf gut. Wirkt es im Test zu bunt, wäre ein neutraleres Graphit nur eine Variablen-Änderung (nicht Teil dieses Plans).
3. **Tab-Icons** (`components/icons.tsx`, `App.tsx`): neue Linien-Icons `dashboard`, `calendar`, `more` im gleichen Stil wie die More-Icons; Workouts = vorhandenes `workouts`, Übungen = `library`. Tab nutzt `<Icon>` statt Emoji; auch die Emojis im "Hinzufügen"-Sheet auf Icons umstellen.
4. **Muskel-Ring**: Wahrscheinlich kein Rechenfehler, sondern Definition: `weekProgress.ts` zählt einen Muskel erst, wenn **alle** geplanten Sätze der ganzen Woche erledigt sind (Muskeln in mehreren Workouts bleiben lange bei 0). Erst per Test reproduzieren (neuer Test in `engine.test.ts`: ein Workout erledigt, Muskel nur in einem Workout vs. in zwei). Vorschlag: Muskel zählt als erledigt, sobald seine Sätze in den **bereits absolvierten** Workouts erfüllt sind, oder Ring als Satz-Anteil pro Muskel (Bruchteile). Wird nach Reproduktion mit dir abgestimmt, falls es doch ein echter Bug ist (z. B. falscher Session-Abgleich), wird er behoben.

## Etappe 4: Übungsbilder (nur JPG, männlich) und Abgleich der Übungsliste
Videos sind **ausgeklammert** (siehe `docs/IDEAS-VIDEOS.md` unten). An der Stelle, wo später das Video stehen soll, kommt zunächst das Poster-JPG.
1. Skript `scripts/build-media.mjs` (Quelle per Argument/ENV, **keine** Netzwerkzugriffe, reines Node, kein ffmpeg): kopiert die **männlichen** Poster der verwendeten Übungen nach `public/exercise-media/poster/<slug>.jpg` und schreibt `src/data/media/manifest.ts`. Bildgröße: Originale sind 1080p (~80 KB). Ohne ffmpeg kein Verkleinern; Ziel ~8 MB für ~100 Bilder ist ok. Falls zu groß, optional `sharp` (devDependency) für 480-px-WebP.
2. **Abgleich + Ergänzung** (`src/data/media/map.ts`, `data/exercises.ts`): A) kuratierte Tabelle `appExerciseId → repoSlug` (Test: IDs/Slugs existieren, keine Dubletten). B) Repo-Übungen ohne Treffer nur bei Sinn übernehmen (Kraft/Körpergewicht/Cardio-Geräte; **Dehnungen, Yoga, Pilates raus**) und als neue Zeilen in `exercises.ts` ergänzen: deutscher Name, Equipment/Muskeln (Repo-`target`/`secondaryMuscles` → unsere 22 IDs), Pattern/compound, deutsche Anleitung in `data/instr/*` (Test fordert sie). Vorher bekommst du die Kandidatenliste zum Streichen. Bestehende IDs/Daten bleiben unverändert.
3. `src/data/media/tips.ts`: deutsche Übersetzung von `formCues`, `commonMistakes`, `breathing` für Übungen mit Medien. Eigene Schrittanleitungen bleiben Basis; für neue Übungen werden Repo-`steps` übersetzt.
4. About-Seite + `THIRD_PARTY.md`: MIT-Hinweis und Quelle (Repo `free-exercise-db-with-videos`, MIT, Autor siehe LICENSE). CLAUDE.md: Ausnahme "Übungsbilder/-texte aus free-exercise-db-with-videos (MIT)" ergänzen.
5. PWA: Poster werden vorgecacht (klein), keine weitere Service-Worker-Arbeit nötig.
6. Lizenz-Hinweis: Repo ist MIT, Herkunft der Medien nicht belegt. Für private Nutzung unkritisch; bei öffentlicher GitHub-Pages-Seite selbst abwägen.

## Etappe 5: Bilder in der UI
- `components/ExerciseMedia.tsx`: `ExercisePhoto` (Poster, `loading="lazy"`, Fallback `ExerciseThumb`).
- `ExerciseInfoSheet` Tab **Instructions**: Poster oben (Platzhalter für späteres Video), darunter Schritte, "Tipps", "Häufige Fehler", "Atmung". Tab **Details** unverändert (eigene Piktogramme).
- `WorkoutPreview`-Übungsliste: Poster statt Piktogramm. Target-Muscles-Boxen bleiben Piktogramme.
- Logger-`ExerciseStrip`: Poster (mit Grau/Schleier-Logik aus Etappe 1), Piktogramm als Fallback.
- Bibliothek-Liste und Wizard bleiben bei Piktogrammen (nicht genannt, leicht nachziehbar).

## Etappe 6: `docs/IDEAS-VIDEOS.md` (Ideen-Datei, keine Umsetzung)
Wird als eigenständige Übergabe an eine spätere Session geschrieben. Inhalt: Ziel; Ergebnis der Repo-Prüfung (290 männliche Videos = 191 MB Full-HD, Ø 0,7 MB; 57 Dehnungen, 13 Cardio; weiblich zusätzlich 303 Videos/405 MB); Plan zur Verkleinerung (ffmpeg per `brew install`, 360p, H.264, ohne Ton, `+faststart` → 80–150 KB, alle ≈ 25–45 MB); Einbau (`ExerciseVideo`: `muted loop playsInline preload="metadata"`, Poster, Tippen = Pause/Weiter, Laden erst im geöffneten Sheet, an der Stelle des Posters); PWA-Caching (MP4 nicht precachen, Runtime-`CacheFirst` mit `workbox-range-requests` weil iOS-Safari Range braucht, Limit ~60 Einträge); Risiken (Lizenz/Herkunft, Git-Größe, iOS-Wiedergabe); optional weibliche Medien mit Einstellung `mediaGender`; Hinweis auf bestehendes Mapping aus Etappe 4; Verifikation im iOS-Simulator.

## Verifikation
- `npm run typecheck && npm test && npm run build` nach jeder Etappe.
- Preview-Server (`npm run dev`): Logger-Leiste scrollt/dimmt/Schleier, Header-Checkbox, Workouts-Karten, Target-Muscles-Filter, Sheets schließen per Swipe/✕, Dark/Light, Mobile-Viewport.
- iOS-Simulator: Notch/Safe-Area oben und unten, Sheet-Schließen, Video-Wiedergabe (Range), Offline-Verhalten der Poster.
- Medien: Größe von `public/exercise-media` prüfen (Ziel < 10 MB), Tests zu Mapping, neuen Übungen (eindeutige IDs/Namen, Anleitung vorhanden, Mindestabdeckung pro Muskel).

## Offene Entscheidungen (mit Standard)
- Medien: nur männlich (entschieden).
- Beschriftung "Target Muscles" vs. deutsch "Zielmuskeln".
- Radio-Klick führt in die **Vorschau** (nicht direkt in den Logger).
