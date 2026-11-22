import { isRepless, metricUnit } from '../../engine/metric'
import { useMemo, useState } from 'react'
import { todayStr } from '../../utils/dates'
import { useNavigate, useParams } from 'react-router-dom'
import { BottomBar, Button, Card, Page, cx } from '../../components/ui'
import { MuscleThumb } from '../../components/MuscleFigure'
import { Icon } from '../../components/icons'
import { ExercisePhoto } from '../../components/ExerciseMedia'
import { rirColor } from '../../components/rir'
import { progressionNote } from './progressionNote'
import { db, saveWeekState, useProgramByParam, useActiveWorkoutParam, useAllExercises, useExerciseOverrides, useSessions, useSettings, useWeekState, useWeights } from '../../db/db'
import { muscleLabel } from '../../data/muscles'
import { exerciseTargets, neutralWeek, plannedSets, setWeekTarget, weekPlan } from '../../engine/periodization'
import { WeekTargetSheet } from './WeekTargetSheet'
import { weekLabel } from '../../engine/weekCycle'
import { deloadSessionOf, plannedDay } from '../../engine/plannedDay'
import { historyUpTo, isSlotSkipped, maxReachedWeek, skipSlot, unmarkSlot } from '../../engine/weekCycle'
import { targetMuscles } from '../../engine/targetMuscles'
import { de } from '../../i18n/de'

/** Vorschau eines Workouts: Übungen, Sätze, Rep-Bereiche und Ziel-RIR. Start über den Button unten. */
export default function WorkoutPreview() {
  const { slot: param = 's0' } = useParams()
  const nav = useNavigate()
  const program = useProgramByParam(param)
  const week = useWeekState()
  const sessions = useSessions()
  const bodyweights = useWeights()
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
  const saveWeek = (key: string, t: Parameters<typeof setWeekTarget>[2]) => {
    if (!program?.id || editIdx === null) return
    const days = program.days.map((d, di) => (di !== dayIdx ? d : { ...d, exercises: d.exercises.map((x, xi) => (xi === editIdx ? setWeekTarget(x, key, t) : x)) }))
    void db.programs.update(program.id, { days })
  }

  if (!program || !day) {
    return <Page title="Workout" back={() => nav('/workouts')}><Card>Workout nicht gefunden.</Card></Page>
  }

  return (
    <Page title={day.name} back={() => nav('/workouts')}
      right={plan.isDeload ? <span className="text-xs rounded-full bg-warn/20 text-warn px-2 py-1">Deload</span> : undefined}>
      {targets.length > 0 && (
        <section className="space-y-2" aria-label={de.workouts.targetMuscles}>
          <h2 className="font-semibold">{de.workouts.targetMuscles}</h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-1">
            {targets.map((t) => (
              <button key={t.muscle} onClick={() => setFocus(focus === t.muscle ? null : t.muscle)} aria-pressed={focus === t.muscle}
                className={cx('shrink-0 min-w-[10.5rem] rounded-2xl border-2 bg-surface p-2 pr-4 flex items-center gap-3 text-left',
                  focus === t.muscle ? 'border-accent' : focus ? 'border-transparent opacity-60' : 'border-transparent')}>
                <MuscleThumb primary={[t.muscle]} secondary={[]} size={56} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight">{muscleLabel(t.muscle)}</span>
                  <span className="block text-xs text-muted mt-0.5">{t.exercises} {t.exercises === 1 ? 'Übung' : 'Übungen'}</span>
                  <span className="block text-xs text-muted">{t.sets} {t.sets === 1 ? 'Satz' : 'Sätze'}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="text-sm text-muted">{active.length} {active.length === 1 ? 'Übung' : 'Übungen'}{views.length > active.length ? ` · ${views.length - active.length} diese Woche ausgelassen` : ''}</div>

      {views.map((v) => {
        const lines = v.ex.cardio ? 1 : v.sets
        const dim = v.skipped || (focus !== null && !v.ex.primary.some((m) => m === focus))
        const idx = day.exercises.indexOf(v.pe)
        // Supersatz nur mit Übungen, die diese Woche trainiert werden
        const ai = active.indexOf(v)
        const ss = v.skipped ? undefined : v.pe.superset
        const ssStart = !!ss && active[ai - 1]?.pe.superset !== ss && active[ai + 1]?.pe.superset === ss
        const ssLinked = !!ss && (active[ai - 1]?.pe.superset === ss || active[ai + 1]?.pe.superset === ss)
        return (
          <div key={v.pe.exerciseId}>
          {ssStart && <div className="text-xs font-semibold text-accent flex items-center gap-1 mb-1 px-1"><Icon name="link" size={13} />Supersatz</div>}
          <Card className={cx('!p-3 transition-opacity', ssLinked && 'border-l-4 border-l-accent', dim && 'opacity-40 grayscale')}>
            <div className="grid grid-cols-[64px_1fr_auto] gap-x-3 gap-y-1 items-center">
              <div style={{ gridRow: `1 / span ${lines + 2 + (progressionNote(v.sug, v.range, settings.weightUnit, v.bodyLoad) ? 1 : 0)}` }} className="self-start"><ExercisePhoto ex={v.ex} size={64} /></div>
              <div className="font-semibold leading-tight">{v.ex.name}</div>
              <div className="text-2xs uppercase tracking-wide text-muted text-right">{v.ex.cardio ? '' : 'RIR'}</div>
              {Array.from({ length: lines }, (_, i) => (
                <div key={i} className="contents">
                  <div className="text-sm text-muted">
                    {v.ex.cardio ? 'Cardio' : i === v.failureIdx ? `Satz ${i + 1} · ${v.range.min}+ Wdh, bis zum Versagen` : `Satz ${i + 1} · ${v.range.min}–${v.range.max} ${metricUnit(v.ex.metric)}`}
                  </div>
                  <div className="text-sm font-bold text-right tabular-nums" style={v.ex.cardio ? undefined : { color: rirColor(v.setRirs[i]) }}>
                    {v.ex.cardio ? '' : v.setRirs[i]}
                  </div>
                </div>
              ))}
              {progressionNote(v.sug, v.range, settings.weightUnit, v.bodyLoad) && (
                <div className="text-xs text-warn col-span-2">{progressionNote(v.sug, v.range, settings.weightUnit, v.bodyLoad)}</div>
              )}
              <div className="text-xs text-muted col-span-2 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">{v.skipped ? 'Diese Woche ausgelassen' : <>{v.ex.primary.map(muscleLabel).join(', ')}{v.warmups.length > 0 ? ` · ${v.warmups.length} Aufwärmsätze` : ''}</>}</span>
                {!v.ex.cardio && idx >= 0 && <button className="text-accent shrink-0 pointer-events-auto" onClick={() => setEditIdx(idx)}>{v.pe.weeks ? 'Ziele · eigen' : 'Ziele'}</button>}
              </div>
            </div>
          </Card>
          </div>
        )
      })}

      <WeekTargetSheet open={!!editView} onClose={() => setEditIdx(null)} unit={metricUnit(editView?.ex.metric)}
        title={editView ? `${editView.ex.name} · ${weekLabel(program, curWeek)}` : ''}
        computed={(() => {
          if (!editView || editIdx === null) return { sets: 0, repMin: 0, repMax: 0, rir: 0 }
          const base = { ...editView.pe, weeks: undefined }
          const t = exerciseTargets(base, plan, editIdx, isRepless(editView.ex.metric), editView.ex.compound)
          return { sets: plannedSets(base, plan), repMin: t.range.min, repMax: t.range.max, rir: t.rir }
        })()}
        scopes={[{ key: `w${curWeek}`, label: 'Nur diese Woche' }, ...(program.config && plan.blockPos != null ? [{ key: `b${plan.blockPos}`, label: 'In jedem Block' }] : [])]}
        current={(key) => editPe?.weeks?.[key]}
        onSave={saveWeek} />

      <BottomBar>
        <div className="flex gap-2">
          {canSkip && (
            <Button variant="ghost" className="shrink-0" onClick={async () => { await saveWeekState(skipSlot(week, ownSlot!)); nav('/workouts') }}>
              Überspringen
            </Button>
          )}
          {skipped ? (
            <Button variant="ghost" className="w-full" onClick={() => saveWeekState(unmarkSlot(week, ownSlot!))}>Nicht mehr überspringen</Button>
          ) : (
            <Button className="w-full" onClick={() => nav(`/workout/${param}`)}>
              {running === param ? 'Workout fortsetzen' : 'Workout starten'}
            </Button>
          )}
        </div>
      </BottomBar>
    </Page>
  )
}
