import type { Exercise, LoggedExercise, LoggedSet, Session } from '../types'
import { IMPORT_ALIASES } from '../data/importAliases'
import { parse } from '../utils/dates'

/**
 * Import eines Trainingsverlaufs aus einer CSV-Datei (eine Zeile pro Satz). Erwartete Spalten (deutsch oder englisch):
 * Datum, Training, Übung, Satztyp, Gewicht (kg), Wiederholungen, RIR, optional Trainingsdauer (s), Dauer (s),
 * Distanz (km/m). Alles bleibt lokal; die Funktionen sind rein (kein DB-Zugriff).
 */
export interface ImportRow {
  date: string
  workout: string
  exercise: string
  type: 'warmup' | 'work' | 'failure'
  weight: number
  reps: number
  rir?: number
  /** Cardio: Dauer in Sekunden und Distanz in km */
  seconds?: number
  km?: number
  /** Gesamtdauer der Einheit in Sekunden */
  sessionSec?: number
}

/** CSV-Zeilen parsen (Trenner `,` oder `;`, Anführungszeichen mit verdoppelten `""`). */
export function splitCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.slice(0, clean.indexOf('\n') >>> 0)
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === sep) { row.push(cell); cell = '' } else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((x) => x.trim() !== '')) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim() !== '')) rows.push(row)
  return rows
}

const COLUMNS = {
  date: ['datum', 'date'],
  workout: ['training', 'workout'],
  exercise: ['übung', 'exercise'],
  type: ['satztyp', 'set type'],
  weight: ['gewicht (kg)', 'weight (kg)', 'gewicht', 'weight'],
  reps: ['wiederholungen', 'reps', 'repetitions'],
  rir: ['rir'],
  sessionSec: ['trainingsdauer', 'workout duration'],
  seconds: ['dauer', 'duration'],
  km: ['distanz lang (km)', 'distance (km)', 'distanz (km)'],
  meters: ['distanz kurz (m)', 'distance (m)', 'distanz (m)'],
} as const

const num = (s: string | undefined) => {
  if (s == null || s.trim() === '') return undefined
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

/** Liest die Sätze. Wirft einen Fehler, wenn Pflichtspalten fehlen. */
export function parseTrainingCsv(text: string): ImportRow[] {
  const [head, ...lines] = splitCsv(text)
  if (!head) throw new Error('Die Datei ist leer.')
  const names = head.map((h) => h.trim().toLowerCase())
  const col = (keys: readonly string[]) => names.findIndex((n) => keys.includes(n))
  const idx = Object.fromEntries(Object.entries(COLUMNS).map(([k, v]) => [k, col(v)])) as Record<keyof typeof COLUMNS, number>
  if (idx.date < 0 || idx.exercise < 0) throw new Error('Spalten „Datum“ und „Übung“ nicht gefunden. Ist das ein Trainings-Export?')
  const out: ImportRow[] = []
  for (const l of lines) {
    const get = (i: number) => (i >= 0 ? l[i]?.trim() : undefined)
    const date = get(idx.date)?.slice(0, 10)
    const exercise = get(idx.exercise)
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !exercise) continue
    const t = (get(idx.type) ?? '').toLowerCase()
    const type: ImportRow['type'] = /warm|aufwärm/.test(t) ? 'warmup' : /fail|versag/.test(t) ? 'failure' : 'work'
    const km = num(get(idx.km)) ?? (num(get(idx.meters)) !== undefined ? (num(get(idx.meters)) as number) / 1000 : undefined)
    out.push({
      date, exercise, type, workout: get(idx.workout) ?? '',
      weight: num(get(idx.weight)) ?? 0, reps: Math.round(num(get(idx.reps)) ?? 0),
      rir: num(get(idx.rir)), seconds: num(get(idx.seconds)), km, sessionSec: num(get(idx.sessionSec)),
    })
  }
  return out
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** Vorschlag je Übungsname: Alias-Tabelle, sonst exakter Treffer auf Name oder ID; null = keine Zuordnung. */
export function suggestMapping(names: string[], exercises: Exercise[]): Record<string, string | null> {
  const ids = new Set(exercises.map((e) => e.id))
  const byName = new Map(exercises.map((e) => [norm(e.name), e.id]))
  return Object.fromEntries(names.map((n) => {
    const alias = IMPORT_ALIASES[norm(n)]
    const id = (alias && ids.has(alias) ? alias : undefined) ?? byName.get(norm(n)) ?? (ids.has(norm(n)) ? norm(n) : undefined)
    return [n, id ?? null]
  }))
}

export interface ImportResult {
  sessions: Omit<Session, 'id'>[]
  /** Übungen, die an diesem Tag schon geloggt sind (z. B. zweiter Import) */
  duplicates: number
  /** Sätze ohne Zuordnung oder ohne Werte */
  skippedSets: number
}

/**
 * Baut Einheiten (eine je Datum und Training) mit Programm `null`. Übungen, die am selben Tag bereits in einer
 * vorhandenen Einheit stehen, werden übersprungen, so ist ein wiederholter Import unschädlich.
 */
export function buildImportSessions(
  rows: ImportRow[], mapping: Record<string, string | null>, existing: Pick<Session, 'date' | 'exercises'>[],
  lookup: (id: string) => Exercise | undefined,
): ImportResult {
  const known = new Set(existing.flatMap((s) => s.exercises.map((e) => `${s.date}|${e.exerciseId}`)))
  const groups = new Map<string, ImportRow[]>()
  for (const r of rows) {
    const key = `${r.date}|${r.workout}`
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  let duplicates = 0
  let skippedSets = 0
  const sessions: Omit<Session, 'id'>[] = []
  let order = 0
  for (const group of [...groups.values()].sort((a, b) => a[0].date.localeCompare(b[0].date))) {
    const date = group[0].date
    const exercises: LoggedExercise[] = []
    const dupIds = new Set<string>()
    for (const r of group) {
      const id = mapping[r.exercise]
      const ex = id ? lookup(id) : undefined
      if (!id || !ex) { skippedSets++; continue }
      if (known.has(`${date}|${id}`)) { dupIds.add(id); continue }
      let set: LoggedSet
      if (ex.cardio) {
        const minutes = r.seconds ? Math.round((r.seconds / 60) * 10) / 10 : 0
        if (!minutes && !r.km) { skippedSets++; continue }
        set = { reps: 0, weight: 0, minutes, ...(r.km ? { km: r.km } : {}) }
      } else {
        // Zeitübungen speichern Sekunden in `reps` (Distanzübungen Meter: Spalte Wdh. der CSV bleibt)
        const reps = ex.metric === 'time' ? Math.round(r.seconds ?? r.reps) : r.reps
        if (reps <= 0) { skippedSets++; continue }
        set = r.type === 'warmup'
          ? { weight: r.weight, reps, warmup: true }
          : { weight: r.weight, reps, ...(r.rir !== undefined ? { rir: r.rir } : r.type === 'failure' ? { rir: 0 } : {}) }
      }
      const le = exercises.find((e) => e.exerciseId === id)
      if (le) le.sets.push(set); else exercises.push({ exerciseId: id, sets: [set] })
    }
    duplicates += dupIds.size
    if (!exercises.length) continue
    const sec = group.find((r) => r.sessionSec)?.sessionSec
    // Uhrzeit ist im Export nicht enthalten: Mittag als Startzeit, Reihenfolge über `order`
    const startedAt = parse(date).getTime() + 12 * 3600_000 + order++
    sessions.push({
      programId: null, dayIndex: -1, date, week: 0, exercises, startedAt,
      finishedAt: startedAt + (sec ? sec * 1000 : 0), ...(sec ? { durationSec: Math.round(sec) } : {}),
    })
  }
  return { sessions, duplicates, skippedSets }
}
