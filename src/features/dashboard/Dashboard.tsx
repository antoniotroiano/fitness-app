import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, inputCls } from '../../components/ui'
import { SlideOver } from '../../components/SlideOver'
import { MUSCLES } from '../../data/muscles'
import { exerciseById } from '../../data/exercises'
import { saveBodyEntry, useActiveProgram, useAllExercises, useMeasures, useSessions, useSettings, useWeekState, useWeights } from '../../db/db'
import { MEASURE_GROUPS, RATIOS, bodyLabel, bodySeries, lastEntries, type BodyKey } from '../../engine/body'
import { bodyUnit, formatBody } from '../body/format'
import { EntrySheet } from '../body/EntrySheet'
import { cardioDaily, exerciseDaily, muscleDaily } from '../../engine/stats'
import { dailySeries, dailyValues, sessionDates, streakDays, streakWeeks, weekCount } from '../../engine/habits'
import { weekProgress } from '../../engine/weekProgress'
import { recentRecords, type RecordMetric } from '../../engine/records'
import { displayToKg, kgToDisplay } from '../../utils/units'
import { todayStr } from '../../utils/dates'
import { CalendarLegend, HabitBox, MetricBox, MonthCalendar, RingStat, SectionHeader, StatBox } from './widgets'

const COLOR = { weight: 'var(--habit-weight)', workout: 'var(--habit-workout)' }

function HabitPanel({ open, onClose, title, today, tracked, color, todayText, streakText, children, onSelect }: {
  onSelect?: (date: string) => void
  open: boolean; onClose: () => void; title: string; today: string; tracked: Set<string>; color: string
  todayText: string; streakText: string; children?: React.ReactNode
}) {
  return (
    <SlideOver open={open} onClose={onClose} title={title}>
      <Card className="flex items-center justify-between">
        <div><div className="text-xs text-muted">Heute</div><div className="text-lg font-bold">{todayText}</div></div>
        <div className="text-right"><div className="text-xs text-muted">Streak</div><div className="text-lg font-bold">{streakText}</div></div>
      </Card>
      {children}
      <Card><MonthCalendar tracked={tracked} today={today} color={color} onSelect={onSelect} /><CalendarLegend color={color} /></Card>
    </SlideOver>
  )
}

export default function Dashboard() {
  const nav = useNavigate()
  const program = useActiveProgram()
  const week = useWeekState()
  const sessions = useSessions()
  const all = useAllExercises()
  const settings = useSettings()
  const weights = useWeights()
  const [panel, setPanel] = useState<null | 'weight' | 'workout' | 'muscles' | 'exercises' | 'body'>(null)
  const [sheetDate, setSheetDate] = useState<string | null>(null)
  const measures = useMeasures()
  const [wVal, setWVal] = useState('')
  const [recMetric, setRecMetric] = useState<RecordMetric>('volume')
  const [pageIdx, setPageIdx] = useState(0)
  const pager = useRef<HTMLDivElement>(null)
  const onPagerScroll = () => {
    const el = pager.current
    if (el) setPageIdx(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))
  }
  // Notch-Fläche passend zum weißen Kopfbereich einfärben
  useEffect(() => {
    document.documentElement.style.setProperty('--notch', 'var(--surface)')
    return () => { document.documentElement.style.removeProperty('--notch') }
  }, [])
  const lookup = useCallback((id: string) => exerciseById(id, all), [all])
  const today = todayStr()
  const u = settings.weightUnit

  const records = useMemo(() => recentRecords(sessions, lookup, recMetric, 7), [sessions, lookup, recMetric])
  const recMax = Math.max(1, ...records.map((r) => r.value))
  const recFmt = (v: number) => (recMetric === 'reps' ? `${v}` : `${Math.round(kgToDisplay(v, u))}`)

  const progress = useMemo(() => (program ? weekProgress(program, week, sessions, lookup) : null), [program, week, sessions, lookup])

  const weightDates = useMemo(() => new Set(weights.map((w) => w.date)), [weights])
  const workoutDates = useMemo(() => sessionDates(sessions), [sessions])
  const todayWeight = weights.find((w) => w.date === today)

  const muscleBoxes = useMemo(() => MUSCLES.map((m) => {
    const values = dailySeries(muscleDaily(sessions, m.id, 'sets', lookup), today, 7)
    return { id: m.id, title: m.label, region: m.region, values, total: values.reduce((a, b) => a + b, 0) }
  }), [sessions, lookup, today])

  const exerciseBoxes = useMemo(() => {
    const ids = new Set<string>()
    program?.days.forEach((d) => d.exercises.forEach((e) => ids.add(e.exerciseId)))
    // Cardio, das einmal geloggt wurde, bleibt auch ohne Plan-Zugehörigkeit sichtbar
    sessions.forEach((s) => s.exercises.forEach((e) => { if (lookup(e.exerciseId)?.cardio) ids.add(e.exerciseId) }))
    return [...ids].map((id) => lookup(id)).filter((e) => !!e).map((e) => {
      const points = e!.cardio ? cardioDaily(sessions, e!.id, 'minutes') : []
      const sets = e!.cardio ? points : exerciseDaily(sessions, e!.id, 'totalSets')
      const values = dailySeries(sets, today, 7)
      // Wie auf der Übungsseite: Kraftübungen als Linie (1RM), Cardio als Balken (Dauer)
      const line = e!.cardio ? undefined : dailyValues(exerciseDaily(sessions, e!.id, 'rm1'), today, 7)
      return { id: e!.id, title: e!.name, values, line, total: values.reduce((a, b) => a + b, 0), unit: e!.cardio ? 'min' : 'Sets' }
    })
  }, [program, sessions, lookup, today])

  // Die zwei Gruppen mit den meisten Sätzen der letzten 7 Tage (bei Gleichstand in Listenreihenfolge)
  const top = <T extends { total: number }>(list: T[]) =>
    list.map((x, i) => ({ x, i })).sort((a, b) => b.x.total - a.x.total || a.i - b.i).slice(0, 2).map((e) => e.x)

  const bodyBox = (key: BodyKey, title = bodyLabel(key)) => {
    const pts = lastEntries(bodySeries(key, weights, measures), 7)
    const last = pts.at(-1)
    return (
      <MetricBox key={key} title={title} values={pts.map((p) => p.value)} unit={bodyUnit(key, settings)}
        last={last ? formatBody(key, last.value, settings) : null} onClick={() => goStats(`/stats/body/${key}`)} />
    )
  }

  const close = () => setPanel(null)
  // Panel zuerst per History schließen (eigener Eintrag), dann navigieren – sonst bleibt ein Leer-Eintrag im Stack
  const goStats = (path: string) => {
    if (panel === null) { nav(path); return }
    window.addEventListener('popstate', () => nav(path), { once: true })
    window.history.back()
  }

  return (
    <div className="min-h-full pb-28">
      {/* Oberer Bereich: randlos weiß, geht in die Notch über (Farbe über --notch) */}
      {/* Extra Abstand unter der Notch: der System-Blur am oberen Rand reicht sonst in den Titel */}
      <div className="bg-surface" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}>
        <h1 className="px-4 h-14 flex items-center font-bold text-lg max-w-2xl mx-auto">Dashboard</h1>
        <div ref={pager} onScroll={onPagerScroll}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar max-w-2xl mx-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="w-full shrink-0 snap-center px-4 pb-2 space-y-4">
            {!program && (
              <div className="text-center space-y-3 py-4">
                <div className="text-4xl">👋</div>
                <div className="font-semibold">Willkommen bei Lift Lab</div>
                <p className="text-sm text-muted">Erstelle dein erstes Programm, um Fortschritt zu verfolgen.</p>
                <Button onClick={() => nav('/new')}>Programm erstellen</Button>
              </div>
            )}
            {program && progress && (
              <>
                <div className="flex justify-between items-baseline">
                  <div className="font-semibold">Diese Woche</div>
                  <div className="text-xs text-muted">{program.icon} {program.name} · Woche {week.week + 1}</div>
                </div>
                <div className="flex items-end justify-between gap-2">
                  <RingStat label="Muskeln" done={progress.muscles.done} total={progress.muscles.total} color="var(--ring-muscles)" />
                  <RingStat big label="Sets" done={progress.sets.done} total={progress.sets.total} color="var(--ring-sets)" />
                  <RingStat label="Übungen" done={progress.exercises.done} total={progress.exercises.total} color="var(--ring-ex)" />
                </div>
              </>
            )}
          </div>
          <div className="w-full shrink-0 snap-center px-4 pb-2 space-y-3">
            <div className="flex justify-between items-baseline">
              <div className="font-semibold">Recent Records</div>
              <div className="text-xs text-muted">{recMetric === 'volume' ? `Bester Satz (${u})` : recMetric === 'reps' ? 'Wdh. im besten Satz' : `1RM (${u})`}</div>
            </div>
            <div className="space-y-2 min-h-[176px]">
              {records.length === 0 && <p className="text-sm text-muted py-6 text-center">Noch keine Einheiten geloggt.</p>}
              {records.map((r) => (
                <div key={r.exerciseId} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 truncate">{lookup(r.exerciseId)?.name ?? r.exerciseId}</span>
                  <span className="flex-1 h-2.5 rounded-full bg-surface2 overflow-hidden">
                    <span className="block h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(4, (r.value / recMax) * 100)}%`, background: 'var(--ring-sets)' }} />
                  </span>
                  <span className="w-16 shrink-0 text-right font-semibold tabular-nums">{recFmt(r.value)}</span>
                </div>
              ))}
            </div>
            <div className="flex rounded-xl bg-surface2 p-1" role="group" aria-label="Rekord-Art">
              {([['volume', 'Volumen'], ['reps', 'Reps'], ['rm1', '1RM']] as const).map(([v, label]) => (
                <button key={v} onClick={() => setRecMetric(v)} aria-pressed={recMetric === v}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${recMetric === v ? 'bg-surface text-fg shadow-sm' : 'text-muted'}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-1.5 pb-3" aria-hidden>
          {[0, 1].map((i) => <i key={i} className={`w-1.5 h-1.5 rounded-full ${pageIdx === i ? 'bg-fg' : 'bg-line'}`} />)}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
      <section className="space-y-2">
        <SectionHeader title="Gewohnheiten" />
        <div className="grid grid-cols-2 gap-3">
          <HabitBox title="Gewicht" dates={weightDates} today={today} color={COLOR.weight} weekDone={weekCount(weightDates, today)} onClick={() => setPanel('weight')} />
          <HabitBox title="Workouts" dates={workoutDates} today={today} color={COLOR.workout} weekDone={weekCount(workoutDates, today)} onClick={() => setPanel('workout')} />
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader title="Body Metrics" onAll={() => setPanel('body')} />
        <div className="grid grid-cols-2 gap-3">
          {bodyBox('weight')}
          {bodyBox('bodyFat')}
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader title="Muskelgruppen" onAll={() => setPanel('muscles')} />
        <div className="grid grid-cols-2 gap-3">
          {top(muscleBoxes).map((b) => (
            <StatBox key={b.id} title={b.title} values={b.values} total={b.total} unit="Sets" onClick={() => nav(`/stats/muscle/${b.id}?m=sets`)} />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader title="Übungen" onAll={() => setPanel('exercises')} />
        {exerciseBoxes.length === 0 && <Card className="text-sm text-muted">Noch keine Übungen im Plan.</Card>}
        <div className="grid grid-cols-2 gap-3">
          {top(exerciseBoxes).map((b) => (
            <StatBox key={b.id} title={b.title} values={b.values} line={b.line} total={b.total} unit={b.unit} onClick={() => nav(`/stats/exercise/${b.id}`)} />
          ))}
        </div>
      </section>

      <HabitPanel open={panel === 'weight'} onClose={close} title="Gewicht" today={today} tracked={weightDates} color={COLOR.weight}
        todayText={todayWeight ? `${kgToDisplay(todayWeight.kg, u)} ${u}` : `-- ${u}`}
        streakText={`${streakDays(weightDates, today)} Tage`} onSelect={setSheetDate}>
        <Card className="space-y-3">
          <div className="flex gap-2">
            <input inputMode="decimal" className={inputCls} placeholder={`Heute (${u})`} value={wVal} onChange={(e) => setWVal(e.target.value)} />
            <Button onClick={async () => {
              const n = Number(wVal.replace(',', '.'))
              if (n > 0) { await saveBodyEntry(today, { kg: Math.round(displayToKg(n, u) * 10) / 10 }); setWVal('') }
            }}>Eintragen</Button>
          </div>
          <Button variant="ghost" className="w-full" onClick={() => goStats('/weight')}>Verlauf, Details &amp; Import</Button>
        </Card>
      </HabitPanel>

      <HabitPanel open={panel === 'workout'} onClose={close} title="Workouts" today={today} tracked={workoutDates} color={COLOR.workout}
        todayText={workoutDates.has(today) ? 'Absolviert' : '--'}
        streakText={`${streakWeeks(workoutDates, today)} Wochen`} />

      <SlideOver open={panel === 'body'} onClose={close} title="Body Metrics">
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted">Weight &amp; Body Fat</h2>
          <div className="grid grid-cols-2 gap-3">{bodyBox('weight')}{bodyBox('bodyFat')}</div>
        </section>
        {MEASURE_GROUPS.map((g) => (
          <section key={g.id} className="space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-muted">{g.title}</h2>
            <div className="grid grid-cols-2 gap-3">{g.items.map((i) => bodyBox(i.id, i.label))}</div>
          </section>
        ))}
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted">Ratios</h2>
          <div className="grid grid-cols-2 gap-3">{RATIOS.map((r) => bodyBox(r.id, r.label))}</div>
        </section>
      </SlideOver>

      <EntrySheet date={sheetDate} today={today} entry={weights.find((w) => w.date === sheetDate)} unit={u} onClose={() => setSheetDate(null)} />

      <SlideOver open={panel === 'muscles'} onClose={close} title="Muskelgruppen">
        {(['upper', 'lower'] as const).map((region) => (
          <section key={region} className="space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-muted">{region === 'upper' ? 'Oberkörper' : 'Unterkörper'}</h2>
            <div className="grid grid-cols-2 gap-3">
              {muscleBoxes.filter((b) => b.region === region).map((b) => (
                <StatBox key={b.id} title={b.title} values={b.values} total={b.total} unit="Sets" onClick={() => goStats(`/stats/muscle/${b.id}?m=sets`)} />
              ))}
            </div>
          </section>
        ))}
      </SlideOver>

      <SlideOver open={panel === 'exercises'} onClose={close} title="Übungen">
        {exerciseBoxes.length === 0 && <p className="text-sm text-muted">Noch keine Übungen im Plan.</p>}
        <div className="grid grid-cols-2 gap-3">
          {exerciseBoxes.map((b) => (
            <StatBox key={b.id} title={b.title} values={b.values} line={b.line} total={b.total} unit={b.unit} onClick={() => goStats(`/stats/exercise/${b.id}`)} />
          ))}
        </div>
      </SlideOver>
      </div>
    </div>
  )
}
