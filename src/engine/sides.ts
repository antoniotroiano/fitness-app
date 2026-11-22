import type { Exercise, LoggedSet, SideSet } from '../types'
import { e1rm, rirOf } from './progression'

/**
 * Links/rechts getrennt erfassen: Standard aus `Exercise.unilateral` (einseitige Übungen), pro Übung überschreibbar
 * (`ExerciseOverride.sides`). Nie bei Cardio.
 */
export function splitsSides(ex: Pick<Exercise, 'unilateral' | 'cardio'> | undefined, override?: boolean): boolean {
  if (!ex || ex.cardio) return false
  return override ?? !!ex.unilateral
}

/** Leistung einer Seite: e1RM mit Körperlast, bei Zeitübungen die Sekunden. */
const strength = (s: SideSet, time: boolean, bodyLoad: number) =>
  time ? s.reps : e1rm(s.weight + bodyLoad, s.reps, rirOf(s))

/** Schwächere Seite (gleich stark: weniger Wdh., dann links). Sie steht für den Satz in Progression und 1RM. */
export function weakerSide(l: SideSet, r: SideSet, time = false, bodyLoad = 0): 'l' | 'r' {
  const a = strength(l, time, bodyLoad)
  const b = strength(r, time, bodyLoad)
  if (Math.abs(a - b) > 1e-9) return a < b ? 'l' : 'r'
  return r.reps < l.reps ? 'r' : 'l'
}

/**
 * Ein Satz aus beiden Seiten: Gewicht, Wdh., RIR und Teilwdh. der schwächeren Seite (alles, was einen Satz auswertet,
 * sieht so die schwächere Seite), beide Seiten unter `sides` (Volumen = Summe beider Seiten, siehe `setVolume`).
 */
export function mergeSides(l: SideSet, r: SideSet, extra: Partial<LoggedSet> = {}, time = false, bodyLoad = 0): LoggedSet {
  const w = weakerSide(l, r, time, bodyLoad) === 'l' ? l : r
  return {
    ...extra, weight: w.weight, reps: w.reps,
    ...(w.rir != null ? { rir: w.rir } : {}), ...(w.partial ? { partial: w.partial } : {}),
    sides: { l, r },
  }
}
