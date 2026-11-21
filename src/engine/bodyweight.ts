import type { Exercise, LoggedSet, Session, WeightEntry } from '../types'

/**
 * Körpergewichtsanteil: bei Übungen mit `Exercise.bodyweight` (Anteil 0–1) bewegt man einen Teil des eigenen
 * Körpers. Gespeichert wird weiterhin nur das Zusatzgewicht; für 1RM, Volumen und Progression zählt die
 * Gesamtlast = Anteil × Körpergewicht + Zusatzgewicht. Das Körpergewicht kommt aus dem Gewichtsverlauf
 * (letzter Eintrag bis zum Datum). Ohne Eintrag bleibt alles wie bisher (reine Wiederholungs-Progression).
 * Assistierte Übungen und Zeitübungen bleiben außen vor.
 */

type Weigh = Pick<WeightEntry, 'date' | 'kg'>

/** Körpergewicht am Datum: letzter Eintrag bis einschließlich `date`, sonst der früheste danach (Training vor der ersten Messung). */
export function bodyweightAt(weights: Weigh[], date: string): number | undefined {
  let before: Weigh | undefined
  let after: Weigh | undefined
  for (const w of weights) {
    if (!(w.kg > 0)) continue
    if (w.date <= date) { if (!before || w.date > before.date) before = w }
    else if (!after || w.date < after.date) after = w
  }
  return (before ?? after)?.kg
}

/** Übung, bei der der Körpergewichtsanteil in die Last eingeht. */
export const usesBodyweight = (ex?: Pick<Exercise, 'bodyweight' | 'assisted' | 'metric'>): boolean =>
  !!ex && (ex.bodyweight ?? 0) > 0 && !ex.assisted && ex.metric !== 'time'

/** Körperlast in kg (Anteil × Körpergewicht), 0 ohne Anteil oder ohne bekanntes Körpergewicht. */
export function bodyLoadOf(ex: Pick<Exercise, 'bodyweight' | 'assisted' | 'metric'> | undefined, bodyweight?: number): number {
  if (!usesBodyweight(ex) || !bodyweight || bodyweight <= 0) return 0
  return Math.round(ex!.bodyweight! * bodyweight * 10) / 10
}

/** Sätze mit Gesamtlast statt Zusatzgewicht (nur wenn `bodyLoad` > 0, Aufwärmsätze bleiben unverändert). */
export function withBodyLoad(sets: LoggedSet[], bodyLoad: number): LoggedSet[] {
  if (bodyLoad <= 0) return sets
  return sets.map((s) => (s.warmup || s.reps <= 0 ? s : { ...s, weight: s.weight + bodyLoad }))
}

/**
 * Sessions für Statistiken: Sätze von Körpergewichtsübungen tragen die Gesamtlast (Körpergewicht am Tag der Einheit).
 * Nur für Auswertungen verwenden, nie speichern und nie in die Progression geben (die rechnet selbst um).
 */
export function applyBodyweight(sessions: Session[], lookup: (id: string) => Exercise | undefined, weights: Weigh[]): Session[] {
  if (!weights.length) return sessions
  return sessions.map((s) => {
    let changed = false
    const exercises = s.exercises.map((e) => {
      const load = bodyLoadOf(lookup(e.exerciseId), bodyweightAt(weights, s.date))
      if (load <= 0) return e
      changed = true
      return { ...e, sets: withBodyLoad(e.sets, load) }
    })
    return changed ? { ...s, exercises } : s
  })
}
