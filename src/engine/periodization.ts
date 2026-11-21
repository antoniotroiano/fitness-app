import type { Experience, Goal, PlannedExercise, ProgramConfig, RepScheme } from '../types'
import type { RepRange } from './progression'

/** Arbeitswochen pro Block (Standard), danach (optional) eine Deload-Woche */
export const BLOCK_WORKING_WEEKS = 4
/** Wählbare Blocklängen im Wizard (übliche Mesozyklen: 3–6 Arbeitswochen vor einer Entlastung) */
export const BLOCK_WEEK_OPTIONS = [4, 5, 6] as const

type BlockConfig = Pick<ProgramConfig, 'repScheme' | 'deload'> & Partial<Pick<ProgramConfig, 'blockWeeks'>>

/** Arbeitswochen pro Block des Programms (ältere Programme ohne Angabe: 4). */
export function blockWeeksOf(config: Partial<Pick<ProgramConfig, 'blockWeeks'>>): number {
  const n = config.blockWeeks
  return n && n >= 2 ? Math.round(n) : BLOCK_WORKING_WEEKS
}

export interface WeekPlan {
  isDeload: boolean
  /** Verschiebung der Rep-Range (negativ = schwerer) */
  repShift: number
  /** Zusätzliche Reserve gegenüber dem Basis-RIR */
  rirDelta: number
  setsFactor: number
  /** Woche im Block (0-basiert), bestimmt beim Schema "rotating" die Zone jeder Übung */
  weekInBlock?: number
  /** Schema "Wechselnde Bereiche": Bereich je Übung aus Zonen statt `repShift` */
  rotate?: boolean
  /** Letzte Arbeitswoche: letzter Arbeitssatz jeder Übung bis zum Versagen (misst die Leistung neu) */
  failureLastSet?: boolean
}

/** Woche ohne Periodisierung (eigene Programme ohne Konfiguration) */
export const NEUTRAL_WEEK: WeekPlan = { isDeload: false, repShift: 0, rirDelta: 0, setsFactor: 1 }

/** Satzfaktor der Spitzenwochen (zweite Blockhälfte); der Generator plant das Zeitbudget darauf hin. */
export const PEAK_SETS_FACTOR = 1.25

export function weekInBlock(week: number, deload: boolean, blockWeeks = BLOCK_WORKING_WEEKS): number {
  return week % (deload ? blockWeeks + 1 : blockWeeks)
}

/**
 * Wochenplan im Block. Längere Blöcke strecken denselben Verlauf: Rep-Verschiebung (linear) insgesamt 3 Wdh.,
 * RIR sinkt um bis zu 2, die zweite Blockhälfte ist die Spitzenphase. Bei 4 Wochen identisch zum bisherigen Verlauf.
 */
export function weekPlan(config: BlockConfig, week: number): WeekPlan {
  const n = blockWeeksOf(config)
  const w = weekInBlock(week, config.deload, n)
  if (config.deload && w === n) {
    return { isDeload: true, repShift: 0, rirDelta: 3, setsFactor: 0.5, weekInBlock: w, ...(config.repScheme === 'rotating' ? { rotate: true } : {}) }
  }
  const scheme: RepScheme = config.repScheme
  let repShift = 0
  const steps = Math.round((w * 3) / Math.max(1, n - 1))
  if (scheme === 'linear') repShift = -steps || 0
  else if (scheme === 'reverseLinear') repShift = steps
  else if (scheme === 'undulating') repShift = w % 2 === 0 ? -2 : 2
  // RIR sinkt über den Block (letzte Arbeitswochen am anspruchsvollsten), Setvolumen steigt in der zweiten Hälfte leicht
  const rirDelta = -Math.min(2, Math.floor((w * 2) / Math.max(1, n - 2))) || 0
  const setsFactor = w >= n / 2 ? PEAK_SETS_FACTOR : 1
  return {
    isDeload: false, repShift, rirDelta, setsFactor, weekInBlock: w,
    ...(scheme === 'rotating' ? { rotate: true } : {}),
    ...(w === n - 1 ? { failureLastSet: true } : {}),
  }
}

export function shiftRange(base: RepRange, shift: number, floor = 3): RepRange {
  const min = Math.max(floor, base.min + shift)
  const max = Math.max(min + 2, base.max + shift)
  return { min, max }
}

/**
 * Schema "Wechselnde Bereiche": drei Zonen mit je 3 Wdh. um die Mitte des Basisbereichs (schwer, mittel, leicht).
 * Jede Übung wechselt wöchentlich die Zone; die Übungen eines Tages sind um ihre Position versetzt, so hat jeder
 * Tag schwere und leichte Übungen. Schwere Zone mit einer Wiederholung mehr Reserve (Technik, Gelenkbelastung).
 */
export const ROTATION_ZONES = [
  { shift: 0, rir: 0 }, // mittel
  { shift: -3, rir: 1 }, // schwer
  { shift: 3, rir: 0 }, // leicht
] as const

/** Bereich der Zone `zone` für einen Basisbereich: 3 Wdh. breit um die (abgerundete) Mitte, mindestens 3. */
export function zoneRange(base: RepRange, zone: number): RepRange {
  const mid = Math.floor((base.min + base.max) / 2) + ROTATION_ZONES[zone].shift
  const min = Math.max(3, mid - 1)
  return { min, max: min + 2 }
}

/** Zone einer Übung (Position `index` im Tag) in einer Blockwoche */
export function zoneOf(week: number, index: number): number {
  return (((week + index) % 3) + 3) % 3
}

/**
 * "Wechselnde Bereiche": die Reserve sinkt über den Block nur um 1 (statt 2), Verbundübungen behalten mindestens
 * RIR 1. Bis zum Versagen geht nur der letzte Satz der letzten Arbeitswoche (`failureLastSet`).
 * Grundlage: Verbundübungen profitieren kaum vom Training bis zum Versagen, die Ermüdung steigt aber deutlich
 * (Robinson et al. 2024, Refalo et al. 2023); Intensität kommt hier über die schwere Zone.
 */
const ROTATION_MAX_RIR_DROP = 1
const ROTATION_COMPOUND_MIN_RIR = 1

/**
 * Wdh.-Bereich und Basis-RIR einer Übung in einer Woche: gemeinsame Berechnung für Logger, Vorschau und Wizard.
 * Zeitübungen behalten ihre Sekunden-Range, im Deload gilt die mittlere Zone.
 */
export function exerciseTargets(
  pe: Pick<PlannedExercise, 'repMin' | 'repMax' | 'rir'>, plan: WeekPlan, index: number, time: boolean, compound = false,
): { range: RepRange; rir: number } {
  const base = { min: pe.repMin, max: pe.repMax }
  if (time) return { range: base, rir: effectiveRir(pe.rir, plan) }
  if (plan.rotate) {
    const zone = plan.isDeload ? 0 : zoneOf(plan.weekInBlock ?? 0, index)
    const delta = Math.max(-ROTATION_MAX_RIR_DROP, plan.rirDelta)
    const rir = Math.max(compound ? ROTATION_COMPOUND_MIN_RIR : 0, pe.rir + ROTATION_ZONES[zone].rir + delta)
    return { range: zoneRange(base, zone), rir }
  }
  return { range: shiftRange(base, plan.repShift), rir: effectiveRir(pe.rir, plan) }
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
  /** Letzter Satz bis zum Versagen */
  failure: boolean
}

/** Alle Wochen eines Blocks (Arbeitswochen, ggf. + Deload) für eine Übung: Sätze, Rep-Range und RIR je Woche. */
export function weeklyOverview(
  pe: Pick<PlannedExercise, 'sets' | 'repMin' | 'repMax' | 'rir'>,
  config: BlockConfig,
  ex: { metric?: string; cardio?: boolean; compound?: boolean },
  /** Position der Übung im Tag (Schema "rotating") */
  index = 0,
): WeekOverview[] {
  const weeks = blockWeeksOf(config) + (config.deload ? 1 : 0)
  return Array.from({ length: weeks }, (_, week) => {
    const plan = weekPlan(config, week)
    const { range, rir } = exerciseTargets(pe, plan, index, ex.metric === 'time', !!ex.compound)
    return {
      week, isDeload: plan.isDeload, sets: ex.cardio ? 1 : effectiveSets(pe.sets, plan),
      repMin: range.min, repMax: range.max, rir, failure: !!plan.failureLastSet && !ex.cardio && ex.metric !== 'time',
    }
  })
}

/** Empfohlenes Rep-Schema, wenn der Wizard "Automatisch" wählt (Heuristik: Einsteiger konstant, Kraft linear, sonst wechselnde Bereiche). */
export function recommendedRepScheme(goal: Goal, experience: Experience): RepScheme {
  if (experience === 'none' || experience === 'beginner') return 'static'
  if (goal === 'strength') return 'linear'
  return 'rotating'
}
