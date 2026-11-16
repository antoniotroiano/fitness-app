import type { Exercise, Session } from '../types'
import { exerciseValue, type ExerciseMetric } from './stats'

export type RecordMetric = 'volume' | 'reps' | 'rm1'

const METRIC: Record<RecordMetric, ExerciseMetric> = { volume: 'bestSetVolume', reps: 'bestSetReps', rm1: 'rm1' }

export interface RecordRow { exerciseId: string; value: number; date: string }

/**
 * Die zuletzt trainierten Übungen (je Übung nur ihre jüngste Einheit) mit dem Bestwert dieser Einheit:
 * Volumen = bester Satz (Gewicht × Wdh.), Reps = meiste Wdh. in einem Satz, 1RM = geschätztes 1RM.
 * Aufwärmsätze zählen nicht, Cardio und Übungen ohne Arbeitssatz werden übersprungen.
 */
export function recentRecords(
  sessions: Session[], lookup: (id: string) => Exercise | undefined, metric: RecordMetric, n = 7,
): RecordRow[] {
  const ordered = [...sessions].sort((a, b) => b.date.localeCompare(a.date) || b.finishedAt - a.finishedAt)
  const seen = new Set<string>()
  const rows: RecordRow[] = []
  for (const s of ordered) {
    for (const e of s.exercises) {
      if (seen.has(e.exerciseId) || lookup(e.exerciseId)?.cardio) continue
      const value = exerciseValue(e.sets, METRIC[metric])
      if (value <= 0) continue
      seen.add(e.exerciseId)
      rows.push({ exerciseId: e.exerciseId, value, date: s.date })
      if (rows.length >= n) return rows
    }
  }
  return rows
}
