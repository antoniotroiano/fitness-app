import type { Exercise, Program, Session, WorkoutDay, PlannedExercise } from '../types'
import { isStalled, previousSets, sessionPerformance, suggestNext, type RepRange, type Suggestion } from './progression'
import { effectiveRir, effectiveSets, setRir, shiftRange, weekPlan, type WeekPlan } from './periodization'
import { effectiveMode, freshnessFor, intensityOf, resolveWarmup, type WarmupContext, type WarmupSet } from './warmup'
import { restCategory } from './rest'
import type { ExerciseOverride, Settings } from '../types'

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
  /** Kontext für die Aufwärm-Berechnung (Smart) */
  warmupCtx: WarmupContext
  /** Effektiver Aufwärmmodus dieser Übung */
  warmupMode: 'smart' | 'scheme' | 'none'
  previous: ReturnType<typeof previousSets>
}

/** Erkennt Einheiten dieses Programms, die in einer Deload-Woche trainiert wurden. */
export function deloadSessionOf(program?: Pick<Program, 'id' | 'config'>): (s: Session) => boolean {
  return (s) => !!program?.config && s.programId === program.id && weekPlan(program.config, s.week).isDeload
}

/** Geplanter Trainingstag für die aktuelle Woche: gemeinsame Berechnung für Vorschau und Logger. */
export function plannedDay(
  day: WorkoutDay, plan: WeekPlan, sessions: Session[],
  lookup: (id: string) => Exercise | undefined,
  warmup: Pick<Settings, 'warmupMode' | 'warmupSchemes'> & Partial<Pick<Settings, 'weightUnit'>>, overrides: Record<string, ExerciseOverride> = {},
  /** Deload-Einheiten zählen nicht für die Plateau-Erkennung */
  isDeloadSession: (s: Session) => boolean = () => false,
): PlannedView[] {
  const ids = day.exercises.map((e) => e.exerciseId)
  const out: PlannedView[] = []
  day.exercises.forEach((pe, index) => {
    const ex = lookup(pe.exerciseId)
    if (!ex) return
    const history = sessions
      .filter((s) => s.exercises.some((e) => e.exerciseId === pe.exerciseId) && !isDeloadSession(s))
      .sort((a, b) => a.date.localeCompare(b.date) || a.finishedAt - b.finishedAt)
    const previous = previousSets(sessions, pe.exerciseId)
    const e1rms = history.map((s) => sessionPerformance(s.exercises.find((e) => e.exerciseId === pe.exerciseId)!.sets))
    const time = ex.metric === 'time'
    // Zeitübungen: feste Sekunden-Range, keine Verschiebung durch die Periodisierung
    const range = time ? { min: pe.repMin, max: pe.repMax } : shiftRange({ min: pe.repMin, max: pe.repMax }, plan.repShift)
    const rir = effectiveRir(pe.rir, plan)
    const sets = ex.cardio ? 1 : effectiveSets(pe.sets, plan)
    const sug: Suggestion = ex.cardio ? { weight: null, reps: 0 } : suggestNext({
      range, targetRir: rir, equipment: ex.equipment, last: previous.work, stalled: !ex.assisted && !time && isStalled(e1rms), assisted: ex.assisted, metric: ex.metric, unit: warmup.weightUnit,
    })
    const ov = overrides[pe.exerciseId]
    const warmupMode = ex.cardio || time ? 'none' : effectiveMode(ov?.warmupMode, warmup.warmupMode)
    const warmupCtx: WarmupContext = {
      equipment: ex.equipment, compound: ex.compound, isCore: ex.pattern === 'core',
      freshness: freshnessFor(ids, index, lookup), intensity: intensityOf(sug.reps || range.min, rir),
    }
    const scheme = ov?.warmupScheme ?? warmup.warmupSchemes[restCategory(ex)]
    const warmups = resolveWarmup({ mode: warmupMode, scheme, ctx: warmupCtx, workWeight: sug.weight, unit: warmup.weightUnit })
    const setRirs = Array.from({ length: sets }, (_, i) => setRir(rir, i, sets, ex.compound))
    out.push({ pe, ex, range, rir, sets, setRirs, sug, warmups, warmupCtx, warmupMode, previous })
  })
  return out
}
