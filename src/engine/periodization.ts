import type { Experience, Goal, PlannedExercise, ProgramConfig, RepScheme } from '../types'
import type { RepRange } from './progression'

/** Arbeitswochen pro Block, danach (optional) eine Deload-Woche */
export const BLOCK_WORKING_WEEKS = 4

export interface WeekPlan {
  isDeload: boolean
  /** Verschiebung der Rep-Range (negativ = schwerer) */
  repShift: number
  /** Zusätzliche Reserve gegenüber dem Basis-RIR */
  rirDelta: number
  setsFactor: number
}

/** Satzfaktor der Spitzenwochen (Woche 3 und 4 im Block); der Generator plant das Zeitbudget darauf hin. */
export const PEAK_SETS_FACTOR = 1.25

export function weekInBlock(week: number, deload: boolean): number {
  return week % (deload ? BLOCK_WORKING_WEEKS + 1 : BLOCK_WORKING_WEEKS)
}

export function weekPlan(config: Pick<ProgramConfig, 'repScheme' | 'deload'>, week: number): WeekPlan {
  const w = weekInBlock(week, config.deload)
  if (config.deload && w === BLOCK_WORKING_WEEKS) {
    return { isDeload: true, repShift: 0, rirDelta: 3, setsFactor: 0.5 }
  }
  const scheme: RepScheme = config.repScheme
  let repShift = 0
  if (scheme === 'linear') repShift = -w
  else if (scheme === 'reverseLinear') repShift = w
  else if (scheme === 'undulating') repShift = w % 2 === 0 ? -2 : 2
  // RIR sinkt über den Block (letzte Arbeitswoche am anspruchsvollsten), Setvolumen steigt leicht
  const rirDelta = -Math.min(w, 2)
  const setsFactor = w >= 2 ? PEAK_SETS_FACTOR : 1
  return { isDeload: false, repShift, rirDelta, setsFactor }
}

export function shiftRange(base: RepRange, shift: number, floor = 3): RepRange {
  const min = Math.max(floor, base.min + shift)
  const max = Math.max(min + 2, base.max + shift)
  return { min, max }
}

/**
 * Rolle einer Übung im Tag: Hauptübung (schwere Verbundübung), weitere Verbundübung oder Isolation.
 * Bei Kraft und "Beides" bekommen Hauptübungen wenige Wiederholungen mit hohem Gewicht,
 * Isolationsübungen viele Wiederholungen mit weniger Gewicht.
 */
export type ExerciseRole = 'main' | 'secondary' | 'isolation'

export function baseRepRange(goal: Goal, compound: boolean, role?: ExerciseRole): RepRange {
  const r: ExerciseRole = role ?? (compound ? 'main' : 'isolation')
  if (goal === 'strength') return { main: { min: 3, max: 6 }, secondary: { min: 5, max: 8 }, isolation: { min: 8, max: 12 } }[r]
  if (goal === 'both') return { main: { min: 4, max: 6 }, secondary: { min: 6, max: 10 }, isolation: { min: 10, max: 15 } }[r]
  return { main: { min: 6, max: 10 }, secondary: { min: 8, max: 12 }, isolation: { min: 10, max: 15 } }[r]
}

/** Zeitübungen (Halten/Tragen): Haltezeit in Sekunden statt Wiederholungen */
export const TIME_RANGE: RepRange = { min: 30, max: 60 }

export function baseRir(exp: Experience): number {
  return { none: 3, beginner: 3, intermediate: 2, advanced: 1 }[exp]
}

export function effectiveSets(base: number, plan: WeekPlan): number {
  return Math.max(1, Math.round(base * plan.setsFactor))
}

export function effectiveRir(base: number, plan: WeekPlan): number {
  return Math.max(0, base + plan.rirDelta)
}

/**
 * Ziel-RIR pro Satz (Heuristik, Hypertrophie nahe am Muskelversagen, aber mit Reserve bei Verbund).
 * Verbund: erster Satz Basis+1. Isolation: letzter Satz Basis-1 (min. 0). Sonst Basis.
 * Grundlage: Hypertrophie profitiert von Nähe zum Muskelversagen, Kraft kaum (Meta-Regression Robinson et al. 2024);
 * Verbundübungen behalten deshalb mehr Reserve. Die RIR-Schätzung ist ungenau (Halperin et al. 2022: im Mittel
 * ≈ 1 Wdh. zu niedrig, große Streuung), daher gelten Abweichungen von ±1 RIR nicht als Signal (`ADAPT_DEAD_ZONE`).
 */
export function setRir(base: number, index: number, total: number, compound: boolean): number {
  if (compound) return index === 0 && total > 1 ? base + 1 : base
  return index === total - 1 && total > 1 ? Math.max(0, base - 1) : base
}

export interface WeekOverview {
  /** Programmwoche (0-basiert, wie `weekPlan`) */
  week: number
  isDeload: boolean
  sets: number
  repMin: number
  repMax: number
  rir: number
}

/** Alle Wochen eines Blocks (4 Arbeitswochen, ggf. + Deload) für eine Übung: Sätze, Rep-Range und RIR je Woche. */
export function weeklyOverview(
  pe: Pick<PlannedExercise, 'sets' | 'repMin' | 'repMax' | 'rir'>,
  config: Pick<ProgramConfig, 'repScheme' | 'deload'>,
  ex: { metric?: string; cardio?: boolean },
): WeekOverview[] {
  const weeks = BLOCK_WORKING_WEEKS + (config.deload ? 1 : 0)
  return Array.from({ length: weeks }, (_, week) => {
    const plan = weekPlan(config, week)
    const time = ex.metric === 'time'
    // Zeitübungen: feste Sekunden-Range, keine Verschiebung (wie plannedDay)
    const range = time ? { min: pe.repMin, max: pe.repMax } : shiftRange({ min: pe.repMin, max: pe.repMax }, plan.repShift)
    return {
      week, isDeload: plan.isDeload, sets: ex.cardio ? 1 : effectiveSets(pe.sets, plan),
      repMin: range.min, repMax: range.max, rir: effectiveRir(pe.rir, plan),
    }
  })
}

/** Empfohlenes Rep-Schema, wenn der Wizard "Automatisch" wählt (Heuristik: Einsteiger konstant, Kraft linear, sonst wellenförmig). */
export function recommendedRepScheme(goal: Goal, experience: Experience): RepScheme {
  if (experience === 'none' || experience === 'beginner') return 'static'
  if (goal === 'strength') return 'linear'
  return 'undulating'
}
