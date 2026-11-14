import type { Program, WeekState } from '../types'

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
export function markSlot(state: WeekState, slot: number, date: string): WeekState {
  if (slot < 0 || slot >= state.done.length) return state
  const done = state.done.map((d, i) => (i === slot ? true : d))
  const markedDates = state.markedDates.includes(date) ? state.markedDates : [...state.markedDates, date]
  const next: WeekState = { ...state, done, markedDates }
  return isWeekComplete(next) ? emptyWeek(state.week + 1) : next
}

export function unmarkSlot(state: WeekState, slot: number): WeekState {
  return { ...state, done: state.done.map((d, i) => (i === slot ? false : d)) }
}
