import type { Exercise, Session, WorkoutDay, PlannedExercise } from '../types'
import { isStalled, previousSets, sessionE1rm, suggestNext, type RepRange, type Suggestion } from './progression'
import { effectiveRir, effectiveSets, setRir, shiftRange, type WeekPlan } from './periodization'
import { isFirstForMuscle, warmupSets, type WarmupSet } from './warmup'

export interface PlannedView {
  pe: PlannedExercise
  ex: Exercise
  range: RepRange
  /** Basis-Ziel-RIR der Übung in dieser Woche */
  rir: number
  sets: number
  /** Ziel-RIR pro Arbeitssatz */
  setRirs: number[]
  sug: Suggestion
  warmups: WarmupSet[]
  previous: ReturnType<typeof previousSets>
}

/** Geplanter Trainingstag für die aktuelle Woche: gemeinsame Berechnung für Vorschau und Logger. */
export function plannedDay(
  day: WorkoutDay, plan: WeekPlan, sessions: Session[],
  lookup: (id: string) => Exercise | undefined, warmupsEnabled: boolean,
): PlannedView[] {
  const ids = day.exercises.map((e) => e.exerciseId)
  const out: PlannedView[] = []
  day.exercises.forEach((pe, index) => {
    const ex = lookup(pe.exerciseId)
    if (!ex) return
    const history = sessions.filter((s) => s.exercises.some((e) => e.exerciseId === pe.exerciseId))
    const previous = previousSets(sessions, pe.exerciseId)
    const e1rms = history.slice(-3).map((s) => sessionE1rm(s.exercises.find((e) => e.exerciseId === pe.exerciseId)!.sets, pe.rir))
    const range = shiftRange({ min: pe.repMin, max: pe.repMax }, plan.repShift)
    const rir = effectiveRir(pe.rir, plan)
    const sets = ex.cardio ? 1 : effectiveSets(pe.sets, plan)
    const sug: Suggestion = ex.cardio ? { weight: null, reps: 0 } : suggestNext({
      range, targetRir: rir, equipment: ex.equipment, last: previous.work, stalled: isStalled(e1rms),
    })
    const warmups = ex.cardio || !warmupsEnabled ? [] : warmupSets({
      workWeight: sug.weight, equipment: ex.equipment, compound: ex.compound, pattern: ex.pattern,
      firstForMuscle: isFirstForMuscle(ids, index, lookup),
    })
    const setRirs = Array.from({ length: sets }, (_, i) => setRir(rir, i, sets, ex.compound))
    out.push({ pe, ex, range, rir, sets, setRirs, sug, warmups, previous })
  })
  return out
}
