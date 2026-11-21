import type { Program, Session, WeekState } from '../types'
import { blockWeeksOf, weekInBlock, weekPlan } from './periodization'

export const emptyWeek = (week = 0): WeekState => ({ week, done: Array(7).fill(false), markedDates: [] })

/** Slots, die in der Woche erledigt werden müssen (alle 7). */
export function isWeekComplete(state: WeekState): boolean {
  return state.done.length > 0 && state.done.every(Boolean)
}

/** Nächster offener Workout-Slot (Index in weekSlots) */
export function nextWorkoutSlot(program: Program, state: WeekState): number | null {
  const i = program.weekSlots.findIndex((s, idx) => s !== 'rest' && !state.done[idx])
  return i === -1 ? null : i
}

/**
 * Slot als erledigt markieren. Sind danach alle 7 erledigt, startet automatisch
 * die nächste Programmwoche mit leeren Markierungen (Workout A, neue Wochenziele).
 */
export function markSlot(state: WeekState, slot: number, date: string | null): WeekState {
  if (slot < 0 || slot >= state.done.length) return state
  const done = state.done.map((d, i) => (i === slot ? true : d))
  const markedDates = date === null || state.markedDates.includes(date) ? state.markedDates : [...state.markedDates, date]
  const next: WeekState = { ...state, done, markedDates }
  return isWeekComplete(next) ? emptyWeek(state.week + 1) : next
}

export function unmarkSlot(state: WeekState, slot: number): WeekState {
  return { ...state, done: state.done.map((d, i) => (i === slot ? false : d)) }
}

/**
 * Wochenstand für eine beliebige Programmwoche: Erledigt-Markierungen und Daten werden aus den
 * geloggten Einheiten dieser Woche rekonstruiert (Ruhetage lassen sich daraus nicht ableiten und bleiben offen).
 */
export function jumpToWeek(program: Program, sessions: Session[], target: number): WeekState {
  const state = emptyWeek(Math.max(0, target))
  const inWeek = sessions.filter((s) => s.programId === program.id && s.week === state.week)
  const dates: string[] = []
  program.weekSlots.forEach((slot, i) => {
    if (slot === 'rest') return
    const s = inWeek.find((x) => x.dayIndex === slot)
    if (!s) return
    state.done[i] = true
    if (!dates.includes(s.date)) dates.push(s.date)
  })
  state.markedDates = dates
  return state
}

/** Höchste Programmwoche (0-basiert), in der bisher trainiert wurde bzw. die aktuell läuft. */
export function maxReachedWeek(program: Program, sessions: Session[], current: number): number {
  return sessions.reduce((m, s) => (s.programId === program.id ? Math.max(m, s.week) : m), current)
}

/**
 * Historie für die Gewichtsberechnung bei einem Wochensprung: Einheiten dieses Programms aus
 * späteren Wochen zählen nicht (sonst würden beim Zurückspringen Gewichte aus der "Zukunft" vorgeschlagen).
 */
export function historyUpTo(sessions: Session[], programId: number | undefined, week: number): Session[] {
  return sessions.filter((s) => s.programId !== programId || s.week <= week)
}

/** Wochen eines Blocks (Arbeitswochen + ggf. Deload); 0 = Programm ohne Periodisierung (eigener Plan). */
export function cycleLength(program: Pick<Program, 'config'>): number {
  const c = program.config
  return c ? blockWeeksOf(c) + (c.deload ? 1 : 0) : 0
}

/** Anzeigename einer Programmwoche: "Woche 3" bzw. "Deload", ab dem zweiten Block mit "Block n". */
export function weekLabel(program: Pick<Program, 'config'>, week: number): string {
  const c = program.config
  if (!c) return `Woche ${week + 1}`
  const len = cycleLength(program)
  const name = weekPlan(c, week).isDeload ? 'Deload' : `Woche ${weekInBlock(week, c.deload, blockWeeksOf(c)) + 1}`
  const block = Math.floor(week / len)
  return block > 0 ? `${name} · Block ${block + 1}` : name
}

export interface WeekOption { week: number; label: string; block: number }

/**
 * Wählbare Wochen: alle Wochen der Blöcke bis zum aktuellen bzw. zuletzt trainierten Block (Arbeitswochen + Deload),
 * nicht mehr. Ohne Periodisierung bis eine Woche nach der letzten trainierten. Ein Sprung verlängert die Liste
 * daher nicht (früher: immer drei Wochen mehr als die höchste).
 */
export function weekOptions(program: Program, sessions: Session[], current: number): WeekOption[] {
  const logged = sessions.reduce((m, s) => (s.programId === program.id ? Math.max(m, s.week) : m), -1)
  const len = cycleLength(program)
  const count = len > 0
    ? (Math.floor(Math.max(logged, current, 0) / len) + 1) * len
    : Math.max(logged + 1, current) + 1
  return Array.from({ length: count }, (_, week) => ({
    week, block: len > 0 ? Math.floor(week / len) : 0, label: weekLabel(program, week).replace(/ · Block \d+$/, ''),
  }))
}
