import type { MeasureEntry, MeasureSite, Session, WeightEntry } from '../types'
import { mainSets, type Point } from './stats'
import { addDays, daysBetween } from '../utils/dates'
import { t } from '../i18n'

/** Schlüssel einer Körperkennzahl: Gewicht, Körperfett, eine Maßstelle oder ein Verhältnis. */
export type RatioId = 'waistHip' | 'waistChest' | 'waistShoulders' | 'bicepsSym' | 'thighSym' | 'calfSym'
export type BodyKey = 'weight' | 'bodyFat' | MeasureSite | RatioId

export const MEASURE_GROUPS: { id: 'upper' | 'arms' | 'legs'; title: string; items: { id: MeasureSite; label: string }[] }[] = [
  { id: 'upper', title: t('Oberkörper'), items: [
    { id: 'neck', label: t('Hals') }, { id: 'shoulders', label: t('Schultern') }, { id: 'bust', label: t('Brustumfang') },
    { id: 'chest', label: t('Brust') }, { id: 'waist', label: t('Taille') },
  ] },
  { id: 'arms', title: t('Arme'), items: [
    { id: 'bicepsL', label: t('Bizeps links') }, { id: 'bicepsR', label: t('Bizeps rechts') },
    { id: 'forearmL', label: t('Unterarm links') }, { id: 'forearmR', label: t('Unterarm rechts') },
    { id: 'wristL', label: t('Handgelenk links') }, { id: 'wristR', label: t('Handgelenk rechts') },
  ] },
  { id: 'legs', title: t('Beine'), items: [
    { id: 'hips', label: t('Hüfte') },
    { id: 'thighL', label: t('Oberschenkel links') }, { id: 'thighR', label: t('Oberschenkel rechts') },
    { id: 'calfL', label: t('Wade links') }, { id: 'calfR', label: t('Wade rechts') },
    { id: 'ankleL', label: t('Knöchel links') }, { id: 'ankleR', label: t('Knöchel rechts') },
  ] },
]

export const RATIOS: { id: RatioId; label: string; a: MeasureSite; b: MeasureSite }[] = [
  { id: 'waistHip', label: t('Taille / Hüfte'), a: 'waist', b: 'hips' },
  { id: 'waistChest', label: t('Taille / Brust'), a: 'waist', b: 'chest' },
  { id: 'waistShoulders', label: t('Taille / Schultern'), a: 'waist', b: 'shoulders' },
  { id: 'bicepsSym', label: t('Bizeps links / rechts'), a: 'bicepsL', b: 'bicepsR' },
  { id: 'thighSym', label: t('Oberschenkel links / rechts'), a: 'thighL', b: 'thighR' },
  { id: 'calfSym', label: t('Wade links / rechts'), a: 'calfL', b: 'calfR' },
]

export function isRatio(key: string): key is RatioId {
  return RATIOS.some((r) => r.id === key)
}

export function bodyLabel(key: BodyKey): string {
  if (key === 'weight') return t('Körpergewicht')
  if (key === 'bodyFat') return t('Körperfett')
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
/** Einstellbarer Bereich der Glättung (Tage): kürzer = folgt dem Gewicht schneller, länger = ruhiger. */
export const TREND_DAYS_RANGE = { min: 3, max: 14 } as const
export const clampTrendDays = (d?: number | null): number =>
  d == null || !Number.isFinite(d) ? TREND_DAYS : Math.min(TREND_DAYS_RANGE.max, Math.max(TREND_DAYS_RANGE.min, Math.round(d)))

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
export function smoothWeights<T extends { date: string; kg: number }>(weights: T[], days = TREND_DAYS): T[] {
  const trend = new Map(trendSeries(weights.map((w) => ({ date: w.date, value: w.kg })), days).map((p) => [p.date, p.value]))
  return weights
    .filter((w) => trend.has(w.date))
    .map((w) => ({ ...w, kg: Math.round(trend.get(w.date)! * 10) / 10 }))
}

/** Schwellen des Hinweises „Defizit + sinkende Sätze“. */
export const DEFICIT_PCT_PER_WEEK = 0.75
export const DEFICIT_MIN_DAYS = 14
export const SETS_DROP_PCT = 15
export const SETS_MIN_PRIOR = 8

/** Arbeitssätze (ohne Aufwärmen/Segmente) in den Tagen `from`…`to` (inklusive), Cardio über `skip` ausgenommen. */
export function workSetsBetween(sessions: Session[], from: string, to: string, skip: (exerciseId: string) => boolean = () => false): number {
  let n = 0
  for (const s of sessions) {
    if (s.date < from || s.date > to) continue
    for (const e of s.exercises) if (!skip(e.exerciseId)) n += mainSets(e.sets).length
  }
  return n
}

export interface DeficitHint {
  /** Änderung des Trends in Prozent des Körpergewichts pro Woche (negativ) */
  pctPerWeek: number
  /** Arbeitssätze der letzten 14 Tage gegenüber den 14 Tagen davor, Prozent (negativ) */
  setsPct: number
}

/**
 * Hinweis „Defizit + sinkende Sätze“ (PLAN-6 B8): Der Trend fällt deutlich (≥ `DEFICIT_PCT_PER_WEEK` % des
 * Körpergewichts pro Woche, gemessen über mindestens `DEFICIT_MIN_DAYS` Tage) und die Arbeitssätze der letzten 14
 * Tage liegen um mindestens `SETS_DROP_PCT` % unter den 14 Tagen davor (vorher mindestens `SETS_MIN_PRIOR` Sätze,
 * sonst fehlt die Vergleichsbasis). Einfache Faustregel, kein Befund: zu schnelles Abnehmen kostet oft Leistung.
 */
export function deficitHint(trend: Point[], recentSets: number, priorSets: number, today: string): DeficitHint | null {
  const pts = trend.filter((p) => p.date <= today)
  const last = pts.at(-1)
  if (!last || pts.length < 2 || daysBetween(last.date, today) > 7) return null
  const base = [...pts].reverse().find((p) => daysBetween(p.date, last.date) >= DEFICIT_MIN_DAYS)
  if (!base || base.value <= 0) return null
  const days = daysBetween(base.date, last.date)
  const pctPerWeek = ((last.value - base.value) / base.value) * 100 / (days / 7)
  if (pctPerWeek > -DEFICIT_PCT_PER_WEEK) return null
  if (priorSets < SETS_MIN_PRIOR) return null
  const setsPct = ((recentSets - priorSets) / priorSets) * 100
  if (setsPct > -SETS_DROP_PCT) return null
  return { pctPerWeek: Math.round(pctPerWeek * 100) / 100, setsPct: Math.round(setsPct) }
}

/** Zeitraum der Vergleichsansicht in Tagen, `null` = seit dem ersten Eintrag, oder ein freier Bereich (Daten inklusive). */
export type ComparePeriod = 28 | 90 | 365 | null | { from: string; to: string }

export interface CompareRow {
  key: BodyKey
  label: string
  /** Ausgangswert (Stand am Beginn des Zeitraums) und aktueller Wert, jeweils mit Datum */
  from: Point
  to: Point
  delta: number
  /** Veränderung in Prozent des Ausgangswerts (1 Nachkommastelle) */
  pct: number
}

/**
 * Vergleichsansicht (PLAN-6 B21): Veränderung jeder erfassten Kennzahl (Gewicht, Körperfett, alle Maßstellen und
 * Verhältnisse) über einen Zeitraum. Ausgangswert = letzter Eintrag am oder vor dem Beginn des Zeitraums, gibt es
 * keinen, der erste Eintrag im Zeitraum. Aktuell = letzter Eintrag (bei freiem Bereich: am oder vor `to`).
 * Mindestens zwei verschiedene Tage nötig. Differenz auf 0,1 gerundet, bei Verhältnissen auf 0,01.
 */
export function compareRows(weights: WeightEntry[], measures: MeasureEntry[], today: string, period: ComparePeriod): CompareRow[] {
  const range = period !== null && typeof period === 'object' ? period : null
  const end = range ? (range.to < today ? range.to : today) : today
  const cutoff = range ? range.from : period === null ? null : addDays(today, -period)
  const keys: BodyKey[] = ['weight', 'bodyFat', ...MEASURE_GROUPS.flatMap((g) => g.items.map((i) => i.id)), ...RATIOS.map((r) => r.id)]
  const rows: CompareRow[] = []
  for (const key of keys) {
    const pts = bodySeries(key, weights, measures).filter((p) => p.date <= end)
    if (pts.length < 2) continue
    const to = pts[pts.length - 1]
    let from: Point | undefined
    if (cutoff === null) from = pts[0]
    else {
      const before = pts.filter((p) => p.date <= cutoff)
      from = before.length ? before[before.length - 1] : pts.find((p) => p.date > cutoff)
    }
    if (!from || from.date === to.date || from.value <= 0) continue
    const f = isRatio(key) ? 100 : 10
    rows.push({
      key, label: bodyLabel(key), from, to, delta: Math.round((to.value - from.value) * f) / f,
      pct: Math.round(((to.value - from.value) / from.value) * 1000) / 10,
    })
  }
  return rows
}
