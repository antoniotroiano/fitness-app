import type { Metric } from './metric'
import { isRepless } from './metric'
import { removeFromDay } from './dayEdit'
import type { Equipment, Exercise, MuscleId, Pattern, Program, Session } from '../types'

/**
 * Eigene Übungen (PLAN-6 B3): Entwurf aus dem Formular → gültige `Exercise`, Duplizieren, Verwendung prüfen.
 * Reine Funktionen, die DB-Zugriffe (anlegen/ändern/löschen) liegen in `db/db.ts`.
 */

/** Gerätearten im Formular; „Cardio“ legt eine Cardio-Übung an (Minuten und Distanz, keine Muskeln, wird nie geplant). */
export const CUSTOM_EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'cable', 'machine', 'smith', 'kettlebell', 'band', 'bodyweight', 'cardio']

export const PATTERN_LABEL: Record<Exclude<Pattern, 'cardio'>, string> = {
  horizontalPush: 'Drücken horizontal', verticalPush: 'Drücken vertikal', horizontalPull: 'Ziehen horizontal', verticalPull: 'Ziehen vertikal',
  squat: 'Kniebeuge', hinge: 'Hüftbeuge', lunge: 'Ausfallschritt', isolation: 'Isolation', core: 'Rumpf',
}
export const CUSTOM_PATTERNS = Object.keys(PATTERN_LABEL) as Exclude<Pattern, 'cardio'>[]

export const NAME_MAX = 60
export const DESCRIPTION_MAX = 1000

export interface ExerciseDraft {
  name: string
  equipment: Equipment
  pattern: Pattern
  primary: MuscleId[]
  secondary: MuscleId[]
  compound: boolean
  metric: Metric
  /** Nur Körpergewicht: Anteil 0–1 (leer/0 = kein Anteil) */
  bodyweight: number
  /** Nur Kurzhantel/Kettlebell */
  load: 'single' | 'perSide'
  unilateral: boolean
  assisted: boolean
  /** Beschreibung, eine Zeile = ein Schritt */
  description: string
  /** Verkleinertes Bild (Data-URL) oder leer */
  image: string
}

export const EMPTY_DRAFT: ExerciseDraft = {
  name: '', equipment: 'machine', pattern: 'isolation', primary: [], secondary: [], compound: false,
  metric: 'reps', bodyweight: 0, load: 'perSide', unilateral: false, assisted: false, description: '', image: '',
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ')
const sameName = (a: string, b: string) => norm(a).toLowerCase() === norm(b).toLowerCase()

/** Fehlertext oder null. `all` = alle vorhandenen Übungen (Standard + eigene), `editId` = die gerade bearbeitete Übung. */
export function validateDraft(d: ExerciseDraft, all: Pick<Exercise, 'id' | 'name'>[], editId?: string): string | null {
  const name = norm(d.name)
  if (!name) return 'Gib einen Namen ein.'
  if (name.length > NAME_MAX) return `Der Name darf höchstens ${NAME_MAX} Zeichen haben.`
  if (all.some((e) => e.id !== editId && sameName(e.name, name))) return 'Eine Übung mit diesem Namen gibt es schon.'
  if (d.description.length > DESCRIPTION_MAX) return `Die Beschreibung darf höchstens ${DESCRIPTION_MAX} Zeichen haben.`
  if (d.equipment !== 'cardio' && d.primary.length === 0) return 'Wähle mindestens einen Hauptmuskel.'
  if (d.equipment === 'bodyweight' && d.bodyweight !== 0 && !(d.bodyweight > 0 && d.bodyweight <= 1)) return 'Der Körpergewichtsanteil liegt zwischen 0 und 100 %.'
  return null
}

/** Neue, eindeutige ID `custom-<name>[-n]`. */
export function newCustomId(name: string, existingIds: string[]): string {
  const slug = norm(name).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'uebung'
  const base = `custom-${slug}`
  if (!existingIds.includes(base)) return base
  let n = 2
  while (existingIds.includes(`${base}-${n}`)) n++
  return `${base}-${n}`
}

/** Entwurf → Übung: nur sinnvolle Felder (Anteil nur bei Körpergewicht, Last nur bei Kurzhantel/Kettlebell), sekundäre ohne Doppelung. */
export function buildExercise(d: ExerciseDraft, id: string): Exercise {
  const description = d.description.split('\n').map((l) => l.trim()).filter(Boolean).join('\n')
  const extras = { ...(description ? { description } : {}), ...(d.image ? { image: d.image } : {}) }
  if (d.equipment === 'cardio') {
    return { id, name: norm(d.name), primary: [], secondary: [], equipment: 'cardio', pattern: 'cardio', compound: false, cardio: true, custom: true, ...extras }
  }
  const primary = [...new Set(d.primary)]
  const secondary = [...new Set(d.secondary)].filter((m) => !primary.includes(m))
  const repless = isRepless(d.metric)
  const bw = d.equipment === 'bodyweight'
  const dbKb = d.equipment === 'dumbbell' || d.equipment === 'kettlebell'
  return {
    id, name: norm(d.name), primary, secondary, equipment: d.equipment, pattern: d.pattern, compound: d.compound, custom: true,
    ...(repless ? { metric: d.metric } : {}),
    ...(bw && d.bodyweight > 0 ? { bodyweight: Math.round(d.bodyweight * 100) / 100 } : {}),
    ...(dbKb ? { load: d.load } : {}),
    ...(d.unilateral ? { unilateral: true } : {}),
    ...(d.assisted && !repless ? { assisted: true } : {}),
    ...extras,
  }
}

/** Übung → Entwurf (zum Bearbeiten). */
export function draftOf(ex: Exercise): ExerciseDraft {
  return {
    name: ex.name, equipment: ex.equipment, pattern: ex.pattern, primary: [...ex.primary], secondary: [...ex.secondary], compound: ex.compound,
    metric: ex.metric ?? 'reps', bodyweight: ex.bodyweight ?? 0, load: ex.load ?? 'perSide', unilateral: !!ex.unilateral, assisted: !!ex.assisted,
    description: ex.description ?? '', image: ex.image ?? '',
  }
}

/** Duplikat als Vorlage: gleicher Entwurf, Name „… (Kopie)“ (bzw. „(Kopie 2)“ …), eindeutig unter `all`. */
export function duplicateDraft(ex: Exercise, all: Pick<Exercise, 'name'>[]): ExerciseDraft {
  const base = `${ex.name.replace(/ \(Kopie(?: \d+)?\)$/, '')}`
  let name = `${base} (Kopie)`
  for (let n = 2; all.some((e) => sameName(e.name, name)); n++) name = `${base} (Kopie ${n})`
  return { ...draftOf(ex), name }
}

export interface ExerciseUsage {
  /** Einheiten, in denen die Übung geloggt wurde */
  sessions: number
  /** Namen der Programme, deren Trainingstage die Übung enthalten */
  programs: string[]
}

/** Entfernen der Übung aus den Trainingstagen eines Programms: neue Tage und Namen der Tage, die dadurch leer würden (bleiben unverändert). */
export function removeExerciseFromDays(days: Program['days'], id: string): { days: Program['days']; emptied: string[] } {
  const emptied: string[] = []
  const out = days.map((d) => {
    if (!d.exercises.some((e) => e.exerciseId === id)) return d
    if (d.exercises.length < 2) { emptied.push(d.name); return d }
    return { ...d, exercises: removeFromDay(d.exercises, id) }
  })
  return { days: emptied.length || out.every((d, i) => d === days[i]) ? days : out, emptied }
}

export function exerciseUsage(id: string, sessions: Pick<Session, 'exercises'>[], programs: Pick<Program, 'name' | 'days'>[]): ExerciseUsage {
  return {
    sessions: sessions.filter((s) => s.exercises.some((e) => e.exerciseId === id)).length,
    programs: programs.filter((p) => p.days.some((d) => d.exercises.some((e) => e.exerciseId === id))).map((p) => p.name),
  }
}

/** Löschen mit Entfernen aus den Programmen: nur ohne geloggte Einheiten (der Verlauf behielte sonst eine unbekannte Übung). */
export const canDeleteByRemoving = (u: ExerciseUsage) => u.sessions === 0

/** Löschen nur, wenn nichts darauf verweist (sonst verlören Verlauf und Pläne ihre Übung). */
export const canDeleteExercise = (u: ExerciseUsage) => u.sessions === 0 && u.programs.length === 0
