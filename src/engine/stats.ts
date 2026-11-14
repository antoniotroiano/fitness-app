import type { Exercise, LoggedSet, MuscleId, Session } from '../types'
import { SECONDARY_WEIGHT } from '../data/muscles'
import { addDays, monthKey, todayStr, weekStart } from '../utils/dates'
import { e1rm } from './progression'

export type ExerciseMetric =
  | 'rm1' | 'rm3' | 'rm10' | 'heaviest' | 'totalVolume' | 'bestSetVolume' | 'totalReps'
  | 'bestSetReps' | 'totalSets'
export type MuscleMetric = 'sets' | 'volume'
export type Period = '1W' | '1M' | '3M' | '6M' | '1Y' | 'All'
export type Averaging = 'daily' | 'weekly' | 'monthly'

export interface Point { date: string; value: number }

/** Diese Metriken werden als Balken gezeigt (und je Zeitraum summiert) */
export const BAR_METRICS: (ExerciseMetric | MuscleMetric)[] = ['totalSets', 'totalReps', 'totalVolume', 'sets', 'volume']
export const isBar = (m: ExerciseMetric | MuscleMetric | CardioMetric) =>
  (BAR_METRICS as string[]).includes(m) || m === 'minutes' || m === 'distance'

export const METRIC_UNIT: Record<ExerciseMetric, 'weight' | 'reps' | 'sets'> = {
  rm1: 'weight', rm3: 'weight', rm10: 'weight', heaviest: 'weight', totalVolume: 'weight',
  bestSetVolume: 'weight', totalReps: 'reps', bestSetReps: 'reps', totalSets: 'sets',
}

const work = (sets: LoggedSet[]) => sets.filter((s) => s.weight > 0 && s.reps > 0)

/** Höchstes Gewicht, das nach Schätzung für n Wiederholungen reicht (bester Satz). */
export function rmN(sets: LoggedSet[], n: number): number {
  return Math.max(0, ...work(sets).map((s) => e1rm(s.weight, s.reps, s.rir ?? 0) / (1 + n / 30)))
}

export function exerciseValue(sets: LoggedSet[], metric: ExerciseMetric): number {
  const w = work(sets)
  if (!w.length) return 0
  switch (metric) {
    case 'rm1': return Math.max(...w.map((s) => e1rm(s.weight, s.reps, s.rir ?? 0)))
    case 'rm3': return rmN(w, 3)
    case 'rm10': return rmN(w, 10)
    case 'heaviest': return Math.max(...w.map((s) => s.weight))
    case 'totalVolume': return w.reduce((a, s) => a + s.weight * s.reps, 0)
    case 'bestSetVolume': return Math.max(...w.map((s) => s.weight * s.reps))
    case 'totalReps': return w.reduce((a, s) => a + s.reps, 0)
    case 'bestSetReps': return Math.max(...w.map((s) => s.reps))
    case 'totalSets': return w.length
  }
}

/** Tageswerte einer Übung über alle Sessions (mehrere Sessions am Tag werden zusammengelegt). */
export function exerciseDaily(sessions: Session[], exerciseId: string, metric: ExerciseMetric): Point[] {
  const byDate = new Map<string, LoggedSet[]>()
  for (const s of sessions) {
    for (const ex of s.exercises) {
      if (ex.exerciseId !== exerciseId) continue
      byDate.set(s.date, [...(byDate.get(s.date) ?? []), ...ex.sets])
    }
  }
  return [...byDate.entries()]
    .map(([date, sets]) => ({ date, value: exerciseValue(sets, metric) }))
    .filter((p) => p.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export type CardioMetric = 'minutes' | 'distance' | 'pace'

/** Cardio pro Tag: Dauer (min), Distanz (km) oder Tempo (min/km, nur Tage mit beidem). */
export function cardioDaily(sessions: Session[], exerciseId: string, metric: CardioMetric): Point[] {
  const byDate = new Map<string, { min: number; km: number }>()
  for (const s of sessions) {
    for (const ex of s.exercises) {
      if (ex.exerciseId !== exerciseId) continue
      const cur = byDate.get(s.date) ?? { min: 0, km: 0 }
      for (const set of ex.sets) { cur.min += set.minutes ?? 0; cur.km += set.km ?? 0 }
      byDate.set(s.date, cur)
    }
  }
  return [...byDate.entries()]
    .map(([date, v]) => ({
      date, value: metric === 'minutes' ? v.min : metric === 'distance' ? v.km : v.km > 0 && v.min > 0 ? v.min / v.km : 0,
    }))
    .filter((p) => p.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Sets/Volumen pro Muskel und Tag; primäre Muskeln voll, sekundäre anteilig. Cardio zählt nicht. */
export function muscleDaily(
  sessions: Session[], muscle: MuscleId, metric: MuscleMetric, lookup: (id: string) => Exercise | undefined,
): Point[] {
  const byDate = new Map<string, number>()
  for (const s of sessions) {
    for (const ex of s.exercises) {
      const def = lookup(ex.exerciseId)
      if (!def || def.cardio) continue
      const w = def.primary.includes(muscle) ? 1 : def.secondary.includes(muscle) ? SECONDARY_WEIGHT : 0
      if (!w) continue
      const sets = work(ex.sets)
      const amount = metric === 'sets' ? sets.length : sets.reduce((a, x) => a + x.weight * x.reps, 0)
      if (amount > 0) byDate.set(s.date, (byDate.get(s.date) ?? 0) + amount * w)
    }
  }
  return [...byDate.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date))
}

export function periodStart(period: Period, today = todayStr()): string | null {
  const days = { '1W': 7, '1M': 30, '3M': 91, '6M': 182, '1Y': 365 }[period as Exclude<Period, 'All'>]
  return days ? addDays(today, -days + 1) : null
}

export function filterPeriod(points: Point[], period: Period, today = todayStr()): Point[] {
  const start = periodStart(period, today)
  return start ? points.filter((p) => p.date >= start && p.date <= today) : points
}

/** Daily: unverändert. Weekly/Monthly: Balken summiert, Linien gemittelt. */
export function average(points: Point[], averaging: Averaging, sum: boolean): Point[] {
  if (averaging === 'daily') return points
  const key = (d: string) => (averaging === 'weekly' ? weekStart(d) : `${monthKey(d)}-01`)
  const groups = new Map<string, number[]>()
  for (const p of points) groups.set(key(p.date), [...(groups.get(key(p.date)) ?? []), p.value])
  return [...groups.entries()]
    .map(([date, v]) => ({
      date, value: sum ? v.reduce((a, b) => a + b, 0) : v.reduce((a, b) => a + b, 0) / v.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function summary(points: Point[], sum: boolean): { avg: number; best: number; total: number } {
  if (!points.length) return { avg: 0, best: 0, total: 0 }
  const total = points.reduce((a, p) => a + p.value, 0)
  return { avg: total / points.length, best: Math.max(...points.map((p) => p.value)), total: sum ? total : 0 }
}

/** Historie nach Monaten (neueste zuerst) */
export function groupByMonth(points: Point[]): { month: string; items: Point[] }[] {
  const map = new Map<string, Point[]>()
  for (const p of [...points].sort((a, b) => b.date.localeCompare(a.date))) {
    map.set(monthKey(p.date), [...(map.get(monthKey(p.date)) ?? []), p])
  }
  return [...map.entries()].map(([month, items]) => ({ month, items }))
}
