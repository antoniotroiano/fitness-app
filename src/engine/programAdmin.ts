import type { PlannedExercise, Program, ProgramConfig, WeekState } from '../types'
import { BLOCK_WEEK_OPTIONS, blockLength } from './periodization'
import { normalizeSupersets } from './superset'

/**
 * Programm verwalten (PLAN-6 B4): Einstellungen ändern, duplizieren, archivieren, Programm-Ende, Übung auf einen
 * anderen Tag verschieben. Reine Funktionen, Speichern übernimmt `db.ts`.
 */

export interface ProgramSettings {
  name: string
  icon: string
  color: string
  /** Nur Programme mit Periodisierung (`config`) */
  blockWeeks?: number
  deload?: boolean
  deloadFirst?: boolean
  /** Anzahl Blöcke bis zum Ende, undefined = endlos */
  blocks?: number
}

export const MAX_BLOCKS = 12

export function settingsOf(p: Program): ProgramSettings {
  const c = p.config
  return {
    name: p.name, icon: p.icon, color: p.color,
    ...(c ? { blockWeeks: c.blockWeeks, deload: c.deload, deloadFirst: c.deloadFirst, blocks: c.blocks } : {}),
  }
}

/** Programm mit geänderten Einstellungen (Name leer/zu lang → alter Name). Ohne `config` bleiben die Blockfelder unberührt. */
export function applySettings(p: Program, s: ProgramSettings): Program {
  const name = s.name.trim().slice(0, 40) || p.name
  const next: Program = { ...p, name, icon: s.icon, color: s.color }
  if (p.config) {
    const config: ProgramConfig = { ...p.config, name, icon: s.icon, color: s.color }
    if (s.blockWeeks !== undefined && (BLOCK_WEEK_OPTIONS as readonly number[]).includes(s.blockWeeks)) config.blockWeeks = s.blockWeeks
    if (s.deload !== undefined) config.deload = s.deload
    if (s.deloadFirst !== undefined) config.deloadFirst = s.deloadFirst
    if (s.blocks === undefined) delete config.blocks
    else config.blocks = Math.min(MAX_BLOCKS, Math.max(1, Math.round(s.blocks)))
    next.config = config
  }
  return next
}

/** Eindeutiger Name für eine Kopie: „Name (Kopie)“, „Name (Kopie 2)“ … */
export function copyName(name: string, existing: string[]): string {
  const base = name.replace(/ \(Kopie(?: \d+)?\)$/, '')
  const taken = new Set(existing.map((n) => n.toLowerCase()))
  let candidate = `${base} (Kopie)`
  for (let n = 2; taken.has(candidate.toLowerCase()); n++) candidate = `${base} (Kopie ${n})`
  return candidate.slice(0, 60)
}

/** Tiefe Kopie ohne ID, inaktiv, nicht archiviert; Tage bekommen neue IDs. */
export function duplicateProgram(p: Program, existingNames: string[], newId: () => string): Omit<Program, 'id' | 'createdAt' | 'active'> {
  const name = copyName(p.name, existingNames)
  const copy = structuredClone(p) as Program
  const { id: _id, createdAt: _c, active: _a, archived: _r, ...rest } = copy
  return {
    ...rest, name,
    days: rest.days.map((d) => ({ ...d, id: newId() })),
    config: rest.config ? { ...rest.config, name } : null,
  }
}

/** Programm-Ende erreicht: Blockanzahl gesetzt und alle Blöcke durchlaufen (`week` = aktuelle Programmwoche, 0-basiert). */
export function programEnded(p: Pick<Program, 'config'>, week: number): boolean {
  const c = p.config
  if (!c?.blocks) return false
  const len = blockLength(c)
  return len > 0 && week >= c.blocks * len
}

/** „Block wiederholen“: einen weiteren Block anhängen, die Wochen laufen mit Progression weiter. */
export function extendProgram(p: Program, blocksMore = 1): Program {
  if (!p.config?.blocks) return p
  return { ...p, config: { ...p.config, blocks: Math.min(MAX_BLOCKS, p.config.blocks + blocksMore) } }
}

/**
 * Übung `exerciseId` von Tag `from` an Position `index` von Tag `to` setzen (`index` zählt in der Liste des Zieltags
 * ohne die verschobene Übung, ohne Angabe oder zu groß: ans Ende). Gleicher Tag = Reihenfolge ändern. Supersätze
 * beider Tage werden neu normalisiert, der Supersatz der Übung ist gelöst. Unmöglich (unbekannte Übung, letzte Übung
 * eines Tags, schon im Zieltag) oder keine Änderung: gleiche Liste.
 */
export function moveExercise(days: Program['days'], from: number, to: number, exerciseId: string, index = Infinity): Program['days'] {
  if (!days[from] || !days[to]) return days
  const entry = days[from].exercises.find((e) => e.exerciseId === exerciseId)
  if (!entry) return days
  if (from !== to && (days[from].exercises.length < 2 || days[to].exercises.some((e) => e.exerciseId === exerciseId))) return days
  const rest = days[to].exercises.filter((e) => e.exerciseId !== exerciseId)
  const at = Math.min(rest.length, Math.max(0, Number.isFinite(index) ? Math.floor(index) : rest.length))
  const moved: PlannedExercise = { ...entry }
  delete moved.superset
  const inserted = [...rest.slice(0, at), moved, ...rest.slice(at)]
  if (from === to && inserted.every((e, i) => e.exerciseId === days[from].exercises[i].exerciseId)) return days
  return days.map((d, i) => {
    if (i === to) return { ...d, exercises: normalizeSupersets(inserted) }
    if (i === from) return { ...d, exercises: normalizeSupersets(d.exercises.filter((e) => e.exerciseId !== exerciseId)) }
    return d
  })
}

/** Element in einer Liste von `from` nach `to` setzen (Indizes werden begrenzt); keine Änderung: gleiche Liste. */
function moved<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return list
  const at = Math.min(list.length - 1, Math.max(0, to))
  if (at === from) return list
  const out = [...list]
  const [x] = out.splice(from, 1)
  out.splice(at, 0, x)
  return out
}

/** Reihenfolge der Wochenslots (Workouts und Ruhetage): Slot `from` an Position `to`. Keine Änderung: gleiche Liste. */
export function moveSlot(slots: Program['weekSlots'], from: number, to: number): Program['weekSlots'] {
  return moved(slots, from, to)
}

/** Wochenstand passend zu `moveSlot`: Erledigt-/Übersprungen-Markierung wandert mit ihrem Slot. */
export function moveWeekSlot(state: WeekState, from: number, to: number): WeekState {
  const done = moved(state.done, from, to)
  const skipped = state.skipped ? moved(state.skipped, from, to) : undefined
  if (done === state.done && skipped === state.skipped) return state
  return { ...state, done, ...(skipped ? { skipped } : {}) }
}

/** Workout (Tag) umbenennen; leerer Name oder gleicher Name: unverändert (gleiche Liste). */
export function renameDay(days: Program['days'], i: number, name: string): Program['days'] {
  const n = name.trim()
  if (!days[i] || !n || n === days[i].name) return days
  return days.map((d, k) => (k === i ? { ...d, name: n } : d))
}

/**
 * Workout (Tag) duplizieren: tiefe Kopie ans Ende der Liste („… (Kopie n)“, neue ID), noch nicht im Wochenplan.
 * Der Supersatz-Zusammenhang bleibt, Wochenziele werden mitkopiert. Unbekannter Tag: unverändert.
 */
export function duplicateDay(days: Program['days'], i: number): Program['days'] {
  const d = days[i]
  if (!d) return days
  let n = days.length
  while (days.some((x) => x.id === `day-${n}`)) n++
  const copy = { ...d, id: `day-${n}`, name: copyName(d.name, days.map((x) => x.name)), exercises: d.exercises.map((e) => ({ ...e, ...(e.weeks ? { weeks: { ...e.weeks } } : {}) })) }
  return [...days, copy]
}

/** Workout aus dem Wochenplan nehmen (Slot wird Ruhetag, das Workout bleibt als „nicht eingeplant“). Das letzte eingeplante Workout bleibt. */
export function unscheduleDay(slots: Program['weekSlots'], dayIdx: number): Program['weekSlots'] {
  if (!slots.includes(dayIdx) || slots.filter((s) => s !== 'rest').length < 2) return slots
  return slots.map((s) => (s === dayIdx ? 'rest' : s))
}

/** Nicht eingeplantes Workout in den ersten freien Ruhetag setzen; kein Ruhetag frei oder schon eingeplant: unverändert. */
export function scheduleDay(slots: Program['weekSlots'], dayIdx: number): Program['weekSlots'] {
  const rest = slots.indexOf('rest')
  if (slots.includes(dayIdx) || rest < 0) return slots
  return slots.map((s, k) => (k === rest ? dayIdx : s))
}

/** Importierten Tag ans Ende der Tage hängen (neue ID, noch ohne Wochenplatz). */
export function appendDay(days: Program['days'], day: Omit<Program['days'][number], 'id'>): Program['days'] {
  let n = days.length
  while (days.some((x) => x.id === `day-${n}`)) n++
  return [...days, { ...day, id: `day-${n}` }]
}
