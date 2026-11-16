import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Page, cx } from '../../components/ui'
import { MuscleThumb } from '../../components/MuscleFigure'
import { ExercisePhoto } from '../../components/ExerciseMedia'
import { rirColor } from '../../components/rir'
import { useActiveProgram, useActiveWorkoutParam, useAllExercises, useSessions, useSettings, useWeekState } from '../../db/db'
import { muscleLabel } from '../../data/muscles'
import { weekPlan } from '../../engine/periodization'
import { plannedDay } from '../../engine/plannedDay'
import { historyUpTo } from '../../engine/weekCycle'
import { targetMuscles } from '../../engine/targetMuscles'

/** Vorschau eines Workouts: Übungen, Sätze, Rep-Bereiche und Ziel-RIR. Start über den Button unten. */
export default function WorkoutPreview() {
  const { slot: param = 's0' } = useParams()
  const nav = useNavigate()
  const program = useActiveProgram()
  const week = useWeekState()
  const sessions = useSessions()
  const settings = useSettings()
  const all = useAllExercises()
  const running = useActiveWorkoutParam()
  const [focus, setFocus] = useState<string | null>(null)

  const slotIdx = param.startsWith('s') ? Number(param.slice(1)) : null
  const dayIdx = !program ? -1 : slotIdx !== null
    ? (program.weekSlots[slotIdx] === 'rest' ? -1 : (program.weekSlots[slotIdx] as number)) : Number(param.slice(1))
  const day = program?.days[dayIdx]
  const plan = useMemo(
    () => (program?.config ? weekPlan(program.config, week.week) : { isDeload: false, repShift: 0, rirDelta: 0, setsFactor: 1 }),
    [program, week.week],
  )
  const views = useMemo(
    () => (day ? plannedDay(day, plan, historyUpTo(sessions, program?.id, week.week), (id) => all.find((e) => e.id === id), settings.warmupsEnabled) : []),
    [day, plan, sessions, program?.id, week.week, all, settings.warmupsEnabled],
  )

  const targets = useMemo(() => targetMuscles(views.map((v) => ({ ex: v.ex, sets: v.sets }))), [views])

  if (!program || !day) {
    return <Page title="Workout" back={() => nav('/workouts')}><Card>Workout nicht gefunden.</Card></Page>
  }

  return (
    <Page title={day.name} back={() => nav('/workouts')}
      right={plan.isDeload ? <span className="text-xs rounded-full bg-amber-500/20 text-amber-500 px-2 py-1">Deload</span> : undefined}>
      {targets.length > 0 && (
        <section className="space-y-2" aria-label="Target Muscles">
          <h2 className="font-semibold">Target Muscles</h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-1">
            {targets.map((t) => (
              <button key={t.muscle} onClick={() => setFocus(focus === t.muscle ? null : t.muscle)} aria-pressed={focus === t.muscle}
                className={cx('shrink-0 min-w-[10.5rem] rounded-2xl border-2 bg-surface p-2 pr-4 flex items-center gap-3 text-left',
                  focus === t.muscle ? 'border-accent' : focus ? 'border-line opacity-60' : 'border-line')}>
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
              <div className="text-[10px] uppercase tracking-wide text-muted text-right">{v.ex.cardio ? '' : 'RIR'}</div>
              {Array.from({ length: lines }, (_, i) => (
                <div key={i} className="contents">
                  <div className="text-sm text-muted">
                    {v.ex.cardio ? 'Cardio' : `Satz ${i + 1} · ${v.range.min}–${v.range.max} Wdh`}
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

      <div className="fixed bottom-0 inset-x-0 p-4 bg-bg/90 backdrop-blur border-t border-line safe-bottom z-30">
        <div className="max-w-2xl mx-auto">
          <Button className="w-full" onClick={() => nav(`/workout/${param}`)}>
            {running === param ? 'Workout fortsetzen' : 'Workout starten'}
          </Button>
        </div>
      </div>
    </Page>
  )
}
