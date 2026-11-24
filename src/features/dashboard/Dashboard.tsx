import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, inputCls } from '../../components/ui'
import { Icon, ProgramBadge } from '../../components/icons'
import { SlideOver } from '../../components/SlideOver'
import { MUSCLES } from '../../data/muscles'
import { exerciseById } from '../../data/exercises'
import { saveBodyEntry, useActiveProgram, useAllExercises, useLayoutPrefs, useMeasures, useSessions, useSettings, useStatSessions, useWeekState, useWeights } from '../../db/db'
import { MEASURE_GROUPS, RATIOS, bodyLabel, bodySeries, deficitHint, lastEntries, trendSeries, workSetsBetween, type BodyKey } from '../../engine/body'
import { bodyUnit, formatBody } from '../body/format'
import { EntrySheet } from '../body/EntrySheet'
import { cardioDaily, exerciseDaily, muscleDaily, noLoadStats } from '../../engine/stats'
import { dailySeries, dailyValues, sessionDates, streakDays, streakWeeks, weekCount } from '../../engine/habits'
import { visibleIds, type DashboardSection } from '../../engine/layout'
import { LayoutSheet } from './LayoutSheet'
import { weekProgress } from '../../engine/weekProgress'
import { recentRecords, type RecordMetric } from '../../engine/records'
import { displayToKg, kgToDisplay } from '../../utils/units'
import { addDays, todayStr, weekStart } from '../../utils/dates'
import { CalendarLegend, HabitBox, MetricBox, MonthCalendar, RingStat, SectionHeader, StatBox } from './widgets'
import { de } from '../../i18n/de'
import { BodyMap, VolumeTile } from './BodyMap'
import { t, LOCALE } from '../../i18n'

const COLOR = { weight: 'var(--habit-weight)', workout: 'var(--habit-workout)' }

function HabitPanel({ open, onClose, title, today, tracked, color, todayText, streakText, children, onSelect }: {
  onSelect?: (date: string) => void
  open: boolean; onClose: () => void; title: string; today: string; tracked: Set<string>; color: string
  todayText: string; streakText: string; children?: React.ReactNode
}) {
  return (
    <SlideOver open={open} onClose={onClose} title={title}>
      <Card className="flex items-center justify-between">
        <div><div className="text-xs text-muted">{t('Heute')}</div><div className="text-lg font-bold">{todayText}</div></div>
        <div className="text-right"><div className="text-xs text-muted">{de.common.streak}</div><div className="text-lg font-bold">{streakText}</div></div>
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
  const statSessions = useStatSessions()
  const all = useAllExercises()
  const settings = useSettings()
  const weights = useWeights()
  const [panel, setPanel] = useState<null | 'weight' | 'workout' | 'muscles' | 'exercises' | 'body' | 'volume'>(null)
  const layout = useLayoutPrefs()
  const [customize, setCustomize] = useState(false)
  const [sheetDate, setSheetDate] = useState<string | null>(null)
  const measures = useMeasures()
  const [wVal, setWVal] = useState('')
  const [recMetric, setRecMetric] = useState<RecordMetric>('volume')
  const [pageIdx, setPageIdx] = useState(0)
  const pager = useRef<HTMLDivElement>(null)
  const onPagerScroll = () => {
    const el = pager.current
    if (el) setPageIdx(el.scrollLeft > el.clientWidth * 0.3 ? 1 : 0)
  }
  const showRings = !layout.top.hidden.includes('rings')
  const showRecords = !layout.top.hidden.includes('records')
  const topPages = [showRings, showRecords].filter(Boolean).length
  // Notch-Fläche passend zum weißen Kopfbereich einfärben
  useEffect(() => {
    document.documentElement.style.setProperty('--notch', 'var(--surface)')
    return () => { document.documentElement.style.removeProperty('--notch') }
  }, [])
  const lookup = useCallback((id: string) => exerciseById(id, all), [all])
  const today = todayStr()
  const u = settings.weightUnit

  const records = useMemo(() => recentRecords(statSessions, lookup, recMetric, 7), [statSessions, lookup, recMetric])
  const recMax = Math.max(1, ...records.map((r) => r.value))
  const recFmt = (v: number) => (recMetric === 'reps' ? `${v}` : `${Math.round(kgToDisplay(v, u))}`)

  // Ringe: Programm (nur dessen Einheiten der Programmwoche) oder Alle (jede Einheit der Kalenderwoche)
  const [ringScope, setRingScope] = useState<'program' | 'all'>(() => {
    try { return localStorage.getItem('ringScope') === 'all' ? 'all' : 'program' } catch { return 'program' }
  })
  const pickScope = (s: 'program' | 'all') => {
    setRingScope(s)
    try { localStorage.setItem('ringScope', s) } catch { /* ohne Speicher weiter */ }
  }
  const progress = useMemo(() => {
    if (!program) return null
    const from = weekStart(today)
    return weekProgress(program, week, sessions, lookup, {
      scope: ringScope, week: week.week, from, to: addDays(from, 6),
    })
  }, [program, week, sessions, lookup, ringScope, today])

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
      const line = e!.cardio ? undefined : dailyValues(exerciseDaily(statSessions, e!.id, 'rm1', 1, noLoadStats(e)), today, 7)
      return { id: e!.id, title: e!.name, values, line, total: values.reduce((a, b) => a + b, 0), unit: e!.cardio ? 'min' : de.common.sets }
    })
  }, [program, sessions, statSessions, lookup, today])

  // Die zwei Gruppen mit den meisten Sätzen der letzten 7 Tage (bei Gleichstand in Listenreihenfolge)
  const top = <T extends { total: number }>(list: T[]) =>
    list.map((x, i) => ({ x, i })).sort((a, b) => b.x.total - a.x.total || a.i - b.i).slice(0, 2).map((e) => e.x)

  const trend = useMemo(() => trendSeries(weights.map((w) => ({ date: w.date, value: w.kg })), settings.trendDays), [weights, settings.trendDays])
  const trendNow = trend.length > 1 ? trend[trend.length - 1].value : null
  // Hinweis „Defizit + sinkende Sätze“: Trend fällt deutlich und die Arbeitssätze der letzten 14 Tage liegen darunter
  const hint = useMemo(() => {
    const skip = (id: string) => !!lookup(id)?.cardio
    const recent = workSetsBetween(sessions, addDays(today, -13), today, skip)
    const prior = workSetsBetween(sessions, addDays(today, -27), addDays(today, -14), skip)
    return deficitHint(trend, recent, prior, today)
  }, [trend, sessions, lookup, today])

  const bodyBox = (key: BodyKey, title = bodyLabel(key)) => {
    const pts = lastEntries(bodySeries(key, weights, measures), 7)
    const last = pts.at(-1)
    return (
      <MetricBox key={key} title={title} values={pts.map((p) => p.value)} unit={bodyUnit(key, settings)}
        last={last ? formatBody(key, last.value, settings) : null} onClick={() => goStats(`/stats/body/${key}`)}
        extra={key === 'weight' && trendNow != null ? `Trend ${formatBody('weight', trendNow, settings)} ${bodyUnit('weight', settings)}` : undefined} />
    )
  }

  const close = () => setPanel(null)
  // Panel zuerst per History schließen (eigener Eintrag), dann navigieren – sonst bleibt ein Leer-Eintrag im Stack
  const goStats = (path: string) => {
    if (panel === null) { nav(path); return }
    window.addEventListener('popstate', () => nav(path), { once: true })
    window.history.back()
  }

  const sectionNodes: Record<DashboardSection, ReactNode> = {
    habits: (
      <section key="habits" className="space-y-2">
        <SectionHeader title={t('Gewohnheiten')} />
        <div className="grid grid-cols-2 gap-3">
          <HabitBox title={t('Gewicht')} dates={weightDates} today={today} color={COLOR.weight} weekDone={weekCount(weightDates, today)} onClick={() => setPanel('weight')} />
          <HabitBox title="Workouts" dates={workoutDates} today={today} color={COLOR.workout} weekDone={weekCount(workoutDates, today)} onClick={() => setPanel('workout')} />
        </div>
      </section>
    ),
    body: (
      <section key="body" className="space-y-2">
        <SectionHeader title={de.dashboard.bodyMetrics} onAll={() => setPanel('body')} />
        {visibleIds(layout.bodyTiles).length === 0
          ? <Card className="text-sm text-muted">{t('Keine Kacheln gewählt. Über das Regler-Symbol oben wählst du Werte aus.')}</Card>
          : <div className="grid grid-cols-2 gap-3">{visibleIds(layout.bodyTiles).map((k) => bodyBox(k as BodyKey))}</div>}
        {hint && (
          <Card className="text-xs text-muted">
            <span className="font-semibold text-fg">{t('Defizit und weniger Sätze')}</span>{' '}
            {t('Der Trend fällt um {0} % pro Woche und die Arbeitssätze liegen {1} % unter den zwei Wochen davor. Ein kleineres Defizit oder mehr Erholung kann Kraft und Muskeln besser erhalten.', Math.abs(hint.pctPerWeek).toLocaleString(LOCALE), Math.abs(hint.setsPct))}
          </Card>
        )}
      </section>
    ),
    volume: (
      <section key="volume" className="space-y-2">
        <SectionHeader title={t('Volumen')} />
        <VolumeTile onClick={() => setPanel('volume')} />
      </section>
    ),
    muscles: (
      <section key="muscles" className="space-y-2">
        <SectionHeader title={t('Muskelgruppen')} onAll={() => setPanel('muscles')} />
        <div className="grid grid-cols-2 gap-3">
          {top(muscleBoxes).map((b) => (
            <StatBox key={b.id} title={b.title} values={b.values} total={b.total} unit={de.common.sets} onClick={() => nav(`/stats/muscle/${b.id}?m=sets`)} />
          ))}
        </div>
      </section>
    ),
    exercises: (
      <section key="exercises" className="space-y-2">
        <SectionHeader title={t('Übungen')} onAll={() => setPanel('exercises')} />
        {exerciseBoxes.length === 0 && <Card className="text-sm text-muted">{t('Noch keine Übungen im Plan.')}</Card>}
        <div className="grid grid-cols-2 gap-3">
          {top(exerciseBoxes).map((b) => (
            <StatBox key={b.id} title={b.title} values={b.values} line={b.line} total={b.total} unit={b.unit} onClick={() => nav(`/stats/exercise/${b.id}`)} />
          ))}
        </div>
      </section>
    ),
  }

  return (
    <div className="min-h-full pb-28">
      {/* Oberer Bereich: randlos weiß, geht in die Notch über (Farbe über --notch) */}
      {/* Extra Abstand unter der Notch: der System-Blur am oberen Rand reicht sonst in den Titel */}
      <div className="bg-surface" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}>
        <div className="px-4 h-14 flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="font-bold text-lg">Dashboard</h1>
          <button type="button" onClick={() => setCustomize(true)} aria-label={t('Dashboard anpassen')}
            className="w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-muted active:opacity-70">
            <Icon name="sliders" size={22} />
          </button>
        </div>
        <div ref={pager} onScroll={onPagerScroll}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar max-w-2xl mx-auto" style={{ scrollbarWidth: 'none' }}>
          {showRings && <div className="w-full shrink-0 snap-center px-4 pb-2 space-y-4">
            {!program && (
              <div className="text-center space-y-3 py-4">
                <div className="flex justify-center"><ProgramBadge size={56} /></div>
                <div className="font-semibold">{t('Willkommen bei TRAINRATE')}</div>
                <p className="text-sm text-muted">{t('Erstelle dein erstes Programm, um Fortschritt zu verfolgen.')}</p>
                <Button onClick={() => nav('/new')}>{t('Programm erstellen')}</Button>
              </div>
            )}
            {program && progress && (
              <>
                <div className="flex justify-between items-baseline">
                  <div className="font-semibold">{t('Diese Woche')}</div>
                  <div className="text-xs text-muted flex items-center gap-1.5"><ProgramBadge icon={program.icon} color={program.color} size={20} />{program.name} {t('· Woche')} {week.week + 1}</div>
                </div>
                <div className="flex items-end justify-between gap-2">
                  <RingStat label={t('Muskeln')} done={progress.muscles.done} shown={progress.muscles.full} total={progress.muscles.total} color="var(--ring-muscles)" />
                  <RingStat big label={de.common.sets} done={progress.sets.done} total={progress.sets.total} color="var(--ring-sets)" />
                  <RingStat label={t('Übungen')} done={progress.exercises.done} total={progress.exercises.total} color="var(--ring-ex)" />
                </div>
                <div className="flex justify-center">
                  <div className="inline-flex rounded-xl bg-surface2 p-1" role="group" aria-label={t('Ringe zählen')}>
                    {([['program', t('Programm')], ['all', t('Alle Workouts')]] as const).map(([k, l]) => (
                      <button key={k} type="button" aria-pressed={ringScope === k} onClick={() => pickScope(k)}
                        className={`rounded-lg px-3 py-1 text-2xs font-semibold transition-colors ${ringScope === k ? 'bg-surface text-fg shadow-sm' : 'text-muted'}`}>{l}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>}
          {showRecords && <div className="w-full shrink-0 snap-center px-4 pb-2 space-y-3">
            <div className="flex justify-between items-baseline">
              <div className="font-semibold">{de.dashboard.recentRecords}</div>
              <div className="text-xs text-muted">{recMetric === 'volume' ? t('Bester Satz ({0})', u) : recMetric === 'reps' ? t('Wdh. im besten Satz') : `1RM (${u})`}</div>
            </div>
            <div className="space-y-2 min-h-[176px]">
              {records.length === 0 && <p className="text-sm text-muted py-6 text-center">{t('Noch keine Einheiten geloggt.')}</p>}
              {records.map((r) => (
                <div key={r.exerciseId} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 truncate">{lookup(r.exerciseId)?.name ?? r.exerciseId}</span>
                  <span className="flex-1 h-2.5 rounded-full bg-surface2 overflow-hidden">
                    <span className="block h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(4, (r.value / recMax) * 100)}%`, background: 'var(--c-records)' }} />
                  </span>
                  <span className="w-16 shrink-0 text-right font-semibold tabular-nums">{recFmt(r.value)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center"><div className="inline-flex rounded-xl bg-surface2 p-1" role="group" aria-label={t('Rekord-Art')}>
              {([['volume', t('Volumen')], ['reps', de.common.reps], ['rm1', '1RM']] as const).map(([v, label]) => (
                <button key={v} onClick={() => setRecMetric(v)} aria-pressed={recMetric === v}
                  className={`rounded-lg px-3 py-1 text-2xs font-semibold transition-colors ${recMetric === v ? 'bg-surface text-fg shadow-sm' : 'text-muted'}`}>{label}</button>
              ))}
            </div></div>
          </div>}
        </div>
        {topPages > 1 && <div className="flex justify-center gap-2 pb-3" aria-hidden>
          {[0, 1].map((i) => <i key={i} className={`h-2 rounded-full transition-all ${pageIdx === i ? 'w-5 bg-fg' : 'w-2 bg-muted/50'}`} />)}
        </div>}
        {topPages === 0 && <div className="pb-2" />}
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
      {visibleIds(layout.sections).map((id) => sectionNodes[id as DashboardSection])}

      <HabitPanel open={panel === 'weight'} onClose={close} title={t('Gewicht')} today={today} tracked={weightDates} color={COLOR.weight}
        todayText={todayWeight ? `${kgToDisplay(todayWeight.kg, u)} ${u}` : `-- ${u}`}
        streakText={t('{0} Tage', streakDays(weightDates, today))} onSelect={setSheetDate}>
        <Card className="space-y-3">
          <div className="flex gap-2">
            <input inputMode="decimal" className={inputCls} placeholder={t('Heute ({0})', u)} value={wVal} onChange={(e) => setWVal(e.target.value)} />
            <Button onClick={async () => {
              const n = Number(wVal.replace(',', '.'))
              if (n > 0) { await saveBodyEntry(today, { kg: Math.round(displayToKg(n, u) * 10) / 10 }); setWVal('') }
            }}>{t('Eintragen')}</Button>
          </div>
          <Button variant="ghost" className="w-full" onClick={() => goStats('/weight')}>{t('Verlauf, Details &amp; Import')}</Button>
        </Card>
      </HabitPanel>

      <HabitPanel open={panel === 'workout'} onClose={close} title="Workouts" today={today} tracked={workoutDates} color={COLOR.workout}
        todayText={workoutDates.has(today) ? t('Absolviert') : '--'}
        streakText={t('{0} Wochen', streakWeeks(workoutDates, today))} />

      <SlideOver open={panel === 'body'} onClose={close} title={de.dashboard.bodyMetrics}>
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted">{de.dashboard.weightAndBodyFat}</h2>
          <div className="grid grid-cols-2 gap-3">{bodyBox('weight')}{bodyBox('bodyFat')}</div>
        </section>
        {MEASURE_GROUPS.map((g) => (
          <section key={g.id} className="space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-muted">{g.title}</h2>
            <div className="grid grid-cols-2 gap-3">{g.items.map((i) => bodyBox(i.id, i.label))}</div>
          </section>
        ))}
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted">{de.dashboard.ratios}</h2>
          <div className="grid grid-cols-2 gap-3">{RATIOS.map((r) => bodyBox(r.id, r.label))}</div>
        </section>
      </SlideOver>

      <LayoutSheet open={customize} onClose={() => setCustomize(false)} prefs={layout} />

      <EntrySheet date={sheetDate} today={today} entry={weights.find((w) => w.date === sheetDate)} unit={u} onClose={() => setSheetDate(null)} />

      <SlideOver open={panel === 'volume'} onClose={close} title={t('Volumen')}>
        <BodyMap onMuscle={(id) => goStats(`/stats/muscle/${id}?m=sets`)} />
      </SlideOver>

      <SlideOver open={panel === 'muscles'} onClose={close} title={t('Muskelgruppen')}>
        {(['upper', 'lower'] as const).map((region) => (
          <section key={region} className="space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-muted">{region === 'upper' ? t('Oberkörper') : t('Unterkörper')}</h2>
            <div className="grid grid-cols-2 gap-3">
              {muscleBoxes.filter((b) => b.region === region).map((b) => (
                <StatBox key={b.id} title={b.title} values={b.values} total={b.total} unit={de.common.sets} onClick={() => goStats(`/stats/muscle/${b.id}?m=sets`)} />
              ))}
            </div>
          </section>
        ))}
      </SlideOver>

      <SlideOver open={panel === 'exercises'} onClose={close} title={t('Übungen')}>
        {exerciseBoxes.length === 0 && <p className="text-sm text-muted">{t('Noch keine Übungen im Plan.')}</p>}
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
