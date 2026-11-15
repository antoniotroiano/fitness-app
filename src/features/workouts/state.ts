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
}

/** Laufendes Workout, wird in der DB zwischengespeichert (übersteht Reload). */
export interface ActiveWorkout {
  /** Route-Parameter (s0, d2 …) */
  param: string
  programId: number | null
  clock: ClockState
  rows: Record<string, Row[]>
  current: string
}

export const uid = () => Math.random().toString(36).slice(2, 10)
