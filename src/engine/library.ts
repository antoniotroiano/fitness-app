import type { Exercise } from '../types'

export type LibraryGroup = 'free' | 'machines' | 'bodyweight' | 'cardio'

/** Gruppen der Übungsübersicht in fester Reihenfolge (Cardio zuletzt). */
export const LIBRARY_GROUPS: { id: LibraryGroup; label: string }[] = [
  { id: 'free', label: 'Free Weights' },
  { id: 'machines', label: 'Machines' },
  { id: 'bodyweight', label: 'Bodyweight & Personal' },
  { id: 'cardio', label: 'Cardio' },
]

/** Free Weights: Langhantel, Kurzhantel, Kettlebell. Machines: Maschine, Kabel, Smith. Rest: Körpergewicht, Band, eigene Übungen. */
export function libraryGroup(ex: Exercise): LibraryGroup {
  if (ex.cardio) return 'cardio'
  if (ex.custom) return 'bodyweight'
  if (ex.equipment === 'barbell' || ex.equipment === 'dumbbell' || ex.equipment === 'kettlebell') return 'free'
  if (ex.equipment === 'machine' || ex.equipment === 'cable' || ex.equipment === 'smith') return 'machines'
  return 'bodyweight'
}

export const GROUP_PREVIEW = 5

/** Übungen nach Gruppen, je alphabetisch; leere Gruppen entfallen. */
export function groupExercises(list: Exercise[]): { id: LibraryGroup; label: string; items: Exercise[] }[] {
  return LIBRARY_GROUPS
    .map((g) => ({ ...g, items: list.filter((e) => libraryGroup(e) === g.id).sort((a, b) => a.name.localeCompare(b.name, 'de')) }))
    .filter((g) => g.items.length > 0)
}
