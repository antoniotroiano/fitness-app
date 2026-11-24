import type { Exercise, PlannedExercise, Program, Session, WorkoutDay } from '../types'
import { migrateExercise, migrateProgram } from '../data/muscleMigration'
import { t } from '../i18n'

/**
 * Exporte: Einheiten als CSV (eine Zeile pro Satz, gleiche Spalten wie der Trainingsimport, damit der Rundlauf klappt)
 * und ein einzelnes Programm als JSON (inklusive der verwendeten eigenen Übungen). Reine Funktionen ohne DB.
 */

export interface SessionFilter {
  /** yyyy-mm-dd, einschließlich */
  from?: string
  to?: string
  /** nur diese Übungen (Einheiten ohne sie entfallen) */
  exerciseIds?: string[]
}

/** Einheiten nach Zeitraum und Übungen filtern; ohne Filter die gleiche Liste. */
export function filterSessions(sessions: Session[], f: SessionFilter = {}): Session[] {
  const ids = f.exerciseIds?.length ? new Set(f.exerciseIds) : null
  if (!f.from && !f.to && !ids) return sessions
  const out: Session[] = []
  for (const s of sessions) {
    if ((f.from && s.date < f.from) || (f.to && s.date > f.to)) continue
    if (!ids) { out.push(s); continue }
    const exercises = s.exercises.filter((e) => ids.has(e.exerciseId))
    if (exercises.length) out.push({ ...s, exercises })
  }
  return out
}

export const CSV_HEADER = ['Datum', 'Training', 'Übung', 'Satztyp', 'Gewicht (kg)', 'Wiederholungen', 'RIR', 'Trainingsdauer', 'Dauer', 'Distanz (km)']

const cell = (v: string | number | undefined) => {
  const s = v === undefined ? '' : String(v)
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const round = (n: number) => String(Math.round(n * 1000) / 1000)

/**
 * Sätze aller Einheiten, älteste zuerst. Gespeichert wird metrisch (kg, km), Dezimalpunkt, Trenner Komma.
 * Cardio: Dauer in Sekunden und Distanz in km. Zeit-/Distanzübungen stehen wie intern in „Wiederholungen“.
 * Drop-/Myo-Segmente erscheinen als Arbeitssatz (der Import kennt keine Segmente).
 */
export function sessionsToCsv(
  sessions: Session[], programs: Pick<Program, 'id' | 'days'>[], lookup: (id: string) => Exercise | undefined, filter?: SessionFilter,
): string {
  const rows: string[] = [CSV_HEADER.join(',')]
  const sorted = [...filterSessions(sessions, filter)].sort((a, b) => a.date.localeCompare(b.date) || (a.startedAt ?? a.finishedAt) - (b.startedAt ?? b.finishedAt))
  for (const s of sorted) {
    const workout = s.programId === null ? '' : programs.find((p) => p.id === s.programId)?.days[s.dayIndex]?.name ?? ''
    for (const e of s.exercises) {
      const name = lookup(e.exerciseId)?.name ?? e.exerciseId
      for (const set of e.sets) {
        const type = set.warmup ? 'Aufwärmen' : set.failure ? 'Versagen' : 'Arbeitssatz'
        const cardio = set.minutes !== undefined || set.km !== undefined
        rows.push([
          s.date, workout, name, type,
          cardio ? '' : round(set.weight), cardio ? '' : set.reps,
          set.rir ?? (set.failure ? 0 : ''),
          s.durationSec !== undefined ? Math.round(s.durationSec) : '',
          cardio && set.minutes ? round(set.minutes * 60) : '',
          cardio && set.km ? round(set.km) : '',
        ].map(cell).join(','))
      }
    }
  }
  return rows.join('\n') + '\n'
}

export interface ProgramFile {
  app: 'liftlab'
  kind: 'program'
  version: 1
  exportedAt: string
  program: Omit<Program, 'id' | 'createdAt' | 'active' | 'archived'>
  customExercises: Exercise[]
}

/** Programm als Datei: ohne ID/Aktiv/Archiv, mit den im Programm verwendeten eigenen Übungen. */
export function programToFile(program: Program, customExercises: Exercise[], now = new Date()): ProgramFile {
  const { id: _i, createdAt: _c, active: _a, archived: _r, ...rest } = structuredClone(program)
  const used = new Set(rest.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)))
  return {
    app: 'liftlab', kind: 'program', version: 1, exportedAt: now.toISOString(),
    program: rest, customExercises: structuredClone(customExercises.filter((c) => used.has(c.id))),
  }
}

export interface ProgramImport {
  program: Omit<Program, 'id'>
  /** Eigene Übungen der Datei, die hier noch fehlen (gleiche ID vorhanden = bleibt unverändert) */
  newExercises: Exercise[]
  /** IDs, die schon existieren und nicht überschrieben werden */
  keptExercises: string[]
}

export const uniqueName = (name: string, taken: string[]) => {
  const t = new Set(taken.map((n) => n.toLowerCase()))
  let c = name
  for (let n = 2; t.has(c.toLowerCase()); n++) c = `${name.slice(0, 54)} (${n})`
  return c
}

/**
 * Datei prüfen und als neues, inaktives Programm vorbereiten (neue Tag-IDs, eindeutiger Name).
 * Wirft einen verständlichen Fehler bei fremden oder kaputten Dateien.
 */
export function parseProgramFile(
  json: string, existingNames: string[], existingExerciseIds: Set<string>, newId: () => string, now = Date.now(),
): ProgramImport {
  let data: Partial<ProgramFile> | null
  try { data = JSON.parse(json) } catch { throw new Error(t('Die Datei ist kein gültiges JSON.')) }
  if (data?.app !== 'liftlab') throw new Error(t('Keine TRAINRATE-Datei.'))
  if ((data as { kind?: string }).kind === 'workout') throw new Error(t('Das ist ein Workout-Export: importiere ihn im Menü (⋯) eines Programms über „Workout importieren“.'))
  if (data.kind !== 'program') throw new Error(t('Das ist kein Programm-Export (Backups über „Backup importieren“).'))
  const p = data.program
  if (!p || !Array.isArray(p.days) || p.days.length === 0 || !Array.isArray(p.weekSlots)) throw new Error(t('Das Programm in der Datei ist unvollständig.'))
  const migrated = migrateProgram({ ...p, id: undefined, createdAt: 0, active: false } as Program)
  const name = uniqueName(String(p.name || t('Programm')).slice(0, 60), existingNames)
  const program: Omit<Program, 'id'> = {
    ...migrated, name, active: false, archived: false, createdAt: now,
    days: migrated.days.map((d) => ({ ...d, id: newId() })),
    config: migrated.config ? { ...migrated.config, name } : null,
  }
  delete (program as { id?: number }).id
  const custom = (data.customExercises ?? []).filter((e) => e && typeof e.id === 'string').map(migrateExercise)
  return {
    program,
    newExercises: custom.filter((e) => !existingExerciseIds.has(e.id)),
    keptExercises: custom.filter((e) => existingExerciseIds.has(e.id)).map((e) => e.id),
  }
}

export interface WorkoutFile {
  app: 'liftlab'
  kind: 'workout'
  version: 1
  exportedAt: string
  workout: { name: string; exercises: PlannedExercise[] }
  customExercises: Exercise[]
}

/** Einzelnes Workout (Tag) als Datei: Name, Übungen mit Zielen/Wochenzielen/Supersätzen und die verwendeten eigenen Übungen. */
export function workoutToFile(day: WorkoutDay, customExercises: Exercise[], now = new Date()): WorkoutFile {
  const { id: _i, ...rest } = structuredClone(day)
  const used = new Set(rest.exercises.map((e) => e.exerciseId))
  return {
    app: 'liftlab', kind: 'workout', version: 1, exportedAt: now.toISOString(),
    workout: rest, customExercises: structuredClone(customExercises.filter((c) => used.has(c.id))),
  }
}

export interface WorkoutImport {
  /** Neuer Tag (ohne Wochenplatz), Name eindeutig im Programm */
  day: Omit<WorkoutDay, 'id'>
  newExercises: Exercise[]
  keptExercises: string[]
}

/** Workout-Datei prüfen; Name wird im Zielprogramm eindeutig. Wirft einen verständlichen Fehler bei fremden oder kaputten Dateien. */
export function parseWorkoutFile(json: string, existingDayNames: string[], existingExerciseIds: Set<string>): WorkoutImport {
  let data: Partial<WorkoutFile> | null
  try { data = JSON.parse(json) } catch { throw new Error(t('Die Datei ist kein gültiges JSON.')) }
  if (data?.app !== 'liftlab') throw new Error(t('Keine TRAINRATE-Datei.'))
  if ((data as { kind?: string }).kind === 'program') throw new Error(t('Das ist ein Programm-Export (Mehr › Daten › Programm importieren).'))
  if (data.kind !== 'workout') throw new Error(t('Das ist kein Workout-Export.'))
  const w = data.workout
  if (!w || !Array.isArray(w.exercises) || w.exercises.length === 0
    || w.exercises.some((e) => !e || typeof e.exerciseId !== 'string' || !(e.sets > 0) || !(e.repMin > 0) || !(e.repMax >= e.repMin))) {
    throw new Error(t('Das Workout in der Datei ist unvollständig.'))
  }
  const migrated = migrateProgram({ name: '', icon: '', color: '', config: null, days: [{ id: 'x', name: String(w.name || 'Workout'), exercises: w.exercises }], weekSlots: [0], createdAt: 0, active: false } as Program)
  const day = migrated.days[0]
  const custom = (data.customExercises ?? []).filter((e) => e && typeof e.id === 'string').map(migrateExercise)
  return {
    day: { name: uniqueName(String(w.name || 'Workout').slice(0, 40), existingDayNames), exercises: day.exercises },
    newExercises: custom.filter((e) => !existingExerciseIds.has(e.id)),
    keptExercises: custom.filter((e) => existingExerciseIds.has(e.id)).map((e) => e.id),
  }
}
