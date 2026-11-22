import type { Exercise, Program, Session, WeekState } from '../types'
import { noLoadStats, setVolume, volumeFactor } from './stats'
import { markSlot, unmarkSlot } from './weekCycle'
import { parse } from '../utils/dates'

/** Gleicher Zeitpunkt auf einem anderen lokalen Tag (Uhrzeit bleibt, auch über Zeitumstellungen hinweg). */
function onDate(ts: number, date: string): number {
  const t = new Date(ts)
  const d = parse(date)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.getHours(), t.getMinutes(), t.getSeconds(), t.getMilliseconds()).getTime()
}

/** Einheit auf ein anderes Datum legen: Start- und Endzeit wandern mit (Uhrzeit und Dauer bleiben). */
export function moveSessionToDate(s: Session, date: string): Session {
  if (s.date === date) return s
  return { ...s, date, finishedAt: onDate(s.finishedAt, date), ...(s.startedAt != null ? { startedAt: onDate(s.startedAt, date) } : {}) }
}

/** Startuhrzeit ändern (Datum bleibt); die Endzeit folgt, solange eine Dauer bekannt ist. */
export function setSessionStartTime(s: Session, hours: number, minutes: number): Session {
  const base = parse(s.date)
  const startedAt = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes).getTime()
  const span = s.durationSec != null ? s.durationSec * 1000 : Math.max(0, s.finishedAt - (s.startedAt ?? s.finishedAt))
  return { ...s, startedAt, finishedAt: startedAt + span }
}

/** Dauer in Sekunden ändern (`null` = unbekannt). Der Start bleibt, die Endzeit folgt (ohne Start: der Start folgt dem Ende). */
export function setSessionDuration(s: Session, sec: number | null): Session {
  if (sec == null) {
    const { durationSec: _drop, ...rest } = s
    return { ...rest, finishedAt: s.startedAt ?? s.finishedAt }
  }
  const startedAt = s.startedAt ?? s.finishedAt - sec * 1000
  return { ...s, startedAt, durationSec: sec, finishedAt: startedAt + sec * 1000 }
}

/** Zusammenfassung einer Einheit für die Verlaufsliste: Übungen, Arbeitssätze (ohne Aufwärmen/Segmente), Volumen in kg. */
export function sessionSummary(s: Session, lookup: (id: string) => Exercise | undefined): { exercises: number; sets: number; volumeKg: number } {
  let sets = 0
  let volumeKg = 0
  for (const e of s.exercises) {
    const ex = lookup(e.exerciseId)
    const work = e.sets.filter((x) => !x.warmup)
    sets += work.filter((x) => !x.segment).length
    if (ex && !ex.cardio && !noLoadStats(ex)) volumeKg += work.reduce((a, x) => a + setVolume(x, volumeFactor(ex)), 0)
  }
  return { exercises: s.exercises.length, sets, volumeKg }
}

/** Slot (Index in `weekSlots`), den die Einheit im Wochenplan belegt hat; null bei fremden/importierten Einheiten. */
export function slotOfSession(program: Pick<Program, 'weekSlots'>, s: Pick<Session, 'dayIndex'>): number | null {
  const i = program.weekSlots.findIndex((slot) => slot === s.dayIndex)
  return i === -1 ? null : i
}

/**
 * Betrifft die Einheit den laufenden Wochenstand? Nur Einheiten des aktiven Programms in der aktuellen Woche
 * (frühere Wochen sind abgeschlossen, andere Programme haben keinen eigenen Wochenstand).
 */
function inCurrentWeek(state: WeekState, program: Program | undefined, s: Session): program is Program {
  return !!program && program.active && s.programId === program.id && s.week === state.week
}

/** Kann das Löschen der Einheit ihren Slot wieder freigeben (Slot der aktuellen Woche ist erledigt, nicht übersprungen)? */
export function canFreeSlot(state: WeekState, program: Program | undefined, s: Session): boolean {
  if (!inCurrentWeek(state, program, s)) return false
  const slot = slotOfSession(program, s)
  return slot !== null && !!state.done[slot] && !state.skipped?.[slot]
}

/** Tage der Woche, an denen noch eine Einheit des Programms liegt (die markierten Tage im Wochenstand). */
function weekDates(program: Program, state: WeekState, remaining: Session[]): string[] {
  const dates: string[] = []
  for (const s of remaining) if (s.programId === program.id && s.week === state.week && !dates.includes(s.date)) dates.push(s.date)
  return dates
}

/**
 * Wochenstand nach dem Löschen einer Einheit. `freeSlot`: Slot wieder öffnen (der Tag kann neu trainiert werden),
 * sonst bleibt er erledigt. Verbleibende Einheiten (ohne die gelöschte) bestimmen die markierten Tage.
 */
export function weekStateAfterDelete(state: WeekState, program: Program | undefined, removed: Session, remaining: Session[], freeSlot: boolean): WeekState {
  if (!freeSlot || !canFreeSlot(state, program, removed) || !program) return state
  const slot = slotOfSession(program, removed) as number
  const next = unmarkSlot(state, slot)
  return { ...next, markedDates: state.markedDates.filter((d) => d !== removed.date || weekDates(program, state, remaining).includes(d)) }
}

/** Wochenstand nach einer Datumsänderung: der markierte Tag wandert mit (nur Einheiten der aktuellen Woche). */
export function weekStateAfterMove(state: WeekState, program: Program | undefined, before: Session, after: Session, others: Session[]): WeekState {
  if (before.date === after.date || !inCurrentWeek(state, program, before) || !state.markedDates.includes(before.date)) return state
  const stays = weekDates(program, state, others).includes(before.date)
  const dates = stays ? state.markedDates : state.markedDates.filter((d) => d !== before.date)
  return { ...state, markedDates: dates.includes(after.date) ? dates : [...dates, after.date] }
}

/**
 * Wochenstand nach dem Ändern der Programmwoche einer Einheit (`after.week !== before.week`, gleiche Einheit, `others` ohne sie).
 * Verlässt sie die aktuelle Woche: Slot wieder frei, Tag demarkiert. Kommt sie in die aktuelle Woche: Slot erledigt
 * (wie beim Loggen, die Woche kann dabei abschließen). Sonst unverändert (frühere Wochen haben keinen Wochenstand).
 */
export function weekStateAfterWeekChange(state: WeekState, program: Program | undefined, before: Session, after: Session, others: Session[]): WeekState {
  if (before.week === after.week || !program) return state
  const wasIn = inCurrentWeek(state, program, before)
  const nowIn = inCurrentWeek(state, program, after)
  if (wasIn && !nowIn) return weekStateAfterDelete(state, program, before, others, true)
  if (nowIn && !wasIn) {
    const slot = slotOfSession(program, after)
    return slot === null || state.done[slot] ? state : markSlot(state, slot, after.date)
  }
  return state
}

/** Startuhrzeit (`hh:mm`) für das Eingabefeld, ohne Start aus der Endzeit. */
export function sessionTime(s: Session): string {
  const t = new Date(s.startedAt ?? s.finishedAt)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(t.getHours())}:${p(t.getMinutes())}`
}
