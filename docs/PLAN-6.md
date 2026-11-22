# PLAN-6: Erneuter Abgleich mit der MacroFactor-Workouts-Doku

Stand: 2026-11-22. Ergänzt PLAN-1 bis PLAN-5 und `REVIEW-2026-11-21.md`. Reine Analyse, nichts davon ist umgesetzt.

## Status und Arbeitsweise (zuerst lesen)

**Für jede Session, die eine Aufgabe aus diesem Plan übernimmt:**
1. Diese Checkliste lesen, eine Aufgabe mit `[ ]` wählen, die nicht `[~]` (in Arbeit) ist. Reihenfolge siehe Abschnitt 4, Abhängigkeiten in der Spalte „Hinweis“.
2. **Vor dem Start** `[ ]` → `[~]` setzen und Datum eintragen, damit keine zweite Session dasselbe beginnt.
3. Umsetzen laut Abschnitt 1/2 (Detailbeschreibung unter der jeweiligen ID) und Abschnitt 5 (Tests). Vor dem Abschluss `npm run typecheck && npm test && npm run build`.
4. **Nach dem Abschluss** `[~]` → `[x]`, Datum und eine kurze Notiz (Dateien, Abweichungen vom Plan, offene Punkte) eintragen. CLAUDE.md um die neue Invariante ergänzen, wie bei früheren Plänen.
5. Nicht committen, außer der Nutzer verlangt es.

Legende: `[ ]` offen · `[~]` in Arbeit · `[x]` erledigt · `[-]` bewusst nicht umsetzen.

### Checkliste

**Hoch**
- [ ] **B2** Workout-Verlauf ansehen/bearbeiten/löschen, Datum und Dauer ändern, Workout nachtragen (inkl. **B10**). Hinweis: zuerst, Engine-Konsistenz (`historyUpTo`, Wochenstand) testen. Notiz: –
- [ ] **B1** Übung tauschen und entfernen im Logger und Programm. Hinweis: zusammen mit A4. Notiz: –
- [ ] **A4** Schalter „Im Programm übernehmen / nur heute“. Hinweis: nach oder mit B1. Notiz: –
- [ ] **A1** Begründung (`reason`) und Warnstufe (`level`) der Progressionsvorschläge. Hinweis: unabhängig, parallel möglich. Notiz: –
- [ ] **B3** Eigene Übungen anlegen, duplizieren, löschen. Notiz: –
- [ ] **B4** Programm verwalten (Umbenennen, Duplizieren, Archiv, Blocklänge/Deload nachträglich, Übung auf anderen Tag verschieben, Programm-Ende). Notiz: –
- [ ] **B5** Auto-Weiter zur nächsten Übung (`Settings.autoAdvance`). Notiz: –

**Mittel**
- [ ] **B7** Dashboard-Ringe: Umschalter „Aktives Programm / Alle“ und Vorwoche. Notiz: –
- [ ] **A5** Gerätestufen: mehrere Bereiche und Mikro-Stufen im Editor (Liste wird erzeugt). Notiz: –
- [ ] **B12** Pausentimer-Ton (schaltbar). Notiz: –
- [ ] **B8** Gewichts-Trend (geglättet), Körpergewichtsanteil nutzt Trend. Notiz: –
- [ ] **B9** Export: Programm/Workout als JSON, Sessions als CSV. Notiz: –
- [ ] **B11** Tausch/Targets pro Satz in der Sitzung prüfen (Rest von B11 nach B1). Notiz: –
- [ ] **A9** „Auf alle Übungen des Tages anwenden“ im WeekTargetSheet. Notiz: –
- [ ] **B6** Gym-Profile (nur bei Bedarf). Notiz: –

**Niedrig / optional**
- [ ] **A6** Grundlast je Übung (`baseLoad`). Notiz: –
- [ ] **A7** Teilwiederholungen als RIR 0 in der Progression (erst entscheiden). Notiz: –
- [ ] **B14** Fortschrittsfotos · [ ] **B15** Schritte · [ ] **B16** Periode · [ ] **B17** Dashboard/Shortcuts anpassen · [ ] **B18** Sektionen/Workout-Archiv · [ ] **B21** Maße-Vergleichsansicht · [ ] **B22** Übungsinfo-Metadaten

**Entschieden: nicht umsetzen**
- [-] **A2** Startgewicht ohne Historie: bleibt wie bei MF (kein Vorschlag), Entscheidung des Nutzers vom 2026-11-22.
- [-] **A8, A10, B13, B19, B20**: bereits abgedeckt bzw. in B4 enthalten, kein eigener Auftrag.

## 0. Vorgehen und Grenzen

- Quelle: alle 125 Artikel der Collection „MacroFactor Workouts“ (help.macrofactorapp.com, Collection 20). Alle wurden gelesen (Dashboard, Programs, Workout Logging, Exercises, History, Body Metrics, Settings, FAQ und die Artikel ohne sichtbare Überschrift). Nicht gelesen: Abo-/Konto-/Support-Artikel (Refund, Passwort, E-Mail, Sign-out, Account löschen, GrapheneOS, Internet, Abos, Tipps für Fotos/Maße, Force Sync, Dark Mode), sie haben keinen Funktionsbezug.
- Die Doku beschreibt Bedienung und Grundregeln, **keine Formeln oder Schwellen**. Wo unten „MF macht X“ steht, ist das die Aussage der Doku. Wie MF intern rechnet, ist unbekannt.
- Unser Stand: `CLAUDE.md`, `src/types.ts`, `engine/*` (Progression, Periodisierung, Wochenzyklus, Stats), `features/*`. Die Lücken-Liste (Abschnitt 2) habe ich im Code per Suche bestätigt: kein Treffer für Verlauf-Bearbeiten, Tauschen im Logger, Duplizieren, Archivieren, Gym-Profile, Eigene-Übung-Anlage, Weight Trend. `npx vitest run`: 248 Tests grün.
- Eigenentwicklung bleibt: Funktionen werden nach Idee nachgebaut, nicht Texte oder Formate übernommen (z. B. kein .xlsx-Format von MF).

## 1. Algorithmen: was fehlt oder besser sein könnte

Unsere Progression ist an den meisten Stellen **genauer** als das, was MF dokumentiert (e1RM-Rechnung, Weight Match, Bereichserweiterung, Körpergewichtsanteil, Trainingspause, Plateau-Reset, Seiten getrennt). Folgende Punkte bleiben.

| # | Thema | MF (Doku) | Unser Stand | Empfehlung |
|---|---|---|---|---|
| A1 | **Begründung der Empfehlung** | Zauberstab am Satz: blau = Hinweis, gelb = „bitte prüfen“ (große Gewichts-/Wdh.-Änderung), rot = Gerät im Profil fehlt. Antippen zeigt das Warum. | `progressionNote.ts` kennt nur `extend`/`gap` (Gerätestufen). Keine Begründung bei normalen Vorschlägen, keine Warnstufe bei auffälligen Sprüngen. | **Hoch.** `Suggestion` um `reason` (Code) und `level` (`info`/`check`) erweitern: z. B. „RIR niedriger als Ziel → Gewicht gehalten“, „e1RM +x % → Gewicht +1 Stufe“, „nach 5 Wochen Pause gedeckelt“, „Plateau-Reset“. Gelb, wenn Gewichtsänderung > 10 % oder Wdh.-Sprung > 3 gegenüber der letzten Einheit. Anzeige als Sheet im Logger (Tipp auf die Vorschlagszeile). Rein Engine + Test, geringes Risiko. |
| A2 | **Startgewicht ohne Historie** | Gibt bewusst keine Empfehlung („nimm konservativ, schrittweise steigern“). | Ebenso: `weight: null`, nur Wdh.-Untergrenze. | **Entscheidung des Nutzers (2026-11-22): bleibt wie bei MF, kein Vorschlag aus verwandten Übungen. Nicht umsetzen.** |
| A3 | **Übungstausch und Historie** | Neue Übung startet ohne Daten, alte Daten bleiben sichtbar. | Tausch nur im Wizard (`swapPlanned`), kein Tausch im Logger/Programm (siehe B1). Verlauf der Ersatzübung beginnt bei null. | Wie MF: Ersatzübung startet ohne Historie und ohne Gewichtsvorschlag. Wird mit B1 erledigt. |
| A4 | **Satz-/Reps-Änderung nur für eine Sitzung** | „Update Program“-Schalter: Änderungen (Tausch, Sätze, Übung hinzu/weg) gelten nur heute **oder** dauerhaft. | Logger schreibt Änderungen sofort in den Trainingstag (`Logger.tsx` Supersatz-Link direkt, hinzugefügte Übungen beim Speichern). Es gibt kein „nur heute“. | **Mittel.** Schalter „Im Programm übernehmen“ (Standard: an wie heute) im Workout-Menü. Hinzugefügte Übungen sind schon „nur wenn trainiert“, Supersatz-Links und künftiger Tausch/Entfernen brauchen die Unterscheidung. |
| A5 | **Gerätestufen: mehrere Bereiche + Mikro-Stufen** | Weight-Stack-Bereiche pro Maschine (z. B. 5 kg-Schritte 15–25, 10 kg 25–55, 15 kg 55–190), Mikro-Anpassungen (Dial, Pin, externe Scheiben), Foto-Scan. Gym-Profil bündelt das. | `WeightScale`: `range` mit **einer** Schrittweite oder freie `list`. Mikro-Stufen nur über Liste. | **Mittel, kleine Änderung.** Engine bleibt (Liste kann alles). Editor erzeugt die Liste aus mehreren Bereichen plus optionalen Mikro-Stufen (z. B. +1,25 kg). Kein Foto-Scan (wäre KI/Netz). Mit B6 verbinden, wenn Gym-Profile kommen. |
| A6 | **Startwiderstand / Grundlast** | Maschinen und Körpergewichtsübungen können eine Grundlast (z. B. 10–15 %) mitzählen, davon kommen krumme Werte wie 88,5. | `Exercise.bodyweight` nur für Körpergewichtsübungen. Smith-/Schlittenstange zählt nirgends. | **Niedrig.** Optionales `ExerciseOverride.baseLoad` (kg), das in Last/Volumen/Warm-up zählt, gespeichert wird nur die Zuladung. Nur umsetzen, wenn der Nutzer Smith/Beinpresse-Schlitten sauber vergleichen will. |
| A7 | **Teilwiederholungen** | `F`/`P` am Satz, „hilft Smart Progression, Ermüdung einzuordnen“. | `partial` nur Protokoll. | **Niedrig.** Sinnvolle, einfache Regel: Satz mit Teilwdh. nach vollen Wdh. gilt für die Progression als RIR 0 (wurde bis Versagen gegangen). Vorher entscheiden, ob das gewollt ist, sonst Protokoll belassen. |
| A8 | **Myo-Defaults** | Aktivierungssatz bei ca. 1–2 RIR, Pausen 10–20 s, meist 2–3 Mini-Sätze; Drop meist nur letzter Satz. | `nextSegment` Drop −20 %, Myo ⅓ Wdh., `MYO_REST_SEC`. | Passt (`MYO_REST_SEC` = 15 s, im Bereich 10–20 s). |
| A9 | **Zeitliche Periodisierung pro Übung bearbeiten** | Speicherumfang beim Ändern: nur dieser Zyklus / alle Zyklen der Übung / alle Übungen des Tages / alles. | `WeekTargetSheet`: „In jedem Block“ (`b`) bzw. „nur diese Woche“ (`w`), nur je Übung. | **Niedrig.** „Auf alle Übungen des Tages anwenden“ als Schalter im Sheet. |
| A10 | **Blocklänge/Zyklen nach dem Anlegen** | 1–52 Zyklen, Deload am Anfang/Ende nachträglich änderbar, Programm-Ende: „Block wiederholen“ oder „abschließen“. | `blockWeeks` und `deloadFirst` nur im Wizard. Programm läuft endlos weiter. | Siehe B4 (Programm-Einstellungen). |

**Bewusst anders als MF, kein Handlungsbedarf:** Plateau-Reset (MF nennt keinen), Detraining-Deckel (MF: „kann angepasst werden“), harter Satz zuerst (bei uns schaltbar, MF fest), Folgesatz-Anpassung nach RIR (adaptNextSets), Körpergewichtsanteil mit Gesamtlast-Progression, Links/Rechts mit schwächerer Seite für die Progression, Verlauf-Import (MF kann keinen Import).

## 2. Funktionen, die MF hat und uns fehlen

Aufwand: S = Stunden, M = ein Tag, L = mehrere Tage. Nutzen für die Einzelnutzung (lokal, eine Person).

### 2.1 Hoch (echte Lücken im Trainingsalltag)

| # | Funktion | MF | Bei uns | Aufwand | Skizze |
|---|---|---|---|---|---|
| B1 | **Übung tauschen und entfernen im Logger und im Programm** | „Swap“ mit Smart Substitutions (gleiches Muster/Muskel, Gym-Profil), „Remove from workout“, im Programm „Swap“ und „Entfernen“. | Nur Hinzufügen (`ExerciseStrip` „+“). Tausch nur im Wizard. Kein Entfernen im laufenden Workout. | M | `alternatives()`/`swapPlanned()` aus `swap.ts` wiederverwenden (inkl. `neverRecommend`). Aktionsleiste im Logger: Tauschen, Entfernen. Wochenziele und Supersatz beim Tausch wie bisher verwerfen. Hängt mit A4 („nur heute/dauerhaft“) zusammen. |
| B2 | **Workout-Verlauf: ansehen, bearbeiten, löschen, Datum/Dauer ändern** | Workout History; Sätze, Gewicht, Wdh., RIR nachträglich ändern; Startzeit und Dauer editieren; Satz löschen. | Sessions werden nur geschrieben. Kein Verlaufsscreen, kein Bearbeiten/Löschen (nur Import erzeugt Sessions). Falsch geloggte Sätze bleiben für immer in e1RM und Progression. | M–L | Neue Seite `/history` (Liste nach Datum, Detail je Einheit). Bearbeiten wiederverwendet die Satztabelle des Loggers (`SetTable`) auf einer gespeicherten Session. Speichert über `db.sessions.update`. Löschen setzt bei Programm-Einheiten den Slot nicht zurück (oder fragt). Dauer/Startzeit/Datum als Felder. Unbedingt Engine-Tests (Datum ändern verändert `historyUpTo`). **Wichtigste Einzellücke.** |
| B3 | **Eigene Übungen anlegen, duplizieren, löschen** | Name, Metrik (Wdh./Zeit/Distanz), Typ, Laterality, Primär-/Sekundärmuskeln (P/S), Equipment oder Körpergewicht + Anteil, „Duplizieren“ als Vorlage, „Löschen“. | Tabelle `customExercises` und `useAllExercises()` existieren, aber **keine UI zum Anlegen**. Übungen nur aus `exercises.ts`. | M | Formular als BottomSheet im Übungen-Tab (`LibraryPage`). Felder entsprechen `Exercise` (`primary`, `secondary`, `equipment`, `pattern`, `compound`, `metric`, `bodyweight`, `unilateral`, `assisted`, `load`). „Duplizieren“ in `ExerciseDetail`. Anleitung fehlt für Eigene (Test auf Vollständigkeit gilt nur für Standardübungen, prüfen). Backup deckt die Tabelle schon ab. |
| B4 | **Programm verwalten** | Zahnrad: Umbenennen, Duplizieren (Programm und einzelne Workouts), Archivieren/Wiederherstellen, Anzahl Zyklen, Deload am Anfang/Ende, Day Order, Übungen auf anderen Tag verschieben, Workouts umbenennen/archivieren, **Programm-Ende** („Block wiederholen“/„abschließen“). | Nur „Als aktiv setzen“ und „Löschen“. Programmname/Blockoptionen nach dem Wizard nicht änderbar. Kein Programm-Ende. | M–L | Programm-Einstellungen-Sheet (Name, Icon, Farbe, `blockWeeks`, `deload`, `deloadFirst`). Duplizieren: `saveProgram({...p, name})`. Archiv: `Program.archived` (neues Feld, Dexie-Version nicht nötig, da kein Index). „Verschieben auf anderen Tag“ im Vorschau-Menü. Programm-Ende: nach dem letzten Block Dialog „Block wiederholen / abschließen“ (Wochenzähler zurück auf 0 bzw. `active:false`). |
| B5 | **Auto-Weiter zur nächsten Übung** | Wechsel zur nächsten Übung nach dem letzten Satz, abschaltbar. | Nicht vorhanden (Wechsel manuell über `ExerciseStrip`, `selectExercise` wird nur beim Hinzufügen aufgerufen; Supersatz-Logik ausgenommen). | S | `Settings.autoAdvance` (Standard an), im Logger nach abgehaktem letzten Satz `selectExercise(nächste offene)`. |

### 2.2 Mittel (nützlich, weniger dringend)

| # | Funktion | MF | Bei uns | Aufwand | Skizze |
|---|---|---|---|---|---|
| B6 | **Gym-Profile** | Mehrere Studios/Home mit Ausstattung, Standardprofil, „Allow/Disallow Exercises“, Maschinen-Stufen je Profil, Workout-Gym wechseln, Smart-Substitutions nach Profil. | Equipment nur je Programm (`ProgramConfig.equipment`), Gerätestufen global je Übung (`weightScale`), Scheiben global. | L | `kv['gymProfiles']`: Name, Equipment-Set, gesperrte/erlaubte Übungen, Overrides für `weightScale`/Scheiben. Aktives Profil in Settings, Wechsel im Workout-Menü („Gym wechseln“). Erst sinnvoll, wenn der Nutzer wirklich an zwei Orten mit verschiedenen Geräten trainiert, sonst reicht A5. |
| B7 | **Wöchentliche Ringe: „Alle Workouts“ vs. „Aktives Programm“** | Umschalter, Ringe für Muskeln/Sätze/Übungen mit Wochenziel, Vorzyklus-Vergleich. | Ringe vorhanden (`RingStat`). Umschalter „Aktives Programm / Alle“ und Vorzyklus-Ansicht gibt es in `Dashboard.tsx` nicht (per Suche geprüft). | S | Umschalter und Vorwoche ergänzen. |
| B8 | **Weight Trend (geglättetes Körpergewicht)** | Trendlinie gegen Wasser-/Darmschwankungen, toleriert Lücken, Hinweis zu Defizit + sinkenden Sätzen. | Rohwerte mit Zeitfenster-Mittel (`average`), keine Trendlinie. | M | Exponentiell geglätteter Trend (Lücken tolerant) als Zusatzlinie im Gewichtsdiagramm (`engine/body.ts`). Eigene Formel, nicht die von MF (Nutrition-Algorithmus ist ohnehin nicht dokumentiert). Der Körpergewichtsanteil nutzt dann den Trend statt des letzten Rohwerts (stabiler Vorschlag bei Tagesschwankung). |
| B9 | **Exporte** | Programm/Workout als Datei teilen und importieren; Quick Export (Zeitraum, Workout/Ernährung) und Granular Export (Übungen, Muskeln …). | Nur komplettes JSON-Backup und Import von Gewicht/Training. | M | (a) Programm/Workout als eigenes JSON exportieren/importieren (Eigenübungen mitgeben, Namen nicht ändern müssen: IDs). (b) CSV-Export der Sessions (eine Zeile pro Satz, gleiches Format wie der Trainingsimport, damit Rundlauf klappt). |
| B10 | **Workout nachtragen (Backfill) im Logger** | Programm erstellen, Workouts mit tatsächlichem Datum loggen, Datum/Dauer editieren. | Nur CSV-Import. Ein einzelnes vergessenes Workout lässt sich nicht manuell nachtragen. | S–M | Mit B2: „Workout nachtragen“ = Logger mit Datumsfeld (Datum ≠ heute, `startedAt` ableiten), Wochenstand unverändert. |
| B11 | **Satz-Details** | RIR vor dem Satz setzen, `F`/`P`-Umschalter, Aktionsleiste mit Smart Progression, Info, Warm-up, Targets, Swap, Note, Superset, Equipment, L/R, More. | Bis auf Swap (B1), „Targets pro Satz in der Sitzung ändern“ und „Equipment-Optionen pro Sitzung“ vorhanden. | S | Nur Swap/Targets prüfen. |
| B12 | **Pausentimer-Feinheiten** | Timer-Töne einstellbar, ±10 s, Neustart in 15-s-Schritten bis 3 min. | Vibration, ±15 s, Menü. Kein Ton. | S | Kleiner Ton (Web Audio, lokal, kein Asset) schaltbar in Einstellungen. iOS-PWA-Einschränkungen beachten (Audio nur nach Nutzeraktion). |
| B13 | **Zyklusfreie Pause** | Programme laufen über Zyklen, nicht Kalender; „pausieren und fortsetzen“. | Gleiches Prinzip (Wochenstand aus Sessions, `skipSlot`). | – | Kein Handlungsbedarf. |

### 2.3 Niedrig (optional, Aufwand/Nutzen schwach oder Plattformgrenze)

| # | Funktion | Anmerkung |
|---|---|---|
| B14 | **Fortschrittsfotos** (Front/Seite/Rücken je Tag, Vorher/Nachher-Vergleich mit Hintergrundwahl, Teilen) | Machbar lokal (Blobs in IndexedDB, Größe beschränken, im Backup nur optional wegen Dateigröße). Aufwand L. Datenschutz ok, solange nichts den Browser verlässt. Nur wenn gewünscht. |
| B15 | **Schritte** (Dashboard-Kachel, manuell oder per Health) | Nur manuelle Eingabe/Datei-Import möglich (kein Health-Zugriff, siehe CLAUDE.md „Bekannte Grenzen“). Geringer Wert ohne Automatik. |
| B16 | **Periode tracken** (Tage markieren, Sichtbarkeit schaltbar) | Kleiner Aufwand (S), aber nur relevant, wenn der Nutzer es will (`Settings.sex`). Standard aus. |
| B17 | **Dashboard anpassen** (Reihenfolge, Widgets ein/aus, Reset) und **Shortcuts im Plus-Menü** (Reihenfolge/Farbe) | M. Nur Komfort. |
| B18 | **Workout-Bereiche (Sektionen)** in der Bibliothek, **Archiv** für Workouts | Nur sinnvoll bei vielen Programmen. Archiv für Programme siehe B4. |
| B19 | **Rest-Timer je Übung/Typ, Weights, Notizen, „Do not recommend“** | Haben wir (Pause, Gerätegewichte, Notiz-Ebenen, `neverRecommend`). |
| B20 | **Cardio-Erfahrung, Lifting-Erfahrung ändern** | Erfahrung steckt in `ProgramConfig.experience`; nachträglich ändern über B4. Cardio wird bei uns nie geplant (bewusst). |
| B21 | **Maße: 24 statt 18 Stellen**, Vergleichsansicht „Compare All Metrics“ | Wir haben 18 Stellen plus Verhältnisse (`RATIOS`). Vergleichsansicht (Prozent-Veränderung mehrerer Werte nebeneinander) ist eine kleine Ergänzung in `Body.tsx` (S). |
| B22 | **Übungsinfo**: Stabilität, Bewegungsumfang-Ranking, Gelenkbewegungen | Unsere Anleitungen/Medien sind eigene bzw. MIT-Daten. Zusätzliche Meta-Felder wären Handarbeit für ~hundert Übungen, geringer Nutzen. |

## 3. Bereits abgedeckt (Abgleich ohne Lücke)

Smart-Warm-ups und Schemata (inkl. Einklappen), Pausen-Defaults je Kategorie, Scheibenrechner, Körpergewichtsanteil, F/P/Drop/Myo/Warm-up-Satztypen, Links/Rechts, Supersätze, Notizen (Session/Übung/Programm), Wochenziele und „Übung in dieser Woche auslassen“, Workout überspringen, Deload am Anfang/Ende, Rep-Schemata, Zielwert Mitte/Weight Match/Bereich erweitern, „Vorbelegung: letzte Werte“, Levels/Körperkarte, Sets- und Volumenverlauf mit Gewicht/Körpergewicht getrennt, 1RM/3RM/10RM, Rekorde, Gewohnheiten/Streaks, Maße und Gewicht, Import von Training/Gewicht, Gerätegewichte, „Nie empfehlen“, mehrere Programme, Keep-Alive.

## 4. Empfohlene Reihenfolge

1. **B2 Verlauf bearbeiten/löschen** (inkl. Datum/Dauer, B10 Nachtragen). Fehlerhafte Einträge verfälschen sonst dauerhaft die Progression. Risiko: Engine-Verlauf (`historyUpTo`, Wochenstand) muss nach dem Ändern/Löschen konsistent bleiben.
2. **B1 Tauschen/Entfernen** im Logger und Programm + **A4** („nur heute/dauerhaft“).
3. **A1 Begründung/Warnstufe** der Vorschläge (rein Engine, parallel zu 1–2 möglich).
4. **B3 Eigene Übungen** und **B4 Programm verwalten** (inkl. Programm-Ende).
5. **B5 Auto-Weiter**, **B7**, **B12** als kleine Pakete.
6. **A5/B6** Maschinen-Stufen und Gym-Profile, nur bei Bedarf.
7. B8–B9, danach Niedrig-Liste nach Wunsch.

## 5. Verifikation pro Paket

`npm run typecheck && npm test && npm run build`. Neue Logik in `engine/` mit Test in `engine.test.ts`: A1 (Gründe/Stufen), B2 (Löschen/Datum ändern → Wochenstand und Vorschläge), B4 (Programm-Ende, Duplikat). Schemaänderungen (z. B. `Program.archived`, `Settings.autoAdvance`) über Defaults in `DEFAULT_SETTINGS`/`getSettings`, Backup-Format (`exportAll`) mitpflegen, Dexie-Version nur bei neuen Tabellen/Indizes.

## 6. Quellen (MF-Hilfeartikel, ID in der URL)

Dashboard 275–284; Programme 285–293, 294–297, 301–302, 306, 388, 395–396, 402; Logging 307–311, 313–321, 323, 325–327; Übungen 298, 328–338, 399; Verlauf/Analyse 339–344; Körper 345–351; Einstellungen 352–356, 358–359, 365; FAQ 367–392, 397; Equipment/Stufen 390, 403; Gym-Profile 300; Sektionen 322, 404.
