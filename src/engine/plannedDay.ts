import type { Exercise, Program, Session, WorkoutDay, PlannedExercise } from '../types'
import { isStalled, previousSets, sessionPerformance, suggestNext, type RepRange, type Suggestion } from './progression'
import { exerciseTargets, failureSetIndex, isSkipped, plannedSets, setRir, weekPlan, type WeekPlan } from './periodization'
import { effectiveMode, freshnessFor, intensityOf, resolveWarmup, type WarmupContext, type WarmupSet } from './warmup'
import { restCategory } from './rest'
import type { ExerciseOverride, Settings, WeightEntry } from '../types'
import { bodyLoadOf, bodyweightAt, withBodyLoad } from './bodyweight'
import { daysBetween } from '../utils/dates'

export interface PlannedView {
  pe: PlannedExercise
  ex: Exercise
  range: RepRange
  /** Basis-Ziel-RIR der Übung in dieser Woche */
  rir: number
  sets: number
  /** Ziel-RIR pro Arbeitssatz */
  setRirs: number[]
  /** Ein Arbeitssatz bis zum Versagen (letzte Arbeitswoche des Blocks), siehe `failureIdx` */
  failureLast: boolean
  /** Index des Satzes bis zum Versagen (−1: keiner); bei „harter Satz zuerst“ der erste, sonst der letzte */
  failureIdx: number
  sug: Suggestion
  warmups: WarmupSet[]
  /** Kontext für die Aufwärm-Berechnung (Smart) */
  warmupCtx: WarmupContext
  /** Effektiver Aufwärmmodus dieser Übung */
  warmupMode: 'smart' | 'scheme' | 'none'
  previous: ReturnType<typeof previousSets>
  /** Körperlast heute (Anteil × Körpergewicht, kg), 0 ohne Anteil oder ohne Gewichtseintrag. Gewichte im Plan sind Zusatzgewichte. */
  bodyLoad: number
  /** In dieser Woche ausgelassen (eigenes Wochenziel): Vorschau zeigt sie gedimmt, der Logger blendet sie aus */
  skipped: boolean
}

/** Erkennt Einheiten dieses Programms, die in einer Deload-Woche trainiert wurden. */
export function deloadSessionOf(program?: Pick<Program, 'id' | 'config'>): (s: Session) => boolean {
  return (s) => !!program?.config && s.programId === program.id && weekPlan(program.config, s.week).isDeload
}

/** Geplanter Trainingstag für die aktuelle Woche: gemeinsame Berechnung für Vorschau und Logger. */
export function plannedDay(
  day: WorkoutDay, plan: WeekPlan, sessions: Session[],
  lookup: (id: string) => Exercise | undefined,
  warmup: Pick<Settings, 'warmupMode' | 'warmupSchemes'> & Partial<Pick<Settings, 'weightUnit' | 'progressionTarget' | 'weightMatch' | 'expandRange' | 'hardSetFirst'>>, overrides: Record<string, ExerciseOverride> = {},
  /** Deload-Einheiten zählen nicht für die Plateau-Erkennung */
  isDeloadSession: (s: Session) => boolean = () => false,
  /** Heutiges Datum (yyyy-mm-dd): lange Trainingspausen senken den Vorschlag */
  today?: string,
  /** Gewichtsverlauf: Körpergewichtsübungen rechnen mit Anteil × Körpergewicht + Zusatzgewicht */
  bodyweights: Pick<WeightEntry, 'date' | 'kg'>[] = [],
): PlannedView[] {
  const bwToday = bodyweights.length ? bodyweightAt(bodyweights, today ?? '9999-12-31') : undefined
  const ids = day.exercises.map((e) => e.exerciseId)
  const out: PlannedView[] = []
  day.exercises.forEach((pe, index) => {
    const ex = lookup(pe.exerciseId)
    if (!ex) return
    const history = sessions
      .filter((s) => s.exercises.some((e) => e.exerciseId === pe.exerciseId) && !isDeloadSession(s))
      .sort((a, b) => a.date.localeCompare(b.date) || a.finishedAt - b.finishedAt)
    const previous = previousSets(sessions, pe.exerciseId)
    // Körperlast einer Einheit: Anteil × Körpergewicht am Tag der Einheit
    const loadOn = (date: string) => (bwToday ? bodyLoadOf(ex, bodyweightAt(bodyweights, date)) : 0)
    const bodyLoad = bodyLoadOf(ex, bwToday)
    const e1rms = history.map((s) => sessionPerformance(withBodyLoad(s.exercises.find((e) => e.exerciseId === pe.exerciseId)!.sets, loadOn(s.date))))
    const time = ex.metric === 'time'
    const { range, rir } = exerciseTargets(pe, plan, index, time, ex.compound)
    const lastDate = sessions.filter((s) => s.exercises.some((e) => e.exerciseId === pe.exerciseId)).reduce((d, s) => (s.date > d ? s.date : d), '')
    const daysSince = today && lastDate ? daysBetween(lastDate, today) : undefined
    const sets = ex.cardio ? 1 : plannedSets(pe, plan)
    const ov = overrides[pe.exerciseId]
    const sug: Suggestion = ex.cardio ? { weight: null, reps: 0 } : suggestNext({
      range, targetRir: rir, equipment: ex.equipment, last: previous.work, bodyLoad, lastBodyLoad: bodyLoad > 0 ? loadOn(lastDate) : undefined, stalled: !ex.assisted && !time && isStalled(e1rms), assisted: ex.assisted, metric: ex.metric, unit: warmup.weightUnit, scale: ov?.weightScale, daysSince,
      target: warmup.progressionTarget, weightMatch: warmup.weightMatch, expandRange: warmup.expandRange,
    })
    const warmupMode = ex.cardio || time ? 'none' : effectiveMode(ov?.warmupMode, warmup.warmupMode)
    const warmupCtx: WarmupContext = {
      equipment: ex.equipment, compound: ex.compound, isCore: ex.pattern === 'core',
      freshness: freshnessFor(ids, index, lookup), intensity: intensityOf(sug.reps || range.min, rir),
    }
    const scheme = ov?.warmupScheme ?? warmup.warmupSchemes[restCategory(ex)]
    const warmups = resolveWarmup({ mode: warmupMode, scheme, ctx: warmupCtx, workWeight: sug.weight, unit: warmup.weightUnit, scale: ov?.weightScale })
    // Letzte Arbeitswoche: der letzte Satz geht bis zum Versagen (RIR 0) und misst die Leistung für den nächsten Block
    const failureLast = !!plan.failureLastSet && !ex.cardio && !time
    const hardFirst = !!warmup.hardSetFirst
    const failureIdx = failureLast ? failureSetIndex(sets, hardFirst) : -1
    const setRirs = Array.from({ length: sets }, (_, i) => (i === failureIdx ? 0 : setRir(rir, i, sets, ex.compound, hardFirst)))
    out.push({ pe, ex, range, rir, sets, setRirs, failureLast, failureIdx, sug, warmups, warmupCtx, warmupMode, previous, bodyLoad, skipped: isSkipped(pe, plan) })
  })
  return out
}
