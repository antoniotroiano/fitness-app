import type { Exercise, MuscleId } from '../types'

export interface TargetMuscle {
  muscle: MuscleId
  exercises: number
  sets: number
}

/** Primäre Zielmuskeln eines Workouts mit Anzahl Übungen und geplanten Arbeitssätzen. Cardio zählt nie mit.
 *  Sortiert nach Sätzen (absteigend), bei Gleichstand nach Übungen. */
export function targetMuscles(items: { ex: Exercise; sets: number }[]): TargetMuscle[] {
  const map = new Map<MuscleId, TargetMuscle>()
  for (const { ex, sets } of items) {
    if (ex.cardio) continue
    for (const m of ex.primary) {
      const cur = map.get(m) ?? { muscle: m, exercises: 0, sets: 0 }
      cur.exercises += 1
      cur.sets += sets
      map.set(m, cur)
    }
  }
  return [...map.values()].sort((a, b) => b.sets - a.sets || b.exercises - a.exercises)
}
