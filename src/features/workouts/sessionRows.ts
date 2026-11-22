import { isRepless } from '../../engine/metric'
import type { Exercise, LoggedSet, Settings } from '../../types'
import { mergeSides } from '../../engine/sides'
import { displayToKg, displayToKm, kgToDisplay, kmToDisplay } from '../../utils/units'
import { isSegment, uid, type Row } from './state'

export const num = (s: string) => Number(s.replace(',', '.')) || 0

/** Werte einer Seite (Anzeige-Strings) als gespeicherte Seite */
export function sideSet(v: Pick<Row, 'weight' | 'reps' | 'rir' | 'partial'>, wl: Settings['weightUnit']) {
  const partial = num(v.partial ?? '')
  return { weight: displayToKg(num(v.weight), wl), reps: num(v.reps), ...(v.rir === '' ? {} : { rir: Number(v.rir) }), ...(partial > 0 ? { partial } : {}) }
}

export interface RowUnits { weight: Settings['weightUnit']; distance: Settings['distanceUnit'] }

/** Eine Zeile der Satztabelle als gespeicherter Satz (gemeinsam für Logger und Verlauf-Bearbeitung). */
export function rowToSet(r: Row, ex: Pick<Exercise, 'cardio' | 'metric'>, bodyLoad: number, u: RowUnits): LoggedSet {
  if (ex.cardio) return { reps: 0, weight: 0, minutes: num(r.minutes), km: displayToKm(num(r.km), u.distance) }
  if (r.type === 'warmup') return { weight: displayToKg(num(r.weight), u.weight), reps: num(r.reps), warmup: true }
  if (r.type === 'work' && r.right) {
    return mergeSides(sideSet(r, u.weight), sideSet(r.right, u.weight), r.failure ? { failure: true } : {}, isRepless(ex.metric), bodyLoad)
  }
  return {
    weight: displayToKg(num(r.weight), u.weight), reps: num(r.reps),
    rir: isSegment(r) || r.rir === '' ? undefined : Number(r.rir),
    ...(r.type === 'work' && r.failure ? { failure: true } : {}),
    ...(r.type === 'drop' || r.type === 'myo' ? { segment: r.type } : {}),
    ...(num(r.partial ?? '') > 0 ? { partial: num(r.partial ?? '') } : {}),
  }
}

const show = (n: number | undefined) => (n == null ? '' : String(n))

/**
 * Gespeicherter Satz als Zeile (Gegenstück zu `rowToSet`): zum Bearbeiten einer geloggten Einheit.
 * Zeilen sind nicht abgehakt, die Verlauf-Bearbeitung blendet die Haken aus.
 */
export function setToRow(s: LoggedSet, ex: Pick<Exercise, 'cardio'>, u: RowUnits): Row {
  const blank = { id: uid(), done: false, minutes: '', km: '' }
  if (ex.cardio) {
    return { ...blank, type: 'work', weight: '', reps: '', rir: '', minutes: show(s.minutes), km: s.km ? String(kmToDisplay(s.km, u.distance)) : '' }
  }
  const kg = (n: number) => String(kgToDisplay(n, u.weight))
  const type: Row['type'] = s.warmup ? 'warmup' : s.segment ?? 'work'
  const base: Row = {
    ...blank, type, weight: kg(s.weight), reps: String(s.reps), rir: show(s.rir),
    ...(s.failure ? { failure: true } : {}), ...(s.partial ? { partial: String(s.partial) } : {}),
  }
  if (!s.sides || type !== 'work') return base
  const { l, r } = s.sides
  return {
    ...base, weight: kg(l.weight), reps: String(l.reps), rir: show(l.rir), partial: l.partial ? String(l.partial) : undefined, leftDone: false,
    right: { weight: kg(r.weight), reps: String(r.reps), rir: show(r.rir), partial: r.partial ? String(r.partial) : undefined, done: false },
  }
}

/** Ob eine Zeile einen Satz ergibt: Cardio braucht Minuten, sonst Wiederholungen. */
export const rowHasValue = (r: Row, ex: Pick<Exercise, 'cardio'>) => (ex.cardio ? num(r.minutes) > 0 : num(r.reps) > 0)
