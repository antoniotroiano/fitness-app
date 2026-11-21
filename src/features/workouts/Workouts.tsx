import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, LinkButton, Page, cx } from '../../components/ui'
import { ProgramBadge } from '../../components/icons'
import { activateProgram, deleteProgram, saveWeekState, useActiveProgram, useActiveWorkoutParam, usePrograms, useSessions, useSettings, useWeekState } from '../../db/db'
import { sessionDates } from '../../engine/habits'
import { formatTime } from '../../utils/units'
import { jumpToWeek, markSlot, unmarkSlot, weekLabel, weekOptions } from '../../engine/weekCycle'
import { WeekSheet } from './WeekSheet'
import { WEEKDAYS, addDays, fmt, todayStr, weekStart, weekdayIndex, formatDate } from '../../utils/dates'
import { de } from '../../i18n/de'

function WeekStrip({ marked }: { marked: Set<string> }) {
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
        const isMarked = marked.has(d)
        return (
          <div key={d} style={{ flex: '0 0 calc((100% - 0px) / 7)' }} className="snap-start flex flex-col items-center gap-1 py-1">
            <span className="text-2xs text-muted">{WEEKDAYS[weekdayIndex(d)]}</span>
            <span className={cx(
              'w-9 h-9 rounded-full flex items-center justify-center text-sm border',
              isMarked ? 'border-2 border-accent font-bold' : d === today ? 'border-line bg-surface2 font-semibold' : 'border-line text-muted',
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
  const [weekSheet, setWeekSheet] = useState(false)
  const programs = usePrograms()
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [confirmDel, setConfirmDel] = useState<number | null>(null)
  // Nur absolvierte Workouts füllen den Kalender (Ruhetage nicht)
  const workoutDays = useMemo(() => sessionDates(sessions), [sessions])
  const weekCounts = useMemo(() => {
    const c: Record<number, number> = {}
    sessions.forEach((x) => { if (x.programId === program?.id) c[x.week] = (c[x.week] ?? 0) + 1 })
    return c
  }, [sessions, program?.id])

  if (!program) {
    return (
      <Page title="Workouts">
        <Card className="text-center space-y-3 py-8">
          <div className="flex justify-center"><ProgramBadge size={56} /></div>
          <div className="font-semibold">Noch kein Programm</div>
          <p className="text-sm text-muted">Erstelle dein erstes Programm – automatisch oder selbst.</p>
          <Button onClick={() => nav('/new')}>Programm erstellen</Button>
        </Card>
      </Page>
    )
  }

  const others = programs.filter((p) => p.id !== program.id)
  const allOpen = others.length > 0 && others.every((p) => expanded[p.id as number])
  const scheduled = new Set(program.weekSlots.filter((s): s is number => s !== 'rest'))
  const extra = program.days.map((d, i) => ({ d, i })).filter(({ i }) => !scheduled.has(i))
  const cycleSessions = sessions.filter((s) => s.programId === program.id && s.week === week.week)

  const toggleRest = (slot: number) =>
    saveWeekState(week.done[slot] ? unmarkSlot(week, slot) : markSlot(week, slot, null))

  return (
    <Page title="Workouts">
      <Card className="!px-4 !py-3"><WeekStrip marked={workoutDays} /></Card>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">{de.workouts.activeProgram}</div>
          <div className="font-semibold flex items-center gap-2"><ProgramBadge icon={program.icon} color={program.color} size={28} />{program.name}</div>
        </div>
        <button onClick={() => setWeekSheet(true)} aria-haspopup="dialog"
          className="rounded-xl bg-surface2 px-3 py-2 text-sm font-semibold active:opacity-70">
          {weekLabel(program, week.week)} <span className="text-muted">▾</span>
        </button>
      </div>

      <WeekSheet open={weekSheet} onClose={() => setWeekSheet(false)} current={week.week}
        options={weekOptions(program, sessions, week.week)} counts={weekCounts}
        onPick={async (w) => { await saveWeekState(jumpToWeek(program, sessions, w)); setWeekSheet(false) }} />

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
                <div><div className="text-sm font-medium">{de.common.restDay}</div><div className="text-xs text-muted">Tag {i + 1}</div></div>
                <button onClick={() => toggleRest(i)}
                  className={cx('w-8 h-8 rounded-full border flex items-center justify-center', done ? 'bg-accent border-accent text-accent-fg' : 'border-line text-transparent')}
                  aria-label="Ruhetag abhaken">✓</button>
              </Card>
            )
          }
          const day = program.days[slot]
          const s = cycleSessions.find((x) => x.dayIndex === slot)
          const open = () => nav(`/workout-preview/s${i}`)
          return (
            <Card key={i} className="!p-0">
              <div role="button" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
                className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer active:opacity-70">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{day.name}</div>
                  <div className="text-xs text-muted">
                    {done ? `Geloggt${s ? ` · ${formatDate(s.date)} · ${formatTime(new Date(s.finishedAt), settings.clock)}` : ''}` : `${day.exercises.length} Übungen · Tag ${i + 1}`}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); open() }} aria-label={`${day.name} öffnen`}
                  className={cx('w-8 h-8 shrink-0 rounded-full border flex items-center justify-center', done ? 'bg-accent border-accent text-accent-fg' : 'border-line text-transparent')}>✓</button>
              </div>
            </Card>
          )
        })}
      </div>

      {extra.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted">Zusätzliche Workouts</div>
          {extra.map(({ d, i }) => (
            <Card key={d.id} className="!p-0">
              <div role="button" tabIndex={0} onClick={() => nav(`/workout-preview/d${i}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(`/workout-preview/d${i}`) } }}
                className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer active:opacity-70">
                <div className="text-sm font-medium truncate">{d.name}</div>
                <button onClick={(e) => { e.stopPropagation(); nav(`/workout-preview/d${i}`) }} aria-label={`${d.name} öffnen`}
                  className="w-8 h-8 shrink-0 rounded-full border border-line text-transparent">✓</button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <section className="space-y-2 pt-2" aria-label={de.workouts.library}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{de.workouts.library}</h2>
            <LinkButton
              onClick={() => setExpanded(allOpen ? {} : Object.fromEntries(others.map((p) => [p.id as number, true])))}>
              {allOpen ? de.workouts.collapse : de.workouts.expand}
            </LinkButton>
          </div>
          {others.map((p) => {
            const id = p.id as number
            const open = !!expanded[id]
            return (
              <Card key={id} className="!p-0 overflow-hidden">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left" aria-expanded={open}
                  onClick={() => setExpanded((x) => ({ ...x, [id]: !open }))}>
                  <ProgramBadge icon={p.icon} color={p.color} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{p.name}</span>
                    <span className="block text-xs text-muted">{p.days.length} Workouts · {formatDate(fmt(new Date(p.createdAt)))}</span>
                  </span>
                  <span className={cx('text-muted transition-transform', open && 'rotate-90')}>›</span>
                </button>
                {open && (
                  <div className="border-t border-line px-4 py-3 space-y-3">
                    <div className="space-y-2">
                      {p.weekSlots.map((slot, i) => {
                        if (slot === 'rest') {
                          return (
                            <div key={i} className="rounded-xl bg-surface2/60 px-4 py-3">
                              <div className="text-sm font-medium">{de.common.restDay}</div><div className="text-xs text-muted">Tag {i + 1}</div>
                            </div>
                          )
                        }
                        const d = p.days[slot]
                        const go = () => nav(`/workout-preview/p${id}-s${i}`)
                        return (
                          <button key={i} onClick={go} className="w-full text-left rounded-xl bg-surface2/60 px-4 py-3 active:opacity-70">
                            <div className="text-sm font-medium truncate">{d.name}</div>
                            <div className="text-xs text-muted">{d.exercises.length} Übungen · Tag {i + 1}</div>
                          </button>
                        )
                      })}
                      {p.days.map((d, i) => ({ d, i })).filter(({ i }) => !p.weekSlots.includes(i)).map(({ d, i }) => (
                        <button key={d.id} onClick={() => nav(`/workout-preview/p${id}-d${i}`)} className="w-full text-left rounded-xl bg-surface2/60 px-4 py-3 active:opacity-70">
                          <div className="text-sm font-medium truncate">{d.name}</div>
                          <div className="text-xs text-muted">{d.exercises.length} Übungen · Zusätzlich</div>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => void activateProgram(id)}>Als aktiv setzen</Button>
                      <Button variant="danger" className="flex-1"
                        onClick={() => (confirmDel === id ? (setConfirmDel(null), void deleteProgram(id)) : setConfirmDel(id))}>
                        {confirmDel === id ? 'Wirklich löschen?' : 'Löschen'}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </section>
      )}
    </Page>
  )
}
