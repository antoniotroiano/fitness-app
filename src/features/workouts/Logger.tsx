import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Exercise, LoggedExercise, LoggedSet, MuscleId, PlannedExercise, Settings, WarmupStep } from '../../types'
import { ExercisePicker } from '../wizard/shared'
import { Button, Card, cx } from '../../components/ui'
import { Icon, type IconName } from '../../components/icons'
import {
  clearActiveWorkout, db, loadActiveWorkout, programNoteKey, saveActiveWorkout, saveExerciseOverride, saveProgramNote, saveWeekState,
  useProgramByParam, useAllExercises, useExerciseOverridesLoaded, useProgramNotes, useSessions, useSessionsLoaded, useSettingsLoaded, useWeightsLoaded, useWeekState, useWeekStateLoaded,
} from '../../db/db'
import { DEFAULT_SETTINGS } from '../../db/db'
import { smartSteps, resolveWarmup, effectiveMode, dedupeWarmups } from '../../engine/warmup'
import { restCategory } from '../../engine/rest'
import { noLoadStats, volumeFactor } from '../../engine/stats'
import { usesBodyweight } from '../../engine/bodyweight'

import type { PlannedView } from '../../engine/plannedDay'
import { deloadSessionOf, plannedDay } from '../../engine/plannedDay'
import { adaptNextSets } from '../../engine/progression'
import { NEUTRAL_WEEK, TIME_RANGE, weekPlan } from '../../engine/periodization'
import { restSecondsFor } from '../../engine/rest'
import { historyUpTo, markSlot, maxReachedWeek } from '../../engine/weekCycle'
import { elapsedMs, pauseClock, resumeClock, startClock } from '../../engine/workoutClock'
import { displayToKg, displayToKm, kgToDisplay } from '../../utils/units'
import { fmt, todayStr } from '../../utils/dates'
import { ExerciseStrip } from './ExerciseStrip'
import { NumpadSheet } from './NumpadSheet'
import { RestChip, RestSheet, type RestState } from './RestTimer'
import { SetTable, type PadField } from './SetTable'
import { SetTypeSheet } from './SetTypeSheet'
import { WorkoutHeader } from './WorkoutHeader'
import { ExerciseInfoSheet } from './ExerciseInfoSheet'
import { CompleteSheet, FinishChoiceSheet, WorkoutMenuSheet } from './LoggerSheets'
import { NoteSheet, scopeLabel, type NoteScope } from './sheets'
import { WarmupSheet } from './WarmupSheet'
import { uid, type ActiveWorkout, type Row } from './state'
import { de } from '../../i18n/de'

/** Körperlast für die Anzeige (eine Nachkommastelle) */
const fmtLoad = (n: number) => (Math.round(n * 10) / 10).toLocaleString('de-DE')

const num = (s: string) => Number(s.replace(',', '.')) || 0
/** Startzeilen einer Übung: Aufwärmsätze und Arbeitssätze aus der Planung. */
function buildRows(v: PlannedView, wl: Settings['weightUnit']): Row[] {
  const blank = { weight: '', reps: '', rir: '', done: false, minutes: '', km: '' }
  const warm: Row[] = v.warmups.map((w) => ({
    ...blank, id: uid(), type: 'warmup', weight: w.weight == null ? '' : String(kgToDisplay(w.weight, wl)), reps: String(w.reps),
  }))
  const work: Row[] = Array.from({ length: v.sets }, (_, i) => ({
    ...blank, id: uid(), type: 'work',
    weight: v.sug.weight == null ? '' : String(kgToDisplay(v.sug.weight, wl)),
    reps: v.ex.cardio ? '' : String(v.sug.reps),
    rir: v.ex.cardio ? '' : String(v.setRirs[i]),
    ...(v.ex.cardio ? {} : { planKg: v.sug.weight, planReps: v.sug.reps, planRir: v.setRirs[i] }),
    ...(v.failureLast && i === v.sets - 1 ? { failure: true } : {}),
  }))
  return [...warm, ...work]
}

const isComplete = (rs: Row[]) => rs.length > 0 && rs.every((r) => r.done)

function ActionPill({ icon, label, onClick, active }: { icon: IconName; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className={cx('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium active:opacity-70', active ? 'border-accent text-fg' : 'border-line text-muted')}>
      <Icon name={icon} size={16} />{label}
    </button>
  )
}

export default function Logger() {
  const { slot: param = 's0' } = useParams()
  const nav = useNavigate()
  const program = useProgramByParam(param)
  const week = useWeekState()
  const sessions = useSessions()
  const weightsLoaded = useWeightsLoaded()
  const bodyweights = useMemo(() => weightsLoaded ?? [], [weightsLoaded])
  // Der Start wartet, bis Verlauf und Wochenstand geladen sind (sonst fehlen Vorschlagsgewichte nach einem Reload)
  const sessionsLoaded = useSessionsLoaded()
  const weekLoaded = useWeekStateLoaded()
  const dataLoaded = sessionsLoaded !== undefined && weekLoaded !== undefined && weightsLoaded !== undefined
  const settingsLoaded = useSettingsLoaded()
  const settings = settingsLoaded ?? DEFAULT_SETTINGS
  const overridesLoaded = useExerciseOverridesLoaded()
  const overrides = useMemo(() => overridesLoaded ?? {}, [overridesLoaded])
  const programNotes = useProgramNotes()
  const all = useAllExercises()

  // undefined = lädt noch, null = nichts gespeichert
  const [stored, setStored] = useState<ActiveWorkout | null | undefined>(undefined)
  const [active, setActive] = useState<ActiveWorkout | null>(null)
  const [rest, setRest] = useState<RestState | null>(null)
  const [restOpen, setRestOpen] = useState(false)
  const endRest = useCallback(() => setRest(null), [])
  const [pad, setPad] = useState<{ rowId: string; field: PadField } | null>(null)
  const [typeRow, setTypeRow] = useState<string | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [warmupOpen, setWarmupOpen] = useState(false)
  const [noteScope, setNoteScope] = useState<NoteScope | null>(null)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [celebrated, setCelebrated] = useState(false)
  const [closed, setClosed] = useState(false)
  const saving = useRef(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const local = param.replace(/^p\d+-/, '')
  const slotIdx = local.startsWith('s') ? Number(local.slice(1)) : null
  const dayIdx = !program ? -1 : slotIdx !== null
    ? (program.weekSlots[slotIdx] === 'rest' ? -1 : (program.weekSlots[slotIdx] as number)) : Number(local.slice(1))
  // Programme aus der Bibliothek haben keinen eigenen Wochenstand: die höchste erreichte Woche zählt
  const foreign = !!program && !program.active
  const curWeek = foreign ? maxReachedWeek(program, sessions, 0) : week.week
  const day = program?.days[dayIdx]
  const plan = useMemo(
    () => (program?.config ? weekPlan(program.config, curWeek) : NEUTRAL_WEEK),
    [program, curWeek],
  )
  const lookup = useCallback((id: string) => all.find((e) => e.id === id), [all])
  // Der Trainingstag plus die im laufenden Workout hinzugefügten Übungen
  const added = active?.added
  const fullDay = useMemo(() => (day && added?.length ? { ...day, exercises: [...day.exercises, ...added] } : day), [day, added])
  const views = useMemo(
    () => (fullDay ? plannedDay(fullDay, plan, historyUpTo(sessions, program?.id, curWeek), lookup, settings, overrides, deloadSessionOf(program), todayStr(), bodyweights) : []),
    [fullDay, plan, sessions, program, curWeek, lookup, settings, overrides, bodyweights],
  )

  useEffect(() => { loadActiveWorkout<ActiveWorkout>().then(setStored) }, [])

  // Start oder Wiederaufnahme
  useEffect(() => {
    if (stored === undefined || active || closed || !program || !views.length || !settingsLoaded || !overridesLoaded || !dataLoaded) return
    if (stored && stored.param === param && stored.programId === (program.id ?? null)) { setActive(stored); return }
    if (stored) return // anderes Workout läuft, siehe Hinweiskarte
    const rows: Record<string, Row[]> = {}
    for (const v of views) rows[v.pe.exerciseId] = buildRows(v, settings.weightUnit)
    setActive({ param, programId: program.id ?? null, clock: startClock(Date.now()), rows, current: views[0].pe.exerciseId })
  }, [stored, active, closed, program, views, param, settings.weightUnit, settingsLoaded, overridesLoaded, dataLoaded])

  // Zwischenspeichern, damit Reload oder App-Wechsel nichts verlieren
  useEffect(() => { if (active && !closed) void saveActiveWorkout(active) }, [active, closed])

  // Display aktiv halten (Screen Wake Lock), solange das Workout läuft und nicht pausiert ist
  const keepAwake = settings.keepAlive && !!active && !closed && active.clock.pausedAt == null
  useEffect(() => {
    if (!keepAwake || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const request = () => navigator.wakeLock.request('screen').then((l) => { if (cancelled) void l.release(); else lock = l }).catch(() => { /* nicht erlaubt */ })
    const onVisible = () => { if (document.visibilityState === 'visible') void request() }
    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisible); void lock?.release() }
  }, [keepAwake])

  // Numpad offen: das bearbeitete Feld sichtbar halten (nicht hinter dem Numpad oder der Kopfzeile)
  const headerRef = useRef<HTMLDivElement>(null)
  const padRowId = pad?.rowId
  const padField = pad?.field
  useEffect(() => {
    if (!padRowId) return
    const raf = requestAnimationFrame(() => {
      const row = document.querySelector(`[data-row-id="${padRowId}"]`)
      const numpad = document.querySelector('[data-numpad]')
      if (!row || !numpad) return
      const r = row.getBoundingClientRect()
      const bottom = numpad.getBoundingClientRect().top - 12
      const top = (headerRef.current?.getBoundingClientRect().bottom ?? 0) + 8
      // Gescrollt wird der App-Container (overflow-y-auto), nicht das Fenster
      let box: Element | null = row.parentElement
      while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement
      const scroller = box ?? window
      if (r.bottom > bottom) scroller.scrollBy({ top: r.bottom - bottom, behavior: 'smooth' })
      else if (r.top < top) scroller.scrollBy({ top: r.top - top, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [padRowId, padField])

  const allDone = !!active && views.length > 0 && views.every((v) => isComplete(active.rows[v.pe.exerciseId] ?? []))
  useEffect(() => {
    if (allDone && !celebrated) { setCelebrated(true); setCompleteOpen(true) }
  }, [allDone, celebrated])

  if (!program || !day) {
    return <div className="max-w-2xl mx-auto p-4"><Card>Workout nicht gefunden.</Card></div>
  }
  if (stored && !active && !(stored.param === param && stored.programId === (program.id ?? null))) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-3 safe-top">
        <Card className="space-y-3">
          <div className="font-semibold">Ein anderes Workout läuft noch</div>
          <p className="text-sm text-muted">Setze es fort oder verwirf es, um dieses Workout zu starten.</p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => nav(`/workout/${stored.param}`, { replace: true })}>Fortsetzen</Button>
            <Button variant="danger" className="flex-1" onClick={async () => { await clearActiveWorkout(); setStored(null) }}>Verwerfen</Button>
          </div>
        </Card>
      </div>
    )
  }
  if (!active) return null

  const current = views.find((v) => v.pe.exerciseId === active.current) ?? views[0]
  const rows = active.rows[current.pe.exerciseId] ?? []
  const paused = active.clock.pausedAt != null
  const wl = settings.weightUnit

  const setRows = (id: string, fn: (r: Row[]) => Row[]) =>
    setActive((a) => (a ? { ...a, rows: { ...a.rows, [id]: fn(a.rows[id] ?? []) } } : a))
  const patch = (rowId: string, p: Partial<Row>) =>
    setRows(current.pe.exerciseId, (rs) => rs.map((r) => (r.id === rowId ? { ...r, ...p, ...(p.weight !== undefined || p.reps !== undefined ? { manual: true } : {}) } : r)))

  /**
   * Nach einem abgehakten Arbeitssatz: Gewicht und Wdh. der noch offenen, nicht von Hand geänderten Folgesätze
   * neu berechnen (Ermüdung je Satz Abstand eingerechnet). Lief der Satz wie geplant, bleibt alles unverändert.
   * Ohne Verlauf (kein Planungsgewicht) kalibriert der erste Satz. Assistierte, Zeit- und Cardioübungen nicht.
   */
  const adaptFollowing = (rs: Row[], doneRow: Row): Row[] => {
    if (doneRow.type !== 'work' || current.ex.cardio || current.ex.assisted || current.ex.metric === 'time' || doneRow.rir === '' || doneRow.planReps === undefined) return rs
    const idx = rs.findIndex((r) => r.id === doneRow.id)
    const done = {
      weight: displayToKg(num(doneRow.weight), wl), reps: num(doneRow.reps), rir: num(doneRow.rir),
      planWeight: doneRow.planKg, planReps: doneRow.planReps, planRir: doneRow.planRir ?? num(doneRow.rir),
    }
    // Alle folgenden Arbeitssätze zählen für den Abstand; angepasst werden nur offene, nicht von Hand geänderte
    const following = rs.map((r, i) => ({ r, i })).filter(({ r, i }) => i > idx && r.type === 'work')
    const open = following.filter(({ r }) => !r.done && !r.manual)
    if (!open.length) return rs
    const res = adaptNextSets(done, open.map(({ r }) => ({ planWeight: r.planKg ?? null, rir: r.rir === '' ? (r.planRir ?? 2) : num(r.rir) })),
      current.range, current.ex.equipment, wl, overrides[current.pe.exerciseId]?.weightScale, current.bodyLoad)
    const byId = new Map(open.map(({ r }, k) => [r.id, res[k]]))
    return rs.map((r) => {
      const next = byId.get(r.id)
      if (!next) return r
      // Neue Erwartung für diesen Satz: Vergleichsbasis, wenn er abgehakt wird
      return { ...r, weight: String(kgToDisplay(next.weight, wl)), reps: String(next.reps), planKg: next.weight, planReps: next.reps }
    })
  }

  const toggleDone = (row: Row) => {
    const turningOn = !row.done
    const completes = turningOn && isComplete(rows.map((r) => (r.id === row.id ? { ...r, done: true } : r)))
    setActive((a) => {
      if (!a) return a
      const id = current.pe.exerciseId
      const toggled = (a.rows[id] ?? []).map((r) => (r.id === row.id ? { ...r, done: !r.done } : r))
      const nextRows = { ...a.rows, [id]: turningOn ? adaptFollowing(toggled, row) : toggled }
      let cur = a.current
      if (completes) {
        // Immer zur ersten Übung der Reihenfolge, die noch offen ist (auch übersprungene)
        const open = views.find((v) => !isComplete(nextRows[v.pe.exerciseId] ?? []))
        if (open) cur = open.pe.exerciseId
      }
      return { ...a, rows: nextRows, current: cur }
    })
    if (completes) setPad(null)
    if (turningOn && !current.ex.cardio) {
      // Letzter Aufwärmsatz: danach folgt der erste Arbeitssatz, also die längere Pause
      const moreWarmups = rows.some((r) => r.id !== row.id && r.type === 'warmup' && !r.done)
      const after = row.type !== 'warmup' ? 'work' : moreWarmups ? 'warmup' : 'lastWarmup'
      const sec = restSecondsFor(current.ex, settings, after, overrides[current.pe.exerciseId]?.restSeconds)
      setRest({ endsAt: Date.now() + sec * 1000, total: sec })
    }
  }
  /** Header-Checkbox: alle Sätze der Übung abhaken bzw. alle zurücksetzen (ohne Pausen-Timer). */
  const toggleAll = () => {
    const allDone = isComplete(rows)
    setActive((a) => {
      if (!a) return a
      const id = current.pe.exerciseId
      const nextRows = { ...a.rows, [id]: (a.rows[id] ?? []).map((r) => ({ ...r, done: !allDone })) }
      let cur = a.current
      if (!allDone) {
        const open = views.find((v) => !isComplete(nextRows[v.pe.exerciseId] ?? []))
        if (open) cur = open.pe.exerciseId
      }
      return { ...a, rows: nextRows, current: cur }
    })
    if (!allDone) setPad(null)
  }
  const addSet = () => setRows(current.pe.exerciseId, (rs) => {
    const last = [...rs].reverse().find((r) => r.type === 'work') ?? rs.at(-1)
    const base: Row = last ?? { id: '', type: 'work', weight: '', reps: '', rir: '', done: false, minutes: '', km: '' }
    return [...rs, { ...base, id: uid(), type: 'work', done: false }]
  })
  const deleteRow = (rowId: string) => {
    setRows(current.pe.exerciseId, (rs) => rs.filter((r) => r.id !== rowId))
    setPad((p) => (p?.rowId === rowId ? null : p))
  }
  const changeType = (type: 'warmup' | 'work') => {
    if (typeRow) patch(typeRow, { type, rir: type === 'warmup' ? '' : rows.find((r) => r.id === typeRow)?.rir || String(current.rir) })
    setTypeRow(null)
  }

  const padRow = pad ? rows.find((r) => r.id === pad.rowId) : undefined
  const onConfirmPad = () => {
    if (pad?.field === 'weight' && padRow) setPad({ rowId: pad.rowId, field: 'reps' })
    else setPad(null)
  }

  const selectExercise = (id: string) => { setPad(null); setActive((a) => (a ? { ...a, current: id } : a)) }
  const addExercise = (ex: Exercise) => {
    if (views.some((v) => v.pe.exerciseId === ex.id)) { selectExercise(ex.id); return }
    const range = ex.metric === 'time' ? TIME_RANGE : ex.compound ? { min: 6, max: 10 } : { min: 10, max: 15 }
    const pe: PlannedExercise = { exerciseId: ex.id, sets: ex.cardio ? 1 : 3, repMin: range.min, repMax: range.max, rir: 2 }
    const [view] = plannedDay({ ...day, exercises: [pe] }, plan, historyUpTo(sessions, program.id, curWeek), lookup, settings, overrides, deloadSessionOf(program), todayStr(), bodyweights)
    if (!view) return
    setPad(null)
    setActive((a) => (a ? { ...a, added: [...(a.added ?? []), pe], rows: { ...a.rows, [ex.id]: buildRows(view, wl) }, current: ex.id } : a))
  }
  const togglePause = () => setActive((a) => {
    if (!a) return a
    return { ...a, clock: a.clock.pausedAt == null ? pauseClock(a.clock, Date.now()) : resumeClock(a.clock, Date.now()) }
  })

  const doneCount = Object.values(active.rows).flat().filter((r) => r.done).length
  const openCount = Object.values(active.rows).flat().length - doneCount

  // ---- Aufwärmen: Modus/Schema der Übung ändern und die noch offenen Aufwärmzeilen neu berechnen ----
  const ov = overrides[current.pe.exerciseId]
  const catScheme = settings.warmupSchemes[restCategory(current.ex)]
  const schemeSteps = ov?.warmupScheme ?? catScheme
  const smart = smartSteps(current.warmupCtx)
  const firstWork = rows.find((r) => r.type === 'work')
  const workKg = firstWork && num(firstWork.weight) > 0 ? displayToKg(num(firstWork.weight), wl) : current.sug.weight
  const regenWarmups = (v: PlannedView, mode: 'smart' | 'scheme' | 'none', scheme: WarmupStep[]) => {
    const sets = resolveWarmup({ mode, scheme, ctx: v.warmupCtx, workWeight: workKg, unit: wl })
    setRows(v.pe.exerciseId, (rs) => {
      const keep = rs.filter((r) => r.type === 'work' || r.done)
      const keptWarm = keep.filter((r) => r.type === 'warmup')
      // Abgehakte Aufwärmsätze bleiben; neue mit gleichem Gewicht entfallen
      const fresh: Row[] = dedupeWarmups(sets, keptWarm.map((r) => ({ weight: r.weight === '' ? null : displayToKg(num(r.weight), wl) }))).map((w) => ({
        id: uid(), type: 'warmup', weight: w.weight == null ? '' : String(kgToDisplay(w.weight, wl)), reps: String(w.reps),
        rir: '', done: false, minutes: '', km: '',
      }))
      return [...keptWarm, ...fresh, ...keep.filter((r) => r.type === 'work')]
    })
  }
  const pickWarmupMode = (m: 'smart' | 'scheme') => {
    void saveExerciseOverride(current.pe.exerciseId, { warmupMode: m })
    regenWarmups(current, m, schemeSteps)
  }
  const editScheme = (steps: WarmupStep[]) => {
    void saveExerciseOverride(current.pe.exerciseId, { warmupMode: 'scheme', warmupScheme: steps })
    regenWarmups(current, 'scheme', steps)
  }
  const resetScheme = () => {
    void saveExerciseOverride(current.pe.exerciseId, { warmupScheme: undefined })
    regenWarmups(current, 'scheme', catScheme)
  }
  const modeNow = effectiveMode(ov?.warmupMode, settings.warmupMode)

  // ---- Notizen ----
  const pKey = programNoteKey(program.id, current.pe.exerciseId)
  const noteValues: Partial<Record<NoteScope, string>> = {
    session: active.notes?.[current.pe.exerciseId], exercise: ov?.note, program: programNotes[pKey],
  }
  const saveNote = (scope: NoteScope, text: string) => {
    const id = current.pe.exerciseId
    if (scope === 'session') {
      setActive((a) => {
        if (!a) return a
        const notes = { ...(a.notes ?? {}) }
        if (text) notes[id] = text; else delete notes[id]
        return { ...a, notes }
      })
    } else if (scope === 'exercise') void saveExerciseOverride(id, { note: text || undefined })
    else void saveProgramNote(program.id, id, text)
  }

  const close = async () => { setClosed(true); await clearActiveWorkout() }
  const finish = async (mode: 'completed' | 'all') => {
    if (saving.current) return
    saving.current = true
    setSaveError(null)
    const exercises: LoggedExercise[] = []
    for (const v of views) {
      const take = (r: Row) => (mode === 'completed' ? r.done : v.ex.cardio ? num(r.minutes) > 0 : num(r.reps) > 0)
      const sets: LoggedSet[] = (active.rows[v.pe.exerciseId] ?? []).filter(take).map((r) => v.ex.cardio
        ? { reps: 0, weight: 0, minutes: num(r.minutes), km: displayToKm(num(r.km), settings.distanceUnit) }
        : r.type === 'warmup'
          ? { weight: displayToKg(num(r.weight), wl), reps: num(r.reps), warmup: true }
          : { weight: displayToKg(num(r.weight), wl), reps: num(r.reps), rir: r.rir === '' ? undefined : Number(r.rir) })
      if (sets.length) exercises.push({ exerciseId: v.pe.exerciseId, sets })
    }
    setClosed(true)
    try {
      const now = Date.now()
      const date = fmt(new Date(active.clock.startedAt))
      const notes = Object.fromEntries(Object.entries(active.notes ?? {}).filter(([id, t]) => t && exercises.some((e) => e.exerciseId === id)))
      // Einheit, Wochenstand und Löschen des laufenden Workouts atomar: schlägt etwas fehl, bleibt das Training erhalten.
      await db.transaction('rw', db.sessions, db.kv, db.programs, async () => {
        if (exercises.length) {
          await db.sessions.add({
            programId: program.id ?? null, dayIndex: dayIdx, date, finishedAt: now, week: curWeek, exercises,
            startedAt: active.clock.startedAt, durationSec: Math.floor(elapsedMs(active.clock, now) / 1000),
            ...(Object.keys(notes).length ? { notes } : {}),
          })
          if (slotIdx !== null && !foreign) await saveWeekState(markSlot(week, slotIdx, date))
          // Im Workout hinzugefügte (und trainierte) Übungen dauerhaft in den Trainingstag übernehmen
          const keep = (active.added ?? []).filter((pe) => exercises.some((e) => e.exerciseId === pe.exerciseId))
          if (keep.length && program.id != null) {
            const days = program.days.map((d, i) => (i !== dayIdx ? d : {
              ...d, exercises: [...d.exercises, ...keep.filter((pe) => !d.exercises.some((e) => e.exerciseId === pe.exerciseId))],
            }))
            await db.programs.update(program.id, { days })
          }
        }
        await clearActiveWorkout()
      })
    } catch (e) {
      setClosed(false)
      saving.current = false
      setSaveError(`Speichern fehlgeschlagen: ${e instanceof Error ? e.message : 'unbekannter Fehler'}. Das Training bleibt erhalten.`)
      return
    }
    nav('/workouts', { replace: true })
  }
  const discard = async () => { await close(); nav('/workouts', { replace: true }) }

  // Abschluss-Sheet: trainierte Muskeln, Dauer, Sätze, Volumen
  const trained = views.filter((v) => !v.ex.cardio && (active.rows[v.pe.exerciseId] ?? []).some((r) => r.done && r.type === 'work'))
  const primaryDone = [...new Set(trained.flatMap((v) => v.ex.primary))] as MuscleId[]
  const secondaryDone = [...new Set(trained.flatMap((v) => v.ex.secondary))].filter((m) => !primaryDone.includes(m)) as MuscleId[]
  const workDone = trained.flatMap((v) => (active.rows[v.pe.exerciseId] ?? []).filter((r) => r.done && r.type === 'work').map((r) => ({ r, f: volumeFactor(v.ex), e: v.ex, b: v.bodyLoad })))
  const volumeKg = workDone.filter(({ e }) => !noLoadStats(e)).reduce((a, { r, f, b }) => a + (displayToKg(num(r.weight), wl) + b) * num(r.reps) * f, 0)
  const durMin = Math.round(elapsedMs(active.clock, paused ? (active.clock.pausedAt as number) : Date.now()) / 60000)
  const noteBoxes = (['session', 'exercise', 'program'] as const).filter((sc) => noteValues[sc])

  return (
    <div className="max-w-2xl mx-auto px-4 pb-8" style={{ paddingBottom: pad ? '22rem' : undefined }}>
      {saveError && <div role="alert" className="mb-3 rounded-xl bg-danger/15 text-danger text-sm p-3">{saveError}</div>}
      <div ref={headerRef} className="sticky top-0 z-30 bg-bg -mx-4 px-4 pt-2 pb-2 safe-top border-b border-line">
        <WorkoutHeader clock={active.clock} onBack={() => nav('/workouts')} onMenu={() => setMenuOpen(true)}
          timer={<RestChip rest={rest} onDone={endRest} onOpen={() => setRestOpen(true)} />} />
      </div>

      <div className={paused ? 'pointer-events-none opacity-40' : undefined}>
        <ExerciseStrip current={current.pe.exerciseId} onSelect={selectExercise} onAdd={() => setAddOpen(true)}
          items={views.map((v) => ({ ex: v.ex, done: isComplete(active.rows[v.pe.exerciseId] ?? []) }))} />

        <div className="mt-2 mb-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold">{current.ex.name}</h1>
            {plan.isDeload && <span className="text-xs rounded-full bg-warn/20 text-warn px-2 py-1">Deload</span>}
          </div>
          {!current.ex.cardio && <p className="text-xs text-muted mt-0.5">{(current.ex.metric === 'time' ? de.logger.targetSeconds : de.logger.targetReps)(current.range.min, current.range.max)}</p>}
          {current.ex.assisted && <p className="text-xs text-muted mt-1">Das Gewicht ist die Unterstützung: weniger Gewicht ist schwerer.</p>}
          {usesBodyweight(current.ex) && (
            <p className="text-xs text-muted mt-1">
              {current.bodyLoad > 0
                ? `Körpergewichtsanteil ${Math.round(current.ex.bodyweight! * 100)} % = ${fmtLoad(kgToDisplay(current.bodyLoad, wl))} ${wl}, das Gewicht ist Zusatzgewicht.`
                : 'Trage dein Körpergewicht ein, dann zählen 1RM und Volumen mit Körpergewichtsanteil.'}
            </p>
          )}
          <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
            <ActionPill icon="guide" label="Info" onClick={() => setInfoOpen(true)} />
            {!current.ex.cardio && <ActionPill icon="warmup" label={de.logger.warmup} onClick={() => setWarmupOpen(true)} active={modeNow !== 'none'} />}
            <ActionPill icon="note" label={de.common.note} onClick={() => setNoteScope(noteBoxes[0] ?? 'session')} active={noteBoxes.length > 0} />
          </div>
        </div>

        <SetTable view={current} rows={rows} settings={settings} activePad={pad}
          onPatch={patch} onToggleDone={toggleDone} onToggleAll={toggleAll} onAdd={addSet} onDelete={deleteRow}
          onType={setTypeRow} onPad={(rowId, field) => setPad({ rowId, field })} />

        {noteBoxes.length > 0 && (
          <div className="mt-4 space-y-2" aria-label="Notizen">
            {noteBoxes.map((sc) => (
              <button key={sc} onClick={() => setNoteScope(sc)} className="w-full text-left rounded-xl bg-surface2/60 px-3 py-2 active:opacity-70">
                <span className="flex items-center gap-1.5 text-2xs uppercase tracking-wide text-muted"><Icon name="note" size={13} />{scopeLabel(sc)}</span>
                <span className="block text-sm mt-0.5 whitespace-pre-wrap break-words">{noteValues[sc]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {pad && padRow && (
        <NumpadSheet key={`${pad.rowId}-${pad.field}`} field={pad.field}
          label={pad.field === 'weight' ? `Gewicht (${wl})` : 'Wiederholungen'}
          value={pad.field === 'weight' ? padRow.weight : padRow.reps} rir={padRow.rir}
          onValue={(v) => patch(padRow.id, pad.field === 'weight' ? { weight: v } : { reps: v })}
          onRir={(v) => patch(padRow.id, { rir: v })} onConfirm={onConfirmPad} onClose={() => setPad(null)} />
      )}

      <ExercisePicker open={addOpen} onClose={() => setAddOpen(false)} exercises={all} onPick={addExercise} title="Übung hinzufügen" />

      <ExerciseInfoSheet ex={current.ex} open={infoOpen} onClose={() => setInfoOpen(false)} />

      <WarmupSheet open={warmupOpen} onClose={() => setWarmupOpen(false)} mode={modeNow} smart={smart} scheme={schemeSteps}
        hasOverride={!!ov?.warmupScheme} workWeight={workKg} equipment={current.ex.equipment} unit={wl} scale={ov?.weightScale}
        onMode={pickWarmupMode} onScheme={editScheme} onResetScheme={resetScheme} />

      <NoteSheet open={noteScope !== null} onClose={() => setNoteScope(null)} ex={current.ex}
        scopes={['session', 'exercise', 'program']} initialScope={noteScope ?? 'session'} values={noteValues} onSave={saveNote} />

      <SetTypeSheet open={typeRow !== null} current={rows.find((r) => r.id === typeRow)?.type ?? 'work'}
        onPick={changeType} onClose={() => setTypeRow(null)} />

      <RestSheet open={restOpen} onClose={() => setRestOpen(false)} rest={rest} onStop={endRest}
        onStart={(sec) => setRest({ endsAt: Date.now() + sec * 1000, total: sec })}
        onAdjust={(d) => setRest((r) => (r ? { endsAt: r.endsAt + d * 1000, total: Math.max(15, r.total + d) } : r))} />

      <WorkoutMenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} paused={paused}
        onPause={togglePause} onMinimize={() => nav('/workouts')} onFinish={() => setFinishOpen(true)} onDiscard={discard} />

      <FinishChoiceSheet open={finishOpen} onClose={() => setFinishOpen(false)} doneCount={doneCount} openCount={openCount}
        onChoose={(m) => { setFinishOpen(false); void finish(m) }} />

      <CompleteSheet open={completeOpen} onClose={() => setCompleteOpen(false)} primary={primaryDone} secondary={secondaryDone}
        stats={[
          { label: 'Dauer', value: `${durMin} min` }, { label: 'Sätze', value: String(workDone.length) },
          { label: 'Volumen', value: `${Math.round(kgToDisplay(volumeKg, wl)).toLocaleString('de-DE')} ${wl}` },
        ]}
        onSave={() => { setCompleteOpen(false); void finish('completed') }} />
    </div>
  )
}
