import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet, Button, Card, Page, cx } from '../../components/ui'
import { Icon, ProgramBadge } from '../../components/icons'
import { activateProgram, archiveProgram, copyProgram, saveWeekState, updateProgram, useActiveProgram, useActiveWorkoutParam, usePrograms, useSessions, useSettings, useWeekState } from '../../db/db'
import { sessionDates } from '../../engine/habits'
import { formatTime } from '../../utils/units'
import { isSlotSkipped, jumpToWeek, markSlot, unmarkSlot, weekLabel, weekOptions } from '../../engine/weekCycle'
import { WeekSheet } from './WeekSheet'
import { ProgramSettingsSheet } from './ProgramSettingsSheet'
import { MenuRow } from './ProgramPage'
import { WeekOrderSheet } from './WeekOrderSheet'
import { WorkoutImportRow } from './DayManageSheet'
import { extendProgram, programEnded } from '../../engine/programAdmin'
import type { Program } from '../../types'
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
  const [editing, setEditing] = useState<Program | null>(null)
  const [ordering, setOrdering] = useState(false)
  const [menu, setMenu] = useState<'main' | 'archive' | null>(null)
  const [libOpen, setLibOpen] = useState(false)
  // Nur absolvierte Workouts füllen den Kalender (Ruhetage nicht)
  const workoutDays = useMemo(() => sessionDates(sessions), [sessions])
  const weekCounts = useMemo(() => {
    const c: Record<number, number> = {}
    sessions.forEach((x) => { if (x.programId === program?.id) c[x.week] = (c[x.week] ?? 0) + 1 })
    return c
  }, [sessions, program?.id])

  const archived = programs.filter((p) => p.archived)
  const menuButton = (
    <button onClick={() => setMenu('main')} aria-label="Workouts-Menü" className="w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-fg active:opacity-70">
      <Icon name="menu" />
    </button>
  )
  if (!program) {
    return (
      <Page title="Workouts" right={menuButton}>
        <Card className="text-center space-y-3 py-8">
          <div className="flex justify-center"><ProgramBadge size={56} /></div>
          <div className="font-semibold">Noch kein Programm</div>
          <p className="text-sm text-muted">Erstelle dein erstes Programm – automatisch oder selbst.</p>
          <Button onClick={() => nav('/new')}>Programm erstellen</Button>
        </Card>
        {archived.map((p) => (
          <Card key={p.id} className="flex items-center gap-3 !py-3">
            <ProgramBadge icon={p.icon} color={p.color} size={32} />
            <span className="min-w-0 flex-1 text-sm font-medium truncate">{p.name} <span className="text-muted">· Archiv</span></span>
            <Button variant="ghost" onClick={() => void activateProgram(p.id as number)}>Aktivieren</Button>
          </Card>
        ))}
      </Page>
    )
  }

  const others = programs.filter((p) => p.id !== program.id && !p.archived)
  const ended = programEnded(program, week.week)
  const scheduled = new Set(program.weekSlots.filter((s): s is number => s !== 'rest'))
  const extra = program.days.map((d, i) => ({ d, i })).filter(({ i }) => !scheduled.has(i))
  const cycleSessions = sessions.filter((s) => s.programId === program.id && s.week === week.week)

  const toggleRest = (slot: number) =>
    saveWeekState(week.done[slot] ? unmarkSlot(week, slot) : markSlot(week, slot, null))

  return (
    <Page title="Workouts" right={menuButton}>
      <Card className="!px-4 !py-3"><WeekStrip marked={workoutDays} /></Card>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">{de.workouts.activeProgram}</div>
          <div className="font-semibold flex items-center gap-2"><ProgramBadge icon={program.icon} color={program.color} size={28} />{program.name}
          </div>
        </div>
        <button onClick={() => setWeekSheet(true)} aria-haspopup="dialog"
          className="rounded-xl bg-surface2 px-3 py-2 text-sm font-semibold active:opacity-70">
          {weekLabel(program, week.week)} <span className="text-muted">▾</span>
        </button>
      </div>

      <WeekSheet open={weekSheet} onClose={() => setWeekSheet(false)} current={week.week}
        options={weekOptions(program, sessions, week.week)} counts={weekCounts}
        onPick={async (w) => { await saveWeekState(jumpToWeek(program, sessions, w)); setWeekSheet(false) }} />

      <WeekOrderSheet program={ordering ? program ?? null : null} onClose={() => setOrdering(false)} />
      <ProgramSettingsSheet program={editing} onClose={() => setEditing(null)}
        onSave={async (p) => { await updateProgram(p); setEditing(null) }} />

      {ended && (
        <Card className="space-y-3 border-accent">
          <div className="font-semibold">Programm-Ende erreicht</div>
          <p className="text-sm text-muted">Alle {program.config?.blocks} Blöcke von „{program.name}“ sind durchlaufen. Wie soll es weitergehen?</p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => void updateProgram(extendProgram(program))}>Block wiederholen</Button>
            <Button variant="ghost" className="flex-1" onClick={() => void archiveProgram(program.id as number)}>Abschließen</Button>
          </div>
          <Button variant="ghost" className="w-full" onClick={() => nav('/new')}>Neues Programm erstellen</Button>
        </Card>
      )}

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
                    {isSlotSkipped(week, i) ? 'Übersprungen' : done ? `Geloggt${s ? ` · ${formatDate(s.date)} · ${formatTime(new Date(s.finishedAt), settings.clock)}` : ''}` : `${day.exercises.length} Übungen · Tag ${i + 1}`}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); open() }} aria-label={`${day.name} öffnen`}
                  className={cx('w-8 h-8 shrink-0 rounded-full border flex items-center justify-center', isSlotSkipped(week, i) ? 'border-line text-muted' : done ? 'bg-accent border-accent text-accent-fg' : 'border-line text-transparent')}>{isSlotSkipped(week, i) ? '–' : '✓'}</button>
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
          <button className="w-full flex items-center justify-between text-left" aria-expanded={libOpen} onClick={() => setLibOpen((o) => !o)}>
            <h2 className="font-semibold">{de.workouts.library} <span className="text-muted font-normal">({others.length})</span></h2>
            <span className={cx('text-muted transition-transform', libOpen && 'rotate-90')}>›</span>
          </button>
          {libOpen && others.map((p) => {
            const id = p.id as number
            const open = !!expanded[id]
            return (
              <Card key={id} className="!p-0 overflow-hidden">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left" aria-expanded={open}
                  onClick={() => (open ? nav(`/program/${id}`) : setExpanded((x) => ({ ...x, [id]: true })))}>
                  <ProgramBadge icon={p.icon} color={p.color} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{p.name}</span>
                    <span className="block text-xs text-muted">{p.days.length} Workouts · {open ? 'Antippen zum Öffnen' : formatDate(fmt(new Date(p.createdAt)))}</span>
                  </span>
                  <span className={cx('text-muted transition-transform', open && 'rotate-90')}>›</span>
                </button>
                {open && (
                  <div className="border-t border-line px-4 py-3 space-y-2">
                    {p.weekSlots.map((slot, i) => slot === 'rest' ? null : (
                      <button key={i} onClick={() => nav(`/workout-preview/p${id}-s${i}`)} className="w-full text-left rounded-xl bg-surface2/60 px-4 py-3 active:opacity-70">
                        <div className="text-sm font-medium truncate">{p.days[slot].name}</div>
                        <div className="text-xs text-muted">{p.days[slot].exercises.length} Übungen · Tag {i + 1}</div>
                      </button>
                    ))}
                    <button className="text-accent text-sm pt-1" onClick={() => setExpanded((x) => ({ ...x, [id]: false }))}>Zuklappen</button>
                  </div>
                )}
              </Card>
            )
          })}
        </section>
      )}

      <BottomSheet open={menu !== null} onClose={() => setMenu(null)} title={menu === 'archive' ? 'Archiv' : 'Workouts'}>
        {menu === 'archive' ? (
          <div className="space-y-2">
            <button className="text-accent text-sm" onClick={() => setMenu('main')}>‹ Zurück</button>
            {archived.length === 0 && <p className="text-sm text-muted py-2">Kein archiviertes Programm. Archivierte Programme erscheinen hier.</p>}
            {archived.map((p) => (
              <button key={p.id} onClick={() => { setMenu(null); nav(`/program/${p.id}`) }} className="w-full flex items-center gap-3 rounded-xl bg-surface2 px-4 py-3 text-left active:opacity-70">
                <ProgramBadge icon={p.icon} color={p.color} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium truncate">{p.name}</span>
                  <span className="block text-xs text-muted">{p.days.length} Workouts</span>
                </span>
                <span className="text-muted">›</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <section>
              <h3 className="text-xs uppercase tracking-wide text-muted px-1 mb-1">Trainingsverlauf</h3>
              <MenuRow icon="history" label="Verlauf ansehen und bearbeiten" desc="Einheiten korrigieren, Workouts nachtragen"
                onClick={() => { setMenu(null); nav('/history', { state: { from: '/workouts' } }) }} />
            </section>
            {program && (
              <section>
                <h3 className="text-xs uppercase tracking-wide text-muted px-1 mb-1">Programm anpassen</h3>
                <div className="divide-y divide-line">
                  <MenuRow icon="sliders" label="Programm bearbeiten" desc="Name, Blocklänge, Deload, Programm-Ende" onClick={() => { setMenu(null); setEditing(program) }} />
                  <MenuRow icon="calendar" label="Wochenplan ordnen" desc="Reihenfolge der Workouts und Ruhetage" onClick={() => { setMenu(null); setOrdering(true) }} />
                  <WorkoutImportRow programId={program.id as number} onDone={() => { setMenu(null); nav(`/program/${program.id}`) }} />
                  <MenuRow icon="copy" label="Programm duplizieren" onClick={() => { setMenu(null); void copyProgram(program.id as number) }} />
                  <MenuRow icon="archive" label="Programm archivieren" desc="Das neueste andere Programm wird aktiv" onClick={() => { setMenu(null); void archiveProgram(program.id as number) }} />
                </div>
              </section>
            )}
            <section>
              <h3 className="text-xs uppercase tracking-wide text-muted px-1 mb-1">Archiv</h3>
              <MenuRow icon="archive" label="Archivierte Programme" desc={archived.length ? `${archived.length} im Archiv` : 'Noch keine'} onClick={() => setMenu('archive')} />
            </section>
          </div>
        )}
      </BottomSheet>
    </Page>
  )
}
