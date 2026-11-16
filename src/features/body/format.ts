import type { Settings } from '../../types'
import { isRatio, type BodyKey } from '../../engine/body'
import { cmToDisplay, kgToDisplay } from '../../utils/units'

/** Einheit und Anzeige einer Körperkennzahl (intern kg / cm / %). */
export function bodyUnit(key: BodyKey, s: Pick<Settings, 'weightUnit' | 'lengthUnit'>): string {
  if (key === 'weight') return s.weightUnit
  if (key === 'bodyFat') return '%'
  if (isRatio(key)) return ''
  return s.lengthUnit
}

export function formatBody(key: BodyKey, v: number, s: Pick<Settings, 'weightUnit' | 'lengthUnit'>): string {
  if (key === 'weight') return `${kgToDisplay(v, s.weightUnit)}`
  if (key === 'bodyFat') return `${Math.round(v * 10) / 10}`
  if (isRatio(key)) return v.toFixed(2)
  return `${cmToDisplay(v, s.lengthUnit)}`
}
