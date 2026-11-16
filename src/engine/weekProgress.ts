import type { Exercise, MuscleId, Program, Session, WeekState } from '../types'
import { effectiveSets, weekPlan } from './periodization'

export interface WeekProgress {
  exercises: { done: number; total: number }
  sets: { done: number; total: number }
  muscles: { done: number; total: number }
}

/** Fortschritt der aktuellen Programmwoche (nur geplante Workout-Slots, primäre Muskeln). */
export function weekProgress(
  program: Program, state: WeekState, sessions: Session[], lookup: (id: string) => Exercise | undefined,
): WeekProgress {
  const plan = program.config ? weekPlan(program.config, state.week) : { isDeload: false, repShift: 0, rirDelta: 0, setsFactor: 1 }
  const cycle = sessions.filter((s) => s.programId === program.id && s.week === state.week)
  const plannedSets: Partial<Record<MuscleId, number>> = {}
  const doneSets: Partial<Record<MuscleId, number>> = {}
  let exTotal = 0, exDone = 0, setTotal = 0, setDone = 0

  const scheduled = program.weekSlots.filter((s): s is number => s !== 'rest')
  for (const dayIdx of new Set(scheduled)) {
    const day = program.days[dayIdx]
    if (!day) continue
    const session = cycle.find((s) => s.dayIndex === dayIdx)
    for (const pe of day.exercises) {
      const ex = lookup(pe.exerciseId)
      if (!ex || ex.cardio) continue
      const planned = effectiveSets(pe.sets, plan)
      const logged = session?.exercises.find((e) => e.exerciseId === pe.exerciseId)?.sets.filter((x) => !x.warmup).length ?? 0
      exTotal += 1
      if (logged > 0) exDone += 1
      setTotal += planned
      setDone += Math.min(planned, logged)
      for (const m of ex.primary) {
        plannedSets[m] = (plannedSets[m] ?? 0) + planned
        doneSets[m] = (doneSets[m] ?? 0) + Math.min(planned, logged)
      }
    }
  }
  const muscleIds = Object.keys(plannedSets) as MuscleId[]
  return {
    exercises: { done: exDone, total: exTotal },
    sets: { done: setDone, total: setTotal },
    // Anteilig: ein Muskel mit 2 von 4 geplanten Sätzen zählt 0,5 (vorher erst bei 100 % der ganzen Woche, daher meist 0)
    muscles: { done: muscleIds.reduce((n, m) => n + Math.min(1, (doneSets[m] ?? 0) / (plannedSets[m] || 1)), 0), total: muscleIds.length },
  }
}
