import type {
  Exercise, Experience, MuscleId, PlannedExercise, Program, ProgramConfig, Split, TimeBudget, WorkoutDay,
} from '../types'
import { SECONDARY_WEIGHT } from '../data/muscles'
import { baseRepRange, baseRir } from './periodization'

type DayType = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full'

const DAY_MUSCLES: Record<DayType, MuscleId[]> = {
  push: ['chest', 'shoulders', 'triceps'],
  pull: ['lats', 'upperBack', 'traps', 'biceps', 'forearms'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors', 'core'],
  upper: ['chest', 'lats', 'upperBack', 'shoulders', 'biceps', 'triceps', 'traps', 'forearms'],
  lower: ['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors', 'core'],
  full: ['chest', 'lats', 'upperBack', 'quads', 'hamstrings', 'glutes', 'shoulders', 'biceps', 'triceps', 'calves', 'core'],
}

const DAY_LABEL: Record<DayType, string> = {
  push: 'Push', pull: 'Pull', legs: 'Legs', upper: 'Upper', lower: 'Lower', full: 'Full Body',
}

/** Reihenfolge innerhalb eines Tages: große Muskeln zuerst */
const ORDER: MuscleId[] = [
  'quads', 'hamstrings', 'glutes', 'chest', 'lats', 'upperBack', 'shoulders', 'triceps', 'biceps',
  'traps', 'adductors', 'abductors', 'calves', 'forearms', 'core',
]

export function dayTypes(split: Split, days: number): DayType[] {
  const d = Math.min(6, Math.max(2, days))
  let s = split
  if (s === 'none') s = d <= 3 ? 'fullBody' : d <= 5 ? 'ulfb' : 'ppl'
  if (s === 'fullBody') return Array<DayType>(d).fill('full')
  if (s === 'ulfb') {
    return ({
      2: ['upper', 'lower'], 3: ['upper', 'lower', 'full'], 4: ['upper', 'lower', 'upper', 'lower'],
      5: ['upper', 'lower', 'full', 'upper', 'lower'], 6: ['upper', 'lower', 'full', 'upper', 'lower', 'full'],
    } as Record<number, DayType[]>)[d]
  }
  return ({
    2: ['upper', 'lower'], 3: ['push', 'pull', 'legs'], 4: ['push', 'pull', 'legs', 'upper'],
    5: ['push', 'pull', 'legs', 'upper', 'lower'], 6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
  } as Record<number, DayType[]>)[d]
}

const SLOT_PATTERN: Record<number, (number | 'rest')[]> = {
  2: [0, 'rest', 'rest', 1, 'rest', 'rest', 'rest'],
  3: [0, 'rest', 1, 'rest', 2, 'rest', 'rest'],
  4: [0, 1, 'rest', 2, 3, 'rest', 'rest'],
  5: [0, 1, 2, 'rest', 3, 4, 'rest'],
  6: [0, 1, 2, 3, 4, 5, 'rest'],
}

export function weekSlots(days: number): (number | 'rest')[] {
  return SLOT_PATTERN[Math.min(6, Math.max(1, days))] ?? [0, 'rest', 'rest', 'rest', 'rest', 'rest', 'rest']
}

const SESSION_SET_CAP: Record<TimeBudget, number> = {
  u20: 6, '20-40': 12, '40-60': 18, '60-90': 24, '90-120': 30, o120: 36,
}

const BASE_WEEKLY_SETS: Record<Experience, number> = { none: 6, beginner: 8, intermediate: 12, advanced: 14 }

export function weeklyTarget(config: ProgramConfig, muscle: MuscleId): number {
  let sets = BASE_WEEKLY_SETS[config.experience]
  if (config.goal === 'strength') sets *= 0.8
  const prio = config.focus[muscle]
  if (prio === 'high') sets *= 1.35
  if (prio === 'low') sets *= 0.6
  return Math.max(3, Math.round(sets))
}

function pickExercises(
  pool: Exercise[], muscle: MuscleId, count: number, used: Set<string>, rotate: number,
): Exercise[] {
  const candidates = pool.filter((e) => e.primary[0] === muscle && !e.cardio && !used.has(e.id))
  const fallback = pool.filter((e) => e.primary.includes(muscle) && !e.cardio && !used.has(e.id))
  const list = candidates.length ? candidates : fallback
  const compounds = list.filter((e) => e.compound)
  const isolations = list.filter((e) => !e.compound)
  const out: Exercise[] = []
  // Erste Übung bevorzugt Verbundübung, zweite Isolation; rotiert nach Tagesindex für Abwechslung
  const pick = (arr: Exercise[]) => arr.length ? arr[rotate % arr.length] : undefined
  const first = pick(compounds) ?? pick(isolations)
  if (first) out.push(first)
  if (count > 1) {
    const rest = list.filter((e) => e.id !== first?.id)
    const second = pick(rest.filter((e) => !e.compound)) ?? pick(rest)
    if (second) out.push(second)
  }
  return out
}

export interface GenerateResult { program: Omit<Program, 'id' | 'createdAt' | 'active'> }

export function generate(config: ProgramConfig, exercises: Exercise[]): GenerateResult {
  const types = dayTypes(config.split, config.days)
  const pool = exercises.filter(
    (e) => !e.cardio && (!config.equipment || config.equipment.includes(e.equipment)),
  )
  const freq: Partial<Record<MuscleId, number>> = {}
  types.forEach((t) => DAY_MUSCLES[t].forEach((m) => { freq[m] = (freq[m] ?? 0) + 1 }))

  // Wochenvolumen an das Zeitbudget anpassen
  const cap = SESSION_SET_CAP[config.time]
  const weeklyWanted = Object.keys(freq).reduce((a, m) => a + weeklyTarget(config, m as MuscleId), 0)
  const scale = Math.min(1, (cap * types.length) / weeklyWanted)

  const days: WorkoutDay[] = types.map((type, di) => {
    const credit: Partial<Record<MuscleId, number>> = {}
    const used = new Set<string>()
    const planned: PlannedExercise[] = []
    const muscles = [...DAY_MUSCLES[type]].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
    let remainingCap = cap

    for (const m of muscles) {
      if (remainingCap <= 0) break
      // Unterarme nur auf ausdrücklichen Wunsch, sonst reichen Zug- und Curl-Übungen
      if (m === 'forearms' && config.focus.forearms !== 'high') continue
      const perDay = (weeklyTarget(config, m) * scale) / (freq[m] ?? 1)
      const needed = Math.round(perDay - (credit[m] ?? 0))
      if (needed <= 0) continue
      const sets = Math.min(Math.max(needed, 2), remainingCap)
      const count = sets >= 5 ? 2 : 1
      const chosen = pickExercises(pool, m, count, used, di)
      if (!chosen.length) continue
      const split = chosen.length === 2 ? [Math.ceil(sets / 2), Math.floor(sets / 2)] : [sets]
      chosen.forEach((ex, i) => {
        const range = baseRepRange(config.goal, ex.compound)
        planned.push({
          exerciseId: ex.id, sets: split[i], repMin: range.min, repMax: range.max, rir: baseRir(config.experience),
        })
        used.add(ex.id)
        remainingCap -= split[i]
        ex.primary.forEach((p) => { credit[p] = (credit[p] ?? 0) + split[i] })
        ex.secondary.forEach((p) => { credit[p] = (credit[p] ?? 0) + split[i] * SECONDARY_WEIGHT })
      })
    }
    const nameIndex = types.slice(0, di + 1).filter((t) => t === type).length
    const dup = types.filter((t) => t === type).length > 1
    return {
      id: `day-${di}`,
      name: `Workout ${String.fromCharCode(65 + di)} · ${DAY_LABEL[type]}${dup ? ` ${nameIndex}` : ''}`,
      exercises: planned,
    }
  })

  return {
    program: {
      name: config.name, icon: config.icon, color: config.color, config,
      days, weekSlots: weekSlots(types.length),
    },
  }
}
