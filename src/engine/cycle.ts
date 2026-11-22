import { addDays, daysBetween } from '../utils/dates'

/**
 * Periode tracken (PLAN-6 B16, optional, Standard aus): gespeichert werden nur die markierten Tage (`yyyy-mm-dd`).
 * Alles Weitere (Beginn, Zykluslänge, Schätzung) wird daraus berechnet. Die Schätzung ist ein einfacher Mittelwert
 * der letzten Zyklen und keine medizinische Aussage.
 */
export const MIN_CYCLE = 15
export const MAX_CYCLE = 60
/** Zahl der letzten Zyklen für den Mittelwert */
export const CYCLES_AVERAGED = 6

/** Tag markieren bzw. die Markierung wieder entfernen; Ergebnis sortiert und ohne Doppelte. */
export function togglePeriodDay(days: string[], date: string): string[] {
  const set = new Set(days)
  if (set.has(date)) set.delete(date)
  else set.add(date)
  return [...set].sort()
}

/** Erste Tage zusammenhängender Blöcke markierter Tage (= Beginn einer Periode). */
export function periodStarts(days: string[]): string[] {
  const set = new Set(days)
  return [...set].sort().filter((d) => !set.has(addDays(d, -1)))
}

/** Abstände zwischen aufeinanderfolgenden Beginnen; unplausible (< 15, > 60 Tage, z. B. Lücken im Tracking) zählen nicht. */
export function cycleLengths(starts: string[]): number[] {
  const out: number[] = []
  for (let i = 1; i < starts.length; i++) {
    const n = daysBetween(starts[i - 1], starts[i])
    if (n >= MIN_CYCLE && n <= MAX_CYCLE) out.push(n)
  }
  return out
}

/** Mittlere Zykluslänge der letzten Zyklen in Tagen (gerundet), `null` ohne plausiblen Zyklus. */
export function averageCycle(starts: string[]): number | null {
  const lens = cycleLengths(starts).slice(-CYCLES_AVERAGED)
  return lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : null
}

/** Voraussichtlicher nächster Beginn (letzter Beginn + mittlere Zykluslänge), `null` ohne Schätzung. */
export function nextPeriodStart(starts: string[]): string | null {
  const avg = averageCycle(starts)
  return avg && starts.length ? addDays(starts.at(-1)!, avg) : null
}

export interface CycleSummary {
  lastStart: string | null
  /** Zyklustag heute (1 = erster Tag der letzten Periode), `null` wenn zu lange her oder unbekannt */
  cycleDay: number | null
  average: number | null
  next: string | null
  /** Tage bis zum geschätzten Beginn (negativ = überfällig) */
  daysUntilNext: number | null
}

export function cycleSummary(days: string[], today: string): CycleSummary {
  const starts = periodStarts(days.filter((d) => d <= today))
  const lastStart = starts.at(-1) ?? null
  const average = averageCycle(starts)
  const next = nextPeriodStart(starts)
  const since = lastStart ? daysBetween(lastStart, today) + 1 : null
  return {
    lastStart, average, next,
    cycleDay: since !== null && since <= MAX_CYCLE ? since : null,
    daysUntilNext: next ? daysBetween(today, next) : null,
  }
}
