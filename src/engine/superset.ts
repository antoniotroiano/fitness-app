import type { PlannedExercise } from '../types'

/**
 * Supersätze: benachbarte Übungen eines Trainingstags mit gleicher `superset`-ID. Gespeichert als ID je Übung,
 * gerechnet über „mit der nächsten verbunden“ (links). Die ID ist immer die Übungs-ID des ersten Mitglieds,
 * eine einzelne Übung hat keine ID. So bleibt die Darstellung eindeutig, egal wie verbunden oder gelöst wurde.
 */

/** links[i]: Übung i ist mit Übung i+1 verbunden */
export const linksOf = (list: PlannedExercise[]): boolean[] =>
  list.map((e, i) => !!e.superset && e.superset === list[i + 1]?.superset)

/** Übungen mit IDs aus den Verbindungen (zusammenhängende Läufe ≥ 2, ID = erste Übungs-ID) */
export function withLinks(list: PlannedExercise[], links: boolean[]): PlannedExercise[] {
  const out: PlannedExercise[] = []
  let runStart = 0
  for (let i = 0; i < list.length; i++) {
    if (i > 0 && !links[i - 1]) runStart = i
    const inRun = (i > runStart) || !!links[i]
    const e: PlannedExercise = { ...list[i] }
    delete e.superset
    out.push(inRun ? { ...e, superset: list[runStart].exerciseId } : e)
  }
  return out
}

/** Übung `index` mit der vorherigen/nächsten verbinden oder aus dem Supersatz lösen */
export function setSupersetLink(list: PlannedExercise[], index: number, action: 'prev' | 'next' | 'none'): PlannedExercise[] {
  const links = linksOf(list)
  if (action === 'prev' && index > 0) links[index - 1] = true
  else if (action === 'next' && index < list.length - 1) links[index] = true
  else if (action === 'none') {
    if (index > 0) links[index - 1] = false
    links[index] = false
  }
  return withLinks(list, links)
}

/** Verbindung zwischen Übung `index` und `index + 1` umschalten (Programm-Erstellung) */
export function toggleSupersetLink(list: PlannedExercise[], index: number): PlannedExercise[] {
  const links = linksOf(list)
  if (index < 0 || index >= list.length - 1) return list
  links[index] = !links[index]
  return withLinks(list, links)
}

/** Nach Entfernen/Hinzufügen: Supersätze neu zusammensetzen (nur benachbarte gleiche IDs bleiben verbunden) */
export const normalizeSupersets = (list: PlannedExercise[]): PlannedExercise[] => withLinks(list, linksOf(list))

/** Übungs-IDs des Supersatzes, zu dem `exerciseId` gehört (in Reihenfolge); leer, wenn kein Supersatz */
export function supersetMembers(list: PlannedExercise[], exerciseId: string): string[] {
  const me = list.find((e) => e.exerciseId === exerciseId)
  if (!me?.superset) return []
  const members = list.filter((e) => e.superset === me.superset).map((e) => e.exerciseId)
  return members.length >= 2 ? members : []
}

/**
 * Nach einem abgeschlossenen Arbeitssatz im Supersatz: weiter zur nächsten Übung der Runde, die noch offene
 * Sätze hat (ohne Pause). War es die letzte der Runde, Pause und zurück zur ersten offenen Übung.
 * `next` null: im Supersatz ist nichts mehr offen.
 */
export function nextInSuperset(members: string[], current: string, hasOpen: (id: string) => boolean): { next: string | null; rest: boolean } {
  const i = members.indexOf(current)
  if (i < 0) return { next: null, rest: true }
  const later = members.slice(i + 1).find(hasOpen)
  if (later) return { next: later, rest: false }
  const first = members.find(hasOpen)
  return { next: first ?? null, rest: true }
}
