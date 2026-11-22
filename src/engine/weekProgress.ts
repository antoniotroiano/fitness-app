import type { Exercise, MuscleId, Program, Session, WeekState } from '../types'
import { isSkipped, neutralWeek, plannedSets as setsInWeek, weekPlan } from './periodization'

export interface WeekProgress {
  exercises: { done: number; total: number }
  sets: { done: number; total: number }
  /** done = anteilig (Ring), full = vollständig erledigte Muskeln (Ganzzahl für die Anzeige) */
  muscles: { done: number; total: number; full: number }
}

export interface WeekProgressOptions {
  /** program (Standard): nur Einheiten dieses Programms in der Programmwoche. all: alle Einheiten im Datumsbereich (auch andere Programme, Importe, Nachträge). */
  scope?: 'program' | 'all'
  /** Programmwoche, die geplant wird (Standard: state.week) */
  week?: number
  /** Bei scope 'all': Datumsbereich (yyyy-mm-dd, inklusive) */
  from?: string
  to?: string
}

/** Fortschritt der aktuellen Programmwoche (nur geplante Workout-Slots, primäre Muskeln). */
export function weekProgress(
  program: Program, state: WeekState, sessions: Session[], lookup: (id: string) => Exercise | undefined,
  opts: WeekProgressOptions = {},
): WeekProgress {
  const week = opts.week ?? state.week
  const all = opts.scope === 'all'
  const plan = program.config ? weekPlan(program.config, week) : neutralWeek(week)
  const cycle = all
    ? sessions.filter((s) => (!opts.from || s.date >= opts.from) && (!opts.to || s.date <= opts.to))
    : sessions.filter((s) => s.programId === program.id && s.week === week)
  // „Alle“: Sätze einer Übung zählen unabhängig vom Tag/Programm, in dem sie geloggt wurden
  const pool = new Map<string, number>()
  if (all) {
    for (const s of cycle) for (const e of s.exercises) {
      pool.set(e.exerciseId, (pool.get(e.exerciseId) ?? 0) + e.sets.filter((x) => !x.warmup && !x.segment).length)
    }
  }
  const plannedSets: Partial<Record<MuscleId, number>> = {}
  const doneSets: Partial<Record<MuscleId, number>> = {}
  let exTotal = 0, exDone = 0, setTotal = 0, setDone = 0

  const scheduled = program.weekSlots.filter((s): s is number => s !== 'rest')
  for (const dayIdx of new Set(scheduled)) {
    const day = program.days[dayIdx]
    if (!day) continue
    const session = all ? undefined : cycle.find((s) => s.dayIndex === dayIdx)
    for (const pe of day.exercises) {
      const ex = lookup(pe.exerciseId)
      if (!ex || ex.cardio || isSkipped(pe, plan)) continue
      const planned = setsInWeek(pe, plan)
      const logged = all
        ? pool.get(pe.exerciseId) ?? 0
        : session?.exercises.find((e) => e.exerciseId === pe.exerciseId)?.sets.filter((x) => !x.warmup && !x.segment).length ?? 0
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
    muscles: {
      done: muscleIds.reduce((n, m) => n + Math.min(1, (doneSets[m] ?? 0) / (plannedSets[m] || 1)), 0),
      total: muscleIds.length,
      full: muscleIds.filter((m) => (doneSets[m] ?? 0) >= (plannedSets[m] ?? 0)).length,
    },
  }
}
