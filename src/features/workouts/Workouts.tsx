import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Page, cx } from '../../components/ui'
import { saveWeekState, useActiveProgram, useActiveWorkoutParam, useSessions, useSettings, useWeekState } from '../../db/db'
import { formatTime } from '../../utils/units'
import { markSlot, unmarkSlot } from '../../engine/weekCycle'
import { weekPlan } from '../../engine/periodization'
import { WEEKDAYS, addDays, todayStr, weekStart, weekdayIndex, formatDate } from '../../utils/dates'

function WeekStrip({ marked }: { marked: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const today = todayStr()
  const start = addDays(weekStart(today), -14)
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  useEffect(() => {
    const el = ref.current
    if (el) el.scrollLeft = (el.scrollWidth / 42) * 14
  }, [])
  return (
    <div ref={ref} className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory">
      {days.map((d) => {
        const isMarked = marked.includes(d)
        return (
          <div key={d} style={{ flex: '0 0 calc((100% - 0px) / 7)' }} className="snap-start flex flex-col items-center gap-1 py-1">
            <span className="text-[11px] text-muted">{WEEKDAYS[weekdayIndex(d)]}</span>
            <span className={cx(
              'w-9 h-9 rounded-full flex items-center justify-center text-sm border',
              isMarked ? 'bg-accent text-slate-900 border-accent font-bold' : d === today ? 'border-accent text-accent' : 'border-line',
            )}>{Number(d.slice(8))}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Workouts() {
  const nav = useNavigate()
  const program = useActiveProgram()
  const week = useWeekState()
  const sessions = useSessions()
  const settings = useSettings()
  const running = useActiveWorkoutParam()

  if (!program) {
    return (
      <Page title="Workouts">
        <Card className="text-center space-y-3 py-8">
          <div className="text-4xl">🏋️</div>
          <div className="font-semibold">Noch kein Programm</div>
          <p className="text-sm text-muted">Erstelle dein erstes Programm – automatisch oder selbst.</p>
          <Button onClick={() => nav('/new')}>Programm erstellen</Button>
        </Card>
      </Page>
    )
  }

  const plan = program.config ? weekPlan(program.config, week.week) : null
  const scheduled = new Set(program.weekSlots.filter((s): s is number => s !== 'rest'))
  const extra = program.days.map((d, i) => ({ d, i })).filter(({ i }) => !scheduled.has(i))
  const cycleSessions = sessions.filter((s) => s.programId === program.id && s.week === week.week)

  const toggleRest = (slot: number) =>
    saveWeekState(week.done[slot] ? unmarkSlot(week, slot) : markSlot(week, slot, todayStr()))

  return (
    <Page title="Workouts">
      <Card className="!px-4 !py-3"><WeekStrip marked={week.markedDates} /></Card>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{program.icon} {program.name}</div>
          <div className="text-xs text-muted">Woche {week.week + 1}{plan?.isDeload ? ' · Deload' : ''}</div>
        </div>
        <Button variant="ghost" onClick={() => nav('/new')}>Neues Programm</Button>
      </div>

      {running && (
        <Card className="flex items-center justify-between !py-3 border-accent">
          <div className="text-sm font-medium">Ein Workout läuft</div>
          <Button onClick={() => nav(`/workout/${running}`)}>Fortsetzen</Button>
        </Card>
      )}

      <div className="space-y-2">
        {program.weekSlots.map((slot, i) => {
          const done = week.done[i]
          if (slot === 'rest') {
            return (
              <Card key={i} className="flex items-center justify-between !py-3">
                <div><div className="text-sm font-medium">Rest Day</div><div className="text-xs text-muted">Tag {i + 1}</div></div>
                <button onClick={() => toggleRest(i)}
                  className={cx('w-8 h-8 rounded-full border flex items-center justify-center', done ? 'bg-accent border-accent text-slate-900' : 'border-line text-transparent')}
                  aria-label="Ruhetag abhaken">✓</button>
              </Card>
            )
          }
          const day = program.days[slot]
          const s = cycleSessions.find((x) => x.dayIndex === slot)
          return (
            <Card key={i} className="flex items-center justify-between !py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{day.name}</div>
                <div className="text-xs text-muted">
                  {done ? `Geloggt${s ? ` · ${formatDate(s.date)} · ${formatTime(new Date(s.finishedAt), settings.clock)}` : ''}` : `${day.exercises.length} Übungen · Tag ${i + 1}`}
                </div>
              </div>
              {done
                ? <span className="text-accent text-sm font-semibold">✓ Geloggt</span>
                : <Button onClick={() => nav(`/workout-preview/s${i}`)}>Öffnen</Button>}
            </Card>
          )
        })}
      </div>

      {extra.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted">Zusätzliche Workouts</div>
          {extra.map(({ d, i }) => (
            <Card key={d.id} className="flex items-center justify-between !py-3">
              <div className="text-sm font-medium">{d.name}</div>
              <Button variant="ghost" onClick={() => nav(`/workout-preview/d${i}`)}>Öffnen</Button>
            </Card>
          ))}
        </div>
      )}
    </Page>
  )
}
