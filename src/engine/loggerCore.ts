/**
 * Reine Logik des Loggers (aus `Logger.tsx` gezogen, damit testbar): Folgesatz-Anpassung nach einem abgehakten Satz
 * und Abschluss des Workouts (Sätze einsammeln, Einheit bauen, Wochenstand, hinzugefügte Übungen übernehmen).
 * Keine UI, keine DB: die Komponente führt die Ergebnisse nur aus.
 */
import type { Equipment, Exercise, LoggedExercise, LoggedSet, PlannedExercise, Session, Settings, WeekState, WeightScale, WorkoutDay } from '../types'
import type { Row } from '../features/workouts/state'
import { num, rowToSet, sideSet } from '../features/workouts/sessionRows'
import { displayToKg, kgToDisplay } from '../utils/units'
import { isRepless } from './metric'
import { weakerSide } from './sides'
import { adaptNextSets, type RepRange } from './progression'
import { withLinks, linksOf } from './superset'
import { markSlot } from './weekCycle'
import { elapsedMs, type ClockState } from './workoutClock'

export interface AdaptContext {
  ex: Pick<Exercise, 'cardio' | 'assisted' | 'metric' | 'equipment'>
  wl: Settings['weightUnit']
  range: RepRange
  scale?: WeightScale
  bodyLoad: number
}

/**
 * Nach einem abgehakten Arbeitssatz: Gewicht und Wdh. der noch offenen, nicht von Hand geänderten Folgesätze
 * neu berechnen (Ermüdung je Satz Abstand eingerechnet). Lief der Satz wie geplant, bleibt alles unverändert.
 * Ohne Verlauf (kein Planungsgewicht) kalibriert der erste Satz. Assistierte, Zeit- und Cardioübungen nicht.
 */
export function adaptFollowingRows(rs: Row[], doneRow: Row, c: AdaptContext): Row[] {
  const { ex, wl } = c
  if (doneRow.type !== 'work' || ex.cardio || ex.assisted || isRepless(ex.metric) || doneRow.rir === '' || doneRow.planReps === undefined) return rs
  const idx = rs.findIndex((r) => r.id === doneRow.id)
  // Links/rechts getrennt: die schwächere Seite bestimmt die Folgesätze
  const src = doneRow.right && doneRow.right.rir !== ''
    && weakerSide(sideSet(doneRow, wl), sideSet(doneRow.right, wl), false, c.bodyLoad) === 'r' ? doneRow.right : doneRow
  const done = {
    weight: displayToKg(num(src.weight), wl), reps: num(src.reps), rir: num(src.rir),
    planWeight: doneRow.planKg, planReps: doneRow.planReps, planRir: doneRow.planRir ?? num(doneRow.rir),
  }
  // Alle folgenden Arbeitssätze zählen für den Abstand; angepasst werden nur offene, nicht von Hand geänderte
  const following = rs.map((r, i) => ({ r, i })).filter(({ r, i }) => i > idx && r.type === 'work')
  const open = following.filter(({ r }) => !r.done && !r.manual)
  if (!open.length) return rs
  const res = adaptNextSets(done, open.map(({ r }) => ({ planWeight: r.planKg ?? null, rir: r.rir === '' ? (r.planRir ?? 2) : num(r.rir) })),
    c.range, ex.equipment as Equipment, wl, c.scale, c.bodyLoad)
  const byId = new Map(open.map(({ r }, k) => [r.id, res[k]]))
  return rs.map((r) => {
    const next = byId.get(r.id)
    if (!next) return r
    // Neue Erwartung für diesen Satz: Vergleichsbasis, wenn er abgehakt wird
    const weight = String(kgToDisplay(next.weight, wl))
    const reps = String(next.reps)
    return { ...r, weight, reps, planKg: next.weight, planReps: next.reps, ...(r.right && !r.right.done ? { right: { ...r.right, weight, reps } } : {}) }
  })
}

export interface FinishView { exerciseId: string; ex: Pick<Exercise, 'cardio' | 'metric'>; bodyLoad: number }

/**
 * Gespeicherte Übungen aus den Zeilen: `completed` nimmt nur abgehakte Sätze, `all` jeden Satz mit Wert
 * (Cardio: Minuten, sonst Wdh.). Übungen ohne Satz entfallen.
 */
export function collectExercises(
  views: FinishView[], rows: Record<string, Row[]>, mode: 'completed' | 'all', units: { weight: Settings['weightUnit']; distance: Settings['distanceUnit'] },
): LoggedExercise[] {
  const out: LoggedExercise[] = []
  for (const v of views) {
    const take = (r: Row) => (mode === 'completed' ? r.done : v.ex.cardio ? num(r.minutes) > 0 : num(r.reps) > 0)
    const sets: LoggedSet[] = (rows[v.exerciseId] ?? []).filter(take).map((r) => rowToSet(r, v.ex, v.bodyLoad, units))
    if (sets.length) out.push({ exerciseId: v.exerciseId, sets })
  }
  return out
}

export interface FinishInput {
  exercises: LoggedExercise[]
  programId: number | null
  dayIndex: number
  /** yyyy-mm-dd */
  date: string
  week: number
  clock: ClockState
  now: number
  /** Nachtrag: Mittag des Datums (ms), Dauer unbekannt */
  noonMs: number | null
  notes?: Record<string, string>
}

/** Die zu speichernde Einheit: Nachtrag mit 12:00 Uhr ohne Dauer, sonst Start und aktive Dauer; Notizen nur trainierter Übungen. */
export function buildSession(i: FinishInput): Omit<Session, 'id'> {
  const notes = Object.fromEntries(Object.entries(i.notes ?? {}).filter(([id, t]) => t && i.exercises.some((e) => e.exerciseId === id)))
  return {
    programId: i.programId, dayIndex: i.dayIndex, date: i.date, finishedAt: i.noonMs ?? i.now, week: i.week, exercises: i.exercises,
    ...(i.noonMs === null ? { startedAt: i.clock.startedAt, durationSec: Math.floor(elapsedMs(i.clock, i.now) / 1000) } : { startedAt: i.noonMs }),
    ...(Object.keys(notes).length ? { notes } : {}),
  }
}

/**
 * Wochenstand nach dem Abschluss: der Slot gilt als erledigt, außer beim Nachtragen, bei Programmen aus der Bibliothek
 * oder wenn nichts gespeichert wird (`null` = unverändert).
 */
export function weekStateAfterFinish(week: WeekState, slotIdx: number | null, date: string, o: { saved: boolean; foreign: boolean; backfill: boolean }): WeekState | null {
  if (!o.saved || slotIdx === null || o.foreign || o.backfill) return null
  return markSlot(week, slotIdx, date)
}

/**
 * Im Workout hinzugefügte und trainierte Übungen dauerhaft in den Trainingstag übernehmen (`null` = nichts zu tun).
 * Nicht trainierte hinzugefügte Übungen fehlen: Supersätze neu zusammensetzen (nur Benachbarte bleiben verbunden).
 */
export function daysWithKept(days: WorkoutDay[], dayIdx: number, added: PlannedExercise[] | undefined, exercises: LoggedExercise[]): WorkoutDay[] | null {
  const keep = (added ?? []).filter((pe) => exercises.some((e) => e.exerciseId === pe.exerciseId))
  if (!keep.length) return null
  return days.map((d, i) => {
    if (i !== dayIdx) return d
    const list = [...d.exercises, ...keep.filter((pe) => !d.exercises.some((e) => e.exerciseId === pe.exerciseId))]
    return { ...d, exercises: withLinks(list, linksOf(list)) }
  })
}
