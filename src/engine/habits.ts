import type { Session } from '../types'
import { addDays, fmt, parse, weekStart } from '../utils/dates'
import type { Point } from './stats'

/** Die letzten n Tage inklusive heute, älteste zuerst. */
export function lastDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)))
}

export function habitDots(dates: Set<string>, today: string, n = 30): { date: string; on: boolean }[] {
  return lastDays(today, n).map((date) => ({ date, on: dates.has(date) }))
}

/** Anzahl erfasster Tage in der laufenden Woche (Mo bis heute). Nenner ist immer 7. */
export function weekCount(dates: Set<string>, today: string): number {
  const start = weekStart(today)
  let n = 0
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i)
    if (d <= today && dates.has(d)) n++
  }
  return n
}

/** Tage in Folge; ein noch leerer heutiger Tag unterbricht die Serie nicht. */
export function streakDays(dates: Set<string>, today: string): number {
  let d = dates.has(today) ? today : addDays(today, -1)
  let n = 0
  while (dates.has(d)) { n++; d = addDays(d, -1) }
  return n
}

/** Wochen in Folge mit mindestens einem Eintrag; eine noch leere laufende Woche unterbricht nicht. */
export function streakWeeks(dates: Set<string>, today: string): number {
  const hasWeek = (ws: string) => Array.from({ length: 7 }, (_, i) => addDays(ws, i)).some((d) => dates.has(d))
  let ws = weekStart(today)
  if (!hasWeek(ws)) ws = addDays(ws, -7)
  let n = 0
  while (hasWeek(ws)) { n++; ws = addDays(ws, -7) }
  return n
}

/** Monatsraster, Woche beginnt am Montag; Lücken sind null. month0 ist 0-basiert. */
export function monthGrid(year: number, month0: number): (string | null)[][] {
  const first = new Date(year, month0, 1)
  const days = new Date(year, month0 + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => fmt(new Date(year, month0, i + 1)))]
  while (cells.length % 7) cells.push(null)
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
}

export function shiftMonth(year: number, month0: number, delta: number): { year: number; month0: number } {
  const d = new Date(year, month0 + delta, 1)
  return { year: d.getFullYear(), month0: d.getMonth() }
}

/** Werte der letzten n Tage (älteste zuerst), Tage ohne Eintrag sind 0. */
export function dailySeries(points: Point[], today: string, n = 7): number[] {
  const byDate = new Map(points.map((p) => [p.date, p.value]))
  return lastDays(today, n).map((d) => byDate.get(d) ?? 0)
}

export const sessionDates = (sessions: Session[]): Set<string> => new Set(sessions.map((s) => s.date))

export const monthOf = (date: string) => { const d = parse(date); return { year: d.getFullYear(), month0: d.getMonth() } }

/** Wie dailySeries, aber Tage ohne Eintrag sind null (für Liniendiagramme). */
export function dailyValues(points: Point[], today: string, n = 7): (number | null)[] {
  const byDate = new Map(points.map((p) => [p.date, p.value]))
  return lastDays(today, n).map((d) => byDate.get(d) ?? null)
}
