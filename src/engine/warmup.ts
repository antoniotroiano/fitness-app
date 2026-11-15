import type { Equipment, Exercise, Pattern } from '../types'
import { INCREMENT, roundTo } from './progression'

/**
 * Aufwärmsätze (Heuristik): Spezifisches Aufwärmen mit leichteren Sätzen derselben Übung
 * verbessert die Leistung leicht bis neutral (u. a. Ribeiro 2020, Silva 2018). Zur Satzzahl gibt es
 * keine harte Evidenz, daher die übliche Rampe: 50 % x 8, 70 % x 5, 85 % x 3, nie bis zur Ermüdung.
 * - Schwere Verbundübung, erste Übung der Muskelgruppe: 3 Sätze
 * - weitere Verbundübung (Muskeln schon warm): 1 Satz
 * - Isolation: 1 Satz nur als erste Übung der Muskelgruppe, sonst keiner
 * - Core, Bodyweight, Band und Cardio: keine
 */
export interface WarmupSet { weight: number | null; reps: number }

const RAMP: { pct: number; reps: number }[] = [
  { pct: 0.5, reps: 8 },
  { pct: 0.7, reps: 5 },
  { pct: 0.85, reps: 3 },
]

const NO_WARMUP: Equipment[] = ['bodyweight', 'band', 'cardio']

export interface WarmupInput {
  workWeight: number | null
  equipment: Equipment
  compound: boolean
  pattern: Pattern
  /** Erste Übung des Tages für ihren Hauptmuskel */
  firstForMuscle: boolean
}

export function warmupSets({ workWeight, equipment, compound, pattern, firstForMuscle }: WarmupInput): WarmupSet[] {
  if (NO_WARMUP.includes(equipment) || pattern === 'core' || pattern === 'cardio') return []

  let steps: { pct: number; reps: number }[]
  if (compound) steps = firstForMuscle ? RAMP : [RAMP[1]]
  else steps = firstForMuscle ? [{ pct: 0.6, reps: 8 }] : []
  if (steps.length === 0) return []

  // Ohne bekanntes Arbeitsgewicht nur Platzhalter-Zeilen
  if (workWeight == null || workWeight <= 0) return steps.map((s) => ({ weight: null, reps: s.reps }))

  const inc = INCREMENT[equipment]
  const out: WarmupSet[] = []
  for (const s of steps) {
    const weight = Math.max(inc, roundTo(workWeight * s.pct, inc))
    // Zu leichte Sätze, die fast dem Arbeitsgewicht entsprechen oder sich doppeln, entfallen
    if (weight >= workWeight) continue
    if (out.some((o) => o.weight === weight)) continue
    out.push({ weight, reps: s.reps })
  }
  return out
}

/** Ist die Übung an Index `index` die erste des Tages mit diesem Hauptmuskel? */
export function isFirstForMuscle(
  dayExerciseIds: string[], index: number, lookup: (id: string) => Exercise | undefined,
): boolean {
  const ex = lookup(dayExerciseIds[index])
  const muscle = ex?.primary[0]
  if (!ex || !muscle) return true
  return !dayExerciseIds.slice(0, index).some((id) => {
    const o = lookup(id)
    return !o?.cardio && o?.primary[0] === muscle
  })
}
