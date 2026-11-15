/** Workout-Uhr auf Zeitstempel-Basis: übersteht Hintergrund, Reload und Pausen ohne Drift. */
export interface ClockState {
  startedAt: number
  /** Beginn der laufenden Pause (ms) oder null */
  pausedAt: number | null
  /** Summe aller beendeten Pausen (ms) */
  pausedMs: number
}

export const startClock = (now: number): ClockState => ({ startedAt: now, pausedAt: null, pausedMs: 0 })

export const elapsedMs = (c: ClockState, now: number): number =>
  Math.max(0, (c.pausedAt ?? now) - c.startedAt - c.pausedMs)

export const pauseClock = (c: ClockState, now: number): ClockState =>
  c.pausedAt == null ? { ...c, pausedAt: now } : c

export const resumeClock = (c: ClockState, now: number): ClockState =>
  c.pausedAt == null ? c : { ...c, pausedAt: null, pausedMs: c.pausedMs + (now - c.pausedAt) }

/** 00:00:00 */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(h)}:${p(m)}:${p(s % 60)}`
}
