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
  /** Messgröße: Wiederholungen (Default) oder Zeit in Sekunden (Halten/Tragen). Zeitübungen: Progression +5 s, kein 1RM/Volumen. */
  metric?: 'reps' | 'time'
}

export type Goal = 'hypertrophy' | 'strength' | 'both'
export type Split = 'fullBody' | 'ulfb' | 'ppl' | 'none'
export type RepScheme = 'static' | 'linear' | 'reverseLinear' | 'undulating'
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
}

export interface LoggedSet {
  reps: number
  weight: number
  rir?: number
  /** Aufwärmsatz: zählt nie in Volumen, e1RM oder Progression */
  warmup?: boolean
  /** Cardio: Minuten und Kilometer */
  minutes?: number
  km?: number
}

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
  /** Pause nach Aufwärmsatz: Verbundübung / sonstige */
  warmupRestCompound: number
  warmupRestOther: number
  /** Aufwärm-Automatik: Smart (Frische + Gewicht), feste Schemata oder aus */
  /** Display aktiv halten, solange ein Workout läuft */
  keepAlive: boolean
  warmupMode: 'smart' | 'scheme' | 'off'
  /** Standard-Aufwärmschemata je Übungskategorie */
  warmupSchemes: Record<RestCategory, WarmupStep[]>
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
}

/** Verfügbare Gewichte: gleichmäßiges Raster oder Einzelwerte (alles in kg). */
export type WeightScale =
  | { kind: 'range'; min: number; max: number; step: number }
  | { kind: 'list'; weights: number[] }

export interface WeekState {
  /** Programmwoche (0-basiert) */
  week: number
  /** erledigte Slots in der aktuellen Woche */
  done: boolean[]
  /** yyyy-mm-dd der Tage mit Workout/Ruhetag in dieser Woche */
  markedDates: string[]
}
