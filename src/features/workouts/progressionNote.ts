import type { Settings } from '../../types'
import type { RepRange, Suggestion, SuggestionReason } from '../../engine/progression'
import { formatWeight } from '../../utils/units'
import type { Metric } from '../../engine/metric'

/** Hinweis zu Equipment-Grenzen (`Suggestion.note`, siehe EXTEND_REPS in engine/progression.ts), sonst null. */
export function progressionNote(sug: Suggestion, range: RepRange, unit: Settings['weightUnit'], bodyLoad = 0): string | null {
  const next = sug.nextWeight != null ? `${bodyLoad > 0 ? '+' : ''}${formatWeight(sug.nextWeight, unit)}` : ''
  if (sug.note === 'extend') return `Die nächste Stufe (${next}) ist ein großer Sprung: erst ${sug.reps} Wdh. über dem Zielbereich, dann steigt das Gewicht.`
  if (sug.note === 'gap' && next && sug.reps >= range.min) return `Der Sprung auf ${next} ist groß: ${sug.reps} Wdh. werden schwer. Kleinere Gewichtsstufen oder „Bereich erweitern“ würden helfen.`
  if (sug.note === 'gap' && next) return `Mit ${next} ist der Bereich ${range.min}–${range.max} noch nicht erreichbar: ${sug.reps} Wdh. sind hier das Ziel, kleinere Gewichtsstufen würden helfen.`
  if (sug.note === 'gap') return 'Schwerstes verfügbares Gewicht erreicht: die Wdh. steigen über den Zielbereich.'
  return null
}

const REASON_TITLE: Record<SuggestionReason, string> = {
  start: 'Noch keine Historie', time: 'Zeit steigt', reps: 'Eine Wiederholung mehr', bwLoad: 'Erstes Zusatzgewicht',
  top: 'Obergrenze erreicht', up: 'Etwas schwerer', down: 'Etwas leichter', hold: 'Gleiche Belastung',
  stall: 'Plateau-Reset', break: 'Nach Trainingspause', extend: 'Große Gewichtsstufe', gap: 'Gewichtsgrenze',
}

/** Titel und Text zur Begründung eines Vorschlags (`Suggestion.reason`), null ohne Begründung oder ohne Historie. */
export function reasonText(sug: Suggestion, range: RepRange, unit: Settings['weightUnit'], metric: Metric = 'reps', bodyLoad = 0): { title: string; text: string } | null {
  if (!sug.reason || sug.reason === 'start' || sug.weight == null) return null
  const sign = bodyLoad > 0 ? '+' : ''
  const w = (kg: number) => `${sign}${formatWeight(kg, unit)}`
  const u = metric === 'time' ? 's' : metric === 'distance' ? 'm' : 'Wdh.'
  const prev = sug.prev ? `Letzte Einheit: ${w(sug.prev.weight)} × ${sug.prev.reps} ${u} (schwächster Satz am schwersten Gewicht). ` : ''
  const now = `Vorschlag: ${w(sug.weight)} × ${sug.reps} ${u}. `
  const body: Record<SuggestionReason, string> = {
    start: '',
    time: metric === 'distance' ? 'Die Strecke steigt je Einheit um 5 m, bis die Obergrenze erreicht ist.' : 'Die Zeit steigt je Einheit um 5 s, bis die Obergrenze erreicht ist.',
    reps: 'Das Gewicht bleibt, bis alle Sätze die Obergrenze erreichen; bis dahin kommt eine Wiederholung dazu.',
    bwLoad: 'Mit Körpergewicht ist die Obergrenze erreicht: das erste Zusatzgewicht ist die kleinste Stufe, die Wdh. kommen aus dem geschätzten 1RM.',
    top: `Alle Sätze liegen an der Obergrenze (${range.max}). Das Gewicht steigt, die Wdh. gehen zurück.`,
    up: 'Aus der letzten Leistung (geschätztes 1RM) passt ein höheres Gewicht zum Zielbereich.',
    down: 'Aus der letzten Leistung (geschätztes 1RM) passt ein niedrigeres Gewicht besser zum Zielbereich und zur Ziel-RIR.',
    hold: 'Gleiche Belastung wie zuletzt: der nächste Schritt wäre ein zu großer Sprung oder die Leistung reichte noch nicht.',
    stall: 'Die Leistung stagniert seit mehreren Einheiten. Das Gewicht sinkt um etwa 5 % und der Aufbau beginnt neu.',
    break: 'Nach längerer Pause startet der Vorschlag niedriger (1,5 % je Woche über zwei Wochen, höchstens 15 %).',
    extend: 'Die nächste Gewichtsstufe ist ein großer Sprung: erst mehr Wdh. über dem Zielbereich, dann steigt das Gewicht.',
    gap: 'Mit den verfügbaren Gewichten ist der Zielbereich nicht sauber erreichbar (Stufen zu groß oder schwerstes Gewicht erreicht).',
  }
  const check = sug.level === 'check' ? 'Auffällige Änderung gegenüber der letzten Einheit (über 10 % Gewicht oder mehr als 3 Wdh.): bitte prüfen. ' : ''
  return { title: REASON_TITLE[sug.reason], text: `${check}${prev}${now}${body[sug.reason]}` }
}
