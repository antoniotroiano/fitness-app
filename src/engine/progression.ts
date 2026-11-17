import type { Equipment, LoggedSet, Session } from '../types'

/** Kleinste Gewichtssprünge pro Equipment (kg). Konfigurierbare Defaults. */
export const INCREMENT: Record<Equipment, number> = {
  barbell: 2.5, smith: 2.5, machine: 2.5, cable: 2.5,
  dumbbell: 2, kettlebell: 4, bodyweight: 1, band: 1, cardio: 0,
}

/** Maximaler Sprung pro Einheit in Prozent, wenn aus dem e1RM neu gerechnet wird */
const MAX_JUMP = 0.1

/** Geschätztes 1RM (Epley), Reserve-Wiederholungen werden zu den Wiederholungen addiert. */
export function e1rm(weight: number, reps: number, rir = 0): number {
  if (weight <= 0 || reps <= 0) return 0
  return weight * (1 + (reps + Math.max(0, rir)) / 30)
}

/** Gewicht, mit dem `reps` Wiederholungen bei `rir` Reserve möglich sein sollten. */
export function weightForReps(oneRm: number, reps: number, rir = 0): number {
  return oneRm / (1 + (reps + Math.max(0, rir)) / 30)
}

export function roundTo(value: number, step: number): number {
  if (step <= 0) return Math.round(value * 100) / 100
  return Math.round(value / step) * step
}

export interface RepRange { min: number; max: number }

export interface Suggestion {
  /** null = noch keine Historie, Nutzer wählt das Startgewicht selbst */
  weight: number | null
  reps: number
}

export interface SuggestInput {
  range: RepRange
  targetRir: number
  equipment: Equipment
  /** Sätze der letzten Einheit dieser Übung */
  last?: LoggedSet[]
  /** Plateau erkannt (siehe isStalled) */
  stalled?: boolean
}

export function suggestNext({ range, targetRir, equipment, last, stalled }: SuggestInput): Suggestion {
  const inc = INCREMENT[equipment]
  const sets = (last ?? []).filter((s) => !s.warmup && s.weight > 0 && s.reps > 0)
  if (sets.length === 0) return { weight: null, reps: range.min }

  const lastWeight = Math.max(...sets.map((s) => s.weight))
  const topSets = sets.filter((s) => s.weight === lastWeight)
  const minReps = Math.min(...topSets.map((s) => s.reps))
  const avgE1rm = sets.reduce((a, s) => a + e1rm(s.weight, s.reps, s.rir ?? targetRir), 0) / sets.length

  if (stalled) {
    return { weight: Math.max(inc, roundTo(lastWeight * 0.95, inc)), reps: range.min }
  }

  // Alle Sätze am oberen Ende: Gewicht erhöhen, Wiederholungen zurück an die Untergrenze
  if (minReps >= range.max) {
    const candidate = roundTo(weightForReps(avgE1rm, range.min, targetRir), inc)
    const floor = roundTo(lastWeight + inc, inc)
    const cap = Math.max(floor, roundTo(lastWeight * (1 + MAX_JUMP), inc))
    return { weight: Math.min(cap, Math.max(floor, candidate)), reps: range.min }
  }

  // Sonst: eine Wiederholung mehr; bei großer Abweichung wird aus dem e1RM neu gerechnet
  const reps = Math.min(range.max, Math.max(range.min, minReps + 1))
  const candidate = roundTo(weightForReps(avgE1rm, reps, targetRir), inc)
  const weight = Math.abs(candidate - lastWeight) <= inc ? lastWeight : candidate
  return { weight: Math.max(inc, weight), reps }
}

/** Plateau: die letzten beiden e1RM-Werte liegen nicht über dem davor (Toleranz 0,5 %). */
export function isStalled(history: number[]): boolean {
  if (history.length < 3) return false
  const [a, b, c] = history.slice(-3)
  const tol = a * 0.005
  return b <= a + tol && c <= a + tol
}

/** e1RM einer Einheit: bester Satz */
export function sessionE1rm(sets: LoggedSet[], fallbackRir = 2): number {
  return Math.max(0, ...sets.filter((s) => !s.warmup).map((s) => e1rm(s.weight, s.reps, s.rir ?? fallbackRir)))
}

/** Letzte Einheit einer Übung, getrennt in Aufwärm- und Arbeitssätze (Sortierung: Datum, dann finishedAt). */
export function previousSets(sessions: Session[], exerciseId: string): { warmups: LoggedSet[]; work: LoggedSet[] } {
  const last = sessions
    .filter((s) => s.exercises.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => a.date.localeCompare(b.date) || a.finishedAt - b.finishedAt)
    .at(-1)
  const sets = last?.exercises.find((e) => e.exerciseId === exerciseId)?.sets ?? []
  return { warmups: sets.filter((s) => s.warmup), work: sets.filter((s) => !s.warmup) }
}

/**
 * Gewicht für den nächsten Satz, abgeleitet aus dem gerade abgeschlossenen Satz (geschätztes 1RM
 * mit tatsächlichem RIR). Sprung auf ±10 % begrenzt. null = keine sinnvolle Berechnung.
 */
export function adaptWeight(
  done: { weight: number; reps: number; rir: number }, next: { reps: number; rir: number }, equipment: Equipment,
): number | null {
  if (done.weight <= 0 || done.reps <= 0 || next.reps <= 0) return null
  const inc = INCREMENT[equipment] || 1
  const raw = weightForReps(e1rm(done.weight, done.reps, done.rir), next.reps, next.rir)
  const capped = Math.min(done.weight * (1 + MAX_JUMP), Math.max(done.weight * (1 - MAX_JUMP), raw))
  return Math.max(inc, roundTo(capped, inc))
}
