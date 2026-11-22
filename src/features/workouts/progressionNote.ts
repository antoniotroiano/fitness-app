import type { Settings } from '../../types'
import type { RepRange, Suggestion, SuggestionReason } from '../../engine/progression'
import { formatWeight } from '../../utils/units'
import type { DistanceUnit, Metric } from '../../engine/metric'
import { t } from '../../i18n'

/** Hinweis zu Equipment-Grenzen (`Suggestion.note`, siehe EXTEND_REPS in engine/progression.ts), sonst null. */
export function progressionNote(sug: Suggestion, range: RepRange, unit: Settings['weightUnit'], bodyLoad = 0): string | null {
  const next = sug.nextWeight != null ? `${bodyLoad > 0 ? '+' : ''}${formatWeight(sug.nextWeight, unit)}` : ''
  if (sug.note === 'extend') return t('Die nächste Stufe ({0}) ist ein großer Sprung: erst {1} Wdh. über dem Zielbereich, dann steigt das Gewicht.', next, sug.reps)
  if (sug.note === 'gap' && next && sug.reps >= range.min) return t('Der Sprung auf {0} ist groß: {1} Wdh. werden schwer. Kleinere Gewichtsstufen oder „Bereich erweitern“ würden helfen.', next, sug.reps)
  if (sug.note === 'gap' && next) return t('Mit {0} ist der Bereich {1}–{2} noch nicht erreichbar: {3} Wdh. sind hier das Ziel, kleinere Gewichtsstufen würden helfen.', next, range.min, range.max, sug.reps)
  if (sug.note === 'gap') return t('Schwerstes verfügbares Gewicht erreicht: die Wdh. steigen über den Zielbereich.')
  return null
}

const REASON_TITLE: Record<SuggestionReason, string> = {
  start: t('Noch keine Historie'), time: t('Zeit steigt'), reps: t('Eine Wiederholung mehr'), bwLoad: t('Erstes Zusatzgewicht'),
  top: t('Obergrenze erreicht'), up: t('Etwas schwerer'), down: t('Etwas leichter'), hold: t('Gleiche Belastung'),
  stall: t('Plateau-Reset'), break: t('Nach Trainingspause'), extend: t('Große Gewichtsstufe'), gap: t('Gewichtsgrenze'),
}

/** Titel und Text zur Begründung eines Vorschlags (`Suggestion.reason`), null ohne Begründung oder ohne Historie. */
export function reasonText(sug: Suggestion, range: RepRange, unit: Settings['weightUnit'], metric: Metric = 'reps', bodyLoad = 0, dist: DistanceUnit = 'm'): { title: string; text: string } | null {
  if (!sug.reason || sug.reason === 'start' || sug.weight == null) return null
  const sign = bodyLoad > 0 ? '+' : ''
  const w = (kg: number) => `${sign}${formatWeight(kg, unit)}`
  const u = metric === 'time' ? 's' : metric === 'distance' ? dist : t('Wdh.')
  const prev = sug.prev ? t('Letzte Einheit: {0} × {1} {2} (schwächster Satz am schwersten Gewicht). ', w(sug.prev.weight), sug.prev.reps, u) : ''
  const now = t('Vorschlag: {0} × {1} {2}{3} ', w(sug.weight), sug.reps, u, u.endsWith('.') ? '' : '.')
  const body: Record<SuggestionReason, string> = {
    start: '',
    time: metric === 'distance' ? t('Die Strecke steigt je Einheit um 5 {0}, bis die Obergrenze erreicht ist.', dist) : t('Die Zeit steigt je Einheit um 5 s, bis die Obergrenze erreicht ist.'),
    reps: t('Das Gewicht bleibt, bis alle Sätze die Obergrenze erreichen; bis dahin kommt eine Wiederholung dazu.'),
    bwLoad: t('Mit Körpergewicht ist die Obergrenze erreicht: das erste Zusatzgewicht ist die kleinste Stufe, die Wdh. kommen aus dem geschätzten 1RM.'),
    top: t('Alle Sätze liegen an der Obergrenze ({0}). Das Gewicht steigt, die Wdh. gehen zurück.', range.max),
    up: t('Aus der letzten Leistung (geschätztes 1RM) passt ein höheres Gewicht zum Zielbereich.'),
    down: t('Aus der letzten Leistung (geschätztes 1RM) passt ein niedrigeres Gewicht besser zum Zielbereich und zur Ziel-RIR.'),
    hold: t('Gleiche Belastung wie zuletzt: der nächste Schritt wäre ein zu großer Sprung oder die Leistung reichte noch nicht.'),
    stall: t('Die Leistung stagniert seit mehreren Einheiten. Das Gewicht sinkt um etwa 5 % und der Aufbau beginnt neu.'),
    break: t('Nach längerer Pause startet der Vorschlag niedriger (1,5 % je Woche über zwei Wochen, höchstens 15 %).'),
    extend: t('Die nächste Gewichtsstufe ist ein großer Sprung: erst mehr Wdh. über dem Zielbereich, dann steigt das Gewicht.'),
    gap: t('Mit den verfügbaren Gewichten ist der Zielbereich nicht sauber erreichbar (Stufen zu groß oder schwerstes Gewicht erreicht).'),
  }
  const check = sug.level === 'check' ? t('Auffällige Änderung gegenüber der letzten Einheit (über 10 % Gewicht oder mehr als 3 Wdh.): bitte prüfen. ') : ''
  return { title: REASON_TITLE[sug.reason], text: `${check}${prev}${now}${body[sug.reason]}` }
}
