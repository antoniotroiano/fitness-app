# Plan: Eigene Trainings-App (PWA) mit wissenschaftsbasierter Progression

## Context
Der Nutzer zahlt 12,99 €/Monat für ein Fitness-Abo und möchte die Kernfunktionen als eigene App nachbauen. Wir lesen oder kopieren keinen fremden Code, keine Assets und keinen Namen. Wir bauen eine eigene App ("Eigenentwicklung") auf Basis öffentlich bekannter Trainingswissenschaft. Der Projektordner `/Users/antoniotroiano/ClaudeCode/fiteness-app` ist leer; Node/npm sind vorhanden.

Entscheidungen: PWA (iPhone via Safari "Zum Home-Bildschirm"), voller Umfang inkl. Periodisierung, Daten nur lokal.

## Stack
- Vite + React + TypeScript, Tailwind CSS
- Dexie (IndexedDB) für lokale Daten, Zustand für UI-State
- vite-plugin-pwa (offline, installierbar), Recharts für Grafiken
- Vitest für Unit-Tests der Progressions-Engine (rein funktional, UI-unabhängig)

## Struktur (`src/`)
- `data/exercises.ts`: eigene Übungsdatenbank (ca. 150–200): Name, Primär-/Sekundärmuskeln, Equipment (Langhantel, Kurzhantel, Kabel, Maschine, Körpergewicht, Smith, Band …), Bewegungsmuster, Compound/Isolation
- `db/`: Dexie-Schema (Profile, Exercises, Programs, Mesocycles, Sessions, Sets) und Export/Import als JSON
- `engine/progression.ts`: Double Progression mit RIR (siehe unten)
- `engine/periodization.ts`: Mesozyklus-Generator (Volumen-/Intensitätsphasen, Deload)
- `engine/volume.ts`: Sets pro Muskelgruppe/Woche vs. Zielbereiche
- `features/`: Onboarding, Equipment-Auswahl, Plan-Builder, Workout-Logger (Timer, Satz-Eingabe), Verlauf, Statistiken

## Algorithmen (öffentlich bekannte Prinzipien, eigene Implementierung)
1. **Double Progression:** Rep-Bereich pro Übung (z. B. 6–10). Alle Sätze am oberen Ende bei Ziel-RIR erreicht → Gewicht +Inkrement (Langhantel ~2,5 kg, Kurzhantel/Kabel ~1–2 kg), Reps zurück an die Untergrenze. Sonst +1 Wiederholung.
2. **Anpassung an Ist-Werte:** Geschätztes 1RM aus tatsächlich geloggtem Satz (Epley/Brzycki mit RIR-Korrektur). Nächster Vorschlag wird aus dem e1RM und dem Ziel (Reps/RIR) neu berechnet. Weicht der Nutzer vom Vorschlag ab, richtet sich der nächste Vorschlag nach dem tatsächlich Geleisteten.
3. **Stagnation/Rückschritt:** Zwei Sitzungen ohne Fortschritt → Gewicht leicht senken oder Variation/Rep-Bereich wechseln. Erholungs-Heuristik anhand Leistungsabfall und RIR-Abweichungen.
4. **Periodisierung:** Mesozyklus (4–6 Wochen + Deload). Phasen wechseln zwischen Volumen-Fokus (höhere Reps, mehr Sätze) und Intensitäts-Fokus (schwerer, weniger Reps) je nach Ziel (Hypertrophie/Kraft/Mix) und Trainingserfahrung aus dem Onboarding. RIR sinkt über den Block, Satzzahl steigt (Volumen-Progression), Deload mit ~50 % Volumen.
5. **Volumensteuerung:** Wochen-Sets pro Muskel gegen Zielbereiche (grob 10–20 Sets für Hypertrophie, anpassbar). Hinweis bei Über-/Unterversorgung.

Alle Konstanten (Inkremente, Rep-Bereiche, Volumenbereiche) werden als konfigurierbare Defaults angelegt, damit der Nutzer sie nachjustieren kann. Es sind sinnvolle Heuristiken, kein exaktes Abbild irgendeiner anderen App.

## Programm-Wizard (Plan erstellen)
Reihenfolge der Schritte (jeweils eigener Screen, Zurück möglich, Fortschrittsanzeige):
1. **Modus:** "Selbst erstellen" oder "App erstellt Plan". Bei "Selbst erstellen" entfallen Ziel, Split, Rep-Schema, Muskelfokus und Erfahrung; es geht direkt zu Equipment/Übungsauswahl und dann zu Name/Icon/Farbe.
2. **Ziel** (nur Auto): Muskelaufbau (Hypertrophie), Maximalkraft oder beides.
3. **Trainingstage pro Woche:** 2–6.
4. **Split:** Ganzkörper, Upper/Lower/Full Body, Push/Pull/Legs oder keine Präferenz (App wählt passend zur Tagezahl).
5. **Zeit pro Session:** bis 20 min, 20–40, 40–60, 60–90, 90–120, über 120 min. Steuert Übungs- und Satzanzahl pro Einheit.
6. **Rep-Range-Verlauf pro Woche:** Static (gleiches Rep-Ziel), Linear (Reps sinken, Gewicht steigt), Reverse Linear (Reps steigen, Gewicht sinkt), Undulating (wöchentlicher Wechsel schwer/niedrige Reps und leicht/höhere Reps).
7. **Muskelfokus:** Auswahl in Oberkörper und Unterkörper getrennt; max. 5 Muskeln mit höherer Priorität und max. 5 mit niedrigerer Priorität. Hohe Priorität = mehr Wochen-Sets, niedrige = Erhaltungsvolumen.
8. **Deload:** ja/nein.
9. **Erfahrung:** Keine, Anfänger, Mittelstufe, Fortgeschritten (beeinflusst Startvolumen, Progressionsgeschwindigkeit, RIR-Ziele).
10. **Name, Icon, Farbe:** aus vordefinierter Liste.
11. **Vorschau & Übungstausch:** App generiert den Plan. Pro Übung gibt es "Austauschen": Alternativen für dieselbe Muskelgruppe/dasselbe Bewegungsmuster (gefiltert nach verfügbarem Equipment). Erst danach "Plan speichern".

Umsetzung: `features/wizard/` mit einem Wizard-State (Zustand) und einem `ProgramConfig`-Typ. `engine/planGenerator.ts` ist eine reine Funktion `generate(config, exercises) → Program` und wird per Vitest getestet (Tage/Split-Zuordnung, Zeitbudget → Satzzahl, Muskelfokus → Volumen, Rep-Schema → Wochenziele, Deload-Woche). `engine/swap.ts` liefert Alternativen nach Muskelgruppe und Bewegungsmuster.

## Dashboard (Startseite) mit drei einklappbaren Gruppen
Alle Gruppen sind ein-/ausklappbar, Zustand wird lokal gemerkt.

### 1. Übungen (aus dem aktiven Plan)
- Liste aller Übungen des Plans; Tipp auf eine Übung öffnet die Detail-Statistik.
- **Metrik-Auswahl oberhalb des Diagramms:** 1RM, 3RM, 10RM (jeweils geschätzt aus geloggten Sätzen bzw. bestes Gewicht bei ≥ n Wiederholungen), Heaviest Weight, Total Volume, Best Set Volume, Total Reps, Best Set Reps, Total Sets.
- **Diagramm:** X-Achse Datum/Wochentag, Y-Achse kg (bei Reps-Metriken Wiederholungen, bei Sets die Satzzahl). **Balkendiagramm** für Total Sets, Total Reps, Total Volume; alle anderen **Liniendiagramm**.
- Darunter **Avg und Best** der gewählten Metrik für den sichtbaren Zeitraum (in kg bzw. Reps/Sets passend zur Metrik).
- Unter dem Diagramm: **Zeitraum** 1W, 1M, 3M, 6M, 1Y, All und daneben **Chart Averaging** Daily/Weekly/Monthly.
- Darunter **Historie nach Monaten gruppiert**: je Trainingstag Datum plus Wert der gewählten Metrik (kg, Volumen oder Sets).

### 2. Muskelgruppen
- Zeigt **immer alle 15 Muskelgruppen** (unabhängig vom Plan): 8 Oberkörper (Brust, Lats, oberer Rücken, Trapez, Schultern, Bizeps, Trizeps, Unterarme) und 7 Unterkörper (Quadrizeps, Hamstrings, Gesäß, Waden, Adduktoren, Abduktoren, Core/Bauch). Die Liste ist ein einziger Datensatz und bei Bedarf änderbar; derselbe Datensatz speist den Muskelfokus im Wizard.
- Oben wählbar: **Sets** oder **Volumen** als Kennzahl. Pro Gruppe aktualisieren sich die Werte automatisch nach jedem abgeschlossenen Training.
- Pro Muskel: Durchschnitt und Total (Sets bzw. Volumen), **Balkendiagramm**, Zeitraum-Wahl 1W/1M/3M/6M/1Y/All, darunter Historie nach Monaten und Tagen mit Datum und Wert.
- Volumen pro Muskel: primäre Muskeln voll, sekundäre anteilig gewichtet (Gewichtung als Konstante in `engine/volume.ts`).

### 3. Körpergewicht
- Eintragen pro Tag (kg), **Kalenderansicht** zeigt Tage mit/ohne Eintrag.
- **Liniendiagramm** der Gewichtsentwicklung mit Zeitraum-Wahl und optionalem gleitendem Durchschnitt.
- **Apple Health / Android (Health Connect):** Eine PWA hat **keinen direkten Zugriff** auf HealthKit oder Health Connect, weder auf iOS noch auf Android. Realistische Wege:
  - V1: manuelle Eingabe plus **Import** einer Apple-Health-Exportdatei (`export.xml`/ZIP, Gewichtswerte werden lokal im Browser geparst) bzw. CSV. Kein Backend nötig.
  - Halbautomatisch: eine iOS-Kurzbefehle-Automation, die das aktuelle Gewicht aus Health liest und per Link/Datei in die App übergibt (Machbarkeit wird in der Umsetzung geprüft).
  - Vollautomatisch erst später: die App in **Capacitor** verpacken (nativer iOS-/Android-Wrapper) und HealthKit/Health Connect per Plugin lesen. iOS braucht dafür einen Developer-Account für dauerhafte Installation. Daher kein Teil von V1; die Datenschicht wird aber so gebaut (`WeightEntry` mit `source`-Feld), dass es später ohne Umbau geht.

Umsetzung: `features/dashboard/` (Gruppen-Komponente), `features/stats/exercise` und `features/stats/muscle` teilen sich eine generische Chart-Komponente (Recharts) und eine reine Aggregations-Funktion `engine/stats.ts` (Metrik, Zeitraum, Averaging → Datenpunkte), die per Vitest getestet wird.

## Navigation und weitere Bereiche
Untere Tab-Leiste: **Dashboard | Workouts | ＋ (Mitte) | More** (ggf. weiterer Tab, z. B. Stats; final beim Bauen).

### Dashboard (Ergänzung)
Oben zusätzlich eine **Wochenfortschritt-Karte** des aktuellen Programmzyklus: Muskeln, Sets und Übungen mit Anzahl erledigt/übrig. Darunter die drei Gruppen (Übungen, Muskelgruppen, Körpergewicht).

### Workouts-Tab
- **Wochenleiste oben:** immer 7 Wochentage, horizontal tageweise scrollbar (links/rechts), aktualisiert sich automatisch mit dem Kalender. Tage mit abgeschlossenem Workout werden markiert.
- **Wochenplan darunter:** Slots in Reihenfolge, z. B. bei 3 Tagen: Workout A, Rest Day, Workout B, Rest Day, Workout C, Rest Day, Rest Day. Ein beendetes Workout erscheint als "geloggt". **Rest Days hakt der Nutzer selbst ab.**
- **Zyklus-Reset:** Sind alle Slots der Woche erledigt (inkl. selbst abgehakter Rest Days), werden alle 7 Markierungen zurückgesetzt, der Plan startet wieder bei Workout A, und die Wochenziele/Vorschläge (Progression, Rep-Schema, Deload-Woche, Volumen) werden für die neue Woche neu berechnet (`engine/weekCycle.ts`, getestet).
- Workout starten → Logger (Sätze, Gewicht, Reps, RIR, Timer), "Beenden" loggt das Workout.

### Plus-Button (Mitte)
Öffnet ein **Bottom Sheet** (von unten, halbe Höhe) mit Shortcuts: Gewicht eintragen, Maße eintragen, neues Programm (Wizard), **nur ein einzelnes Workout/Trainingstag** erstellen (ohne ganzes Programm; nutzt den manuellen Modus).

### Körpermaße
Eigene Ansicht (aus dem Plus-Sheet und aus Körpergewicht/More erreichbar), automatisch mit Datum. Aufgeteilt in Oberkörper und Unterkörper:
- Oberkörper: Hals, Schultern, Brustumfang (Bust), Brust (Chest), Taille; Bizeps L/R, Unterarm L/R, Handgelenk L/R
- Unterkörper: Hüfte; Oberschenkel L/R, Waden L/R, Knöchel L/R
- Verlauf je Messstelle als Liniendiagramm; Einheiten folgen den Einstellungen (cm bzw. inch).

### More-Tab
- **Einstellungen:** Dark/Light/System; Länge cm oder ft/in; Zeitformat 12 h/24 h; Distanz km/m oder Meilen/Yards; Gewicht kg oder lb. Umrechnung nur in der Anzeige, Speicherung intern immer metrisch (`utils/units.ts`).
- **Profil:** Name, Geburtstag, Geschlecht, Größe.
- **Übungsbibliothek:** alle Übungen durchsuchbar, filterbar nach Muskel und Equipment.
- **Daten:** JSON-Export/Import (Backup), Health-Export-Import (Gewicht).
- **About:** Versionsnummer, Lizenzen, Haftungshinweis. **Hilfe:** kurze Erklärungen (RIR, Progression, Deload, Rep-Schemata), FAQ.

### Cardio
Cardio-Geräte/-Übungen (Laufband, Fahrrad/Ergometer, Crosstrainer, Rudergerät, Stairmaster, Schwimmen, Gehen/Laufen usw.) sind Teil der Übungsbibliothek mit Typ `cardio` (Dauer, Distanz, optional Intensität/Puls statt Gewicht/Reps). Sie werden **nur manuell** vom Nutzer zu einem Workout hinzugefügt und **nie vom Plan-Generator** eingeplant. Sie fließen nicht in Muskel-Sets/Volumen ein.

## Meilensteine
1. Projekt-Setup, PWA-Grundgerüst, DB-Schema, Übungsdatenbank mit Equipment-Filter
2. Programm-Wizard (siehe oben) inkl. manuellem Modus, Plan-Generator und Übungstausch
3. Workout-Logger (Sätze, Gewicht, Reps, RIR, Pausen-Timer, Vorschlagswerte vorbelegt)
4. Progressions-Engine + Tests, an den Logger angebunden
5. Periodisierung, Deload, Volumenübersicht
6. Dashboard: Übungs-Statistik, Muskelgruppen-Statistik, Körpergewicht (Kalender, Diagramm, Health-Export-Import), JSON-Export/Import
7. Navigation (Tabs, Plus-Sheet), Workouts-Tab mit Wochenzyklus, Körpermaße, More-Bereich (Einstellungen, Profil, Bibliothek, About/Hilfe), Cardio
8. Politur: Dark Mode, Mobile-UX, Offline-Test, Icon

## Verifikation
- `npm run test`: Unit-Tests der Engine (Progression bei Treffer, Abweichung nach oben/unten, Stagnation, Deload, Volumen)
- `npm run dev` + Browser-Preview auf Mobile-Viewport: Onboarding → Plan → Workout loggen → nächster Vorschlag stimmt
- Build + `vite preview`: Installierbarkeit und Offline-Betrieb prüfen
- Export/Import-Roundtrip der Daten

## Hinweise / Grenzen
- Vorschläge sind keine medizinische Beratung; Verletzungen ggf. mit Fachperson klären.
- Eigener Name, eigenes Design, eigene Übungstexte (keine Übernahme von Bildern/Texten fremder Apps).
- Keine Videos/Coaching-Inhalte des Originals; Übungsanleitungen kurz und selbst formuliert.
