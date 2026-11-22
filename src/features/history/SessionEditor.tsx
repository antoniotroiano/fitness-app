import { metricLabel } from '../../engine/metric'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Exercise, LoggedExercise, Session } from '../../types'
import { BottomBar, BottomSheet, Button, Card, LinkButton, Page, inputCls } from '../../components/ui'
import { Icon } from '../../components/icons'
import {
  deleteSession, saveSessionEdit, useAllExercises, useExerciseOverrides, usePrograms, useSession, useSessions, useSettings, useWeekState, useWeightsLoaded,
} from '../../db/db'
import { canFreeSlot, moveSessionToDate, sessionTime, setSessionDuration, setSessionStartTime } from '../../engine/history'
import { bodyLoadOf, bodyweightAt } from '../../engine/bodyweight'
import { loadSteps, previousSets } from '../../engine/progression'
import { nextSegment } from '../../engine/setTypes'
import { weekLabel, weekOptions } from '../../engine/weekCycle'
import { displayToKg, kgToDisplay } from '../../utils/units'
import { todayStr, formatDate } from '../../utils/dates'
import { ExercisePicker } from '../wizard/shared'
import { NumpadSheet } from '../workouts/NumpadSheet'
import { SetTable, type PadField, type Side } from '../workouts/SetTable'
import { SetTypeSheet, type SetTypeChoice } from '../workouts/SetTypeSheet'
import { isSegment, uid, withSides, type Row, type SideRow } from '../workouts/state'
import { num, rowHasValue, rowToSet, setToRow } from '../workouts/sessionRows'
import { sessionProgram, sessionTitle } from './format'

interface DraftExercise { exerciseId: string; rows: Row[] }
interface Draft { date: string; time: string; durationMin: string; week: number; notes: Record<string, string>; exercises: DraftExercise[] }

export default function SessionEditorPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const session = useSession(Number(id))
  if (session === undefined) return <Page title="Verlauf" back={() => nav('/history')}><div className="text-sm text-muted">Lädt …</div></Page>
  if (session === null) return <Page title="Verlauf" back={() => nav('/history', { replace: true })}><Card>Diese Einheit gibt es nicht (mehr).</Card></Page>
  return <SessionEditor key={session.id} session={session} />
}

function SessionEditor({ session }: { session: Session }) {
  const nav = useNavigate()
  const settings = useSettings()
  const wl = settings.weightUnit
  const units = useMemo(() => ({ weight: wl, distance: settings.distanceUnit }), [wl, settings.distanceUnit])
  const all = useAllExercises()
  const overrides = useExerciseOverrides()
  const programs = usePrograms()
  const sessions = useSessions()
  const weights = useWeightsLoaded()
  const week = useWeekState()
  const lookup = (exId: string) => all.find((e) => e.id === exId)

  const initial = useMemo<Draft>(() => ({
    date: session.date, time: sessionTime(session), durationMin: session.durationSec != null ? String(Math.round(session.durationSec / 60)) : '', week: session.week, notes: { ...(session.notes ?? {}) },
    exercises: session.exercises.map((e) => ({
      exerciseId: e.exerciseId, rows: e.sets.map((s) => setToRow(s, lookup(e.exerciseId) ?? { cardio: false }, units)),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [session.id])
  const [draft, setDraft] = useState<Draft>(initial)
  const [pad, setPad] = useState<{ exId: string; rowId: string; field: PadField; side?: Side } | null>(null)
  const [typeRow, setTypeRow] = useState<{ exId: string; rowId: string } | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [backOpen, setBackOpen] = useState(false)
  const [removeEx, setRemoveEx] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const program = sessionProgram(session, programs)
  const title = sessionTitle(session, programs)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const today = todayStr()

  const setRows = (exId: string, fn: (r: Row[]) => Row[]) =>
    setDraft((d) => ({ ...d, exercises: d.exercises.map((e) => (e.exerciseId === exId ? { ...e, rows: fn(e.rows) } : e)) }))
  const sidesOf = (exId: string) => !!draft.exercises.find((e) => e.exerciseId === exId)?.rows.some((r) => r.right)

  /** Links geändert: die rechte Seite übernimmt den Wert, solange sie noch den alten linken hatte (wie im Logger) */
  const syncRight = (r: Row, p: Partial<Row>): Partial<Row> => {
    if (!r.right) return {}
    const right = { ...r.right }
    for (const k of ['weight', 'reps', 'rir'] as const) if (p[k] !== undefined && right[k] === r[k]) right[k] = p[k]
    return { right }
  }
  const patch = (exId: string, rowId: string, p: Partial<Row>) =>
    setRows(exId, (rs) => rs.map((r) => (r.id === rowId ? { ...r, ...p, ...syncRight(r, p) } : r)))
  const patchRight = (exId: string, rowId: string, p: Partial<SideRow>) =>
    setRows(exId, (rs) => rs.map((r) => (r.id === rowId && r.right ? { ...r, right: { ...r.right, ...p } } : r)))

  const addSet = (exId: string) => setRows(exId, (rs) => {
    const last = [...rs].reverse().find((r) => r.type === 'work') ?? rs.at(-1)
    const base: Row = last ?? { id: '', type: 'work', weight: '', reps: '', rir: '', done: false, minutes: '', km: '' }
    const row = { ...base, id: uid(), type: 'work' as const, failure: undefined, partial: undefined }
    return [...rs, row.right ? { ...row, right: { ...row.right, partial: undefined } } : row]
  })
  const deleteRow = (exId: string, rowId: string) => {
    setRows(exId, (rs) => {
      const gone = new Set([rowId])
      const i = rs.findIndex((r) => r.id === rowId)
      if (rs[i]?.type === 'work') for (let k = i + 1; rs[k] && isSegment(rs[k]); k++) gone.add(rs[k].id)
      return rs.filter((r) => !gone.has(r.id))
    })
    setPad((p) => (p?.rowId === rowId ? null : p))
  }

  const changeType = (t: SetTypeChoice) => {
    const target = typeRow
    setTypeRow(null)
    if (!target) return
    const { exId, rowId } = target
    const ex = lookup(exId)
    const row = draft.exercises.find((e) => e.exerciseId === exId)?.rows.find((r) => r.id === rowId)
    if (!ex || !row) return
    const on = sidesOf(exId)
    const typed = (p: Partial<Row>) => setRows(exId, (rs) => rs.map((r) => {
      if (r.id !== rowId) return r
      const next = withSides({ ...r, ...p }, on)
      return next.right && p.rir !== undefined ? { ...next, right: { ...next.right, rir: p.rir } } : next
    }))
    if (t === 'warmup') { typed({ type: 'warmup', rir: '', failure: undefined }); return }
    if (t === 'work') { typed({ type: 'work', failure: undefined, rir: row.type === 'warmup' || row.failure ? '' : row.rir }); return }
    if (t === 'failure') { typed({ type: 'work', failure: true, rir: '0' }); return }
    const kind = t === 'addSegment' ? (row.type === 'myo' ? 'myo' : 'drop') : t
    const { snap } = loadSteps(ex.equipment, wl, overrides[exId]?.weightScale)
    setRows(exId, (rs) => {
      let end = rs.findIndex((r) => r.id === rowId)
      if (end < 0) return rs
      while (rs[end + 1] && isSegment(rs[end + 1])) end++
      const prev = rs[end]
      const seg = nextSegment(kind, { weight: prev.weight === '' ? null : displayToKg(num(prev.weight), wl), reps: num(prev.reps), segment: isSegment(prev) }, snap)
      const segRow: Row = {
        id: uid(), type: kind, weight: seg.weight == null ? '' : String(kgToDisplay(seg.weight, wl)),
        reps: seg.reps == null ? '' : String(seg.reps), rir: '', done: false, minutes: '', km: '',
      }
      return [...rs.slice(0, end + 1), segRow, ...rs.slice(end + 1)]
    })
  }

  const addExercise = (ex: Exercise) => {
    setAddOpen(false)
    if (draft.exercises.some((e) => e.exerciseId === ex.id)) return
    const blank: Row = { id: uid(), type: 'work', weight: '', reps: '', rir: '', done: false, minutes: '', km: '' }
    setDraft((d) => ({ ...d, exercises: [...d.exercises, { exerciseId: ex.id, rows: [blank] }] }))
  }
  const removeExercise = (exId: string) => {
    setRemoveEx(null)
    setPad(null)
    setDraft((d) => ({ ...d, exercises: d.exercises.filter((e) => e.exerciseId !== exId) }))
  }

  const save = async () => {
    setError(null)
    if (draft.date > today) { setError('Das Datum liegt in der Zukunft.'); return }
    if (!draft.date) { setError('Bitte ein Datum wählen.'); return }
    const exercises: LoggedExercise[] = []
    for (const e of draft.exercises) {
      const ex = lookup(e.exerciseId)
      if (!ex) { // unbekannte Übung (z. B. gelöschte eigene): Sätze unverändert erhalten
        const old = session.exercises.find((o) => o.exerciseId === e.exerciseId)
        if (old) exercises.push(old)
        continue
      }
      const bodyLoad = bodyLoadOf(ex, weights?.length ? bodyweightAt(weights, draft.date) : undefined)
      const sets = e.rows.filter((r) => rowHasValue(r, ex)).map((r) => rowToSet(r, ex, bodyLoad, units))
      if (sets.length) exercises.push({ exerciseId: e.exerciseId, sets })
    }
    if (!exercises.length) { setError('Die Einheit hat keinen Satz mit Wiederholungen. Zum Entfernen „Einheit löschen“ wählen.'); return }
    let next: Session = { ...session, exercises, week: draft.week }
    const notes = Object.fromEntries(Object.entries(draft.notes).map(([k, v]) => [k, v.trim()]).filter(([k, v]) => v && exercises.some((e) => e.exerciseId === k)))
    if (Object.keys(notes).length) next.notes = notes; else delete next.notes
    next = moveSessionToDate(next, draft.date)
    if (draft.time !== initial.time && /^\d{2}:\d{2}$/.test(draft.time)) next = setSessionStartTime(next, Number(draft.time.slice(0, 2)), Number(draft.time.slice(3)))
    if (draft.durationMin !== initial.durationMin) {
      const min = Number(draft.durationMin.replace(',', '.'))
      next = setSessionDuration(next, draft.durationMin.trim() === '' || !(min > 0) ? null : Math.round(min * 60))
    }
    setBusy(true)
    try {
      await saveSessionEdit(next)
      nav('/history', { replace: true })
    } catch (e) {
      setBusy(false)
      setError(`Speichern fehlgeschlagen: ${e instanceof Error ? e.message : 'unbekannter Fehler'}`)
    }
  }
  const remove = async (freeSlot: boolean) => {
    setDelOpen(false)
    await deleteSession(session.id as number, freeSlot)
    nav('/history', { replace: true })
  }

  // Wochenauswahl des Programms; eine Woche außerhalb der Liste (z. B. nach Blocklängen-Änderung) bleibt wählbar
  const weekChoices = !program ? [] : (() => {
    const o = weekOptions(program, sessions, week.week)
    return o.some((x) => x.week === session.week) ? o : [...o, { week: session.week, block: 0, label: weekLabel(program, session.week).replace(/ · Block \d+$/, '') }]
  })()
  const freeable = canFreeSlot(week, program, session)
  const goBack = () => (dirty ? setBackOpen(true) : nav('/history'))

  const padEx = pad ? draft.exercises.find((e) => e.exerciseId === pad.exId) : undefined
  const padRow = pad ? padEx?.rows.find((r) => r.id === pad.rowId) : undefined

  return (
    <Page title={title} back={goBack}>
      <div style={{ paddingBottom: pad ? '20rem' : undefined }} className="space-y-4">
        <Card className="space-y-3">
          <div className="text-xs text-muted">
            {program ? `${program.name} · ${weekLabel(program, session.week)}` : session.programId === null ? 'Ohne Programm (Import)' : 'Programm nicht mehr vorhanden'}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-muted">Datum
              <input type="date" className={`${inputCls} mt-1`} value={draft.date} max={today} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
            </label>
            <label className="block text-xs text-muted">Startzeit
              <input type="time" className={`${inputCls} mt-1`} value={draft.time} onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))} />
            </label>
          </div>
          {program && (
            <label className="block text-xs text-muted">Programmwoche
              <select className={`${inputCls} mt-1`} value={draft.week} onChange={(e) => setDraft((d) => ({ ...d, week: Number(e.target.value) }))}>
                {weekChoices.map((o) => (
                  <option key={o.week} value={o.week}>{o.label}{o.block > 0 ? ` · Block ${o.block + 1}` : ''}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-xs text-muted">Dauer (Minuten, leer = unbekannt)
            <input inputMode="numeric" className={`${inputCls} mt-1`} value={draft.durationMin} placeholder="z. B. 60"
              onChange={(e) => setDraft((d) => ({ ...d, durationMin: e.target.value.replace(/[^\d]/g, '') }))} />
          </label>
        </Card>

        {draft.exercises.map((e) => {
          const ex = lookup(e.exerciseId)
          if (!ex) return <Card key={e.exerciseId} className="text-sm text-muted">Übung „{e.exerciseId}“ ist nicht mehr vorhanden, ihre Sätze bleiben unverändert.</Card>
          const before = sessions.filter((o) => o.id !== session.id && (o.date < session.date || (o.date === session.date && o.finishedAt < session.finishedAt)))
          const view = { ex, pe: { exerciseId: e.exerciseId }, previous: previousSets(before, e.exerciseId) }
          return (
            <section key={e.exerciseId} className="space-y-2" aria-label={ex.name}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{ex.name}</h2>
                {removeEx === e.exerciseId
                  ? <Button variant="danger" className="!py-1.5 !px-3 text-xs" onClick={() => removeExercise(e.exerciseId)}>Wirklich entfernen?</Button>
                  : <button onClick={() => setRemoveEx(e.exerciseId)} aria-label={`${ex.name} aus der Einheit entfernen`} className="text-muted active:opacity-70 p-1"><Icon name="trash" size={18} /></button>}
              </div>
              <Card className="!p-2">
                <SetTable view={view} plain rows={e.rows} settings={settings} activePad={pad && pad.exId === e.exerciseId ? pad : null}
                  onPatch={(rowId, p) => patch(e.exerciseId, rowId, p)} onToggleDone={() => {}} onToggleAll={() => {}}
                  onAdd={() => addSet(e.exerciseId)} onDelete={(rowId) => deleteRow(e.exerciseId, rowId)}
                  onType={(rowId) => setTypeRow({ exId: e.exerciseId, rowId })}
                  onPad={(rowId, field, side) => setPad({ exId: e.exerciseId, rowId, field, side })} />
              </Card>
              <textarea aria-label={`Notiz zu ${ex.name}`} rows={2} placeholder="Notiz zur Übung" className={inputCls} value={draft.notes[e.exerciseId] ?? ''}
                onChange={(ev) => setDraft((d) => ({ ...d, notes: { ...d.notes, [e.exerciseId]: ev.target.value } }))} />
            </section>
          )
        })}

        <LinkButton onClick={() => setAddOpen(true)} className="w-full py-2"><span className="text-lg leading-none">+</span> Übung hinzufügen</LinkButton>

        {error && <div role="alert" className="rounded-xl bg-danger/15 text-danger text-sm p-3">{error}</div>}
        <Button variant="danger" className="w-full" onClick={() => setDelOpen(true)}>Einheit löschen</Button>
      </div>

      {!pad && (
        <BottomBar>
          <Button className="w-full" disabled={!dirty || busy} onClick={() => void save()}>{busy ? 'Speichert …' : 'Änderungen speichern'}</Button>
        </BottomBar>
      )}

      {pad && padRow && padEx && (() => {
        const r = pad.side === 'r' ? padRow.right : undefined
        const vals = r ?? padRow
        const set = (p: Partial<SideRow>) => (r ? patchRight(pad.exId, padRow.id, p) : patch(pad.exId, padRow.id, p))
        const sideLabel = !padRow.right ? '' : r ? ' · rechts' : ' · links'
        const ex = lookup(pad.exId)
        return (
          <NumpadSheet key={`${pad.rowId}-${pad.side ?? ''}-${pad.field}`} field={pad.field}
            label={`${pad.field === 'weight' ? `Gewicht (${wl})` : metricLabel(ex?.metric)}${sideLabel}`}
            value={pad.field === 'weight' ? vals.weight : vals.reps} rir={vals.rir} showRir={!isSegment(padRow) && padRow.type !== 'warmup'}
            partial={vals.partial ?? ''} onPartial={(v) => set({ partial: v })}
            onValue={(v) => set(pad.field === 'weight' ? { weight: v } : { reps: v })}
            onRir={(v) => set({ rir: v })}
            onConfirm={() => (pad.field === 'weight' ? setPad({ ...pad, field: 'reps' }) : setPad(null))} onClose={() => setPad(null)} />
        )
      })()}

      <SetTypeSheet open={typeRow !== null} onClose={() => setTypeRow(null)} onPick={changeType}
        row={typeRow ? draft.exercises.find((e) => e.exerciseId === typeRow.exId)?.rows.find((r) => r.id === typeRow.rowId) : undefined} />

      <ExercisePicker open={addOpen} onClose={() => setAddOpen(false)} exercises={all} onPick={addExercise} title="Übung hinzufügen" />

      <BottomSheet open={delOpen} onClose={() => setDelOpen(false)} title="Einheit löschen">
        <div className="space-y-2">
          <p className="text-sm text-muted">{title} vom {formatDate(session.date, { day: '2-digit', month: 'long', year: 'numeric' })} wird endgültig gelöscht. Progression, 1RM und Statistiken rechnen ohne sie weiter.</p>
          {freeable ? (
            <>
              <Button variant="danger" className="w-full" onClick={() => void remove(true)}>Löschen, Tag wieder freigeben</Button>
              <Button variant="ghost" className="w-full" onClick={() => void remove(false)}>Löschen, Tag bleibt erledigt</Button>
              <p className="text-xs text-muted px-1">Freigeben: der Trainingstag steht in dieser Woche wieder offen und kann neu trainiert werden.</p>
            </>
          ) : <Button variant="danger" className="w-full" onClick={() => void remove(false)}>Endgültig löschen</Button>}
          <Button variant="ghost" className="w-full" onClick={() => setDelOpen(false)}>Abbrechen</Button>
        </div>
      </BottomSheet>

      <BottomSheet open={backOpen} onClose={() => setBackOpen(false)} title="Änderungen verwerfen?">
        <div className="space-y-2">
          <p className="text-sm text-muted">Die Änderungen an dieser Einheit sind noch nicht gespeichert.</p>
          <Button variant="danger" className="w-full" onClick={() => nav('/history')}>Verwerfen</Button>
          <Button variant="ghost" className="w-full" onClick={() => setBackOpen(false)}>Weiter bearbeiten</Button>
        </div>
      </BottomSheet>
    </Page>
  )
}
