import { useMemo, useState } from 'react'
import { todayStr } from '../../utils/dates'
import { useNavigate, useParams } from 'react-router-dom'
import { BottomBar, Button, Card, Page, cx } from '../../components/ui'
import { MuscleThumb } from '../../components/MuscleFigure'
import { ExercisePhoto } from '../../components/ExerciseMedia'
import { rirColor } from '../../components/rir'
import { useProgramByParam, useActiveWorkoutParam, useAllExercises, useExerciseOverrides, useSessions, useSettings, useWeekState, useWeights } from '../../db/db'
import { muscleLabel } from '../../data/muscles'
import { NEUTRAL_WEEK, weekPlan } from '../../engine/periodization'
import { deloadSessionOf, plannedDay } from '../../engine/plannedDay'
import { historyUpTo, maxReachedWeek } from '../../engine/weekCycle'
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

  const local = param.replace(/^p\d+-/, '')
  const slotIdx = local.startsWith('s') ? Number(local.slice(1)) : null
  const dayIdx = !program ? -1 : slotIdx !== null
    ? (program.weekSlots[slotIdx] === 'rest' ? -1 : (program.weekSlots[slotIdx] as number)) : Number(local.slice(1))
  const curWeek = program && !program.active ? maxReachedWeek(program, sessions, 0) : week.week
  const day = program?.days[dayIdx]
  const plan = useMemo(
    () => (program?.config ? weekPlan(program.config, curWeek) : NEUTRAL_WEEK),
    [program, curWeek],
  )
  const views = useMemo(
    () => (day ? plannedDay(day, plan, historyUpTo(sessions, program?.id, curWeek), (id) => all.find((e) => e.id === id), settings, overrides, deloadSessionOf(program), todayStr(), bodyweights) : []),
    [day, plan, sessions, program, curWeek, all, settings, overrides, bodyweights],
  )

  const targets = useMemo(() => targetMuscles(views.map((v) => ({ ex: v.ex, sets: v.sets }))), [views])

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

      <div className="text-sm text-muted">{views.length} Übungen</div>

      {views.map((v) => {
        const lines = v.ex.cardio ? 1 : v.sets
        const dim = focus !== null && !v.ex.primary.some((m) => m === focus)
        return (
          <Card key={v.pe.exerciseId} className={cx('!p-3 transition-opacity', dim && 'opacity-40 grayscale')}>
            <div className="grid grid-cols-[64px_1fr_auto] gap-x-3 gap-y-1 items-center">
              <div style={{ gridRow: `1 / span ${lines + 2}` }} className="self-start"><ExercisePhoto ex={v.ex} size={64} /></div>
              <div className="font-semibold leading-tight">{v.ex.name}</div>
              <div className="text-2xs uppercase tracking-wide text-muted text-right">{v.ex.cardio ? '' : 'RIR'}</div>
              {Array.from({ length: lines }, (_, i) => (
                <div key={i} className="contents">
                  <div className="text-sm text-muted">
                    {v.ex.cardio ? 'Cardio' : v.failureLast && i === v.sets - 1 ? `Satz ${i + 1} · ${v.range.min}+ Wdh, bis zum Versagen` : `Satz ${i + 1} · ${v.range.min}–${v.range.max} ${v.ex.metric === 'time' ? 'Sek' : 'Wdh'}`}
                  </div>
                  <div className="text-sm font-bold text-right tabular-nums" style={v.ex.cardio ? undefined : { color: rirColor(v.setRirs[i]) }}>
                    {v.ex.cardio ? '' : v.setRirs[i]}
                  </div>
                </div>
              ))}
              <div className="text-xs text-muted col-span-2">
                {v.ex.primary.map(muscleLabel).join(', ')}{v.warmups.length > 0 ? ` · ${v.warmups.length} Aufwärmsätze` : ''}
              </div>
            </div>
          </Card>
        )
      })}

      <BottomBar>
          <Button className="w-full" onClick={() => nav(`/workout/${param}`)}>
            {running === param ? 'Workout fortsetzen' : 'Workout starten'}
          </Button>
        </BottomBar>
    </Page>
  )
}
