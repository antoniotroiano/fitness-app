import type { MeasureEntry, MeasureSite, WeightEntry } from '../types'
import type { Point } from './stats'

/** Schlüssel einer Körperkennzahl: Gewicht, Körperfett, eine Maßstelle oder ein Verhältnis. */
export type RatioId = 'waistHip' | 'waistChest' | 'waistShoulders' | 'bicepsSym' | 'thighSym' | 'calfSym'
export type BodyKey = 'weight' | 'bodyFat' | MeasureSite | RatioId

export const MEASURE_GROUPS: { id: 'upper' | 'arms' | 'legs'; title: string; items: { id: MeasureSite; label: string }[] }[] = [
  { id: 'upper', title: 'Oberkörper', items: [
    { id: 'neck', label: 'Hals' }, { id: 'shoulders', label: 'Schultern' }, { id: 'bust', label: 'Brustumfang' },
    { id: 'chest', label: 'Brust' }, { id: 'waist', label: 'Taille' },
  ] },
  { id: 'arms', title: 'Arme', items: [
    { id: 'bicepsL', label: 'Bizeps links' }, { id: 'bicepsR', label: 'Bizeps rechts' },
    { id: 'forearmL', label: 'Unterarm links' }, { id: 'forearmR', label: 'Unterarm rechts' },
    { id: 'wristL', label: 'Handgelenk links' }, { id: 'wristR', label: 'Handgelenk rechts' },
  ] },
  { id: 'legs', title: 'Beine', items: [
    { id: 'hips', label: 'Hüfte' },
    { id: 'thighL', label: 'Oberschenkel links' }, { id: 'thighR', label: 'Oberschenkel rechts' },
    { id: 'calfL', label: 'Wade links' }, { id: 'calfR', label: 'Wade rechts' },
    { id: 'ankleL', label: 'Knöchel links' }, { id: 'ankleR', label: 'Knöchel rechts' },
  ] },
]

export const RATIOS: { id: RatioId; label: string; a: MeasureSite; b: MeasureSite }[] = [
  { id: 'waistHip', label: 'Taille / Hüfte', a: 'waist', b: 'hips' },
  { id: 'waistChest', label: 'Taille / Brust', a: 'waist', b: 'chest' },
  { id: 'waistShoulders', label: 'Taille / Schultern', a: 'waist', b: 'shoulders' },
  { id: 'bicepsSym', label: 'Bizeps links / rechts', a: 'bicepsL', b: 'bicepsR' },
  { id: 'thighSym', label: 'Oberschenkel links / rechts', a: 'thighL', b: 'thighR' },
  { id: 'calfSym', label: 'Wade links / rechts', a: 'calfL', b: 'calfR' },
]

export function isRatio(key: string): key is RatioId {
  return RATIOS.some((r) => r.id === key)
}

export function bodyLabel(key: BodyKey): string {
  if (key === 'weight') return 'Körpergewicht'
  if (key === 'bodyFat') return 'Körperfett'
  const r = RATIOS.find((x) => x.id === key)
  if (r) return r.label
  return MEASURE_GROUPS.flatMap((g) => g.items).find((i) => i.id === key)?.label ?? key
}

export function weightSeries(weights: WeightEntry[], field: 'kg' | 'bodyFat'): Point[] {
  return weights
    .filter((w) => w[field] != null && (w[field] as number) > 0)
    .map((w) => ({ date: w.date, value: w[field] as number }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function measureSeries(measures: MeasureEntry[], site: MeasureSite): Point[] {
  return measures
    .filter((m) => m.values[site] != null)
    .map((m) => ({ date: m.date, value: m.values[site]! }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Verhältnis a/b je Eintrag, an dem beide Maße erfasst wurden (auf 2 Nachkommastellen gerundet). */
export function ratioSeries(measures: MeasureEntry[], a: MeasureSite, b: MeasureSite): Point[] {
  return measures
    .filter((m) => (m.values[a] ?? 0) > 0 && (m.values[b] ?? 0) > 0)
    .map((m) => ({ date: m.date, value: Math.round((m.values[a]! / m.values[b]!) * 100) / 100 }))
    .sort((x, y) => x.date.localeCompare(y.date))
}

export function bodySeries(key: BodyKey, weights: WeightEntry[], measures: MeasureEntry[]): Point[] {
  if (key === 'weight') return weightSeries(weights, 'kg')
  if (key === 'bodyFat') return weightSeries(weights, 'bodyFat')
  const r = RATIOS.find((x) => x.id === key)
  if (r) return ratioSeries(measures, r.a, r.b)
  return measureSeries(measures, key as MeasureSite)
}

/** Die letzten n Einträge (chronologisch aufsteigend). */
export const lastEntries = (points: Point[], n = 7): Point[] => points.slice(Math.max(0, points.length - n))
