export type MuscleId =
  | 'chest' | 'upperBack' | 'lats' | 'biceps' | 'triceps' | 'frontDelts' | 'sideDelts' | 'lowerBack'
  | 'abs' | 'traps' | 'rearDelts' | 'forearms' | 'obliques' | 'neck' | 'serratus'
  | 'quads' | 'glutes' | 'hamstrings' | 'calves' | 'abductors' | 'adductors' | 'tibialis'

export interface Muscle {
  id: MuscleId
  label: string
  region: 'upper' | 'lower'
}

export type Equipment =
  | 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'smith' | 'band' | 'kettlebell'
  | 'cardio'

export type Pattern =
  | 'horizontalPush' | 'verticalPush' | 'horizontalPull' | 'verticalPull'
  | 'squat' | 'hinge' | 'lunge' | 'isolation' | 'core' | 'cardio'

export interface Exercise {
  id: string
  name: string
  primary: MuscleId[]
  secondary: MuscleId[]
  equipment: Equipment
  pattern: Pattern
  compound: boolean
  cardio?: boolean
  custom?: boolean
  /** Assistierte Übung: das Gewicht ist die Unterstützung (weniger = schwerer), kein 1RM/Volumen */
  assisted?: boolean
  /** Kurzhantel/Kettlebell: je Seite (zwei Geräte bzw. beide Seiten, Volumen ×2) oder ein einzelnes Gerät. Fehlt bei anderem Equipment. */
  load?: 'single' | 'perSide'
  /** Messgröße: Wiederholungen (Default), Zeit in Sekunden (Halten/Tragen) oder Distanz in Metern (Tragen/Schieben). Zeit/Distanz: Wert in `reps`, Progression +5 s/+5 m, kein 1RM/Volumen (engine/metric.ts). */
  metric?: 'reps' | 'time' | 'distance'
  /** Einheit der Strecke bei `metric: 'distance'`: Meter (fehlt) oder Yards; der Wert wird in dieser Einheit gespeichert, nie umgerechnet. */
  distanceUnit?: 'm' | 'yd'
  /**
   * Körpergewichtsanteil (0–1): Anteil des Körpergewichts, der bewegt wird (Klimmzug ≈ 0,95, Liegestütz ≈ 0,64).
   * Last für 1RM/Volumen/Progression = Anteil × Körpergewicht + Zusatzgewicht (engine/bodyweight.ts).
   */
  bodyweight?: number
  /** Einseitige Übung (eine Seite nach der anderen): Sätze werden standardmäßig links/rechts getrennt erfasst */
  unilateral?: boolean
  /** Eigene Übungen: Beschreibung (eine Zeile = ein Schritt) */
  description?: string
  /** Eigene Übungen: verkleinertes Bild als Data-URL (JPEG, siehe utils/image.ts) */
  image?: string
}

export type Goal = 'hypertrophy' | 'strength' | 'both'
export type Split = 'fullBody' | 'ulfb' | 'ppl' | 'none'
export type RepScheme = 'static' | 'linear' | 'reverseLinear' | 'undulating' | 'rotating'
export type Experience = 'none' | 'beginner' | 'intermediate' | 'advanced'
export type TimeBudget = 'u20' | '20-40' | '40-60' | '60-90' | '90-120' | 'o120'
export type Priority = 'high' | 'low'

export interface ProgramConfig {
  mode: 'auto' | 'manual'
  goal: Goal
  days: number
  split: Split
  time: TimeBudget
  repScheme: RepScheme
  focus: Partial<Record<MuscleId, Priority>>
  deload: boolean
  /** Arbeitswochen pro Block vor der Deload-Woche (fehlt bei älteren Programmen: 4) */
  blockWeeks?: number
  /** Deload-Woche am Anfang statt am Ende des Blocks (z. B. nach einer Pause) */
  deloadFirst?: boolean
  /** Anzahl Blöcke bis zum Programm-Ende (fehlt = läuft endlos) */
  blocks?: number
  experience: Experience
  /** Verfügbares Equipment; undefined = alles */
  equipment?: Equipment[]
  /** Ausdrücklich gewählte Übungen (IDs); nur so plant der Generator zeitbasierte Übungen ein */
  includeExercises?: string[]
  name: string
  icon: string
  color: string
}

export interface PlannedExercise {
  exerciseId: string
  sets: number
  repMin: number
  repMax: number
  /** Ziel-RIR (reps in reserve) für die erste Woche */
  rir: number
  /**
   * Supersatz: benachbarte Übungen mit gleicher ID werden abwechselnd trainiert, die Pause folgt erst nach der Runde.
   * ID = Übungs-ID des ersten Mitglieds (engine/superset.ts `withLinks`).
   */
  superset?: string
  /**
   * Eigene Ziele je Woche (engine/periodization.ts `weekOverride`): Schlüssel `b<n>` = Position im Block
   * (0-basiert, inkl. Deload; gilt in jedem Block), `w<n>` = eine einzelne Programmwoche (hat Vorrang).
   */
  weeks?: Record<string, WeekTarget>
}

/** Ziele einer Übung in einer Woche, überschreiben die berechneten Werte; `skip` = Übung in dieser Woche auslassen */
export interface WeekTarget {
  sets?: number
  repMin?: number
  repMax?: number
  rir?: number
  skip?: boolean
}

export interface WorkoutDay {
  id: string
  name: string
  exercises: PlannedExercise[]
}

export interface Program {
  id?: number
  name: string
  icon: string
  color: string
  config: ProgramConfig | null
  days: WorkoutDay[]
  /** Reihenfolge in der Woche: Workout-Index oder 'rest' */
  weekSlots: (number | 'rest')[]
  createdAt: number
  active: boolean
  /** Im Archiv: nicht aktiv, in der Bibliothek ausgeblendet (fehlt = nicht archiviert) */
  archived?: boolean
}

export interface LoggedSet {
  reps: number
  weight: number
  rir?: number
  /** Aufwärmsatz: zählt nie in Volumen, e1RM oder Progression */
  warmup?: boolean
  /** Satz bis zum (technischen) Versagen, RIR 0 */
  failure?: boolean
  /**
   * Fortsetzung des vorherigen Arbeitssatzes: Drop-Satz (leichteres Gewicht) oder Myo-Mini-Satz (kurze Pause).
   * Zählt für Wdh. und Volumen, nicht als eigener Satz, nicht für 1RM, schwerstes Gewicht und Progression.
   */
  segment?: 'drop' | 'myo'
  /** Zusätzliche Teilwiederholungen: nur Protokoll, zählen nirgends mit */
  partial?: number
  /** Cardio: Minuten und Kilometer */
  minutes?: number
  km?: number
  /**
   * Links/rechts getrennt erfasst: Werte je Seite. `weight`/`reps`/`rir` oben sind dann die der schwächeren Seite
   * (engine/sides.ts `mergeSides`), Volumen zählt beide Seiten.
   */
  sides?: { l: SideSet; r: SideSet }
}

/** Werte einer Seite eines Satzes */
export interface SideSet { weight: number; reps: number; rir?: number; partial?: number }

export interface LoggedExercise {
  exerciseId: string
  sets: LoggedSet[]
}

export interface Session {
  id?: number
  programId: number | null
  dayIndex: number
  /** yyyy-mm-dd (lokal) */
  date: string
  finishedAt: number
  /** Start des Workouts (ms), optional bei älteren Einheiten */
  startedAt?: number
  /** Aktive Dauer in Sekunden ohne Pausen */
  durationSec?: number
  /** Programmwoche (0-basiert), für Rep-Schema und Deload */
  week: number
  exercises: LoggedExercise[]
  /** Notizen dieser Einheit je Übungs-ID */
  notes?: Record<string, string>
}

export interface WeightEntry {
  id?: number
  date: string
  kg: number
  /** Körperfett in Prozent (optional) */
  bodyFat?: number
  source: 'manual' | 'import'
}

export type MeasureSite =
  | 'neck' | 'shoulders' | 'bust' | 'chest' | 'waist' | 'hips'
  | 'bicepsL' | 'bicepsR' | 'forearmL' | 'forearmR' | 'wristL' | 'wristR'
  | 'thighL' | 'thighR' | 'calfL' | 'calfR' | 'ankleL' | 'ankleR'

export interface MeasureEntry {
  id?: number
  date: string
  /** Werte in cm */
  values: Partial<Record<MeasureSite, number>>
}

export type RestCategory = 'compoundUpper' | 'compoundLower' | 'isoUpper' | 'isoLower' | 'core'

export interface Settings {
  theme: 'system' | 'light' | 'dark'
  weightUnit: 'kg' | 'lb'
  lengthUnit: 'cm' | 'in'
  distanceUnit: 'km' | 'mi'
  clock: '24h' | '12h'
  /** Sprache der Oberfläche; Englisch ist vorerst nur ein Platzhalter */
  language: 'de' | 'en'
  name: string
  birthday: string
  sex: '' | 'm' | 'f' | 'x'
  heightCm: number | null
  /** Pausen nach Arbeitssätzen in Sekunden pro Übungskategorie */
  restSeconds: Record<RestCategory, number>
  /** Pause zwischen Aufwärmsätzen / nach dem letzten Aufwärmsatz (vor dem ersten Arbeitssatz), Sekunden */
  warmupRestBetween: number
  warmupRestLast: number
  /** Aufwärm-Automatik: Smart (Frische + Gewicht), feste Schemata oder aus */
  /** Display aktiv halten, solange ein Workout läuft */
  keepAlive: boolean
  warmupMode: 'smart' | 'scheme' | 'off'
  /** Standard-Aufwärmschemata je Übungskategorie */
  warmupSchemes: Record<RestCategory, WarmupStep[]>
  /** Progression: Zielwert nach einer Steigerung (Untergrenze = klassische Double Progression, Mitte des Bereichs) */
  progressionTarget: 'min' | 'mid'
  /** Progression (nur Mitte): Gewicht halten, solange die Wdh. im Bereich bleiben */
  weightMatch: boolean
  /** Progression: Wdh. über die Obergrenze, wenn die nächste Gewichtsstufe zu groß ist */
  expandRange: boolean
  /** RIR-Verteilung: erster Arbeitssatz am härtesten (Anker), danach Ziel-RIR; Versagenssatz zuerst */
  hardSetFirst: boolean
  /** Logger: abgehakte Aufwärmsätze zu einer Sammelzeile einklappen */
  hideDoneWarmups: boolean
  /** Logger: nach dem letzten Satz einer Übung zur nächsten offenen Übung wechseln (Supersätze wechseln immer) */
  autoAdvance: boolean
  /** Periode tracken (Standard aus): Seite unter Mehr, markierte Tage in kv['periodDays'] */
  periodTracking: boolean
  /** Pausentimer: Signalton am Ende der Pause (zusätzlich zur Vibration) */
  restSound: boolean
  /** Pause zwischen linker und rechter Seite eines Satzes, Sekunden (0 = kein Timer) */
  sideRest: number
  /** Logger-Vorbelegung der Arbeitssätze: Progressionsvorschlag oder Werte der letzten Einheit */
  prefillMode: 'suggestion' | 'last'
  /** Scheibenrechner: Gewicht der Langhantelstange und verfügbare Scheiben (kg) */
  barWeight: number
  plates: number[]
}

/** Ein Aufwärmsatz im Schema: Prozent des Arbeitsgewichts und Wiederholungen */
export interface WarmupStep { pct: number; reps: number }

export type WarmupOverrideMode = 'default' | 'smart' | 'scheme' | 'none'

/** Übungsspezifische Überschreibungen (global je Übung) */
export interface ExerciseOverride {
  warmupMode?: WarmupOverrideMode
  warmupScheme?: WarmupStep[]
  /** Dauerhafte Notiz zur Übung (max. 300 Zeichen) */
  note?: string
  /** Eigene Pause nach Arbeitssätzen in Sekunden */
  restSeconds?: number
  /** Verfügbare Gewichte des Geräts (kg). Ohne Eintrag: Standard-Schrittweite des Equipments. */
  weightScale?: WeightScale
  /** Links/rechts getrennt erfassen (fehlt: Standard der Übung, `Exercise.unilateral`) */
  sides?: boolean
  /** Nie empfehlen: Plan-Generator und Übungstausch schlagen die Übung nicht vor (manuell weiter wählbar) */
  neverRecommend?: boolean
}

/** Verfügbare Gewichte: gleichmäßiges Raster oder Einzelwerte (alles in kg). */
export type WeightScale =
  | { kind: 'range'; min: number; max: number; step: number }
  /** `segments`/`micro`: Quelle der Liste im Editor (mehrere Bereiche + Mikro-Stufe), die Engine nutzt nur `weights`. */
  | { kind: 'list'; weights: number[]; segments?: ScaleSegment[]; micro?: number }

/** Ein Bereich eines Gewichtsstapels: von … bis in `step`-Schritten (kg). */
export interface ScaleSegment { from: number; to: number; step: number }

export interface WeekState {
  /** Programmwoche (0-basiert) */
  week: number
  /** erledigte Slots in der aktuellen Woche */
  done: boolean[]
  /** yyyy-mm-dd der Tage mit Workout/Ruhetag in dieser Woche */
  markedDates: string[]
  /** Übersprungene Slots (zählen als erledigt, ohne Einheit) */
  skipped?: boolean[]
}
