import type { ClockState } from '../../engine/workoutClock'

export interface Row {
  id: string
  type: 'warmup' | 'work'
  weight: string
  reps: string
  rir: string
  done: boolean
  minutes: string
  km: string
  /** Gewicht von Hand geändert: wird von der RIR-Anpassung nicht überschrieben */
  manual?: boolean
  /** Geplantes Gewicht (kg), Wdh. und RIR dieses Arbeitssatzes: Grundlage der RIR-Anpassung (fehlt bei älteren Workouts) */
  planKg?: number | null
  planReps?: number
  planRir?: number
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
}

export const uid = () => Math.random().toString(36).slice(2, 10)
