import type { Equipment, Exercise, ExerciseOverride, PlannedExercise, ProgramConfig } from '../types'
import { baseRepRange } from './periodization'
import { isRepless, METRIC_RANGE } from './metric'

/** Alternativen für dieselbe Hauptmuskelgruppe, bevorzugt gleiches Bewegungsmuster. */
export function alternatives(
  current: Exercise, all: Exercise[], excludeIds: string[] = [], equipment?: Equipment[],
): Exercise[] {
  const main = current.primary[0]
  return all
    .filter((e) => !e.cardio && e.id !== current.id && !excludeIds.includes(e.id))
    .filter((e) => e.primary.includes(main))
    .filter((e) => !equipment || equipment.includes(e.equipment))
    .sort((a, b) => score(b, current) - score(a, current))
}

function score(e: Exercise, cur: Exercise): number {
  return (e.pattern === cur.pattern ? 2 : 0) + (e.compound === cur.compound ? 1 : 0)
    + (e.primary[0] === cur.primary[0] ? 1 : 0)
}

/**
 * Geplante Werte nach einem Übungstausch. Bleibt die Art gleich (Verbund ↔ Verbund, Isolation ↔ Isolation,
 * Zeit ↔ Zeit), bleiben Sätze und Wdh.-Bereich (gleiche Rolle im Tag). Sonst bekommt die neue Übung den Bereich
 * ihrer Rolle wie im Generator: Isolation hohe Wdh., Verbund Hauptübung (höchstens zwei pro Tag) oder weitere Verbundübung.
 * `others`: die übrigen Übungen des Tages (ohne den getauschten Platz).
 */
export function swapPlanned(
  pe: PlannedExercise, from: Exercise | undefined, to: Exercise,
  config: Pick<ProgramConfig, 'goal'>, others: Exercise[],
): PlannedExercise {
  const time = (e?: Exercise) => isRepless(e?.metric)
  const same = !!from && from.compound === to.compound && (from.metric ?? 'reps') === (to.metric ?? 'reps')
  if (same) return { ...pe, exerciseId: to.id }
  let range
  if (time(to)) range = METRIC_RANGE[to.metric!]!
  else if (!to.compound) range = baseRepRange(config.goal, false, 'isolation')
  else {
    const mains = others.filter((e) => e.compound && !e.cardio && !time(e)).length
    range = baseRepRange(config.goal, true, mains < 2 ? 'main' : 'secondary')
  }
  const minSets = to.compound ? 3 : 2
  // Anderer Übungstyp: eigene Wochenziele (Wdh./Sätze der alten Übung) passen nicht mehr
  const rest: PlannedExercise = { ...pe }
  delete rest.weeks
  return { ...rest, exerciseId: to.id, repMin: range.min, repMax: range.max, sets: Math.max(pe.sets, minSets) }
}

/** Übungen, die empfohlen werden dürfen: ohne „Nie empfehlen“ (für Generator und Tauschvorschläge, nicht für die freie Auswahl). */
export function recommendable(all: Exercise[], overrides: Record<string, ExerciseOverride>): Exercise[] {
  return all.filter((e) => !overrides[e.id]?.neverRecommend)
}
