import { canDeleteExercise, exerciseUsage, type ExerciseUsage } from '../engine/customExercise'
import Dexie, { type EntityTable } from 'dexie'
import { DEFAULT_BAR, DEFAULT_PLATES } from '../engine/plates'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import type {
  Exercise, ExerciseOverride, MeasureEntry, Program, Session, Settings, WeekState, WeightEntry,
} from '../types'
import { ALL_EXERCISES, exerciseById } from '../data/exercises'
import { applyBodyweight } from '../engine/bodyweight'
import { emptyWeek, jumpToWeek, maxReachedWeek } from '../engine/weekCycle'
import { weekStateAfterDelete, weekStateAfterMove } from '../engine/history'
import { DEFAULT_WARMUP_SCHEMES, cloneSchemes } from '../engine/warmup'
import { DEFAULT_REST, DEFAULT_WARMUP_REST_BETWEEN, DEFAULT_WARMUP_REST_LAST } from '../engine/rest'
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
  restSeconds: DEFAULT_REST, warmupRestBetween: DEFAULT_WARMUP_REST_BETWEEN, warmupRestLast: DEFAULT_WARMUP_REST_LAST,
  keepAlive: false, warmupMode: 'smart', warmupSchemes: DEFAULT_WARMUP_SCHEMES,
  progressionTarget: 'mid', weightMatch: true, expandRange: true, hardSetFirst: false, hideDoneWarmups: true, autoAdvance: true, sideRest: 15, prefillMode: 'suggestion', barWeight: DEFAULT_BAR, plates: DEFAULT_PLATES,
}

async function getKV<T>(key: string, fallback: T): Promise<T> {
  const row = await db.kv.get(key)
  return (row?.value as T) ?? fallback
}
export const ACTIVE_WORKOUT_KEY = 'activeWorkout'
const setKV = (key: string, value: unknown) => db.kv.put({ key, value })

export const getSettings = () => getKV<Settings & { warmupsEnabled?: boolean }>('settings', DEFAULT_SETTINGS).then((s) => ({
  ...DEFAULT_SETTINGS, ...s,
  restSeconds: { ...DEFAULT_SETTINGS.restSeconds, ...s.restSeconds },
  warmupSchemes: { ...cloneSchemes(DEFAULT_SETTINGS.warmupSchemes), ...s.warmupSchemes },
  // Alte Einstellung "Aufwärmen aus" in den neuen Modus übernehmen
  warmupMode: s.warmupMode ?? (s.warmupsEnabled === false ? 'off' : 'smart'),
}))
export const saveSettings = (s: Settings) => setKV('settings', s)
/** Einstellungen atomar ändern: liest den aktuellen Stand aus der DB, nie aus einem (evtl. noch ladenden) Hook-Wert. */
export const patchSettings = (p: Partial<Settings>) =>
  db.transaction('rw', db.kv, async () => { await saveSettings({ ...(await getSettings()), ...p }) })
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
/** Wie useSettings, aber `undefined` solange noch geladen wird (für Logik, die nicht mit Defaults starten darf). */
export function useSettingsLoaded(): Settings | undefined {
  return useLiveQuery(getSettings, [])
}
export function useWeekState(): WeekState {
  return useLiveQuery(getWeekState, [], emptyWeek()) ?? emptyWeek()
}
export function useActiveProgram(): Program | undefined {
  return useLiveQuery(() => db.programs.filter((p) => p.active).first(), [])
}
/** Programm zum Route-Parameter: `p<id>-…` = bestimmtes Programm (Bibliothek), sonst das aktive. */
export function useProgramByParam(param: string): Program | undefined {
  const programs = useLiveQuery(() => db.programs.toArray(), [])
  const m = /^p(\d+)-/.exec(param)
  return m ? programs?.find((p) => p.id === Number(m[1])) : programs?.find((p) => p.active)
}
export function usePrograms(): Program[] {
  return useLiveQuery(() => db.programs.toArray(), [], []) ?? []
}
/** undefined = lädt noch */
export function useSessionsLoaded(): Session[] | undefined {
  return useLiveQuery(() => db.sessions.orderBy('date').toArray(), [])
}
/** undefined = lädt noch */
export function useWeekStateLoaded(): WeekState | undefined {
  return useLiveQuery(getWeekState, [])
}
export function useSessions(): Session[] {
  return useLiveQuery(() => db.sessions.orderBy('date').toArray(), [], []) ?? []
}
/** Eine Einheit; `undefined` = lädt noch, `null` = gibt es nicht (mehr) */
export function useSession(id: number): Session | null | undefined {
  return useLiveQuery(() => db.sessions.get(id).then((s) => s ?? null), [id])
}
export function useWeights(): WeightEntry[] {
  return useLiveQuery(() => db.weights.orderBy('date').toArray(), [], []) ?? []
}
/**
 * Sessions für Auswertungen (1RM, Volumen, Rekorde): Sätze von Körpergewichtsübungen tragen die Gesamtlast
 * (Anteil × Körpergewicht am Tag + Zusatzgewicht). Nur anzeigen, nie speichern.
 */
export function useStatSessions(): Session[] {
  const sessions = useSessions()
  const weights = useWeightsLoaded()
  const all = useAllExercises()
  return useMemo(() => applyBodyweight(sessions, (id) => exerciseById(id, all), weights ?? []), [sessions, weights, all])
}
/** Wie useWeights, aber undefined, solange die Abfrage noch lädt (für Werte, die einmalig daraus berechnet werden). */
export function useWeightsLoaded(): WeightEntry[] | undefined {
  return useLiveQuery(() => db.weights.orderBy('date').toArray(), [])
}
export function useMeasures(): MeasureEntry[] {
  return useLiveQuery(() => db.measures.orderBy('date').toArray(), [], []) ?? []
}
export function useAllExercises(): Exercise[] {
  const custom = useLiveQuery(() => db.customExercises.toArray(), [], []) ?? []
  return [...ALL_EXERCISES, ...custom]
}

/** Eigene Übung anlegen oder (gleiche ID) überschreiben. */
export const saveCustomExercise = (ex: Exercise) => db.customExercises.put(ex)

/**
 * Eigene Übung löschen (samt Überschreibungen). Verweist noch eine Einheit oder ein Programm darauf, passiert nichts
 * und die Verwendung wird zurückgegeben (sonst `null` = gelöscht).
 */
export async function deleteCustomExercise(id: string): Promise<ExerciseUsage | null> {
  return db.transaction('rw', [db.customExercises, db.sessions, db.programs, db.kv], async () => {
    const usage = exerciseUsage(id, await db.sessions.toArray(), await db.programs.toArray())
    if (!canDeleteExercise(usage)) return usage
    await db.customExercises.delete(id)
    await saveExerciseOverrideTx(id, null)
    return null
  })
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

/** Gewicht (und optional Körperfett) für ein Datum speichern; bodyFat `null` entfernt den Wert. */
export async function saveBodyEntry(date: string, v: { kg: number; bodyFat?: number | null }) {
  const existing = await db.weights.where('date').equals(date).first()
  const bodyFat = v.bodyFat === null ? undefined : (v.bodyFat ?? existing?.bodyFat)
  if (existing?.id) await db.weights.put({ ...existing, kg: v.kg, bodyFat, source: 'manual' })
  else await db.weights.add({ date, kg: v.kg, bodyFat, source: 'manual' })
}

export async function deleteBodyEntry(date: string) {
  await db.weights.where('date').equals(date).delete()
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

const KG_PER_LB = 0.45359237
const RECORD_OPEN = '<Record'

/**
 * Inkrementeller Leser für Apple-Health-`export.xml`: nimmt beliebig geschnittene Textstücke entgegen und hält nur
 * den Rest eines noch nicht vollständigen `<Record …>`-Tags vor. So braucht eine mehrere hundert MB große Datei
 * kaum Speicher. Nur Körpergewicht (HKQuantityTypeIdentifierBodyMass) wird ausgewertet.
 */
export function weightXmlReader() {
  const out = new Map<string, number>()
  let carry = ''
  const take = (tag: string) => {
    if (!tag.includes('HKQuantityTypeIdentifierBodyMass')) return
    if (!/type="HKQuantityTypeIdentifierBodyMass"/.test(tag)) return
    const val = Number(/value="([\d.]+)"/.exec(tag)?.[1])
    const unit = /unit="(\w+)"/.exec(tag)?.[1]
    const date = /startDate="(\d{4}-\d{2}-\d{2})/.exec(tag)?.[1]
    if (!date || !val) return
    out.set(date, unit === 'lb' ? val * KG_PER_LB : val)
  }
  return {
    push(chunk: string) {
      const text = carry + chunk
      let pos = 0
      for (;;) {
        const open = text.indexOf(RECORD_OPEN, pos)
        if (open < 0) {
          // Ein am Ende abgeschnittenes "<Recor" nicht verlieren
          carry = text.slice(Math.max(pos, text.length - (RECORD_OPEN.length - 1)))
          return
        }
        const close = text.indexOf('>', open)
        if (close < 0) { carry = text.slice(open); return } // Tag reicht ins nächste Stück
        take(text.slice(open, close + 1))
        pos = close + 1
      }
    },
    result: () => [...out.entries()].map(([date, kg]) => ({ date, kg: Math.round(kg * 10) / 10 })),
  }
}

function parseWeightCsv(text: string): { date: string; kg: number }[] {
  const out = new Map<string, number>()
  for (const line of text.split(/\r?\n/)) {
    // Datum steht vorn (yyyy-mm-dd), danach Trenner, danach der Wert (auch mit Dezimalkomma)
    const m = /^\s*(\d{4}-\d{2}-\d{2})\s*[;,]\s*([\d.,]+)/.exec(line)
    const kg = Number(m?.[2].replace(',', '.'))
    if (m && kg > 0) out.set(m[1], kg)
  }
  return [...out.entries()].map(([date, kg]) => ({ date, kg: Math.round(kg * 10) / 10 }))
}

/** Gewichtswerte aus einem Text (Apple-Health-XML oder CSV `date,kg`) lesen. Für große Dateien `parseWeightFile` nutzen. */
export function parseWeightImport(text: string): { date: string; kg: number }[] {
  if (!text.includes(RECORD_OPEN)) return parseWeightCsv(text)
  const reader = weightXmlReader()
  reader.push(text)
  return reader.result()
}

/** Wie `parseWeightImport`, liest XML-Dateien aber als Stream (kein String der ganzen Datei im Speicher). */
export async function parseWeightFile(file: File): Promise<{ date: string; kg: number }[]> {
  if (!/\.xml$/i.test(file.name) && !file.type.includes('xml')) return parseWeightCsv(await file.text())
  const reader = weightXmlReader()
  const stream = file.stream().pipeThrough(new TextDecoderStream())
  const r = stream.getReader()
  for (;;) {
    const { done, value } = await r.read()
    if (done) break
    reader.push(value)
  }
  return reader.result()
}

/** Einstellungen auf Standard zurücksetzen, das Profil (Name, Geburtstag, Geschlecht, Größe) bleibt erhalten. */
export function settingsResetKeepingProfile(s: Settings): Settings {
  return { ...DEFAULT_SETTINGS, name: s.name, birthday: s.birthday, sex: s.sex, heightCm: s.heightCm }
}
export const resetSettings = () =>
  db.transaction('rw', db.kv, async () => { await saveSettings(settingsResetKeepingProfile(await getSettings())) })


// ---- Übungs-Überschreibungen und Notizen (kv, Teil des Backups) ----
const OVERRIDES_KEY = 'exerciseOverrides'
const PROGRAM_NOTES_KEY = 'programNotes'

/** `undefined` solange noch geladen wird */
export function useExerciseOverridesLoaded(): Record<string, ExerciseOverride> | undefined {
  return useLiveQuery(() => getKV<Record<string, ExerciseOverride>>(OVERRIDES_KEY, {}), [])
}
export function useExerciseOverrides(): Record<string, ExerciseOverride> {
  return useExerciseOverridesLoaded() ?? {}
}

/** Überschreibung zusammenführen; `null` löscht sie, leere Felder (undefined) werden entfernt. */
export const saveExerciseOverride = (id: string, patch: ExerciseOverride | null) =>
  db.transaction('rw', db.kv, () => saveExerciseOverrideTx(id, patch))
async function saveExerciseOverrideTx(id: string, patch: ExerciseOverride | null) {
  const all = await getKV<Record<string, ExerciseOverride>>(OVERRIDES_KEY, {})
  const merged = patch === null ? undefined : { ...all[id], ...patch }
  const next = { ...all }
  const clean = merged && Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== undefined && v !== '')) as ExerciseOverride
  if (clean && Object.keys(clean).length) next[id] = clean
  else delete next[id]
  await setKV(OVERRIDES_KEY, next)
}

export const programNoteKey = (programId: number | null | undefined, exerciseId: string) => `${programId ?? 'x'}:${exerciseId}`

export function useProgramNotes(): Record<string, string> {
  return useLiveQuery(() => getKV<Record<string, string>>(PROGRAM_NOTES_KEY, {}), [], {}) ?? {}
}

export const saveProgramNote = (programId: number | null | undefined, exerciseId: string, text: string) =>
  db.transaction('rw', db.kv, () => saveProgramNoteTx(programId, exerciseId, text))
async function saveProgramNoteTx(programId: number | null | undefined, exerciseId: string, text: string) {
  const all = await getKV<Record<string, string>>(PROGRAM_NOTES_KEY, {})
  const key = programNoteKey(programId, exerciseId)
  const next = { ...all }
  if (text.trim()) next[key] = text; else delete next[key]
  await setKV(PROGRAM_NOTES_KEY, next)
}

/** Programm aktivieren; der Wochenstand wird aus den geloggten Einheiten rekonstruiert. */
export async function activateProgram(id: number) {
  await db.transaction('rw', db.programs, db.sessions, db.kv, async () => {
    const program = await db.programs.get(id)
    if (!program) return
    const sessions = await db.sessions.toArray()
    await db.programs.toCollection().modify((p) => { p.active = p.id === id })
    await saveWeekState(jumpToWeek(program, sessions, maxReachedWeek(program, sessions, 0)))
  })
}

export async function deleteProgram(id: number) {
  await db.transaction('rw', db.programs, db.sessions, db.kv, async () => {
    const program = await db.programs.get(id)
    await db.programs.delete(id)
    if (program?.active) {
      const next = await db.programs.orderBy('id').last()
      if (next?.id !== undefined) {
        await db.programs.update(next.id, { active: true })
        const sessions = await db.sessions.toArray()
        await saveWeekState(jumpToWeek(next, sessions, maxReachedWeek(next, sessions, 0)))
      } else await saveWeekState(emptyWeek())
    }
  })
}

/**
 * Geänderte Einheit speichern (Sätze, Datum, Zeiten). Ändert sich das Datum, wandert der markierte Tag im Wochenstand
 * der aktuellen Woche mit. Die Programmwoche der Einheit bleibt unverändert.
 */
export async function saveSessionEdit(next: Session) {
  if (next.id === undefined) throw new Error('Einheit ohne ID')
  await db.transaction('rw', db.sessions, db.programs, db.kv, async () => {
    const before = await db.sessions.get(next.id as number)
    await db.sessions.put(next)
    if (!before || before.date === next.date || next.programId === null) return
    const program = await db.programs.get(next.programId)
    const others = (await db.sessions.toArray()).filter((s) => s.id !== next.id)
    await saveWeekState(weekStateAfterMove(await getWeekState(), program, before, next, others))
  })
}

/** Einheit löschen. `freeSlot`: der Tag im Wochenplan wird wieder offen (nur aktuelle Woche des aktiven Programms). */
export async function deleteSession(id: number, freeSlot: boolean) {
  await db.transaction('rw', db.sessions, db.programs, db.kv, async () => {
    const removed = await db.sessions.get(id)
    if (!removed) return
    await db.sessions.delete(id)
    if (removed.programId === null) return
    const program = await db.programs.get(removed.programId)
    await saveWeekState(weekStateAfterDelete(await getWeekState(), program, removed, await db.sessions.toArray(), freeSlot))
  })
}
