import type { MeasureEntry, MeasureSite, WeightEntry } from '../types'
import type { Point } from './stats'
import { daysBetween } from '../utils/dates'

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

/** Zeitkonstante des Gewichts-Trends in Tagen: nach dieser Zeit hat ein neuer Wert rund 63 % des Abstands aufgeholt. */
export const TREND_DAYS = 7

/**
 * Geglätteter Gewichts-Trend (exponentiell, lückentolerant): Der Trend startet beim ersten Wert; jeder weitere
 * Eintrag zieht ihn um 1 − e^(−Tage/`TREND_DAYS`) in seine Richtung. Lange Lücken gewichten den neuen Wert also
 * stärker, mehrere Einträge kurz hintereinander verschieben den Trend nur wenig. Tagesschwankungen (Wasser,
 * Darminhalt) gleichen sich so aus. Ein Punkt je Eintrag, chronologisch.
 */
export function trendSeries(points: Point[], days = TREND_DAYS): Point[] {
  const sorted = [...points].filter((p) => p.value > 0).sort((a, b) => a.date.localeCompare(b.date))
  const out: Point[] = []
  for (const p of sorted) {
    const prev = out.at(-1)
    if (!prev) { out.push({ date: p.date, value: p.value }); continue }
    const dt = Math.max(1, daysBetween(prev.date, p.date))
    const a = 1 - Math.exp(-dt / days)
    out.push({ date: p.date, value: prev.value + a * (p.value - prev.value) })
  }
  return out
}

/**
 * Gewichtseinträge mit dem Trend statt des Rohwerts (auf 0,1 kg gerundet), für `bodyweightAt`: Der
 * Körpergewichtsanteil rechnet so mit einem stabilen Wert, ein einzelner Ausreißer ändert die Vorschläge kaum.
 * Nur für Berechnungen, gespeichert wird immer der Rohwert.
 */
export function smoothWeights<T extends { date: string; kg: number }>(weights: T[]): T[] {
  const trend = new Map(trendSeries(weights.map((w) => ({ date: w.date, value: w.kg }))).map((p) => [p.date, p.value]))
  return weights
    .filter((w) => trend.has(w.date))
    .map((w) => ({ ...w, kg: Math.round(trend.get(w.date)! * 10) / 10 }))
}
