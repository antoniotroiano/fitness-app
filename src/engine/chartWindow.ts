import { addDays, daysBetween, WEEKDAYS, weekdayIndex, parse, weekStart, monthKey } from '../utils/dates'
import type { Averaging, Period, Point } from './stats'
import { LOCALE } from '../i18n'

/** Länge des Zeitfensters in Tagen; "All" richtet sich nach den Daten. */
export const PERIOD_DAYS: Record<Exclude<Period, 'All'>, number> = { '1W': 7, '1M': 30, '3M': 91, '6M': 182, '1Y': 365 }

export interface ChartWindow { start: string; end: string; days: number }

/** Größtmögliche Verschiebung in Tagen zurück: bis das Fenster mit seinem Ende beim ersten Eintrag steht. */
export function maxOffset(today: string, firstDate: string | null): number {
  return firstDate ? Math.max(0, daysBetween(firstDate, today)) : 0
}

export const clampOffset = (offset: number, today: string, firstDate: string | null) =>
  Math.min(maxOffset(today, firstDate), Math.max(0, offset))

/**
 * Fenster für einen Zeitraum, `offset` Tage vor heute verschoben (0 = aktuell).
 * "All" reicht vom ersten Eintrag bis heute (mindestens 7 Tage) und wird nicht verschoben.
 */
export function chartWindow(period: Period, today: string, firstDate: string | null, offset = 0): ChartWindow {
  if (period === 'All') {
    const days = Math.max(7, firstDate ? daysBetween(firstDate, today) + 1 : 7)
    return { start: addDays(today, -days + 1), end: today, days }
  }
  const days = PERIOD_DAYS[period]
  const end = addDays(today, -clampOffset(offset, today, firstDate))
  return { start: addDays(end, -days + 1), end, days }
}

export const windowDates = (w: ChartWindow): string[] => Array.from({ length: w.days }, (_, i) => addDays(w.start, i))

export const inWindow = (points: Point[], w: ChartWindow): Point[] => points.filter((p) => p.date >= w.start && p.date <= w.end)

const dayMonth = (d: string) => parse(d).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })
// Nur der Monat, mit Abkürzungspunkt wie im Datum ("Nov.")
const monthShort = (d: string) => dayMonth(d).replace(/^\d+\.\s*/, '')

/** Titel über dem Diagramm: "9. - 15. Nov. 2026", "17. Okt. - 15. Nov. 2026". */
export function formatRange(w: ChartWindow): string {
  const a = parse(w.start)
  const b = parse(w.end)
  const year = (d: Date) => d.getFullYear()
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${a.getDate()}. - ${b.getDate()}. ${monthShort(w.end)} ${year(b)}`
  }
  if (a.getFullYear() === b.getFullYear()) return `${dayMonth(w.start)} - ${dayMonth(w.end)} ${year(b)}`
  return `${dayMonth(w.start)} ${year(a)} - ${dayMonth(w.end)} ${year(b)}`
}

export interface AxisTick { index: number; label: string }

/**
 * Beschriftung der unteren Achse. Bis 7 Tage: jeder Tag mit Wochentag (Mo, Di, ...).
 * Sonst 6 Beschriftungen in gleichen Schritten, beginnend rechts beim Enddatum.
 */
export function axisTicks(w: ChartWindow): AxisTick[] {
  const dates = windowDates(w)
  if (w.days <= 7) return dates.map((d, index) => ({ index, label: WEEKDAYS[weekdayIndex(d)] }))
  const step = Math.ceil(w.days / 6)
  const ticks: AxisTick[] = []
  for (let i = w.days - 1; i >= 0 && ticks.length < 6; i -= step) {
    ticks.unshift({ index: i, label: step >= 28 ? monthShort(dates[i]) : dayMonth(dates[i]) })
  }
  return ticks
}

/** Von-bis-Position (Tagesindex im Fenster, beschnitten) eines Datenpunkts je nach Mittelung. */
export function bucketSpan(date: string, mode: Averaging, w: ChartWindow): { from: number; to: number } {
  let s = date
  let e = date
  if (mode === 'weekly') { s = weekStart(date); e = addDays(s, 6) }
  if (mode === 'monthly') {
    const d = parse(date)
    s = `${monthKey(date)}-01`
    e = `${monthKey(date)}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, '0')}`
  }
  return {
    from: Math.max(0, daysBetween(w.start, s)),
    to: Math.min(w.days - 1, daysBetween(w.start, e)),
  }
}

/** "Schöne" Achsenwerte von min bis max (inklusive), ca. `count` Schritte. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!(max > min)) { const c = Number.isFinite(min) ? min : 0; return [c - 1, c, c + 1].map((v) => Math.round(v * 100) / 100) }
  const raw = (max - min) / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const f = raw / pow
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const out: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6)
  return out
}
