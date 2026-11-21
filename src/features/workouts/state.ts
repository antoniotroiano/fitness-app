import type { ClockState } from '../../engine/workoutClock'
import type { PlannedExercise } from '../../types'

export interface Row {
  id: string
  /** Arbeitssatz, Aufwärmsatz oder Segment (Fortsetzung des Arbeitssatzes davor) eines Drop-/Myo-Satzes */
  type: 'warmup' | 'work' | 'drop' | 'myo'
  weight: string
  reps: string
  rir: string
  done: boolean
  minutes: string
  km: string
  /** Gewicht oder Wdh. von Hand geändert: wird von der RIR-Anpassung nicht überschrieben */
  manual?: boolean
  /** Geplantes Gewicht (kg), Wdh. und RIR dieses Arbeitssatzes: Grundlage der RIR-Anpassung (fehlt bei älteren Workouts) */
  planKg?: number | null
  planReps?: number
  planRir?: number
  /** Satz bis zum Versagen (geplant in der letzten Arbeitswoche oder als Satztyp gewählt): Wdh. sind das Minimum */
  failure?: boolean
  /** Teilwiederholungen zusätzlich zu den vollen */
  partial?: string
}

/** Laufendes Workout, wird in der DB zwischengespeichert (übersteht Reload). */
export interface ActiveWorkout {
  /** Route-Parameter (s0, d2 …) */
  param: string
  programId: number | null
  clock: ClockState
  rows: Record<string, Row[]>
  current: string
  /** Notizen dieser Einheit je Übungs-ID */
  notes?: Record<string, string>
  /** Während des Workouts hinzugefügte Übungen: werden beim Abschluss dauerhaft in den Trainingstag übernommen */
  added?: PlannedExercise[]
}

export const uid = () => Math.random().toString(36).slice(2, 10)

export const isSegment = (r: Pick<Row, 'type'>) => r.type === 'drop' || r.type === 'myo'
