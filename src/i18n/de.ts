/**
 * UI-Texte (Deutsch). Zentrale Stelle für Beschriftungen, damit später ein Sprachumschalter möglich ist
 * (weitere Sprachdateien mit derselben Struktur). Reine Daten, keine Logik außer kleinen Formatierern.
 */
export const de = {
  nav: { more: 'Mehr' },
  wizard: {
    q: {
      mode: 'Wie möchtest du deinen Plan erstellen?', goal: 'Was ist dein Ziel?', days: 'An wie vielen Tagen willst du trainieren?',
      split: 'Wie soll dein Training aufgeteilt werden?', time: 'Wie viel Zeit hast du pro Training?',
      rep: 'Wie sollen sich die Wiederholungen über die Wochen entwickeln?', focus: 'Welche Muskeln sollen Priorität haben?',
      deload: 'Wie lang soll ein Trainingsblock sein?', exp: 'Wie viel Trainingserfahrung hast du?',
      equipment: 'Welche Geräte stehen dir zur Verfügung?', identity: 'Wie soll dein Programm heißen?', preview: 'So sieht dein Plan aus',
    },
    perWeek: 'Mal pro Woche', auto: 'Automatisch', autoDesc: 'Wir wählen eine empfohlene Option für dich aus',
    selectAll: 'Alles auswählen', week: (n: number) => `Woche ${n}`, deload: 'Deload',
  },
  common: {
    edit: 'Bearbeiten', change: 'Bearbeiten', default: 'Standard', general: 'Allgemein', display: 'Anzeige',
    sets: 'Sätze', reps: 'Wdh.', seconds: 'Sek.', streak: 'Serie', scheme: 'Schema', note: 'Notiz', restDay: 'Ruhetag',
    weight: 'Gewicht', bodyFat: 'Körperfett', best: 'Bester', loading: 'Lädt …', showAll: 'Alle anzeigen',
  },
  dashboard: {
    recentRecords: 'Letzte Rekorde', bodyMetrics: 'Körperwerte', weightAndBodyFat: 'Gewicht & Körperfett', ratios: 'Verhältnisse',
    last7Entries: 'Letzte 7 Einträge',
  },
  workouts: {
    activeProgram: 'Aktives Programm', library: 'Workout-Bibliothek', expand: 'Alle öffnen', collapse: 'Alle schließen',
    week: (n: number) => `Woche ${n}`, targetMuscles: 'Zielmuskeln',
  },
  logger: {
    set: 'Satz', addSet: 'Satz hinzufügen', previous: 'Zuletzt', perSide: (unit: string) => `${unit}/Seite`, repsPerSide: 'Wdh./Seite',
    warmup: 'Aufwärmen', calculator: 'Satzrechner', targetReps: (min: number, max: number) => `Ziel: ${min}–${max} Wdh.`,
    targetSeconds: (min: number, max: number) => `Ziel: ${min}–${max} Sek.`,
    targetMeters: (min: number, max: number) => `Ziel: ${min}–${max} m`,
    resume: 'Workout fortsetzen', pause: 'Workout pausieren', minimize: 'Workout minimieren', finish: 'Workout beenden',
    discard: 'Workout verwerfen', logCompleted: 'Nur abgehakte Sätze speichern', logAll: 'Alle Sätze speichern',
    logAllHint: '„Alle Sätze speichern“ übernimmt auch nicht abgehakte Sätze mit den eingetragenen Werten.',
    complete: 'Workout abgeschlossen',
  },
  info: { instructions: 'Anleitung', details: 'Details', history: 'Verlauf' },
  notes: { session: 'Einheit', exercise: 'Übung', program: 'Programm' },
  warmup: {
    automation: 'Aufwärm-Automatik', scheme: 'Aufwärmschema', restTimer: 'Pausentimer',
    optDefault: 'Standard', optSmart: 'Smart-Aufwärmen', optScheme: 'Schema-Aufwärmen', optNone: 'Aus',
    descDefault: 'Die Aufwärm-Automatik folgt der App-Einstellung (Mehr › Workouts › Aufwärmen).',
    descSmart: 'Aufwärmsätze werden automatisch passend zur Frische der Muskeln und zur Schwere des Gewichts hinzugefügt.',
    descScheme: 'Aufwärmsätze folgen einem festen Schema aus Prozent und Wiederholungen (Standard der Kategorie oder eigenes Schema).',
    descNone: 'Aufwärmsätze werden nicht automatisch zu deinem Workout hinzugefügt.',
    hintAppLevel: 'Die Aufwärm-Automatik folgt den App-Einstellungen.',
    hintNone: 'Aufwärmsätze werden nicht automatisch zu deinem Workout hinzugefügt.',
    hintAppSmart: 'Aufwärmsätze werden automatisch passend zur Frische der Muskeln und zur Schwere des Gewichts hinzugefügt.',
    hintAppScheme: 'Aufwärmsätze folgen dem Schema der jeweiligen Übungsgruppe.',
    hintAppNone: 'Aufwärmsätze werden nicht automatisch zu deinen Workouts hinzugefügt.',
    step: (pct: number, reps: number) => `${pct} % Arbeitsgewicht × ${reps} Wdh.`, resetScheme: 'Schema zurücksetzen',
    custom: 'Eigenes Schema', customOnly: 'Eigenes Schema nur für diese Übung.',
    hintRest: (def: string) => `Der Pausentimer folgt der Einstellung dieser Übungsgruppe (${def}).`,
  },
  exercise: {
    note: 'Übungsnotiz', overrides: 'Übungsspezifisch', infoValue: 'Anleitung, Details, Verlauf',
    weightScale: 'Gerätegewichte', rangeStart: 'Bereichsanfang', rangeEnd: 'Bereichsende', rangeStep: 'Schrittweite',
    addWeight: 'Gewicht hinzufügen', removeWeight: 'Gewicht entfernen', noWeights: 'Noch keine Gewichte.',
    scaleRangeIntro: 'Bereich und Schrittweite deines Geräts. Vorschläge werden darauf gerundet.',
    scaleListIntro: 'Wähle die Gewichte, die du zur Verfügung hast (bei Kurzhanteln je Seite). Vorschläge werden auf diese Werte gerundet.',
    scaleInvalid: 'Das Ende muss größer als der Anfang sein, die Schrittweite größer als 0.',
    resetDefault: 'Zurück zum Standard',
  },
  more: {
    title: 'Mehr', general: 'Allgemein', units: 'Einheiten', language: 'Sprache', features: 'Funktionen', theme: 'Design',
    themeSystem: 'System', themeLight: 'Hell', themeDark: 'Dunkel', data: 'Daten', other: 'Sonstiges', about: 'Über',
    keepAlive: 'Display aktiv halten', keepAliveDesc: 'Hält das Display während eines laufenden Workouts an.',
    seeLess: 'Weniger anzeigen', seeMore: (n: number) => `${n} weitere anzeigen`,
  },
  stats: {
    heaviest: 'Schwerstes Gewicht', totalVolume: 'Gesamtvolumen', bestSetVolume: 'Bester Satz (Volumen)', totalReps: 'Gesamt-Wdh.',
    bestSetReps: 'Bester Satz (Wdh.)', totalSets: 'Gesamt-Sätze', daily: 'Täglich', weekly: 'Wöchentlich', monthly: 'Monatlich',
    averaging: 'Diagramm-Glättung',
  },
} as const
