import { distanceUnitOf, isRepless, metricUnit } from '../../engine/metric'
import { exerciseById } from '../../data/exercises'
import type { PlannedExercise } from '../../types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MenuRow } from './MenuRow'
import { todayStr } from '../../utils/dates'
import { useNavigate, useParams } from 'react-router-dom'
import { BottomBar, BottomSheet, Button, Card, Page, cx } from '../../components/ui'
import { MuscleThumb } from '../../components/MuscleFigure'
import { Icon } from '../../components/icons'
import { ExercisePhoto } from '../../components/ExerciseMedia'
import { rirColor } from '../../components/rir'
import { progressionNote, reasonText } from './progressionNote'
import { db, saveWeekState, useProgramByParam, useActiveWorkoutParam, useAllExercises, useExerciseOverrides, useSessions, useSettings, useWeekState, useBodyweights } from '../../db/db'
import { muscleLabel } from '../../data/muscles'
import { exerciseTargets, neutralWeek, plannedSets, setRir, setWeekTarget, setWeekTargetForProgram, weekPlan } from '../../engine/periodization'
import { WeekTargetSheet } from './WeekTargetSheet'
import { weekLabel } from '../../engine/weekCycle'
import { deloadSessionOf, plannedDay } from '../../engine/plannedDay'
import { historyUpTo, isSlotSkipped, maxReachedWeek, skipSlot, unmarkSlot } from '../../engine/weekCycle'
import { targetMuscles } from '../../engine/targetMuscles'
import { moveExercise } from '../../engine/programAdmin'
import { removeFromDay, swapInDay } from '../../engine/dayEdit'
import { alternatives, recommendable } from '../../engine/swap'
import { ExercisePicker } from '../wizard/shared'
import { ExerciseActionsSheet, SuggestionSheet } from './LoggerSheets'
import { DayManageSheet } from './DayManageSheet'
import { de } from '../../i18n/de'
import { t, lc } from '../../i18n'

/** Vorschau eines Workouts: Übungen, Sätze, Rep-Bereiche und Ziel-RIR. Start über den Button unten. */
export default function WorkoutPreview({ param: paramProp, embedded }: { param?: string; embedded?: boolean } = {}) {
  const routeParam = useParams().slot
  const param = paramProp ?? routeParam ?? 's0'
  const nav = useNavigate()
  const program = useProgramByParam(param)
  const week = useWeekState()
  const sessions = useSessions()
  const bodyweights = useBodyweights()
  const settings = useSettings()
  const all = useAllExercises()
  const running = useActiveWorkoutParam()
  const overrides = useExerciseOverrides()
  const [focus, setFocus] = useState<string | null>(null)
  // Überspringen: nur Slots des aktiven Programms, offen und ohne laufendes Workout
  const slotOf = /^(?:p\d+-)?s(\d+)$/.exec(param)
  const ownSlot = !!program?.active && slotOf ? Number(slotOf[1]) : null
  const skipped = ownSlot !== null && isSlotSkipped(week, ownSlot)
  const canSkip = ownSlot !== null && !week.done[ownSlot] && running !== param
  /** Index der Übung im Trainingstag, deren Wochenziele bearbeitet werden */
  const [editIdx, setEditIdx] = useState<number | null>(null)
  /** Index der Übung, die auf einen anderen Tag verschoben wird */
  const [moveIdx, setMoveIdx] = useState<number | null>(null)
  /** Schritt 2 des Verschiebens: gewählter Zieltag, dann die Position darin */
  const [moveDay, setMoveDay] = useState<number | null>(null)
  /** Index der Übung, die getauscht oder entfernt wird (Aktionen-Sheet bzw. Auswahl) */
  const [actIdx, setActIdx] = useState<number | null>(null)
  const [swapIdx, setSwapIdx] = useState<number | null>(null)
  /** Übung, deren Vorschlagsbegründung offen ist */
  const [whyId, setWhyId] = useState<string | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  /** Index der Übung, deren Menü (⋯) offen ist */
  const [menuIdx, setMenuIdx] = useState<number | null>(null)
  /** Langes Drücken + Ziehen: Reihenfolge innerhalb des Tages ändern */
  const [drag, setDrag] = useState<{ from: number; over: number; dy: number; h: number; shift: number } | null>(null)
  const dragRef = useRef<typeof drag>(null)
  dragRef.current = drag
  const cardEls = useRef<(HTMLDivElement | null)[]>([])
  const press = useRef<{ idx: number; x: number; y: number; timer: number; rects: DOMRect[] } | null>(null)

  const local = param.replace(/^p\d+-/, '')
  const slotIdx = local.startsWith('s') ? Number(local.slice(1)) : null
  const dayIdx = !program ? -1 : slotIdx !== null
    ? (program.weekSlots[slotIdx] === 'rest' ? -1 : (program.weekSlots[slotIdx] as number)) : Number(local.slice(1))
  const curWeek = program && !program.active ? maxReachedWeek(program, sessions, 0) : week.week
  const day = program?.days[dayIdx]
  const plan = useMemo(
    () => (program?.config ? weekPlan(program.config, curWeek) : neutralWeek(curWeek)),
    [program, curWeek],
  )
  const views = useMemo(
    () => (day ? plannedDay(day, plan, historyUpTo(sessions, program?.id, curWeek), (id) => all.find((e) => e.id === id), settings, overrides, deloadSessionOf(program), todayStr(), bodyweights) : []),
    [day, plan, sessions, program, curWeek, all, settings, overrides, bodyweights],
  )

  const active = useMemo(() => views.filter((v) => !v.skipped), [views])
  const targets = useMemo(() => targetMuscles(active.map((v) => ({ ex: v.ex, sets: v.sets }))), [active])
  const editPe = editIdx !== null ? day?.exercises[editIdx] : undefined
  const editView = editPe ? views.find((v) => v.pe === editPe) : undefined
  const saveWeek = (key: string, tgt: Parameters<typeof setWeekTarget>[2], wide?: { raw?: Parameters<typeof setWeekTarget>[2]; all?: boolean }) => {
    if (!program?.id || editIdx === null) return
    const repsOk = (x: PlannedExercise) => !isRepless(exerciseById(x.exerciseId, all)?.metric)
    const days = setWeekTargetForProgram(program.days, dayIdx, editIdx, key, tgt, wide, repsOk)
    void db.programs.update(program.id, { days })
  }

  const closeMove = () => { setMoveIdx(null); setMoveDay(null) }
  const moveTo = (to: number, index: number) => {
    const pe = moveIdx !== null ? day?.exercises[moveIdx] : undefined
    closeMove()
    if (!program?.id || !pe) return
    void db.programs.update(program.id, { days: moveExercise(program.days, dayIdx, to, pe.exerciseId, index) })
  }

  const whyOf = (v: (typeof views)[number]) => (v.skipped || v.ex.cardio ? null : reasonText(v.sug, v.range, settings.weightUnit, v.ex.metric ?? 'reps', v.bodyLoad, distanceUnitOf(v.ex)))
  const editDay = (f: (l: PlannedExercise[]) => PlannedExercise[]) => {
    if (!program?.id) return
    void db.programs.update(program.id, { days: program.days.map((d, i) => (i === dayIdx ? { ...d, exercises: f(d.exercises) } : d)) })
  }
  const dayRef = useRef({ program, dayIdx, day })
  dayRef.current = { program, dayIdx, day }
  const endPress = () => { if (press.current) { window.clearTimeout(press.current.timer); press.current = null } }
  const startPress = (e: React.PointerEvent, idx: number) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return
    endPress()
    const x = e.clientX, y = e.clientY
    const timer = window.setTimeout(() => {
      const rects = cardEls.current.map((el) => el?.getBoundingClientRect() as DOMRect)
      if (!press.current || rects.some((r) => !r)) return
      press.current.rects = rects
      const gap = rects.length > 1 ? Math.max(0, rects[1].top - rects[0].bottom) : 16
      navigator.vibrate?.(15)
      setDrag({ from: idx, over: idx, dy: 0, h: rects[idx].height, shift: rects[idx].height + gap })
    }, 380)
    press.current = { idx, x, y, timer, rects: [] }
  }
  useEffect(() => {
    // iOS: Scrollen unterbinden, solange gezogen wird (muss nicht-passiv registriert sein)
    const block = (e: TouchEvent) => { if (dragRef.current) e.preventDefault() }
    const move = (e: PointerEvent) => {
      const pr = press.current
      if (!pr) return
      const d = dragRef.current
      if (!d) {
        if (Math.hypot(e.clientX - pr.x, e.clientY - pr.y) > 10) endPress()
        return
      }
      const dy = e.clientY - pr.y
      const r = pr.rects[d.from]
      const c = r.top + r.height / 2 + dy
      let over = d.from
      let best = Infinity
      pr.rects.forEach((q, i) => { const dist = Math.abs(q.top + q.height / 2 - c); if (dist < best) { best = dist; over = i } })
      setDrag({ ...d, dy, over })
    }
    const up = (e: PointerEvent) => {
      const d = dragRef.current
      endPress()
      if (!d) return
      setDrag(null)
      if (e.type === 'pointercancel') return
      const { program: pr, dayIdx: di, day: dy } = dayRef.current
      const pe = dy?.exercises[d.from]
      if (pr?.id && pe && d.over !== d.from) void db.programs.update(pr.id, { days: moveExercise(pr.days, di, di, pe.exerciseId, d.over) })
    }
    document.addEventListener('touchmove', block, { passive: false })
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      document.removeEventListener('touchmove', block)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      endPress()
    }
  }, [])
  const actPe = actIdx !== null ? day?.exercises[actIdx] : undefined
  const swapPe = swapIdx !== null ? day?.exercises[swapIdx] : undefined
  const swapEx = swapPe ? exerciseById(swapPe.exerciseId, all) : undefined
  const swapCandidates = (() => {
    if (!swapEx || !day) return []
    const inDay = day.exercises.map((e) => e.exerciseId)
    const alts = alternatives(swapEx, recommendable(all, overrides), inDay)
    const ids = new Set([...inDay, ...alts.map((e) => e.id)])
    return [...alts, ...all.filter((e) => !e.cardio && !ids.has(e.id))]
  })()

  if (!program || !day) {
    return <Page title="Workout" back={() => nav('/workouts')}><Card>{t('Workout nicht gefunden.')}</Card></Page>
  }

  const body = (
    <>
      {embedded && plan.isDeload && <span className="self-start inline-block text-xs rounded-full bg-warn/20 text-warn px-2 py-1">Deload</span>}
      {targets.length > 0 && (
        <section className="space-y-2" aria-label={de.workouts.targetMuscles}>
          <h2 className="font-semibold">{de.workouts.targetMuscles}</h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-1">
            {targets.map((tm) => (
              <button key={tm.muscle} onClick={() => setFocus(focus === tm.muscle ? null : tm.muscle)} aria-pressed={focus === tm.muscle}
                className={cx('shrink-0 min-w-[10.5rem] rounded-2xl border-2 bg-surface p-2 pr-4 flex items-center gap-3 text-left',
                  focus === tm.muscle ? 'border-accent' : focus ? 'border-transparent opacity-60' : 'border-transparent')}>
                <MuscleThumb primary={[tm.muscle]} secondary={[]} size={56} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight">{muscleLabel(tm.muscle)}</span>
                  <span className="block text-xs text-muted mt-0.5">{tm.exercises} {lc(tm.exercises === 1 ? t('Übung') : t('Übungen'))}</span>
                  <span className="block text-xs text-muted">{tm.sets} {lc(tm.sets === 1 ? t('Satz') : t('Sätze'))}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="text-sm text-muted">{active.length} {active.length === 1 ? t('Übung') : t('Übungen')}{views.length > active.length ? t(' · {0} diese Woche ausgelassen', views.length - active.length) : ''}</div>

      {views.length > 1 && <div className="text-xs text-muted -mt-2">{t('Zum Umsortieren eine Übung gedrückt halten und ziehen.')}</div>}

      {views.map((v, vi) => {
        const lines = v.ex.cardio ? 1 : v.sets
        const dim = v.skipped || (focus !== null && !v.ex.primary.some((m) => m === focus))
        const idx = day.exercises.indexOf(v.pe)
        // Supersatz nur mit Übungen, die diese Woche trainiert werden
        const ai = active.indexOf(v)
        const ss = v.skipped ? undefined : v.pe.superset
        const ssStart = !!ss && active[ai - 1]?.pe.superset !== ss && active[ai + 1]?.pe.superset === ss
        const ssLinked = !!ss && (active[ai - 1]?.pe.superset === ss || active[ai + 1]?.pe.superset === ss)
        const dragged = drag?.from === vi
        const shifted = !drag || dragged ? 0 : drag.from < drag.over ? (vi > drag.from && vi <= drag.over ? -drag.shift : 0) : (vi >= drag.over && vi < drag.from ? drag.shift : 0)
        return (
          <div key={v.pe.exerciseId} ref={(el) => { cardEls.current[vi] = el }}
            onPointerDown={idx >= 0 && views.length > 1 ? (e) => startPress(e, vi) : undefined}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              transform: dragged ? `translateY(${drag!.dy}px) scale(1.02)` : shifted ? `translateY(${shifted}px)` : undefined,
              transition: dragged ? 'none' : drag ? 'transform 150ms ease-out' : undefined,
              WebkitTouchCallout: 'none', userSelect: drag ? 'none' : undefined,
            }}
            className={cx('relative', dragged && 'z-20 shadow-xl rounded-2xl')}>
          {ssStart && <div className="text-xs font-semibold text-accent flex items-center gap-1 mb-1 px-1"><Icon name="link" size={13} />{t('Supersatz')}</div>}
          <Card className={cx('!p-3 transition-opacity', ssLinked && 'border-l-4 border-l-accent', dim && 'opacity-40 grayscale')}>
            <div className="grid grid-cols-[64px_1fr_auto] gap-x-3 gap-y-1 items-center">
              <div style={{ gridRow: `1 / span ${lines + 2 + (progressionNote(v.sug, v.range, settings.weightUnit, v.bodyLoad) ? 1 : 0) + (whyOf(v) ? 1 : 0)}` }} className="self-start"><ExercisePhoto ex={v.ex} size={64} /></div>
              <div className="font-semibold leading-tight">{v.ex.name}</div>
              <div className="text-2xs uppercase tracking-wide text-muted text-right">{v.ex.cardio ? '' : 'RIR'}</div>
              {Array.from({ length: lines }, (_, i) => (
                <div key={i} className="contents">
                  <div className="text-sm text-muted">
                    {v.ex.cardio ? 'Cardio' : i === v.failureIdx ? t('Satz {0} · {1}+ Wdh, bis zum Versagen', i + 1, v.setRanges[i].min) : t('Satz {0} · {1}–{2} {3}', i + 1, v.setRanges[i].min, v.setRanges[i].max, metricUnit(v.ex.metric, distanceUnitOf(v.ex)))}
                  </div>
                  <div className="text-sm font-bold text-right tabular-nums" style={v.ex.cardio ? undefined : { color: rirColor(v.setRirs[i]) }}>
                    {v.ex.cardio ? '' : v.setRirs[i]}
                  </div>
                </div>
              ))}
              {progressionNote(v.sug, v.range, settings.weightUnit, v.bodyLoad) && (
                <div className="text-xs text-warn col-span-2">{progressionNote(v.sug, v.range, settings.weightUnit, v.bodyLoad)}</div>
              )}
              {(() => {
                if (!whyOf(v)) return null
                const check = v.sug.level === 'check'
                return (
                  <button onClick={() => setWhyId(v.pe.exerciseId)} className={cx('col-span-2 flex items-center gap-1 text-xs text-left pointer-events-auto active:opacity-70', check ? 'text-warn' : 'text-muted')}>
                    <Icon name={check ? 'bolt' : 'sparkles'} size={13} />{check ? t('Vorschlag bitte prüfen') : t('Warum dieser Vorschlag?')}
                  </button>
                )
              })()}
              <div className="text-xs text-muted col-span-2 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0">{v.skipped ? t('Diese Woche ausgelassen') : <>{v.ex.primary.map(muscleLabel).join(', ')}{v.warmups.length > 0 ? t(' · {0} Aufwärmsätze', v.warmups.length) : ''}</>}</span>
                  {idx >= 0 && <button onClick={() => setMenuIdx(idx)} aria-label={t('Aktionen für {0}', v.ex.name)} className="pointer-events-auto -my-2 -mr-2 w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-fg active:opacity-70"><Icon name="more" /></button>}
                </div>
              </div>
            </div>
          </Card>
          </div>
        )
      })}

      <BottomSheet open={menuIdx !== null} onClose={() => setMenuIdx(null)} title={menuIdx !== null ? (exerciseById(day.exercises[menuIdx]?.exerciseId ?? '', all)?.name ?? '') : ''}>
        {(() => {
          const i = menuIdx
          const pe = i !== null ? day.exercises[i] : undefined
          const ex = pe ? exerciseById(pe.exerciseId, all) : undefined
          if (i === null || !pe) return null
          return (
            <div className="divide-y divide-line">
              <MenuRow icon="automation" label={t('Tauschen')} onClick={() => { setMenuIdx(null); setActIdx(i) }} />
              {!ex?.cardio && <MenuRow icon="target" label={pe.weeks ? t('Ziele · eigen') : t('Ziele')} onClick={() => { setMenuIdx(null); setEditIdx(i) }} />}
              {program.days.length > 1 && day.exercises.length > 1 && <MenuRow icon="program" label={t('In anderes Workout verschieben')} onClick={() => { setMenuIdx(null); setMoveIdx(i) }} />}
            </div>
          )
        })()}
      </BottomSheet>

      <BottomSheet open={moveIdx !== null} onClose={closeMove} title={moveDay === null ? t('Übung verschieben') : t('Position wählen')}>
        {(() => {
          const pe = moveIdx !== null ? day.exercises[moveIdx] : undefined
          if (!pe) return null
          const name = (id: string) => all.find((e) => e.id === id)?.name ?? id
          if (moveDay === null) {
            return (
              <>
                <p className="text-xs text-muted mb-3">{t('Wähle das Workout, in dem die Übung stehen soll (auch dieses, um die Reihenfolge zu ändern). Ihre Historie bleibt erhalten, ein Supersatz wird gelöst.')}</p>
                <div className="space-y-2">
                  {program.days.map((d, i) => {
                    const has = i !== dayIdx && d.exercises.some((e) => e.exerciseId === pe.exerciseId)
                    return (
                      <button key={d.id} disabled={has} onClick={() => setMoveDay(i)}
                        className="w-full text-left rounded-xl bg-surface2 px-4 py-3 active:opacity-70 disabled:opacity-40">
                        <div className="text-sm font-medium truncate">{d.name}{i === dayIdx ? t(' (dieses)') : ''}</div>
                        <div className="text-xs text-muted">{has ? t('Übung ist dort schon geplant') : t('{0} Übungen', d.exercises.length)}</div>
                      </button>
                    )
                  })}
                </div>
              </>
            )
          }
          const target = program.days[moveDay]
          const others = target.exercises.filter((e) => e.exerciseId !== pe.exerciseId)
          const slotBtn = (at: number, label: string) => (
            <button key={at} onClick={() => moveTo(moveDay, at)} className="w-full text-left rounded-xl bg-surface2 px-4 py-3 text-sm font-medium active:opacity-70">{label}</button>
          )
          return (
            <>
              <p className="text-xs text-muted mb-3">{target.name}{t(': Wo soll „')}{name(pe.exerciseId)}{t('“ stehen?')}</p>
              <div className="space-y-2">
                {slotBtn(0, others.length ? t('Ganz oben, vor „{0}“', name(others[0].exerciseId)) : t('Als einzige Übung'))}
                {others.map((e, i) => slotBtn(i + 1, t('Nach „{0}“{1}', name(e.exerciseId), i === others.length - 1 ? t(' (ganz unten)') : '')))}
              </div>
              <button className="text-accent text-sm mt-3" onClick={() => setMoveDay(null)}>{t('‹ Anderes Workout wählen')}</button>
            </>
          )
        })()}
      </BottomSheet>

      {(() => {
        const wv = whyId ? views.find((v) => v.pe.exerciseId === whyId) : undefined
        return <SuggestionSheet open={!!wv} onClose={() => setWhyId(null)} warn={wv?.sug.level === 'check'}
          info={wv ? reasonText(wv.sug, wv.range, settings.weightUnit, wv.ex.metric ?? 'reps', wv.bodyLoad, distanceUnitOf(wv.ex)) : null} />
      })()}
      <ExerciseActionsSheet open={!!actPe} onClose={() => setActIdx(null)}
        name={actPe ? (exerciseById(actPe.exerciseId, all)?.name ?? '') : ''}
        canRemove={day.exercises.length > 1} hasDone={false}
        onSwap={() => setSwapIdx(actIdx)}
        onRemove={() => { if (actPe) editDay((l) => removeFromDay(l, actPe.exerciseId)) }} />
      <ExercisePicker open={!!swapPe} onClose={() => setSwapIdx(null)} exercises={swapCandidates} title={t('Übung tauschen')} allowCardio={false}
        onPick={(to) => {
          const from = swapPe?.exerciseId
          setSwapIdx(null)
          if (from) editDay((l) => swapInDay(l, from, to, (id) => exerciseById(id, all), program.config ?? undefined))
        }} />

      <WeekTargetSheet open={!!editView} onClose={() => setEditIdx(null)} unit={metricUnit(editView?.ex.metric, distanceUnitOf(editView?.ex))}
        title={editView ? `${editView.ex.name} · ${weekLabel(program, curWeek)}` : ''}
        computed={(() => {
          if (!editView || editIdx === null) return { sets: 0, repMin: 0, repMax: 0, rir: 0, perSet: [] }
          const base = { ...editView.pe, weeks: undefined }
          const tg = exerciseTargets(base, plan, editIdx, isRepless(editView.ex.metric), editView.ex.compound)
          const n = plannedSets(base, plan)
          return { sets: n, repMin: tg.range.min, repMax: tg.range.max, rir: tg.rir, perSet: Array.from({ length: n }, (_, i) => ({ repMin: tg.range.min, repMax: tg.range.max, rir: setRir(tg.rir, i, n, !!editView.ex.compound, !!settings.hardSetFirst) })) }
        })()}
        scopes={[{ key: `w${curWeek}`, label: t('Nur diese Woche') }, ...(program.config && plan.blockPos != null ? [{ key: `b${plan.blockPos}`, label: t('In jedem Block') }] : [])]}
        current={(key) => editPe?.weeks?.[key]}
        dayWide={(day?.exercises.length ?? 0) > 1 || program.days.length > 1}
        allDays={program.days.length > 1}
        onSave={saveWeek} />

    </>
  )

  if (embedded) return <div className="space-y-4 flex flex-col">{body}</div>

  return (
    <Page title={day.name} back={() => nav('/workouts')}
      right={(
        <span className="flex items-center gap-2">
          {plan.isDeload && <span className="text-xs rounded-full bg-warn/20 text-warn px-2 py-1">Deload</span>}
          <button onClick={() => setManageOpen(true)} aria-label={t('Workout verwalten')} className="w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-fg active:opacity-70"><Icon name="menu" /></button>
        </span>
      )}>
      {body}
      <DayManageSheet program={program} dayIdx={dayIdx} open={manageOpen} onClose={() => setManageOpen(false)} onUnscheduled={() => nav('/workouts')} />

      <BottomBar>
        <div className="flex gap-2">
          {canSkip && (
            <Button variant="ghost" className="shrink-0" onClick={async () => { await saveWeekState(skipSlot(week, ownSlot!)); nav('/workouts') }}>
              {t('Überspringen')}
            </Button>
          )}
          {skipped ? (
            <Button variant="ghost" className="w-full" onClick={() => saveWeekState(unmarkSlot(week, ownSlot!))}>{t('Nicht mehr überspringen')}</Button>
          ) : (
            <Button className="w-full" onClick={() => nav(`/workout/${param}`)}>
              {running === param ? t('Workout fortsetzen') : t('Workout starten')}
            </Button>
          )}
        </div>
      </BottomBar>
    </Page>
  )
}
