import type { ClockState } from '../../engine/workoutClock'
import type { PlannedExercise } from '../../types'
import { weakerSide } from '../../engine/sides'

export interface Row {
  id: string
  /** Arbeitssatz, Aufwärmsatz oder Segment (Fortsetzung des Arbeitssatzes davor) eines Drop-/Myo-Satzes */
  type: 'warmup' | 'work' | 'drop' | 'myo'
  weight: string
  reps: string
  rir: string
  done: boolean
  minutes: string
  km: string
  /** Gewicht oder Wdh. von Hand geändert: wird von der RIR-Anpassung nicht überschrieben */
  manual?: boolean
  /** Geplantes Gewicht (kg), Wdh. und RIR dieses Arbeitssatzes: Grundlage der RIR-Anpassung (fehlt bei älteren Workouts) */
  planKg?: number | null
  planReps?: number
  planRir?: number
  /** Satz bis zum Versagen (geplant in der letzten Arbeitswoche oder als Satztyp gewählt): Wdh. sind das Minimum */
  failure?: boolean
  /** Teilwiederholungen zusätzlich zu den vollen */
  partial?: string
  /**
   * Links/rechts getrennt: die Felder oben sind die linke Seite, `right` die rechte. `done` = beide Seiten abgehakt,
   * `leftDone`/`right.done` je Seite. Nur bei Arbeitssätzen.
   */
  right?: SideRow
  leftDone?: boolean
}

/** Werte der rechten Seite eines Satzes im Logger */
export interface SideRow { weight: string; reps: string; rir: string; partial?: string; done: boolean }

/** Laufendes Workout, wird in der DB zwischengespeichert (übersteht Reload). */
export interface ActiveWorkout {
  /** Route-Parameter (s0, d2 …) */
  param: string
  programId: number | null
  clock: ClockState
  rows: Record<string, Row[]>
  current: string
  /** Notizen dieser Einheit je Übungs-ID */
  notes?: Record<string, string>
  /** Während des Workouts hinzugefügte Übungen: werden beim Abschluss dauerhaft in den Trainingstag übernommen */
  added?: PlannedExercise[]
  /** Vollständige Übungsliste nur für diese Einheit (Tausch/Entfernen mit „nur heute“); ersetzt Trainingstag + `added` */
  custom?: PlannedExercise[]
}

export const uid = () => Math.random().toString(36).slice(2, 10)

/** Arbeitssatz in linke/rechte Seite aufteilen (rechts übernimmt die Werte von links) bzw. wieder zusammenführen (schwächere Seite bleibt). */
export function withSides(r: Row, on: boolean): Row {
  if (on && r.type === 'work') {
    return r.right ? r : { ...r, leftDone: r.done, right: { weight: r.weight, reps: r.reps, rir: r.rir, partial: r.partial, done: r.done } }
  }
  if (!r.right && r.leftDone === undefined) return r
  // Zusammenführen: die schwächere Seite bleibt stehen (wie beim Speichern)
  const n = (v: string) => Number(v.replace(',', '.')) || 0
  const side = (v: SideRow | Row) => ({ weight: n(v.weight), reps: n(v.reps), rir: v.rir === '' ? undefined : n(v.rir) })
  const keepRight = !!r.right && weakerSide(side(r), side(r.right)) === 'r'
  const out = keepRight && r.right
    ? { ...r, weight: r.right.weight, reps: r.right.reps, rir: r.right.rir, partial: r.right.partial }
    : { ...r }
  delete out.right
  delete out.leftDone
  return out
}

export const isSegment = (r: Pick<Row, 'type'>) => r.type === 'drop' || r.type === 'myo'
