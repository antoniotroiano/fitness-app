import type { Exercise, PlannedExercise, ProgramConfig } from '../types'
import { swapPlanned } from './swap'
import { normalizeSupersets } from './superset'

/**
 * Änderungen an der Übungsliste eines Trainingstags (Logger: tauschen, entfernen). Reine Funktionen: Sie liefern
 * die neue Liste, ob sie nur für heute oder dauerhaft im Programm gilt, entscheidet der Aufrufer.
 */

/** Neuer Plan-Eintrag für den Tausch von `fromId` gegen `to` (Sätze/Bereich über `swapPlanned`, Supersatz-Zugehörigkeit bleibt). */
export function swapEntry(
  list: PlannedExercise[], fromId: string, to: Exercise, lookup: (id: string) => Exercise | undefined,
  config?: Pick<ProgramConfig, 'goal'>,
): PlannedExercise | undefined {
  const i = list.findIndex((e) => e.exerciseId === fromId)
  if (i < 0 || fromId === to.id) return undefined
  const others = list.filter((_, j) => j !== i).map((e) => lookup(e.exerciseId)).filter((x): x is Exercise => !!x)
  return swapPlanned(list[i], lookup(fromId), to, config ?? { goal: 'both' }, others)
}

/** Eintrag von `fromId` durch `entry` ersetzen (gleiche Stelle), Supersätze neu zusammensetzen. Fehlt `fromId`: unverändert. */
export function replaceInDay(list: PlannedExercise[], fromId: string, entry: PlannedExercise): PlannedExercise[] {
  if (!list.some((e) => e.exerciseId === fromId)) return list
  return normalizeSupersets(list.map((e) => (e.exerciseId === fromId ? entry : e)))
}

/** Übung `fromId` durch `to` ersetzen. Unbekannte oder gleiche Übung: unverändert (gleiche Liste). */
export function swapInDay(
  list: PlannedExercise[], fromId: string, to: Exercise, lookup: (id: string) => Exercise | undefined,
  config?: Pick<ProgramConfig, 'goal'>,
): PlannedExercise[] {
  const entry = swapEntry(list, fromId, to, lookup, config)
  return entry ? replaceInDay(list, fromId, entry) : list
}

/** Übung entfernen, Supersätze neu zusammensetzen. Ob die letzte Übung bleiben muss, entscheidet der Aufrufer. */
export function removeFromDay(list: PlannedExercise[], id: string): PlannedExercise[] {
  return list.some((e) => e.exerciseId === id) ? normalizeSupersets(list.filter((e) => e.exerciseId !== id)) : list
}
