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
import { splitsSides, weakerSide } from '../../engine/sides'
import { prefillSets } from '../../engine/prefill'
import { platesFor } from '../../engine/plates'
import { usesBodyweight } from '../../engine/bodyweight'

import type { PlannedView } from '../../engine/plannedDay'
import { deloadSessionOf, plannedDay } from '../../engine/plannedDay'
import { adaptNextSets, loadSteps } from '../../engine/progression'
import { MYO_REST_SEC, nextSegment } from '../../engine/setTypes'
import { removeFromDay, replaceInDay, swapEntry } from '../../engine/dayEdit'
import { alternatives, recommendable } from '../../engine/swap'
import { linksOf, nextInSuperset, setSupersetLink, supersetMembers, withLinks } from '../../engine/superset'
import { neutralWeek, weekPlan } from '../../engine/periodization'
import { isRepless, METRIC_RANGE } from '../../engine/metric'
import { restSecondsFor } from '../../engine/rest'
import { historyUpTo, markSlot, maxReachedWeek, weekLabel } from '../../engine/weekCycle'
import { elapsedMs, pauseClock, resumeClock, startClock } from '../../engine/workoutClock'
import { displayToKg, kgToDisplay } from '../../utils/units'
import { fmt, formatDate, parse, todayStr } from '../../utils/dates'
import { ExerciseStrip } from './ExerciseStrip'
import { NumpadSheet } from './NumpadSheet'
import { RestChip, RestSheet, type RestState } from './RestTimer'
import { SetTable, type PadField, type Side } from './SetTable'
import { SetTypeSheet, type SetTypeChoice } from './SetTypeSheet'
import { WorkoutHeader } from './WorkoutHeader'
import { ExerciseInfoSheet } from './ExerciseInfoSheet'
import { CompleteSheet, ExerciseActionsSheet, FinishChoiceSheet, SuggestionSheet, SupersetSheet, WorkoutMenuSheet } from './LoggerSheets'
import { NoteSheet, scopeLabel, type NoteScope } from './sheets'
import { WarmupSheet } from './WarmupSheet'
import { isSegment, uid, withSides, type ActiveWorkout, type Row, type SideRow } from './state'
import { num, rowToSet, sideSet } from './sessionRows'
import { de } from '../../i18n/de'
import { progressionNote, reasonText } from './progressionNote'

/** Scheiben pro Seite als Text für das Numpad (Langhantel), leer ohne Gewicht */
function plateHint(kg: number, s: Settings, wl: Settings['weightUnit']): string | undefined {
  if (!(kg > 0)) return undefined
  const r = platesFor(kg, s.barWeight, s.plates)
  // kg exakt (1,25), lb über die Anzeige-Umrechnung
  const f = (n: number) => (wl === 'kg' ? n : kgToDisplay(n, wl)).toLocaleString('de-DE', { maximumFractionDigits: 2 })
  if (!r) return `Leichter als die Stange (${f(s.barWeight)} ${wl})`
  const side = r.perSide.length ? `Pro Seite: ${r.perSide.map(f).join(' + ')}` : 'Nur Stange'
  return r.rest > 0 ? `${side} · ${f(r.rest)} ${wl} nicht ladbar` : side
}

/** Körperlast für die Anzeige (eine Nachkommastelle) */
const fmtLoad = (n: number) => (Math.round(n * 10) / 10).toLocaleString('de-DE')

/** Startzeilen einer Übung: Aufwärmsätze und Arbeitssätze aus der Planung. */
function buildRows(v: PlannedView, wl: Settings['weightUnit'], sides = false, mode: Settings['prefillMode'] = 'suggestion'): Row[] {
  const fill = prefillSets(v.ex.cardio ? 'suggestion' : mode, v.sug, v.sets, v.previous.work)
  const blank = { weight: '', reps: '', rir: '', done: false, minutes: '', km: '' }
  const warm: Row[] = v.warmups.map((w) => ({
    ...blank, id: uid(), type: 'warmup', weight: w.weight == null ? '' : String(kgToDisplay(w.weight, wl)), reps: String(w.reps),
  }))
  const work: Row[] = Array.from({ length: v.sets }, (_, i) => ({
    ...blank, id: uid(), type: 'work',
    weight: fill[i].weight == null ? '' : String(kgToDisplay(fill[i].weight!, wl)),
    reps: v.ex.cardio ? '' : String(fill[i].reps),
    rir: v.ex.cardio ? '' : String(v.setRirs[i]),
    ...(v.ex.cardio ? {} : { planKg: fill[i].weight, planReps: fill[i].reps, planRir: v.setRirs[i] }),
    ...(i === v.failureIdx ? { failure: true } : {}),
  }))
  return [...warm, ...work.map((r, i) => {
    const row = withSides(r, sides)
    // Letzte Werte mit Seiten: beide Seiten wie zuletzt
    const sd = fill[i].sides
    if (!row.right || !sd) return row
    return { ...row, weight: String(kgToDisplay(sd.l.weight, wl)), reps: String(sd.l.reps),
      right: { ...row.right, weight: String(kgToDisplay(sd.r.weight, wl)), reps: String(sd.r.reps) } }
  })]
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
  const [pad, setPad] = useState<{ rowId: string; field: PadField; side?: Side } | null>(null)
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
  const [supersetOpen, setSupersetOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [whyOpen, setWhyOpen] = useState(false)
  const [swapOpen, setSwapOpen] = useState(false)
  // Tausch/Entfernen: dauerhaft im Trainingstag (Standard) oder nur für diese Einheit
  const [persist, setPersist] = useState(true)

  // Nachgetragenes Workout: `<Programm/Tag>@<Datum>@<Woche>` (siehe history/BackfillSheet)
  const [baseParam, bDate, bWeek] = param.split('@')
  const backfill = bDate && /^\d{4}-\d{2}-\d{2}$/.test(bDate) ? { date: bDate, week: Math.max(0, Number(bWeek) || 0) } : null
  const asOf = backfill?.date ?? todayStr()
  const local = baseParam.replace(/^p\d+-/, '')
  const slotIdx = local.startsWith('s') ? Number(local.slice(1)) : null
  const dayIdx = !program ? -1 : slotIdx !== null
    ? (program.weekSlots[slotIdx] === 'rest' ? -1 : (program.weekSlots[slotIdx] as number)) : Number(local.slice(1))
  // Programme aus der Bibliothek haben keinen eigenen Wochenstand: die höchste erreichte Woche zählt
  const foreign = !!program && !program.active
  const curWeek = backfill ? backfill.week : foreign ? maxReachedWeek(program, sessions, 0) : week.week
  // Nachtragen: Vorschläge beruhen auf dem Stand zu diesem Datum, später geloggte Einheiten zählen nicht
  const history = useMemo(() => (backfill ? sessions.filter((s) => s.date <= backfill.date) : sessions), [sessions, backfill?.date]) // eslint-disable-line react-hooks/exhaustive-deps
  const day = program?.days[dayIdx]
  const plan = useMemo(
    () => (program?.config ? weekPlan(program.config, curWeek) : neutralWeek(curWeek)),
    [program, curWeek],
  )
  const lookup = useCallback((id: string) => all.find((e) => e.id === id), [all])
  // Der Trainingstag plus die im laufenden Workout hinzugefügten Übungen
  const added = active?.added
  const custom = active?.custom
  const fullDay = useMemo(
    () => (day && custom ? { ...day, exercises: custom } : day && added?.length ? { ...day, exercises: [...day.exercises, ...added] } : day),
    [day, added, custom],
  )
  const views = useMemo(
    // In dieser Woche ausgelassene Übungen (eigenes Wochenziel) erscheinen nicht im Training
    () => (fullDay ? plannedDay(fullDay, plan, historyUpTo(history, program?.id, curWeek), lookup, settings, overrides, deloadSessionOf(program), asOf, bodyweights).filter((v) => !v.skipped) : []),
    [fullDay, plan, history, program, curWeek, lookup, settings, overrides, bodyweights, asOf],
  )
  /** Supersatz-Mitglieder, die diese Woche trainiert werden (ausgelassene zählen nicht) */
  const trainedMembers = (id: string) => {
    const m = supersetMembers(fullDay?.exercises ?? [], id).filter((x) => views.some((v) => v.pe.exerciseId === x))
    return m.length >= 2 ? m : []
  }

  useEffect(() => { loadActiveWorkout<ActiveWorkout>().then(setStored) }, [])

  // Start oder Wiederaufnahme
  useEffect(() => {
    if (stored === undefined || active || closed || !program || !views.length || !settingsLoaded || !overridesLoaded || !dataLoaded) return
    if (stored && stored.param === param && stored.programId === (program.id ?? null)) { setActive(stored); return }
    if (stored) return // anderes Workout läuft, siehe Hinweiskarte
    const rows: Record<string, Row[]> = {}
    for (const v of views) rows[v.pe.exerciseId] = buildRows(v, settings.weightUnit, splitsSides(v.ex, overrides[v.pe.exerciseId]?.sides), settings.prefillMode)
    setActive({ param, programId: program.id ?? null, clock: startClock(Date.now()), rows, current: views[0].pe.exerciseId })
  }, [stored, active, closed, program, views, param, settings.weightUnit, settingsLoaded, overridesLoaded, dataLoaded, overrides, settings.prefillMode])

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
  const padRowId = pad ? (pad.side === 'r' ? `${pad.rowId}-r` : pad.rowId) : undefined
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
  // Links/rechts getrennt: Einstellung der Übung (neue Arbeitssätze und Satztyp-Wechsel folgen ihr)
  const sidesOn = splitsSides(current.ex, overrides[current.pe.exerciseId]?.sides)
  const paused = active.clock.pausedAt != null
  const wl = settings.weightUnit

  const setRows = (id: string, fn: (r: Row[]) => Row[]) =>
    setActive((a) => (a ? { ...a, rows: { ...a.rows, [id]: fn(a.rows[id] ?? []) } } : a))
  const patch = (rowId: string, p: Partial<Row>) =>
    setRows(current.pe.exerciseId, (rs) => rs.map((r) => (r.id === rowId ? { ...r, ...p, ...syncRight(r, p), ...(p.weight !== undefined || p.reps !== undefined ? { manual: true } : {}) } : r)))
  /** Links geändert: die offene rechte Seite übernimmt den Wert, solange sie noch den alten linken Wert hatte */
  const syncRight = (r: Row, p: Partial<Row>): Partial<Row> => {
    if (!r.right || r.right.done) return {}
    const right = { ...r.right }
    for (const k of ['weight', 'reps', 'rir'] as const) if (p[k] !== undefined && right[k] === r[k]) right[k] = p[k]
    return { right }
  }

  /** Felder der rechten Seite ändern (Gewicht/Wdh. zählen als von Hand geändert) */
  const patchRight = (rowId: string, p: Partial<SideRow>) =>
    setRows(current.pe.exerciseId, (rs) => rs.map((r) => (r.id === rowId && r.right
      ? { ...r, right: { ...r.right, ...p }, ...(p.weight !== undefined || p.reps !== undefined ? { manual: true } : {}) } : r)))

  /**
   * Nach einem abgehakten Arbeitssatz: Gewicht und Wdh. der noch offenen, nicht von Hand geänderten Folgesätze
   * neu berechnen (Ermüdung je Satz Abstand eingerechnet). Lief der Satz wie geplant, bleibt alles unverändert.
   * Ohne Verlauf (kein Planungsgewicht) kalibriert der erste Satz. Assistierte, Zeit- und Cardioübungen nicht.
   */
  const adaptFollowing = (rs: Row[], doneRow: Row): Row[] => {
    if (doneRow.type !== 'work' || current.ex.cardio || current.ex.assisted || isRepless(current.ex.metric) || doneRow.rir === '' || doneRow.planReps === undefined) return rs
    const idx = rs.findIndex((r) => r.id === doneRow.id)
    // Links/rechts getrennt: die schwächere Seite bestimmt die Folgesätze
    const src = doneRow.right && doneRow.right.rir !== ''
      && weakerSide(sideSet(doneRow, wl), sideSet(doneRow.right, wl), false, current.bodyLoad) === 'r' ? doneRow.right : doneRow
    const done = {
      weight: displayToKg(num(src.weight), wl), reps: num(src.reps), rir: num(src.rir),
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
      const weight = String(kgToDisplay(next.weight, wl))
      const reps = String(next.reps)
      return { ...r, weight, reps, planKg: next.weight, planReps: next.reps, ...(r.right && !r.right.done ? { right: { ...r.right, weight, reps } } : {}) }
    })
  }

  /**
   * Haken setzen/entfernen. Links/rechts getrennt (`side`): eine Seite abhaken startet die Seitenpause, erst mit beiden
   * Seiten gilt der Satz als erledigt (dann wie ein normaler Satz: Anpassung, Supersatz, Pause).
   */
  const toggleDone = (row: Row, side?: Side) => {
    if (!side || !row.right) {
      toggleWhole(row, row.right ? { leftDone: !row.done, right: { ...row.right, done: !row.done } } : {})
      return
    }
    const l = side === 'l' ? !row.leftDone : !!row.leftDone
    const r = side === 'r' ? !row.right.done : row.right.done
    const flags = { leftDone: l, right: { ...row.right, done: r } }
    if ((l && r) !== row.done) { toggleWhole(row, flags); return }
    setRows(current.pe.exerciseId, (rs) => rs.map((x) => (x.id === row.id ? { ...x, ...flags } : x)))
    if (side === 'l' ? l : r) {
      setPad(null)
      setRest(settings.sideRest > 0 ? { endsAt: Date.now() + settings.sideRest * 1000, total: settings.sideRest } : null)
    }
  }
  const toggleWhole = (row: Row, extra: Partial<Row>) => {
    const turningOn = !row.done
    const id = current.pe.exerciseId
    const toggled = rows.map((r) => (r.id === row.id ? { ...r, done: !r.done, ...extra } : r))
    const completes = turningOn && isComplete(toggled)
    const work = turningOn && row.type !== 'warmup'
    // Drop-/Myo-Segment direkt danach: ohne Übungswechsel weiter (Drop sofort, Myo nach kurzer Pause)
    const following = rows[rows.findIndex((r) => r.id === row.id) + 1]
    const segNext = work && following && isSegment(following) && !following.done ? following : undefined
    // Supersatz: nach jedem Arbeitssatz zur nächsten Übung der Runde, Pause erst nach der letzten
    const group = trainedMembers(id)
    const ss = work && !segNext && group.length
      ? nextInSuperset(group, id, (m) => (m === id ? toggled : active.rows[m] ?? []).some((r) => !r.done))
      : null
    setActive((a) => {
      if (!a) return a
      const mine = (a.rows[id] ?? []).map((r) => (r.id === row.id ? { ...r, done: !r.done, ...extra } : r))
      const nextRows = { ...a.rows, [id]: turningOn ? adaptFollowing(mine, row) : mine }
      let cur = a.current
      if (ss?.next) cur = ss.next
      else if (completes) {
        // Immer zur ersten Übung der Reihenfolge, die noch offen ist (auch übersprungene)
        const open = views.find((v) => !isComplete(nextRows[v.pe.exerciseId] ?? []))
        if (open) cur = open.pe.exerciseId
      }
      return { ...a, rows: nextRows, current: cur }
    })
    if (completes || (ss?.next && ss.next !== id)) setPad(null)
    if (!turningOn || current.ex.cardio) return
    if (segNext) {
      setRest(segNext.type === 'myo' ? { endsAt: Date.now() + MYO_REST_SEC * 1000, total: MYO_REST_SEC } : null)
      return
    }
    if (ss?.next && !ss.rest) { setRest(null); return }
    // Letzter Aufwärmsatz: danach folgt der erste Arbeitssatz, also die längere Pause
    const moreWarmups = rows.some((r) => r.id !== row.id && r.type === 'warmup' && !r.done)
    const after = row.type !== 'warmup' ? 'work' : moreWarmups ? 'warmup' : 'lastWarmup'
    const sec = restSecondsFor(current.ex, settings, after, overrides[current.pe.exerciseId]?.restSeconds)
    setRest({ endsAt: Date.now() + sec * 1000, total: sec })
  }
  /** Header-Checkbox: alle Sätze der Übung abhaken bzw. alle zurücksetzen (ohne Pausen-Timer). */
  const toggleAll = () => {
    const allDone = isComplete(rows)
    setActive((a) => {
      if (!a) return a
      const id = current.pe.exerciseId
      const nextRows = { ...a.rows, [id]: (a.rows[id] ?? []).map((r) => ({
        ...r, done: !allDone, ...(r.right ? { leftDone: !allDone, right: { ...r.right, done: !allDone } } : {}),
      })) }
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
    const row = withSides({ ...base, id: uid(), type: 'work', done: false, partial: undefined, leftDone: false }, sidesOn)
    return [...rs, row.right ? { ...row, right: { ...row.right, done: false, partial: undefined } } : row]
  })
  /** Zeile löschen; bei einem Arbeitssatz auch seine Drop-/Myo-Segmente */
  const deleteRow = (rowId: string) => {
    const gone = new Set([rowId])
    const i = rows.findIndex((r) => r.id === rowId)
    if (rows[i]?.type === 'work') for (let k = i + 1; rows[k] && isSegment(rows[k]); k++) gone.add(rows[k].id)
    setRows(current.pe.exerciseId, (rs) => rs.filter((r) => !gone.has(r.id)))
    setPad((p) => (p && gone.has(p.rowId) ? null : p))
  }
  const changeType = (t: SetTypeChoice) => {
    const row = rows.find((r) => r.id === typeRow)
    setTypeRow(null)
    if (!row) return
    // Aufwärmsätze sind nie links/rechts getrennt, Arbeitssätze nach Einstellung der Übung
    const typed = (p: Partial<Row>) => setRows(current.pe.exerciseId, (rs) => rs.map((r) => {
      if (r.id !== row.id) return r
      const next = withSides({ ...r, ...p }, sidesOn)
      return next.right && p.rir !== undefined ? { ...next, right: { ...next.right, rir: p.rir } } : next
    }))
    if (t === 'warmup') { typed({ type: 'warmup', rir: '', failure: undefined }); return }
    if (t === 'work') {
      typed({ type: 'work', failure: undefined, rir: row.type === 'warmup' || row.failure || row.rir === '' ? String(row.planRir ?? current.rir) : row.rir })
      return
    }
    if (t === 'failure') { typed({ type: 'work', failure: true, rir: '0' }); return }
    // Drop/Myo: neues Segment hinter dem Satz bzw. hinter seinem letzten Segment
    const kind = t === 'addSegment' ? (row.type === 'myo' ? 'myo' : 'drop') : t
    const { snap } = loadSteps(current.ex.equipment, wl, overrides[current.pe.exerciseId]?.weightScale)
    setRows(current.pe.exerciseId, (rs) => {
      let end = rs.findIndex((r) => r.id === row.id)
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

  // ---- Supersatz: Übung mit der vorherigen/nächsten verbinden oder lösen (gilt auch für das Programm) ----
  const dayList = fullDay?.exercises ?? []
  const curIdx = dayList.findIndex((e) => e.exerciseId === current.pe.exerciseId)
  const members = trainedMembers(current.pe.exerciseId)
  const linkSuperset = (action: 'prev' | 'next' | 'none') => {
    setSupersetOpen(false)
    if (curIdx < 0) return
    const next = setSupersetLink(dayList, curIdx, action)
    if (active.custom) { setActive((a) => (a ? { ...a, custom: next } : a)); return } // „nur heute“-Liste: Programm bleibt
    const n = day.exercises.length
    if (program.id != null) void db.programs.update(program.id, { days: program.days.map((d, i) => (i === dayIdx ? { ...d, exercises: next.slice(0, n) } : d)) })
    if (next.length > n) setActive((a) => (a ? { ...a, added: next.slice(n) } : a))
  }

  const padRow = pad ? rows.find((r) => r.id === pad.rowId) : undefined
  const onConfirmPad = () => {
    if (pad?.field === 'weight' && padRow) setPad({ rowId: pad.rowId, field: 'reps', side: pad.side })
    else setPad(null)
  }

  const selectExercise = (id: string) => { setPad(null); setActive((a) => (a ? { ...a, current: id } : a)) }
  const addExercise = (ex: Exercise) => {
    if (views.some((v) => v.pe.exerciseId === ex.id)) { selectExercise(ex.id); return }
    const range = isRepless(ex.metric) ? METRIC_RANGE[ex.metric!]! : ex.compound ? { min: 6, max: 10 } : { min: 10, max: 15 }
    const pe: PlannedExercise = { exerciseId: ex.id, sets: ex.cardio ? 1 : 3, repMin: range.min, repMax: range.max, rir: 2 }
    const [view] = plannedDay({ ...day, exercises: [pe] }, plan, historyUpTo(history, program.id, curWeek), lookup, settings, overrides, deloadSessionOf(program), asOf, bodyweights)
    if (!view) return
    setPad(null)
    setActive((a) => (a ? { ...a, added: [...(a.added ?? []), pe], rows: { ...a.rows, [ex.id]: buildRows(view, wl, splitsSides(ex, overrides[ex.id]?.sides), settings.prefillMode) }, current: ex.id } : a))
  }

  // ---- Übung tauschen/entfernen (dauerhaft im Programm oder nur heute) ----
  /** Änderung der Übungsliste anwenden: dauerhaft im Trainingstag (und in hinzugefügten Übungen) oder nur als Liste dieser Einheit */
  const applyDayEdit = (f: (l: PlannedExercise[]) => PlannedExercise[], saveToProgram: boolean) => {
    if (saveToProgram && program.id != null) {
      void db.programs.update(program.id, { days: program.days.map((d, i) => (i === dayIdx ? { ...d, exercises: f(d.exercises) } : d)) })
    }
    setActive((a) => {
      if (!a) return a
      if (saveToProgram) return { ...a, ...(a.added ? { added: f(a.added) } : {}), ...(a.custom ? { custom: f(a.custom) } : {}) }
      return { ...a, custom: f(a.custom ?? [...day.exercises, ...(a.added ?? [])]) }
    })
  }
  const swapExercise = (to: Exercise) => {
    const from = current.pe.exerciseId
    const entry = swapEntry(dayList, from, to, lookup, program.config ?? undefined)
    if (!entry) return
    const [view] = plannedDay({ ...day, exercises: [{ ...entry, superset: undefined }] }, plan, historyUpTo(history, program.id, curWeek), lookup, settings, overrides, deloadSessionOf(program), asOf, bodyweights)
    if (!view) return
    applyDayEdit((l) => replaceInDay(l, from, entry), persist)
    setPad(null)
    setActive((a) => {
      if (!a) return a
      const { [from]: _gone, ...rows } = a.rows
      const notes = { ...(a.notes ?? {}) }
      delete notes[from]
      return { ...a, rows: { ...rows, [to.id]: buildRows(view, wl, splitsSides(to, overrides[to.id]?.sides), settings.prefillMode) }, notes, current: to.id }
    })
  }
  const removeExercise = () => {
    const id = current.pe.exerciseId
    const i = views.findIndex((v) => v.pe.exerciseId === id)
    const nextId = (views[i + 1] ?? views[i - 1])?.pe.exerciseId
    applyDayEdit((l) => removeFromDay(l, id), persist)
    setPad(null)
    setActive((a) => {
      if (!a) return a
      const { [id]: _gone, ...rows } = a.rows
      const notes = { ...(a.notes ?? {}) }
      delete notes[id]
      return { ...a, rows, notes, current: nextId ?? a.current }
    })
  }
  // Vorschläge (gleiche Hauptmuskelgruppe, ohne „Nie empfehlen“) zuerst, danach die freie Auswahl; ohne Übungen, die schon im Tag sind
  // (kein Hook: steht hinter den frühen returns) nur berechnen, solange die Auswahl offen ist
  const swapCandidates = (() => {
    if (!swapOpen) return []
    const inDay = dayList.map((e) => e.exerciseId)
    const alts = alternatives(current.ex, recommendable(all, overrides), inDay)
    const ids = new Set([...inDay, ...alts.map((e) => e.id)])
    return [...alts, ...all.filter((e) => !e.cardio && !ids.has(e.id))]
  })()

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

  // ---- Links/rechts getrennt (je Übung, Standard aus der Übung) ----
  const toggleSides = () => {
    const on = !sidesOn
    void saveExerciseOverride(current.pe.exerciseId, { sides: on === !!current.ex.unilateral ? undefined : on })
    setRows(current.pe.exerciseId, (rs) => rs.map((r) => withSides(r, on)))
    setPad((p) => (p?.side === 'r' ? null : p))
  }

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

  const exitTo = backfill ? '/history' : '/workouts'
  const close = async () => { setClosed(true); await clearActiveWorkout() }
  const finish = async (mode: 'completed' | 'all') => {
    if (saving.current) return
    saving.current = true
    setSaveError(null)
    const exercises: LoggedExercise[] = []
    for (const v of views) {
      const take = (r: Row) => (mode === 'completed' ? r.done : v.ex.cardio ? num(r.minutes) > 0 : num(r.reps) > 0)
      const sets: LoggedSet[] = (active.rows[v.pe.exerciseId] ?? []).filter(take).map((r) => rowToSet(r, v.ex, v.bodyLoad, { weight: wl, distance: settings.distanceUnit }))
      if (sets.length) exercises.push({ exerciseId: v.pe.exerciseId, sets })
    }
    setClosed(true)
    try {
      const now = Date.now()
      // Nachgetragen: Datum aus der Wahl, Uhrzeit mittags, Dauer unbekannt (im Verlauf änderbar)
      const date = backfill?.date ?? fmt(new Date(active.clock.startedAt))
      const noon = backfill ? parse(backfill.date).getTime() + 12 * 3600_000 : null
      const notes = Object.fromEntries(Object.entries(active.notes ?? {}).filter(([id, t]) => t && exercises.some((e) => e.exerciseId === id)))
      // Einheit, Wochenstand und Löschen des laufenden Workouts atomar: schlägt etwas fehl, bleibt das Training erhalten.
      await db.transaction('rw', db.sessions, db.kv, db.programs, async () => {
        if (exercises.length) {
          await db.sessions.add({
            programId: program.id ?? null, dayIndex: dayIdx, date, finishedAt: noon ?? now, week: curWeek, exercises,
            ...(noon === null ? { startedAt: active.clock.startedAt, durationSec: Math.floor(elapsedMs(active.clock, now) / 1000) } : { startedAt: noon }),
            ...(Object.keys(notes).length ? { notes } : {}),
          })
          if (slotIdx !== null && !foreign && !backfill) await saveWeekState(markSlot(week, slotIdx, date))
          // Im Workout hinzugefügte (und trainierte) Übungen dauerhaft in den Trainingstag übernehmen
          const keep = (active.added ?? []).filter((pe) => exercises.some((e) => e.exerciseId === pe.exerciseId))
          if (keep.length && program.id != null) {
            const days = program.days.map((d, i) => {
              if (i !== dayIdx) return d
              const list = [...d.exercises, ...keep.filter((pe) => !d.exercises.some((e) => e.exerciseId === pe.exerciseId))]
              // Nicht trainierte hinzugefügte Übungen fehlen: Supersätze neu zusammensetzen (nur Benachbarte bleiben verbunden)
              return { ...d, exercises: withLinks(list, linksOf(list)) }
            })
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
    nav(exitTo, { replace: true })
  }
  const discard = async () => { await close(); nav(exitTo, { replace: true }) }

  // Abschluss-Sheet: trainierte Muskeln, Dauer, Sätze, Volumen
  const trained = views.filter((v) => !v.ex.cardio && (active.rows[v.pe.exerciseId] ?? []).some((r) => r.done && r.type === 'work'))
  const primaryDone = [...new Set(trained.flatMap((v) => v.ex.primary))] as MuscleId[]
  const secondaryDone = [...new Set(trained.flatMap((v) => v.ex.secondary))].filter((m) => !primaryDone.includes(m)) as MuscleId[]
  // Sätze ohne Drop-/Myo-Segmente, Volumen mit
  const loggedDone = trained.flatMap((v) => (active.rows[v.pe.exerciseId] ?? []).filter((r) => r.done && r.type !== 'warmup').map((r) => ({ r, f: volumeFactor(v.ex), e: v.ex, b: v.bodyLoad })))
  const workDone = loggedDone.filter(({ r }) => r.type === 'work')
  const volumeKg = loggedDone.filter(({ e }) => !noLoadStats(e)).reduce((a, { r, f, b }) => {
    const vol = (v: Pick<Row, 'weight' | 'reps'>) => (displayToKg(num(v.weight), wl) + b) * num(v.reps)
    return a + (r.right ? vol(r) + vol(r.right) : vol(r)) * f
  }, 0)
  const durMin = Math.round(elapsedMs(active.clock, paused ? (active.clock.pausedAt as number) : Date.now()) / 60000)
  const noteBoxes = (['session', 'exercise', 'program'] as const).filter((sc) => noteValues[sc])

  return (
    <div className="max-w-2xl mx-auto px-4 pb-8" style={{ paddingBottom: pad ? '22rem' : undefined }}>
      {saveError && <div role="alert" className="mb-3 rounded-xl bg-danger/15 text-danger text-sm p-3">{saveError}</div>}
      <div ref={headerRef} className="sticky top-0 z-30 bg-bg -mx-4 px-4 pt-2 pb-2 safe-top border-b border-line">
        <WorkoutHeader clock={active.clock} onBack={() => nav(exitTo)} onMenu={() => setMenuOpen(true)}
          timer={<RestChip rest={rest} onDone={endRest} onOpen={() => setRestOpen(true)} />} />
      </div>

      <div className={paused ? 'pointer-events-none opacity-40' : undefined}>
        <ExerciseStrip current={current.pe.exerciseId} onSelect={selectExercise} onAdd={() => setAddOpen(true)}
          items={views.map((v, i) => ({ ex: v.ex, done: isComplete(active.rows[v.pe.exerciseId] ?? []), linkNext: !!v.pe.superset && v.pe.superset === views[i + 1]?.pe.superset }))} />

        <div className="mt-2 mb-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold">{current.ex.name}</h1>
            {plan.isDeload && <span className="text-xs rounded-full bg-warn/20 text-warn px-2 py-1">Deload</span>}
          </div>
          {backfill && <p className="text-xs text-accent mt-0.5">Nachgetragen für {formatDate(backfill.date, { day: '2-digit', month: 'long', year: 'numeric' })} · {weekLabel(program, backfill.week)}</p>}
          {!current.ex.cardio && <p className="text-xs text-muted mt-0.5">{(current.ex.metric === 'time' ? de.logger.targetSeconds : current.ex.metric === 'distance' ? de.logger.targetMeters : de.logger.targetReps)(current.range.min, current.range.max)}</p>}
          {(() => {
            const why = current.ex.cardio ? null : reasonText(current.sug, current.range, wl, current.ex.metric ?? 'reps', current.bodyLoad)
            if (!why) return null
            const check = current.sug.level === 'check'
            return (
              <button onClick={() => setWhyOpen(true)} className={cx('mt-1 flex items-center gap-1 text-xs active:opacity-70', check ? 'text-warn' : 'text-muted')}>
                <Icon name={check ? 'bolt' : 'sparkles'} size={13} />{check ? 'Vorschlag bitte prüfen' : 'Warum dieser Vorschlag?'}
              </button>
            )
          })()}
          {settings.prefillMode === 'last' && !current.ex.cardio && current.previous.work.length > 0 && current.sug.weight != null && (
            <p className="text-xs text-muted mt-0.5">Vorschlag: {current.sug.weight > 0 || current.bodyLoad <= 0 ? `${current.bodyLoad > 0 ? '+' : ''}${kgToDisplay(current.sug.weight, wl).toLocaleString('de-DE')} ${wl} × ` : ''}{current.sug.reps}{current.ex.metric === 'time' ? ' s' : current.ex.metric === 'distance' ? ' m' : ' Wdh.'}</p>
          )}
          {progressionNote(current.sug, current.range, wl, current.bodyLoad) && (
            <p className="text-xs text-warn mt-1">{progressionNote(current.sug, current.range, wl, current.bodyLoad)}</p>
          )}
          {members.length > 0 && (
            <p className="text-xs text-accent mt-1 flex items-center gap-1"><Icon name="link" size={13} />
              Supersatz mit {members.filter((m) => m !== current.pe.exerciseId).map((m) => lookup(m)?.name ?? m).join(', ')}
            </p>
          )}
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
            <ActionPill icon="automation" label="Tauschen" onClick={() => setActionsOpen(true)} />
            {!current.ex.cardio && <ActionPill icon="warmup" label={de.logger.warmup} onClick={() => setWarmupOpen(true)} active={modeNow !== 'none'} />}
            <ActionPill icon="note" label={de.common.note} onClick={() => setNoteScope(noteBoxes[0] ?? 'session')} active={noteBoxes.length > 0} />
            {!current.ex.cardio && <ActionPill icon="sides" label="Links/Rechts" onClick={toggleSides} active={sidesOn} />}
            {dayList.length > 1 && <ActionPill icon="link" label="Supersatz" onClick={() => setSupersetOpen(true)} active={members.length > 0} />}
          </div>
        </div>

        <SetTable view={current} rows={rows} settings={settings} activePad={pad}
          onPatch={patch} onToggleDone={toggleDone} onToggleAll={toggleAll} onAdd={addSet} onDelete={deleteRow}
          onType={setTypeRow} onPad={(rowId, field, side) => setPad({ rowId, field, side })} />

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

      {pad && padRow && (() => {
        // Rechte Seite eines links/rechts getrennten Satzes: eigene Werte in `right`
        const r = pad.side === 'r' ? padRow.right : undefined
        const vals = r ?? padRow
        const set = (p: Partial<SideRow>) => (r ? patchRight(padRow.id, p) : patch(padRow.id, p))
        const sideLabel = !padRow.right ? '' : r ? ' · rechts' : ' · links'
        return (
          <NumpadSheet key={`${pad.rowId}-${pad.side ?? ''}-${pad.field}`} field={pad.field}
            label={`${pad.field === 'weight' ? `Gewicht (${wl})` : 'Wiederholungen'}${sideLabel}`}
            value={pad.field === 'weight' ? vals.weight : vals.reps} rir={vals.rir} showRir={!isSegment(padRow)}
            partial={vals.partial ?? ''} onPartial={(v) => set({ partial: v })}
            onValue={(v) => set(pad.field === 'weight' ? { weight: v } : { reps: v })}
            onRir={(v) => set({ rir: v })} onConfirm={onConfirmPad} onClose={() => setPad(null)}
            hint={current.ex.equipment === 'barbell' ? plateHint(displayToKg(num(vals.weight), wl), settings, wl) : undefined} />
        )
      })()}

      <ExercisePicker open={addOpen} onClose={() => setAddOpen(false)} exercises={all} onPick={addExercise} title="Übung hinzufügen" />

      <SuggestionSheet open={whyOpen} onClose={() => setWhyOpen(false)} warn={current.sug.level === 'check'}
        info={current.ex.cardio ? null : reasonText(current.sug, current.range, wl, current.ex.metric ?? 'reps', current.bodyLoad)} />
      <ExerciseActionsSheet open={actionsOpen} onClose={() => setActionsOpen(false)} name={current.ex.name}
        persist={persist} onPersist={setPersist} canRemove={views.length > 1}
        hasDone={rows.some((r) => r.done)} onSwap={() => setSwapOpen(true)} onRemove={removeExercise} />
      <ExercisePicker open={swapOpen} onClose={() => setSwapOpen(false)} exercises={swapCandidates} onPick={swapExercise}
        title={`Ersatz für ${current.ex.name}`} allowCardio={false} defaultMuscle={current.ex.primary[0]} />

      <ExerciseInfoSheet ex={current.ex} open={infoOpen} onClose={() => setInfoOpen(false)} />

      <WarmupSheet open={warmupOpen} onClose={() => setWarmupOpen(false)} mode={modeNow} smart={smart} scheme={schemeSteps}
        hasOverride={!!ov?.warmupScheme} workWeight={workKg} equipment={current.ex.equipment} unit={wl} scale={ov?.weightScale}
        onMode={pickWarmupMode} onScheme={editScheme} onResetScheme={resetScheme} />

      <NoteSheet open={noteScope !== null} onClose={() => setNoteScope(null)} ex={current.ex}
        scopes={['session', 'exercise', 'program']} initialScope={noteScope ?? 'session'} values={noteValues} onSave={saveNote} />

      <SetTypeSheet open={typeRow !== null} row={rows.find((r) => r.id === typeRow)}
        onPick={changeType} onClose={() => setTypeRow(null)} />

      <SupersetSheet open={supersetOpen} onClose={() => setSupersetOpen(false)} inSuperset={members.length > 0}
        prev={curIdx > 0 ? lookup(dayList[curIdx - 1].exerciseId)?.name : undefined}
        next={curIdx >= 0 && curIdx < dayList.length - 1 ? lookup(dayList[curIdx + 1].exerciseId)?.name : undefined}
        onPick={linkSuperset} />

      <RestSheet open={restOpen} onClose={() => setRestOpen(false)} rest={rest} onStop={endRest}
        onStart={(sec) => setRest({ endsAt: Date.now() + sec * 1000, total: sec })}
        onAdjust={(d) => setRest((r) => (r ? { endsAt: r.endsAt + d * 1000, total: Math.max(15, r.total + d) } : r))} />

      <WorkoutMenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} paused={paused}
        onPause={togglePause} onMinimize={() => nav(exitTo)} onFinish={() => setFinishOpen(true)} onDiscard={discard} />

      <FinishChoiceSheet open={finishOpen} onClose={() => setFinishOpen(false)} doneCount={doneCount} openCount={openCount}
        onChoose={(m) => { setFinishOpen(false); void finish(m) }} />

      <CompleteSheet open={completeOpen} onClose={() => setCompleteOpen(false)} primary={primaryDone} secondary={secondaryDone}
        stats={[
          { label: 'Dauer', value: backfill ? '–' : `${durMin} min` }, { label: 'Sätze', value: String(workDone.length) },
          { label: 'Volumen', value: `${Math.round(kgToDisplay(volumeKg, wl)).toLocaleString('de-DE')} ${wl}` },
        ]}
        onSave={() => { setCompleteOpen(false); void finish('completed') }} />
    </div>
  )
}
