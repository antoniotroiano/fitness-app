import type { Exercise, LoggedSet, MuscleId, Session, WeightEntry } from '../types'
import { SECONDARY_WEIGHT } from '../data/muscles'
import { addDays, monthKey, todayStr, weekStart } from '../utils/dates'
import { e1rm, FALLBACK_RIR, weightForReps } from './progression'
import { bodyLoadOf, bodyweightAt } from './bodyweight'

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

/**
 * Gewicht/Wdh. werden je Seite eingetragen (Volumen zählt beide Seiten). Liest `Exercise.load`;
 * ohne Feld (eigene Übungen) gilt Kurzhantel = je Seite.
 */
export const isPerSide = (ex?: Pick<Exercise, 'equipment' | 'load'>) =>
  !!ex && (ex.load ? ex.load === 'perSide' : ex.equipment === 'dumbbell')
/** Volumen-Faktor: bei Übungen je Seite zählen beide Seiten (eingetragenes Gewicht × 2). */
export const volumeFactor = (ex?: Pick<Exercise, 'equipment' | 'load'>) => (isPerSide(ex) ? 2 : 1)

/** Volumen eines Satzes: Gewicht × Wdh. × Faktor, links/rechts getrennt erfasst die Summe beider Seiten. */
export const setVolume = (s: Pick<LoggedSet, 'weight' | 'reps' | 'sides'>, factor = 1) =>
  factor * (s.sides ? s.sides.l.weight * s.sides.l.reps + s.sides.r.weight * s.sides.r.reps : s.weight * s.reps)

/** Übungen ohne 1RM-/Gewichts-/Volumenwerte: assistiert (Gewicht = Unterstützung) und Zeitübungen (Wdh. = Sekunden). */
export const noLoadStats = (ex?: Pick<Exercise, 'assisted' | 'metric'>) => !!ex && (!!ex.assisted || ex.metric === 'time')

/** Arbeitssätze inkl. Drop-/Myo-Segmenten: zählen für Wiederholungen (auch Körpergewichtssätze ohne Zusatzlast). */
const work = (sets: LoggedSet[]) => sets.filter((s) => !s.warmup && s.reps > 0)
/** Eigenständige Arbeitssätze (ohne Segmente): zählen als Sätze. */
export const mainSets = (sets: LoggedSet[]) => work(sets).filter((s) => !s.segment)
/** Belastete Arbeitssätze inkl. Segmente (Gewicht > 0): Grundlage für Volumen. */
const loaded = (sets: LoggedSet[]) => work(sets).filter((s) => s.weight > 0)
/** Belastete eigenständige Sätze: Grundlage für 1RM, schwerstes Gewicht und besten Satz. */
const loadedMain = (sets: LoggedSet[]) => loaded(sets).filter((s) => !s.segment)

/** Höchstes Gewicht, das nach Schätzung für n Wiederholungen reicht (bester Satz). */
export function rmN(sets: LoggedSet[], n: number): number {
  return Math.max(0, ...loadedMain(sets).map((s) => weightForReps(e1rm(s.weight, s.reps, s.rir ?? FALLBACK_RIR), n)))
}

/**
 * `factor`: Volumen-Faktor (siehe volumeFactor), wirkt nur auf Volumen-Metriken.
 * `assisted`: das Gewicht ist Unterstützung, 1RM/Gewicht/Volumen sind dann nicht aussagekräftig (0).
 */
export function exerciseValue(sets: LoggedSet[], metric: ExerciseMetric, factor = 1, assisted = false): number {
  const w = work(sets)
  const m = mainSets(sets)
  const l = assisted ? [] : loaded(sets)
  const lm = assisted ? [] : loadedMain(sets)
  if (!w.length) return 0
  const top = (xs: number[]) => (xs.length ? Math.max(...xs) : 0)
  switch (metric) {
    case 'rm1': return top(lm.map((s) => e1rm(s.weight, s.reps, s.rir ?? FALLBACK_RIR)))
    case 'rm3': return rmN(lm, 3)
    case 'rm10': return rmN(lm, 10)
    case 'heaviest': return top(lm.map((s) => s.weight))
    case 'totalVolume': return l.reduce((a, s) => a + setVolume(s, factor), 0)
    case 'bestSetVolume': return top(lm.map((s) => setVolume(s, factor)))
    case 'totalReps': return w.reduce((a, s) => a + s.reps, 0)
    case 'bestSetReps': return top(m.map((s) => s.reps))
    case 'totalSets': return m.length
  }
}

/** Tageswerte einer Übung über alle Sessions (mehrere Sessions am Tag werden zusammengelegt). */
export function exerciseDaily(
  sessions: Session[], exerciseId: string, metric: ExerciseMetric, factor = 1, assisted = false,
): Point[] {
  const byDate = new Map<string, LoggedSet[]>()
  for (const s of sessions) {
    for (const ex of s.exercises) {
      if (ex.exerciseId !== exerciseId) continue
      byDate.set(s.date, [...(byDate.get(s.date) ?? []), ...ex.sets])
    }
  }
  return [...byDate.entries()]
    .map(([date, sets]) => ({ date, value: exerciseValue(sets, metric, factor, assisted) }))
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
      const sets = metric === 'sets' ? mainSets(ex.sets) : noLoadStats(def) ? [] : loaded(ex.sets)
      const amount = metric === 'sets' ? sets.length : sets.reduce((a, x) => a + setVolume(x, volumeFactor(def)), 0)
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

/**
 * Ø Sätze pro Woche je Muskel über die letzten `weeks` Wochen (rollierend bis `today`): primär voll, sekundär
 * `SECONDARY_WEIGHT`, Aufwärmsätze und Drop-/Myo-Segmente zählen nicht (wie `muscleDaily`).
 */
export function weeklyMuscleSets(
  sessions: Session[], lookup: (id: string) => Exercise | undefined, weeks: number, today = todayStr(),
): Partial<Record<MuscleId, number>> {
  const start = addDays(today, -weeks * 7 + 1)
  const out: Partial<Record<MuscleId, number>> = {}
  for (const s of sessions) {
    if (s.date < start || s.date > today) continue
    for (const ex of s.exercises) {
      const def = lookup(ex.exerciseId)
      if (!def || def.cardio) continue
      const n = mainSets(ex.sets).length
      if (!n) continue
      for (const m of def.primary) out[m] = (out[m] ?? 0) + n
      for (const m of def.secondary) if (!def.primary.includes(m)) out[m] = (out[m] ?? 0) + n * SECONDARY_WEIGHT
    }
  }
  for (const m of Object.keys(out) as MuscleId[]) out[m] = Math.round((out[m]! / weeks) * 10) / 10
  return out
}

/** Stufe für die Körperkarte: 0 = nichts, 1 = unter 4, 2 = 4–9, 3 = 10–20, 4 = über 20 Sätze/Woche (grobe Volumen-Richtwerte). */
export function setTier(perWeek: number): 0 | 1 | 2 | 3 | 4 {
  if (perWeek <= 0) return 0
  if (perWeek < 4) return 1
  if (perWeek < 10) return 2
  if (perWeek <= 20) return 3
  return 4
}

/** Beitrag einer Übung zu einem Muskel: Ø gewertete Sätze pro Woche, Rolle des Muskels in der Übung */
export interface MuscleContribution { exerciseId: string; perWeek: number; role: 'primary' | 'secondary' }

/**
 * Welche Übungen zu den Ø Sätzen eines Muskels beitragen (gleiche Zählung wie `weeklyMuscleSets`), absteigend.
 * Die Summe der Beiträge ergibt (bis auf Rundung) den Wert des Muskels.
 */
export function muscleContributions(
  sessions: Session[], lookup: (id: string) => Exercise | undefined, muscle: MuscleId, weeks: number, today = todayStr(),
): MuscleContribution[] {
  const start = addDays(today, -weeks * 7 + 1)
  const by = new Map<string, MuscleContribution>()
  for (const s of sessions) {
    if (s.date < start || s.date > today) continue
    for (const ex of s.exercises) {
      const def = lookup(ex.exerciseId)
      if (!def || def.cardio) continue
      const role = def.primary.includes(muscle) ? 'primary' : def.secondary.includes(muscle) ? 'secondary' : null
      const n = role ? mainSets(ex.sets).length : 0
      if (!role || !n) continue
      const c = by.get(def.id) ?? { exerciseId: def.id, perWeek: 0, role }
      c.perWeek += n * (role === 'primary' ? 1 : SECONDARY_WEIGHT)
      by.set(def.id, c)
    }
  }
  return [...by.values()].map((c) => ({ ...c, perWeek: Math.round((c.perWeek / weeks) * 10) / 10 }))
    .sort((a, b) => b.perWeek - a.perWeek || a.exerciseId.localeCompare(b.exerciseId))
}

/**
 * Ø Volumen pro Woche (kg), aufgeteilt in bewegtes Zusatz-/Hantelgewicht (`external`) und Körpergewichtsanteil
 * (`bodyweight`, Anteil × Körpergewicht am Tag, nur Übungen mit `Exercise.bodyweight`). Arbeitssätze inkl. Segmente,
 * keine Aufwärmsätze; assistierte und Zeitübungen zählen nicht (`noLoadStats`). Erwartet gespeicherte Sessions
 * (Zusatzgewicht), nicht `applyBodyweight`.
 */
export function volumeSplit(
  sessions: Session[], lookup: (id: string) => Exercise | undefined, weights: Pick<WeightEntry, 'date' | 'kg'>[],
  weeks: number, today = todayStr(),
): { external: number; bodyweight: number } {
  const start = addDays(today, -weeks * 7 + 1)
  let external = 0
  let body = 0
  for (const s of sessions) {
    if (s.date < start || s.date > today) continue
    for (const ex of s.exercises) {
      const def = lookup(ex.exerciseId)
      if (!def || def.cardio || noLoadStats(def)) continue
      const f = volumeFactor(def)
      const load = bodyLoadOf(def, bodyweightAt(weights, s.date))
      for (const x of work(ex.sets)) {
        external += setVolume(x, f)
        const reps = x.sides ? x.sides.l.reps + x.sides.r.reps : x.reps
        body += load * reps * f
      }
    }
  }
  return { external: Math.round(external / weeks), bodyweight: Math.round(body / weeks) }
}
