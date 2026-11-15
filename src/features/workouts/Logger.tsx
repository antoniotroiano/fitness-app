import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { LoggedExercise, LoggedSet } from '../../types'
import { BottomSheet, Button, Card } from '../../components/ui'
import {
  clearActiveWorkout, db, loadActiveWorkout, saveActiveWorkout, saveWeekState,
  useActiveProgram, useAllExercises, useSessions, useSettings, useWeekState,
} from '../../db/db'
import { plannedDay } from '../../engine/plannedDay'
import { weekPlan } from '../../engine/periodization'
import { restSecondsFor } from '../../engine/rest'
import { markSlot } from '../../engine/weekCycle'
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
import { uid, type ActiveWorkout, type Row } from './state'

const num = (s: string) => Number(s.replace(',', '.')) || 0

export default function Logger() {
  const { slot: param = 's0' } = useParams()
  const nav = useNavigate()
  const program = useActiveProgram()
  const week = useWeekState()
  const sessions = useSessions()
  const settings = useSettings()
  const all = useAllExercises()

  // undefined = lädt noch, null = nichts gespeichert
  const [stored, setStored] = useState<ActiveWorkout | null | undefined>(undefined)
  const [active, setActive] = useState<ActiveWorkout | null>(null)
  const [rest, setRest] = useState<RestState | null>(null)
  const [pad, setPad] = useState<{ rowId: string; field: PadField } | null>(null)
  const [typeRow, setTypeRow] = useState<string | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [closed, setClosed] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  const slotIdx = param.startsWith('s') ? Number(param.slice(1)) : null
  const dayIdx = !program ? -1 : slotIdx !== null
    ? (program.weekSlots[slotIdx] === 'rest' ? -1 : (program.weekSlots[slotIdx] as number)) : Number(param.slice(1))
  const day = program?.days[dayIdx]
  const plan = useMemo(
    () => (program?.config ? weekPlan(program.config, week.week) : { isDeload: false, repShift: 0, rirDelta: 0, setsFactor: 1 }),
    [program, week.week],
  )
  const lookup = useCallback((id: string) => all.find((e) => e.id === id), [all])
  const views = useMemo(
    () => (day ? plannedDay(day, plan, sessions, lookup, settings.warmupsEnabled) : []),
    [day, plan, sessions, lookup, settings.warmupsEnabled],
  )

  useEffect(() => { loadActiveWorkout<ActiveWorkout>().then(setStored) }, [])

  // Start oder Wiederaufnahme
  useEffect(() => {
    if (stored === undefined || active || closed || !program || !views.length) return
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
  }, [stored, active, closed, program, views, param, settings.weightUnit])

  // Zwischenspeichern, damit Reload oder App-Wechsel nichts verlieren
  useEffect(() => { if (active && !closed) void saveActiveWorkout(active) }, [active, closed])

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
    setRows(current.pe.exerciseId, (rs) => rs.map((r) => (r.id === rowId ? { ...r, ...p } : r)))

  const isComplete = (rs: Row[]) => rs.length > 0 && rs.every((r) => r.done)
  const toggleDone = (row: Row) => {
    const turningOn = !row.done
    const completes = turningOn && isComplete(rows.map((r) => (r.id === row.id ? { ...r, done: true } : r)))
    setActive((a) => {
      if (!a) return a
      const id = current.pe.exerciseId
      const nextRows = { ...a.rows, [id]: (a.rows[id] ?? []).map((r) => (r.id === row.id ? { ...r, done: !r.done } : r)) }
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
      const sec = restSecondsFor(current.ex, settings, row.type === 'warmup')
      setRest({ endsAt: Date.now() + sec * 1000, total: sec })
    }
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

  const close = async () => { setClosed(true); await clearActiveWorkout() }
  const finish = async () => {
    const exercises: LoggedExercise[] = []
    for (const v of views) {
      const sets: LoggedSet[] = (active.rows[v.pe.exerciseId] ?? []).filter((r) => r.done).map((r) => v.ex.cardio
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
      await db.sessions.add({
        programId: program.id ?? null, dayIndex: dayIdx, date, finishedAt: now, week: week.week, exercises,
        startedAt: active.clock.startedAt, durationSec: Math.floor(elapsedMs(active.clock, now) / 1000),
      })
      if (slotIdx !== null) await saveWeekState(markSlot(week, slotIdx, date))
    }
    nav('/workouts', { replace: true })
  }
  const discard = async () => { await close(); nav('/workouts', { replace: true }) }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-8" style={{ paddingBottom: pad ? '22rem' : undefined }}>
      <div className="sticky top-0 z-30 bg-bg/95 backdrop-blur -mx-4 px-4 pt-3 pb-2 safe-top border-b border-line">
        <WorkoutHeader clock={active.clock} onBack={() => nav('/workouts')} onTogglePause={togglePause} onFinish={() => setFinishOpen(true)} />
        {rest && !paused && (
          <RestBar rest={rest} onDone={() => setRest(null)}
            onAdjust={(d) => setRest((r) => (r ? { endsAt: r.endsAt + d * 1000, total: Math.max(15, r.total + d) } : r))} />
        )}
      </div>

      <div className={paused ? 'pointer-events-none opacity-40' : undefined}>
        <ExerciseStrip current={current.pe.exerciseId} onSelect={selectExercise}
          items={views.map((v) => ({ ex: v.ex, done: isComplete(active.rows[v.pe.exerciseId] ?? []) }))} />

        <div className="mt-2 mb-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold">{current.ex.name}</h1>
            <button onClick={() => setInfoOpen(true)} aria-label="Übungs-Info"
              className="shrink-0 rounded-full border border-line bg-surface2 px-3 py-1 text-xs">ⓘ Info</button>
            {plan.isDeload && <span className="text-xs rounded-full bg-amber-500/20 text-amber-500 px-2 py-1">Deload</span>}
          </div>
          <div className="text-xs text-muted">
            {current.ex.cardio ? 'Cardio' : `Ziel ${current.range.min}–${current.range.max} Wdh · RIR ${current.rir}${current.sug.weight ? ` · Vorschlag ${kgToDisplay(current.sug.weight, wl)} ${wl} × ${current.sug.reps}` : ' · Startgewicht selbst wählen'}`}
          </div>
        </div>

        <SetTable view={current} rows={rows} settings={settings} activePad={pad}
          onPatch={patch} onToggleDone={toggleDone} onAdd={addSet} onDelete={deleteRow}
          onType={setTypeRow} onPad={(rowId, field) => setPad({ rowId, field })} />
      </div>

      {pad && padRow && (
        <NumpadSheet key={`${pad.rowId}-${pad.field}`} field={pad.field}
          label={pad.field === 'weight' ? `Gewicht (${wl})` : 'Wiederholungen'}
          value={pad.field === 'weight' ? padRow.weight : padRow.reps} rir={padRow.rir}
          onValue={(v) => patch(padRow.id, pad.field === 'weight' ? { weight: v } : { reps: v })}
          onRir={(v) => patch(padRow.id, { rir: v })} onConfirm={onConfirmPad} onClose={() => setPad(null)} />
      )}

      <ExerciseInfoSheet ex={current.ex} open={infoOpen} onClose={() => setInfoOpen(false)} />

      <SetTypeSheet open={typeRow !== null} current={rows.find((r) => r.id === typeRow)?.type ?? 'work'}
        onPick={changeType} onClose={() => setTypeRow(null)} />

      <BottomSheet open={finishOpen} onClose={() => { setFinishOpen(false); setConfirmDiscard(false) }} title="Workout beenden">
        <p className="text-sm text-muted mb-4">
          {doneCount} Sätze abgehakt{openCount > 0 ? `, ${openCount} offen. Offene Sätze werden nicht gespeichert.` : '.'}
        </p>
        <div className="space-y-2">
          <Button className="w-full" onClick={finish}>Abschließen und speichern</Button>
          <Button variant="danger" className="w-full" onClick={() => (confirmDiscard ? discard() : setConfirmDiscard(true))}>
            {confirmDiscard ? 'Wirklich verwerfen? Nichts wird gespeichert' : 'Abbrechen und verwerfen'}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => { setFinishOpen(false); setConfirmDiscard(false) }}>Zurück zum Workout</Button>
        </div>
      </BottomSheet>
    </div>
  )
}
