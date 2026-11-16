# Idee: Übungsvideos einbauen (zurückgestellt)

> Übergabe-Dokument für eine spätere Session. Voraussetzung: Plan 3 (`docs/PLAN-3.md`) Etappe 4/5 ist umgesetzt, also Poster-JPGs, Mapping `appExerciseId → repoSlug` (`src/data/media/map.ts`) und `ExercisePhoto` existieren. Das Video ersetzt dann das Poster an derselben Stelle (Info-Sheet, Tab "Instructions", oben).

## Ziel
Im Übungs-Info-Sheet zuerst ein kurzes Demo-Video (pausier- und fortsetzbar), darunter die Textanleitung. Details-Tab bleibt bei den eigenen Muskel-Piktogrammen.

## Quelle
Lokales Repo `/Users/antoniotroiano/IntellijProjects/private/free-exercise-db-with-videos` (MIT, Autor siehe `LICENSE`). Quelle ist nur lokal zu lesen, die App macht **keine** Netzwerkzugriffe zur Laufzeit (die Repo-Daten verweisen auf `pub-…r2.dev`, das nicht verwenden).
- `data/exercises.json`: 317 Übungen, Englisch, mit `videos.{male,female}`, `thumbnails.{male,female}`, `steps`, `formCues`, `commonMistakes`, `breathing`.
- `videos/male/<slug>.mp4`: 290 Dateien, **191 MB** gesamt (Ø 0,7 MB), Full-HD. Davon 57 Dehnübungen (`stretching-*`) und 13 Cardio.
- `videos/female/`: 303 Dateien, 405 MB (nur falls später gewünscht).

## Verkleinern (Handy braucht keine Full-HD)
`ffmpeg` ist nicht installiert: `brew install ffmpeg` (Nutzer-OK einholen). Beispiel:
```bash
ffmpeg -i in.mp4 -an -vf "scale=480:-2" -c:v libx264 -crf 30 -preset slow -movflags +faststart out.mp4
```
Erwartung 80–150 KB je Video, alle 290 ≈ 25–45 MB, nur gemappte Übungen entsprechend weniger. Stichprobe auf Qualität prüfen (ggf. `crf 28` oder 540 px Breite). Ein Skript `scripts/build-video.mjs` (Quelle per Argument, idempotent) schreibt nach `public/exercise-media/video/<slug>.mp4` und ergänzt das Manifest.

## Einbau
- Komponente `ExerciseVideo` in `components/ExerciseMedia.tsx`: `<video muted loop playsInline preload="metadata" poster=…>`, Antippen = Pause/Weiter (Play-Overlay), Laden erst, wenn das Sheet offen ist. Fallback: `ExercisePhoto`.
- Autoplay nur stumm und inline (iOS-Pflicht), nie mehrere Videos gleichzeitig.

## PWA / Offline
- MP4 **nicht** precachen (`globPatterns` ohne `mp4`).
- Runtime-Cache `CacheFirst` für `/exercise-media/video/` mit `workbox-range-requests` (iOS-Safari fordert Range-Requests, sonst spielt das Video nicht ab) und `CacheableResponse` auf Status 200/206-sicher, Limit ca. 60 Einträge.
- Optional später: Button "Videos offline laden".

## Risiken
- Lizenz/Herkunft: Repo ist MIT, die Herkunft der Videos ist nicht belegt. Privat unkritisch, bei öffentlicher GitHub-Pages-Seite selbst abwägen. MIT-Hinweis in About und `THIRD_PARTY.md`.
- Git-Größe: 25–45 MB Binärdateien im Repo (kein LFS nötig, aber Historie wächst; Änderungen am Encoding vermeiden).
- iOS-Wiedergabe unbedingt im Simulator/auf dem iPhone testen (Range, `playsInline`, Low-Power-Mode blockiert Autoplay).

## Optional: weibliche Videos
Einstellung `mediaGender` ('male' | 'female') in `Settings`, Fallback aufs andere Geschlecht, wenn eins fehlt. Verdoppelt die Datenmenge (~+30–50 MB). Backup (`exportAll`) und Settings-Default mitpflegen.

## Verifikation
`npm run typecheck && npm test && npm run build`; Größe von `public/exercise-media`; im iOS-Simulator Video starten, pausieren, fortsetzen, Sheet schließen (Video stoppt), Offline-Test nach erstem Abspielen.
