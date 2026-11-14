import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Chip, Collapsible, Page } from '../../components/ui'
import { MUSCLES } from '../../data/muscles'
import { exerciseById } from '../../data/exercises'
import { setWeight, useActiveProgram, useAllExercises, useSessions, useSettings, useWeekState, useWeights } from '../../db/db'
import { muscleDaily } from '../../engine/stats'
import { weekProgress } from '../../engine/weekProgress'
import { displayToKg, kgToDisplay } from '../../utils/units'
import { todayStr } from '../../utils/dates'
import { SeriesChart } from '../stats/StatsView'
import { WeightCalendar } from '../body/Body'
import { inputCls } from '../../components/ui'
import { filterPeriod } from '../../engine/stats'

function Bar({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total ? Math.min(100, (done / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1"><span className="text-muted">{label}</span><span className="font-semibold">{done}/{total}</span></div>
      <div className="h-2 rounded-full bg-surface2 overflow-hidden"><div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} /></div>
    </div>
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
  const [mMetric, setMMetric] = useState<'sets' | 'volume'>(() => {
    try { return localStorage.getItem('muscleMetric') === 'volume' ? 'volume' : 'sets' } catch { return 'sets' }
  })
  const [wVal, setWVal] = useState('')
  const lookup = (id: string) => exerciseById(id, all)

  const progress = useMemo(() => (program ? weekProgress(program, week, sessions, lookup) : null), [program, week, sessions, all])

  // Muskel-Kennzahlen der aktuellen Programmwoche
  const cycleSessions = useMemo(
    () => sessions.filter((s) => s.programId === program?.id && s.week === week.week),
    [sessions, program, week.week],
  )
  const muscleRows = useMemo(() => MUSCLES.map((m) => {
    const cycle = muscleDaily(cycleSessions, m.id, mMetric, lookup).reduce((a, p) => a + p.value, 0)
    const recent = muscleDaily(sessions, m.id, mMetric, lookup)
    const total = recent.reduce((a, p) => a + p.value, 0)
    return { m, cycle, total, avg: recent.length ? total / recent.length : 0 }
  }), [cycleSessions, sessions, mMetric, all])

  const fmtM = (v: number) => mMetric === 'sets' ? `${Math.round(v * 10) / 10}` : `${Math.round(kgToDisplay(v, settings.weightUnit))} ${settings.weightUnit}`
  const planExercises = useMemo(() => {
    const ids = new Set<string>()
    program?.days.forEach((d) => d.exercises.forEach((e) => ids.add(e.exerciseId)))
    // Cardio, das einmal geloggt wurde, bleibt auch ohne Plan-Zugehörigkeit sichtbar
    sessions.forEach((s) => s.exercises.forEach((e) => { if (lookup(e.exerciseId)?.cardio) ids.add(e.exerciseId) }))
    return [...ids].map((id) => lookup(id)).filter((e) => !!e)
  }, [program, all, sessions])

  const u = settings.weightUnit
  const latest = weights.at(-1)
  const wPoints = filterPeriod(weights.map((w) => ({ date: w.date, value: w.kg })), '3M')

  return (
    <Page title="Dashboard">
      {!program && (
        <Card className="text-center space-y-3 py-6">
          <div className="text-4xl">👋</div>
          <div className="font-semibold">Willkommen bei Lift Lab</div>
          <p className="text-sm text-muted">Erstelle dein erstes Programm, um Fortschritt zu verfolgen.</p>
          <Button onClick={() => nav('/new')}>Programm erstellen</Button>
        </Card>
      )}

      {program && progress && (
        <Card className="space-y-3">
          <div className="flex justify-between items-baseline">
            <div className="font-semibold">Diese Woche</div>
            <div className="text-xs text-muted">{program.icon} {program.name} · Woche {week.week + 1}</div>
          </div>
          <Bar label="Muskeln" done={progress.muscles.done} total={progress.muscles.total} />
          <Bar label="Sets" done={progress.sets.done} total={progress.sets.total} />
          <Bar label="Übungen" done={progress.exercises.done} total={progress.exercises.total} />
          <div className="text-xs text-muted">
            Noch übrig: {progress.sets.total - progress.sets.done} Sets · {progress.exercises.total - progress.exercises.done} Übungen
          </div>
        </Card>
      )}

      <Collapsible title="Übungen" subtitle="Statistik pro Übung deines Plans" storeKey="g-ex">
        {planExercises.length === 0 && <p className="text-sm text-muted">Noch keine Übungen im Plan.</p>}
        <ul className="divide-y divide-line">
          {planExercises.map((e) => (
            <li key={e!.id}>
              <button className="w-full flex justify-between py-3 text-sm text-left" onClick={() => nav(`/stats/exercise/${e!.id}`)}>
                <span>{e!.name}{e!.cardio && <span className="ml-2 text-xs text-muted">Cardio</span>}</span><span className="text-muted">›</span>
              </button>
            </li>
          ))}
        </ul>
      </Collapsible>

      <Collapsible title="Muskelgruppen" subtitle="Alle 15 Muskelgruppen" storeKey="g-mu">
        <div className="flex gap-2 mb-3">
          <Chip active={mMetric === 'sets'} onClick={() => { setMMetric('sets'); try { localStorage.setItem('muscleMetric', 'sets') } catch { /* ignore */ } }}>Sets</Chip>
          <Chip active={mMetric === 'volume'} onClick={() => { setMMetric('volume'); try { localStorage.setItem('muscleMetric', 'volume') } catch { /* ignore */ } }}>Volumen</Chip>
        </div>
        {(['upper', 'lower'] as const).map((region) => (
          <div key={region} className="mb-3">
            <div className="text-xs uppercase tracking-wide text-muted mb-1">{region === 'upper' ? 'Oberkörper' : 'Unterkörper'}</div>
            <ul className="divide-y divide-line">
              {muscleRows.filter((r) => r.m.region === region).map((r) => (
                <li key={r.m.id}>
                  <button className="w-full flex items-center justify-between py-3 text-left" onClick={() => nav(`/stats/muscle/${r.m.id}?m=${mMetric}`)}>
                    <span>
                      <span className="block text-sm font-medium">{r.m.label}</span>
                      <span className="block text-xs text-muted">Ø {fmtM(r.avg)} · Gesamt {fmtM(r.total)}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-bold">{fmtM(r.cycle)}</span>
                      <span className="block text-[11px] text-muted">diese Woche</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Collapsible>

      <Collapsible title="Körpergewicht" subtitle={latest ? `Zuletzt ${kgToDisplay(latest.kg, u)} ${u}` : 'Noch kein Eintrag'} storeKey="g-bw">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input inputMode="decimal" className={inputCls} placeholder={`Heute (${u})`} value={wVal} onChange={(e) => setWVal(e.target.value)} />
            <Button onClick={async () => {
              const n = Number(wVal.replace(',', '.'))
              if (n > 0) { await setWeight(todayStr(), Math.round(displayToKg(n, u) * 10) / 10); setWVal('') }
            }}>Speichern</Button>
          </div>
          <SeriesChart points={wPoints} bar={false} daily fmt={(v) => `${kgToDisplay(v, u)}`} />
          <WeightCalendar dates={new Set(weights.map((w) => w.date))} />
          <Button variant="ghost" className="w-full" onClick={() => nav('/weight')}>Details &amp; Import</Button>
        </div>
      </Collapsible>
    </Page>
  )
}
