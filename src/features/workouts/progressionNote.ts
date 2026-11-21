import type { Settings } from '../../types'
import type { RepRange, Suggestion } from '../../engine/progression'
import { formatWeight } from '../../utils/units'

/** Hinweis zu Equipment-Grenzen (`Suggestion.note`, siehe EXTEND_REPS in engine/progression.ts), sonst null. */
export function progressionNote(sug: Suggestion, range: RepRange, unit: Settings['weightUnit'], bodyLoad = 0): string | null {
  const next = sug.nextWeight != null ? `${bodyLoad > 0 ? '+' : ''}${formatWeight(sug.nextWeight, unit)}` : ''
  if (sug.note === 'extend') return `Die nächste Stufe (${next}) ist ein großer Sprung: erst ${sug.reps} Wdh. über dem Zielbereich, dann steigt das Gewicht.`
  if (sug.note === 'gap' && next && sug.reps >= range.min) return `Der Sprung auf ${next} ist groß: ${sug.reps} Wdh. werden schwer. Kleinere Gewichtsstufen oder „Bereich erweitern“ würden helfen.`
  if (sug.note === 'gap' && next) return `Mit ${next} ist der Bereich ${range.min}–${range.max} noch nicht erreichbar: ${sug.reps} Wdh. sind hier das Ziel, kleinere Gewichtsstufen würden helfen.`
  if (sug.note === 'gap') return 'Schwerstes verfügbares Gewicht erreicht: die Wdh. steigen über den Zielbereich.'
  return null
}
