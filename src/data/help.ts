import type { IconName } from '../components/icons'

/** Baustein eines Artikels: Absatz, Aufzählung oder nummerierte Schritte. */
export type HelpBlock = string | string[] | { steps: string[] }

export interface HelpArticle {
  id: string
  title: string
  blocks: HelpBlock[]
  /** IDs verwandter Artikel (beliebige Kategorie) */
  related?: string[]
}

export interface HelpCategory {
  id: string
  title: string
  desc: string
  icon: IconName
  articles: HelpArticle[]
}

export const HELP_INTRO = 'Alle Hilfeartikel und häufigen Fragen zur App. Scrolle, um die vollständige Liste zu sehen.'

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    desc: 'Ringe, Rekorde, Körperkarte und wie du die Startseite anpasst',
    icon: 'dashboard',
    articles: [
      {
        id: 'dashboard-ueberblick',
        title: 'Das Dashboard im Überblick',
        blocks: [
          'Das **Dashboard** ist deine Startseite (erster Tab unten links). Oben siehst du die Wochenringe und deine letzten Rekorde, darunter Bereiche zu Volumen, Körperwerten und weiteren Auswertungen.',
          'Alles wird live aus deinen geloggten Einheiten berechnet. Korrekturen im Verlauf wirken deshalb sofort.',
          ['**Diese Woche**: Ringe für Muskelgruppen, Sätze und Übungen', '**Rekorde**: neue Bestwerte pro Übung', '**Volumen**: Körperkarte mit Sätzen pro Muskel', '**Körperwerte**: Gewicht, Körperfett, Maße'],
        ],
        related: ['dashboard-ringe', 'dashboard-anpassen'],
      },
      {
        id: 'dashboard-ringe',
        title: 'Die Wochenringe verstehen und umstellen',
        blocks: [
          'Drei Ringe zeigen deinen Fortschritt in der laufenden Woche: **Muskeln**, **Sätze** und **Übungen**. Das Ziel jedes Rings kommt aus deinem aktiven Programm.',
          'So stellst du um, was gezählt wird:',
          { steps: ['Öffne das **Dashboard**.', 'Tippe unter den Ringen auf **Programm** (nur Einheiten deines aktiven Programms in der aktuellen Programmwoche) oder auf **Alle Workouts** (jede Einheit im Datumsbereich der Woche, auch freie Workouts).'] },
          'Aufwärmsätze zählen nie mit. Dropsätze und Myo-Segmente zählen nicht als zusätzlicher Satz.',
        ],
        related: ['logging-satztypen', 'logging-aufwaermen'],
      },
      {
        id: 'dashboard-koerperkarte',
        title: 'Volumen und Körperkarte ansehen',
        blocks: [
          { steps: ['Öffne das **Dashboard** und scrolle zum Bereich **Volumen**.', 'Tippe auf die Kachel **Volumen** (Durchschnitt der letzten 4 Wochen).', 'Wähle den Zeitraum: 1, 4 oder 12 Wochen.', 'Tippe in der Liste unter der Karte auf einen Muskel, um die Übungsbeiträge aufzuklappen.', 'Mit **Verlauf ansehen** gelangst du zur Statistik dieses Muskels.'] },
          'Die Farben zeigen Arbeitssätze pro Woche: unter 4, 4 bis 9, 10 bis 20 und über 20. Primäre Muskeln zählen voll, sekundäre mit halbem Gewicht. Ein Bizeps-Curl zählt für den Bizeps als ganzer Satz, Rudern nur als halber.',
          'Zusätzlich zeigt eine Karte das Wochenvolumen in kg, getrennt nach Gewicht und Körpergewichtsanteil.',
        ],
        related: ['verlauf-muskel', 'logging-koerpergewicht'],
      },
      {
        id: 'dashboard-trend',
        title: 'Gewichts-Trend',
        blocks: [
          'Dein Körpergewicht schwankt täglich durch Wasser, Essen und Verdauung. Der Trend glättet das, damit du die echte Richtung siehst.',
          { steps: ['Öffne **Mehr** › **Daten** › **Körpergewicht**.', 'Die Punkte sind deine Messwerte, die Linie ist der Trend.'] },
          'Gespeichert wird immer nur der Rohwert, den Trend rechnet die App bei der Anzeige. Der Trend dient auch als Körpergewicht bei Übungen mit Körpergewichtsanteil (z. B. Klimmzüge), damit ein einzelner schwerer Tag die Last nicht verfälscht.',
        ],
        related: ['koerper-gewicht', 'logging-koerpergewicht'],
      },
      {
        id: 'dashboard-anpassen',
        title: 'Dashboard und Plus-Menü anpassen',
        blocks: [
          'Du bestimmst, welche Bereiche das Dashboard zeigt und in welcher Reihenfolge. Das gilt auch für die Schnellaktionen im Plus-Menü.',
          { steps: ['Tippe im **Dashboard** auf **Dashboard anpassen** (Slider-Symbol), oder öffne **Mehr** › **Funktionseinstellungen** › **Dashboard**.', 'Schalte Bereiche mit **An** oder **Aus** ein oder aus.', 'Ändere die Reihenfolge mit **Nach oben** und **Nach unten**.', 'Mit **Zurücksetzen** stellst du den Standard wieder her.'] },
          'Die Ringe und Rekorde oben bleiben immer sichtbar. Neue Bereiche aus App-Updates werden automatisch hinten angehängt.',
        ],
        related: ['dashboard-plusmenue'],
      },
      {
        id: 'dashboard-plusmenue',
        title: 'Das Plus-Menü',
        blocks: [
          'Der runde **＋**-Knopf in der Mitte der unteren Leiste öffnet Schnellaktionen:',
          ['**Gewicht eintragen**', '**Maße eintragen**', '**Neues Programm**', '**Einzelnes Workout erstellen**'],
          'Welche Aktionen erscheinen und in welcher Reihenfolge, stellst du unter **Mehr** › **Funktionseinstellungen** › **Dashboard** im Bereich **Plus-Menü** ein.',
        ],
        related: ['dashboard-anpassen'],
      },
      {
        id: 'dashboard-periode',
        title: 'Periode verfolgen',
        blocks: [
          { steps: ['Öffne **Mehr** › **Profil** und schalte **Periode tracken** ein. Das geht nur, wenn dein Geschlecht nicht „Männlich“ ist.', 'Öffne **Mehr** › **Daten** › **Periode**.', 'Tippe auf einen Tag, um ihn zu markieren. Ein weiterer Tipp entfernt die Markierung.'] },
          'Aus den markierten Tagen berechnet die App Zyklustag, durchschnittliche Zykluslänge (Mittel der letzten 6 Zyklen, nur 15 bis 60 Tage) und den voraussichtlichen **nächsten Beginn**.',
          'Das ist reine Anzeige, keine medizinische Aussage. Die Daten sind nicht mit Training oder Progression verknüpft und bleiben auf deinem Gerät.',
        ],
      },
    ],
  },
  {
    id: 'programme',
    title: 'Programme',
    desc: 'Erstellen, wechseln, anpassen, teilen und beenden',
    icon: 'program',
    articles: [
      {
        id: 'programm-erstellen-wizard',
        title: 'Neues Programm per Assistent erstellen',
        blocks: [
          'Der Assistent baut dir aus ein paar Fragen ein komplettes Programm.',
          { steps: ['Tippe auf **＋** › **Neues Programm** (oder auf der Seite **Workouts** auf **Programm erstellen**, solange du noch keins hast).', 'Wähle **App erstellt einen Plan** und tippe auf **Weiter**.', 'Beantworte die Fragen: **Ziel**, **Trainingstage**, Aufteilung, **Zeit pro Session**, **Rep-Ranges**, **Muskelfokus**, **Blocklänge & Deload**, **Erfahrung** und verfügbares Equipment.', 'Vergib **Name, Icon & Farbe**.', 'Prüfe unter **Dein Plan** die Vorschau. Mit **Austauschen** wechselst du Übungen, mit **+ Übung hinzufügen** fügst du welche an.', 'Tippe auf **Plan speichern**.'] },
          'Das neue Programm wird aktiv und erscheint auf der Seite **Workouts**.',
          'Die Zeit pro Session begrenzt die Satzzahl pro Tag, gerechnet für die Spitzenwoche des Blocks. Zeitbasierte Übungen und Cardio plant der Assistent nur, wenn du sie ausdrücklich auswählst.',
        ],
        related: ['programm-von-hand', 'programm-blocklaenge', 'programm-rep-schemata'],
      },
      {
        id: 'programm-von-hand',
        title: 'Programm selbst erstellen',
        blocks: [
          { steps: ['Tippe auf **＋** › **Neues Programm**.', 'Wähle **Selbst erstellen** und tippe auf **Weiter**.', 'Gib einen Namen ein und füge mit **+ Workout hinzufügen** deine Trainingstage an (**Name des Workouts**).', 'Füge mit **+ Übung hinzufügen** Übungen hinzu und stelle **Sätze**, Wiederholungsbereich und RIR ein.', 'Tippe auf **Speichern**.'] },
          'Ein einzelnes Workout ohne Programm legst du mit **＋** › **Einzelnes Workout erstellen** an. Es liegt als „nicht eingeplantes“ Workout im Programm und lässt sich später einplanen.',
        ],
        related: ['programm-workout-einplanen'],
      },
      {
        id: 'programm-rep-schemata',
        title: 'Wiederholungsschemata und Periodisierung',
        blocks: [
          'Ein Schema legt fest, wie sich Wiederholungsbereich und Reserve (RIR) über die Wochen eines Blocks verändern. Du wählst es im Assistenten bei **Rep-Ranges**:',
          ['**Konstant**: gleicher Bereich jede Woche', '**Linear**: Wiederholungen sinken, Gewichte steigen', '**Umgekehrt linear**: Wiederholungen steigen, Gewichte sinken', '**Wellenförmig**: wöchentlicher Wechsel zwischen schwer und leicht', '**Wechselnde Bereiche**: drei enge Zonen (je 3 Wdh.) um die Mitte des Bereichs, die jede Übung wöchentlich durchläuft'],
          'Bei wechselnden Bereichen geht der letzte Satz in der letzten Arbeitswoche bis zum Versagen. Schwere Zonen bekommen eine Reserve mehr. Bei Verbundübungen bleibt immer mindestens 1 RIR. Für Fortgeschrittene schlägt der Assistent diese Variante automatisch vor.',
          'Zeit- und Distanzübungen laufen nie in einem Schema.',
        ],
        related: ['programm-blocklaenge', 'programm-wochenziele'],
      },
      {
        id: 'programm-blocklaenge',
        title: 'Blocklänge, Deload und Programm-Ende ändern',
        blocks: [
          { steps: ['Öffne auf der Seite **Workouts** das **Workouts-Menü** (⋯ oben rechts).', 'Tippe unter **Programm anpassen** auf **Programm bearbeiten**.', 'Stelle **Trainingswochen pro Block** (3 bis 8), **Deload-Woche** (**Am Ende**, **Am Anfang** oder **Keine**) und **Programm-Ende** (**Endlos** oder eine Anzahl Blöcke) ein.', 'Tippe auf **Speichern**.'] },
          'Die Änderung gilt ab sofort für den ganzen Verlauf. Bereits geloggte Einheiten behalten ihre Programmwoche, nur die Blockgrenzen verschieben sich. Bei eigenen Plänen ohne Periodisierung entfallen Blocklänge und Deload.',
          'Der Deload ist eine Woche mit etwa halbem Satzvolumen und mehr Reserve. Die Studienlage ist schwach: Eine Studie (Coleman et al. 2024) fand bei einer Pause von einer Woche keinen Vorteil für die Muskelgröße. Nutze ihn, wenn du dich müde fühlst, nicht nach Pflicht.',
        ],
        related: ['faq-deload', 'programm-ende'],
      },
      {
        id: 'programm-aktiv',
        title: 'Aktives Programm wechseln',
        blocks: [
          'Es ist immer genau ein Programm aktiv. Es bestimmt Wochenplan, Dashboard-Ziele und die Vorschläge im Workout.',
          { steps: ['Öffne die Seite **Workouts** und scrolle zur **Workout-Bibliothek**.', 'Tippe auf das Programm, das du aktivieren willst. Es klappt seine Tage auf.', 'Tippe noch einmal auf den Kopf des Programms, um die Programm-Seite zu öffnen.', 'Tippe oben rechts auf **Programm-Menü** (⋯) und dann auf **Programm aktivieren**.'] },
          'Beim Wechsel rekonstruiert die App den Wochenstand aus deinen geloggten Einheiten. Du verlierst nichts und machst später da weiter, wo du aufgehört hast.',
        ],
        related: ['programm-archiv'],
      },
      {
        id: 'programm-duplizieren',
        title: 'Programm duplizieren',
        blocks: [
          'Eine Kopie eignet sich, um Änderungen auszuprobieren, ohne dein bewährtes Programm anzufassen.',
          { steps: ['Öffne die Seite **Workouts**.', 'Tippe oben rechts auf das **Workouts-Menü** (⋯).', 'Tippe unter **Programm anpassen** auf **Programm duplizieren**.'] },
          'Für ein anderes als das aktive Programm: Öffne es aus der **Workout-Bibliothek** (zweimal auf den Kopf tippen), dann **Programm-Menü** (⋯) › **Programm duplizieren**.',
          'Die Kopie heißt „… (Kopie 1)“, hat eigene Trainingstage und bleibt inaktiv, bis du sie aktivierst. Einen eigenen Namen vergibst du danach über **Programm bearbeiten**.',
        ],
        related: ['programm-aktiv'],
      },
      {
        id: 'programm-archiv',
        title: 'Programm archivieren, wiederherstellen und löschen',
        blocks: [
          'Archivierte Programme sind nie aktiv und verschwinden aus der Bibliothek, bleiben aber samt deinen Einheiten erhalten.',
          { steps: ['**Archivieren**: **Workouts-Menü** (⋯) › **Programm archivieren**. Bei einem anderen Programm: Programm-Seite › **Programm-Menü** (⋯) › **Programm archivieren**.', '**Ansehen**: **Workouts-Menü** (⋯) › **Archivierte Programme**.', '**Wiederherstellen**: in der Archivliste auf das Programm tippen, dann **Programm-Menü** (⋯) › **Aus dem Archiv holen**, oder direkt **Aktivieren**.', '**Löschen**: Programm-Seite › **Programm-Menü** (⋯) › **Programm löschen** und bestätigen.'] },
          'Archivierst du das aktive Programm, wird automatisch das neueste nicht archivierte aktiv. Beim Löschen bleiben bereits geloggte Einheiten im Verlauf erhalten, nur der Plan ist weg.',
        ],
      },
      {
        id: 'programm-workout-umbenennen',
        title: 'Workout umbenennen',
        blocks: [
          { steps: ['Öffne die Seite **Workouts** und tippe auf das Workout, das du umbenennen willst.', 'Tippe in der Vorschau oben rechts auf das Menü (⋯), dann auf **Workout verwalten**.', 'Tippe auf **Umbenennen**, gib den neuen Namen ein und speichere.'] },
          'Bei einem Workout in einem anderen Programm öffnest du die **Programm-Seite** und tippst über der Vorschau auf **Workout verwalten**.',
        ],
        related: ['programm-workout-duplizieren'],
      },
      {
        id: 'programm-workout-duplizieren',
        title: 'Workout duplizieren',
        blocks: [
          { steps: ['Öffne die Vorschau des Workouts (Seite **Workouts**, auf das Workout tippen).', 'Tippe oben rechts auf das Menü (⋯) › **Workout verwalten**.', 'Tippe auf **Workout duplizieren**.'] },
          'Die Kopie heißt „… (Kopie 1)“ und hat zunächst keinen Wochenplatz. Du findest sie auf der Seite **Workouts** unter **Zusätzliche Workouts** und planst sie bei Bedarf ein.',
        ],
        related: ['programm-workout-einplanen'],
      },
      {
        id: 'programm-workout-einplanen',
        title: 'Workout aus dem Wochenplan nehmen oder einplanen',
        blocks: [
          'Ein Workout kann im Wochenplan stehen oder als „nicht eingeplantes“ Workout im Programm liegen. Es geht dabei nichts verloren.',
          { steps: ['Öffne die Vorschau des Workouts und tippe auf das Menü (⋯) › **Workout verwalten**.', 'Zum Herausnehmen: **Aus dem Wochenplan nehmen**. Der Platz wird zum Ruhetag.', 'Zum Einplanen: **In den Wochenplan setzen**. Das Workout nimmt den ersten freien Ruhetag.'] },
          'Das letzte eingeplante Workout lässt sich nicht herausnehmen. Ist kein Ruhetag frei, nimm zuerst ein anderes Workout heraus.',
        ],
        related: ['programm-wochenplan'],
      },
      {
        id: 'programm-wochenplan',
        title: 'Wochenplan ordnen',
        blocks: [
          'Du kannst Trainingstage und Pausen im Wochenplan neu anordnen, ohne die Workouts selbst zu verändern.',
          { steps: ['Öffne auf der Seite **Workouts** das **Workouts-Menü** (⋯).', 'Tippe unter **Programm anpassen** auf **Wochenplan ordnen**.', 'Verschiebe die Einträge mit **Nach oben** und **Nach unten**.'] },
          'Für ein anderes Programm findest du **Wochenplan ordnen** im **Programm-Menü** (⋯) der Programm-Seite. Erledigte Tage behalten ihren Haken und wandern mit. Frühere Einheiten ändern sich nicht.',
        ],
      },
      {
        id: 'programm-uebung-verschieben',
        title: 'Übung in ein anderes Workout verschieben',
        blocks: [
          { steps: ['Öffne die Vorschau des Workouts, in dem die Übung steht.', 'Tippe bei der Übung auf **Verschieben**.', 'Wähle das Ziel-Workout. Ein Tipp auf das aktuelle Workout ändert nur die Reihenfolge.', 'Wähle unter **Position wählen** die Stelle, an der die Übung stehen soll.'] },
          'Die Historie der Übung bleibt erhalten. Ein Supersatz wird dabei gelöst, und die letzte Übung eines Workouts bleibt immer stehen.',
        ],
        related: ['uebungen-tauschen'],
      },
      {
        id: 'programm-wochenziele',
        title: 'Sätze, Wiederholungen und RIR pro Woche ändern',
        blocks: [
          'Für einzelne Wochen kannst du **Sätze**, Wiederholungsbereich (**Wdh**) und RIR einer Übung überschreiben oder die Übung auslassen.',
          { steps: ['Öffne die Vorschau des Workouts.', 'Tippe bei der Übung auf **Ziele**.', 'Wähle unter **Gilt für**, ob es **In jedem Block** (gleiche Woche jedes Blocks) oder **Nur diese Woche** gelten soll. „Nur diese Woche“ hat Vorrang.', 'Fülle nur die Felder aus, die du ändern willst. **Leere Felder** übernehmen den Wert aus dem Wochenplan.', 'Mit **In dieser Woche auslassen** entfällt die Übung diese Woche komplett.', 'Tippe auf **Speichern**.'] },
          'Mit **Auf alle Übungen des Tages anwenden** überträgst du die ausgefüllten Felder auf das ganze Workout. **Zurücksetzen** entfernt das Ziel wieder. Tauschst du eine Übung gegen eine andere Art, werden ihre Wochenziele verworfen.',
        ],
        related: ['programm-rep-schemata', 'logging-ueberspringen'],
      },
      {
        id: 'programm-teilen',
        title: 'Programme und Workouts als Datei teilen',
        blocks: [
          'Programme und einzelne Workouts lassen sich als Datei exportieren und in einer anderen Installation importieren, ohne Konto und ohne Netzwerk.',
          { steps: ['**Programm exportieren**: Programm-Seite › **Programm-Menü** (⋯) › **Programm exportieren**.', '**Workout exportieren**: Workout-Vorschau › Menü (⋯) › **Workout verwalten** › **Workout exportieren**.', 'Gib die Datei weiter (AirDrop, Nachricht, Cloud).'] },
          'Zum Importieren:',
          { steps: ['**Programm**: **Mehr** › **Daten** › **Programm importieren**.', '**Workout**: **Workout-Menü** (⋯) auf der Seite **Workouts** › **Workout importieren**, oder in **Workout verwalten** › **Workout importieren**.'] },
          'Ein importiertes Programm kommt als neues, inaktives Programm mit eindeutigem Namen an, ein Workout als „nicht eingeplantes“ Workout. Mitgelieferte eigene Übungen werden angelegt, vorhandene Übungen überschreibt der Import nie.',
        ],
      },
      {
        id: 'programm-ende',
        title: 'Was passiert am Ende des Programms?',
        blocks: [
          'Hast du für ein Programm eine begrenzte Zahl von Blöcken festgelegt, erscheint nach dem letzten Block auf der Seite **Workouts** die Karte **Programm-Ende erreicht** mit drei Optionen:',
          ['**Block wiederholen**: hängt einen weiteren Block an', '**Abschließen**: archiviert das Programm', '**Neues Programm erstellen**: öffnet den Assistenten, ohne das alte zu archivieren'],
          'Ohne Blockgrenze läuft das Programm endlos. Die Grenze legst du unter **Programm bearbeiten** › **Programm-Ende** fest.',
        ],
        related: ['programm-blocklaenge', 'programm-archiv'],
      },
    ],
  },
  {
    id: 'logging',
    title: 'Workouts protokollieren',
    desc: 'Training starten, Sätze eintragen, Pausen und Satztypen',
    icon: 'workouts',
    articles: [
      {
        id: 'logging-starten',
        title: 'Ein Workout starten',
        blocks: [
          { steps: ['Öffne die Seite **Workouts**.', 'Tippe auf das Workout, das du trainieren willst. Du siehst die Vorschau mit Übungen, Zielen und Vorschlägen.', 'Tippe auf **Workout starten**.'] },
          'Ein laufendes Workout übersteht Neuladen und Schließen der App. Auf der Seite **Workouts** erscheint **Ein Workout läuft** mit dem Knopf **Fortsetzen**.',
          'Ein freies Workout ohne Plan startest du über **＋** › **Einzelnes Workout erstellen**.',
        ],
        related: ['logging-sets'],
      },
      {
        id: 'logging-sets',
        title: 'Sätze eintragen und abhaken',
        blocks: [
          'Jede Übung zeigt eine Tabelle mit Sätzen. Die Werte sind mit dem Vorschlag der App vorbelegt.',
          { steps: ['Wähle oben in der Übungsleiste die Übung.', 'Tippe in der Zeile auf **Gewicht** oder **Wdh.**, gib den Wert im Zahlenfeld ein und tippe auf **Bestätigen**.', 'Tippe auf **Satz abhaken**. Die Pause startet automatisch.', 'Mit **Satz hinzufügen** fügst du einen weiteren Satz an.'] },
          'Weichst du vom Plan ab, passt die App die folgenden Sätze an (siehe „Wie werden Folgesätze angepasst?“). Von Hand geänderte Werte bleiben unberührt. Statt des Vorschlags kannst du die Werte der letzten Einheit vorbelegen lassen: **Mehr** › **Workouts** › **Sätze im Workout vorbelegen**.',
        ],
        related: ['logging-rir', 'faq-folgesaetze'],
      },
      {
        id: 'logging-rir',
        title: 'RIR eintragen und ändern',
        blocks: [
          'RIR bedeutet „Reps in Reserve“: Wie viele saubere Wiederholungen hättest du am Satzende noch geschafft? RIR 0 heißt Versagen, RIR 2 heißt, zwei Wiederholungen waren noch möglich.',
          { steps: ['Tippe in der Satzzeile auf das **RIR**-Feld.', 'Wähle im Zahlenfeld den Wert, den du nach dem Satz gefühlt hast, und tippe auf **Bestätigen**.'] },
          'Der RIR fließt in die Vorschläge und in den geschätzten 1RM ein. Fehlt er, rechnet die App mit RIR 2. Das **Ziel-RIR** steht in der Zeile und kommt aus dem Programm. Dauerhaft änderst du es in der Vorschau über **Ziele**.',
        ],
        related: ['faq-rir', 'programm-wochenziele'],
      },
      {
        id: 'logging-aufwaermen',
        title: 'Aufwärmsätze ein- und ausschalten oder ändern',
        blocks: [
          { steps: ['Tippe im Workout bei der Übung auf **Aufwärmen**.', 'Wähle im Sheet **Aufwärm-Modus** den Modus: **Smart**, **Scheme** oder aus.', '**Auf Standard zurücksetzen** stellt die Einstellung der Übung wieder auf die allgemeine.'] },
          'Smart berechnet die Sätze aus der Schwere des Arbeitsgewichts und der Frische des Muskels. Ist der Muskel durch eine frühere Übung schon warm, fällt das Aufwärmen kleiner aus. **Scheme** nutzt eines der fünf Kategorie-Schemata.',
          'Dauerhaft pro Übung stellst du es in der Übungs-Detailseite ein: **Übungen** › Übung öffnen › **Aufwärm-Automatik**, **Aufwärmschema**. Allgemeine Schemata und Pausen findest du unter **Mehr** › **Workouts** › **Aufwärmen**.',
          'Aufwärmsätze zählen nie in Volumen, Sätze, 1RM, Progression oder Wochenfortschritt. Erledigte Aufwärmsätze klappen zu einer Zeile zusammen („erledigt · anzeigen“). Das schaltest du unter **Mehr** › **Workouts** › **Anzeige** ab.',
        ],
      },
      {
        id: 'logging-pausen',
        title: 'Pausen-Timer einstellen',
        blocks: [
          'Nach jedem abgehakten Satz startet ein Pausen-Timer. Die Uhr in der Kopfzeile zeigt die Restzeit. Ein Tipp darauf öffnet ein Menü mit ±15 Sekunden, Stopp und eigenen Timern.',
          { steps: ['Allgemeine Pausen: **Mehr** › **Workouts** › **Pause**. Du stellst die Zeit je Übungstyp ein.', 'Nur für eine Übung: **Übungen** › Übung öffnen › **Pausentimer** › **Ändern**. **Zurück zum Default** hebt es wieder auf.', 'Ton ein- oder ausschalten: **Mehr** › **Workouts** › **Anzeige** › **Ton am Ende der Pause**.'] },
          'Der Ton kommt nur, wenn die App im Vordergrund ist und das Gerät nicht stumm geschaltet ist. Im Hintergrund oder bei gesperrtem Bildschirm bleibt es stumm, das ist bei einer Web-App technisch nicht anders möglich.',
        ],
      },
      {
        id: 'logging-satztypen',
        title: 'Satztypen: Versagen, Drop und Myo eintragen',
        blocks: [
          { steps: ['Tippe in der Satzzeile auf das Symbol **Satztyp ändern**.', 'Wähle im Sheet **Satztyp**: **Standardsatz**, **Aufwärmsatz**, **Failure-Satz**, **Drop-Satz** oder **Myo-Satz**.', 'Bei Drop- und Myo-Sätzen kannst du mit **Weiteres Segment** weitere anhängen. Ein Segment entfernst du, indem du die Zeile nach links wischst.'] },
          ['**Failure-Satz (F)**: RIR 0, bis nichts mehr geht', '**Drop-Satz (D)**: direkt danach mit etwa 20 % weniger Gewicht weitermachen', '**Myo-Satz (M)**: kurze Pause (10 bis 20 s), dann ein Mini-Satz mit gleichem Gewicht'],
          'Drop- und Myo-Segmente gehören zum Arbeitssatz davor: Wiederholungen und Volumen zählen, aber sie sind kein eigener Satz und zählen nicht für 1RM, Bestleistung, Progression und Wochenfortschritt.',
        ],
        related: ['logging-teilwdh', 'faq-satztypen'],
      },
      {
        id: 'logging-teilwdh',
        title: 'Teilwiederholungen eintragen',
        blocks: [
          { steps: ['Tippe in der Satzzeile auf **Wdh.**, das Zahlenfeld öffnet sich.', 'Schalte mit dem Knopf **V|T** (**Art der Wiederholungen**) zwischen **Volle Wiederholungen** und **Teilwiederholungen** um.', 'Gib erst die vollen, dann die Teilwiederholungen ein und tippe auf **Bestätigen**.'] },
          'Das Wiederholungsfeld zeigt danach „voll | Teil“. Nur die vollen Wiederholungen zählen für Wiederholungszahl und Volumen. Für Progression und 1RM gilt ein Satz mit Teilwiederholungen als RIR 0.',
        ],
      },
      {
        id: 'logging-supersatz',
        title: 'Supersatz bilden oder lösen',
        blocks: [
          'In einem Supersatz wechselst du zwischen zwei oder mehr Übungen ohne Pause dazwischen. Erst nach der letzten Übung der Runde startet der Timer.',
          { steps: ['Wähle im Workout die Übung und tippe auf **Supersatz**.', 'Wähle **Mit nächster verbinden** oder **Mit vorheriger verbinden**.', 'Zum Lösen: **Aus Supersatz lösen**.'] },
          'Die Änderung gilt sofort auch für künftige Einheiten dieses Trainingstags. Der Knopf erscheint nur, wenn das Workout mehr als eine Übung hat. Eine für die Woche ausgelassene Übung zählt nicht zum Supersatz.',
        ],
      },
      {
        id: 'logging-seiten',
        title: 'Links und rechts getrennt eintragen',
        blocks: [
          { steps: ['Tippe im Workout bei der Übung auf **Links/Rechts**. Der Knopf ist dann hervorgehoben.', 'Trage Gewicht und Wiederholungen je Seite ein.', 'Hake jede Seite einzeln mit **Seite … abhaken** ab. Erst wenn beide Seiten fertig sind, ist der Satz erledigt.'] },
          'Ein Satz bleibt ein Satz. Für Progression, 1RM und Plateau-Erkennung zählt immer die schwächere Seite. Das Volumen ist die Summe beider Seiten. Nach einer Seite startet eine kurze Seitenpause (Standard 15 s, einstellbar, 0 = aus).',
          'Bei einseitigen Übungen ist die Funktion standardmäßig an. Ausschalten behält die schwächere Seite. Kurzhantel- und Kettlebell-Gewichte gelten je Seite, das Volumen zählt dann doppelt.',
        ],
      },
      {
        id: 'logging-scheiben',
        title: 'Scheibenrechner nutzen und einrichten',
        blocks: [
          { steps: ['Öffne **Mehr** › **Workouts** › **Langhantel**.', 'Wähle das Gewicht deiner **Stange** (10, 15 oder 20 kg).', 'Wähle unter **Verfügbare Scheiben**, welche Scheiben du hast.'] },
          'Bei Langhantelübungen zeigt das Zahlenfeld im Gewichtsfeld **Pro Seite** die Scheiben, die schwerste zuerst. Lässt sich ein Gewicht nicht laden, nennt die App den Rest. Bei zu leichtem Gewicht erscheint „Leichter als die Stange“.',
        ],
      },
      {
        id: 'logging-koerpergewicht',
        title: 'Körpergewicht und assistierte Übungen',
        blocks: [
          'Bei Übungen wie Klimmzügen oder Dips trägst du nur das **Zusatzgewicht** ein. Die App rechnet intern mit der Gesamtlast: Anteil des Körpergewichts plus Zusatzgewicht. Dafür braucht sie einen Gewichtseintrag (**Mehr** › **Daten** › **Körpergewicht**). Sie nutzt den Trend.',
          'Ohne Zusatzgewicht steigt die Progression über Wiederholungen. An der Obergrenze schlägt die App das erste kleine Zusatzgewicht vor und passt die Wiederholungen an.',
          'Bei assistierten Übungen (Gewicht = Unterstützung) ist es umgekehrt: Fortschritt bedeutet weniger Unterstützung. 1RM und Volumen gibt es dort nicht.',
        ],
        related: ['dashboard-trend'],
      },
      {
        id: 'logging-zeit-distanz',
        title: 'Zeit- und Distanzübungen',
        blocks: [
          'Planks, Farmer’s Walks und ähnliche Übungen messen Sekunden oder Meter statt Wiederholungen. Der Wert steht im Feld **Wdh.**, die Spaltenüberschrift zeigt Sek. oder m.',
          'Die Progression erhöht um 5 Sekunden bzw. 5 Meter. An der Obergrenze mit Zusatzlast folgt die nächste Gewichtsstufe bei der Untergrenze. Es gibt kein Aufwärmen, keinen 1RM und keinen Versagenssatz.',
          'Eigene Zeit- oder Distanzübungen legst du bei **Messgröße** an. Bei Distanz wählst du bei **Einheit der Strecke** Meter oder Yards, es wird nie umgerechnet.',
        ],
        related: ['uebungen-eigene'],
      },
      {
        id: 'logging-notizen',
        title: 'Notizen zu Übung oder Einheit hinzufügen',
        blocks: [
          { steps: ['Tippe im Workout bei der Übung auf **Notiz**.', 'Schreibe den Text und wähle, wofür er gilt: nur diese Einheit oder dauerhaft für die Übung.', 'Tippe auf **Speichern**.'] },
          'Übungsnotizen bleiben an der Übung und tauchen beim nächsten Mal wieder auf, zum Beispiel Sitzeinstellung oder Schmerzstelle. Du siehst und änderst sie auch unter **Übungen** › Übung öffnen › **Übungsnotiz**.',
        ],
      },
      {
        id: 'logging-ueberspringen',
        title: 'Workout oder Übung überspringen',
        blocks: [
          'Kannst du heute nicht trainieren, überspringst du das Workout.',
          { steps: ['Öffne auf der Seite **Workouts** das Workout.', 'Tippe in der Vorschau auf **Überspringen**.', 'Zum Zurücknehmen: **Nicht mehr überspringen**.'] },
          'Der Tag zählt für die Woche als erledigt, ohne dass eine Einheit entsteht, es gibt also keine Progression und keine Statistik daraus. Ist der letzte offene Tag erledigt oder übersprungen, startet die nächste Woche. Die Wochenliste zeigt **Übersprungen**.',
          'Eine einzelne Übung lässt du für eine Woche aus, ohne sie zu entfernen: Vorschau › **Ziele** › **In dieser Woche auslassen**.',
        ],
        related: ['programm-wochenziele', 'faq-pause'],
      },
      {
        id: 'logging-pausieren-beenden',
        title: 'Workout pausieren, beenden oder verwerfen',
        blocks: [
          { steps: ['Tippe oben im Workout auf das **Workout-Menü**.', '**Workout pausieren** hält die Trainingsuhr an, **Workout fortsetzen** startet sie wieder.', '**Workout beenden** speichert die Einheit. Das Sheet fragt, ob **Nur abgehakte Sätze speichern** oder **Alle Sätze speichern**, oder ob du mit **Zurück zum Workout** weitermachst.', '**Workout verwerfen** löscht alles. Du musst es einmal bestätigen.'] },
          'Die Trainingsuhr läuft zeitstempelbasiert, sie geht auch bei geschlossener App richtig weiter. Nach dem Beenden ist der Tag im Wochenplan als erledigt markiert.',
        ],
      },
      {
        id: 'logging-nachtragen',
        title: 'Vergangenes Workout nachtragen',
        blocks: [
          { steps: ['Öffne **Mehr** › **Funktionseinstellungen** › **Verlauf**, oder auf der Seite **Workouts** das **Workouts-Menü** (⋯) › **Verlauf ansehen und bearbeiten**.', 'Tippe oben rechts auf **Nachtragen**.', 'Wähle **Programm**, **Programmwoche** und **Datum** und tippe auf **Erfassen**.', 'Trage die Sätze wie in einem normalen Workout ein.'] },
          'Die App schlägt Werte nur aus Einheiten bis zu diesem Datum vor. Gespeichert wird mit dem gewählten Datum, 12:00 Uhr und ohne Dauer. Der Wochenstand ändert sich nicht.',
          'Größere Historien importierst du als CSV, siehe „Trainingsverlauf importieren“.',
        ],
        related: ['einstellungen-import'],
      },
    ],
  },
  {
    id: 'uebungen',
    title: 'Übungen',
    desc: 'Bibliothek, eigene Übungen, tauschen und Gerätegewichte',
    icon: 'library',
    articles: [
      {
        id: 'uebungen-bibliothek',
        title: 'Übungen suchen und ansehen',
        blocks: [
          { steps: ['Tippe unten auf **Übungen**.', 'Suche über das Suchfeld nach Name, Muskel oder Alternativbezeichnung, oder stöbere in den Gruppen.', 'Tippe auf eine Übung, um Details zu sehen.'] },
          'Die Übungsseite zeigt **Info** (Anleitung, Details, Verlauf), deine **Übungsnotiz** und übungsspezifische Einstellungen.',
        ],
      },
      {
        id: 'uebungen-info',
        title: 'Übungsinformationen und Statistik ansehen',
        blocks: [
          { steps: ['Im Workout: Tippe bei der Übung auf **Info**. Sonst: **Übungen** › Übung öffnen › **Info**.', 'Wechsle im Sheet zwischen den Tabs **Anleitung**, **Details** und **Verlauf**.'] },
          '**Anleitung** zeigt Schritte und Tipps, **Details** die beanspruchten Muskeln (**Primär**, **Sekundär**) und den Schalter **Nie empfehlen**, **Verlauf** deine bisherigen Werte.',
          'Der Tab **Verlauf** listet deine bisherigen Einheiten mit dieser Übung. Diagramme mit Bestwerten findest du auf der Statistikseite der Übung, siehe „Entwicklung einer Übung verfolgen“.',
        ],
        related: ['verlauf-uebung'],
      },
      {
        id: 'uebungen-eigene',
        title: 'Eigene Übung erstellen',
        blocks: [
          { steps: ['Tippe unten auf **Übungen** und dann auf **+**.', 'Gib bei **Name der Übung** einen eindeutigen Namen ein.', 'Wähle **Gerät**, **Art** (**Verbundübung** oder **Isolationsübung**) und **Messgröße** (**Wiederholungen**, **Zeit (Sekunden)** oder **Distanz**).', 'Tippe auf die Muskeln: einmal **Hauptmuskel**, nochmal **Nebenmuskel** (zählt halb), nochmal **nicht beteiligt**. Mindestens ein Hauptmuskel ist nötig.', 'Optional: **Beschreibung** (eine Zeile pro Schritt) und **Bild wählen**.', 'Tippe auf **Übung anlegen**.'] },
          'Beim Gerät Kurzhantel oder Kettlebell bestimmst du über **Je Seite**, ob das Gewicht je Hand zählt (Volumen doppelt). Mit **Einseitig** erfasst du links und rechts getrennt. Beim Körpergewichtsgerät legt **Körpergewichtsanteil** fest, welcher Anteil deines Gewichts bewegt wird (Liegestütz ca. 64 %, Klimmzug ca. 95 %).',
          'Das Gerät „Cardio“ legt eine Cardio-Übung an (Minuten und Kilometer, zählt nie in Muskelstatistiken, wird nie automatisch geplant). **Assistiert** bedeutet: Das Gewicht ist die Unterstützung. Das Bild wird auf dem Gerät verkleinert und nur dort gespeichert.',
        ],
        related: ['uebungen-bearbeiten'],
      },
      {
        id: 'uebungen-bearbeiten',
        title: 'Übung bearbeiten, duplizieren oder löschen',
        blocks: [
          { steps: ['Öffne **Übungen** und tippe auf die Übung.', '**Bearbeiten**: bei eigenen Übungen im Abschnitt **Eigene Übung** auf **Bearbeiten**.', '**Duplizieren**: auf **Duplizieren** (**Als neue eigene Übung**). Das geht auch bei Standardübungen, so entsteht eine angepasste Variante.', '**Löschen**: bei eigenen Übungen auf **Löschen** und bestätigen.'] },
          'Löschen geht nur, wenn die Übung in keiner geloggten Einheit vorkommt. Ist sie nur in Programmen geplant, fragt die App nach und entfernt sie dort. Ausnahme: Würde ein Trainingstag dadurch leer, bleibt die Übung erhalten. Geloggte Einheiten korrigierst du im Verlauf.',
        ],
      },
      {
        id: 'uebungen-tauschen',
        title: 'Übung tauschen',
        blocks: [
          { steps: ['Tippe im Workout bei der Übung auf **Tauschen**. In der Programm-Vorschau gibt es den gleichen Knopf.', 'Entscheide mit dem Schalter **Im Programm übernehmen**, ob der Tausch dauerhaft gilt. Aus heißt: nur diese Einheit.', 'Tippe auf **Übung tauschen** und wähle eine Alternative. Passende Übungen für denselben Muskel stehen oben, darunter die freie Auswahl.'] },
          'Die neue Übung startet ohne Historie. Im laufenden Workout gehen die abgehakten Sätze der alten Übung verloren, die App weist darauf hin. Tauschst du auf eine andere Art, werden Wochenziele verworfen.',
        ],
        related: ['uebungen-entfernen', 'faq-nicht-moeglich'],
      },
      {
        id: 'uebungen-hinzufuegen',
        title: 'Übung im laufenden Workout hinzufügen',
        blocks: [
          { steps: ['Tippe im Workout in der Übungsleiste oben auf **+** (**Übung hinzufügen**).', 'Wähle die Übung aus der Bibliothek.'] },
          'Die Übung wird für diese Einheit angehängt und startet mit drei Sätzen. Ins Programm übernimmst du neue Übungen beim Erstellen oder indem du eine vorhandene mit **Tauschen** ersetzt.',
        ],
      },
      {
        id: 'uebungen-entfernen',
        title: 'Übung entfernen oder für eine Woche auslassen',
        blocks: [
          { steps: ['Tippe im Workout bei der Übung auf **Tauschen**.', 'Wähle **Übung entfernen** und bestätige mit **Wirklich entfernen?**.'] },
          'Je nach Schalter **Im Programm übernehmen** betrifft es das Programm dauerhaft oder nur diese Einheit. Die letzte Übung eines Workouts lässt sich nicht entfernen. Nur für eine Woche auslassen: Vorschau › **Ziele** › **In dieser Woche auslassen**.',
        ],
        related: ['programm-wochenziele'],
      },
      {
        id: 'uebungen-nie-empfehlen',
        title: 'Eine Übung nie empfehlen lassen',
        blocks: [
          { steps: ['Öffne die Übung (**Übungen** › Übung, oder im Workout **Info**).', 'Wechsle im Sheet zum Tab **Details**.', 'Schalte **Nie empfehlen** ein.'] },
          'Die Übung taucht dann weder im automatisch erstellten Programm noch in den Tauschvorschlägen auf. In der freien Auswahl bleibt sie sichtbar, und bestehende Programme ändern sich nicht.',
        ],
      },
      {
        id: 'uebungen-geraetestufen',
        title: 'Verfügbare Gerätegewichte einstellen',
        blocks: [
          'Nicht jedes Gewicht ist verfügbar: Kurzhanteln gehen vielleicht in 2-kg-Schritten, Maschinen in festen Stufen. Damit die App nur Gewichte vorschlägt, die du einstellen kannst, legst du sie fest.',
          { steps: ['Öffne **Übungen** und tippe auf die Übung.', 'Tippe im Abschnitt **Übungsspezifisch** bei **Gerätegewichte** auf **Ändern**.', 'Lege einen oder mehrere Bereiche fest: **Bereichsanfang**, **Bereichsende** und **Schrittweite**. Optional ergänzt du eine Mikro-Stufe (z. B. ein kleines Zusatzgewicht an der Maschine).', 'Tippe auf **Speichern**.'] },
          'Die Werte erscheinen mit zwei Nachkommastellen. Die Progression rundet auf die nächste verfügbare Stufe. Ist der nächste Sprung für die Wiederholungen zu groß, steigen erst die Wiederholungen über die Obergrenze (**Bereich erweitern**, einstellbar unter **Mehr** › **Workouts** › **Progression**).',
        ],
        related: ['faq-weiter-wdh'],
      },
    ],
  },
  {
    id: 'verlauf',
    title: 'Verlauf und Auswertung',
    desc: 'Einheiten ansehen und korrigieren, Statistiken verstehen',
    icon: 'history',
    articles: [
      {
        id: 'verlauf-ansehen',
        title: 'Vergangene Workouts ansehen',
        blocks: [
          { steps: ['Öffne **Mehr** › **Funktionseinstellungen** › **Verlauf**, oder auf der Seite **Workouts** das **Workouts-Menü** (⋯) › **Verlauf ansehen und bearbeiten**.', 'Die Liste ist nach Datum sortiert. Tippe auf eine Einheit, um alle Sätze zu sehen.'] },
        ],
      },
      {
        id: 'verlauf-bearbeiten',
        title: 'Vergangenes Workout bearbeiten',
        blocks: [
          { steps: ['Öffne den **Verlauf** und tippe auf die Einheit.', 'Ändere Sätze, füge mit **Übung hinzufügen** Übungen hinzu oder entferne sie.', 'Ändere bei Bedarf **Datum**, **Startzeit**, **Dauer (Minuten, leer = unbekannt)** und **Programmwoche**.', 'Tippe auf **Änderungen speichern**. Mit **Änderungen verwerfen?** gehst du ohne Speichern zurück.'] },
          'Ändert sich das Datum, verschieben sich Start und Ende mit derselben Uhrzeit. Zeilen ohne Wiederholungen werden beim Speichern verworfen, eine Einheit ohne Sätze lässt sich nur löschen.',
          'Verlässt eine Einheit durch eine Datums- oder Wochenänderung die aktuelle Woche, wird ihr Slot im Wochenplan wieder frei, und umgekehrt. Frühere Wochen bleiben unverändert. Progression, 1RM und Plateau-Erkennung rechnen live aus den Einheiten, eine Korrektur wirkt also sofort überall.',
        ],
        related: ['verlauf-loeschen', 'faq-bearbeiten'],
      },
      {
        id: 'verlauf-loeschen',
        title: 'Vergangenes Workout löschen',
        blocks: [
          { steps: ['Öffne die Einheit im **Verlauf**.', 'Tippe auf **Einheit löschen**.', 'Wähle **Löschen, Tag wieder freigeben** (der Trainingstag steht in dieser Woche wieder offen) oder **Löschen, Tag bleibt erledigt**.', 'Bestätige mit **Endgültig löschen**.'] },
          'Progression, 1RM und Statistiken rechnen danach ohne diese Einheit weiter. Das Löschen lässt sich nicht rückgängig machen.',
        ],
      },
      {
        id: 'verlauf-uebung',
        title: 'Entwicklung einer Übung verfolgen',
        blocks: [
          { steps: ['Öffne das **Dashboard** und tippe bei den Rekorden auf die Kachel der Übung. Die Statistikseite öffnet sich.', 'Wähle Kennzahl und Zeitraum (**Täglich**, **Wöchentlich**, **Monatlich**).', 'Mit **Diagramm-Glättung** stellst du ein, wie stark der Verlauf gemittelt wird.', 'Eine einfache Liste deiner Einheiten mit dieser Übung findest du im Tab **Verlauf** des Info-Sheets (**Übungen** › Übung › **Info**).'] },
          ['Geschätzter 1RM nach Epley (ab 12 Wiederholungen gedämpft)', 'Schwerstes Gewicht und bester Satz', 'Gesamtvolumen, Gesamtwiederholungen, Gesamtsätze'],
          'Ein Bestwert wird zum Rekord, wenn du das bisherige Maximum übertriffst. Cardio und Aufwärmsätze fließen nicht ein.',
        ],
        related: ['uebungen-info'],
      },
      {
        id: 'verlauf-muskel',
        title: 'Sätze und Volumen je Muskel ansehen',
        blocks: [
          { steps: ['Öffne das **Dashboard** › **Volumen** › Körperkarte.', 'Tippe in der Liste auf einen Muskel und dann auf **Verlauf ansehen**.'] },
          'Die Muskelstatistik zeigt, wie viele Sätze du über die Wochen für den Muskel trainiert hast. Primäre Muskeln zählen voll, sekundäre mit dem Faktor 0,5. Als grobe Orientierung gelten etwa 10 bis 20 harte Sätze pro Muskel und Woche für Muskelaufbau. Das ist ein Richtwert, kein Gesetz.',
        ],
        related: ['dashboard-koerperkarte'],
      },
      {
        id: 'verlauf-vorschlag',
        title: 'Warum schlägt die App diese Werte vor?',
        blocks: [
          'Unter jeder Übung steht im Workout und in der Vorschau die Zeile **Warum dieser Vorschlag?**. Tippe darauf, um die Begründung zu lesen. Der Titel nennt den Grund, der Text zeigt die Letzte Einheit, den Vorschlag und die Regel dahinter.',
          'Mögliche Gründe:',
          ['**Eine Wiederholung mehr**: Das Gewicht bleibt, bis alle Sätze die Obergrenze erreichen', '**Obergrenze erreicht**: Alle Sätze lagen oben, das Gewicht steigt, die Wiederholungen gehen zurück', '**Etwas schwerer / Etwas leichter**: aus der letzten Leistung (geschätzter 1RM) passt ein anderes Gewicht zum Zielbereich und Ziel-RIR', '**Gleiche Belastung**: der nächste Schritt wäre ein zu großer Sprung', '**Erstes Zusatzgewicht**: bei Körpergewichtsübungen an der Obergrenze', '**Zeit steigt**: bei Zeit- oder Distanzübungen +5 je Einheit', '**Große Gewichtsstufe**: erst mehr Wiederholungen über dem Zielbereich, dann mehr Gewicht', '**Gewichtsgrenze**: Mit den verfügbaren Gewichten ist der Zielbereich nicht sauber erreichbar', '**Plateau-Reset**: Stagnation über mehrere Einheiten, Gewicht sinkt um etwa 5 %', '**Nach Trainingspause**: nach mehr als drei Wochen Pause startet der Vorschlag niedriger'],
          'Bei größeren Änderungen (über 10 % Gewicht oder mehr als 3 Wiederholungen) steht dort **Vorschlag bitte prüfen**. Prüfe dann, ob der Wert zu deiner Tagesform passt. Bei neuen Übungen ohne Historie gibt es keinen Vorschlag.',
        ],
        related: ['faq-vorschlag', 'einstellungen-progression'],
      },
    ],
  },
  {
    id: 'koerper',
    title: 'Körperwerte',
    desc: 'Gewicht, Maße und Import aus anderen Apps',
    icon: 'weight',
    articles: [
      {
        id: 'koerper-gewicht',
        title: 'Körpergewicht eintragen',
        blocks: [
          { steps: ['Tippe auf **＋** › **Gewicht eintragen**, oder öffne **Mehr** › **Daten** › **Körpergewicht**.', 'Gib dein Gewicht ein.', 'Tippe auf **Eintragen**.'] },
          'Ein Eintrag pro Tag genügt. Wiege dich möglichst unter gleichen Bedingungen, zum Beispiel morgens nach dem Aufstehen. Die Seite zeigt Messwerte als Punkte und den Trend als Linie. Gespeichert wird immer in Kilogramm, die Anzeige folgt deiner Einheit.',
        ],
        related: ['dashboard-trend', 'koerper-import'],
      },
      {
        id: 'koerper-masse',
        title: 'Körpermaße eintragen',
        blocks: [
          { steps: ['Tippe auf **＋** › **Maße eintragen**, oder öffne **Mehr** › **Daten** › **Körpermaße**.', 'Wähle die Kennzahl (z. B. **Taille**, **Brust**, **Bizeps links**).', 'Gib den Wert ein und tippe auf **Eintragen**.'] },
          'Trage nicht jede Woche alles ein, ein Intervall von 2 bis 4 Wochen reicht. Für vergleichbare Werte: gleiche Tageszeit, locker stehen, Maßband anliegend, nicht einschneidend, immer an derselben Stelle. Werte werden intern in cm gespeichert.',
        ],
      },
      {
        id: 'koerper-vergleich',
        title: 'Veränderungen über die Zeit vergleichen',
        blocks: [
          { steps: ['Öffne **Mehr** › **Daten** › **Körpermaße**.', 'Scrolle zur Karte **Vergleich**.', 'Wähle **4 Wochen**, **3 Monate**, **1 Jahr** oder **Gesamt**.'] },
          'Der Ausgangswert ist der letzte Eintrag am oder vor Beginn des Zeitraums, sonst der erste Eintrag darin. Verglichen wird mit dem neuesten. Ein Wert braucht mindestens zwei Einträge an verschiedenen Tagen.',
        ],
      },
      {
        id: 'koerper-import',
        title: 'Gewichtsdaten importieren',
        blocks: [
          'Die App hat als Web-App keinen direkten Zugriff auf Apple Health oder Health Connect. Du importierst stattdessen eine Datei.',
          { steps: ['Exportiere in der Health-App deine Daten (**export.xml**) oder erstelle eine CSV-Datei mit Datum und kg je Zeile.', 'Öffne **Mehr** › **Daten**.', 'Tippe auf **Gewichtsdaten importieren** und wähle die Datei.'] },
          'Die App meldet, wie viele Gewichtswerte importiert wurden.',
        ],
        related: ['einstellungen-backup'],
      },
    ],
  },
  {
    id: 'einstellungen',
    title: 'Weitere Einstellungen und Sonstiges',
    desc: 'Einheiten, Sprache, Backup, Import und Export',
    icon: 'sliders',
    articles: [
      {
        id: 'einstellungen-ueberblick',
        title: 'Die Einstellungen im Überblick',
        blocks: [
          'Das Menü **Mehr** gliedert sich in:',
          ['**Allgemein**: Profil, Einheiten, Sprache', '**Funktionseinstellungen**: Dashboard, Workouts, Verlauf, Übungen', '**Design**: hell, dunkel oder System', '**Daten**: Körpergewicht, Körpermaße, Periode, Backup und Import', '**Support**: Wissensdatenbank', '**Sonstiges**: Über'],
          'Unter **Mehr** › **Workouts** findest du **Pause**, **Aufwärmen**, **Progression**, **Langhantel** und **Anzeige**.',
        ],
      },
      {
        id: 'einstellungen-einheiten',
        title: 'Einheiten ändern',
        blocks: [
          { steps: ['Öffne **Mehr** › **Einheiten**.', 'Wähle **Gewicht** (kg oder lb), **Länge** (cm oder in / ft), **Distanz** (km oder mi) und **Zeitformat** (24 h oder 12 h).'] },
          'Intern speichert die App immer metrisch. Ein Wechsel ändert deshalb nur Anzeige und Eingabe, nichts geht verloren und nichts wird doppelt umgerechnet.',
        ],
      },
      {
        id: 'einstellungen-sprache-design',
        title: 'Sprache und Design ändern',
        blocks: [
          { steps: ['Öffne **Mehr**.', '**Sprache**: Tippe im Bereich **Allgemein** bei **Sprache** auf **DE** oder **EN**. Die App lädt neu.', '**Design**: Wähle im Bereich **Design** eine der drei Kacheln (System, Hell, Dunkel).'] },
          'Gespeicherte Texte wie Programmnamen und Notizen behalten die Sprache, in der du sie angelegt hast.',
        ],
      },
      {
        id: 'einstellungen-progression',
        title: 'Progression einstellen',
        blocks: [
          { steps: ['Öffne **Mehr** › **Workouts**.', 'Gehe zum Bereich **Progression**.'] },
          ['**Zielwert nach einer Steigerung**: **Mitte des Bereichs** (kleinere Sprünge, Standard) oder **Untergrenze** (klassische Double Progression)', '**Weight Match** (nur bei „Mitte des Bereichs“): Gewicht halten, solange die Wiederholungen im Bereich bleiben', '**Harter Satz zuerst**: der erste Arbeitssatz geht 1 RIR näher ans Versagen', '**Bereich erweitern**: bei zu großem Gewichtssprung erst mehr Wiederholungen', '**Sätze im Workout vorbelegen**: **Vorschlag** oder **Letzte Werte**'],
        ],
        related: ['faq-vorschlag', 'uebungen-geraetestufen'],
      },
      {
        id: 'einstellungen-display',
        title: 'Anzeige im Workout einstellen',
        blocks: [
          { steps: ['Öffne **Mehr** › **Workouts**.', 'Gehe zum Bereich **Anzeige**.'] },
          ['**Automatisch zur nächsten Übung**: springt nach der letzten Wiederholung zur nächsten offenen Übung (Supersätze wechseln immer)', '**Ton am Ende der Pause**', '**Display aktiv halten**: das Display bleibt während eines Workouts an', '**Erledigte Aufwärmsätze ausblenden**'],
        ],
      },
      {
        id: 'einstellungen-backup',
        title: 'Backup erstellen und wiederherstellen',
        blocks: [
          'Alle Daten liegen nur lokal auf deinem Gerät. Die App hat kein Konto und keinen Server. Deshalb ist ein regelmäßiges Backup wichtig, besonders vor einem Gerätewechsel.',
          { steps: ['Öffne **Mehr** › **Daten**.', 'Tippe auf **Backup exportieren (JSON)** und lege die Datei sicher ab (z. B. in iCloud Drive).', 'Zum Wiederherstellen: **Backup importieren** und die Datei wählen. Dabei werden alle aktuellen Daten ersetzt, die App fragt vorher nach.'] },
        ],
        related: ['faq-daten'],
      },
      {
        id: 'einstellungen-export',
        title: 'Trainingsdaten als CSV exportieren',
        blocks: [
          { steps: ['Öffne **Mehr** › **Daten**.', 'Wähle optional einen Zeitraum bei **Von** und **Bis**.', 'Wähle optional mit **Nur eine Übung exportieren** eine einzelne Übung. **Übungsfilter entfernen** hebt es auf.', 'Tippe auf **Einheiten exportieren (CSV)**.'] },
          'Die Datei hat eine Zeile pro Satz. Das Format entspricht dem des Trainingsimports, ein Export lässt sich also wieder einlesen.',
        ],
        related: ['einstellungen-import'],
      },
      {
        id: 'einstellungen-import',
        title: 'Trainingsverlauf importieren',
        blocks: [
          'Hast du Daten aus einer anderen App, importierst du sie als CSV (eine Zeile pro Satz mit Datum, Übung, Gewicht, Wiederholungen, RIR).',
          { steps: ['Öffne **Mehr** › **Daten**.', 'Tippe auf **Trainingsverlauf importieren (CSV)** und wähle die Datei.', 'Prüfe unter **Übungen zuordnen** die Vorschläge. Für Übungen **ohne Zuordnung** wählst du eine passende Übung oder **Überspringen**.', 'Tippe auf **… Einheiten importieren**.'] },
          'Englische Übungsnamen ordnet die App automatisch zu. Importierte Einheiten stehen als freie Einheiten im Verlauf und fließen in Statistik und Vorschläge ein. Übungen, die an einem Tag schon geloggt sind, werden übersprungen, ein wiederholter Import ist daher unschädlich. Bei Distanzübungen steht die Strecke in der Spalte „Wdh.“.',
        ],
      },
      {
        id: 'einstellungen-zuruecksetzen',
        title: 'Daten oder Einstellungen zurücksetzen',
        blocks: [
          { steps: ['**Alle Daten löschen**: **Mehr** › **Daten** › **Alle Daten zurücksetzen**. Die App bietet **Erst ein Backup erstellen** an, danach **Endgültig löschen**.', '**Nur Einstellungen**: **Mehr** › **Über** › **Einstellungen zurücksetzen**. Programme und Einheiten bleiben dabei erhalten.'] },
          'Das Löschen aller Daten ist endgültig. Programme, Workouts, Körpergewicht, Maße, eigene Übungen und Einstellungen verschwinden vom Gerät.',
        ],
      },
    ],
  },
  {
    id: 'faq',
    title: 'Häufig gestellte Fragen',
    desc: 'Kurze Antworten auf Fragen, die oft auftauchen',
    icon: 'help',
    articles: [
      {
        id: 'faq-rir',
        title: 'Was ist RIR und wie nutze ich es?',
        blocks: [
          'RIR (Reps in Reserve) sagt, wie viele Wiederholungen du am Satzende noch geschafft hättest. RIR 2: noch zwei saubere Wiederholungen wären möglich gewesen.',
          'Am Anfang schätzt man oft zu optimistisch. Hilfreich ist, Sätze gelegentlich nahe ans Versagen zu führen, um ein Gefühl zu bekommen. Auch dafür gibt es die Option **Harter Satz zuerst**. Ein ehrlicher RIR ist wichtiger als ein perfekter.',
        ],
        related: ['logging-rir'],
      },
      {
        id: 'faq-vorschlag',
        title: 'Wie berechnet die App den nächsten Vorschlag?',
        blocks: [
          'Grundlage ist die Double Progression: Erreichst du in allen Arbeitssätzen die Obergrenze des Wiederholungsbereichs, steigt das Gewicht und die Wiederholungen starten wieder unten (oder in der Mitte, je nach Einstellung). Sonst wird eine Wiederholung mehr vorgeschlagen.',
          'Trägst du etwas anderes ein, rechnet die App aus deinem geschätzten 1RM (Epley) neu und wählt Gewicht und Wiederholungen für das Ziel-RIR. Die Gewichte passen zu deinen Gerätegewichten. Nach einer Pause von mehr als drei Wochen senkt sie den Vorschlag etwas, nach einem Leistungseinbruch beginnt die Plateau-Erkennung neu.',
          'Die Begründung zu jedem Vorschlag siehst du über **Warum dieser Vorschlag?**.',
        ],
        related: ['verlauf-vorschlag', 'einstellungen-progression'],
      },
      {
        id: 'faq-folgesaetze',
        title: 'Wie werden Folgesätze angepasst?',
        blocks: [
          'Hakst du einen Satz ab, der deutlich vom Plan abweicht (mehr als 1 RIR), passt die App die restlichen Sätze an, damit sie wieder zu deiner Tagesform passen. Gewicht und Wiederholungen werden aus dem Satz umgerechnet, mit einem kleinen Abzug je Satz für die Ermüdung.',
          'Das Gewicht ändert sich höchstens einmal, spätere Sätze verlieren dann nur Wiederholungen. Hast du eine Zeile von Hand geändert, bleibt sie, wie du sie eingegeben hast.',
        ],
      },
      {
        id: 'faq-deload',
        title: 'Was ist ein Deload?',
        blocks: [
          'Eine Entlastungswoche mit etwa halbem Satzvolumen und mehr Reserve, damit sich der Körper erholt. Sie kommt am Ende (oder zu Beginn) jedes Blocks aus 3 bis 8 Wochen. Du kannst sie im Programm abschalten.',
        ],
        related: ['programm-blocklaenge'],
      },
      {
        id: 'faq-pause',
        title: 'Was passiert, wenn ich Trainings verpasse?',
        blocks: [
          'Der Wochenplan ist kein Kalender mit festen Tagen. Du hakst Workouts durch Beenden ab. Verpasst du einen Tag, bleibt er offen, bis du ihn trainierst oder überspringst. Erst wenn alle Tage erledigt sind, beginnt die nächste Woche.',
          'Nach mehr als drei Wochen ohne Training senkt die App die vorgeschlagenen Gewichte schrittweise (1,5 % pro Woche, höchstens 15 %), damit du sanft wieder einsteigst.',
        ],
        related: ['logging-ueberspringen'],
      },
      {
        id: 'faq-wochenzyklus',
        title: 'Wie funktioniert der Wochenzyklus?',
        blocks: [
          'Eine Programmwoche hat sieben Plätze für Trainings- und Ruhetage. Erledigte Tage werden abgehakt, einen Ruhetag hakst du auf der Seite **Workouts** selbst ab. Sind alle sieben erledigt, zählt die Woche hoch, und die Ziele für die neue Woche werden berechnet.',
        ],
      },
      {
        id: 'faq-satztypen',
        title: 'Was sind Myo-, Drop- und Versagenssätze?',
        blocks: [
          'Das sind Intensitätstechniken. Der Versagenssatz geht bis RIR 0. Beim Dropsatz reduzierst du direkt danach das Gewicht und machst weiter, beim Myo-Segment folgt nach kurzer Pause eine weitere kurze Serie mit gleichem Gewicht.',
          'Sie sind hilfreich, wenn die Zeit knapp ist, aber auch anstrengend. Nutze sie sparsam, am besten bei Isolationsübungen. Wie du sie einträgst, steht unter „Satztypen: Versagen, Drop und Myo eintragen“.',
        ],
        related: ['logging-satztypen'],
      },
      {
        id: 'faq-nicht-moeglich',
        title: 'Ich kann eine Übung nicht machen. Was nun?',
        blocks: [
          'Tausche sie mit **Tauschen**. Die App schlägt dir Alternativen für denselben Muskel vor. Funktioniert die Übung nur heute nicht, schalte **Im Programm übernehmen** aus, dann bleibt dein Plan unverändert. Fehlt dir die Übung in der Bibliothek, lege eine eigene an.',
        ],
        related: ['uebungen-tauschen', 'uebungen-eigene'],
      },
      {
        id: 'faq-startgewicht',
        title: 'Mit welchem Gewicht fange ich an?',
        blocks: [
          'Bei neuen Übungen ohne Historie schlägt die App kein Gewicht vor. Wähle ein Gewicht, mit dem du den Wiederholungsbereich bei etwa 2 bis 3 RIR schaffst. Lieber zu leicht beginnen. Der erste Satz kalibriert dann die weiteren Sätze: Weicht dein RIR deutlich ab, passt die App die Folgesätze an.',
        ],
      },
      {
        id: 'faq-weiter-wdh',
        title: 'Warum werden sehr viele Wiederholungen vorgeschlagen?',
        blocks: [
          'Ist die nächste Gewichtsstufe deines Geräts so groß, dass du damit nicht mal die Untergrenze des Bereichs schaffen würdest, bleibt das Gewicht gleich und die Wiederholungen steigen über die Obergrenze, höchstens bis Obergrenze plus 2 (oder 25 %). Danach springt die App mit den machbaren Wiederholungen auf die nächste Stufe.',
          'Hast du kleinere Gewichtsschritte (z. B. Mikro-Scheiben), trage sie bei **Gerätegewichte** ein. Die Funktion **Bereich erweitern** lässt sich ausschalten.',
        ],
        related: ['uebungen-geraetestufen'],
      },
      {
        id: 'faq-bearbeiten',
        title: 'Kann ich geloggte Sätze nachträglich ändern?',
        blocks: [
          'Ja. Öffne die Einheit im **Verlauf** und ändere oder lösche Sätze. Alle Statistiken und Vorschläge werden sofort neu berechnet.',
        ],
        related: ['verlauf-bearbeiten'],
      },
      {
        id: 'faq-daten',
        title: 'Wo sind meine Daten gespeichert?',
        blocks: [
          'Nur lokal auf deinem Gerät, in der Datenbank deines Browsers. Es gibt kein Konto, keinen Server und keine Netzwerkaufrufe. Das schützt deine Privatsphäre, bedeutet aber auch: Löschst du die App-Daten im Browser oder wechselst das Gerät, sind die Daten ohne Backup weg. Erstelle deshalb regelmäßig ein Backup.',
        ],
        related: ['einstellungen-backup'],
      },
      {
        id: 'faq-health',
        title: 'Geht eine Verbindung zu Apple Health?',
        blocks: [
          'Direkter Zugriff ist in einer Web-App technisch nicht möglich. Importiere stattdessen den Health-Export (export.xml) oder eine CSV-Datei. Eine automatische Anbindung wäre erst mit einer nativen Hülle möglich.',
        ],
        related: ['koerper-import'],
      },
    ],
  },
]

export const ALL_ARTICLES: { cat: HelpCategory; article: HelpArticle }[] = HELP_CATEGORIES.flatMap((cat) => cat.articles.map((article) => ({ cat, article })))

export function findArticle(id: string) {
  return ALL_ARTICLES.find((x) => x.article.id === id)
}

/** Suche in Titeln und Texten (Groß-/Kleinschreibung egal, alle Wörter müssen vorkommen). */
export function searchArticles(q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const flat = (b: HelpBlock): string => (typeof b === 'string' ? b : Array.isArray(b) ? b.join(' ') : b.steps.join(' '))
  return ALL_ARTICLES.filter(({ article }) => {
    const hay = (article.title + ' ' + article.blocks.map(flat).join(' ')).toLowerCase()
    return words.every((w) => hay.includes(w))
  }).sort((a, b) => Number(words.every((w) => b.article.title.toLowerCase().includes(w))) - Number(words.every((w) => a.article.title.toLowerCase().includes(w))))
}
