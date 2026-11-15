import type { Exercise, MuscleId, Priority, Program } from '../types'

/**
 * Frühere Muskel-IDs (15 Gruppen) auf die heutigen 22 abbilden.
 * Für Daten, die der Nutzer gespeichert hat: eigene Übungen, Programm-Fokus, Backups.
 */
const LEGACY: Record<string, MuscleId[]> = {
  shoulders: ['frontDelts', 'sideDelts'],
  core: ['abs'],
}

const uniq = <T,>(a: T[]) => [...new Set(a)]

export function migrateMuscles(ids: string[] | undefined): MuscleId[] {
  return uniq((ids ?? []).flatMap((id) => LEGACY[id] ?? [id as MuscleId]))
}

export function migrateExercise(e: Exercise): Exercise {
  const primary = migrateMuscles(e.primary)
  return { ...e, primary, secondary: migrateMuscles(e.secondary).filter((m) => !primary.includes(m)) }
}

/** Fokus-Einstellungen: "Schultern" wird für alle drei Schulterteile übernommen. */
export function migrateFocus(focus: Partial<Record<string, Priority>> | undefined): Partial<Record<MuscleId, Priority>> {
  const out: Partial<Record<MuscleId, Priority>> = {}
  for (const [k, v] of Object.entries(focus ?? {})) {
    if (!v) continue
    const targets = k === 'shoulders' ? ['frontDelts', 'sideDelts', 'rearDelts'] : LEGACY[k] ?? [k]
    for (const t of targets) out[t as MuscleId] = v
  }
  return out
}

export function migrateProgram<T extends Pick<Program, 'config'>>(p: T): T {
  if (!p.config) return p
  return { ...p, config: { ...p.config, focus: migrateFocus(p.config.focus) } }
}
