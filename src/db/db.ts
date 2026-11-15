import Dexie, { type EntityTable } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import type {
  Exercise, MeasureEntry, Program, Session, Settings, WeekState, WeightEntry,
} from '../types'
import { ALL_EXERCISES } from '../data/exercises'
import { emptyWeek } from '../engine/weekCycle'
import { DEFAULT_REST } from '../engine/rest'
import { migrateExercise, migrateProgram } from '../data/muscleMigration'

interface KV { key: string; value: unknown }

class LiftDB extends Dexie {
  programs!: EntityTable<Program, 'id'>
  sessions!: EntityTable<Session, 'id'>
  weights!: EntityTable<WeightEntry, 'id'>
  measures!: EntityTable<MeasureEntry, 'id'>
  customExercises!: EntityTable<Exercise, 'id'>
  kv!: EntityTable<KV, 'key'>

  constructor() {
    super('liftlab')
    this.version(1).stores({
      programs: '++id, active',
      sessions: '++id, programId, date',
      weights: '++id, date',
      measures: '++id, date',
      customExercises: 'id',
      kv: 'key',
    })
    // 22 Muskelgruppen: gespeicherte eigene Übungen und Programm-Fokus auf die neuen IDs umstellen
    this.version(2).stores({}).upgrade(async (tx) => {
      await tx.table('customExercises').toCollection().modify((e: Exercise) => Object.assign(e, migrateExercise(e)))
      await tx.table('programs').toCollection().modify((p: Program) => Object.assign(p, migrateProgram(p)))
    })
  }
}

export const db = new LiftDB()

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system', weightUnit: 'kg', lengthUnit: 'cm', distanceUnit: 'km', clock: '24h', language: 'de',
  name: '', birthday: '', sex: '', heightCm: null,
  restSeconds: DEFAULT_REST, warmupRestCompound: 90, warmupRestOther: 45, warmupsEnabled: true,
}

async function getKV<T>(key: string, fallback: T): Promise<T> {
  const row = await db.kv.get(key)
  return (row?.value as T) ?? fallback
}
export const ACTIVE_WORKOUT_KEY = 'activeWorkout'
const setKV = (key: string, value: unknown) => db.kv.put({ key, value })

export const getSettings = () => getKV<Settings>('settings', DEFAULT_SETTINGS).then((s) => ({
  ...DEFAULT_SETTINGS, ...s, restSeconds: { ...DEFAULT_SETTINGS.restSeconds, ...s.restSeconds },
}))
export const saveSettings = (s: Settings) => setKV('settings', s)
export const getWeekState = () => getKV<WeekState>('weekState', emptyWeek())
export const loadActiveWorkout = <T>() => db.kv.get(ACTIVE_WORKOUT_KEY).then((r) => (r?.value as T | undefined) ?? null)
export const saveActiveWorkout = (v: unknown) => setKV(ACTIVE_WORKOUT_KEY, v)
export const clearActiveWorkout = () => db.kv.delete(ACTIVE_WORKOUT_KEY)
export const saveWeekState = (w: WeekState) => setKV('weekState', w)

/** Param (s0, d2 …) des laufenden Workouts oder null */
export function useActiveWorkoutParam(): string | null {
  return useLiveQuery(() => db.kv.get(ACTIVE_WORKOUT_KEY).then((r) => ((r?.value as { param?: string } | undefined)?.param ?? null)), [], null) ?? null
}

export function useSettings(): Settings {
  return useLiveQuery(getSettings, [], DEFAULT_SETTINGS) ?? DEFAULT_SETTINGS
}
export function useWeekState(): WeekState {
  return useLiveQuery(getWeekState, [], emptyWeek()) ?? emptyWeek()
}
export function useActiveProgram(): Program | undefined {
  return useLiveQuery(() => db.programs.filter((p) => p.active).first(), [])
}
export function usePrograms(): Program[] {
  return useLiveQuery(() => db.programs.toArray(), [], []) ?? []
}
export function useSessions(): Session[] {
  return useLiveQuery(() => db.sessions.orderBy('date').toArray(), [], []) ?? []
}
export function useWeights(): WeightEntry[] {
  return useLiveQuery(() => db.weights.orderBy('date').toArray(), [], []) ?? []
}
export function useMeasures(): MeasureEntry[] {
  return useLiveQuery(() => db.measures.orderBy('date').toArray(), [], []) ?? []
}
export function useAllExercises(): Exercise[] {
  const custom = useLiveQuery(() => db.customExercises.toArray(), [], []) ?? []
  return [...ALL_EXERCISES, ...custom]
}

/** Neues Programm speichern und als aktiv markieren, Wochenzyklus zurücksetzen. */
export async function saveProgram(p: Omit<Program, 'id' | 'createdAt' | 'active'>, activate = true) {
  return db.transaction('rw', db.programs, db.kv, async () => {
    if (activate) await db.programs.toCollection().modify({ active: false })
    const id = await db.programs.add({ ...p, createdAt: Date.now(), active: activate })
    if (activate) await saveWeekState(emptyWeek())
    return id as number
  })
}

export async function setWeight(date: string, kg: number, source: 'manual' | 'import' = 'manual') {
  const existing = await db.weights.where('date').equals(date).first()
  if (existing?.id) await db.weights.update(existing.id, { kg, source })
  else await db.weights.add({ date, kg, source })
}

/** Löscht alle lokalen Daten (Programme, Einheiten, Gewicht, Maße, eigene Übungen, Einstellungen, laufendes Workout). */
export async function resetAllData() {
  await db.transaction('rw', [db.programs, db.sessions, db.weights, db.measures, db.customExercises, db.kv], async () => {
    await Promise.all([db.programs.clear(), db.sessions.clear(), db.weights.clear(), db.measures.clear(),
      db.customExercises.clear(), db.kv.clear()])
  })
}

export async function exportAll(): Promise<string> {
  const [programs, sessions, weights, measures, customExercises, kv] = await Promise.all([
    db.programs.toArray(), db.sessions.toArray(), db.weights.toArray(), db.measures.toArray(),
    db.customExercises.toArray(), db.kv.toArray(),
  ])
  return JSON.stringify({ app: 'liftlab', version: 2, exportedAt: new Date().toISOString(),
    programs, sessions, weights, measures, customExercises,
    // Das laufende Workout ist flüchtig und gehört nicht ins Backup
    kv: kv.filter((r) => r.key !== ACTIVE_WORKOUT_KEY) }, null, 2)
}

export async function importAll(json: string) {
  const data = JSON.parse(json)
  if (data?.app !== 'liftlab') throw new Error('Keine gültige Backup-Datei')
  await db.transaction('rw', [db.programs, db.sessions, db.weights, db.measures, db.customExercises, db.kv], async () => {
    await Promise.all([db.programs.clear(), db.sessions.clear(), db.weights.clear(), db.measures.clear(),
      db.customExercises.clear(), db.kv.clear()])
    await db.programs.bulkAdd((data.programs ?? []).map(migrateProgram))
    await db.sessions.bulkAdd(data.sessions ?? [])
    await db.weights.bulkAdd(data.weights ?? [])
    await db.measures.bulkAdd(data.measures ?? [])
    await db.customExercises.bulkAdd((data.customExercises ?? []).map(migrateExercise))
    await db.kv.bulkAdd(data.kv ?? [])
  })
}

/** Gewichtswerte aus einem Apple-Health-Export (export.xml) oder CSV (date,kg) lesen. */
export function parseWeightImport(text: string): { date: string; kg: number }[] {
  const out = new Map<string, number>()
  if (text.includes('<Record')) {
    const re = /<Record[^>]*type="HKQuantityTypeIdentifierBodyMass"[^>]*>/g
    for (const m of text.match(re) ?? []) {
      const val = Number(/value="([\d.]+)"/.exec(m)?.[1])
      const unit = /unit="(\w+)"/.exec(m)?.[1]
      const date = /startDate="(\d{4}-\d{2}-\d{2})/.exec(m)?.[1]
      if (!date || !val) continue
      out.set(date, unit === 'lb' ? val * 0.45359237 : val)
    }
  } else {
    for (const line of text.split(/\r?\n/)) {
      // Datum steht vorn (yyyy-mm-dd), danach Trenner, danach der Wert (auch mit Dezimalkomma)
      const m = /^\s*(\d{4}-\d{2}-\d{2})\s*[;,]\s*([\d.,]+)/.exec(line)
      const kg = Number(m?.[2].replace(',', '.'))
      if (m && kg > 0) out.set(m[1], kg)
    }
  }
  return [...out.entries()].map(([date, kg]) => ({ date, kg: Math.round(kg * 10) / 10 }))
}
