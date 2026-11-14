import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Chip, Segmented, Stat } from '../../components/ui'
import { average, filterPeriod, groupByMonth, summary, type Averaging, type Period, type Point } from '../../engine/stats'
import { formatDate, formatMonth, WEEKDAYS, weekdayIndex } from '../../utils/dates'

const PERIODS: Period[] = ['1W', '1M', '3M', '6M', '1Y', 'All']

export function SeriesChart({ points, bar, fmt, daily }: { points: Point[]; bar: boolean; fmt: (v: number) => string; daily: boolean }) {
  if (!points.length) {
    return <div className="h-48 flex items-center justify-center text-sm text-muted">Noch keine Daten im Zeitraum</div>
  }
  const tick = (d: string) => (daily && points.length <= 8 ? `${WEEKDAYS[weekdayIndex(d)]} ${d.slice(8)}` : formatDate(d, { day: '2-digit', month: '2-digit' }))
  const common = { data: points, margin: { top: 8, right: 4, bottom: 0, left: -12 } }
  const axes = (
    <>
      <CartesianGrid stroke="var(--line)" vertical={false} />
      <XAxis dataKey="date" tickFormatter={tick} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
      <YAxis orientation="right" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={48} domain={bar ? [0, 'auto'] : ['auto', 'auto']} tickFormatter={(v) => fmt(Number(v))} />
      <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--fg)' }}
        labelFormatter={(d) => formatDate(String(d), { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
        formatter={(v) => [fmt(Number(v)), '']} separator="" />
    </>
  )
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        {bar ? (
          <BarChart {...common}>{axes}<Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} /></BarChart>
        ) : (
          <LineChart {...common}>{axes}<Line dataKey="value" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent)' }} /></LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

export function StatsView<M extends string>({
  metrics, metric, onMetric, daily, bar, fmt, showAveraging = true,
}: {
  metrics: { value: M; label: string }[]; metric: M; onMetric: (m: M) => void
  daily: Point[]; bar: boolean; fmt: (v: number) => string; showAveraging?: boolean
}) {
  const [period, setPeriod] = useState<Period>('3M')
  const [avg, setAvg] = useState<Averaging>('daily')
  const points = useMemo(() => average(filterPeriod(daily, period), avg, bar), [daily, period, avg, bar])
  const sum = summary(points, bar)
  const history = useMemo(() => groupByMonth(filterPeriod(daily, period)), [daily, period])

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {metrics.map((m) => <Chip key={m.value} active={m.value === metric} onClick={() => onMetric(m.value)}>{m.label}</Chip>)}
      </div>
      <SeriesChart points={points} bar={bar} fmt={fmt} daily={avg === 'daily'} />
      <div className="flex gap-2">
        <Stat label="Ø" value={fmt(sum.avg)} />
        <Stat label={bar ? 'Bester Tag' : 'Best'} value={fmt(sum.best)} />
        {bar && <Stat label="Gesamt" value={fmt(sum.total)} />}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {PERIODS.map((p) => <Chip key={p} active={p === period} onClick={() => setPeriod(p)}>{p}</Chip>)}
        </div>
        {showAveraging && (
          <Segmented value={avg} onChange={setAvg}
            options={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]} />
        )}
      </div>
      <div>
        {history.map((g) => (
          <div key={g.month} className="mb-3">
            <div className="text-xs uppercase tracking-wide text-muted mb-1">{formatMonth(g.month)}</div>
            <ul className="divide-y divide-line rounded-xl bg-surface2 px-3">
              {g.items.map((p) => (
                <li key={p.date} className="flex justify-between py-2.5 text-sm">
                  <span>{formatDate(p.date, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  <span className="font-semibold">{fmt(p.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!history.length && <p className="text-sm text-muted text-center py-4">Keine Einträge</p>}
      </div>
    </div>
  )
}
