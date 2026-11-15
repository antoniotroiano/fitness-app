import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Page } from '../../components/ui'
import { ExerciseThumb } from '../../components/ExerciseThumb'
import { rirColor } from '../../components/rir'
import { useActiveProgram, useActiveWorkoutParam, useAllExercises, useSessions, useSettings, useWeekState } from '../../db/db'
import { muscleLabel } from '../../data/muscles'
import { weekPlan } from '../../engine/periodization'
import { plannedDay } from '../../engine/plannedDay'

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

  const slotIdx = param.startsWith('s') ? Number(param.slice(1)) : null
  const dayIdx = !program ? -1 : slotIdx !== null
    ? (program.weekSlots[slotIdx] === 'rest' ? -1 : (program.weekSlots[slotIdx] as number)) : Number(param.slice(1))
  const day = program?.days[dayIdx]
  const plan = useMemo(
    () => (program?.config ? weekPlan(program.config, week.week) : { isDeload: false, repShift: 0, rirDelta: 0, setsFactor: 1 }),
    [program, week.week],
  )
  const views = useMemo(
    () => (day ? plannedDay(day, plan, sessions, (id) => all.find((e) => e.id === id), settings.warmupsEnabled) : []),
    [day, plan, sessions, all, settings.warmupsEnabled],
  )

  if (!program || !day) {
    return <Page title="Workout" back={() => nav('/workouts')}><Card>Workout nicht gefunden.</Card></Page>
  }

  return (
    <Page title={day.name} back={() => nav('/workouts')}
      right={plan.isDeload ? <span className="text-xs rounded-full bg-amber-500/20 text-amber-500 px-2 py-1">Deload</span> : undefined}>
      <div className="text-sm text-muted">{views.length} Übungen</div>

      {views.map((v) => {
        const lines = v.ex.cardio ? 1 : v.sets
        return (
          <Card key={v.pe.exerciseId} className="!p-3">
            <div className="grid grid-cols-[64px_1fr_auto] gap-x-3 gap-y-1 items-center">
              <div style={{ gridRow: `1 / span ${lines + 2}` }} className="self-start"><ExerciseThumb ex={v.ex} size={64} /></div>
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
