import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { LoggedExercise, LoggedSet, MuscleId, WarmupStep } from '../../types'
import { Button, Card, cx } from '../../components/ui'
import { Icon, type IconName } from '../../components/icons'
import {
  clearActiveWorkout, db, loadActiveWorkout, programNoteKey, saveActiveWorkout, saveExerciseOverride, saveProgramNote, saveWeekState,
  useProgramByParam, useAllExercises, useExerciseOverridesLoaded, useProgramNotes, useSessions, useSettingsLoaded, useWeekState,
} from '../../db/db'
import { DEFAULT_SETTINGS } from '../../db/db'
import { smartSteps, resolveWarmup, effectiveMode } from '../../engine/warmup'
import { restCategory } from '../../engine/rest'
import { volumeFactor } from '../../engine/stats'
import type { PlannedView } from '../../engine/plannedDay'
import { plannedDay } from '../../engine/plannedDay'
import { adaptWeight } from '../../engine/progression'
import { weekPlan } from '../../engine/periodization'
import { restSecondsFor } from '../../engine/rest'
import { historyUpTo, markSlot, maxReachedWeek } from '../../engine/weekCycle'
import { elapsedMs, pauseClock, resumeClock, startClock } from '../../engine/workoutClock'
import { displayToKg, displayToKm, kgToDisplay } from '../../utils/units'
import { todayStr } from '../../utils/dates'
import { ExerciseStrip } from './ExerciseStrip'
import { NumpadSheet } from './NumpadSheet'
import { RestBar, type RestState } from './RestBar'
import { SetTable, type PadField } from './SetTable'
import { SetTypeSheet } from './SetTypeSheet'
import { WorkoutHeader } from './WorkoutHeader'
import { ExerciseInfoSheet } from './ExerciseInfoSheet'
import { CompleteSheet, FinishChoiceSheet, WorkoutMenuSheet } from './LoggerSheets'
import { NoteSheet, scopeLabel, type NoteScope } from './sheets'
import { WarmupSheet } from './WarmupSheet'
import { uid, type ActiveWorkout, type Row } from './state'

const num = (s: string) => Number(s.replace(',', '.')) || 0
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
  const [pad, setPad] = useState<{ rowId: string; field: PadField } | null>(null)
  const [typeRow, setTypeRow] = useState<string | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [warmupOpen, setWarmupOpen] = useState(false)
  const [noteScope, setNoteScope] = useState<NoteScope | null>(null)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [celebrated, setCelebrated] = useState(false)
  const [closed, setClosed] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  const local = param.replace(/^p\d+-/, '')
  const slotIdx = local.startsWith('s') ? Number(local.slice(1)) : null
  const dayIdx = !program ? -1 : slotIdx !== null
    ? (program.weekSlots[slotIdx] === 'rest' ? -1 : (program.weekSlots[slotIdx] as number)) : Number(local.slice(1))
  // Programme aus der Bibliothek haben keinen eigenen Wochenstand: die höchste erreichte Woche zählt
  const foreign = !!program && !program.active
  const curWeek = foreign ? maxReachedWeek(program, sessions, 0) : week.week
  const day = program?.days[dayIdx]
  const plan = useMemo(
    () => (program?.config ? weekPlan(program.config, curWeek) : { isDeload: false, repShift: 0, rirDelta: 0, setsFactor: 1 }),
    [program, curWeek],
  )
  const lookup = useCallback((id: string) => all.find((e) => e.id === id), [all])
  const views = useMemo(
    () => (day ? plannedDay(day, plan, historyUpTo(sessions, program?.id, curWeek), lookup, settings, overrides) : []),
    [day, plan, sessions, program?.id, curWeek, lookup, settings, overrides],
  )

  useEffect(() => { loadActiveWorkout<ActiveWorkout>().then(setStored) }, [])

  // Start oder Wiederaufnahme
  useEffect(() => {
    if (stored === undefined || active || closed || !program || !views.length || !settingsLoaded || !overridesLoaded) return
    if (stored && stored.param === param && stored.programId === (program.id ?? null)) { setActive(stored); return }
    if (stored) return // anderes Workout läuft, siehe Hinweiskarte
    const wl = settings.weightUnit
    const rows: Record<string, Row[]> = {}
    for (const v of views) {
      const blank = { weight: '', reps: '', rir: '', done: false, minutes: '', km: '' }
      const warm: Row[] = v.warmups.map((w) => ({
        ...blank, id: uid(), type: 'warmup', weight: w.weight == null ? '' : String(kgToDisplay(w.weight, wl)), reps: String(w.reps),
      }))
      const work: Row[] = Array.from({ length: v.sets }, (_, i) => ({
        ...blank, id: uid(), type: 'work',
        weight: v.sug.weight == null ? '' : String(kgToDisplay(v.sug.weight, wl)),
        reps: v.ex.cardio ? '' : String(v.sug.reps),
        rir: v.ex.cardio ? '' : String(v.setRirs[i]),
      }))
      rows[v.pe.exerciseId] = [...warm, ...work]
    }
    setActive({ param, programId: program.id ?? null, clock: startClock(Date.now()), rows, current: views[0].pe.exerciseId })
  }, [stored, active, closed, program, views, param, settings.weightUnit, settingsLoaded, overridesLoaded])

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
    setRows(current.pe.exerciseId, (rs) => rs.map((r) => (r.id === rowId ? { ...r, ...p, ...(p.weight !== undefined ? { manual: true } : {}) } : r)))

  /** Nach einem abgehakten Arbeitssatz: Gewicht der noch offenen, nicht von Hand geänderten Folgesätze neu berechnen. */
  const adaptFollowing = (rs: Row[], doneRow: Row): Row[] => {
    if (doneRow.type !== 'work' || current.ex.cardio || doneRow.rir === '') return rs
    const idx = rs.findIndex((r) => r.id === doneRow.id)
    const w = displayToKg(num(doneRow.weight), wl)
    return rs.map((r, i) => {
      if (i <= idx || r.type !== 'work' || r.done || r.manual) return r
      const kg = adaptWeight({ weight: w, reps: num(doneRow.reps), rir: num(doneRow.rir) }, { reps: num(r.reps), rir: num(r.rir) }, current.ex.equipment)
      return kg === null ? r : { ...r, weight: String(kgToDisplay(kg, wl)) }
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
      const sec = restSecondsFor(current.ex, settings, row.type === 'warmup', overrides[current.pe.exerciseId]?.restSeconds)
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
    const sets = resolveWarmup({ mode, scheme, ctx: v.warmupCtx, workWeight: workKg })
    const fresh: Row[] = sets.map((w) => ({
      id: uid(), type: 'warmup', weight: w.weight == null ? '' : String(kgToDisplay(w.weight, wl)), reps: String(w.reps),
      rir: '', done: false, minutes: '', km: '',
    }))
    setRows(v.pe.exerciseId, (rs) => {
      const keep = rs.filter((r) => r.type === 'work' || r.done)
      return [...keep.filter((r) => r.type === 'warmup'), ...fresh, ...keep.filter((r) => r.type === 'work')]
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
    const exercises: LoggedExercise[] = []
    for (const v of views) {
      const take = (r: Row) => (mode === 'completed' ? r.done : v.ex.cardio ? num(r.minutes) > 0 : num(r.reps) > 0)
      const sets: LoggedSet[] = (active.rows[v.pe.exerciseId] ?? []).filter(take).map((r) => v.ex.cardio
        ? { reps: 0, weight: 0, minutes: num(r.minutes), km: displayToKm(num(r.km), settings.distanceUnit) }
        : r.type === 'warmup'
          ? { weight: displayToKg(num(r.weight), wl), reps: num(r.reps), warmup: true }
          : { weight: displayToKg(num(r.weight), wl), reps: num(r.reps), rir: Number(r.rir) })
      if (sets.length) exercises.push({ exerciseId: v.pe.exerciseId, sets })
    }
    await close()
    if (exercises.length) {
      const date = todayStr()
      const now = Date.now()
      const notes = Object.fromEntries(Object.entries(active.notes ?? {}).filter(([id, t]) => t && exercises.some((e) => e.exerciseId === id)))
      await db.sessions.add({
        programId: program.id ?? null, dayIndex: dayIdx, date, finishedAt: now, week: curWeek, exercises,
        startedAt: active.clock.startedAt, durationSec: Math.floor(elapsedMs(active.clock, now) / 1000),
        ...(Object.keys(notes).length ? { notes } : {}),
      })
      if (slotIdx !== null) await saveWeekState(markSlot(week, slotIdx, date))
    }
    nav('/workouts', { replace: true })
  }
  const discard = async () => { await close(); nav('/workouts', { replace: true }) }

  // Abschluss-Sheet: trainierte Muskeln, Dauer, Sätze, Volumen
  const trained = views.filter((v) => !v.ex.cardio && (active.rows[v.pe.exerciseId] ?? []).some((r) => r.done && r.type === 'work'))
  const primaryDone = [...new Set(trained.flatMap((v) => v.ex.primary))] as MuscleId[]
  const secondaryDone = [...new Set(trained.flatMap((v) => v.ex.secondary))].filter((m) => !primaryDone.includes(m)) as MuscleId[]
  const workDone = trained.flatMap((v) => (active.rows[v.pe.exerciseId] ?? []).filter((r) => r.done && r.type === 'work').map((r) => ({ r, f: volumeFactor(v.ex) })))
  const volumeKg = workDone.reduce((a, { r, f }) => a + displayToKg(num(r.weight), wl) * num(r.reps) * f, 0)
  const durMin = Math.round(elapsedMs(active.clock, paused ? (active.clock.pausedAt as number) : Date.now()) / 60000)
  const noteBoxes = (['session', 'exercise', 'program'] as const).filter((sc) => noteValues[sc])

  return (
    <div className="max-w-2xl mx-auto px-4 pb-8" style={{ paddingBottom: pad ? '22rem' : undefined }}>
      <div className="sticky top-0 z-30 bg-bg -mx-4 px-4 pt-2 pb-2 safe-top border-b border-line">
        <WorkoutHeader clock={active.clock} onBack={() => nav('/workouts')} onMenu={() => setMenuOpen(true)} />
        {rest && !paused && (
          <RestBar rest={rest} onDone={() => setRest(null)}
            onAdjust={(d) => setRest((r) => (r ? { endsAt: r.endsAt + d * 1000, total: Math.max(15, r.total + d) } : r))} />
        )}
      </div>

      <div className={paused ? 'pointer-events-none opacity-40' : undefined}>
        <ExerciseStrip current={current.pe.exerciseId} onSelect={selectExercise}
          items={views.map((v) => ({ ex: v.ex, done: isComplete(active.rows[v.pe.exerciseId] ?? []) }))} />

        <div className="mt-2 mb-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold">{current.ex.name}</h1>
            {plan.isDeload && <span className="text-xs rounded-full bg-amber-500/20 text-amber-500 px-2 py-1">Deload</span>}
          </div>
          <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
            <ActionPill icon="guide" label="Info" onClick={() => setInfoOpen(true)} />
            {!current.ex.cardio && <ActionPill icon="warmup" label="Warm-up" onClick={() => setWarmupOpen(true)} active={modeNow !== 'none'} />}
            <ActionPill icon="note" label="Note" onClick={() => setNoteScope(noteBoxes[0] ?? 'session')} active={noteBoxes.length > 0} />
          </div>
        </div>

        <SetTable view={current} rows={rows} settings={settings} activePad={pad}
          onPatch={patch} onToggleDone={toggleDone} onToggleAll={toggleAll} onAdd={addSet} onDelete={deleteRow}
          onType={setTypeRow} onPad={(rowId, field) => setPad({ rowId, field })} />

        {noteBoxes.length > 0 && (
          <div className="mt-4 space-y-2" aria-label="Notizen">
            {noteBoxes.map((sc) => (
              <button key={sc} onClick={() => setNoteScope(sc)} className="w-full text-left rounded-xl bg-surface2/60 px-3 py-2 active:opacity-70">
                <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted"><Icon name="note" size={13} />{scopeLabel(sc)}</span>
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

      <ExerciseInfoSheet ex={current.ex} open={infoOpen} onClose={() => setInfoOpen(false)} />

      <WarmupSheet open={warmupOpen} onClose={() => setWarmupOpen(false)} mode={modeNow} smart={smart} scheme={schemeSteps}
        hasOverride={!!ov?.warmupScheme} workWeight={workKg} equipment={current.ex.equipment} unit={wl}
        onMode={pickWarmupMode} onScheme={editScheme} onResetScheme={resetScheme} />

      <NoteSheet open={noteScope !== null} onClose={() => setNoteScope(null)} ex={current.ex}
        scopes={['session', 'exercise', 'program']} initialScope={noteScope ?? 'session'} values={noteValues} onSave={saveNote} />

      <SetTypeSheet open={typeRow !== null} current={rows.find((r) => r.id === typeRow)?.type ?? 'work'}
        onPick={changeType} onClose={() => setTypeRow(null)} />

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
