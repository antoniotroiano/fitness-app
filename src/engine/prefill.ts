import type { LoggedSet, SideSet } from '../types'
import type { Suggestion } from './progression'

/** Vorbelegung eines Arbeitssatzes im Logger */
export interface Prefill { weight: number | null; reps: number; sides?: { l: SideSet; r: SideSet } }

/**
 * Startwerte der Arbeitssätze: `suggestion` = Progressionsvorschlag für alle Sätze, `last` = Gewicht und Wdh. des
 * gleichen Satzes der letzten Einheit (mehr Sätze als zuletzt: letzter Satz wiederholt, links/rechts mit Seitenwerten).
 * Ohne Verlauf oder bei Cardio-/leeren Sätzen gilt der Vorschlag.
 */
export function prefillSets(mode: 'suggestion' | 'last', sug: Suggestion, sets: number, previous: LoggedSet[]): Prefill[] {
  const prev = previous.filter((s) => s.reps > 0)
  return Array.from({ length: sets }, (_, i) => {
    const p = mode === 'last' ? prev[Math.min(i, prev.length - 1)] : undefined
    if (!p) return { weight: sug.weight, reps: sug.reps }
    return { weight: p.weight, reps: p.reps, ...(p.sides ? { sides: p.sides } : {}) }
  })
}
