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
}

export interface WeightEntry {
  id?: number
  date: string
  kg: number
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
  name: string
  birthday: string
  sex: '' | 'm' | 'f' | 'x'
  heightCm: number | null
  /** Pausen nach Arbeitssätzen in Sekunden pro Übungskategorie */
  restSeconds: Record<RestCategory, number>
  /** Pause nach Aufwärmsatz: Verbundübung / sonstige */
  warmupRestCompound: number
  warmupRestOther: number
  /** Aufwärmsätze automatisch vorschlagen */
  warmupsEnabled: boolean
}

export interface WeekState {
  /** Programmwoche (0-basiert) */
  week: number
  /** erledigte Slots in der aktuellen Woche */
  done: boolean[]
  /** yyyy-mm-dd der Tage mit Workout/Ruhetag in dieser Woche */
  markedDates: string[]
}
